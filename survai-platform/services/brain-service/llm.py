"""
LLM Client -- single point of contact for all OpenAI API calls.

Every AI operation in the system goes through these functions.
To swap models, add caching, or add rate limiting -- change it here once.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from openai import OpenAI

from prompts import (
    ANALYZE_PROMPT,
    AUTOFILL_OPEN_PROMPT,
    AUTOFILL_PROMPT,
    FILTERING_PROMPT,
    MAX_SURVEY_QUESTIONS,
    PARSE_PROMPT,
    PRIORITIZE_QUESTIONS_PROMPT,
    SUMMARIZE_PROMPT,
    SYMPATHIZE_PROMPT,
    TRANSLATE_CATEGORIES_PROMPT_TEMPLATE,
    TRANSLATE_PROMPT_TEMPLATE,
)

logger = logging.getLogger(__name__)

_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


# ─── Parse ────────────────────────────────────────────────────────────────────

def parse_response(
    question: str,
    response: str,
    options: List[str],
    criteria: str = "categorical",
) -> Optional[str]:
    """Parse a user's natural-language answer into a structured option."""
    client = _get_client()

    if criteria == "scale":
        options_text = f"Scale: {', '.join(options)}"
    else:
        options_text = f"Options: {', '.join(options)}"

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "developer", "content": PARSE_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Survey Question: {question}\n"
                        f"User's Response: {response}\n"
                        f"{options_text}"
                    ),
                },
            ],
            temperature=0,
        )
        answer = resp.choices[0].message.content.strip()
        if answer in options:
            return answer
        for opt in options:
            if opt.lower() in answer.lower() or answer.lower() in opt.lower():
                return opt
        return answer
    except Exception as e:
        logger.error(f"parse_response error: {e}")
        return None


# ─── Autofill ─────────────────────────────────────────────────────────────────

def autofill_response(
    context: str,
    question: str,
    options: List[str],
    criteria: str = "categorical",
) -> Optional[str]:
    """Try to autofill an answer from rider context/biodata."""
    client = _get_client()

    if criteria == "scale":
        options_text = f"Scale values: {', '.join(options)}"
    else:
        options_text = f"Options: {', '.join(options)}"

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "developer", "content": AUTOFILL_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Context of the survey: {context}\n"
                        f"Survey Question: {question}\n"
                        f"{options_text}"
                    ),
                },
            ],
            temperature=0,
        )
        answer = resp.choices[0].message.content.strip()
        if not answer:
            return None
        for opt in options:
            if opt.lower() == answer.lower():
                return opt
        return answer if answer else None
    except Exception as e:
        logger.error(f"autofill_response error: {e}")
        return None


def autofill_open(context: str, question: str) -> Optional[str]:
    """Autofill an open-ended question from context."""
    client = _get_client()
    try:
        resp = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "developer", "content": AUTOFILL_OPEN_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Context of the survey: {context}\n"
                        f"Survey Question: {question}"
                    ),
                },
            ],
            temperature=0,
        )
        content = resp.choices[0].message.content.strip()
        if content == "Cannot be determined":
            return None
        return content
    except Exception as e:
        logger.error(f"autofill_open error: {e}")
        return None


# ─── Summarize ────────────────────────────────────────────────────────────────

def summarize_response(question: str, response: str) -> str:
    """Summarize a long survey response. Returns original if <= 300 chars."""
    if len(response) <= 300:
        return response
    client = _get_client()
    try:
        resp = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "developer", "content": SUMMARIZE_PROMPT},
                {
                    "role": "user",
                    "content": f"Survey Question: {question}\nUser's Response: {response}",
                },
            ],
            temperature=0,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"summarize_response error: {e}")
        return response


# ─── Sympathize ───────────────────────────────────────────────────────────────

def sympathize(question: str, response: str) -> str:
    """Generate an empathetic acknowledgment for a user's answer."""
    client = _get_client()
    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": SYMPATHIZE_PROMPT},
                {
                    "role": "user",
                    "content": f"Question: {question}\nUser said: {response}",
                },
            ],
            temperature=0.8,
            max_tokens=60,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"sympathize error: {e}")
        return "Thank you for sharing that."


