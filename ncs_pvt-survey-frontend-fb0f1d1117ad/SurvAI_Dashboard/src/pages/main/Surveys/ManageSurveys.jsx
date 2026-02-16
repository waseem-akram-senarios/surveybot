import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, useMediaQuery, CircularProgress, Backdrop } from "@mui/material";
import Cards from "../../../components/Cards";
import DashboardTable from "../../../components/SurveyTable/SurveyTable";
import { useManageSurveys } from "../../../hooks/Surveys/useSurveyTable";
import { useLocation } from 'react-router-dom';

const ManageSurveys = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const pageRestored = useRef(false);

  const {
    statsData,
    tableData,
    pagination,
    sortBy,
    sortOrder,
    statsLoading,
    tableLoading,
    statsError,
    tableError,
    globalLoading,
    handlePageChange,
    handlePageSizeChange,
    handleSort,
    handleSearch,
  } = useManageSurveys();

  const handleSurveyClick = (surveyData) => {
    console.log("Navigating to survey results for:", surveyData);
    navigate(`/surveys/status/${surveyData.SurveyId}`, {
      state: {
        surveyData,
        returnPage: pagination.current_page,
        returnPath: window.location.pathname
      },
    });
  };

  useEffect(() => {
    if (location.state?.page && !pageRestored.current) {
      pageRestored.current = true;
      handlePageChange(location.state.page);
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.page, handlePageChange]);

  if (globalLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: "#F9FBFC",
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        p: isMobile ? 2 : 4,
      }}
    >
      <Cards
        headerTitle="Manage Surveys"
        statsData={statsData}
        loading={statsLoading}
        error={statsError}
      />
      
      <DashboardTable
        tableData={tableData}
        pagination={pagination}
        loading={tableLoading}
        error={tableError}
        onRowClick={handleSurveyClick}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onSearch={handleSearch}
        currentSortBy={sortBy}
        currentSortOrder={sortOrder}
      />

      {tableLoading && !globalLoading && (
        <Backdrop
          sx={{
            color: "#fff",
            zIndex: (theme) => theme.zIndex.drawer + 1,
            position: "absolute",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            borderRadius: "20px",
          }}
          open={true}
        >
          <CircularProgress sx={{ color: "#1958F7" }} />
        </Backdrop>
      )}
    </Box>
  );
};

export default ManageSurveys;
