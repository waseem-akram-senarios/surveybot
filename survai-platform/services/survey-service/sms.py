"""
SMS Service - Twilio integration for sending SMS survey links.
Used as backup when phone calls are missed or declined.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Twilio credentials from environment
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

_client = None


def _get_twilio_client():
    """Lazy initialization of Twilio client."""
    global _client
    if _client is None:
        try:
            from twilio.rest import Client
            if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
                _client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            else:
                logger.warning("Twilio credentials not configured")
        except ImportError:
            logger.warning("Twilio library not installed. Run: pip install twilio")
    return _client


def send_sms(
    to_phone: str,
    message: str,
    from_phone: Optional[str] = None
) -> dict:
    """
    Send an SMS message via Twilio.
    
    Args:
        to_phone: Recipient phone number (E.164 format, e.g., +15551234567)
        message: SMS message body
        from_phone: Optional sender phone number (defaults to TWILIO_PHONE_NUMBER)
    
    Returns:
        dict with status and message_sid or error
    """
    client = _get_twilio_client()
    if not client:
        return {"success": False, "error": "Twilio not configured"}
    
    sender = from_phone or TWILIO_PHONE_NUMBER
    if not sender:
        return {"success": False, "error": "No sender phone number configured"}
    
    try:
        message_obj = client.messages.create(
            body=message,
            from_=sender,
            to=to_phone
        )
        logger.info(f"SMS sent to {to_phone}: {message_obj.sid}")
        return {
            "success": True,
            "message_sid": message_obj.sid,
            "status": message_obj.status
        }
    except Exception as e:
        logger.error(f"SMS send failed to {to_phone}: {e}")
        return {"success": False, "error": str(e)}


def send_survey_link_sms(
    to_phone: str,
    survey_url: str,
    rider_name: Optional[str] = None,
    language: str = "en"
) -> dict:
    """
    Send SMS with survey link - used as backup for missed calls.
    
    Args:
        to_phone: Recipient phone number
        survey_url: URL to the survey
        rider_name: Optional rider name for personalization
        language: 'en' or 'es' for message language
    """
    if language == "es":
        if rider_name:
            message = f"Hola {rider_name}! Nos gustaría conocer tu opinión sobre tu viaje reciente. Por favor completa nuestra breve encuesta: {survey_url}"
        else:
            message = f"Hola! Nos gustaría conocer tu opinión sobre tu viaje reciente. Por favor completa nuestra breve encuesta: {survey_url}"
    else:
        if rider_name:
            message = f"Hi {rider_name}! We'd love to hear about your recent trip. Please take our brief survey: {survey_url}"
        else:
            message = f"Hi! We'd love to hear about your recent trip. Please take our brief survey: {survey_url}"
    
    return send_sms(to_phone, message)


def send_callback_sms(
    to_phone: str,
    callback_number: str,
    rider_name: Optional[str] = None,
    language: str = "en"
) -> dict:
    """
    Send SMS with callback number when voicemail is left.
    """
    if language == "es":
        if rider_name:
            message = f"Hola {rider_name}! Intentamos comunicarnos contigo para una breve encuesta. Por favor llámanos al {callback_number} cuando tengas un momento."
        else:
            message = f"Hola! Intentamos comunicarnos contigo para una breve encuesta. Por favor llámanos al {callback_number} cuando tengas un momento."
    else:
        if rider_name:
            message = f"Hi {rider_name}! We tried reaching you for a brief survey. Please call us back at {callback_number} when you have a moment."
        else:
            message = f"Hi! We tried reaching you for a brief survey. Please call us back at {callback_number} when you have a moment."
    
    return send_sms(to_phone, message)
