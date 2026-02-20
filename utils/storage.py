"""
Storage utilities for survey responses.
Handles saving and loading survey data.
"""

import json
import os
from datetime import datetime

from config.settings import RESPONSES_DIR
from utils.logging import get_logger

logger = get_logger()


def create_empty_response_dict(rider_name: str, rider_phone: str) -> dict:
    """
    Create an empty survey responses dictionary.
    
    Args:
        rider_name: The rider's first name
        rider_phone: The rider's phone number
        
    Returns:
        dict: Empty response dictionary with all fields initialized
    """
    return {
        "rider_name": rider_name,
        "rider_phone": rider_phone,
        "name_confirmed": None,
        "availability_status": None,  # available, callback, email, declined
        "callback_time": None,
        "q1_overall_rating": None,  # 1-5 scale
        "q2_would_recommend": None,  # Yes/No
        "q3_timeliness_satisfaction": None,  # Very negative to Very positive
        "q3_followup": None,  # Follow-up based on Q3 answer
        "q4_daily_life_impact": None,  # Open response
        "q5_challenges_faced": None,  # Open response
        "q6_improvements_desired": None,  # Open response
        "q7_additional_comments": None,  # Open response
        "completed": False
    }


def save_survey_responses(caller_number: str, responses: dict, call_duration: float) -> str:
    """
    Save survey responses to a JSON file with question tags.
    
    Args:
        caller_number: The caller's phone number
        responses: Dictionary of survey responses
        call_duration: Duration of the call in seconds
        
    Returns:
        str: Path to the saved file
    """
    os.makedirs(RESPONSES_DIR, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    caller_clean = caller_number.replace("+", "").replace("-", "").replace(" ", "")
    filename = f"{RESPONSES_DIR}/survey_{timestamp}_{caller_clean}.json"
    
    survey_data = {
        "caller_number": caller_number,
        "timestamp": datetime.now().isoformat(),
        "call_duration_seconds": round(call_duration, 2),
        "responses": responses,
        "completed": responses.get("completed", False)
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(survey_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"✅ Survey responses saved to: {filename}")
    return filename


def load_survey_response(filename: str) -> dict | None:
    """
    Load a survey response from a JSON file.
    
    Args:
        filename: Path to the survey response file
        
    Returns:
        dict: Survey data or None if file not found
    """
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Survey file not found: {filename}")
        return None
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in survey file: {filename}")
        return None


def list_survey_responses() -> list[str]:
    """
    List all survey response files.
    
    Returns:
        list: List of survey response file paths
    """
    if not os.path.exists(RESPONSES_DIR):
        return []
    
    return [
        os.path.join(RESPONSES_DIR, f)
        for f in os.listdir(RESPONSES_DIR)
        if f.endswith('.json')
    ]

