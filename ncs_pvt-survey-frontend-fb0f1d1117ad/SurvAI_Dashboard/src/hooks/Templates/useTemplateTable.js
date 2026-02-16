import { useEffect, useState, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import TemplateTableService from "../../services/Templates/templateTableService";
import { transformTableData, transformQuestionDataWithFlowSupport } from "../../utils/Templates/templateTableHelpers";

const useTemplateTable = () => {
  const [statsData, setStatsData] = useState({});
  const [tableData, setTableData] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    page_size: 10,
    total_count: 0,
    total_pages: 1
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async (
    page = currentPage, 
    size = pageSize, 
    sort = sortBy,
    order = sortOrder, 
    searchQuery = search
  ) => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, templateResponse] = await Promise.all([
        TemplateTableService.getTemplateStats(),
        TemplateTableService.getTemplateList(page, size, sort, order, searchQuery), 
      ]);
      
      setStatsData(statsData);
      
      // Handle paginated response structure
      if (templateResponse && templateResponse.data && templateResponse.pagination) {
        setTableData(templateResponse.data);
        setPagination(templateResponse.pagination);
      } else {
        // Fallback for old response structure
        const dataArray = Array.isArray(templateResponse) ? templateResponse : [];
        setTableData(dataArray);
        setPagination({
          current_page: 1,
          page_size: dataArray.length,
          total_count: dataArray.length,
          total_pages: 1
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
      setTableData([]);
      setPagination({
        current_page: 1,
        page_size: 10,
        total_count: 0,
        total_pages: 1
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchData(newPage, pageSize, sortBy, sortOrder, search);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchData(1, newPageSize, sortBy, sortOrder, search);
  };

  const handleSortChange = (frontendSortKey, order) => {
    setSortBy(frontendSortKey);
    setSortOrder(order);
    setCurrentPage(1);
    fetchData(1, pageSize, frontendSortKey, order, search);
  };

  const handleSearchChange = (searchQuery) => {
    setSearch(searchQuery);
    setCurrentPage(1);
    fetchData(1, pageSize, sortBy, sortOrder, searchQuery);
  };

  useEffect(() => {
    fetchData(1, 10, 'date', 'desc', '');
  }, []);

  return {
    statsData,
    tableData: transformTableData(tableData),
    pagination,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    search,
    loading,
    error,
    fetchData: () => fetchData(currentPage, pageSize, sortBy, sortOrder, search),
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleSearchChange,
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

  return {
    deleteLoading,
    cloneLoading,
    templateLoading,
    loadTemplateDetails,
    handleTemplateClick,
    cloneTemplate,
    deleteTemplate,
  };
};

// Hook for DraftTemplates page - fetches drafts and stats
export const useDraftTemplates = () => {
  const [statsData, setStatsData] = useState({});
  const [draftsData, setDraftsData] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    page_size: 10,
    total_count: 0,
    total_pages: 1
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (
    page = pagination.current_page,
    pageSize = pagination.page_size,
    currentSortBy = sortBy,
    currentSortOrder = sortOrder,
    currentSearch = search
  ) => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, draftsResponse] = await Promise.all([
        TemplateTableService.getTemplateStats(),
        TemplateTableService.getDraftList(
          page,
          pageSize,
          currentSortBy,
          currentSortOrder,
          currentSearch
        )
      ]);

      setStatsData(statsResponse);
      setDraftsData(draftsResponse.data || []);
      setPagination(draftsResponse.pagination || {
        current_page: 1,
        page_size: 10,
        total_count: 0,
        total_pages: 1
      });

    } catch (err) {
      console.error('Error fetching draft templates:', err);
      setError(err.message || 'Failed to load draft templates');
    } finally {
      setLoading(false);
    }
  }, [pagination.current_page, pagination.page_size, sortBy, sortOrder, search]);

  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
    fetchData(newPage, pagination.page_size, sortBy, sortOrder, search);
  }, [fetchData, pagination.page_size, sortBy, sortOrder, search]);

  const handlePageSizeChange = useCallback((newPageSize) => {
    const newPagination = { ...pagination, page_size: newPageSize, current_page: 1 };
    setPagination(newPagination);
    fetchData(1, newPageSize, sortBy, sortOrder, search);
  }, [fetchData, pagination, sortBy, sortOrder, search]);

  const handleSortChange = useCallback((newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    fetchData(1, pagination.page_size, newSortBy, newSortOrder, search);
  }, [fetchData, pagination.page_size, search]);

  const handleSearchChange = useCallback((newSearch) => {
    setSearch(newSearch);
    fetchData(1, pagination.page_size, sortBy, sortOrder, newSearch);
  }, [fetchData, pagination.page_size, sortBy, sortOrder]);

  useEffect(() => {
    fetchData(1, 10);
  }, [fetchData]);

  return {
    statsData,
    draftsData: transformTableData(draftsData),
    pagination,
    sortBy,
    sortOrder,
    search,
    loading,
    error,
    fetchData,
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleSearchChange,
  };
};

export default useTemplateTable;