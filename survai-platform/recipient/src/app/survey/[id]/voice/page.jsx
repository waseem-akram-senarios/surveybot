"use client";
import { useState, useEffect, useRef } from "react";
import { Box, CircularProgress } from "@mui/material";
import Header from "../../../../../components/Header";
import WaveAnimation from "../../../../../components/WaveAnimation";
import ConversationFlow from "../../../../../components/voice/ConversationFlow";
import VoiceMicrophone from "../../../../../components/voice/VoiceMicrophone";
import {
  getSurveyQuestions,
  validateAnswer,
  submitSurveyAnswers,
  updateSurveyStatus,
  updateSurveyDuration,
  getSympathizeResponse,
  transcribeAudio,
} from "../../../../lib/surveyApi";
import {
  isQuestionPreAnswered,
  needsUserAnswer,
  getQuestionsForUser,
  startAudioAnalysis,
  stopAudioAnalysis,
  calculateProgress,
  getCurrentQuestionNumber,
  getTotalQuestions,
  processAnswer,
} from "../../../../../utils/voiceSurveyUtils";

// Define isQuestionUserAnswered locally for voice survey (checks raw_answer)
const isQuestionUserAnswered = (question) => {
  return question.raw_answer && question.raw_answer.trim() !== "";
};
import {
  addConversationItem,
  initializeConversation,
  createUserAnswerItem,
  createSympathyResponseItem,
  createQuestionItem,
  createCompletionMessageItem,
  createMessageItem,
  calculateSessionDuration,
  scrollToBottom,
} from "../../../../../utils/voiceSurveyUtils";
import {
  startSurveySession,
  calculateSessionDuration as calcSessionDuration,
} from "../../../../../utils/textSurveyUtils.js";
import { useParams, useRouter } from "next/navigation";

