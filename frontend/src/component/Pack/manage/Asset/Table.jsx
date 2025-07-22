import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, TablePagination } from '@mui/material';
import { LiaShoppingCartSolid } from 'react-icons/lia';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";
import { io } from "socket.io-client";
const API_URL = import.meta.env.VITE_API_URL;
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
 const socket= io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      });

const CUSTOM_COLUMN_WIDTHS = {
  delayTime: '180px',
  cart: '70px',
  complete: '70px',
  edit: '70px',
  delete: '70px'
};

// ตัวอย่างข้อมูลที่จะถูกแสดงในตารางหลัก
// const formatTrolleyData = (data) => {
//   return data.map(trolley => ({
//     tro_id: trolley.tro_id,
//     production: trolley.materials[0].production, // เลือกแผนการผลิตจากวัตถุดิบแรก
//     total_weight: trolley.materials.reduce((sum, mat) => sum + (parseFloat(mat.weight_in_trolley) || 0), 0).toFixed(2),
//     tray_count: trolley.materials.reduce((sum, mat) => sum + (parseInt(mat.tray_count) || 0), 0),
//     materials: trolley.materials
//   }));
// };

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

const calculateTimeDifference = (dateString) => {
  if (!dateString || dateString === '-') return 0;

  const effectiveDate = new Date(dateString);
  console.log("วันที่เวลาที่ใช้ :", effectiveDate)
  const currentDate = new Date();
  console.log("วันที่เวลาปัจจุบัน :", currentDate)

  const diffInMinutes = (currentDate - effectiveDate) / (1000 * 60);
  console.log("เวลาที่ใช้ไป :", diffInMinutes)
  return diffInMinutes > 0 ? diffInMinutes : 0;
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

const getLatestColdRoomExitDate = (item) => {
  // เริ่มจากตรวจสอบวันที่ห้องเย็นที่ 3 ก่อน, จากนั้นไปห้องเย็นที่ 2, และสุดท้ายคือห้องเย็นที่ 1
  if (item.out_cold_date_three && item.out_cold_date_three !== '-') {
    return item.out_cold_date_three;
  } else if (item.out_cold_date_two && item.out_cold_date_two !== '-') {
    return item.out_cold_date_two;
  } else if (item.out_cold_date && item.out_cold_date !== '-') {
    return item.out_cold_date;
  }
  return '-'; // ถ้าไม่มีวันที่ออกห้องเย็นใดๆ
};

const getItemStatus = (item) => {

  const latestColdRoomExitDate = getLatestColdRoomExitDate(item);

  // Determine which scenario we're in
  let referenceDate = null;
  let remainingTimeValue = null;
  let standardTimeValue = null;
  // Default state for when we can't determine status
  const defaultStatus = {
    textColor: "#787878",
    statusMessage: "-",
    borderColor: "#969696",
    hideDelayTime: true,
    percentage: 0,
    timeRemaining: 0
  };

  // If essential data is missing
  if (!item) return defaultStatus;



  // Scenario 1: Cold room history exists and no rework
  if ((latestColdRoomExitDate !== '-') &&
    (!item.remaining_rework_time || item.remaining_rework_time === '-')) {

    referenceDate = latestColdRoomExitDate;
    console.log("ใช้วันที่ออกห้องเย็นล่าสุด :", referenceDate)

    remainingTimeValue = parseTimeValue(item.remaining_ctp_time);
    standardTimeValue = parseTimeValue(item.standard_ctp_time);
  }
  // Scenario 2: No cold room history and no rework
  else if ((latestColdRoomExitDate === '-') &&
    (!item.remaining_rework_time || item.remaining_rework_time === '-')) {

    referenceDate = item.rmit_date;
    console.log("ใช้วันที่เตรียม :", referenceDate)
    remainingTimeValue = parseTimeValue(item.remaining_ptp_time);
    standardTimeValue = parseTimeValue(item.standard_ptp_time);
  }
  // Scenario 3: Rework case
  else if (item.remaining_rework_time && item.remaining_rework_time !== '-') {

    referenceDate = item.qc_date;
    console.log("ใช้วันที่ qc (แก้ไข) :", referenceDate)
    remainingTimeValue = parseTimeValue(item.remaining_rework_time);
    standardTimeValue = parseTimeValue(item.standard_rework_time);
  }
  else if ((latestColdRoomExitDate !== '-') &&
    item.remaining_rework_time && item.remaining_rework_time !== '-') {
    console.log("ใช้วันที่วันที่เข้าห้องเย็นล่าสุด (แก้ไข) :", referenceDate)
    referenceDate = latestColdRoomExitDate;
    remainingTimeValue = parseTimeValue(item.remaining_rework_time);
    standardTimeValue = parseTimeValue(item.standard_rework_time);
  }

  // If we couldn't determine the scenario or don't have enough data
  if (!referenceDate || (!remainingTimeValue && !standardTimeValue)) {
    return defaultStatus;
  }

  // Calculate elapsed time from reference date
  const elapsedMinutes = calculateTimeDifference(referenceDate);
  console.log("remainingTimeValue :", remainingTimeValue)
  console.log("standardTimeValue :", standardTimeValue)
  // Calculate remaining time
  let timeRemaining;
  if (remainingTimeValue !== null) {
    // If we have a remaining time value from the database, use it
    timeRemaining = remainingTimeValue - elapsedMinutes;
  } else if (standardTimeValue !== null) {
    // Otherwise use the standard time and subtract elapsed time
    timeRemaining = standardTimeValue - elapsedMinutes;
  } else {
    // Fallback if we don't have either value
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
  let textColor, borderColor;
  if (timeRemaining < 0) {
    // Past due time - red
    textColor = "#FF0000";
    borderColor = "#FF8175";
  } else if (percentage >= 80) {
    // Near due time (80% or more of time has passed) - yellow
    textColor = "#FFA500";
    borderColor = "#FFF398";
  } else {
    // Plenty of time remaining - green
    textColor = "#008000";
    borderColor = "#80FF75";
  }

  let formattedDelayTime = null;

  console.log("timeRemaining :", timeRemaining)

  const isNegative = timeRemaining < 0;
  const absoluteTimeRemaining = Math.abs(timeRemaining);

  const hours = Math.floor(absoluteTimeRemaining / 60);
  const minutes = Math.floor(absoluteTimeRemaining % 60);

  // กำหนดเครื่องหมายลบถ้าเลยกำหนด
  const sign = isNegative ? '-' : '';
  formattedDelayTime = `${sign}${hours}.${minutes.toString().padStart(2, '0')}`;
  console.log("formattedDelayTime :", formattedDelayTime)


  return {
    textColor,
    statusMessage,
    borderColor,
    hideDelayTime: false,
    percentage,
    timeRemaining,
    formattedDelayTime
  };
};


// นับจำนวน Delay time ใน รถเข็น
// const getTrolleyStatusIcons = (row) => {
//   if (!row.materials || row.materials.length === 0) {
//     return null;
//   }

//   const statusCounts = {
//     red: 0,
//     yellow: 0,
//     green: 0
//   };

//   row.materials.forEach(material => {
//     const { textColor } = getItemStatus(material);
//     if (textColor === "#FF0000") {
//       statusCounts.red++;
//     } else if (textColor === "#FFA500") {
//       statusCounts.yellow++;
//     } else if (textColor === "#008000") {
//       statusCounts.green++;
//     }
//   });

//   const icons = [];
//   if (statusCounts.red > 0) {
//     icons.push(
//       <Box key="red" component="span" sx={{
//         display: 'inline-flex',
//         alignItems: 'center',
//         marginRight: 1,
//         color: '#FF0000'
//       }}>
//         <HourglassBottomIcon fontSize="small" />
//         <span style={{ fontSize: '12px', marginLeft: 2 }}>{statusCounts.red}</span>
//       </Box>
//     );
//   }
//   if (statusCounts.yellow > 0) {
//     icons.push(
//       <Box key="yellow" component="span" sx={{
//         display: 'inline-flex',
//         alignItems: 'center',
//         marginRight: 1,
//         color: '#FFA500'
//       }}>
//         <HourglassBottomIcon fontSize="small" />
//         <span style={{ fontSize: '12px', marginLeft: 2 }}>{statusCounts.yellow}</span>
//       </Box>
//     );
//   }
//   if (statusCounts.green > 0) {
//     icons.push(
//       <Box key="green" component="span" sx={{
//         display: 'inline-flex',
//         alignItems: 'center',
//         marginRight: 1,
//         color: '#008000'
//       }}>
//         <HourglassBottomIcon fontSize="small" />
//         <span style={{ fontSize: '12px', marginLeft: 2 }}>{statusCounts.green}</span>
//       </Box>
//     );
//   }

//   return (
//     <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//       {icons}
//     </Box>
//   );
// };

const Row = ({
  row,
  columnWidths,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenDeleteModal,
  handleOpenEditLineModal, // เพิ่ม prop นี้

  handleOpenSuccess,
  selectedColor,
  openRowId,
  setOpenRowId,
  index,
  displayColumns
}) => {
  const { borderColor, statusMessage, hideDelayTime, percentage, formattedDelayTime } = getItemStatus(row);
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";

  const colorMatch =
    (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175') ||
    (selectedColor === 'gray' && borderColor === '#969696');

  if (selectedColor && !colorMatch) return null;

  const isOpen = openRowId === row.rmfp_id;

  // แยก column ที่ต้องการแสดงเท่านั้น
  const displayRow = {};
  displayColumns.forEach(col => {
    if (col === 'tro_id') {
      displayRow['tro_id'] = row['tro_id'];
    } else if (row.hasOwnProperty(col)) {
      displayRow[col] = row[col];
    }
  });

  return (
    <>
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
      <TableRow onClick={() => {
        setOpenRowId(isOpen ? null : row.rmfp_id);
        handleRowClick(row.rmfp_id);
      }}>
        <TableCell
          style={{
            width: '50px',
            textAlign: 'center',
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            height: '40px',
            padding: '0px 0px',
            borderRight: "0px solid #e0e0e0",
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
            borderLeft: `5px solid ${borderColor}`,
            backgroundColor: backgroundColor
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '13px',
              height: '100%',
              color:
                borderColor === "#969696"
                  ? "#626262"
                  : percentage >= 100
                    ? "red"
                    : percentage >= 80
                      ? "orange"
                      : "green",
            }}
          >
            {statusMessage}
          </div>
        </TableCell>
        {Object.entries(displayRow).map(([key, value], idx) => (
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
              backgroundColor: backgroundColor
            }}
          >
            {value || '-'}
          </TableCell>
        ))}

        <PackSC
          width={CUSTOM_COLUMN_WIDTHS.edit}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditModal(row);
          }}
          icon={<LiaShoppingCartSolid style={{ color: '#4aaaec', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />
        <PackEdit
          width={CUSTOM_COLUMN_WIDTHS.edit}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditLineModal(row);
          }}
          icon={<EditIcon style={{ color: '#ffc107', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />
        <Packsend
          width={CUSTOM_COLUMN_WIDTHS.edit}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDeleteModal(row, formattedDelayTime);
          }}
          icon={<FaRegCheckCircle style={{ color: '#ff0000', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
    </>
  );
};

const Packsend = ({ width, onClick, icon, backgroundColor }) => {
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
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#ff4444'; // เปลี่ยนเป็นสีแดง
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#ff0000'; // เปลี่ยนเป็นสีแดง
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const PackSC = ({ width, onClick, icon, backgroundColor }) => {
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
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#4aaaec';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#4aaaec';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const PackEdit = ({ width, onClick, icon, backgroundColor }) => {
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
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#ffc107';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#ffc107';
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
  handleOpenDeleteModal,
  handleOpenEditLineModal,
  handleOpenSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);

  // กำหนดคอลัมน์ที่ต้องการแสดงเท่านั้น
  const displayColumns = ['batch_after', 'mat', 'mat_name', 'production', 'weight_RM', 'level_eu'];

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

  const totalCustomWidth = Object.values(CUSTOM_COLUMN_WIDTHS).reduce((sum, width) => sum + parseInt(width), 0);
  const remainingWidth = `calc((100% - ${totalCustomWidth}px) / ${displayColumns.length})`;
  const columnWidths = Array(displayColumns.length).fill(remainingWidth);

  // Header name mapping
  const headerNames = {
    "batch_after": "Batch",
    "mat": "Material",
    "mat_name": "รายชื่อวัตถุดิบ",
    "production": "แผนการผลิต",
    "weight_RM": "น้ำหนักวัตถุดิบ",
    "level_eu": "Level Eu"
  };

  // กำหนดความกว้างคอลัมน์
  const getColumnWidth = (header) => {
    if (header === "mat_name") return "420px";
    if (header === "production") return "150px";
    if (header === "tro_id") return "180px";
    if (["weight_RM", "level_eu"].includes(header)) return "90px";
    if (header === "batch_after") return "120px";
    if (header === "mat") return "150px";
    return "150px";
  };

  const handleDeleteItemWithDelay = (row) => {
    // สร้าง object ใหม่โดยเพิ่ม delayTime เข้าไป
    const rowWithDelay = { ...row };
    handleOpenDeleteModal(rowWithDelay);
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
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', borderLeft: "1px solid #e0e0e0", padding: '5px', width: "210px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>DelayTime</Box>
              </TableCell>

              {displayColumns.map((header, index) => (
                <TableCell
                  key={index}
                  align="center"
                  style={{
                    backgroundColor: "hsl(210, 100%, 60%)",
                    borderTop: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    borderLeft: "1px solid #f2f2f2",
                    borderRight: "1px solid #f2f2f2",
                    fontSize: '12px',
                    color: '#787878',
                    padding: '5px',
                    width: getColumnWidth(header)
                  }}
                >
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>
                    {headerNames[header] || header}
                  </Box>
                </TableCell>
              ))}

              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: "90px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>รถเข็น</Box>
              </TableCell>

              {/* แก้ไข */}
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: "90px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>แก้ไข</Box>
              </TableCell>

              {/* เปลี่ยนเป็นเคลียร์น้ำหนักและย้ายมาท้ายสุด */}
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', width: "90px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>เคลียร์น้ำหนัก</Box>
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
                  handleOpenEditLineModal={handleOpenEditLineModal} // เพิ่ม prop นี้
                  handleOpenDeleteModal={handleDeleteItemWithDelay}
                  handleOpenSuccess={handleOpenSuccess}
                  selectedColor={selectedColor}
                  openRowId={openRowId}
                  index={index}
                  setOpenRowId={setOpenRowId}
                  displayColumns={displayColumns}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 4} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
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