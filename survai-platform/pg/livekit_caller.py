"""
LiveKit Call Dispatcher

Utility functions for the FastAPI backend to dispatch outbound survey calls
via LiveKit and retrieve call/transcript information.
"""

import json
import logging
import os
import uuid
from typing import Optional

from livekit import api

logger = logging.getLogger(__name__)


def _get_livekit_api() -> api.LiveKitAPI:
    """Create a LiveKit API client from environment variables."""
    return api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL", ""),
        api_key=os.getenv("LIVEKIT_API_KEY", ""),
        api_secret=os.getenv("LIVEKIT_API_SECRET", ""),
    )


async def dispatch_livekit_call(
    phone_number: str,
    survey_id: str,
) -> dict:
    """
    Dispatch a LiveKit agent to make an outbound survey call.

    Creates a new room and dispatches the survey-caller agent with metadata
    containing the phone number and survey ID. The agent handles dialing,
    conducting the survey, and submitting results.

    Args:
        phone_number: Phone number in E.164 format (e.g. "+1234567890")
        survey_id: The survey ID to conduct

    Returns:
        dict with room_name (used as call identifier)
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
            "CallId": room_name,
            "provider": "livekit",
            "dispatch_id": dispatch.id,
        }
    except Exception as e:
        logger.error(f"Failed to dispatch LiveKit call: {e}")
        raise
    finally:
        await lk_api.aclose()


async def get_livekit_call_status(room_name: str) -> dict:
    """
    Get the status of a LiveKit call by room name.

    Args:
        room_name: The LiveKit room name (stored as call_id)

    Returns:
        dict with call status information
    """
    lk_api = _get_livekit_api()
    try:
        rooms = await lk_api.room.list_rooms(api.ListRoomsRequest(names=[room_name]))
        if rooms and rooms.rooms:
            room = rooms.rooms[0]
            return {
                "room_name": room.name,
                "num_participants": room.num_participants,
                "active": room.num_participants > 0,
                "creation_time": room.creation_time,
            }
        return {"room_name": room_name, "active": False, "status": "ended"}
    except Exception as e:
        logger.error(f"Error getting call status: {e}")
        return {"room_name": room_name, "error": str(e)}
    finally:
        await lk_api.aclose()


async def get_livekit_transcript(room_name: str) -> list:
    """
    Get transcript from a LiveKit call.

    LiveKit stores transcription data in room egress or via agent logs.
    For now, we return the data from the room's track-based transcription
    if available, or indicate the transcript is stored in the survey answers.

    Args:
        room_name: The LiveKit room name (stored as call_id)

    Returns:
        list of transcript entries
    """
    lk_api = _get_livekit_api()
    try:
        # Try to get room participants for any active rooms
        participants = await lk_api.room.list_participants(
            api.ListParticipantsRequest(room=room_name)
        )

        transcript_entries = []
        for p in participants:
            if hasattr(p, 'metadata') and p.metadata:
                try:
                    meta = json.loads(p.metadata)
                    if 'transcript' in meta:
                        transcript_entries.extend(meta['transcript'])
                except (json.JSONDecodeError, TypeError):
                    pass

        if not transcript_entries:
            return [{
                "role": "system",
                "message": "LiveKit call transcript is available through the survey answers. "
                           "The agent submitted answers directly to the backend during the call.",
            }]

        return transcript_entries

    except Exception as e:
        logger.warning(f"Could not retrieve LiveKit transcript for {room_name}: {e}")
        return [{
            "role": "system",
            "message": f"Call completed. Answers were submitted directly by the agent. Room: {room_name}",
        }]
    finally:
        await lk_api.aclose()
