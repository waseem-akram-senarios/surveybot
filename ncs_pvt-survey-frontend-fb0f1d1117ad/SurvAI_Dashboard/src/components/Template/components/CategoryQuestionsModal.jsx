import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Modal,
  useMediaQuery,
} from '@mui/material';
import AddCategory from '../../../assets/AddCategory.svg';
import Delete from '../../../assets/Delete.svg';

const CategoryQuestionModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  editingQuestion = null 
}) => {
  const [categoryQuestion, setCategoryQuestion] = useState(editingQuestion?.question || '');
  const [categoryLabels, setCategoryLabels] = useState(editingQuestion?.options || ['', '']);

  const handleSubmit = () => {
    const filledLabels = categoryLabels.filter(label => label.trim() !== '');
    if (categoryQuestion.trim() && filledLabels.length >= 2 && filledLabels.length <= 10) {
      onSubmit({
        question: categoryQuestion,
        options: filledLabels,
        isEdit: !!editingQuestion,
        id: editingQuestion?.id
      });
      handleCancel();
    }
  };

  const handleCancel = () => {
    setCategoryQuestion('');
    setCategoryLabels(['', '']);
    onClose();
  };

  const addLabel = () => {
    if (categoryLabels.length < 10) {
      setCategoryLabels([...categoryLabels, '']);
    }
  };

  const removeLabel = (index) => {
    if (categoryLabels.length > 2) {
      setCategoryLabels(categoryLabels.filter((_, i) => i !== index));
    }
  };

  const updateLabel = (index, value) => {
    const newLabels = [...categoryLabels];
    newLabels[index] = value;
    setCategoryLabels(newLabels);
  };

  // Reset form when modal opens with editing data
  useEffect(() => {
    if (open && editingQuestion) {
      setCategoryQuestion(editingQuestion.question);
      setCategoryLabels([...editingQuestion.options]);
    } else if (open && !editingQuestion) {
      setCategoryQuestion('');
      setCategoryLabels(['', '']);
    }
  }, [open, editingQuestion]);

  const isMobile = useMediaQuery('(max-width: 600px)');

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
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Modal Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <img src={AddCategory} alt="add-category" style={{marginRight: '10px'}} />
          <Typography sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 500,
            fontSize: '18px',
            color: '#1E1E1E'
          }}>
            {editingQuestion ? 'Edit Category Question' : 'Add Category Question'}
          </Typography>
        </Box>

        {/* Question Description */}
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
            value={categoryQuestion}
            onChange={(e) => setCategoryQuestion(e.target.value)}
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

        {/* Labels */}
        {categoryLabels.map((label, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Typography sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              color: '#1E1E1E',
              mb: 1
            }}>
              Enter Label Name
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                placeholder="Enter label name"
                value={label}
                onChange={(e) => updateLabel(index, e.target.value)}
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
              {categoryLabels.length > 2 && (
                <IconButton
                  onClick={() => removeLabel(index)}
                  sx={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '15px',
                  }}
                >
                  <img src={Delete} alt="delete" />
                </IconButton>
              )}
            </Box>
          </Box>
        ))}

        {/* Add Label Button */}
        {categoryLabels.length < 10 && (
          <Button
            onClick={addLabel}
            sx={{
              textTransform: 'none',
              height: '48px',
              width: '138px',
              backgroundColor: '#F9F9F9',
              color: '#4B4B4B',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              mb: 2,
              p: 0,
              minWidth: 'auto',
              '&:hover': {
                backgroundColor: 'transparent',
              }
            }}
          >
            + Add Label
          </Button>
        )}

        {/* Helper Text */}
        <Typography sx={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 400,
          fontSize: '12px',
          color: '#999',
          mb: 4
        }}>
          {categoryLabels.length >= 10 ? 'Max Labels Added' : 'Please enter between 2 and 10 labels.'}
        </Typography>

        {/* Modal Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
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
            disabled={!categoryQuestion.trim() || categoryLabels.filter(l => l.trim()).length < 2}
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

export default CategoryQuestionModal;