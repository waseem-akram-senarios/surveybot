import logging
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import List, Optional

import requests
from fastapi import APIRouter, BackgroundTasks, HTTPException
from mailersend import EmailBuilder, MailerSendClient
from models import (
    Email,
    GetTemplateQuestionsRequestP,
    QuestionIdRequestP,
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
    SurveyStatusP,
    SurveyStatusUpdateP,
    TemplateNameRequestP,
)
from schedule import scheduler
from utils import (
    build_html_email,
    build_text_email,
    get_current_time,
    process_question_sync,
    process_survey_question,
    sql_execute,
)

from .template_questions import get_template_questions

# LiveKit imports (optional - only used when provider=livekit)
try:
    from livekit_caller import dispatch_livekit_call, get_livekit_transcript
    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False

logger = logging.getLogger(__name__)
router = APIRouter()

SURVEY_BASE_URL = "main.d3unjy9nz250ey.amplifyapp.com"


@router.post(
    "/surveys/generate",
    response_model=SurveyQuestionsP,
    description="""
    Create a new survey instance based on a template, generating questions for completion.

    Args:
        survey_data (object): Object containing:
            - SurveyId (str): Unique identifier for the survey (auto-generated if not provided)
            - Biodata (str): Customer profile information
            - Recipient (str): Name of the survey recipient
            - Name (str): Survey name (must match an existing template name)
            - RiderName (str): Name of the driver/rider
            - RideId (str): Unique identifier for the ride
            - TenantId (str): Tenant identifier
            - URL (str): URL for the survey

    Returns:
        object: Object containing:
            - SurveyId (str): Survey ID
            - QuestionswithAns (list): Array of question objects
    """,
)
async def generate_survey(survey_data: SurveyCreateP):
    try:
        # Check if survey exists
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_data.SurveyId}
        res = sql_execute(sql_query, sql_dict)
        if res:
            raise HTTPException(
                status_code=400,
                detail=f"Survey with ID {survey_data.SurveyId} already exists",
            )

        # Check if template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": survey_data.Name}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {survey_data.Name} not found",
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        # # Create a new survey
        sql_query = """INSERT INTO surveys (id, template_name, url, biodata, status, name, recipient, launch_date, rider_name, ride_id, tenant_id)
        VALUES (:id, :template_name, :url, :biodata, :status, :name, :recipient, :launch_date, :rider_name, :ride_id, :tenant_id)"""
        sql_dict = {
            "id": survey_data.SurveyId,
            "template_name": survey_data.Name,
            "url": survey_data.URL,  # or f"https://{SURVEY_BASE_URL}/survey/{survey_data.SurveyId}",
            "biodata": survey_data.Biodata,
            "status": "In-Progress",
            "name": survey_data.Name,
            "recipient": survey_data.Recipient,
            "launch_date": str(get_current_time())[:19].replace("T", " "),
            "rider_name": survey_data.RiderName,
            "ride_id": survey_data.RideId,
            "tenant_id": survey_data.TenantId,
        }
        sql_execute(sql_query, sql_dict)

        tq = GetTemplateQuestionsRequestP(TemplateName=survey_data.Name)
        template_questions_response = await get_template_questions(tq)

        template_questions = template_questions_response.get("Questions", [])

        # Sort template questions by their original order
        template_questions.sort(key=lambda q: int(q.get("ord", "0")))
        # print(f"Template Questions: {template_questions}")

        # que_ids = [{"QueId": q["id"]} for q in template_questions]
        # print(que_ids)

        # Create a lookup dictionary for que_data by QueId
        que_data_lookup = {q["id"]: q for q in template_questions}
        # print(f"que_data_lookup: {que_data_lookup}")
        questions = []
        for tq in template_questions:
            qid = tq["id"]
            qdata = que_data_lookup.get(qid, {})
            questions.append(
                {
                    "QueId": qid,
                    "QueText": qdata.get("text", ""),
                    "Order": tq["ord"],
                    "QueScale": qdata.get("scales", ""),
                    "QueCriteria": qdata.get("criteria", ""),
                    "QueCategories": qdata.get("categories", ""),
                    # Pass down mapping info for client visibility/use
                    "ParentId": qdata.get("parent_id"),
                    "ParentCategoryTexts": qdata.get("parent_category_texts"),
                    "Autofill": qdata.get("autofill", "No"),
                }
            )
        # Create and return the SurveyQnA object
        return SurveyQuestionsP(
            SurveyId=survey_data.SurveyId, QuestionswithAns=questions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/create",
    status_code=200,
    description="""
    Create survey questions and automatically fill answers for questions marked with Autofill.

    Args:
        survey_data (object): Object containing:
            - SurveyId (str): Survey identifier
            - QuestionswithAns (list): Array of question objects with:
                - QueId (str): Question ID
                - Order (int): Question order
                - Autofill ("Yes" | "No"): Whether to auto-fill this question

    Returns:
        dict: Object containing:
            - message (str): Success confirmation message
    """,
)
async def create_survey(survey_data: SurveyQuestionsP):
    try:
        # Get list of questions to be autofilled
        autofill_questions = [
            q for q in survey_data.QuestionswithAns if q.Autofill == "Yes"
        ]

        # Get biodata for the survey
        try:
            sql_query = """
                    SELECT biodata FROM surveys WHERE id = :survey_id
                """
            sql_dict = {"survey_id": survey_data.SurveyId}
            biodata = sql_execute(sql_query, sql_dict)[0]["biodata"]
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error fetching survey biodata: {str(e)}"
            )
        # Process questions in parallel
        with ThreadPoolExecutor() as executor:
            results = list(
                executor.map(
                    lambda q: process_question_sync(q, biodata), autofill_questions
                )
            )

        # Build a lookup for autofilled answers
        autofill_lookup = {item.QueId: item for item in results if item is not None}

        sql_dict = []
        for item in survey_data.QuestionswithAns:
            autofill = autofill_lookup.get(item.QueId)
            sql_dict.append(
                {
                    "survey_id": survey_data.SurveyId,
                    "question_id": item.QueId,
                    "answer": autofill.Ans if autofill else None,
                    "ord": item.Order,
                    "autofill": item.Autofill,
                }
            )
        sql_query = """INSERT INTO survey_response_items (survey_id, question_id, answer, ord, autofill)
VALUES (:survey_id, :question_id, :answer, :ord, :autofill)
ON CONFLICT (survey_id, question_id)
DO UPDATE SET answer = EXCLUDED.answer, autofill = EXCLUDED.autofill"""
        _ = sql_execute(sql_query, sql_dict)

        return {"message": f"Questions added to SurveyId {survey_data.SurveyId}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/surveys/{survey_id}",
    status_code=200,
    description="""
    Delete a survey and all its responses (only allowed for non-completed surveys).

    Args:
        survey_id (str): Unique identifier for the survey

    Returns:
        dict: Object containing:
            - message (str): Success confirmation message
    """,
)
async def delete_survey(survey_id: str):
    try:
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} not found",
            )

        # Delete all questions and answers for each question in the survey
        sql_query = """DELETE FROM survey_response_items WHERE survey_id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        sql_execute(sql_query, sql_dict)

        # Finally, delete the survey itself
        sql_query = """DELETE FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        sql_execute(sql_query, sql_dict)
        return {"message": f"Survey deleted with SurveyId {survey_id}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch(
    "/surveys/{survey_id}/status",
    status_code=200,
    description="""
    Update survey status to Completed or In-Progress.

    Args:
        survey_id (str): Unique identifier for the survey
        status_update (object): Object containing:
            - Status ("In-Progress" | "Completed"): New survey status

    Returns:
        dict: Object containing:
            - message (str): Success confirmation message
    """,
)
async def update_survey_status(survey_id: str, status_update: SurveyStatusUpdateP):
    try:
        # Check if survey exists and is not completed
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} not found",
            )

        # Check if survey was already completed
        if res[0]["status"] == "Completed":
            logger.info("Survey was already completed - skipping update")
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} already has a status of {res[0]['status']}",
            )
        comp_date = (
            str(get_current_time())[:19].replace("T", " ")
            if status_update.Status == "Completed"
            else None
        )

        # Only update completion date and duration if this is the first completion
        sql_query = """UPDATE surveys SET status = :status, completion_date = :completion_date WHERE id = :survey_id"""
        sql_dict = {
            "survey_id": survey_id,
            "status": status_update.Status,
            "completion_date": comp_date,
        }
        sql_execute(sql_query, sql_dict)

        return {"message": f"Status successfully updated for SurveyId {survey_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/{survey_id}/csat",
    status_code=200,
    description="""
    Set the Customer Satisfaction (CSAT) score for a completed survey.

    Args:
        survey_id (str): Unique identifier for the survey
        csat_update (object): Object containing:
            - CSAT (int | None): CSAT score (typically 1-5)

    Returns:
        dict: Object containing:
            - message (str): Success confirmation message
    """,
)
async def update_survey_csat(survey_id: str, csat_update: SurveyCSATUpdateP):
    try:
        # Check if survey exists and is not completed
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} not found",
            )

        if res[0]["status"] == "In-Progress":
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} is In-Progress",
            )
        # Check if survey was already completed
        if res[0]["csat"]:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} already has a CSAT score of {res[0]['csat']}",
            )

        # Update the status, completion date and duration if survey is completed
        sql_query = """UPDATE surveys SET csat = :csat WHERE id = :survey_id"""
        sql_dict = {
            "survey_id": survey_id,
            "csat": csat_update.CSAT,
        }
        sql_execute(sql_query, sql_dict)

        return {"message": f"CSAT successfully updated for SurveyId {survey_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/{survey_id}/duration",
    status_code=200,
    description="""
    Record the completion duration for a survey.

    Args:
        survey_id (str): Unique identifier for the survey
        duration_update (object): Object containing:
            - CompletionDuration (int | None): Duration in seconds

    Returns:
        dict: Object containing:
            - message (str): Success confirmation message
    """,
)
async def update_survey_duration(
    survey_id: str, duration_update: SurveyDurationUpdateP
):
    try:
        # Check if survey exists and is not completed
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} not found",
            )

        if res[0]["status"] == "In-Progress":
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} is In-Progress",
            )
        # Check if survey was already completed
        if res[0]["completion_duration"]:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} already has a completion duration of {res[0]['completion_duration']}",
            )
        sql_query = """UPDATE surveys SET completion_duration = :completion_duration WHERE id = :survey_id"""
        sql_dict = {
            "survey_id": survey_id,
            "completion_duration": duration_update.CompletionDuration,
        }
        sql_execute(sql_query, sql_dict)
        return {"message": f"Duration successfully updated for SurveyId {survey_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/surveys/list",
    response_model=List[SurveyP],
    description="""
    Retrieve all surveys with their basic information.

    Returns:
        list: Array of survey objects, each containing:
            - SurveyId (str): Survey ID
            - Biodata (str): Customer profile information
            - Recipient (str): Survey recipient name
            - Name (str): Survey name
            - RiderName (str): Driver/rider name
            - RideId (str): Ride ID
            - TenantId (str): Tenant ID
            - URL (str): Survey URL
            - Status ("In-Progress" | "Completed"): Survey status
            - LaunchDate (str): Launch date in YYYY-MM-DD HH:MM:SS format
            - CompletionDate (str): Completion date in YYYY-MM-DD HH:MM:SS format
    """,
)
async def list_surveys():
    try:
        sql_query = """SELECT * FROM surveys"""
        sql_dict = []
        surveys = sql_execute(sql_query, sql_dict)
        survey_tables_items = [
            {
                "SurveyId": item["id"],
                "Biodata": item["biodata"],
                "Recipient": item["recipient"],
                "Name": item["name"],
                "RiderName": item["rider_name"],
                "RideId": item["ride_id"],
                "TenantId": item["tenant_id"],
                "URL": item["url"],
                "Status": item["status"],
                "LaunchDate": str(item["launch_date"])[:19],
                "CompletionDate": str(item["completion_date"])[:19],
            }
            for item in surveys
        ]
        return survey_tables_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/surveys/list_completed",
    response_model=List[SurveyP],
    description="""
    Retrieve only completed surveys.

    Returns:
        list: Array of completed survey objects with same structure as list_surveys
    """,
)
async def list_completed_surveys():
    try:
        sql_query = """SELECT * FROM surveys where status = 'Completed'"""
        sql_dict = []
        surveys = sql_execute(sql_query, sql_dict)
        survey_tables_items = [
            {
                "SurveyId": item["id"],
                "Biodata": item["biodata"],
                "Recipient": item["recipient"],
                "Name": item["name"],
                "RiderName": item["rider_name"],
                "RideId": item["ride_id"],
                "TenantId": item["tenant_id"],
                "URL": item["url"],
                "Status": item["status"],
                "LaunchDate": str(item["launch_date"])[:19],
                "CompletionDate": str(item["completion_date"])[:19],
            }
            for item in surveys
        ]
        return survey_tables_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/surveys/list_inprogress",
    response_model=List[SurveyP],
    description="""
    Retrieve only active/in-progress surveys.

    Returns:
        list: Array of in-progress survey objects with same structure as list_surveys
    """,
)
async def list_inprogress_surveys():
    try:
        sql_query = """SELECT * FROM surveys where status = 'In-Progress'"""
        sql_dict = []
        surveys = sql_execute(sql_query, sql_dict)
        survey_tables_items = [
            {
                "SurveyId": item["id"],
                "Biodata": item["biodata"],
                "Recipient": item["recipient"],
                "Name": item["name"],
                "RiderName": item["rider_name"],
                "RideId": item["ride_id"],
                "TenantId": item["tenant_id"],
                "URL": item["url"],
                "Status": item["status"],
                "LaunchDate": str(item["launch_date"])[:19],
                "CompletionDate": str(item["completion_date"])[:19],
            }
            for item in surveys
        ]
        return survey_tables_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/surveys/{survey_id}/status",
    response_model=SurveyStatusP,
    description="""
    Get the current status, dates, and CSAT score of a specific survey.

    Args:
        survey_id (str): Unique identifier for the survey

    Returns:
        object: Object containing:
            - SurveyId (str): Survey ID
            - Status ("In-Progress" | "Completed"): Current status
            - LaunchDate (str): Launch date in YYYY-MM-DD HH:MM:SS format
            - CompletionDate (str): Completion date in YYYY-MM-DD HH:MM:SS format
            - CSAT (int | None): CSAT score if available
    """,
)
async def get_survey_status(survey_id: str):
    try:
        # Check if survey exists and get its status
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} not found",
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    # Return the survey status
    return {
        "SurveyId": survey_id,
        "Status": res[0]["status"],
        "LaunchDate": str(res[0]["launch_date"])[:19],
        "CompletionDate": str(res[0].get("completion_date", ""))[:19],
        "CSAT": res[0].get("csat", None),
    }


