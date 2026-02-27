import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from models import (
    CloneTemplateRequestP,
    GetTemplateQuestionsRequestP,
    TemplateCreateP,
    TemplateNameRequestP,
    TemplateP,
    TemplateStatsP,
    TemplateStatusUpdateP,
    TranslateTemplateRequestP,
)
from utils import get_current_time, process_question_translation, sql_execute

from .template_questions import get_template_questions

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/templates/create",
    status_code=201,
    description="""
    Create a new survey template with draft status.
    
    Args:
        template_data (object): Object containing:
            - TemplateName (str): Unique name for the template (min 1 character)
    
    Returns:
        str: Success message with template name
    """,
)
async def create_template(template_data: TemplateCreateP):
    try:
        # Check if template with same name already exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": template_data.TemplateName}
        res = sql_execute(sql_query, sql_dict)
        if res:
            raise HTTPException(
                status_code=400,
                detail=f"Template with Name {template_data.TemplateName} already exists",
            )

        # Add to Postgres
        sql_query = """INSERT INTO templates (name, status, created_at)
VALUES (:template_name, :status, :created_at)"""
        sql_dict = {
            "template_name": template_data.TemplateName,
            "status": "Draft",
            "created_at": str(get_current_time())[:19].replace("T", " "),
        }
        sql_execute(sql_query, sql_dict)
        return f"Template with Name {template_data.TemplateName} added successfully"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/templates/status",
    response_model=TemplateP,
    description="""
    Get the current status and creation date of a template.
    
    Args:
        request (object): Object containing:
            - TemplateName (str): Name of the template
    
    Returns:
        object: Template object containing:
            - TemplateName (str): Template name
            - Status ("Draft" | "Published"): Current template status
            - Date (str): Creation date in YYYY-MM-DD HH:MM:SS format
    """,
)
async def get_template_status(request: TemplateNameRequestP):
    try:
        # Check if template exists and get its status
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": request.TemplateName}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {request.TemplateName} not found",
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    # Return the survey status
    return {
        "TemplateName": request.TemplateName,
        "Status": res[0]["status"],
        "Date": str(res[0]["created_at"])[:19],
    }


