import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  useMediaQuery,
  CircularProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import Cards from '../../../components/Cards';
import DraftTable from '../../../components/TemplateTables/DraftTable';
import { useDraftTemplates } from '../../../hooks/Templates/useTemplateTable';
import { useLocation } from 'react-router-dom';

const DraftTemplates = () => {
  const {
    statsData,
    draftsData,
    pagination,
    sortBy,
    sortOrder,
    search,
    loading,
    error,
    fetchData,
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleSearchChange,
  } = useDraftTemplates();

  const [navigationLoading, setNavigationLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const isMobile = useMediaQuery("(max-width: 600px)");
  const location = useLocation();
  const pageRestored = useRef(false);

  useEffect(() => {
    if (location.state?.page && !pageRestored.current) {
      pageRestored.current = true;
      handlePageChange(location.state.page);
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.page, handlePageChange]);

  // Set initialLoading to false after first load
  useEffect(() => {
    if (!loading && initialLoading) {
      setInitialLoading(false);
    }
  }, [loading, initialLoading]);

  const handleDataRefresh = () => {
    fetchData();
  };

  if (navigationLoading) {
    return (
      <Box sx={{
        backgroundColor: '#F9FBFC',
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        ...(isMobile && {
          minHeight: 'calc(100vh - 64px)',
        })
      }}>
        <CircularProgress size={60} sx={{ color: '#1958F7' }} />
      </Box>
    );
  }

  // Only show full-screen loading on initial page load
  if (initialLoading && loading) {
    return (
      <Box sx={{
        backgroundColor: '#F9FBFC',
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: isMobile ? 2 : 4,
        ...(isMobile && {
          minHeight: 'calc(100vh - 64px)',
        })
      }}>
        <CircularProgress size={60} sx={{ color: '#1958F7' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{
        backgroundColor: '#F9FBFC',
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: isMobile ? 2 : 4,
        ...(isMobile && {
          minHeight: 'calc(100vh - 64px)',
        })
      }}>
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          <AlertTitle>Error Loading Data</AlertTitle>
          {error}
        </Alert>
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
    }}>
      <Cards headerTitle="Campaign Drafts" statsData={statsData} loading={false} error={error} />
      <DraftTable 
        draftsData={draftsData} 
        pagination={pagination}
        loading={loading && !initialLoading}
        error={error} 
        onTemplateDeleted={handleDataRefresh}
        onDataRefresh={handleDataRefresh}
        setNavigationLoading={setNavigationLoading}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSortChange={handleSortChange}
        onSearchChange={handleSearchChange}
        currentSortBy={sortBy}
        currentSortOrder={sortOrder}
        currentSearch={search}
      />
    </Box>
  );
}

export default DraftTemplates;