import { useState } from "react";
import SurveyService from "../../services/Surveys/surveyService";
import TemplateService from "../../services/Templates/templateService";
import { generateSurveyId, validateSurveyForm } from "../../utils/Surveys/surveyHelpers";

export const useSurvey = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  const generateSurvey = async (surveyData) => {
    setIsGenerating(true);
    try {
      const result = await SurveyService.generateSurvey(surveyData);

      if (result.questions) {
        result.questions = result.questions.map(question => ({
          ...question,
          autofill: question.autofill || "No"
        }));
      }

      return result;
    } finally {
      setIsGenerating(false);
    }
  };

  const launchSurvey = async (surveyData, questions, aiAugmented = true) => {
    setIsLaunching(true);
    try {
      const result = await SurveyService.launchSurvey(surveyData, questions, aiAugmented);
      return result;
    } finally {
      setIsLaunching(false);
    }
  };

  const fetchSurveyQuestions = async (surveyId) => {
    const result = await SurveyService.fetchSurveyQuestions(surveyId);

    if (result && Array.isArray(result)) {
      return result.map(question => ({
        ...question,
        autofill: question.autofill || "No"
      }));
    }
    
    return result;
  };

  const fetchSurveyQuestionsRaw = async (surveyId) => {
    const result = await SurveyService.fetchSurveyQuestionsRaw(surveyId);
    return result;
  };

  const deleteSurvey = async (surveyId) => {
    setIsDeleting(true);
    try {
      const result = await SurveyService.deleteSurvey(surveyId);
      return result;
    } finally {
      setIsDeleting(false);
    }
  };

  const sendSurveyByEmail = async (surveyId, email) => {
    setIsSendingEmail(true);
    try {
      const result = await SurveyService.sendSurveyByEmail(surveyId, email);
      return result;
    } catch (error) {
      console.error('Error sending survey via email:', error);
      throw error;
    } finally {
      setIsSendingEmail(false);
    }
  };

  const sendSurveyBySMS = async (surveyId, phone, surveyName) => {
    setIsSendingSMS(true);
    try {
      const result = await SurveyService.sendSurveyBySMS(surveyId, phone, surveyName);
      return result;
    } catch (error) {
      console.error('Error sending survey via SMS:', error);
      throw error;
    } finally {
      setIsSendingSMS(false);
    }
  };

  return {
    generateSurvey,
    launchSurvey,
    fetchSurveyQuestions,
    fetchSurveyQuestionsRaw,
    deleteSurvey,
    sendSurveyByEmail,
    sendSurveyBySMS,
    isGenerating,
    isLaunching,
    isDeleting,
    isSendingEmail,
    isSendingSMS,
    generateSurveyId,
    validateSurveyForm,
  };
};

export const useTemplates = () => {
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const templates = await TemplateService.fetchTemplates();
      setAvailableTemplates(templates);
      return templates;
    } catch (error) {
      console.error("Failed to load templates:", error);
      setAvailableTemplates([]);
      throw new Error("Failed to load templates. Please try again later.");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  return {
    availableTemplates,
    isLoadingTemplates,
    fetchTemplates,
    setAvailableTemplates,
  };
};
