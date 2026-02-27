"""
Survey function tools — minimal, generic, aligned with brain-service prompt.

Only two tools:
  - record_answer(question_id, answer) — store any survey answer
  - end_survey(reason)                 — end the call and disconnect
"""

import asyncio
from datetime import datetime
from typing import Callable, List

from livekit.agents import function_tool, RunContext

from utils.logging import get_logger
from utils.storage import save_survey_responses

logger = get_logger()

HANGUP_DELAY_SECONDS = 5.0


def create_survey_tools(
    survey_responses: dict,
    caller_number: str,
    call_start_time: datetime,
    log_handler,
    cleanup_logging_fn: Callable,
    disconnect_fn: Callable = None,
    question_ids: List[str] = None,
):
    total_questions = len(question_ids) if question_ids else 0

    @function_tool()
    async def record_answer(context: RunContext, question_id: str, answer: str):
        """
        Record the caller's answer to a survey question.

        Args:
            question_id: The question identifier (e.g. "q1", "overall_satisfaction")
            answer: The caller's response in their own words
        """
        survey_responses["answers"][question_id] = answer
        done = list(survey_responses["answers"].keys())
        done_count = len(done)
        logger.info(f"✅ [{question_id}] ({done_count}/{total_questions}) {answer[:120]}")

        if question_ids:
            remaining = [q for q in question_ids if q not in done]
            if remaining:
                return (
                    f"Recorded {question_id}. "
                    f"Progress: {done_count}/{total_questions} done. "
                    f"ALREADY ASKED (do NOT repeat): {', '.join(done)}. "
                    f"NEXT question to ask: {remaining[0]}. "
                    f"Remaining: {', '.join(remaining)}."
                )
            else:
                return (
                    f"Recorded {question_id}. "
                    f"ALL {total_questions} questions are done. "
                    f"Say your full goodbye message to the person, then call end_survey(reason='completed')."
                )
        return f"Recorded {question_id}."

    @function_tool()
    async def end_survey(context: RunContext, reason: str = "completed"):
        """
        Save survey data and schedule the call to hang up after a delay.
        IMPORTANT: Only call this AFTER you have already spoken your full goodbye message.
        The call will stay connected for a few more seconds so the person hears your farewell.

        Args:
            reason: Why the call is ending — completed, wrong_person, declined, not_available
        """
        logger.info(f"📞 Ending call — reason: {reason} (hanging up in {HANGUP_DELAY_SECONDS}s)")
        survey_responses["end_reason"] = reason
        survey_responses["completed"] = reason == "completed"

        call_duration = (datetime.now() - call_start_time).total_seconds()
        save_survey_responses(caller_number, survey_responses, call_duration)
        cleanup_logging_fn(log_handler)

        # Wait long enough for TTS to finish speaking the goodbye
        await asyncio.sleep(HANGUP_DELAY_SECONDS)

        if disconnect_fn:
            await disconnect_fn()

        return "Call ended."

    return [record_answer, end_survey]
