import { useState } from "react";
import TemplateService from "../../services/Templates/templateService";
import QuestionService from "../../services/Templates/questionService";
import { 
  formatQuestionForAPI, 
  calculateNextOrder,
  transformAPIQuestionToLocal,
  transformTranslatedQuestionToLocal,
  groupChildQuestionsByParentCategory
} from "../../utils/Templates/templateHelpers";

export const useTemplateAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generic error handler
  const handleError = (error, defaultMessage) => {
    console.error(defaultMessage, error);
    const errorMessage = error.message || defaultMessage;
    setError(errorMessage);
    throw new Error(errorMessage);
  };

  // Clear error state
  const clearError = () => setError(null);

  // Template operations
  const createTemplate = async (templateName) => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.createTemplate(templateName);
      return response;
    } catch (error) {
      handleError(error, "Failed to create template");
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplateStatus = async (templateName, status) => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.updateTemplateStatus(templateName, status);
      return response;
    } catch (error) {
      handleError(error, "Failed to update template status");
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplateConfig = async (templateName, config) => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.updateTemplateConfig(templateName, config);
      return response;
    } catch (error) {
      handleError(error, "Failed to update template configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (templateName) => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.deleteTemplate(templateName);
      return response;
    } catch (error) {
      handleError(error, "Failed to delete template");
    } finally {
      setIsLoading(false);
    }
  };

  const cloneTemplate = async (sourceTemplateName, newTemplateName) => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.cloneTemplate(sourceTemplateName, newTemplateName);
      return response;
    } catch (error) {
      handleError(error, "Failed to clone template");
    } finally {
      setIsLoading(false);
    }
  };

  const getTemplateQuestions = async (templateName) => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.getTemplateQuestions(templateName);
      return response;
    } catch (error) {
      handleError(error, "Failed to fetch template questions");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.fetchTemplates();
      return response;
    } catch (error) {
      handleError(error, "Failed to fetch templates");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDraftTemplates = async () => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.fetchDraftTemplates();
      return response;
    } catch (error) {
      handleError(error, "Failed to fetch draft templates");
    } finally {
      setIsLoading(false);
    }
  };

  const getTemplateStats = async () => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.getTemplateStats();
      return response;
    } catch (error) {
      handleError(error, "Failed to fetch template statistics");
    } finally {
      setIsLoading(false);
    }
  };

  // Question operations
  const saveQuestion = async (question) => {
    clearError();

    try {
      const questionData = formatQuestionForAPI(question);
      const response = await QuestionService.createQuestion(questionData);
      return response;
    } catch (error) {
      handleError(error, "Failed to save question");
    }
  };

  const saveFlowQuestions = async (flowQuestion) => {
    clearError();
  
    try {
      // First save the parent question
      const parentData = formatQuestionForAPI(flowQuestion);
      const parentResponse = await QuestionService.createQuestion(parentData);
      
      // Then save all child questions with proper ParentCategoryTexts
      const childSavePromises = [];
      
      Object.entries(flowQuestion.childQuestions).forEach(([option, questions]) => {
        questions.forEach(childQuestion => {
          // Create a properly formatted child question with ParentCategoryTexts
          const childQuestionForAPI = {
            ...childQuestion,
            parentId: parentResponse.QueId || flowQuestion.queId, // Set the parent ID
          };
          
          // Format the child question for API with the parent option as ParentCategoryTexts
          const childData = formatQuestionForAPI(childQuestionForAPI, option);
          
          // Log for debugging
          console.log(`Saving child question for option "${option}":`, childData);
          
          childSavePromises.push(QuestionService.createQuestion(childData));
        });
      });
  
      // Wait for all child questions to be saved
      const childResponses = await Promise.all(childSavePromises);
      console.log("All child questions saved:", childResponses);
      
      return parentResponse;
    } catch (error) {
      console.error("Error in saveFlowQuestions:", error);
      handleError(error, "Failed to save flow questions");
    }
  };

  const editQuestion = async (questionData) => {
    clearError();
  
    try {
      let requestData;
  
      if (questionData.type === "rating") {
        requestData = {
          QueId: questionData.queId,
          QueText: questionData.question,
          QueCriteria: "scale",
          QueScale: parseInt(questionData.maxRange),
          QueCategories: null,
          ParentId: questionData.parentId || null,
          ParentCategoryTexts: questionData.parentCategoryText ? [questionData.parentCategoryText] : null,
          Autofill: questionData.autofill || "No",
        };
      } else if (questionData.type === "category") {
        requestData = {
          QueId: questionData.queId,
          QueText: questionData.question,
          QueCriteria: "categorical",
          QueScale: null,
          QueCategories: questionData.options,
          ParentId: questionData.parentId || null,
          ParentCategoryTexts: questionData.parentCategoryText ? [questionData.parentCategoryText] : null,
          Autofill: questionData.autofill || "No",
        };
      } else if (questionData.type === "open") {
        requestData = {
          QueId: questionData.queId,
          QueText: questionData.question,
          QueCriteria: "open",
          QueScale: null,
          QueCategories: null,
          ParentId: questionData.parentId || null,
          ParentCategoryTexts: questionData.parentCategoryText ? [questionData.parentCategoryText] : null,
          Autofill: questionData.autofill || "No",
        };
      } else if (questionData.type === "flow") {
        // Handle flow question editing
        requestData = {
          QueId: questionData.queId,
          QueText: questionData.question,
          QueCriteria: "categorical",
          QueScale: null,
          QueCategories: questionData.parentOptions,
          ParentId: null,
          ParentCategoryTexts: null,
          Autofill: questionData.autofill || "No",
        };
  
        // Update the parent question first
        await QuestionService.updateQuestion(requestData);
  
        // Handle child questions updates
        if (questionData.childQuestions) {
          const childUpdatePromises = [];
          
          Object.entries(questionData.childQuestions).forEach(([parentOption, childQuestions]) => {
            childQuestions.forEach(childQuestion => {
              const childQuestionData = {
                ...childQuestion,
                parentId: questionData.queId,
                parentCategoryText: parentOption
              };
              
              const childRequestData = formatQuestionForAPI(childQuestionData, parentOption);
              
              if (childQuestion.queId && childQuestion.isSaved) {
                // Update existing child question
                childUpdatePromises.push(QuestionService.updateQuestion(childRequestData));
              } else {
                // Create new child question
                childUpdatePromises.push(QuestionService.createQuestion(childRequestData));
              }
            });
          });
          
          await Promise.all(childUpdatePromises);
        }
  
        return { success: true };
      } else {
        throw new Error(`Unsupported question type: ${questionData.type}`);
      }
  
      const response = await QuestionService.updateQuestion(requestData);
      return response;
    } catch (error) {
      handleError(error, "Failed to edit question");
    }
  };

  const updateQuestionAutofillAPI = async (queId, autofill) => {
    clearError();

    try {
      const questionDetails = await QuestionService.getQuestionDetails(queId);
      
      if (!questionDetails) {
        throw new Error("Question not found");
      }

      const requestData = {
        QueId: queId,
        QueText: questionDetails.QueText,
        QueCriteria: questionDetails.QueCriteria,
        QueScale: questionDetails.QueScale,
        QueCategories: questionDetails.QueCategories,
        ParentId: questionDetails.ParentId || null,
        ParentCategoryTexts: questionDetails.ParentCategoryTexts || null,
        Autofill: autofill,
      };

      const response = await QuestionService.updateQuestion(requestData);
      return response;
    } catch (error) {
      handleError(error, "Failed to update autofill setting");
    }
  };

  const deleteQuestion = async (templateName, queId) => {
    clearError();

    try {
      const response = await TemplateService.deleteQuestionFromTemplate(templateName, queId);
      return response;
    } catch (error) {
      handleError(error, "Failed to delete question");
    }
  };

  const addQuestionToTemplate = async (templateName, queId, order) => {
    clearError();

    try {
      const response = await TemplateService.addQuestionToTemplate(templateName, queId, order);
      return response;
    } catch (error) {
      handleError(error, "Failed to add question to template");
    }
  };

  const getQuestionDetails = async (questionId) => {
    clearError();

    try {
      const response = await QuestionService.getQuestionDetails(questionId);
      return response;
    } catch (error) {
      handleError(error, "Failed to fetch question details");
    }
  };

  const retryAsync = async (fn, retries = 2, delayMs = 500) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  };

  const saveAndLinkQuestion = async (templateName, question, order) => {
    await retryAsync(() => saveQuestion(question));
    await retryAsync(() => addQuestionToTemplate(templateName, question.queId, order));
  };

  const saveAndLinkFlowQuestion = async (templateName, question, startOrder) => {
    await retryAsync(() => saveFlowQuestions(question));
    await retryAsync(() => addQuestionToTemplate(templateName, question.queId, startOrder));

    let childOrder = startOrder + 1;
    const linkPromises = [];
    for (const [, childQuestions] of Object.entries(question.childQuestions)) {
      for (const childQuestion of childQuestions) {
        const ord = childOrder++;
        linkPromises.push(retryAsync(() => addQuestionToTemplate(templateName, childQuestion.queId, ord)));
      }
    }
    await Promise.all(linkPromises);
    return childOrder;
  };

  // Combined operations
  const saveMultipleQuestions = async (templateName, allQuestions) => {
    setIsLoading(true);
    clearError();

    try {
      const unsavedQuestions = allQuestions.filter((q) => !q.isSaved);
      if (unsavedQuestions.length === 0) return;

      let nextOrder = calculateNextOrder(allQuestions);

      const BATCH_SIZE = 3;
      for (let batchStart = 0; batchStart < unsavedQuestions.length; batchStart += BATCH_SIZE) {
        const batch = unsavedQuestions.slice(batchStart, batchStart + BATCH_SIZE);

        const orderMap = [];
        let tempOrder = nextOrder;
        for (const q of batch) {
          orderMap.push(tempOrder);
          if (q.type === 'flow') {
            const totalChildren = Object.values(q.childQuestions).flat().length;
            tempOrder += totalChildren + 1;
          } else {
            tempOrder++;
          }
        }

        await Promise.all(
          batch.map((question, idx) => {
            const order = orderMap[idx];
            if (question.type === 'flow') {
              return saveAndLinkFlowQuestion(templateName, question, order);
            }
            return saveAndLinkQuestion(templateName, question, order);
          })
        );

        nextOrder = tempOrder;
      }

      console.log("All questions saved successfully");
    } catch (error) {
      console.error("Error in saveMultipleQuestions:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const editQuestionComplete = async (questionData) => {
    setIsLoading(true);
    clearError();

    try {
      const response = await editQuestion(questionData);
      return response;
    } catch (error) {
      handleError(error, "Failed to update question");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuestionComplete = async (templateName, queId) => {
    setIsLoading(true);
    clearError();

    try {
      await deleteQuestion(templateName, queId);
    } catch (error) {
      handleError(error, "Failed to delete question");
    } finally {
      setIsLoading(false);
    }
  };

  // Translation operations
  const translateTemplate = async (sourceTemplateName, newTemplateName, language) => {
    setIsLoading(true);
    clearError();

    try {
      const response = await TemplateService.translateTemplate(sourceTemplateName, newTemplateName, language);
      return response;
    } catch (error) {
      handleError(error, `Failed to create ${language} template`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTranslatedTemplateWithQuestions = async (templateName) => {
    setIsLoading(true);
    clearError();

    try {
      const questionsResponse = await getTemplateQuestions(templateName);
      const translatedQuestions = questionsResponse.Questions || [];

      const transformedQuestions = translatedQuestions.map(question => 
        transformTranslatedQuestionToLocal(question)
      );

      const groupedQuestions = groupChildQuestionsByParentCategory(transformedQuestions);
      groupedQuestions.sort((a, b) => a.order - b.order);
      
      return groupedQuestions;
    } catch (error) {
      handleError(error, "Failed to fetch translated template with questions");
    } finally {
      setIsLoading(false);
    }
  };

  const createTranslatedClone = async (sourceTemplateName, newTemplateName, language) => {
    setIsLoading(true);
    clearError();

    try {
      // Step 1: Create translated clone
      await translateTemplate(sourceTemplateName, newTemplateName, language);

      // Step 2: Get questions with details
      const questionsWithDetails = await getTranslatedTemplateWithQuestions(newTemplateName);

      return {
        templateName: newTemplateName,
        questions: questionsWithDetails,
        language: language
      };
    } catch (error) {
      handleError(error, `Failed to create ${language} clone`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // State
    isLoading,
    error,

    // Template operations
    createTemplate,
    updateTemplateStatus,
    updateTemplateConfig,
    deleteTemplate,
    cloneTemplate,
    fetchTemplates,
    fetchDraftTemplates,
    getTemplateStats,
    getTemplateQuestions,

    // Question operations
    saveQuestion,
    saveFlowQuestions,
    editQuestion,
    updateQuestionAutofillAPI, // New method for autofill updates
    deleteQuestion,
    addQuestionToTemplate,
    getQuestionDetails,

    // Combined operations
    saveMultipleQuestions,
    editQuestionComplete,
    deleteQuestionComplete,

    // Translation operations
    translateTemplate,
    getTranslatedTemplateWithQuestions,
    createTranslatedClone,

    // Utilities
    clearError,
  };
};
