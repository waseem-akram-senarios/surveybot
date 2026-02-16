import React from 'react';
import {
  Box,
  TextField,
  Typography,
  InputAdornment,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '../../assets/Search.svg';

const SearchBar = ({ 
  title,
  searchValue, 
  onSearchChange, 
  placeholder = "Search",
  itemCount,
  isMobile: propIsMobile
}) => {
  const mediaQueryIsMobile = useMediaQuery("(max-width: 600px)");
  const isMobile = propIsMobile !== undefined ? propIsMobile : mediaQueryIsMobile;

  const handleSearchChange = (event) => {
    const value = event.target.value;
    if (onSearchChange && typeof onSearchChange === 'function') {
      onSearchChange(value);
    }
  };

  const displayTitle = itemCount !== undefined ? `${title} (${itemCount})` : title;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 2,
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <Typography
        sx={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 500,
          fontSize: "18px",
          lineHeight: "100%",
          color: "#1E1E1E",
          mb: 1,
        }}
      >
        {displayTitle}
      </Typography>

      <TextField
        size="small"
        placeholder={placeholder}
        value={searchValue || ''}
        onChange={handleSearchChange}
        variant="outlined"
        fullWidth={isMobile}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <img src={SearchIcon} alt="Search" />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: isMobile ? 2 : 0,
          "& .MuiOutlinedInput-root": {
            borderRadius: "12px",
            height: "36px",
            backgroundColor: "#fff",
            fontSize: "12px",
            color: "#7D7D7D",
            border: "1px solid #f0f0f0",
            paddingRight: "8px",
            "& fieldset": { border: "none" },
          },
        }}
      />
    </Box>
  );
};

export default SearchBar;