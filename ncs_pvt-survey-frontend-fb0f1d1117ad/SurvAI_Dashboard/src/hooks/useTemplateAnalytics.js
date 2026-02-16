import { useState, useEffect } from 'react';
import TemplateService from '../services/Templates/templateService';
import SurveyService from '../services/Surveys/surveyService';

export const useTemplateAnalytics = (templateData, activeTab) => {
  // Questions state
  const [questionsData, setQuestionsData] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Demographics state
  const [demographics, setDemographics] = useState(null);
  const [loadingDemographics, setLoadingDemographics] = useState(false);

  // Survey stats state
  const [surveyStats, setSurveyStats] = useState(null);
  const [loadingSurveyStats, setLoadingSurveyStats] = useState(false);
  const [currentSurveyIndex, setCurrentSurveyIndex] = useState(0);
  const [currentSurveyData, setCurrentSurveyData] = useState(null);
  const [currentSurveyQuestions, setCurrentSurveyQuestions] = useState([]);
  const [loadingCurrentSurvey, setLoadingCurrentSurvey] = useState(false);

  // Filter state
  const [appliedFilters, setAppliedFilters] = useState({});
  const [loadingFiltered, setLoadingFiltered] = useState(false);

  // Add call info state
  const [currentSurveyCallInfo, setCurrentSurveyCallInfo] = useState(null);

  // Fetch questions data
  useEffect(() => {
    const fetchQuestionsData = async () => {
      if (!templateData || activeTab !== 'questions') return;

      try {
        setLoading(true);
        const data = await TemplateService.getTemplateQuestionsAnalytics(
          templateData.templateName,
          appliedFilters
        );

        const sortedQuestions = data.sort((a, b) => {
          const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        setQuestionsData(sortedQuestions);
      } catch (error) {
        console.error('Error fetching questions data:', error);
        throw error;
      } finally {
        setLoading(false);
        setLoadingFiltered(false);
      }
    };

    fetchQuestionsData();
  }, [templateData, appliedFilters, activeTab]);

  // Fetch demographics
  useEffect(() => {
    const fetchDemographics = async () => {
      if (!templateData || activeTab !== 'demographics') return;

      try {
        setLoadingDemographics(true);
        const data = await TemplateService.getTemplateDemographics(
          templateData.templateName
        );
        setDemographics(data);
      } catch (error) {
        console.error('Failed to fetch demographics:', error);
        setDemographics(null);
        throw error;
      } finally {
        setLoadingDemographics(false);
      }
    };

    fetchDemographics();
  }, [activeTab, templateData]);

  // Fetch survey stats
  useEffect(() => {
    const fetchSurveyStats = async () => {
      if (!templateData || activeTab !== 'surveys') return;

      try {
        setLoadingSurveyStats(true);
        const data = await TemplateService.getSurveysFromTemplate(
          templateData.templateName
        );
        setSurveyStats(data);

        if (data.CompletedSurveysIds && data.CompletedSurveysIds.length > 0) {
          await loadSurveyData(data.CompletedSurveysIds[0]);
        }
      } catch (error) {
        console.error('Failed to fetch survey stats:', error);
        setSurveyStats(null);
        throw error;
      } finally {
        setLoadingSurveyStats(false);
      }
    };

    fetchSurveyStats();
  }, [activeTab, templateData]);

  // Load individual survey data
  const loadSurveyData = async (surveyId) => {
    try {
      setLoadingCurrentSurvey(true);
      const { surveyData, questionsData } = await TemplateService.getSurveyDetails(surveyId);
      
      const recipientData = await SurveyService.fetchSurveyRecipient(surveyId);
      const callStatusData = await SurveyService.fetchCallStatus(surveyId);
      setCurrentSurveyCallInfo({
        CallTime: recipientData?.CallTime || null,
        CallNumber: recipientData?.CallNumber || null,
        endedAt: callStatusData?.endedAt || null,
        endedReason: callStatusData?.endedReason || null,
        status: callStatusData?.status || null,
        duration: callStatusData?.duration || null
      });
      
      setCurrentSurveyData(surveyData);
      setCurrentSurveyQuestions(questionsData);

      if (
        callStatusData?.endedReason === "customer-ended-call" &&
        surveyData?.Status === "In-Progress" &&
        recipientData?.CallTime &&
        recipientData?.CallTime !== "None"
      ) {
        try {
          await SurveyService.submitPartialPhoneQNA(surveyId);
        } catch (error) {
          console.error("Failed to submit partial phone QNA:", error);
        }
      }
    } catch (error) {
      console.error('Failed to load survey data:', error);
      setCurrentSurveyData(null);
      setCurrentSurveyQuestions([]);
      throw error;
    } finally {
      setLoadingCurrentSurvey(false);
    }
  };

  // Navigation handlers
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setCurrentResponseIndex(0);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setCurrentResponseIndex(0);
    }
  };

  const handlePrevResponse = () => {
    if (currentResponseIndex > 0) {
      setCurrentResponseIndex((prev) => prev - 1);
    }
  };

  const handleNextResponse = (maxResponses) => {
    if (currentResponseIndex < maxResponses - 1) {
      setCurrentResponseIndex((prev) => prev + 1);
    }
  };

  const handlePrevSurvey = async () => {
    if (currentSurveyIndex > 0 && surveyStats?.CompletedSurveysIds) {
      const newIndex = currentSurveyIndex - 1;
      setCurrentSurveyIndex(newIndex);
      await loadSurveyData(surveyStats.CompletedSurveysIds[newIndex]);
    }
  };

  const handleNextSurvey = async () => {
    if (surveyStats?.CompletedSurveysIds && currentSurveyIndex < surveyStats.CompletedSurveysIds.length - 1) {
      const newIndex = currentSurveyIndex + 1;
      setCurrentSurveyIndex(newIndex);
      await loadSurveyData(surveyStats.CompletedSurveysIds[newIndex]);
    }
  };

  // Filter handlers
  const handleApplyFilters = (newFilters) => {
    setLoadingFiltered(true);
    setAppliedFilters(newFilters);
    setCurrentQuestionIndex(0);
    setCurrentResponseIndex(0);
  };

  const clearFilters = () => {
    setLoadingFiltered(true);
    setAppliedFilters({});
    setCurrentQuestionIndex(0);
    setCurrentResponseIndex(0);
  };

  return {
    // Questions data
    questionsData,
    currentQuestionIndex,
    currentResponseIndex,
    loading,
    loadingFiltered,
    
    // Demographics data
    demographics,
    loadingDemographics,
    
    // Survey stats data
    surveyStats,
    loadingSurveyStats,
    currentSurveyIndex,
    currentSurveyData,
    currentSurveyQuestions,
    currentSurveyCallInfo,
    loadingCurrentSurvey,
    
    // Filters
    appliedFilters,
    
    // Handlers
    handlePrevQuestion,
    handleNextQuestion,
    handlePrevResponse,
    handleNextResponse,
    handlePrevSurvey,
    handleNextSurvey,
    handleApplyFilters,
    clearFilters,
  };
};