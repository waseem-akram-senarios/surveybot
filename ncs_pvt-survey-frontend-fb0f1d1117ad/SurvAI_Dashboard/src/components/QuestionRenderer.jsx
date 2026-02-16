import {
  Box,
  Typography,
  IconButton,
  Chip,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  useMediaQuery,
  Switch,
} from "@mui/material";
import Write from "../assets/Write.svg";
import Delete from "../assets/Delete.svg";

const QuestionRenderer = ({
  question,
  onEdit,
  onDelete,
  onUpdateSelection,
  onAutofillToggle,
  hideDelete = false,
  hideEdit = false,
  readOnly = false,
  showAutofillToggle = false,
  hideChildQuestions = false,
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");

  const renderAutofillToggle = () => {
    // Only show if both showAutofillToggle is true AND onAutofillToggle function is provided
    if (!showAutofillToggle && !(readOnly && question.autofill)) return null;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2,
        }}
      >
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            color: question.autofill === "Yes" ? "#1958F7" : "#7D7D7D",
          }}
        >
          {question.autofill === "Yes" ? "AI Selected" : "Manual"}
        </Typography>
        <Switch
          checked={question.autofill === "Yes"}
          onChange={readOnly ? undefined : (e) => onAutofillToggle(question.id, e.target.checked ? "Yes" : "No")}
          disabled={readOnly}
          size="small"
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": {
              color: "#1958F7",
            },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
              backgroundColor: "#1958F7",
            },
          }}
        />
      </Box>
    );
  };

  if (question.type === "category") {
    const optionsToShow = question.selectedOption 
      ? question.options.includes(question.selectedOption)
        ? question.options.filter(option => option === question.selectedOption)
        : [question.selectedOption] 
      : question.options;

    return (
      <Box
        key={question.id}
        sx={{
          mt: 3,
          mb: 3,
          border: "none",
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            mb: 1,
            gap: isMobile ? 1.5 : 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: isMobile ? "14px" : "16px",
              lineHeight: "100%",
              color: "#4B4B4B",
              mb: 1.5,
            }}
          >
            {question.question}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {!hideEdit && (
              <IconButton
                sx={{
                  borderRadius: "15px",
                  width: isMobile ? "40px" : "52px",
                  height: isMobile ? "40px" : "52px",
                  marginRight: isMobile ? "10px" : "0px",
                }}
                onClick={() => onEdit(question)}
              >
                <img
                  src={Write}
                  alt="edit"
                />
              </IconButton>
            )}
            {!hideDelete && (
              <IconButton
                sx={{
                  borderRadius: "15px",
                  width: isMobile ? "40px" : "52px",
                  height: isMobile ? "40px" : "52px",
                }}
                onClick={() => onDelete(question.id)}
              >
                <img
                  src={Delete}
                  alt="delete"
                />
              </IconButton>
            )}
          </Box>
        </Box>

        {renderAutofillToggle()}

        <FormControl component="fieldset">
          <RadioGroup
            value={question.selectedOption}
            // Disable selection for regular category questions
            onChange={undefined}
            sx={{ gap: 1 }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 2,
              }}
            >
              {optionsToShow.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio sx={{ display: "none" }} />}
                  label={
                    <Chip
                      label={option}
                      variant={
                        question.selectedOption === option
                          ? "filled"
                          : "outlined"
                      }
                      sx={{
                        backgroundColor:
                          question.selectedOption === option
                            ? "#e3f2fd"
                            : "#F4F4F4",
                        color:
                          question.selectedOption === option
                            ? "#1976d2"
                            : "#4B4B4B",
                        // Remove hover effects for non-clickable items
                        "&:hover": {},
                        borderRadius: "12px",
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
                        border: "none",
                        cursor: "default", // Not clickable
                        width: isMobile ? "100%" : "186px",
                        height: "37px",
                        justifyContent: "center",
                        opacity: 0.7, // Slightly dimmed to show it's not interactive
                      }}
                      // No onClick handler - not clickable
                    />
                  }
                  sx={{ m: 0 }}
                />
              ))}
            </Box>
          </RadioGroup>
        </FormControl>
      </Box>
    );
  }

