import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  TableSortLabel,
  useMediaQuery,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from 'react-router-dom';

import SearchBar from '../sharedTableComponents/SearchBar';
import TemplateTableRow from './components/TemplateTableRow';
import MobileTemplateCard from './components/MobileTemplateCard';
import CloneDialog from './components/CloneDialog';
import DeleteDialog from './components/DeleteDialog';
import LoadingOverlay from '../LoadingOverlay';
import TablePagination from '../sharedTableComponents/TablePagination';

const TemplateTableBase = ({ 
  tableData: initialTableData = [],
  pagination,
  title,
  loading = false,
  error = null,
  onTemplateClick,
  onCloneTemplate,
  onDeleteTemplate,
  columns,
  refreshTable,
  templateLoading = false,
  tableLoading = false,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  currentSortBy = 'date',
  currentSortOrder = 'desc',
  currentSearch = ''
}) => {
  const [localTableData, setLocalTableData] = useState(initialTableData || []);
  const [search, setSearch] = useState(currentSearch);
  const [orderBy, setOrderBy] = useState(currentSortBy);
  const [order, setOrder] = useState(currentSortOrder);
  const [openCloneDialog, setOpenCloneDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState({ clone: false, delete: false });
  const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);

  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 600px)");

  useEffect(() => {
    setLocalTableData(initialTableData || []);
  }, [initialTableData]);

  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    setOrderBy(currentSortBy);
    setOrder(currentSortOrder);
  }, [currentSortBy, currentSortOrder]);

  const handleTemplateNameClick = async (template) => {
    if (onTemplateClick) {
      try {
        await onTemplateClick(template);
      } catch (error) {
        console.error("Error handling template click:", error);
        setSnackbar({
          open: true,
          message: `Failed to load template: ${error.message}`,
          severity: 'error'
        });
      }
    }
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    const newOrder = isAsc ? "desc" : "asc";
    setOrder(newOrder);
    setOrderBy(property);

    if (onSortChange) {
      onSortChange(property, newOrder);
    }
  };

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch);

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const timer = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(newSearch);
      }
    }, 500);

    setSearchDebounceTimer(timer);
  };

  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  const handlePageChangeWrapper = (newPage) => {
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  const handlePageSizeChangeWrapper = (newPageSize) => {
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  const handleDeleteClick = (e, template) => {
    e.stopPropagation();
    setSelectedTemplate(template);
    setOpenDeleteDialog(true);
  };

  const handleCloneClick = (e, template) => {
    e.stopPropagation();
    setSelectedTemplate(template);
    setNewTemplateName(`${template.name} - Copy`);
    setOpenCloneDialog(true);
  };

  const handleLaunchSurveyClick = (e, template) => {
    e.stopPropagation();
    navigate('/surveys/launch', {
      state: { 
        selectedTemplate: template.originalName || template.name 
      }
    });
  };

  const handleCloneTemplateAction = async () => {
    if (!newTemplateName.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a name for the new template',
        severity: 'error'
      });
      return;
    }

    setActionLoading(prev => ({ ...prev, clone: true }));
    
    try {
      const result = await onCloneTemplate(selectedTemplate, newTemplateName.trim());
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Campaign "${newTemplateName}" cloned successfully`,
          severity: 'success'
        });
        if (refreshTable) refreshTable();
      } else {
        setSnackbar({
          open: true,
          message: `Failed to clone template: ${result.error}`,
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to clone template: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, clone: false }));
      setOpenCloneDialog(false);
      setSelectedTemplate(null);
      setNewTemplateName("");
    }
  };

  const handleDeleteTemplateAction = async (templateIdentifier) => {
    setActionLoading(prev => ({ ...prev, delete: true }));
    
    try {
      const result = await onDeleteTemplate(templateIdentifier);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Campaign "${templateIdentifier}" deleted successfully`,
          severity: 'success'
        });
        
        if (refreshTable) refreshTable();
      } else {
        setSnackbar({
          open: true,
          message: `Failed to delete template: ${result.error}`,
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to delete template: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, delete: false }));
      setOpenDeleteDialog(false);
      setSelectedTemplate(null);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCloseCloneDialog = () => {
    setOpenCloneDialog(false);
    setNewTemplateName("");
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleAnalyticsClick = (e, template) => {
    e.stopPropagation();
    navigate("/templates/create/analytics", {
      state: {
        templateData: {
          templateName: template.originalName || template.name,
          templateId: template.id,
          status: template.status,
          questions: template.questions || [],
        },
      },
    });
  };

  if (loading) {
    return (
      <Box sx={{
        backgroundColor: "#fff",
        p: isMobile ? 2 : 4,
        borderRadius: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px'
      }}>
        <CircularProgress size={40} sx={{ color: '#1958F7' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{
        backgroundColor: "#fff",
        p: isMobile ? 2 : 4,
        borderRadius: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px'
      }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        p: isMobile ? 2 : 4,
        borderRadius: "20px",
        position: 'relative'
      }}
    >
      {tableLoading && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          borderRadius: "20px"
        }}>
          <CircularProgress size={40} sx={{ color: '#1958F7' }} />
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        {!isMobile && (
          <SearchBar 
            title={title}
            searchValue={search} 
            onSearchChange={handleSearchChange} 
            placeholder="Search templates"
            itemCount={pagination?.total_count || 0}
            isMobile={false}
          />
        )}
      </Box>

      {isMobile && (
        <SearchBar 
          title={title}
          searchValue={search} 
          onSearchChange={handleSearchChange} 
          placeholder="Search templates"
          itemCount={pagination?.total_count || 0}
          isMobile={true}
        />
      )}

      {localTableData.length === 0 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '200px',
          flexDirection: 'column'
        }}>
          <Typography sx={{ 
            fontFamily: 'Poppins, sans-serif', 
            fontSize: '16px', 
            color: '#7D7D7D',
            mb: 1
          }}>
            No templates found
          </Typography>
          {search && (
            <Typography sx={{ 
              fontFamily: 'Poppins, sans-serif', 
              fontSize: '14px', 
              color: '#9A9EA5'
            }}>
              Try adjusting your search criteria
            </Typography>
          )}
        </Box>
      )}

      {isMobile && localTableData.length > 0 ? (
        <>
          {localTableData.map((template, index) => (
            <MobileTemplateCard
              key={`${template.id}-${index}`}
              template={template}
              onTemplateClick={handleTemplateNameClick}
              onDeleteClick={handleDeleteClick}
              onCloneClick={handleCloneClick}
              onLaunchSurveyClick={handleLaunchSurveyClick}
              disabled={templateLoading}
            />
          ))}
        </>
      ) : (
        localTableData.length > 0 && (
          <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
            <Table sx={{ borderCollapse: "separate" }}>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align || "left"}
                      sx={{
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
                        color: "#4B4B4B",
                      }}
                    >
                      {column.sortable ? (
                        <TableSortLabel
                          active={orderBy === column.id}
                          direction={orderBy === column.id ? order : "asc"}
                          onClick={() => handleSort(column.id)}
                        >
                          {column.label}
                        </TableSortLabel>
                      ) : (
                        column.label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {localTableData.map((template, index) => (
                  <TemplateTableRow
                    key={`${template.id}-${index}`}
                    template={template}
                    onTemplateClick={handleTemplateNameClick}
                    onDeleteClick={handleDeleteClick}
                    onCloneClick={handleCloneClick}
                    onLaunchSurveyClick={handleLaunchSurveyClick}
                    onAnalyticsClick={handleAnalyticsClick}
                    disabled={templateLoading}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      {pagination && pagination.total_count > 0 && (
        <TablePagination
          totalItems={pagination?.total_count || 0}
          rowsPerPage={pagination?.page_size || 10}
          page={pagination?.current_page || 1}
          onRowsPerPageChange={handlePageSizeChangeWrapper}
          onPageChange={handlePageChangeWrapper}
        />
      )}

      <CloneDialog
        open={openCloneDialog}
        onClose={handleCloseCloneDialog}
        selectedTemplate={selectedTemplate}
        newTemplateName={newTemplateName}
        setNewTemplateName={setNewTemplateName}
        onClone={handleCloneTemplateAction}
        loading={actionLoading.clone}
      />

      <DeleteDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        selectedTemplate={selectedTemplate}
        onDelete={handleDeleteTemplateAction}
        loading={actionLoading.delete}
      />

      <LoadingOverlay 
        visible={templateLoading} 
        message="Loading template..." 
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TemplateTableBase;
