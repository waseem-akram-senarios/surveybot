const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// AI-powered question enhancement
export async function enhanceQuestionWithAI(question, context, previousAnswers = []) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/brain/enhance-question`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          context,
          previousAnswers,
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to enhance question: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error enhancing question with AI:", error);
    return null;
  }
}

// Check if question should be skipped based on previous answers
export async function shouldSkipQuestion(questionId, previousAnswers) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/brain/should-skip`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          previousAnswers,
        }),
      }
    );
    
    if (!response.ok) {
      return false; // Default to not skipping if AI service fails
    }
    
    const data = await response.json();
    return data.shouldSkip || false;
  } catch (error) {
    console.error("Error checking skip condition:", error);
    return false;
  }
}

// Generate personalized greeting
export async function generatePersonalizedGreeting(recipientName, surveyName, language = "en", biodata = "") {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/brain/generate-greeting`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientName,
          surveyName,
          language,
          biodata,
        }),
      }
    );
    
    if (!response.ok) {
      return language === "es" 
        ? `¡Hola ${recipientName || ''}! 👋`
        : `Hi ${recipientName || ''}! 👋`;
    }
    
    const data = await response.json();
    return data.greeting;
  } catch (error) {
    console.error("Error generating greeting:", error);
    return language === "es" 
      ? `¡Hola ${recipientName || ''}! 👋`
      : `Hi ${recipientName || ''}! 👋`;
  }
}

// Get AI-powered question suggestions
export async function getQuestionSuggestions(question, partialAnswer) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/brain/suggest-answer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          partialAnswer,
        }),
      }
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return [];
  }
}
