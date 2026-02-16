import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
} from '@mui/material';
import { formatDate, handleUrlClick } from '../../../utils/Surveys/surveyTableHelpers';
import SendSurveyButton from '../../../assets/SendSurvey.svg';

const MobileTableCard = ({ item, onItemClick, onSendEmail }) => {
  const handleCardClick = (e) => {
    if (e.target.closest('.send-buttons')) {
      return;
    }
    onItemClick(item);
  };

  const handleSendEmail = (e) => {
    e.stopPropagation();
    onSendEmail(item);
  };

  return (
    <Paper
      key={item.SurveyId}
      onClick={handleCardClick}
      sx={{
        mb: 2,
        p: 2,
        borderRadius: "12px",
        boxShadow: "0px 1px 4px rgba(0,0,0,0.1)",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "#f8f9fa",
          transform: "translateY(-1px)",
          boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
        },
        transition: "all 0.2s ease-in-out",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 500,
            fontSize: "14px",
            mb: 1
          }}>
            {item.Name}
          </Typography>
          <Chip
            label={item.Status}
            sx={{
              backgroundColor: item.statusBgColor,
              color: item.statusColor,
              fontFamily: "Poppins, sans-serif",
              fontWeight: 500,
              fontSize: "13px",
              height: "22px",
              borderRadius: "6px",
            }}
          />
        </Box>
        <Typography sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 500,
          fontSize: "14px"
        }}>
          {item.SurveyId}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
        <Typography sx={{
          color: "#64748B",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "13px"
        }}>
          Launch Date
        </Typography>
        <Typography sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "13px"
        }}>
          {formatDate(item.LaunchDate)}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
        <Typography sx={{
          color: "#64748B",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "13px"
        }}>
          URL
        </Typography>
        <Typography
          sx={{
            color: item.URL
              ? item.Status === "Completed"
                ? "#D32F2F"
                : "#1958F7"
              : "#9A9EA5",
            textDecoration: item.URL ? "underline" : "none",
            cursor: item.URL ? "pointer" : "default",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "13px",
            maxWidth: "60%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
          onClick={(e) => handleUrlClick(item.URL, item.Status, e)}
        >
          {item.URL || "No URL"}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography sx={{
          color: "#64748B",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "13px"
        }}>
          Recipient
        </Typography>
        <Typography sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "13px"
        }}>
          {item.Recipient}
        </Typography>
      </Box>

      {/* Send Survey Buttons */}
      {item.Status !== "Completed" && <Box className="send-buttons" sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
        <IconButton
          sx={{borderRadius: '15px', width: '142px', height: '40px'}}
          onClick={handleSendEmail}
        >
          <img src={SendSurveyButton} alt="Send Survey" />
        </IconButton>
      </Box>}
    </Paper>
  );
};

export default MobileTableCard;