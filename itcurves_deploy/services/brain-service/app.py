"""
Brain Service -- Port 8016

The centralized AI/LLM intelligence hub. ALL AI operations go through here.
Other services call brain-service instead of importing OpenAI directly.

This means you can:
- Iterate on prompts without restarting other services
- Swap LLM providers in one place
- Add caching, rate limiting, or A/B testing centrally
- Monitor all AI costs from a single service
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.brain import router as brain_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Brain Service starting up...")
    yield
    logger.info("Brain Service shutting down...")


app = FastAPI(
    title="Brain Service",
    description="Centralized AI/LLM intelligence -- prompts, parsing, analysis, workflow generation",
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

app.include_router(brain_router)


@app.get("/")
async def root():
    return {"service": "brain-service", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "OK", "service": "brain-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8016)
