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
import { filterAndSortTemplates, paginateData } from '../../utils/Templates/templateTableHelpers';

import SearchBar from '../sharedTableComponents/SearchBar';
import TemplateTableRow from './components/TemplateTableRow';
import MobileTemplateCard from './components/MobileTemplateCard';
import CloneDialog from './components/CloneDialog';
import DeleteDialog from './components/DeleteDialog';
import LoadingOverlay from '../LoadingOverlay';
import TablePagination from '../sharedTableComponents/TablePagination';

const TemplateTableBase = ({ 
  tableData: initialTableData = [],
  title,
  loading = false,
  error = null,
  onTemplateClick,
  onCloneTemplate,
  onDeleteTemplate,
  onStatusToggle,
  columns,
  dataMapper = (data) => data,
  refreshTable,
  templateLoading = false
}) => {
  const [localTableData, setLocalTableData] = useState(initialTableData || []);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [openCloneDialog, setOpenCloneDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState({ clone: false, delete: false });

  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 600px)");

  useEffect(() => {
    setLocalTableData(initialTableData || []);
  }, [initialTableData]);

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
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedTemplates = filterAndSortTemplates(localTableData, search, orderBy, order, dataMapper);
  const paginatedTemplates = paginateData(sortedTemplates, page, rowsPerPage);

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

  const handleStatusToggle = async (e, template) => {
    e.stopPropagation();
    if (!onStatusToggle) return;
    try {
      const result = await onStatusToggle(template);
      if (result.success) {
        const newStatus = template.status === "Published" ? "Draft" : "Published";
        setSnackbar({
          open: true,
          message: `Template "${template.name}" changed to ${newStatus}`,
          severity: 'success'
        });
        if (refreshTable) refreshTable();
      } else {
        setSnackbar({
          open: true,
          message: `Failed to update status: ${result.error}`,
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to update status: ${error.message}`,
        severity: 'error'
      });
    }
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
          message: `Template "${newTemplateName}" cloned successfully`,
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
          message: `Template "${templateIdentifier}" deleted successfully`,
          severity: 'success'
        });
        
        const updatedData = localTableData.filter(template => {
          const mappedTemplate = dataMapper(template);
          return mappedTemplate.originalName !== templateIdentifier;
        });
        setLocalTableData(updatedData);
        
        const maxPage = Math.ceil(updatedData.length / rowsPerPage);
        if (page > maxPage && maxPage > 0) {
          setPage(maxPage);
        } else if (updatedData.length === 0) {
          setPage(1);
        }
        
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

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
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
      }}
    >
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
            onSearchChange={setSearch} 
            placeholder="Search templates"
            itemCount={sortedTemplates.length}
            isMobile={false}
          />
        )}
      </Box>

      {isMobile && (
        <SearchBar 
          title={title}
          searchValue={search} 
          onSearchChange={setSearch} 
          placeholder="Search templates"
          itemCount={sortedTemplates.length}
          isMobile={true}
        />
      )}

      {/* Show "No data" message when there are no templates */}
      {sortedTemplates.length === 0 && (
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

      {/* Mobile Layout */}
      {isMobile && sortedTemplates.length > 0 ? (
        <>
          {paginatedTemplates.map((template, index) => (
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
        sortedTemplates.length > 0 && (
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
                {paginatedTemplates.map((template, index) => (
                  <TemplateTableRow
                    key={`${template.id}-${index}`}
                    template={template}
                    onTemplateClick={handleTemplateNameClick}
                    onDeleteClick={handleDeleteClick}
                    onCloneClick={handleCloneClick}
                    onLaunchSurveyClick={handleLaunchSurveyClick}
                    onStatusToggle={onStatusToggle ? handleStatusToggle : null}
                    disabled={templateLoading}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      {/* Pagination - only show if there are templates */}
      {sortedTemplates.length > 0 && (
        <TablePagination
          totalItems={sortedTemplates.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onRowsPerPageChange={handleRowsPerPageChange}
          onPageChange={handlePageChange}
        />
      )}

      {/* Dialogs and Overlays */}
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