export default function VoiceSurveyPage() {
  const [surveyData, setSurveyData] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]); 
  const [userQuestions, setUserQuestions] = useState([]); 
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [surveyStarted, setSurveyStarted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [surveyStartTime, setSurveyStartTime] = useState(null);
  const [surveyDuration, setSurveyDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [isGettingSympathize, setIsGettingSympathize] = useState(false);
  const [conversationItems, setConversationItems] = useState([]);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechQueue, setSpeechQueue] = useState([]);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);

  const params = useParams();
  const router = useRouter();
  const surveyId = params.id || "102";
  
  const shouldQuestionBeVisible = (question, currentAnswers) => {
    if (!question.parent_id || !question.parent_category_texts || question.parent_category_texts.length === 0) {
      return true;
    }

    const parentQuestion = currentAnswers.find(q => q.id === question.parent_id);
    if (!parentQuestion || !parentQuestion.answer || parentQuestion.answer.trim() === "") {
      return false;
    }

    const isVisible = question.parent_category_texts.includes(parentQuestion.answer);
    
    return isVisible;
  };

  const getVisibleQuestions = (allQuestions) => {
    const visibleQuestions = [];
    
    for (const question of allQuestions) {
      if (shouldQuestionBeVisible(question, allQuestions)) {
        visibleQuestions.push(question);
      }
    }
    
    return visibleQuestions.sort((a, b) => a.order - b.order);
  };

  const updateVisibleQuestionsAndCheckConditional = (updatedAllQuestions) => {
    const previousVisibleQuestions = getVisibleQuestions(allQuestions);
    const newVisibleQuestions = getVisibleQuestions(updatedAllQuestions);
    
    setUserQuestions(newVisibleQuestions);
    
    const newlyVisibleQuestions = newVisibleQuestions.filter(newQ => 
      !previousVisibleQuestions.some(prevQ => prevQ.id === newQ.id)
    );
    
    return newlyVisibleQuestions;
  };

  // Refs for audio and conversation
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const isRecordingRef = useRef(false);
  const conversationEndRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const speechQueueRef = useRef([]);
  const isSpeechProcessingRef = useRef(false);

  // Enhanced speech synthesis function with queue management
  const speak = (text, callback) => {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        if (callback) callback();
        resolve();
        return;
      }

      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.lang = "en-US";

      setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (callback) callback();
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (callback) callback();
        resolve();
      };
      synth.speak(utterance);
    });
  };

  // Process speech queue sequentially
  const processSpeechQueue = async () => {
    if (isSpeechProcessingRef.current || speechQueueRef.current.length === 0) {
      return;
    }

    isSpeechProcessingRef.current = true;
    setIsProcessingSpeech(true);

    while (speechQueueRef.current.length > 0) {
      const { text, callback } = speechQueueRef.current.shift();
      await speak(text, callback);
    }

    isSpeechProcessingRef.current = false;
    setIsProcessingSpeech(false);
  };

  // Add speech to queue
  const addToSpeechQueue = (text, callback) => {
    speechQueueRef.current.push({ text, callback });
    processSpeechQueue();
  };

  // Clear speech queue
  const clearSpeechQueue = () => {
    speechQueueRef.current = [];
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsProcessingSpeech(false);
    isSpeechProcessingRef.current = false;
  };

  // Cleanup speech on component unmount
  useEffect(() => {
    return () => {
      clearSpeechQueue();
    };
  }, []);

  // Load survey data
  useEffect(() => {
    const loadSurvey = async () => {
      setIsLoading(true);
      try {
        const data = await getSurveyQuestions(surveyId);
        
        if (data && data.Questions) {
          const initializedQuestions = data.Questions.map(question => ({
            ...question,
            answer: question.answer || "", 
            raw_answer: question.raw_answer || "" 
          }));
          
          setAllQuestions(initializedQuestions);
          
          const questionsToShow = initializedQuestions.filter(question => {
            return question.autofill !== "Yes" || !question.answer || question.answer.trim() === "";
          });
          
          
          const initialVisibleQuestions = getVisibleQuestions(questionsToShow);
          setUserQuestions(initialVisibleQuestions);
          
          const filteredSurveyData = {
            ...data,
            Questions: initialVisibleQuestions
          };
          
          setSurveyData(filteredSurveyData);
          startSurvey(filteredSurveyData);
        }
      } catch (err) {
        console.error("Error loading survey:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSurvey();
  }, []);

  const startSurvey = async (data) => {
    setSurveyStarted(true);
    setSurveyStartTime(new Date());
    const startTime = startSurveySession();
    setSessionStartTime(startTime);

    if (data?.Questions?.length) {
      const firstUnansweredIndex = data.Questions.findIndex(
        q => needsUserAnswer(q) && !isQuestionUserAnswered(q)
      );

      if (firstUnansweredIndex !== -1) {
        const question = data.Questions[firstUnansweredIndex];
        const questionsForUser = getQuestionsForUser(data.Questions);
        const questionNumber = questionsForUser.findIndex(q => q.id === question.id) + 1;
        
        setConversationItems(initializeConversation(question, questionNumber));
        setCurrentQuestionIndex(firstUnansweredIndex);
        scrollToBottom(conversationEndRef);
        
        // Add question narration to queue with delay
        setTimeout(() => {
          addToSpeechQueue(question.text);
        }, 1000);
      } else {
        const messageItem = createMessageItem("It looks like you have already answered all the questions.");
        setConversationItems([messageItem]);
        setSurveyCompleted(true);
      }
    }
  };

  const handleStartRecording = async () => {
    if (!surveyData?.Questions?.length || !surveyStarted) {
      console.error("Survey data not ready.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      });
      
      // Pick the best supported MIME type for transcription
      const mimeOptions = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const supportedMime = mimeOptions.find(m => MediaRecorder.isTypeSupported(m)) || "";
      console.log("Using MediaRecorder MIME type:", supportedMime || "browser default");
      
      const recorderOptions = supportedMime ? { mimeType: supportedMime } : {};
      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);
      audioChunksRef.current = [];
      
      isRecordingRef.current = true;
      const { audioContext, analyser } = startAudioAnalysis(stream, setAudioLevel, isRecordingRef);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleTranscription(blob);
        stream.getTracks().forEach((track) => track.stop());
        stopAudioAnalysis(audioContextRef.current);
        isRecordingRef.current = false;
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone permission error:", error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleTranscription = async (blob) => {
    try {
      setIsProcessing(true);
      console.log(`Audio blob: ${blob.size} bytes, type: ${blob.type}`);
      const transcript = await transcribeAudio(blob);
      
      if (!transcript.trim()) throw new Error("No transcription returned.");
      handleAnswer(transcript);
    } catch (err) {
      console.error("Transcription error:", err);
      // Show error in conversation but DON'T submit as an answer - let user retry
      const errorItem = createMessageItem("Sorry, I couldn't understand that. Please try speaking again.");
      addConversationItem(setConversationItems, errorItem, conversationEndRef);
      addToSpeechQueue("Sorry, I couldn't understand that. Please try speaking again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveIndividualAnswer = async (question, answer) => {
    try {
      setIsSavingAnswer(true);
      
      const questionToSubmit = {
          id: question.id,
          text: question.text,
          scales: question.scales,
          criteria: question.criteria,
          categories: question.categories,
          parent_id: question.parent_id,
          parent_category_texts: question.parent_category_texts,
          order: question.order,
          answer: "", 
          raw_answer: answer,
          autofill: question.autofill || "No"
      };
            
      const response = await submitSurveyAnswers(surveyId, [questionToSubmit]);
            
      if (response && response.QuestionswithAns && response.QuestionswithAns.length > 0) {
        const savedQuestion = response.QuestionswithAns[0];
        const mappedCategory = savedQuestion.Ans;
        
        if (mappedCategory && mappedCategory.trim() !== "") {
          // Update the CURRENT question (not the next one)
          const updatedUserQuestions = [...userQuestions];
          const userQuestionIndex = updatedUserQuestions.findIndex(uq => uq.id === question.id);
          if (userQuestionIndex !== -1) {
            updatedUserQuestions[userQuestionIndex].answer = mappedCategory;
            updatedUserQuestions[userQuestionIndex].raw_answer = answer;
            setUserQuestions(updatedUserQuestions);
          }
  
          // Also update allQuestions for conditional logic
          const updatedAllQuestions = [...allQuestions];
          const allQuestionIndex = updatedAllQuestions.findIndex(q => q.id === question.id);
          if (allQuestionIndex !== -1) {
            updatedAllQuestions[allQuestionIndex].answer = mappedCategory;
            updatedAllQuestions[allQuestionIndex].raw_answer = answer;
            setAllQuestions(updatedAllQuestions);
            
            // Check for newly visible conditional questions
            const newlyVisibleQuestions = updateVisibleQuestionsAndCheckConditional(updatedAllQuestions);
            return { updatedAllQuestions, newlyVisibleQuestions };
          }
        }
      }
      
      return { updatedAllQuestions: allQuestions, newlyVisibleQuestions: [] };
      
    } catch (error) {
      console.error("Error saving individual answer:", error);
      return { updatedAllQuestions: allQuestions, newlyVisibleQuestions: [] };
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const handleAnswer = async (answer) => {
    const q = surveyData.Questions[currentQuestionIndex];
    const processed = processAnswer(answer, q.criteria);
    
    console.log("Processing answer:", {
      originalAnswer: answer,
      processedAnswer: processed,
      questionCriteria: q.criteria,
      questionId: q.id,
      questionText: q.text
    });

    const userAnswerItem = createUserAnswerItem(processed);
    addConversationItem(setConversationItems, userAnswerItem, conversationEndRef);

    // Update the current question's raw_answer in surveyData
    const updatedSurveyData = { ...surveyData };
    updatedSurveyData.Questions[currentQuestionIndex].raw_answer = processed;
    setSurveyData(updatedSurveyData);

    // Update the current question in userQuestions
    const updatedUserQuestions = [...userQuestions];
    const userQuestionIndex = updatedUserQuestions.findIndex(uq => uq.id === q.id);
    if (userQuestionIndex !== -1) {
      updatedUserQuestions[userQuestionIndex].raw_answer = processed;
      setUserQuestions(updatedUserQuestions);
    }

    // Save the answer and get updated questions
    const { updatedAllQuestions, newlyVisibleQuestions } = await saveIndividualAnswer(q, processed);

    // Handle sympathy response and then move to next step
    await handleSympathyResponse(q.text, processed, () => {
      handleNextStepWithConditional(updatedSurveyData, updatedAllQuestions, newlyVisibleQuestions);
    });
  };

  const handleSympathyResponse = async (questionText, userResponse, onComplete) => {
    try {
      setIsGettingSympathize(true);
      const sympatheticResponse = await getSympathizeResponse(questionText, userResponse);
      
      const sympathyItem = createSympathyResponseItem(sympatheticResponse);
      addConversationItem(setConversationItems, sympathyItem, conversationEndRef);
      
      // Add sympathetic response to speech queue with callback to proceed
      setTimeout(() => {
        addToSpeechQueue(sympatheticResponse, () => {
          if (onComplete) {
            setTimeout(onComplete, 500); // Small delay after sympathy response
          }
        });
      }, 500);
      
    } catch (error) {
      console.error('Error getting sympathetic response:', error);
      if (onComplete) {
        setTimeout(onComplete, 500);
      }
    } finally {
      setIsGettingSympathize(false);
    }
  };

  const handleNextStepWithConditional = async (updatedSurveyData, updatedAllQuestions = null, newlyVisibleQuestions = null) => {
    // Use the passed updatedAllQuestions or fall back to current state
    const questionsToCheck = updatedAllQuestions || allQuestions;
    
    // Get the current visible questions based on the updated state
    const currentUserQuestions = getVisibleQuestions(questionsToCheck);
    
    // Update userQuestions state with the new visible questions
    setUserQuestions(currentUserQuestions);
    
    // Update surveyData with the new visible questions
    const updatedSurveyDataWithVisible = {
      ...updatedSurveyData,
      Questions: currentUserQuestions
    };
    setSurveyData(updatedSurveyDataWithVisible);
    
    // Check if there are newly visible conditional questions that need to be asked
    if (newlyVisibleQuestions && newlyVisibleQuestions.length > 0) {
      const nextConditionalQuestion = newlyVisibleQuestions[0];
      const questionNumber = currentUserQuestions.findIndex(q => q.id === nextConditionalQuestion.id) + 1;
              
      const nextQuestionItem = createQuestionItem(nextConditionalQuestion, questionNumber);
      addConversationItem(setConversationItems, nextQuestionItem, conversationEndRef);
      
      const newIndex = currentUserQuestions.findIndex(q => q.id === nextConditionalQuestion.id);
      setCurrentQuestionIndex(newIndex);
      
      // Add conditional question to speech queue
      setTimeout(() => {
        addToSpeechQueue(nextConditionalQuestion.text);
      }, 800);
      return;
    }

    // Find the next unanswered question from the current position
    const nextUnansweredIndex = currentUserQuestions.findIndex(
      (q, idx) => {
        return idx > currentQuestionIndex && 
               needsUserAnswer(q) && 
               !isQuestionUserAnswered(q);
      }
    );

    if (nextUnansweredIndex !== -1) {
      const nextQ = currentUserQuestions[nextUnansweredIndex];
      const questionNumber = nextUnansweredIndex + 1;
      
      const nextQuestionItem = createQuestionItem(nextQ, questionNumber);
      addConversationItem(setConversationItems, nextQuestionItem, conversationEndRef);
      setCurrentQuestionIndex(nextUnansweredIndex);
      
      // Add next question to speech queue
      setTimeout(() => {
        addToSpeechQueue(nextQ.text);
      }, 800);
    } else {
      // Check if there are any remaining unanswered questions from the beginning
      const remainingUnansweredIndex = currentUserQuestions.findIndex(
        q => needsUserAnswer(q) && !isQuestionUserAnswered(q)
      );
      
      if (remainingUnansweredIndex !== -1) {
        const nextQ = currentUserQuestions[remainingUnansweredIndex];
        const questionNumber = remainingUnansweredIndex + 1;
        
        const nextQuestionItem = createQuestionItem(nextQ, questionNumber);
        addConversationItem(setConversationItems, nextQuestionItem, conversationEndRef);
        setCurrentQuestionIndex(remainingUnansweredIndex);
        
        // Add remaining question to speech queue
        setTimeout(() => {
          addToSpeechQueue(nextQ.text);
        }, 800);
      } else {
        // All questions answered, complete the survey
        await handleSurveyCompletion();
      }
    }
  };

  const handleSurveyCompletion = async () => {
    const completionMessage = "Thank you for completing the survey! Your responses have been saved.";
    const completionItem = createCompletionMessageItem(completionMessage);
    addConversationItem(setConversationItems, completionItem, conversationEndRef);
    
    // Add completion message to speech queue with post-submission callback
    setTimeout(() => {
      addToSpeechQueue(completionMessage, async () => {
        // This callback runs after completion speech finishes
        try {
          await handlePostSubmissionTasks();
        } catch (error) {
          console.error("Failed to complete survey:", error);
          const errorMessage = "There was an error finalizing your survey.";
          const errorItem = createCompletionMessageItem(errorMessage);
          addConversationItem(setConversationItems, errorItem, conversationEndRef);
          
          // Add error message to speech queue with redirect callback
          addToSpeechQueue(errorMessage, () => {
            setTimeout(() => {
              const duration = calcSessionDuration(sessionStartTime || new Date());
              router.push(`/survey/${surveyId}/complete?duration=${duration}`);
            }, 1000);
          });
        }
      });
    }, 500);
    
    setSurveyCompleted(true);
  };

  const handlePostSubmissionTasks = async () => {
    try {
      const currentSessionStartTime = sessionStartTime || startSurveySession();
      if (!sessionStartTime) {
        setSessionStartTime(currentSessionStartTime);
      }

      const duration = calcSessionDuration(currentSessionStartTime);
      setSurveyDuration(duration);

      await updateSurveyStatus(surveyId, "Completed");
      
      try {
        await updateSurveyDuration(surveyId, duration);
      } catch (durationError) {
        console.error("Error updating survey duration (non-critical):", durationError);
      }

      const successMessage = "Survey completed successfully! Redirecting...";
      const successItem = createCompletionMessageItem(successMessage);
      addConversationItem(setConversationItems, successItem, conversationEndRef);

      // Add success message to speech queue with redirect callback
      addToSpeechQueue(successMessage, () => {
        // Wait a bit more after speech completes, then redirect
        setTimeout(() => {
          router.push(`/survey/${surveyId}/complete?duration=${duration}`);
        }, 1000);
      });
      
    } catch (error) {
      console.error("Error in post-submission tasks:", error);
      // If there's an error, still redirect after a delay
      setTimeout(() => {
        const duration = calcSessionDuration(sessionStartTime || new Date());
        router.push(`/survey/${surveyId}/complete?duration=${duration}`);
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <Box p={8} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        backgroundColor: "white",
        paddingBottom: "200px",
      }}
    >
      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 4, md: 8 }, pt: { xs: 2, sm: 4, md: 8 }, pb: { xs: 2, sm: 4 } }}>
        <Header
          progress={calculateProgress({ Questions: allQuestions }, surveyStarted, surveyCompleted)}
          currentQuestion={getCurrentQuestionNumber({ Questions: allQuestions }, surveyStarted, surveyCompleted)}
          totalQuestions={getTotalQuestions({ Questions: allQuestions })}
          showProgress={true}
          showSubmitButton={false}
        />
      </Box>

      {/* Speaking Indicator - Updated to show processing state */}
      {(isSpeaking || isProcessingSpeech) && (
        <Box 
          sx={{ 
            position: "fixed", 
            top: 20, 
            left: 20, 
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 1,
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            padding: "8px 16px",
            borderRadius: "20px",
            border: "1px solid rgba(76, 175, 80, 0.3)"
          }}
        >
          <Box 
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#4CAF50",
              animation: "pulse 1.5s ease-in-out infinite"
            }}
          />
          <span style={{ fontSize: "14px", color: "#4CAF50" }}>
            {isSpeaking ? "Speaking..." : "Processing speech..."}
          </span>
        </Box>
      )}

      {/* Saving Indicator */}
      {isSavingAnswer && (
        <Box 
          sx={{ 
            position: "fixed", 
            top: 20, 
            right: 20, 
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 1,
            backgroundColor: "rgba(25, 88, 247, 0.1)",
            padding: "8px 16px",
            borderRadius: "20px",
            border: "1px solid rgba(25, 88, 247, 0.3)"
          }}
        >
          <CircularProgress size={16} />
          <span style={{ fontSize: "14px", color: "#1958F7" }}>Saving...</span>
        </Box>
      )}

      {/* Conversation Flow */}
      <ConversationFlow
        conversationItems={conversationItems}
        conversationEndRef={conversationEndRef}
      />

      {/* Voice Microphone - Updated to include speech processing state */}
      <VoiceMicrophone
        isRecording={isRecording}
        isProcessing={isProcessing}
        isGettingSympathize={isGettingSympathize}
        isLoading={isLoading}
        surveyData={surveyData}
        surveyCompleted={surveyCompleted}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        isSpeaking={isSpeaking || isProcessingSpeech}
      />

      {/* Wave Animation */}
      <WaveAnimation audioLevel={isRecording ? audioLevel : 0} />

      {/* Add CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </Box>
  );
}
