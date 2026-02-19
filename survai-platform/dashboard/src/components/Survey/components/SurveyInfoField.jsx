import { Box, Typography } from "@mui/material";

const SurveyInfoField = ({ icon = "📋", label, value, isLink = false, onClick }) => {
  const linkStyles = {
    fontFamily: "Poppins, sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    color: "#1958F7",
    wordBreak: "break-word",
    maxWidth: "100%",
    textDecoration: "none",
  };

  return (
    <Box
      sx={{
        mb: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: isLink ? "flex-start" : "center",
        flexDirection: "row",
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
      {isLink && value ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyles}
        >
          {value}
        </a>
      ) : (
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "#1E1E1E",
            wordBreak: "normal",
            maxWidth: "auto",
            cursor: "default",
          }}
          onClick={onClick}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
};

export default SurveyInfoField;