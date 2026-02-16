"use client";
import { useState, useEffect, useRef } from "react";
import { Box, CircularProgress } from "@mui/material";
import Header from "../../../../../components/Header";
import WaveAnimation from "../../../../../components/WaveAnimation";
import ConversationFlow from "../../../../../components/voice/ConversationFlow";
import VoiceMicrophone from "../../../../../components/voice/VoiceMicrophone";
import { useVapi } from "../../../../hooks/useVapi";
import {
  getSurveyQuestions,
  createWorkflow,
  updateSurveyStatus,
  updateSurveyDuration,
} from "../../../../lib/surveyApi";
import {
  calculateProgress,
  getCurrentQuestionNumber,
  getTotalQuestions,
  createMessageItem,
  addConversationItem,
  scrollToBottom,
} from "../../../../../utils/voiceSurveyUtils";
import {
  startSurveySession,
  calculateSessionDuration as calcSessionDuration,
} from "../../../../../utils/textSurveyUtils.js";
import { useParams, useRouter } from "next/navigation";

const getRecipientDataFromStorage = (surveyId) => {
  try {
    const stored = sessionStorage.getItem(`survey_recipient_${surveyId}`);
    if (stored) {
      const data = JSON.parse(stored);
      console.log("Retrieved recipient data from session storage:", data);
      return data;
    }
  } catch (error) {
    console.warn("Failed to retrieve recipient data from session storage:", error);
  }
  return null;
};

const createWorkflowVariables = (surveyId, surveyData, recipientData) => {
  const recipient = recipientData?.recipient || recipientData?.name || surveyData?.name || 'Survey Participant';
  const name = recipientData?.name || recipientData?.recipient || surveyData?.name || 'Survey Response';
  const rideId = recipientData?.rideId || `${surveyId}_${Date.now()}`;
  
  console.log("Creating workflow variables with:", { recipient, name, rideId });
  
  return {
    SurveyId: surveyId,
    Recipient: recipient,
    Name: name,
    RideID: rideId,
  };
};

