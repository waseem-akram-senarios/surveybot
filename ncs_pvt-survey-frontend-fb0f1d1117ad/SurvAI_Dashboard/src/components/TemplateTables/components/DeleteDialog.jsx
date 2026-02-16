import { Dialog, Typography, Box, Button, CircularProgress } from "@mui/material";

const DeleteDialog = ({ 
  open, 
  onClose, 
  selectedTemplate, 
  onDelete, 
  loading 
}) => {
  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      fullWidth
      maxWidth="xs"
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
        Delete Template
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
        Are you sure you want to delete template{" "}
        <strong>
          {selectedTemplate?.id} – {selectedTemplate?.name}
        </strong>
        ? This action cannot be undone.
      </Typography>

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
          onClick={() => onDelete(selectedTemplate?.originalName)}
          disabled={loading}
          sx={{
            textTransform: "none",
            width: "100px",
            height: "48px",
            backgroundColor: "#dc3545",
            borderRadius: "17px",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            "&:hover": {
              backgroundColor: "#c82333",
            },
            "&:disabled": {
              backgroundColor: "#6c757d",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            "Delete"
          )}
        </Button>
      </Box>
    </Dialog>
  );
};

export default DeleteDialog;
