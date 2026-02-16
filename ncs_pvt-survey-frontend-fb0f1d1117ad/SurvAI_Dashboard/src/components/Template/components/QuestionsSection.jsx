import { Box, Typography, Button, useMediaQuery } from "@mui/material";
import RatingIcon from "../../../assets/Rating.svg";
import CategoryIcon from "../../../assets/Category.svg";
import OpenIcon from "../../../assets/Category.svg";
import QuestionRenderer from "../../QuestionRenderer";

const QuestionsSection = ({
  currentStep,
  viewMode,
  editMode,
  questions,
  unsavedQuestions,
  editedQuestions,
  onEditQuestion,
  onDeleteQuestion,
  onUpdateRating,
  onUpdateSelection,
  onUpdateAnswer,
  onUpdateAutofill,
  onAddRatingQuestion,
  onAddCategoryQuestion,
  onAddOpenQuestion,
  onAddFlowQuestion,
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");

  const getSectionTitle = () => {
    if (viewMode) return "Added Questions";
    if (editMode) return "Template Questions";
    return "Add questions to the template";
  };

  if (currentStep !== 2) return null;

  return (
    <>
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 500,
          fontSize: "18px",
          lineHeight: "100%",
          color: "#4B4B4B",
          mb: 2,
        }}
      >
        {getSectionTitle()}
      </Typography>

      {/* Questions count */}
      {(editMode || viewMode) && questions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "100%",
              color: "#7D7D7D",
            }}
          >
            {questions.length} question{questions.length !== 1 ? 's' : ''} found
          </Typography>
          {!viewMode && (unsavedQuestions.length > 0 || editedQuestions.size > 0) && (
            <Box>
              {unsavedQuestions.length > 0 && (
                <Typography
                  sx={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 400,
                    fontSize: "12px",
                    lineHeight: "100%",
                    color: "#FF9500",
                    mt: 0.5,
                  }}
                >
                  {unsavedQuestions.length} new question{unsavedQuestions.length !== 1 ? 's' : ''} to save
                </Typography>
              )}
              {editedQuestions.size > 0 && (
                <Typography
                  sx={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 400,
                    fontSize: "12px",
                    lineHeight: "100%",
                    color: "#1958F7",
                    mt: 0.5,
                  }}
                >
                  {editedQuestions.size} question{editedQuestions.size !== 1 ? 's' : ''} modified
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Render questions */}
      {questions.map((question) => {
        return (
          <QuestionRenderer
            key={question.id}
            question={question}
            onEdit={(q) => onEditQuestion(q, question.type)}
            onDelete={onDeleteQuestion}
            onUpdateRating={onUpdateRating}
            onUpdateSelection={onUpdateSelection}
            onUpdateAnswer={onUpdateAnswer}
            onAutofillToggle={onUpdateAutofill}
            readOnly={viewMode}
            hideEdit={viewMode}
            hideDelete={viewMode}
            showAutofillToggle={!viewMode}
            hideChildQuestions={false}
          />
        );
      })}

      {/* Add Question Buttons - hide in view mode */}
      {!viewMode && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 4,
            flexDirection: isMobile ? "column" : "row",
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            onClick={onAddRatingQuestion}
            sx={{
              textTransform: "none",
              borderColor: "#F0F0F0",
              width: "200px",
              height: "40px",
              borderRadius: "15px",
              "&:hover": {
                borderColor: "#F0F0F0",
              },
            }}
          >
            <img src={RatingIcon} alt="rating" style={{ marginRight: "10px" }} />
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
              }}
            >
              Add Rating Question
            </Typography>
          </Button>

          <Button
            variant="outlined"
            onClick={onAddCategoryQuestion}
            sx={{
              textTransform: "none",
              borderColor: "#F0F0F0",
              width: "270px",
              height: "40px",
              borderRadius: "15px",
              "&:hover": {
                borderColor: "#F0F0F0",
              },
            }}
          >
            <img src={CategoryIcon} alt="category" style={{ marginRight: "10px" }} />
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
              }}
            >
              Add Multiple Choice Question
            </Typography>
          </Button>

          <Button
            variant="outlined"
            onClick={onAddOpenQuestion}
            sx={{
              textTransform: "none",
              borderColor: "#F0F0F0",
              width: "250px",
              height: "40px",
              borderRadius: "15px",
              "&:hover": {
                borderColor: "#F0F0F0",
              },
            }}
          >
            <img src={OpenIcon} alt="open" style={{ marginRight: "10px" }} />
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
              }}
            >
              Add Open-Ended Question
            </Typography>
          </Button>

          <Button
            variant="outlined"
            onClick={onAddFlowQuestion}
            sx={{
              textTransform: "none",
              borderColor: "#F0F0F0",
              width: "260px",
              height: "40px",
              borderRadius: "15px",
              "&:hover": {
                borderColor: "#F0F0F0",
              },
            }}
          >
            <img src={CategoryIcon} alt="flow" style={{ marginRight: "10px" }} />
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
              }}
            >
              Add Flow Followup Question
            </Typography>
          </Button>
        </Box>
      )}
    </>
  );
};

export default QuestionsSection;