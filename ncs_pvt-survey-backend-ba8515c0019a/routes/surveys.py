import logging
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from uuid import uuid4

import requests
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
from mailersend import EmailBuilder, MailerSendClient
from models import (
    CandidateCreateP,
    CandidateP,
    Email,
    GetTemplateQuestionsRequestP,
    ListingsS,
    MakeCall,
    QuestionIdRequestP,
    SurveyCreateP,
    SurveyCreateSendP,
    SurveyCSATUpdateP,
    SurveyDurationUpdateP,
    SurveyFromTemplateP,
    SurveyIdM,
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
    make_call_task,
    process_question_sync,
    process_survey_question,
    sql_execute,
)
from workflow import create_workflow_only

from .template_questions import get_template_questions

logger = logging.getLogger(__name__)
router = APIRouter()

SURVEY_BASE_URL = "main.d3unjy9nz250ey.amplifyapp.com"


@router.post(
    "/surveys/candidate",
    status_code=200,
    description="""
    Adds/Modifies a user to the temp database

    Args:
        survey_data (object): Object containing:
            - Biodata (str): Customer profile information
            - Recipient (str): Name of the survey recipient
            - Name (str): Survey name (must match an existing template name)
            - Email (str): Customer email
            - Phone (str): Customer phone number
            - RiderName (str): Name of the driver/rider
            - RideId (str): Unique identifier for the ride
            - TenantId (str): Tenant identifier
            - Age (int | None): Customer age (optional)
            - Gender (str | None): Customer gender; Must be among ["Male", "Female", "Other"] (optional)
            - NumOfTrips (int | None): Number of trips made by the customer (optional)
            - Accessibility (str | None): Customer accessibility; Must be among ["Wheelchair", "None", "Other"] (optional)

    Returns:
        A confirmation message
    """,
)
async def add_candidate(candidate_data: CandidateCreateP):
    try:
        # Check if template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": candidate_data.Name}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {candidate_data.Name} not found",
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        # # Create a new survey
        sql_query = """UPDATE candidate SET template_name = :template_name, biodata = :biodata, name = :name, recipient = :recipient, email = :email, phone = :phone, rider_name = :rider_name, ride_id = :ride_id, tenant_id = :tenant_id, age = :age, gender = :gender, num_of_trips = :num_of_trips WHERE id = :id"""
        sql_dict = {
            "id": "1",
            "template_name": candidate_data.Name,
            "biodata": candidate_data.Biodata,
            "name": candidate_data.Name,
            "recipient": candidate_data.Recipient,
            "email": candidate_data.Email,
            "phone": candidate_data.Phone,
            "rider_name": candidate_data.RiderName,
            "ride_id": candidate_data.RideId,
            "tenant_id": candidate_data.TenantId,
            "age": candidate_data.Age,
            "gender": candidate_data.Gender,
            "num_of_trips": candidate_data.NumOfTrips,
            "accessibility": candidate_data.Accessibility,
        }
        sql_execute(sql_query, sql_dict)
        return {"message": "Candidate profile updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/surveys/candidate",
    response_model=CandidateP,
    description="""
    Get the candidate information from the temp database.

    Returns:
        CandidateP: Object containing candidate details
    """,
)
async def get_candidate():
    try:
        sql_query = """SELECT * FROM candidate WHERE id = '1'"""
        sql_dict = {}
        rows = sql_execute(sql_query, sql_dict)
        if not rows:
            raise HTTPException(
                status_code=404,
                detail="Candidate not found",
            )
        candidate = rows[0]
        return CandidateP(
            Id=candidate["id"],
            Biodata=candidate["biodata"],
            Recipient=candidate["recipient"],
            Name=candidate["name"],
            Email=candidate["email"],
            Phone=candidate["phone"],
            RiderName=candidate["rider_name"],
            RideId=candidate["ride_id"],
            TenantId=candidate["tenant_id"],
            Age=candidate.get("age", None),
            Gender=candidate.get("gender", None),
            NumOfTrips=candidate.get("num_of_trips", None),
            Accessibility=candidate.get("accessibility", None),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/surveys/generate-temp",
    status_code=200,
    description="""
    Create a new survey instance based on a template, generating questions for completion.

    Returns:
        object: Object containing:
            - SurveyId (str): Survey ID
            - QuestionswithAns (list): Array of question objects
    """,
)
async def generate_survey_temp():
    try:
        # Get survey data from candidate
        sql_query = """SELECT * FROM candidate WHERE id = '1'"""
        sql_dict = {}
        rows = sql_execute(sql_query, sql_dict)
        if not rows:
            raise HTTPException(
                status_code=404,
                detail="Survey not found",
            )
        survey_data = rows[0]

        survey_id = str(uuid4())

        # # Check if survey exists
        sql_query = """SELECT * FROM surveys WHERE id = :survey_id"""
        sql_dict = {"survey_id": survey_id}
        res = sql_execute(sql_query, sql_dict)
        if res:
            raise HTTPException(
                status_code=400,
                detail=f"Survey with ID {survey_data.SurveyId} already exists",
            )

        # Check if template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": survey_data.name}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {survey_data.name} not found",
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        # # Create a new survey
        sql_query = """INSERT INTO surveys (id, template_name, url, biodata, status, name, email, phone, recipient, launch_date, rider_name, ride_id, tenant_id, age, gender, num_of_trips)
        VALUES (:id, :template_name, :url, :biodata, :status, :name, :email, :phone, :recipient, :launch_date, :rider_name, :ride_id, :tenant_id, :age, :gender, :num_of_trips)"""
        sql_dict = {
            "id": survey_id,
            "template_name": survey_data.name,
            "url": f"https://main.d3unjy9nz250ey.amplifyapp.com/survey/{survey_id}",
            "biodata": survey_data.biodata,
            "status": "In-Progress",
            "name": survey_data.name,
            "email": survey_data.email,
            "phone": survey_data.phone,
            "recipient": survey_data.recipient,
            "launch_date": str(get_current_time())[:19].replace("T", " "),
            "rider_name": survey_data.rider_name,
            "ride_id": survey_data.ride_id,
            "tenant_id": survey_data.tenant_id,
            "age": survey_data.age,
            "gender": survey_data.gender,
            "num_of_trips": survey_data.num_of_trips,
        }
        sql_execute(sql_query, sql_dict)

        tq = GetTemplateQuestionsRequestP(TemplateName=survey_data.name)
        template_questions_response = await get_template_questions(tq)

        template_questions = template_questions_response.get("Questions", [])

        # Sort template questions by their original order
        template_questions.sort(key=lambda q: int(q.get("ord", "0")))

        # Create a lookup dictionary for que_data by QueId
        que_data_lookup = {q["id"]: q for q in template_questions}
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

        autofill_questions = [q for q in questions if q.get("Autofill") == "Yes"]
        biodata = survey_data.biodata

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
        for item in questions:
            autofill = autofill_lookup.get(item["QueId"])
            sql_dict.append(
                {
                    "survey_id": survey_id,
                    "question_id": item["QueId"],
                    "answer": autofill.Ans if autofill else None,
                    "ord": item["Order"],
                    "autofill": item["Autofill"],
                }
            )
        sql_query = """INSERT INTO survey_response_items (survey_id, question_id, answer, ord, autofill)
VALUES (:survey_id, :question_id, :answer, :ord, :autofill)
ON CONFLICT (survey_id, question_id)
DO UPDATE SET answer = EXCLUDED.answer, autofill = EXCLUDED.autofill"""
        _ = sql_execute(sql_query, sql_dict)

        # Create and return the SurveyQnA object
        return {
            "message": f"Survey with ID {survey_id} generated and saved along with questions"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/generate_and_create",
    status_code=200,
    description="""
    Create a new survey instance based on a template and save it to the database.

    Args:
        survey_data (object): Object containing:
            - SurveyId (str): Unique identifier for the survey (auto-generated if not provided)
            - Biodata (str): Customer profile information
            - Recipient (str): Name of the survey recipient
            - Name (str): Survey name (must match an existing template name)
            - RiderName (str): Name of the driver/rider
            - RideId (str): Unique identifier for the ride
            - TenantId (str): Tenant identifier
            - Age (int | None): Customer age (optional)
            - Gender (str | None): Customer gender; Must be among ["Male", "Female", "Other"] (optional)
            - NumOfTrips (int | None): Number of trips made by the customer (optional)
            - Accessibility (str | None): Customer accessibility; Must be among ["Wheelchair", "None", "Other"] (optional)

    Returns:
        object: Object containing:
            - SurveyId (str): Survey ID
            - QuestionswithAns (list): Array of question objects
    """,
)
async def generate_and_create_survey(survey_data: SurveyCreateSendP):
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
        sql_query = """INSERT INTO surveys (id, template_name, url, biodata, status, name, recipient, launch_date, rider_name, ride_id, tenant_id, age, gender, num_of_trips, accessibility)
        VALUES (:id, :template_name, :url, :biodata, :status, :name, :recipient, :launch_date, :rider_name, :ride_id, :tenant_id, :age, :gender, :num_of_trips, :accessibility)"""
        sql_dict = {
            "id": survey_data.SurveyId,
            "template_name": survey_data.Name,
            "url": f"{os.getenv('URL_BASE')}/survey/{survey_data.SurveyId}",
            "biodata": survey_data.Biodata,
            "status": "In-Progress",
            "name": survey_data.Name,
            "recipient": survey_data.Recipient,
            "launch_date": str(get_current_time())[:19].replace("T", " "),
            "rider_name": survey_data.RiderName,
            "ride_id": survey_data.RideId,
            "tenant_id": survey_data.TenantId,
            "age": survey_data.Age,
            "gender": survey_data.Gender,
            "num_of_trips": survey_data.NumOfTrips,
            "accessibility": survey_data.Accessibility,
        }
        sql_execute(sql_query, sql_dict)

        tq = GetTemplateQuestionsRequestP(TemplateName=survey_data.Name)
        template_questions_response = await get_template_questions(tq)

        template_questions = template_questions_response.get("Questions", [])

        # Sort template questions by their original order
        template_questions.sort(key=lambda q: int(q.get("ord", "0")))

        # Create a lookup dictionary for que_data by QueId
        que_data_lookup = {q["id"]: q for q in template_questions}
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

        autofill_questions = [q for q in questions if q["Autofill"] == "Yes"]

        # turn autofill_questions into a SurveyQuestionsP object
        sqp = SurveyQuestionsP(
            SurveyId=survey_data.SurveyId, QuestionswithAns=autofill_questions
        )

        with ThreadPoolExecutor() as executor:
            results = list(
                executor.map(
                    lambda q: process_question_sync(q, survey_data.Biodata),
                    sqp.QuestionswithAns,
                )
            )
        # Build a lookup for autofilled answers
        autofill_lookup = {item.QueId: item for item in results if item is not None}

        sql_dict = []
        for item in questions:
            autofill = autofill_lookup.get(item["QueId"])
            sql_dict.append(
                {
                    "survey_id": survey_data.SurveyId,
                    "question_id": item["QueId"],
                    "answer": autofill.Ans if autofill else None,
                    "ord": item["Order"],
                    "autofill": item["Autofill"],
                }
            )
        sql_query = """INSERT INTO survey_response_items (survey_id, question_id, answer, ord, autofill)
VALUES (:survey_id, :question_id, :answer, :ord, :autofill)
ON CONFLICT (survey_id, question_id)
DO UPDATE SET answer = EXCLUDED.answer, autofill = EXCLUDED.autofill"""
        _ = sql_execute(sql_query, sql_dict)

        # Merge autofilled answers back into the original questions list
        for question in questions:
            autofill = autofill_lookup.get(question["QueId"])
            if autofill:
                question["Ans"] = autofill.Ans

        # Create and return the SurveyQnA object
        return SurveyQuestionsP(
            SurveyId=survey_data.SurveyId, QuestionswithAns=questions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/generate_and_create_send",
    status_code=200,
    description="""
    Create a new survey instance based on a template and save it to the database.

    Args:
        survey_data (object): Object containing:
            - SurveyId (str): Unique identifier for the survey (auto-generated if not provided)
            - Biodata (str): Customer profile information
            - Recipient (str): Name of the survey recipient
            - Name (str): Survey name (must match an existing template name)
            - RiderName (str): Name of the driver/rider
            - RideId (str): Unique identifier for the ride
            - TenantId (str): Tenant identifier
            - Age (int | None): Customer age (optional)
            - Gender (str | None): Customer gender; Must be among ["Male", "Female", "Other"] (optional)
            - NumOfTrips (int | None): Number of trips made by the customer (optional)
            - Accessibility (str | None): Customer accessibility; Must be among ["Wheelchair", "None", "Other"] (optional)
            - Email (str | None): Customer email (optional)
            - Phone (str | None): Customer phone number (optional)
            - RunAt (str | None): Run the call at a specific time (optional) # EST Time here

    Either the email or the phone number must be provided.

    Returns:
        dict: Object containing:
            
    """,
)
async def generate_and_create_survey_send(survey_data: SurveyCreateSendP):
    if survey_data.Email is None and survey_data.Phone is None:
        raise HTTPException(
            status_code=400,
            detail="Email or Phone must be provided",
        )
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
        sql_query = """INSERT INTO surveys (id, template_name, url, biodata, status, name, recipient, launch_date, rider_name, ride_id, tenant_id, age, gender, num_of_trips, accessibility)
        VALUES (:id, :template_name, :url, :biodata, :status, :name, :recipient, :launch_date, :rider_name, :ride_id, :tenant_id, :age, :gender, :num_of_trips, :accessibility)"""
        sql_dict = {
            "id": survey_data.SurveyId,
            "template_name": survey_data.Name,
            "url": f"{os.getenv('URL_BASE')}/survey/{survey_data.SurveyId}",
            "biodata": survey_data.Biodata,
            "status": "In-Progress",
            "name": survey_data.Name,
            "recipient": survey_data.Recipient,
            "launch_date": str(get_current_time())[:19].replace("T", " "),
            "rider_name": survey_data.RiderName,
            "ride_id": survey_data.RideId,
            "tenant_id": survey_data.TenantId,
            "age": survey_data.Age,
            "gender": survey_data.Gender,
            "num_of_trips": survey_data.NumOfTrips,
            "accessibility": survey_data.Accessibility,
        }
        sql_execute(sql_query, sql_dict)

        tq = GetTemplateQuestionsRequestP(TemplateName=survey_data.Name)
        template_questions_response = await get_template_questions(tq)

        template_questions = template_questions_response.get("Questions", [])

        # Sort template questions by their original order
        template_questions.sort(key=lambda q: int(q.get("ord", "0")))

        # Create a lookup dictionary for que_data by QueId
        que_data_lookup = {q["id"]: q for q in template_questions}
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

        autofill_questions = [q for q in questions if q["Autofill"] == "Yes"]

        # turn autofill_questions into a SurveyQuestionsP object
        sqp = SurveyQuestionsP(
            SurveyId=survey_data.SurveyId, QuestionswithAns=autofill_questions
        )

        with ThreadPoolExecutor() as executor:
            results = list(
                executor.map(
                    lambda q: process_question_sync(q, survey_data.Biodata),
                    sqp.QuestionswithAns,
                )
            )
        # Build a lookup for autofilled answers
        autofill_lookup = {item.QueId: item for item in results if item is not None}

        sql_dict = []
        for item in questions:
            autofill = autofill_lookup.get(item["QueId"])
            sql_dict.append(
                {
                    "survey_id": survey_data.SurveyId,
                    "question_id": item["QueId"],
                    "answer": autofill.Ans if autofill else None,
                    "ord": item["Order"],
                    "autofill": item["Autofill"],
                }
            )
        sql_query = """INSERT INTO survey_response_items (survey_id, question_id, answer, ord, autofill)
VALUES (:survey_id, :question_id, :answer, :ord, :autofill)
ON CONFLICT (survey_id, question_id)
DO UPDATE SET answer = EXCLUDED.answer, autofill = EXCLUDED.autofill"""
        _ = sql_execute(sql_query, sql_dict)

        # Merge autofilled answers back into the original questions list
        for question in questions:
            autofill = autofill_lookup.get(question["QueId"])
            if autofill:
                question["Ans"] = autofill.Ans

        resp = {}
        if survey_data.Email:
            print(f"{os.getenv('URL_BASE')}/survey/{survey_data.SurveyId}")
            email_obj = Email(
                SurveyURL=f"{os.getenv('URL_BASE')}/survey/{survey_data.SurveyId}",
                EmailTo=survey_data.Email,
            )
            msg_email = await send_survey_email(email_obj)
            resp["Email"] = msg_email
        if survey_data.Phone:
            run_at = survey_data.RunAt or None
            if run_at:
                est_time = datetime.strptime(run_at, "%Y-%m-%d %H:%M")
                gmt_time = est_time + timedelta(hours=5)
                run_at = gmt_time.strftime("%Y-%m-%d %H:%M")
            call_obj = MakeCall(
                To=survey_data.Phone,
                SurveyId=survey_data.SurveyId,
                RunAt=run_at,
            )
            msg_call = await make_call(call_obj)
            resp["Call"] = msg_call
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
            - Age (int | None): Customer age (optional)
            - Gender (str | None): Customer gender; Must be among ["Male", "Female", "Other"] (optional)
            - NumOfTrips (int | None): Number of trips made by the customer (optional)
            - Accessibility (str | None): Customer accessibility; Must be among ["Wheelchair", "None", "Other"] (optional)

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
        sql_query = """INSERT INTO surveys (id, template_name, url, biodata, status, name, recipient, launch_date, rider_name, ride_id, tenant_id, age, gender, num_of_trips, accessibility)
        VALUES (:id, :template_name, :url, :biodata, :status, :name, :recipient, :launch_date, :rider_name, :ride_id, :tenant_id, :age, :gender, :num_of_trips, :accessibility)"""
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
            "age": survey_data.Age,
            "gender": survey_data.Gender,
            "num_of_trips": survey_data.NumOfTrips,
            "accessibility": survey_data.Accessibility,
        }
        sql_execute(sql_query, sql_dict)

        tq = GetTemplateQuestionsRequestP(TemplateName=survey_data.Name)
        template_questions_response = await get_template_questions(tq)

        template_questions = template_questions_response.get("Questions", [])

        # Sort template questions by their original order
        template_questions.sort(key=lambda q: int(q.get("ord", "0")))

        # Create a lookup dictionary for que_data by QueId
        que_data_lookup = {q["id"]: q for q in template_questions}
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

        if res[0]["status"] == "Completed":
            raise HTTPException(
                status_code=500,
                detail=f"Can't delete Survey with ID {survey_id} since it is completed",
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


@router.post(
    "/surveys/list",
    status_code=200,
    description="""
    Retrieve all surveys with their basic information.

    Args:
        page_number (int | None): Page number for pagination (1-based)
        page_size (int | None): Number of items per page
        sort_by (Literal["id", "name", "launch_date", "recipient", "status"] = "launch_date"): Column to sort by
        sort_order (Literal["asc", "desc"] = "asc"): Sort order ("asc" or "desc")
        search (str | None): Search query

    Either both page_number and page_size must be provided or neither of them.

    Returns:
        dict: Object containing:
            - surveys (list): Array of survey objects, each containing:
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
                - Age (int | None): Customer age
                - Gender ("Male" | "Female" | "Other" | None): Customer gender
                - NumOfTrips (int | None): Number of trips
                - Accessibility ("Wheelchair" | "Other" | "None"): Customer accessibility
            - pagination (dict | None): Pagination info when parameters are provided
                - current_page (int): Current page number
                - page_size (int): Number of items per page
                - total_count (int): Total number of surveys
                - total_pages (int): Total number of pages
    """,
)
async def list_surveys(listings: ListingsS):
    try:
        # Validation: both parameters must be provided together or neither
        if (listings.page_number is None) != (listings.page_size is None):
            raise HTTPException(
                status_code=400,
                detail="Both page_number and page_size must be provided together, or neither for all results",
            )

        if listings.page_number is not None and listings.page_size is not None:
            # Calculate offset for SQL query
            offset = (listings.page_number - 1) * listings.page_size

            # Get total count of surveys for pagination
            count_query = """SELECT COUNT(*) as total_count FROM surveys"""
            count_params = {}
            if listings.search:
                count_query += """
                    WHERE id::TEXT ILIKE :search
                    OR name ILIKE :search
                    OR launch_date::TEXT ILIKE :search
                    OR TO_CHAR(launch_date, 'Mon DD, YYYY') ILIKE :search
                    OR recipient ILIKE :search
                    OR status ILIKE :search
                """
                count_params["search"] = f"%{listings.search}%"
            total_result = sql_execute(count_query, count_params)
            total_count = total_result[0]["total_count"] if total_result else 0
            total_pages = (
                total_count + listings.page_size - 1
            ) // listings.page_size  # Ceiling division

            # Build the base query with WHERE clause if search exists
            sql_query = "SELECT * FROM surveys"
            params = {}

            if listings.search:
                sql_query += " WHERE id::TEXT ILIKE :search OR name ILIKE :search OR launch_date::TEXT ILIKE :search OR TO_CHAR(launch_date, 'Mon DD, YYYY') ILIKE :search OR recipient ILIKE :search OR status ILIKE :search"
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {} LIMIT :limit OFFSET :offset".format(
                listings.sort_by, listings.sort_order.upper()
            )
            params.update({"limit": listings.page_size, "offset": offset})

        else:
            # No pagination parameters provided - return all surveys
            total_count = None
            total_pages = None
            sql_query = "SELECT * FROM surveys"
            params = {}

            if listings.search:
                sql_query += " WHERE id::TEXT ILIKE :search OR name ILIKE :search OR launch_date::TEXT ILIKE :search OR TO_CHAR(launch_date, 'Mon DD, YYYY') ILIKE :search OR recipient ILIKE :search OR status ILIKE :search"
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {}".format(
                listings.sort_by, listings.sort_order.upper()
            )

        surveys = sql_execute(sql_query, params)
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
                "Age": item.get("age", None),
                "Gender": item.get("gender", None),
                "NumOfTrips": item.get("num_of_trips", None),
                "Accessibility": item.get("accessibility", None),
            }
            for item in surveys
        ]

        # Add pagination info to response if paginated
        response = {"surveys": survey_tables_items}
        if total_pages is not None:
            response["pagination"] = {
                "current_page": listings.page_number,
                "page_size": listings.page_size,
                "total_count": total_count,
                "total_pages": total_pages,
            }
        else:
            response["pagination"] = {
                "current_page": 1,
                "page_size": len(survey_tables_items),
                "total_count": len(survey_tables_items),
                "total_pages": 1,
            }

        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/list_completed",
    status_code=200,
    description="""
    Retrieve only completed surveys.

    Args:
        page_number (int | None): Page number for pagination (1-based)
        page_size (int | None): Number of items per page
        sort_by (Literal["id", "name", "launch_date", "recipient", "status"] = "launch_date"): Column to sort by
        sort_order (Literal["asc", "desc"] = "asc"): Sort order ("asc" or "desc")
        search (str | None): Search query

    Either both page_number and page_size must be provided or neither of them.
    
    Returns:
        dict: Object containing:
            - surveys (list): Array of completed survey objects with same structure as list_surveys
            - pagination (dict | None): Pagination info when parameters are provided
                - current_page (int): Current page number
                - page_size (int): Number of items per page
                - total_count (int): Total number of completed surveys
                - total_pages (int): Total number of pages
    """,
)
async def list_completed_surveys(listings: ListingsS):
    try:
        # Validation: both parameters must be provided together or neither
        if (listings.page_number is None) != (listings.page_size is None):
            raise HTTPException(
                status_code=400,
                detail="Both page_number and page_size must be provided together, or neither for all results",
            )

        if listings.page_number is not None and listings.page_size is not None:
            # Calculate offset for SQL query
            offset = (listings.page_number - 1) * listings.page_size

            # Get total count of completed surveys for pagination
            count_query = """SELECT COUNT(*) as total_count FROM surveys WHERE status = 'Completed'"""
            count_params = {}
            if listings.search:
                count_query += """
                    AND (id::TEXT ILIKE :search
                    OR name ILIKE :search
                    OR launch_date::TEXT ILIKE :search
                    OR TO_CHAR(launch_date, 'Mon DD, YYYY') ILIKE :search
                    OR recipient ILIKE :search
                    OR status ILIKE :search)
                """
                count_params["search"] = f"%{listings.search}%"
            total_result = sql_execute(count_query, count_params)
            total_count = total_result[0]["total_count"] if total_result else 0
            total_pages = (
                total_count + listings.page_size - 1
            ) // listings.page_size  # Ceiling division

            sql_query = """SELECT * FROM surveys WHERE status = 'Completed'"""
            params = {}
            if listings.search:
                sql_query += " AND (id::TEXT ILIKE :search OR name ILIKE :search OR launch_date::TEXT ILIKE :search OR TO_CHAR(launch_date, 'Mon DD, YYYY') ILIKE :search OR recipient ILIKE :search OR status ILIKE :search)"
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {} LIMIT :limit OFFSET :offset".format(
                listings.sort_by, listings.sort_order.upper()
            )
            params.update({"limit": listings.page_size, "offset": offset})
        else:
            # No pagination parameters provided - return all completed surveys
            total_count = None
            total_pages = None
            sql_query = """SELECT * FROM surveys WHERE status = 'Completed'"""
            params = {}
            if listings.search:
                sql_query += " AND (id::TEXT ILIKE :search OR name ILIKE :search OR launch_date::TEXT ILIKE :search OR TO_CHAR(launch_date, 'Mon DD, YYYY') ILIKE :search OR recipient ILIKE :search OR status ILIKE :search)"
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {}".format(
                listings.sort_by, listings.sort_order.upper()
            )

        surveys = sql_execute(sql_query, params)
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
                "Age": item.get("age", None),
                "Gender": item.get("gender", None),
                "NumOfTrips": item.get("num_of_trips", None),
                "Accessibility": item.get("accessibility", None),
            }
            for item in surveys
        ]

        # Add pagination info to response if paginated
        response = {"surveys": survey_tables_items}
        if total_pages is not None:
            response["pagination"] = {
                "current_page": listings.page_number,
                "page_size": listings.page_size,
                "total_count": total_count,
                "total_pages": total_pages,
            }
        else:
            response["pagination"] = {
                "current_page": 1,
                "page_size": len(survey_tables_items),
                "total_count": len(survey_tables_items),
                "total_pages": 1,
            }

        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/list_inprogress",
    status_code=200,
    description="""
    Retrieve only active/in-progress surveys.

    Args:
        page_number (int | None): Page number for pagination (1-based)
        page_size (int | None): Number of items per page
        sort_by (Literal["id", "name", "launch_date", "recipient", "status"] = "launch_date"): Column to sort by
        sort_order (Literal["asc", "desc"] = "asc"): Sort order ("asc" or "desc")
        search (str | None): Search query

    Either both page_number and page_size must be provided or neither of them.
    
    Returns:
        dict: Object containing:
            - surveys (list): Array of survey objects
            - pagination (dict | None): Pagination info when parameters are provided
                - current_page (int): Current page number
                - page_size (int): Number of items per page
                - total_count (int): Total number of surveys
                - total_pages (int): Total number of pages
    """,
)
async def list_inprogress_surveys(listings: ListingsS):
    try:
        # Validation: both parameters must be provided together or neither
        if (listings.page_number is None) != (listings.page_size is None):
            raise HTTPException(
                status_code=400,
                detail="Both page_number and page_size must be provided together, or neither for all results",
            )

        if listings.page_number is not None and listings.page_size is not None:
            # Calculate offset for SQL query
            offset = (listings.page_number - 1) * listings.page_size

            # Get total count of in-progress surveys for pagination
            count_query = """SELECT COUNT(*) as total_count FROM surveys WHERE status = 'In-Progress'"""
            count_params = {}
            if listings.search:
                count_query += """
                    AND (id::TEXT ILIKE :search
                    OR name ILIKE :search
                    OR launch_date::TEXT ILIKE :search
                    OR TO_CHAR(launch_date, 'Mon DD, YYYY') ILIKE :search
                    OR recipient ILIKE :search
                    OR status ILIKE :search)
                """
                count_params["search"] = f"%{listings.search}%"
            total_result = sql_execute(count_query, count_params)
            total_count = total_result[0]["total_count"] if total_result else 0
            total_pages = (
                total_count + listings.page_size - 1
            ) // listings.page_size  # Ceiling division

            sql_query = """SELECT * FROM surveys WHERE status = 'In-Progress'"""
            params = {}
            if listings.search:
                sql_query += " AND (id::TEXT ILIKE :search OR name ILIKE :search OR launch_date::TEXT ILIKE :search OR TO_CHAR(launch_date, 'Mon DD, YYYY') ILIKE :searchOR recipient ILIKE :search OR status ILIKE :search)"
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {} LIMIT :limit OFFSET :offset".format(
                listings.sort_by, listings.sort_order.upper()
            )
            params.update({"limit": listings.page_size, "offset": offset})
        else:
            # No pagination parameters provided - return all in-progress surveys
            total_count = None
            total_pages = None
            sql_query = """SELECT * FROM surveys WHERE status = 'In-Progress'"""
            params = {}
            if listings.search:
                sql_query += " AND (id::TEXT ILIKE :search OR name ILIKE :search OR launch_date::TEXT ILIKE :search OR TO_CHAR(launch_date, 'Mon DD, YYYY') ILIKE :search OR recipient ILIKE :search OR status ILIKE :search)"
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {}".format(
                listings.sort_by, listings.sort_order.upper()
            )

        surveys = sql_execute(sql_query, params)
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
                "Age": item.get("age", None),
                "Gender": item.get("gender", None),
                "NumOfTrips": item.get("num_of_trips", None),
                "Accessibility": item.get("accessibility", None),
            }
            for item in surveys
        ]

        # Add pagination info to response if paginated
        response = {"surveys": survey_tables_items}
        if total_pages is not None:
            response["pagination"] = {
                "current_page": listings.page_number,
                "page_size": listings.page_size,
                "total_count": total_count,
                "total_pages": total_pages,
            }
        else:
            response["pagination"] = {
                "current_page": 1,
                "page_size": len(survey_tables_items),
                "total_count": len(survey_tables_items),
                "total_pages": 1,
            }
        return response
    except HTTPException:
        raise
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
            - Biodata (str): Biodata
            - CompletionDate (str): Completion date in YYYY-MM-DD HH:MM:SS format
            - LaunchDate (str): Launch date in YYYY-MM-DD HH:MM:SS format
            - Status (str): Status
            - CallTime (str): Call time in YYYY-MM-DD HH:MM:SS format
            - CallNumber (str): Call number
            
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
        "Biodata": res[0]["biodata"],
        "CompletionDate": str(res[0].get("completion_date", ""))[:19],
        "LaunchDate": str(res[0]["launch_date"])[:19],
        "Status": res[0]["status"],
        "CallTime": str(res[0].get("call_time", ""))[:19],
        "CallNumber": res[0].get("call_number", None),
    }


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

    # After processing, convert back to Pydantic models
    questions_models = [SurveyQuestionAnswerP(**q) for q in questions_dicts]
    return SurveyQnAP(SurveyId=survey_id, QuestionswithAns=questions_models)


