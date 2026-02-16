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

  static async getTemplateList(page = null, pageSize = null, sortBy = 'date', sortOrder = 'desc', search = null) {
    try {
      const sortKeyMapping = {
        'id': 'name',
        'name': 'name',
        'date': 'created_at',
        'status': 'status'
      };
      
      const requestBody = {};
      
      if (page !== null && pageSize !== null) {
        requestBody.page_number = page;
        requestBody.page_size = pageSize;
      }
      
      requestBody.sort_by = sortKeyMapping[sortBy] || 'created_at';
      requestBody.sort_order = sortOrder;
      
      if (search !== null && search.trim() !== '') {
        requestBody.search = search.trim();
      }
      
      const response = await ApiBaseHelper.post(ApiLinks.TEMPLATE_LIST, requestBody);

      if (response.templates && response.pagination) {
        return {
          data: response.templates,
          pagination: response.pagination
        };
      }
      
      return {
        data: Array.isArray(response) ? response : [],
        pagination: {
          current_page: 1,
          page_size: Array.isArray(response) ? response.length : 0,
          total_count: Array.isArray(response) ? response.length : 0,
          total_pages: 1
        }
      };
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

  static async getDraftList(page = null, pageSize = null, sortBy = 'date', sortOrder = 'desc', search = null) {
    try {
      const sortKeyMapping = {
        'id': 'name',
        'name': 'name',
        'date': 'created_at',
        'status': 'status'
      };
      
      const requestBody = {};
      
      if (page !== null && pageSize !== null) {
        requestBody.page_number = page;
        requestBody.page_size = pageSize;
      }
      
      requestBody.sort_by = sortKeyMapping[sortBy] || 'created_at';
      requestBody.sort_order = sortOrder;
      
      if (search !== null && search.trim() !== '') {
        requestBody.search = search.trim();
      }
      
      const response = await ApiBaseHelper.post(ApiLinks.TEMPLATE_DRAFT_LIST, requestBody);
      
      if (response.templates && response.pagination) {
        return {
          data: response.templates,
          pagination: response.pagination
        };
      }
      
      return {
        data: Array.isArray(response) ? response : [],
        pagination: {
          current_page: 1,
          page_size: Array.isArray(response) ? response.length : 0,
          total_count: Array.isArray(response) ? response.length : 0,
          total_pages: 1
        }
      };
    } catch (error) {
      console.error('Error fetching draft list:', error);
      throw error;
    }
  }
}

export default TemplateTableService;
