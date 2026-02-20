"""
Survey Voice Bot - Main Entry Point
Ride-sharing Customer Feedback Survey Agent

This is the main entry point for the survey bot.
All logic is organized in separate modules for maintainability.
"""

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
    Main entry point for survey calls.
    
    This function is called when a new call/job is received.
    It sets up the survey session and starts the agent.
    """
    # Connect to the room
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    # Wait for participant
    participant = await ctx.wait_for_participant()
    logger.info(f"Starting survey for participant {participant.identity}")
    
    # Extract caller number from SIP attributes
    caller_number = participant.attributes.get('sip.phoneNumber', 'unknown')
    
    # Set up per-call logging
    log_filename, log_handler = setup_survey_logging(ctx.room.name, caller_number)
    
    # Track call start time for duration calculation
    call_start_time = datetime.now()
    
    # Get rider information from data store
    rider_info = get_rider_info(caller_number)
    rider_first_name = rider_info["first_name"]
    
    logger.info(f"📋 Rider Info: {rider_first_name} - Phone: {caller_number}")
    
    # Initialize survey responses dictionary
    survey_responses = create_empty_response_dict(rider_first_name, caller_number)
    
    # Build the survey prompt with rider context
    survey_prompt = build_survey_prompt(
        organization_name=ORGANIZATION_NAME,
        rider_first_name=rider_first_name,
    )
    
    # Create hangup function for ending calls (deletes room for ALL participants)
    async def hangup_call():
        """
        Hang up the call by deleting the room.
        This ends the call for ALL participants (not just the agent).
        Using room.disconnect() only disconnects the agent, leaving the user in silence.
        """
        logger.info("📞 Hanging up call - deleting room...")
        try:
            await ctx.api.room.delete_room(
                api.DeleteRoomRequest(room=ctx.room.name)
            )
            logger.info("✅ Room deleted - call ended for all participants")
        except Exception as e:
            logger.error(f"❌ Error deleting room: {e}")
            # Fallback to disconnect if delete fails
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
    
    # Connect to the room (binds the room after session startup)
    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            initialize_process_timeout=WORKER_INITIALIZE_TIMEOUT,
            job_memory_warn_mb=JOB_MEMORY_WARN_MB,
            job_memory_limit_mb=JOB_MEMORY_LIMIT_MB,
        ),
    )
