import ApiBaseHelper from "../../network/apiBaseHelper";
import ApiLinks from "../../network/apiLinks";
import { transformApiQuestionsToComponentFormat } from "../../utils/Surveys/surveyHelpers";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL;

class TemplateService {
  static async fetchTemplates() {
    try {
      const response = await ApiBaseHelper.get(ApiLinks.TEMPLATE_LIST);
      if (Array.isArray(response)) {
        return response
          .filter(
            (template) =>
              typeof template === "string" || template?.Status === "Published"
          )
          .map((template) =>
            typeof template === "string" ? template : template.TemplateName
          )
          .filter(Boolean);
      }

      if (response.templates && Array.isArray(response.templates)) {
        return response.templates
          .map((template) =>
            typeof template === "string" ? template : template.TemplateName
          )
          .filter(Boolean);
      }

      console.warn("Unexpected templates API response format:", response);
      return [];
    } catch (error) {
      console.error("Error fetching templates:", error);
      throw new Error("Failed to fetch templates. Please try again.");
    }
  }

  static async fetchPublishedTemplateNames() {
    try {
      const response = await ApiBaseHelper.get(ApiLinks.TEMPLATE_LIST_PUBLISHED_NAMES);
      if (Array.isArray(response)) {
        return response.filter(Boolean);
      }
      
      console.warn("Unexpected published templates API response format:", response);
      return [];
    } catch (error) {
      console.error("Error fetching published template names:", error);
      throw new Error("Failed to fetch published templates. Please try again.");
    }
  }

  static async createTemplate(templateName) {
    try {
      const response = await ApiBaseHelper.post(ApiLinks.TEMPLATE_ADD, {
        TemplateName: templateName,
      });
      return response;
    } catch (error) {
      console.error("Error creating template:", error);

      if (error.response?.status === 400) {
        throw new Error(
          "Template name already exists. Please choose a different name."
        );
      }

      throw new Error("Failed to create template. Please try again.");
    }
  }

  static async updateTemplateStatus(templateName, status) {
    try {
      const response = await ApiBaseHelper.patch(ApiLinks.TEMPLATE_STATUS, {
        TemplateName: templateName,
        Status: status,
      });
      return response;
    } catch (error) {
      console.error("Error updating template status:", error);
      throw new Error("Failed to update template status. Please try again.");
    }
  }

  static async deleteTemplate(templateName) {
    try {
      const response = await ApiBaseHelper.delete(ApiLinks.TEMPLATE_DELETE, {
        data: { TemplateName: templateName },
      });
      return response;
    } catch (error) {
      console.error("Error deleting template:", error);
      throw new Error("Failed to delete template. Please try again.");
    }
  }

  static async cloneTemplate(sourceTemplateName, newTemplateName) {
    try {
      const response = await ApiBaseHelper.post(ApiLinks.TEMPLATE_CLONE, {
        SourceTemplateName: sourceTemplateName,
        NewTemplateName: newTemplateName,
      });
      return response;
    } catch (error) {
      console.error("Error cloning template:", error);
      throw new Error("Failed to clone template. Please try again.");
    }
  }

  static async translateTemplate(
    sourceTemplateName,
    newTemplateName,
    language
  ) {
    try {
      console.log("Translating template:", {
        sourceTemplateName,
        newTemplateName,
        language,
      }
      )
      const response = await ApiBaseHelper.post(ApiLinks.TEMPLATE_TRANSLATE, {
        SourceTemplateName: sourceTemplateName,
        NewTemplateName: newTemplateName,
        NewTemplateLanguage: language,
      });
      return response;
    } catch (error) {
      console.error("Error translating template:", error);
      throw new Error("Failed to translate template. Please try again.");
    }
  }

  static async getTemplateQuestions(templateName) {
    try {
      console.log("Fetching questions for template:");
      const response = await ApiBaseHelper.post(ApiLinks.TEMPLATE_QUESTIONS, {
        TemplateName: templateName,
      });
      console.log("Fetched template questions:", response);
      return response;
    } catch (error) {
      console.error("Error fetching template questions:", error);
      throw new Error("Failed to fetch template questions. Please try again.");
    }
  }

