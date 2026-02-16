import React from "react";
import { Box, Typography, CircularProgress, IconButton } from "@mui/material";
import Image from "next/image";

const VoiceMicrophone = ({
  isRecording,
  isProcessing,
  isGettingSympathize,
  isLoading,
  surveyData,
  surveyCompleted,
  surveyStarted = false,
  onStartRecording,
  onStopRecording,
  isSpeaking,
}) => {
  const isDisabled = (surveyStarted && (isProcessing || isGettingSympathize || surveyCompleted || isSpeaking)) || (!surveyStarted && isLoading);
  const showSpinner = isProcessing || isGettingSympathize;
  const showStatusText = isProcessing || isGettingSympathize || isSpeaking || !surveyStarted;

  const getStatusText = () => {
    if (isProcessing) return "Processing your response...";
    if (isGettingSympathize) return "Thinking...";
    if (isSpeaking) return "Please wait...";
    return "";
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <IconButton
        onMouseDown={onStartRecording}
        onMouseUp={onStopRecording}
        onTouchStart={onStartRecording}
        onTouchEnd={onStopRecording}
        onContextMenu={(e) => e.preventDefault()}
        disabled={isDisabled}
        sx={{
          width: { xs: "120px", sm: "140px", md: "160px" },
          height: { xs: "120px", sm: "140px", md: "160px" },
          borderRadius: "50%",
          backgroundColor: isGettingSympathize ? "#E0E0E0" : "transparent",
          transition: "all 0.3s ease",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          WebkitTapHighlightColor: "transparent",
          "&:hover": {
            backgroundColor: isGettingSympathize ? "#E0E0E0" : "rgba(25, 88, 247, 0.1)",
          },
          "&:disabled": {
            opacity: 0.6,
            pointerEvents: "none",
          },
        }}
      >
        {showSpinner ? (
          <CircularProgress size={40} color="inherit" />
        ) : (
          <Image
            src="/Mic.svg"
            alt="Mic"
            width={80}
            height={80}
            style={{
              filter: isRecording ? "brightness(1.2)" : "none",
              transition: "filter 0.2s ease",
              cursor: isDisabled ? 'default' : 'pointer'
            }}
          />
        )}
      </IconButton>
      
      {/* Status indicator */}
      {showStatusText && (
        <Typography
          sx={{
            mt: 2,
            fontFamily: "Poppins, sans-serif",
            fontSize: "14px",
            color: !surveyStarted && !isLoading ? "#1958F7" : "#666",
            textAlign: "center",
            fontWeight: !surveyStarted && !isLoading ? 500 : 400,
            animation: (isProcessing || isGettingSympathize || isSpeaking) ? "pulse 1.5s infinite" : "none",
            "@keyframes pulse": {
              "0%": { opacity: 0.6 },
              "50%": { opacity: 1 },
              "100%": { opacity: 0.6 },
            },
          }}
        >
          {getStatusText()}
        </Typography>
      )}
    </Box>
  );
};

export default VoiceMicrophone;