import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography, styled } from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FaRegCircle } from "react-icons/fa";
import { io } from "socket.io-client";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
const API_URL = import.meta.env.VITE_API_URL;
 const socket= io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      });

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
    percentage = Math.min(percentage, 100); // Cap at 100%
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
    formattedDelayTime,
  };
};

// New component for grouped mix code items
const GroupedMixCodeRow = ({
  mainRow,
  groupItems,
  handleRowClick,
  openRowId,
  setOpenRowId,
  selectedColor
}) => {
  const { borderColor, statusMessage, percentage, formattedDelayTime } = getItemStatus(mainRow);

  // Check if the selected color filter matches this group
  const colorMatch =
    (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175') ||
    (selectedColor === 'gray' && borderColor === '#969696');

  if (selectedColor && !colorMatch) return null;

  const isOpen = openRowId === `mix-${mainRow.mix_code}`;
  const itemCount = groupItems.length;

  // Enhance row with delay time
  const enhancedRow = {
    ...mainRow,
    formattedDelayTime: formattedDelayTime,
    groupItems: groupItems
  };


  return (
    <>
      <TableRow>
        <TableCell sx={{ height: "4px", padding: 0, border: 0 }} />
      </TableRow>
      <TableRow
        onClick={() => {
          setOpenRowId(isOpen ? null : `mix-${mainRow.mix_code}`);
          handleRowClick(enhancedRow, formattedDelayTime);
        }}
        sx={{
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          backgroundColor: 'white',
          transition: 'background-color 0.2s ease'
        }}
      >
        <TableCell
          colSpan={3}
          sx={{
            textAlign: 'center',
            borderRadius: '8px 0 0 8px',
            borderLeft: `4px solid ${borderColor}`,
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            padding: '12px 16px',
            fontSize: '15px',
            fontWeight: '400',
            color: "#424242",
            backgroundColor: "white",
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              height: '100%',
            }}
          >
            วัตถุดิบผสม
          </div>
        </TableCell>
  
        <TableCell
          align="center"
          sx={{
            width: '18%',
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            padding: '12px 10px',
            color: "#616161",
            backgroundColor: "white",
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ 
              backgroundColor: '#f0f0f0', 
              padding: '4px 8px', 
              borderRadius: '6px', 
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              กลุ่มผสม: <strong>{itemCount}</strong> รายการ
              {isOpen ? 
                <KeyboardArrowUpIcon fontSize="small" /> : 
                <KeyboardArrowDownIcon fontSize="small" />
              }
            </span>
          </div>
        </TableCell>
  
        <TableCell
          align="center"
          sx={{
            width: '13%',
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            padding: '12px 10px',
            color: "#616161",
            fontWeight: '400',
            backgroundColor: "white",
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          {mainRow.production || '-'}
        </TableCell>
  
        <TableCell
          align="center"
          sx={{
            width: '12%',
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            padding: '12px 10px',
            color: "#616161",
            backgroundColor: "white",
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          {mainRow.weight_RM || '-'}
        </TableCell>
  
        <TableCell
          align="center"
          sx={{
            width: '12%',
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            padding: '12px 10px',
            color: "#616161",
            backgroundColor: "white",
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <strong>{mainRow.tray_count}</strong>
        </TableCell>
      </TableRow>
  
      <TableRow>
        <TableCell sx={{ padding: 0, border: 0, height: "4px" }} />
      </TableRow>
    </>
  );
};

const Row = ({
  row,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenDeleteModal,
  handleOpenSuccess,
  selectedColor,
  openRowId,
  setOpenRowId
}) => {
  const { borderColor, statusMessage, hideDelayTime, percentage, formattedDelayTime } = getItemStatus(row);
  console.log("Row formattedDelayTime:", formattedDelayTime);

  // เพิ่มค่า formattedDelayTime เข้าไปใน row object
  const enhancedRow = {
    ...row,
    formattedDelayTime: formattedDelayTime
  };

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
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }} />
      </TableRow>
      <TableRow
        onClick={() => {
          setOpenRowId(isOpen ? null : row.rmfp_id);
          handleRowClick(enhancedRow, formattedDelayTime);
        }}
        sx={{
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: '#f5f5f5',
          }
        }}
      >
        <TableCell
          style={{
            width: '12%',
            textAlign: 'center',
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            height: '40px',
            padding: '0px 0px',
            borderRight: "0px solid #e0e0e0",
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
            borderLeft: `5px solid ${borderColor}`,
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
                    : percentage >= 50
                      ? "orange"
                      : "green",
            }}
          >
            {statusMessage}
          </div>
        </TableCell>

        {/* Main table cells with the data from JSON */}
        <TableCell
          align="center"
          style={{
            width: '10%',
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
          {row.batch_after || '-'}
        </TableCell>

        <TableCell
          align="center"
          style={{
            width: '10%',
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
          {row.mat || '-'}
        </TableCell>

        <TableCell
          align="center"
          style={{
            width: '18%',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>{row.mat_name || '-'}</span>
            {isOpen ? <KeyboardArrowUpIcon style={{ marginLeft: '4px' }} /> : <KeyboardArrowDownIcon style={{ marginLeft: '4px' }} />}
          </div>
        </TableCell>

        <TableCell
          align="center"
          style={{
            width: '13%',
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
          {row.production || '-'}
        </TableCell>

        <TableCell
          align="center"
          style={{
            width: '12%',
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
          {row.weight_RM || '-'}
        </TableCell>

        <TableCell
          align="center"
          style={{
            width: '12%',
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
            borderRadius: '0 8px 8px 0',
          }}
        >
          {row.tray_count || '-'}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }} />
      </TableRow>

      {/* Collapse Section */}
      <TableRow>
        <TableCell style={{ padding: 0, border: 'none', }} colSpan={9}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, borderRadius: '8px', overflow: 'auto', borderTop: '1px solid #ececec', borderLeft: '1px solid #ececec', borderBottom: "1px solid #ececec", borderRight: '1px solid #ececec', maxWidth: '100%', }}>
              <Table size="small" aria-label="purchases" sx={{ width: '100%', }}>
                <TableHead >
                  <TableRow style={{ backgroundColor: "#F9F9F9" }}>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "10%" }}>สรุปเบิก</TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "10%" }}>เวลาต้ม/อบเสร็จ</TableCell>
                    <TableCell
                      sx={{
                        fontSize: "13px",
                        textAlign: 'center',
                        borderRight: '1px solid #ececec',
                        verticalAlign: 'middle',
                        color: "#787878",
                        width: "10%"
                      }}
                    >
                      {["รอ Qc", "รอกลับมาเตรียม"].includes(row.rm_status) ? "เวลาส่งมาห้องเย็น"
                        : "เวลาแปรรูปเสร็จ"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "10%" }}>เวลาเข้าห้องเย็น1</TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "10%" }}>เวลาออกห้องเย็น1</TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "10%" }}>เวลาเข้าห้องเย็น2</TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "10%" }}>เวลาออกห้องเย็น2</TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "10%" }}>เวลาเข้าห้องเย็น3</TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "10%" }}>เวลาออกห้องเย็น3</TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "10%" }}>เวลาแก้ไข</TableCell>
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
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const TableMainPrepDetail = ({ handleOpenModal, data, handleRowClick, handleOpenEditModal, handleOpenSuccess, handleOpenDeleteModal, }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);
  const [rows, setRows] = useState([]);

  // Group data by mix_code and separate non-mix code items
  const processData = (data) => {
    const mixCodeGroups = {};
    const regularItems = [];

    data.forEach(item => {
      if (item.mix_code) {
        if (!mixCodeGroups[item.mix_code]) {
          mixCodeGroups[item.mix_code] = [];
        }
        mixCodeGroups[item.mix_code].push(item);
      } else {
        regularItems.push(item);
      }
    });

    const groupedItems = Object.keys(mixCodeGroups).map(mixCode => ({
      groupType: 'mix',
      mainItem: mixCodeGroups[mixCode][0],
      groupItems: mixCodeGroups[mixCode]
    }));

    const processedRegularItems = regularItems.map(item => ({
      groupType: 'regular',
      mainItem: item,
      groupItems: [item]
    }));

    return [...groupedItems, ...processedRegularItems];
  };

  useEffect(() => {
    socket.on("dataUpdated", (updatedData) => {
      setRows(processData(updatedData));
    });

    setRows(processData(data));

    return () => {
      socket.off("dataUpdated");
    };
  }, [data]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredRows(rows);
    } else {
      const filtered = rows.filter(row => {
        const mainItemMatch = Object.values(row.mainItem).some(value =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );

        const groupItemsMatch = row.groupItems.length > 1 &&
          row.groupItems.some(item =>
            Object.values(item).some(value =>
              value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
            ));

        return mainItemMatch || groupItemsMatch;
      });

      setFilteredRows(filtered);
    }
  }, [searchTerm, rows]);

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

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
      <TableContainer style={{ padding: '10px' }} sx={{ height: 'calc(58vh)', overflowY: 'auto' }}>
        <Table stickyHeader style={{ tableLayout: 'auto' }} sx={{ width: '100%' }}>
          <TableHead style={{ marginBottom: "10px" }}>
            <TableRow sx={{ height: '40px' }}>
              <TableCell align="center" style={{ width: '15%', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', borderLeft: "1px solid #e0e0e0", padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>DelayTime</Box>
              </TableCell>

              <TableCell align="center" style={{ width: '10%', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>Batch</Box>
              </TableCell>

              <TableCell align="center" style={{ width: '10%', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>Mat</Box>
              </TableCell>
              <TableCell align="center" style={{ width: '20%', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>รายชื่อวัตถุดิบ</Box>
              </TableCell>
              <TableCell align="center" style={{ width: '10%', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>แผนการผลิต</Box>
              </TableCell>
              <TableCell align="center" style={{ width: '10%', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>น้ำหนักวัตถุดิบ</Box>
              </TableCell>
              <TableCell align="center" style={{ width: '10%', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '12px' }}>จำนวนถาด</Box>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
            {filteredRows.length > 0 ? (
              filteredRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  // Render grouped mix code rows differently
                  if (row.groupType === 'mix') {
                    return (
                      <GroupedMixCodeRow
                        key={`mix-${row.mainItem.mix_code}-${index}`}
                        mainRow={row.mainItem}
                        groupItems={row.groupItems}
                        handleRowClick={(mainRow, formattedDelayTime) => handleRowClick(mainRow, formattedDelayTime)}
                        openRowId={openRowId}
                        setOpenRowId={setOpenRowId}
                        selectedColor={selectedColor}
                      />
                    );
                  } else {
                    // Regular row display
                    return (
                      <Row
                        key={`regular-${row.mainItem.rmfp_id}-${index}`}
                        row={row.mainItem}
                        handleOpenModal={handleOpenModal}
                        handleRowClick={(mainRow, formattedDelayTime) => handleRowClick(mainRow, formattedDelayTime)}
                        handleOpenEditModal={handleOpenEditModal}
                        handleOpenDeleteModal={handleOpenDeleteModal}
                        handleOpenSuccess={handleOpenSuccess}
                        selectedColor={selectedColor}
                        openRowId={openRowId}
                        setOpenRowId={setOpenRowId}
                      />
                    );
                  }
                })
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
    </Paper>
  );
};


export default TableMainPrepDetail;