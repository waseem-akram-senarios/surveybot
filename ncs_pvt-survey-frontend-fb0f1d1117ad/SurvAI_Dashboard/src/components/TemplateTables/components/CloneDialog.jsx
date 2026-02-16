import { Dialog, Typography, TextField, Box, Button, CircularProgress } from "@mui/material";

const CloneDialog = ({ 
  open, 
  onClose, 
  selectedTemplate, 
  newTemplateName, 
  setNewTemplateName, 
  onClone, 
  loading 
}) => {
  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
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
        Clone Template
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
        You are about to create a clone of template{" "}
        <strong>
          {selectedTemplate?.id} – {selectedTemplate?.name}
        </strong>
        . Please enter a name for the new template:
      </Typography>

      <TextField
        fullWidth
        label="New Survey Name"
        value={newTemplateName}
        onChange={(e) => setNewTemplateName(e.target.value)}
        disabled={loading}
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
        placeholder="Enter template name"
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
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
          onClick={onClone}
          disabled={loading || !newTemplateName.trim()}
          sx={{
            textTransform: "none",
            width: "100px",
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
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            "Clone"
          )}
        </Button>
      </Box>
    </Dialog>
  );
};

export default CloneDialog;
