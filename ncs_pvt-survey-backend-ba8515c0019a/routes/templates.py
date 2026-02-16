import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from models import (
    CloneTemplateRequestP,
    GetTemplateQuestionsRequestP,
    ListingsT,
    TemplateCreateP,
    TemplateDemographyP,
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

        # Do not delete if status is published
        if res[0]["status"] == "Published":
            raise HTTPException(
                status_code=400,
                detail=f"Template with name '{template_name}' is published and cannot be deleted",
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


@router.post(
    "/templates/list",
    status_code=200,
    description="""
    Retrieve all templates regardless of status.

    Args:
        page_number (int | None): Page number for pagination (1-based)
        page_size (int | None): Number of items per page
        sort_by (Literal["name", "created_at", "status"] = "created_at"): Column to sort by
        sort_order (Literal["asc", "desc"] = "desc"): Sort order ("asc" or "desc")
        search (str | None): Search query

    Either both page_number and page_size must be provided or neither of them.
    
    Returns:
        dict: Object containing:
            - templates (list): Array of template objects
            - pagination (dict | None): Pagination info when parameters are provided
                - current_page (int): Current page number
                - page_size (int): Number of items per page
                - total_count (int): Total number of templates
                - total_pages (int): Total number of pages
    """,
)
async def list_templates(listings: ListingsT):
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

            # Get total count of templates for pagination
            count_query = """SELECT COUNT(*) as total_count FROM templates"""
            count_params = {}
            if listings.search:
                count_query += """
                    WHERE (name ILIKE :search
                    OR created_at::TEXT ILIKE :search
                    OR TO_CHAR(created_at, 'Mon DD, YYYY') ILIKE :search
                    OR status ILIKE :search)
                """
                count_params["search"] = f"%{listings.search}%"
            total_result = sql_execute(count_query, count_params)
            total_count = total_result[0]["total_count"] if total_result else 0
            total_pages = (
                total_count + listings.page_size - 1
            ) // listings.page_size  # Ceiling division

            sql_query = """SELECT * FROM templates"""
            params = {}
            if listings.search:
                sql_query += """
                    WHERE (name ILIKE :search
                    OR created_at::TEXT ILIKE :search
                    OR TO_CHAR(created_at, 'Mon DD, YYYY') ILIKE :search
                    OR status ILIKE :search)
                """
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {} LIMIT :limit OFFSET :offset".format(
                listings.sort_by, listings.sort_order.upper()
            )
            params.update({"limit": listings.page_size, "offset": offset})
        else:
            # No pagination parameters provided - return all templates
            total_count = None
            total_pages = None
            sql_query = """SELECT * FROM templates"""
            params = {}
            if listings.search:
                sql_query += """
                    WHERE (name ILIKE :search
                    OR created_at::TEXT ILIKE :search
                    OR TO_CHAR(created_at, 'Mon DD, YYYY') ILIKE :search
                    OR status ILIKE :search)
                """
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {}".format(
                listings.sort_by, listings.sort_order.upper()
            )

        templates = sql_execute(sql_query, params)
        template_items = [
            {
                "TemplateName": item["name"],
                "Date": str(item["created_at"])[:19],
                "Status": item["status"],
            }
            for item in templates
        ]

        # Add pagination info to response if paginated
        response = {"templates": template_items}
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
                "page_size": len(template_items),
                "total_count": len(template_items),
                "total_pages": 1,
            }

        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/templates/list_published",
    status_code=200,
    description="""
    Retrieve only published templates.
    
    Args:
        page_number (int | None): Page number for pagination (1-based)
        page_size (int | None): Number of items per page
        sort_by (Literal["name", "created_at"] = "created_at"): Column to sort by
        sort_order (Literal["asc", "desc"] = "desc"): Sort order ("asc" or "desc")
        search (str | None): Search query

    Either both page_number and page_size must be provided or neither of them.
    
    Returns:
        dict: Object containing:
            - templates (list): Array of published template objects
            - pagination (dict | None): Pagination info when parameters are provided
                - current_page (int): Current page number
                - page_size (int): Number of items per page
                - total_count (int): Total number of published templates
                - total_pages (int): Total number of pages
    """,
)
async def list_published_templates(listings: ListingsT):
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

            # Get total count of published templates for pagination
            count_query = """SELECT COUNT(*) as total_count FROM templates WHERE status = 'Published'"""
            count_params = {}
            if listings.search:
                count_query += """
                    AND (name ILIKE :search
                    OR created_at::TEXT ILIKE :search
                    OR TO_CHAR(created_at, 'Mon DD, YYYY') ILIKE :search
                    OR status ILIKE :search)
                """
                count_params["search"] = f"%{listings.search}%"
            total_result = sql_execute(count_query, count_params)
            total_count = total_result[0]["total_count"] if total_result else 0
            total_pages = (
                total_count + listings.page_size - 1
            ) // listings.page_size  # Ceiling division

            sql_query = """SELECT * FROM templates WHERE status = 'Published'"""
            params = {}
            if listings.search:
                sql_query += """
                    AND (name ILIKE :search
                    OR created_at::TEXT ILIKE :search
                    OR TO_CHAR(created_at, 'Mon DD, YYYY') ILIKE :search
                    OR status ILIKE :search)
                """
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {} LIMIT :limit OFFSET :offset".format(
                listings.sort_by, listings.sort_order.upper()
            )
            params.update({"limit": listings.page_size, "offset": offset})
        else:
            # No pagination parameters provided - return all published templates
            total_count = None
            total_pages = None
            sql_query = """SELECT * FROM templates WHERE status = 'Published'"""
            params = {}
            if listings.search:
                sql_query += """
                    AND (name ILIKE :search
                    OR created_at::TEXT ILIKE :search
                    OR TO_CHAR(created_at, 'Mon DD, YYYY') ILIKE :search
                    OR status ILIKE :search)
                """
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {}".format(
                listings.sort_by, listings.sort_order.upper()
            )

        templates = sql_execute(sql_query, params)
        template_items = [
            {
                "TemplateName": item["name"],
                "Date": str(item["created_at"])[:19],
                "Status": item["status"],
            }
            for item in templates
        ]

        # Add pagination info to response if paginated
        response = {"templates": template_items}
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
                "page_size": len(template_items),
                "total_count": len(template_items),
                "total_pages": 1,
            }

        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/templates/list_published_names",
    response_model=List[str],
    description="""
    Retrieve only published templates.
    
    Returns:
        list: Array of published template names
    """,
)
async def list_published_templates_names():
    try:
        sql_query = """SELECT * FROM templates where status = 'Published'"""
        sql_dict = []
        templates = sql_execute(sql_query, sql_dict)
        templates = [item["name"] for item in templates]
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/templates/list_drafts",
    status_code=200,
    description="""
    Retrieve only draft templates.
    
    Args:
        page_number (int | None): Page number for pagination (1-based)
        page_size (int | None): Number of items per page
        sort_by (Literal["name", "created_at"] = "created_at"): Column to sort by
        sort_order (Literal["asc", "desc"] = "desc"): Sort order ("asc" or "desc")
        search (str | None): Search query

    Either both page_number and page_size must be provided or neither of them.
    
    Returns:
        dict: Object containing:
            - templates (list): Array of draft template objects
            - pagination (dict | None): Pagination info when parameters are provided
                - current_page (int): Current page number
                - page_size (int): Number of items per page
                - total_count (int): Total number of draft templates
                - total_pages (int): Total number of pages
    """,
)
async def list_drafts_templates(listings: ListingsT):
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

            # Get total count of draft templates for pagination
            count_query = """SELECT COUNT(*) as total_count FROM templates WHERE status = 'Draft'"""
            count_params = {}
            if listings.search:
                count_query += """
                    AND (name ILIKE :search
                    OR created_at::TEXT ILIKE :search
                    OR TO_CHAR(created_at, 'Mon DD, YYYY') ILIKE :search
                    OR status ILIKE :search)
                """
                count_params["search"] = f"%{listings.search}%"
            total_result = sql_execute(count_query, count_params)
            total_count = total_result[0]["total_count"] if total_result else 0
            total_pages = (
                total_count + listings.page_size - 1
            ) // listings.page_size  # Ceiling division

            sql_query = """SELECT * FROM templates WHERE status = 'Draft'"""
            params = {}
            if listings.search:
                sql_query += """
                    AND (name ILIKE :search
                    OR created_at::TEXT ILIKE :search
                    OR TO_CHAR(created_at, 'Mon DD, YYYY') ILIKE :search
                    OR status ILIKE :search)
                """
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {} LIMIT :limit OFFSET :offset".format(
                listings.sort_by, listings.sort_order.upper()
            )
            params.update({"limit": listings.page_size, "offset": offset})
        else:
            # No pagination parameters provided - return all draft templates
            total_count = None
            total_pages = None
            sql_query = """SELECT * FROM templates WHERE status = 'Draft'"""
            params = {}
            if listings.search:
                sql_query += """
                    AND (name ILIKE :search
                    OR created_at::TEXT ILIKE :search
                    OR TO_CHAR(created_at, 'Mon DD, YYYY') ILIKE :search
                    OR status ILIKE :search)
                """
                params["search"] = f"%{listings.search}%"

            sql_query += " ORDER BY {} {}".format(
                listings.sort_by, listings.sort_order.upper()
            )

        templates = sql_execute(sql_query, params)
        template_items = [
            {
                "TemplateName": item["name"],
                "Date": str(item["created_at"])[:19],
                "Status": item["status"],
            }
            for item in templates
        ]

        # Add pagination info to response if paginated
        response = {"templates": template_items}
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
                "page_size": len(template_items),
                "total_count": len(template_items),
                "total_pages": 1,
            }

        return response
    except HTTPException:
        raise
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

        # Get all questions from source template
        sql_query = (
            """SELECT * FROM template_questions WHERE template_name = :template_name"""
        )
        sql_dict = {"template_name": src_template_name}
        questions_response = sql_execute(sql_query, sql_dict)

        sql_dict = [
            {"question_id": q["question_id"], "ord": q["ord"]}
            for q in questions_response
        ]

        sql_dict_upd = []
        for item in sql_dict:
            sql_dict_upd.append(
                {
                    "template_name": new_template_name,
                    "ord": item["ord"],
                    "question_id": item["question_id"],
                }
            )

        sql_query = """INSERT INTO template_questions (template_name, ord, question_id)
VALUES (:template_name, :ord, :question_id)"""

        _ = sql_execute(sql_query, sql_dict_upd)

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
        """ """

        # Get all questions from source template
        tq = GetTemplateQuestionsRequestP(TemplateName=src_template_name)
        questions_response = await get_template_questions(tq)

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


