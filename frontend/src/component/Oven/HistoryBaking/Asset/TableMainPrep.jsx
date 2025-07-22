import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography, styled } from '@mui/material';
import { LiaShoppingCartSolid } from 'react-icons/lia';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import { SlClose } from "react-icons/sl";
import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";
const API_URL = import.meta.env.VITE_API_URL;


const CUSTOM_COLUMN_WIDTHS = {
  delayTime: '180px',
  cart: '70px',
  complete: '70px',
  edit: '70px'
};

const calculateTimeDifference = (cookedDateTime) => {
  const cookedTime = new Date(cookedDateTime);
  const currentDate = new Date();
  return (currentDate - cookedTime) / (1000 * 60);
};

const formatTime = (minutes) => {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.floor(minutes % 60);

  let timeString = '';
  if (days > 0) timeString += `${days} วัน`;
  if (hours > 0) timeString += ` ${hours} ชม.`;
  if (mins > 0) timeString += ` ${mins} นาที`;
  return timeString.trim();
};

const getStatusMessage = (timeRemaining) => {
  return timeRemaining > 0
    ? `เหลืออีก ${formatTime(timeRemaining)}`
    : `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;
};

const getBorderColor = (percentage) => {
  if (percentage >= 100) return '#FF8175'; // สีแดง - 100% ขึ้นไป
  if (percentage >= 50) return '#FFF398'; // สีเหลือง - 50-99%
  return '#80FF75'; // สีเขียว - 1-49%
};

const Row = ({
  row,
  columnWidths,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenSuccess,
  selectedColor,
  openRowId,
  setOpenRowId
}) => {
  const timePassed = calculateTimeDifference(row.CookedDateTime);
  const oven_to_coldMinutes = row.oven_to_cold * 60;
  const percentage = (timePassed / oven_to_coldMinutes) * 100;
  const timeRemaining = oven_to_coldMinutes - timePassed;
  const statusMessage = getStatusMessage(timeRemaining);
  const borderColor = getBorderColor(percentage);

  const colorMatch = (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175');

  if (selectedColor && !colorMatch) return null;

  const isOpen = openRowId === row.rmfp_id;
  const { rmfp_id, oven_to_cold, ...displayRow } = row;

  return (
    <>
      <TableRow >
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>
      <TableRow onClick={() => {
        setOpenRowId(isOpen ? null : row.rmfp_id);
        handleRowClick(row.rmfp_id);
      }}>
        <TableCell style={{
          width: CUSTOM_COLUMN_WIDTHS.delayTime,
          textAlign: 'center',
          borderTop: '1px solid #e0e0e0',
          borderBottom: '1px solid #e0e0e0',
          height: '40px',
          padding: '0px 5px',
          borderRight: "0px solid #e0e0e0",
          borderTopLeftRadius: "8px",
          borderBottomLeftRadius: "8px",
          borderLeft: `5px solid ${borderColor}`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '13px',
            height: '100%',
            color: percentage >= 100 ? 'red' : percentage >= 50 ? 'orange' : 'green',
          }}>
            {statusMessage}
          </div>
        </TableCell>
        {Object.values(displayRow).map((value, idx) => (
          <TableCell
            key={idx}
            align="center"
            style={{
              width: columnWidths[idx],
              borderLeft: "1px solid #f2f2f2",
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '14px',
              height: '40px',
              lineHeight: '1.5',
              padding: '0px 10px',
              color: "#787878",
            }}
          >
            {value || '-'}
          </TableCell>
        ))}
        <CartActionCell
          width={CUSTOM_COLUMN_WIDTHS.cart}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenModal(row);
          }}
          icon={<LiaShoppingCartSolid style={{ color: '#007BFF', fontSize: '25px' }} />}
        />
        <CompleteActionCell
          width={CUSTOM_COLUMN_WIDTHS.complete}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenSuccess(row);
          }}
          icon={<FaRegCheckCircle style={{ color: '#26c200', fontSize: '20px' }} />}
        />
        <EditActionCell
          width={CUSTOM_COLUMN_WIDTHS.edit}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditModal(row);
          }}
          icon={<EditIcon style={{ color: '#edc026', fontSize: '22px' }} />}
        />
      </TableRow>

      <TableRow >
        <TableCell style={{ padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>

    </>
  );
};

const CartActionCell = ({ width, onClick, icon }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderLeft: '1px solid #f2f2f2',
        height: '40px',
        padding: '0px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#007BFF';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.querySelector('svg').style.color = '#007BFF';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#007BFF';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.querySelector('svg').style.color = '#007BFF';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const CompleteActionCell = ({ width, onClick, icon }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderLeft: '1px solid #f2f2f2',
        height: '40px',
        padding: '0px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#54e032';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.querySelector('svg').style.color = '#26c200';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#54e032';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.querySelector('svg').style.color = '#26c200';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const EditActionCell = ({ width, onClick, icon }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderLeft: '1px solid #f2f2f2',
        height: '40px',
        padding: '0px',
        borderRight: "1px solid #e0e0e0",
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
        borderTopRightRadius: "8px",
        borderBottomRightRadius: "8px"
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#edc026';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.querySelector('svg').style.color = '#edc026';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#edc026';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.querySelector('svg').style.color = '#edc026';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const TableMainPrep = ({ handleOpenModal, data, handleRowClick, handleOpenEditModal, handleOpenSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);

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
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const handleFilterChange = (color) => {
    setSelectedColor(color === selectedColor ? '' : color);
  };

  const columns = Object.keys(data[0] || {}).filter(key => key !== 'rmfp_id' && key !== 'oven_to_cold');
  const totalCustomWidth = Object.values(CUSTOM_COLUMN_WIDTHS).reduce((sum, width) => sum + parseInt(width), 0);
  const remainingWidth = `calc((100% - ${totalCustomWidth}px) / ${columns.length})`;
  const columnWidths = Array(columns.length).fill(remainingWidth);

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
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-start" }}>
          {['green', 'yellow', 'red'].map((color) => (
            <FilterButton
              key={color}
              color={color}
              selectedColor={selectedColor}
              onClick={() => handleFilterChange(color)}
            />
          ))}
        </Box>
      </Box>
      <TableContainer style={{ padding: '0px 20px' }} sx={{ height: 'calc(68vh)', overflowY: 'auto', whiteSpace: 'nowrap', '@media (max-width: 1200px)': { overflowX: 'scroll', minWidth: "200px" } }}>
        <Table stickyHeader style={{ tableLayout: 'auto' }} sx={{ minWidth: '1270px', width: 'max-content' }}>
          <TableHead style={{ marginBottom: "10px" }}>
            <TableRow sx={{ height: '40px' }}>
              <TableCell align="center" style={{ borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', borderLeft: "1px solid #e0e0e0", padding: '5px', width: CUSTOM_COLUMN_WIDTHS.delayTime }}>
                <Box style={{ fontSize: '12px' }}>DelayTime</Box>
              </TableCell>
              {columns.map((key, index) => (
                <TableCell key={index} align="center" style={{ borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: columnWidths[index] }}>
                  <Box style={{ fontSize: '12px' }}>{key}</Box>
                </TableCell>
              ))}
              <TableCell align="center" style={{ width: CUSTOM_COLUMN_WIDTHS.cart, borderLeft: "0px solid ", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>รถเข็น</Box>
              </TableCell>
              <TableCell align="center" style={{ width: CUSTOM_COLUMN_WIDTHS.complete, borderLeft: "0px solid ", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>เสร็จสิ้น</Box>
              </TableCell>
              <TableCell align="center" style={{ width: CUSTOM_COLUMN_WIDTHS.edit, borderTopRightRadius: "8px", borderBottomRightRadius: "8px", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>แก้ไข</Box>
              </TableCell>
            </TableRow>
          </TableHead>
         <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
                     {filteredRows.length > 0 ? (
                       filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                         <Row
                           key={index}
                           row={row}
                           columnWidths={columnWidths}
                           handleOpenModal={handleOpenModal}
                           handleRowClick={handleRowClick}
                           handleOpenEditModal={handleOpenEditModal}
                           handleOpenSuccess={handleOpenSuccess}
                           selectedColor={selectedColor}
                           openRowId={openRowId}
                           setOpenRowId={setOpenRowId}
                         />
                       ))
                     ) : (
                       <TableRow>
                         <TableCell colSpan={columns.length + 4} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
                           ไม่มีรายการวัตถุดิบในขณะนี้ 
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        sx={{
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar": {
            fontSize: '10px',
            color: "#787878",
            padding: "0px",
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
    </Paper>
  );
};

const FilterButton = ({ color, selectedColor, onClick }) => {
  const [isHovered, setHovered] = useState(false);

  const colors = {
    green: { default: "#54e032", hover: "#6eff42", selected: "#54e032" },
    yellow: { default: "#f0cb4d", hover: "#ffdf5d", selected: "#f0cb4d" },
    red: { default: "#ff4444", hover: "#ff6666", selected: "#ff4444" },
  };

  const isSelected = selectedColor === color;
  const noSelection = selectedColor == null;
  const currentColor = colors[color];

  const baseStyle = {
    border: isSelected
      ? `2px solid ${currentColor.selected}`
      : `1px solid ${isHovered ? currentColor.hover : "#e0e0e0"}`,
    padding: 6,
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    backgroundColor: isSelected
      ? "transparent"
      : isHovered
        ? currentColor.hover
        : currentColor.default,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  return (
    <div
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: currentColor.selected,
            opacity: 0.2,
            zIndex: 0,
          }}
        />
      )}

      <FaRegCircle
        style={{
          color: isSelected
            ? currentColor.selected
            : noSelection
              ? "#ffffff"
              : "#ffffff",
          fontSize: 24,
          transition: "color 0.2s ease-in-out",
          position: "relative",
          zIndex: 1,
          opacity: isSelected ? 1 : 0.9,
        }}
      />
    </div>
  );
};


export default TableMainPrep;