def transform_qna(qna_data):
    result = []
    for key, value in qna_data.items():
        # skip keys that start with "{"
        if value.startswith("{") or key.startswith("r_"):
            continue

        raw_ans = qna_data["r_" + key]
        result.append({"QueId": key, "RawAns": raw_ans, "Ans": value})

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
    status_code=200,
    summary="Update survey questions and answers (phone)",
    description="""
    Update survey questions and answers in the database for phone surveys.
    
    Args:
        - QuestionswithAnsPhone (list): Array of question-answer objects, each containing:
            - QueId (str): Question ID
            - RawAns (str | None): Raw user input

    Returns:
        a message string
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
    "/answers/qna_phone_partial",
    status_code=200,
    summary="Update survey questions and answers (phone) for partial surveys",
    description="""
    Update survey questions and answers in the database for phone surveys that were not completed.
    
    Args:
        - survey_id (str): Survey ID

    Returns:
        a message string
    """,
)
async def update_survey_qna_phone_partial(
    survey_id: SurveyIdM, background_tasks: BackgroundTasks
):
    """
    Process survey questions in the background and return immediately.
    """
    survey_id = survey_id.SurveyId
    sql_query = """SELECT call_id FROM surveys WHERE id = :survey_id"""
    sql_dict = {"survey_id": survey_id}
    rows = sql_execute(sql_query, sql_dict)
    if not rows:
        raise HTTPException(
            status_code=404, detail=f"No call made for Survey with ID {survey_id}"
        )
    call_id = rows[0]["call_id"]
    url = f"https://api.vapi.ai/call/{call_id}"

    logger.info(
        f"Fetching call details from VAPI for survey {survey_id}, call_id: {call_id}"
    )

    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}",
            "Content-Type": "application/json",
        },
    )
    if response.status_code != 200:
        logger.error(
            f"VAPI API call failed for survey {survey_id}: {response.status_code} - {response.text}"
        )
        raise HTTPException(
            status_code=response.status_code, detail=f"VAPI API error: {response.text}"
        )

    details = response.json()
    logger.info(f"Successfully retrieved call details for survey {survey_id}")

    # Validate response structure
    if (
        not details
        or "artifact" not in details
        or "variableValues" not in details["artifact"]
    ):
        logger.error(f"Invalid response structure from VAPI API for survey {survey_id}")
        raise HTTPException(
            status_code=500, detail="Invalid response structure from VAPI API"
        )

    vars = {
        (
            k.replace("_", "-").replace("answer-q-", "")
            if k.startswith("answer_q_")
            else "r_" + k.replace("_", "-").replace("raw-answer-q-", "")
        ): v
        for k, v in details["artifact"]["variableValues"].items()
        if k.startswith("answer_q_") or k.startswith("raw_answer_q_")
    }

    body = {"SurveyId": survey_id, **vars}

    # Add the background task
    background_tasks.add_task(process_survey_questions_background, body)

    # Return immediately with the input data
    return "Processing Started"


@router.post(
    "/surveys/list_surveys_from_templates",
    response_model=SurveyFromTemplateP,
    description="""
    Get count statistics and list of survey ids created from a specific template.

    Args:
        template_name (object): Object containing:
            - TemplateName (str): Name of the template

    Returns:
        object: Object containing:
            - Total (int): Total surveys created from template
            - Completed (int): Number of completed surveys
            - InProgress (int): Number of in-progress surveys
            - AllSurveysIds (list): List of all survey IDs created from template
            - CompletedSurveysIds (list): List of completed survey IDs created from template
            - InProgressSurveysIds (list): List of in-progress survey IDs created from template
    """,
)
async def list_surveys_from_templates(template_name: TemplateNameRequestP):
    try:
        sql_query = """SELECT
    COUNT(*) FILTER (WHERE template_name = :template_name) AS total_surveys,
    SUM(CASE WHEN status = 'Completed' AND template_name = :template_name THEN 1 ELSE 0 END) AS total_completed_surveys,
    SUM(CASE WHEN status != 'Completed' AND template_name = :template_name THEN 1 ELSE 0 END) AS total_active_surveys,
    ARRAY_AGG(id) FILTER (WHERE template_name = :template_name) AS all_survey_ids,
    ARRAY_AGG(id) FILTER (WHERE template_name = :template_name AND status = 'Completed') AS completed_survey_ids,
    ARRAY_AGG(id) FILTER (WHERE template_name = :template_name AND status != 'Completed') AS active_survey_ids
