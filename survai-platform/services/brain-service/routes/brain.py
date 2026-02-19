"""
Brain Service API routes.

ALL AI/LLM operations are exposed here. Other services call these
endpoints instead of importing OpenAI directly.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import llm
from workflow_builder import build_workflow_config
from prompts import (
    AGENT_SYSTEM_PROMPT_TEMPLATE,
    MAX_SURVEY_QUESTIONS,
    QUESTION_FORMAT_BRANCH,
    QUESTION_FORMAT_CATEGORICAL,
    QUESTION_FORMAT_OPEN,
    QUESTION_FORMAT_SCALE,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/brain", tags=["brain"])


# ─── Request / Response Models ────────────────────────────────────────────────

class ParseRequest(BaseModel):
    question: str
    response: str
    options: List[str]
    criteria: str = "categorical"

class ParseResponse(BaseModel):
    answer: Optional[str]

class AutofillRequest(BaseModel):
    context: str
    question: str
    options: List[str] = []
    criteria: str = "categorical"

class AutofillResponse(BaseModel):
    answer: Optional[str]

class SummarizeRequest(BaseModel):
    question: str
    response: str

class SummarizeResponse(BaseModel):
    summary: str

class SympathizeRequest(BaseModel):
    question: str
    response: str

class SympathizeResponse(BaseModel):
    message: str

class TranslateRequest(BaseModel):
    text: str
    language: str

class TranslateResponse(BaseModel):
    translated: str

class TranslateCategoriesRequest(BaseModel):
    categories: List[str]
    language: str

class TranslateCategoriesResponse(BaseModel):
    translated: List[str]

class AnalyzeRequest(BaseModel):
    combined_text: str

class AnalyzeResponse(BaseModel):
    overall_sentiment: str = "neutral"
    quality_score: float = 0
    key_themes: List[str] = []
    summary: str = ""
    nps_score: Optional[float] = None
    satisfaction_score: Optional[float] = None

class WorkflowConfigRequest(BaseModel):
    survey_id: str
    questions: List[Dict[str, Any]]
    callback_url: str = ""
    template_config: Optional[Dict[str, Any]] = None
    rider_data: Optional[Dict[str, Any]] = None
    language: str = "en"

class PrioritizeRequest(BaseModel):
    questions: List[Dict[str, Any]]
    max_count: int = MAX_SURVEY_QUESTIONS
    rider_context: str = ""

class SystemPromptRequest(BaseModel):
    survey_name: str
    questions: List[Dict[str, Any]]
    rider_data: Optional[Dict[str, Any]] = None
    company_name: str = "the transit agency"
    time_limit_minutes: int = 8
    restricted_topics: Optional[List[str]] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/parse", response_model=ParseResponse)
async def parse_endpoint(req: ParseRequest):
    """Parse a user's natural-language answer into a structured option."""
    try:
        answer = llm.parse_response(req.question, req.response, req.options, req.criteria)
        return ParseResponse(answer=answer)
    except Exception as e:
        logger.error(f"Parse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/autofill", response_model=AutofillResponse)
