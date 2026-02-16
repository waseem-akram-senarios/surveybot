import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  useMediaQuery,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";

import { useAlert } from "../../hooks/useAlert";
import { useTemplates } from "../../hooks/Surveys/useSurvey";
import SurveyService from "../../services/Surveys/surveyService";

const QuickSurveyForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const { alert, showSuccess, showError, closeAlert } = useAlert();

  // Template hooks
  const { availableTemplates, isLoadingTemplates, fetchTemplates } = useTemplates();

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [riderName, setRiderName] = useState("");
  const [rideId, setRideId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [recipientBiodata, setRecipientBiodata] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [numOfTrips, setNumOfTrips] = useState("");
  const [accessibility, setAccessibility] = useState("");

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Load templates and profile on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load templates
        await fetchTemplates();
        
        // Load existing profile
        await loadSurveyProfile();
      } catch (error) {
        showError(error.message);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadData();
  }, []);

  const loadSurveyProfile = async () => {
    try {
      const profileData = await SurveyService.fetchSurveyProfile();
      
      if (profileData) {
        // Populate form fields with existing profile data
        setSelectedTemplate(profileData.Name || "");
        setRecipientName(profileData.Recipient || "");
        setRiderName(profileData.RiderName || "");
        setRideId(profileData.RideId || "");
        setTenantId(profileData.TenantId || "");
        setRecipientBiodata(profileData.Biodata || "");
        setAge(profileData.Age ? profileData.Age.toString() : "");
        setGender(profileData.Gender || "Male");
        setNumOfTrips(profileData.NumOfTrips ? profileData.NumOfTrips.toString() : "");
        setAccessibility(profileData.Accessibility || "None");
        setEmail(profileData.Email || "");
        setPhoneNumber(profileData.Phone || "");
      }
    } catch (error) {
      // If profile doesn't exist or there's an error, just continue with empty form
      console.log("No existing profile found or error loading profile:", error.message);
      // Set default values
      setGender("Male");
      setAccessibility("None");
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Basic phone validation - at least 10 digits
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };

  const handleSaveProfile = async () => {
    // Basic validation
    if (!selectedTemplate) {
      showError("Please select a template");
      return;
    }

    if (!recipientName.trim()) {
      showError("Please enter recipient name");
      return;
    }

    if (!riderName.trim()) {
      showError("Please enter driver name");
      return;
    }

    if (email && !validateEmail(email)) {
      showError("Please enter a valid email address");
      return;
    }

    // Validate phone if provided
    if (phoneNumber && !validatePhone(phoneNumber)) {
      showError("Please enter a valid phone number");
      return;
    }

    if (!rideId.trim()) {
      showError("Please enter trip ID");
      return;
    }

    if (!tenantId.trim()) {
      showError("Please enter affiliate ID");
      return;
    }

    // Validate age if provided
    if (age && (isNaN(age) || parseInt(age) < 0 || parseInt(age) > 150)) {
      showError("Please enter a valid age (0-150)");
      return;
    }

    // Validate number of trips if provided
    if (numOfTrips && (isNaN(numOfTrips) || parseInt(numOfTrips) < 0)) {
      showError("Please enter a valid number of trips (0 or greater)");
      return;
    }

    setIsSaving(true);

    try {
      const profileData = {
        template: selectedTemplate,
        recipient: recipientName.trim(),
        riderName: riderName.trim(),
        rideId: rideId.trim(),
        tenantId: tenantId.trim(),
        biodata: recipientBiodata.trim(),
        // Add optional demographic fields
        age: age ? parseInt(age) : 0,
        gender: gender || "Male",
        numOfTrips: numOfTrips ? parseInt(numOfTrips) : 0,
        accessibility: accessibility || "None",
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
      };

      await SurveyService.saveSurveyProfile(profileData);

      showSuccess("Survey profile saved successfully!");
      
    } catch (error) {
      console.error("Failed to save survey profile:", error);
      showError(
        error.message || "Failed to save survey profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading spinner while fetching profile
  if (isLoadingProfile) {
    return (
      <Box
        sx={{
          p: isMobile ? 2 : 4,
          backgroundColor: "#fff",
          width: isMobile ? "90%" : "750px",
          maxHeight: "750px",
          borderRadius: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress sx={{ color: "#1958F7", mb: 2 }} />
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              color: "#7D7D7D",
            }}
          >
            Loading profile data...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          p: isMobile ? 2 : 4,
          backgroundColor: "#fff",
          width: isMobile ? "90%" : "750px",
          maxHeight: "750px",
          borderRadius: "20px",
          overflowY: "auto",
          overflowX: isMobile ? "auto" : "hidden",
          ...(isMobile && {
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }),
        }}
      >
        <Box>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "18px",
                lineHeight: "100%",
                color: "#1E1E1E",
                mb: 1,
              }}
            >
              Quick Survey Profile
            </Typography>
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "12px",
                lineHeight: "16px",
                color: "#7D7D7D",
              }}
            >
              Save your survey details to quickly create surveys without re-entering information
            </Typography>
          </Box>

          {/* Select Template */}
          <Box sx={{ mb: 4 }}>
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
              Select Template
            </Typography>
            <Typography
              sx={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "12px",
                lineHeight: "100%",
                color: "#7D7D7D",
                mb: 2,
              }}
            >
              This template will serve as the base for your surveys
            </Typography>

            <FormControl fullWidth>
              <Select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                displayEmpty
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
                    color: selectedTemplate ? "#1E1E1E" : "#7D7D7D",
                    padding: "12px 14px",
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

          {/* Recipient Name and Driver Name - Side by side */}
          <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
            <Box sx={{ flex: 1 }}>
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
                required
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

            <Box sx={{ flex: 1 }}>
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
                required
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                placeholder="Enter Driver name"
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
          </Box>

          <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
            <Box sx={{ flex: 1 }}>
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
                Email Address
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
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

            <Box sx={{ flex: 1 }}>
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
                Phone Number
              </Typography>
              <TextField
                fullWidth
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
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
          </Box>

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  lineHeight: "100%",
                  color: "#1E1E1E",
                  mb: 2,
                }}
              >
                Gender
              </Typography>
              <RadioGroup
                row
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                sx={{ gap: 3 }}
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
                          fontSize: 20,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
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
                          fontSize: 20,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
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
                          fontSize: 20,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
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
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  lineHeight: "100%",
                  color: "#1E1E1E",
                  mb: 2,
                }}
              >
                Accessibility Requirements
              </Typography>
              <RadioGroup
                row
                value={accessibility}
                onChange={(e) => setAccessibility(e.target.value)}
                sx={{ gap: 3 }}
              >
                <FormControlLabel
                  value="None"
                  control={
                    <Radio
                      sx={{
                        color: "#E0E0E0",
                        "&.Mui-checked": {
                          color: "#1958F7",
                        },
                        "& .MuiSvgIcon-root": {
                          fontSize: 20,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
                        color: "#1E1E1E",
                        ml: 0.5,
                      }}
                    >
                      None
                    </Typography>
                  }
                />
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
                          fontSize: 20,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
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
                          fontSize: 20,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
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
          </Box>

          {/* Trip ID and Affiliate ID - Side by side */}
          <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
            <Box sx={{ flex: 1 }}>
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
                required
                value={rideId}
                onChange={(e) => setRideId(e.target.value)}
                placeholder="Enter trip id"
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

            <Box sx={{ flex: 1 }}>
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
                required
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="Enter affiliate id"
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
          </Box>

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
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

            <Box sx={{ flex: 1 }}>
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
                type="number"
                value={numOfTrips}
                onChange={(e) => setNumOfTrips(e.target.value)}
                placeholder="Enter number of trips taken"
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
                mb: 1.5,
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
                mb: 2,
              }}
            >
              Describe the recipient that will receive surveys. This information will be saved for future use
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
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

          {/* Footer Buttons */}
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 3 }}
          >
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={isSaving}
              sx={{
                textTransform: "none",
                color: "#1E1E1E",
                width: "134px",
                height: "48px",
                borderColor: "#F0F0F0",
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
              Back
            </Button>

            <Button
              variant="contained"
              onClick={handleSaveProfile}
              disabled={isSaving}
              sx={{
                textTransform: "none",
                color: "#fff",
                width: "134px",
                height: "48px",
                backgroundColor: isSaving ? "#ccc" : "#1958F7",
                borderRadius: "17px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                "&:hover": {
                  backgroundColor: isSaving ? "#ccc" : "#1443D1",
                },
                "&:disabled": {
                  backgroundColor: "#ccc",
                },
              }}
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={closeAlert}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={closeAlert}
          severity={alert.severity}
          sx={{ width: "100%" }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QuickSurveyForm;