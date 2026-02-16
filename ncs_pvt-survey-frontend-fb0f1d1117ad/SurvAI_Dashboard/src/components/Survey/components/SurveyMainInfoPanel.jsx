import { Box, Typography, Button, useMediaQuery, Chip } from "@mui/material";
import SurveyInfoField from "./SurveyInfoField";
import { getStatusStyle } from "../../../utils/Surveys/surveyHelpers";

const SurveyMainInfoPanel = ({ 
  surveyInfo, 
  isCompleted, 
  isDeleting, 
  onBack, 
  onDeleteSurvey,
  onSendSurvey
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");
  console.log("Survey Info:", surveyInfo);

  // Format call ended date
  const formatCallEndedAt = (endedAt) => {
    if (!endedAt) return null;
    try {
      const date = new Date(endedAt);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return endedAt;
    }
  };

  // Format call ended reason for display
  const formatCallEndedReason = (reason) => {
    if (!reason) return null;
    // Convert "assistant-ended-call" to "Assistant Ended Call"
    return reason
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Check if call info exists
  const hasCallInfo = surveyInfo.callTime || surveyInfo.callNumber || 
                      surveyInfo.callStatus || surveyInfo.callEndedAt;

  return (
    <Box
      sx={{
        width: isMobile ? "100%" : "30%",
        backgroundColor: "#fff",
        borderRadius: "20px",
        p: isMobile ? 2 : 4,
        boxShadow: "0px 4px 20px 0px #0000000D",
        overflowY: "auto",
        maxHeight: "100%",
      }}
    >
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 500,
          fontSize: "18px",
          lineHeight: "100%",
          color: "#1E1E1E",
          mb: 3,
        }}
      >
        Main Information
      </Typography>

      {/* Survey ID */}
      <SurveyInfoField
        label="Response ID"
        value={surveyInfo.surveyId}
      />

      {/* Template Name */}
      <SurveyInfoField
        label="Survey Name"
        value={surveyInfo.templateName}
      />

      {/* Status with custom styling */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "14px",
              color: "#9E9E9E",
              mr: 1,
            }}
          >
            📋
          </Typography>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "14px",
              color: "#9E9E9E",
            }}
          >
            Status
          </Typography>
        </Box>
        <Chip
          label={surveyInfo.status}
          sx={{
            ...getStatusStyle(surveyInfo.status),
            fontFamily: "Poppins, sans-serif",
            fontSize: "12px",
            fontWeight: 500,
            height: "28px",
            borderRadius: "8px",
            '& .MuiChip-label': {
              padding: '0 8px',
            },
          }}
        />
      </Box>

      {/* Recipient Name */}
      <SurveyInfoField
        label="Recipient Name"
        value={surveyInfo.recipientName}
      />

      {/* Driver Name */}
      {surveyInfo.riderName && (
        <SurveyInfoField
          label="Driver Name"
          value={surveyInfo.riderName}
        />
      )}

      {/* Trip ID */}
      {surveyInfo.rideId && (
        <SurveyInfoField
          label="Trip ID"
          value={surveyInfo.rideId}
        />
      )}

      {/* Affiliate ID */}
      {surveyInfo.tenantId && (
        <SurveyInfoField
          label="Affiliate ID"
          value={surveyInfo.tenantId}
        />
      )}

      {/* Age */}
      {surveyInfo.age && (
        <SurveyInfoField
          label="Age"
          value={surveyInfo.age.toString()}
        />
      )}

      {/* Number of Trips */}
      {surveyInfo.numOfTrips !== undefined && surveyInfo.numOfTrips !== null && (
        <SurveyInfoField
          label="Number of Trips"
          value={surveyInfo.numOfTrips.toString()}
        />
      )}

      {/* Gender with radio button display */}
      {surveyInfo.gender && (
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "14px",
              color: "#9E9E9E",
              mb: 1,
            }}
          >
            Gender
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: surveyInfo.gender === "Male" ? "#1958F7" : "#E0E0E0",
                  backgroundColor: surveyInfo.gender === "Male" ? "#1958F7" : "transparent",
                  position: "relative",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: surveyInfo.gender === "Male" ? "#fff" : "transparent",
                  },
                }}
              />
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "12px",
                  color: "#1E1E1E",
                }}
              >
                Male
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: surveyInfo.gender === "Female" ? "#1958F7" : "#E0E0E0",
                  backgroundColor: surveyInfo.gender === "Female" ? "#1958F7" : "transparent",
                  position: "relative",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: surveyInfo.gender === "Female" ? "#fff" : "transparent",
                  },
                }}
              />
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "12px",
                  color: "#1E1E1E",
                }}
              >
                Female
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: surveyInfo.gender === "Other" ? "#1958F7" : "#E0E0E0",
                  backgroundColor: surveyInfo.gender === "Other" ? "#1958F7" : "transparent",
                  position: "relative",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: surveyInfo.gender === "Other" ? "#fff" : "transparent",
                  },
                }}
              />
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "12px",
                  color: "#1E1E1E",
                }}
              >
                Other
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Accessibility Requirements with radio button display */}
      {surveyInfo.accessibility && (
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "14px",
              color: "#9E9E9E",
              mb: 1,
            }}
          >
            Accessibility Requirements
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: surveyInfo.accessibility === "Wheelchair" ? "#1958F7" : "#E0E0E0",
                  backgroundColor: surveyInfo.accessibility === "Wheelchair" ? "#1958F7" : "transparent",
                  position: "relative",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: surveyInfo.accessibility === "Wheelchair" ? "#fff" : "transparent",
                  },
                }}
              />
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "12px",
                  color: "#1E1E1E",
                }}
              >
                Wheelchair
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: surveyInfo.accessibility === "Other" ? "#1958F7" : "#E0E0E0",
                  backgroundColor: surveyInfo.accessibility === "Other" ? "#1958F7" : "transparent",
                  position: "relative",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: surveyInfo.accessibility === "Other" ? "#fff" : "transparent",
                  },
                }}
              />
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "12px",
                  color: "#1E1E1E",
                }}
              >
                Other
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Call Information Section */}
      {hasCallInfo && (
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 500,
              fontSize: "14px",
              lineHeight: "100%",
              color: "#1E1E1E",
              mb: 2,
            }}
          >
            Call Information
          </Typography>

          {/* Call Time */}
          {surveyInfo.callTime && (
            <SurveyInfoField
              label="Call Time"
              value={surveyInfo.callTime}
            />
          )}

          {/* Call Number */}
          {surveyInfo.callNumber && (
            <SurveyInfoField
              label="Call Number"
              value={surveyInfo.callNumber}
            />
          )}

          {/* Call Status */}
          {surveyInfo.callStatus && (
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography
                  sx={{
                    fontFamily: "Poppins, sans-serif",
                    fontSize: "14px",
                    color: "#9E9E9E",
                    mr: 1,
                  }}
                >
                  📞
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "Poppins, sans-serif",
                    fontSize: "14px",
                    color: "#9E9E9E",
                  }}
                >
                  Call Status
                </Typography>
              </Box>
              <Chip
                label={surveyInfo.callStatus}
                sx={{
                  backgroundColor: surveyInfo.callStatus === 'ended' ? '#E8F5E9' : '#FFF3E0',
                  color: surveyInfo.callStatus === 'ended' ? '#2E7D32' : '#EF6C00',
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "12px",
                  fontWeight: 500,
                  height: "28px",
                  borderRadius: "8px",
                  textTransform: 'capitalize',
                  '& .MuiChip-label': {
                    padding: '0 8px',
                  },
                }}
              />
            </Box>
          )}

          {/* Call Duration */}
          {surveyInfo.callDuration && (
            <SurveyInfoField
              label="Call Duration"
              value={surveyInfo.callDuration}
            />
          )}

          {/* Call Ended At */}
          {surveyInfo.callEndedAt && (
            <SurveyInfoField
              label="Call Ended At"
              value={formatCallEndedAt(surveyInfo.callEndedAt)}
            />
          )}

          {/* Call Ended Reason */}
          {surveyInfo.callEndedReason && (
            <SurveyInfoField
              label="Call Ended Reason"
              value={formatCallEndedReason(surveyInfo.callEndedReason)}
            />
          )}
        </Box>
      )}

      {/* Recipient Biodata */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1,
          }}
        >
          Recipient Biodata
        </Typography>
        <Box
          sx={{
            p: 2,
            backgroundColor: "#F8F9FA",
            borderRadius: "10px",
            border: "1px solid #E9ECEF",
          }}
        >
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "12px",
              lineHeight: "140%",
              color: "#6C757D",
            }}
          >
            {surveyInfo.recipientBiodata}
          </Typography>
        </Box>
      </Box>

      {/* Timeline */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 2,
          }}
        >
          Timeline
        </Typography>

        {/* Creation Date */}
        <SurveyInfoField
          label="Creation Date"
          value={surveyInfo.launchDate || "Not available"}
        />

        {/* Completion Date */}
        <SurveyInfoField
          label="Completion Date"
          value={surveyInfo.completionDate || "-"}
        />
      </Box>

      {/* Send Survey Button */}
      {!isCompleted && <Box sx={{ mb: 1 }}>
        <Button
          variant="outlined"
          onClick={() => onSendSurvey && onSendSurvey(surveyInfo)}
          fullWidth
          sx={{
            textTransform: "none",
            fontFamily: "Poppins",
            fontWeight: 400,
            fontSize: "14px",
            textAlign: "center",
            color: "#1958F7",
            backgroundColor: "#EFEFFD",
            border: "1px solid #F0F0F0",
            borderRadius: "15px",
            pt: "13px",
            pr: "16px",
            pb: "13px",
            pl: "16px",
            height: "45px",
            "&:hover": {
              backgroundColor: "#EFEFFD",
              borderColor: "#F0F0F0",
            },
          }}
        >
          Send Survey
        </Button>
      </Box>}

      {/* Bottom Buttons */}
      <Box
        sx={{ 
          display: "flex", 
          justifyContent: isCompleted ? "stretch" : "space-between", 
          gap: 2 
        }}
      >
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={isDeleting}
          sx={{
            textTransform: "none",
            color: "#1E1E1E",
            flex: 1,
            height: "40px",
            borderColor: "#F0F0F0",
            borderRadius: "15px",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            "&:hover": {
              borderColor: "#E0E0E0",
              backgroundColor: "#F5F5F5",
            },
          }}
        >
          Back
        </Button>

        {/* Only show delete button if not completed */}
        {!isCompleted && (
          <Button
            variant="outlined"
            onClick={onDeleteSurvey}
            disabled={isDeleting}
            sx={{
              textTransform: "none",
              color: "#000",
              flex: 1,
              height: "40px",
              borderColor: "#F0F0F0",
              borderRadius: "15px",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              "&:hover": {},
            }}
          >
            {isDeleting ? "Deleting..." : "Delete Survey"}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default SurveyMainInfoPanel;