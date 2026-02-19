"""
Shared Pydantic models used across multiple microservices.
"""

from datetime import datetime
from typing import List, Literal, Optional, Union
from uuid import uuid4

from pydantic import BaseModel, Field


# ─── Health ───────────────────────────────────────────────────────────────────

class HealthCheck(BaseModel):
    status: str = "OK"


# ─── Questions ────────────────────────────────────────────────────────────────

class QuestionP(BaseModel):
    QueId: str = Field(default_factory=lambda: str(uuid4()))
    QueText: str
    QueScale: Optional[int] = None
    QueCriteria: Literal["scale", "categorical", "open"]
    QueCategories: Optional[List[str]] = None
    ParentId: Optional[str] = None
    ParentCategoryTexts: Optional[List[str]] = None
    Autofill: Literal["Yes", "No"] = "No"


class QuestionResponseP(QuestionP):
    pass


# ─── Templates ────────────────────────────────────────────────────────────────

class TemplateBaseP(BaseModel):
    TemplateName: str = Field(..., min_length=1, description="Unique name for the template")


class TemplateCreateP(TemplateBaseP):
    pass


class TemplateP(TemplateBaseP):
    Status: Literal["Draft", "Published"] = "Draft"
    Date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))


class TemplateNameRequestP(BaseModel):
    TemplateName: str


class TemplateStatusUpdateP(TemplateNameRequestP):
    Status: Literal["Draft", "Published"]


class SourceTemplateRequestP(BaseModel):
    SourceTemplateName: str


class CloneTemplateRequestP(SourceTemplateRequestP):
    NewTemplateName: str = Field(..., min_length=1)


class TranslateTemplateRequestP(SourceTemplateRequestP):
    NewTemplateName: str = Field(..., min_length=1)
    NewTemplateLanguage: Literal["Spanish", "German", "French", "Russian", "Chinese"]


class TemplateQuestionOrderRequestP(BaseModel):
    TemplateName: str
    Order: int


class GetTemplateQuestionsRequestP(BaseModel):
    TemplateName: str


class TemplateStatsP(BaseModel):
    Total_Templates: int
    Total_Draft_Templates: int
    Total_Published_Templates: int
    Total_Templates_ThisMonth: int
    Total_Draft_Templates_ThisMonth: int
    Total_Published_Templates_ThisMonth: int


class TemplateQuestionCreateP(TemplateNameRequestP):
    QueId: str
    Order: int


class TemplateQuestionDeleteRequestP(BaseModel):
    TemplateName: str
    QueId: str


# ─── Surveys ──────────────────────────────────────────────────────────────────

class SurveyBaseP(BaseModel):
    SurveyId: str = Field(default_factory=lambda: str(uuid4()))
    Biodata: str = ""
    Recipient: str
    Name: str
    RiderName: str = ""
    RideId: str = ""
    TenantId: str = ""


class SurveyCreateP(SurveyBaseP):
    URL: str


class SurveyP(SurveyBaseP):
    URL: str
    Status: Literal["In-Progress", "Completed"] = "In-Progress"
    LaunchDate: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    CompletionDate: str = ""


class SurveyStatusUpdateP(BaseModel):
    Status: Literal["In-Progress", "Completed"]


class SurveyCSATUpdateP(BaseModel):
    CSAT: Optional[int] = None


class SurveyDurationUpdateP(BaseModel):
    CompletionDuration: Optional[int] = None


class SurveyQuestion(BaseModel):
    SurveyId: str
    Order: int
    QueId: str


class SurveyQuestionAnswerP(QuestionP):
    Order: int
    Ans: Optional[str] = None
    RawAns: Optional[str] = None
    Autofill: Literal["Yes", "No"] = "No"


class SurveyStats(BaseModel):
    Total_Surveys: int
    Total_Active_Surveys: int
    Total_Completed_Surveys: int
    Total_Completed_Surveys_Today: int
    Median_Completion_Duration: int
    Median_Completion_Duration_Today: int
    AverageCSAT: float


class SurveyQuestionUpdateP(QuestionP):
    Order: int
    Ans: str


class SurveyQnAP(BaseModel):
    SurveyId: str
    QuestionswithAns: List[SurveyQuestionAnswerP]


class SurveyQuestionAnswerPhone(BaseModel):
    QueId: str
    RawAns: Optional[str] = None


class SurveyQnAPhone(BaseModel):
    SurveyId: str
    class Config:
        extra = "allow"


class SurveyQuestionOrderP(QuestionP):
    Order: int


class SurveyQuestionsP(BaseModel):
    SurveyId: str
    QuestionswithAns: List[SurveyQuestionOrderP]
    AiAugmented: bool = True


class SurveyStatusP(BaseModel):
    SurveyId: str
    Status: Literal["In-Progress", "Completed"]
    LaunchDate: str
    CompletionDate: str
    CSAT: Optional[int] = None


class SurveyFromTemplateP(BaseModel):
    Total: int
    Completed: int
    InProgress: int


# ─── Agent ────────────────────────────────────────────────────────────────────

class MakeCallRequest(BaseModel):
    survey_id: str
    phone: str
    provider: Literal["vapi", "livekit"] = "vapi"


class CallbackRequest(BaseModel):
    survey_id: str
    phone: str
    delay_minutes: int = 30
    provider: Literal["vapi", "livekit"] = "vapi"


class EmailFallbackRequest(BaseModel):
    survey_id: str
    email: str
    survey_url: str


# ─── Analytics ────────────────────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    total_surveys: int = 0
    completed_surveys: int = 0
    completion_rate: float = 0.0
    avg_duration_seconds: float = 0.0
    nps_score: Optional[float] = None
    avg_satisfaction: Optional[float] = None
    channel_counts: dict = {}


# ─── Campaigns ────────────────────────────────────────────────────────────────

class CampaignCreateP(BaseModel):
    name: str
    template_name: str
    frequency: Literal["once", "daily", "weekly", "monthly"] = "once"


class CampaignP(CampaignCreateP):
    id: str = Field(default_factory=lambda: str(uuid4()))
    status: Literal["active", "paused", "completed"] = "active"
    next_run_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# ─── Riders ───────────────────────────────────────────────────────────────────

class RiderCreateP(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    biodata: Optional[dict] = None
    last_ride_date: Optional[str] = None
    ride_count: int = 0


class RiderP(RiderCreateP):
    id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# ─── Misc ─────────────────────────────────────────────────────────────────────

class RelevanceP(BaseModel):
    yes_or_no: Literal["Yes", "No"]


class SympathizeP(BaseModel):
    Question: str
    Response: str


class Email(BaseModel):
    SurveyURL: str
    EmailTo: str


class QuestionIdRequestP(BaseModel):
    QueId: str
