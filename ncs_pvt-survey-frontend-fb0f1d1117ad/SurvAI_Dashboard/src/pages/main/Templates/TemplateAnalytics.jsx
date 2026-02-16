"use client";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  useMediaQuery,
  IconButton,
  Chip,
} from "@mui/material";
import { FilterList } from '@mui/icons-material';
import { ChevronLeft } from "lucide-react";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import AnalyticsFilterModal from "../../../components/Template/components/AnalyticsFilterModal";
import { useTemplateAnalytics } from "../../../hooks/useTemplateAnalytics";
import { getFilterChips } from "../../../utils/Templates/templateAnalyticsHelper";
import DemographicsStats from "../../../components/Template/components/DemographicsStats";
import SurveyStats from "../../../components/Template/components/SurveyStats";
import QuestionStats from "../../../components/Template/components/QuestionStats";

export default function SurveyQuestionAnalytics() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 600px)');

  const [templateData, setTemplateData] = useState(null);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Tab state
  const [activeTab, setActiveTab] = useState('questions');

  // Filter state
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Use custom hook for analytics data and logic
  const {
    questionsData,
    currentQuestionIndex,
    currentResponseIndex,
    loading,
    loadingFiltered,
    demographics,
    loadingDemographics,
    surveyStats,
    loadingSurveyStats,
    currentSurveyIndex,
    currentSurveyData,
    currentSurveyQuestions,
    currentSurveyCallInfo,
    loadingCurrentSurvey,
    appliedFilters,
    handlePrevQuestion,
    handleNextQuestion,
    handlePrevResponse,
    handleNextResponse,
    handlePrevSurvey,
    handleNextSurvey,
    handleApplyFilters,
    clearFilters,
  } = useTemplateAnalytics(templateData, activeTab);

  useEffect(() => {
    if (location.state?.templateData) {
      setTemplateData(location.state.templateData);
    } else {
      setError("No template data available. Please return to the template page.");
    }
  }, [location.state]);

  const showAlert = (message, severity = "info") => {
    setAlert({ open: true, message, severity });
  };

  const closeAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const filterChips = getFilterChips(appliedFilters);

  if (loading && activeTab === 'questions' && questionsData.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? 'column' : 'row',
          height: "100vh",
          bgcolor: "#F8FAFC",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {isMobile ? <Header /> : <Sidebar />}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              backgroundColor: "white",
              padding: 4,
              borderRadius: 2,
              boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CircularProgress size={40} sx={{ color: "#1958F7" }} />
            <Typography>Loading analytics data...</Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (error || !templateData) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? 'column' : 'row',
          height: "100vh",
          bgcolor: "#F8FAFC",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {isMobile ? <Header /> : <Sidebar />}
        <Box sx={{ flexGrow: 1, p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || "No template data available"}
          </Alert>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        width: "90%",
        flexDirection: isMobile ? 'column' : 'row',
        height: "100vh",
        bgcolor: "#F8FAFC",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <Box
        sx={{
          backgroundColor: '#F9FBFC',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          p: isMobile ? 2 : 4,
        }}
      >
        <Box
          sx={{
            height: isMobile ? 'calc(90vh - 64px)' : '100vh',
            overflow: 'auto',
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.08)",
            p: 4,
          }}
        >
          {/* Header with title and filter icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography
              sx={{
                fontSize: "18px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
              }}
            >
              {templateData.templateName}
            </Typography>

            {activeTab === 'questions' && (
              <IconButton
                onClick={() => setFilterModalOpen(true)}
                sx={{
                  bgcolor: '#F3F4F6',
                  '&:hover': {
                    bgcolor: '#E5E7EB',
                  },
                }}
              >
                <FilterList sx={{ color: '#6B7280' }} />
              </IconButton>
            )}
          </Box>

          {/* Filter chips */}
          {activeTab === 'questions' && filterChips.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '14px', color: '#6B7280', mr: 1 }}>
                Active filters:
              </Typography>
              {filterChips.map((chip) => (
                <Chip
                  key={chip.key}
                  label={chip.label}
                  size="small"
                  sx={{
                    backgroundColor: '#E0F2FE',
                    color: '#0369A1',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '12px',
                  }}
                />
              ))}
              <Button
                size="small"
                onClick={clearFilters}
                sx={{
                  textTransform: 'none',
                  fontSize: '12px',
                  color: '#EF4444',
                  fontFamily: 'Poppins, sans-serif',
                  minWidth: 'auto',
                  p: 0,
                }}
              >
                Clear all
              </Button>
            </Box>
          )}

          {/* Tabs */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant={activeTab === 'questions' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('questions')}
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                fontFamily: 'Poppins, sans-serif',
                backgroundColor: activeTab === 'questions' ? '#EFEFFD' : '#FFFFFF',
                color: activeTab === 'questions' ? '#1958F7' : '#4B4B4B',
                border: activeTab === 'questions' ? 'none' : '1px solid #F0F0F0',
                boxShadow: 'none',
              }}
            >
              Question Stats
            </Button>
            <Button
              variant={activeTab === 'surveys' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('surveys')}
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                fontFamily: 'Poppins, sans-serif',
                backgroundColor: activeTab === 'surveys' ? '#EFEFFD' : '#FFFFFF',
                color: activeTab === 'surveys' ? '#1958F7' : '#4B4B4B',
                border: activeTab === 'surveys' ? 'none' : '1px solid #F0F0F0',
                boxShadow: 'none',
              }}
            >
              Survey Stats
            </Button>
            <Button
              variant={activeTab === 'demographics' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('demographics')}
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                fontFamily: 'Poppins, sans-serif',
                backgroundColor: activeTab === 'demographics' ? '#EFEFFD' : '#FFFFFF',
                color: activeTab === 'demographics' ? '#1958F7' : '#4B4B4B',
                border: activeTab === 'demographics' ? 'none' : '1px solid #F0F0F0',
                boxShadow: 'none',
              }}
            >
              Demographics Stats
            </Button>
          </Box>

          {/* Tab Content */}
          {activeTab === 'questions' && (
            <QuestionStats
              questionsData={questionsData}
              currentQuestionIndex={currentQuestionIndex}
              currentResponseIndex={currentResponseIndex}
              loading={loading}
              loadingFiltered={loadingFiltered}
              onPrevQuestion={handlePrevQuestion}
              onNextQuestion={handleNextQuestion}
              onPrevResponse={handlePrevResponse}
              onNextResponse={handleNextResponse}
            />
          )}

          {activeTab === 'surveys' && (
            <SurveyStats
              surveyStats={surveyStats}
              currentSurveyIndex={currentSurveyIndex}
              currentSurveyData={currentSurveyData}
              currentSurveyQuestions={currentSurveyQuestions}
              currentSurveyCallInfo={currentSurveyCallInfo}
              loading={loadingSurveyStats}
              loadingCurrentSurvey={loadingCurrentSurvey}
              onPrevSurvey={handlePrevSurvey}
              onNextSurvey={handleNextSurvey}
            />
          )}

          {activeTab === 'demographics' && (
            <DemographicsStats
              demographics={demographics}
              loading={loadingDemographics}
            />
          )}

          <Button
            variant="outlined"
            sx={{
              mt: 4,
              px: 4,
              borderRadius: "8px",
              textTransform: "none",
              borderColor: "#D1D5DB",
              color: "#374151",
              fontFamily: "Poppins, sans-serif",
              "&:hover": {
                borderColor: "#D1D5DB",
                backgroundColor: "#F9FAFB",
              },
            }}
            startIcon={<ChevronLeft />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </Box>

        {/* Filter Modal */}
        <AnalyticsFilterModal
          open={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          onApplyFilters={handleApplyFilters}
          currentFilters={appliedFilters}
        />

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
    </Box>
  );
}