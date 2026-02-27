"""
Survey Service -- Port 8020
Manages surveys, answers, campaigns, and riders.
"""

import sys

sys.path.insert(0, "/app")


import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.surveys import router as surveys_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Survey Service starting up...")
    yield
    logger.info("Survey Service shutting down...")


app = FastAPI(
    title="Survey Service",
    description="Manages surveys, answers, campaigns, and riders",
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

app.include_router(surveys_router, prefix="/api")


@app.get("/")
async def root():
    return {"service": "survey-service", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "OK", "service": "survey-service"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8020)
