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
import { filterData, paginateData, sortData } from "../../utils/Surveys/surveyTableHelpers";
import { useSurvey } from "../../hooks/Surveys/useSurvey";
import SendSurveyDialog from "../Survey/components/SendSurveyDialog";

const DashboardTable = ({ tableData = [], onRowClick }) => {  
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("LaunchDate");
  const [order, setOrder] = useState("desc");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  const isMobile = useMediaQuery("(max-width: 600px)");

  const { 
    sendSurveyByEmail, 
    sendSurveyBySMS, 
    isSendingEmail, 
    isSendingSMS 
  } = useSurvey();

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
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
    if (!isSendingEmail && !isSendingSMS) {
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
      
      console.log('Email send result:', result); // Debug log
      
      // Show success message if no error was thrown
      setSuccessMessage(`Survey "${selectedSurvey.Name}" sent successfully to ${email}`);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error sending email:', error);
      // You might want to show an error toast/notification here
    } finally {
      setSendDialogOpen(false);
      setSelectedSurvey(null);
    }
  };

  const handleSendPhoneConfirm = async (phone, provider = "vapi") => {
    try {
      const result = await sendSurveyBySMS(
        selectedSurvey.SurveyId, 
        phone, 
        provider
      );
      
      console.log('SMS send result:', result); // Debug log
      
      // Show success message if no error was thrown
      setSuccessMessage(`Survey "${selectedSurvey.Name}" sent successfully to ${phone}`);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error sending SMS:', error);
      // You might want to show an error toast/notification here
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

  // Data processing
  const filteredData = filterData(tableData, search);
  const sortedData = sortData(filteredData, orderBy, order);
  const paginatedData = paginateData(sortedData, page, rowsPerPage);

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
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search survey"
      />

      {isMobile ? (
        <Box>
          {paginatedData.map((item) => (
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
          data={paginatedData}
          onItemClick={handleRowClick}
          orderBy={orderBy}
          order={order}
          onSort={handleSort}
          onSendEmail={handleSendEmail}
          onSendPhone={handleSendPhone}
        />
      )}

      <TablePagination
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        page={page}
        onPageChange={setPage}
        totalItems={sortedData.length}
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
        isSendingPhone={isSendingSMS}
      />

      {/* Success Message Snackbar */}
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