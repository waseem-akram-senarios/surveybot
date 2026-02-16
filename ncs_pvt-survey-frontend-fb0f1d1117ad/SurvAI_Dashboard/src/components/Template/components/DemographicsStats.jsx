import React from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { prepareDemographicsChartData } from '../../../utils/Templates/templateAnalyticsHelper';

const DemographicsStats = ({ demographics, loading }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} sx={{ color: '#1958F7' }} />
      </Box>
    );
  }

  if (!demographics) {
    return <Alert severity="info">No demographics data available</Alert>;
  }

  const chartData = prepareDemographicsChartData(demographics);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1.3fr 1fr', xs: '1fr' }, gap: 6 }}>
      {/* Survey Summary */}
      <Box
        sx={{
          gridColumn: { md: '1 / -1', xs: 'auto' },
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
          p: 3,
        }}
      >
        <Typography sx={{ mb: 1.5, fontWeight: 500 }}>Survey Summary</Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '2px',
                backgroundColor: '#A5B4FC',
              }}
            />
            <Typography sx={{ fontSize: 14, color: '#374151' }}>
              Total Sent: {chartData.summary.total}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '2px',
                backgroundColor: '#6366F1',
              }}
            />
            <Typography sx={{ fontSize: 14, color: '#374151' }}>
              Completed: {chartData.summary.completed}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Age */}
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
          p: 3,
        }}
      >
        <Typography sx={{ mb: 2, fontWeight: 500 }}>Age</Typography>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData.age} layout="vertical" margin={{ left: 50 }}>
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="Total"
              name="Total"
              fill="#A5B4FC"
              radius={[8, 8, 8, 8]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="Completed"
              name="Completed"
              fill="#6366F1"
              radius={[8, 8, 8, 8]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Gender */}
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
          p: 3,
        }}
      >
        <Typography sx={{ mb: 2, fontWeight: 500 }}>Gender</Typography>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData.gender} margin={{ left: 20 }}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="Total"
              name="Total"
              fill="#A5B4FC"
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="Completed"
              name="Completed"
              fill="#6366F1"
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Accessibility */}
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
          p: 3,
        }}
      >
        <Typography sx={{ mb: 2, fontWeight: 500 }}>Accessibility Requirements</Typography>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData.accessibility} margin={{ left: 20 }}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="Total"
              name="Total"
              fill="#A5B4FC"
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="Completed"
              name="Completed"
              fill="#6366F1"
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Trips */}
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
          p: 3,
        }}
      >
        <Typography sx={{ mb: 2, fontWeight: 500 }}>Number of Trips Taken</Typography>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData.trips} layout="vertical" margin={{ left: 50 }}>
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="Total"
              name="Total"
              fill="#A5B4FC"
              radius={[8, 8, 8, 8]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="Completed"
              name="Completed"
              fill="#6366F1"
              radius={[8, 8, 8, 8]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default DemographicsStats;