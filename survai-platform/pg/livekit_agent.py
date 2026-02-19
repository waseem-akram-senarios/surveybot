"""
LiveKit Survey Agent

A voice AI agent that conducts phone surveys using LiveKit's Agents Framework.
Uses OpenAI Realtime Model for integrated STT + LLM + TTS.
For phone calls: intelligence (system prompt, answer parsing) comes from brain-service.
For sandbox/browser: uses a hardcoded demo prompt.
"""

import json
import logging
import os
from datetime import datetime

import requests
from dotenv import load_dotenv

from livekit import api
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    RunContext,
    WorkerOptions,
    cli,
    function_tool,
    get_job_context,
)
from livekit.agents.voice import AgentSession, Agent
from livekit.plugins import openai, silero

load_dotenv(dotenv_path=".env.local")

logger = logging.getLogger("survey-agent")
logger.setLevel(logging.INFO)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8081/pg")
BRAIN_SERVICE_URL = os.getenv("BRAIN_SERVICE_URL", "http://brain-service:8016")
outbound_trunk_id = os.getenv("SIP_OUTBOUND_TRUNK_ID", "")
ORGANIZATION_NAME = os.getenv("ORGANIZATION_NAME", "IT Curves")


# ─── Backend API helpers ─────────────────────────────────────────────────────

def fetch_survey_data(survey_id: str) -> dict | None:
    try:
        resp = requests.get(f"{BACKEND_URL}/api/surveys/{survey_id}/questions")
        if resp.status_code == 200:
            return resp.json()
        logger.error(f"Failed to fetch survey data: {resp.status_code}")
        return None
    except Exception as e:
        logger.error(f"Error fetching survey data: {e}")
        return None


def fetch_survey_recipient(survey_id: str) -> dict | None:
    try:
        resp = requests.get(f"{BACKEND_URL}/api/surveys/{survey_id}/recipient_info")
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        logger.error(f"Error fetching recipient: {e}")
        return None


def submit_survey_answers(survey_id: str, answers: dict) -> bool:
    try:
        payload = {"SurveyId": survey_id, **answers}
        resp = requests.post(
            f"{BACKEND_URL}/api/surveys/{survey_id}/update_survey_qna_phone",
            json=payload,
        )
        logger.info(f"Submitted answers for {survey_id}: {resp.status_code}")
        return resp.status_code == 200
    except Exception as e:
        logger.error(f"Error submitting answers: {e}")
        return False


def fetch_system_prompt(
    survey_name: str,
    questions: list[dict],
    rider_data: dict | None = None,
    company_name: str = "IT Curves",
    time_limit_minutes: int = 8,
) -> str | None:
    try:
        resp = requests.post(
            f"{BRAIN_SERVICE_URL}/api/brain/build-system-prompt",
            json={
                "survey_name": survey_name,
                "questions": questions,
                "rider_data": rider_data,
                "company_name": company_name,
                "time_limit_minutes": time_limit_minutes,
            },
            timeout=30,
        )
        if resp.status_code == 200:
            prompt = resp.json().get("system_prompt", "")
            logger.info(f"Got system prompt from brain-service ({len(prompt)} chars)")
            return prompt
        logger.error(f"Brain build-system-prompt failed: {resp.status_code}")
        return None
    except Exception as e:
        logger.error(f"Error fetching system prompt: {e}")
        return None


