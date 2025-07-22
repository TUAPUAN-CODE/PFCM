import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography, styled } from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";
import { io } from "socket.io-client";
const API_URL = import.meta.env.VITE_API_URL;
const socket = io(`http://${API_URL}:3000`);
// Replace the existing calculateTimeDifference, formatTime, and getRowStatus functions with these:

const calculateTimeDifference = (dateString) => {
  if (!dateString || dateString === '-') return 0;
  
  const effectiveDate = new Date(dateString);
  const currentDate = new Date();
  const diffInMinutes = (currentDate - effectiveDate) / (1000 * 60);
  return diffInMinutes > 0 ? diffInMinutes : 0;
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

const getLatestColdRoomExitDate = (row) => {
  // Check cold room 3 first, then 2, then 1
  if (row.out_cold_date_three && row.out_cold_date_three !== '-') {
    return row.out_cold_date_three;
  } else if (row.out_cold_date_two && row.out_cold_date_two !== '-') {
    return row.out_cold_date_two;
  } else if (row.out_cold_date && row.out_cold_date !== '-') {
    return row.out_cold_date;
  }
  return '-';
};

const parseTimeValue = (timeStr) => {
  if (!timeStr || timeStr === '-') return null;
  
  // Convert string like "2.30" to hours and minutes (2 hours and 30 minutes)
  const timeParts = timeStr.split('.');
  const hours = parseInt(timeParts[0], 10);
  const minutes = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
  
  // Return time in minutes
  return hours * 60 + minutes;
};

const getRowStatus = (row) => {

  // For mixed items, use mix_time and mixed_date
  if (row.mix_code) {
    const referenceDate = row.mixed_date || row.rmit_date;
    const elapsedMinutes = calculateTimeDifference(referenceDate);
    const mixTimeMinutes = parseTimeValue(row.mix_time) || 0;
    const timeRemaining = mixTimeMinutes - elapsedMinutes;
    const percentage = (elapsedMinutes / mixTimeMinutes) * 100;

    let statusMessage, borderColor;
    if (timeRemaining > 0) {
      statusMessage = `เหลืออีก ${formatTime(timeRemaining)}`;
      borderColor = percentage >= 80 ? '#FFF398' : '#80FF75';
    } else {
      statusMessage = `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;
      borderColor = '#FF8175';
    }

    return {
      borderColor,
      statusMessage,
      hideDelayTime: false,
      percentage,
      timeRemaining,
      formattedDelayTime: formatDelayTime(timeRemaining)
    };
  }

  // For regular items
  const latestColdRoomExitDate = getLatestColdRoomExitDate(row);

  // Determine which scenario we're in
  let referenceDate = null;
  let remainingTimeValue = null;
  let standardTimeValue = null;

  // Scenario 1: Cold room history exists and no rework
  if ((latestColdRoomExitDate !== '-') && 
      (!row.remaining_rework_time || row.remaining_rework_time === '-')) {
    referenceDate = latestColdRoomExitDate;
    remainingTimeValue = parseTimeValue(row.remaining_ctp_time);
    standardTimeValue = parseTimeValue(row.standard_ctp_time);
  }
  // Scenario 2: No cold room history and no rework
  else if ((latestColdRoomExitDate === '-') && 
           (!row.remaining_rework_time || row.remaining_rework_time === '-')) {
    referenceDate = row.rmit_date;
    remainingTimeValue = parseTimeValue(row.remaining_ptp_time);
    standardTimeValue = parseTimeValue(row.standard_ptp_time);
  }
  // Scenario 3: Rework case
  else if (row.remaining_rework_time && row.remaining_rework_time !== '-') {
    referenceDate = row.qc_date;
    remainingTimeValue = parseTimeValue(row.remaining_rework_time);
    standardTimeValue = parseTimeValue(row.standard_rework_time);
  }

  // If we couldn't determine the scenario
  if (!referenceDate || (!remainingTimeValue && !standardTimeValue)) {
    return {
      borderColor: "#969696",
      statusMessage: "-",
      hideDelayTime: true,
      percentage: 0,
      timeRemaining: 0,
      formattedDelayTime: null
    };
  }

  // Calculate elapsed time from reference date
  const elapsedMinutes = calculateTimeDifference(referenceDate);
  
  // Calculate remaining time
  let timeRemaining;
  if (remainingTimeValue !== null) {
    timeRemaining = remainingTimeValue - elapsedMinutes;
  } else if (standardTimeValue !== null) {
    timeRemaining = standardTimeValue - elapsedMinutes;
  } else {
    timeRemaining = 0;
  }

  // Calculate percentage of time used
  let percentage = 0;
  if (standardTimeValue) {
    percentage = (elapsedMinutes / standardTimeValue) * 100;
  }

  // Format message
  let statusMessage;
  if (timeRemaining > 0) {
    statusMessage = `เหลืออีก ${formatTime(timeRemaining)}`;
  } else {
    statusMessage = `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;
  }

  // Set color based on status
  let borderColor;
  if (timeRemaining < 0) {
    borderColor = '#FF8175'; // Past due - red
  } else if (percentage >= 80) {
    borderColor = '#FFF398'; // Near due (80%+) - yellow
  } else {
    borderColor = '#80FF75'; // Plenty of time - green
  }

  return {
    borderColor,
    statusMessage,
    hideDelayTime: false,
    percentage,
    timeRemaining,
    formattedDelayTime: formatDelayTime(timeRemaining)
  };
};

const formatDelayTime = (timeRemaining) => {
  const isNegative = timeRemaining < 0;
  const absoluteTimeRemaining = Math.abs(timeRemaining);
  
  const hours = Math.floor(absoluteTimeRemaining / 60);
  const minutes = Math.floor(absoluteTimeRemaining % 60);
  
  // Format as "H.MM" with leading zero for minutes
  return `${isNegative ? '-' : ''}${hours}.${minutes.toString().padStart(2, '0')}`;
};

// สร้าง styled components สำหรับ TableCell เพื่อลดการซ้ำซ้อนของ styling
const StyledHeaderCell = styled(TableCell)(({ theme, width, isFirst, isLast }) => ({
  fontSize: '12px',
  color: '#787878',
  padding: '5px',
  width: width || 'auto',
  borderTop: "1px solid #e0e0e0",
  borderBottom: "1px solid #e0e0e0",
  borderRight: isLast ? "1px solid #e0e0e0" : "1px solid #f2f2f2",
  borderLeft: isFirst ? "1px solid #e0e0e0" : "none",
  borderTopLeftRadius: isFirst ? '8px' : '0',
  borderBottomLeftRadius: isFirst ? '8px' : '0',
  borderTopRightRadius: isLast ? '8px' : '0',
  borderBottomRightRadius: isLast ? '8px' : '0',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}));

const StyledDataCell = styled(TableCell)(({ theme, width, isFirst, isLast, borderColor }) => ({
  fontSize: '14px',
  color: "#787878",
  padding: '0px 10px',
  height: '40px',
  width: width || 'auto',
  borderTop: '1px solid #e0e0e0',
  borderBottom: '1px solid #e0e0e0',
  borderRight: isLast ? '1px solid #e0e0e0' : "1px solid #f2f2f2",
  borderLeft: isFirst ? `5px solid ${borderColor}` : "1px solid #f2f2f2",
  borderTopLeftRadius: isFirst ? '8px' : '0',
  borderBottomLeftRadius: isFirst ? '8px' : '0',
  borderTopRightRadius: isLast ? '8px' : '0',
  borderBottomRightRadius: isLast ? '8px' : '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  textAlign: 'center',
}));

const Row = ({
  row,
  handleRowClick,
  selectedColor,
  openRowId,
  setOpenRowId
}) => {
  const { borderColor, statusMessage, hideDelayTime, percentage } = getRowStatus(row);

  const colorMatch =
    (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175') ||
    (selectedColor === 'gray' && borderColor === '#969696');

  if (selectedColor && !colorMatch) return null;

  const isOpen = openRowId === row.rmfp_id;

  return (
    <>
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }} colSpan={7} />
      </TableRow>
      <TableRow
        onClick={() => {
          setOpenRowId(isOpen ? null : row.rmfp_id);
          handleRowClick(row.rmfp_id);
        }}
        sx={{
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: '#f5f5f5',
          }
        }}
      >
        <StyledDataCell
          isFirst={true}
          width="15%"
          borderColor={borderColor}
          style={{
            color:
              borderColor === "#969696"
                ? "#626262"
                : percentage >= 100
                  ? "red"
                  : percentage >= 50
                    ? "orange"
                    : "green",
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '13px',
              height: '100%',
            }}
          >
            {statusMessage}
          </div>
        </StyledDataCell>

        {/* Batch */}
        <StyledDataCell width="10%">
          {row.batch || '-'}
        </StyledDataCell>

        {/* Mat */}
        <StyledDataCell width="15%">
          {row.mat || '-'}
        </StyledDataCell>

        {/* รายชื่อวัตถุดิบ */}
        <StyledDataCell width="25%">
          {row.mat_name || '-'}
        </StyledDataCell>

        {/* แผนการผลิต */}
        <StyledDataCell width="12%">
          {row.production || '-'}
        </StyledDataCell>

        {/* น้ำหนักวัตถุดิบ */}
        <StyledDataCell width="12%">
          {row.weight_RM || '-'}
        </StyledDataCell>

        {/* จำนวนถาด */}
        <StyledDataCell width="10%" isLast={true}>
          {row.tray_count || '-'}
        </StyledDataCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }} colSpan={7} />
      </TableRow>

      {/* Collapse Section */}
      <TableRow>
        <TableCell style={{ padding: 0, border: 'none' }} colSpan={7}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{
              margin: 1,
              borderRadius: '8px',
              overflow: 'auto',  // เปลี่ยนเป็น auto เพื่อให้มี scroll เมื่อเนื้อหาเกินขนาด
              borderTop: '1px solid #ececec',
              borderLeft: '1px solid #ececec',
              borderBottom: "1px solid #ececec",
              borderRight: '1px solid #ececec',
              maxWidth: '100%'
            }}>
              <TableContainer sx={{ overflowX: 'auto' }}> {/* เพิ่ม TableContainer พร้อม overflowX */}
                <Table size="small" aria-label="purchases" sx={{ width: '100%' }}>
                  <TableHead>
                    <TableRow style={{ backgroundColor: "#F9F9F9" }}>
                      <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", minWidth: "120px" }}>สรุปเบิก</TableCell>
                      <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", minWidth: "120px" }}>เวลาต้ม/อบเสร็จ</TableCell>
                      <TableCell
                        sx={{
                          fontSize: "13px",
                          textAlign: 'center',
                          borderRight: '1px solid #ececec',
                          verticalAlign: 'middle',
                          color: "#787878",
                          minWidth: "120px"
                        }}
                      >
                        {["รอ Qc", "รอกลับมาเตรียม"].includes(row.rm_status)
                          ? "เวลาส่งมาห้องเย็น"
                          : "เวลาแปรรูปเสร็จ"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", minWidth: "120px" }}>เวลาเข้าห้องเย็น1</TableCell>
                      <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", minWidth: "120px" }}>เวลาออกห้องเย็น1</TableCell>
                      <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", minWidth: "120px" }}>เวลาเข้าห้องเย็น2</TableCell>
                      <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", minWidth: "120px" }}>เวลาออกห้องเย็น2</TableCell>
                      <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", minWidth: "120px" }}>เวลาเข้าห้องเย็น3</TableCell>
                      <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", minWidth: "120px" }}>เวลาออกห้องเย็น3</TableCell>
                      <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", minWidth: "120px" }}>เวลาแก้ไข</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>{row.withdraw_date ? new Date(row.withdraw_date).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>{row.cooked_date ? new Date(row.cooked_date).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>{row.rmit_date ? new Date(row.rmit_date).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>{row.come_cold_date ? new Date(row.come_cold_date).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>{row.out_cold_date ? new Date(row.out_cold_date).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>{row.come_cold_date_two ? new Date(row.come_cold_date_two).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>{row.out_cold_date_two ? new Date(row.out_cold_date_two).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>{row.come_cold_date_three ? new Date(row.come_cold_date_three).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>{row.out_cold_date_three ? new Date(row.out_cold_date_three).toLocaleString('th-TH') : '-'}</TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', verticalAlign: 'middle', color: "#787878" }}>{row.rework_date ? new Date(row.rework_date).toLocaleString('th-TH') : '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const TableMainPrep = ({ handleOpenModal, data, handleRowClick, handleOpenEditModal, handleOpenSuccess, handleOpenDeleteModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (data && data.length > 0) {
      setRows(data);
      setFilteredRows(data);
    }
  }, [data]);

  useEffect(() => {
    socket.on("dataUpdated", (updatedData) => {
      setRows(updatedData);
      setFilteredRows(updatedData);
    });

    return () => {
      socket.off("dataUpdated");
    };
  }, []);

  useEffect(() => {
    if (rows.length > 0) {
      setFilteredRows(
        rows.filter((row) =>
          Object.values(row).some((value) =>
            value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      );
    }
  }, [searchTerm, rows]);

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

  // เพิ่ม state สำหรับติดตามขนาดหน้าจอ
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // เพิ่ม useEffect สำหรับติดตามการเปลี่ยนแปลงขนาดหน้าจอ
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // คำนวณความสูงของตารางตามขนาดหน้าจอ
  const calculateTableHeight = () => {
    // ปรับขนาดตามความสูงของหน้าจอ
    const vh = windowSize.height;
    // คำนวณส่วนสูงของตารางโดยอิงจากความสูงของหน้าจอ
    // ลบด้วยส่วนอื่นๆ ที่ใช้พื้นที่ (เช่น header, บาร์ค้นหา, pagination)
    return vh * 0.65; // ตั้งค่าให้ตารางมีความสูง 65% ของหน้าจอ
  };

  return (
    <Paper sx={{ 
      width: '100%', 
      overflow: 'hidden', 
      boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)',
      height: 'auto', // ไม่กำหนดความสูงตายตัว ให้ปรับตาม content
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        alignItems: 'center', 
        gap: 1, 
        padding: 2,
        borderBottom: '1px solid #e0e0e0'
      }}>
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
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-start", flexShrink: 0 }}>
          {['green', 'yellow', 'red'].map((color) => (
            <FilterButton
              key={color}
              color={color}
              selectedColor={selectedColor}
              onClick={() => handleFilterChange(color)}
            />
          ))}
        </Box>
      </Box> */}
      <TableContainer sx={{ 
        height: calculateTableHeight(),
        maxHeight: `calc(100vh - 200px)`, // ตั้งค่าความสูงสูงสุดเป็น viewport height ลบด้วยพื้นที่อื่นๆ
        overflowY: 'auto',
        flex: 1
      }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ height: '40px' }}>
              <StyledHeaderCell align="center" isFirst={true} width="15%">
                <Box style={{ fontSize: '12px' }}>DelayTime</Box>
              </StyledHeaderCell>
              <StyledHeaderCell align="center" width="10%">
                <Box style={{ fontSize: '12px' }}>Batch</Box>
              </StyledHeaderCell>
              <StyledHeaderCell align="center" width="15%">
                <Box style={{ fontSize: '12px' }}>Mat</Box>
              </StyledHeaderCell>
              <StyledHeaderCell align="center" width="25%">
                <Box style={{ fontSize: '12px' }}>รายชื่อวัตถุดิบ</Box>
              </StyledHeaderCell>
              <StyledHeaderCell align="center" width="12%">
                <Box style={{ fontSize: '12px' }}>แผนการผลิต</Box>
              </StyledHeaderCell>
              <StyledHeaderCell align="center" width="12%">
                <Box style={{ fontSize: '12px' }}>น้ำหนักวัตถุดิบ</Box>
              </StyledHeaderCell>
              <StyledHeaderCell align="center" isLast={true} width="10%">
                <Box style={{ fontSize: '12px' }}>จำนวนถาด</Box>
              </StyledHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredRows.length > 0 ? (
              filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <Row
                  key={index}
                  row={row}
                  handleOpenModal={handleOpenModal}
                  handleRowClick={handleRowClick}
                  handleOpenEditModal={handleOpenEditModal}
                  handleOpenDeleteModal={handleOpenDeleteModal}
                  handleOpenSuccess={handleOpenSuccess}
                  selectedColor={selectedColor}
                  openRowId={openRowId}
                  setOpenRowId={setOpenRowId}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
                  ไม่มีรายการวัตถุดิบในขณะนี้
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {/* <TablePagination
        sx={{
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar": {
            fontSize: '10px',
            color: "#787878",
            padding: "0px",
          },
          borderTop: '1px solid #e0e0e0'
        }}
        rowsPerPageOptions={[10, 20, 50]}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      /> */}
    </Paper>
  );
};

const FilterButton = ({ color, selectedColor, onClick }) => {
  const colors = {
    green: { default: '#80FF75', hover: '#54e032' },
    yellow: { default: '#FFF398', hover: '#f0cb4d' },
    red: { default: '#FF8175', hover: '#ff4444' }
  };

  return (
    <div
      style={{
        border: "1px solid #cbcbcb",
        padding: "7px",
        borderRadius: "5px",
        cursor: "pointer",
        transition: "background-color 0.2s ease-in-out",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors[color].hover;
        e.currentTarget.querySelector("svg").style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.querySelector("svg").style.color = selectedColor === color ? '#787878' : colors[color].default;
      }}
    >
      <FaRegCircle
        style={{
          color: selectedColor === color ? '#787878' : colors[color].default,
          fontSize: "24px",
          transition: "color 0.2s ease-in-out",
        }}
      />
    </div>
  );
};

export default TableMainPrep;