export default function VoiceSurveyPage() {
  const [surveyData, setSurveyData] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [recipientData, setRecipientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [surveyStarted, setSurveyStarted] = useState(false);
  const [surveyStartTime, setSurveyStartTime] = useState(null);
  const [surveyDuration, setSurveyDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [conversationItems, setConversationItems] = useState([]);
  const [workflowVariables, setWorkflowVariables] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [questionCounter, setQuestionCounter] = useState(1);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);

  // Add state for managing transcript accumulation
  const [currentAssistantTranscript, setCurrentAssistantTranscript] = useState('');
  const [currentUserTranscript, setCurrentUserTranscript] = useState('');
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [lastDisplayedAssistantMessage, setLastDisplayedAssistantMessage] = useState('');
  const [lastDisplayedUserMessage, setLastDisplayedUserMessage] = useState('');

  const params = useParams();
  const router = useRouter();
  const surveyId = params.id || "102";

  const { callState, startCall, endCall, clearError, debugVapiState } = useVapi();

  // Refs for conversation and audio level simulation
  const conversationEndRef = useRef(null);
  const audioLevelRef = useRef(0);

  useEffect(() => {
    console.log("tr")
    const loadedRecipientData = getRecipientDataFromStorage(surveyId);
    if (loadedRecipientData) {
      setRecipientData(loadedRecipientData);
    } else {
      console.warn("No recipient data found in session storage for survey:", surveyId);
    }
  }, [surveyId]);

  // Audio level simulation for wave animation when VAPI is active
  useEffect(() => {
    let interval;
    if (callState.isCallActive) {
      interval = setInterval(() => {
        // Use VAPI's volume or simulate audio level
        audioLevelRef.current = callState.volume * 100 || Math.random() * 50;
      }, 100);
    } else {
      audioLevelRef.current = 0;
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.isCallActive, callState.volume]);

  // Handle VAPI messages and update conversation
  useEffect(() => {
    if (callState.messages.length > 0) {
      const latestMessage = callState.messages[callState.messages.length - 1];
      
      console.log('📨 Processing VAPI message:', latestMessage);
      
      if (latestMessage.type === 'transcript') {
        handleTranscriptMessage(latestMessage);
      }
      
      // Handle workflow completion - VAPI decides when survey ends
      if (latestMessage.type === 'workflow-completed') {
        console.log('✅ Workflow completed event received - VAPI finished the survey');
        handleWorkflowCompletion(latestMessage);
      }
      
      // Handle other workflow completion types
      if (latestMessage.type === 'workflow-completion') {
        console.log('✅ Workflow completion event received - VAPI finished the survey');
        handleWorkflowCompletion(latestMessage);
      }
      
      // Handle conversation events
      if (latestMessage.type === 'conversation-started') {
        console.log('💬 Conversation started event received');
      }
      
      if (latestMessage.type === 'conversation-ended') {
        console.log('🔚 Conversation ended event received - VAPI ended the survey');
        handleWorkflowCompletion(latestMessage);
      }
      
      // Handle call end events - often indicates survey completion
      if (latestMessage.type === 'hang' || latestMessage.type === 'call-end') {
        console.log('📞 Call ended by VAPI - survey likely completed');
        // Small delay to ensure any final messages are processed
        setTimeout(() => {
          if (surveyStarted && !surveyCompleted) {
            console.log('🎯 Triggering survey completion after call end');
            handleWorkflowCompletion(latestMessage);
          }
        }, 2000);
      }
    }
  }, [callState.messages, surveyStarted, surveyCompleted]);

  // Monitor VAPI call state for survey completion
  useEffect(() => {
    if (callState.surveyCompleted && surveyStarted && !surveyCompleted) {
      console.log('🎯 VAPI marked survey as completed - routing to completion screen');
      handleWorkflowCompletion({ type: 'vapi-completion' });
    }
  }, [callState.surveyCompleted, surveyStarted, surveyCompleted]);

  const handleTranscriptMessage = (message) => {
    const { role, transcript, transcriptType } = message;
    
    if (!transcript?.trim()) return;

    console.log(`Processing ${role} transcript (${transcriptType}): "${transcript}"`);

    if (role === 'assistant') {
      // Handle assistant messages - show streaming text effect with paragraph building
      if (transcriptType === 'partial') {
        // Update the current transcript state for streaming display
        setCurrentAssistantTranscript(transcript);
        setIsAssistantSpeaking(true);
        
        // Update or create streaming conversation item
        setConversationItems(prev => {
          const lastItem = prev[prev.length - 1];
          
          // If the last item is an assistant message, check if we should stream or append
          if (lastItem && (lastItem.type === 'question' || lastItem.type === 'assistant') && lastItem.role === 'assistant') {
            
            // If it's currently streaming, update the streaming part only
            if (lastItem.isStreaming) {
              const updatedItem = {
                ...lastItem,
                streamingText: transcript, // Keep the streaming part separate
                id: lastItem.id
              };
              return [...prev.slice(0, -1), updatedItem];
            } else {
              // If it's a completed message, start streaming additional content
              const updatedItem = {
                ...lastItem,
                streamingText: transcript, // Add streaming text to existing completed text
                isStreaming: true,
                id: lastItem.id
              };
              return [...prev.slice(0, -1), updatedItem];
            }
          } else {
            // Create new streaming assistant message
            const questionItem = {
              type: 'question',
              role: 'assistant',
              text: '', // Base text (empty for now)
              streamingText: transcript, // Streaming part
              questionNumber: questionCounter,
              isStreaming: true,
              id: `assistant-${Date.now()}`
            };
            setQuestionCounter(prev => prev + 1);
            return [...prev, questionItem];
          }
        });
        
        // Auto-scroll during streaming
        setTimeout(() => {
          if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 50);
        
      } else if (transcriptType === 'final') {
        const finalTranscript = transcript.trim();
        console.log(`Final assistant transcript: "${finalTranscript}"`);
        
        if (finalTranscript) {
          // Finalize the streaming message by moving streaming text to main text
          setConversationItems(prev => {
            const lastItem = prev[prev.length - 1];
            
            // If the last item is a streaming assistant message, finalize it
            if (lastItem && (lastItem.type === 'question' || lastItem.type === 'assistant') && lastItem.role === 'assistant') {
              const baseText = lastItem.text || '';
              const combinedText = baseText ? `${baseText} ${finalTranscript}` : finalTranscript;
              
              const updatedItem = {
                ...lastItem,
                text: combinedText, // Combine base text with final transcript
                streamingText: '', // Clear streaming text
                isStreaming: false, // Mark as completed
                id: lastItem.id
              };
              return [...prev.slice(0, -1), updatedItem];
            } else {
              // Create new completed assistant message
              const questionItem = {
                type: 'question',
                role: 'assistant',
                text: finalTranscript,
                streamingText: '',
                questionNumber: questionCounter,
                isStreaming: false,
                id: `assistant-${Date.now()}`
              };
              setQuestionCounter(prev => prev + 1);
              return [...prev, questionItem];
            }
          });
          
          setLastDisplayedAssistantMessage(finalTranscript);
        }
        
        // Reset assistant speaking state
        setCurrentAssistantTranscript('');
        setIsAssistantSpeaking(false);
      }
    } else if (role === 'user') {
      // Handle user messages - show streaming text effect with paragraph building
      if (transcriptType === 'partial') {
        // Update the current transcript state for streaming display
        setCurrentUserTranscript(transcript);
        setIsUserSpeaking(true);
        
        // Update or create streaming conversation item
        setConversationItems(prev => {
          const lastItem = prev[prev.length - 1];
          
          // If the last item is a user message, check if we should stream or append
          if (lastItem && (lastItem.type === 'user_answer' || lastItem.type === 'user') && lastItem.role === 'user') {
            
            // If it's currently streaming, update the streaming part only
            if (lastItem.isStreaming) {
              const updatedItem = {
                ...lastItem,
                streamingText: transcript, // Keep the streaming part separate
                id: lastItem.id
              };
              return [...prev.slice(0, -1), updatedItem];
            } else {
              // If it's a completed message, start streaming additional content
              const updatedItem = {
                ...lastItem,
                streamingText: transcript, // Add streaming text to existing completed text
                isStreaming: true,
                id: lastItem.id
              };
              return [...prev.slice(0, -1), updatedItem];
            }
          } else {
            // Create new streaming user message
            const userAnswerItem = {
              type: 'user_answer',
              role: 'user',
              text: '', // Base text (empty for now)
              streamingText: transcript, // Streaming part
              isStreaming: true,
              id: `user-${Date.now()}`
            };
            return [...prev, userAnswerItem];
          }
        });
        
        // Auto-scroll during streaming
        setTimeout(() => {
          if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 50);
        
      } else if (transcriptType === 'final') {
        const finalTranscript = transcript.trim();
        console.log(`Final user transcript: "${finalTranscript}"`);
        
        if (finalTranscript) {
          // Finalize the streaming message by moving streaming text to main text
          setConversationItems(prev => {
            const lastItem = prev[prev.length - 1];
            
            // If the last item is a streaming user message, finalize it
            if (lastItem && (lastItem.type === 'user_answer' || lastItem.type === 'user') && lastItem.role === 'user') {
              const baseText = lastItem.text || '';
              const combinedText = baseText ? `${baseText} ${finalTranscript}` : finalTranscript;
              
              const updatedItem = {
                ...lastItem,
                text: combinedText, // Combine base text with final transcript
                streamingText: '', // Clear streaming text
                isStreaming: false, // Mark as completed
                id: lastItem.id
              };
              return [...prev.slice(0, -1), updatedItem];
            } else {
              // Create new completed user message
              const userAnswerItem = {
                type: 'user_answer',
                role: 'user',
                text: finalTranscript,
                streamingText: '',
                isStreaming: false,
                id: `user-${Date.now()}`
              };
              return [...prev, userAnswerItem];
            }
          });
          
          setLastDisplayedUserMessage(finalTranscript);
        }
        
        // Reset user speaking state
        setCurrentUserTranscript('');
        setIsUserSpeaking(false);
      }
    }
  };

  // Handle errors from VAPI - For continuous conversation, only handle critical errors
  useEffect(() => {
    if (callState.error) {
      console.error('VAPI Error:', callState.error);
      
      // Don't show errors if survey is completing or completed
      if (surveyCompleted) {
        console.log('⚠️ Ignoring error during survey completion:', callState.error);
        return;
      }
      
      // Check if this is a natural end-of-call error (common when VAPI ends the workflow)
      const isNaturalEndError = callState.error.includes('connection') ||
                               callState.error.includes('stream') ||
                               callState.error.includes('ended') ||
                               callState.error.includes('closed') ||
                               callState.error.includes('disconnected') ||
                               callState.error.includes('WebSocket');
      
      // If this is a natural end error and we're not in the middle of starting, ignore it
      if (isNaturalEndError && surveyStarted && !callState.isConnecting) {
        console.log('⚠️ Ignoring natural end-of-call error:', callState.error);
        // Clear the error silently
        setTimeout(() => {
          clearError();
        }, 1000);
        return;
      }
      
      // Check if this is a critical error that requires user intervention
      const isCriticalError = callState.error.includes('Workflow ID') || 
                             callState.error.includes('Does Not Exist') ||
                             callState.error.includes('permission') ||
                             callState.error.includes('Microphone') ||
                             callState.error.includes('Failed to initialize');
      
      if (isCriticalError) {
        // Only show error UI for critical errors
        const errorMessage = `Connection Error: ${callState.error}`;
        const errorItem = {
          type: 'error',
          text: errorMessage,
          id: `error-${Date.now()}`,
          canRetry: true
        };
        
        setConversationItems(prev => [...prev, errorItem]);
        
        // Reset survey started state to allow retry for critical errors only
        if (surveyStarted) {
          console.log('🔄 Resetting survey state due to critical error - user can retry');
          setSurveyStarted(false);
        }
      } else {
        // For non-critical errors, just log them but don't interrupt the conversation
        console.warn('⚠️ Non-critical VAPI error (continuing conversation):', callState.error);
        
        // Don't show UI for non-critical errors during active conversation
        if (!surveyStarted || callState.isConnecting) {
          const warningItem = {
            type: 'warning',
            text: 'Connection hiccup - continuing...',
            id: `warning-${Date.now()}`,
            temporary: true
          };
          
          setConversationItems(prev => [...prev, warningItem]);
          
          // Remove the warning after a few seconds
          setTimeout(() => {
            setConversationItems(prev => prev.filter(item => item.id !== warningItem.id));
          }, 3000);
        }
      }
    }
  }, [callState.error, surveyStarted, surveyCompleted, callState.isConnecting, clearError]);

  // Load survey data and create workflow
  useEffect(() => {
    const loadSurveyAndCreateWorkflow = async () => {
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
          setSurveyData({
            ...data,
            Questions: initializedQuestions
          });
  
          // Create workflow variables for VAPI - now with proper recipient data
          console.log("Creating workflow variables with recipient data:", recipientData);
          const variables = createWorkflowVariables(surveyId, data, recipientData);
          setWorkflowVariables(variables);
  
          // Create the workflow for this survey
          setIsCreatingWorkflow(true);
          console.log('Creating workflow for survey:', surveyId);
          
          try {
            const createdWorkflowId = await createWorkflow(surveyId);
            console.log('Workflow created with ID:', createdWorkflowId);
            setWorkflowId(createdWorkflowId);
            
            // Initialize conversation with welcome message
            const welcomeMessage = "Click the microphone below to start the voice survey";
            const welcomeItem = createMessageItem(welcomeMessage);
            setConversationItems([welcomeItem]);
            scrollToBottom(conversationEndRef);
            
          } catch (workflowError) {
            console.error('Failed to create workflow:', workflowError);
            const errorMessage = `Failed to create workflow: ${workflowError.message}. Please try refreshing the page.`;
            const errorItem = createMessageItem(errorMessage);
            setConversationItems([errorItem]);
          } finally {
            setIsCreatingWorkflow(false);
          }
        }
      } catch (err) {
        console.error("Error loading survey:", err);
        const errorItem = createMessageItem("Error loading survey. Please refresh the page.");
        setConversationItems([errorItem]);
      } finally {
        setIsLoading(false);
      }
    };
  
    // Only run when we have either recipientData or confirmed there's no data
    // This prevents the effect from running before recipient data is loaded
    if (recipientData !== null || sessionStorage.getItem(`survey_recipient_${surveyId}`) === null) {
      loadSurveyAndCreateWorkflow();
    }
  }, [surveyId, recipientData]);

  const startSurvey = async (data, variables, workflowId) => {
    setSurveyStarted(true);
    setSurveyStartTime(new Date());
    const startTime = startSurveySession();
    setSessionStartTime(startTime);

    // Start VAPI call with workflow ID and variables
    if (workflowId && variables) {
      try {
        await startCall(workflowId, variables);
      } catch (error) {
        console.error('Failed to start VAPI call:', error);
        const errorItem = createMessageItem("Failed to start voice session. Please check your configuration.");
        addConversationItem(setConversationItems, errorItem, conversationEndRef);
      }
    } else {
      console.error('Cannot start survey: missing workflow ID or variables');
      const errorItem = createMessageItem("Workflow not ready. Please wait for initialization to complete.");
      addConversationItem(setConversationItems, errorItem, conversationEndRef);
    }
  };

  // Handle VAPI call end - redirect to completion page ONLY if survey was successful
  useEffect(() => {
    // Only complete survey if it was started successfully and ended without errors
    if (surveyStarted && !callState.isCallActive && !callState.isConnecting && !isLoading && !isCreatingWorkflow && !callState.error) {
      // Add a small delay to ensure the call properly ended vs error
      const timer = setTimeout(() => {
        if (!callState.error) { // Double-check no error occurred
          handleSurveyCompletion();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [callState.isCallActive, callState.isConnecting, surveyStarted, isLoading, isCreatingWorkflow, callState.error]);

  const handleWorkflowCompletion = async (completionMessage) => {
    await handleSurveyCompletion();
  };

  const handleSurveyCompletion = async () => {
    if (surveyCompleted) return;
    
    console.log('🎯 Handling survey completion - VAPI has ended the workflow');
    setSurveyCompleted(true);
    
    // Clear any VAPI errors since this is a successful completion
    clearError();
    
    const completionMessage = "Thank you for completing the survey! Your responses have been saved.";
    const completionItem = {
      type: 'completion',
      text: completionMessage,
      id: `completion-${Date.now()}`
    };
    
    setConversationItems(prev => [...prev, completionItem]);

    try {
      const currentSessionStartTime = sessionStartTime || startSurveySession();
      if (!sessionStartTime) {
        setSessionStartTime(currentSessionStartTime);
      }

      const duration = calcSessionDuration(currentSessionStartTime);
      setSurveyDuration(duration);

      // VAPI workflow handles survey status and response updates
      console.log('📋 Survey status and responses handled by VAPI workflow - skipping API call');
      
      // Only update duration if needed
      try {
        await updateSurveyDuration(surveyId, duration);
        console.log('⏱️ Survey duration updated successfully');
      } catch (durationError) {
        console.error("Error updating survey duration (non-critical):", durationError);
      }

      // End the VAPI call if it's still active
      if (callState.isCallActive) {
        console.log('📞 Ending VAPI call before navigation');
        await endCall();
      }

      console.log('🚀 Navigating to completion page');
      router.push(`/survey/${surveyId}/complete?duration=${duration}`);
      
    } catch (error) {
      console.error("Error in post-completion tasks:", error);
      const duration = calcSessionDuration(sessionStartTime || new Date());
      console.log('🚀 Navigating to completion page (with error fallback)');
      router.push(`/survey/${surveyId}/complete?duration=${duration}`);
    }
  };

  const handleStartVoiceSession = async () => {
    if (!workflowId) {
      const errorMessage = isCreatingWorkflow 
        ? "Please wait for the workflow to be created..." 
        : "Workflow not available. Please refresh the page and try again.";
      const errorItem = createMessageItem(errorMessage);
      addConversationItem(setConversationItems, errorItem, conversationEndRef);
      return;
    }

    if (!surveyStarted && workflowVariables && workflowId) {
      await startSurvey(surveyData, workflowVariables, workflowId);
    } else if (workflowVariables && workflowId && !callState.isCallActive) {
      try {
        clearError();
        await startCall(workflowId, workflowVariables);
      } catch (error) {
        console.error('Failed to start voice session:', error);
      }
    }
  };

  const handleEndVoiceSession = async () => {
    if (callState.isCallActive) {
      try {
        await endCall();
      } catch (error) {
        console.error('Failed to end voice session:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <Box p={8} display="flex" flexDirection="column" alignItems="center" gap={2}>
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
          showProgress={false}
          showSubmitButton={false}
        />
      </Box>

      {/* VAPI Status Indicators */}
      {callState.isConnecting && (
        <Box 
          sx={{ 
            position: "fixed", 
            top: isCreatingWorkflow ? 70 : 20, 
            left: 20, 
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 1,
            backgroundColor: "rgba(255, 193, 7, 0.1)",
            padding: "8px 16px",
            borderRadius: "20px",
            border: "1px solid rgba(255, 193, 7, 0.3)"
          }}
        >
          <CircularProgress size={16} />
          <span style={{ fontSize: "14px", color: "#FF9800" }}>Connecting...</span>
        </Box>
      )}

      {callState.isCallActive && (
        <Box 
          sx={{ 
            position: "fixed", 
            top: isCreatingWorkflow ? 70 : 20, 
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
            Voice Session Active
          </span>
        </Box>
      )}

      {(callState.isSpeaking || callState.isAssistantSpeaking || isAssistantSpeaking) && (
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
          <Box 
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#1958F7",
              animation: "pulse 1.5s ease-in-out infinite"
            }}
          />
          <span style={{ fontSize: "14px", color: "#1958F7" }}>
            {(callState.isAssistantSpeaking || isAssistantSpeaking) ? "Assistant Speaking..." : "User Speaking..."}
          </span>
        </Box>
      )}

      {callState.error && (
        <Box 
          sx={{ 
            position: "fixed", 
            top: callState.isCallActive || callState.isConnecting || isCreatingWorkflow ? 120 : 70, 
            left: 20, 
            right: 20,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 1,
            backgroundColor: "rgba(244, 67, 54, 0.1)",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(244, 67, 54, 0.3)"
          }}
        >
          <span style={{ fontSize: "14px", color: "#F44336" }}>
            {callState.error}
          </span>
          <button 
            onClick={() => {
              clearError();
              // Reset conversation to allow retry
              const welcomeMessage = "Click the microphone below to start the voice survey";
              const welcomeItem = createMessageItem(welcomeMessage);
              setConversationItems([welcomeItem]);
            }} 
            style={{ 
              marginLeft: 'auto', 
              background: '#1976d2', 
              color: 'white', 
              border: 'none', 
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Retry
          </button>
          <button 
            onClick={clearError} 
            style={{ 
              marginLeft: '8px', 
              background: 'none', 
              border: 'none', 
              color: '#F44336', 
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </Box>
      )}

      {/* Conversation Flow */}
      <ConversationFlow
        conversationItems={conversationItems}
        conversationEndRef={conversationEndRef}
      />

      {/* Voice Microphone - Show immediately but disable if workflow not ready */}
      <VoiceMicrophone
        isRecording={callState.isSpeaking || isUserSpeaking}
        isProcessing={callState.isConnecting || isCreatingWorkflow}
        isGettingSympathize={false} // VAPI handles this internally
        isLoading={isLoading}
        surveyData={surveyData}
        surveyCompleted={surveyCompleted}
        surveyStarted={surveyStarted}
        onStartRecording={handleStartVoiceSession}
        onStopRecording={handleEndVoiceSession}
        isSpeaking={callState.isCallActive}
        disabled={isCreatingWorkflow || !workflowId}
      />

      {/* Wave Animation */}
      <WaveAnimation audioLevel={callState.isCallActive ? audioLevelRef.current : 0} />

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
