import re
from datetime import datetime
from typing import List, Literal, Optional, Union
from uuid import uuid4

from pydantic import BaseModel, Extra, Field, field_validator


class HealthCheck(BaseModel):
    """Response model to validate and return when performing a health check."""

    status: str = "OK"


class QuestionP(BaseModel):
    QueId: str = Field(default_factory=lambda: str(uuid4()))
    QueText: str
    QueScale: Union[int, None] = None
    QueCriteria: Literal["scale", "categorical", "open"]
    QueCategories: Union[List[str], None] = None
    ParentId: Union[str, None] = None
    ParentCategoryTexts: Union[List[str], None] = None
    Autofill: Literal["Yes", "No"] = "No"


class QuestionResponseP(QuestionP):
    pass


class TemplateBaseP(BaseModel):
    TemplateName: str = Field(
        ..., min_length=1, description="Unique name for the template"
    )


class TemplateCreateP(TemplateBaseP):
    pass


class TemplateP(TemplateBaseP):
    """Template model with status and creation date"""

    Status: Literal["Draft", "Published"] = "Draft"
    Date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))


class TemplateNameRequestP(BaseModel):
    """Base model for requests that need a template name"""

    TemplateName: str


class TemplateStatusUpdateP(TemplateNameRequestP):
    """Update template status request"""

    Status: Literal["Draft", "Published"]


class SourceTemplateRequestP(BaseModel):
    """Base model for requests that need a source template name"""

    SourceTemplateName: str


class CloneTemplateRequestP(SourceTemplateRequestP):
    """Request model for cloning a template"""

    NewTemplateName: str = Field(
        ..., min_length=1, description="Name for the new template"
    )


class SpanishTemplateRequestP(SourceTemplateRequestP):
    """Request model for creating a Spanish version of a template"""

    NewTemplateName: str = Field(
        ..., min_length=1, description="Name for the Spanish template"
    )


class TranslateTemplateRequestP(SourceTemplateRequestP):
    """Request model for creating a translated version of a template"""

    NewTemplateName: str = Field(
        ..., min_length=1, description="Name for the translated template"
    )
    NewTemplateLanguage: Literal[
        "Spanish", "German", "French", "Russian", "Chinese"
    ] = Field(..., description="Language for the translated template")


class TemplateQuestionOrderRequestP(BaseModel):
    """Request model for template question operations that need template name and order"""

    TemplateName: str
    Order: int


class GetTemplateQuestionsRequestP(BaseModel):
    """Request model for getting template questions"""

    TemplateName: str


class GetTemplateQuestionsRequestDemo(BaseModel):
    """Request model for getting template questions"""

    TemplateName: str
    Gender: Union[Literal["Male", "Female", "Other"], None] = None
    Accessibility: Union[Literal["Wheelchair", "Other", "None"], None] = None
    AgeRange: Optional[List[Optional[int]]] = Field(
        None,
        description="List of two ints [min_age, max_age]. Use None in list for unbounded on that side",
    )
    TripsRange: Optional[List[Optional[int]]] = Field(
        None,
        description="List of two ints [min_trips, max_trips]. Use None in list for unbounded on that side",
    )

    @field_validator("AgeRange", "TripsRange")
    @classmethod
    def validate_range_lists(cls, v, info):
        if v is not None:
            # Ensure correct length
            if len(v) != 2:
                raise ValueError(
                    f"{info.field_name} must be a list of exactly 2 values or None"
                )

            # Ensure correct types
            if not all(isinstance(val, int) or val is None for val in v):
                raise ValueError(f"{info.field_name} values must be integers or None")

            min_val, max_val = v

            # Ensure at least one bound is set
            if min_val is None and max_val is None:
                raise ValueError(f"{info.field_name} cannot have both values as None")

            # Ensure ordering is correct
            if min_val is not None and max_val is not None and min_val > max_val:
                raise ValueError(
                    f"{info.field_name}: min value {min_val} cannot be greater than max value {max_val}"
                )
        return v


class TemplateStatsP(BaseModel):
    Total_Templates: int
    Total_Draft_Templates: int
    Total_Published_Templates: int
    Total_Templates_ThisMonth: int
    Total_Draft_Templates_ThisMonth: int
    Total_Published_Templates_ThisMonth: int


class TemplateQuestionCreateP(TemplateNameRequestP):
    """Model for adding a question to a template"""

    QueId: str
    Order: int


class TemplateQuestionDeleteRequestP(BaseModel):
    """Request model for deleting a template question by queid"""

    TemplateName: str
    QueId: str


class SurveyBaseP(BaseModel):
    SurveyId: str = Field(default_factory=lambda: str(uuid4()))
    Biodata: str
    Recipient: str
    Name: str  # same as survey name and templatename
    RiderName: str
    RideId: str
    TenantId: str


class SurveyCreateP(SurveyBaseP):
    URL: str
    Age: Union[int, None] = None
    Gender: Union[Literal["Male", "Female", "Other"], None] = None
    NumOfTrips: Union[int, None] = None
    Accessibility: Union[Literal["Wheelchair", "Other", "None"], None] = None


