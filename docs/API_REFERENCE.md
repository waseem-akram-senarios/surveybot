# API Reference

This document provides comprehensive API documentation for the SurveyBot system.

## 🔗 Base URLs

- **Production**: `https://api.yourdomain.com`
- **Development**: `http://localhost:8081`
- **API Root**: `/pg`

## 📋 Authentication

Most endpoints require authentication. Include your API key in the header:

```http
Authorization: Bearer your-api-key
Content-Type: application/json
```

## 🚀 Survey Endpoints

### Get All Surveys

```http
GET /pg/api/surveys
```

**Response:**
```json
[
  {
    "SurveyId": "survey-123",
    "Name": "Customer Satisfaction Survey",
    "Recipient": "John Doe",
    "RiderName": "John",
    "RideId": "ride-456",
    "TenantId": "tenant-789",
    "Status": "Completed",
    "LaunchDate": "2026-02-16 10:00:00",
    "CompletionDate": "2026-02-16 10:05:00",
    "CallId": "call-abc123",
    "URL": "http://localhost:3000/survey/survey-123"
  }
]
```

### Generate Survey from Template

```http
POST /pg/api/surveys/generate
```

**Request Body:**
```json
{
  "TemplateName": "Rider Satisfaction - Trip Complete",
  "Name": "Custom Survey Name",
  "Recipient": "Jane Smith",
  "RiderName": "Jane",
  "RideId": "ride-789",
  "TenantId": "tenant-456",
  "Biodata": "Regular customer",
  "URL": "http://localhost:3000/survey/new-survey"
}
```

**Response:**
```json
{
  "SurveyId": "generated-survey-id",
  "Name": "Custom Survey Name",
  "TemplateName": "Rider Satisfaction - Trip Complete",
  "Recipient": "Jane Smith",
  "RiderName": "Jane",
  "RideId": "ride-789",
  "TenantId": "tenant-456",
  "Biodata": "Regular customer",
  "URL": "http://localhost:3000/survey/generated-survey-id",
  "Questions": [
    {
      "QueId": "q1",
      "QueText": "How satisfied are you with our service?",
      "QueCriteria": "scale",
      "QueScale": 5
    }
  ]
}
```

### Create Survey Questions

```http
POST /pg/api/surveys/create
```

**Request Body:** (Same as generated survey response from above)

**Response:**
```json
{
  "message": "Survey questions created successfully",
  "SurveyId": "generated-survey-id"
}
```

### Get Survey Questions

```http
GET /pg/api/surveys/{survey_id}/questions
```

**Response:**
```json
[
  {
    "QueId": "q1",
    "QueText": "How satisfied are you with our service?",
    "QueCriteria": "scale",
    "QueScale": 5,
    "QueCategories": null,
    "ParentId": null,
    "ParentCategoryTexts": null,
    "Autofill": "No"
  },
  {
    "QueId": "q2",
    "QueText": "Was our service easy to use?",
    "QueCriteria": "categorical",
    "QueScale": null,
    "QueCategories": ["Yes", "No"],
    "ParentId": null,
    "ParentCategoryTexts": null,
    "Autofill": "No"
  }
]
```

### Make Voice Call

```http
POST /pg/api/surveys/make-call?to={phone_number}&survey_id={survey_id}&provider={provider}
```

**Query Parameters:**
- `to`: Phone number in E.164 format (e.g., +1234567890)
- `survey_id`: Survey ID
- `provider`: Voice provider (`vapi` or `livekit`)

**Response (VAPI):**
```json
{
  "CallId": "vapi-call-123",
  "provider": "vapi",
  "status": "queued",
  "phone_number": "+1234567890"
}
```

**Response (LiveKit):**
```json
{
  "CallId": "survey-room-456",
  "provider": "livekit",
  "dispatch_id": "AD_dispatch_789",
  "room_name": "survey-surveyid-room123"
}
```

