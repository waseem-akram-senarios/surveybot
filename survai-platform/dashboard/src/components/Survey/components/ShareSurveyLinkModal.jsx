import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Button,
  Box,
  IconButton,
  TextField,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const ShareSurveyLinkModal = ({ open, onClose, surveyLink = "https://survey.ai/s/101", onConfirm }) => {
  const isMobile = useMediaQuery('(max-width: 600px)');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(surveyLink);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = surveyLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          width: isMobile ? '90%' : '450px',
          maxWidth: isMobile ? '90%' : '450px',
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: isMobile ? 3 : 4, position: 'relative' }}>
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: '#7D7D7D',
            '&:hover': {
              backgroundColor: '#F5F5F5',
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
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              fontSize: '18px',
              lineHeight: '100%',
              color: '#1E1E1E',
              mb: 2,
            }}
          >
            Share Survey Link
          </Typography>

          {/* Description */}
          <Typography
            sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '140%',
              color: '#7D7D7D',
              mb: 4,
            }}
          >
            You have successfully launched a survey. Copy and share the link with the recipient
          </Typography>

          {/* URL Link Section */}
          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '100%',
                color: '#1E1E1E',
                mb: 2,
              }}
            >
              URL Link
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                fullWidth
                value={surveyLink}
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#F8F8F8',
                    borderRadius: '15px',
                    '& fieldset': {
                      border: 'none',
                    },
                    '& .MuiInputBase-input': {
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '100%',
                      color: '#7D7D7D',
                    },
                  },
                }}
              />

              <Button
                variant="outlined"
                onClick={handleCopyLink}
                sx={{
                  textTransform: 'none',
                  color: '#1E1E1E',
                  minWidth: '80px',
                  height: '40px',
                  borderColor: '#F0F0F0',
                  borderRadius: '15px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 400,
                  fontSize: '14px',
                  '&:hover': {
                    borderColor: '#E0E0E0',
                    backgroundColor: '#F5F5F5',
                  },
                }}
                startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </Box>
          </Box>

          {/* Confirm Button */}
          <Button
            variant="contained"
            onClick={onConfirm}
            fullWidth
            sx={{
              textTransform: 'none',
              color: '#fff',
              height: '48px',
              backgroundColor: '#1958F7',
              borderRadius: '17px',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              '&:hover': {
                backgroundColor: '#1443D1',
              },
            }}
          >
            Confirm
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ShareSurveyLinkModal;