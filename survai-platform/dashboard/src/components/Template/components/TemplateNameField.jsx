import { Box, Typography, TextField, FormControlLabel, Switch, Tooltip } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";

const TemplateNameField = ({
  templateName,
  onTemplateNameChange,
  currentStep,
  viewMode,
  aiAugmented,
  onAiAugmentedChange,
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
        Template Name
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
      
      {/* AI Augmented Toggle */}
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={aiAugmented || false}
              onChange={(e) => onAiAugmentedChange && onAiAugmentedChange(e.target.checked)}
              disabled={currentStep === 2 || viewMode}
              sx={{
                '& .MuiSwitch-switchBase.Mui-disabled + .MuiSwitch-track': {
                  backgroundColor: '#e0e0e0',
                },
                '& .MuiSwitch-switchBase.Mui-disabled .MuiSwitch-thumb': {
                  backgroundColor: '#bdbdbd',
                },
              }}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "13px",
                  color: (currentStep === 2 || viewMode) ? "#999" : "#1E1E1E",
                }}
              >
                AI Augmented
              </Typography>
              <Tooltip
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '12px' }}>
                      When enabled, the AI agent can:
                      <br />• Ask follow-up questions based on responses
                      <br />• Skip questions if they're already answered
                      <br />• Personalize the conversation
                      <br />• Keep responses focused on survey goals
                    </Typography>
                  </Box>
                }
                arrow
                placement="top"
              >
                <InfoOutlined sx={{ fontSize: 16, color: '#666', cursor: 'help' }} />
              </Tooltip>
            </Box>
          }
        />
      </Box>
    </Box>
  );
};

export default TemplateNameField;