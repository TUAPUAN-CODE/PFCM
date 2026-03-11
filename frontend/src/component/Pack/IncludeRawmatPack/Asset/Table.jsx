import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography, styled } from '@mui/material';
import { LiaShoppingCartSolid } from 'react-icons/lia';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import { SlClose } from "react-icons/sl";
import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";
import DeleteIcon from "@mui/icons-material/Delete";
import { io } from "socket.io-client";
import { Button } from '@mui/material';
const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true
});

const CUSTOM_COLUMN_WIDTHS = {
  delayTime: '180px',
  cart: '70px',
  complete: '70px',
  edit: '70px',
  delete: '70px'
};

const Row = ({
  row,
  columnWidths,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenModal4,
  handleOpenDeleteModal,
  handleOpenSuccess,
  selectedColor,
  openRowId,
  setOpenRowId,
  index
}) => {
  const isOpen = openRowId === row.rmfp_id;
  
  // const { 
  //   rmfp_id, mapping_id, dest, stay_place, rm_type_id, 
  //   tro_id, qc_id, receiver, receiver_qc,
  //   ...displayRow 
  // } = row;
  
  const displayColumns = [
    'batch_after',
    'mat',
    'mat_name',
    'weight_RM',
    'level_eu',
    'production',
    'rm_status',
    'qc_date'
  ];
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";
  
  return (
    <>
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
      <TableRow>
     {displayColumns.map((key, idx) => (
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
            {row[key] || '-'}
          </TableCell>
        ))}
        
        {/* ปุ่มลบ */}
        <EditActionCell
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDeleteModal(row);
          }}
          icon={<DeleteIcon style={{ color: '#ff0000ff', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
    </>
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
        borderRight: '1px solid #e0e0e0',
        borderTopRightRadius: "8px",
        borderBottomRightRadius: "8px",
        height: '40px',
        padding: '0px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#ff0000ff';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#ff0000ff';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#ff0000ff';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#ff0000ff';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const TableMainPrep = ({ 
  handleOpenModal, 
  data, 
  handleRowClick, 
  handleOpenEditModal,
  handleOpenModal4, 
  handleOpenSuccess, 
  handleOpenDeleteModal,
  handleOpenEditLineModal,
  onConfirmRow,
  handleOpenAddModal,
  checkTroId,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);
  const [rows, setRows] = useState(data);

  useEffect(() => {
    socket.on("dataUpdated", (updatedData) => {
      setRows(updatedData);
    });

    return () => {
      socket.off("dataUpdated");
    };
  }, []);

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

  // const columns = Object.keys(data[0] || {}).filter(key => 
  //   key !== 'rmfp_id' && 
  //   key !== 'mapping_id' && 
  //   key !== 'dest' && 
  //   key !== 'stay_place' && 
  //   key !== 'rm_type_id' && 
  //   key !== 'tro_id' && 
  //   key !== 'qc_id' && 
  //   key !== 'receiver' && 
  //   key !== 'receiver_qc'
  // );

  // ✅ ใหม่ - กำหนดคอลัมน์ที่ต้องการแสดงอย่างชัดเจน
const columns = [
  'batch',           // Batch
  'mat',             // Material
  'mat_name',        // รายชื่อวัตถุดิบ
  'weight_RM',       // น้ำหนัก (หรืออาจเป็น weight_total, totalWeight ขึ้นกับข้อมูลจริง)
  'level_eu',        // level Eu
  'production',      // แผนการผลิต (หรืออาจเป็น code)
  'status',          // สถานะวัตถุดิบ (ตรวจสอบชื่อฟิลด์จริงในข้อมูล)
  'qc_datetime'      // เวลา QC ตรวจสอบ (ตรวจสอบชื่อฟิลด์จริงในข้อมูล)
];
  
  const totalCustomWidth = Object.values(CUSTOM_COLUMN_WIDTHS).reduce((sum, width) => sum + parseInt(width), 0);
  const remainingWidth = `calc((100% - ${totalCustomWidth}px) / ${columns.length})`;
  const columnWidths = Array(columns.length).fill(remainingWidth);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          paddingX: 2,
          height: { xs: 'auto', sm: '60px' },
          margin: '5px 5px',
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
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
              sx: { height: '40px' },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                height: '40px',
                fontSize: '14px',
                borderRadius: '8px',
                color: '#787878',
              },
              "& input": {
                padding: '8px',
              },
            }}
          />
        </Box>

        <Button
          variant="contained"
          color="success"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenModal4();
          }}
          sx={{
            height: '40px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
            fontSize: '14px',
            paddingX: 10,
          }}
        >
          ผสมวัตถุดิบ
        </Button>
      </Box>

      <TableContainer 
        style={{ padding: '0px 20px' }} 
        sx={{ 
          height: 'calc(68vh)', 
          overflowY: 'auto', 
          whiteSpace: 'nowrap', 
          '@media (max-width: 1200px)': { 
            overflowX: 'scroll', 
            minWidth: "200px" 
          } 
        }}
      >
        <Table stickyHeader style={{ tableLayout: 'auto' }} sx={{ minWidth: '1270px', width: 'max-content' }}>
          <TableHead style={{ marginBottom: "10px" }}>
            <TableRow sx={{ height: '40px' }}>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px", border: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>Batch</Box>
              </TableCell>
              
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>Material</Box>
              </TableCell>
              
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>รายชื่อวัตถุดิบ</Box>
              </TableCell>
              
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>น้ำหนัก</Box>
              </TableCell>
              
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>level Eu</Box>
              </TableCell>
              
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>แผนการผลิต</Box>
              </TableCell>
              
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>สถานะวัตถุดิบ</Box>
              </TableCell>
              
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>เวลา QC ตรวจสอบ</Box>
              </TableCell>
              
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopRightRadius: "8px", borderBottomRightRadius: "8px", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: "80px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ลบข้อมูล</Box>
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
                  handleOpenModal4={handleOpenModal4}
                  handleOpenDeleteModal={handleOpenDeleteModal}
                  handleOpenSuccess={handleOpenSuccess}
                  selectedColor={selectedColor}
                  openRowId={openRowId}
                  index={index}
                  setOpenRowId={setOpenRowId}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
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