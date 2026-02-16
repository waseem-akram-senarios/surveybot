import ApiBaseHelper from '../../network/apiBaseHelper';
import ApiLinks from '../../network/apiLinks';
import { transformApiQuestionsToComponentFormat, transformComponentQuestionsToApiFormat } from '../../utils/Surveys/surveyHelpers';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL;

class SurveyService {
  static async generateSurvey(surveyData) {
    try {
      const payload = {
        SurveyId: surveyData.surveyId,
        Biodata: surveyData.biodata,
        Recipient: surveyData.recipient,
        Name: surveyData.template,
        RiderName: surveyData.riderName,
        RideId: surveyData.rideId,
        TenantId: surveyData.tenantId,
        URL: `https://main.d3unjy9nz250ey.amplifyapp.com/survey/${surveyData.surveyId}`
      };

      if (surveyData.age !== null && surveyData.age !== undefined) {
        payload.Age = surveyData.age;
      }
      
      if (surveyData.gender !== null && surveyData.gender !== undefined && surveyData.gender !== '') {
        payload.Gender = surveyData.gender;
      }
      
      if (surveyData.numOfTrips !== null && surveyData.numOfTrips !== undefined) {
        payload.NumOfTrips = surveyData.numOfTrips;
      }

      if (surveyData.accessibility !== null && surveyData.accessibility !== undefined && surveyData.accessibility !== '') {
        payload.Accessibility = surveyData.accessibility;
      }

      console.log("Generating survey with payload:", payload);

      const response = await ApiBaseHelper.post(ApiLinks.SURVEY_GENERATE, payload);

      const transformedQuestions = transformApiQuestionsToComponentFormat(response.QuestionswithAns || []);

      
      return {
        ...surveyData,
        questions: transformedQuestions,
        apiResponse: response
      };
    } catch (error) {
      console.error('Error generating survey:', error);
      throw new Error('Failed to generate survey. Please try again.');
    }
  }

  static async launchSurvey(surveyData, questions) {
    try {
      const apiPayload = transformComponentQuestionsToApiFormat(questions, surveyData.surveyId);
      console.log("Launching survey with payload:", apiPayload);
      
      const response = await ApiBaseHelper.post(ApiLinks.SURVEY_CREATE, apiPayload);
      
      const surveyLink = `https://main.d3unjy9nz250ey.amplifyapp.com/survey/${surveyData.surveyId}`;
      
      return {
        success: true,
        message: response.message,
        surveyLink: surveyLink,
        surveyId: surveyData.surveyId
      };
    } catch (error) {
      console.error('Error launching survey:', error);
      throw new Error('Failed to launch survey. Please try again.');
    }
  }

