import {
  Dialog,
  DialogContent,
  Typography,
  Button,
  Box,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const SubmitSurveyModal = ({ open, onClose, onConfirm, disabled = false }) => {
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
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          disabled={disabled}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            color: "#7D7D7D",
            "&:hover": {
              backgroundColor: "#F5F5F5",
            },
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Modal Content */}
        <Box sx={{ pt: 2 }}>
          {/* Title */}
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 500,
              fontSize: "18px",
              lineHeight: "100%",
              color: "#1E1E1E",
              mb: 2,
            }}
          >
            Submit Survey
          </Typography>

          {/* Description */}
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "140%",
              color: "#7D7D7D",
              mb: 1,
            }}
          >
            You haven't answered all the questions. Only your responses so far
            will be saved, and you won't be able to return to this survey later.
          </Typography>

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
            Do you want to continue?
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
                width: "100px",
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
              Submit
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitSurveyModal;
