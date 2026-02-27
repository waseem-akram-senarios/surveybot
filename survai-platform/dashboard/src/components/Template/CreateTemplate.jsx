import { useState, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  useMediaQuery,
  Alert,
  Snackbar,
  CircularProgress,
  Typography,
} from "@mui/material";

// Components
import TemplateHeader from "./components/TemplateHeader";
import TemplateNameField from "./components/TemplateNameField";
import QuestionsSection from "./components/QuestionsSection";
import TemplateFooter from "./components/TemplateFooter";

// Modals
import TranslationModals from "./components/TranslationModals";
import CategoryQuestionModal from "./components/CategoryQuestionsModal";
import RatingQuestionModal from "./components/RatingQuestionsModal";
import OpenQuestionModal from "./components/OpenQuestionsModal";
import FlowQuestionModal from "./components/FlowQuestionModal";
import PublishConfirmationModal from "./components/PublishConfirmationsModal";

// Hooks
import { useTemplateAPI } from "../../hooks/Templates/useTemplates";
import { useAlert } from "../../hooks/useAlert";

// Utils
import {
  createCategoryQuestion,
  createRatingQuestion,
  createOpenQuestion,
  createFlowQuestion,
  updateQuestionInArray,
  markQuestionsAsSaved,
  getUnsavedQuestions,
  markExistingQuestionsAsSaved,
  getAvailableLanguages,
  validateTemplate,
} from "../../utils/Templates/templateHelpers";

const CreateTemplateForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 600px)");

  const {
    isLoading,
    createTemplate,
    updateTemplateStatus,
    updateTemplateConfig,
    saveMultipleQuestions,
    editQuestionComplete,
    deleteQuestionComplete,
    createTranslatedClone,
    updateQuestionAutofillAPI, // New API method for autofill updates
  } = useTemplateAPI();

  const { alert, showSuccess, showError, showWarning, showInfo, closeAlert } = useAlert();

  // Extract props from location state
  const editMode = location.state?.editMode || false;
  const [viewMode, setViewMode] = useState(location.state?.viewMode || false);
  const templateData = location.state?.templateData || null;

  // Component state
  const [currentStep, setCurrentStep] = useState(editMode ? 2 : 1);
  const [templateName, setTemplateName] = useState(
    editMode ? templateData?.templateName || "" : ""
  );
  const [questions, setQuestions] = useState(
    editMode ? markExistingQuestionsAsSaved(templateData?.questions) : []
  );
  const [editedQuestions, setEditedQuestions] = useState(new Set());
  const [aiAugmented, setAiAugmented] = useState(
    editMode ? templateData?.aiAugmented || false : true
  );
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showLanguageSelectionModal, setShowLanguageSelectionModal] = useState(false);
  const [showTranslateCloneModal, setShowTranslateCloneModal] = useState(false);
  
  // Translation states
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [translatedTemplateName, setTranslatedTemplateName] = useState("");
  const [translateCloneLoading, setTranslateCloneLoading] = useState(false);
  
  // Other states
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [templateId, setTemplateId] = useState(
    editMode ? templateData?.templateId || null : null
  );

  const availableLanguages = getAvailableLanguages();
  const unsavedQuestions = getUnsavedQuestions(questions);
  const hasChangesToSave = unsavedQuestions.length > 0 || editedQuestions.size > 0;

  useEffect(() => {
    if (location.state?.editMode && location.state?.templateData) {
      const { templateData } = location.state;
      setCurrentStep(2);
      setTemplateName(templateData.templateName || "");
      setQuestions(markExistingQuestionsAsSaved(templateData.questions));
      setTemplateId(templateData.templateId || null);
    }
  }, [location.state]);

  // Question handlers
  const handleAddCategoryQuestion = () => {
    if (viewMode) return;
    setEditingQuestion(null);
    setShowCategoryModal(true);
  };

  const handleAddRatingQuestion = () => {
    if (viewMode) return;
    setEditingQuestion(null);
    setShowRatingModal(true);
  };

  const handleAddOpenQuestion = () => {
    if (viewMode) return;
    setEditingQuestion(null);
    setShowOpenModal(true);
  };

  const handleAddFlowQuestion = () => {
    if (viewMode) return;
    setEditingQuestion(null);
    setShowFlowModal(true);
  };

  const handleEditQuestion = (question, type) => {
    if (viewMode) return;
    setEditingQuestion(question);
    
    switch (type) {
      case "category":
        setShowCategoryModal(true);
        break;
      case "rating":
        setShowRatingModal(true);
        break;
      case "open":
        setShowOpenModal(true);
        break;
      case "flow":
        setShowFlowModal(true);
        break;
      default:
        break;
    }
  };

  const handleCategorySubmit = async (data) => {
    if (viewMode) return;
    
    if (data.isEdit) {
      try {
        const questionData = {
          queId: editingQuestion.queId,
          question: data.question,
          type: "category",
          options: data.options,
          autofill: editingQuestion.autofill
        };

        await editQuestionComplete(questionData);

        setQuestions(prev =>
          updateQuestionInArray(prev, data.id, {
            question: data.question,
            options: data.options,
            selectedOption: "",
            isSaved: true,
          })
        );

        // Remove from edited questions since it's now saved
        setEditedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.id);
          return newSet;
        });

        showSuccess("Question updated successfully!");
      } catch (error) {
        console.error("Failed to update question:", error);
        showError("Failed to update question. Please try again.");
      }
    } else {
      const newQuestion = createCategoryQuestion(data);
      setQuestions(prev => [...prev, newQuestion]);
    }
  };

  const handleRatingSubmit = async (data) => {
    if (viewMode) return;
    
    if (data.isEdit) {
      try {
        const questionData = {
          queId: editingQuestion.queId,
          question: data.question,
          type: "rating",
          maxRange: data.maxRange,
          autofill: editingQuestion.autofill
        };

        await editQuestionComplete(questionData);

        setQuestions(prev =>
          updateQuestionInArray(prev, data.id, {
            question: data.question,
            maxRange: data.maxRange,
            rating: 0,
            isSaved: true,
          })
        );

        // Remove from edited questions since it's now saved
        setEditedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.id);
          return newSet;
        });

        showSuccess("Question updated successfully!");
      } catch (error) {
        console.error("Failed to update question:", error);
        showError("Failed to update question. Please try again.");
      }
    } else {
      const newQuestion = createRatingQuestion(data);
      setQuestions(prev => [...prev, newQuestion]);
    }
  };

  const handleOpenSubmit = async (data) => {
    if (viewMode) return;
    
    if (data.isEdit) {
      try {
        const questionData = {
          queId: editingQuestion.queId,
          question: data.question,
          type: "open",
          autofill: editingQuestion.autofill
        };

        await editQuestionComplete(questionData);

        setQuestions(prev =>
          updateQuestionInArray(prev, data.id, {
            question: data.question,
            answer: "",
            isSaved: true,
          })
        );

        // Remove from edited questions since it's now saved
        setEditedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.id);
          return newSet;
        });

        showSuccess("Question updated successfully!");
      } catch (error) {
        console.error("Failed to update question:", error);
        showError("Failed to update question. Please try again.");
      }
    } else {
      const newQuestion = createOpenQuestion(data);
      setQuestions(prev => [...prev, newQuestion]);
    }
  };

  const handleFlowSubmit = async (data) => {
    if (viewMode) return;
    
    if (data.isEdit) {
      // Handle flow question editing
      try {
        // Convert childQuestions array back to object format for API
        const childQuestionsForAPI = data.childQuestions.reduce((acc, item) => {
          acc[item.option] = item.questions.map(question => ({
            ...question,
            parentCategoryText: item.option, // Add the parent category text for API
            parentId: editingQuestion.queId // Ensure parent ID is set
          }));
          return acc;
        }, {});
  
        const questionData = {
          queId: editingQuestion.queId,
          question: data.parentQuestion,
          type: "flow",
          parentOptions: data.parentOptions,
          childQuestions: childQuestionsForAPI,
          autofill: editingQuestion.autofill
        };
  
        await editQuestionComplete(questionData);
  
        // Convert childQuestions array to object format for state
        const childQuestionsForState = data.childQuestions.reduce((acc, item) => {
          acc[item.option] = item.questions;
          return acc;
        }, {});
  
        setQuestions(prev =>
          updateQuestionInArray(prev, data.id, {
            question: data.parentQuestion,
            parentOptions: data.parentOptions,
            childQuestions: childQuestionsForState,
            selectedOption: "",
            isSaved: true,
          })
        );

        // Remove from edited questions since it's now saved
        setEditedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.id);
          return newSet;
        });
  
        showSuccess("Flow question updated successfully!");
      } catch (error) {
        console.error("Failed to update flow question:", error);
        showError("Failed to update flow question. Please try again.");
      }
    } else {
      // Create new flow question
      // Convert childQuestions array to object format for createFlowQuestion
      const childQuestionsObject = data.childQuestions.reduce((acc, item) => {
        acc[item.option] = item.questions.map(question => ({
          ...question,
          parentCategoryText: item.option // Store the parent category text
        }));
        return acc;
      }, {});
  
      const newFlowQuestion = createFlowQuestion({
        parentQuestion: data.parentQuestion,
        parentOptions: data.parentOptions,
        childQuestions: childQuestionsObject
      });
      
      setQuestions(prev => [...prev, newFlowQuestion]);
    }
  };

  const deleteQuestion = async (questionId) => {
    if (viewMode) return;
    
    if (editMode) {
      try {
        const questionToDelete = questions.find(q => q.id === questionId);
        if (!questionToDelete || !questionToDelete.queId) {
          showError("Question ID not found");
          return;
        }

        await deleteQuestionComplete(templateName, questionToDelete.queId);
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        
        // Remove from edited questions if it was there
        setEditedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(questionId);
          return newSet;
        });
        
        showSuccess("Question deleted successfully!");
      } catch (error) {
        console.error("Failed to delete question:", error);
        showError("Failed to delete question. Please try again.");
      }
    } else {
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    }
  };

  const updateQuestionRating = (questionId, rating) => {
    if (viewMode) return;
    setQuestions(prev => updateQuestionInArray(prev, questionId, { rating }));
  };

  const updateQuestionSelection = (questionId, selectedOption) => {
    // Allow selection updates for flow questions even in view mode to enable navigation
    console.log("Updating question selection:", { questionId, selectedOption });
    
    setQuestions(prev => {
      const updated = updateQuestionInArray(prev, questionId, { selectedOption });
      console.log("Updated questions:", updated);
      return updated;
    });
  };

  const updateQuestionAnswer = (questionId, answer) => {
    if (viewMode) return;
    setQuestions(prev => updateQuestionInArray(prev, questionId, { answer }));
  };

  const updateQuestionAutofill = async (questionId, autofill) => {
    if (viewMode) return;
    
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    // Update the question state immediately
    setQuestions(prev => updateQuestionInArray(prev, questionId, { autofill }));
    
    // If it's an existing saved question, mark it as edited and call API immediately
    if (question.isSaved && question.queId) {
      try {
        await updateQuestionAutofillAPI(question.queId, autofill);
        showSuccess("Autofill setting updated successfully!");
      } catch (error) {
        console.error("Failed to update autofill setting:", error);
        showError("Failed to update autofill setting. Please try again.");
        // Revert the change on error
        setQuestions(prev => updateQuestionInArray(prev, questionId, { autofill: question.autofill }));
        return;
      }
    } else {
      // For unsaved questions, just mark as edited
      setEditedQuestions(prev => new Set(prev).add(questionId));
    }
  };

  // Navigation handlers
  const handleNext = async () => {
    if (currentStep === 1) {
      if (!templateName.trim()) {
        showError("Please enter a template name");
        return;
      }

      console.log("template data", editMode)

      try {
        if (!editMode) {
          const response = await createTemplate(templateName.trim());
          console.log("Template created successfully:", response);

          if (response.templateId || response.id) {
            setTemplateId(response.templateId || response.id);
          }
          
          // Save AI Augmented setting
          await updateTemplateConfig(templateName.trim(), { ai_augmented: aiAugmented });
          
          showSuccess("Template created successfully!");
        } else {
          // Update AI Augmented setting for existing template
          await updateTemplateConfig(templateName, { ai_augmented: aiAugmented });
        }
        setCurrentStep(2);
      } catch (error) {
        console.error("Failed to create template:", error);
        showError(error.message);
      }
    } else {
      if (templateData?.status === "Published") {
        navigate('/surveys/launch', {
          state: {
            selectedTemplate: templateName
          }
        });
        return;
      }
      
      // If in view mode and not published, go to templates manage
      if (viewMode) {
        navigate('/templates/manage');
        return;
      }
      
      setShowPublishModal(true);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      if (editMode || viewMode) {
        if (viewMode || templateData?.status === "Published") {
          navigate('/templates/manage');
        } else {
          navigate('/templates/drafts');
        }
      } else {
        setCurrentStep(1);
      }
    } else {
      navigate(-1);
    }
  };

  const handleEditQuestions = () => {
    setViewMode(false);
    showInfo("You can now edit the template questions.");
  };

  const handleSaveDraft = async () => {
    if (viewMode) return;
    
    if (questions.length === 0) {
      showWarning("Please add at least one question before saving draft");
      return;
    }

    if (!hasChangesToSave) {
      showInfo("No changes to save. All questions are up to date.");
      return;
    }

    setIsSaving(true);
    try {
      // Save new questions
      if (unsavedQuestions.length > 0) {
        await saveMultipleQuestions(templateName, questions);
        const savedIds = unsavedQuestions.map(q => q.id);
        setQuestions(prev => markQuestionsAsSaved(prev, savedIds));
      }

      // Update template status
      await updateTemplateStatus(templateName, "Draft");

      // Clear edited questions set since all changes are now saved
      setEditedQuestions(new Set());

      const totalChanges = unsavedQuestions.length + editedQuestions.size;
      showSuccess(`Draft saved successfully! ${totalChanges} change(s) saved.`);
    } catch (error) {
      console.error("Failed to save draft:", error);
      showError("Failed to save draft. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishConfirm = async () => {
    if (viewMode) return;
    
    const validation = validateTemplate(templateName, questions);
    if (!validation.isValid) {
      showError(validation.errors[0]);
      setShowPublishModal(false);
      return;
    }

    setShowPublishModal(false);
    setIsSaving(true);

    try {
      if (unsavedQuestions.length > 0) {
        await saveMultipleQuestions(templateName, questions);
        const savedIds = unsavedQuestions.map(q => q.id);
        setQuestions(prev => markQuestionsAsSaved(prev, savedIds));
      }

      await updateTemplateStatus(templateName, "Published");
      
      setEditedQuestions(new Set());
      showSuccess("Template published successfully!");
      window.location.href = '/templates/manage';
    } catch (error) {
      console.error("Failed to publish template:", error);
      showError("Failed to publish template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Template actions
  const handleAnalytics = () => {
    navigate("/templates/create/analytics", {
      state: {
        templateData: {
          templateName,
          questions,
          templateId,
          status: templateData?.status || "Published",
        },
      },
    });
  };

  const handleCreateTranslatedClone = () => {
    setShowLanguageSelectionModal(true);
  };

  // Translation handlers
  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    setTranslatedTemplateName(`${templateName} - ${language}`);
  };

  const handleCreateCloneClick = () => {
    if (!selectedLanguage) {
      showError("Please select a language first");
      return;
    }
    setShowLanguageSelectionModal(false);
    setShowTranslateCloneModal(true);
  };

  const handleTranslateCloneConfirm = async () => {
    if (!translatedTemplateName.trim()) {
      showError("Please enter a name for the translated template");
      return;
    }

    setTranslateCloneLoading(true);
    try {
      const translatedTemplate = await createTranslatedClone(
        templateName,
        translatedTemplateName.trim(),
        selectedLanguage
      );

      navigate('/templates/create', {
        state: {
          editMode: true,
          viewMode: false,
          templateData: {
            templateName: translatedTemplate.templateName,
            questions: translatedTemplate.questions,
            templateId: null,
            status: "Draft"
          }
        }
      });

      showSuccess(`${selectedLanguage} template "${translatedTemplateName.trim()}" created successfully!`);
      setShowTranslateCloneModal(false);

    } catch (error) {
      console.error(`Error creating ${selectedLanguage} clone:`, error);
      showError(`Failed to create ${selectedLanguage} clone: ${error.message}`);
    } finally {
      setTranslateCloneLoading(false);
    }
  };

  const handleCloseLanguageSelection = () => {
    setShowLanguageSelectionModal(false);
    setSelectedLanguage("");
  };

  const handleCloseTranslateClone = () => {
    setShowTranslateCloneModal(false);
    setTranslatedTemplateName("");
    setSelectedLanguage("");
  };

  return (
    <>
      <Box
        sx={{
          p: isMobile ? 2 : 4,
          backgroundColor: "#fff",
          width: isMobile ? "90%" : "750px",
          maxHeight: "750px",
          borderRadius: "20px",
          overflowY: "auto",
          overflowX: isMobile ? "auto" : "hidden",
          ...(isMobile && {
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }),
        }}
      >
        <Box>
          {/* Header */}
          <TemplateHeader
            viewMode={viewMode}
            editMode={editMode}
            translateCloneLoading={translateCloneLoading}
            isSaving={isSaving}
            currentStep={currentStep}
            hasChangesToSave={hasChangesToSave}
            unsavedQuestions={unsavedQuestions}
            editedQuestions={editedQuestions}
            onSaveDraft={handleSaveDraft}
            onAnalytics={handleAnalytics}
            onCreateTranslatedClone={handleCreateTranslatedClone}
          />

          {/* Template Name */}
          <TemplateNameField
            templateName={templateName}
            onTemplateNameChange={setTemplateName}
            currentStep={currentStep}
            viewMode={viewMode}
            aiAugmented={aiAugmented}
            onAiAugmentedChange={setAiAugmented}
          />

          {/* Questions Section */}
          <QuestionsSection
            currentStep={currentStep}
            viewMode={viewMode}
            editMode={editMode}
            questions={questions}
            unsavedQuestions={unsavedQuestions}
            editedQuestions={editedQuestions}
            onEditQuestion={handleEditQuestion}
            onDeleteQuestion={deleteQuestion}
            onUpdateRating={updateQuestionRating}
            onUpdateSelection={updateQuestionSelection}
            onUpdateAnswer={updateQuestionAnswer}
            onUpdateAutofill={updateQuestionAutofill}
            onAddRatingQuestion={handleAddRatingQuestion}
            onAddCategoryQuestion={handleAddCategoryQuestion}
            onAddOpenQuestion={handleAddOpenQuestion}
            onAddFlowQuestion={handleAddFlowQuestion}
          />

          {/* Footer */}
          <TemplateFooter
            currentStep={currentStep}
            isLoading={isLoading}
            isSaving={isSaving}
            templateData={templateData}
            viewMode={viewMode}
            onBack={handleBack}
            onNext={handleNext}
            onEditQuestions={handleEditQuestions}
          />

          {/* Question Modals */}
          {!viewMode && (
            <>
              <CategoryQuestionModal
                open={showCategoryModal}
                onClose={() => !isLoading && setShowCategoryModal(false)}
                onSubmit={handleCategorySubmit}
                editingQuestion={editingQuestion}
                disabled={isLoading}
              />

              <RatingQuestionModal
                open={showRatingModal}
                onClose={() => !isLoading && setShowRatingModal(false)}
                onSubmit={handleRatingSubmit}
                editingQuestion={editingQuestion}
                disabled={isLoading}
              />

              <OpenQuestionModal
                open={showOpenModal}
                onClose={() => !isLoading && setShowOpenModal(false)}
                onSubmit={handleOpenSubmit}
                editingQuestion={editingQuestion}
                disabled={isLoading}
              />

              <FlowQuestionModal
                open={showFlowModal}
                onClose={() => !isLoading && setShowFlowModal(false)}
                onSubmit={handleFlowSubmit}
                editingQuestion={editingQuestion}
                disabled={isLoading}
              />

              <PublishConfirmationModal
                open={showPublishModal}
                onClose={() => !isLoading && setShowPublishModal(false)}
                onConfirm={handlePublishConfirm}
                disabled={isLoading}
              />
            </>
          )}

          {/* Translation Modals */}
          <TranslationModals
            showLanguageSelectionModal={showLanguageSelectionModal}
            showTranslateCloneModal={showTranslateCloneModal}
            selectedLanguage={selectedLanguage}
            translatedTemplateName={translatedTemplateName}
            translateCloneLoading={translateCloneLoading}
            templateName={templateName}
            availableLanguages={availableLanguages}
            onLanguageSelect={handleLanguageSelect}
            onCreateCloneClick={handleCreateCloneClick}
            onTranslateCloneConfirm={handleTranslateCloneConfirm}
            onCloseLanguageSelection={handleCloseLanguageSelection}
            onCloseTranslateClone={handleCloseTranslateClone}
            onTranslatedTemplateNameChange={setTranslatedTemplateName}
          />
        </Box>
      </Box>

      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <Box
            sx={{
              backgroundColor: 'white',
              padding: 3,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}
          >
            <CircularProgress size={40} sx={{ color: '#1958F7' }} />
            <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>
              Processing...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={closeAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={closeAlert}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CreateTemplateForm;