@router.get(
    "/surveys/{survey_id}/recipient",
    status_code=200,
    description="""
    Get recipient information and survey name for a specific survey.

    Args:
        survey_id (str): Unique identifier for the survey

    Returns:
        dict: Object containing:
            - SurveyId (str): Survey ID
            - Recipient (str): Survey recipient name
            - Name (str): Survey name
            - RideID (str): Ride ID
            - TenantID (str): Tenant ID
    """,
)
async def get_survey_recipient(survey_id: str):
    try:
        # Check if survey exists and get its status
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} not found",
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Return the survey status
    return {
        "SurveyId": survey_id,
        "Recipient": res[0]["recipient"],
        "Name": res[0]["name"],
        "RideID": res[0]["ride_id"],
        "TenantID": res[0]["tenant_id"],
    }


@router.get(
    "/surveys/{survey_id}/recipient_info",
    description="Get recipient info for a survey (used by LiveKit agent).",
)
async def get_survey_recipient_info(survey_id: str):
    """Public GET endpoint for the LiveKit agent to fetch recipient info."""
    return await get_survey_recipient(survey_id)


@router.get(
    "/surveys/{survey_id}/questions",
    description="""
    Retrieve all questions and their current answers for a survey.

    Args:
        survey_id (str): Unique identifier for the survey

    Returns:
        dict: Object containing:
            - SurveyId (str): Survey ID
            - Questions (list): Array of question objects with answers
    """,
)
async def get_survey_questions(survey_id: str):
    try:
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} not found",
            )

        # Query the surveys_response_items table for all questions with this survey ID
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
 JOIN questions q
   ON sri.question_id = q.id
 LEFT JOIN (
   SELECT
     question_id,
     json_agg(text ORDER BY text) AS categories
   FROM question_categories
   GROUP BY question_id
 ) qc
   ON qc.question_id = q.id
 LEFT JOIN (
   SELECT m.child_question_id,
          json_agg(qc2.text ORDER BY qc2.text) AS parent_category_texts
     FROM question_category_mappings m
     JOIN question_categories qc2 ON qc2.id = m.parent_category_id
    GROUP BY m.child_question_id
 ) pm
   ON pm.child_question_id = q.id
 WHERE sri.survey_id = :survey_id
 ORDER BY sri.ord;"""
        sql_dict = {"survey_id": survey_id}
        questions_response = sql_execute(sql_query, sql_dict)
        if len(questions_response) == 0:
            return {"SurveyId": survey_id, "Questions": []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"SurveyId": survey_id, "Questions": questions_response}


@router.get(
    "/surveys/{survey_id}/questions_unanswered",
    description="""
    Get only the unanswered questions for a survey.

    Args:
        survey_id (str): Unique identifier for the survey

    Returns:
        dict: Object containing:
            - SurveyId (str): Survey ID
            - Questions (list): Array of unanswered question objects
    """,
)
async def get_survey_questions_unanswered(survey_id: str):
    try:
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} not found",
            )

        # Query the surveys_response_items table for all questions with this survey ID
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
 JOIN questions q
   ON sri.question_id = q.id
 LEFT JOIN (
   SELECT
     question_id,
     json_agg(text ORDER BY text) AS categories
   FROM question_categories
   GROUP BY question_id
 ) qc
   ON qc.question_id = q.id
 LEFT JOIN (
   SELECT m.child_question_id,
          json_agg(qc2.text ORDER BY qc2.text) AS parent_category_texts
     FROM question_category_mappings m
     JOIN question_categories qc2 ON qc2.id = m.parent_category_id
    GROUP BY m.child_question_id
 ) pm
   ON pm.child_question_id = q.id
 WHERE sri.survey_id = :survey_id AND answer IS NULL AND raw_answer IS NULL
 ORDER BY sri.ord;"""
        sql_dict = {"survey_id": survey_id}
        questions_response = sql_execute(sql_query, sql_dict)
        if len(questions_response) == 0:
            return {"SurveyId": survey_id, "Questions": []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"SurveyId": survey_id, "Questions": questions_response}


