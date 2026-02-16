# SurveyBot - AI-Powered Survey System

A comprehensive survey management system with AI-powered voice and web survey capabilities.

## 🚀 Features

- **Multi-modal Surveys**: Web forms and AI voice calls
- **Voice Integration**: VAPI and LiveKit support for phone surveys
- **AI-Powered**: OpenAI integration for intelligent conversations
- **Real-time Analytics**: Dashboard for monitoring survey results
- **Microservices Architecture**: Scalable and resilient design
- **Multi-tenant Support**: Organization-based survey management

## 📋 System Components

### Backend Services
- **Gateway API** (Port 8081): Main API gateway
- **Survey Service** (Port 8020): Survey management
- **Template Service** (Port 8040): Survey templates
- **Question Service** (Port 8030): Question management
- **Agent Service** (Port 8050): Voice call coordination
- **Analytics Service** (Port 8060): Data analytics
- **Scheduler Service** (Port 8070): Automated scheduling

### Frontend Applications
- **Dashboard** (Port 8080): Admin interface for survey management
- **Recipient App** (Port 3000): Survey-taking interface

### Voice Integration
- **VAPI**: AI voice calls with natural conversation
- **LiveKit**: High-quality voice communication
- **OpenAI**: AI-powered conversation engine
- **Deepgram**: Speech-to-text processing

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Python web framework
- **PostgreSQL**: Primary database
- **Redis**: Caching and session management
- **Docker**: Containerization

### Frontend
- **React**: Dashboard application
- **Next.js**: Recipient application
- **Material-UI**: UI component library
- **TailwindCSS**: Styling framework

### Voice & AI
- **VAPI**: Voice AI platform
- **LiveKit**: Real-time communication
- **OpenAI**: GPT models
- **Deepgram**: Speech recognition

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- Python 3.10+

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd surveybot
```

2. **Start all services**
```bash
cd itcurves_deploy
docker-compose up -d
```

3. **Access the applications**
- Dashboard: http://localhost:8080
- Recipient App: http://localhost:3000
- Backend API: http://localhost:8081/pg

### Environment Configuration

Copy and configure the environment file:
```bash
cp itcurves_deploy/.env.example itcurves_deploy/.env
```

Required environment variables:
```env
# Database
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=pguser
DB_PASSWORD=root

# AI Services
OPENAI_API_KEY=your_openai_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key

# Voice Services
VAPI_API_KEY=your_vapi_api_key
PHONE_NUMBER_ID=your_phone_number_id

LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
SIP_OUTBOUND_TRUNK_ID=your_sip_trunk_id

# Email
MAILERSEND_API_KEY=your_mailersend_api_key
MAILERSEND_SENDER_EMAIL=your_sender_email
```

## 📱 Usage

### Creating a Voice Survey

1. **Access the Dashboard**: http://localhost:8080
2. **Create Survey**: Select a template or create custom questions
3. **Add Recipient**: Enter phone number for voice survey
4. **Choose Voice Provider**: Select VAPI or LiveKit
5. **Launch Survey**: Start the voice call

### Monitoring Results

- **Real-time Status**: Track survey completion in dashboard
- **Call Transcripts**: View voice conversation logs
- **Analytics**: Analyze survey responses and completion rates
- **Export Data**: Download results for reporting

## 🧪 Testing

Run the test suite to verify functionality:

```bash
# Run all tests
python tests/test_voice_survey_e2e.py

# Test voice clarity
python tests/test_voice_clarity.py

# Test complete workflow
python tests/test_complete_workflow.py
```

## 📁 Project Structure

```
surveybot/
├── itcurves_deploy/              # Main deployment configuration
│   ├── docker-compose.yml       # Service orchestration
│   ├── .env                     # Environment variables
│   ├── pg/                      # Backend API service
│   ├── dashboard/               # React dashboard
│   ├── recipient/               # Next.js recipient app
│   └── services/                # Microservices
├── ncs_pvt-survey-backend/      # Legacy backend (deprecated)
├── ncs_pvt-survey-frontend/     # Legacy frontend (deprecated)
├── docs/                        # Documentation
├── tests/                       # Test scripts
├── screenshots/                 # Application screenshots
└── scripts/                     # Utility scripts
```

## 🔧 Development

### Adding New Survey Templates

1. Access the Template Service at http://localhost:8040
2. Create new template with questions
3. Set status to "Published"
4. Use template in survey creation

### Custom Voice Prompts

Modify the system prompts in the voice integration:
- VAPI: Update `systemPrompt` in call creation
- LiveKit: Modify prompts in `livekit_agent.py`

### Database Schema

The system uses PostgreSQL with the following main tables:
- `surveys`: Survey metadata and status
- `templates`: Survey templates
- `questions`: Survey questions
- `answers`: Survey responses

## 📊 Monitoring

### Service Health
- Backend API: http://localhost:8081/pg/health
- All services expose health endpoints

### Logs
- Docker logs: `docker-compose logs -f [service-name]`
- Application logs available in respective service containers

## 🚨 Troubleshooting

### Voice Call Issues
1. Check API keys in environment variables
2. Verify phone number format (E.164: +1234567890)
3. Check service logs for error details
4. Test with different voice providers

### Service Connection Issues
1. Verify Docker containers are running: `docker ps`
2. Check network connectivity between services
3. Review environment configuration
4. Restart services: `docker-compose restart`

## 📝 API Documentation

### Survey Endpoints

- `GET /api/surveys`: List all surveys
- `POST /api/surveys/generate`: Generate survey from template
- `POST /api/surveys/create`: Create survey questions
- `POST /api/surveys/make-call`: Initiate voice call
- `GET /api/surveys/{id}/questions`: Get survey questions

### Template Endpoints

- `GET /api/templates/list`: List available templates
- `POST /api/templates/create`: Create new template

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For technical support:
- Check the troubleshooting section
- Review service logs
- Contact the development team

---

**System Status**: ✅ Production Ready  
**Last Updated**: 2026-02-16  
**Version**: 1.0.0
