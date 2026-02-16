import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import HealthCheck
from routes import questions, surveys, template_questions, templates
from schedule import scheduler, start_scheduler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - start/stop scheduler."""
    logger.info("Starting up FastAPI application...")

    # Startup: Start the scheduler
    try:
        start_scheduler()
        logger.info("Scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
        raise

    yield

    # Shutdown: Stop the scheduler
    logger.info("Shutting down FastAPI application...")
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("Scheduler stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")


app = FastAPI(
    title="Survey API",
    root_path="/pg",
    lifespan=lifespan,
    description="API for managing survey questions and templates",
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Include routers
app.include_router(questions.router, prefix="/api", tags=["questions"])
app.include_router(templates.router, prefix="/api", tags=["templates"])
app.include_router(
    template_questions.router, prefix="/api", tags=["template_questions"]
)
app.include_router(surveys.router, prefix="/api", tags=["surveys"])


@app.get("/")
async def root():
    return {"message": "Welcome to the Survey API"}


@app.get("/health", response_model=HealthCheck, status_code=200)
async def health():
    return HealthCheck(status="OK")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8081)
