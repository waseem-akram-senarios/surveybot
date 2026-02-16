import React from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PIE_COLORS,
  processChartData,
  calculatePercentages,
  hasResponses,
  hasQuestionOptions,
  isOpenQuestion,
  getTextResponses,
  getWordCloudImage,
  calculateAverageRating,
} from '../../../utils/Templates/templateAnalyticsHelper';

const QuestionStats = ({
  questionsData,
  currentQuestionIndex,
  currentResponseIndex,
  loading,
  loadingFiltered,
  onPrevQuestion,
  onNextQuestion,
  onPrevResponse,
  onNextResponse,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} sx={{ color: '#1958F7' }} />
      </Box>
    );
  }

  if (questionsData.length === 0) {
    return (
      <Alert severity="info">
        No questions data available for the selected filters
      </Alert>
    );
  }

  const currentQuestion = questionsData[currentQuestionIndex];
  const chartData = processChartData(currentQuestion);
  const chartDataWithPercentages = calculatePercentages(chartData);
  const totalResponses = chartData.reduce((sum, item) => sum + item.value, 0);
  
  const textResponses = isOpenQuestion(currentQuestion) ? getTextResponses(currentQuestion) : [];
  const wordCloudImage = isOpenQuestion(currentQuestion) ? getWordCloudImage(currentQuestion) : null;
  const openQuestionTotalResponses = textResponses.length;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Loading overlay for filtered data */}
      {loadingFiltered && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: '16px',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={32} sx={{ color: '#1958F7' }} />
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              Applying filters...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Question Navigation */}
      <Box
        sx={{
          backgroundColor: '#F9F9F9',
          borderRadius: '8px',
          boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          mb: 4,
        }}
      >
        <ChevronLeft
          style={{
            cursor: currentQuestionIndex > 0 ? 'pointer' : 'not-allowed',
            opacity: currentQuestionIndex > 0 ? 1 : 0.3,
            color: '#4B5563',
          }}
          onClick={onPrevQuestion}
        />
        <Typography sx={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>
          Question {currentQuestionIndex + 1} of {questionsData.length}
        </Typography>
        <ChevronRight
          style={{
            cursor: currentQuestionIndex < questionsData.length - 1 ? 'pointer' : 'not-allowed',
            opacity: currentQuestionIndex < questionsData.length - 1 ? 1 : 0.3,
            color: '#4B5563',
          }}
          onClick={onNextQuestion}
        />
      </Box>

      {/* Question Display */}
      <Box sx={{ mb: 3, p: 3, backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
        <Typography
          sx={{
            fontSize: '16px',
            fontWeight: 500,
            fontFamily: 'Poppins, sans-serif',
            color: '#111827',
          }}
        >
          {currentQuestion.question_text}
        </Typography>
        {currentQuestion.parent_id && (
          <Typography
            sx={{
              fontSize: '14px',
              color: '#6B7280',
              fontStyle: 'italic',
              mt: 1,
            }}
          >
            Sub-question of: {currentQuestion.parent_id}
          </Typography>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '14px', color: '#7D7D7D' }}>
          Total Responses: {isOpenQuestion(currentQuestion) ? openQuestionTotalResponses : totalResponses}
          {currentQuestion?.criteria === 'scale' && totalResponses > 0 && (
            <span style={{ marginLeft: '16px' }}>
              Average Rating: {calculateAverageRating(currentQuestion)} / {currentQuestion.scales}
            </span>
          )}
        </Typography>
      </Box>

      {isOpenQuestion(currentQuestion) ? (
        <Box>
          {!hasResponses(currentQuestion) ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No responses yet for this question
            </Alert>
          ) : (
            <>
              {wordCloudImage && (
                <Box sx={{ mb: 3 }}>
                  <Box
                    component="img"
                    src={`data:image/png;base64,${wordCloudImage}`}
                    alt="Word Cloud"
                    sx={{
                      width: '100%',
                      maxHeight: 280,
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0px 4px 20px 0px #0000000D',
                      border: '1px solid #F0F0F0',
                    }}
                  />
                </Box>
              )}
              {textResponses.length > 0 ? (
                <Box>
                  {/* Response Navigation Header */}
                  <Box
                    sx={{
                      backgroundColor: '#F9F9F9',
                      borderRadius: '8px',
                      boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1.5,
                      mb: 3,
                    }}
                  >
                    <ChevronLeft
                      style={{
                        cursor: currentResponseIndex > 0 ? 'pointer' : 'not-allowed',
                        opacity: currentResponseIndex > 0 ? 1 : 0.3,
                        color: '#4B5563',
                      }}
                      onClick={onPrevResponse}
                    />
                    <Typography sx={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>
                      Response {currentResponseIndex + 1} of {textResponses.length}
                    </Typography>
                    <ChevronRight
                      style={{
                        cursor: currentResponseIndex < textResponses.length - 1 ? 'pointer' : 'not-allowed',
                        opacity: currentResponseIndex < textResponses.length - 1 ? 1 : 0.3,
                        color: '#4B5563',
                      }}
                      onClick={() => onNextResponse(textResponses.length)}
                    />
                  </Box>

                  {/* Single Response Display */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 3,
                      backgroundColor: '#fff',
                      minHeight: '100px',
                      borderRadius: '15px',
                      border: '1px solid #F0F0F0',
                      boxShadow: '0px 4px 20px 0px #0000000D',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: '16px',
                          color: '#212529',
                          lineHeight: 1.6,
                          wordBreak: 'break-word',
                        }}
                      >
                        {textResponses[currentResponseIndex]}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Typography
                  sx={{
                    textAlign: 'center',
                    color: '#6C757D',
                    fontStyle: 'italic',
                    py: 4,
                  }}
                >
                  No text responses available
                </Typography>
              )}
            </>
          )}
        </Box>
      ) : hasQuestionOptions(currentQuestion) ? (
        <Box>
          {!hasResponses(currentQuestion) && (
            <Alert severity="info" sx={{ mb: 3 }}>
              No responses yet for this question. Showing available options.
            </Alert>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { md: '1.3fr 1fr', xs: '1fr' },
              gap: 6,
            }}
          >
            <Box
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.1)',
                p: 3,
              }}
            >
              <Typography sx={{ mb: 2, fontWeight: 500 }}>
                Frequency of Selected Options
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 50 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 8, 8]} isAnimationActive={false}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={index === 3 ? '#1958F7' : '#CFCDFF'}
                        style={{ filter: 'none' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>

            <Box
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.1)',
                p: 3,
              }}
            >
              <Typography sx={{ mb: 2, fontWeight: 500 }}>
                Percentage of Selected Options
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
                {chartDataWithPercentages.map((entry, index) => {
                  const bgColor = PIE_COLORS[index % PIE_COLORS.length];
                  const textColor = bgColor === '#FFF99E' ? '#374151' : '#FFFFFF';
                  return (
                    <Box
                      key={entry.name}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.5,
                        backgroundColor: bgColor,
                        color: textColor,
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      {entry.name}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Box>
      ) : (
        <Alert severity="info">
          No question options available for this question type
        </Alert>
      )}
    </Box>
  );
};

export default QuestionStats;