"use client"
import { Box, Typography, Grid, Button, LinearProgress, Card, CardContent, styled, CircularProgress } from '@mui/material';
import Header from '../../../../../components/Header';
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { detectLanguage, t } from '../../../../lib/i18n';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

export default function StartPage() {
  const params = useParams();
  const surveyId = params?.id || "101";
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const fetchLang = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/recipient`);
        if (res.ok) {
          const data = await res.json();
          if (data.Name) setLang(detectLanguage(data.Name));
        }
      } catch (e) { /* fallback to English */ }
    };
    fetchLang();
  }, [surveyId]);

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
            {t('chooseMode', lang)}
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
            {lang === 'es' ? 'Elija la opción que mejor le convenga:' : 'Choose the option that works best for you:'}
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
                    {t('textSurvey', lang)}
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
                    {t('textDesc', lang)}
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
                    {lang === 'es' ? 'Iniciar Encuesta de Texto' : 'Start Normal Survey'}
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
                    {t('voiceSurvey', lang)}
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
                    {t('voiceDesc', lang)}
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
                    {lang === 'es' ? 'Iniciar Encuesta por Voz' : 'Start Voice Survey'}
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
