import { Box, useMediaQuery } from '@mui/material';
import CreateSurveyForm from '../../../components/Survey/CreateSurveyForm';

const CreateSurvey = () => {
  const isMobile = useMediaQuery('(max-width: 600px)');
  
  return (
    <Box 
      sx={{
        backgroundColor: '#F9FBFC', 
        flexGrow: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        ...(isMobile && {
          minHeight: 'calc(100vh - 64px)',
        })
      }}
    >
      <CreateSurveyForm />
    </Box>
  )
}

export default CreateSurvey;