'use client'

import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Survey() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusError, setStatusError] = useState(null);
  const [existingCSAT, setExistingCSAT] = useState(null);
  const [hasExistingCSAT, setHasExistingCSAT] = useState(false);
  
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id || "102";

  const checkSurveyStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/surveys/${surveyId}/status`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // If survey is still In-Progress, redirect back to start page
      if (result.Status === 'In-Progress') {
        router.push(`/survey/${surveyId}`);
        return;
      }
      
      if (result.CSAT && result.CSAT > 0) {
        setExistingCSAT(result.CSAT);
        setHasExistingCSAT(true);
        setRating(result.CSAT);
      }
      
      // If survey is completed, allow access to this page
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error checking survey status:', error);
      setStatusError('Failed to verify survey status');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check survey status first
    checkSurveyStatus();
  }, [surveyId, router]);

  useEffect(() => {
    // Get duration from URL params
    const durationParam = searchParams.get('duration');
    if (durationParam) {
      setDuration(parseInt(durationParam, 10));
    }
  }, [searchParams]);

  const updateCSATScore = async (rating) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/surveys/${surveyId}/csat`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            CSAT: rating
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSubmitSuccess(true);
      setHasExistingCSAT(true);
      setExistingCSAT(rating);
    } catch (error) {
      console.error('Error updating CSAT score:', error);
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStarClick = (starValue) => {
    if (hasExistingCSAT) {
      return;
    }
    
    setRating(starValue);
    
    // Make API call to update CSAT score
    updateCSATScore(starValue);
  };

  const handleStarHover = (starValue) => {
    if (hasExistingCSAT) {
      return;
    }
    setHoverRating(starValue);
  };

  const handleStarLeave = () => {
    if (hasExistingCSAT) {
      return;
    }
    setHoverRating(0);
  };

  const renderStar = (starValue) => {
    const isFilled = starValue <= (hoverRating || rating);
    const isDisabled = hasExistingCSAT || isSubmitting;
    
    return (
      <span
        key={starValue}
        onClick={() => handleStarClick(starValue)}
        onMouseEnter={() => handleStarHover(starValue)}
        onMouseLeave={handleStarLeave}
        className={`text-3xl mx-1 transition-colors duration-200 select-none ${
          isFilled ? 'text-blue-500' : 'text-gray-300'
        } ${
          isDisabled 
            ? 'opacity-70 cursor-not-allowed' 
            : 'cursor-pointer hover:scale-110 transform transition-transform'
        }`}
      >
        ★
      </span>
    );
  };

  // Show loading state while checking survey status
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

  // Show error state if status check failed
  if (statusError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {statusError}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background image positioned as per design specs */}
      <div className="background-image"></div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 md:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-normal text-gray-800 mb-2" style={{ fontFamily: 'Saira, sans-serif' }}>
            IT Curves
          </h1>
          <p className="text-base text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Customer Satisfaction Survey
          </p>
        </div>

        {/* Main content centered */}
        <div className="text-center max-w-2xl w-full">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-800 mb-6" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
            Survey Complete
          </h2>
          
          <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-8" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Congratulations. You have successfully completed the survey. We will use this data to make our products and services even better in the future.
          </p>

          <p className="text-sm text-gray-400 mb-12" style={{ fontFamily: 'Poppins, sans-serif' }}>
            You can safely close this window.
          </p>

          {/* Rating section */}
          <div className="mt-8">
            {hasExistingCSAT ? (
              // Show existing CSAT score
              <>
                <p className="text-base font-medium text-gray-700 mb-6 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Thank you for your feedback! You rated our survey:
                </p>
                
                <div className="flex justify-center items-center mb-4">
                  {[1, 2, 3, 4, 5].map(renderStar)}
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    ⭐ You gave us {existingCSAT} star{existingCSAT !== 1 ? 's' : ''}! We appreciate your feedback.
                  </p>
                </div>
              </>
            ) : (
              // Show rating form
              <>
                <p className="text-base font-medium text-gray-700 mb-6 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  To further improve our surveys, please tell us how satisfied were you with it?
                </p>
                
                <div className="flex justify-center items-center mb-4">
                  {[1, 2, 3, 4, 5].map(renderStar)}
                </div>
                
                {/* Loading state */}
                {isSubmitting && (
                  <div className="flex justify-center items-center mt-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <p className="text-sm text-gray-600 ml-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Saving your feedback...
                    </p>
                  </div>
                )}
                
                {/* Success message */}
                {submitSuccess && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600 animate-fade-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      ✅ Thank you for rating us {rating} star{rating !== 1 ? 's' : ''}! Your feedback has been saved successfully.
                    </p>
                  </div>
                )}
                
                {/* Error message */}
                {submitError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      ❌ Error saving feedback: {submitError}
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* Duration display (for debugging) */}
            {duration > 0 && (
              <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Survey completed in {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .background-image {
          position: absolute;
          background-image: url(/Background.png);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.3;
          transform: rotate(0deg);
        }
        
        /* Desktop positioning */
        @media (min-width: 1024px) {
          .background-image {
            top: 224px;
            left: 570px;
          }
        }
        
        /* Tablet positioning */
        @media (min-width: 768px) and (max-width: 1023px) {
          .background-image {
            top: 15vh;
            left: 40vw;
            transform: rotate(0deg) scale(0.8);
          }
        }
        
        /* Mobile positioning */
        @media (max-width: 767px) {
          .background-image {
            top: 20vh;
            left: 30vw;
            transform: rotate(0deg) scale(0.6);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
          }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
