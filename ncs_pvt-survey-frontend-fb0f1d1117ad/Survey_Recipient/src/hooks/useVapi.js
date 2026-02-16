import { useState, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;

export const useVapi = () => {
  const vapiRef = useRef(null);
  
  const [callState, setCallState] = useState({
    isConnecting: false,
    isCallActive: false,
    isSpeaking: false,
    isAssistantSpeaking: false,
    volume: 0,
    error: null,
    messages: [],
    surveyCompleted: false
  });

  const initializeVapi = useCallback(() => {
    if (!VAPI_API_KEY) {
      setCallState(prev => ({ ...prev, error: 'VAPI API key is not configured. Please check your environment variables.' }));
      return;
    }

    if (!vapiRef.current) {
      // Initialize VAPI instance with just the API key
      vapiRef.current = new Vapi(VAPI_API_KEY);

      // Set up event listeners
      vapiRef.current.on('call-start', () => {
        console.log('📞 VAPI Call started');
        setCallState(prev => ({ ...prev, isCallActive: true, isConnecting: false }));
      });

      vapiRef.current.on('call-end', () => {
        console.log('🔚 VAPI Call ended - marking survey as completed');
        setCallState(prev => ({ 
          ...prev, 
          isCallActive: false, 
          isConnecting: false,
          isSpeaking: false,
          isAssistantSpeaking: false,
          surveyCompleted: true,
          error: null // Clear any previous errors since this is a successful completion
        }));
      });

      // Enhanced speech event handling
      vapiRef.current.on('speech-start', () => {
        console.log('🎤 User speech started - microphone is working!');
        setCallState(prev => ({ ...prev, isSpeaking: true }));
      });

      vapiRef.current.on('speech-end', () => {
        console.log('🔇 User speech ended');
        setCallState(prev => ({ ...prev, isSpeaking: false }));
      });

      // Volume level monitoring
      vapiRef.current.on('volume-level', (volume) => {
        if (volume > 0.1) {
          console.log('🔊 Volume level:', volume);
        }
        setCallState(prev => ({ ...prev, volume }));
      });

      // Error handling - Distinguish between critical and transient errors
      vapiRef.current.on('error', (error) => {
        console.error('VAPI Error:', error);
        
        // Don't set errors if survey is already completed (natural workflow end)
        setCallState(prev => {
          if (prev.surveyCompleted) {
            console.log('⚠️ Ignoring VAPI error after survey completion:', error.message);
            return prev;
          }
          
          // Check if this is a transient error that shouldn't stop the conversation
          const isTransientError = error.message?.includes('network') ||
                                  error.message?.includes('timeout') ||
                                  error.message?.includes('connection') ||
                                  error.message?.includes('audio') ||
                                  error.message?.includes('stream');
          
          if (isTransientError) {
            console.warn('⚠️ Transient VAPI error - attempting to continue:', error.message);
            // Don't set connecting/callActive to false for transient errors
            return { 
              ...prev, 
              error: `Temporary connection issue: ${error.message}` // This will trigger a warning, not full error
            };
          } else {
            // Critical error - stop the call
            console.error('❌ Critical VAPI error - stopping call:', error.message);
            return { 
              ...prev, 
              error: error.message || 'An error occurred with the voice session',
              isConnecting: false,
              isCallActive: false 
            };
          }
        });
        
        // For transient errors, clear them after some time
        if (error.message?.includes('network') || error.message?.includes('timeout') || 
            error.message?.includes('connection') || error.message?.includes('audio') || 
            error.message?.includes('stream')) {
          setTimeout(() => {
            setCallState(prev => ({ ...prev, error: null }));
          }, 5000);
        }
      });

      // Message handling - this is crucial for workflow communication
      vapiRef.current.on('message', (message) => {
        console.log('📨 VAPI Message received:', message);
        
        // Process different message types
        if (message.type === 'transcript') {
          // Enhance transcript processing for better conversation flow
          if (!message.transcriptType) {
            const transcript = message.transcript?.trim();
            if (transcript && (
              transcript.endsWith('.') || 
              transcript.endsWith('?') || 
              transcript.endsWith('!') ||
              transcript.length > 30
            )) {
              message.transcriptType = 'final';
            } else {
              message.transcriptType = 'partial';
            }
          }
          console.log(`📝 ${message.role} transcript (${message.transcriptType}):`, message.transcript);
        }
        
        // Handle function calls from workflow
        if (message.type === 'function-call' || message.type === 'tool-calls') {
          console.log('🔧 Function/Tool call:', message);
        }
        
        // Handle workflow status
        if (message.type === 'workflow-started') {
          console.log('🚀 Workflow started');
        }
        
        if (message.type === 'workflow-completed') {
          console.log('✅ Workflow completed');
        }
        
        // Handle conversation updates
        if (message.type === 'conversation-update') {
          console.log('💬 Conversation update:', message);
        }
        
        setCallState(prev => ({ 
          ...prev, 
          messages: [...prev.messages, message] 
        }));
      });

      // Handle assistant speech events - Critical for knowing when agent is speaking
      vapiRef.current.on('assistant-speech-start', () => {
        console.log('🤖 Assistant started speaking');
        setCallState(prev => ({ ...prev, isAssistantSpeaking: true }));
      });

      vapiRef.current.on('assistant-speech-end', () => {
        console.log('🤖 Assistant finished speaking');
        setCallState(prev => ({ ...prev, isAssistantSpeaking: false }));
      });

      // Alternative event names for different VAPI versions
      vapiRef.current.on('bot-speech-start', () => {
        console.log('🤖 Bot started speaking');
        setCallState(prev => ({ ...prev, isAssistantSpeaking: true }));
      });

      vapiRef.current.on('bot-speech-end', () => {
        console.log('🤖 Bot finished speaking');
        setCallState(prev => ({ ...prev, isAssistantSpeaking: false }));
      });

      // Enhanced event monitoring for debugging
      vapiRef.current.on('function-call', (functionCall) => {
        console.log('🔧 Function call received:', functionCall);
      });

      vapiRef.current.on('tool-calls', (toolCalls) => {
        console.log('🛠️ Tool calls:', toolCalls);
      });

      // Add additional conversation flow events
      vapiRef.current.on('conversation-started', () => {
        console.log('💬 Conversation started');
      });

      vapiRef.current.on('conversation-ended', () => {
        console.log('🔚 Conversation ended - survey completed by VAPI');
        setCallState(prev => ({ 
          ...prev, 
          surveyCompleted: true,
          error: null // Clear any errors since this is a natural completion
        }));
      });

      vapiRef.current.on('speech-update', (update) => {
        console.log('🎤 Speech update:', update);
      });

      // Handle call status changes
      vapiRef.current.on('call-started', () => {
        console.log('📞 Call started event');
        setCallState(prev => ({ ...prev, isCallActive: true, isConnecting: false }));
      });

      // Handle hang event (important for continuous conversation)
      vapiRef.current.on('hang', () => {
        console.log('📞 Call hang event - VAPI decided to end the survey');
        setCallState(prev => ({ 
          ...prev, 
          isCallActive: false, 
          isConnecting: false,
          isSpeaking: false,
          isAssistantSpeaking: false,
          surveyCompleted: true,
          error: null // Clear any errors since this is a natural completion
        }));
      });

      // Handle transcript events directly (some VAPI versions use this)
      vapiRef.current.on('transcript', (transcript) => {
        console.log('📝 Direct transcript event:', transcript);
      });
    }
  }, []);

  const startCall = useCallback(async (workflowId, workflowVariables) => {
    if (!vapiRef.current) {
      initializeVapi();
    }

    if (!vapiRef.current) {
      setCallState(prev => ({ ...prev, error: 'Failed to initialize VAPI' }));
      return;
    }

    if (!workflowId) {
      setCallState(prev => ({ ...prev, error: 'Workflow ID is required to start the voice session' }));
      return;
    }

    try {
      setCallState(prev => ({ 
        ...prev, 
        isConnecting: true, 
        error: null,
        messages: []
      }));

      // Check microphone permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone permission granted');
        stream.getTracks().forEach(track => track.stop()); // Clean up test stream
      } catch (micError) {
        console.error('❌ Microphone permission denied:', micError);
        throw new Error('Microphone access is required. Please allow microphone permissions and try again.');
      }

      // Ensure user interaction for audio playback (required by most browsers)
      if (typeof window !== 'undefined') {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state !== 'running') {
          console.log('🎵 Audio context not running, attempting to resume...');
          try {
            await audioContext.resume();
            console.log('✅ Audio context resumed successfully');
          } catch (audioError) {
            console.warn('⚠️ Could not resume audio context:', audioError);
          }
        }
        audioContext.close(); // Clean up
      }

      // Store workflow variables for use during the call
      console.log('🚀 Starting VAPI web-based voice session');
      console.log('📋 Workflow ID:', workflowId);
      console.log('📋 Workflow variables:', workflowVariables);
      
      // Use the original VAPI Web SDK approach - this is the correct way
      console.log('🎯 Starting VAPI workflow call...');
      
      await vapiRef.current.start(
        undefined,        // assistant (null for workflow-based calls)
        undefined,        // assistantOverrides (null)
        undefined,        // squad (null)
        workflowId,       // workflow ID string
        {                 // workflowOverrides object
          variableValues: workflowVariables || {}
        }
      );

      console.log('✅ VAPI workflow call started successfully');
      
      // Post-call verification after a delay
      setTimeout(() => {
        if (vapiRef.current) {
          console.log('🔍 Post-call verification check...');
          console.log('📞 Call active state:', callState.isCallActive);
          
          // Ensure microphone is not muted
          try {
            if (vapiRef.current.isMuted && vapiRef.current.isMuted()) {
              console.log('🔓 Unmuting microphone...');
              vapiRef.current.setMuted(false);
            }
          } catch (muteError) {
            console.warn('⚠️ Could not check/set mute state:', muteError);
          }
          
          console.log('✅ Voice session ready - workflow should handle survey questions automatically');
          console.log('🎧 If you can hear background noise but no agent speech, check your VAPI workflow configuration');
        }
      }, 3000);

    } catch (error) {
      console.error('Failed to start VAPI voice session:', error);
      let errorMessage = `Failed to start voice session: ${error.message}`;
      
      if (error.message?.includes('Does Not Exist')) {
        errorMessage = `Workflow ID ${workflowId} does not exist. Please check your VAPI dashboard and ensure the workflow ID is correct.`;
      } else if (error.message?.includes('permission') || error.message?.includes('Microphone')) {
        errorMessage = 'Microphone access is required. Please allow microphone permissions and try again.';
      } else if (error.message?.includes('workflow')) {
        errorMessage = `Workflow error: ${error.message}. Please check your workflow configuration in the VAPI dashboard.`;
      }
      
      setCallState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isConnecting: false 
      }));
    }
  }, [initializeVapi, callState.isCallActive]);

  const endCall = useCallback(async () => {
    if (vapiRef.current && callState.isCallActive) {
      try {
        console.log('🔚 Ending VAPI call...');
        await vapiRef.current.stop();
        console.log('✅ VAPI call ended successfully');
      } catch (error) {
        console.error('Failed to end VAPI call:', error);
        setCallState(prev => ({ 
          ...prev, 
          error: error.message || 'Failed to end voice session' 
        }));
      }
    }
  }, [callState.isCallActive]);

  const clearError = useCallback(() => {
    setCallState(prev => ({ ...prev, error: null }));
  }, []);

  const debugVapiState = useCallback(() => {
    if (vapiRef.current) {
      console.log('🔍 VAPI Debug State:');
      console.log('  - Call active:', callState.isCallActive);
      console.log('  - Is connecting:', callState.isConnecting);
      console.log('  - Is assistant speaking:', callState.isAssistantSpeaking);
      console.log('  - Is user speaking:', callState.isSpeaking);
      console.log('  - Volume level:', callState.volume);
      console.log('  - Messages count:', callState.messages.length);
      console.log('  - Error:', callState.error);
    } else {
      console.log('❌ VAPI instance not initialized');
    }
  }, [callState]);

  return {
    callState,
    startCall,
    endCall,
    clearError,
    debugVapiState,
    vapi: vapiRef.current
  };
};
