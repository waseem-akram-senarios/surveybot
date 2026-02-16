import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Modal,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  IconButton,
} from '@mui/material';
import { Close, FilterList } from '@mui/icons-material';

const AnalyticsFilterModal = ({ open, onClose, onApplyFilters, currentFilters = {} }) => {
  const [filters, setFilters] = useState({
    AgeRange: currentFilters.AgeRange || [null, null],
    TripsRange: currentFilters.TripsRange || [null, null],
    Gender: currentFilters.Gender || '',
    Accessibility: currentFilters.Accessibility || '',
  });

  const [ageCheckboxes, setAgeCheckboxes] = useState({
    '<18': false,
    '19-24': false,
    '25-32': false,
    '>32': false,
  });

  const [genderCheckboxes, setGenderCheckboxes] = useState({
    Male: false,
    Female: false,
    Other: false,
  });

  const [accessibilityCheckboxes, setAccessibilityCheckboxes] = useState({
    'Needs Wheelchair': false,
    Other: false,
    None: false,
  });

  const [tripsInput, setTripsInput] = useState('');

  // Initialize checkboxes based on current filters
  useEffect(() => {
    if (currentFilters.Gender) {
      setGenderCheckboxes(prev => ({
        ...prev,
        [currentFilters.Gender]: true
      }));
    }

    if (currentFilters.Accessibility) {
      let accessKey;
      if (currentFilters.Accessibility === 'Wheelchair') {
        accessKey = 'Needs Wheelchair';
      } else if (currentFilters.Accessibility === 'None') {
        accessKey = 'None';
      } else {
        accessKey = 'Other';
      }
      setAccessibilityCheckboxes(prev => ({
        ...prev,
        [accessKey]: true
      }));
    }

    // Set age checkboxes based on age range
    if (currentFilters.AgeRange) {
      const [minAge, maxAge] = currentFilters.AgeRange;
      if (minAge === null && maxAge === 18) {
        setAgeCheckboxes(prev => ({ ...prev, '<18': true }));
      } else if (minAge === 19 && maxAge === 24) {
        setAgeCheckboxes(prev => ({ ...prev, '19-24': true }));
      } else if (minAge === 25 && maxAge === 32) {
        setAgeCheckboxes(prev => ({ ...prev, '25-32': true }));
      } else if (minAge === 32 && maxAge === null) {
        setAgeCheckboxes(prev => ({ ...prev, '>32': true }));
      }
    }
  }, [currentFilters]);

  const handleAgeCheckboxChange = (ageGroup, checked) => {
    setAgeCheckboxes(prev => {
      // Clear all age checkboxes first (single selection)
      const newState = {
        '<18': false,
        '19-24': false,
        '25-32': false,
        '>32': false,
      };
      
      if (checked) {
        newState[ageGroup] = true;
        
        // Set the corresponding age range
        let ageRange = [null, null];
        switch (ageGroup) {
          case '<18':
            ageRange = [null, 18];
            break;
          case '19-24':
            ageRange = [19, 24];
            break;
          case '25-32':
            ageRange = [25, 32];
            break;
          case '>32':
            ageRange = [32, null];
            break;
        }
        
        setFilters(prev => ({
          ...prev,
          AgeRange: ageRange
        }));
      } else {
        setFilters(prev => ({
          ...prev,
          AgeRange: [null, null]
        }));
      }
      
      return newState;
    });
  };

  const handleGenderCheckboxChange = (gender, checked) => {
    setGenderCheckboxes(prev => {
      // Clear all gender checkboxes first (single selection)
      const newState = {
        Male: false,
        Female: false,
        Other: false,
      };
      
      if (checked) {
        newState[gender] = true;
        setFilters(prev => ({
          ...prev,
          Gender: gender
        }));
      } else {
        setFilters(prev => ({
          ...prev,
          Gender: ''
        }));
      }
      
      return newState;
    });
  };

  const handleAccessibilityCheckboxChange = (accessType, checked) => {
    setAccessibilityCheckboxes(prev => {
      // Clear all accessibility checkboxes first (single selection)
      const newState = {
        'Needs Wheelchair': false,
        Other: false,
        None: false,
      };
      
      if (checked) {
        newState[accessType] = true;
        let apiValue;
        if (accessType === 'Needs Wheelchair') {
          apiValue = 'Wheelchair';
        } else if (accessType === 'None') {
          apiValue = 'None';
        } else {
          apiValue = 'Other';
        }
        setFilters(prev => ({
          ...prev,
          Accessibility: apiValue
        }));
      } else {
        setFilters(prev => ({
          ...prev,
          Accessibility: ''
        }));
      }
      
      return newState;
    });
  };

  const handleTripsInputChange = (event) => {
    const value = event.target.value;
    setTripsInput(value);
    
    if (value.trim() === '') {
      setFilters(prev => ({
        ...prev,
        TripsRange: [null, null]
      }));
    } else {
      const trips = parseInt(value);
      if (!isNaN(trips) && trips > 0) {
        setFilters(prev => ({
          ...prev,
          TripsRange: [trips, trips]
        }));
      }
    }
  };

  const handleApply = () => {
    // Clean up filters - remove empty values
    const cleanFilters = {};
    
    if (filters.AgeRange && (filters.AgeRange[0] !== null || filters.AgeRange[1] !== null)) {
      cleanFilters.AgeRange = filters.AgeRange;
    }
    
    if (filters.TripsRange && (filters.TripsRange[0] !== null || filters.TripsRange[1] !== null)) {
      cleanFilters.TripsRange = filters.TripsRange;
    }
    
    if (filters.Gender) {
      cleanFilters.Gender = filters.Gender;
    }
    
    if (filters.Accessibility) {
      cleanFilters.Accessibility = filters.Accessibility;
    }
    
    onApplyFilters(cleanFilters);
    onClose();
  };

  const handleCancel = () => {
    // Reset to current filters
    setFilters({
      AgeRange: currentFilters.AgeRange || [null, null],
      TripsRange: currentFilters.TripsRange || [null, null],
      Gender: currentFilters.Gender || '',
      Accessibility: currentFilters.Accessibility || '',
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      aria-labelledby="analytics-filter-modal"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: '16px',
          p: 4,
          width: '90%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <FilterList sx={{ mr: 1, color: '#666' }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 600,
              flex: 1,
            }}
          >
            Apply Filters
          </Typography>
          <IconButton onClick={handleCancel} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Age Filter */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              mb: 2,
              fontSize: '16px',
            }}
          >
            Age
          </Typography>
          <FormGroup sx={{ display: 'flex', flexDirection: 'row', gap: 2, flexWrap: 'wrap' }}>
            {Object.entries(ageCheckboxes).map(([age, checked]) => (
              <FormControlLabel
                key={age}
                control={
                  <Checkbox
                    checked={checked}
                    onChange={(e) => handleAgeCheckboxChange(age, e.target.checked)}
                    sx={{
                      color: '#E5E7EB',
                      '&.Mui-checked': {
                        color: '#1958F7',
                      },
                    }}
                  />
                }
                label={age}
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '14px',
                  },
                }}
              />
            ))}
          </FormGroup>
        </Box>

        {/* Gender Filter */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              mb: 2,
              fontSize: '16px',
            }}
          >
            Gender
          </Typography>
          <FormGroup sx={{ display: 'flex', flexDirection: 'row', gap: 2, flexWrap: 'wrap' }}>
            {Object.entries(genderCheckboxes).map(([gender, checked]) => (
              <FormControlLabel
                key={gender}
                control={
                  <Checkbox
                    checked={checked}
                    onChange={(e) => handleGenderCheckboxChange(gender, e.target.checked)}
                    sx={{
                      color: '#E5E7EB',
                      '&.Mui-checked': {
                        color: '#1958F7',
                      },
                    }}
                  />
                }
                label={gender}
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '14px',
                  },
                }}
              />
            ))}
          </FormGroup>
        </Box>

        {/* Accessibility Filter */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              mb: 2,
              fontSize: '16px',
            }}
          >
            Accessibility Requirements
          </Typography>
          <FormGroup sx={{ display: 'flex', flexDirection: 'row', gap: 2, flexWrap: 'wrap' }}>
            {Object.entries(accessibilityCheckboxes).map(([accessType, checked]) => (
              <FormControlLabel
                key={accessType}
                control={
                  <Checkbox
                    checked={checked}
                    onChange={(e) => handleAccessibilityCheckboxChange(accessType, e.target.checked)}
                    sx={{
                      color: '#E5E7EB',
                      '&.Mui-checked': {
                        color: '#1958F7',
                      },
                    }}
                  />
                }
                label={accessType}
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '14px',
                  },
                }}
              />
            ))}
          </FormGroup>
        </Box>

        {/* Number of Trips Filter */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              mb: 2,
              fontSize: '16px',
            }}
          >
            Number of Trips
          </Typography>
          <TextField
            placeholder="Enter trips"
            value={tripsInput}
            onChange={handleTripsInputChange}
            type="number"
            inputProps={{ min: 0 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontFamily: 'Poppins, sans-serif',
                '& fieldset': {
                  borderColor: '#E5E7EB',
                },
                '&:hover fieldset': {
                  borderColor: '#D1D5DB',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1958F7',
                },
              },
              '& .MuiInputBase-input': {
                fontFamily: 'Poppins, sans-serif',
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#9CA3AF',
                opacity: 1,
              },
            }}
          />
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              px: 3,
              py: 1,
              fontFamily: 'Poppins, sans-serif',
              borderColor: '#E5E7EB',
              color: '#6B7280',
              '&:hover': {
                borderColor: '#D1D5DB',
                backgroundColor: '#F9FAFB',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              px: 3,
              py: 1,
              fontFamily: 'Poppins, sans-serif',
              backgroundColor: '#1958F7',
              '&:hover': {
                backgroundColor: '#1947D1',
              },
            }}
          >
            Apply
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default AnalyticsFilterModal;