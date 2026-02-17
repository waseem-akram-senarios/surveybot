"""
Database operations for the Voice Service.
Owns: call_transcripts table
Reads: surveys, survey_response_items, questions, templates, riders
"""

import json
import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_user = os.getenv("DB_USER", "pguser")
        db_password = os.getenv("DB_PASSWORD", "root")
        db_name = os.getenv("DB_NAME", "db")
        url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        _engine = create_engine(url, pool_size=5, max_overflow=10, pool_pre_ping=True)
    return _engine


def sql_execute(query: str, params: dict = None) -> list:
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        if result.returns_rows:
            rows = result.fetchall()
            columns = result.keys()
            return [dict(zip(columns, row)) for row in rows]
        else:
            conn.commit()
            return []


# ─── Survey Data Loading ─────────────────────────────────────────────────────

def get_survey_with_questions(survey_id: str) -> Optional[Dict[str, Any]]:
    """Load a survey and all its questions with categories and branching info."""
    survey = sql_execute(
        """SELECT s.id, s.template_name, s.biodata, s.name, s.recipient,
                  s.phone, s.rider_name, s.ride_id, s.tenant_id, s.url,
                  s.status, s.email
           FROM surveys s WHERE s.id = :survey_id""",
        {"survey_id": survey_id},
    )
    if not survey:
        return None
    survey = survey[0]

    questions = sql_execute(
        """SELECT q.id, q.text, q.criteria, q.scales, q.parent_id, q.autofill,
                  sri.ord as "order",
                  COALESCE(
                    (SELECT json_agg(qc.text) FROM question_categories qc WHERE qc.question_id = q.id),
                    '[]'::json
                  ) as categories
           FROM survey_response_items sri
           JOIN questions q ON q.id = sri.question_id
           WHERE sri.survey_id = :survey_id
           ORDER BY sri.ord""",
        {"survey_id": survey_id},
    )

    for q in questions:
        if q.get("parent_id"):
            mappings = sql_execute(
                """SELECT qc.text
                   FROM question_category_mappings qcm
                   JOIN question_categories qc ON qc.id = qcm.parent_category_id
                   WHERE qcm.child_question_id = :question_id""",
                {"question_id": q["id"]},
            )
            q["parent_category_texts"] = [m["text"] for m in mappings]

        if isinstance(q.get("categories"), str):
            try:
                q["categories"] = json.loads(q["categories"])
            except (json.JSONDecodeError, TypeError):
                q["categories"] = []

    survey["questions"] = questions
    return survey


def get_rider_data(rider_name: str = None, phone: str = None) -> Optional[Dict[str, Any]]:
    """Load rider data by name or phone."""
    if not rider_name and not phone:
        return None

    if phone:
        riders = sql_execute(
            "SELECT * FROM riders WHERE phone = :phone LIMIT 1",
            {"phone": phone},
        )
        if riders:
            return riders[0]

    if rider_name:
        riders = sql_execute(
            "SELECT * FROM riders WHERE name ILIKE :name LIMIT 1",
            {"name": f"%{rider_name}%"},
        )
        if riders:
            return riders[0]

    return None


def get_template_config(template_name: str) -> Dict[str, Any]:
    """Get template configuration."""
    templates = sql_execute(
        """SELECT name, status,
                  COALESCE(time_limit_minutes, 8) as time_limit_minutes,
                  COALESCE(restricted_topics, '{}') as restricted_topics,
                  greeting_template, survey_type
           FROM templates WHERE name = :name""",
        {"name": template_name},
    )
    if templates:
        return templates[0]
    return {
        "name": template_name,
        "time_limit_minutes": 8,
        "restricted_topics": [],
        "greeting_template": None,
        "survey_type": None,
    }


# ─── Transcript Storage ──────────────────────────────────────────────────────

def store_transcript(
    survey_id: str,
    full_transcript: str,
    call_duration_seconds: int = 0,
    call_status: str = "completed",
    call_attempts: int = 1,
    channel: str = "phone",
    call_id: str = None,
) -> str:
    """Store a call transcript."""
    transcript_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    sql_execute(
        """INSERT INTO call_transcripts
           (id, survey_id, full_transcript, call_duration_seconds,
            call_started_at, call_ended_at, call_status, call_attempts, channel)
           VALUES (:id, :survey_id, :transcript, :duration,
                   :started, :ended, :status, :attempts, :channel)""",
        {
            "id": transcript_id,
            "survey_id": survey_id,
            "transcript": full_transcript,
            "duration": call_duration_seconds,
            "started": now,
            "ended": now,
            "status": call_status,
            "attempts": call_attempts,
            "channel": channel,
        },
    )

    if call_id:
        sql_execute(
            "UPDATE surveys SET call_id = :call_id WHERE id = :survey_id",
            {"call_id": call_id, "survey_id": survey_id},
        )

    logger.info(f"Stored transcript {transcript_id} for survey {survey_id}")
    return transcript_id


def get_transcript(survey_id: str) -> Optional[Dict[str, Any]]:
    """Get the transcript for a survey."""
    transcripts = sql_execute(
        """SELECT * FROM call_transcripts
           WHERE survey_id = :survey_id
           ORDER BY call_started_at DESC LIMIT 1""",
        {"survey_id": survey_id},
    )
    return transcripts[0] if transcripts else None


def record_answer(survey_id: str, question_id: str, raw_answer: str) -> bool:
    """Record a survey answer from the voice agent's tool call."""
    try:
        sql_execute(
            """UPDATE survey_response_items
               SET raw_answer = :raw_answer
               WHERE survey_id = :survey_id AND question_id = :question_id""",
            {
                "survey_id": survey_id,
                "question_id": question_id,
                "raw_answer": raw_answer,
            },
        )
        logger.info(f"Recorded answer for survey={survey_id}, question={question_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to record answer: {e}")
        return False


def update_survey_status(survey_id: str, status: str = "Completed") -> bool:
    """Update survey status and completion date."""
    try:
        now = datetime.now(timezone.utc).isoformat()[:19].replace("T", " ")
        sql_execute(
            """UPDATE surveys SET status = :status, completion_date = :date
               WHERE id = :survey_id""",
            {"status": status, "date": now, "survey_id": survey_id},
        )
        return True
    except Exception as e:
        logger.error(f"Failed to update survey status: {e}")
        return False
