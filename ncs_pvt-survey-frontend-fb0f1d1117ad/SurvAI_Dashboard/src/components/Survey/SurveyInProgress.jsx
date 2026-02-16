import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  useMediaQuery,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";

import { useAlert } from "../../hooks/useAlert";
import SurveyResultsDisplay from "./components/SurveyResultsDisplay";
import SurveyMainInfoPanel from "./components/SurveyMainInfoPanel";
import DeleteSurveyDialog from "./components/DeleteSurveyDialog";
import SendSurveyDialog from "./components/SendSurveyDialog";
import { useSurvey } from "../../hooks/Surveys/useSurvey";
import { parseSurveyInfo } from "../../utils/Surveys/surveyHelpers";

const SurveyInProgress = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const { alert, showSuccess, showError, closeAlert } = useAlert();

  // Survey hooks
  const { 
    fetchSurveyQuestions, 
    deleteSurvey, 
    sendSurveyByEmail, 
    sendSurveyBySMS,
    makePhoneCall,
    fetchSurveyRecipient,
    fetchCallStatus,
    submitPartialPhoneQNA,
    isDeleting,
    isSendingEmail,
    isSendingSMS,
    isMakingCall
  } = useSurvey();

  const surveyData = location.state?.surveyData || {};
  const returnPage = location.state?.returnPage || 1;
  const returnPath = location.state?.returnPath || '/surveys/manage';
  
  // Component state
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [callInfo, setCallInfo] = useState(null);

  const surveyInfo = {
    ...parseSurveyInfo(surveyData, surveyId),
    age: surveyData.age,
    gender: surveyData.gender,
    numOfTrips: surveyData.numOfTrips,
    accessibility: surveyData.accessibility,
    callTime: callInfo?.CallTime || null,
    callNumber: callInfo?.CallNumber || null,
    callEndedAt: callInfo?.endedAt || null,
    callEndedReason: callInfo?.endedReason || null,
    callStatus: callInfo?.status || null,
    callDuration: callInfo?.duration || null
  };

  
  const isCompleted = surveyInfo.status.toLowerCase() === 'completed';

  useEffect(() => {
    const loadSurveyData = async () => {
      if (!surveyInfo.surveyId) {
        showError("Survey ID not found");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const transformedQuestions = await fetchSurveyQuestions(surveyInfo.surveyId);
        setQuestions(transformedQuestions);

        try {
          const recipientData = await fetchSurveyRecipient(surveyInfo.surveyId);
          
          const callStatusData = await fetchCallStatus(surveyInfo.surveyId);
          
          const combinedCallInfo = {
            CallTime: recipientData?.CallTime || null,
            CallNumber: recipientData?.CallNumber || null,
            endedAt: callStatusData?.endedAt || null,
            endedReason: callStatusData?.endedReason || null,
            status: callStatusData?.status || null,
            duration: callStatusData?.duration || null
          };

          setCallInfo(combinedCallInfo);
          if (
            callStatusData?.endedReason === "customer-ended-call" &&
            surveyData?.Status === "In-Progress" &&
            recipientData?.CallTime &&
            recipientData?.CallTime !== "None"
          ) {
            console.log("Conditions met for partial phone QNA. Calling API...");
            try {
              await submitPartialPhoneQNA(surveyInfo.surveyId);
            } catch (error) {
              console.error("Failed to submit partial phone QNA:", error);
            }
          }
        } catch (error) {
          console.warn("Could not fetch call information:", error);
        }
      } catch (error) {
        showError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSurveyData();
  }, [surveyInfo.surveyId]);

  const handleBack = () => {
    navigate(returnPath, {
      state: {
        page: returnPage
      }
    });
  };

  const handleDeleteSurvey = () => {
    setConfirmOpen(true);
  };

  const confirmDeleteSurvey = async () => {
    setConfirmOpen(false);

    try {
      await deleteSurvey(surveyInfo.surveyId);
      showSuccess("Survey deleted successfully!");
      navigate("/surveys/manage");
    } catch (error) {
      console.error("Failed to delete survey:", error);
      showError("Failed to delete survey. Please try again.");
    }
  };

  const handleSendSurvey = (surveyInfo) => {
    // Convert surveyInfo to the format expected by SendSurveyDialog
    const surveyForDialog = {
      SurveyId: surveyInfo.surveyId,
      Name: surveyInfo.templateName || `Survey ${surveyInfo.surveyId}`
    };
    setSelectedSurvey(surveyForDialog);
    setSendDialogOpen(true);
  };

  const handleSendDialogClose = () => {
    if (!isSendingEmail && !isSendingSMS) {
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
    } catch (error) {
      console.error('Error making phone call:', error);
      showError('Failed to initiate phone call. Please try again.');
    } finally {
      setSendDialogOpen(false);
      setSelectedSurvey(null);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "inherit",
        }}
      >
        <CircularProgress size={30} sx={{ color: "#1958F7" }} />
      </Box>
    );
  }

  console.log("Rendering SurveyInProgress with surveyInfo:", surveyInfo, "questions:", questions);

  return (
    <Box
      sx={{
        width: isMobile ? "95%" : "100%",
        maxWidth: "1400px",
        backgroundColor: "inherit",
      }}
    >
      {/* Page Header */}
      <Box
        sx={{
          px: isMobile ? 2 : 4,
          pt: isMobile ? 2 : 4,
          mb: 4,
        }}
      >
        <Typography
          sx={{
            fontFamily: "Poppins",
            fontWeight: 500,
            fontSize: "28px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#1e1e1e",
          }}
        >
          Survey {surveyInfo.templateName} Results
        </Typography>
      </Box>
      
      {/* Main Content */}
      <Box
        sx={{
          display: "flex",
          gap: 3,
          p: isMobile ? 2 : 4,
          pt: 0,
          backgroundColor: "inherit",
          maxHeight: "750px",
          overflowY: "auto",
          overflowX: isMobile ? "auto" : "hidden",
          ...(isMobile && {
            flexDirection: "column",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }),
        }}
      >
        {/* Left Side - Survey Results */}
        <SurveyResultsDisplay 
          questions={questions} 
          allowFlowInteraction={true}
        />

        {/* Right Side - Main Information */}
        <SurveyMainInfoPanel
          surveyInfo={surveyInfo}
          isCompleted={isCompleted}
          isDeleting={isDeleting}
          onBack={handleBack}
          onDeleteSurvey={handleDeleteSurvey}
          onSendSurvey={handleSendSurvey}
        />
      </Box>

      {/* Delete Confirmation Dialog */}
      <DeleteSurveyDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDeleteSurvey}
        surveyId={surveyInfo.surveyId}
        isDeleting={isDeleting}
      />

      {/* Send Survey Dialog */}
      <SendSurveyDialog
        open={sendDialogOpen}
        onClose={handleSendDialogClose}
        onConfirmEmail={handleSendEmailConfirm}
        onConfirmPhone={handleSendPhoneConfirm}
        surveyId={selectedSurvey?.SurveyId}
        surveyName={selectedSurvey?.Name}
        isSendingEmail={isSendingEmail}
        isSendingPhone={isMakingCall}
      />

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={closeAlert}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={closeAlert}
          severity={alert.severity}
          sx={{ width: "100%" }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SurveyInProgress;