@router.get(
    "/surveys/stat",
    response_model=SurveyStats,
    description="""
    Get comprehensive survey statistics including completion rates, durations, and CSAT averages.

    Returns:
        object: Object containing:
            - Total_Surveys (int): Total number of surveys
            - Total_Active_Surveys (int): Number of in-progress surveys
            - Total_Completed_Surveys (int): Number of completed surveys
            - Total_Completed_Surveys_Today (int): Surveys completed today
            - Median_Completion_Duration (int): Median completion time in seconds
            - Median_Completion_Duration_Today (int): Median completion time today
            - AverageCSAT (float): Average CSAT score
    """,
)
async def survey_stat():
    try:
        sql_query = """SELECT
    COUNT(*) FILTER (WHERE TRUE) AS total_surveys,
    COUNT(*) FILTER (WHERE "status" = 'Completed') AS total_completed_surveys,
    COUNT(*) FILTER (WHERE "status" = 'In-Progress') AS total_active_surveys,
    COUNT(*) FILTER (
        WHERE "status" = 'Completed' AND DATE("completion_date") = CURRENT_DATE
    ) AS completed_surveys_today,

    COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY completion_duration)
        FILTER (WHERE "status" = 'Completed')), 0) AS durations_median,

    COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY completion_duration)
        FILTER (
            WHERE "status" = 'Completed' AND DATE("completion_date") = CURRENT_DATE
        )), 0) AS durations_today_median,

    COALESCE(ROUND(AVG(csat) FILTER (WHERE "status" = 'Completed')), 0) AS csat_avg
FROM surveys;
"""
        sql_dict = {}
        res = sql_execute(sql_query, sql_dict)

        if not res:
            return SurveyStats(
                Total_Surveys=0,
                Total_Active_Surveys=0,
                Total_Completed_Surveys=0,
                Total_Completed_Surveys_Today=0,
                Median_Completion_Duration=0,
                Median_Completion_Duration_Today=0,
                Total_Published_Templates_ThisMonth=0,
            )
        # Convert keys to match Pydantic model field names
        return SurveyStats(
            Total_Surveys=res[0]["total_surveys"],
            Total_Active_Surveys=res[0]["total_active_surveys"],
            Total_Completed_Surveys=res[0]["total_completed_surveys"],
            Total_Completed_Surveys_Today=res[0]["completed_surveys_today"],
            Median_Completion_Duration=res[0]["durations_median"],
            Median_Completion_Duration_Today=res[0]["durations_today_median"],
            AverageCSAT=int(res[0]["csat_avg"]),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/answers/qna",
    response_model=SurveyQnAP,
    description="""
    Update survey responses with both raw answers and processed answers for multiple questions.

    Args:
        qna_data (object): Object containing:
            - SurveyId (str): Survey identifier
            - QuestionswithAns (list): Array of question-answer objects, each containing:
                - QueId (str): Question ID
                - Order (int): Question order
                - QueText (str): Question text
                - QueScale (int | None): Scale value
                - QueCriteria ("scale" | "categorical" | "open"): Question type
                - QueCategories (list | None): Question categories
                - Ans (str | None): Processed answer
                - RawAns (str | None): Raw user input
                - Autofill ("Yes" | "No"): Whether answer was auto-filled

    Returns:
        same object as the input
    """,
)
async def update_survey_qna(qna_data: SurveyQnAP):
    survey_id = qna_data.SurveyId
    questions = qna_data.QuestionswithAns

    # Convert Pydantic models to dictionaries for processing
    questions_dicts = [q.model_dump() for q in questions]

    # Process questions in parallel
    with ThreadPoolExecutor() as executor:
        # Process all questions that need parsing
        processed_questions = list(
            executor.map(process_survey_question, questions_dicts)
        )

    # Update the original question objects with processed answers
    for i, question in enumerate(questions_dicts):
        if not question["Ans"] and processed_questions[i].get("Ans"):
            question["Ans"] = processed_questions[i]["Ans"]

    sql_dict = []
    for item in questions_dicts:
        sql_dict.append(
            {
                "survey_id": survey_id,
                "question_id": item["QueId"],
                "answer": item["Ans"],
                "raw_answer": item["RawAns"],
                "ord": item["Order"],
            }
        )
        sql_query = """INSERT INTO survey_response_items (survey_id, question_id, answer, raw_answer, ord)
    VALUES (:survey_id, :question_id, :answer, :raw_answer, :ord)
    ON CONFLICT (survey_id, question_id)
    DO UPDATE SET answer = EXCLUDED.answer, raw_answer = EXCLUDED.raw_answer, ord = EXCLUDED.ord"""
        _ = sql_execute(sql_query, sql_dict)

    # return {
    #     "SurveyId": survey_id,
    #     "message": f"Successfully updated {len(questions)} questions",
    # }

    # After processing, convert back to Pydantic models
    questions_models = [SurveyQuestionAnswerP(**q) for q in questions_dicts]
    return SurveyQnAP(SurveyId=survey_id, QuestionswithAns=questions_models)


