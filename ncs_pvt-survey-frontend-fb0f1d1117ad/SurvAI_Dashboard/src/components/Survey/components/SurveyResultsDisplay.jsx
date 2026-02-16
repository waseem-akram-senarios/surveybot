import { useState, useEffect } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";
import QuestionRenderer from "../../QuestionRenderer";

const SurveyResultsDisplay = ({ questions, allowFlowInteraction = true }) => {
  const isMobile = useMediaQuery("(max-width: 600px)");
  
  const [flowSelections, setFlowSelections] = useState({});
  
  // Initialize flow selections on component mount and when questions change
  useEffect(() => {
    const initialSelections = {};
    questions.forEach(question => {
      if (question.type === "flow") {
        // If there's a selected answer, use it. Otherwise, auto-select first option with child questions
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
  
  // Disabled handlers for read-only view
  const disabledUpdateQuestionRating = () => {};
  const disabledUpdateQuestionAnswer = () => {};
  const disabledEditQuestion = () => {};
  const disabledDeleteQuestion = () => {};

  const handleUpdateSelection = (questionId, selectedOption) => {
    if (!allowFlowInteraction) return;
    
    setFlowSelections(prev => ({
      ...prev,
      [questionId]: selectedOption
    }));
  };

  const renderUserResponse = (question) => {
    const userResponse = question.raw_answer || null;
    if (!userResponse) return null;
    
    return (
      <Box
        sx={{
          mt: 2,
          mb: 3,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            p: 2,
            minWidth: isMobile ? "100%" : "200px",
            maxWidth: isMobile ? "100%" : "300px",
          }}
        >
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "12px",
              color: "#7D7D7D",
              mb: 1,
              textAlign: "right",
            }}
          >
            User Response
          </Typography>
          <Box sx={{ border: '1px solid #F0F0F0', borderRadius: '12px 0 12px 12px', p: 1.5, }}>
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                color: "#4B4B4B",
                textAlign: "right",
                wordWrap: "break-word",
              }}
            >
              {userResponse}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderChildQuestionResponses = (childQuestions, selectedOption) => {
    if (!childQuestions || !selectedOption || !childQuestions[selectedOption]) {
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
          boxShadow: "0px 2px 8px 0px #0000000A"
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
        
        {childQuestions[selectedOption].map((childQuestion, index) => (
          <Box 
            key={`${childQuestion.id}-${index}`} 
            sx={{ 
              mb: 2, 
              "&:last-child": { mb: 0 },
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              p: 2,
              border: '1px solid #E8E8E8',
              boxShadow: '0px 1px 4px 0px #0000000A'
            }}
          >
            <QuestionRenderer
              question={childQuestion}
              onEdit={disabledEditQuestion}
              onDelete={disabledDeleteQuestion}
              onUpdateRating={disabledUpdateQuestionRating}
              onUpdateSelection={null} 
              onUpdateAnswer={disabledUpdateQuestionAnswer}
              hideEdit={true}
              hideDelete={true}
              readOnly={true}
            />
            {renderUserResponse(childQuestion)}
          </Box>
        ))}
      </Box>
    );
  };

  const renderQuestionWithResults = (question) => {
    const normalizedQuestion = {
      ...question,
      text: question.text || question.question || '',
    };
    
    const displayQuestion = normalizedQuestion.type === "flow" 
      ? { ...normalizedQuestion, selectedOption: flowSelections[normalizedQuestion.id] || normalizedQuestion.selectedOption }
      : normalizedQuestion;

    return (
      <Box key={question.id} sx={{ mb: 4 }}>
        <QuestionRenderer
          question={displayQuestion}
          onEdit={disabledEditQuestion}
          onDelete={disabledDeleteQuestion}
          onUpdateRating={disabledUpdateQuestionRating}
          onUpdateSelection={allowFlowInteraction && question.type === "flow" ? handleUpdateSelection : null}
          onUpdateAnswer={disabledUpdateQuestionAnswer}
          hideEdit={true}
          hideDelete={true}
          readOnly={!allowFlowInteraction}
          hideChildQuestions={true} 
        />
        
        {renderUserResponse(question)}
        
        {question.type === "flow" && (flowSelections[question.id] || question.selectedOption) && (
          renderChildQuestionResponses(question.childQuestions, flowSelections[question.id] || question.selectedOption)
        )}
      </Box>
    );
  };

  const isChildQuestion = (questionId) => {
    let foundAsChild = false;
    questions.forEach(question => {
      if (question.type === "flow" && question.childQuestions) {
        Object.keys(question.childQuestions).forEach(optionKey => {
          const childArray = question.childQuestions[optionKey];
          if (Array.isArray(childArray)) {
            childArray.forEach(child => {
              if (child.id === questionId) {
                console.log(`✓ Question ${questionId} found as child of flow question ${question.id} under option "${optionKey}"`);
                foundAsChild = true;
              }
            });
          }
        });
      }
    });
    return foundAsChild;
  };

  const parentQuestionsOnly = questions.filter(question => {
    const isChild = isChildQuestion(question.id);
    return !isChild;
  });

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
        Survey Results
      </Typography>

      {/* Render Questions with Results */}
      {parentQuestionsOnly.length > 0 ? (
        parentQuestionsOnly
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((question) => renderQuestionWithResults(question))
      ) : (
        <Box
          sx={{
            textAlign: "center",
            py: 4,
            color: "#7D7D7D",
          }}
        >
          <Typography sx={{ fontFamily: "Poppins, sans-serif" }}>
            No questions found for this survey.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SurveyResultsDisplay;