  static async addQuestionToTemplate(templateName, queId, order) {
    try {
      const response = await ApiBaseHelper.post(
        ApiLinks.TEMPLATE_ADD_QUESTION,
        {
          TemplateName: templateName,
          QueId: queId,
          Order: order.toString(),
        }
      );
      return response;
    } catch (error) {
      console.error("Error adding question to template:", error);
      throw new Error("Failed to add question to template. Please try again.");
    }
  }

  static async deleteQuestionFromTemplate(templateName, queId) {
    try {
      const response = await ApiBaseHelper.delete(
        ApiLinks.TEMPLATE_DELETE_QUESTION,
        {
          data: {
            TemplateName: templateName,
            QueId: queId,
          },
        }
      );
      return response;
    } catch (error) {
      console.error("Error deleting question from template:", error);
      throw new Error(
        "Failed to delete question from template. Please try again."
      );
    }
  }

  static async fetchDraftTemplates() {
    try {
      const response = await ApiBaseHelper.get(ApiLinks.TEMPLATE_DRAFT_LIST);
      return response;
    } catch (error) {
      console.error("Error fetching draft templates:", error);
      throw new Error("Failed to fetch draft templates. Please try again.");
    }
  }

  static async getTemplateStats() {
    try {
      const response = await ApiBaseHelper.get(ApiLinks.TEMPLATE_STATS);
      return response;
    } catch (error) {
      console.error("Error fetching template stats:", error);
      throw new Error("Failed to fetch template stats. Please try again.");
    }
  }

  static async getTemplateQuestionsAnalytics(templateName, filters = {}) {
    try {
      const requestBody = {
        TemplateName: templateName,
        ...filters
      };

      const res = await fetch(`${API_BASE_URL}api/templates/getqna`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // If getqna returns empty array, fallback to get_template_questions
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log("getqna returned empty, using fallback endpoint");
        return await this.getTemplateQuestionsFallback(templateName);
      }
      
      return data;
    } catch (error) {
      console.error("Error fetching questions analytics:", error);
      // Try fallback on error as well
      try {
        console.log("Attempting fallback due to error");
        return await this.getTemplateQuestionsFallback(templateName);
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        throw new Error("Failed to fetch questions analytics. Please try again.");
      }
    }
  }

  static async getTemplateQuestionsFallback(templateName) {
    try {
      const res = await fetch(`${API_BASE_URL}api/templates/getquestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ TemplateName: templateName })
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // Transform the fallback response to match expected format
      if (data.Questions && Array.isArray(data.Questions)) {
        return data.Questions.map(q => ({
          question_id: q.id,
          question_text: q.text,
          criteria: q.criteria,
          scales: q.scales,
          parent_id: q.parent_id,
          order: q.ord,
          categories: q.categories || [],
          // Add empty response data since this is fallback
          responses: {},
          text_responses: []
        }));
      }
      
      return [];
    } catch (error) {
      console.error("Error in fallback endpoint:", error);
      throw error;
    }
  }

  static async getTemplateDemographics(templateName) {
    try {
      const res = await fetch(`${API_BASE_URL}api/templates/demographics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ TemplateName: templateName })
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (error) {
      console.error("Error fetching demographics:", error);
      throw new Error("Failed to fetch demographics. Please try again.");
    }
  }

  static async getSurveysFromTemplate(templateName) {
    try {
      const res = await fetch(`${API_BASE_URL}api/surveys/list_surveys_from_templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ TemplateName: templateName })
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (error) {
      console.error("Error fetching surveys from template:", error);
      throw new Error("Failed to fetch surveys. Please try again.");
    }
  }

  static async getSurveyDetails(surveyId) {
    try {
      const surveyRes = await fetch(`${API_BASE_URL}api/surveys/${surveyId}/recipient`, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!surveyRes.ok) throw new Error(`Failed to fetch survey: ${surveyRes.status}`);
      const surveyData = await surveyRes.json();

      const questionsRes = await fetch(`${API_BASE_URL}api/surveys/${surveyId}/questions`, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!questionsRes.ok) throw new Error(`Failed to fetch questions: ${questionsRes.status}`);
      const questionsData = await questionsRes.json();
      const transformedQuestions = transformApiQuestionsToComponentFormat(questionsData.Questions);

      return {
        surveyData,
        questionsData: transformedQuestions
      };
    } catch (error) {
      console.error("Error fetching survey details:", error);
      throw new Error("Failed to fetch survey details. Please try again.");
    }
  }
}

export default TemplateService;
