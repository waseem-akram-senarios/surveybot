"""
Survey routes for the Survey Service.
"""

import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import List, Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException
from mailersend import EmailBuilder, MailerSendClient
from pydantic import BaseModel

from shared.models.common import (
    CallbackRequest,
    Email,
    MakeCallRequest,
    SurveyCreateP,
    SurveyCSATUpdateP,
    SurveyDurationUpdateP,
    SurveyFromTemplateP,
    SurveyP,
    SurveyQnAP,
    SurveyQnAPhone,
    SurveyQuestionAnswerP,
    SurveyQuestionsP,
    SurveyStats,
    SurveyStatusUpdateP,
)
from shared.service_client import service_client

from db import (
    build_html_email,
    build_text_email,
    get_current_time,
    make_call_task,
    process_question_sync,
    process_survey_question,
    sql_execute,
)

logger = logging.getLogger(__name__)
router = APIRouter()

VOICE_SERVICE_URL = os.getenv("VOICE_SERVICE_URL", "http://voice-service:8017")


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def get_template_questions(template_name: str) -> dict:
    """Fetch template questions from template-service."""
    try:
        return await service_client.post(
            "template-service",
            "/api/templates/getquestions",
            json={"TemplateName": template_name},
        )
    except Exception as e:
        logger.error(f"Failed to fetch template questions: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Template service error: {str(e)}",
        )


async def get_survey_questions(survey_id: str) -> dict:
    """Get survey questions with answers from DB."""
    sql_query = """SELECT
  q.id AS id,
  q.text,
  q.criteria,
  q.scales,
  q.parent_id,
  sri.ord AS "order",
  sri.answer,
  sri.raw_answer,
  sri.autofill,
  COALESCE(qc.categories, null::json) AS categories,
  COALESCE(pm.parent_category_texts, null::json) AS parent_category_texts
 FROM survey_response_items sri
 JOIN questions q ON sri.question_id = q.id
 LEFT JOIN (
   SELECT question_id, json_agg(text ORDER BY text) AS categories
   FROM question_categories GROUP BY question_id
 ) qc ON qc.question_id = q.id
 LEFT JOIN (
   SELECT m.child_question_id, json_agg(qc2.text ORDER BY qc2.text) AS parent_category_texts
   FROM question_category_mappings m
   JOIN question_categories qc2 ON qc2.id = m.parent_category_id
   GROUP BY m.child_question_id
 ) pm ON pm.child_question_id = q.id
 WHERE sri.survey_id = :survey_id
 ORDER BY sri.ord;"""
    rows = sql_execute(sql_query, {"survey_id": survey_id})
    return {"SurveyId": survey_id, "Questions": rows}


