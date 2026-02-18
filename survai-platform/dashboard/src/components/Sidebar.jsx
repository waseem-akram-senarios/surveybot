import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  Typography,
  Button,
  Collapse,
  Box,
  IconButton,
  Divider
} from '@mui/material';
import {
  Add,
  FiberManualRecord,
  KeyboardArrowDown,
  Logout,
  Person
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Survey from '../assets/survey.svg';
import SelectedSurvey from '../assets/selectedSurvey.svg';
import Dashboard from '../assets/dashboard.svg';
import SelectedDashboard from '../assets/selectedDashboard.svg';
import Templates from '../assets/template.svg';
import SelectedTemplate from '../assets/selectedTemplate.svg';
import Hide from '../assets/Hide.svg';
import logo from '../assets/logo.png';

const Sidebar = () => {
  const drawerWidth = 260;
  const minimizedWidth = 80;
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [surveysOpen, setSurveysOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (location.pathname.startsWith('/templates')) {
      setTemplatesOpen(true);
    } else {
      setTemplatesOpen(false);
    }

    if (location.pathname.startsWith('/surveys')) {
      setSurveysOpen(true);
    } else {
      setSurveysOpen(false);
    }
  }, [location.pathname]);

  const handleTemplatesClick = () => {
    if (!isMinimized) {
      setTemplatesOpen(prev => !prev);
    }
  };

  const handleSurveysClick = () => {
    if (!isMinimized) {
      setSurveysOpen(prev => !prev);
    }
  };

  const handleClick = () => {
    setIsMinimized(prev => !prev);
    // Close all dropdowns when minimizing
    if (!isMinimized) {
      setTemplatesOpen(false);
      setSurveysOpen(false);
    }
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isMinimized ? minimizedWidth : drawerWidth,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: isMinimized ? minimizedWidth : drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#fff',
          border: 'none',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: isMinimized ? 'center' : 'space-between' }}>
        {!isMinimized && (
          // <Typography 
          //   sx={{ 
          //     fontFamily: 'Saira, sans-serif',
          //     fontWeight: 400,
          //     fontSize: '32px',
          //     lineHeight: '28px',
          //     letterSpacing: '0',
          //     color: '#333'
          //   }}
          // >
          //   SurvAI
          // </Typography>
          <img src={logo} style={{width: '135px'}} />
        )}

        <IconButton onClick={handleClick} sx={{borderRadius: '2px', width: '30px', height: '30px'}}>
          <img src={Hide} alt="hide" />
        </IconButton>
      </Box>

      {/* Navigation */}
      <Box sx={{ pt: 2, px: 2 }}>
        {/* Dashboard */}
        <Button
          component={Link}
          to="/dashboard"
          sx={{
            width: '100%',
            height: '48px',
            justifyContent: isMinimized ? 'center' : 'flex-start',
            mx: 1,
            borderRadius: '15px',
            backgroundColor: isActive('/dashboard') ? '#e3f2fd' : 'transparent',
            '&:hover': {
              backgroundColor: '#f5f5f5',
            },
            textTransform: 'none',
            py: 1,
          }}
        >
          <img src={isActive('/dashboard') ? SelectedDashboard : Dashboard} alt="dashboard-icon" style={{marginRight: isMinimized ? '0' : '10px'}} />
          {!isMinimized && (
            <Typography
              sx={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '100%',
                letterSpacing: '0',
                color: isActive('/dashboard') ? '#1958F7' : '#7d7d7d',
              }}
            >
              Dashboard
            </Typography>
          )}
        </Button>

        {/* Templates */}
        <Button
          onClick={handleTemplatesClick}
          sx={{
            width: '100%',
            height: '48px',
            justifyContent: isMinimized ? 'center' : 'space-between',
            mx: 1,
            borderRadius: '15px',
            backgroundColor: isActive('/templates') ? '#e3f2fd' : 'transparent',
            textTransform: 'none',
            py: 1,
            border: 'none',
            boxShadow: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center'}}>
            <img src={isActive('/templates') ? SelectedTemplate : Templates} alt='templates-icon' style={{marginRight: isMinimized ? '0' : '10px'}} />
            {!isMinimized && (
              <Typography
                sx={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '100%',
                  letterSpacing: '0',
                  color: isActive('/templates') ? '#1958F7' : '#7d7d7d',
                }}
              >
                Templates
              </Typography>
            )}
          </Box>
          {!isMinimized && (
            <KeyboardArrowDown sx={{ color: isActive('/templates') ? '#1958F7' : '#7d7d7d', fontSize: 20 }} />
          )}
        </Button>

        {/* Templates Submenu */}
        {!isMinimized && (
          <Collapse in={templatesOpen} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 1 }}>
              <Button 
                component={Link} 
                to="/templates/create" 
                sx={{ width: '100%', justifyContent: 'flex-start', pl: 6, mx: 1, borderRadius: 1, textTransform: 'none', py: 1 }}
              >
                <FiberManualRecord sx={{ color: isActive('/templates/create') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 1 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: isActive('/templates/create') ? '#1958F7' : '#7D7D7D' }}>Create New Template</Typography>
              </Button>
              
              <Button 
                component={Link} 
                to="/templates/manage" 
                sx={{ width: '100%', justifyContent: 'flex-start', pl: 6, mx: 1, borderRadius: 1, textTransform: 'none', py: 1 }}
              >
                <FiberManualRecord sx={{ color: isActive('/templates/manage') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 1 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: isActive('/templates/manage') ? '#1958F7' : '#7D7D7D' }}>Manage Templates</Typography>
              </Button>
              
              <Button 
                component={Link} 
                to="/templates/drafts" 
                sx={{ width: '100%', justifyContent: 'flex-start', pl: 6, mx: 1, borderRadius: 1, textTransform: 'none', py: 1 }}
              >
                <FiberManualRecord sx={{ color: isActive('/templates/drafts') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 1 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: isActive('/templates/drafts') ? '#1958F7' : '#7D7D7D' }}>Saved Drafts</Typography>
              </Button>
            </Box>
          </Collapse>
        )}

        {/* Surveys */}
        <Button
          onClick={handleSurveysClick}
          sx={{
            width: '100%',
            height: '48px',
            justifyContent: isMinimized ? 'center' : 'space-between',
            mx: 1,
            borderRadius: '15px',
            backgroundColor: isActive('/surveys') ? '#e8f0ff' : 'transparent',
            '&:hover': {
              backgroundColor: '#d6e8ff',
            },
            textTransform: 'none',
            py: 1,
            border: 'none',
            boxShadow: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img src={isActive('/surveys') ? SelectedSurvey : Survey} alt='survey-icon' style={{ marginRight: isMinimized ? '0' : '10px' }} />
            {!isMinimized && (
              <Typography
                sx={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '100%',
                  letterSpacing: '0',
                  color: isActive('/surveys') ? '#1958F7' : '#7d7d7d',
                }}
              >
                Surveys
              </Typography>
            )}
          </Box>
          {!isMinimized && (
            <KeyboardArrowDown sx={{ color: isActive('/surveys') ? '#1958F7' : '#7d7d7d', fontSize: 20 }} />
          )}
        </Button>

        {!isMinimized && (
          <Collapse in={surveysOpen} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 1 }}>
              <Button 
                component={Link} 
                to="/surveys/launch" 
                sx={{ width: '100%', justifyContent: 'flex-start', pl: 6, mx: 1, borderRadius: 1, textTransform: 'none', py: 1 }}
              >
                <FiberManualRecord sx={{ color: isActive('/surveys/launch') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 1 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: isActive('/surveys/launch') ? '#1958F7' : '#7D7D7D' }}>Launch New Survey</Typography>
              </Button>
              
              <Button 
                component={Link} 
                to="/surveys/manage" 
                sx={{ width: '100%', justifyContent: 'flex-start', pl: 6, mx: 1, borderRadius: 1, textTransform: 'none', py: 1 }}
              >
                <FiberManualRecord sx={{ color: isActive('/surveys/manage') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 1 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: isActive('/surveys/manage') ? '#1958F7' : '#7D7D7D' }}>Manage Surveys</Typography>
              </Button>
              
              <Button 
                component={Link} 
                to="/surveys/completed" 
                sx={{ width: '100%', justifyContent: 'flex-start', pl: 6, mx: 1, borderRadius: 1, textTransform: 'none', py: 1 }}
              >
                <FiberManualRecord sx={{ color: isActive('/surveys/completed') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 1 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: isActive('/surveys/completed') ? '#1958F7' : '#7D7D7D' }}>Completed Surveys</Typography>
              </Button>
              
              <Button 
                component={Link} 
                to="/surveys/import" 
                sx={{ width: '100%', justifyContent: 'flex-start', pl: 6, mx: 1, borderRadius: 1, textTransform: 'none', py: 1 }}
              >
                <FiberManualRecord sx={{ color: isActive('/surveys/import') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 1 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '14px', color: isActive('/surveys/import') ? '#1958F7' : '#7D7D7D' }}>Import Data</Typography>
              </Button>
            </Box>
          </Collapse>
        )}
      </Box>

      {/* Create Template Button */}
      {!isMinimized && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={() => navigate('/templates/create')}
            startIcon={<Add />}
            sx={{
              width: '90%',
              height: '48px',
              background: 'linear-gradient(180deg, #1958F7 0%, #3D69D9 100%)',
              color: 'white',
              textTransform: 'none',
              borderRadius: '15px',
              py: 1.5,
              fontFamily: 'Poppins, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              '&:hover': {
                backgroundColor: '#1565c0',
              },
            }}
          >
            Create Template
          </Button>
        </Box>
      )}

      {/* User Info & Logout */}
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        {!isMinimized && user && (
          <Box sx={{ mb: 2, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Person sx={{ color: '#7d7d7d', fontSize: 20 }} />
              <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontWeight: 500, color: '#333' }}>
                {user.username}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontSize: '11px', color: '#999', pl: 3.5 }}>
              {user.orgName || user.tenantId}
            </Typography>
          </Box>
        )}
        <Button
          onClick={handleLogout}
          startIcon={!isMinimized && <Logout />}
          sx={{
            width: '100%',
            justifyContent: isMinimized ? 'center' : 'flex-start',
            color: '#d32f2f',
            textTransform: 'none',
            borderRadius: '10px',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '14px',
            '&:hover': { backgroundColor: '#ffebee' },
          }}
        >
          {isMinimized ? <Logout /> : 'Logout'}
        </Button>
      </Box>
    </Drawer>
  );
};

export default Sidebar;