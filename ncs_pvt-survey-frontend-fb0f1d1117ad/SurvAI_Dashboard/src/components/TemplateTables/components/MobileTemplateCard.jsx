import { Paper, Box, Typography, Chip, IconButton } from "@mui/material";
import DeleteIcon from '../../../assets/DeleteRow.svg';
import CloneIcon from '../../../assets/Clone.svg';
import LaunchSurvey from '../../../assets/LaunchSurvey.svg';

const MobileTemplateCard = ({ 
  template, 
  onTemplateClick, 
  onDeleteClick, 
  onCloneClick, 
  onLaunchSurveyClick 
}) => {
  return (
    <Paper
      key={template.id}
      onClick={() => onTemplateClick(template)}
      sx={{
        mb: 2,
        p: 2,
        borderRadius: "12px",
        boxShadow: "0px 1px 4px rgba(0,0,0,0.1)",
        cursor: 'pointer'
      }}
    >
      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
      >
        <Box>
          <Typography 
            sx={{ 
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {template.name}
          </Typography>
          <Chip
            label={template.status}
            sx={{
              mt: 0.5,
              backgroundColor:
                template.status === "Published" ? "#E4FFEA" : "#F3F3FF",
              color:
                template.status === "Published" ? "#00A857" : "#550FEC",
              fontWeight: 500,
              fontFamily: 'Poppins, sans-serif',
              borderRadius: "6px",
              fontSize: "13px",
              height: "22px",
            }}
          />
        </Box>
        <Typography sx={{ fontSize: "14px", fontWeight: 500 }}>
          {template.id}
        </Typography>
      </Box>

      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
      >
        <Typography sx={{ color: "#64748B", fontSize: "13px", mb: 1 }}>
          Launch Date
        </Typography>
        <Typography sx={{ fontSize: "13px" }}>
          {template.formattedDate}
        </Typography>
      </Box>

      {template.status === "Published" && (
        <IconButton
          fullWidth
          variant="outlined"
          sx={{
            mb: 1,
            width: "162px",
            borderRadius: "15px",
            height: "40px",
          }}
          onClick={(e) => onLaunchSurveyClick(e, template)}
        >
          <img src={LaunchSurvey} alt="Launch Survey" />
        </IconButton>
      )}

      <Box sx={{ display: "flex", justifyContent: "start" }}>
        <IconButton
          variant="outlined"
          onClick={(e) => onCloneClick(e, template)}
          sx={{
            borderRadius: "15px",
            width: "100px",
            height: "40px",
            mr: 1,
          }}
        >
          <img src={CloneIcon} alt="Clone" />
        </IconButton>
        {template.status !== "Published" && (
          <IconButton
            variant="outlined"
            onClick={(e) => onDeleteClick(e, template)}
            sx={{
              borderRadius: "15px",
              width: "100px",
              height: "40px",
            }}
          >
            <img src={DeleteIcon} alt="Delete" />
          </IconButton>
        )}
      </Box>
    </Paper>
  );
};

export default MobileTemplateCard;
