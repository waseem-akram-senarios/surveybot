"""
Survey Bot Call API

FastAPI server that exposes an HTTP endpoint to trigger outbound survey calls.
The agent worker (agent.py) must be running before calls can be dispatched.

Usage:
    uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
    POST /call   — dispatch the survey agent and place an outbound call
    GET  /health — liveness check
"""

import json
import os
import random

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from livekit import api as lkapi_module
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Survey Bot Call API")


class CallRequest(BaseModel):
    phone_number: str  # E.164 format, e.g. "+15555550123"


@app.post("/call")
async def trigger_call(req: CallRequest):
    """Dispatch the survey agent and place an outbound call to the given phone number."""
    trunk_id = os.getenv("SIP_OUTBOUND_TRUNK_ID", "")
    if not trunk_id.startswith("ST_"):
        raise HTTPException(status_code=500, detail="SIP_OUTBOUND_TRUNK_ID is not configured")

    room_name = f"outbound-{''.join(str(random.randint(0, 9)) for _ in range(10))}"
    lkapi = lkapi_module.LiveKitAPI()
    try:
        await lkapi.agent_dispatch.create_dispatch(
            lkapi_module.CreateAgentDispatchRequest(
                agent_name="survey-agent",
                room=room_name,
                metadata=json.dumps({"phone_number": req.phone_number}),
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await lkapi.aclose()

    return {
        "status": "dispatched",
        "room_name": room_name,
        "phone_number": req.phone_number,
    }


@app.get("/health")
def health():
    """Liveness check."""
    return {"status": "ok"}