### Submit Survey Answers

```http
POST /pg/api/surveys/submit
```

**Request Body:**
```json
{
  "SurveyId": "survey-123",
  "QuestionswithAns": [
    {
      "QueId": "q1",
      "QueText": "How satisfied are you with our service?",
      "QueCriteria": "scale",
      "QueScale": 5,
      "Ans": "4"
    },
    {
      "QueId": "q2",
      "QueText": "Was our service easy to use?",
      "QueCriteria": "categorical",
      "QueCategories": ["Yes", "No"],
      "Ans": "Yes"
    }
  ]
}
```

**Response:**
```json
{
  "SurveyId": "survey-123",
  "QuestionswithAns": [
    {
      "QueId": "q1",
      "QueText": "How satisfied are you with our service?",
      "QueCriteria": "scale",
      "QueScale": 5,
      "Ans": "4"
    }
  ]
}
```

### Submit Phone Answers (VAPI Callback)

```http
POST /pg/api/surveys/submitphone
```

**Request Body:**
```json
{
  "SurveyId": "survey-123",
  "CallId": "vapi-call-123",
  "QuestionswithAns": [
    {
      "QueId": "q1",
      "QueText": "How satisfied are you with our service?",
      "QueCriteria": "scale",
      "QueScale": 5,
      "Ans": "5"
    }
  ],
  "Transcript": "Full conversation transcript here..."
}
```

## 📋 Template Endpoints

### List Templates

```http
GET /pg/api/templates/list
```

**Response:**
```json
[
  {
    "TemplateName": "Rider Satisfaction - Trip Complete",
    "Status": "Published",
    "Date": "2026-02-16 13:53:35"
  },
  {
    "TemplateName": "No-Show Cancellation Follow-Up",
    "Status": "Published",
    "Date": "2026-02-16 13:53:35"
  }
]
```

### Create Template

```http
POST /pg/api/templates/create
```

**Request Body:**
```json
{
  "TemplateName": "New Template",
  "Status": "Draft"
}
```

**Response:**
```json
{
  "TemplateName": "New Template",
  "Status": "Draft",
  "Date": "2026-02-16 15:30:00"
}
```

### Get Template Questions

```http
POST /pg/api/templates/getquestions
```

**Request Body:**
```json
{
  "TemplateName": "Rider Satisfaction - Trip Complete"
}
```

**Response:**
```json
{
  "TemplateName": "Rider Satisfaction - Trip Complete",
  "Questions": [
    {
      "QueId": "q1",
      "QueText": "How satisfied are you with the ride?",
      "QueCriteria": "scale",
      "QueScale": 5
    }
  ]
}
```

## 📞 Voice Integration

### VAPI Webhook

VAPI sends callbacks to your webhook URL:

```http
POST /pg/api/surveys/callback
```

**Webhook Payload:**
```json
{
  "call": {
    "id": "vapi-call-123",
    "status": "ended",
    "analysis": {
      "status": "completed",
      "summary": "Customer was satisfied with the service"
    }
  },
  "messages": [
    {
      "role": "assistant",
      "content": "How satisfied are you with our service?"
    },
    {
      "role": "user",
      "content": "I'm very satisfied, 5 out of 5"
    }
  ]
}
```

### LiveKit Agent Dispatch

LiveKit agents are dispatched via the internal API:

```python
from livekit_caller import dispatch_livekit_call

result = await dispatch_livekit_call("+1234567890", "survey-123")
```

## 🔍 Health & Monitoring

### Health Check

```http
GET /pg/health
```

**Response:**
```json
{
  "status": "OK",
  "service": "survey-service",
  "timestamp": "2026-02-16T15:30:00Z"
}
```

### Service Status

```http
GET /pg/api/status
```

**Response:**
```json
{
  "database": "connected",
  "redis": "connected",
  "vapi": "authenticated",
  "livekit": "connected",
  "services": {
    "survey-service": "running",
    "template-service": "running",
    "question-service": "running",
    "agent-service": "running"
  }
}
```

