import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  useMediaQuery,
  Alert,
  Snackbar,
  CircularProgress,
  Backdrop,
  Typography,
} from "@mui/material";

import { useAlert } from "../../hooks/useAlert";
import { useSurvey, useTemplates } from "../../hooks/Surveys/useSurvey";
import { validateSurveyForm } from "../../utils/Surveys/surveyHelpers";
import GeneratedSurveyDisplay from "./components/GeneratedSurveyDisplay";
import SurveyPropertiesPanel from "./components/SurveyPropertiesPanel";
import SendSurveyDialog from "./components/SendSurveyDialog";

const GeneratedSurveyForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const { alert, showSuccess, showError, closeAlert } = useAlert();
  const autoLaunchProcessed = useRef(false); 

  // Survey and template hooks
  const { 
    generateSurvey, 
    launchSurvey, 
    sendSurveyByEmail, 
    makePhoneCall,
    isGenerating, 
    isLaunching,
    isSendingEmail,
    isMakingCall
  } = useSurvey();
  const { availableTemplates, isLoadingTemplates, fetchTemplates } = useTemplates();

  const surveyData = location.state?.surveyData || {};
  const autoLaunch = location.state?.autoLaunch || false;
  
  // Form state - including all demographic fields
  const [selectedTemplate, setSelectedTemplate] = useState(surveyData.template || "");
  const [recipientName, setRecipientName] = useState(surveyData.recipient || "");
  const [riderName, setRiderName] = useState(surveyData.riderName || "");
  const [rideId, setRideId] = useState(surveyData.rideId || "");
  const [tenantId, setTenantId] = useState(surveyData.tenantId || "");
  const [age, setAge] = useState(surveyData.age || "");
  const [gender, setGender] = useState(surveyData.gender || "");
  const [numOfTrips, setNumOfTrips] = useState(surveyData.numOfTrips || "");
  const [accessibility, setAccessibility] = useState(surveyData.accessibility || "");
  const [recipientBiodata, setRecipientBiodata] = useState(surveyData.biodata || "");
  const [questions, setQuestions] = useState(surveyData.questions || []);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);

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

  useEffect(() => {
    const shouldAutoLaunch = () => {
      return autoLaunch && 
             !autoLaunchProcessed.current && 
             !isLoadingTemplates && 
             questions.length > 0 &&
             !isLaunching;
    };

    if (shouldAutoLaunch()) {
      autoLaunchProcessed.current = true;
      handleLaunchSurvey();
    }
  }, [autoLaunch, isLoadingTemplates, questions, isLaunching]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleRegenerate = async () => {
    const validation = validateSurveyForm(selectedTemplate, recipientName, riderName, rideId, tenantId);
    
    if (!validation.isValid) {
      showError(validation.error);
      return;
    }

    // Validate age if provided
    if (age && (isNaN(age) || parseInt(age) < 0 || parseInt(age) > 150)) {
      showError("Please enter a valid age (0-150)");
      return;
    }

    // Validate number of trips if provided
    if (numOfTrips && (isNaN(numOfTrips) || parseInt(numOfTrips) < 0)) {
      showError("Please enter a valid number of trips (0 or greater)");
      return;
    }
    
    try {
      const regenerateData = {
        surveyId: surveyData.surveyId,
        template: selectedTemplate,
        recipient: recipientName.trim(),
        riderName: riderName.trim(),
        rideId: rideId.trim(),
        tenantId: tenantId.trim(),
        biodata: recipientBiodata.trim(),
        // Include all demographic fields
        age: age ? parseInt(age) : null,
        gender: gender || null,
        numOfTrips: numOfTrips ? parseInt(numOfTrips) : null,
        accessibility: accessibility || null
      };
      
      const regeneratedSurveyData = await generateSurvey(regenerateData);
      
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
      const launchResponse = await launchSurvey(surveyData, questions);
            
      if (launchResponse.success) {
        showSuccess(launchResponse.message || "Survey launched successfully!");
        
        const surveyForDialog = {
          SurveyId: surveyData.surveyId || launchResponse.surveyId,
          Name: selectedTemplate || `Survey ${surveyData.surveyId || launchResponse.surveyId}`,
          email: surveyData.email || "",
          phone: surveyData.phone || ""
        };
        setSelectedSurvey(surveyForDialog);
        setSendDialogOpen(true);
      } else {
        throw new Error(launchResponse.message || "Failed to launch survey");
      }
      
    } catch (error) {
      console.error("Failed to launch survey:", error);
      showError(error.message || "Failed to launch survey. Please try again.");
    }
  };

  const handleSendDialogClose = () => {
    if (!isSendingEmail && !isMakingCall) {
      setSendDialogOpen(false);
      setSelectedSurvey(null);
    }
  };

  const handleSendEmailConfirm = async (email) => {
    try {
      await sendSurveyByEmail(
        selectedSurvey.SurveyId, 
        email, 
        selectedSurvey.Name
      );
      
      showSuccess(`Survey "${selectedSurvey.Name}" sent successfully to ${email}`);
      
      // Navigate to surveys manage after successful send
      setTimeout(() => {
        navigate('/surveys/manage');
      }, 2000);
    } catch (error) {
      console.error('Error sending email:', error);
      showError('Failed to send survey via email. Please try again.');
    } finally {
      setSendDialogOpen(false);
      setSelectedSurvey(null);
    }
  };

  const handleSendPhoneConfirm = async (phone, runAt = null) => {
    try {
      await makePhoneCall(
        selectedSurvey.SurveyId, 
        phone,
        runAt
      );
      
      const message = runAt 
        ? `Phone call scheduled successfully for ${runAt}` 
        : `Phone call initiated successfully to ${phone}`;
      
      showSuccess(message);
      
      // Navigate to surveys manage after successful call
      setTimeout(() => {
        navigate('/surveys/manage');
      }, 2000);
    } catch (error) {
      console.error('Error making phone call:', error);
      showError('Failed to initiate phone call. Please try again.');
    } finally {
      setSendDialogOpen(false);
      setSelectedSurvey(null);
    }
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

  const showCenterLoading = isLaunching && (autoLaunch || questions.length > 0);

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
          riderName={riderName}
          setRiderName={setRiderName}
          rideId={rideId}
          setRideId={setRideId}
          tenantId={tenantId}
          setTenantId={setTenantId}
          age={age}
          setAge={setAge}
          gender={gender}
          setGender={setGender}
          numOfTrips={numOfTrips}
          setNumOfTrips={setNumOfTrips}
          accessibility={accessibility}
          setAccessibility={setAccessibility}
          recipientBiodata={recipientBiodata}
          setRecipientBiodata={setRecipientBiodata}
          availableTemplates={availableTemplates}
          isLoadingTemplates={isLoadingTemplates}
          onLaunchSurvey={handleLaunchSurvey}
          onRegenerate={handleRegenerate}
          onBack={handleBack}
          isLaunching={isLaunching}
          isGenerating={isGenerating}
        />
      </Box>

      {/* Center Loading Backdrop */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }}
        open={showCenterLoading}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress 
            color="primary" 
            size={60}
            thickness={4}
          />
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'white',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500
            }}
          >
            Launching Survey...
          </Typography>
        </Box>
      </Backdrop>

      {/* Send Survey Dialog */}
      <SendSurveyDialog
        open={sendDialogOpen}
        onClose={handleSendDialogClose}
        onConfirmEmail={handleSendEmailConfirm}
        onConfirmPhone={handleSendPhoneConfirm}
        surveyId={selectedSurvey?.SurveyId}
        surveyName={selectedSurvey?.Name}
        initialEmail={selectedSurvey?.email || ""}
        initialPhone={selectedSurvey?.phone || ""}
        isSendingEmail={isSendingEmail}
        isSendingPhone={isMakingCall}
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