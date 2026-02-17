# SurveyBot - AI-Powered Survey Platform

An AI-powered survey platform that conducts intelligent phone and web surveys using natural conversation. Built with a microservices architecture for scalability and independent deployability.

## Architecture

```
                    ┌──────────────┐
         Clients ──>│   Gateway    │:8081
                    │   (nginx)    │
                    └──────┬───────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     │           │         │         │            │
┌────▼───┐ ┌────▼───┐ ┌───▼────┐ ┌──▼──────┐ ┌──▼──────┐
│ Brain  │ │ Voice  │ │ Survey │ │Question │ │Template │
│ :8016  │ │ :8017  │ │ :8020  │ │ :8030   │ │ :8040   │
└────────┘ └────────┘ └────────┘ └─────────┘ └─────────┘
     │                     │
┌────▼──────┐        ┌────▼──────┐
│ Analytics │        │ Scheduler │
│  :8060    │        │  :8070    │
└───────────┘        └───────────┘
```

### Services

| Service | Port | Purpose |
|---------|------|---------|
| **Brain** | 8016 | Centralized AI/LLM intelligence -- prompts, parsing, translation, analysis |
| **Voice** | 8017 | VAPI call lifecycle -- workflow creation, call initiation, webhooks, transcripts |
| **Survey** | 8020 | Survey CRUD, answer submission, email delivery |
| **Question** | 8030 | Question management, stats, empathy responses |
| **Template** | 8040 | Survey template management, translation |
| **Analytics** | 8060 | Metrics, CSV export/import, AI analysis |
| **Scheduler** | 8070 | Delayed calls, campaign scheduling |
| **Gateway** | 8081 | Nginx reverse proxy, routes all traffic |

### Frontends

| App | Port | Purpose |
|-----|------|---------|
| **Dashboard** | 8080 | Admin interface (React/Vite) |
| **Recipient** | 3000 | Survey-taking interface with voice + text modes (Next.js) |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/waseem-akram-senarios/surveybot.git
cd surveybot/itcurves_deploy

# 2. Configure
cp .env.example .env
# Edit .env with your API keys

# 3. Launch
docker compose -f docker-compose.microservices.yml up -d --build

# 4. Access
# Dashboard:    http://localhost:8080
# Recipient:    http://localhost:3000
# API Gateway:  http://localhost:8081
```

## Environment Variables

```env
# Database
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=pguser
DB_PASSWORD=root

# AI (required)
OPENAI_API_KEY=sk-...

# Voice calls (required for phone surveys)
VAPI_API_KEY=...
PHONE_NUMBER_ID=...

# Email delivery
MAILERSEND_API_KEY=mlsn...
MAILERSEND_SENDER_EMAIL=noreply@yourdomain.com

# Speech-to-text (fallback)
DEEPGRAM_API_TOKEN=...

# Public URL for VAPI callbacks
PUBLIC_URL=https://your-public-url.com
```

## Project Structure

```
surveybot/
├── itcurves_deploy/                    # Main deployment
│   ├── docker-compose.microservices.yml
│   ├── .env.example
│   ├── gateway/                        # Nginx config
│   │   └── nginx.conf
│   ├── services/
│   │   ├── brain-service/              # AI/LLM intelligence
│   │   │   ├── prompts.py              #   All prompts live here
│   │   │   ├── llm.py                  #   OpenAI client wrapper
│   │   │   ├── workflow_builder.py     #   VAPI workflow JSON generator
│   │   │   └── routes/brain.py         #   API endpoints
│   │   ├── voice-service/              # Voice/call management
│   │   │   ├── vapi_client.py          #   VAPI HTTP client
│   │   │   ├── db.py                   #   Transcript storage
│   │   │   └── routes/voice.py         #   API endpoints
│   │   ├── survey-service/             # Survey CRUD + answers
│   │   ├── question-service/           # Question management
│   │   ├── template-service/           # Template management
│   │   ├── analytics-service/          # Metrics + export
│   │   ├── scheduler-service/          # Job scheduling
│   │   └── agent-service/              # Legacy (kept for compat)
│   ├── shared/                         # Shared models/utils
│   ├── dashboard/                      # React admin app
│   ├── recipient/                      # Next.js survey app
│   ├── pg/                             # Legacy monolith (deprecated)
│   ├── schema/                         # DB migration scripts
│   └── migrations/                     # DB migrations
├── docs/                               # Documentation
├── CHANGELOG.md
└── README.md
```

## Key Design Decisions

**Brain/Voice separation**: The brain-service owns all AI logic (prompts, models, parsing). The voice-service owns all VAPI call operations. You can iterate on AI intelligence by editing only `brain-service/` -- zero changes to any other service.

**No direct OpenAI imports outside brain-service**: Survey, question, template, and analytics services call brain-service via HTTP instead of importing OpenAI. Single point to swap models, add caching, or monitor costs.

**Backward compatibility**: The `/api/agent/*` routes still work through the voice-service's compatibility layer, so existing integrations don't break.

## API Reference

All endpoints are accessed through the gateway at `http://localhost:8081/pg/api/`.

### Brain Service (`/api/brain/`)
- `POST /brain/sympathize` -- Empathetic response generation
- `POST /brain/parse` -- Parse natural language into structured answer
- `POST /brain/summarize` -- Summarize long responses
- `POST /brain/translate` -- Translate text
- `POST /brain/analyze` -- Post-survey AI analysis
- `POST /brain/build-workflow-config` -- Generate VAPI workflow JSON

### Voice Service (`/api/voice/`)
- `POST /voice/make-call` -- Initiate VAPI phone call
- `POST /voice/make-workflow` -- Preview workflow config
- `GET /voice/transcript/{survey_id}` -- Get call transcript
- `POST /voice/tool-callback` -- VAPI tool callbacks
- `POST /voice/webhook` -- VAPI end-of-call webhook

### Survey Service (`/api/surveys/`)
- `GET /surveys/list` -- List surveys
- `POST /surveys/generate` -- Generate from template
- `POST /surveys/makecall` -- Trigger call via voice-service
- `POST /answers/qna` -- Submit web answers

### Other
- `GET /templates/list` -- List templates
- `GET /analytics/summary` -- Dashboard metrics
- `POST /scheduler/schedule-call` -- Schedule delayed call

## License

Proprietary software. All rights reserved.
