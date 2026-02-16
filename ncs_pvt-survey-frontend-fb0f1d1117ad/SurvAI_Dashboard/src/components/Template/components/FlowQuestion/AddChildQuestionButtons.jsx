import { Box, Button, Typography, useMediaQuery } from '@mui/material';
import RatingIcon from '../../../../assets/Rating.svg';
import OpenIcon from '../../../../assets/Category.svg';

const AddChildQuestionButtons = ({ onAddChildQuestion }) => {
  const isMobile = useMediaQuery('(max-width: 600px)');

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      mt: 3, 
      mb: 2, 
      flexDirection: isMobile ? "column" : "row", 
      flexWrap: "wrap" 
    }}>
      <Button
        variant="outlined"
        onClick={() => onAddChildQuestion('rating')}
        sx={{
          textTransform: "none",
          borderColor: "#F0F0F0",
          width: "200px",
          height: "40px",
          borderRadius: "15px",
          "&:hover": {
            borderColor: "#F0F0F0",
          },
        }}
      >
        <img src={RatingIcon} alt="rating" style={{ marginRight: "10px" }} />
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
          }}
        >
          Add Rating Question
        </Typography>
      </Button>

      <Button
        variant="outlined"
        onClick={() => onAddChildQuestion('category')}
        sx={{
          textTransform: "none",
          borderColor: "#F0F0F0",
          width: "230px",
          height: "40px",
          borderRadius: "15px",
          "&:hover": {
            borderColor: "#F0F0F0",
          },
        }}
      >
        <img src={OpenIcon} alt="category" style={{ marginRight: "10px" }} />
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
          }}
        >
          Add Category Question
        </Typography>
      </Button>

      <Button
        variant="outlined"
        onClick={() => onAddChildQuestion('open')}
        sx={{
          textTransform: "none",
          borderColor: "#F0F0F0",
          width: "200px",
          height: "40px",
          borderRadius: "15px",
          "&:hover": {
            borderColor: "#F0F0F0",
          },
        }}
      >
        <img src={OpenIcon} alt="open" style={{ marginRight: "10px" }} />
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
          }}
        >
          Add Open Question
        </Typography>
      </Button>
    </Box>
  );
};

export default AddChildQuestionButtons;