@router.post(
    "/templates/demographics",
    response_model=TemplateDemographyP,
    description="""
    Get statistical information about templates (counts by age, gender, num of trips).
    
    Args:
        request (object): Object containing:
            - TemplateName (str): Name of the template to get demographics for
    
    Returns:
        object: Statistics object containing:
            - GenderCounts (dict): Count by gender
            - AgeCounts (dict): Bins of age groups
            - TripCounts (dict): Bins of trip counts
            - AccessibilityCounts (dict): Count by accessibility
            - SurveyCounts (dict): Count of surveys (total and completed)
    """,
)
async def templates_demog(request: TemplateNameRequestP):
    try:
        sql_query = """WITH gender_stats AS (
    SELECT jsonb_object_agg(
               gender,
               jsonb_build_object(
                   'Total', total,
                   'Completed', completed,
                   'In-Progress', in_progress
               )
           ) AS gender_counts
    FROM (
        SELECT
            COALESCE(gender, 'Unknown') AS gender,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
            COUNT(*) FILTER (WHERE status = 'In-Progress') AS in_progress
        FROM surveys s
        WHERE s."name" = :template_name
        GROUP BY COALESCE(gender, 'Unknown')
    ) g
),
survey_counts AS (
    SELECT jsonb_build_object(
        'Total', COUNT(*) FILTER (WHERE s."name" = :template_name),
        'Completed', SUM(CASE WHEN status = 'Completed' AND s."name" = :template_name THEN 1 ELSE 0 END),
        'In-Progress', SUM(CASE WHEN status != 'Completed' AND s."name" = :template_name THEN 1 ELSE 0 END)
    ) AS survey_summary
    FROM surveys s
),
accessibility_stats AS (
    SELECT jsonb_object_agg(
               accessibility,
               jsonb_build_object(
                   'Total', total,
                   'Completed', completed,
                   'In-Progress', in_progress
               )
           ) AS accessibility_counts
    FROM (
        SELECT
            COALESCE(accessibility, 'None') AS accessibility,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
            COUNT(*) FILTER (WHERE status = 'In-Progress') AS in_progress
        FROM surveys s
        WHERE s."name" = :template_name
        GROUP BY COALESCE(accessibility, 'None')
    ) a
),
age_bins AS (
    SELECT jsonb_object_agg(
               bin_label,
               jsonb_build_object(
                   'Total', COALESCE(total, 0),
                   'Completed', COALESCE(completed, 0),
                   'In-Progress', COALESCE(in_progress, 0)
               ) ORDER BY sort_order
           ) AS age_counts
    FROM (
        SELECT
            b.bin_label,
            b.min_age AS sort_order,
            COUNT(s.age) AS total,
            COUNT(s.age) FILTER (WHERE s.status = 'Completed') AS completed,
            COUNT(s.age) FILTER (WHERE s.status = 'In-Progress') AS in_progress
        FROM (
            VALUES
                (0, 18,   '0-18'),
                (19, 24,  '19-24'),
                (25, 32,  '25-32'),
                (33, 9999,'33+')
        ) b(min_age, max_age, bin_label)
        LEFT JOIN surveys s
               ON s.age BETWEEN b.min_age AND b.max_age
              AND s."name" = :template_name
        GROUP BY b.bin_label, b.min_age
    ) t
),
trip_bins AS (
    SELECT jsonb_object_agg(
               bin_label,
               jsonb_build_object(
                   'Total', COALESCE(total, 0),
                   'Completed', COALESCE(completed, 0),
                   'In-Progress', COALESCE(in_progress, 0)
               ) ORDER BY sort_order
           ) AS trip_counts
    FROM (
        SELECT
            b.bin_label,
            b.min_trips AS sort_order,
            COUNT(s.num_of_trips) AS total,
            COUNT(s.num_of_trips) FILTER (WHERE s.status = 'Completed') AS completed,
            COUNT(s.num_of_trips) FILTER (WHERE s.status = 'In-Progress') AS in_progress
        FROM (
            VALUES
                (0, 5,   '0-5'),
                (6, 10,  '6-10'),
                (11, 15, '11-15'),
                (16, 9999,'16+')
        ) b(min_trips, max_trips, bin_label)
        LEFT JOIN surveys s
               ON s.num_of_trips BETWEEN b.min_trips AND b.max_trips
              AND s."name" = :template_name
        GROUP BY b.bin_label, b.min_trips
    ) u
)
SELECT gender_counts, survey_summary, accessibility_counts, age_counts, trip_counts
FROM gender_stats, survey_counts, accessibility_stats, age_bins, trip_bins;"""
        sql_dict = {"template_name": request.TemplateName}
        res = sql_execute(sql_query, sql_dict)

        # Convert keys to match Pydantic model field names
        return TemplateDemographyP(
            GenderCounts=res[0]["gender_counts"],
            SurveyCounts=res[0]["survey_summary"],
            AccessibilityCounts=res[0]["accessibility_counts"],
            AgeCounts=res[0]["age_counts"],
            TripCounts=res[0]["trip_counts"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
