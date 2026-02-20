"""
Configuration settings for the survey bot.
All environment variables and constants are centralized here.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ===========================================
# ORGANIZATION SETTINGS
# ===========================================
ORGANIZATION_NAME = os.getenv("ORGANIZATION_NAME", "IT Curves")

# ===========================================
# DEFAULT RIDER (fallback when not found in DB)
# ===========================================
DEFAULT_RIDER = {
    "first_name": "Jason",
    "last_name": "Smith",
    "phone": "unknown",
    "mobility_needs": "Unknown",
    "user_since": "2024"
}

# ===========================================
# AI MODEL SETTINGS
# ===========================================
# Speech-to-Text (Deepgram)
STT_MODEL = os.getenv("STT_MODEL", "nova-3")
STT_LANGUAGE = os.getenv("STT_LANGUAGE", "en")

# Large Language Model (OpenAI)
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))

# Text-to-Speech
TTS_MODEL = os.getenv("TTS_MODEL", "eleven_flash_v2_5")
TTS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "cgSgspJ2msm6clMCkdW9")

# ===========================================
# SESSION SETTINGS
# ===========================================
PREEMPTIVE_GENERATION = True
RESUME_FALSE_INTERRUPTION = True
FALSE_INTERRUPTION_TIMEOUT = 1.0
MAX_TOOL_STEPS = 5

# ===========================================
# FILE/DIRECTORY PATHS
# ===========================================
LOG_DIR = os.getenv("LOG_DIR", "survey_logs")
RESPONSES_DIR = os.getenv("RESPONSES_DIR", "survey_responses")

# ===========================================
# WORKER SETTINGS
# ===========================================
WORKER_INITIALIZE_TIMEOUT = 120.0
JOB_MEMORY_WARN_MB = 1000
JOB_MEMORY_LIMIT_MB = 1500

