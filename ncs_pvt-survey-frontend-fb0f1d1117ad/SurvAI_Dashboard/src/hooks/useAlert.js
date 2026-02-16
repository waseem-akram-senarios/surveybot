import { useState } from 'react';

export const useAlert = () => {
  const [alert, setAlert] = useState({ 
    open: false, 
    message: "", 
    severity: "success" 
  });

  const showAlert = (message, severity = "success") => {
    setAlert({ open: true, message, severity });
  };

  const closeAlert = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };

  const showSuccess = (message) => showAlert(message, "success");
  const showError = (message) => showAlert(message, "error");
  const showWarning = (message) => showAlert(message, "warning");
  const showInfo = (message) => showAlert(message, "info");

  return {
    alert,
    showAlert,
    closeAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};