import { Box, Button } from "@mui/material";

const TemplateFooter = ({
  currentStep,
  isLoading,
  isSaving,
  templateData,
  onBack,
  onNext,
}) => {
  const getNextButtonText = () => {
    console.log("ree", templateData)
    if (isLoading) return "Processing...";
    if (currentStep === 1) return "Next";
    if (templateData?.status === "Published") return "Create Survey";
    return "Publish";
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 3 }}>
      <Button
        variant="outlined"
        onClick={onBack}
        disabled={isLoading || isSaving}
        sx={{
          textTransform: "none",
          color: "#1E1E1E",
          width: "134px",
          height: "48px",
          borderColor: "#F0F0F0",
          borderRadius: "17px",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "14px",
        }}
      >
        Back
      </Button>

      <Button
        variant="contained"
        onClick={onNext}
        disabled={isLoading || isSaving}
        sx={{
          textTransform: "none",
          color: "#fff",
          width: "134px",
          height: "48px",
          backgroundColor: (isLoading || isSaving) ? "#ccc" : "#1958F7",
          borderRadius: "17px",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "14px",
        }}
      >
        {getNextButtonText()}
      </Button>
    </Box>
  );
};

export default TemplateFooter;