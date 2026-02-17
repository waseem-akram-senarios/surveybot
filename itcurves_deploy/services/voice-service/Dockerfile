FROM python:3.10-slim

RUN apt-get update && apt-get install -y build-essential python3-dev && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install service dependencies
COPY services/voice-service/requirements.txt /app/requirements.txt
RUN uv pip install -r /app/requirements.txt --system --python 3.10

# Copy service code
COPY services/voice-service/ /app/

EXPOSE 8017

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8017"]
