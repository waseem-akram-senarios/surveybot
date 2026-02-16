import React from "react";
import { Box, Typography } from "@mui/material";

const ConversationItem = ({ item, index }) => {
  // Combine base text with streaming text for display
  const baseText = item.text || '';
  const streamingText = item.streamingText || '';
  const displayText = baseText && streamingText ? `${baseText} ${streamingText}` : baseText || streamingText;

  // Add streaming cursor animation styles
  const streamingStyles = {
    "@keyframes blink": {
      "0%, 50%": { opacity: 1 },
      "51%, 100%": { opacity: 0 },
    },
    "&::after": item.isStreaming ? {
      content: '"|"',
      animation: "blink 1s infinite",
      color: "#1958F7",
      fontWeight: "bold"
    } : {}
  };

  return (
    <Box
      sx={{
        mt: index === 0 ? 0 : 3,
        mb: 3,
        border: "none",
        borderRadius: 2,
        pb: 2,
        animation: "fadeIn 0.5s ease-in",
        "@keyframes fadeIn": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        // Add the blinking cursor keyframes
        "@keyframes blink": {
          "0%, 50%": { opacity: 1 },
          "51%, 100%": { opacity: 0 },
        },
      }}
    >
      {item.type === 'question' && (
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: { xs: "14px", sm: "16px" },
            lineHeight: "100%",
            color: "#4B4B4B",
            mb: 2,
            // Add streaming effect styles
            ...streamingStyles,
            // Add smooth text transition
            transition: "all 0.1s ease-in-out"
          }}
        >
          {displayText}
        </Typography>
      )}
      
      {item.type === 'user_answer' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Box
            sx={{
              backgroundColor: "#1958F7",
              color: "white",
              borderRadius: "15px 15px 5px 15px",
              padding: "12px 16px",
              maxWidth: "70%",
              wordBreak: "break-word",
              // Add streaming effect for user messages too
              ...(item.isStreaming && {
                boxShadow: "0 0 10px rgba(25, 88, 247, 0.3)",
                transform: "scale(1.02)",
                transition: "all 0.2s ease-in-out"
              })
            }}
          >
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: { xs: "14px", sm: "16px" },
                // Add streaming cursor for user messages
                ...streamingStyles,
                "&::after": item.isStreaming ? {
                  content: '"|"',
                  animation: "blink 1s infinite",
                  color: "rgba(255, 255, 255, 0.8)",
                  fontWeight: "bold"
                } : {},
                transition: "all 0.1s ease-in-out"
              }}
            >
              {displayText}
            </Typography>
          </Box>
        </Box>
      )}
      
      {item.type === 'sympathy_response' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              backgroundColor: "#f4f4f4",
              color: "#4B4B4B",
              borderRadius: "15px 15px 15px 5px",
              padding: "12px 16px",
              maxWidth: "70%",
              wordBreak: "break-word",
              // Add streaming effect
              ...(item.isStreaming && {
                boxShadow: "0 0 8px rgba(75, 75, 75, 0.2)",
                transform: "scale(1.02)",
                transition: "all 0.2s ease-in-out"
              })
            }}
          >
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: { xs: "14px", sm: "16px" },
                // Add streaming cursor
                ...streamingStyles,
                transition: "all 0.1s ease-in-out"
              }}
            >
              {displayText}
            </Typography>
          </Box>
        </Box>
      )}
      
      {(item.type === 'completion' || item.type === 'message') && (
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: { xs: "14px", sm: "16px" },
            lineHeight: "100%",
            color: "#4B4B4B",
            textAlign: "center",
            fontStyle: "italic",
            mb: 2,
          }}
        >
          {displayText}
        </Typography>
      )}
    </Box>
  );
};

export default ConversationItem;