def parse_answer_via_brain(question: str, response: str, options: list[str], criteria: str = "categorical") -> str | None:
    try:
        resp = requests.post(
            f"{BRAIN_SERVICE_URL}/api/brain/parse",
            json={"question": question, "response": response, "options": options, "criteria": criteria},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get("answer")
        return None
    except Exception:
        return None


# ─── Entrypoint ──────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext):
    """Main entrypoint for the LiveKit agent worker."""

    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    # Parse metadata -- sandbox connections have none
    metadata = {}
    try:
        raw = ctx.job.metadata
        if raw:
            metadata = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        pass

    phone_number = metadata.get("phone_number")
    survey_id = metadata.get("survey_id")

    if phone_number and survey_id:
        await _run_phone_call(ctx, phone_number, survey_id, participant)
    else:
        await _run_sandbox(ctx, participant)


# ─── Sandbox mode ────────────────────────────────────────────────────────────

async def _run_sandbox(ctx: JobContext, participant):
    """Handle sandbox/browser demo connections."""
    logger.info(f"Sandbox mode: room={ctx.room.name}")

    sandbox_prompt = f"""You are Cameron, a warm and friendly AI survey assistant from {ORGANIZATION_NAME}.

# CRITICAL: YOU MUST SPEAK FIRST!
When the call connects, immediately start with the greeting below. Do NOT wait for the participant to speak first.

Immediately say: "Hi there! I'm Cameron from {ORGANIZATION_NAME}. I'm a voice AI agent that conducts conversational surveys over the phone. Would you like to try a quick demo conversation?"

If they want to try a demo conversation, have a natural friendly chat. Ask them a few example questions like:
- How their day is going
- What they think about AI voice assistants
- Rate their experience talking to you on a scale of 1 to 5

Be conversational, empathetic, and natural. Don't sound robotic. Keep it brief and fun.
End by saying they can use this technology to conduct real surveys by connecting it to their survey platform.

Current time: {datetime.now().strftime('%I:%M %p')}
"""

    class SandboxAgent(Agent):
        async def on_enter(self):
            await self.session.generate_reply(
                instructions=f"Immediately greet the user: 'Hi there! I'm Cameron from {ORGANIZATION_NAME}. I'm a voice AI agent that conducts conversational surveys. Would you like to try a quick demo?'"
            )

    agent = SandboxAgent(instructions=sandbox_prompt)

    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            voice="ash",
            temperature=0.7,
        ),
        vad=silero.VAD.load(),
    )

    await session.start(room=ctx.room, agent=agent)
    await ctx.connect()


# ─── Phone call mode ─────────────────────────────────────────────────────────

