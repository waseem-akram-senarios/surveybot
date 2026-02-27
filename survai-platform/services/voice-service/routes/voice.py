"""
Voice Service API routes.

Handles LiveKit call lifecycle:
- Initiate calls via LiveKit SIP
- Transcript retrieval
- Email fallback
"""

import asyncio
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request

from db import (
    get_rider_data,
    get_survey_with_questions,
    get_template_config,
    get_transcript,
    record_answer,
    sql_execute,
    async_execute,
    store_transcript,
    update_survey_status,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["voice"])

BRAIN_SERVICE_URL = os.getenv("BRAIN_SERVICE_URL", "http://brain-service:8016")

_brain_client: Optional[httpx.AsyncClient] = None


def _get_brain_client() -> httpx.AsyncClient:
    """Singleton HTTP client for brain-service — reuses TCP connections."""
    global _brain_client
    if _brain_client is None or _brain_client.is_closed:
        _brain_client = httpx.AsyncClient(
            base_url=BRAIN_SERVICE_URL,
            timeout=15.0,
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        )
    return _brain_client


@router.post("/make-call")
async def make_call(
    survey_id: str,
    phone: str,
    provider: str = "livekit",
):
    """Initiate an AI-powered survey call via LiveKit SIP."""
    survey = await get_survey_with_questions(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail=f"Survey {survey_id} not found")

    questions = survey.get("questions", [])
    if not questions:
        raise HTTPException(status_code=400, detail="Survey has no questions")

    livekit_url = os.getenv("LIVEKIT_URL", "")
    if not livekit_url:
        raise HTTPException(status_code=500, detail="LIVEKIT_URL not configured")

    template_name = survey.get("template_name", "")
    rider_name = survey.get("rider_name") or survey.get("recipient") or ""
    rider_phone = survey.get("phone") or phone

    coros = []
    if template_name:
        coros.append(get_template_config(template_name))
    coros.append(get_rider_data(rider_name, rider_phone))

    results = await asyncio.gather(*coros)
    if template_name:
        template_config, rider_data = results[0], results[1]
    else:
        template_config, rider_data = {}, results[0]

    language = "en"
    if template_name:
        tname_lower = template_name.lower()
        if "spanish" in tname_lower or "_es" in tname_lower:
            language = "es"

    company_name = template_config.get("company_name") or os.getenv("ORGANIZATION_NAME", "IT Curves")
    callback_url = os.getenv("SURVEY_SUBMIT_URL", "http://survey-service:8020/api/answers/qna_phone")

    survey_context = {
        "recipient_name": rider_name or "",
        "template_name": template_name,
        "organization_name": company_name,
        "language": language,
        "questions": questions,
        "callback_url": callback_url,
    }

    try:
        if not rider_data:
            rider_data = {}
        if not rider_data.get("name") and rider_name:
            rider_data["name"] = rider_name
        if not rider_data.get("phone") and rider_phone:
            rider_data["phone"] = rider_phone
        survey_biodata = survey.get("biodata", "")
        if survey_biodata and not rider_data.get("biodata"):
            rider_data["biodata"] = survey_biodata

        client = _get_brain_client()
        resp = await client.post(
            "/api/brain/build-system-prompt",
            json={
                "survey_name": template_name or f"Survey {survey_id}",
                "questions": questions,
                "rider_data": rider_data,
                "company_name": company_name,
            },
        )
        if resp.status_code == 200:
            survey_context["system_prompt"] = resp.json().get("system_prompt", "")
            logger.info(f"Built brain-service prompt for LiveKit call ({len(survey_context['system_prompt'])} chars)")
        else:
            logger.warning(f"Brain-service prompt failed ({resp.status_code}), agent will use defaults")
    except Exception as e:
        logger.warning(f"Brain-service unreachable for LiveKit prompt: {e}, agent will use defaults")

    try:
        from livekit_dispatcher import dispatch_livekit_call
        result = await dispatch_livekit_call(
            phone_number=phone,
            survey_id=survey_id,
            survey_context=survey_context,
        )

        call_id = result.get("call_id", "")
        if call_id:
            try:
                await async_execute(
                    "UPDATE surveys SET call_id = :call_id WHERE id = :sid",
                    {"call_id": call_id, "sid": survey_id},
                )
            except Exception as e:
                logger.warning(f"Failed to save LiveKit call_id: {e}")

        return {
            "status": "call_initiated",
            "call_id": call_id,
            "survey_id": survey_id,
            "provider": "livekit",
        }
    except Exception as e:
        logger.error(f"LiveKit call failed: {e}")
        raise HTTPException(status_code=500, detail=f"LiveKit call failed: {str(e)}")


