import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  Typography,
  Button,
  Collapse,
  Box,
  IconButton,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Add,
  FiberManualRecord,
  KeyboardArrowDown,
  Menu,
  Close
} from '@mui/icons-material';
import Survey from '../assets/survey.svg';
import SelectedSurvey from '../assets/selectedSurvey.svg';
import Dashboard from '../assets/dashboard.svg';
import SelectedDashboard from '../assets/selectedDashboard.svg';
import Templates from '../assets/template.svg';
import SelectedTemplate from '../assets/selectedTemplate.svg';
import HeaderOpen from '../assets/HeaderOpen.svg';
import logo from '../assets/logo.png';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [surveysOpen, setSurveysOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    setTemplatesOpen(prev => !prev);
  };

  const handleSurveysClick = () => {
    setSurveysOpen(prev => !prev);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <>
      {/* Header AppBar - Only show when sidebar is closed */}
      {!isSidebarOpen && (
        <AppBar 
          position="static" 
          sx={{ 
            backgroundColor: '#F9FBFC',
            boxShadow: 'none',
            // borderBottom: '1px solid #e0e0e0',
            zIndex: 1201,
            p: 1
            // mb: 2,
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
            {/* <Typography 
              sx={{ 
                fontFamily: 'Saira, sans-serif',
                fontWeight: 400,
                fontSize: '28px',
                lineHeight: '28px',
                letterSpacing: '0',
                color: '#333'
              }}
            >
              SurvAI
            </Typography> */}
            <img src={logo} style={{width: '135px'}} />
            
            <IconButton 
              onClick={handleSidebarToggle}
              sx={{ 
                borderRadius: '2px', 
                width: '40px', 
                height: '40px',
                color: '#333'
              }}
            >
              <img src={HeaderOpen} alt="open-header" />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Full-width Mobile Sidebar */}
      <Drawer
        anchor="right"
        open={isSidebarOpen}
        onClose={handleSidebarClose}
        hideBackdrop={true}
        sx={{
          '& .MuiDrawer-paper': {
            width: '100vw',
            height: '100vh',
            backgroundColor: '#fff',
            border: 'none',
            overflow: 'auto',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 1300,
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* <Typography 
            sx={{ 
              fontFamily: 'Saira, sans-serif',
              fontWeight: 400,
              fontSize: '32px',
              lineHeight: '28px',
              letterSpacing: '0',
              color: '#333'
            }}
          >
            SurvAI
          </Typography> */}
          <img src={logo} style={{width: '135px'}} />

          <IconButton 
            onClick={handleSidebarClose} 
            sx={{
              borderRadius: '8px', 
              width: '40px', 
              height: '40px',
              backgroundColor: '#f5f5f5',
              '&:hover': {
                backgroundColor: '#e0e0e0',
              }
            }}
          >
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Navigation */}
        <Box sx={{ pt: 2, px: 2 }}>
          {/* Dashboard */}
          <Button
            onClick={() => {
              navigate('/dashboard');
              handleSidebarClose();
            }}
            sx={{
              width: '100%',
              height: '56px',
              justifyContent: 'flex-start',
              mx: 1,
              mb: 1,
              borderRadius: '15px',
              backgroundColor: isActive('/dashboard') ? '#e3f2fd' : '#fff',
              '&:hover': {
                backgroundColor: isActive('/dashboard') ? '#e3f2fd' : '#fff',
              },
              textTransform: 'none',
              py: 1,
              px: 3,
            }}
          >
            <img 
              src={isActive('/dashboard') ? SelectedDashboard : Dashboard} 
              alt="dashboard-icon" 
              style={{marginRight: '12px'}} 
            />
            <Typography 
              sx={{ 
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '100%',
                letterSpacing: '0',
                color: isActive('/dashboard') ? '#1958F7' : '#7d7d7d',
              }} 
            >
              Dashboard
            </Typography>
          </Button>

          {/* Templates */}
          <Button
            onClick={handleTemplatesClick}
            sx={{
              width: '100%',
              height: '56px',
              justifyContent: 'space-between',
              mx: 1,
              mb: 1,
              borderRadius: '15px',
              backgroundColor: isActive('/templates') ? '#e3f2fd' : '#fff',
              '&:hover': {
                backgroundColor: isActive('/templates') ? '#e3f2fd' : '#fff',
              },
              textTransform: 'none',
              py: 1,
              px: 3,
              border: 'none',
              boxShadow: 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center'}}>
              <img 
                src={isActive('/templates') ? SelectedTemplate : Templates} 
                alt='templates-icon' 
                style={{marginRight: '12px'}} 
              />
              <Typography
                sx={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '100%',
                  letterSpacing: '0',
                  color: isActive('/templates') ? '#1958F7' : '#7d7d7d',
                }}
              >
                Templates
              </Typography>
            </Box>
            <KeyboardArrowDown 
              sx={{ 
                color: isActive('/templates') ? '#1958F7' : '#7d7d7d', 
                fontSize: 24,
                transform: templatesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }} 
            />
          </Button>

          {/* Templates Submenu */}
          <Collapse in={templatesOpen} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 1, ml: 1, mr: 1 }}>
              <Button 
                onClick={() => {
                  navigate('/templates/create');
                  handleSidebarClose();
                }} 
                sx={{ 
                  width: '100%', 
                  justifyContent: 'flex-start', 
                  pl: 6, 
                  borderRadius: 1, 
                  textTransform: 'none', 
                  py: 1.5,
                  mb: 0.5
                }}
              >
                <FiberManualRecord sx={{ color: isActive('/templates/create') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 2 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '15px', color: isActive('/templates/create') ? '#1958F7' : '#7D7D7D' }}>Create New Template</Typography>
              </Button>
              <Button 
                onClick={() => {
                  navigate('/templates/manage');
                  handleSidebarClose();
                }} 
                sx={{ 
                  width: '100%', 
                  justifyContent: 'flex-start', 
                  pl: 6, 
                  borderRadius: 1, 
                  textTransform: 'none', 
                  py: 1.5,
                  mb: 0.5
                }}
              >
                <FiberManualRecord sx={{ color: isActive('/templates/manage') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 2 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '15px', color: isActive('/templates/manage') ? '#1958F7' : '#7D7D7D' }}>Manage Templates</Typography>
              </Button>
              <Button 
                onClick={() => {
                  navigate('/templates/drafts');
                  handleSidebarClose();
                }} 
                sx={{ 
                  width: '100%', 
                  justifyContent: 'flex-start', 
                  pl: 6, 
                  borderRadius: 1, 
                  textTransform: 'none', 
                  py: 1.5,
                  mb: 0.5
                }}
              >
                <FiberManualRecord sx={{ color: isActive('/templates/drafts') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 2 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '15px', color: isActive('/templates/drafts') ? '#1958F7' : '#7D7D7D' }}>Saved Drafts</Typography>
              </Button>
            </Box>
          </Collapse>

          {/* Surveys */}
          <Button
            onClick={handleSurveysClick}
            sx={{
              width: '100%',
              height: '56px',
              justifyContent: 'space-between',
              mx: 1,
              mb: 1,
              borderRadius: '15px',
              backgroundColor: isActive('/surveys') ? '#e8f0ff' : '#fff',
              '&:hover': {
                backgroundColor: isActive('/surveys') ? '#e8f0ff' : '#fff',
              },
              textTransform: 'none',
              py: 1,
              px: 3,
              border: 'none',
              boxShadow: 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <img 
                src={isActive('/surveys') ? SelectedSurvey : Survey} 
                alt='survey-icon' 
                style={{ marginRight: '12px' }} 
              />
              <Typography
                sx={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '100%',
                  letterSpacing: '0',
                  color: isActive('/surveys') ? '#1958F7' : '#7d7d7d',
                }}
              >
                Surveys
              </Typography>
            </Box>
            <KeyboardArrowDown 
              sx={{ 
                color: isActive('/surveys') ? '#1958F7' : '#7d7d7d', 
                fontSize: 24,
                transform: surveysOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }} 
            />
          </Button>

          <Collapse in={surveysOpen} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 1, ml: 1, mr: 1 }}>
              <Button 
                onClick={() => {
                  navigate('/surveys/launch');
                  handleSidebarClose();
                }} 
                sx={{ 
                  width: '100%', 
                  justifyContent: 'flex-start', 
                  pl: 6, 
                  borderRadius: 1, 
                  textTransform: 'none', 
                  py: 1.5,
                  mb: 0.5
                }}
              >
                <FiberManualRecord sx={{ color: isActive('/surveys/launch') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 2 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '15px', color: isActive('/surveys/launch') ? '#1958F7' : '#7D7D7D' }}>Launch New Survey</Typography>
              </Button>
              <Button 
                onClick={() => {
                  navigate('/surveys/manage');
                  handleSidebarClose();
                }} 
                sx={{ 
                  width: '100%', 
                  justifyContent: 'flex-start', 
                  pl: 6, 
                  borderRadius: 1, 
                  textTransform: 'none', 
                  py: 1.5,
                  mb: 0.5
                }}
              >
                <FiberManualRecord sx={{ color: isActive('/surveys/manage') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 2 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '15px', color: isActive('/surveys/manage') ? '#1958F7' : '#7D7D7D' }}>Manage Surveys</Typography>
              </Button>
              <Button 
                onClick={() => {
                  navigate('/surveys/completed');
                  handleSidebarClose();
                }} 
                sx={{ 
                  width: '100%', 
                  justifyContent: 'flex-start', 
                  pl: 6, 
                  borderRadius: 1, 
                  textTransform: 'none', 
                  py: 1.5,
                  mb: 0.5
                }}
              >
                <FiberManualRecord sx={{ color: isActive('/surveys/completed') ? '#1958F7' : '#7D7D7D', fontSize: 8, mr: 2 }} />
                <Typography sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '15px', color: isActive('/surveys/completed') ? '#1958F7' : '#7D7D7D' }}>Completed Surveys</Typography>
              </Button>
            </Box>
          </Collapse>
        </Box>

        {/* Create Template Button */}
        <Box sx={{ p: 4, mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              navigate('/templates/create');
              handleSidebarClose();
            }}
            sx={{
              width: '100%',
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
      </Drawer>
    </>
  );
};

export default Header;