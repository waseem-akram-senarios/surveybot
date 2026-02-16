"use client";
import { Box, Typography, Grid, Button, CircularProgress, Card } from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Background from '../../../../public/StartBackground.svg'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Survey() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientData, setRecipientData] = useState(null);

  const fetchRecipientInfo = async () => {
    if (!id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/surveys/${id}/recipient`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Fetching recipient info for survey ID:", result);
      
      // Set the recipient name for display
      setRecipientName(result.Recipient);
      
      // Store complete recipient data
      setRecipientData(result);
      
      // Save recipient data to session storage for use in voice survey
      try {
        const recipientStorageData = {
          surveyId: id,
          recipient: result.Recipient,
          name: result.Name, // Use Name if available, fallback to Recipient
          rideId: result.RideID,
        };
        
        sessionStorage.setItem(`survey_recipient_${id}`, JSON.stringify(recipientStorageData));
        console.log("Recipient data saved to session storage:", recipientStorageData);
      } catch (storageError) {
        console.warn("Failed to save to session storage (continuing anyway):", storageError);
      }
      
    } catch (error) {
      console.error("Error fetching recipient info:", error);
      setError("Failed to load survey");
    }
  };

  const checkSurveyStatus = async () => {
    if (!id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/surveys/${id}/status`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.Status === "Completed") {
        router.push(`/survey/${id}/complete`);
        return;
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error checking survey status:", error);
      setError("Failed to load survey status");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      await Promise.all([fetchRecipientInfo(), checkSurveyStatus()]);
    };

    initializePage();
  }, [id, router]);

  const handleStart = () => {
    if (id) {
      if (recipientData) {
        console.log("Navigating to voice survey with recipient data ready");
      } else {
        console.warn("Navigating without recipient data - voice survey will use fallbacks");
      }
      router.push(`/survey/${id}/start`);
    }
  };

  if (isLoading) {
    return (
      <Box
        p={8}
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8} textAlign="center">
        <Typography color="error" mb={2}>
          {error}
        </Typography>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: `url(${Background.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backdropFilter: "blur(20.299999237060547px)",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box textAlign="center" pt={4}>
        <Typography
          sx={{
            fontFamily: "Saira, sans-serif",
            fontSize: "48px",
            fontWeight: "400",
            color: "#000"
          }}
        >
          SurvAI
        </Typography>
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            color: "#929292",
          }}
        >
          Customer Satisfaction Survey
        </Typography>
      </Box>

      {/* Main Card - Centered */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Card
          sx={{
            maxWidth: "500px",
            width: "100%",
            p: 6,
            borderRadius: "24px",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.2)",
            border: "1px solid #EAEAEA",
            backdropFilter:' blur(40.099998474121094px)'
          }}
        >
          <Typography
            sx={{
              fontFamily: "Segoe UI, sans-serif",
              fontSize: "32px",
              fontWeight: "700",
              color: "#333",
              mb: 3,
            }}
          >
            Hello, {recipientName} 👋
          </Typography>
          
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "16px",
              fontWeight: "400",
              color: "#1A2D6B",
              lineHeight: "24px",
              mb: 4,
            }}
          >
            Welcome to the Customer Satisfaction Survey. We appreciate you
            taking the time to fill this survey out. Click the start button to
            begin the survey
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            onClick={handleStart}
            sx={{
              backgroundColor: "#1958F7",
              "&:hover": { backgroundColor: "#3367d6" },
              borderRadius: "17px",
              width: "150px",
              height: "48px",
              fontFamily: "Poppins, sans-serif",
              fontWeight: "500",
              fontSize: "16px",
              textTransform: "none",
              boxShadow: "0 4px 12px rgba(66, 133, 244, 0.3)",
            }}
          >
            Start Survey
          </Button>
        </Card>
      </Box>
    </Box>
  );
}
