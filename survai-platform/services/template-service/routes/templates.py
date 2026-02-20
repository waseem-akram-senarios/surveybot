"""
Template endpoints for the Template Service.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Body, HTTPException

from shared.models.common import (
    CloneTemplateRequestP,
    GetTemplateQuestionsRequestP,
    TemplateCreateP,
    TemplateNameRequestP,
    TemplateP,
    TemplateStatsP,
    TemplateStatusUpdateP,
    TranslateTemplateRequestP,
)

from db import get_current_time, process_question_translation, sql_execute
from .template_questions import get_template_questions

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/templates/create",
    status_code=201,
    description="Create a new survey template with draft status.",
)
async def create_template(template_data: TemplateCreateP):
    try:
        res = sql_execute(
            "SELECT * FROM templates WHERE name = :template_name",
            {"template_name": template_data.TemplateName},
        )
        if res:
            raise HTTPException(
                status_code=400,
                detail=f"Template with Name {template_data.TemplateName} already exists",
            )

        sql_execute(
            "INSERT INTO templates (name, status, created_at) VALUES (:template_name, :status, :created_at)",
            {
                "template_name": template_data.TemplateName,
                "status": "Draft",
                "created_at": str(get_current_time())[:19].replace("T", " "),
            },
        )
        return f"Template with Name {template_data.TemplateName} added successfully"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/templates/list",
    response_model=List[TemplateP],
    description="List all templates.",
)
async def list_templates():
    try:
        templates = sql_execute("SELECT * FROM templates", {})
        return [
            {
                "TemplateName": item["name"],
                "Date": str(item["created_at"])[:19],
                "Status": item["status"],
            }
            for item in templates
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/templates/list_drafts",
    response_model=List[TemplateP],
    description="List only draft templates.",
)
async def list_draft_templates():
    try:
        templates = sql_execute("SELECT * FROM templates WHERE status = 'Draft'", {})
        return [
            {
                "TemplateName": item["name"],
                "Date": str(item["created_at"])[:19],
                "Status": item["status"],
            }
            for item in templates
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/templates/stat",
    response_model=TemplateStatsP,
    description="Get template statistics (singular, dashboard compatible).",
)
async def templates_stat():
    """Dashboard expects /templates/stat (singular)."""
    return await templates_stats()


@router.get(
    "/templates/stats",
    response_model=TemplateStatsP,
    description="Get template statistics.",
)
async def templates_stats():
    try:
        res = sql_execute(
            """SELECT
            COUNT(*) AS total_templates,
            SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) AS total_published_templates,
            SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS total_draft_templates,
            SUM(CASE WHEN TO_CHAR(created_at, 'YYYY-MM') = :current_month THEN 1 ELSE 0 END) AS total_templates_this_month,
            SUM(CASE WHEN status = 'Published' AND TO_CHAR(created_at, 'YYYY-MM') = :current_month THEN 1 ELSE 0 END) AS total_published_templates_this_month,
            SUM(CASE WHEN status = 'Draft' AND TO_CHAR(created_at, 'YYYY-MM') = :current_month THEN 1 ELSE 0 END) AS total_draft_templates_this_month
            FROM templates""",
            {"current_month": get_current_time()[:7]},
        )

        if not res or res[0]["total_templates"] is None:
            return TemplateStatsP(
                Total_Templates=0,
                Total_Draft_Templates=0,
                Total_Published_Templates=0,
                Total_Templates_ThisMonth=0,
                Total_Draft_Templates_ThisMonth=0,
                Total_Published_Templates_ThisMonth=0,
            )

        row = res[0]
        return TemplateStatsP(
            Total_Templates=row["total_templates"] or 0,
            Total_Draft_Templates=row["total_draft_templates"] or 0,
            Total_Published_Templates=row["total_published_templates"] or 0,
            Total_Templates_ThisMonth=row["total_templates_this_month"] or 0,
            Total_Draft_Templates_ThisMonth=row["total_draft_templates_this_month"] or 0,
            Total_Published_Templates_ThisMonth=row["total_published_templates_this_month"] or 0,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/templates/{template_name}",
    response_model=TemplateP,
    description="Get a specific template by name.",
)
async def get_template(template_name: str):
    try:
        res = sql_execute(
            "SELECT * FROM templates WHERE name = :template_name",
            {"template_name": template_name},
        )
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {template_name} not found",
            )
        item = res[0]
        return {
            "TemplateName": item["name"],
            "Date": str(item["created_at"])[:19],
            "Status": item["status"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/templates/delete",
    description="Delete a template by name (body: TemplateName). Dashboard compatibility.",
)
async def delete_template_by_body(request: TemplateNameRequestP = Body(...)):
    """Accepts body with TemplateName for dashboard compatibility."""
    if request is None:
        raise HTTPException(status_code=400, detail="TemplateName is required")
    return await _delete_template_impl(request.TemplateName)


@router.delete(
    "/templates/{template_name}",
    description="Delete a template and associated template_questions.",
)
async def delete_template(template_name: str):
    return await _delete_template_impl(template_name)


async def _delete_template_impl(template_name: str):
    try:
        res = sql_execute(
            "SELECT * FROM templates WHERE name = :template_name",
            {"template_name": template_name},
        )
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {template_name} not found",
            )

        if res[0]["status"] == "Published":
            raise HTTPException(
                status_code=400,
                detail=f"Template with name '{template_name}' is published and cannot be deleted",
            )

        sql_execute(
            """DELETE FROM question_category_mappings qcm
            USING template_questions tq
            WHERE qcm.child_question_id = tq.question_id
            AND tq.template_name = :template_name""",
            {"template_name": template_name},
        )

        sql_execute(
            """DELETE FROM question_categories qc
            USING template_questions tq
            WHERE qc.question_id = tq.question_id
            AND tq.template_name = :template_name""",
            {"template_name": template_name},
        )

        sql_execute(
            "DELETE FROM template_questions WHERE template_name = :template_name",
            {"template_name": template_name},
        )

        sql_execute(
            """DELETE FROM questions q
            USING template_questions tq
            WHERE q.id = tq.question_id
            AND tq.template_name = :template_name""",
            {"template_name": template_name},
        )

        sql_execute(
            "DELETE FROM templates WHERE name = :template_name",
            {"template_name": template_name},
        )

        return {"message": f"Template '{template_name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch(
    "/templates/status",
    status_code=201,
    description="Update template status (Draft/Published).",
)
async def update_template_status(request: TemplateStatusUpdateP):
    try:
        res = sql_execute(
            "SELECT * FROM templates WHERE name = :template_name",
            {"template_name": request.TemplateName},
        )
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {request.TemplateName} not found",
            )

        sql_execute(
            "UPDATE templates SET status = :status WHERE name = :template_name",
            {"template_name": request.TemplateName, "status": request.Status},
        )
        return f"Status of Template with Name {request.TemplateName} updated to '{request.Status}' successfully"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch(
    "/templates/update",
    status_code=201,
    description="Update template configuration.",
)
async def update_template_config(request: dict):
    try:
        template_name = request.get("TemplateName")
        if not template_name:
            raise HTTPException(status_code=400, detail="TemplateName is required")
        
        # Check if template exists
        res = sql_execute(
            "SELECT * FROM templates WHERE name = :template_name",
            {"template_name": template_name},
        )
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {template_name} not found",
            )
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = {"template_name": template_name}
        
        # Handle ai_augmented field
        if "ai_augmented" in request:
            update_fields.append("ai_augmented = :ai_augmented")
            params["ai_augmented"] = request["ai_augmented"]
        
        # Handle other fields
        for field in ["max_questions", "time_limit_minutes", "frequency", "survey_type"]:
            if field in request:
                update_fields.append(f"{field} = :{field}")
                params[field] = request[field]
        
        if update_fields:
            sql = f"UPDATE templates SET {', '.join(update_fields)} WHERE name = :template_name"
            sql_execute(sql, params)
            
            updated_fields = ", ".join([f.replace(" = ", ":") for f in update_fields])
            return f"Template '{template_name}' updated successfully: {updated_fields}"
        else:
            return "No fields to update"
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/templates/clone",
    status_code=201,
    description="Clone template with all questions.",
)
async def clone_template(request: CloneTemplateRequestP):
    try:
        src_template_name = request.SourceTemplateName
        new_template_name = request.NewTemplateName

        res = sql_execute(
            "SELECT * FROM templates WHERE name = :template_name",
            {"template_name": src_template_name},
        )
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

        res = sql_execute(
            "SELECT * FROM templates WHERE name = :template_name",
            {"template_name": new_template_name},
        )
        if res:
            raise HTTPException(
                status_code=400,
                detail=f"Destination Template with Name {new_template_name} already exists",
            )

        sql_execute(
            "INSERT INTO templates (name, status, created_at) VALUES (:template_name, :status, :created_at)",
            {
                "template_name": new_template_name,
                "status": "Draft",
                "created_at": str(get_current_time())[:19].replace("T", " "),
            },
        )

        questions_response = sql_execute(
            "SELECT * FROM template_questions WHERE template_name = :template_name",
            {"template_name": src_template_name},
        )

        sql_dict_upd = [
            {
                "template_name": new_template_name,
                "ord": q["ord"],
                "question_id": q["question_id"],
            }
            for q in questions_response
        ]

        if sql_dict_upd:
            sql_execute(
                "INSERT INTO template_questions (template_name, ord, question_id) VALUES (:template_name, :ord, :question_id)",
                sql_dict_upd,
            )

        return {
            "message": "Template cloned successfully",
            "original_template_name": src_template_name,
            "new_template_name": new_template_name,
            "questions_cloned": len(questions_response),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/templates/translate",
    description="Translate template to another language (parallel processing with ThreadPoolExecutor).",
)
async def translate_template(request: TranslateTemplateRequestP):
    src_template_name = request.SourceTemplateName
    new_template_name = request.NewTemplateName
    new_template_language = request.NewTemplateLanguage

    try:
        res = sql_execute(
            "SELECT * FROM templates WHERE name = :template_name",
            {"template_name": src_template_name},
        )
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {src_template_name} not found",
            )

        if res[0]["status"] == "Draft":
            raise HTTPException(
                status_code=400,
                detail=f"Template with Name {src_template_name} is in Draft Mode and cannot be translated",
            )

        res = sql_execute(
            "SELECT * FROM templates WHERE name = :template_name",
            {"template_name": new_template_name},
        )
        if res:
            raise HTTPException(
                status_code=400,
                detail=f"Translated Template with Name {new_template_name} already exists",
            )

        sql_execute(
            "INSERT INTO templates (name, status, created_at) VALUES (:template_name, :status, :created_at)",
            {
                "template_name": new_template_name,
                "status": "Draft",
                "created_at": str(get_current_time())[:19].replace("T", " "),
            },
        )

        tq = GetTemplateQuestionsRequestP(TemplateName=src_template_name)
        questions_response = await get_template_questions(tq)
        source_questions = [dict(q) for q in questions_response.get("Questions", [])]

        with ThreadPoolExecutor(max_workers=4) as executor:
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

            translated_questions = []
            for future in futures:
                try:
                    result = future.result()
                    if result:
                        translated_questions.append(result)
                except Exception as e:
                    logger.warning(f"Error in parallel processing: {e}")

        old_to_new = {q["old_id"]: q["id"] for q in translated_questions}
        for q in translated_questions:
            old_parent = q.get("parent_id")
            if old_parent:
                q["parent_id"] = old_to_new.get(old_parent)

        if translated_questions:
            sql_execute(
                """INSERT INTO questions (id, text, criteria, scales, parent_id, autofill)
                VALUES (:id, :text, :criteria, :scales, :parent_id, :autofill)""",
                [
                    {
                        "id": item["id"],
                        "text": item["text"],
                        "criteria": item["criteria"],
                        "scales": item.get("scales"),
                        "parent_id": item.get("parent_id"),
                        "autofill": item.get("autofill", "No"),
                    }
                    for item in translated_questions
                ],
            )

        for item in translated_questions:
            if item["criteria"] == "categorical" and item.get("categories"):
                for category_text in item["categories"]:
                    sql_execute(
                        "INSERT INTO question_categories (id, question_id, text) VALUES (:id, :question_id, :text)",
                        {
                            "id": str(uuid4()),
                            "question_id": item["id"],
                            "text": category_text,
                        },
                    )

        for item in translated_questions:
            pct = item.get("parent_category_texts") or []
            parent_id = item.get("parent_id")
            if not pct or not parent_id:
                continue
            parent_cats = sql_execute(
                "SELECT id, text FROM question_categories WHERE question_id = :parent_id",
                {"parent_id": parent_id},
            )
            text_to_id = {r["text"]: r["id"] for r in parent_cats}
            mappings = []
            for t in pct:
                if t in text_to_id:
                    mappings.append(
                        {
                            "child_question_id": item["id"],
                            "parent_category_id": text_to_id[t],
                        }
                    )
            if mappings:
                sql_execute(
                    """INSERT INTO question_category_mappings (child_question_id, parent_category_id)
                    VALUES (:child_question_id, :parent_category_id)""",
                    mappings,
                )

        sql_execute(
            """INSERT INTO template_questions (template_name, ord, question_id)
            VALUES (:template_name, :ord, :question_id)""",
            [
                {
                    "template_name": new_template_name,
                    "ord": item["ord"],
                    "question_id": item["id"],
                }
                for item in translated_questions
            ],
        )

        return {
            "message": f"{new_template_language} template created successfully",
            "original_template_name": src_template_name,
            "translated_template_name": new_template_name,
            "questions_translated": len(translated_questions),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
