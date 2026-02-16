import {
  Dialog,
  DialogContent,
  Typography,
  Button,
  Box,
  useMediaQuery,
} from "@mui/material";
import GenerateIcon from "../../../assets/GenerateIcon.svg";

const GenerateConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  disabled = false,
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");

  return (
    <Dialog
      open={open}
      onClose={!disabled ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          width: isMobile ? "90%" : "400px",
          maxWidth: isMobile ? "90%" : "400px",
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: isMobile ? 3 : 4, position: "relative" }}>
        {/* Modal Content */}
        <Box>
          {/* Title */}
          <Box sx={{display: 'flex', alignItems: 'center', mb: 2, gap: 1}}>
            <img src={GenerateIcon} alt="Generate" style={{ height: "48px", display: 'block' }}/>
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "18px",
                lineHeight: "100%",
                color: "#1E1E1E",
              }}
            >
              AI-Powered Pre-Fill
            </Typography>
          </Box>

          {/* Description */}
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "140%",
              color: "#7D7D7D",
              mb: 4,
            }}
          >
            Our smart AI can pre-fill some of the questions using the recipient’s biodata and description you've provided. These questions will not be shown to the recipient but you can see them in the launched survey.
            <br /><br />
            You’ll have the option to review and edit or remove these AI-generated responses before launching the survey.
            <br /><br />
            Would you like to proceed?
          </Typography>

          {/* Buttons */}
          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={disabled}
              sx={{
                textTransform: "none",
                color: "#1E1E1E",
                width: "100px",
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
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={onConfirm}
              disabled={disabled}
              sx={{
                textTransform: "none",
                color: "#fff",
                width: "185px",
                height: "40px",
                backgroundColor: disabled ? "#ccc" : "#1958F7",
                borderRadius: "15px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                "&:hover": {
                  backgroundColor: disabled ? "#ccc" : "#1443D1",
                },
                "&:disabled": {
                  backgroundColor: "#ccc",
                },
              }}
            >
              Generate AI Answers
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateConfirmationModal;