@router.get("/transcript/{survey_id}")
async def get_survey_transcript(survey_id: str):
    """Get the stored transcript for a survey."""
    transcript = get_transcript(survey_id)
    if not transcript:
        raise HTTPException(
            status_code=404,
            detail=f"No transcript found for survey {survey_id}",
        )
    return transcript


@router.post("/send-email-fallback")
async def send_email_fallback(
    survey_id: str,
    email: str,
    survey_url: str,
):
    """Send an email survey link as fallback when call fails or is declined."""
    subject = "We'd love your feedback!"
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">We'd love your input!</h2>
        <p>We value your feedback and would appreciate it if you could take a few moments to complete a brief survey.</p>
        <p><a href="{survey_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Take the Survey</a></p>
        <p>Thank you for your time!</p>
    </body>
    </html>
    """
    text_body = f"We'd love your feedback! Take the survey here: {survey_url}"

    # 1) Try MailerSend
    try:
        from mailersend import emails as ms_emails
        api_key = os.getenv("MAILERSEND_API_KEY", "")
        sender_email = os.getenv("MAILERSEND_SENDER_EMAIL", "")
        if api_key and not api_key.startswith("<"):
            mailer = ms_emails.NewEmail(api_key)
            mail_body = {}
            mailer.set_mail_from({"name": "SurvAI", "email": sender_email}, mail_body)
            mailer.set_mail_to([{"name": "Recipient", "email": email}], mail_body)
            mailer.set_subject(subject, mail_body)
            mailer.set_html_content(html_body, mail_body)
            mailer.send(mail_body)
            logger.info(f"Email fallback sent via MailerSend for survey {survey_id} to {email}")
            return {"status": "sent", "email": email, "survey_id": survey_id}
    except Exception as e:
        logger.warning(f"MailerSend fallback failed for {email}: {e}")

    # 2) Try Resend
    try:
        import resend as _resend
        resend_key = os.getenv("RESEND_API_KEY", "")
        resend_from = os.getenv("RESEND_FROM_EMAIL", "")
        if resend_key and resend_from:
            _resend.api_key = resend_key
            _resend.Emails.send({"from": resend_from, "to": email, "subject": subject, "html": html_body})
            logger.info(f"Email fallback sent via Resend for survey {survey_id} to {email}")
            return {"status": "sent", "email": email, "survey_id": survey_id}
    except Exception as e:
        logger.warning(f"Resend fallback failed for {email}: {e}")

    # 3) Try SMTP (Mailjet)
    try:
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        smtp_host = os.getenv("SMTP_HOST", "")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASSWORD", "")
        smtp_from = os.getenv("SMTP_FROM_EMAIL") or smtp_user or "noreply@aidevlab.com"
        smtp_from_name = os.getenv("SMTP_FROM_NAME", "SurvAI")

        if smtp_host:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{smtp_from_name} <{smtp_from}>"
            msg["To"] = email
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
                try:
                    server.starttls()
                except smtplib.SMTPNotSupportedError:
                    pass
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [email], msg.as_string())
            server.quit()
            logger.info(f"Email fallback sent via SMTP for survey {survey_id} to {email}")
            return {"status": "sent", "email": email, "survey_id": survey_id}
    except Exception as e:
        logger.warning(f"SMTP fallback failed for {email}: {e}")

    logger.error(f"All email fallback methods failed for survey {survey_id} to {email}")
    return {"status": "failed", "error": "All email providers failed", "survey_url": survey_url}


# ─── Direct call endpoint (dashboard calls this via gateway, skipping survey-service hop)

@router.post("/direct-call")
async def direct_call(to: str, survey_id: str, provider: str = "livekit"):
    """Dashboard-compatible endpoint: accepts 'to' param instead of 'phone'."""
    return await make_call(survey_id=survey_id, phone=to, provider=provider)


# ─── Backward Compatibility Aliases ──────────────────────────────────────────

agent_router = APIRouter(prefix="/api/agent", tags=["agent-compat"])


@agent_router.post("/make-call")
async def agent_make_call(survey_id: str, phone: str, provider: str = "livekit"):
    return await make_call(survey_id=survey_id, phone=phone, provider=provider)


@agent_router.get("/transcript/{survey_id}")
async def agent_get_transcript(survey_id: str):
    return await get_survey_transcript(survey_id)


@agent_router.post("/send-email-fallback")
async def agent_send_email(survey_id: str, email: str, survey_url: str):
    return await send_email_fallback(survey_id=survey_id, email=email, survey_url=survey_url)