# @router.post(
#     "/answers/qna_phone",
#     response_model=SurveyQnAP,
#     description="""
#     Update survey responses with raw answers coming from phone mode.

#     Args:
#         qna_data (object): Object containing:
#             - SurveyId (str): Survey identifier
#             - QuestionswithAnsPhone (list): Array of question-answer objects, each containing:
#                 - QueId (str): Question ID
#                 - RawAns (str | None): Raw user input


#     Returns:
#         same object as the input
#     """,
# )


def transform_qna(qna_data):
    result = []
    for key, value in qna_data.items():
        # skip keys that start with "{"
        if value.startswith("{"):
            continue

        # extract the part after the last underscore, ignoring "q_" if present
        # match = re.match(r"^question_\d?_(.+)$", key)
        # if match:
        #     new_key = match.group(1)
        result.append({"QueId": key, "RawAns": value, "Ans": value})

    return result


async def process_survey_questions_background(qna_data):
    """Background task to process survey questions asynchronously."""
    try:
        survey_id = qna_data.pop("SurveyId")
        logger.info(
            f"Processing survey questions in background for survey: {survey_id}"
        )
        logger.info("-----qna_data---")
        logger.info(qna_data)

        questions = transform_qna(qna_data)
        logger.info("-----questionss---")
        logger.info(questions)

        survey_questions = await get_survey_questions(survey_id)
        survey_questions = survey_questions["Questions"]

        survey_questions_dict = {q["id"]: q for q in survey_questions}

        questions_dicts = []
        for question in questions:
            detailed_question = survey_questions_dict.get(question["QueId"])
            if detailed_question:
                # Create a new dict with all required fields
                updated_question = {
                    "QueId": question["QueId"],
                    "QueText": detailed_question.get("question_text", ""),
                    "QueCriteria": detailed_question.get("criteria", ""),
                    "QueScale": detailed_question.get("scale", ""),
                    "QueCategories": detailed_question.get("categories", []),
                    "Ans": question.get("Ans", ""),
                    "RawAns": question.get("RawAns", ""),
                    "Order": detailed_question.get("order", 0),
                    # Include any additional fields from detailed_question that might be needed
                    # **{k: v for k, v in detailed_question.items()
                    #    if k not in ["question_text", "criteria", "scale", "categories"]}
                }
                questions_dicts.append(updated_question)
        logger.info("-----questions_dicts---")
        logger.info(questions_dicts)
        # Process questions in parallel
        with ThreadPoolExecutor() as executor:
            processed_questions = list(
                executor.map(process_survey_question, questions_dicts)
            )

        # Update the original question objects with processed answers
        for i, question in enumerate(questions_dicts):
            if not question["Ans"] and processed_questions[i].get("Ans"):
                question["Ans"] = processed_questions[i]["Ans"]

        # Prepare and execute SQL updates
        sql_dict = []
        for item in questions_dicts:
            sql_dict = {
                "survey_id": survey_id,
                "question_id": item["QueId"],
                "answer": item["Ans"],
                "raw_answer": item["RawAns"],
                "ord": item["Order"],
            }
            sql_query = """
                INSERT INTO survey_response_items (survey_id, question_id, answer, raw_answer, ord)
                VALUES (:survey_id, :question_id, :answer, :raw_answer, :ord)
                ON CONFLICT (survey_id, question_id)
                DO UPDATE SET 
                    answer = EXCLUDED.answer, 
                    raw_answer = EXCLUDED.raw_answer, 
                    ord = EXCLUDED.ord
            """
            _ = sql_execute(sql_query, sql_dict)

        logger.info(f"Successfully processed survey questions for survey: {survey_id}")

        # Update survey status to completed
        comp_date = str(get_current_time())[:19].replace("T", " ")
        sql_query = """UPDATE surveys SET status = :status, completion_date = :completion_date WHERE id = :survey_id"""
        sql_dict = {
            "survey_id": survey_id,
            "status": "Completed",
            "completion_date": comp_date,
        }
        sql_execute(sql_query, sql_dict)
        logger.info(
            f"Successfully updated survey status to completed for survey: {survey_id}"
        )
    except Exception as e:
        logger.warning(f"Error processing survey questions in background: {str(e)}")