async def get_survey_recipient(survey_id: str) -> dict:
    """Get recipient info for a survey."""
    rows = sql_execute(
        "SELECT recipient, name, ride_id, tenant_id FROM surveys WHERE id = :survey_id",
        {"survey_id": survey_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    r = rows[0]
    return {
        "SurveyId": survey_id,
        "Recipient": r["recipient"],
        "Name": r["name"],
        "RideID": r["ride_id"],
        "TenantID": r["tenant_id"],
    }


def transform_qna(qna_data: dict) -> List[dict]:
    """Transform VAPI-style qna payload to question list."""
    result = []
    for key, value in qna_data.items():
        if key == "SurveyId" or not isinstance(value, str):
            continue
        if value.startswith("{"):
            continue
        result.append({"QueId": key, "RawAns": value, "Ans": value})
    return result


async def process_survey_questions_background(qna_data: dict):
    """Background task to process survey questions from phone submission."""
    try:
        survey_id = qna_data.pop("SurveyId", None)
        if not survey_id:
            return

        questions = transform_qna(qna_data)
        survey_data = await get_survey_questions(survey_id)
        survey_questions = survey_data.get("Questions", [])
        survey_questions_dict = {str(q.get("id")): q for q in survey_questions}

        questions_dicts = []
        for q in questions:
            detailed = survey_questions_dict.get(q["QueId"])
            if detailed:
                questions_dicts.append({
                    "QueId": q["QueId"],
                    "QueText": detailed.get("text", ""),
                    "QueCriteria": detailed.get("criteria", ""),
                    "QueScale": detailed.get("scales"),
                    "QueCategories": detailed.get("categories") or [],
                    "Ans": q.get("Ans"),
                    "RawAns": q.get("RawAns"),
                    "Order": detailed.get("order", 0),
                })

        with ThreadPoolExecutor() as executor:
            processed = list(executor.map(process_survey_question, questions_dicts))

        for i, q in enumerate(questions_dicts):
            if not q.get("Ans") and processed[i].get("Ans"):
                q["Ans"] = processed[i]["Ans"]

        for item in questions_dicts:
            sql_execute(
                """INSERT INTO survey_response_items (survey_id, question_id, answer, raw_answer, ord)
                VALUES (:survey_id, :question_id, :answer, :raw_answer, :ord)
                ON CONFLICT (survey_id, question_id)
                DO UPDATE SET answer = EXCLUDED.answer, raw_answer = EXCLUDED.raw_answer, ord = EXCLUDED.ord""",
                {
                    "survey_id": survey_id,
                    "question_id": item["QueId"],
                    "answer": item.get("Ans"),
                    "raw_answer": item.get("RawAns"),
                    "ord": item.get("Order", 0),
                },
            )

        sql_execute(
            """UPDATE surveys SET status = :status, completion_date = :completion_date WHERE id = :survey_id""",
            {
                "survey_id": survey_id,
                "status": "Completed",
                "completion_date": str(get_current_time())[:19].replace("T", " "),
            },
        )
        logger.info(f"Processed survey questions for survey {survey_id}")
    except Exception as e:
        logger.warning(f"Error processing survey questions: {e}")


class _QuestionObj:
    """Simple object for process_question_sync."""
    def __init__(self, d):
        for k, v in d.items():
            setattr(self, k, v)


def _row_to_survey(r: dict) -> SurveyP:
    """Convert a database row to a SurveyP model."""
    return SurveyP(
        SurveyId=r["id"],
        Biodata=r["biodata"],
        Recipient=r["recipient"],
        Name=r["name"],
        RiderName=r["rider_name"],
        RideId=r["ride_id"],
        TenantId=r["tenant_id"],
        URL=r["url"],
        Status=r["status"],
        LaunchDate=str(r["launch_date"])[:19] if r.get("launch_date") else "",
        CompletionDate=str(r.get("completion_date") or "")[:19],
    )


# ─── Endpoints ───────────────────────────────────────────────────────────────
# IMPORTANT: Literal GET paths MUST be defined before parameterized GET paths
# to prevent FastAPI from matching e.g. /surveys/stat as /surveys/{survey_id}

# ─── Static/literal GET routes (before any {survey_id} routes) ───────────────

@router.get("/surveys/stat", response_model=SurveyStats)
async def survey_stat():
    """Survey stats (dashboard uses /surveys/stat)."""
    return await get_survey_stats()


@router.get("/surveys/stats", response_model=SurveyStats)
async def get_survey_stats():
    """Get survey statistics."""
    rows = sql_execute("""
        SELECT
            COUNT(*) FILTER (WHERE TRUE) AS total_surveys,
            COUNT(*) FILTER (WHERE status = 'Completed') AS total_completed_surveys,
            COUNT(*) FILTER (WHERE status = 'In-Progress') AS total_active_surveys,
            COUNT(*) FILTER (WHERE status = 'Completed' AND DATE(completion_date) = CURRENT_DATE) AS completed_surveys_today,
            COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY completion_duration) FILTER (WHERE status = 'Completed')), 0) AS durations_median,
            COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY completion_duration) FILTER (WHERE status = 'Completed' AND DATE(completion_date) = CURRENT_DATE)), 0) AS durations_today_median,
            COALESCE(ROUND(AVG(csat) FILTER (WHERE status = 'Completed')), 0) AS csat_avg
        FROM surveys
    """, {})
    if not rows:
        return SurveyStats(
            Total_Surveys=0, Total_Active_Surveys=0, Total_Completed_Surveys=0,
            Total_Completed_Surveys_Today=0, Median_Completion_Duration=0,
            Median_Completion_Duration_Today=0, AverageCSAT=0.0,
        )
    r = rows[0]
    return SurveyStats(
        Total_Surveys=r["total_surveys"] or 0,
        Total_Active_Surveys=r["total_active_surveys"] or 0,
        Total_Completed_Surveys=r["total_completed_surveys"] or 0,
        Total_Completed_Surveys_Today=r["completed_surveys_today"] or 0,
        Median_Completion_Duration=int(r["durations_median"] or 0),
        Median_Completion_Duration_Today=int(r["durations_today_median"] or 0),
        AverageCSAT=float(r["csat_avg"] or 0),
    )


@router.get("/surveys", response_model=List[SurveyP])
async def list_surveys(tenant_id: Optional[str] = None):
    """List all surveys. Optionally filter by tenant_id."""
    if tenant_id:
        rows = sql_execute("SELECT * FROM surveys WHERE tenant_id = :tid", {"tid": tenant_id})
    else:
        rows = sql_execute("SELECT * FROM surveys", {})
    return [_row_to_survey(r) for r in rows]


@router.get("/surveys/list", response_model=List[SurveyP])
async def list_surveys_alias(tenant_id: Optional[str] = None):
    """Alias: /surveys/list (dashboard expects this path)."""
    return await list_surveys(tenant_id)


@router.get("/surveys/list_completed", response_model=List[SurveyP])
async def list_completed_surveys(tenant_id: Optional[str] = None):
    """List only completed surveys."""
    if tenant_id:
        rows = sql_execute("SELECT * FROM surveys WHERE status = 'Completed' AND tenant_id = :tid", {"tid": tenant_id})
    else:
        rows = sql_execute("SELECT * FROM surveys WHERE status = 'Completed'", {})
    return [_row_to_survey(r) for r in rows]


@router.get("/surveys/list_inprogress", response_model=List[SurveyP])
async def list_inprogress_surveys(tenant_id: Optional[str] = None):
    """List only in-progress surveys."""
    if tenant_id:
        rows = sql_execute("SELECT * FROM surveys WHERE status = 'In-Progress' AND tenant_id = :tid", {"tid": tenant_id})
    else:
        rows = sql_execute("SELECT * FROM surveys WHERE status = 'In-Progress'", {})
    return [_row_to_survey(r) for r in rows]


@router.get("/surveys/fromtemplate/{template_name}", response_model=SurveyFromTemplateP)
async def get_surveys_from_template(template_name: str):
    """Get survey stats for template."""
    rows = sql_execute("""
        SELECT
            COUNT(*) FILTER (WHERE template_name = :template_name) AS total_surveys,
            SUM(CASE WHEN status = 'Completed' AND template_name = :template_name THEN 1 ELSE 0 END) AS total_completed_surveys,
            SUM(CASE WHEN status != 'Completed' AND template_name = :template_name THEN 1 ELSE 0 END) AS total_active_surveys
        FROM surveys
    """, {"template_name": template_name})
    if not rows:
        return SurveyFromTemplateP(Total=0, Completed=0, InProgress=0)
    r = rows[0]
    return SurveyFromTemplateP(
        Total=r["total_surveys"] or 0,
        Completed=r["total_completed_surveys"] or 0,
        InProgress=r["total_active_surveys"] or 0,
    )


# ─── Parameterized GET routes ({survey_id}) ──────────────────────────────────

@router.get("/surveys/{survey_id}", response_model=SurveyP)
async def get_survey(survey_id: str):
    """Get survey by ID."""
    rows = sql_execute("SELECT * FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    return _row_to_survey(rows[0])


@router.get("/surveys/{survey_id}/status")
async def get_survey_status(survey_id: str):
    """Get survey status (recipient app expects this)."""
    rows = sql_execute("SELECT * FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    r = rows[0]
    return {
        "SurveyId": survey_id,
        "Status": r["status"],
        "LaunchDate": str(r["launch_date"])[:19] if r.get("launch_date") else "",
        "CompletionDate": str(r.get("completion_date") or "")[:19],
        "CSAT": r.get("csat"),
    }


@router.get("/surveys/{survey_id}/recipient")
async def get_survey_recipient_endpoint(survey_id: str):
    """Get recipient info."""
    return await get_survey_recipient(survey_id)


@router.get("/surveys/{survey_id}/recipient_info")
async def get_survey_recipient_info(survey_id: str):
    """Alias for recipient info (LiveKit agent uses this)."""
    return await get_survey_recipient(survey_id)


@router.get("/surveys/{survey_id}/questions")
async def get_survey_questions_endpoint(survey_id: str):
    """Get survey questions with answers."""
    rows = sql_execute("SELECT id FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    return await get_survey_questions(survey_id)


@router.get("/surveys/{survey_id}/questions_unanswered")
async def get_survey_questions_unanswered(survey_id: str):
    """Get only unanswered questions for a survey."""
    rows = sql_execute("SELECT id FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    questions = sql_execute("""
        SELECT q.id AS id, q.text, q.criteria, q.scales, q.parent_id,
               sri.ord AS "order", sri.answer, sri.raw_answer, sri.autofill,
               COALESCE(qc.categories, null::json) AS categories,
               COALESCE(pm.parent_category_texts, null::json) AS parent_category_texts
        FROM survey_response_items sri
        JOIN questions q ON sri.question_id = q.id
        LEFT JOIN (SELECT question_id, json_agg(text ORDER BY text) AS categories FROM question_categories GROUP BY question_id) qc ON qc.question_id = q.id
        LEFT JOIN (SELECT m.child_question_id, json_agg(qc2.text ORDER BY qc2.text) AS parent_category_texts FROM question_category_mappings m JOIN question_categories qc2 ON qc2.id = m.parent_category_id GROUP BY m.child_question_id) pm ON pm.child_question_id = q.id
        WHERE sri.survey_id = :survey_id AND sri.answer IS NULL AND sri.raw_answer IS NULL
        ORDER BY sri.ord
    """, {"survey_id": survey_id})
    return {"SurveyId": survey_id, "Questions": questions}


@router.get("/surveys/{survey_id}/questionsonly")
async def get_survey_questions_only(survey_id: str):
    """Get just question texts for a survey."""
    rows = sql_execute(
        "SELECT q.text FROM survey_response_items sri JOIN questions q ON sri.question_id = q.id WHERE sri.survey_id = :survey_id",
        {"survey_id": survey_id},
    )
    return [r["text"] for r in rows]


@router.get("/surveys/{survey_id}/transcript")
async def get_transcript(survey_id: str):
    """Get VAPI call transcript."""
    rows = sql_execute("SELECT call_id FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    call_id = rows[0].get("call_id")
    if not call_id:
        raise HTTPException(status_code=404, detail=f"No call for Survey {survey_id}")

    if call_id.startswith("survey-"):
        try:
            from livekit_caller import get_livekit_transcript
            transcript = await get_livekit_transcript(call_id)
            return {"transcript": transcript, "provider": "livekit"}
        except ImportError:
            raise HTTPException(status_code=500, detail="LiveKit not available")

    import requests as req
    resp = req.get(
        f"https://api.vapi.ai/call/{call_id}",
        headers={
            "Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}",
            "Content-Type": "application/json",
        },
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    transcript = resp.json().get("transcript", [])
    return {"transcript": transcript, "provider": "vapi"}


# ─── POST/PATCH/DELETE routes ────────────────────────────────────────────────

@router.post("/surveys/generate", response_model=SurveyQuestionsP)
async def generate_survey(survey_data: SurveyCreateP):
    """Generate survey from template."""
    try:
        res = sql_execute("SELECT * FROM surveys WHERE id = :survey_id", {"survey_id": survey_data.SurveyId})
        if res:
            raise HTTPException(status_code=400, detail=f"Survey with ID {survey_data.SurveyId} already exists")

        res = sql_execute("SELECT * FROM templates WHERE name = :template_name", {"template_name": survey_data.Name})
        if not res:
            raise HTTPException(status_code=404, detail=f"Template with Name {survey_data.Name} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        sql_execute(
            """INSERT INTO surveys (id, template_name, url, biodata, status, name, recipient, launch_date, rider_name, ride_id, tenant_id)
            VALUES (:id, :template_name, :url, :biodata, :status, :name, :recipient, :launch_date, :rider_name, :ride_id, :tenant_id)""",
            {
                "id": survey_data.SurveyId,
                "template_name": survey_data.Name,
                "url": survey_data.URL,
                "biodata": survey_data.Biodata,
                "status": "In-Progress",
                "name": survey_data.Name,
                "recipient": survey_data.Recipient,
                "launch_date": str(get_current_time())[:19].replace("T", " "),
                "rider_name": survey_data.RiderName,
                "ride_id": survey_data.RideId,
                "tenant_id": survey_data.TenantId,
            },
        )

        template_response = await get_template_questions(survey_data.Name)
        template_questions = template_response.get("Questions", [])

        if isinstance(template_questions, dict):
            template_questions = list(template_questions.values()) if template_questions else []
        template_questions = list(template_questions) if template_questions else []

        template_questions.sort(key=lambda q: int(q.get("ord", 0) or 0))
        que_data_lookup = {str(q.get("id")): q for q in template_questions}

        questions = []
        for tq in template_questions:
            qid = str(tq.get("id", ""))
            qdata = que_data_lookup.get(qid, {})
            cats = qdata.get("categories")
            if isinstance(cats, str):
                try:
                    cats = json.loads(cats) if cats else []
                except (json.JSONDecodeError, TypeError):
                    cats = []
            elif cats is None:
                cats = []

            questions.append({
                "QueId": qid,
                "QueText": qdata.get("text", ""),
                "Order": tq.get("ord", 0),
                "QueScale": qdata.get("scales"),
                "QueCriteria": qdata.get("criteria", ""),
                "QueCategories": cats,
                "ParentId": qdata.get("parent_id"),
                "ParentCategoryTexts": qdata.get("parent_category_texts") or [],
                "Autofill": qdata.get("autofill", "No"),
            })

        autofill_questions = [q for q in questions if q.get("Autofill") == "Yes"]
        biodata = survey_data.Biodata or ""

        if autofill_questions and biodata:
            with ThreadPoolExecutor() as executor:
                results = list(executor.map(
                    lambda q: process_question_sync(_QuestionObj(q), biodata),
                    autofill_questions,
                ))
            autofill_lookup = {item.QueId: item for item in results if item is not None}
        else:
            autofill_lookup = {}

        insert_params = []
        for q in questions:
            af = autofill_lookup.get(q["QueId"])
            insert_params.append({
                "survey_id": survey_data.SurveyId,
                "question_id": q["QueId"],
                "answer": af.Ans if af else None,
                "ord": q["Order"],
                "autofill": q.get("Autofill", "No"),
            })

        if insert_params:
            sql_execute(
                """INSERT INTO survey_response_items (survey_id, question_id, answer, ord, autofill)
                VALUES (:survey_id, :question_id, :answer, :ord, :autofill)
                ON CONFLICT (survey_id, question_id)
                DO UPDATE SET answer = EXCLUDED.answer, autofill = EXCLUDED.autofill""",
                insert_params,
            )

        return SurveyQuestionsP(SurveyId=survey_data.SurveyId, QuestionswithAns=questions)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/surveys/create")
async def create_survey(survey_data: SurveyQuestionsP):
    """Create survey questions and autofill where needed (dashboard uses this after generate)."""
    try:
        autofill_questions = [q for q in survey_data.QuestionswithAns if q.Autofill == "Yes"]

        biodata = ""
        try:
            rows = sql_execute("SELECT biodata FROM surveys WHERE id = :survey_id", {"survey_id": survey_data.SurveyId})
            if rows:
                biodata = rows[0]["biodata"] or ""
        except Exception:
            pass

        autofill_lookup = {}
        if autofill_questions and biodata:
            with ThreadPoolExecutor() as executor:
                results = list(executor.map(
                    lambda q: process_question_sync(_QuestionObj(q.model_dump()), biodata),
                    autofill_questions,
                ))
            autofill_lookup = {item.QueId: item for item in results if item is not None}

        insert_params = []
        for item in survey_data.QuestionswithAns:
            autofill = autofill_lookup.get(item.QueId)
            insert_params.append({
                "survey_id": survey_data.SurveyId,
                "question_id": item.QueId,
                "answer": autofill.Ans if autofill else None,
                "ord": item.Order,
                "autofill": item.Autofill,
            })

        if insert_params:
            sql_execute(
                """INSERT INTO survey_response_items (survey_id, question_id, answer, ord, autofill)
                VALUES (:survey_id, :question_id, :answer, :ord, :autofill)
                ON CONFLICT (survey_id, question_id)
                DO UPDATE SET answer = EXCLUDED.answer, autofill = EXCLUDED.autofill""",
                insert_params,
            )

        try:
            sql_execute(
                "UPDATE surveys SET ai_augmented = :ai_augmented WHERE id = :survey_id",
                {"ai_augmented": survey_data.AiAugmented, "survey_id": survey_data.SurveyId},
            )
        except Exception:
            pass

        return {"message": f"Questions added to SurveyId {survey_data.SurveyId}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/surveys/{survey_id}/status")
async def update_survey_status(survey_id: str, status_update: SurveyStatusUpdateP):
    """Update survey status."""
    rows = sql_execute("SELECT * FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    if rows[0]["status"] == "Completed":
        raise HTTPException(status_code=400, detail=f"Survey {survey_id} already completed")

    comp_date = str(get_current_time())[:19].replace("T", " ") if status_update.Status == "Completed" else None
    sql_execute(
        "UPDATE surveys SET status = :status, completion_date = :completion_date WHERE id = :survey_id",
        {"survey_id": survey_id, "status": status_update.Status, "completion_date": comp_date},
    )
    return {"message": f"Status updated for SurveyId {survey_id}"}


@router.patch("/surveys/{survey_id}/csat")
async def update_survey_csat(survey_id: str, csat_update: SurveyCSATUpdateP):
    """Update CSAT score."""
    rows = sql_execute("SELECT * FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    if rows[0]["status"] == "In-Progress":
        raise HTTPException(status_code=400, detail=f"Survey {survey_id} is In-Progress")
    if rows[0].get("csat"):
        raise HTTPException(status_code=400, detail=f"Survey {survey_id} already has CSAT")

    sql_execute(
        "UPDATE surveys SET csat = :csat WHERE id = :survey_id",
        {"survey_id": survey_id, "csat": csat_update.CSAT},
    )
    return {"message": f"CSAT updated for SurveyId {survey_id}"}


@router.patch("/surveys/{survey_id}/duration")
async def update_survey_duration(survey_id: str, duration_update: SurveyDurationUpdateP):
    """Update completion duration."""
    rows = sql_execute("SELECT * FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    if rows[0]["status"] == "In-Progress":
        raise HTTPException(status_code=400, detail=f"Survey {survey_id} is In-Progress")
    if rows[0].get("completion_duration"):
        raise HTTPException(status_code=400, detail=f"Survey {survey_id} already has duration")

    sql_execute(
        "UPDATE surveys SET completion_duration = :completion_duration WHERE id = :survey_id",
        {"survey_id": survey_id, "completion_duration": duration_update.CompletionDuration},
    )
    return {"message": f"Duration updated for SurveyId {survey_id}"}


@router.post("/surveys/getquestions")
async def get_survey_questions_with_answers(body: SurveyQuestionsP):
    """Get survey questions with answers."""
    return await get_survey_questions(body.SurveyId)


@router.post("/surveys/submit", response_model=SurveyQnAP)
async def submit_survey(qna_data: SurveyQnAP):
    """Submit/update survey answers. Uses process_survey_question in parallel."""
    survey_id = qna_data.SurveyId
    questions = [q.model_dump() for q in qna_data.QuestionswithAns]

    with ThreadPoolExecutor() as executor:
        processed = list(executor.map(process_survey_question, questions))

    for i, q in enumerate(questions):
        if not q.get("Ans") and processed[i].get("Ans"):
            q["Ans"] = processed[i]["Ans"]

    for item in questions:
        sql_execute(
            """INSERT INTO survey_response_items (survey_id, question_id, answer, raw_answer, ord)
            VALUES (:survey_id, :question_id, :answer, :raw_answer, :ord)
            ON CONFLICT (survey_id, question_id)
            DO UPDATE SET answer = EXCLUDED.answer, raw_answer = EXCLUDED.raw_answer, ord = EXCLUDED.ord""",
            {
                "survey_id": survey_id,
                "question_id": item["QueId"],
                "answer": item.get("Ans"),
                "raw_answer": item.get("RawAns"),
                "ord": item.get("Order", 0),
            },
        )

    return SurveyQnAP(SurveyId=survey_id, QuestionswithAns=[SurveyQuestionAnswerP(**q) for q in questions])


@router.post("/surveys/submitphone")
async def submit_phone_answers(qna_data: SurveyQnAPhone, background_tasks: BackgroundTasks):
    """Submit phone answers. Processes raw answers in background."""
    data = qna_data.model_dump()
    background_tasks.add_task(process_survey_questions_background, data)
    return "Processing Started"


@router.post("/surveys/makecall")
async def makecall(request: MakeCallRequest):
    """Make VAPI call via voice-service /api/voice/make-call."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{VOICE_SERVICE_URL}/api/voice/make-call",
                params={
                    "survey_id": request.survey_id,
                    "phone": request.phone,
                    "provider": request.provider,
                },
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except httpx.RequestError as e:
        logger.error(f"Voice service call failed: {e}")
        raise HTTPException(status_code=502, detail=f"Voice service unreachable: {str(e)}")


@router.post("/surveys/sendemail")
async def sendemail(email: Email):
    """Send email survey."""
    api_key = os.getenv("MAILERSEND_API_KEY")
    sender_email = os.getenv("MAILERSEND_SENDER_EMAIL", "noreply@example.com")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Email service not configured: MAILERSEND_API_KEY is missing. Contact your administrator.",
        )

    try:
        ms = MailerSendClient(api_key=api_key)
        url = email.SurveyURL
        html_body = build_html_email(url)
        text_body = build_text_email(url)

        msg = (
            EmailBuilder()
            .from_email(sender_email, "SurvAI")
            .to_many([{"email": email.EmailTo, "name": "Recipient"}])
            .subject("Your Survey is Ready!")
            .html(html_body)
            .text(text_body)
            .build()
        )
        ms.emails.send(msg)
        logger.info(f"Survey email sent to {email.EmailTo} (survey: {url})")
        return {"message": "Email sent successfully"}
    except Exception as e:
        logger.exception(f"Failed to send survey email to {email.EmailTo}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}. Check that your MailerSend sender domain is verified.",
        )


@router.post("/surveys/callback")
async def schedule_callback(request: CallbackRequest):
    """Schedule callback. Uses APScheduler to call makecall after delay_minutes."""
    from scheduler import scheduler

    run_at = datetime.utcnow() + timedelta(minutes=request.delay_minutes)
    job_id = f"callback_{request.survey_id}_{request.phone.replace('+', '')}"
    try:
        job = scheduler.add_job(
            _run_makecall_sync,
            "date",
            run_date=run_at,
            args=[request.survey_id, request.phone, request.provider],
            id=job_id,
        )
        return {"job_id": job.id, "run_at": str(run_at), "message": "Callback scheduled"}
    except Exception as e:
        logger.error(f"Failed to schedule callback: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _run_makecall_sync(survey_id: str, phone: str, provider: str):
    """Synchronous wrapper for makecall (for APScheduler)."""
    import asyncio

    async def _call():
        async with httpx.AsyncClient(timeout=60.0) as client:
            await client.post(
                f"{VOICE_SERVICE_URL}/api/voice/make-call",
                params={"survey_id": survey_id, "phone": phone, "provider": provider},
            )

    asyncio.run(_call())


# ─── Aliases for frontend backward compatibility ─────────────────────────────

@router.post("/surveys/{survey_id}/csat")
async def update_survey_csat_post(survey_id: str, csat_update: SurveyCSATUpdateP):
    """POST alias for CSAT update (recipient app uses POST)."""
    return await update_survey_csat(survey_id, csat_update)


@router.post("/surveys/{survey_id}/duration")
async def update_survey_duration_post(survey_id: str, duration_update: SurveyDurationUpdateP):
    """POST alias for duration update (recipient app uses POST)."""
    return await update_survey_duration(survey_id, duration_update)


@router.delete("/surveys/{survey_id}")
async def delete_survey(survey_id: str):
    """Delete a survey and all its responses."""
    rows = sql_execute("SELECT * FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")
    if rows[0]["status"] == "Completed":
        raise HTTPException(status_code=400, detail=f"Can't delete completed Survey {survey_id}")

    sql_execute("DELETE FROM survey_response_items WHERE survey_id = :survey_id", {"survey_id": survey_id})
    sql_execute("DELETE FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    return {"message": f"Survey deleted with SurveyId {survey_id}"}


@router.post("/surveys/email")
async def sendemail_alias(email: Email):
    """Alias: /surveys/email -> /surveys/sendemail (dashboard expects this)."""
    return await sendemail(email)


class SMSRequest(BaseModel):
    phone: str
    survey_id: str
    survey_url: Optional[str] = None
    rider_name: Optional[str] = None
    language: str = "en"


@router.post("/surveys/sendsms")
async def send_sms_survey(request: SMSRequest):
    """Send SMS with survey link - backup for missed calls."""
    from sms import send_survey_link_sms
    
    survey_url = request.survey_url
    if not survey_url:
        survey_url = f"{os.getenv('RECIPIENT_URL', 'http://localhost:8080')}/survey/{request.survey_id}"
    
    result = send_survey_link_sms(
        to_phone=request.phone,
        survey_url=survey_url,
        rider_name=request.rider_name,
        language=request.language
    )
    
    if result.get("success"):
        return {"status": "sent", "message_sid": result.get("message_sid")}
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "SMS send failed"))


@router.post("/surveys/sms")
async def send_sms_alias(request: SMSRequest):
    """Alias: /surveys/sms -> /surveys/sendsms."""
    return await send_sms_survey(request)


@router.post("/surveys/make-call")
async def make_call_alias(to: str, survey_id: str, run_at: Optional[str] = None, provider: str = "vapi"):
    """Alias: /surveys/make-call (dashboard expects hyphenated version)."""
    return await makecall(MakeCallRequest(survey_id=survey_id, phone=to, provider=provider))


@router.post("/answers/qna", response_model=SurveyQnAP)
async def update_survey_qna(qna_data: SurveyQnAP):
    """Submit answers (recipient app uses /answers/qna path)."""
    return await submit_survey(qna_data)


@router.post("/answers/qna_phone")
async def update_survey_qna_phone(qna_data: SurveyQnAPhone, background_tasks: BackgroundTasks):
    """Submit phone answers (VAPI callback uses this path)."""
    return await submit_phone_answers(qna_data, background_tasks)


@router.post("/surveys/list_surveys_from_templates", response_model=SurveyFromTemplateP)
async def list_surveys_from_templates(template_name: dict):
    """Get survey stats from template (POST version)."""
    name = template_name.get("TemplateName", "")
    return await get_surveys_from_template(name)


@router.post("/surveys/get-transcript")
async def get_transcript_post(survey_id: str):
    """POST alias for transcript (original monolith used POST)."""
    return await get_transcript(survey_id)


@router.post("/surveys/{survey_id}/question_answer")
async def get_survey_question_answer(survey_id: str, request: dict):
    """Get a specific question's answer within a survey."""
    que_id = request.get("QueId", "")
    rows = sql_execute("SELECT id FROM surveys WHERE id = :survey_id", {"survey_id": survey_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")

    question_rows = sql_execute("""
        SELECT q.id, q.text, q.criteria, q.scales, q.parent_id,
               sri.ord AS "order", sri.answer, sri.raw_answer, sri.autofill,
               COALESCE(qc.categories, null::json) AS categories,
               COALESCE(pm.parent_category_texts, null::json) AS parent_category_texts
        FROM survey_response_items sri
        JOIN questions q ON sri.question_id = q.id
        LEFT JOIN (SELECT question_id, json_agg(text ORDER BY text) AS categories FROM question_categories GROUP BY question_id) qc ON qc.question_id = q.id
        LEFT JOIN (SELECT m.child_question_id, json_agg(qc2.text ORDER BY qc2.text) AS parent_category_texts FROM question_category_mappings m JOIN question_categories qc2 ON qc2.id = m.parent_category_id GROUP BY m.child_question_id) pm ON pm.child_question_id = q.id
        WHERE sri.survey_id = :survey_id AND sri.question_id = :question_id LIMIT 1
    """, {"survey_id": survey_id, "question_id": que_id})
    if not question_rows:
        raise HTTPException(status_code=404, detail=f"Question {que_id} not found for Survey {survey_id}")
    return question_rows[0]
