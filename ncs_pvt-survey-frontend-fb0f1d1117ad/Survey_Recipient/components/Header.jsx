import { Box, Typography, Button } from "@mui/material";

export default function Header({
  progress = 0,
  currentQuestion = 0,
  totalQuestions = 0,
  showProgress = false,
  onSubmit,
  showSubmitButton = false,
  submitDisabled = false,
}) {
  return (
    <Box>
      <Box textAlign="center" mb={{ xs: 4, sm: 6 }}>
        <Typography
          sx={{
            fontFamily: "Saira, sans-serif",
            fontSize: { xs: "32px", sm: "40px", md: "48px" },
            fontWeight: "400",
          }}
        >
          IT Curves
        </Typography>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontSize: { xs: "14px", sm: "16px" },
            fontWeight: "400",
            lineHeight: "24px",
            color: "#929292",
          }}
        >
          Customer Satisfaction Survey
        </Typography>
      </Box>
      
      {showProgress && <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Box
          sx={{
            width: { xs: "90%", sm: "70%", md: "50%" },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
            gap: { xs: 2, sm: 2 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              gap: { xs: 1, sm: 2 },
            }}
          >
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontSize: { xs: "12px", sm: "14px" },
                fontWeight: "400",
                color: "#929292",
              }}
            >
              Progress
            </Typography>
            
            <Box
              sx={{
                height: { xs: "8px", sm: "10px" },
                borderRadius: "12px",
                backgroundColor: "#F0F0F0",
                flex: 1,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  backgroundColor: "#1958F7",
                  borderRadius: "12px",
                  width: `${progress}%`,
                  transition: "width 0.3s ease",
                }}
              />
            </Box>
            
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontSize: { xs: "12px", sm: "14px" },
                fontWeight: "400",
                color: "#929292",
                whiteSpace: "nowrap",
              }}
            >
              {currentQuestion}/{totalQuestions} Questions
            </Typography>
          </Box>
          
          {/* Submit Button */}
          {showSubmitButton && (
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={submitDisabled}
              sx={{
                textTransform: "none",
                color: "#fff",
                backgroundColor: submitDisabled ? "#ccc" : "#1958F7",
                borderRadius: "17px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: { xs: "12px", sm: "14px" },
                px: { xs: 2, sm: 3 },
                py: { xs: 0.5, sm: 1 },
                minWidth: { xs: "160px", sm: "160px" },
                height: { xs: "38px", sm: "40px" },
                ml: { xs: 0, sm: 2 },
                "&:hover": {
                  backgroundColor: submitDisabled ? "#ccc" : "#1443D1",
                },
                "&:disabled": {
                  backgroundColor: "#ccc",
                  color: "#999",
                },
              }}
            >
              Submit Survey
            </Button>
          )}
        </Box>
      </Box>}
    </Box>
  );
}