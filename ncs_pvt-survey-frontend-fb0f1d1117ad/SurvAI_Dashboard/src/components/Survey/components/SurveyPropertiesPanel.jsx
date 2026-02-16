import {
  Box,
  Typography,
  TextField,
  Button,
  useMediaQuery,
  Select,
  MenuItem,
  FormControl,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import Save from "../../../assets/Save.svg";

const SurveyPropertiesPanel = ({
  selectedTemplate,
  setSelectedTemplate,
  recipientName,
  setRecipientName,
  riderName,
  setRiderName,
  rideId,
  setRideId,
  tenantId,
  setTenantId,
  age,
  setAge,
  gender,
  setGender,
  numOfTrips,
  setNumOfTrips,
  accessibility,
  setAccessibility,
  recipientBiodata,
  setRecipientBiodata,
  availableTemplates,
  isLoadingTemplates,
  onLaunchSurvey,
  onRegenerate,
  onBack,
  isLaunching,
  isGenerating,
}) => {
  const isMobile = useMediaQuery("(max-width: 600px)");

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
        Survey Properties
      </Typography>

      {/* Select Template */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1,
          }}
        >
          Select Template
        </Typography>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "100%",
            color: "#7D7D7D",
            mb: 1.5,
          }}
        >
          This template will serve as the base for this survey
        </Typography>

        <FormControl fullWidth size="small">
          <Select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            disabled={isLoadingTemplates}
            sx={{
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiSelect-select": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
                padding: "10px 14px",
              },
            }}
          >
            <MenuItem value="" disabled>
              <Typography
                sx={{ color: "#7D7D7D", fontFamily: "Poppins, sans-serif" }}
              >
                {isLoadingTemplates
                  ? "Loading templates..."
                  : "Select a template"}
              </Typography>
            </MenuItem>
            {availableTemplates.map((template) => (
              <MenuItem
                key={template}
                value={template}
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "14px",
                }}
              >
                {template}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Recipient Name */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1.5,
          }}
        >
          Recipient Name
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Enter recipient name"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
                "&::placeholder": {
                  color: "#7D7D7D",
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>

      {/* Driver Name */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1.5,
          }}
        >
          Driver Name
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={riderName}
          onChange={(e) => setRiderName(e.target.value)}
          placeholder="Enter driver name"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
                "&::placeholder": {
                  color: "#7D7D7D",
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>

      {/* Trip ID */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1.5,
          }}
        >
          Trip ID
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={rideId}
          onChange={(e) => setRideId(e.target.value)}
          placeholder="Enter trip ID"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
                "&::placeholder": {
                  color: "#7D7D7D",
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>

      {/* Affiliate ID */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1.5,
          }}
        >
          Affiliate ID
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          placeholder="Enter affiliate ID"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
                "&::placeholder": {
                  color: "#7D7D7D",
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>

      {/* Age */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1.5,
          }}
        >
          Age
        </Typography>
        <TextField
          fullWidth
          size="small"
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Enter age"
          variant="outlined"
          inputProps={{ min: 0, max: 150 }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
                "&::placeholder": {
                  color: "#7D7D7D",
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>

      {/* Number of Trips */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1.5,
          }}
        >
          Number of Trips
        </Typography>
        <TextField
          fullWidth
          size="small"
          type="number"
          value={numOfTrips}
          onChange={(e) => setNumOfTrips(e.target.value)}
          placeholder="Enter number of trips"
          variant="outlined"
          inputProps={{ min: 0 }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "100%",
                color: "#1E1E1E",
                "&::placeholder": {
                  color: "#7D7D7D",
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>

      {/* Gender Radio Buttons */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1.5,
          }}
        >
          Gender
        </Typography>
        <RadioGroup
          row
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          sx={{ gap: 2 }}
        >
          <FormControlLabel
            value="Male"
            control={
              <Radio
                sx={{
                  color: "#E0E0E0",
                  "&.Mui-checked": {
                    color: "#1958F7",
                  },
                  "& .MuiSvgIcon-root": {
                    fontSize: 18,
                  },
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  color: "#1E1E1E",
                  ml: 0.5,
                }}
              >
                Male
              </Typography>
            }
          />
          <FormControlLabel
            value="Female"
            control={
              <Radio
                sx={{
                  color: "#E0E0E0",
                  "&.Mui-checked": {
                    color: "#1958F7",
                  },
                  "& .MuiSvgIcon-root": {
                    fontSize: 18,
                  },
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  color: "#1E1E1E",
                  ml: 0.5,
                }}
              >
                Female
              </Typography>
            }
          />
          <FormControlLabel
            value="Other"
            control={
              <Radio
                sx={{
                  color: "#E0E0E0",
                  "&.Mui-checked": {
                    color: "#1958F7",
                  },
                  "& .MuiSvgIcon-root": {
                    fontSize: 18,
                  },
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  color: "#1E1E1E",
                  ml: 0.5,
                }}
              >
                Other
              </Typography>
            }
          />
        </RadioGroup>
      </Box>

      {/* Accessibility Requirements Radio Buttons */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1.5,
          }}
        >
          Accessibility Requirements
        </Typography>
        <RadioGroup
          row
          value={accessibility}
          onChange={(e) => setAccessibility(e.target.value)}
          sx={{ gap: 2 }}
        >
          <FormControlLabel
            value="Wheelchair"
            control={
              <Radio
                sx={{
                  color: "#E0E0E0",
                  "&.Mui-checked": {
                    color: "#1958F7",
                  },
                  "& .MuiSvgIcon-root": {
                    fontSize: 18,
                  },
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  color: "#1E1E1E",
                  ml: 0.5,
                }}
              >
                Wheelchair
              </Typography>
            }
          />
          <FormControlLabel
            value="Other"
            control={
              <Radio
                sx={{
                  color: "#E0E0E0",
                  "&.Mui-checked": {
                    color: "#1958F7",
                  },
                  "& .MuiSvgIcon-root": {
                    fontSize: 18,
                  },
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  color: "#1E1E1E",
                  ml: 0.5,
                }}
              >
                Other
              </Typography>
            }
          />
        </RadioGroup>
      </Box>

      {/* Recipient Biodata */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "100%",
            color: "#1E1E1E",
            mb: 1,
          }}
        >
          Recipient Biodata
        </Typography>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "16px",
            color: "#7D7D7D",
            mb: 1.5,
          }}
        >
          Describe the recipient that will receive this survey. Our AI will
          automatically select the relevant questions from the template to
          create the perfect survey for them
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          size="small"
          value={recipientBiodata}
          onChange={(e) => setRecipientBiodata(e.target.value)}
          placeholder="Enter recipient data"
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0px 4px 20px 0px #0000000D",
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "140%",
                color: "#1E1E1E",
                "&::placeholder": {
                  color: "#7D7D7D",
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>

      {/* Launch Survey Button */}
      <Button
        variant="contained"
        onClick={onLaunchSurvey}
        disabled={isLaunching || isGenerating}
        fullWidth
        sx={{
          textTransform: "none",
          color: "#fff",
          height: "48px",
          backgroundColor: isLaunching || isGenerating ? "#ccc" : "#1958F7",
          borderRadius: "17px",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: "14px",
          mb: 3,
          "&:hover": {
            backgroundColor: isLaunching || isGenerating ? "#ccc" : "#1443D1",
          },
        }}
      >
        {isLaunching ? "Launching..." : "Launch Survey"}
      </Button>

      {/* Bottom Buttons */}
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={isLaunching || isGenerating}
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

        <Button
          variant="outlined"
          onClick={onRegenerate}
          disabled={isLaunching || isGenerating}
          sx={{
            textTransform: "none",
            color: "#1E1E1E",
            flex: 1,
            height: "40px",
            borderColor: "#F0F0F0",
            borderRadius: "15px",
            "&:hover": {
              borderColor: "#E0E0E0",
              backgroundColor: "#F5F5F5",
            },
          }}
        >
          {isGenerating ? (
            "Regenerating..."
          ) : (
            <>
              <img
                src={Save}
                alt="regenerate"
                style={{ marginRight: "10px" }}
              />
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                }}
              >
                Regenerate
              </Typography>
            </>
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default SurveyPropertiesPanel;
