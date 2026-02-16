import React from "react";
import {
  Box,
  Typography,
  useMediaQuery,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import Add from "@mui/icons-material/Add";
import User from "../assets/User.png";
import { useNavigate } from "react-router-dom";

const Cards = ({
  headerTitle = "Dashboard",
  statsData = {},
  loading = false,
  error = null,
}) => {
  const getCardsData = () => {
    if (headerTitle === "Dashboard") {
      return [
        {
          title: "Created Campaigns",
          value: statsData.Total_Templates?.toString() || "0",
          change: `${statsData.Total_Templates_ThisMonth || 0} this month`,
          isPositive: (statsData.Total_Templates_ThisMonth || 0) > 0,
        },
        {
          title: "Published Campaigns",
          value: statsData.Total_Published_Templates?.toString() || "0",
          change: `${statsData.Total_Published_Templates_ThisMonth || 0} this month`,
          isPositive: (statsData.Total_Published_Templates_ThisMonth || 0) > 0,
        },
        {
          title: "Active Surveys",
          value: statsData.Total_Active_Surveys?.toString() || "0",
          change: `${statsData.Total_Surveys || 0} total surveys`,
          isPositive: (statsData.Total_Active_Surveys || 0) > 0,
        },
        {
          title: "Completed Surveys",
          value: statsData.Total_Completed_Surveys?.toString() || "0",
          change: `${statsData.Total_Completed_Surveys_Today || 0} completed today`,
          isPositive: (statsData.Total_Completed_Surveys_Today || 0) > 0,
        },
        {
          title: "Completed Today",
          value: statsData.Total_Completed_Surveys_Today?.toString() || "0",
          change: `out of ${statsData.Total_Active_Surveys || 0} active`,
          isPositive: (statsData.Total_Completed_Surveys_Today || 0) > 0,
        },
        {
          title: "Avg Completion Time",
          value: `${Math.floor((statsData.Median_Completion_Duration || 0) / 60)}m`,
          change: `${statsData.Median_Completion_Duration_Today ? Math.floor(statsData.Median_Completion_Duration_Today / 60) : 0}m today`,
          isPositive: (statsData.Median_Completion_Duration_Today || 0) > 0,
        },
      ];
    }
    if (headerTitle === "Manage Surveys") {
      return [
        {
          title: "Total Surveys",
          value: statsData.Total_Surveys?.toString() || "0",
          change: `${statsData.Total_Templates_ThisMonth || 0} this month`,
          isPositive: (statsData.Total_Templates_ThisMonth || 0) > 0,
        },
        {
          title: "Active Surveys",
          value: statsData.Total_Active_Surveys?.toString() || "0",
          change: `${statsData.Total_Surveys || 0} total surveys`,
          isPositive: (statsData.Total_Active_Surveys || 0) > 0,
        },
        {
          title: "Completed Surveys",
          value: statsData.Total_Completed_Surveys?.toString() || "0",
          change: `${
            statsData.Total_Completed_Surveys_Today || 0
          } completed today`,
          isPositive: (statsData.Total_Completed_Surveys_Today || 0) > 0,
        },
      ];
    }
    if (headerTitle === "Completed Surveys") {
      return [
        {
          title: "Total Surveys",
          value: statsData.Total_Surveys?.toString() || "0",
          change: `${statsData.Total_Templates_ThisMonth || 0} this month`,
          isPositive: (statsData.Total_Templates_ThisMonth || 0) > 0,
        },
        {
          title: "Active Surveys",
          value: statsData.Total_Active_Surveys?.toString() || "0",
          change: `${statsData.Total_Surveys || 0} total surveys`,
          isPositive: (statsData.Total_Active_Surveys || 0) > 0,
        },
        {
          title: "Completed Surveys",
          value: statsData.Total_Completed_Surveys?.toString() || "0",
          change: `${
            statsData.Total_Completed_Surveys_Today || 0
          } completed today`,
          isPositive: (statsData.Total_Completed_Surveys_Today || 0) > 0,
        },
      ];
    }
    return [
      {
        title: "Total Campaigns",
        value: statsData.Total_Templates?.toString() || "0",
        change: `${statsData.Total_Templates_ThisMonth || 0} this month`,
        isPositive: (statsData.Total_Templates_ThisMonth || 0) > 0,
      },
      {
        title: "Draft Campaigns", 
        value: statsData.Total_Draft_Templates?.toString() || "0",
        change: `${(statsData.Total_Templates_ThisMonth || 0) - (statsData.Total_Published_Templates_ThisMonth || 0)} this month`,
        isPositive: ((statsData.Total_Templates_ThisMonth || 0) - (statsData.Total_Published_Templates_ThisMonth || 0)) > 0,
      },
      {
        title: "Published Campaigns",
        value: statsData.Total_Published_Templates?.toString() || "0", 
        change: `${statsData.Total_Published_Templates_ThisMonth || 0} this month`,
        isPositive: (statsData.Total_Published_Templates_ThisMonth || 0) > 0,
      },
    ];
  };

  const navigate = useNavigate();

  const displayData = getCardsData();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const isSmallMobile = useMediaQuery("(max-width: 400px)");

  return (
    <Box
      sx={{
        py: isMobile ? 2 : 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography
          sx={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 500,
            fontSize: isMobile ? "20px" : "28px",
            lineHeight: "100%",
            mb: 1,
          }}
        >
          {headerTitle}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {headerTitle === "Manage Templates" && (
            <Button
              variant="contained"
              onClick={() => navigate('/templates/create')}
              startIcon={<Add />}
              sx={{
                width: isMobile ? "170px" : "220px",
                height: "48px",
                background: "linear-gradient(180deg, #1958F7 0%, #3D69D9 100%)",
                color: "white",
                textTransform: "none",
                borderRadius: "15px",
                py: 1.5,
                fontFamily: "Poppins, sans-serif",
                fontSize: isMobile ? "12px" : "14px",
                fontWeight: 400,
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              Create Template
            </Button>
          )}
          {headerTitle === "Dashboard" && <img src={User} alt="user" />}
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: isMobile ? "center" : "start",
          gap: isMobile ? 1 : 3,
          minHeight: "150px",
        }}
      >
        {/* Loading State */}
        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: "150px",
            }}
          >
            <CircularProgress size={40} sx={{ color: "#1958F7" }} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: "150px",
            }}
          >
            <Alert severity="error" sx={{ maxWidth: 400 }}>
              Error loading statistics: {error}
            </Alert>
          </Box>
        )}

        {/* Data State */}
        {!loading &&
          !error &&
          displayData.map((stat, index) => (
            <Box
              key={index}
              sx={{
                width: isSmallMobile ? "135px" : isMobile ? "155px" : "300px",
                minHeight: "115px",
                borderRadius: "20px",
                border: "1px solid #F0F0F0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                px: 2,
                py: 3,
                boxSizing: "border-box",
              }}
            >
              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 400,
                  fontSize: "16px",
                  lineHeight: "28px",
                  color: "#929292",
                  mb: 1,
                }}
              >
                {stat.title}
              </Typography>

              <Typography
                sx={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 500,
                  fontSize: "24px",
                  lineHeight: "100%",
                  color: "#1E1E1E",
                  mb: 1,
                }}
              >
                {stat.value}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                {stat.isPositive ? (
                  <TrendingUpIcon sx={{ fontSize: 16, color: "#00A857" }} />
                ) : (
                  <TrendingDownIcon sx={{ fontSize: 16, color: "#FF3535" }} />
                )}
                <Typography
                  sx={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 400,
                    fontSize: "12px",
                    lineHeight: "100%",
                  }}
                >
                  <Box
                    component="span"
                    sx={{ color: stat.isPositive ? "#00A857" : "#FF3535" }}
                  >
                    {stat.change.split(" ")[0]}
                  </Box>{" "}
                  <Box component="span" sx={{ color: "#929292" }}>
                    {stat.change.split(" ").slice(1).join(" ")}
                  </Box>
                </Typography>
              </Box>
            </Box>
          ))}
      </Box>
    </Box>
  );
};

export default Cards;
