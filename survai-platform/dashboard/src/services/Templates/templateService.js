import ApiBaseHelper from "../../network/apiBaseHelper";
import ApiLinks from "../../network/apiLinks";

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

  static async updateTemplateConfig(templateName, config) {
    try {
      const response = await ApiBaseHelper.patch(ApiLinks.TEMPLATE_UPDATE, {
        TemplateName: templateName,
        ...config
      });
      return response;
    } catch (error) {
      console.error("Error updating template config:", error);
      throw new Error("Failed to update template configuration. Please try again.");
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
}

export default TemplateService;