# ─── Translate ────────────────────────────────────────────────────────────────

def translate_text(text: str, language: str) -> str:
    """Translate text to the target language."""
    client = _get_client()
    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": TRANSLATE_PROMPT_TEMPLATE.format(language=language),
                },
                {"role": "user", "content": text},
            ],
            temperature=0,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"translate_text error: {e}")
        return text


def translate_categories(categories: List[str], language: str) -> List[str]:
    """Translate a list of categories to the target language."""
    if not categories:
        return []
    client = _get_client()
    joined = "; ".join(categories)
    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": TRANSLATE_CATEGORIES_PROMPT_TEMPLATE.format(language=language),
                },
                {"role": "user", "content": joined},
            ],
            temperature=0,
        )
        return [c.strip() for c in resp.choices[0].message.content.split(";")]
    except Exception as e:
        logger.error(f"translate_categories error: {e}")
        return categories


# ─── Analyze ──────────────────────────────────────────────────────────────────

def analyze_survey(combined_text: str) -> Dict[str, Any]:
    """Run post-survey AI analysis on responses + transcript."""
    client = _get_client()
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": ANALYZE_PROMPT},
                {"role": "user", "content": combined_text[:8000]},
            ],
            temperature=0,
        )
        content = resp.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except json.JSONDecodeError:
        return {
            "overall_sentiment": "neutral",
            "quality_score": 0,
            "key_themes": [],
            "summary": content[:500] if content else "",
            "nps_score": None,
            "satisfaction_score": None,
        }
    except Exception as e:
        logger.error(f"analyze_survey error: {e}")
        return {
            "overall_sentiment": "neutral",
            "quality_score": 0,
            "key_themes": [],
            "summary": f"Analysis failed: {str(e)}",
            "nps_score": None,
            "satisfaction_score": None,
        }


# ─── Filter ───────────────────────────────────────────────────────────────────

def filter_question(biodata: str, question: str) -> str:
    """Determine if a question is relevant given user biodata. Returns 'Yes' or 'No'."""
    return "Yes"


# ─── Question Prioritization ─────────────────────────────────────────────────

def prioritize_questions(
    questions: List[Dict],
    max_count: int = MAX_SURVEY_QUESTIONS,
    rider_context: str = "",
) -> List[str]:
    """
    Use AI to select and prioritize the most important questions when
    the survey exceeds the max question limit.
    Returns ordered list of question IDs to keep.
    """
    if len(questions) <= max_count:
        return [q["id"] for q in questions]

    client = _get_client()

    questions_desc = []
    for q in questions:
        desc = f"ID: {q['id']} | Type: {q.get('criteria', 'open')} | Text: {q['text']}"
        if q.get("parent_id"):
            desc += f" | CONDITIONAL on: {q['parent_id']}"
        if q.get("categories"):
            desc += f" | Options: {', '.join(q['categories'])}"
        questions_desc.append(desc)

    user_msg = (
        f"Select the {max_count} most important questions from this list.\n"
        f"Keep conditional questions with their parent when possible.\n\n"
        f"QUESTIONS:\n" + "\n".join(questions_desc)
    )
    if rider_context:
        user_msg += f"\n\nRIDER CONTEXT (use to determine relevance):\n{rider_context}"

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": PRIORITIZE_QUESTIONS_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0,
        )
        content = resp.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        selected_ids = json.loads(content)

        valid_ids = {q["id"] for q in questions}
        selected_ids = [qid for qid in selected_ids if qid in valid_ids]

        # Ensure conditional questions have their parents included
        id_to_q = {q["id"]: q for q in questions}
        final_ids = []
        for qid in selected_ids:
            q = id_to_q[qid]
            parent = q.get("parent_id")
            if parent and parent not in final_ids and parent in valid_ids:
                final_ids.append(parent)
            if qid not in final_ids:
                final_ids.append(qid)

        return final_ids[:max_count]

    except Exception as e:
        logger.error(f"prioritize_questions error: {e}")
        return [q["id"] for q in questions[:max_count]]
