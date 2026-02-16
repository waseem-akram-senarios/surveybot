import { Box, Typography, TextField } from "@mui/material";

const TemplateNameField = ({
  templateName,
  onTemplateNameChange,
  currentStep,
  viewMode,
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "14px",
          lineHeight: "100%",
          color: "#1E1E1E",
          mb: 1.5,
        }}
      >
        Survey Name
      </Typography>
      <TextField
        fullWidth
        value={templateName}
        placeholder="User Experience Survey"
        onChange={(e) => onTemplateNameChange(e.target.value)}
        variant="outlined"
        disabled={currentStep === 2 || viewMode}
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: (currentStep === 2 || viewMode) ? "#f5f5f5" : "#fff",
            borderRadius: "15px",
            boxShadow: "0px 4px 20px 0px #0000000D",
            "& fieldset": {
              border: "none",
            },
            "& .MuiInputBase-input": {
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "100%",
              color: (currentStep === 2 || viewMode) ? "#999" : "#7D7D7D",
            },
          },
        }}
      />
    </Box>
  );
};

export default TemplateNameField;