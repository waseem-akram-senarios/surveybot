// Helper function to check if a question is pre-answered by AI
export const isQuestionPreAnswered = (question) => {
  return question.answer && question.answer.trim() !== "";
};

// Helper function to check if a question is answered by user
export const isQuestionUserAnswered = (question) => {
  return question.raw_answer && question.raw_answer.trim() !== "";
};

// Helper function to check if question needs to be answered by user
export const needsUserAnswer = (question) => {
  return !isQuestionPreAnswered(question);
};

// Helper function to find questions that need user answers
export const getQuestionsForUser = (questions) => {
  return questions.filter(q => needsUserAnswer(q));
};

// Audio analysis utilities
export const startAudioAnalysis = (stream, setAudioLevel, isRecording) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  analyser.fftSize = 256;
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const updateAudioLevel = () => {
    if (analyser && isRecording.current) {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      setAudioLevel(average);
      requestAnimationFrame(updateAudioLevel);
    }
  };

  updateAudioLevel();
  return { audioContext, analyser };
};

export const stopAudioAnalysis = (audioContext) => {
  if (audioContext) {
    audioContext.close();
  }
};

// Speech synthesis utility
export const speak = (text, setIsSpeaking, callback) => {
  const synth = window.speechSynthesis;
  if (!synth) return;

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.lang = "en-US";

  setIsSpeaking(true);
  utterance.onend = () => {
    setIsSpeaking(false);
    if (callback) callback();
  };
  synth.speak(utterance);
};

// Progress calculation utilities
export const calculateProgress = (surveyData, surveyStarted, surveyCompleted) => {
  if (!surveyData?.Questions || !surveyStarted) return 0;
  if (surveyCompleted) return 100;

  const allQuestions = surveyData.Questions;
  
  // Get questions that need user answers (excluding autofilled ones)
  const questionsNeedingAnswers = allQuestions.filter(q => 
    q.autofill !== "Yes" || !q.answer || q.answer.trim() === ""
  );
  
  // Count answered questions (those with raw_answer)
  const answeredQuestions = questionsNeedingAnswers.filter(q => 
    q.raw_answer && q.raw_answer.trim() !== ""
  );
  
  if (questionsNeedingAnswers.length === 0) return 100;
  
  return Math.round((answeredQuestions.length / questionsNeedingAnswers.length) * 100);
};

export const getCurrentQuestionNumber = (surveyData, surveyStarted, surveyCompleted) => {
  if (!surveyData?.Questions || !surveyStarted) return 0;
  
  const allQuestions = surveyData.Questions;
  
  // Get questions that need user answers
  const questionsNeedingAnswers = allQuestions.filter(q => 
    q.autofill !== "Yes" || !q.answer || q.answer.trim() === ""
  );
  
  // Count answered questions
  const answeredQuestions = questionsNeedingAnswers.filter(q => 
    q.raw_answer && q.raw_answer.trim() !== ""
  );
  
  return answeredQuestions.length;
};

export const getTotalQuestions = (surveyData) => {
  if (!surveyData?.Questions) return 0;
  
  // Return total questions that need user answers (excluding autofilled ones)
  const questionsNeedingAnswers = surveyData.Questions.filter(q => 
    q.autofill !== "Yes" || !q.answer || q.answer.trim() === ""
  );
  
  return questionsNeedingAnswers.length;
};

// Answer processing utility
export const processAnswer = (answer, questionCriteria) => {
  let processed = answer;
  
  if (questionCriteria === "scale") {
    const match = answer.match(/\d+/);
    if (match) processed = match[0];
  }
  
  return processed;
};


// Conversation management utilities for voice survey

// Scroll to bottom helper
export const scrollToBottom = (conversationEndRef) => {
  setTimeout(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, 100);
};

// Conversation item creators
export const createUserAnswerItem = (answer) => ({
  type: 'user_answer',
  text: answer
});

export const createSympathyResponseItem = (response) => ({
  type: 'sympathy_response',
  text: response
});

export const createQuestionItem = (question, questionNumber) => ({
  type: 'question',
  text: question.text,
  questionNumber: questionNumber,
  id: question.id
});

export const createCompletionMessageItem = (message) => ({
  type: 'completion',
  text: message
});

export const createMessageItem = (message) => ({
  type: 'message',
  text: message
});

// Conversation management functions
export const addConversationItem = (setConversationItems, item, conversationEndRef) => {
  setConversationItems(prev => [...prev, item]);
  scrollToBottom(conversationEndRef);
};

export const initializeConversation = (question, questionNumber) => ([{
  type: 'question',
  text: question.text,
  questionNumber: questionNumber,
  id: question.id
}]);

// Survey session management
export const calculateSessionDuration = (startTime) => {
  if (!startTime) return 0;
  const endTime = new Date();
  return Math.round((endTime - startTime) / 1000);
};