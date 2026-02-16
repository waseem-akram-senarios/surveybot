import {
  Box,
  Typography,
  Button,
  useMediaQuery,
  Dialog,
  DialogContent,
} from "@mui/material";

const DeleteSurveyDialog = ({
  open,
  onClose,
  onConfirm,
  surveyId,
  isDeleting,
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");

  return (
    <Dialog
      open={open}
      onClose={!isDeleting ? onClose : undefined}
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
            Delete Survey
          </Typography>

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
            You are about to delete survey {surveyId}. The recipient will lose
            access to the survey if they have filled it out. Are you sure you
            want to continue?
          </Typography>

          {/* Buttons */}
          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={isDeleting}
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
              disabled={isDeleting}
              sx={{
                textTransform: "none",
                color: "#fff",
                width: "134px",
                height: "48px",
                backgroundColor: "#1958F7",
                borderRadius: "17px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                "&:hover": {
                  backgroundColor: "#1958F7",
                },
                "&:disabled": {
                  backgroundColor: "#ccc",
                },
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteSurveyDialog;
