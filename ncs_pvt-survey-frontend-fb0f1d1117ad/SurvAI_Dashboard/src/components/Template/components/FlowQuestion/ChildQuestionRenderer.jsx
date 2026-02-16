import { Box, Typography, TextField, IconButton, Button, FormControl, Select, MenuItem } from '@mui/material';
import Delete from '../../../../assets/Delete.svg';

const ChildQuestionRenderer = ({ question, onUpdate, onDelete }) => {
  const updateField = (field, value) => {
    onUpdate(question.id, field, value);
  };

  const renderQuestionTypeSpecific = () => {
    switch (question.type) {
      case 'category':
        return (
          <Box>
            {question.options.map((option, idx) => (
              <Box key={idx} sx={{ mb: 2 }}>
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
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...question.options];
                      newOptions[idx] = e.target.value;
                      updateField('options', newOptions);
                    }}
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
                  {question.options.length > 2 && (
                    <IconButton
                      onClick={() => {
                        const newOptions = question.options.filter((_, i) => i !== idx);
                        updateField('options', newOptions);
                      }}
                      sx={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '15px',
                        boxShadow: '0px 4px 20px 0px #0000000D'
                      }}
                    >
                      <img src={Delete} alt="delete" />
                    </IconButton>
                  )}
                </Box>
              </Box>
            ))}
            
            {question.options.length < 10 && (
              <Button
                onClick={() => {
                  const newOptions = [...question.options, ''];
                  updateField('options', newOptions);
                }}
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
                  borderRadius: '12px',
                  '&:hover': {
                    backgroundColor: '#F0F0F0',
                  }
                }}
              >
                + Add Label
              </Button>
            )}

            <Typography sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '12px',
              color: '#999',
              mb: 2
            }}>
              {question.options.length >= 10 ? 'Max Labels Added' : 'Please enter between 2 and 10 labels.'}
            </Typography>
          </Box>
        );

      case 'rating':
        return (
          <Box>
            <Typography sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              color: '#1E1E1E',
              mb: 2
            }}>
              Rating Range
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <Select
                value={question.maxRange}
                onChange={(e) => updateField('maxRange', e.target.value)}
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
                {Array.from({ length: question.maxRange }, (_, index) => (
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
        );

      case 'open':
        return (
          <Typography sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 400,
            fontSize: '12px',
            color: '#999',
            mb: 2
          }}>
            This will create an open-ended question where users can provide text responses.
          </Typography>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      mt: 2,
      backgroundColor: '#FAFAFA',
      borderRadius: '15px',
      p: 3,
      border: '1px solid #F0F0F0',
      boxShadow: '0px 2px 8px 0px #0000000A'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'end', alignItems: 'center', mb: 3 }}>
        <IconButton
          onClick={() => onDelete(question.id)}
          sx={{ 
            width: '48px', 
            height: '48px',
            borderRadius: '15px',
            boxShadow: '0px 4px 20px 0px #0000000D'
          }}
        >
          <img src={Delete} alt="delete" />
        </IconButton>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Describe the question"
          value={question.question}
          onChange={(e) => updateField('question', e.target.value)}
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

      {renderQuestionTypeSpecific()}
    </Box>
  );
};

export default ChildQuestionRenderer;
