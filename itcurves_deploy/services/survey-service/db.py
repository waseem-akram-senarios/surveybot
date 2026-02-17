"""
Database operations for the Survey Service.
"""

import sys
sys.path.insert(0, "/app")

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Literal, Optional, Union

import httpx
import requests
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text

from shared.models.common import SurveyQuestionAnswerP

logger = logging.getLogger(__name__)

BRAIN_SERVICE_URL = os.getenv("BRAIN_SERVICE_URL", "http://brain-service:8016")


def get_engine():
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_user = os.getenv("DB_USER", "pguser")
    db_password = os.getenv("DB_PASSWORD", "root")
    url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/db"
    return create_engine(url, pool_size=5, max_overflow=10, pool_pre_ping=True)


_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        _engine = get_engine()
    return _engine


def sql_execute(query: str, params: Union[dict, list, None] = None):
    """Execute SQL query. Returns list of dicts for SELECT, rowcount for mutations.
    For batch operations, params can be a list of dicts."""
    engine = _get_engine()
    with engine.begin() as conn:
        if isinstance(params, list) and params:
            for p in params:
                conn.execute(text(query), p)
            return len(params)
        result = conn.execute(text(query), params or {})
    if result.returns_rows:
        return result.mappings().all()
    return result.rowcount


def get_current_time() -> str:
    """Returns current UTC time as ISO format."""
    return datetime.now(timezone.utc).isoformat()


def filtering(biodata: str, question: str) -> str:
    """Determine if a question is relevant. Currently always returns 'Yes'."""
    return "Yes"


def parse_via_brain(question: str, response: str, options: list, criteria: str = "categorical") -> Optional[str]:
    """Parse user response via brain-service."""
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{BRAIN_SERVICE_URL}/api/brain/parse",
                json={"question": question, "response": response, "options": options, "criteria": criteria},
            )
            if resp.status_code == 200:
                return resp.json().get("answer")
    except Exception as e:
        logger.warning(f"Brain service parse error: {e}")
    return None


def autofill_via_brain(context: str, question: str, options: list, criteria: str = "categorical") -> Optional[str]:
    """Autofill answer via brain-service."""
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{BRAIN_SERVICE_URL}/api/brain/autofill",
                json={"context": context, "question": question, "options": options, "criteria": criteria},
            )
            if resp.status_code == 200:
                return resp.json().get("answer")
    except Exception as e:
        logger.warning(f"Brain service autofill error: {e}")
    return None


def summarize(question: str, response: str) -> str:
    """Summarize long responses via brain-service."""
    if len(response) <= 300:
        return response
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{BRAIN_SERVICE_URL}/api/brain/summarize",
                json={"question": question, "response": response},
            )
            if resp.status_code == 200:
                return resp.json().get("summary", response)
    except Exception as e:
        logger.warning(f"Brain service summarize error: {e}")
    return response


def process_question_sync(question_data, biodata: str) -> Optional[SurveyQuestionAnswerP]:
    """Synchronous wrapper for process_question."""
    return asyncio.run(process_question(question_data, biodata))


async def process_question(question, biodata: str) -> Optional[SurveyQuestionAnswerP]:
    """Process a single question with filtering and autofill via brain-service."""
    que_id = question.QueId
    choice = filtering(biodata, question.QueText)

    if choice == "Yes":
        que_criteria = question.QueCriteria
        filled = None

        if que_criteria == "scale":
            scale_max = question.QueScale
            scale_list = [str(i) for i in range(1, int(scale_max) + 1)]
            filled = autofill_via_brain(biodata, question.QueText, scale_list, "scale")

        elif que_criteria == "categorical":
            que_categories = list(question.QueCategories or [])
            if "None of the above" in que_categories:
                que_categories.remove("None of the above")
            filled = autofill_via_brain(biodata, question.QueText, que_categories, "categorical")

        elif que_criteria == "open":
            filled = autofill_via_brain(biodata, question.QueText, [], "open")

        return SurveyQuestionAnswerP(
            QueId=que_id,
            QueText=question.QueText,
            QueScale=question.QueScale,
            QueCriteria=question.QueCriteria,
            QueCategories=question.QueCategories,
            Order=str(question.Order),
            Ans=filled or None,
            RawAns=None,
            Autofill=question.Autofill,
        )
    return None


def process_survey_question(question: dict) -> dict:
    """Process a single survey question to parse the answer from RawAns via brain-service."""
    if question.get("Ans"):
        return question

    raw_ans = question.get("RawAns", "") or ""

    if question.get("QueCriteria") == "scale":
        scale_max = question["QueScale"]
        scale_list = [str(i) for i in range(1, int(scale_max) + 1)]
        answer = parse_via_brain(question.get("QueText", ""), raw_ans, scale_list, "scale")
        question["Ans"] = answer if answer else "None of the above"

    elif question.get("QueCriteria") == "categorical":
        que_categories = question.get("QueCategories") or []
        answer = parse_via_brain(question.get("QueText", ""), raw_ans, que_categories, "categorical")
        question["Ans"] = answer if answer else "None of the above"

    else:
        question["Ans"] = summarize(question.get("QueText", ""), raw_ans)

    return question


def build_html_email(url: str) -> str:
    """Build HTML email body for survey link."""
    return f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">We'd love your input!</h2>
            <p>We value your feedback and would appreciate it if you could take a few moments to answer a survey:</p>
            <p>Click the link below to complete the survey:</p>
            <p><a href="{url}">Survey Link</a></p>
            <p>Thank you for your time and insights!</p>
        </body>
    </html>
    """


def build_text_email(url: str) -> str:
    """Build plain text email body for survey link."""
    return (
        "We'd love your input!\n\n"
        "We value your feedback and would appreciate it if you could take a few moments to answer a survey:\n\n"
        f"Click the link below to complete the survey:\n\n{url}\n\n"
        "Thank you for your time and insights!"
    )


def make_call_task(headers: dict, payload: dict, survey_id: str) -> dict:
    """Make VAPI call and update survey with call_id."""
    try:
        url = "https://api.vapi.ai/call"
        response = requests.post(url, headers=headers, json=payload)

        if response.status_code == 201:
            call_id = response.json().get("id")
            try:
                sql_execute(
                    """UPDATE surveys SET call_id = :call_id, call_time = NOW() AT TIME ZONE 'UTC', call_number = :call_number WHERE id = :survey_id""",
                    {
                        "survey_id": survey_id,
                        "call_id": call_id,
                        "call_number": payload.get("customer", {}).get("number", ""),
                    },
                )
                logger.info(f"Call ID updated successfully: {call_id}")
            except Exception as e:
                logger.warning(f"Error updating surveys: {e}")

            return {"CallId": call_id}
        else:
            logger.error(f"Failed to create outbound call: {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create outbound call: {response.text}",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create outbound call: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create outbound call: {str(e)}"
        )
