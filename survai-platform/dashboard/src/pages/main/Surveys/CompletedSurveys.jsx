import React from 'react';
import {
  Box,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import Cards from '../../../components/Cards';
import DashboardTable from '../../../components/SurveyTable/SurveyTable';
import { useNavigate } from 'react-router-dom';
import { useCompletedSurveys } from '../../../hooks/Surveys/useSurveyTable';

const CompletedSurveys = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 600px)');
  const {
    statsData,
    tableData,
    statsLoading,
    tableLoading,
    statsError,
    tableError,
    globalLoading,
    refetchStats,
    refetchTable,
  } = useCompletedSurveys();

  const handleSurveyClick = (surveyData) => {
    console.log('Navigating to survey results for:', surveyData);
    
    navigate(`/surveys/status/${surveyData.SurveyId}`, {
      state: { surveyData }
    });
  };

  if (globalLoading) {
    return (
      <Box sx={{
        backgroundColor: '#F9FBFC',
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...(isMobile && {
          minHeight: 'calc(100vh - 64px)',
        })
      }}>
        <CircularProgress size={60} sx={{ color: '#1958F7' }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      backgroundColor: '#F9FBFC', 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      p: isMobile ? 2 : 4,
      ...(isMobile && {
        minHeight: 'calc(100vh - 64px)',
        overflow: 'auto'
      })
    }}>
      <Cards 
        headerTitle='Completed Surveys'
        statsData={statsData} 
        loading={statsLoading} 
        error={statsError} 
      />
      <DashboardTable 
        tableData={tableData} 
        loading={tableLoading} 
        error={tableError}
        onRowClick={handleSurveyClick}
        onDataChange={() => { refetchStats(); refetchTable(); }}
      />
    </Box>
  );
};

export default CompletedSurveys;