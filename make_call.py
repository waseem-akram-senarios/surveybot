"""
Outbound Call Trigger Script

Run this script to dispatch the survey agent and place an outbound call
to a rider's phone number via the LiveKit SIP trunk.

Usage:
    python make_call.py                        # calls the default number in __main__
    python make_call.py +15555550123           # calls the given number (optional arg)

The agent worker (agent.py) must already be running before calling this script.

Prerequisites:
    - LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET set in .env
    - SIP_OUTBOUND_TRUNK_ID set in .env (get it with: lk sip outbound list)
"""

import asyncio
import json
import os
import random
import sys
import logging

from dotenv import load_dotenv
from livekit import api

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("make-call")



async def make_call(phone_number: str) -> None:
    """
    Dispatch the survey agent into a new room and dial the given phone number.

    Args:
        phone_number: E.164 format phone number to dial, e.g. "+15555550123"
    """
    outbound_trunk_id = os.getenv("SIP_OUTBOUND_TRUNK_ID", "")
    if not outbound_trunk_id or not outbound_trunk_id.startswith("ST_"):
        logger.error(
            "SIP_OUTBOUND_TRUNK_ID is not set or invalid. "
            "Set it in .env (get the value with: lk sip outbound list)"
        )
        return

    room_name = f"outbound-{''.join(str(random.randint(0, 9)) for _ in range(10))}"

    lkapi = api.LiveKitAPI()
    try:
        logger.info(f"Dispatching agent to room '{room_name}'")
        await lkapi.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name="survey-agent",
                room=room_name,
                metadata=json.dumps({"phone_number": phone_number}),
            )
        )
        logger.info(f"Dispatch created — outbound call to {phone_number} will be placed by the agent.")
        logger.info(f"Room: {room_name}")
    except Exception as e:
        logger.error(f"Failed to create dispatch: {e}")
    finally:
        await lkapi.aclose()


if __name__ == "__main__":
    number = sys.argv[1] if len(sys.argv) > 1 else "+15555550123"
    asyncio.run(make_call(number))
