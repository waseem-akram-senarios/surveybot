import { Box, useMediaQuery } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const MainLayout = () => {
  const isMobile = useMediaQuery('(max-width: 600px)');
  
  return (
    <Box sx={{ backgroundColor: '#F9FBFC', display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh' }}>
      {isMobile ? <Header /> : <Sidebar />}
            
      <Box 
        sx={{
          backgroundColor: '#F9FBFC', 
          flexGrow: 1, 
          display: 'flex',
          flexDirection: 'column', 
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
};

export default MainLayout;
