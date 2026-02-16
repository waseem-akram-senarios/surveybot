import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Modal,
  useMediaQuery,
} from '@mui/material';
import AddCategory from '../../../assets/Category.svg'; 

const OpenQuestionModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  editingQuestion = null 
}) => {
  const [openQuestion, setOpenQuestion] = useState(editingQuestion?.question || '');

  const handleSubmit = () => {
    if (openQuestion.trim()) {
      onSubmit({
        question: openQuestion,
        isEdit: !!editingQuestion,
        id: editingQuestion?.id
      });
      handleCancel();
    }
  };

  const handleCancel = () => {
    setOpenQuestion('');
    onClose();
  };

  // Reset form when modal opens with editing data
  useEffect(() => {
    if (open && editingQuestion) {
      setOpenQuestion(editingQuestion.question);
    } else if (open && !editingQuestion) {
      setOpenQuestion('');
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
          <img src={AddCategory} alt="add-open-question" style={{marginRight: '10px'}} />
          <Typography sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 500,
            fontSize: '18px',
            color: '#1E1E1E'
          }}>
            {editingQuestion ? 'Edit Open Question' : 'Add Open Question'}
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
            value={openQuestion}
            onChange={(e) => setOpenQuestion(e.target.value)}
            variant="outlined"
            multiline
            rows={4}
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

        {/* Helper Text */}
        <Typography sx={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 400,
          fontSize: '12px',
          color: '#999',
          mb: 4
        }}>
          This will create an open-ended question where users can provide text responses.
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
            disabled={!openQuestion.trim()}
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

export default OpenQuestionModal;