@router.patch(
    "/templates/status",
    status_code=201,
    description="""
    Update a template's status between Draft and Published.
    
    Args:
        request (object): Object containing:
            - TemplateName (str): Name of the template
            - Status ("Draft" | "Published"): New status for the template
    
    Returns:
        str: Success message with template name and new status
    """,
)
async def update_template_status(request: TemplateStatusUpdateP):
    template_name = request.TemplateName
    try:
        # Check if template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": request.TemplateName}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {request.TemplateName} not found",
            )

        # Update the status
        sql_query = (
            """UPDATE templates SET status = :status WHERE name = :template_name"""
        )
        sql_dict = {
            "template_name": request.TemplateName,
            "status": request.Status,
        }
        sql_execute(sql_query, sql_dict)

        return f"Status of Template with Name {template_name} updated to '{request.Status}' successfully"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/templates/delete",
    description="""
    Delete a template (only if it's in Draft status).
    
    Args:
        request (object): Object containing:
            - TemplateName (str): Name of the template to delete
    
    Returns:
        dict: Object containing:
            - message (str): Success confirmation message
    """,
)
async def delete_template(request: TemplateNameRequestP):
    template_name = request.TemplateName
    try:
        # Check if template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": request.TemplateName}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {request.TemplateName} not found",
            )

        # 1. delete category mappings
        sql_query = """
        DELETE FROM question_category_mappings qcm
        USING template_questions tq
        WHERE qcm.child_question_id = tq.question_id
        AND tq.template_name = :template_name
        """
        sql_dict = {"template_name": template_name}
        sql_execute(sql_query, sql_dict)

        # 2. delete categories
        sql_query = """
        DELETE FROM question_categories qc
        USING template_questions tq
        WHERE qc.question_id = tq.question_id
        AND tq.template_name = :template_name
        """
        sql_dict = {"template_name": template_name}
        sql_execute(sql_query, sql_dict)

        # # 3. delete template_questions
        sql_query = """
        DELETE FROM template_questions
        WHERE template_name = :template_name
        """
        sql_dict = {"template_name": template_name}
        sql_execute(sql_query, sql_dict)

        # # 4. delete questions
        sql_query = """
        DELETE FROM questions q
        USING template_questions tq
        WHERE q.id = tq.question_id
        AND tq.template_name = :template_name
        """
        sql_dict = {"template_name": template_name}
        sql_execute(sql_query, sql_dict)

        # # 5. delete template
        sql_query = """
        DELETE FROM templates
        WHERE name = :template_name
        """
        sql_dict = {"template_name": template_name}
        sql_execute(sql_query, sql_dict)

        return {"message": f"Template '{template_name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/templates/list",
    response_model=List[TemplateP],
    description="""
    Retrieve all templates regardless of status.
    
    Returns:
        list: Array of template objects, each containing:
            - TemplateName (str): Template name
            - Status ("Draft" | "Published"): Template status
            - Date (str): Creation date in YYYY-MM-DD HH:MM:SS format
    """,
)
async def list_templates():
    try:
        sql_query = """SELECT * FROM templates"""
        sql_dict = []
        templates = sql_execute(sql_query, sql_dict)
        templates = [
            {
                "TemplateName": item["name"],
                "Date": str(item["created_at"])[:19],
                "Status": item["status"],
            }
            for item in templates
        ]
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/templates/list_published",
    response_model=List[TemplateP],
    description="""
    Retrieve only published templates.
    
    Returns:
        list: Array of published template objects, each containing:
            - TemplateName (str): Template name
            - Status ("Published"): Template status
            - Date (str): Creation date in YYYY-MM-DD HH:MM:SS format
    """,
)
async def list_published_templates():
    try:
        sql_query = """SELECT * FROM templates where status = 'Published'"""
        sql_dict = []
        templates = sql_execute(sql_query, sql_dict)
        templates = [
            {
                "TemplateName": item["name"],
                "Date": str(item["created_at"])[:19],
                "Status": item["status"],
            }
            for item in templates
        ]
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/templates/list_drafts",
    response_model=List[TemplateP],
    description="""
    Retrieve only draft templates.
    
    Returns:
        list: Array of draft template objects, each containing:
            - TemplateName (str): Template name
            - Status ("Draft"): Template status
            - Date (str): Creation date in YYYY-MM-DD HH:MM:SS format
    """,
)
async def list_drafts_templates():
    try:
        sql_query = """SELECT * FROM templates where status = 'Draft'"""
        sql_dict = []
        templates = sql_execute(sql_query, sql_dict)
        templates = [
            {
                "TemplateName": item["name"],
                "Date": str(item["created_at"])[:19],
                "Status": item["status"],
            }
            for item in templates
        ]
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/templates/clone",
    status_code=201,
    description="""
    Create a copy of an existing published template with all its questions.
    
    Args:
        request (object): Object containing:
            - SourceTemplateName (str): Name of the template to clone
            - NewTemplateName (str): Name for the new cloned template (min 1 character)
    
    Returns:
        dict: Object containing:
            - message (str): Success message
            - original_template_name (str): Source template name
            - new_template_name (str): New template name
            - questions_cloned (int): Number of questions cloned
    """,
)
async def clone_template(request: CloneTemplateRequestP):
    try:
        src_template_name = request.SourceTemplateName
        new_template_name = request.NewTemplateName

        # Check if source template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": src_template_name}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {src_template_name} not found",
            )

        if res[0]["status"] == "Draft":
            raise HTTPException(
                status_code=400,
                detail=f"Template with Name {src_template_name} is in Draft Mode and cannot be cloned",
            )

        # Check  if new template name is available
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": new_template_name}
        res = sql_execute(sql_query, sql_dict)
        if res:
            raise HTTPException(
                status_code=400,
                detail=f"Destination Template with Name {new_template_name} already exists",
            )

        # Create new template with the new name and Add to Postgres
        sql_query = """INSERT INTO templates (name, status, created_at)
VALUES (:template_name, :status, :created_at)"""
        sql_dict = {
            "template_name": new_template_name,
            "status": "Draft",
            "created_at": str(get_current_time())[:19].replace("T", " "),
        }
        sql_execute(sql_query, sql_dict)
        # print(f"Template with Name {new_template_name} added successfully")

        # Get all questions from source template
        sql_query = (
            """SELECT * FROM template_questions WHERE template_name = :template_name"""
        )
        sql_dict = {"template_name": src_template_name}
        questions_response = sql_execute(sql_query, sql_dict)
        # print(questions_response)

        sql_dict = [
            {"question_id": q["question_id"], "ord": q["ord"]}
            for q in questions_response
        ]
        # print(f"sql_dict with id and order: {sql_dict}")

        sql_dict_upd = []
        for item in sql_dict:
            sql_dict_upd.append(
                {
                    "template_name": new_template_name,
                    "ord": item["ord"],
                    "question_id": item["question_id"],
                }
            )

        # If upsert needed later
        #         sql_query = """INSERT INTO template_questions (template_name, ord, question_id)
        # VALUES (:template_name, :ord, :question_id)
        # ON CONFLICT (template_name, question_id)
        # DO UPDATE SET ord = EXCLUDED.ord"""

        sql_query = """INSERT INTO template_questions (template_name, ord, question_id)
VALUES (:template_name, :ord, :question_id)"""

        rc = sql_execute(sql_query, sql_dict_upd)
        # print(f"rows updated: {rc}")

        return {
            "message": "Template cloned successfully",
            "original_template_name": src_template_name,
            "new_template_name": new_template_name,
            "questions_cloned": len(questions_response),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/templates/stat",
    response_model=TemplateStatsP,
    description="""
    Get statistical information about templates (counts by status, monthly trends).
    
    Returns:
        object: Statistics object containing:
            - Total_Templates (int): Total number of templates
            - Total_Draft_Templates (int): Number of draft templates
            - Total_Published_Templates (int): Number of published templates
            - Total_Templates_ThisMonth (int): Templates created this month
            - Total_Draft_Templates_ThisMonth (int): Draft templates created this month
            - Total_Published_Templates_ThisMonth (int): Published templates created this month
    """,
)
async def templates_stat():
    try:
        sql_query = """SELECT
COUNT(*) AS total_templates,
SUM(CASE WHEN "status" = 'Published' THEN 1 ELSE 0 END) AS total_published_templates,
SUM(CASE WHEN "status" = 'Draft' THEN 1 ELSE 0 END) AS total_draft_templates,
SUM(CASE WHEN TO_CHAR("created_at", 'YYYY-MM') = :current_month THEN 1 ELSE 0 END) AS total_templates_this_month,
SUM(CASE WHEN "status" = 'Published' AND TO_CHAR("created_at", 'YYYY-MM') = :current_month THEN 1 ELSE 0 END) AS total_published_templates_this_month,
SUM(CASE WHEN "status" = 'Draft' AND TO_CHAR("created_at", 'YYYY-MM') = :current_month THEN 1 ELSE 0 END) AS total_draft_templates_this_month
FROM templates"""
        sql_dict = {"current_month": get_current_time()[:7]}
        res = sql_execute(sql_query, sql_dict)

        if not res or res[0]["total_templates"] == 0:
            return TemplateStatsP(
                Total_Templates=0,
                Total_Draft_Templates=0,
                Total_Published_Templates=0,
                Total_Templates_ThisMonth=0,
                Total_Draft_Templates_ThisMonth=0,
                Total_Published_Templates_ThisMonth=0,
            )

        # Convert keys to match Pydantic model field names
        return TemplateStatsP(
            Total_Templates=res[0]["total_templates"],
            Total_Draft_Templates=res[0]["total_draft_templates"],
            Total_Published_Templates=res[0]["total_published_templates"],
            Total_Templates_ThisMonth=res[0]["total_templates_this_month"],
            Total_Draft_Templates_ThisMonth=res[0]["total_draft_templates_this_month"],
            Total_Published_Templates_ThisMonth=res[0][
                "total_published_templates_this_month"
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/templates/translate",
    description="""
    Create a translated version of a template by translating all questions.
    
    Args:
        request (object): Object containing:
            - SourceTemplateName (str): Name of the template to translate
            - NewTemplateName (str): Name for the translated template (min 1 character)
            - NewTemplateLanguage ("Spanish" | "German" | "French" | "Russian" | "Chinese"): Target language
    
    Returns:
        dict: Object containing:
            - message (str): Success message with language
            - original_template_name (str): Source template name
            - translated_template_name (str): New template name
            - questions_translated (int): Number of questions translated
    """,
)
async def translate_template(request: TranslateTemplateRequestP):
    src_template_name = request.SourceTemplateName
    new_template_name = request.NewTemplateName
    new_template_language = request.NewTemplateLanguage
    # assert new_template_language in [
    #     "Spanish",
    #     "German",
    #     "French",
    #     "Russian",
    #     "Chinese",
    # ], "Invalid language"

    try:
        """ """
        # Check if source template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": src_template_name}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {request.TemplateName} not found",
            )

        if res[0]["status"] == "Draft":
            raise HTTPException(
                status_code=400,
                detail=f"Template with Name {src_template_name} is in Draft Mode and cannot be translated",
            )

        # Check  if new template name is available
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": new_template_name}
        res = sql_execute(sql_query, sql_dict)
        if res:
            raise HTTPException(
                status_code=400,
                detail=f"Translated Template with Name {new_template_name} already exists",
            )

        # Create new template with the new name and Add to Postgres
        sql_query = """INSERT INTO templates (name, status, created_at)
VALUES (:template_name, :status, :created_at)"""
        sql_dict = {
            "template_name": new_template_name,
            "status": "Draft",
            "created_at": str(get_current_time())[:19].replace("T", " "),
        }
        sql_execute(sql_query, sql_dict)
        # print(f"Template with Name {new_template_name} added successfully")
        """ """

        # Get all questions from source template
        tq = GetTemplateQuestionsRequestP(TemplateName=src_template_name)
        questions_response = await get_template_questions(tq)
        # print(questions_response)

        # Convert DB row mappings to plain dicts before processing
        source_questions = [dict(q) for q in questions_response.get("Questions", [])]

        # Process each question in the template in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            # Submit all translation tasks
            futures = []
            for item in source_questions:
                future = executor.submit(
                    process_question_translation,
                    item=item,
                    src_template_name=src_template_name,
                    new_template_name=new_template_name,
                    new_template_language=new_template_language,
                )
                futures.append(future)

            # Wait for all tasks to complete, collect results, and handle any exceptions
            translated_questions = []
            for future in futures:
                try:
                    result = future.result()
                    if result:  # Only append if there's a valid result
                        translated_questions.append(result)
                except Exception as e:
                    logger.warning(f"Error in parallel processing: {str(e)}")

        # print(f"translated_questions: {translated_questions}")

        # Build old->new id mapping and fix parent_id to point to translated parent ids
        old_to_new = {q["old_id"]: q["id"] for q in translated_questions}
        for q in translated_questions:
            old_parent = q.get("parent_id")
            if old_parent:
                q["parent_id"] = old_to_new.get(old_parent)

        # Add the questions to the questions table
        sql_dict = []
        for item in translated_questions:
            sql_dict.append(
                {
                    "id": item["id"],
                    "text": item["text"],
                    "criteria": item["criteria"],
                    "scales": item.get("scales"),
                    "parent_id": item["parent_id"],
                    "autofill": item.get("autofill"),
                }
            )
        sql_query = """
                    INSERT INTO questions (id, text, criteria, scales, parent_id, autofill)
                    VALUES (:id, :text, :criteria, :scales, :parent_id, :autofill)
                """
        sql_execute(sql_query, sql_dict)

        # Add the translated categories to the question_categories table
        for item in translated_questions:
            if item["criteria"] != "categorical":
                continue
            for category_text in item["categories"]:
                sql_dict = {
                    "id": str(uuid4()),
                    "question_id": item["id"],
                    "text": category_text,
                }
                sql_query = """
                    INSERT INTO question_categories (id, question_id, text)
                    VALUES (:id, :question_id, :text)
                """
                sql_execute(sql_query, sql_dict)

        # Insert child-to-parent category mappings for translated questions
        # For each translated child that has parent_category_texts, map to translated parent's categories
        mappings = []
        for item in translated_questions:
            pct = item.get("parent_category_texts") or []
            parent_id = item.get("parent_id")
            if not pct or not parent_id:
                continue
            # fetch parent's categories (translated) to get their ids
            sql_query = """SELECT id, text FROM question_categories WHERE question_id = :parent_id"""
            sql_dict = {"parent_id": parent_id}
            parent_cats = sql_execute(sql_query, sql_dict)
            text_to_id = {r["text"]: r["id"] for r in parent_cats}
            # create mapping rows; skip any missing (should not happen if texts exist)
            for t in pct:
                if t in text_to_id:
                    mappings.append(
                        {
                            "child_question_id": item["id"],
                            "parent_category_id": text_to_id[t],
                        }
                    )
        if mappings:
            sql_query = """
                INSERT INTO question_category_mappings (child_question_id, parent_category_id)
                VALUES (:child_question_id, :parent_category_id)
            """
            sql_execute(sql_query, mappings)

        # Associate the translated questions with the new template
        sql_dict = []
        for item in translated_questions:
            sql_dict.append(
                {
                    "template_name": new_template_name,
                    "ord": item["ord"],
                    "question_id": item["id"],
                }
            )
        sql_query = """
                    INSERT INTO template_questions (template_name, ord, question_id)
                    VALUES (:template_name, :ord, :question_id)
                """
        sql_execute(sql_query, sql_dict)

        return {
            "message": f"{new_template_language} template created successfully",
            "original_template_name": src_template_name,
            "translated_template_name": new_template_name,
            "questions_translated": len(translated_questions),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
