import {
    Box,
    Typography,
    Button,
    Modal,
    useMediaQuery,
  } from '@mui/material';
  
  const PublishConfirmationModal = ({ open, onClose, onConfirm }) => {
    const isMobile = useMediaQuery('(max-width: 600px)');

    return (
      <Modal
        open={open}
        onClose={onClose}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          p: isMobile ? 2 : 4,
          width: isMobile ? '90%' : '400px',
          boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.1)',
        }}>
          {/* Modal Header */}
          <Typography sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 500,
            fontSize: '20px',
            color: '#1E1E1E',
            mb: 2
          }}>
            Publish Template
          </Typography>
  
          {/* Modal Description */}
          <Typography sx={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 400,
            fontSize: '14px',
            color: '#7D7D7D',
            mb: 4,
            lineHeight: '150%'
          }}>
            You are about to publish a template. Are you sure you want to proceed?
          </Typography>
  
          {/* Modal Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                textTransform: 'none',
                width: '100px',
                height: '48px',
                color: '#1E1E1E',
                borderColor: '#E0E0E0',
                borderRadius: '17px',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                '&:hover': {
                  borderColor: '#E0E0E0',
                  backgroundColor: '#F5F5F5',
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={onConfirm}
              sx={{
                textTransform: 'none',
                width: '100px',
                height: '48px',
                backgroundColor: '#1958F7',
                borderRadius: '17px',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                '&:hover': {
                  backgroundColor: '#1443D1',
                }
              }}
            >
              Publish
            </Button>
          </Box>
        </Box>
      </Modal>
    );
  };
  
export default PublishConfirmationModal;