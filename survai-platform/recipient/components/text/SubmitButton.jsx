import React from "react";
import { Box, Button } from "@mui/material";

const SubmitButton = ({ isSubmitting, onSubmitClick, label }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: "center" }}>
      <Button
        variant="contained"
        onClick={onSubmitClick}
        disabled={isSubmitting}
        sx={{
          textTransform: "none",
          color: "#fff",
          backgroundColor: isSubmitting ? "#ccc" : "#1958F7",
          borderRadius: "17px",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: { xs: "12px", sm: "14px" },
          px: { xs: 2, sm: 3 },
          py: { xs: 0.5, sm: 1 },
          minWidth: { xs: "150px", sm: "150px" },
          height: { xs: "49px", sm: "49px" },
          ml: { xs: 1, sm: 2 },
          "&:hover": {
            backgroundColor: isSubmitting ? "#ccc" : "#1443D1",
          },
          "&:disabled": {
            backgroundColor: "#ccc",
            color: "#999",
          },
        }}
      >
        {label || 'Submit Survey'}
      </Button>
    </Box>
  );
};

export default SubmitButton;