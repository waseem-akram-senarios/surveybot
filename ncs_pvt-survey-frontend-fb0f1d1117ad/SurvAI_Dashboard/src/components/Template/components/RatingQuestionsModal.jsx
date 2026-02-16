import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Modal,
  useMediaQuery,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';

const RatingQuestionModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  editingQuestion = null 
}) => {
  const [ratingQuestion, setRatingQuestion] = useState(editingQuestion?.question || '');
  const [maxRange, setMaxRange] = useState(editingQuestion?.maxRange || 5);

  const handleSubmit = () => {
    if (ratingQuestion.trim() && maxRange >= 3 && maxRange <= 5) {
      onSubmit({
        question: ratingQuestion,
        maxRange: maxRange,
        isEdit: !!editingQuestion,
        id: editingQuestion?.id
      });
      handleCancel();
    }
  };

  const handleCancel = () => {
    setRatingQuestion('');
    setMaxRange(5);
    onClose();
  };

  // Reset form when modal opens with editing data
  useEffect(() => {
    if (open && editingQuestion) {
      setRatingQuestion(editingQuestion.question);
      setMaxRange(editingQuestion.maxRange || 5);
    } else if (open && !editingQuestion) {
      setRatingQuestion('');
      setMaxRange(5);
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
            {editingQuestion ? 'Edit Rating Question' : 'Add Rating Question'}
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
            value={ratingQuestion}
            onChange={(e) => setRatingQuestion(e.target.value)}
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

        {/* Rating Range Section */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 400,
            fontSize: '14px',
            color: '#1E1E1E',
            mb: 2
          }}>
            Rating Range
          </Typography>

          <FormControl fullWidth>
            <Select
              value={maxRange}
              onChange={(e) => setMaxRange(e.target.value)}
              sx={{
                borderRadius: '15px',
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                  boxShadow: '0px 4px 20px 0px #0000000D'
                },
                '& .MuiSelect-select': {
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 400,
                  fontSize: '14px',
                  color: '#7D7D7D',
                },
              }}
            >
              <MenuItem value={3}>1 to 3</MenuItem>
              <MenuItem value={4}>1 to 4</MenuItem>
              <MenuItem value={5}>1 to 5</MenuItem>
            </Select>
          </FormControl>

          {/* Rating Preview */}
          <Box sx={{ mt: 2 }}>
            <Typography sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '12px',
              color: '#999',
              mb: 1
            }}>
              Preview:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {Array.from({ length: maxRange }, (_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#F8F8F8',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0px 2px 8px 0px #0000000A'
                  }}
                >
                  <Typography sx={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 400,
                    fontSize: '14px',
                    color: '#4B4B4B'
                  }}>
                    {index + 1}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

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
            disabled={!ratingQuestion.trim()}
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

export default RatingQuestionModal;