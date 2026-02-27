import { useTemplateTableOperations } from '../../hooks/Templates/useTemplateTable';
import { useNavigate } from 'react-router-dom';
import TemplateTableBase from './TemplateTableBase';
import { useState } from 'react';

const TemplateTable = ({ tableData: initialTableData, refreshTable, setNavigationLoading = () => {} }) => {
  const {
    loadTemplateDetails,
    cloneTemplate,
    deleteTemplate,
    updateTemplateStatus,
  } = useTemplateTableOperations();

  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

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
          }
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

  const handleStatusToggle = async (template) => {
    const newStatus = template.status === "Published" ? "Draft" : "Published";
    const result = await updateTemplateStatus(template.originalName, newStatus);
    return result;
  };

  return (
    <TemplateTableBase
      tableData={initialTableData}
      title="Created Templates"
      loading={false} 
      onTemplateClick={handleTemplateNameClick}
      onCloneTemplate={handleCloneTemplate}
      onDeleteTemplate={handleDeleteTemplate}
      onStatusToggle={handleStatusToggle}
      columns={columns}
      dataMapper={templateDataMapper}
      refreshTable={refreshTable}
    />
  );
};

export default TemplateTable;