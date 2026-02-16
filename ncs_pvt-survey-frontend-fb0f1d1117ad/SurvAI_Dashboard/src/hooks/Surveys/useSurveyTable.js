import { useEffect, useState } from "react";
import SurveyTableService from "../../services/Surveys/surveyTableService";
import TemplateTableService from "../../services/Templates/templateTableService";
import { transformSurveyData, mergeDashboardStats } from "../../utils/Surveys/surveyTableHelpers";

const SORT_FIELD_MAP = {
  'LaunchDate': 'launch_date',
  'Name': 'name',
  'Recipient': 'recipient',
  'Status': 'status',
  'SurveyId': 'id'
};

const useSurveyPageData = (statsDataFetcher, tableDataFetcher) => {
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
  const [sortBy, setSortBy] = useState('launch_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [tableError, setTableError] = useState(null);

  const fetchStatsData = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await statsDataFetcher();
      setStatsData(data);
    } catch (err) {
      console.error('Error fetching stats data:', err);
      setStatsError(err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchTableData = async (page = currentPage, size = pageSize, sort = sortBy, order = sortOrder, search = searchQuery) => {
    setTableLoading(true);
    setTableError(null);
    try {
      const response = await tableDataFetcher(page, size, sort, order, search);
      
      // Handle new paginated response structure
      if (response && response.data && response.pagination) {
        setTableData(transformSurveyData(response.data));
        setPagination(response.pagination);
      } else {
        // Fallback for old response structure or stats-only responses
        const dataArray = Array.isArray(response) ? response : [];
        setTableData(transformSurveyData(dataArray));
        setPagination({
          current_page: 1,
          page_size: dataArray.length,
          total_count: dataArray.length,
          total_pages: 1
        });
      }
    } catch (err) {
      console.error('Error fetching table data:', err);
      setTableError(err.message);
      setTableData([]);
      setPagination({
        current_page: 1,
        page_size: 10,
        total_count: 0,
        total_pages: 1
      });
    } finally {
      setTableLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchTableData(newPage, pageSize, sortBy, sortOrder, searchQuery);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchTableData(1, newPageSize, sortBy, sortOrder, searchQuery);
  };

  const handleSort = (property) => {
    const backendSortField = SORT_FIELD_MAP[property] || property.toLowerCase();
    
    const newSortOrder = sortBy === backendSortField && sortOrder === 'asc' ? 'desc' : 'asc';
    
    setSortBy(backendSortField);
    setSortOrder(newSortOrder);
    setCurrentPage(1); 
    fetchTableData(1, pageSize, backendSortField, newSortOrder, searchQuery);
  };

  const handleSearch = (search) => {
    setSearchQuery(search);
    setCurrentPage(1); 
    fetchTableData(1, pageSize, sortBy, sortOrder, search);
  };

  useEffect(() => {
    fetchStatsData();
    fetchTableData(1, 10, 'launch_date', 'desc', ''); 
  }, []);

  return {
    statsData,
    tableData,
    pagination,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    searchQuery,
    statsLoading,
    tableLoading,
    statsError,
    tableError,
    globalLoading: statsLoading && tableLoading,
    refetchStats: fetchStatsData,
    refetchTable: () => fetchTableData(currentPage, pageSize, sortBy, sortOrder, searchQuery),
    handlePageChange,
    handlePageSizeChange,
    handleSort,
    handleSearch,
  };
};

// Hook for Dashboard page - fetches merged stats and survey list
export const useDashboard = () => {
  return useSurveyPageData(
    async () => {
      // Fetch stats separately since getDashboardData now includes survey list
      const [surveyStats, templateStats] = await Promise.all([
        SurveyTableService.getSurveyStats(),
        TemplateTableService.getTemplateStats()
      ]);
      return mergeDashboardStats(surveyStats, templateStats);
    },
    (page, pageSize, sortBy, sortOrder, search) =>
      SurveyTableService.getSurveyList(page, pageSize, sortBy, sortOrder, search)
  );
};

// Hook for ManageSurveys page - fetches survey stats and list
export const useManageSurveys = () => {
  return useSurveyPageData(
    () => SurveyTableService.getSurveyStats(),
    (page, pageSize, sortBy, sortOrder, search) => 
      SurveyTableService.getSurveyList(page, pageSize, sortBy, sortOrder, search)
  );
};

// Hook for CompletedSurveys page - fetches survey stats and completed surveys
export const useCompletedSurveys = () => {
  return useSurveyPageData(
    () => SurveyTableService.getSurveyStats(),
    (page, pageSize, sortBy, sortOrder, search) => 
      SurveyTableService.getCompletedSurveyList(page, pageSize, sortBy, sortOrder, search)
  );
};
