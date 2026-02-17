"""
Database operations for the Template Service.
Owns: templates, template_questions (via template management)
Reads/Writes: questions, question_categories, question_category_mappings
"""

import sys

sys.path.insert(0, "/app")

import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from uuid import uuid4

import httpx
from sqlalchemy import create_engine, text

BRAIN_SERVICE_URL = os.getenv("BRAIN_SERVICE_URL", "http://brain-service:8016")

logger = logging.getLogger(__name__)

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_user = os.getenv("DB_USER", "pguser")
        db_password = os.getenv("DB_PASSWORD", "root")
        url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/db"
        _engine = create_engine(url, pool_size=5, max_overflow=10, pool_pre_ping=True)
    return _engine


def sql_execute(query: str, params: Union[dict, List[dict], None] = None) -> List[Dict[str, Any]]:
    """
    Execute a SQL query. For SELECT: returns list of dicts.
    For mutations: commits and returns empty list.
    params: single dict or list of dicts for batch operations.
    """
    engine = get_engine()
    with engine.connect() as conn:
        if isinstance(params, list):
            result = conn.execute(text(query), params)
            conn.commit()
            return []
        result = conn.execute(text(query), params or {})
        if result.returns_rows:
            rows = result.fetchall()
            columns = result.keys()
            return [dict(zip(columns, row)) for row in rows]
        conn.commit()
        return []


def get_current_time() -> str:
    """Returns datetime.now(timezone.utc).isoformat()"""
    return datetime.now(timezone.utc).isoformat()


def translate(text: str, language: str) -> str:
    """Translate text via brain-service."""
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{BRAIN_SERVICE_URL}/api/brain/translate",
                json={"text": text, "language": language},
            )
            if resp.status_code == 200:
                return resp.json().get("translated", text)
    except Exception as e:
        logger.warning(f"Brain service translate error: {e}")
    return text


def translate_categories(categories: List[str], language: str) -> List[str]:
    """Translate categories via brain-service."""
    if not categories:
        return []
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{BRAIN_SERVICE_URL}/api/brain/translate-categories",
                json={"categories": categories, "language": language},
            )
            if resp.status_code == 200:
                return resp.json().get("translated", categories)
    except Exception as e:
        logger.warning(f"Brain service translate-categories error: {e}")
    return categories


def process_question_translation(
    item: Dict[str, Any],
    src_template_name: str,
    new_template_name: str,
    new_template_language: str,
) -> Dict[str, Any]:
    """
    Translates a question item for template translation.
    Returns new question dict with new id (uuid4), translated text, translated categories
    if categorical, translated parent_category_texts, preserves old_id for mapping.
    """
    try:
        que_id = item["id"]
        que_text = item["text"]
        que_text_translated = translate(que_text, new_template_language)

        que_criteria = item.get("criteria")
        if que_criteria == "categorical":
            cats = item.get("categories") or []
            if isinstance(cats, str):
                cats = [c.strip() for c in cats.split(";")] if cats else []
            que_categories_new = translate_categories(cats, new_template_language)
        else:
            que_categories_new = None

        new_que_id = str(uuid4())
        new_question = dict(item)
        new_question["id"] = new_que_id
        new_question["text"] = que_text_translated
        new_question["scales"] = item.get("scales")
        new_question["categories"] = que_categories_new

        pct = item.get("parent_category_texts") or []
        if isinstance(pct, str):
            pct = [c.strip() for c in pct.split(";")] if pct else []
        if pct:
            new_question["parent_category_texts"] = translate_categories(pct, new_template_language)
        else:
            new_question["parent_category_texts"] = []

        new_question["old_id"] = que_id
        new_question["ord"] = item.get("ord", 0)

        return new_question
    except Exception as e:
        logger.warning(f"Error processing question {item.get('id')}: {e}")
        raise


def process_question_stats(data: Dict[str, Any]) -> Dict[str, int]:
    """
    Returns category_counts for categorical, scale_counts for scale questions.
    """
    criteria = data.get("criteria")
    categories = data.get("categories", [])
    if isinstance(categories, str):
        try:
            import json
            categories = json.loads(categories) if categories else []
        except (json.JSONDecodeError, TypeError):
            categories = []
    scales = data.get("scales", 0)
    answers = data.get("answers", [])

    if criteria == "categorical":
        category_counts = {str(cat): 0 for cat in categories}
        for ans in answers:
            ans_str = str(ans) if ans is not None else ""
            if ans_str in category_counts:
                category_counts[ans_str] += 1
        return category_counts

    if criteria == "scale":
        try:
            scale_max = int(scales)
        except (ValueError, TypeError):
            return {}
        scale_counts = {str(i): 0 for i in range(1, scale_max + 1)}
        for ans in answers:
            try:
                if ans is not None and 1 <= int(ans) <= scale_max:
                    scale_counts[str(int(ans))] += 1
            except (ValueError, TypeError):
                continue
        return scale_counts

    return {}
