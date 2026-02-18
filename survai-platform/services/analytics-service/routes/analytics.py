"""
Analytics routes: summary metrics, campaign metrics, AI analysis.
"""

import json
import logging
import os
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, HTTPException

from db import sql_execute

BRAIN_SERVICE_URL = os.getenv("BRAIN_SERVICE_URL", "http://brain-service:8016")

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def get_analytics_summary():
    """
    MVP metrics: total_surveys, completed, completion_rate, avg_duration from call_transcripts,
    channel_counts from surveys.
    """
    try:
        # From call_transcripts: total, completed, avg_duration
        transcript_stats = sql_execute(
            """SELECT
                COUNT(*) AS total_surveys,
                SUM(CASE WHEN call_status = 'completed' THEN 1 ELSE 0 END) AS completed,
                AVG(call_duration_seconds) FILTER (WHERE call_duration_seconds > 0) AS avg_duration
            FROM call_transcripts""",
            {},
        )
        row = transcript_stats[0] if transcript_stats else {}
        total = row.get("total_surveys") or 0
        completed = row.get("completed") or 0
        avg_duration = float(row.get("avg_duration") or 0)
        completion_rate = (completed / total * 100) if total > 0 else 0

        # Channel counts from surveys
        channel_rows = sql_execute(
            """SELECT channel, COUNT(*) AS cnt FROM surveys GROUP BY channel""",
            {},
        )
        channel_counts = {r.get("channel") or "phone": r.get("cnt", 0) for r in channel_rows}

        # Dropout tracking: find last answered question for incomplete surveys
        dropout_rows = sql_execute(
            """SELECT sri.ord, q.text AS question_text, COUNT(*) AS dropout_count
               FROM surveys s
               JOIN survey_response_items sri ON sri.survey_id = s.id
               JOIN questions q ON q.id = sri.question_id
               WHERE s.status = 'In-Progress'
                 AND sri.raw_answer IS NOT NULL AND sri.raw_answer != ''
                 AND sri.ord = (
                     SELECT MAX(sri2.ord)
                     FROM survey_response_items sri2
                     WHERE sri2.survey_id = s.id
                       AND sri2.raw_answer IS NOT NULL AND sri2.raw_answer != ''
                 )
               GROUP BY sri.ord, q.text
               ORDER BY dropout_count DESC
               LIMIT 5""",
            {},
        )
        dropout_points = [
            {"question_order": r.get("ord"), "question": r.get("question_text", ""), "count": r.get("dropout_count", 0)}
            for r in dropout_rows
        ]

        # Response type breakdown
        response_type_rows = sql_execute(
            """SELECT q.criteria, COUNT(*) AS cnt
               FROM survey_response_items sri
               JOIN questions q ON q.id = sri.question_id
               WHERE sri.raw_answer IS NOT NULL AND sri.raw_answer != ''
               GROUP BY q.criteria""",
            {},
        )
        response_types = {r.get("criteria", "unknown"): r.get("cnt", 0) for r in response_type_rows}

        return {
            "total_surveys": total,
            "completed": completed,
            "completion_rate": round(completion_rate, 2),
            "avg_duration_seconds": round(avg_duration, 2),
            "channel_counts": channel_counts,
            "dropout_points": dropout_points,
            "response_types": response_types,
        }
    except Exception as e:
        logger.error(f"Analytics summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaign/{campaign_id}")
