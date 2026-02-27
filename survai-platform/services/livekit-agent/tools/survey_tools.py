"""
Survey function tools — minimal, generic, aligned with brain-service prompt.

Only two tools:
  - record_answer(question_id, answer) — store any survey answer
  - end_survey(reason)                 — end the call and disconnect
"""

from datetime import datetime
from typing import Callable

from livekit.agents import function_tool, RunContext

from utils.logging import get_logger
from utils.storage import save_survey_responses

logger = get_logger()


def create_survey_tools(
    survey_responses: dict,
    caller_number: str,
    call_start_time: datetime,
    log_handler,
    cleanup_logging_fn: Callable,
    disconnect_fn: Callable = None,
):
    @function_tool()
    async def record_answer(context: RunContext, question_id: str, answer: str):
        """
        Record the caller's answer to a survey question.

        Args:
            question_id: The question identifier (e.g. "q1", "overall_satisfaction")
            answer: The caller's response in their own words
        """
        survey_responses["answers"][question_id] = answer
        logger.info(f"✅ [{question_id}] {answer[:120]}")
        return "Recorded."

    @function_tool()
    async def end_survey(context: RunContext, reason: str = "completed"):
        """
        End the survey and hang up the call immediately.
        MUST be called after saying goodbye, or if the person is unavailable or wrong person.

        Args:
            reason: Why the call is ending — completed, wrong_person, declined, not_available
        """
        logger.info(f"📞 Ending call — reason: {reason}")
        survey_responses["end_reason"] = reason
        survey_responses["completed"] = reason == "completed"

        call_duration = (datetime.now() - call_start_time).total_seconds()
        save_survey_responses(caller_number, survey_responses, call_duration)
        cleanup_logging_fn(log_handler)

        if disconnect_fn:
            await disconnect_fn()

        return "Call ended."

    return [record_answer, end_survey]
