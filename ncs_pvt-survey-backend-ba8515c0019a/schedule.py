import atexit
import logging
import os

import psycopg2

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.background import BackgroundScheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Use consistent database URL
DB_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/db"


def job_listener(event):
    """Log job execution results to database."""
    try:
        conn = psycopg2.connect(
            dbname="db",
            user=os.getenv("DB_USER"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            password=os.getenv("DB_PASSWORD"),
        )
        cur = conn.cursor()

        if event.exception:
            status = "FAILED"
            logger.error(f"Job {event.job_id} failed: {event.exception}")
        else:
            status = "SUCCESS"
            logger.info(f"Job {event.job_id} completed successfully")

        cur.execute(
            "INSERT INTO job_history (job_id, run_time, status) VALUES (%s, NOW(), %s)",
            (event.job_id, status),
        )
        conn.commit()

    except Exception as e:
        logger.error(f"Failed to log job result: {e}")
    finally:
        if "cur" in locals():
            cur.close()
        if "conn" in locals():
            conn.close()


# Configure scheduler
jobstores = {"default": SQLAlchemyJobStore(url=DB_URL)}
scheduler = BackgroundScheduler(jobstores=jobstores)
scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)


def start_scheduler():
    """Start the scheduler if not already running."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")
        # Ensure scheduler shuts down gracefully
        atexit.register(lambda: scheduler.shutdown())
    else:
        logger.info("Scheduler is already running")