FROM surveys;"""
        sql_dict = {"template_name": template_name.TemplateName}
        templates_table_items = sql_execute(sql_query, sql_dict)
        total = templates_table_items[0]["total_surveys"]
        return SurveyFromTemplateP(
            Total=total,
            Completed=templates_table_items[0]["total_completed_surveys"],
            InProgress=templates_table_items[0]["total_active_surveys"],
            AllSurveysIds=templates_table_items[0]["all_survey_ids"] or [],
            CompletedSurveysIds=templates_table_items[0]["completed_survey_ids"] or [],
            InProgressSurveysIds=templates_table_items[0]["active_survey_ids"] or [],
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
        SurveyURL (str): URL of the survey
        EmailTo (str): Email address to send the survey to

    Returns:
        str: A confirmation message
    """,
)
async def send_survey_email(email: Email):
    survey_id = email.SurveyURL.split("/")[-1]
    survey = await get_survey_questions_unanswered(survey_id)
    if len(survey["Questions"]) == 0:
        return JSONResponse(
            status_code=404, content={"detail": "Survey has no unanswered questions"}
        )

    try:
        print(f"EmailTo: {email.EmailTo}")
        print(f"SurveyURL: {email.SurveyURL}")
        email_address = email.EmailTo  # noqa: F841
        ms = MailerSendClient(api_key=os.getenv("MAILERSEND_API_KEY"))

        url = email.SurveyURL
        html_body = build_html_email(url)
        text_body = build_text_email(url)

        email = (
            EmailBuilder()
            .from_email(os.getenv("MAILERSEND_SENDER_EMAIL"), "Survey")
            .to_many([{"email": email_address, "name": "Me"}])
            .subject("Survey for ITCurves!")
            .html(html_body)
            .text(text_body)
            .build()
        )
        _ = ms.emails.send(email)

        return "Email sent successfully"
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/make-call",
    response_model=dict,
    description="""
    Make a call to the specified phone number with the given survey.
    
    Args:
        To (str): The phone number to call in E.164 format (e.g., "+1234567890")
        SurveyId (str): The ID of the survey to conduct during the call
        RunAt (str): The time to run the job in the format YYYY-MM-DD HH:MM
        
    Returns:
        dict: Response from the call service with call status
    """,
)
async def make_call(make_call: MakeCall):
    """
    Initiate a call to the specified phone number with the given survey.

    This endpoint makes a POST request to an external call service to initiate a call
    to the specified phone number. The call will be associated with the provided survey ID.

    The phone number should be in E.164 format (e.g., "+1234567890").
    The RunAt should be in the format YYYY-MM-DD HH:MM.
    """

    survey = await get_survey_questions_unanswered(make_call.SurveyId)
    if len(survey["Questions"]) == 0:
        return JSONResponse(
            status_code=404, content={"detail": "Survey has no unanswered questions"}
        )

    recipient_info = await get_survey_recipient(make_call.SurveyId)

    variable_overrides = {
        "SurveyId": make_call.SurveyId,
        "Recipient": recipient_info["Recipient"],
        "Name": recipient_info["Name"],
        "RideID": recipient_info["RideID"],
    }

    # Headers
    headers = {
        "Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}",
        "Content-Type": "application/json",
    }

    workflow_id = await create_workflow_only(make_call.SurveyId)

    if not workflow_id:
        raise HTTPException(status_code=500, detail="Failed to create workflow")

    sql_query = (
        """UPDATE surveys SET workflow_id = :workflow_id WHERE id = :survey_id"""
    )
    sql_dict = {"survey_id": make_call.SurveyId, "workflow_id": workflow_id}
    rows = sql_execute(sql_query, sql_dict)
    logger.info(f"✅ Workflow ID updated successfully: {workflow_id}")

    # Request payload
    payload = {
        "workflowId": workflow_id,
        "phoneNumberId": os.getenv("PHONE_NUMBER_ID"),
        "workflowOverrides": {"variableValues": variable_overrides},
        "customer": {"number": make_call.To},
    }

    if make_call.RunAt:
        job_id = f"survey_job_{make_call.SurveyId}"
        run_at = datetime.strptime(make_call.RunAt, "%Y-%m-%d %H:%M")

        try:
            job = scheduler.add_job(
                make_call_task,
                "date",  # one-time job
                run_date=run_at,
                args=[headers, payload, make_call.SurveyId],  # positional args
                id=job_id,
            )
            logger.info(f"Job scheduled: {job.id} for {run_at}")
            return {"job_id": job.id, "run_date": str(run_at)}
        except Exception as e:
            logger.error(f"Failed to schedule job: {e}")
            raise
    else:
        resp = make_call_task(headers, payload, make_call.SurveyId)
        return resp


