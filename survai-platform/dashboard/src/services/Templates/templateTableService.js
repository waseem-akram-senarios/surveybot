import ApiLinks from '../../network/apiLinks';
import ApiBaseHelper from '../../network/apiBaseHelper';

class TemplateTableService {
  static async getTemplateStats() {
    try {
      return await ApiBaseHelper.get(ApiLinks.TEMPLATE_STATS);
    } catch (error) {
      console.error('Error fetching template stats:', error);
      throw error;
    }
  }

  static async getTemplateList() {
    try {
      return await ApiBaseHelper.get(ApiLinks.TEMPLATE_LIST);
    } catch (error) {
      console.error('Error fetching template list:', error);
      throw error;
    }
  }

  static async getTemplateQuestions(templateName) {
    try {
      const data = await ApiBaseHelper.post(ApiLinks.TEMPLATE_QUESTIONS, {
        TemplateName: templateName
      });
      return data.Questions || [];
    } catch (error) {
      console.error('Error fetching template questions:', error);
      throw error;
    }
  }

  static async getQuestionDetails(questionId) {
    try {
      return await ApiBaseHelper.get(ApiLinks.QUESTION_DETAILS(questionId));
    } catch (error) {
      console.error('Error fetching question details:', error);
      throw error;
    }
  }

  static async cloneTemplate(sourceTemplateName, newTemplateName) {
    try {
      console.log("Cloning template:", sourceTemplateName, "to", newTemplateName);
      return await ApiBaseHelper.post(ApiLinks.TEMPLATE_CLONE, {
        SourceTemplateName: sourceTemplateName,
        NewTemplateName: newTemplateName
      });
    } catch (error) {
      console.error('Error cloning template:', error);
      throw error;
    }
  }

  static async deleteTemplate(templateName) {
    try {
      return await ApiBaseHelper.delete(ApiLinks.TEMPLATE_DELETE, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          TemplateName: templateName
        }
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  static async updateTemplateStatus(templateName, newStatus) {
    try {
      return await ApiBaseHelper.patch(ApiLinks.TEMPLATE_STATUS, {
        TemplateName: templateName,
        Status: newStatus,
      });
    } catch (error) {
      console.error('Error updating template status:', error);
      throw error;
    }
  }

  static async getDraftList() {
    try {
      return await ApiBaseHelper.get(ApiLinks.TEMPLATE_DRAFT_LIST);
    } catch (error) {
      console.error('Error fetching draft list:', error);
      throw error;
    }
  }
}

export default TemplateTableService;
