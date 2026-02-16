import { useState, useEffect } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";
import QuestionRenderer from "../../QuestionRenderer";

const GeneratedSurveyDisplay = ({
  surveyData,
  questions,
  onDeleteQuestion,
  onUpdateSelection,
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");
  
  // State to manage flow question selections
  const [flowSelections, setFlowSelections] = useState({});
  
  // Initialize flow selections on component mount and when questions change
  useEffect(() => {
    const initialSelections = {};
    questions.forEach(question => {
      if (question.type === "flow") {
        // Use existing selectedOption or auto-select first option with child questions
        const selectedOption = question.selectedOption || 
          question.parentOptions?.find(option => 
            question.childQuestions?.[option] && 
            question.childQuestions[option].length > 0
          );
        
        if (selectedOption) {
          initialSelections[question.id] = selectedOption;
        }
      }
    });
    setFlowSelections(initialSelections);
  }, [questions]);
  
  const disabledUpdateQuestionRating = () => {
    // Do nothing - questions cannot be answered in generated survey view
  };
  
  // Enhanced handler for flow question selection
  const handleUpdateQuestionSelection = (questionId, selectedOption) => {
    // Update local state for immediate UI response
    setFlowSelections(prev => ({
      ...prev,
      [questionId]: selectedOption
    }));
    
    // Call parent handler if provided
    if (onUpdateSelection) {
      onUpdateSelection(questionId, selectedOption);
    }
  };
  
  const disabledEditQuestion = () => {
    // Do nothing - questions cannot be edited in generated survey view
  };
  
  const disabledUpdateAnswer = () => {
    // Do nothing - questions cannot be answered in generated survey view
  };

  const isChildQuestion = (questionId) => {
    const isChild = questions.some(question => {
      if (question.type === "flow" && question.childQuestions) {
        for (const optionKey in question.childQuestions) {
          const childArray = question.childQuestions[optionKey];
          if (Array.isArray(childArray)) {
            const found = childArray.some(child => child.id === questionId);
            if (found) {
              return true;
            }
          }
        }
      }
      return false;
    });
    return isChild;
  };

  const parentQuestionsOnly = questions.filter(question => {
    const isChild = isChildQuestion(question.id);
    return !isChild;
  });

  const renderChildQuestions = (question, selectedOption) => {
    if (!question.childQuestions || !selectedOption || !question.childQuestions[selectedOption]) {
      return null;
    }

    return (
      <Box
        sx={{
          mt: 2,
          mb: 3,
          backgroundColor: "#FAFAFA",
          borderRadius: "15px",
          p: 3,
          border: "1px solid #F0F0F0",
        }}
      >
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 500,
            fontSize: "14px",
            color: "#666",
            mb: 2,
          }}
        >
          Questions for "{selectedOption}":
        </Typography>
        
        {question.childQuestions[selectedOption].map((childQuestion, index) => (
          <Box key={`${childQuestion.id}-${index}`} sx={{ mb: 2, "&:last-child": { mb: 0 } }}>
            <QuestionRenderer
              question={childQuestion}
              onEdit={disabledEditQuestion}
              onDelete={null}
              onUpdateRating={disabledUpdateQuestionRating}
              onUpdateSelection={null}
              onUpdateAnswer={disabledUpdateAnswer}
              hideEdit={true}
              hideDelete={true}
              readOnly={true}
              hideChildQuestions={true} 
            />
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: "20px",
        p: isMobile ? 2 : 4,
        boxShadow: "0px 4px 20px 0px #0000000D",
        overflowY: "auto",
        width: isMobile ? "100%" : "60%",
        maxHeight: "100%",
      }}
    >
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 500,
          fontSize: "18px",
          lineHeight: "100%",
          color: "#1E1E1E",
          mb: 3,
        }}
      >
        Generated Survey
      </Typography>

      {/* Survey ID Display */}
      {surveyData.surveyId && (
        <Box
          sx={{ mb: 3, p: 2, backgroundColor: "#F8F9FA", borderRadius: "10px" }}
        >
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "12px",
              color: "#6C757D",
              mb: 0.5,
            }}
          >
            Response ID
          </Typography>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 500,
              fontSize: "14px",
              color: "#1E1E1E",
            }}
          >
            {surveyData.surveyId}
          </Typography>
        </Box>
      )}

      {/* Render Questions */}
      {parentQuestionsOnly.length > 0 ? (
        parentQuestionsOnly
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((question) => {
            const displayQuestion = question.type === "flow" 
              ? { ...question, selectedOption: flowSelections[question.id] || question.selectedOption }
              : question;

            return (
              <Box key={question.id} sx={{ mb: 2 }}>
                <QuestionRenderer
                  question={displayQuestion}
                  onEdit={disabledEditQuestion}
                  onDelete={onDeleteQuestion}
                  onUpdateRating={disabledUpdateQuestionRating}
                  onUpdateSelection={handleUpdateQuestionSelection}
                  onUpdateAnswer={disabledUpdateAnswer}
                  hideEdit={true}
                  readOnly={false}
                  hideChildQuestions={true} 
                />
                
                {question.type === "flow" && (flowSelections[question.id] || question.selectedOption) && (
                  renderChildQuestions(question, flowSelections[question.id] || question.selectedOption)
                )}
              </Box>
            );
          })
      ) : (
        <Box
          sx={{
            textAlign: "center",
            py: 4,
            color: "#7D7D7D",
          }}
        >
          <Typography sx={{ fontFamily: "Poppins, sans-serif" }}>
            No questions generated. Please regenerate the survey.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GeneratedSurveyDisplay;
