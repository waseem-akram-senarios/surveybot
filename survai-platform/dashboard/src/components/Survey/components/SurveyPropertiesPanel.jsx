import {
  Box,
  Typography,
  TextField,
  Button,
  useMediaQuery,
  Select,
  MenuItem,
  FormControl,
  Switch,
  Tooltip,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import Save from "../../../assets/Save.svg";

const SurveyPropertiesPanel = ({
  selectedTemplate,
  setSelectedTemplate,
  recipientName,
  setRecipientName,
  recipientBiodata,
  setRecipientBiodata,
  availableTemplates,
  isLoadingTemplates,
  onLaunchSurvey,
  onRegenerate,
  onBack,
  isLaunching,
  isGenerating,
  aiAugmented,
  onAiAugmentedToggle,
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");

  return (
    <Box
      sx={{
        width: isMobile ? "100%" : "30%",
        backgroundColor: "#fff",
        borderRadius: "20px",
        p: isMobile ? 2 : 4,
        boxShadow: "0px 4px 20px 0px #0000000D",
        overflowY: "auto",
        maxHeight: "100%",
      }}
    >
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 500,
          fontSize: "18px",
          lineHeight: "100%",
          color: "#1E1E1E",
          mb: 3,
        }}
      >
        Survey Properties
      </Typography>

      {/* Select Template */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1,
          }}
        >
          Select Template
        </Typography>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "100%",
            color: "#7D7D7D",
            mb: 1.5,
          }}
        >
          This template will serve as the base for this survey
        </Typography>

        <FormControl fullWidth size="small">
          <Select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            disabled={isLoadingTemplates}
            sx={{
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiSelect-select": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
                padding: "10px 14px",
              },
            }}
          >
            <MenuItem value="" disabled>
              <Typography
                sx={{ color: "#7D7D7D", fontFamily: "Poppins, sans-serif" }}
              >
                {isLoadingTemplates
                  ? "Loading templates..."
                  : "Select a template"}
              </Typography>
            </MenuItem>
            {availableTemplates.map((template) => (
              <MenuItem
                key={template}
                value={template}
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "14px",
                }}
              >
                {template}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Recipient Name */}
      <Box sx={{ mb: 3 }}>
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
          Recipient Name
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Enter recipient name"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
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
                color: "#1E1E1E",
                "&::placeholder": {
                  color: "#7D7D7D",
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>

      {/* Recipient Biodata */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1,
          }}
        >
          Recipient Biodata
        </Typography>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "16px",
            color: "#7D7D7D",
            mb: 1.5,
          }}
        >
          Describe the recipient that will receive this survey. Our AI will
          automatically select the relevant questions from the template to
          create the perfect survey for them
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          size="small"
          value={recipientBiodata}
          onChange={(e) => setRecipientBiodata(e.target.value)}
          placeholder="Enter recipient data"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "140%",
                color: "#1E1E1E",
                "&::placeholder": {
                  color: "#7D7D7D",
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>

      {/* AI Augmented Toggle */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: aiAugmented ? "#EEF3FF" : "#F8F9FA",
          borderRadius: "15px",
          border: `1px solid ${aiAugmented ? "#1958F7" : "#F0F0F0"}`,
          transition: "all 0.2s ease",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "14px",
                color: aiAugmented ? "#1958F7" : "#1E1E1E",
              }}
            >
              AI Augmented
            </Typography>
            <Tooltip
              title="When enabled, the AI agent will analyze each question and answer during the call. It can intelligently skip questions that are already answered by previous responses or irrelevant to this rider."
              placement="top"
            >
              <InfoOutlined sx={{ fontSize: 16, color: "#7D7D7D", cursor: "pointer" }} />
            </Tooltip>
          </Box>
          <Switch
            checked={!!aiAugmented}
            onChange={(e) => onAiAugmentedToggle && onAiAugmentedToggle(e.target.checked)}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: "#1958F7" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#1958F7" },
            }}
          />
        </Box>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            color: "#7D7D7D",
            mt: 0.5,
          }}
        >
          {aiAugmented
            ? "AI will analyze Q&A and skip irrelevant questions automatically"
            : "All questions will be asked in order — no AI skipping"}
        </Typography>
      </Box>

      {/* Launch Survey Button */}
      <Button
        variant="contained"
        onClick={onLaunchSurvey}
        disabled={isLaunching || isGenerating}
        fullWidth
        sx={{
          textTransform: "none",
          color: "#fff",
          height: "48px",
          backgroundColor: isLaunching || isGenerating ? "#ccc" : "#1958F7",
          borderRadius: "17px",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "14px",
          mb: 3,
          "&:hover": {
            backgroundColor: isLaunching || isGenerating ? "#ccc" : "#1443D1",
          },
        }}
      >
        {isLaunching ? "Launching..." : "Launch Survey"}
      </Button>

      {/* Bottom Buttons */}
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={isLaunching || isGenerating}
          sx={{
            textTransform: "none",
            color: "#1E1E1E",
            flex: 1,
            height: "40px",
            borderColor: "#F0F0F0",
            borderRadius: "15px",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            "&:hover": {
              borderColor: "#E0E0E0",
              backgroundColor: "#F5F5F5",
            },
          }}
        >
          Back
        </Button>

        <Button
          variant="outlined"
          onClick={onRegenerate}
          disabled={isLaunching || isGenerating}
          sx={{
            textTransform: "none",
            color: "#1E1E1E",
            flex: 1,
            height: "40px",
            borderColor: "#F0F0F0",
            borderRadius: "15px",
            "&:hover": {
              borderColor: "#E0E0E0",
              backgroundColor: "#F5F5F5",
            },
          }}
        >
          {isGenerating ? (
            "Regenerating..."
          ) : (
            <>
              <img
                src={Save}
                alt="regenerate"
                style={{ marginRight: "10px" }}
              />
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                }}
              >
                Regenerate
              </Typography>
            </>
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default SurveyPropertiesPanel;
