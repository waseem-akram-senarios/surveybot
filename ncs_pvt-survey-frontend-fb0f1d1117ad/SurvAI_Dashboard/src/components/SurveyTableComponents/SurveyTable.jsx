import React, { useState } from "react";
import {
  Box,
  useMediaQuery,
} from "@mui/material";
import SearchBar from "./SearchBar";
import MobileTableCard from "./MobileTableCard";
import DesktopTable from "./DesktopTable";
import TablePagination from "./TablePagination";
import { filterData, sortData, paginateData } from "../../utils/Surveys/surveyTableHelpers";

const DashboardTable = ({ tableData = [], loading, error, onRowClick }) => {
  console.log('DashboardTable props:', { tableData, loading, error, onRowClick });
  
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("LaunchDate"); 
  const [order, setOrder] = useState("desc"); 
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);

  const isMobile = useMediaQuery("(max-width: 600px)");

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleRowClick = (item) => {
    console.log('Row clicked:', item);
    if (onRowClick) {
      console.log('Calling onRowClick with:', item);
      onRowClick(item);
    } else {
      console.log('No onRowClick function provided');
    }
  };

  // Data processing
  const filteredData = filterData(tableData, search);
  const sortedData = sortData(filteredData, orderBy, order);
  const paginatedData = paginateData(sortedData, page, rowsPerPage);

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        p: isMobile ? 2 : 4,
        borderRadius: "20px",
      }}
    >
      <SearchBar
        title="Active Surveys"
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search survey"
      />

      {isMobile ? (
        <Box>
          {paginatedData.map((item) => (
            <MobileTableCard
              key={item.SurveyId}
              item={item}
              onItemClick={handleRowClick}
            />
          ))}
        </Box>
      ) : (
        <DesktopTable
          data={paginatedData}
          onItemClick={handleRowClick}
          orderBy={orderBy}
          order={order}
          onSort={handleSort}
        />
      )}

      <TablePagination
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        page={page}
        onPageChange={setPage}
        totalItems={sortedData.length}
      />
    </Box>
  );
};

export default DashboardTable;