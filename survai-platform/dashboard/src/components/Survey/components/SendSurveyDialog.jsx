import { ContentCopy } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from "@mui/material";
import React, { useState } from "react";
import AddIcon from '../../../assets/Add.svg';
import EmailIcon from '../../../assets/Email.svg';
import PhoneIcon from "../../../assets/Phone.svg";
import SendIcon from '../../../assets/Send.svg';

const SendSurveyDialog = ({
  open,
  onClose,
  onConfirmEmail,
  onConfirmPhone,
  surveyId,
  isSendingEmail,
  isSendingPhone,
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");
  const [currentState, setCurrentState] = useState("default"); // "default", "email", "phone"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [voiceProvider, setVoiceProvider] = useState("vapi");

  const surveyLink = `${import.meta.env.VITE_RECIPIENT_URL}/survey/${surveyId}`;

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
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
    onConfirmPhone(phone, voiceProvider);
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
      setEmailError("");
      setPhoneError("");
      setVoiceProvider("vapi");
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
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  backgroundColor: "#FFF8E7",
                  borderRadius: "10px",
                  border: "1px solid #FFD700",
                }}
              >
                <Typography sx={{ fontFamily: "Poppins, sans-serif", fontSize: "12px", color: "#7A5C00" }}>
                  <strong>Note:</strong> Email delivery requires a verified sender domain in MailerSend. If no email arrives, check your spam folder or contact your admin to verify the sender domain.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <img src={EmailIcon} alt="Email-Icon" style={{ marginRight: '7.5px' }} />
                <TextField
                  fullWidth
                  placeholder="Enter email"
                  value={email}
                  onChange={handleEmailChange}
                  error={!!emailError}
                  helperText={emailError || "If no email arrives, check spam or share the link directly"}
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
                Enter Phone Number
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <img src={PhoneIcon} alt="Phone-Icon" style={{ marginRight: '7.5px' }} />
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography
                  sx={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 400,
                    fontSize: "13px",
                    color: "#666",
                  }}
                >
                  Voice engine:
                </Typography>
                <ToggleButtonGroup
                  value={voiceProvider}
                  exclusive
                  onChange={(e, val) => { if (val) setVoiceProvider(val); }}
                  size="small"
                  disabled={isLoading}
                  sx={{ height: 32 }}
                >
                  <ToggleButton
                    value="vapi"
                    sx={{
                      textTransform: "none",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "12px",
                      px: 2,
                      borderRadius: "8px !important",
                      "&.Mui-selected": {
                        backgroundColor: "#1958F7",
                        color: "#fff",
                        "&:hover": { backgroundColor: "#1445d4" },
                      },
                    }}
                  >
                    VAPI
                  </ToggleButton>
                  <ToggleButton
                    value="livekit"
                    sx={{
                      textTransform: "none",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "12px",
                      px: 2,
                      borderRadius: "8px !important",
                      "&.Mui-selected": {
                        backgroundColor: "#1958F7",
                        color: "#fff",
                        "&:hover": { backgroundColor: "#1445d4" },
                      },
                    }}
                  >
                    LiveKit
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
          )}

          {/* Action Buttons - Always Visible */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<img src={AddIcon} alt="Email" />}
                onClick={handleSendViaEmail}
                disabled={isLoading}
                sx={{
                  flex: 1,
                  textTransform: "none",
                  fontSize: "14px",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  border: 'none',
                  backgroundColor: currentState === "email" ? "#f0f0f0f" : "#f9f9f9",
                  color: "#4B4B4B",
                  borderRadius: "12px",
                  height: "48px",
                }}
              >
                Send via Email
              </Button>
              <Button
                variant="outlined"
                startIcon={<img src={AddIcon} alt="Phone" />}
                onClick={handleSendViaPhone}
                disabled={isLoading}
                sx={{
                  flex: 1,
                  textTransform: "none",
                  fontSize: "14px",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  border: 'none',
                  backgroundColor: currentState === "phone" ? "#f0f0f0f" : "#f9f9f9",
                  color: "#4B4B4B",
                  borderRadius: "12px",
                  height: "48px",
                }}
              >
                Send via Phone
              </Button>
            </Box>
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "12px",
                color: "#999",
                textAlign: "center",
              }}
            >
              Choose only one
            </Typography>
          </Box>

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
              Cancel
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