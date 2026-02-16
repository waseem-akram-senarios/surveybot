"use client"
import { Box, Typography, Grid, Button, LinearProgress, Card, CardContent, styled } from '@mui/material';
import Header from '../../../../../components/Header';

const StartButton = styled(Button)(({ theme }) => ({
    borderRadius: 8,
    padding: theme.spacing(1.5, 4),
    fontSize: '1rem',
    fontWeight: 500,
    textTransform: 'none',
    marginTop: 'auto',
    boxShadow: 'none',
    '&:hover': {
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    },
  }));
import { useParams } from "next/navigation";

export default function StartPage() {
  const params = useParams();
  const surveyId = params?.id || "101"; 
  return (
    <Box p={{ xs: 2, md: 8 }}>
      <Header />

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Box
          sx={{
            width: { xs: "100%", sm: "90%", md: "75%" },
            justifyContent: "left",
          }}
        >
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "14px",
              fontWeight: "400",
              lineHeight: "20px",
              textAlign: "left",
            }}
          >
            Before we begin, how would you like to take this survey?
          </Typography>
          <Typography
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "14px",
              fontWeight: "400",
              lineHeight: "20px",
              textAlign: "left",
            }}
          >
            Choose the option that works best for you:
          </Typography>

          <Grid
            container
            spacing={4}
            alignItems="center"
            sx={{ marginTop: "50px" }}
          >
            <Grid item size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  border: "1px solid #F0F0F0",
                  borderRadius: "15px",
                  padding: "24px 40px",
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                  <Typography
                    sx={{
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "16px",
                      fontWeight: "500",
                      lineHeight: "28px",
                      textAlign: "left",
                    }}
                  >
                    Normal Survey
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#929292",
                      textAlign: "left",
                      mb: 3,
                    }}
                  >
                    Answer the questions through a simple survey interface. Ideal if you prefer to fill survey in traditional format.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    // temporary
                    href={`/survey/${surveyId}/text`}
                    sx={{
                      width: "185px",
                      height: "47px",
                      borderRadius: "15px",
                      borderColor: "#f0f0f0",
                      padding: "13px 16px",
                      color: "black",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "14px",
                      fontWeight: "400",
                      textTransform: "none",
                      "&:hover": {
                        borderColor: "#1976d2",
                        backgroundColor: "rgba(25, 118, 210, 0.04)",
                      },
                    }}
                  >
                    Start Normal Survey
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  border: "1px solid #F0F0F0",
                  borderRadius: "15px",
                  padding: "24px 40px",
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                  <Typography
                    sx={{
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "16px",
                      fontWeight: "500",
                      lineHeight: "28px",
                      textAlign: "left",
                    }}
                  >
                    Voice-Based Survey
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#929292",
                      textAlign: "left",
                      mb: 3,
                    }}
                  >
                    Respond to each question using your voice. Great for when
                    you’re on the go or just prefer speaking.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    href={`/survey/${surveyId}/voice`}
                    sx={{
                      width: "185px",
                      height: "47px",
                      borderRadius: "15px",
                      borderColor: "#f0f0f0",
                      padding: "13px 16px",
                      color: "black",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: "14px",
                      fontWeight: "400",
                      textTransform: "none",
                      "&:hover": {
                        borderColor: "#1976d2",
                        backgroundColor: "rgba(25, 118, 210, 0.04)",
                      },
                    }}
                  >
                    Start Voice Survey
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
