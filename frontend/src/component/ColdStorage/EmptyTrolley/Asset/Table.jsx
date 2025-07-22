import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, TablePagination, Typography } from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FaRegCircle } from "react-icons/fa";
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import ConfirmationModal from './ConfirmationModal';

const CUSTOM_COLUMN_WIDTHS = {
  trolleyId: '150px',
  csName: '200px',
  slotId: '200px',
  clear: '100px'
};

const Row = ({
  row,
  handleOpenConfirmModal,
  index
}) => {
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";

  return (
    <>
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
      
      <TableRow>
        {/* หมายเลขรถเข็น */}
        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.trolleyId,
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px 10px',
            color: "#787878",
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
            backgroundColor: backgroundColor
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <HourglassBottomIcon style={{ color: '#4CAF50', fontSize: '20px' }} />
            <span>{row.tro_id || '-'}</span>
          </div>
        </TableCell>

        {/* พื้นที่จอด */}
        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.csName,
            borderLeft: "1px solid #f2f2f2",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.cs_name || '-'}
        </TableCell>
          
        {/* ห้องที่จอด */}
        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.slotId,
            borderLeft: "1px solid #f2f2f2",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.slot_id || '-'}
        </TableCell>

        {/* เคลียร์รถเข็น */}
        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.clear,
            borderLeft: "1px solid #f2f2f2",
            borderRight: "1px solid #e0e0e0",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px',
            color: "#787878",
            borderTopRightRadius: "8px",
            borderBottomRightRadius: "8px",
            backgroundColor: backgroundColor,
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
          onClick={() => handleOpenConfirmModal(row.tro_id)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = backgroundColor}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ 
                color: '#ff4444',
                transition: 'transform 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </div>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
    </>
  );
};

const TableMainPrep = ({ data, handleClearTrolley, handleOpenModal, handleRowClick, handleOpenEditModal, handleOpenSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedTrolleyId, setSelectedTrolleyId] = useState(null);

  useEffect(() => {
    setFilteredRows(
      data.filter((row) =>
        Object.values(row).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }, [searchTerm, data]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (color) => {
    setSelectedColor(color === selectedColor ? '' : color);
  };

  const handleOpenConfirmModal = (trolleyId) => {
    setSelectedTrolleyId(trolleyId);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
  };

  const handleConfirmClearTrolley = (trolleyId) => {
    handleClearTrolley(trolleyId);
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 1, paddingX: 2, height: { xs: 'auto', sm: '60px' }, margin: '5px 5px' }}>
        <TextField
          variant="outlined"
          fullWidth
          placeholder="พิมพ์เพื่อค้นหา..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: { height: "40px" },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              height: "40px",
              fontSize: "14px",
              borderRadius: "8px",
              color: "#787878",
            },
            "& input": {
              padding: "8px",
            },
          }}
        />
       
      </Box>
      <TableContainer sx={{ height: 'calc(68vh)', overflowY: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ height: '40px' }}>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px", border: "1px solid #e0e0e0", fontSize: '16px', color: '#ffffff', padding: '5px', width: CUSTOM_COLUMN_WIDTHS.trolleyId }}>
                หมายเลขรถเข็น
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", border: "1px solid #e0e0e0", fontSize: '16px', color: '#ffffff', padding: '5px', width: CUSTOM_COLUMN_WIDTHS.csName }}>
                ห้องที่จอด
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", border: "1px solid #e0e0e0", fontSize: '16px', color: '#ffffff', padding: '5px', width: CUSTOM_COLUMN_WIDTHS.slotId }}>
                พื้นที่จอด
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopRightRadius: "8px", borderBottomRightRadius: "8px", border: "1px solid #e0e0e0", fontSize: '16px', color: '#ffffff', padding: '5px', width: CUSTOM_COLUMN_WIDTHS.clear }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>เคลียร์รถเข็น</span>
                </div>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length > 0 ? (
              filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <Row
                  key={index}
                  row={row}
                  handleOpenConfirmModal={handleOpenConfirmModal}
                  index={index}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
                  ไม่มีรายการรถเข็นในขณะนี้
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        sx={{
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar": {
            fontSize: '14px',
            color: "#787878",
          }
        }}
        rowsPerPageOptions={[20, 50, 100]}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* หน้าต่างยืนยันการเคลียร์รถเข็น */}
      <ConfirmationModal 
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmClearTrolley}
        trolleyId={selectedTrolleyId}
      />
    </Paper>
  );
};

export default TableMainPrep;