if (question.type === "rating") {
  const maxRange = question.maxRange || 5;
  
  const ratingNumbers = Array.from(
    { length: maxRange },
    (_, index) => index + 1
  );

  return (
    <Box
      key={question.id}
      sx={{
        mt: 4,
        mb: 3,
        borderRadius: 2,
        pb: 1,
        borderBottom: "1px solid #F0F0F0",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          mb: 3,
          gap: isMobile ? 1.5 : 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: isMobile ? "14px" : "16px",
            lineHeight: "100%",
            color: "#4B4B4B",
            mb: 1.5,
          }}
        >
          {question.question}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {!hideEdit && (
            <IconButton
              sx={{
                borderRadius: "15px",
                width: isMobile ? "40px" : "52px",
                height: isMobile ? "40px" : "52px",
                marginRight: isMobile ? "10px" : "0px",
              }}
              onClick={() => onEdit(question)}
            >
              <img
                src={Write}
                alt="edit"
              />
            </IconButton>
          )}
          {!hideDelete && (
            <IconButton
              sx={{
                borderRadius: "15px",
                width: isMobile ? "40px" : "52px",
                height: isMobile ? "40px" : "52px",
              }}
              onClick={() => onDelete(question.id)}
            >
              <img
                src={Delete}
                alt="delete"
              />
            </IconButton>
            )}
        </Box>
      </Box>

      {renderAutofillToggle()}

      <Box
        sx={{
          display: "flex",
          justifyContent: isMobile ? "flex-start" : "space-between",
          flexWrap: isMobile ? "wrap" : "nowrap",
          gap: isMobile ? 1 : 2,
          mb: 2,
        }}
      >
        {ratingNumbers.map((value) => (
          <IconButton
            key={value}
            onClick={undefined}
            sx={{
              width: isMobile ? "40px" : "52px",
              height: isMobile ? "40px" : "52px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              borderRadius: "15px",
              backgroundColor: question.rating ? (question.rating == value ? "#1958F7" : "#F8F8F8") : "#F8F8F8",
              color: question.rating ? (question.rating == value ? "#fff" : "#4B4B4B") : "#4B4B4B",
              // Remove hover effects
              "&:hover": {
                backgroundColor: question.rating ? (question.rating == value ? "#1958F7" : "#F8F8F8") : "#F8F8F8",
                color: question.rating ? (question.rating == value ? "#fff" : "#4B4B4B") : "#4B4B4B",
              },
              cursor: "default", // Not clickable
              // opacity: 0.7, // Slightly dimmed to show it's not interactive
            }}
          >
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                color: "inherit",
              }}
            >
              {value}
            </Typography>
          </IconButton>
        ))}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            color: "#C4C4C4",
          }}
        >
          Rating: 1 to {maxRange}
        </Typography>
      </Box>
    </Box>
  );
}

  
  // Add handling for open questions
  if (question.type === "open") {
    return (
      <Box
        key={question.id}
        sx={{
          mt: 3,
          mb: 3,
          border: "none",
          borderRadius: 2,
          pb: 2,
          borderBottom: "1px solid #F0F0F0",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            mb: 2,
            gap: isMobile ? 1.5 : 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: isMobile ? "14px" : "16px",
              lineHeight: "100%",
              color: "#4B4B4B",
              mb: 1.5,
            }}
          >
            {question.question}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {!hideEdit && (
              <IconButton
                sx={{
                  borderRadius: "15px",
                  width: isMobile ? "40px" : "52px",
                  height: isMobile ? "40px" : "52px",
                  marginRight: isMobile ? "10px" : "0px",
                }}
                onClick={() => onEdit(question)}
              >
                <img
                  src={Write}
                  alt="edit"
                />
              </IconButton>
            )}
            {!hideDelete && (
              <IconButton
                sx={{
                  borderRadius: "15px",
                  width: isMobile ? "40px" : "52px",
                  height: isMobile ? "40px" : "52px",
                }}
                onClick={() => onDelete(question.id)}
              >
                <img
                  src={Delete}
                  alt="delete"
                />
              </IconButton>
            )}
          </Box>
        </Box>

        {renderAutofillToggle()}

        <TextField
          fullWidth
          multiline
          rows={4}
          value={question.answer || question.raw_answer || ""}
          placeholder="Enter answer"
          // Disable text input for open questions - they're display only
          onChange={undefined}
          // disabled={true} // Make it disabled to show it's not interactive
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#f5f5f5", // Disabled background
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "150%",
                color: "#000",
              },
              opacity: 1, // Slightly dimmed
            },
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "12px",
              color: "#C4C4C4",
            }}
          >
            Open-ended question
          </Typography>
        </Box>
      </Box>
    );
  }

  // Handle flow questions - ONLY flow parent questions should allow option clicking
  if (question.type === "flow") {
    const effectiveSelectedOption = question.selectedOption || 
      question.parentOptions?.find(option => 
        question.childQuestions?.[option] && 
        question.childQuestions[option].length > 0
      );

    const optionsToShow = question.selectedOption 
      ? [question.selectedOption]
      : question.parentOptions || [];
    
    return (
      <Box key={question.id}>
        {/* Parent Question - ONLY these options should be clickable */}
        <Box
          sx={{
            mt: 3,
            mb: 3,
            border: "none",
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "center",
              mb: 1,
              gap: isMobile ? 1.5 : 0,
            }}
          >
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: isMobile ? "14px" : "16px",
                lineHeight: "100%",
                color: "#4B4B4B",
                mb: 1.5,
              }}
            >
              {question.question}
            </Typography>
            
            <Box sx={{ display: "flex", gap: 1 }}>
              {!hideEdit && onEdit && (
                <IconButton
                  sx={{
                    borderRadius: "15px",
                    width: isMobile ? "40px" : "52px",
                    height: isMobile ? "40px" : "52px",
                    marginRight: isMobile ? "10px" : "0px",
                  }}
                  onClick={() => onEdit(question)}
                >
                  <img src={Write} alt="edit" />
                </IconButton>
              )}
              {!hideDelete && onDelete && (
                <IconButton
                  sx={{
                    borderRadius: "15px",
                    width: isMobile ? "40px" : "52px",
                    height: isMobile ? "40px" : "52px",
                  }}
                  onClick={() => onDelete(question.id)}
                >
                  <img src={Delete} alt="delete" />
                </IconButton>
              )}
            </Box>
          </Box>

          {renderAutofillToggle()}

          {/* Parent Options - These should be clickable even in view mode for flow questions */}
          <FormControl component="fieldset">
            <RadioGroup
              value={effectiveSelectedOption || ""}
              // onChange={(e) => onUpdateSelection && onUpdateSelection(question.id, e.target.value)}
              sx={{ gap: 1 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 2,
                }}
              >
                {optionsToShow.map((option) => (
                  <FormControlLabel
                    key={option}
                    value={option}
                    control={<Radio sx={{ display: "none" }} />}
                    label={
                      <Chip
                        label={option}
                        variant={
                          effectiveSelectedOption === option
                            ? "filled"
                            : "outlined"
                        }
                        sx={{
                          backgroundColor:
                            effectiveSelectedOption === option
                              ? "#e3f2fd"
                              : "#F4F4F4",
                          color:
                            effectiveSelectedOption === option
                              ? "#1976d2"
                              : "#4B4B4B",
                          "&:hover": readOnly ? {} : {
                            backgroundColor: "#f5f5f5",
                          },
                          borderRadius: "12px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: 400,
                          fontSize: "14px",
                          border: "none",
                          cursor: readOnly ? "default" : "pointer",
                          width: isMobile ? "100%" : "186px",
                          height: "37px",
                          justifyContent: "center",
                        }}
                        onClick={() => !readOnly && onUpdateSelection && onUpdateSelection(question.id, option)}
                      />
                    }
                    sx={{ m: 0 }}
                  />
                ))}
              </Box>
            </RadioGroup>
          </FormControl>
        </Box>

        {/* Child Questions - Only render if hideChildQuestions is false */}
        {!hideChildQuestions && effectiveSelectedOption && question.childQuestions?.[effectiveSelectedOption] && (
          <Box
            sx={{
              mt: 2,
              mb: 3,
              backgroundColor: "#FAFAFA",
              borderRadius: "15px",
              p: 3,
              border: "1px solid #F0F0F0",
            }}
          >
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "14px",
                color: "#666",
                mb: 2,
              }}
            >
              Questions for "{effectiveSelectedOption}":
            </Typography>
            
            {question.childQuestions[effectiveSelectedOption].map((childQuestion, index) => (
              <Box key={`${childQuestion.id}-${index}`} sx={{ mb: 2, "&:last-child": { mb: 0 } }}>
                <QuestionRenderer
                  question={childQuestion}
                  onEdit={null}
                  onDelete={null}
                  onUpdateRating={null}
                  onUpdateSelection={null}
                  onUpdateAnswer={null}
                  onAutofillToggle={onAutofillToggle}
                  hideDelete={true}
                  hideEdit={true}
                  readOnly={true}
                  showAutofillToggle={showAutofillToggle}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return null;
};

export default QuestionRenderer;
