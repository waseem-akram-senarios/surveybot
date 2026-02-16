import { useRoutes, Navigate } from 'react-router-dom';

import MainLayout from '../layout/MainLayout';

import NotFound from '../pages/NotFound';

// Import survey-related components
import Dashboard from '../pages/main/Surveys/Dashboard';
import CreateTemplate from '../pages/main/Templates/CreateTemplate';
import Templates from '../pages/main/Templates/Templates';
import DraftTemplates from '../pages/main/Templates/DraftTemplates';
import ManageSurveys from '../pages/main/Surveys/ManageSurveys';
import CompletedSurveys from '../pages/main/Surveys/CompletedSurveys';
import CreateSurvey from '../pages/main/Surveys/CreateSurvey';
import GeneratedSurveyView from '../pages/main/Surveys/GeneratedSurveyView';
import SurveyProgressPage from '../pages/main/Surveys/SurveyProgressPage';
import SurveyQuestionAnalytics from '../pages/main/Templates/TemplateAnalytics';
import QuickSurveyProfile from '../pages/main/Surveys/QuickSurveyProfile';

const routes = [
    {
      path: '/',
      children: [
        { path: '/', element: <Navigate to="/dashboard" /> }
      ]
    },
    {
      path: '/',
      element: <MainLayout />,
      children: [
        {
          path: '/dashboard',
          element: (
              <Dashboard />
          )
        },
        {
          path: '/templates/manage',
          element: (
              <Templates />
          )
        },
        {
          path: '/templates/create',
          element: (
              <CreateTemplate />
          )
        },
        {
          path: '/templates/edit',
          element: (
              <CreateTemplate />
          )
        },
        {
          path: '/templates/drafts',
          element: (
              <DraftTemplates />
          )
        },
        {
          path: '/surveys/launch',
          element: (
              <CreateSurvey />
          )
        },
        {
          path: '/surveys/generated',
          element: (
              <GeneratedSurveyView />
          )
        },
        {
          path: '/surveys/manage',
          element: (
              <ManageSurveys />
          )
        },
        {
          path: '/surveys/status/:surveyId',
          element: (
              <SurveyProgressPage />
          )
        },
        {
          path: '/surveys/completed',
          element: (
              <CompletedSurveys />
          )
        },
        {
          path: '/templates/create/analytics',
          element: (
              <SurveyQuestionAnalytics />
          )
        },
        {
          path: '/surveys/quick-survey',
          element: (
              <QuickSurveyProfile />
          )
        }
      ]
    },
    {
      path: '*',
      element: <NotFound />
    }
];
  
// Routing Render Function
export default function ThemeRoutes() {
    return useRoutes([...routes]);
}