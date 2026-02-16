import React, { useState } from "react";
import {
  Box,
  useMediaQuery,
  Snackbar,
  Alert,
} from "@mui/material";
import SearchBar from "../sharedTableComponents/SearchBar";
import MobileTableCard from "./components/MobileTableCard";
import DesktopTable from "./components/DesktopTable";
import TablePagination from "../sharedTableComponents/TablePagination";
import { useSurvey } from "../../hooks/Surveys/useSurvey";
import SendSurveyDialog from "../Survey/components/SendSurveyDialog";

const DashboardTable = ({ 
  tableData = [], 
  pagination, 
  onPageChange, 
  onPageSizeChange, 
  onRowClick,
  onSort,
  onSearch,
  currentSortBy,
  currentSortOrder 
}) => {  
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const isMobile = useMediaQuery("(max-width: 600px)");

  const { 
    sendSurveyByEmail, 
    sendSurveyBySMS, 
    makePhoneCall,
    isSendingEmail, 
    isSendingSMS,
    isMakingCall
  } = useSurvey();

  const SORT_FIELD_MAP = {
    'launch_date': 'LaunchDate',
    'name': 'Name',
    'recipient': 'Recipient',
    'status': 'Status',
    'id': 'SurveyId'
  };

  const currentOrderBy = SORT_FIELD_MAP[currentSortBy] || 'LaunchDate';
  const currentOrder = currentSortOrder || 'desc';

  const handleSort = (property) => {
    if (onSort) {
      onSort(property);
    }
  };

  const handleSearchChange = (newSearchValue) => {
    setSearchValue(newSearchValue);
    if (onSearch) {
      onSearch(newSearchValue);
    }
  };

  const handleRowClick = (item) => {
    console.log('Row clicked:', item);
    if (onRowClick) {
      console.log('Calling onRowClick with:', item);
      onRowClick(item);
    } else {
      console.log('No onRowClick function provided');
    }
  };

  const handleSendEmail = (item) => {
    setSelectedSurvey(item);
    setSendDialogOpen(true);
  };

  const handleSendPhone = (item) => {
    setSelectedSurvey(item);
    setSendDialogOpen(true);
  };

  const handleSendDialogClose = () => {
    if (!isSendingEmail && !isSendingSMS && !isMakingCall) {
      setSendDialogOpen(false);
      setSelectedSurvey(null);
    }
  };

  const handleSendEmailConfirm = async (email) => {
    try {
      const result = await sendSurveyByEmail(
        selectedSurvey.SurveyId, 
        email, 
        selectedSurvey.Name
      );
      
      console.log('Email send result:', result);
      
      setSuccessMessage(`Survey "${selectedSurvey.Name}" sent successfully to ${email}`);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSendDialogOpen(false);
      setSelectedSurvey(null);
    }
  };

  const handleSendPhoneConfirm = async (phone, runAt = null) => {
    try {
      const result = await makePhoneCall(
        selectedSurvey.SurveyId, 
        phone,
        runAt
      );
      
      console.log('Phone call result:', result);
      
      const message = runAt 
        ? `Phone call scheduled successfully for ${runAt}` 
        : `Phone call initiated successfully to ${phone}`;
      
      setSuccessMessage(message);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error making phone call:', error);
    } finally {
      setSendDialogOpen(false);
      setSelectedSurvey(null);
    }
  };

  const handleSuccessClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowSuccess(false);
  };

  const handlePageChangeWrapper = (newPage) => {
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  const handlePageSizeChangeWrapper = (newPageSize) => {
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        p: isMobile ? 2 : 4,
        borderRadius: "20px",
      }}
    >
      <SearchBar
        title="Active Surveys"
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        placeholder="Search survey"
      />

      {isMobile ? (
        <Box>
          {tableData.map((item) => (
            <MobileTableCard
              key={item.SurveyId}
              item={item}
              onItemClick={handleRowClick}
              onSendEmail={handleSendEmail}
              onSendPhone={handleSendPhone}
            />
          ))}
        </Box>
      ) : (
        <DesktopTable
          data={tableData}
          onItemClick={handleRowClick}
          orderBy={currentOrderBy}
          order={currentOrder}
          onSort={handleSort}
          onSendEmail={handleSendEmail}
          onSendPhone={handleSendPhone}
        />
      )}

      <TablePagination
        rowsPerPage={pagination?.page_size || 10}
        onRowsPerPageChange={handlePageSizeChangeWrapper}
        page={pagination?.current_page || 1}
        onPageChange={handlePageChangeWrapper}
        totalItems={pagination?.total_count || 0}
      />

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

      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSuccessClose}
          severity="success"
          variant="filled"
          sx={{ width: '100%', background: "#EFEFFD", color: "#1958F7" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardTable;