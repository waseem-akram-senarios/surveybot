import { Box, Typography, TextField, Button, IconButton } from '@mui/material';
import Delete from '../../../../assets/Delete.svg';

const ParentOptionsSection = ({
  parentOptions,
  onUpdateOption,
  onAddOption,
  onRemoveOption
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      {parentOptions.map((option, index) => (
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
              value={option}
              onChange={(e) => onUpdateOption(index, e.target.value)}
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
            {parentOptions.length > 2 && (
              <IconButton
                onClick={() => onRemoveOption(index)}
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

      {parentOptions.length < 10 && (
        <Button
          onClick={onAddOption}
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
            '&:hover': {
              backgroundColor: 'transparent',
            }
          }}
        >
          + Add Label
        </Button>
      )}
    </Box>
  );
};

export default ParentOptionsSection;