## 📊 Analytics

### Survey Statistics

```http
GET /pg/api/surveys/stats
```

**Response:**
```json
{
  "total_surveys": 150,
  "completed_surveys": 120,
  "pending_surveys": 25,
  "failed_surveys": 5,
  "completion_rate": 80.0,
  "average_duration": "3.5 minutes",
  "voice_calls": 80,
  "web_surveys": 70
}
```

### Template Usage

```http
GET /pg/api/templates/stats
```

**Response:**
```json
{
  "template_stats": [
    {
      "TemplateName": "Rider Satisfaction - Trip Complete",
      "usage_count": 45,
      "completion_rate": 85.5
    }
  ]
}
```

## 🚨 Error Responses

All endpoints return consistent error responses:

```json
{
  "detail": "Error description",
  "error_code": "SURVEY_NOT_FOUND",
  "timestamp": "2026-02-16T15:30:00Z"
}
```

### Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `SURVEY_NOT_FOUND` | 404 | Survey ID not found |
| `TEMPLATE_NOT_FOUND` | 404 | Template not found |
| `INVALID_PHONE_NUMBER` | 400 | Phone number format invalid |
| `VAPI_ERROR` | 500 | VAPI service error |
| `LIVEKIT_ERROR` | 500 | LiveKit service error |
| `DATABASE_ERROR` | 500 | Database connection error |
| `UNAUTHORIZED` | 401 | Invalid authentication |

## 🔄 Rate Limiting

API endpoints are rate-limited:

| Endpoint | Limit | Time Window |
|----------|-------|-------------|
| Survey creation | 100/minute | 1 minute |
| Voice calls | 50/minute | 1 minute |
| Template operations | 200/minute | 1 minute |
| Data retrieval | 1000/minute | 1 minute |

## 📝 SDK Examples

### Python

```python
import requests

# Configuration
BASE_URL = "http://localhost:8081/pg"
API_KEY = "your-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Create survey
survey_data = {
    "TemplateName": "Rider Satisfaction - Trip Complete",
    "Recipient": "John Doe",
    "RiderName": "John",
    "RideId": "ride-123",
    "TenantId": "tenant-456"
}

response = requests.post(
    f"{BASE_URL}/api/surveys/generate",
    json=survey_data,
    headers=headers
)

survey = response.json()
print(f"Created survey: {survey['SurveyId']}")

# Make voice call
call_response = requests.post(
    f"{BASE_URL}/api/surveys/make-call",
    params={
        "to": "+1234567890",
        "survey_id": survey['SurveyId'],
        "provider": "vapi"
    },
    headers=headers
)

call_result = call_response.json()
print(f"Call initiated: {call_result['CallId']}")
```

### JavaScript

```javascript
const BASE_URL = 'http://localhost:8081/pg';
const API_KEY = 'your-api-key';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

// Create survey
const surveyData = {
  TemplateName: 'Rider Satisfaction - Trip Complete',
  Recipient: 'John Doe',
  RiderName: 'John',
  RideId: 'ride-123',
  TenantId: 'tenant-456'
};

fetch(`${BASE_URL}/api/surveys/generate`, {
  method: 'POST',
  headers,
  body: JSON.stringify(surveyData)
})
.then(response => response.json())
.then(survey => {
  console.log('Created survey:', survey.SurveyId);
  
  // Make voice call
  return fetch(`${BASE_URL}/api/surveys/make-call?to=+1234567890&survey_id=${survey.SurveyId}&provider=vapi`, {
    method: 'POST',
    headers
  });
})
.then(response => response.json())
.then(callResult => {
  console.log('Call initiated:', callResult.CallId);
});
```

---

**Last Updated**: 2026-02-16  
**Version**: 1.0.0  
**Base URL**: http://localhost:8081/pg
