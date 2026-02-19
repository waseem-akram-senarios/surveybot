import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  TableSortLabel,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import { truncateText, formatDate } from '../../../utils/Surveys/surveyTableHelpers';
import SendSurveyButton from '../../../assets/SendSurvey.svg';

const DesktopTable = ({ 
  data, 
  onItemClick, 
  orderBy, 
  order, 
  onSort,
  onSendEmail,
}) => {
  const columns = [
    { id: "SurveyId", label: "ID", sortable: true },
    { id: "Name", label: "Name", sortable: true },
    { id: "LaunchDate", label: "Launch Date", sortable: true },
    { id: "URL", label: "URL", sortable: false },
    { id: "Recipient", label: "Recipient", sortable: true },
    { id: "Status", label: "Status", sortable: true },
    { id: "Actions", label: "Actions", sortable: false },
  ];

  const handleRowClick = (item, e) => {
    // Prevent row click when clicking action buttons
    if (e.target.closest('.action-buttons')) {
      return;
    }
    onItemClick(item);
  };

  const handleSendEmail = (item, e) => {
    e.stopPropagation();
    onSendEmail(item);
  };

  return (
    <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
      <Table sx={{ borderCollapse: "separate" }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  color: "#4B4B4B",
                }}
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : "asc"}
                    onClick={() => onSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item) => (
            <TableRow 
              key={item.SurveyId} 
              hover
              onClick={(e) => handleRowClick(item, e)}
              sx={{
                height: "48px",
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "#f8f9fa",
                },
                "& td": {
                  height: "48px",
                  minHeight: "48px",
                  maxHeight: "48px",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  lineHeight: "100%",
                  color: "#4B4B4B",
                  borderBottom: "1px solid #F0F0F0",
                },
              }}
            >
              <TableCell>{item.SurveyId}</TableCell>
              <TableCell>{item.Name}</TableCell>
              <TableCell>{formatDate(item.LaunchDate)}</TableCell>
              <TableCell>
                {item.URL ? (
                  <a
                    href={item.URL.startsWith("http") ? item.URL : `https://${item.URL}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: item.Status === "Completed" ? "#D32F2F" : "#1958F7",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 400,
                      fontSize: "14px",
                      lineHeight: "100%",
                      display: "inline-block",
                    }}
                  >
                    {truncateText(item.URL, 40)}
                  </a>
                ) : (
                  <Typography
                    sx={{
                      color: "#9A9EA5",
                      fontStyle: "italic",
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 400,
                      fontSize: "14px",
                      lineHeight: "100%",
                    }}
                  >
                    No URL
                  </Typography>
                )}
              </TableCell>
              <TableCell>{truncateText(item.Recipient, 25)}</TableCell>
              <TableCell>
                <Chip
                  label={item.Status}
                  sx={{
                    backgroundColor: item.statusBgColor,
                    color: item.statusColor,
                    fontWeight: 500,
                    fontFamily: "Poppins, sans-serif",
                    borderRadius: "6px",
                    fontSize: "13px",
                    height: "30px",
                  }}
                />
              </TableCell>
              <TableCell>
                {item.Status !== "Completed" && <Box className="action-buttons" sx={{ display: "flex", gap: 1 }}>
                  <IconButton
                    sx={{borderRadius: '15px', width: '142px', height: '40px'}}
                    onClick={(e) => handleSendEmail(item, e)}
                  >
                    <img src={SendSurveyButton} alt="Send Survey" />
                  </IconButton>
                </Box>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DesktopTable;