import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  useMediaQuery,
  Dialog,
  DialogContent,
  IconButton,
} from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import SendIcon from '../../../assets/Send.svg';
import AddIcon from '../../../assets/Add.svg';
import EmailIcon from '../../../assets/Email.svg';
import PhoneIcon from "../../../assets/Phone.svg";

const SendSurveyDialog = ({
  open,
  onClose,
  onConfirmEmail,
  onConfirmPhone,
  initialEmail = "",
  initialPhone = "",
  surveyId,
  isSendingEmail,
  isSendingPhone,
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");
  const [currentState, setCurrentState] = useState("default");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");

  const surveyLink = `https://main.d3unjy9nz250ey.amplifyapp.com/survey/${surveyId}`;

  useEffect(() => {
    if (open) {
      setEmail(initialEmail || "");
      setPhone(initialPhone || "");
      setEmailError("");
      setPhoneError("");
      setDateError("");
      setTimeError("");
    }
  }, [open, initialEmail, initialPhone]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validateDate = (date) => {
    if (!date) return true; // Date is optional
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return selectedDate >= today;
  };

  const validateTime = (time) => {
    if (!time) return true; // Time is optional
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError && value && validateEmail(value)) {
      setEmailError("");
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhone(value);
    if (phoneError && value && validatePhone(value)) {
      setPhoneError("");
    }
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setScheduledDate(value);
    if (dateError && validateDate(value)) {
      setDateError("");
    }
  };

  const handleTimeChange = (e) => {
    const value = e.target.value;
    setScheduledTime(value);
    if (timeError && validateTime(value)) {
      setTimeError("");
    }
  };

  const handleSendViaEmail = () => {
    setCurrentState("email");
  };

  const handleSendViaPhone = () => {
    setCurrentState("phone");
  };

  const handleEmailSend = () => {
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    onConfirmEmail(email);
  };

  const handlePhoneSend = () => {
    if (!phone.trim()) {
      setPhoneError("Phone number is required");
      return;
    }
    if (!validatePhone(phone)) {
      setPhoneError("Please enter a valid phone number");
      return;
    }

    // Validate scheduling fields if provided
    if (scheduledDate && !validateDate(scheduledDate)) {
      setDateError("Please enter a valid future date");
      return;
    }
    if (scheduledTime && !validateTime(scheduledTime)) {
      setTimeError("Please enter a valid time (HH:MM)");
      return;
    }
    if ((scheduledDate && !scheduledTime) || (!scheduledDate && scheduledTime)) {
      if (!scheduledDate) setDateError("Date is required when time is specified");
      if (!scheduledTime) setTimeError("Time is required when date is specified");
      return;
    }

    // Format the run_at parameter if scheduling is provided
    let runAt = null;
    if (scheduledDate && scheduledTime) {
      // Convert to UTC format: YYYY-MM-DD HH:MM
      runAt = `${scheduledDate} ${scheduledTime}`;
    }

    onConfirmPhone(phone, runAt);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyLink);
    // You might want to show a toast notification here
    console.log("Link copied to clipboard");
  };

  const handleClose = () => {
    if (!isSendingEmail && !isSendingPhone) {
      setCurrentState("default");
      setEmail("");
      setPhone("");
      setScheduledDate("");
      setScheduledTime("");
      setEmailError("");
      setPhoneError("");
      setDateError("");
      setTimeError("");
      onClose();
    }
  };

  const isLoading = isSendingEmail || isSendingPhone;
  const loadingText = isSendingEmail ? "Sending..." : isSendingPhone ? "Sending..." : "Send Survey";

  return (
    <Dialog
      open={open}
      onClose={!isLoading ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          width: isMobile ? "90%" : "500px",
          maxWidth: isMobile ? "90%" : "500px",
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: isMobile ? 3 : 4, position: "relative" }}>
        <Box sx={{ pt: 2 }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <img src={SendIcon} alt="Send Icon" style={{ marginRight: '10px'}} />
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "20px",
                lineHeight: "100%",
                color: "#1E1E1E",
              }}
            >
              Send Survey
            </Typography>
          </Box>

          {/* Copy Link Section */}
          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "16px",
                color: "#1E1E1E",
                mb: 2,
              }}
            >
              Copy link
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#F8F9FA",
                borderRadius: "12px",
                p: 2,
                border: "1px solid #E9ECEF",
              }}
            >
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  color: "#1958F7",
                  flex: 1,
                  wordBreak: "break-all",
                }}
              >
                {surveyLink}
              </Typography>
              <IconButton
                onClick={handleCopyLink}
                sx={{ ml: 1, color: "#666" }}
              >
                <ContentCopy />
              </IconButton>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<img src={EmailIcon} alt="Email" style={{ width: '16px', height: '16px' }} />}
              onClick={handleSendViaEmail}
              disabled={isLoading}
              sx={{
                flex: 1,
                textTransform: "none",
                fontSize: "14px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                border: 'none',
                backgroundColor: currentState === "email" ? "#E3F2FD" : "#F9F9F9",
                color: "#4B4B4B",
                borderRadius: "12px",
                height: "48px",
                "&:hover": {
                  backgroundColor: currentState === "email" ? "#E3F2FD" : "#F0F0F0",
                },
              }}
            >
              Send via Email
            </Button>
            <Button
              variant="outlined"
              startIcon={<img src={PhoneIcon} alt="Phone" style={{ width: '16px', height: '16px' }} />}
              onClick={handleSendViaPhone}
              disabled={isLoading}
              sx={{
                flex: 1,
                textTransform: "none",
                fontSize: "14px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                border: 'none',
                backgroundColor: currentState === "phone" ? "#E3F2FD" : "#F9F9F9",
                color: "#4B4B4B",
                borderRadius: "12px",
                height: "48px",
                "&:hover": {
                  backgroundColor: currentState === "phone" ? "#E3F2FD" : "#F0F0F0",
                },
              }}
            >
              Make Phone Call
            </Button>
          </Box>

          {/* Dynamic Content Based on State */}
          {currentState === "email" && (
            <Box sx={{ mb: 4 }}>
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 500,
                  fontSize: "16px",
                  color: "#1E1E1E",
                  mb: 2,
                }}
              >
                Enter Email
              </Typography>
              <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                <img src={EmailIcon} alt="Email-Icon" style={{ marginRight: '7.5px', marginTop: '12px' }} />
                <TextField
                  fullWidth
                  placeholder="Enter email"
                  value={email}
                  onChange={handleEmailChange}
                  error={!!emailError}
                  helperText={emailError}
                  disabled={isLoading}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "14px",
                    },
                    "& .MuiFormHelperText-root": {
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "12px",
                    },
                  }}
                />
              </Box>
            </Box>
          )}

          {currentState === "phone" && (
            <Box sx={{ mb: 4 }}>
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 500,
                  fontSize: "16px",
                  color: "#1E1E1E",
                  mb: 2,
                }}
              >
                Make Phone Call
              </Typography>
              <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
                <img src={PhoneIcon} alt="Phone-Icon" style={{ marginRight: '7.5px', marginTop: '12px' }} />
                <TextField
                  fullWidth
                  placeholder="Enter number"
                  value={phone}
                  onChange={handlePhoneChange}
                  error={!!phoneError}
                  helperText={phoneError || "Enter phone number with country code"}
                  disabled={isLoading}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "14px",
                    },
                    "& .MuiFormHelperText-root": {
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "12px",
                    },
                  }}
                />
              </Box>

              {/* Scheduling Section */}
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 500,
                      fontSize: "14px",
                      color: "#1E1E1E",
                      mb: 1,
                    }}
                  >
                    Scheduled Date
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    placeholder="mm.dd.yyyy"
                    value={scheduledDate}
                    onChange={handleDateChange}
                    error={!!dateError}
                    helperText={dateError}
                    disabled={isLoading}
                    InputProps={{
                      sx: {
                        "& input[type=date]::-webkit-calendar-picker-indicator": {
                          opacity: 0.7,
                        }
                      }
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        fontFamily: "Poppins, sans-serif",
                        fontSize: "14px",
                      },
                      "& .MuiFormHelperText-root": {
                        fontFamily: "Poppins, sans-serif",
                        fontSize: "12px",
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 500,
                      fontSize: "14px",
                      color: "#1E1E1E",
                      mb: 1,
                    }}
                  >
                    Scheduled Time
                  </Typography>
                  <TextField
                    fullWidth
                    type="time"
                    placeholder="Enter time"
                    value={scheduledTime}
                    onChange={handleTimeChange}
                    error={!!timeError}
                    helperText={timeError}
                    disabled={isLoading}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        fontFamily: "Poppins, sans-serif",
                        fontSize: "14px",
                      },
                      "& .MuiFormHelperText-root": {
                        fontFamily: "Poppins, sans-serif",
                        fontSize: "12px",
                      },
                    }}
                  />
                </Box>
              </Box>
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  color: "#999",
                  mb: 2,
                }}
              >
                Select when to schedule the phone call
              </Typography>
            </Box>
          )}

          {/* Bottom Action Buttons */}
          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              onClick={handleClose}
              disabled={isLoading}
              sx={{
                textTransform: "none",
                color: "#1E1E1E",
                width: "120px",
                height: "48px",
                borderColor: "#F0F0F0",
                borderRadius: "17px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                "&:hover": {
                  borderColor: "#E0E0E0",
                  backgroundColor: "#F5F5F5",
                },
              }}
            >
              Close
            </Button>
            {currentState !== "default" && (
              <Button
                variant="contained"
                onClick={currentState === "email" ? handleEmailSend : handlePhoneSend}
                disabled={isLoading || (currentState === "email" ? !email.trim() : !phone.trim())}
                sx={{
                  textTransform: "none",
                  color: "#fff",
                  width: "140px",
                  height: "48px",
                  backgroundColor: "#1958F7",
                  borderRadius: "17px",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  "&:hover": {
                    backgroundColor: "#1958F7",
                  },
                  "&:disabled": {
                    backgroundColor: "#ccc",
                  },
                }}
              >
                {loadingText}
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SendSurveyDialog;