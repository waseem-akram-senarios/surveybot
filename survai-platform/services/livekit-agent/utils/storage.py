"""
Storage utilities for survey responses.
"""

import json
import os
from datetime import datetime

from config.settings import RESPONSES_DIR
from utils.logging import get_logger

logger = get_logger()


def create_empty_response_dict(rider_name: str, rider_phone: str) -> dict:
    return {
        "rider_name": rider_name,
        "rider_phone": rider_phone,
        "answers": {},
        "end_reason": None,
        "completed": False,
    }


def save_survey_responses(caller_number: str, responses: dict, call_duration: float) -> str:
    os.makedirs(RESPONSES_DIR, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    caller_clean = caller_number.replace("+", "").replace("-", "").replace(" ", "")
    filename = f"{RESPONSES_DIR}/survey_{timestamp}_{caller_clean}.json"

    survey_data = {
        "caller_number": caller_number,
        "timestamp": datetime.now().isoformat(),
        "call_duration_seconds": round(call_duration, 2),
        "responses": responses,
        "completed": responses.get("completed", False),
    }

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(survey_data, f, indent=2, ensure_ascii=False)

    logger.info(f"✅ Responses saved → {filename}")
    return filename
