import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, TablePagination } from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PrintIcon from "@mui/icons-material/Print";
import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";
import { io } from "socket.io-client";
const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
  reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
  autoConnect: true
});

const CUSTOM_COLUMN_WIDTHS = {
  print: '70px',
};

const StatusBadge = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case "รอQC ตรวจสอบ":
        return { bg: '#FFF7E1', color: '#B78103', icon: '⏳' };
      case "รอห้องเย็นรับเข้า":
        return { bg: '#E8F5FF', color: '#0072E5', icon: '❄️' };
      case "รอบรรจุรับ":
        return { bg: '#E5F6FE', color: '#0184C7', icon: '📦' };
      case "QC ส่งกลับมาแก้ไข":
        return { bg: '#FEE7E7', color: '#D32F2F', icon: '⚠️' };
      case "รออบเสร็จ":
        return { bg: '#EDF7ED', color: '#1E7A26', icon: '♨️' };
      default:
        return { bg: '#F5F5F5', color: '#717171', icon: '•' };
    }
  };

  const style = getStatusStyle();

  return (
    <div style={{
      backgroundColor: style.bg,
      color: style.color,
      borderRadius: '20px',
      padding: '4px 12px',
      fontSize: '13px',
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      whiteSpace: 'nowrap'
    }}>
      <span>{style.icon}</span>
      <span>{status}</span>
    </div>
  );
};

