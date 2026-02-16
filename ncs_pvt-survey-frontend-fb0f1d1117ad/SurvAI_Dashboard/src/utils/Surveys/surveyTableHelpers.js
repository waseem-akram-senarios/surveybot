export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

export const transformSurveyData = (surveyData) => {
  if (!Array.isArray(surveyData)) {
    return [];
  }
  return surveyData.map((survey) => ({
    ...survey,
    formattedLaunchDate: formatDate(survey.LaunchDate),
    formattedCompletionDate: survey.CompletionDate
      ? formatDate(survey.CompletionDate)
      : null,
    statusColor: survey.Status === "Completed" ? "#00A857" : "#550FEC",
    statusBgColor: survey.Status === "Completed" ? "#E4FFEA" : "#F3F3FF",
  }));
};

export const mergeDashboardStats = (surveyStats, templateStats) => {
  const selectedTemplateStats = {
    Total_Templates: templateStats.Total_Templates ?? 0,
    Total_Draft_Templates: templateStats.Total_Draft_Templates ?? 0,
    Total_Published_Templates: templateStats.Total_Published_Templates ?? 0,
    Total_Templates_ThisMonth: templateStats.Total_Templates_ThisMonth ?? 0,
    Total_Published_Templates_ThisMonth:
      templateStats.Total_Published_Templates_ThisMonth ?? 0,
  };
  return {
    ...surveyStats,
    ...selectedTemplateStats,
  };
};

export const truncateText = (text, maxLength = 30) =>
  text?.length <= maxLength ? text : `${text?.substring(0, maxLength)}...`;

export const handleUrlClick = (url, status, e) => {
  e.stopPropagation();
  if (!url) return;

  let finalUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    finalUrl = "https://" + url;
  }

  const link = document.createElement("a");
  link.href = finalUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const filterData = (data, searchTerm) => {
  if (!searchTerm) return data;

  const lowercaseSearch = searchTerm.toLowerCase();
  return data.filter(
    (item) =>
      item.Name?.toLowerCase().includes(lowercaseSearch) ||
      item.SurveyId?.toString().toLowerCase().includes(lowercaseSearch) ||
      item.Recipient?.toLowerCase().includes(lowercaseSearch) ||
      item.Status?.toLowerCase().includes(lowercaseSearch)
  );
};

export const sortData = (data, orderBy, order) => {
  return [...data].sort((a, b) => {
    let aValue = a[orderBy];
    let bValue = b[orderBy];

    // Handle date sorting
    if (orderBy === "LaunchDate") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    // Handle string sorting
    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return order === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return order === "asc" ? 1 : -1;
    }
    return 0;
  });
};

export const paginateData = (data, page, rowsPerPage) => {
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  return data.slice(startIndex, endIndex);
};
