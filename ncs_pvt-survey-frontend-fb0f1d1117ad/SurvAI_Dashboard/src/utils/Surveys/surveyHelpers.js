// Updated transformApiQuestionsToComponentFormat function for surveys
export const transformApiQuestionsToComponentFormat = (apiQuestions) => {
  // Handle both direct array format and wrapped format with QuestionswithAns
  let questionsArray = apiQuestions;
  
  if (apiQuestions && apiQuestions.QuestionswithAns) {
    questionsArray = apiQuestions.QuestionswithAns;
  }
  
  if (!Array.isArray(questionsArray)) {
    console.error("API questions is not an array:", questionsArray);
    return [];
  }

  // Normalize the question format - handle both old and new API response formats
  const normalizedQuestions = questionsArray.map(q => ({
    ...q, // Preserve all original fields first
    id: q.id || q.QueId,
    text: q.text || q.QueText,
    order: q.order || q.Order,
    autofill: q.autofill || q.Autofill || "No",
    criteria: q.criteria || q.QueCriteria,
    categories: q.categories || q.QueCategories,
    scales: q.scales || q.QueScale,
    answer: q.answer || q.Ans,
    parent_id: q.parent_id || q.ParentId,
    parent_category_texts: q.parent_category_texts || q.ParentCategoryTexts
  }));

  // Separate parent and child questions
  const parentQuestions = normalizedQuestions.filter(q => !q.parent_id);
  const childQuestions = normalizedQuestions.filter(q => q.parent_id);

  // Group child questions by their parent_id
  const childQuestionsByParent = childQuestions.reduce((acc, child) => {
    if (!acc[child.parent_id]) {
      acc[child.parent_id] = [];
    }
    acc[child.parent_id].push(child);
    return acc;
  }, {});

  // Transform parent questions
  const transformedQuestions = parentQuestions.map((apiQuestion) => {
    const baseQuestion = {
      id: apiQuestion.id,
      question: apiQuestion.text,
      order: parseInt(apiQuestion.order) || 0,
      autofill: apiQuestion.autofill || "No",
    };

    // Check if this is a flow question (has child questions)
    const hasChildren = childQuestionsByParent[apiQuestion.id];
    
    if (hasChildren && hasChildren.length > 0) {
      // This is a flow question
      const childQuestionsByCategory = {};
      
      // Group child questions by their parent category
      hasChildren.forEach(child => {
        const parentCategories = child.parent_category_texts || [];
        parentCategories.forEach(category => {
          if (!childQuestionsByCategory[category]) {
            childQuestionsByCategory[category] = [];
          }
          
          // Transform child question
          const transformedChild = transformSingleQuestion(child);
          childQuestionsByCategory[category].push(transformedChild);
        });
      });

      return {
        ...baseQuestion,
        type: "flow",
        parentOptions: apiQuestion.categories || [],
        childQuestions: childQuestionsByCategory,
        selectedOption: apiQuestion.answer || "",
        raw_answer: apiQuestion.raw_answer || "",
      };
    } else {
      // Regular question (not flow)
      return transformSingleQuestion(apiQuestion);
    }
  });

  console.log("Transformed Questions:", transformedQuestions);

  return transformedQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));
};

// Helper function to transform a single question
const transformSingleQuestion = (apiQuestion) => {
  const baseQuestion = {
    ...apiQuestion, 
    id: apiQuestion.id,
    question: apiQuestion.text,
    order: parseInt(apiQuestion.order) || 0,
    autofill: apiQuestion.autofill || "No",
  };

  if (apiQuestion.criteria === "scale") {
    return {
      ...baseQuestion,
      type: "rating",
      maxRange: parseInt(apiQuestion.scales) || 5,
      rating: parseInt(apiQuestion.answer) || 0,
      raw_answer: apiQuestion.raw_answer || "",
    };
  } else if (apiQuestion.criteria === "categorical") {
    return {
      ...baseQuestion,
      type: "category",
      options: Array.isArray(apiQuestion.categories)
        ? apiQuestion.categories
        : apiQuestion.categories
        ? apiQuestion.categories.split(",")
        : [],
      selectedOption: apiQuestion.answer || "",
      raw_answer: apiQuestion.raw_answer || "",
    };
  } else {
    // Open question or default
    return {
      ...baseQuestion,
      type: "open",
      answer: apiQuestion.answer || "",
      raw_answer: apiQuestion.raw_answer || "",
    };
  }
};

