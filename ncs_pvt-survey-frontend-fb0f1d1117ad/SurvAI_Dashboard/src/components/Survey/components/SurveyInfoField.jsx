import { Box, Typography } from "@mui/material";

const SurveyInfoField = ({ icon = "📋", label, value, isLink = false, onClick }) => {
  return (
    <Box
      sx={{
        mb: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: isLink ? "flex-start" : "center",
        flexDirection: isLink ? "row" : "row",
        flexWrap: isLink ? "wrap" : "nowrap",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mr: isLink ? 2 : 0 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "14px",
            color: "#9E9E9E",
            mr: 1,
          }}
        >
          {icon}
        </Typography>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "14px",
            color: "#9E9E9E",
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "14px",
          fontWeight: 500,
          color: isLink ? "#1958F7" : "#1E1E1E",
          wordBreak: isLink ? "break-word" : "normal",
          maxWidth: isLink ? "100%" : "auto",
          cursor: isLink ? "pointer" : "default",
          "&:hover": isLink ? { textDecoration: "underline" } : {},
        }}
        onClick={onClick}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default SurveyInfoField;