const Row = ({
  row,
  handleOpenPrintModal,
  index
}) => {
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";

  const rowId = `${row.rmfp_id}_${row.mapping_id}_${index}`;
  return (
    <>
      <TableRow key={`spacer_top_${rowId}`}>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>
      <TableRow key={`content_${rowId}`}>
        <TableCell
          align="center"
          style={{
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: "1px solid #e0e0e0",
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px',
            height: '40px',
            lineHeight: '1.5',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.batch || '-'}
        </TableCell>
        <TableCell
          align="center"
          style={{
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: "1px solid #f2f2f2",
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px',
            height: '40px',
            lineHeight: '1.5',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.mat || '-'}
        </TableCell>
        <TableCell
          style={{
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: "1px solid #f2f2f2",
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px',
            height: '40px',
            lineHeight: '1.5',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor,
            textAlign: "center"
          }}
        >
          {row.mat_name || '-'}
        </TableCell>
        <TableCell
          align="center"
          style={{
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: "1px solid #f2f2f2",
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px',
            height: '40px',
            lineHeight: '1.5',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.production || '-'}
        </TableCell>
        <TableCell
          align="center"
          style={{
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: "1px solid #f2f2f2",
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px',
            height: '40px',
            lineHeight: '1.5',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.tro_id || '-'}
        </TableCell>
        <TableCell
          align="center"
          style={{
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: "1px solid #f2f2f2",
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px',
            height: '40px',
            lineHeight: '1.5',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.level_eu || '-'}
        </TableCell>
        <TableCell
          align="center"
          style={{
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: "1px solid #f2f2f2",
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px',
            height: '40px',
            lineHeight: '1.5',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.weight_RM || '-'}
        </TableCell>
        <TableCell
          align="center"
          style={{
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: "1px solid #f2f2f2",
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px',
            height: '40px',
            lineHeight: '1.5',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.tray_count || '-'}
        </TableCell>
        <TableCell
          align="center"
          style={{
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            borderLeft: "1px solid #f2f2f2",
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px',
            height: '40px',
            lineHeight: '1.5',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {(() => {
            const { dest, rm_status } = row;

            if (rm_status === "รอQCตรวจสอบ") {
              return <StatusBadge status="รอQC ตรวจสอบ" />;
            } else if (rm_status === "QcCheck" || rm_status === "รอกลับมาเตรียม") {
              if (dest === "เข้าห้องเย็น") {
                return <StatusBadge status="รอห้องเย็นรับเข้า" />;
              } else if (dest === "ไปบรรจุ") {
                return <StatusBadge status="รอบรรจุรับ" />;
              }
            } else if (rm_status === "QcCheck รอแก้ไข") {
              return <StatusBadge status="QC ส่งกลับมาแก้ไข" />;
            } else if (rm_status === "ปกติ" && dest === "หม้ออบ") {
              return <StatusBadge status="รออบเสร็จ" />;
            }
            return <StatusBadge status="-" />;
          })()}
        </TableCell>
        <PrintActionCell
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPrintModal(row);
          }}
          icon={<PrintIcon style={{ color: '#28a745', fontSize: '20px' }} />}
          backgroundColor={backgroundColor}
        />
      </TableRow>
      <TableRow key={`spacer_bottom_${rowId}`}>
        <TableCell style={{ padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>
    </>
  );
};

const PrintActionCell = ({ width, onClick, icon, backgroundColor }) => {
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
        e.currentTarget.style.backgroundColor = '#28a745';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#28a745';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#28a745';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#28a745';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const TableMainPrep = ({
  handleOpenModal1,
  data = [],
  handleRowClick,
  handleOpenEditModal,
  handleOpenSuccess,
  handleOpenPrintModal,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    if (!isLoading && Array.isArray(data)) {
      const filtered = data.filter(row => {
        if (!row) return false;

        // กรองตาม searchTerm
        const matchesSearch = Object.values(row).some(
          value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );

        return matchesSearch;
      });

      setFilteredRows(filtered);
      // Reset page when data changes
      setPage(0);
    } else {
      setFilteredRows([]);
    }
  }, [data, searchTerm, isLoading]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const columns = [
    'batch', 'mat', 'mat_name', 'production', 'tro_id',
    'level_eu', 'weight_RM', 'tray_count', 'status'
  ];

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
      <Box sx={{ padding: '16px 24px' }}>
        <TextField
          variant="outlined"
          fullWidth
          placeholder="พิมพ์เพื่อค้นหา..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#787878' }} />
              </InputAdornment>
            ),
            sx: { 
              height: "45px",
              backgroundColor: '#f8f9fa',
              '&:hover': {
                backgroundColor: '#f3f4f6',
              },
              '&.Mui-focused': {
                backgroundColor: '#ffffff',
              }
            },
          }}
          sx={{
            maxWidth: '400px',
            "& .MuiOutlinedInput-root": {
              fontSize: "14px",
              borderRadius: "8px",
              color: "#787878",
              '& fieldset': {
                borderColor: '#e0e0e0',
              },
              '&:hover fieldset': {
                borderColor: '#b8b8b8',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
              },
            },
            "& input": {
              padding: "8px",
            },
          }}
        />
      </Box>

      <TableContainer style={{ padding: '0px 20px' }} sx={{
        height: 'calc(68vh)',
        overflowY: 'auto',
        whiteSpace: 'nowrap',
        '@media (max-width: 1200px)': {
          overflowX: 'scroll',
          minWidth: "200px"
        }
      }}>
        {isLoading ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            <div>Loading...</div>
          </Box>
        ) : (
          <Table stickyHeader style={{ tableLayout: 'auto' }} sx={{ minWidth: '1270px', width: 'max-content' }}>
            <TableHead style={{ marginBottom: "10px" }}>
              <TableRow sx={{ height: '40px' }}>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px", border: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>Batch</Box>
                </TableCell>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>Material</Box>
                </TableCell>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "400px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>รายชื่อวัตถุดิบ</Box>
                </TableCell>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "100px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>แผนการผลิต</Box>
                </TableCell>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "150px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>ป้ายทะเบียน</Box>
                </TableCell>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "150px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>Level Eu</Box>
                </TableCell>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "150px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>น้ำหนัก/รถเข็น</Box>
                </TableCell>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "100px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>จำนวนถาด</Box>
                </TableCell>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "200px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>สถานะวัตถุดิบ</Box>
                </TableCell>
                <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopRightRadius: "8px", borderBottomRightRadius: "8px", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: "80px" }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>พิมพ์</Box>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
              {filteredRows.length > 0 ? (
                filteredRows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => {
                    // สร้าง unique key โดยรวม rmfp_id, mapping_id และ index
                    const uniqueKey = `${row.rmfp_id}_${row.mapping_id}_${index}`;
                    return (
                      <Row
                        key={uniqueKey}
                        row={row}
                        handleOpenPrintModal={handleOpenPrintModal}
                        index={index}
                      />
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6H16V4C16 2.89 15.11 2 14 2H10C8.89 2 8 2.89 8 4V6H4C2.89 6 2 6.89 2 8V19C2 20.11 2.89 21 4 21H20C21.11 21 22 20.11 22 19V8C22 6.89 21.11 6 20 6ZM10 4H14V6H10V4ZM20 19H4V8H20V19Z" fill="#919EAB" />
                        <path d="M12 10L8 14H11V18H13V14H16L12 10Z" fill="#919EAB" />
                      </svg>
                      <div>ไม่มีรายการวัตถุดิบในขณะนี้</div>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {!isLoading && (
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
          labelRowsPerPage="แถวต่อหน้า:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
        />
      )}
    </Paper>
  );
};

export default TableMainPrep;