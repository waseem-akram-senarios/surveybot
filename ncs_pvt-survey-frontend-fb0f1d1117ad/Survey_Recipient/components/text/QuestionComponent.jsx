import React from "react";
import { Box, Typography, Button, TextField, IconButton } from "@mui/material";

// Category Question Component
export const CategoryQuestion = ({ question, isMobile, onCategorySelect }) => {
  return (
    <Box
      key={question.id}
      sx={{
        mt: 3,
        mb: 3,
        border: "none",
        borderRadius: 2,
        pb: 2,
      }}
    >
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: isMobile ? "14px" : "16px",
          lineHeight: "100%",
          color: "#4B4B4B",
          mb: 2,
        }}
      >
        {question.text}
      </Typography>
      
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "auto auto",
          gap: isMobile ? 2 : 2.5,
          width: "100%",
          justifyContent: "flex-start"
        }}
      >
        {question.categories?.map((option, index) => (
          <Button
            key={index}
            onClick={() => onCategorySelect(question.id, option)}
            sx={{
              justifyContent: "center",
              textAlign: "center",
              padding: "12px 16px",
              minWidth: '200px',
              backgroundColor: question.answer === option ? "#1958F7" : "#f4f4f4",
              color: question.answer === option ? "#fff" : "#4B4B4B",
              borderRadius: "12px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              textTransform: "none",
              "&:hover": {
                backgroundColor: question.answer === option ? "#1958F7" : "#e0e0e0",
              },
            }}
          >
            {option}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

// Rating Question Component
export const RatingQuestion = ({ question, isMobile, onRatingSelect }) => {
  const maxRange = question.scales || 5;
  const ratingNumbers = Array.from({ length: maxRange }, (_, index) => index + 1);
  const currentRating = question.answer ? parseInt(question.answer) : null;

  return (
    <Box
      key={question.id}
      sx={{
        mt: 4,
        mb: 3,
        borderRadius: 2,
        pb: 1,
      }}
    >
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: isMobile ? "14px" : "16px",
          lineHeight: "100%",
          color: "#4B4B4B",
          mb: 2,
        }}
      >
        {question.text}
      </Typography>
      
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          flexWrap: isMobile ? "wrap" : "nowrap",
          gap: isMobile ? 1 : 4,
          mb: 2,
        }}
      >
        {ratingNumbers.map((value) => (
          <IconButton
            key={value}
            onClick={() => onRatingSelect(question.id, value)}
            sx={{
              width: isMobile ? "40px" : "52px",
              height: isMobile ? "40px" : "52px",
              border: '1px solid #F0F0F0',
              boxShadow: '0px 4px 20px 0px #0000000D',
              borderRadius: "15px",
              backgroundColor: currentRating >= value ? "#1958F7" : "#fff",
              color: currentRating >= value ? "#fff" : "#4B4B4B",
              "&:hover": {
                backgroundColor: currentRating >= value ? "#1958F7" : "#e0e0e0",
              },
            }}
          >
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                color: "inherit",
              }}
            >
              {value}
            </Typography>
          </IconButton>
        ))}
      </Box>
    </Box>
  );
};

// Open Question Component
export const OpenQuestion = ({ question, isMobile, onTextChange }) => {
  return (
    <Box
      key={question.id}
      sx={{
        mt: 3,
        mb: 3,
        border: "none",
        borderRadius: 2,
        pb: 2,
      }}
    >
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: isMobile ? "14px" : "16px",
          lineHeight: "100%",
          color: "#4B4B4B",
          mb: 2,
        }}
      >
        {question.text}
      </Typography>
      
      <TextField
        fullWidth
        multiline
        rows={4}
        value={question.answer || ""}
        placeholder="Enter answer"
        onChange={(e) => onTextChange(question.id, e.target.value)}
        variant="outlined"
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#fff",
            borderRadius: "15px",
            boxShadow: "0px 4px 20px 0px #0000000D",
            "& fieldset": {
              border: "none",
            },
            "& .MuiInputBase-input": {
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "150%",
              color: "#4B4B4B",
            },
          },
        }}
      />
    </Box>
  );
};

// Question Renderer Component
export const QuestionRenderer = ({ question, isMobile, onCategorySelect, onRatingSelect, onTextChange }) => {
  switch (question.criteria?.toLowerCase()) {
    case 'categorical':
      return <CategoryQuestion question={question} isMobile={isMobile} onCategorySelect={onCategorySelect} />;
    case 'scale':
      return <RatingQuestion question={question} isMobile={isMobile} onRatingSelect={onRatingSelect} />;
    case 'open':
      return <OpenQuestion question={question} isMobile={isMobile} onTextChange={onTextChange} />;
    default:
      return <OpenQuestion question={question} isMobile={isMobile} onTextChange={onTextChange} />;
  }
};