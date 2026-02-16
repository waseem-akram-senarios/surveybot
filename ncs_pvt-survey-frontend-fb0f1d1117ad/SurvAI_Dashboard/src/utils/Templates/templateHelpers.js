export const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const formatQuestionForAPI = (question, parentCategoryText = null) => {
  const baseData = {
    QueId: question.queId,
    QueText: question.question,
    ParentId: question.parentId || null,
    ParentCategoryTexts: parentCategoryText ? [parentCategoryText] : null,
    Autofill: question.autofill || "No",
  };

  switch (question.type) {
    case "category":
      return {
        ...baseData,
        QueScale: null,
        QueCriteria: "categorical",
        QueCategories: question.options,
      };
    case "rating":
      return {
        ...baseData,
        QueScale: parseInt(question.maxRange),
        QueCriteria: "scale",
        QueCategories: null,
      };
    case "open":
      return {
        ...baseData,
        QueScale: null,
        QueCriteria: "open",
        QueCategories: null,
      };
    case "flow":
      return {
        ...baseData,
        QueScale: null,
        QueCriteria: "categorical",
        QueCategories: question.parentOptions,
        ParentId: null, // Flow questions are always parent questions
        ParentCategoryTexts: null, // Parent questions don't have parent categories
      };
    default:
      // Fallback for backward compatibility
      return {
        ...baseData,
        QueScale: question.type === "rating" ? parseInt(question.maxRange) : null,
        QueCriteria: question.type === "category" ? "categorical" : question.type === "open" ? "open" : "scale",
        QueCategories: question.type === "category" ? question.options : null,
      };
  }
};

export const formatFlowQuestionForAPI = (flowQuestion) => {
  const questions = [];
  
  const parentQuestion = formatQuestionForAPI(flowQuestion);
  questions.push(parentQuestion);
  
  Object.entries(flowQuestion.childQuestions || {}).forEach(([parentOption, childQuestions]) => {
    childQuestions.forEach(childQuestion => {
      const childQuestionForAPI = formatQuestionForAPI(
        {
          ...childQuestion,
          parentId: flowQuestion.queId
        },
        parentOption 
      );
      questions.push(childQuestionForAPI);
    });
  });
  
  return questions;
};

export const createCategoryQuestion = (data, isSaved = false) => {
  return {
    id: Date.now(),
    queId: generateUUID(),
    type: "category",
    question: data.question,
    options: data.options,
    selectedOption: "",
    autofill: "No",
    isSaved,
  };
};

export const createRatingQuestion = (data, isSaved = false) => {
  return {
    id: Date.now(),
    queId: generateUUID(),
    type: "rating",
    question: data.question,
    maxRange: data.maxRange,
    rating: 0,
    autofill: "No",
    isSaved,
  };
};

export const createOpenQuestion = (data, isSaved = false) => {
  return {
    id: Date.now(),
    queId: generateUUID(),
    type: "open",
    question: data.question,
    answer: "",
    autofill: "No",
    isSaved: isSaved || false,
    order: Date.now(),
  };
};

export const createFlowQuestion = (data) => {
  const childQuestionsWithIds = {};
  
  Object.entries(data.childQuestions).forEach(([option, questions]) => {
    childQuestionsWithIds[option] = questions.map(childQuestion => ({
      ...childQuestion,
      id: childQuestion.id || Date.now() + Math.random(), 
      queId: childQuestion.queId || generateUUID(),
      parentId: null, 
      parentCategoryText: option,
      autofill: childQuestion.autofill || "No",
    }));
  });

  return {
    id: Date.now(),
    queId: generateUUID(),
    type: 'flow',
    question: data.parentQuestion,
    parentOptions: data.parentOptions,
    childQuestions: childQuestionsWithIds, 
    selectedOption: '',
    autofill: "No",
    isSaved: false,
  };
};

export const updateQuestionInArray = (questions, questionId, updates) => {
  return questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q));
};

export const markQuestionsAsSaved = (questions, savedQuestionIds) => {
  return questions.map((q) =>
    savedQuestionIds.includes(q.id) ? { ...q, isSaved: true } : q
  );
};

export const getUnsavedQuestions = (questions) => {
  return questions.filter((q) => !q.isSaved);
};

export const getQuestionOrder = (questions, questionId) => {
  return questions.findIndex((q) => q.id === questionId) + 1;
};

export const markExistingQuestionsAsSaved = (questions) => {
  return (questions || []).map((q) => ({
    ...q,
    isSaved: true,
  }));
};

export const getAvailableLanguages = () => {
  return [
    { code: "Spanish", label: "Spanish" },
    { code: "French", label: "French" },
    { code: "German", label: "German" },
    { code: "Russian", label: "Russian" },
    { code: "Chinese", label: "Chinese" },
    { code: "Portuguese", label: "Portuguese" },
    { code: "Italian", label: "Italian" },
    { code: "Japanese", label: "Japanese" },
  ];
};

