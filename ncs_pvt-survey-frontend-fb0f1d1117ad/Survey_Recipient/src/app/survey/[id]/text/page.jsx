"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  Button,
  Typography,
  Backdrop,
} from "@mui/material";
import Header from "../../../../../components/Header.jsx";
import SubmitSurveyModal from "../../../../../components/SubmitSurveyModal.jsx";
import SubmitButton from "../../../../../components/text/SubmitButton.jsx";
import { QuestionRenderer } from "../../../../../components/text/QuestionComponent.jsx";
import {
  getSurveyQuestions,
  submitSurveyAnswers,
  updateSurveyStatus,
  updateSurveyDuration,
} from "../../../../lib/surveyApi.js";
import {
  hasUnansweredQuestions,
  calculateProgress,
  getCurrentQuestionNumber,
  getTotalQuestions,
  handleCategorySelect,
  handleRatingSelect,
  handleOpenTextChange,
  startSurveySession,
  calculateSessionDuration,
} from "../../../../../utils/textSurveyUtils.js";

export default function TextSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id || "102";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [surveyData, setSurveyData] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]); // All questions including filtered ones
  const [questions, setQuestions] = useState([]); // Currently visible questions
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [surveyStarted, setSurveyStarted] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [surveyDuration, setSurveyDuration] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Helper function to check if a question should be visible based on parent conditions
  const shouldQuestionBeVisible = (question, currentAnswers) => {
    // If no parent_id or parent_category_texts, it's always visible
    if (!question.parent_id || !question.parent_category_texts || question.parent_category_texts.length === 0) {
      return true;
    }

    // Find the parent question's answer
    const parentQuestion = currentAnswers.find(q => q.id === question.parent_id);
    if (!parentQuestion || !parentQuestion.answer || parentQuestion.answer.trim() === "") {
      return false;
    }

    // Check if the parent's answer matches any of the required categories
    const isVisible = question.parent_category_texts.includes(parentQuestion.answer);
    
    console.log(`Checking visibility for question "${question.text}":`, {
      questionId: question.id,
      parentId: question.parent_id,
      parentCategoryTexts: question.parent_category_texts,
      parentAnswer: parentQuestion.answer,
      isVisible
    });
    
    return isVisible;
  };

  // Function to get currently visible questions based on answers
  const getVisibleQuestions = (allQuestions) => {
    const visibleQuestions = [];
    
    for (const question of allQuestions) {
      if (shouldQuestionBeVisible(question, allQuestions)) {
        visibleQuestions.push(question);
      }
    }
    
    return visibleQuestions.sort((a, b) => a.order - b.order);
  };

  const updateVisibleQuestions = (updatedAllQuestions) => {
    const newVisibleQuestions = getVisibleQuestions(updatedAllQuestions);
    setQuestions(newVisibleQuestions);
    
    // If the current question is no longer visible, adjust the index
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      const newIndex = newVisibleQuestions.findIndex(q => q.id === currentQuestion.id);
      if (newIndex === -1) {
        // Current question is no longer visible, move to the last visible question
        setCurrentQuestionIndex(Math.max(0, newVisibleQuestions.length - 1));
      } else {
        setCurrentQuestionIndex(newIndex);
      }
    } else {
      // Reset to first question if no current question
      setCurrentQuestionIndex(0);
    }
  };

  const getCurrentProgress = () => {
    if (questions.length === 0) return 0;
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  };

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        setIsLoading(true);
        const data = await getSurveyQuestions(surveyId);
        console.log("Loaded survey data:", data);
        setSurveyData(data);

        if (data && data.Questions) {
          const initializedQuestions = data.Questions.map(question => ({
            ...question,
            answer: question.answer || "", 
            raw_answer: question.raw_answer || ""
          }));
          
          const questionsToShow = initializedQuestions.filter(question => {
            return question.autofill !== "Yes" || !question.answer || question.answer.trim() === "";
          });
          
          setAllQuestions(questionsToShow);
          const initialVisibleQuestions = getVisibleQuestions(questionsToShow);
          setQuestions(initialVisibleQuestions);          
        }

        startSurvey(data);
      } catch (error) {
        console.error("Failed to load survey:", error);
        setSubmissionError("Sorry, there was an error loading the survey. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSurvey();
  }, [surveyId]);

  const startSurvey = (data = surveyData) => {
    setSurveyStarted(true);
    const startTime = startSurveySession();
    setSessionStartTime(startTime);
  };

  useEffect(() => {
    if (!isLoading && surveyStarted && questions.length >= 0 && !isSubmitting && !surveyCompleted) {
      if (questions.length === 0) {
        console.log("No questions available on initial load - auto-submitting survey");
        handleSurveySubmission();
        return;
      }
  
      const hasUnanswered = hasUnansweredQuestions(questions);
      if (!hasUnanswered) {
        console.log("All questions already answered on initial load - auto-submitting survey");
        handleSurveySubmission();
      }
    }
  }, [isLoading, surveyStarted]);

  // Navigation handlers
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const currentQuestion = questions[currentQuestionIndex];

  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    return currentQuestion.answer && currentQuestion.answer.toString().trim() !== "";
  };

  // Answer handlers using modularized functions
  const onCategorySelect = (questionId, option) => {
    const updatedAllQuestions = handleCategorySelect(allQuestions, questionId, option);
    setAllQuestions(updatedAllQuestions);
    updateVisibleQuestions(updatedAllQuestions);
  };

  const onRatingSelect = (questionId, rating) => {
    const updatedAllQuestions = handleRatingSelect(allQuestions, questionId, rating);
    setAllQuestions(updatedAllQuestions);
    updateVisibleQuestions(updatedAllQuestions);
  };

  const onTextChange = (questionId, text) => {
    const updatedAllQuestions = handleOpenTextChange(allQuestions, questionId, text);
    setAllQuestions(updatedAllQuestions);
    updateVisibleQuestions(updatedAllQuestions);
  };

  // Submit handlers
  const handleSubmitClick = () => {
    if (hasUnansweredQuestions(questions)) {
      setShowSubmitModal(true);
    } else {
      handleSurveySubmission();
    }
  };

  const handleSubmitConfirm = async () => {
    setShowSubmitModal(false);
    await handleSurveySubmission();
  };

  const handleSurveySubmission = async () => {
    try {
      setIsSubmitting(true);
      
      // Ensure session start time is set if not already
      const currentSessionStartTime = sessionStartTime || startSurveySession();
      if (!sessionStartTime) {
        setSessionStartTime(currentSessionStartTime);
      }
            
      const originalQuestions = surveyData?.Questions || [];
      
      const questionsToSubmit = originalQuestions.map(originalQuestion => {
        const userAnsweredQuestion = allQuestions.find(q => q.id === originalQuestion.id);
        
        return {
          ...originalQuestion,
          answer: userAnsweredQuestion ? userAnsweredQuestion.answer : (originalQuestion.answer || ""),
          raw_answer: userAnsweredQuestion ? (userAnsweredQuestion.raw_answer || userAnsweredQuestion.answer) : (originalQuestion.raw_answer || originalQuestion.answer || "")
        };
      });
      
      console.log("All questions being submitted (including autofilled and conditional):", questionsToSubmit);
      
      await submitSurveyAnswers(surveyId, questionsToSubmit);      
      await handleSurveyCompletion(currentSessionStartTime);
    } catch (error) {
      console.error("Error submitting survey:", error);
      setSubmissionError("There was an error submitting your survey. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSurveyCompletion = async (startTime = sessionStartTime) => {
    try {
      // Use the provided startTime or fallback to current sessionStartTime
      const duration = calculateSessionDuration(startTime || sessionStartTime);
      setSurveyDuration(duration);
      // Update survey status first
      await updateSurveyStatus(surveyId, "Completed");
      
      // Then update duration - handle potential errors gracefully
      try {
        await updateSurveyDuration(surveyId, duration);
      } catch (durationError) {
        console.error("Error updating survey duration (non-critical):", durationError);
        // Don't throw - duration update failure shouldn't block completion
      }

      setSubmissionSuccess(true);
      setSurveyCompleted(true);
      setIsSubmitting(false);

      setTimeout(() => {
        router.push(`/survey/${surveyId}/complete?duration=${duration}`);
      }, 1000);
    } catch (error) {
      console.error("Error completing survey:", error);
      setSubmissionError("There was an error finalizing your survey. Your responses have been saved, but please contact support if needed.");
      setIsSubmitting(false);

      setTimeout(() => {
        const duration = calculateSessionDuration(startTime || sessionStartTime);
        router.push(`/survey/${surveyId}/complete?duration=${duration}`);
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <Box
        p={8}
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }


  return (
    <Box
      sx={{
        height: "100vh",
        position: "relative",
        pb: "100px", 
      }}
    >
      {/* Submission Loading Backdrop */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
        open={isSubmitting}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <CircularProgress 
            color="inherit" 
            size={60}
            thickness={4}
          />
          <Typography 
            variant="h6" 
            component="div"
            sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Submitting your survey...
          </Typography>
          <Typography 
            variant="body2" 
            component="div"
            sx={{
              fontFamily: 'Poppins, sans-serif',
              opacity: 0.8,
              textAlign: 'center',
            }}
          >
            Please wait while we save your responses
          </Typography>
        </Box>
      </Backdrop>

      <Box sx={{ p: { xs: 2, sm: 4, md: 8 } }}>
        <Header
          progress={getCurrentProgress()}
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          showProgress={true}
          showSubmitButton={false} // Remove submit button from header
        />

        {submissionError && (
          <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
            <Alert severity="error" sx={{ maxWidth: "600px" }}>
              {submissionError}
            </Alert>
          </Box>
        )}

        {submissionSuccess && (
          <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
            <Alert severity="success" sx={{ maxWidth: "600px" }}>
              Survey submitted successfully! Thank you for your participation.
            </Alert>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "center", height: "65vh", overflowY: "auto" }}>
          <Box
            sx={{
              width: { xs: "95%", sm: "85%", md: "75%" },
              maxWidth: { xs: "none", md: "1000px" },
            }}
          >
            <Box sx={{ mb: 3, p: { xs: 1, sm: 2, md: 3 } }}>
              {/* Progressive Questions Display */}
              {questions.slice(0, currentQuestionIndex + 1).map((question, index) => {
                // Double-check visibility for each question being displayed
                const isVisible = shouldQuestionBeVisible(question, allQuestions);
                
                if (!isVisible) {
                  console.warn(`Question ${question.text} should not be visible but is being displayed`);
                  return null;
                }
                
                return (
                  <Box 
                    key={question.id}
                    sx={{ 
                      mb: 4,
                      opacity: index === currentQuestionIndex ? 1 : 0.7,
                      transition: "opacity 0.3s ease",
                    }}
                  >
                    <QuestionRenderer
                      question={question}
                      isMobile={isMobile}
                      onCategorySelect={onCategorySelect}
                      onRatingSelect={onRatingSelect}
                      onTextChange={onTextChange}
                    />
                  </Box>
                );
              })}

              {/* Spacer to ensure content doesn't get hidden behind fixed buttons */}
              <Box sx={{ height: "120px" }} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Fixed Navigation Buttons at Bottom */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          p: { xs: 2, sm: 3 },
          zIndex: 1000,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1000px",
            margin: "0 auto",
            gap: 2,
          }}
        >
          <Button
            onClick={handlePrevious}
            disabled={isFirstQuestion || isSubmitting}
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 500,
              fontSize: "16px",
              textTransform: "none",
              padding: "12px 24px",
              borderRadius: "12px",
              backgroundColor: "#f4f4f4",
              color: "#4B4B4B",
              minWidth: "120px",
              "&:hover": {
                backgroundColor: "#e0e0e0",
              },
              "&:disabled": {
                backgroundColor: "#f8f8f8",
                color: "#ccc",
              },
            }}
          >
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={isLastQuestion || isSubmitting}
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 500,
              fontSize: "16px",
              textTransform: "none",
              padding: "12px 24px",
              borderRadius: "12px",
              backgroundColor: "#1958F7",
              color: "#fff",
              minWidth: "120px",
              "&:hover": {
                backgroundColor: "#0f47d4",
              },
              "&:disabled": {
                backgroundColor: "#ccc",
                color: "#fff",
              },
            }}
          >
            Next
          </Button>

          <SubmitButton
            isSubmitting={isSubmitting}
            onSubmitClick={handleSubmitClick}
          />
        </Box>
      </Box>

      {/* Submit Survey Modal */}
      <SubmitSurveyModal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleSubmitConfirm}
        disabled={isSubmitting}
      />
    </Box>
  );
}
