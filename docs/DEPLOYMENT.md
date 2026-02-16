# Deployment Guide

This guide covers deployment options for the SurveyBot system.

## 🚀 Production Deployment

### Prerequisites
- Docker & Docker Compose
- PostgreSQL (or use provided Docker container)
- Redis (or use provided Docker container)
- Valid API keys for all services

### Quick Deploy

1. **Clone and Setup**
```bash
git clone <repository-url>
cd surveybot
chmod +x scripts/setup.sh
./scripts/setup.sh
```

2. **Configure Environment**
```bash
cp itcurves_deploy/.env.example itcurves_deploy/.env
# Edit .env with your API keys and configuration
```

3. **Start Services**
```bash
cd itcurves_deploy
docker-compose up -d
```

### Environment Variables

Required for production:

```env
# Database
DB_HOST=your_database_host
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# AI Services
OPENAI_API_KEY=sk-proj-xxxxxxxx
DEEPGRAM_API_KEY=xxxxxxxx

# Voice Services
VAPI_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx
PHONE_NUMBER_ID=xxxxxxxx-xxxx-xxxx-xxxx

LIVEKIT_URL=wss://your-server.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxx
SIP_OUTBOUND_TRUNK_ID=ST_xxxxxxxxx

# Email
MAILERSEND_API_KEY=mlsn.xxxxxxxxx
MAILERSEND_SENDER_EMAIL=noreply@yourdomain.com

# Public URLs
PUBLIC_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

## 🔧 Development Setup

### Local Development

1. **Install Dependencies**
```bash
# Python
pip install -r requirements.txt

# Node.js (Dashboard)
cd itcurves_deploy/dashboard
npm install

# Node.js (Recipient)
cd itcurves_deploy/recipient
npm install
```

2. **Start Services**
```bash
# Start database and Redis
docker-compose up -d pg redis

# Start backend services
cd itcurves_deploy/pg
python app.py

# Start microservices
cd services/survey-service && python app.py &
cd services/template-service && python app.py &
cd services/question-service && python app.py &
cd services/agent-service && python app.py &

# Start frontends
cd dashboard && npm run dev &
cd recipient && npm run dev &
```

## 🌐 Cloud Deployment

### AWS Deployment

1. **ECS Cluster Setup**
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name surveybot

# Build and push images
docker build -t surveybot/api .
docker tag surveybot-api:latest your-account.dkr.ecr.region.amazonaws.com/surveybot-api:latest
docker push your-account.dkr.ecr.region.amazonaws.com/surveybot-api:latest
```

2. **Task Definition**
```json
{
  "family": "surveybot",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "surveybot-api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/surveybot-api:latest",
      "portMappings": [
        {
          "containerPort": 8081,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DB_HOST",
          "value": "your-rds-endpoint"
        }
      ]
    }
  ]
}
```

### Google Cloud Platform

1. **Cloud Run Deployment**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/surveybot-api

# Deploy service
gcloud run deploy surveybot-api \
  --image gcr.io/PROJECT-ID/surveybot-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 📊 Monitoring & Logging

### Health Checks

All services expose health endpoints:
- `/health` - Basic health check
- `/metrics` - Prometheus metrics (if enabled)

### Logging

Configure structured logging:
```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage,
            'service': 'surveybot'
        })
```

### Monitoring Stack

Add to docker-compose.yml:
```yaml
monitoring:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🔒 Security

### SSL/TLS Configuration

For production, use HTTPS:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### API Security

1. **Rate Limiting**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/surveys")
@limiter.limit("100/minute")
async def get_surveys():
    pass
```

2. **Authentication**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_token(token: str = Depends(security)):
    if token.credentials != "expected-token":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return token.credentials
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy SurveyBot

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          python tests/test_voice_survey_e2e.py
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          docker-compose up -d
```

## 🚨 Troubleshooting

### Common Issues

1. **Services Not Starting**
```bash
# Check logs
docker-compose logs [service-name]

# Check resource usage
docker stats

# Restart services
docker-compose restart
```

2. **Database Connection Issues**
```bash
# Check PostgreSQL
docker exec -it pg psql -U pguser -d surveybot

# Test connection
python -c "import psycopg2; conn = psycopg2.connect('postgresql://pguser:root@localhost:5432/surveybot')"
```

3. **Voice Call Failures**
- Verify API keys are correct
- Check phone number format (+1234567890)
- Review service logs for error details
- Test with different voice providers

### Performance Optimization

1. **Database Indexing**
```sql
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_created ON surveys(created_at);
CREATE INDEX idx_answers_survey_id ON answers(survey_id);
```

2. **Caching**
```python
import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)

@cached(ttl=300)
async def get_surveys():
    return await database.fetch_surveys()
```

## 📋 Backup Strategy

### Database Backup

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec pg pg_dump -U pguser surveybot > backup_$DATE.sql

# Upload to cloud storage
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
```

### Configuration Backup

```bash
# Backup environment and configs
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  itcurves_deploy/.env \
  itcurves_deploy/docker-compose.yml \
  scripts/
```

## 📞 Support

For deployment issues:
1. Check this guide
2. Review service logs
3. Verify environment configuration
4. Contact the development team

---

**Last Updated**: 2026-02-16  
**Version**: 1.0.0
