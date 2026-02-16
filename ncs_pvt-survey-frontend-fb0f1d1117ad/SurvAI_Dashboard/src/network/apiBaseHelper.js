import axios from 'axios';
import ApiLinks from './apiLinks';

class ApiBaseHelper {
  static axiosInstance = axios.create({
    baseURL: ApiLinks.API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    }
  });

  static async get(url) {
    try {
      const response = await this.axiosInstance.get(url, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      return response.data;
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  }

  static async post(url, data) {
    try {
      const response = await this.axiosInstance.post(url, data);
      return response.data;
    } catch (error) {
      console.error('POST request failed:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  static async patch(url, data) {
    try {
      const response = await this.axiosInstance.patch(url, data, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      return response.data;
    } catch (error) {
      console.error('PATCH request failed:', error);
      throw error;
    }
  }

  static async put(url, data) {
    try {
      const response = await this.axiosInstance.put(url, data, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      return response.data;
    } catch (error) {
      console.error('PUT request failed:', error);
      throw error;
    }
  }

  static async delete(url, config = {}) {
    try {
      const response = await this.axiosInstance.delete(url, {
        ...config,
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          ...config.headers,
        }
      });
      return response.data;
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    }
  }
}

export default ApiBaseHelper;
