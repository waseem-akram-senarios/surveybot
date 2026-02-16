import React from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  useMediaQuery,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SurveyResultsDisplay from '../../../components/Survey/components/SurveyResultsDisplay';
import SurveyMainInfoPanel from '../../../components/Survey/components/SurveyMainInfoPanel';
import { parseSurveyInfo } from '../../../utils/Templates/templateAnalyticsHelper';

const SurveyStats = ({
  surveyStats,
  currentSurveyIndex,
  currentSurveyData,
  currentSurveyQuestions,
  currentSurveyCallInfo,
  loading,
  loadingCurrentSurvey,
  onPrevSurvey,
  onNextSurvey,
}) => {
  const isMobile = useMediaQuery('(max-width: 600px)');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} sx={{ color: '#1958F7' }} />
      </Box>
    );
  }

  if (!surveyStats || surveyStats.CompletedSurveysIds?.length === 0) {
    return <Alert severity="info">No surveys found for this template</Alert>;
  }

  console.log("currentSurveyCallInfo", currentSurveyCallInfo)

  return (
    <Box>
      {/* Survey Navigation */}
      {surveyStats.CompletedSurveysIds.length > 0 && (
        <Box
          sx={{
            backgroundColor: '#F9F9F9',
            borderRadius: '8px',
            boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            mb: 4,
          }}
        >
          <ChevronLeft
            style={{
              cursor: currentSurveyIndex > 0 ? 'pointer' : 'not-allowed',
              opacity: currentSurveyIndex > 0 ? 1 : 0.3,
              color: '#4B5563',
            }}
            onClick={onPrevSurvey}
          />
          <Typography sx={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>
            Survey {currentSurveyIndex + 1} of {surveyStats.CompletedSurveysIds.length}
          </Typography>
          <ChevronRight
            style={{
              cursor:
                currentSurveyIndex < surveyStats.CompletedSurveysIds.length - 1
                  ? 'pointer'
                  : 'not-allowed',
              opacity:
                currentSurveyIndex < surveyStats.CompletedSurveysIds.length - 1 ? 1 : 0.3,
              color: '#4B5563',
            }}
            onClick={onNextSurvey}
          />
        </Box>
      )}

      {/* Individual Survey Display */}
      {loadingCurrentSurvey ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} sx={{ color: '#1958F7' }} />
        </Box>
      ) : currentSurveyData ? (
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            backgroundColor: 'inherit',
            ...(isMobile && {
              flexDirection: 'column',
            }),
          }}
        >
          {/* Left Side - Survey Results */}
          <SurveyResultsDisplay
            questions={currentSurveyQuestions}
            allowFlowInteraction={false}
          />

          {/* Right Side - Main Information */}
          <SurveyMainInfoPanel
            surveyInfo={{
              ...parseSurveyInfo(
                currentSurveyData,
                surveyStats.CompletedSurveysIds[currentSurveyIndex]
              ),
              callTime: currentSurveyCallInfo?.CallTime || null,
              callNumber: currentSurveyCallInfo?.CallNumber || null,
              callEndedAt: currentSurveyCallInfo?.endedAt || null,
              callEndedReason: currentSurveyCallInfo?.endedReason || null,
              callStatus: currentSurveyCallInfo?.status || null,
              callDuration: currentSurveyCallInfo?.duration || null
            }}
            isCompleted={currentSurveyData.Status?.toLowerCase() === 'completed'}
            isDeleting={false}
            onBack={() => {}}
            onDeleteSurvey={() => {}}
            onSendSurvey={() => {}}
            hideActions={true}
          />
        </Box>
      ) : (
        <Alert severity="info">No survey data available</Alert>
      )}
    </Box>
  );
};

export default SurveyStats;