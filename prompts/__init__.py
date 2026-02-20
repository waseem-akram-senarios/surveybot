"""Prompts module for survey bot."""

from .intelligence import DEFAULT_GLOBAL_PROMPT_EN, SYMPATHIZE_PROMPT
from .survey_template import build_survey_prompt

__all__ = [
    "DEFAULT_GLOBAL_PROMPT_EN",
    "SYMPATHIZE_PROMPT", 
    "build_survey_prompt",
]

