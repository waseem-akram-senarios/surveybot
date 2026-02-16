import { Box, Typography, Button } from "@mui/material";
import Save from "../../../assets/Save.svg";
import AnalyticsIcon from "../../../assets/Analytics.svg";
import TranslateIcon from "../../../assets/Spanish.svg";

const TemplateHeader = ({
  viewMode,
  editMode,
  translateCloneLoading,
  isSaving,
  currentStep,
  hasChangesToSave,
  unsavedQuestions,
  editedQuestions,
  onSaveDraft,
  onAnalytics,
  onCreateTranslatedClone,
}) => {
  const getTitle = () => {
    if (viewMode) return "Campaign Form";
    if (editMode) return "Edit Campaign";
    return "Create New Survey Campaign";
  };

  const getSaveButtonText = () => {
    if (isSaving) return "Saving...";
    
    const newQuestionsCount = unsavedQuestions?.length || 0;
    const editedQuestionsCount = editedQuestions?.size || 0;
    
    if (newQuestionsCount > 0 && editedQuestionsCount > 0) {
      return `Save ${newQuestionsCount + editedQuestionsCount} Changes`;
    } else if (newQuestionsCount > 0) {
      return `Save ${newQuestionsCount} New Question${newQuestionsCount !== 1 ? 's' : ''}`;
    } else if (editedQuestionsCount > 0) {
      return `Save ${editedQuestionsCount} Change${editedQuestionsCount !== 1 ? 's' : ''}`;
    } else {
      return "Save Draft";
    }
  };

  const getSaveButtonColor = () => {
    return hasChangesToSave ? "#FF9500" : "#1E1E1E";
  };

  const getSaveButtonBorderColor = () => {
    return hasChangesToSave ? "#FF9500" : "#F0F0F0";
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 3,
      }}
    >
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 500,
          fontSize: "18px",
          lineHeight: "100%",
        }}
      >
        {getTitle()}
      </Typography>

      {/* Header buttons - different for view mode */}
      {viewMode ? (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={onCreateTranslatedClone}
            disabled={translateCloneLoading}
            sx={{
              textTransform: "none",
              borderColor: "#F0F0F0",
              borderRadius: "15px",
              height: "40px",
              minWidth: "180px",
              "&:hover": {
                borderColor: "#E0E0E0",
              },
              "&:disabled": {
                opacity: 0.5,
              },
            }}
          >
            <img src={TranslateIcon} alt="Translate Icon" style={{ marginRight: "8px" }} />
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
              }}
            >
              {translateCloneLoading ? "Creating..." : "Translate & Clone"}
            </Typography>
          </Button>
        </Box>
      ) : (
        <Button
          variant="outlined"
          onClick={onSaveDraft}
          disabled={isSaving || currentStep === 1}
          sx={{
            textTransform: "none",
            borderColor: getSaveButtonBorderColor(),
            borderRadius: "15px",
            height: "40px",
            minWidth: "150px",
            "&:hover": {
              borderColor: hasChangesToSave ? "#FF7A00" : "#F0F0F0",
            },
            "&:disabled": {
              opacity: 0.5,
            },
          }}
        >
          <img src={Save} alt="Save Icon" style={{ marginRight: "8px" }} />
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "100%",
              color: getSaveButtonColor(),
            }}
          >
            {getSaveButtonText()}
          </Typography>
        </Button>
      )}
    </Box>
  );
};

export default TemplateHeader;