"""
Scheduler routes: schedule calls, campaigns, cancel jobs, list jobs.
Jobs persist in Postgres — survive container restarts.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from fastapi import APIRouter, HTTPException

from db import get_engine, sql_execute

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scheduler", tags=["scheduler"])

_scheduler: Optional[BackgroundScheduler] = None

MAX_RETRIES = 2
RETRY_DELAY_SECONDS = 10


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        engine = get_engine()
        jobstore = SQLAlchemyJobStore(engine=engine)
        _scheduler = BackgroundScheduler(
            jobstores={"default": jobstore},
            job_defaults={"coalesce": True, "max_instances": 1},
        )
    return _scheduler


def _make_call_job(survey_id: str, phone: str, attempt: int = 1):
    """Background job: call voice-service with retry."""
    voice_url = os.getenv("VOICE_SERVICE_URL", "http://voice-service:8017")
    url = f"{voice_url}/api/voice/make-call"
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(url, params={"survey_id": survey_id, "phone": phone})
            r.raise_for_status()
            logger.info(f"Scheduled call completed: survey={survey_id}, phone={phone}")
    except Exception as e:
        logger.error(f"Scheduled call failed (attempt {attempt}/{MAX_RETRIES+1}): survey={survey_id}, error={e}")
        if attempt <= MAX_RETRIES:
            sched = get_scheduler()
            retry_at = datetime.now(timezone.utc) + timedelta(seconds=RETRY_DELAY_SECONDS * attempt)
            sched.add_job(
                _make_call_job,
                "date",
                run_date=retry_at,
                args=[survey_id, phone, attempt + 1],
                id=f"retry_{survey_id}_{attempt + 1}",
            )
            logger.info(f"Retrying in {RETRY_DELAY_SECONDS * attempt}s (attempt {attempt + 1})")


@router.post("/schedule-call")
async def schedule_call(
    survey_id: str,
    phone: str,
    delay_seconds: int = 60,
):
    """Schedule a delayed call. Job persists in Postgres."""
    try:
        job_id = str(uuid4())
        run_at = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)

        sched = get_scheduler()
        sched.add_job(
            _make_call_job,
            "date",
            run_date=run_at,
            id=job_id,
            args=[survey_id, phone, 1],
        )

        return {
            "status": "scheduled",
            "job_id": job_id,
            "run_at": run_at.isoformat(),
            "survey_id": survey_id,
            "phone": phone,
        }
    except Exception as e:
        logger.error(f"Schedule call error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedule-campaign")
async def schedule_campaign(
    campaign_id: str,
    frequency: str = "daily",
    next_run_offset_minutes: int = 0,
):
    """Schedule a recurring campaign. Job persists in Postgres."""
    try:
        campaign = sql_execute("SELECT * FROM campaigns WHERE id = :id", {"id": campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign {campaign_id} not found")

        job_id = str(uuid4())
        sched = get_scheduler()
        if frequency == "daily":
            interval_hours = 24
        elif frequency == "weekly":
            interval_hours = 24 * 7
        elif frequency == "monthly":
            interval_hours = 24 * 30
        else:
            interval_hours = 24

        run_date = datetime.now(timezone.utc) + timedelta(minutes=next_run_offset_minutes)

        def _campaign_job():
            """Execute campaign: find all pending surveys and trigger calls."""
            logger.info(f"Campaign job executing: {campaign_id}")
            try:
                surveys = sql_execute(
                    """SELECT s.id, s.phone, s.rider_name
                       FROM surveys s
                       WHERE s.campaign_id = :cid AND s.status = 'In-Progress'
                       AND s.phone IS NOT NULL AND s.phone != ''""",
                    {"cid": campaign_id},
                )
                voice_url = os.getenv("VOICE_SERVICE_URL", "http://voice-service:8017")
                for survey in surveys:
                    try:
                        with httpx.Client(timeout=30.0) as client:
                            r = client.post(
                                f"{voice_url}/api/voice/make-call",
                                params={"survey_id": survey["id"], "phone": survey["phone"]},
                            )
                            r.raise_for_status()
                            logger.info(f"Campaign call triggered: survey={survey['id']}")
                    except Exception as call_err:
                        logger.error(f"Campaign call failed for survey {survey['id']}: {call_err}")
                logger.info(f"Campaign {campaign_id}: triggered {len(surveys)} calls")
            except Exception as e:
                logger.error(f"Campaign job error: {e}")

        sched.add_job(
            _campaign_job,
            "interval",
            hours=interval_hours,
            id=job_id,
            start_date=run_date,
        )

        return {
            "status": "scheduled",
            "job_id": job_id,
            "campaign_id": campaign_id,
            "frequency": frequency,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Schedule campaign error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cancel/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a scheduled job."""
    try:
        sched = get_scheduler()
        try:
            sched.remove_job(job_id)
        except Exception:
            pass
        return {"status": "cancelled", "job_id": job_id}
    except Exception as e:
        logger.error(f"Cancel job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs")
async def list_jobs():
    """List pending jobs."""
    try:
        sched = get_scheduler()
        jobs = []
        for j in sched.get_jobs():
            jobs.append({
                "job_id": j.id,
                "next_run": j.next_run_time.isoformat() if j.next_run_time else None,
                "name": j.name,
            })
        return {"jobs": jobs}
    except Exception as e:
        logger.error(f"List jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
