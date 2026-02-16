import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Modal,
  useMediaQuery,
} from '@mui/material';
import { generateUUID } from '../../../utils/Templates/templateHelpers';

import ParentOptionsSection from './FlowQuestion/ParentOptionsSection';
import ChildQuestionSection from './FlowQuestion/ChildQuestionSection';
import AddChildQuestionButtons from './FlowQuestion/AddChildQuestionButtons';
import ChildQuestionRenderer from './FlowQuestion/ChildQuestionRenderer';

const FlowQuestionModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  editingQuestion = null 
}) => {
  const [parentQuestion, setParentQuestion] = useState('');
  const [parentOptions, setParentOptions] = useState(['', '']);
  const [selectedOption, setSelectedOption] = useState('');
  const [childQuestions, setChildQuestions] = useState({});

  const isMobile = useMediaQuery('(max-width: 600px)');

  useEffect(() => {
    if (open && editingQuestion) {
      setParentQuestion(editingQuestion.question);
      setParentOptions([...editingQuestion.parentOptions]);
      setChildQuestions(editingQuestion.childQuestions ? {...editingQuestion.childQuestions} : {});
      setSelectedOption(editingQuestion.parentOptions[0]);
    } else if (open && !editingQuestion) {
      setParentQuestion('');
      setParentOptions(['', '']);
      setSelectedOption('');
      setChildQuestions({});
    }
  }, [open, editingQuestion]);

  useEffect(() => {
    const validOptions = parentOptions.filter(opt => opt.trim() !== '');
    if (validOptions.length > 0 && !selectedOption) {
      setSelectedOption(validOptions[0]);
    }
  }, [parentOptions, selectedOption]);

  const handleSubmit = () => {
    const filledOptions = parentOptions.filter(opt => opt.trim() !== '');
    
    if (!parentQuestion.trim() || filledOptions.length < 2) {
      return;
    }

    const hasAtLeastOneChildQuestion = filledOptions.some(option => 
      childQuestions[option] && childQuestions[option].length > 0
    );

    const allChildQuestionsValid = filledOptions.every(option => {
      const questions = childQuestions[option] || [];
      return questions.every(q => q.question.trim() !== '');
    });

    if (!hasAtLeastOneChildQuestion || !allChildQuestionsValid) {
      return;
    }

    const formattedChildQuestions = filledOptions.map(option => ({
      option,
      questions: childQuestions[option] || []
    }));

    onSubmit({
      parentQuestion,
      parentOptions: filledOptions,
      childQuestions: formattedChildQuestions,
      isEdit: !!editingQuestion,
      id: editingQuestion?.id
    });

    handleCancel();
  };

  const handleCancel = () => {
    setParentQuestion('');
    setParentOptions(['', '']);
    setSelectedOption('');
    setChildQuestions({});
    onClose();
  };

  const addParentOption = () => {
    if (parentOptions.length < 10) {
      setParentOptions([...parentOptions, '']);
    }
  };

  const removeParentOption = (index) => {
    if (parentOptions.length > 2) {
      const newOptions = parentOptions.filter((_, i) => i !== index);
      const removedOption = parentOptions[index];
      
      const newChildQuestions = { ...childQuestions };
      delete newChildQuestions[removedOption];
      
      setParentOptions(newOptions);
      setChildQuestions(newChildQuestions);
      
      if (selectedOption === removedOption && newOptions.length > 0) {
        setSelectedOption(newOptions[0]);
      }
    }
  };

  const updateParentOption = (index, value) => {
    const oldValue = parentOptions[index];
    const newOptions = [...parentOptions];
    newOptions[index] = value;
    
    if (oldValue && childQuestions[oldValue]) {
      const newChildQuestions = { ...childQuestions };
      newChildQuestions[value] = newChildQuestions[oldValue];
      delete newChildQuestions[oldValue];
      setChildQuestions(newChildQuestions);
    }

    setParentOptions(newOptions);
    
    if (selectedOption === oldValue) {
      setSelectedOption(value);
    }
  };

  const addChildQuestion = (type) => {
    if (!selectedOption) return;

    const newQuestion = {
      id: generateUUID(),
      queId: generateUUID(),
      type,
      question: '',
      isSaved: false,
    };

    switch (type) {
      case 'category':
        newQuestion.options = ['', ''];
        newQuestion.selectedOption = '';
        break;
      case 'rating':
        newQuestion.maxRange = 5;
        newQuestion.rating = 0;
        break;
      case 'open':
        newQuestion.answer = '';
        break;
    }

    const updatedChildQuestions = {
      ...childQuestions,
      [selectedOption]: [...(childQuestions[selectedOption] || []), newQuestion]
    };

    setChildQuestions(updatedChildQuestions);
  };

  const updateChildQuestion = (questionId, field, value) => {
    if (!selectedOption) return;

    const updatedQuestions = childQuestions[selectedOption].map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    );

    setChildQuestions({
      ...childQuestions,
      [selectedOption]: updatedQuestions
    });
  };

  const deleteChildQuestion = (questionId) => {
    if (!selectedOption) return;

    const updatedQuestions = childQuestions[selectedOption].filter(q => q.id !== questionId);
    
    setChildQuestions({
      ...childQuestions,
      [selectedOption]: updatedQuestions
    });
  };

  const getCurrentChildQuestions = () => {
    return childQuestions[selectedOption] || [];
  };

  const isFormValid = () => {
    const filledOptions = parentOptions.filter(opt => opt.trim() !== '');
    if (!parentQuestion.trim() || filledOptions.length < 2) return false;

    const hasAtLeastOneChildQuestion = filledOptions.some(option => 
      childQuestions[option] && childQuestions[option].length > 0
    );

    const allChildQuestionsValid = filledOptions.every(option => {
      const questions = childQuestions[option] || [];
      return questions.every(q => q.question.trim() !== '');
    });

    return hasAtLeastOneChildQuestion && allChildQuestionsValid;
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        p: isMobile ? 2 : 4,
        width: isMobile ? '90%' : '500px',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Modal Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{
            width: '24px',
            height: '24px',
            backgroundColor: '#F0F0F0',
            borderRadius: '4px',
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              width: '12px',
              height: '12px'
            }}>
              {[1,2,3].map(i => (
                <Box key={i} sx={{ backgroundColor: '#999', height: '2px', borderRadius: '1px' }} />
              ))}
            </Box>
          </Box>
          <Typography sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 500,
            fontSize: '18px',
            color: '#1E1E1E'
          }}>
            {editingQuestion ? 'Edit Flow Question' : 'Add Flow Question'}
          </Typography>
        </Box>

        {/* Parent Question Input */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 400,
            fontSize: '14px',
            color: '#1E1E1E',
            mb: 1.5
          }}>
            Question Description
          </Typography>
          <TextField
            fullWidth
            placeholder="Describe the question"
            value={parentQuestion}
            onChange={(e) => setParentQuestion(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '15px',
                '& fieldset': {
                  border: 'none',
                  boxShadow: '0px 4px 20px 0px #0000000D'
                },
                '& .MuiInputBase-input': {
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 400,
                  fontSize: '14px',
                  color: '#7D7D7D',
                },
              },
            }}
          />
        </Box>

        {/* Parent Options Section */}
        <ParentOptionsSection
          parentOptions={parentOptions}
          onUpdateOption={updateParentOption}
          onAddOption={addParentOption}
          onRemoveOption={removeParentOption}
        />

        {/* Child Questions Section */}
        <ChildQuestionSection
          parentOptions={parentOptions}
          selectedOption={selectedOption}
          onSelectedOptionChange={setSelectedOption}
          childQuestions={childQuestions}
        />

        <Typography gutterBottom sx={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          color: '#1E1E1E',
        }}>
          Add Questions
        </Typography>

        {selectedOption && getCurrentChildQuestions().length === 0 && (
          <Typography sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 400,
            fontSize: '13px',
            color: '#999',
            mb: 2,
            fontStyle: 'italic'
          }}>
            No questions added for "{selectedOption}" yet. This option will not show any follow-up questions.
          </Typography>
        )}

        {/* Render Child Questions */}
        {getCurrentChildQuestions().map(question => (
          <ChildQuestionRenderer
            key={question.id}
            question={question}
            onUpdate={updateChildQuestion}
            onDelete={deleteChildQuestion}
          />
        ))}

        {/* Add Child Question Buttons */}
        {selectedOption && (
          <AddChildQuestionButtons onAddChildQuestion={addChildQuestion} />
        )}

        {/* Modal Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            sx={{
              textTransform: 'none',
              width: '134px',
              height: '48px',
              color: '#1E1E1E',
              borderColor: '#E0E0E0',
              borderRadius: '17px',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!isFormValid()}
            sx={{
              textTransform: 'none',
              width: '180px',
              height: '48px',
              backgroundColor: '#1958F7',
              borderRadius: '17px',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              px: 3,
              '&:disabled': {
                backgroundColor: '#ccc',
              }
            }}
          >
            {editingQuestion ? 'Update Question' : 'Add Question'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default FlowQuestionModal;
