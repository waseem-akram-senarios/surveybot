// Helper functions for text survey functionality

// Question validation helpers
export const isQuestionPreAnswered = (question) => {
    return question.answer && question.answer.trim() !== "";
  };
  
  export const isQuestionUserAnswered = (question) => {
    return question.answer && question.answer.trim() !== "";
  };
  
  export const needsUserAnswer = (question) => {
    return !isQuestionPreAnswered(question);
  };
  
  export const getQuestionsForUser = (questions) => {
    return questions.filter((q) => needsUserAnswer(q));
  };
  
  export const findUnansweredQuestionsForUser = (questions) => {
    return questions.filter(
      (q) => needsUserAnswer(q) && !isQuestionUserAnswered(q)
    );
  };
  
  export const hasUnansweredQuestions = (questions) => {
    const unansweredQuestions = questions.filter(q => !q.answer || q.answer.trim() === '');
    return unansweredQuestions.length > 0;
  };
  
  // Progress calculation helpers
  export const calculateProgress = (questions) => {
    if (!questions.length) return 0;
    const answeredQuestions = questions.filter(q => q.answer && q.answer.trim() !== '');
    return Math.round((answeredQuestions.length / questions.length) * 100);
  };
  
  export const getCurrentQuestionNumber = (questions) => {
    const answeredQuestions = questions.filter(q => q.answer && q.answer.trim() !== '');
    return answeredQuestions.length;
  };
  
  export const getTotalQuestions = (questions) => {
    return questions.length;
  };
  
  // Answer handling helpers
  export const handleCategorySelect = (questions, questionId, option) => {
    return questions.map(q =>
      q.id === questionId
        ? { ...q, answer: option }
        : q
    );
  };
  
  export const handleRatingSelect = (questions, questionId, rating) => {
    return questions.map(q =>
      q.id === questionId
        ? { ...q, answer: rating.toString() }
        : q
    );
  };
  
  export const handleOpenTextChange = (questions, questionId, text) => {
    return questions.map(q =>
      q.id === questionId
        ? { ...q, answer: text }
        : q
    );
  };
  
  // Survey timing helpers
  export const startSurveySession = () => {
    const now = new Date();
    console.log("Session started at:", now);
    return now;
  };
  
  export const calculateSessionDuration = (startTime) => {
    if (!startTime) return 0;
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    console.log("Session started at:", startTime);
    console.log("Session ended at:", endTime);
    console.log("Calculated session duration:", duration, "seconds");
    return duration;
  };