async def _run_phone_call(ctx: JobContext, phone_number: str, survey_id: str, participant):
    """Handle real survey phone calls with brain-service integration."""
    logger.info(f"Phone call mode: survey={survey_id}, phone={phone_number}")

    survey_data = fetch_survey_data(survey_id)
    if not survey_data:
        logger.error(f"Could not fetch survey data for {survey_id}")
        return

    questions = survey_data.get("Questions", [])
    if not questions:
        logger.error(f"No questions found for survey {survey_id}")
        return

    recipient_info = fetch_survey_recipient(survey_id) or {}
    recipient_name = recipient_info.get("Recipient", "Customer")
    ride_id = recipient_info.get("RideID", "N/A")
    survey_name = recipient_info.get("Name", "Survey")
    rider_phone = recipient_info.get("Phone", phone_number)

    rider_data = {"name": recipient_name, "phone": rider_phone}
    biodata = recipient_info.get("Biodata")
    if biodata:
        rider_data["biodata"] = biodata

    system_prompt = fetch_system_prompt(
        survey_name=survey_name,
        questions=questions,
        rider_data=rider_data,
        company_name=ORGANIZATION_NAME,
    )
    if not system_prompt:
        logger.warning("Brain-service unavailable, using fallback prompt")
        system_prompt = (
            f"You are Cameron, a friendly survey caller from {ORGANIZATION_NAME}. "
            f"You're calling {recipient_name} about their experience with {survey_name}. "
            "Be conversational and natural. Ask one question at a time. "
            "Use record_answer to save answers, then submit_and_end when done."
        )

    call_start_time = datetime.now()
    survey_responses: dict[str, str] = {}
    questions_by_id = {q.get("id", ""): q for q in questions}

    class SurveyAgent(Agent):
        async def on_enter(self):
            await self.session.generate_reply(
                instructions=f"Immediately greet the participant. You are calling {recipient_name}. Start the conversation now."
            )

        async def hangup(self):
            job_ctx = get_job_context()
            await job_ctx.api.room.delete_room(
                api.DeleteRoomRequest(room=job_ctx.room.name)
            )

        @function_tool()
        async def record_answer(self, ctx: RunContext, question_id: str, answer: str):
            """Record the user's answer to a survey question.

            Args:
                question_id: The ID of the question being answered
                answer: The user's answer (category name, rating number, or free text)
            """
            q = questions_by_id.get(question_id)
            if q:
                criteria = q.get("criteria", "open")
                categories = q.get("categories", [])
                scales = q.get("scales", q.get("scale"))

                if criteria in ("categorical", "scale") and categories:
                    parsed = parse_answer_via_brain(
                        question=q.get("text", q.get("question_text", "")),
                        response=answer,
                        options=categories if criteria == "categorical" else [str(i) for i in range(1, (scales or 5) + 1)],
                        criteria=criteria,
                    )
                    if parsed:
                        logger.info(f"Brain parsed '{answer}' -> '{parsed}' for {question_id}")
                        survey_responses[question_id] = parsed
                    else:
                        survey_responses[question_id] = answer
                else:
                    survey_responses[question_id] = answer
            else:
                survey_responses[question_id] = answer

            logger.info(f"Recorded answer for {question_id}: {survey_responses[question_id]}")
            return f"Answer recorded for question {question_id}. Continue the conversation naturally."

        @function_tool()
        async def schedule_callback(self, ctx: RunContext, callback_time: str):
            """Schedule a callback when the user isn't available now.

            Args:
                callback_time: When the user wants to be called back (e.g. "tomorrow afternoon", "in 2 hours")
            """
            logger.info(f"Callback requested for survey {survey_id}: {callback_time}")
            try:
                requests.post(
                    f"{BACKEND_URL}/api/surveys/callback",
                    json={"survey_id": survey_id, "phone": "", "delay_minutes": 60, "provider": "livekit"},
                    timeout=10,
                )
            except Exception as e:
                logger.warning(f"Failed to schedule callback: {e}")
            return f"Callback noted for {callback_time}. Say goodbye warmly and end the call."

        @function_tool()
        async def submit_and_end(self, ctx: RunContext):
            """Submit all collected survey answers and end the call. Call this after the concluding statement."""
            logger.info(f"Submitting {len(survey_responses)} answers for survey {survey_id}")
            submit_survey_answers(survey_id, survey_responses)
            try:
                requests.patch(f"{BACKEND_URL}/api/surveys/{survey_id}/status", json={"Status": "Completed"})
            except Exception:
                pass
            duration = (datetime.now() - call_start_time).total_seconds()
            try:
                requests.post(f"{BACKEND_URL}/api/surveys/{survey_id}/duration", json={"CompletionDuration": int(duration)}, timeout=5)
            except Exception:
                pass
            return "Survey submitted and call ended."

        @function_tool()
        async def end_call(self, ctx: RunContext):
            """End the call when the user declines, wants to stop, or isn't available."""
            logger.info(f"Ending call for survey {survey_id}")
            if survey_responses:
                submit_survey_answers(survey_id, survey_responses)
                try:
                    requests.patch(f"{BACKEND_URL}/api/surveys/{survey_id}/status", json={"Status": "In-Progress"})
                except Exception:
                    pass
            return "Call ended."

        @function_tool()
        async def detected_answering_machine(self, ctx: RunContext):
            """Called when the call reaches voicemail. Use this after you hear the voicemail greeting."""
            logger.info(f"Voicemail detected for survey {survey_id}")
            await self.hangup()
            return "Voicemail detected, call ended."

    agent = SurveyAgent(instructions=system_prompt)

    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            voice="ash",
            temperature=0.7,
        ),
        vad=silero.VAD.load(),
    )

    await session.start(room=ctx.room, agent=agent)

    # Dial out via SIP
    participant_identity = f"sip_{phone_number}"
    try:
        await ctx.api.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                room_name=ctx.room.name,
                sip_trunk_id=outbound_trunk_id,
                sip_call_to=phone_number,
                participant_identity=participant_identity,
                participant_name=recipient_name,
                krisp_enabled=True,
                wait_until_answered=True,
            )
        )
        sip_participant = await ctx.wait_for_participant(identity=participant_identity)
        logger.info(f"SIP participant joined: {sip_participant.identity}")

        try:
            from utils import sql_execute
            sql_execute(
                "UPDATE surveys SET call_id = :call_id WHERE id = :survey_id",
                {"call_id": ctx.room.name, "survey_id": survey_id},
            )
        except Exception:
            pass

    except Exception as e:
        logger.error(f"Error creating SIP participant: {e}")

    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            initialize_process_timeout=120.0,
            job_memory_warn_mb=1000,
            job_memory_limit_mb=1500,
        ),
    )
