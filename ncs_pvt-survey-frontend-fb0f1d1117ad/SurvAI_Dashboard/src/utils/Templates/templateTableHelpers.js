export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export const transformTableData = (tableData) => {
  return tableData.map((item, index) => ({
    id: index + 100,
    name: item.TemplateName,
    date: item.Date,
    formattedDate: formatDate(item.Date),
    status: item.Status,
    originalName: item.TemplateName,
    templateId: item.TemplateId || null,
  }));
};

export const groupQuestionsIntoFlowStructure = (questions) => {  
  const sortedQuestions = questions.sort((a, b) => a.order - b.order);
  
  const parentQuestions = sortedQuestions.filter(q => !q.parentId);
  const childQuestions = sortedQuestions.filter(q => q.parentId);

  const processedQuestions = parentQuestions.map(parentQuestion => {
    const relatedChildren = childQuestions.filter(child => child.parentId === parentQuestion.queId);
        
    if (parentQuestion.type === 'category' && relatedChildren.length > 0) {      
      const childQuestionsByCategory = {};
      
      relatedChildren.forEach(child => {
        const categoryText = child.parentCategoryTexts?.[0] || 'Unknown';
                
        if (!childQuestionsByCategory[categoryText]) {
          childQuestionsByCategory[categoryText] = [];
        }
        
        childQuestionsByCategory[categoryText].push({
          ...child,
          parentCategoryText: categoryText
        });
      });
      
      
      const flowQuestion = {
        ...parentQuestion,
        type: 'flow',
        parentOptions: parentQuestion.options,
        childQuestions: childQuestionsByCategory,
        selectedOption: ''
      };
      
      return flowQuestion;
    }
    
    return parentQuestion;
  });
  
  console.log("Final processed questions:", processedQuestions);
  console.log("=== END FLOW STRUCTURE GROUPING ===");
  return processedQuestions;
};

export const transformQuestionDataWithFlowSupport = async (questions) => {  
  if (!Array.isArray(questions)) {
    console.warn("Questions is not an array:", questions);
    return [];
  }
  
  try {
    const transformedQuestions = questions.map((question, index) => {
      
      try {
        const transformedQuestion = {
          id: question.id,
          queId: question.id,
          question: question.text,
          order: parseInt(question.ord) || 1,
          isSaved: true,
          parentId: question.parent_id || null,
          autofill: question.autofill || 'No',
          parentCategoryTexts: question.parent_category_texts || null
        };

        if (question.criteria === 'categorical') {
          transformedQuestion.type = 'category';
          
          if (Array.isArray(question.categories)) {
            transformedQuestion.options = question.categories;
          } else if (question.categories && typeof question.categories === 'string') {
            transformedQuestion.options = question.categories.split(',').map(opt => opt.trim());
          } else {
            transformedQuestion.options = [];
          }
          transformedQuestion.selectedOption = '';
          
        } else if (question.criteria === 'scale') {
          transformedQuestion.type = 'rating';
          const maxRange = parseInt(question.scales) || 5;
          transformedQuestion.maxRange = maxRange;
          transformedQuestion.rating = 0;
          
        } else if (question.criteria === 'open') {
          transformedQuestion.type = 'open';
          transformedQuestion.answer = '';
          
        } else {
          // Default fallback
          transformedQuestion.type = 'category';
          transformedQuestion.options = [];
          transformedQuestion.selectedOption = '';
        }

        console.log(`Transformed question ${index + 1}:`, transformedQuestion);
        return transformedQuestion;
        
      } catch (error) {
        console.error(`Error transforming individual question ${question.id}:`, error);
        
        return {
          id: question.id,
          queId: question.id,
          type: 'category',
          question: question.text || 'Question text not available',
          options: [],
          selectedOption: '',
          order: parseInt(question.ord) || 1,
          isSaved: true,
          parentId: question.parent_id || null,
          parentCategoryTexts: question.parent_category_texts || null
        };
      }
    });
    
    const groupedQuestions = groupQuestionsIntoFlowStructure(transformedQuestions);
    
    console.log("Final grouped questions:", groupedQuestions);
    return groupedQuestions;
    
  } catch (error) {
    console.error('Error in transformQuestionDataWithFlowSupport:', error);
    return [];
  }
};

export const filterAndSortTemplates = (data, search, orderBy, order, dataMapper = (data) => data) => {
  return [...data]
    .map(dataMapper) 
    .filter((template) =>
      template.name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (orderBy === "name" || orderBy === "status") {
        const aValue = a[orderBy] || "";
        const bValue = b[orderBy] || "";
        return (order === "asc" ? 1 : -1) * aValue.localeCompare(bValue);
      } else if (orderBy === "date") {
        const dateA = new Date(a.rawDate || a.date || "");
        const dateB = new Date(b.rawDate || b.date || "");
        return (order === "asc" ? 1 : -1) * (dateA - dateB);
      } else if (orderBy === "id") {
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return (order === "asc" ? 1 : -1) * (idA - idB);
      }
      return 0;
    });
};

export const paginateData = (data, page, rowsPerPage) => {
  return data.slice((page - 1) * rowsPerPage, page * rowsPerPage);
};