export const transformAPIQuestionToLocal = (apiQuestion, details) => {
  const transformedQuestion = {
    id: apiQuestion.QueId,
    queId: apiQuestion.QueId,
    question: details.QueText,
    order: parseInt(apiQuestion.Order) || 1,
    isSaved: true,
    parentId: details.ParentId || null,
    parentCategoryTexts: details.ParentCategoryTexts || null,
    autofill: details.Autofill || "No",
  };

  // Add type-specific properties based on QueCriteria
  if (details.QueCriteria === "categorical") {
    // Check if this is a flow question (has child questions)
    if (details.ParentId === null && apiQuestion.HasChildren) {
      transformedQuestion.type = "flow";
      transformedQuestion.isParent = true;
      transformedQuestion.childQuestions = {};
    } else {
      transformedQuestion.type = "category";
    }
    
    // Handle QueCategories as either array or string
    if (Array.isArray(details.QueCategories)) {
      transformedQuestion.options = details.QueCategories;
      transformedQuestion.parentOptions = details.QueCategories;
    } else if (
      details.QueCategories &&
      typeof details.QueCategories === "string"
    ) {
      const options = details.QueCategories.split(",").map(
        (opt) => opt.trim()
      );
      transformedQuestion.options = options;
      transformedQuestion.parentOptions = options;
    } else {
      transformedQuestion.options = [];
      transformedQuestion.parentOptions = [];
    }
    transformedQuestion.selectedOption = "";
  } else if (details.QueCriteria === "scale" && details.QueScale) {
    transformedQuestion.type = "rating";
    // Parse rating scale - assuming it's a number like "5" for 1-5 scale
    const maxRange = parseInt(details.QueScale) || 5;
    transformedQuestion.maxRange = maxRange;
    transformedQuestion.rating = 0;
  } else if (details.QueCriteria === "open") {
    // Handle open questions
    transformedQuestion.type = "open";
    transformedQuestion.answer = "";
  } else {
    // Default to category type if unclear
    transformedQuestion.type = "category";
    // Handle QueCategories as either array or string for default case too
    if (Array.isArray(details.QueCategories)) {
      transformedQuestion.options = details.QueCategories;
    } else if (
      details.QueCategories &&
      typeof details.QueCategories === "string"
    ) {
      transformedQuestion.options = details.QueCategories.split(",").map(
        (opt) => opt.trim()
      );
    } else {
      transformedQuestion.options = [];
    }
    transformedQuestion.selectedOption = "";
  }

  return transformedQuestion;
};

export const transformTranslatedQuestionToLocal = (translatedQuestion) => {
  const transformedQuestion = {
    id: translatedQuestion.id,
    queId: translatedQuestion.id,
    question: translatedQuestion.text,
    order: parseInt(translatedQuestion.ord) || 1,
    isSaved: true,
    parentId: translatedQuestion.parent_id || null,
    parentCategoryTexts: translatedQuestion.parent_category_texts || null,
    autofill: translatedQuestion.autofill || "No",
  };

  // Add type-specific properties based on criteria
  if (translatedQuestion.criteria === "categorical") {
    // Check if this is a flow question (has child questions)
    if (translatedQuestion.parent_id === null && translatedQuestion.HasChildren) {
      transformedQuestion.type = "flow";
      transformedQuestion.isParent = true;
      transformedQuestion.childQuestions = {};
    } else {
      transformedQuestion.type = "category";
    }
    
    // Handle categories as either array or string
    if (Array.isArray(translatedQuestion.categories)) {
      transformedQuestion.options = translatedQuestion.categories;
      transformedQuestion.parentOptions = translatedQuestion.categories;
    } else if (
      translatedQuestion.categories &&
      typeof translatedQuestion.categories === "string"
    ) {
      const options = translatedQuestion.categories.split(",").map(
        (opt) => opt.trim()
      );
      transformedQuestion.options = options;
      transformedQuestion.parentOptions = options;
    } else {
      transformedQuestion.options = [];
      transformedQuestion.parentOptions = [];
    }
    transformedQuestion.selectedOption = "";
  } else if (translatedQuestion.criteria === "scale" && translatedQuestion.scales) {
    transformedQuestion.type = "rating";
    // Parse rating scale
    const maxRange = parseInt(translatedQuestion.scales) || 5;
    transformedQuestion.maxRange = maxRange;
    transformedQuestion.rating = 0;
  } else if (translatedQuestion.criteria === "open") {
    // Handle open questions
    transformedQuestion.type = "open";
    transformedQuestion.answer = "";
  } else {
    // Default to category type if unclear
    transformedQuestion.type = "category";
    // Handle categories for default case too
    if (Array.isArray(translatedQuestion.categories)) {
      transformedQuestion.options = translatedQuestion.categories;
    } else if (
      translatedQuestion.categories &&
      typeof translatedQuestion.categories === "string"
    ) {
      transformedQuestion.options = translatedQuestion.categories.split(",").map(
        (opt) => opt.trim()
      );
    } else {
      transformedQuestion.options = [];
    }
    transformedQuestion.selectedOption = "";
  }

  return transformedQuestion;
};

