import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import TemplateTableService from "../../services/Templates/templateTableService";
import { transformTableData, transformQuestionDataWithFlowSupport } from "../../utils/Templates/templateTableHelpers";

// Main hook for Templates page - fetches all data
const useTemplateTable = () => {
  const [statsData, setStatsData] = useState({});
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, tableData] = await Promise.all([
        TemplateTableService.getTemplateStats(),
        TemplateTableService.getTemplateList(),
      ]);
      setStatsData(statsData);
      setTableData(tableData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    statsData,
    tableData: transformTableData(tableData),
    loading,
    error,
    fetchData,
  };
};

// Operations hook for TemplateTable component - handles template operations
export const useTemplateTableOperations = () => {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const navigate = useNavigate();

  const loadTemplateDetails = async (templateName) => {
    setTemplateLoading(true);
    try {
      const rawQuestions = await TemplateTableService.getTemplateQuestions(templateName);
      
      const questionsWithDetails = await transformQuestionDataWithFlowSupport(rawQuestions);      
      return questionsWithDetails;
    } catch (error) {
      console.error('Error loading template:', error);
      throw error;
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleTemplateClick = async (template) => {
    try {      
      const questions = await loadTemplateDetails(template.originalName || template.name);
            
      navigate('/templates/create', {
        state: {
          editMode: true,
          viewMode: true, 
          templateData: {
            templateName: template.originalName || template.name,
            questions: questions,
            templateId: template.templateId,
            status: template.status
          }
        }
      });
    } catch (error) {
      console.error("Error loading template:", error);
      throw error; 
    }
  };

  const cloneTemplate = async (sourceTemplate, newTemplateName) => {
    setCloneLoading(true);
    try {
      await TemplateTableService.cloneTemplate(sourceTemplate, newTemplateName);
      return { success: true };
    } catch (error) {
      console.error("Error cloning template:", error);
      return { success: false, error: error.message };
    } finally {
      setCloneLoading(false);
    }
  };

  const deleteTemplate = async (templateName) => {
    setDeleteLoading(true);
    try {
      await TemplateTableService.deleteTemplate(templateName);
      return { success: true };
    } catch (error) {
      console.error("Error deleting template:", error);
      return { success: false, error: error.message };
    } finally {
      setDeleteLoading(false);
    }
  };

  const updateTemplateStatus = async (templateName, newStatus) => {
    try {
      await TemplateTableService.updateTemplateStatus(templateName, newStatus);
      return { success: true };
    } catch (error) {
      console.error("Error updating template status:", error);
      return { success: false, error: error.message };
    }
  };

  return {
    deleteLoading,
    cloneLoading,
    templateLoading,
    loadTemplateDetails,
    handleTemplateClick,
    cloneTemplate,
    deleteTemplate,
    updateTemplateStatus,
  };
};

// Hook for DraftTemplates page - fetches drafts and stats
export const useDraftTemplates = () => {
  const [statsData, setStatsData] = useState({});
  const [draftsData, setDraftsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, draftsData] = await Promise.all([
        TemplateTableService.getTemplateStats(),
        TemplateTableService.getDraftList(),
      ]);
      setStatsData(statsData);
      setDraftsData(draftsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    statsData,
    draftsData,
    loading,
    error,
    fetchData,
  };
};

export default useTemplateTable;