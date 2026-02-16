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
import SendSurveyDialog from './SendSurveyDialog';
import { useSurvey } from '../../../hooks/Surveys/useSurvey';
import { useAlert } from '../../../hooks/useAlert';

const ShareSurveyLinkModal = ({ open, onClose, surveyLink = "https://survey.ai/s/101", onConfirm, surveyId }) => {
  const isMobile = useMediaQuery('(max-width: 600px)');
  const [copied, setCopied] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  
  const { sendSurveyByEmail, sendSurveyBySMS, isSendingEmail, isSendingSMS } = useSurvey();
  const { showSuccess, showError } = useAlert();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(surveyLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleSendSurvey = () => {
    setShowSendDialog(true);
  };

  const handleSendDialogClose = () => {
    setShowSendDialog(false);
  };

  const handleSendViaEmail = async (email) => {
    try {
      const result = await sendSurveyByEmail(surveyId, email);
      if (result.success) {
        showSuccess(result.message || 'Survey sent successfully via email!');
        setShowSendDialog(false);
      }
    } catch (error) {
      showError(error.message || 'Failed to send survey via email');
    }
  };

  const handleSendViaSMS = async (phone) => {
    try {
      const result = await sendSurveyBySMS(surveyId, phone);
      if (result.success) {
        showSuccess(result.message || 'Survey sent successfully via SMS!');
        setShowSendDialog(false);
      }
    } catch (error) {
      showError(error.message || 'Failed to send survey via SMS');
    }
  };

  return (
    <>
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
              You have successfully launched a survey. Copy and share the link with the recipient or send it directly
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

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant="outlined"
                onClick={handleSendSurvey}
                sx={{
                  textTransform: 'none',
                  color: '#1E1E1E',
                  flex: 1,
                  height: '48px',
                  borderColor: '#F0F0F0',
                  borderRadius: '17px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 400,
                  fontSize: '14px',
                  '&:hover': {
                    borderColor: '#E0E0E0',
                    backgroundColor: '#F5F5F5',
                  },
                }}
              >
                Send Survey
              </Button>

              <Button
                variant="contained"
                onClick={onConfirm}
                sx={{
                  textTransform: 'none',
                  color: '#fff',
                  flex: 1,
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
                Continue
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Send Survey Dialog */}
      <SendSurveyDialog
        open={showSendDialog}
        onClose={handleSendDialogClose}
        onConfirmEmail={handleSendViaEmail}
        onConfirmPhone={handleSendViaSMS}
        surveyId={surveyId}
        isSendingEmail={isSendingEmail}
        isSendingPhone={isSendingSMS}
      />
    </>
  );
};

export default ShareSurveyLinkModal;