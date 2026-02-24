"""
Survey Voice Bot - Main Entry Point
Ride-sharing Customer Feedback Survey Agent (Outbound-Only)

This is the main entry point for the survey bot.
All logic is organized in separate modules for maintainability.
"""

import json
import asyncio
from datetime import datetime

from livekit import api
from livekit.agents import (
    JobContext,
    WorkerOptions,
    cli,
    AutoSubscribe,
    metrics,
    MetricsCollectedEvent,
    FunctionToolsExecutedEvent,
    ConversationItemAddedEvent,
)
from livekit.agents.metrics import STTMetrics, LLMMetrics, TTSMetrics
from livekit.agents.voice import AgentSession
from livekit.plugins import deepgram, openai, silero, elevenlabs

# Local imports
from config.settings import (
    ORGANIZATION_NAME,
    SIP_OUTBOUND_TRUNK_ID,
    DEV_MODE,
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
from utils.storage import create_empty_response_dict, save_survey_with_logs
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

    if phone_number and not DEV_MODE:
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
        # === DEV MODE / SANDBOX ===
        logger.info(f"DEV_MODE={DEV_MODE} — skipping SIP, waiting for browser participant in room {ctx.room.name}")
        participant = await ctx.wait_for_participant()
        logger.info(f"Sandbox participant joined: {participant.identity}")
        caller_number = participant.identity or "sandbox-user"

    # Set up per-call logging
    log_filename, log_handlers = setup_survey_logging(ctx.room.name, caller_number)

    # Initialize event log queue for chronological event tracking
    event_log_queue = asyncio.Queue()

    # Track call start time for duration calculation
    call_start_time = datetime.now()

    # Platform-enriched context (provided when dispatched from the dashboard)
    platform_prompt = metadata.get("system_prompt")
    platform_recipient = metadata.get("recipient_name")
    platform_org = metadata.get("organization_name")

    if platform_recipient:
        rider_first_name = platform_recipient.split()[0]
    else:
        rider_info = get_rider_info(caller_number)
        rider_first_name = rider_info["first_name"]

    org_name = platform_org or ORGANIZATION_NAME

    logger.info(f"Rider Info: {rider_first_name} - Phone: {caller_number}")
    if platform_prompt:
        logger.info("Using brain-service prompt from platform metadata")
    
    # Log call start event
    event_log_queue.put_nowait(f"[{datetime.now()}] CALL_START: Survey call initiated to {caller_number} (Rider: {rider_first_name})\n\n")
    
    # Display all survey data in a clean format
    print("\n" + "="*80)
    print("SURVEY CALL DATA LOADED AT START")
    print("="*80)
    print(f"\n📋 RIDER INFORMATION:")
    print(f"   Name: {rider_first_name}")
    print(f"   Phone: {caller_number}")
    print(f"   Organization: {org_name}")
    print(f"   Source: {'Platform metadata (brain-service)' if platform_prompt else 'Local defaults'}")
    print(f"\n🎙️  AGENT CONFIGURATION:")
    print(f"   STT Model: {STT_MODEL}")
    print(f"   LLM Model: {LLM_MODEL}")
    print(f"   TTS Model: {TTS_MODEL}")
    print(f"   TTS Voice: {TTS_VOICE_ID}")
    print("="*80 + "\n")

    # Initialize survey responses dictionary
    survey_responses = create_empty_response_dict(rider_first_name, caller_number)

    # Use brain-service prompt when available, otherwise fall back to hardcoded default
    if platform_prompt:
        survey_prompt = platform_prompt
    else:
        survey_prompt = build_survey_prompt(
            organization_name=org_name,
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
        log_handlers=log_handlers,
        cleanup_logging_fn=cleanup_survey_logging,
        disconnect_fn=hangup_call,
        event_log_queue=event_log_queue,
    )

    # Create the survey agent instance
    survey_agent = SurveyAgent(
        instructions=survey_prompt,
        rider_first_name=rider_first_name,
        organization_name=org_name,
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
    
    # Background task to process event queue and save transcription
    async def write_transcription(transcription: str, event_logs: str):
        """Process event queue and save transcription when call ends."""
        while True:
            event = await event_log_queue.get()
            
            if event == "call_end":
                logger.info("Saving survey data and transcription")
                # Calculate call duration
                call_duration = (datetime.now() - call_start_time).total_seconds()
                # Save transcription with event logs
                save_survey_with_logs(
                    caller_number, survey_responses, 
                    call_start_time, call_duration, transcription, event_logs
                )
                logger.info("Survey data saved successfully")
                break
            
            elif "AGENT SPEECH:" in event or "CUSTOMER SPEECH:" in event:
                transcription += event.replace("SPEECH", "")
            else:
                event_logs += event
    
    # Start transcription writing task
    write_task = asyncio.create_task(write_transcription("", ""))

    # Log session start event
    event_log_queue.put_nowait(f"[{datetime.now()}] SESSION_START: Agent session starting...\n\n")

    # Start the session with the agent
    await session.start(room=ctx.room, agent=survey_agent)

    # Accumulate usage across the whole call
    usage_collector = metrics.UsageCollector()

    @session.on("function_tools_executed")
    def on_function_tools_executed(event: FunctionToolsExecutedEvent):
        """Log all function tool executions."""
        for call in event.function_calls:
            event_log_queue.put_nowait(
                f"[{datetime.now()}] FUNCTION CALL EXECUTED: "
                f"Function {call.name} with parameters {call.arguments}\n\n"
            )

    @session.on("conversation_item_added")
    def on_conversation_item_added(event: ConversationItemAddedEvent):
        """Log agent and user speech."""
        if event.item.text_content != '':
            ts = datetime.now()
            if event.item.role == 'assistant':
                event_log_queue.put_nowait(
                    f"[{ts}] AGENT SPEECH: {event.item.text_content}\n\n"
                )
            if event.item.role == 'user':
                event_log_queue.put_nowait(
                    f"[{ts}] CUSTOMER SPEECH: {event.item.text_content}\n\n"
                )

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)
        
        # Enhanced metrics logging with emojis
        if isinstance(ev.metrics, STTMetrics):
            logger.info(f"STT audio_duration: {ev.metrics.audio_duration:.4f}s")
        
        if isinstance(ev.metrics, LLMMetrics):
            logger.info(f"⏱️  LLM Time to First Token: {ev.metrics.ttft:.4f}s")
        
        if isinstance(ev.metrics, TTSMetrics):
            logger.info(f"⏱️  TTS Time to First Byte: {ev.metrics.ttfb:.4f}s")

    # Log the full usage summary when the call ends
    async def _log_usage_summary():
        summary = usage_collector.get_summary()
        logger.info(f"Call usage summary: {summary}")

    # Shutdown callback to ensure transcription task completes
    async def finish_queue():
        """Ensure transcription task completes before shutdown."""
        event_log_queue.put_nowait("call_end")
        await write_task
        logger.info(f"📝 SURVEY LOG COMPLETED: {log_filename}")
        cleanup_survey_logging(log_handlers)
        await _log_usage_summary()

    ctx.add_shutdown_callback(finish_queue)


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