  static async fetchSurveyQuestions(surveyId) {
    try {
      const response = await ApiBaseHelper.get(ApiLinks.SURVEY_QUESTIONS(surveyId));
      
      if (response.Questions && Array.isArray(response.Questions)) {
        return transformApiQuestionsToComponentFormat(response.Questions);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error('Error fetching survey questions:', error);
      throw new Error('Failed to load survey questions. Please try again.');
    }
  }

  static async fetchSurveyQuestionsRaw(surveyId) {
    try {
      const response = await ApiBaseHelper.get(ApiLinks.SURVEY_QUESTIONS(surveyId));
      
      if (response.Questions && Array.isArray(response.Questions)) {
        return response.Questions; 
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error('Error fetching raw survey questions:', error);
      throw new Error('Failed to load survey questions. Please try again.');
    }
  }

  static async deleteSurvey(surveyId) {
    try {
      await ApiBaseHelper.delete(ApiLinks.SURVEY_DELETE(surveyId));

      return {
        success: true,
        message: 'Survey deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting survey:', error);
      throw new Error('Failed to delete survey. Please try again.');
    }
  }

  static async sendSurveyByEmail(surveyId, email) {
    try {
      const response = await ApiBaseHelper.post(ApiLinks.SURVEY_SEND_EMAIL, {
        SurveyURL: `https://main.d3unjy9nz250ey.amplifyapp.com/survey/${surveyId}`,
        EmailTo: email,
      });

      return {
        success: true,
        message: response.message || 'Survey sent successfully via email',
      };
    } catch (error) {
      console.error('Error sending survey via email:', error);
      throw new Error('Failed to send survey via email. Please try again.');
    }
  }

  static async sendSurveyBySMS(surveyId, phone) {
    try {
      const queryParams = new URLSearchParams({
        to: phone,
        survey_id: surveyId
      });
      
      const response = await ApiBaseHelper.post(`${ApiLinks.SURVEY_SEND_PHONE}?${queryParams.toString()}`);

      return {
        success: true,
        message: response.message || 'Survey sent successfully via SMS',
      };
    } catch (error) {
      console.error('Error sending survey via SMS:', error);
      throw new Error('Failed to send survey via SMS. Please try again.');
    }
  }

  static async makePhoneCall(surveyId, phone, runAt = null) {
    try {
      let formattedPhone = phone;
      if (!phone.startsWith('+')) {
        formattedPhone = `+${phone}`;
      }

      const requestBody = {
        To: formattedPhone,
        SurveyId: surveyId
      };

      if (runAt) {
        requestBody.RunAt = runAt;
      }

      await ApiBaseHelper.post(ApiLinks.SURVEY_SEND_PHONE, requestBody);

      return {
        success: true,
        message: runAt 
          ? `Phone call scheduled successfully for ${runAt}` 
          : 'Phone call initiated successfully',
      };
    } catch (error) {
      console.error('Error making phone call:', error);
      throw new Error('Failed to initiate phone call. Please try again.');
    }
  }

  static async saveSurveyProfile(profileData) {
    try {
      const payload = {
        Biodata: profileData.biodata || "",
        Recipient: profileData.recipient || "",
        Name: profileData.template || "",
        RiderName: profileData.riderName || "",
        RideId: profileData.rideId || "",
        TenantId: profileData.tenantId || "",
        Age: profileData.age || 0,
        Gender: profileData.gender || "Male",
        NumOfTrips: profileData.numOfTrips || 0,
        Accessibility: profileData.accessibility || "None",
        Email: profileData.email || "",
        Phone: profileData.phoneNumber || ""
      };

      console.log("Saving survey profile with payload:", payload);

      const response = await ApiBaseHelper.post(ApiLinks.SURVEY_PROFILE_SAVE, payload);

      return {
        success: true,
        message: response.message || 'Survey profile saved successfully',
        data: response
      };
    } catch (error) {
      console.error('Error saving survey profile:', error);
      throw new Error('Failed to save survey profile. Please try again.');
    }
  }

  static async fetchSurveyProfile() {
    try {
      const response = await ApiBaseHelper.get(ApiLinks.SURVEY_PROFILE_SAVE);
      return response;
    } catch (error) {
      console.error('Error fetching survey profile:', error);
      throw new Error('Failed to fetch survey profile.');
    }
  }

  static async fetchSurveyRecipient(surveyId) {
    try {
      const response = await ApiBaseHelper.get(
        `${API_BASE_URL}api/surveys/${surveyId}/recipient`
      );
      return response;
    } catch (error) {
      console.error('Error fetching survey recipient:', error);
      throw new Error('Failed to fetch survey recipient information.');
    }
  }

  static async fetchCallStatus(surveyId) {
    try {
      const response = await ApiBaseHelper.post(
        `${API_BASE_URL}api/surveys/get-call-status?survey_id=${surveyId}`,
        {}
      );
      return response;
    } catch (error) {
      console.error('Error fetching call status:', error);
      return null;
    }
  }

  static async submitPartialPhoneQNA(surveyId) {
    try {
      const response = await ApiBaseHelper.post(
        `${API_BASE_URL}api/answers/qna_phone_partial`,
        {
          SurveyId: surveyId
        }
      );
      console.log('Partial phone QNA submitted successfully:', response);
      return response;
    } catch (error) {
      console.error('Error submitting partial phone QNA:', error);
      throw new Error('Failed to submit partial phone QNA.');
    }
  }
}

export default SurveyService;