class SurveyCreateSendP(SurveyBaseP):
    Age: Union[int, None] = None
    Gender: Union[Literal["Male", "Female", "Other"], None] = None
    NumOfTrips: Union[int, None] = None
    Accessibility: Union[Literal["Wheelchair", "Other", "None"], None] = None
    Email: Union[str, None] = None
    Phone: Union[str, None] = None
    RunAt: Union[str, None] = None

    @field_validator("RunAt")
    def validate_run_at(cls, v):
        if v is None:
            return v
        # Regex check for strict format YYYY-MM-DD HH:MM
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}", v):
            raise ValueError("RunAt must be in format YYYY-MM-DD HH:MM")
        # Ensure it's a valid datetime (e.g., not 2025-13-40 25:61)
        try:
            datetime.strptime(v, "%Y-%m-%d %H:%M")
        except ValueError:
            raise ValueError(
                "RunAt must be a valid date-time in format YYYY-MM-DD HH:MM"
            )
        return v


class CandidateCreateP(BaseModel):
    Biodata: str
    Recipient: str
    Name: str
    Email: str
    Phone: str
    RiderName: str
    RideId: str
    TenantId: str
    Age: Union[int, None] = None
    Gender: Union[Literal["Male", "Female", "Other"], None] = None
    NumOfTrips: Union[int, None] = None
    Accessibility: Union[Literal["Wheelchair", "Other", "None"], None] = None


class CandidateP(CandidateCreateP):
    """Candidate response model with ID"""

    Id: str = Field(description="Candidate ID")


class SurveyP(SurveyBaseP):
    URL: str
    Status: Literal["In-Progress", "Completed"] = "In-Progress"
    LaunchDate: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    CompletionDate: str = ""
    Age: Union[int, None] = None
    Gender: Union[Literal["Male", "Female", "Other"], None] = None
    NumOfTrips: Union[int, None] = None
    Accessibility: Union[Literal["Wheelchair", "Other", "None"], None] = None


class SurveyStatusUpdateP(BaseModel):
    Status: Literal["In-Progress", "Completed"]


class SurveyCSATUpdateP(BaseModel):
    CSAT: Union[int, None] = None


class SurveyDurationUpdateP(BaseModel):
    CompletionDuration: Union[int, None] = None


class SurveyQuestion(BaseModel):
    SurveyId: str
    Order: int
    QueId: str


class SurveyQuestionAnswerP(QuestionP):
    Order: int
    Ans: Union[str, None] = None
    RawAns: Union[str, None] = None
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
    RawAns: Union[str, None] = None


class SurveyQnAPhone(BaseModel, extra=Extra.allow):
    SurveyId: str


class SurveyQuestionOrderP(QuestionP):
    Order: int


class SurveyQuestionsP(BaseModel):
    SurveyId: str
    QuestionswithAns: List[SurveyQuestionOrderP]


class SurveyStatusP(BaseModel):
    SurveyId: str
    Status: Literal["In-Progress", "Completed"]
    LaunchDate: str
    CompletionDate: str
    CSAT: Union[int, None] = None


class SurveyFromTemplateP(BaseModel):
    Total: int
    Completed: int
    InProgress: int
    AllSurveysIds: List[str]
    CompletedSurveysIds: List[str]
    InProgressSurveysIds: List[str]


class RelevanceP(BaseModel):
    yes_or_no: Literal["Yes", "No"]


class SympathizeP(BaseModel):
    Question: str
    Response: str


class Email(BaseModel):
    SurveyURL: str
    EmailTo: str


class MakeCall(BaseModel):
    To: str
    SurveyId: str
    RunAt: Optional[str] = None

    @field_validator("RunAt")
    def validate_run_at(cls, v):
        if v is None:
            return v
        # Regex check for strict format YYYY-MM-DD HH:MM
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}", v):
            raise ValueError("RunAt must be in format YYYY-MM-DD HH:MM")
        # Ensure it's a valid datetime (e.g., not 2025-13-40 25:61)
        try:
            datetime.strptime(v, "%Y-%m-%d %H:%M")
        except ValueError:
            raise ValueError(
                "RunAt must be a valid date-time in format YYYY-MM-DD HH:MM"
            )
        return v


class QuestionIdRequestP(BaseModel):
    QueId: str


class TemplateDemographyP(BaseModel):
    GenderCounts: dict
    AccessibilityCounts: dict
    AgeCounts: dict
    TripCounts: dict
    SurveyCounts: dict


class ListingsP(BaseModel):
    page_number: Optional[int] = None
    page_size: Optional[int] = None


class ListingsS(ListingsP):
    sort_by: Literal["id", "name", "launch_date", "recipient", "status"] = "launch_date"
    sort_order: Literal["asc", "desc"] = "desc"
    search: Optional[str] = None


class ListingsT(ListingsP):
    sort_by: Literal["id", "name", "created_at", "status"] = "created_at"
    sort_order: Literal["asc", "desc"] = "asc"
    search: Optional[str] = None


class SurveyIdM(BaseModel):
    SurveyId: str
