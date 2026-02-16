import { Box, Typography, FormControl, Select, MenuItem, Chip } from '@mui/material';

const ChildQuestionSection = ({
  parentOptions,
  selectedOption,
  onSelectedOptionChange,
  childQuestions
}) => {
  const getChildQuestionsSummary = () => {
    const filledOptions = parentOptions.filter(opt => opt.trim() !== '');
    return filledOptions.map(option => {
      const count = childQuestions[option]?.length || 0;
      return { option, count };
    });
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography gutterBottom sx={{
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 500,
        fontSize: '14px',
        color: '#1E1E1E',
      }}>
        Add Logic
      </Typography>
      <Typography gutterBottom sx={{
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 400,
        fontSize: '14px',
        color: '#1E1E1E',
      }}>
        Show these questions when this option is selected (optional)
      </Typography>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <Select
          value={selectedOption}
          onChange={(e) => onSelectedOptionChange(e.target.value)}
          displayEmpty
          renderValue={(selected) => {
            if (!selected) {
              return (
                <Typography sx={{
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '14px',
                  color: '#7D7D7D'
                }}>
                  Select option
                </Typography>
              );
            }
            return selected;
          }}
          sx={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: '14px',
            borderRadius: '15px',
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
              boxShadow: '0px 4px 20px 0px #0000000D'
            },
            '& .MuiSelect-select': {
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              color: selectedOption ? '#1E1E1E' : '#7D7D7D',
            },
          }}
        >
          {parentOptions.filter(opt => opt.trim() !== '').map((option) => (
            <MenuItem key={option} value={option} sx={{ fontFamily: 'Poppins, sans-serif' }}>
              {option} {childQuestions[option]?.length > 0 && `(${childQuestions[option].length} questions)`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default ChildQuestionSection;