@router.post(
    "/surveys/make-workflow",
    response_model=dict,
    description="""
    Creates a workflow for the given survey.
    
    Args:
        survey_id (str): The ID of the survey to conduct during the call
        
    Returns:
        dict: Response from the call service with call status
    """,
)
async def make_workflow(survey_id: str):
    """
    Creates a workflow for the given survey.
    """

    survey = await get_survey_questions_unanswered(survey_id)
    if len(survey["Questions"]) == 0:
        return JSONResponse(
            status_code=404, content={"detail": "Survey has no unanswered questions"}
        )

    workflow_id = await create_workflow_only(survey_id)

    if not workflow_id:
        raise HTTPException(status_code=500, detail="Failed to create workflow")

    sql_query = (
        """UPDATE surveys SET workflow_id = :workflow_id WHERE id = :survey_id"""
    )
    sql_dict = {"survey_id": survey_id, "workflow_id": workflow_id}
    rows = sql_execute(sql_query, sql_dict)
    logger.info(f"✅ Workflow ID updated successfully: {workflow_id}")

    return {"workflow_id": workflow_id}


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

        # get the transcript from the call service
        url = f"https://api.vapi.ai/call/{call_id}"
        response = requests.get(
            url,
            headers={
                "Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}",
                "Content-Type": "application/json",
            },
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        transcript = response.json().get("transcript", [])
        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/surveys/get-call-status",
    response_model=dict,
    description="""
    Get the call status of a call. This fetches data from VAPI directly.
    
    Args:
        survey_id (str): The ID of the survey
        
    Returns:
        dict: Object containing details of the call
            - startedAt (str): The start time of the call
            - endedAt (str): The end time of the call
            - endedReason (str): The reason for ending the call
            - status (str): The status of the call
            - duration (str): The duration of the call in human-friendly format
            - duration_seconds (int): The duration of the call in seconds
            - number (str): The phone number of the call
    """,
)
async def get_call_status(survey_id: str):
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

        # get the transcript from the call service
        url = f"https://api.vapi.ai/call/{call_id}"
        response = requests.get(
            url,
            headers={
                "Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}",
                "Content-Type": "application/json",
            },
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        data = response.json()
        customer = data.get("customer", None)
        if customer:
            number = customer.get("number", None)
        else:
            number = None
        startedAt = data.get("startedAt", None)
        endedAt = data.get("endedAt", None)
        endedReason = data.get("endedReason", None)
        status = data.get("status", None)
        start = (
            datetime.fromisoformat(startedAt.replace("Z", "+00:00"))
            if startedAt
            else None
        )
        end = (
            datetime.fromisoformat(endedAt.replace("Z", "+00:00")) if endedAt else None
        )

        if not startedAt or not endedAt:
            duration = None
            seconds = None
            human = None
        else:
            duration = end - start
            seconds = int(duration.total_seconds())
            if seconds < 60:
                human = f"{seconds}s"
            else:
                minutes, sec = divmod(seconds, 60)
                human = f"{minutes}m {sec}s" if sec else f"{minutes}m"

        return {
            "startedAt": startedAt,
            "endedAt": endedAt,
            "endedReason": endedReason,
            "status": status,
            "duration": human,
            "duration_seconds": seconds,
            "number": number,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