async def get_campaign_analytics(campaign_id: str):
    """Campaign-specific metrics."""
    try:
        campaign = sql_execute(
            "SELECT * FROM campaigns WHERE id = :id",
            {"id": campaign_id},
        )
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign {campaign_id} not found")

        surveys = sql_execute(
            """SELECT s.id, s.status, s.completion_date, ct.call_duration_seconds, s.channel
               FROM surveys s
               LEFT JOIN call_transcripts ct ON ct.survey_id = s.id
               WHERE s.campaign_id = :campaign_id""",
            {"campaign_id": campaign_id},
        )
        total = len(surveys)
        completed = sum(1 for s in surveys if s.get("status") == "Completed")
        durations = [s.get("call_duration_seconds") for s in surveys if s.get("call_duration_seconds")]
        avg_duration = sum(durations) / len(durations) if durations else 0
        channel_counts = {}
        for s in surveys:
            ch = s.get("channel") or "phone"
            channel_counts[ch] = channel_counts.get(ch, 0) + 1

        return {
            "campaign_id": campaign_id,
            "campaign": campaign[0],
            "total_surveys": total,
            "completed": completed,
            "completion_rate": round(completed / total * 100, 2) if total > 0 else 0,
            "avg_duration_seconds": round(avg_duration, 2),
            "channel_counts": channel_counts,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Campaign analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/{survey_id}")
async def analyze_survey(survey_id: str):
    """
    Post-survey AI analysis using OpenAI. Analyzes responses, stores in survey_analytics table.
    """
    try:
        survey = sql_execute(
            "SELECT * FROM surveys WHERE id = :id",
            {"id": survey_id},
        )
        if not survey:
            raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")

        responses = sql_execute(
            """SELECT q.text AS question_text, sri.raw_answer, sri.answer
               FROM survey_response_items sri
               JOIN questions q ON q.id = sri.question_id
               WHERE sri.survey_id = :survey_id
               ORDER BY sri.ord""",
            {"survey_id": survey_id},
        )
        transcript_rows = sql_execute(
            "SELECT full_transcript FROM call_transcripts WHERE survey_id = :survey_id ORDER BY call_started_at DESC LIMIT 1",
            {"survey_id": survey_id},
        )
        transcript = transcript_rows[0].get("full_transcript", "") if transcript_rows else ""

        qa_text = "\n".join(
            f"Q: {r.get('question_text', '')}\nA: {r.get('raw_answer') or r.get('answer') or 'N/A'}"
            for r in responses
        )
        combined = f"Transcript:\n{transcript}\n\nQ&A:\n{qa_text}" if transcript else qa_text

        if not combined.strip():
            raise HTTPException(status_code=400, detail="No responses or transcript to analyze")

        async with httpx.AsyncClient(timeout=30.0) as http_client:
            brain_resp = await http_client.post(
                f"{BRAIN_SERVICE_URL}/api/brain/analyze",
                json={"combined_text": combined},
            )
            if brain_resp.status_code != 200:
                raise RuntimeError(f"Brain service error: {brain_resp.status_code}")
            data = brain_resp.json()

        sql_execute(
            """INSERT INTO survey_analytics
               (survey_id, overall_sentiment, quality_score, key_themes, summary, nps_score, satisfaction_score)
               VALUES (:survey_id, :sentiment, :quality, :themes::jsonb, :summary, :nps, :satisfaction)
               ON CONFLICT (survey_id) DO UPDATE SET
                 overall_sentiment = EXCLUDED.overall_sentiment,
                 quality_score = EXCLUDED.quality_score,
                 key_themes = EXCLUDED.key_themes,
                 summary = EXCLUDED.summary,
                 nps_score = EXCLUDED.nps_score,
                 satisfaction_score = EXCLUDED.satisfaction_score,
                 analyzed_at = NOW()""",
            {
                "survey_id": survey_id,
                "sentiment": data.get("overall_sentiment", "neutral"),
                "quality": float(data.get("quality_score", 0)),
                "themes": json.dumps(data.get("key_themes", [])),
                "summary": data.get("summary", ""),
                "nps": data.get("nps_score"),
                "satisfaction": data.get("satisfaction_score"),
            },
        )

        return {"status": "analyzed", "survey_id": survey_id, "analysis": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analyze survey error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Demand Fulfillment Tracking ─────────────────────────────────────────────

@router.get("/demand-fulfillment/{tenant_id}")
async def get_demand_fulfillment(tenant_id: str, days: int = 30):
    """Get demand fulfillment rate for a tenant over specified days."""
    try:
        rows = sql_execute(
            """SELECT date, total_requests, fulfilled_requests, fulfillment_rate, avg_wait_time_minutes
               FROM demand_fulfillment
               WHERE tenant_id = :tenant_id
               AND date >= CURRENT_DATE - :days
               ORDER BY date DESC""",
            {"tenant_id": tenant_id, "days": days},
        )
        
        if not rows:
            return {
                "tenant_id": tenant_id,
                "period_days": days,
                "data": [],
                "avg_fulfillment_rate": 0,
                "total_requests": 0,
                "total_fulfilled": 0
            }
        
        total_requests = sum(r.get("total_requests", 0) for r in rows)
        total_fulfilled = sum(r.get("fulfilled_requests", 0) for r in rows)
        avg_rate = (total_fulfilled / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "tenant_id": tenant_id,
            "period_days": days,
            "data": rows,
            "avg_fulfillment_rate": round(avg_rate, 2),
            "total_requests": total_requests,
            "total_fulfilled": total_fulfilled
        }
    except Exception as e:
        logger.error(f"Demand fulfillment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/demand-fulfillment")
async def record_demand_fulfillment(
    tenant_id: str,
    date: str,
    total_requests: int,
    fulfilled_requests: int,
    avg_wait_time_minutes: Optional[int] = None
):
    """Record daily demand fulfillment data for a tenant."""
    try:
        fulfillment_rate = (fulfilled_requests / total_requests * 100) if total_requests > 0 else 0
        
        sql_execute(
            """INSERT INTO demand_fulfillment 
               (tenant_id, date, total_requests, fulfilled_requests, fulfillment_rate, avg_wait_time_minutes)
               VALUES (:tenant_id, :date, :total_requests, :fulfilled_requests, :fulfillment_rate, :avg_wait_time)
               ON CONFLICT (tenant_id, date) DO UPDATE SET
                 total_requests = EXCLUDED.total_requests,
                 fulfilled_requests = EXCLUDED.fulfilled_requests,
                 fulfillment_rate = EXCLUDED.fulfillment_rate,
                 avg_wait_time_minutes = EXCLUDED.avg_wait_time_minutes""",
            {
                "tenant_id": tenant_id,
                "date": date,
                "total_requests": total_requests,
                "fulfilled_requests": fulfilled_requests,
                "fulfillment_rate": round(fulfillment_rate, 2),
                "avg_wait_time": avg_wait_time_minutes
            },
        )
        return {"status": "recorded", "fulfillment_rate": round(fulfillment_rate, 2)}
    except Exception as e:
        logger.error(f"Record demand fulfillment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Incentive Tracking (Gift Cards) ─────────────────────────────────────────

@router.get("/incentives/{tenant_id}")
async def get_incentives(tenant_id: str, campaign_id: Optional[str] = None):
    """Get incentive/gift card issuance for a tenant."""
    try:
        if campaign_id:
            rows = sql_execute(
                """SELECT * FROM incentive_tracking
                   WHERE tenant_id = :tenant_id AND campaign_id = :campaign_id
                   ORDER BY issued_at DESC""",
                {"tenant_id": tenant_id, "campaign_id": campaign_id},
            )
        else:
            rows = sql_execute(
                """SELECT * FROM incentive_tracking
                   WHERE tenant_id = :tenant_id
                   ORDER BY issued_at DESC""",
                {"tenant_id": tenant_id},
            )
        
        total_issued = len(rows)
        total_redeemed = sum(1 for r in rows if r.get("status") == "redeemed")
        total_value = sum(float(r.get("incentive_value") or 0) for r in rows)
        
        return {
            "tenant_id": tenant_id,
            "campaign_id": campaign_id,
            "incentives": rows,
            "total_issued": total_issued,
            "total_redeemed": total_redeemed,
            "total_value": round(total_value, 2)
        }
    except Exception as e:
        logger.error(f"Get incentives error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/incentives/issue")
async def issue_incentive(
    rider_phone: str,
    tenant_id: str,
    incentive_type: str = "gift_card",
    incentive_value: float = 5.0,
    survey_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    rider_name: Optional[str] = None,
    rider_email: Optional[str] = None
):
    """
    Issue an incentive to a rider. Prevents duplicates per campaign.
    Returns error if rider already received incentive for this campaign.
    """
    try:
        # Check for duplicate
        existing = sql_execute(
            """SELECT * FROM incentive_tracking
               WHERE rider_phone = :phone AND campaign_id = :campaign_id""",
            {"phone": rider_phone, "campaign_id": campaign_id},
        )
        
        if existing:
            return {
                "status": "duplicate",
                "message": f"Rider {rider_phone} already received incentive for this campaign",
                "existing_incentive": existing[0]
            }
        
        # Issue new incentive
        sql_execute(
            """INSERT INTO incentive_tracking
               (rider_phone, rider_email, rider_name, incentive_type, incentive_value, 
                survey_id, campaign_id, tenant_id, status)
               VALUES (:phone, :email, :name, :type, :value, :survey_id, :campaign_id, :tenant_id, 'issued')""",
            {
                "phone": rider_phone,
                "email": rider_email,
                "name": rider_name,
                "type": incentive_type,
                "value": incentive_value,
                "survey_id": survey_id,
                "campaign_id": campaign_id,
                "tenant_id": tenant_id
            },
        )
        
        return {
            "status": "issued",
            "rider_phone": rider_phone,
            "incentive_type": incentive_type,
            "incentive_value": incentive_value
        }
    except Exception as e:
        logger.error(f"Issue incentive error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/incentives/redeem")
async def redeem_incentive(rider_phone: str, campaign_id: str):
    """Mark an incentive as redeemed."""
    try:
        existing = sql_execute(
            """SELECT * FROM incentive_tracking
               WHERE rider_phone = :phone AND campaign_id = :campaign_id""",
            {"phone": rider_phone, "campaign_id": campaign_id},
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Incentive not found")
        
        if existing[0].get("status") == "redeemed":
            return {"status": "already_redeemed", "redeemed_at": existing[0].get("redeemed_at")}
        
        sql_execute(
            """UPDATE incentive_tracking
               SET status = 'redeemed', redeemed_at = NOW()
               WHERE rider_phone = :phone AND campaign_id = :campaign_id""",
            {"phone": rider_phone, "campaign_id": campaign_id},
        )
        
        return {"status": "redeemed", "rider_phone": rider_phone}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Redeem incentive error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/incentives/check/{rider_phone}")
async def check_rider_incentive(rider_phone: str, campaign_id: Optional[str] = None):
    """Check if a rider has already received an incentive."""
    try:
        if campaign_id:
            rows = sql_execute(
                """SELECT * FROM incentive_tracking
                   WHERE rider_phone = :phone AND campaign_id = :campaign_id""",
                {"phone": rider_phone, "campaign_id": campaign_id},
            )
        else:
            rows = sql_execute(
                """SELECT * FROM incentive_tracking WHERE rider_phone = :phone""",
                {"phone": rider_phone},
            )
        
        return {
            "rider_phone": rider_phone,
            "has_incentive": len(rows) > 0,
            "incentives": rows
        }
    except Exception as e:
        logger.error(f"Check incentive error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
