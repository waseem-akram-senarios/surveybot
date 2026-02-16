import ApiLinks from '../../network/apiLinks';
import ApiBaseHelper from '../../network/apiBaseHelper';

class SurveyTableService {
  static async getSurveyStats() {
    try {
      return await ApiBaseHelper.get(ApiLinks.SURVEY_STATS);
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      throw error;
    }
  }

  static async getSurveyList(page = null, pageSize = null, sortBy = 'launch_date', sortOrder = 'desc', search = null) {
    try {
      // Build request body for POST request
      const requestBody = {};
      
      // Only add pagination parameters if both page and pageSize are provided
      if (page !== null && pageSize !== null) {
        requestBody.page_number = page;
        requestBody.page_size = pageSize;
      }
      
      // Add sorting parameters
      if (sortBy) {
        requestBody.sort_by = sortBy;
      }
      if (sortOrder) {
        requestBody.sort_order = sortOrder;
      }
      
      // Add search parameter if provided
      if (search && search.trim() !== '') {
        requestBody.search = search.trim();
      }

      const response = await ApiBaseHelper.post(ApiLinks.SURVEY_LIST, requestBody);

      // Handle the API response structure with pagination
      if (response.surveys && response.pagination) {
        return {
          data: response.surveys,
          pagination: response.pagination
        };
      }

      // Fallback for unexpected response structure
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
      console.error('Error fetching survey list:', error);
      throw error;
    }
  }

  static async getCompletedSurveyList(page = null, pageSize = null, sortBy = 'launch_date', sortOrder = 'desc', search = null) {
    try {
      // Build request body for POST request
      const requestBody = {};
      
      // Only add pagination parameters if both page and pageSize are provided
      if (page !== null && pageSize !== null) {
        requestBody.page_number = page;
        requestBody.page_size = pageSize;
      }
      
      // Add sorting parameters
      if (sortBy) {
        requestBody.sort_by = sortBy;
      }
      if (sortOrder) {
        requestBody.sort_order = sortOrder;
      }
      
      // Add search parameter if provided
      if (search && search.trim() !== '') {
        requestBody.search = search.trim();
      }

      const response = await ApiBaseHelper.post(ApiLinks.COMPLETED_SURVEYS_LIST, requestBody);

      // Handle the API response structure with pagination
      if (response.surveys && response.pagination) {
        return {
          data: response.surveys,
          pagination: response.pagination
        };
      }

      // Fallback for unexpected response structure
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
      console.error('Error fetching completed survey list:', error);
      throw error;
    }
  }

  static async getDashboardData() {
    try {
      const [surveyStats, templateStats] = await Promise.all([
        ApiBaseHelper.get(ApiLinks.SURVEY_STATS),
        ApiBaseHelper.get(ApiLinks.TEMPLATE_STATS)
      ]);

      return {
        surveyStats,
        templateStats
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
}

export default SurveyTableService;
