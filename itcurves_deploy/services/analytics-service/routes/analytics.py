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
