"""
Survey Voice Bot — Main Entry Point

The agent receives its system prompt from brain-service via dispatch metadata.
No local prompt templates — brain-service is the single source of truth.
"""

import os
import json
from datetime import datetime

from livekit import api
from livekit.agents import (
    JobContext,
    WorkerOptions,
    cli,
    AutoSubscribe,
)
from livekit.agents.voice import AgentSession
from livekit.plugins import deepgram, openai, silero, elevenlabs

from config.settings import (
    ORGANIZATION_NAME,
    SIP_OUTBOUND_TRUNK_ID,
    STT_MODEL,
    LLM_MODEL,
    LLM_TEMPERATURE,
    TTS_MODEL,
    TTS_VOICE_ID,
    PREEMPTIVE_GENERATION,
    RESUME_FALSE_INTERRUPTION,
    FALSE_INTERRUPTION_TIMEOUT,
    MAX_TOOL_STEPS,
    WORKER_INITIALIZE_TIMEOUT,
    JOB_MEMORY_WARN_MB,
    JOB_MEMORY_LIMIT_MB,
    STT_LANGUAGE,
    VAD_MIN_SILENCE_DURATION,
    VAD_MIN_SPEECH_DURATION,
    VAD_ACTIVATION_THRESHOLD,
)
from tools.survey_tools import create_survey_tools
from utils.logging import get_logger, setup_survey_logging, cleanup_survey_logging
from utils.storage import create_empty_response_dict
from survey_agent import SurveyAgent

logger = get_logger()

MINIMAL_FALLBACK_PROMPT = (
    "You are Cameron, a friendly AI survey assistant. "
    "The greeting has already been spoken. Conduct a brief feedback survey. "
    "Use record_answer(question_id, answer) to save each response. "
    "When done, say goodbye and call end_survey(reason='completed') immediately."
)


async def entrypoint(ctx: JobContext):
    metadata = json.loads(ctx.job.metadata or "{}")
    phone_number = metadata.get("phone_number")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    if phone_number:
        logger.info(f"Outbound call to {phone_number} in room {ctx.room.name}")
        try:
            await ctx.api.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=ctx.room.name,
                    sip_trunk_id=SIP_OUTBOUND_TRUNK_ID,
                    sip_call_to=phone_number,
                    participant_identity=phone_number,
                    wait_until_answered=True,
                )
            )
            logger.info(f"Answered: {phone_number}")
        except Exception as e:
            logger.error(f"Call to {phone_number} failed: {e}")
            return
        participant = await ctx.wait_for_participant()
        caller_number = phone_number
    else:
        logger.info("Sandbox mode — waiting for browser participant")
        participant = await ctx.wait_for_participant()
        caller_number = participant.identity or "sandbox-user"

    log_filename, log_handler = setup_survey_logging(ctx.room.name, caller_number)
    call_start_time = datetime.now()

    platform_prompt = metadata.get("system_prompt")
    platform_recipient = metadata.get("recipient_name", "")
    platform_org = metadata.get("organization_name", "")

    rider_first_name = platform_recipient.split()[0] if platform_recipient else ""
    org_name = platform_org or ORGANIZATION_NAME

    logger.info(f"Recipient: '{rider_first_name}' | Org: '{org_name}' | Phone: {caller_number}")
    if platform_prompt:
        logger.info(f"Brain-service prompt loaded ({len(platform_prompt)} chars)")
    else:
        logger.warning("No brain-service prompt — using minimal fallback")

    survey_prompt = platform_prompt or MINIMAL_FALLBACK_PROMPT
    survey_responses = create_empty_response_dict(rider_first_name, caller_number)

    async def hangup_call():
        logger.info("Hanging up — deleting room")
        try:
            await ctx.api.room.delete_room(
                api.DeleteRoomRequest(room=ctx.room.name)
            )
        except Exception as e:
            logger.error(f"Room delete failed: {e}")
            await ctx.room.disconnect()

    survey_tools = create_survey_tools(
        survey_responses=survey_responses,
        caller_number=caller_number,
        call_start_time=call_start_time,
        log_handler=log_handler,
        cleanup_logging_fn=cleanup_survey_logging,
        disconnect_fn=hangup_call,
    )

    survey_agent = SurveyAgent(
        instructions=survey_prompt,
        rider_first_name=rider_first_name,
        organization_name=org_name,
        tools=survey_tools,
    )

    session = AgentSession(
        stt=deepgram.STT(model=STT_MODEL, language=STT_LANGUAGE),
        llm=openai.LLM(model=LLM_MODEL, temperature=LLM_TEMPERATURE),
        tts=(
            elevenlabs.TTS(
                voice_id=TTS_VOICE_ID,
                model=TTS_MODEL,
                apply_text_normalization="on",
            )
            if os.getenv("ELEVEN_API_KEY")
            else openai.TTS(voice="nova")
        ),
        vad=silero.VAD.load(
            min_silence_duration=VAD_MIN_SILENCE_DURATION,
            min_speech_duration=VAD_MIN_SPEECH_DURATION,
            activation_threshold=VAD_ACTIVATION_THRESHOLD,
        ),
        preemptive_generation=PREEMPTIVE_GENERATION,
        resume_false_interruption=RESUME_FALSE_INTERRUPTION,
        false_interruption_timeout=FALSE_INTERRUPTION_TIMEOUT,
        max_tool_steps=MAX_TOOL_STEPS,
    )

    await session.start(room=ctx.room, agent=survey_agent)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="survey-agent",
            initialize_process_timeout=WORKER_INITIALIZE_TIMEOUT,
            job_memory_warn_mb=JOB_MEMORY_WARN_MB,
            job_memory_limit_mb=JOB_MEMORY_LIMIT_MB,
        ),
    )