@router.post(
    "/answers/qna_phone",
    # response_model=SurveyQnAPhone,
    status_code=200,
    summary="Update survey questions and answers (phone)",
    description="""
    Update survey questions and answers in the database for phone surveys.
    
    Args:
        - QuestionswithAnsPhone (list): Array of question-answer objects, each containing:
            - QueId (str): Question ID
            - RawAns (str | None): Raw user input

    Returns:
        same object as the input
    """,
)
async def update_survey_qna_phone(
    qna_data: SurveyQnAPhone, background_tasks: BackgroundTasks
):
    """
    Process survey questions in the background and return immediately.
    """
    qna_data = qna_data.model_dump()

    # Add the background task
    background_tasks.add_task(process_survey_questions_background, qna_data)

    # Return immediately with the input data
    return "Processing Started"


@router.post(
    "/surveys/list_surveys_from_templates",
    response_model=SurveyFromTemplateP,
    description="""
    Get count statistics of surveys created from a specific template.

    Args:
        template_name (object): Object containing:
            - TemplateName (str): Name of the template

    Returns:
        object: Object containing:
            - Total (int): Total surveys created from template
            - Completed (int): Number of completed surveys
            - InProgress (int): Number of in-progress surveys
    """,
)
async def list_surveys_from_templates(template_name: TemplateNameRequestP):
    try:
        sql_query = """SELECT
	COUNT(*) FILTER (WHERE template_name = :template_name) AS total_surveys,
	SUM(CASE WHEN status = 'Completed' AND template_name = :template_name THEN 1 ELSE 0 END) AS total_completed_surveys,
	SUM(CASE WHEN status != 'Completed' AND template_name = :template_name THEN 1 ELSE 0 END) AS total_active_surveys
FROM surveys"""
        sql_dict = {"template_name": template_name.TemplateName}
        templates_table_items = sql_execute(sql_query, sql_dict)
        total = templates_table_items[0]["total_surveys"]
        return SurveyFromTemplateP(
            Total=total,
            Completed=templates_table_items[0]["total_completed_surveys"],
            InProgress=templates_table_items[0]["total_active_surveys"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/surveys/{survey_id}/questionsonly",
    description="""
    Retrieve questions in the form of a list for a survey.

    Args:
        survey_id (str): Unique identifier for the survey

    Returns:
        list: Array of question objects with answers
    """,
)
async def get_survey_questions_only(survey_id: str):
    try:
        sql_query = """SELECT q.text
FROM survey_response_items sri
JOIN questions q ON sri.question_id = q.id
WHERE sri.survey_id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        survey_questions = sql_execute(sql_query, sql_dict)
        survey_questions = [q["text"] for q in survey_questions]
        return survey_questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/{survey_id}/question_answer",
    status_code=200,
    description="""
    Retrieve the answer and raw answer for a specific question within a survey.

    Args:
        survey_id (str): Survey identifier (path parameter)
        request (object): Object containing:
            - QueId (str): ID of the question to fetch

    Returns:
        object: Question object with fields:
            - id (str)
            - text (str)
            - criteria (str)
            - scales (int | null)
            - parent_id (str | null)
            - order (int)
            - answer (str | null)
            - raw_answer (str | null)
            - categories (array | null)
            - parent_category_texts (array | null)
            - autofill (str)
    """,
)
async def get_survey_question_answer(survey_id: str, request: QuestionIdRequestP):
    try:
        # Validate survey exists
        sql_query = """SELECT id FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Survey with ID {survey_id} not found",
            )

        # Fetch the detailed question object for the specific question
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
 JOIN questions q
   ON sri.question_id = q.id
 LEFT JOIN (
   SELECT
     question_id,
     json_agg(text ORDER BY text) AS categories
   FROM question_categories
   GROUP BY question_id
 ) qc
   ON qc.question_id = q.id
 LEFT JOIN (
   SELECT m.child_question_id,
          json_agg(qc2.text ORDER BY qc2.text) AS parent_category_texts
     FROM question_category_mappings m
     JOIN question_categories qc2 ON qc2.id = m.parent_category_id
    GROUP BY m.child_question_id
 ) pm
   ON pm.child_question_id = q.id
 WHERE sri.survey_id = :survey_id AND sri.question_id = :question_id
 LIMIT 1;"""
        sql_dict = {"survey_id": survey_id, "question_id": request.QueId}
        rows = sql_execute(sql_query, sql_dict)

        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"Question with ID {request.QueId} not found for Survey {survey_id}",
            )

        return rows[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/email",
    description="""
    Send email for a survey.

    Args:
        survey_url (str): URL of the survey
        EmailTo (str): Email address to send the survey to

    Returns:
        str: A confirmation message
    """,
)
async def send_survey_email(email: Email):
    try:
        email_address = email.EmailTo  # noqa: F841
        ms = MailerSendClient(api_key=os.getenv("MAILERSEND_API_KEY"))

        url = email.SurveyURL
        html_body = build_html_email(url)
        text_body = build_text_email(url)

        email = (
            EmailBuilder()
            .from_email(
                os.getenv("MAILERSEND_SENDER_EMAIL"), "Survey"
            )  # can't be changed for now
            .to_many(
                [{"email": email_address, "name": "Me"}]
            )  # can't be changed for now
            .subject("Survey for ITCurves!")
            .html(html_body)
            .text(text_body)
            .build()
        )
        _ = ms.emails.send(email)
        # send_email(email_address, "Survey for ITCurves!", html_body)

        return "Email sent successfully"
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/make-call",
    response_model=dict,
    description="""
    Make a call to the specified phone number with the given survey.
    
    Args:
        to (str): The phone number to call in E.164 format (e.g., "+1234567890")
        survey_id (str): The ID of the survey to conduct during the call
        run_at (str): The time to run the job in the format YYYY-MM-DD HH:MM
        provider (str): Voice provider to use - "livekit"
        
    Returns:
        dict: Response from the call service with call status
    """,
)
async def make_call(
    to: str,
    survey_id: str,
    run_at: Optional[str] = None,
    provider: str = "livekit",
):
    """
    Initiate a call to the specified phone number with the given survey.

    Uses LiveKit Agents Framework with SIP outbound calling.

    The phone number should be in E.164 format (e.g., "+1234567890").
    The run_at should be in the format YYYY-MM-DD HH:MM.
    """

    if not LIVEKIT_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="LiveKit is not available. Install livekit-agents and configure LIVEKIT_URL/KEY/SECRET.",
        )

    if run_at:
        job_id = f"survey_job_lk_{survey_id}"
        run_at_dt = datetime.strptime(run_at, "%Y-%m-%d %H:%M")
        try:
            job = scheduler.add_job(
                _livekit_call_sync,
                "date",
                run_date=run_at_dt,
                args=[to, survey_id],
                id=job_id,
            )
            logger.info(f"LiveKit job scheduled: {job.id} for {run_at_dt}")
            return {"job_id": job.id, "run_date": str(run_at_dt), "provider": "livekit"}
        except Exception as e:
            logger.error(f"Failed to schedule LiveKit job: {e}")
            raise
    else:
        try:
            result = await dispatch_livekit_call(to, survey_id)
            sql_query = """UPDATE surveys SET call_id = :call_id WHERE id = :survey_id"""
            sql_dict = {"survey_id": survey_id, "call_id": result["CallId"]}
            sql_execute(sql_query, sql_dict)
            return result
        except Exception as e:
            logger.error(f"LiveKit call failed: {e}")
            raise HTTPException(status_code=500, detail=f"LiveKit call failed: {e}")


def _livekit_call_sync(phone_number: str, survey_id: str):
    """Synchronous wrapper for scheduling LiveKit calls via APScheduler."""
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(dispatch_livekit_call(phone_number, survey_id))
        sql_execute(
            "UPDATE surveys SET call_id = :call_id WHERE id = :survey_id",
            {"call_id": result["CallId"], "survey_id": survey_id},
        )
        return result
    finally:
        loop.close()


@router.get("/surveys/make-call")
async def make_call_info():
    return {
        "message": "This endpoint accepts POST requests only. Please use POST method to make a call."
    }


@router.post(
    "/surveys/get-transcript",
    response_model=dict,
    description="""
    Get the transcript of a call.
    
    Args:
        survey_id (str): The ID of the survey
        
    Returns:
        dict: Transcript of the call
    """,
)
async def get_transcript(survey_id: str):
    try:
        # get the call id from the surveys table
        sql_query = """SELECT call_id FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        rows = sql_execute(sql_query, sql_dict)
        if not rows:
            raise HTTPException(
                status_code=404, detail=f"Survey with ID {survey_id} not found"
            )

        call_id = rows[0]["call_id"]
        if not call_id:
            raise HTTPException(
                status_code=404, detail=f"No call made for Survey with ID {survey_id}"
            )

        if LIVEKIT_AVAILABLE:
            transcript = await get_livekit_transcript(call_id)
            return {"transcript": transcript, "provider": "livekit"}

        raise HTTPException(status_code=500, detail="LiveKit transcript module not available")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
