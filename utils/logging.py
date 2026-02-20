"""
Logging utilities for the survey bot.
Handles per-call logging and general logging setup.
"""

import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

from config.settings import LOG_DIR


# Create the main logger
_logger = logging.getLogger("survey-agent")
_logger.setLevel(logging.INFO)


def get_logger() -> logging.Logger:
    """Get the survey agent logger."""
    return _logger


def setup_survey_logging(room_name: str, caller_number: str) -> tuple[str, RotatingFileHandler]:
    """
    Set up a separate log file for this survey call.
    
    Args:
        room_name: The LiveKit room name
        caller_number: The caller's phone number
        
    Returns:
        tuple: (log_filename, file_handler)
    """
    os.makedirs(LOG_DIR, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    caller_clean = caller_number.replace("+", "").replace("-", "").replace(" ", "")
    log_filename = f"{LOG_DIR}/survey_{timestamp}_{caller_clean}_{room_name}.log"
    
    file_handler = RotatingFileHandler(
        log_filename,
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    
    formatter = logging.Formatter(
        '%(asctime)s | %(name)-20s | %(levelname)-8s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    
    _logger.addHandler(file_handler)
    
    _logger.info(f"📝 SURVEY LOG FILE CREATED: {log_filename}")
    return log_filename, file_handler


def cleanup_survey_logging(handler: RotatingFileHandler) -> None:
    """
    Remove the survey-specific handler after the call ends.
    
    Args:
        handler: The file handler to remove
    """
    _logger.removeHandler(handler)
    handler.close()

