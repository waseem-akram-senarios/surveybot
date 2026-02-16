import { useTemplateTableOperations } from '../../hooks/Templates/useTemplateTable';
import { useLocation, useNavigate } from 'react-router-dom';
import TemplateTableBase from './TemplateTableBase';
import { useState } from 'react';

const TemplateTable = ({ 
  tableData: initialTableData, 
  pagination, 
  refreshTable, 
  setNavigationLoading = () => {}, 
  onPageChange, 
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  currentSortBy,
  currentSortOrder,
  currentSearch,
  loading = false
}) => {
  const {
    loadTemplateDetails,
    cloneTemplate,
    deleteTemplate,
  } = useTemplateTableOperations();
  
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();

  const columns = [
    { id: "id", label: "ID", sortable: true },
    { id: "name", label: "Name", sortable: true },
    { id: "date", label: "Creation Date", sortable: true },
    { id: "status", label: "Status", sortable: true },
    { id: "actions", label: "", sortable: false, align: "right" },
  ];

  // Data mapper for published templates (no transformation needed)
  const templateDataMapper = (template) => template;

  const handleTemplateNameClick = async (template) => {
    try {
      setIsNavigating(true);
      setNavigationLoading(true);
      
      const questionsWithDetails = await loadTemplateDetails(template.originalName);
      
      const isPublished = template.status === "Published";

      navigate('/templates/edit', {
        state: {
          editMode: true,
          viewMode: isPublished,
          templateData: {
            templateName: template.originalName,
            questions: questionsWithDetails,
            templateId: template.templateId,
            status: template.status
          },
          returnPage: pagination.current_page,
          returnPath: location.pathname
        }
      });

    } catch (error) {
      console.error(`Failed to load template: ${error.message}`);
      setIsNavigating(false);
      setNavigationLoading(false);
    }
  };

  const handleCloneTemplate = async (template, newTemplateName) => {
    const result = await cloneTemplate(template.originalName, newTemplateName);
    return result;
  };

  const handleDeleteTemplate = async (templateName) => {
    const result = await deleteTemplate(templateName);
    return result;
  };

  return (
    <TemplateTableBase
      tableData={initialTableData}
      pagination={pagination}
      title="Created Campaigns"
      loading={false}
      tableLoading={loading}
      onTemplateClick={handleTemplateNameClick}
      onCloneTemplate={handleCloneTemplate}
      onDeleteTemplate={handleDeleteTemplate}
      columns={columns}
      dataMapper={templateDataMapper}
      refreshTable={refreshTable}
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

export default TemplateTable;