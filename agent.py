"""
Survey Voice Bot - Main Entry Point
Ride-sharing Customer Feedback Survey Agent (Outbound-Only)

This is the main entry point for the survey bot.
All logic is organized in separate modules for maintainability.
"""

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

# Local imports
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
)
from data.riders import get_rider_info
from prompts.survey_template import build_survey_prompt
from tools.survey_tools import create_survey_tools
from utils.logging import get_logger, setup_survey_logging, cleanup_survey_logging
from utils.storage import create_empty_response_dict
from survey_agent import SurveyAgent

# Get logger
logger = get_logger()


async def entrypoint(ctx: JobContext):
    """
    Main entry point for outbound survey calls.

    The phone number to dial is passed via job metadata as JSON:
        {"phone_number": "+15555550123"}

    Flow:
        1. Parse phone number from job metadata.
        2. Connect to the LiveKit room.
        3. Place the outbound SIP call and wait for the rider to answer.
        4. Run the survey session once the rider picks up.
    """
    # Parse phone number from dispatch metadata
    metadata = json.loads(ctx.job.metadata or "{}")
    phone_number = metadata.get("phone_number")

    # Connect to the room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    if phone_number:
        # === OUTBOUND CALL MODE ===
        logger.info(f"Outbound call requested to {phone_number} in room {ctx.room.name}")
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
            logger.info(f"Rider answered: {phone_number}")
        except Exception as e:
            logger.error(f"Outbound call to {phone_number} failed: {e}")
            return
        participant = await ctx.wait_for_participant()
        logger.info(f"Starting survey for participant {participant.identity}")
        caller_number = phone_number
    else:
        # === SANDBOX / BROWSER MODE ===
        logger.info(f"Sandbox mode — waiting for browser participant in room {ctx.room.name}")
        participant = await ctx.wait_for_participant()
        logger.info(f"Sandbox participant joined: {participant.identity}")
        caller_number = participant.identity or "sandbox-user"

    # Set up per-call logging
    log_filename, log_handler = setup_survey_logging(ctx.room.name, caller_number)

    # Track call start time for duration calculation
    call_start_time = datetime.now()

    # Get rider information from data store
    rider_info = get_rider_info(caller_number)
    rider_first_name = rider_info["first_name"]

    logger.info(f"Rider Info: {rider_first_name} - Phone: {caller_number}")

    # Initialize survey responses dictionary
    survey_responses = create_empty_response_dict(rider_first_name, caller_number)

    # Build the survey prompt with rider context
    survey_prompt = build_survey_prompt(
        organization_name=ORGANIZATION_NAME,
        rider_first_name=rider_first_name,
    )

    # Hang up by deleting the room — ends the call for ALL participants
    async def hangup_call():
        logger.info("Hanging up call - deleting room...")
        try:
            await ctx.api.room.delete_room(
                api.DeleteRoomRequest(room=ctx.room.name)
            )
            logger.info("Room deleted — call ended for all participants")
        except Exception as e:
            logger.error(f"Error deleting room: {e}")
            await ctx.room.disconnect()

    # Create survey tools with access to state
    survey_tools = create_survey_tools(
        survey_responses=survey_responses,
        rider_first_name=rider_first_name,
        caller_number=caller_number,
        call_start_time=call_start_time,
        log_handler=log_handler,
        cleanup_logging_fn=cleanup_survey_logging,
        disconnect_fn=hangup_call,
    )

    # Create the survey agent instance
    survey_agent = SurveyAgent(
        instructions=survey_prompt,
        rider_first_name=rider_first_name,
        tools=survey_tools,
    )

    # Create the agent session with optimized settings
    session = AgentSession(
        stt=deepgram.STT(
            model=STT_MODEL,
            language=STT_LANGUAGE,
        ),
        llm=openai.LLM(
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE,
        ),
        tts=elevenlabs.TTS(
            voice_id=TTS_VOICE_ID,
            model=TTS_MODEL,
            apply_text_normalization="on",
        ),
        vad=silero.VAD.load(),

        # Latency optimizations
        preemptive_generation=PREEMPTIVE_GENERATION,
        resume_false_interruption=RESUME_FALSE_INTERRUPTION,
        false_interruption_timeout=FALSE_INTERRUPTION_TIMEOUT,
        max_tool_steps=MAX_TOOL_STEPS,
    )

    # Start the session with the agent
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