async def autofill_endpoint(req: AutofillRequest):
    """Autofill an answer from context/biodata."""
    try:
        if req.criteria == "open":
            answer = llm.autofill_open(req.context, req.question)
        else:
            answer = llm.autofill_response(req.context, req.question, req.options, req.criteria)
        return AutofillResponse(answer=answer)
    except Exception as e:
        logger.error(f"Autofill error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_endpoint(req: SummarizeRequest):
    """Summarize a long survey response."""
    try:
        summary = llm.summarize_response(req.question, req.response)
        return SummarizeResponse(summary=summary)
    except Exception as e:
        logger.error(f"Summarize error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sympathize", response_model=SympathizeResponse)
async def sympathize_endpoint(req: SympathizeRequest):
    """Generate empathetic acknowledgment for a user's answer."""
    try:
        message = llm.sympathize(req.question, req.response)
        return SympathizeResponse(message=message)
    except Exception as e:
        logger.error(f"Sympathize error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate", response_model=TranslateResponse)
async def translate_endpoint(req: TranslateRequest):
    """Translate text to a target language."""
    try:
        translated = llm.translate_text(req.text, req.language)
        return TranslateResponse(translated=translated)
    except Exception as e:
        logger.error(f"Translate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate-categories", response_model=TranslateCategoriesResponse)
async def translate_categories_endpoint(req: TranslateCategoriesRequest):
    """Translate a list of categories."""
    try:
        translated = llm.translate_categories(req.categories, req.language)
        return TranslateCategoriesResponse(translated=translated)
    except Exception as e:
        logger.error(f"Translate categories error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(req: AnalyzeRequest):
    """Run post-survey AI analysis."""
    try:
        result = llm.analyze_survey(req.combined_text)
        return AnalyzeResponse(**result)
    except Exception as e:
        logger.error(f"Analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/build-workflow-config")
async def build_workflow_config_endpoint(req: WorkflowConfigRequest):
    """
    Generate the VAPI workflow JSON config.
    Does NOT create anything in VAPI -- just returns the config dict.
    """
    try:
        config = build_workflow_config(
            survey_id=req.survey_id,
            questions=req.questions,
            callback_url=req.callback_url,
            template_config=req.template_config,
            rider_data=req.rider_data,
            language=req.language,
        )
        return {"workflow_config": config}
    except Exception as e:
        logger.error(f"Workflow config build error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prioritize-questions")
async def prioritize_questions_endpoint(req: PrioritizeRequest):
    """Select and prioritize the most important questions using AI."""
    try:
        selected_ids = llm.prioritize_questions(
            req.questions, req.max_count, req.rider_context
        )
        return {"selected_ids": selected_ids, "count": len(selected_ids)}
    except Exception as e:
        logger.error(f"Prioritize error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/build-system-prompt")
async def build_system_prompt_endpoint(req: SystemPromptRequest):
    """Build the single-node agent system prompt."""
    try:
        rider_data = req.rider_data or {}
        restricted_topics = req.restricted_topics or []

        if rider_data and any(rider_data.values()):
            rider_name = rider_data.get("name", "there")
            rider_lines = [f"- Name: {rider_name}"]
            if rider_data.get("phone"):
                rider_lines.append(f"- Phone: {rider_data['phone']}")
            if rider_data.get("last_ride_date"):
                rider_lines.append(f"- Last ride: {rider_data['last_ride_date']}")
            if rider_data.get("ride_count"):
                rider_lines.append(f"- Total rides: {rider_data['ride_count']}")
            if rider_data.get("biodata"):
                bio = rider_data["biodata"]
                if isinstance(bio, dict):
                    for k, v in bio.items():
                        rider_lines.append(f"- {k}: {v}")
                else:
                    rider_lines.append(f"- Bio: {bio}")
            rider_context = "\n".join(rider_lines)
            rider_greeting = f", {rider_name}"
        else:
            rider_context = "No rider data available. Ask all questions from scratch."
            rider_name = "there"
            rider_greeting = ""

        # Enforce max questions limit
        questions = req.questions
        if len(questions) > MAX_SURVEY_QUESTIONS:
            try:
                rider_ctx = rider_context if rider_data else ""
                selected_ids = llm.prioritize_questions(questions, MAX_SURVEY_QUESTIONS, rider_ctx)
                selected_set = set(selected_ids)
                questions = [q for q in questions if q["id"] in selected_set]
            except Exception:
                questions = questions[:MAX_SURVEY_QUESTIONS]

        questions_lines = []
        order_map = {q["id"]: q.get("order", 0) for q in questions}
        for q in questions:
            order = q.get("order", 0)
            qid = q["id"]
            text = q["text"]
            criteria = q.get("criteria", "open")
            parent_id = q.get("parent_id")

            if parent_id and parent_id in order_map:
                trigger_cats = q.get("parent_category_texts", [])
                trigger_str = ", ".join(trigger_cats) if trigger_cats else "any"
                line = QUESTION_FORMAT_BRANCH.format(
                    order=order, question_id=qid, parent_order=order_map[parent_id],
                    trigger_categories=trigger_str, question_text=text,
                )
            elif criteria == "scale":
                line = QUESTION_FORMAT_SCALE.format(
                    order=order, question_id=qid, question_text=text, scale_max=q.get("scales", 5),
                )
            elif criteria == "categorical":
                categories = q.get("categories", [])
                line = QUESTION_FORMAT_CATEGORICAL.format(
                    order=order, question_id=qid, question_text=text, categories=", ".join(categories),
                )
            else:
                line = QUESTION_FORMAT_OPEN.format(order=order, question_id=qid, question_text=text)
            questions_lines.append(line)

        questions_block = "\n\n".join(questions_lines)

        if restricted_topics:
            restricted_topics_block = "\n".join(f"- NEVER discuss {t}" for t in restricted_topics)
        else:
            restricted_topics_block = "- No additional topic restrictions"

        warning_minutes = max(1, req.time_limit_minutes - 2)
        hard_stop_minutes = max(2, req.time_limit_minutes - 1)

        prompt = AGENT_SYSTEM_PROMPT_TEMPLATE.format(
            company_name=req.company_name,
            survey_name=req.survey_name,
            rider_context=rider_context,
            questions_block=questions_block,
            restricted_topics_block=restricted_topics_block,
            time_limit_minutes=req.time_limit_minutes,
            warning_minutes=warning_minutes,
            hard_stop_minutes=hard_stop_minutes,
            absolute_max_minutes=req.time_limit_minutes,
            rider_name=rider_name,
            rider_greeting=rider_greeting,
            max_questions=MAX_SURVEY_QUESTIONS,
        )
        return {"system_prompt": prompt}
    except Exception as e:
        logger.error(f"Build system prompt error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
