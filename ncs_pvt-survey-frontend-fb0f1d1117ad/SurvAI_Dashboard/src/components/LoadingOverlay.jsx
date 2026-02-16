import { Box, CircularProgress, Typography } from "@mui/material";

const LoadingOverlay = ({ visible, message = "Loading..." }) => {
  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}
    >
      <Box
        sx={{
          backgroundColor: 'white',
          padding: 3,
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <CircularProgress size={40} sx={{ color: '#1958F7' }} />
        <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>
          {message}
        </Typography>
      </Box>
    </Box>
  );
};

export default LoadingOverlay;
