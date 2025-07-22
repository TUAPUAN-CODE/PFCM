import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography, styled } from '@mui/material';
import { LiaShoppingCartSolid } from 'react-icons/lia';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import { SlClose } from "react-icons/sl";
import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";

const CUSTOM_COLUMN_WIDTHS = {
  delayTime: '180px',
  cart: '70px',
  complete: '70px',
  edit: '70px'
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
  setOpenRowId,
  index
}) => {
  const isOpen = openRowId === row.mapping_id;
  const { rmfp_id, stay_place, dest, rm_type_id, mapping_id, remark_qc, rm_status, oven_to_cold, qccheck_cold, remark_rework, remark_rework_cold, ...displayRow } = row;
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";

  // Create a new display object with the correct column order and values
  const formattedDisplayRow = {
    batch_after: displayRow.batch_after,
    mat: displayRow.mat,
    mat_name: displayRow.mat_name,
    production: displayRow.production,
    tro_id: displayRow.tro_id,
    weight_RM: displayRow.weight_RM ? Number(displayRow.weight_RM).toFixed(2) : '-',// Display weight in the weight column
    tray_count: displayRow.tray_count, // Display tray count in the tray count column
    level_eu: displayRow.level_eu,
    CookedDateTime: displayRow.CookedDateTime
  };

  return (
    <>
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>
      <TableRow
        onClick={() => {
          setOpenRowId(isOpen ? null : row.mapping_id);
          handleRowClick(row.mapping_id);
        }}
        sx={{ cursor: 'pointer' }}
      >
        {Object.values(formattedDisplayRow).map((value, idx) => (
          <TableCell
            key={idx}
            align="center"
            style={{
              width: columnWidths[idx],
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
              borderLeft: idx === 0 ? "1px solid #e0e0e0" : "1px solid #f2f2f2",
              borderTopLeftRadius: idx === 0 ? "8px" : "0px",
              borderBottomLeftRadius: idx === 0 ? "8px" : "0px",
              backgroundColor: backgroundColor
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
          backgroundColor={backgroundColor}
        />

        <EditActionCell
          width={CUSTOM_COLUMN_WIDTHS.edit}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditModal({
              ...row,
              mapping_id: row.mapping_id,
              rmfp_id: row.rmfp_id,
              line_name: row.line_name,
            });
          }}
          icon={<EditIcon style={{ color: '#edc026', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: 0, border: 'none', }} colSpan={Object.keys(formattedDisplayRow).length + 3}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, borderRadius: '8px', overflow: 'hidden', borderTop: '1px solid #ececec', borderLeft: '1px solid #ececec', borderBottom: "1px solid #ececec", borderRight: '1px solid #ececec', maxWidth: '100%', }}>
              <Table size="small" aria-label="purchases" sx={{ width: '100%', }}>
                <TableHead>
                  <TableRow style={{ backgroundColor: "#F9F9F9" }}>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px" }}>สถานะ</TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "200px" }}>หมายเหตุ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>
                      {row.rm_status === "QcCheck รอแก้ไข" ? "QC ตรวจสอบแล้วส่งกลับมาแก้ไข" : row.rm_status || '-'}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', verticalAlign: 'middle', color: "#787878" }}>
                      {row.remark_qc ? row.remark_qc : row.remark ? row.remark : '-'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const CartActionCell = ({ width, onClick, icon, backgroundColor }) => {
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
        transition: 'background-color 0.2s ease-in-out',
        backgroundColor: backgroundColor,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#007BFF';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#007BFF';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#007BFF';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#007BFF';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const EditActionCell = ({ width, onClick, icon, backgroundColor }) => {
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
        borderBottomRightRadius: "8px",
        backgroundColor: backgroundColor,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#edc026';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#edc026';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#edc026';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#edc026';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
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

  // Define the columns in the correct order
  const columns = [
    'batch_after',
    'mat',
    'mat_name',
    'production',
    'tro_id',
    'weight_RM',
    'tray_count',
    'level_eu',
    'CookedDateTime'
  ];

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
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px", border: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: "100px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>Batch</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "100px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>Material</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "400px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>รายชื่อวัตถุดิบ</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "160px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>แผนการผลิต</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "120px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ป้ายทะเบียน</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "100px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>น้ำหนัก</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "120px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>จำนวนถาด</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "100px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>Level Eu</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>เวลาต้ม/อบเสร็จ</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderLeft: "0px solid ", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "80px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>รถเข็น</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopRightRadius: "8px", borderBottomRightRadius: "8px", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: "80px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>แก้ไข</Box>
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
                  index={index}
                  setOpenRowId={setOpenRowId}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 3} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
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

export default TableMainPrep;