import { TableRow, TableCell, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import DeleteIcon from '../../../assets/DeleteRow.svg';
import CloneIcon from '../../../assets/Clone.svg';
import LaunchSurvey from '../../../assets/LaunchSurvey.svg';
import PublishIcon from '@mui/icons-material/PublishOutlined';
import UnpublishedIcon from '@mui/icons-material/UnpublishedOutlined';

const TemplateTableRow = ({ 
  template, 
  onTemplateClick, 
  onDeleteClick, 
  onCloneClick, 
  onLaunchSurveyClick,
  onStatusToggle,
}) => {
  const isPublished = template.status === "Published";

  return (
    <TableRow
      key={template.id}
      hover
      onClick={() => onTemplateClick(template)}
      sx={{
        height: "48px",
        "& td": {
          height: "48px",
          minHeight: "48px",
          maxHeight: "48px",
          paddingTop: "8px",
          paddingBottom: "8px",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "14px",
          lineHeight: "100%",
          color: "#4B4B4B",
          cursor: 'pointer',
          borderBottom: "1px solid #F0F0F0",
        },
      }}
    >
      <TableCell>{template.id}</TableCell>
      <TableCell>
        <Typography
          sx={{
            cursor: 'pointer',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 400,
            fontSize: '14px',
          }}  
        >
          {template.name}
        </Typography>
      </TableCell>
      <TableCell>{template.formattedDate}</TableCell>
      <TableCell>
        <Chip
          label={template.status}
          sx={{
            backgroundColor: isPublished ? "#E4FFEA" : "#F3F3FF",
            color: isPublished ? "#00A857" : "#550FEC",
            fontWeight: 500,
            fontFamily: "Poppins, sans-serif",
            borderRadius: "6px",
            fontSize: "13px",
            height: "30px",
          }}
        />
      </TableCell>
      <TableCell align="right">
        {isPublished && (
          <IconButton
            variant="outlined"
            sx={{
              mr: 1,
              width: "162px",
              borderRadius: "15px",
              height: "40px",
            }}
            onClick={(e) => onLaunchSurveyClick(e, template)}
          >
            <img src={LaunchSurvey} alt="Launch Survey" />
          </IconButton>
        )}
        {isPublished && (
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
        )}
        {onStatusToggle && (
          <Tooltip title={isPublished ? "Unpublish (make Draft)" : "Publish"}>
            <IconButton
              onClick={(e) => { e.stopPropagation(); onStatusToggle(e, template); }}
              sx={{
                borderRadius: "10px",
                border: '1px solid #E0E0E0',
                width: "36px",
                height: "36px",
                mr: 1,
                '&:hover': {
                  backgroundColor: isPublished ? '#FFF8E1' : '#E8F5E9',
                  borderColor: isPublished ? '#F57C00' : '#00A857',
                },
              }}
            >
              {isPublished
                ? <UnpublishedIcon sx={{ fontSize: 18, color: '#F57C00' }} />
                : <PublishIcon sx={{ fontSize: 18, color: '#00A857' }} />
              }
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete">
          <IconButton
            variant="outlined"
            onClick={(e) => onDeleteClick(e, template)}
            sx={{
              borderRadius: "10px",
              border: '1px solid #E0E0E0',
              width: "36px",
              height: "36px",
              '&:hover': { backgroundColor: '#FFF0F0', borderColor: '#D32F2F' },
            }}
          >
            <img src={DeleteIcon} alt="Delete" style={{ width: 18, height: 18 }} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default TemplateTableRow;