export const transformComponentQuestionsToApiFormat = (
  componentQuestions,
  surveyId
) => {
  const questionsWithAns = [];
  let currentOrder = 1;

  componentQuestions.forEach((question) => {
    if (question.type === "flow") {
      // Add parent flow question
      const parentQuestion = {
        QueId: question.id,
        QueText: question.question,
        QueScale: 0,
        QueCriteria: "categorical",
        QueCategories: Array.isArray(question.parentOptions) ? question.parentOptions : [],
        ParentId: null,
        ParentCategoryTexts: [],
        Order: currentOrder,
        AutoFill: question.autofill || "No",
      };
      questionsWithAns.push(parentQuestion);
      currentOrder++;

      // Add child questions
      if (question.childQuestions) {
        Object.entries(question.childQuestions).forEach(([category, children]) => {
          children.forEach((child) => {
            const childQuestion = {
              QueId: child.id,
              QueText: child.question,
              ParentId: question.id,
              ParentCategoryTexts: [category], // Array format as per API spec
              Order: currentOrder,
              Autofill: child.autofill || "No",
            };

            if (child.type === "rating") {
              childQuestion.QueScale = parseInt(child.maxRange) || 5;
              childQuestion.QueCriteria = "scale";
              childQuestion.QueCategories = [];
            } else if (child.type === "category") {
              childQuestion.QueScale = 0;
              childQuestion.QueCriteria = "categorical";
              childQuestion.QueCategories = Array.isArray(child.options) ? child.options : [];
            } else {
              // Open question
              childQuestion.QueScale = 0;
              childQuestion.QueCriteria = "open";
              childQuestion.QueCategories = [];
            }

            questionsWithAns.push(childQuestion);
            currentOrder++;
          });
        });
      }
    } else {
      // Regular question
      const baseQuestion = {
        QueId: question.id,
        QueText: question.question,
        ParentId: null,
        ParentCategoryTexts: [],
        Order: currentOrder,
        Autofill: question.autofill || "No",
      };

      if (question.type === "rating") {
        questionsWithAns.push({
          ...baseQuestion,
          QueScale: parseInt(question.maxRange) || 5,
          QueCriteria: "scale",
          QueCategories: [],
        });
      } else if (question.type === "category") {
        questionsWithAns.push({
          ...baseQuestion,
          QueScale: 0,
          QueCriteria: "categorical",
          QueCategories: Array.isArray(question.options) ? question.options : [],
        });
      } else {
        // Open question
        questionsWithAns.push({
          ...baseQuestion,
          QueScale: 0,
          QueCriteria: "open",
          QueCategories: [],
        });
      }
      
      currentOrder++;
    }
  });

  return {
    SurveyId: surveyId,
    QuestionswithAns: questionsWithAns,
  };
};

export const generateSurveyId = () => {
  return `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

export const validateSurveyForm = (selectedTemplate, recipientName, riderName, rideId, tenantId) => {
  if (!selectedTemplate) {
    return { isValid: false, error: "Please select a template" };
  }
  if (!recipientName.trim()) {
    return { isValid: false, error: "Please enter recipient name" };
  }
  if (!riderName.trim()) {
    return { isValid: false, error: "Please enter rider name" };
  }
  if (!rideId.trim()) {
    return { isValid: false, error: "Please enter ride ID" };
  }
  if (!tenantId.trim()) {
    return { isValid: false, error: "Please enter tenant ID" };
  }
  return { isValid: true, error: null };
};

export const getSurveyLink = (surveyId) => {
  return `https://main.d3unjy9nz250ey.amplifyapp.com/survey/${surveyId}`;
};

export const getStatusStyle = (status) => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === "completed") {
    return {
      backgroundColor: "#E4FFEA",
      color: "#00A857",
    };
  } else if (
    normalizedStatus === "in-progress" ||
    normalizedStatus === "in progress"
  ) {
    return {
      backgroundColor: "#F3F3FF",
      color: "#550FEC",
    };
  } else {
    return {
      backgroundColor: "#F5F5F5",
      color: "#757575",
    };
  }
};

export const parseSurveyInfo = (surveyData, surveyId) => {
  return {
    surveyId: surveyData.SurveyId || surveyId,
    templateName: surveyData.Name || "Unknown Template",
    status: surveyData.Status || "Unknown",
    recipientName: surveyData.Recipient || "Unknown Recipient",
    riderName: surveyData.RiderName || "Unknown Rider",
    rideId: surveyData.RideId || "Unknown Ride ID",
    tenantId: surveyData.TenantId || "Unknown Tenant ID",
    surveyUrl: surveyData.URL || "",
    recipientBiodata: surveyData.Biodata || "No biodata provided",
    launchDate: surveyData.LaunchDate || "",
    completionDate: surveyData.CompletionDate || "",
  };
};
