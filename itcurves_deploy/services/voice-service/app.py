"""
Voice Service -- Port 8017

Handles all voice/call operations:
- VAPI workflow creation and call initiation
- VAPI tool callbacks and webhooks
- Transcript storage and retrieval
- Email fallback

Gets its intelligence from brain-service. No AI/LLM logic here.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.voice import router as voice_router, agent_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Voice Service starting up...")
    yield
    logger.info("Voice Service shutting down...")


app = FastAPI(
    title="Voice Service",
    description="Voice/call management -- VAPI workflows, calls, transcripts",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)
app.include_router(agent_router)


@app.get("/")
async def root():
    return {"service": "voice-service", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "OK", "service": "voice-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8017)
