class ApiLinks {
    static API_BASE_URL = import.meta.env.VITE_SERVER_URL;

    //Templates
    static TEMPLATE_STATS = `/api/templates/stat`;
    static TEMPLATE_LIST = `/api/templates/list`;
    static TEMPLATE_DRAFT_LIST = `/api/templates/list_drafts`;
    static TEMPLATE_QUESTIONS = `/api/templates/getquestions`;
    static TEMPLATE_CLONE = `/api/templates/clone`;
    static TEMPLATE_DELETE = `/api/templates/delete`;
    static TEMPLATE_ADD = `/api/templates/create`;
    static TEMPLATE_STATUS = `/api/templates/status`;
    static TEMPLATE_ADD_QUESTION = `/api/templates/addquestions`;
    static TEMPLATE_DELETE_QUESTION = `/api/templates/deletequestionbyidwithparentchild`;
    static TEMPLATE_TRANSLATE = `/api/templates/translate`;
    static TEMPLATE_LIST_PUBLISHED_NAMES = `/api/templates/list_published_names`;

    // Questions
    static QUESTION_CREATE = `/api/questions`;
    static QUESTION_EDIT = `/api/questions`;
    static QUESTION_DETAILS = (questionId) => `/api/questions/${questionId}`;

    // Survey endpoints
    static SURVEY_STATS = "/api/surveys/stat";
    static SURVEY_LIST = "/api/surveys/list";
    static COMPLETED_SURVEYS_LIST = "/api/surveys/list_completed";
    static DASHBOARD_DATA = "/api/surveys/dashboard";
    static SURVEY_SEND_EMAIL = `/api/surveys/email`;
    static SURVEY_SEND_PHONE = "/api/surveys/make-call";

    // Survey generation and management endpoints
    static SURVEY_GENERATE = '/api/surveys/generate';
    static SURVEY_CREATE = '/api/surveys/create';
    static SURVEY_DELETE = (surveyId) => `/api/surveys/${surveyId}`;
    static SURVEY_QUESTIONS = (surveyId) => `/api/surveys/${surveyId}/questions`;
    static SURVEY_PROFILE_SAVE = '/api/surveys/candidate';
}
  
export default ApiLinks;
