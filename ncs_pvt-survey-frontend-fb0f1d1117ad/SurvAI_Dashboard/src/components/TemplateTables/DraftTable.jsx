import React, { useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { useTemplateTableOperations } from '../../hooks/Templates/useTemplateTable';
import TemplateTableBase from './TemplateTableBase';

const DraftTable = ({
  draftsData: initialDraftsData = [],
  pagination,
  loading = false,
  error = null,
  onTemplateDeleted = () => {}, 
  onDataRefresh = () => {},
  setNavigationLoading = () => {},
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  currentSortBy,
  currentSortOrder,
  currentSearch
}) => {
  const {
    templateLoading,
    loadTemplateDetails,
    cloneTemplate,
    deleteTemplate,
  } = useTemplateTableOperations();

  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const draftDataMapper = (template) => ({
    id: template.TemplateName, 
    name: template.TemplateName,
    formattedDate: formatDate(template.Date),
    rawDate: template.Date,
    status: template.Status || 'Draft',
    originalName: template.TemplateName,
    templateId: template.TemplateId || null
  });

  const columns = [
    { id: "id", label: "ID", sortable: true },
    { id: "name", label: "Name", sortable: true },
    { id: "date", label: "Creation Date", sortable: true },
    { id: "status", label: "Status", sortable: true },
    { id: "actions", label: "", sortable: false, align: "right" },
  ];

  const handleTemplateClick = async (template) => {
    try {
      setIsNavigating(true);
      setNavigationLoading(true);
      
      const questionsWithDetails = await loadTemplateDetails(template.originalName);

      navigate('/templates/edit', {
        state: {
          editMode: true,
          templateData: {
            templateName: template.originalName,
            questions: questionsWithDetails,
            templateId: template.templateId
          },
          returnPage: pagination.current_page,
          returnPath: location.pathname
        }
      });

    } catch (error) {
      console.error('Error loading template:', error);
      setIsNavigating(false);
      setNavigationLoading(false);
    }
  };

  const handleCloneTemplate = async (template, newTemplateName) => {
    try {
      const result = await cloneTemplate(template.originalName, newTemplateName);
      
      if (result.success) {
        onDataRefresh();
      }
      
      return result;
    } catch (error) {
      console.error("Error cloning template:", error);
      return { success: false, error: error.message };
    }
  };

  const handleDeleteTemplate = async (templateName) => {
    try {
      const result = await deleteTemplate(templateName);
      
      if (result.success) {
        onTemplateDeleted();
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting template:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <TemplateTableBase
      tableData={initialDraftsData}
      pagination={pagination}
      title="Draft Campaigns"
      loading={false}
      tableLoading={loading}
      error={error ? `Error loading draft templates: ${error}` : null}
      onTemplateClick={handleTemplateClick}
      onCloneTemplate={handleCloneTemplate}
      onDeleteTemplate={handleDeleteTemplate}
      columns={columns}
      dataMapper={draftDataMapper}
      refreshTable={onDataRefresh}
      templateLoading={isNavigating}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onSortChange={onSortChange}
      onSearchChange={onSearchChange}
      currentSortBy={currentSortBy}
      currentSortOrder={currentSortOrder}
      currentSearch={currentSearch}
    />
  );
};

export default DraftTable;