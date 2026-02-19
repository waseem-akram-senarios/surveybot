"""
LiveKit Call Dispatcher for Voice Service.

Dispatches outbound survey calls via the LiveKit agent worker.
"""

import json
import logging
import os
import uuid

from livekit import api

logger = logging.getLogger(__name__)


def _get_livekit_api() -> api.LiveKitAPI:
    return api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL", ""),
        api_key=os.getenv("LIVEKIT_API_KEY", ""),
        api_secret=os.getenv("LIVEKIT_API_SECRET", ""),
    )


async def dispatch_livekit_call(phone_number: str, survey_id: str) -> dict:
    """
    Dispatch the LiveKit survey-caller agent to make an outbound call.

    Returns dict with room_name (used as call identifier).
    """
    room_name = f"survey-{survey_id}-{uuid.uuid4().hex[:8]}"
    metadata = json.dumps({
        "phone_number": phone_number,
        "survey_id": survey_id,
    })

    lk_api = _get_livekit_api()
    try:
        dispatch = await lk_api.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                room=room_name,
                metadata=metadata,
            )
        )
        logger.info(f"Dispatched LiveKit agent: room={room_name}, dispatch_id={dispatch.id}")
        return {
            "call_id": room_name,
            "provider": "livekit",
            "dispatch_id": dispatch.id,
        }
    except Exception as e:
        logger.error(f"Failed to dispatch LiveKit call: {e}")
        raise
    finally:
        await lk_api.aclose()
