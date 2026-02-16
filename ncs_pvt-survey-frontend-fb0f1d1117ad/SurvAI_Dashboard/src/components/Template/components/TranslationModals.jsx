import { Box, Typography, Button, Dialog, TextField, CircularProgress } from "@mui/material";

const TranslationModals = ({
  showLanguageSelectionModal,
  showTranslateCloneModal,
  selectedLanguage,
  translatedTemplateName,
  translateCloneLoading,
  templateName,
  availableLanguages,
  onLanguageSelect,
  onCreateCloneClick,
  onTranslateCloneConfirm,
  onCloseLanguageSelection,
  onCloseTranslateClone,
  onTranslatedTemplateNameChange,
}) => {
  return (
    <>
      {/* Language Selection Modal */}
      <Dialog
        open={showLanguageSelectionModal}
        onClose={() => !translateCloneLoading && onCloseLanguageSelection()}
        fullWidth
        maxWidth="xs"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
            p: 4,
            backgroundColor: "#fff",
            boxShadow: "0px 4px 20px 0px rgba(0, 0, 0, 0.1)",
            width: "300px",
            maxWidth: "300px",
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 500,
            fontSize: "20px",
            color: "#1E1E1E",
            mb: 1,
          }}
        >
          Translate & Clone
        </Typography>
        <Typography
          sx={{
            mb: 4,
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            color: "#7D7D7D",
            lineHeight: "140%",
          }}
        >
          Select a language to create a clone of this template
        </Typography>

        <Box sx={{ mb: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
            {availableLanguages.slice(0, 2).map((language) => (
              <Button
                key={language.code}
                onClick={() => onLanguageSelect(language.code)}
                sx={{
                  textTransform: "none",
                  width: "130px",
                  height: "50px",
                  backgroundColor: selectedLanguage === language.code ? "#F0F7FF" : "#fff",
                  border: selectedLanguage === language.code ? "2px solid #1958F7" : "1px solid #F0F0F0",
                  borderRadius: "12px",
                  color: selectedLanguage === language.code ? "#1958F7" : "#1E1E1E",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: selectedLanguage === language.code ? 500 : 400,
                  fontSize: "14px",
                  "&:hover": {
                    backgroundColor: selectedLanguage === language.code ? "#F0F7FF" : "#F8F9FA",
                    borderColor: "#1958F7",
                  },
                }}
              >
                {language.label}
              </Button>
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            {availableLanguages.slice(2, 4).map((language) => (
              <Button
                key={language.code}
                onClick={() => onLanguageSelect(language.code)}
                sx={{
                  textTransform: "none",
                  width: "130px",
                  height: "50px",
                  backgroundColor: selectedLanguage === language.code ? "#F0F7FF" : "#fff",
                  border: selectedLanguage === language.code ? "2px solid #1958F7" : "1px solid #F0F0F0",
                  borderRadius: "12px",
                  color: selectedLanguage === language.code ? "#1958F7" : "#1E1E1E",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: selectedLanguage === language.code ? 500 : 400,
                  fontSize: "14px",
                  "&:hover": {
                    backgroundColor: selectedLanguage === language.code ? "#F0F7FF" : "#F8F9FA",
                    borderColor: "#1958F7",
                  },
                }}
              >
                {language.label}
              </Button>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            onClick={onCloseLanguageSelection}
            sx={{
              textTransform: "none",
              width: "134px",
              height: "48px",
              color: "#1E1E1E",
              borderColor: "#F0F0F0",
              borderRadius: "17px",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              border: "1px solid #F0F0F0",
              "&:hover": {
                borderColor: "#E0E0E0",
                backgroundColor: "#F5F5F5",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onCreateCloneClick}
            disabled={!selectedLanguage}
            sx={{
              textTransform: "none",
              width: "134px",
              height: "48px",
              backgroundColor: selectedLanguage ? "#1958F7" : "#E0E0E0",
              borderRadius: "17px",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              "&:hover": {
                backgroundColor: selectedLanguage ? "#1443D1" : "#E0E0E0",
              },
              "&:disabled": {
                backgroundColor: "#E0E0E0",
                color: "#999",
              },
            }}
          >
            Create Clone
          </Button>
        </Box>
      </Dialog>

      {/* Translated Template Name Modal */}
      <Dialog
        open={showTranslateCloneModal}
        onClose={() => !translateCloneLoading && onCloseTranslateClone()}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "16px",
            p: 3,
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 500,
            fontSize: "20px",
            color: "#1E1E1E",
            mb: 1.5,
          }}
        >
          Create {selectedLanguage} Clone
        </Typography>
        <Typography
          sx={{
            mb: 3,
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            color: "#7D7D7D",
          }}
        >
          You are about to create a {selectedLanguage} version of template{" "}
          <strong>{templateName}</strong>. Please enter a name for the {selectedLanguage} template:
        </Typography>

        <TextField
          fullWidth
          label={`${selectedLanguage} Survey Name`}
          value={translatedTemplateName}
          onChange={(e) => onTranslatedTemplateNameChange(e.target.value)}
          disabled={translateCloneLoading}
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              fontFamily: "Poppins, sans-serif",
            },
            "& .MuiInputLabel-root": {
              fontFamily: "Poppins, sans-serif",
            },
          }}
          placeholder={`Enter ${selectedLanguage} template name`}
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button
            onClick={onCloseTranslateClone}
            disabled={translateCloneLoading}
            sx={{
              textTransform: "none",
              width: "100px",
              height: "48px",
              color: "#1E1E1E",
              border: "1px solid #f0f0f0",
              borderRadius: "17px",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              "&:hover": {
                borderColor: "#E0E0E0",
                backgroundColor: "#F5F5F5",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onTranslateCloneConfirm}
            disabled={translateCloneLoading || !translatedTemplateName.trim()}
            sx={{
              textTransform: "none",
              width: "150px",
              height: "48px",
              backgroundColor: "#1958F7",
              borderRadius: "17px",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              "&:hover": {
                backgroundColor: "#1443D1",
              },
              "&:disabled": {
                backgroundColor: "#6c757d",
              },
            }}
          >
            {translateCloneLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Create Clone"
            )}
          </Button>
        </Box>
      </Dialog>
    </>
  );
};

export default TranslationModals;