export const groupChildQuestionsByParentCategory = (questions) => {
  const parentQuestions = questions.filter(q => !q.parentId);
  const childQuestions = questions.filter(q => q.parentId);
  
  const flowQuestions = parentQuestions.map(parent => {
    if (parent.type === 'flow') {
      const children = childQuestions.filter(child => child.parentId === parent.queId);
      const childQuestionsByCategory = {};
      
      children.forEach(child => {
        const categoryText = child.parentCategoryTexts?.[0] || child.parentCategoryText || 'Unknown';
        if (!childQuestionsByCategory[categoryText]) {
          childQuestionsByCategory[categoryText] = [];
        }
        childQuestionsByCategory[categoryText].push({
          ...child,
          parentCategoryText: categoryText 
        });
      });
      
      return {
        ...parent,
        childQuestions: childQuestionsByCategory
      };
    }
    return parent;
  });
  
  return flowQuestions;
};

export const prepareFlowQuestionForAPI = (flowQuestion, templateName, order) => {
  const apiCalls = [];
  
  const parentData = formatQuestionForAPI(flowQuestion);
  apiCalls.push({
    type: 'createQuestion',
    data: parentData,
    templateName,
    order
  });
  
  if (flowQuestion.childQuestions) {
    let childOrder = order + 0.1;
    Object.entries(flowQuestion.childQuestions).forEach(([parentOption, childQuestions]) => {
      childQuestions.forEach(childQuestion => {
        const childData = formatQuestionForAPI(
          {
            ...childQuestion,
            parentId: flowQuestion.queId
          },
          parentOption 
        );
        
        apiCalls.push({
          type: 'createQuestion',
          data: childData,
          templateName,
          order: childOrder
        });
        
        childOrder += 0.01;
      });
    });
  }
  
  return apiCalls;
};

export const validateQuestion = (question) => {
  if (!question.question || question.question.trim() === "") {
    return { isValid: false, error: "Question text is required" };
  }

  switch (question.type) {
    case "category":
      if (!question.options || question.options.length < 2) {
        return {
          isValid: false,
          error: "Category questions must have at least 2 options",
        };
      }
      break;
    case "rating":
      if (
        !question.maxRange ||
        question.maxRange < 2 ||
        question.maxRange > 10
      ) {
        return {
          isValid: false,
          error: "Rating questions must have a range between 2 and 10",
        };
      }
      break;
    case "open":
      // Open questions only need question text
      break;
    case "flow": {
      // Wrapped in curly braces to fix ESLint error
      if (!question.parentOptions || question.parentOptions.length < 2) {
        return {
          isValid: false,
          error: "Flow questions must have at least 2 parent options",
        };
      }
      
      // Updated validation: At least one option must have child questions
      const hasAtLeastOneChildQuestion = question.parentOptions.some(option => {
        const childQuestions = question.childQuestions[option] || [];
        return childQuestions.length > 0;
      });

      if (!hasAtLeastOneChildQuestion) {
        return {
          isValid: false,
          error: "Flow questions must have at least one parent option with child questions",
        };
      }

      // Validate each child question that exists
      for (const option of question.parentOptions) {
        const childQuestions = question.childQuestions[option] || [];
        // Only validate if there are child questions for this option
        if (childQuestions.length > 0) {
          for (const childQuestion of childQuestions) {
            const childValidation = validateQuestion(childQuestion);
            if (!childValidation.isValid) {
              return {
                isValid: false,
                error: `Child question for "${option}": ${childValidation.error}`,
              };
            }
          }
        }
      }
      break;
    }
    default:
      return { isValid: false, error: "Invalid question type" };
  }

  return { isValid: true };
};

export const validateTemplate = (templateName, questions) => {
  const errors = [];

  if (!templateName || templateName.trim() === "") {
    errors.push("Template name is required");
  }

  if (!questions || questions.length === 0) {
    errors.push("Template must have at least one question");
  }

  if (questions && questions.length < 1) {
    errors.push(
      `Template must have at least 1 question to publish. Current count: ${questions.length}`
    );
  }

  if (questions) {
    questions.forEach((question, index) => {
      const validation = validateQuestion(question);
      if (!validation.isValid) {
        errors.push(`Question ${index + 1}: ${validation.error}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const calculateNextOrder = (questions) => {
  if (!questions || questions.length === 0) return 1;

  const savedQuestions = questions.filter((q) => q.isSaved);
  if (savedQuestions.length === 0) return 1;

  const maxOrder = Math.max(...savedQuestions.map((q) => q.order || 0));
  return maxOrder + 1;
};

export const reorderQuestions = (questions) => {
  return questions
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((question, index) => ({
      ...question,
      order: index + 1,
    }));
};
