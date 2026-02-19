import { useState, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  useMediaQuery,
  Alert,
  Snackbar,
} from "@mui/material";

import { useAlert } from "../../hooks/useAlert";
import { useSurvey, useTemplates } from "../../hooks/Surveys/useSurvey";
import { validateSurveyForm } from "../../utils/Surveys/surveyHelpers";
import GeneratedSurveyDisplay from "./components/GeneratedSurveyDisplay";
import SurveyPropertiesPanel from "./components/SurveyPropertiesPanel";
import ShareSurveyLinkModal from "./components/ShareSurveyLinkModal";

const GeneratedSurveyForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const { alert, showSuccess, showError, closeAlert } = useAlert();

  // Survey and template hooks
  const { generateSurvey, launchSurvey, isGenerating, isLaunching } = useSurvey();
  const { availableTemplates, isLoadingTemplates, fetchTemplates } = useTemplates();

  const surveyData = location.state?.surveyData || {};
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState(surveyData.template || "");
  const [recipientName, setRecipientName] = useState(surveyData.recipient || "");
  const [recipientBiodata, setRecipientBiodata] = useState(surveyData.biodata || "");
  const [questions, setQuestions] = useState(surveyData.questions || []);
  const [showShareModal, setShowShareModal] = useState(false);
  const [surveyLink, setSurveyLink] = useState("");
  const [aiAugmented, setAiAugmented] = useState(true);

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        await fetchTemplates();
      } catch (error) {
        showError(error.message);
      }
    };

    loadTemplates();
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleRegenerate = async () => {
    const validation = validateSurveyForm(selectedTemplate, recipientName, surveyData.riderName, surveyData.rideId, surveyData.tenantId);
    
    if (!validation.isValid) {
      showError(validation.error);
      return;
    }
    
    try {
      const regenerateData = {
        surveyId: surveyData.surveyId,
        template: selectedTemplate,
        recipient: recipientName.trim(),
        riderName: surveyData.riderName,
        rideId: surveyData.rideId,
        tenantId: surveyData.tenantId,
        biodata: recipientBiodata.trim()
      };
      
      const regeneratedSurveyData = await generateSurvey(regenerateData);
      // if (regeneratedSurveyData && regeneratedSurveyData.questions) {
      //   const questionsWithAutofill = regeneratedSurveyData.questions.map(question => ({
      //     ...question,
      //     autofill: question.autofill || "No" 
      //   }));
      //   setQuestions(questionsWithAutofill);
      // showSuccess("Survey regenerated successfully!");
      if (regeneratedSurveyData && regeneratedSurveyData.questions) {
        setQuestions(regeneratedSurveyData.questions);
        showSuccess("Survey regenerated successfully!");
      } else {
        throw new Error("No questions received from the API");
      }
      
    } catch (error) {
      console.error("Failed to regenerate survey:", error);
      showError(error.message || "Failed to regenerate survey. Please try again.");
    }
  };

  const handleLaunchSurvey = async () => {
    if (questions.length === 0) {
      showError("No questions to launch. Please regenerate the survey.");
      return;
    }
    
    try {
      const launchResponse = await launchSurvey(surveyData, questions, aiAugmented);
            
      if (launchResponse.success) {
        setSurveyLink(launchResponse.surveyLink);
        showSuccess(launchResponse.message || "Survey launched successfully!");
        setShowShareModal(true);
      } else {
        throw new Error(launchResponse.message || "Failed to launch survey");
      }
      
    } catch (error) {
      console.error("Failed to launch survey:", error);
      showError(error.message || "Failed to launch survey. Please try again.");
    }
  };

  const handleShareConfirm = () => {
    setShowShareModal(false);
    navigate('/surveys/manage');
  };

  const deleteQuestion = (questionId) => {
    setQuestions(prev => {
      const filteredQuestions = prev.filter(q => q.id !== questionId);
      
      const reorderedQuestions = filteredQuestions
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((question, index) => ({
          ...question,
          order: index + 1
        }));
      
      return reorderedQuestions;
    });
    
    showSuccess("Question removed from survey and order updated");
  };

  const handleAutofillToggle = (questionId, autofillValue) => {
    setQuestions(prev => 
      prev.map(question => 
        question.id === questionId 
          ? { ...question, autofill: autofillValue }
          : question
      )
    );
  };

  // Handler for flow question option selection
  const updateQuestionSelection = (questionId, selectedOption) => {
    setQuestions(prev => 
      prev.map(question => 
        question.id === questionId 
          ? { ...question, selectedOption: selectedOption }
          : question
      )
    );
  };

  console.log("GeneratedSurveyForm - Questions State:", questions);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          p: isMobile ? 2 : 4,
          backgroundColor: "inherit",
          width: isMobile ? "95%" : "100%",
          maxWidth: '1400px',
          maxHeight: "750px",
          overflowY: "auto",
          overflowX: isMobile ? "auto" : "hidden",
          ...(isMobile && {
            flexDirection: 'column',
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }),
        }}
      >
        {/* Left Side - Generated Survey Display */}
        <GeneratedSurveyDisplay
          surveyData={surveyData}
          questions={questions}
          onDeleteQuestion={deleteQuestion}
          onAutofillToggle={handleAutofillToggle}
          onUpdateSelection={updateQuestionSelection}
          showAutofillToggle={true}
        />

        {/* Right Side - Survey Properties Panel */}
        <SurveyPropertiesPanel
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          recipientName={recipientName}
          setRecipientName={setRecipientName}
          recipientBiodata={recipientBiodata}
          setRecipientBiodata={setRecipientBiodata}
          availableTemplates={availableTemplates}
          isLoadingTemplates={isLoadingTemplates}
          onLaunchSurvey={handleLaunchSurvey}
          onRegenerate={handleRegenerate}
          onBack={handleBack}
          isLaunching={isLaunching}
          isGenerating={isGenerating}
          aiAugmented={aiAugmented}
          onAiAugmentedToggle={setAiAugmented}
        />
      </Box>

      {/* Share Survey Link Modal */}
      <ShareSurveyLinkModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        surveyLink={surveyLink}
        onConfirm={handleShareConfirm}
      />

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

export default GeneratedSurveyForm;