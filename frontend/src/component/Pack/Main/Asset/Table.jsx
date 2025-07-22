import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Typography } from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { FaRegCircle } from "react-icons/fa";
import { FcMultipleInputs } from "react-icons/fc";
import { io } from "socket.io-client";
import ReplyIcon from "@mui/icons-material/Reply"; // Add this import at the top with other imports
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";

const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
  reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
  autoConnect: true
});

const CUSTOM_COLUMN_WIDTHS = {
  details: '80px',  // รายละเอียด
  receive: '80px'   // รับเข้า
};

// ตัวอย่างข้อมูลที่จะถูกแสดงในตารางหลัก
const formatTrolleyData = (data) => {
  return data.map(trolley => ({
    tro_id: trolley.tro_id,
    production: trolley.materials[0].production, // เลือกแผนการผลิตจากวัตถุดิบแรก
    total_weight: trolley.materials.reduce((sum, mat) => sum + (parseFloat(mat.weight_RM) || 0), 0).toFixed(2),
    tray_count: trolley.materials.reduce((sum, mat) => sum + (parseInt(mat.tray_count) || 0), 0),
    materials: trolley.materials
  }));
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

const calculateTimeDifference = (dateString) => {
  if (!dateString || dateString === '-') return 0;

  const effectiveDate = new Date(dateString);
  console.log("เวลาที่ใช้ในการคำนวณ :", effectiveDate)
  const currentDate = new Date();
  console.log("เวลาปัจจุบัน :", currentDate)

  const diffInMinutes = (currentDate - effectiveDate) / (1000 * 60);
  console.log("เวลาที่ใช้ไป :", diffInMinutes)
  return diffInMinutes > 0 ? diffInMinutes : 0;
};

// Add this new function to parse time values from the database
const parseTimeValue = (timeStr) => {
  if (!timeStr || timeStr === '-') return null;

  // ตรวจสอบว่า timeStr เป็น string หรือไม่
  if (typeof timeStr !== 'string') {
    // ถ้าเป็นตัวเลข ให้แปลงเป็นนาที (สมมติว่าเป็นชั่วโมง)
    if (typeof timeStr === 'number') {
      return timeStr * 60;
    }
    // ถ้าไม่ใช่ทั้ง string และ number ให้คืนค่า null
    return null;
  }

  // ถ้าเป็น string ให้ทำการแยกด้วย .
  const timeParts = timeStr.split('.');
  const hours = parseInt(timeParts[0], 10);
  const minutes = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;

  // Return time in minutes
  return hours * 60 + minutes;
};

const getLatestColdRoomExitDate = (item) => {
  // เริ่มจากตรวจสอบวันที่ห้องเย็นที่ 3 ก่อน, จากนั้นไปห้องเย็นที่ 2, และสุดท้ายคือห้องเย็นที่ 1
  if (item.history.out_cold_date_three && item.history.out_cold_date_three !== '-') {
    return item.history.out_cold_date_three;
  } else if (item.history.out_cold_date_two && item.history.out_cold_date_two !== '-') {
    return item.history.out_cold_date_two;
  } else if (item.history.out_cold_date && item.history.out_cold_date !== '-') {
    return item.history.out_cold_date;
  }
  return '-'; // ถ้าไม่มีวันที่ออกห้องเย็นใดๆ
};

// Replace the existing getItemStatus function with this updated version


const getItemStatus = (item) => {

  const latestColdRoomExitDate = getLatestColdRoomExitDate(item);

  // Determine which scenario we're in
  let referenceDate = null;
  let remainingTimeValue = null;
  let standardTimeValue = null;


  console.log("latestColdRoomExitDate :", latestColdRoomExitDate)

  if (latestColdRoomExitDate !== '-' && item.remaining_mix_time) {
    console.log("Delay Time Mix : ", item.remaining_mix_time) // เปลี่ยนจาก remaining_mix_time เป็น mix_time
    referenceDate = latestColdRoomExitDate;
    const standard_ctp_time = 2.00;
    remainingTimeValue = parseTimeValue(item.remaining_mix_time); // ใช้ mix_time แทน remaining_mix_time
    console.log("remainingTimeValue Mix : ", remainingTimeValue) // แก้เป็นตัวแปร local
    standardTimeValue = parseTimeValue(standard_ctp_time);
    console.log("standardTimeValue Mix : ", standardTimeValue) // แก้เป็นตัวแปร local
  } else
    // Scenario 1: Cold room history exists and no rework
    if ((latestColdRoomExitDate !== '-') &&
      (!item.remaining_rework_time || item.remaining_rework_time === '-')) {
      console.log("Delay Time ctp : ", item.remaining_rework_time)
      referenceDate = latestColdRoomExitDate;
      remainingTimeValue = parseTimeValue(item.remaining_ctp_time);
      standardTimeValue = parseTimeValue(item.standard_ctp_time);
    }
    // Scenario 2: No cold room history and no rework
    else if ((latestColdRoomExitDate === '-') &&
      (!item.remaining_rework_time || item.remaining_rework_time === '-')) {
      referenceDate = item.history.rmit_date;
      remainingTimeValue = parseTimeValue(item.remaining_ptp_time);
      standardTimeValue = parseTimeValue(item.standard_ptp_time);
    }
    // Scenario 3: Rework case
    else if (item.remaining_rework_time && item.remaining_rework_time !== '-') {
      referenceDate = item.history.qc_date || item.history.qc_date;
      remainingTimeValue = parseTimeValue(item.remaining_rework_time);
      standardTimeValue = parseTimeValue(item.standard_rework_time);
    }
    else if ((latestColdRoomExitDate !== '-') &&
      item.remaining_rework_time && item.remaining_rework_time !== '-') {
      referenceDate = latestColdRoomExitDate;
      remainingTimeValue = parseTimeValue(item.remaining_rework_time);
      standardTimeValue = parseTimeValue(item.standard_rework_time);
    }

  // If we couldn't determine the scenario or don't have enough data
  if (!referenceDate || (!remainingTimeValue && !standardTimeValue)) {
    return {
      textColor: "#787878",
      statusMessage: "-",
      hideDelayTime: true,
      percentage: 0,
      timeRemaining: 0
    };
  }

  // Calculate elapsed time from reference date
  const elapsedMinutes = calculateTimeDifference(referenceDate);

  // Calculate remaining time
  let timeRemaining;
  if (remainingTimeValue !== null) {
    // If we have a remaining time value from the database, use it
    console.log(`ใช้เวลาที่มีอยู่ -> ${remainingTimeValue}`)
    console.log(`${timeRemaining} = ${remainingTimeValue} - ${elapsedMinutes}`)
    timeRemaining = remainingTimeValue - elapsedMinutes;

  } else if (standardTimeValue !== null) {
    // Otherwise use the standard time and subtract elapsed time
    console.log(`ใช้เวลา พื้นฐาน -> ${standardTimeValue}`)
    console.log(`${timeRemaining} = ${standardTimeValue} - ${elapsedMinutes}`)
    timeRemaining = standardTimeValue - elapsedMinutes;
  } else {
    // Fallback if we don't have either value
    timeRemaining = 0;
  }

  console.log("เวลาที่เหลืออยู่ :", timeRemaining);
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
  let textColor;
  if (timeRemaining < 0) {
    // Past due time - red
    textColor = "#FF0000";
  } else if (percentage >= 80) {
    // Near due time (80% or more of time has passed) - yellow
    textColor = "#FFA500";
  } else {
    // Plenty of time remaining - green
    textColor = "#008000";
  }

  return {
    textColor,
    statusMessage,
    hideDelayTime: false,
    percentage,
    timeRemaining
  };
};

const getTrolleyStatusIcons = (row) => {
  if (!row.materials || row.materials.length === 0) {
    return null;
  }

  const statusCounts = {
    red: 0,
    yellow: 0,
    green: 0
  };

  row.materials.forEach(material => {
    const { textColor } = getItemStatus(material);
    if (textColor === "#FF0000") {
      statusCounts.red++;
    } else if (textColor === "#FFA500") {
      statusCounts.yellow++;
    } else if (textColor === "#008000") {
      statusCounts.green++;
    }
  });

  const icons = [];
  if (statusCounts.red > 0) {
    icons.push(
      <Box key="red" component="span" sx={{
        display: 'inline-flex',
        alignItems: 'center',
        marginRight: 1,
        color: '#FF0000'
      }}>
        <HourglassBottomIcon fontSize="small" />
        <span style={{ fontSize: '12px', marginLeft: 2 }}>{statusCounts.red}</span>
      </Box>
    );
  }
  if (statusCounts.yellow > 0) {
    icons.push(
      <Box key="yellow" component="span" sx={{
        display: 'inline-flex',
        alignItems: 'center',
        marginRight: 1,
        color: '#FFA500'
      }}>
        <HourglassBottomIcon fontSize="small" />
        <span style={{ fontSize: '12px', marginLeft: 2 }}>{statusCounts.yellow}</span>
      </Box>
    );
  }
  if (statusCounts.green > 0) {
    icons.push(
      <Box key="green" component="span" sx={{
        display: 'inline-flex',
        alignItems: 'center',
        marginRight: 1,
        color: '#008000'
      }}>
        <HourglassBottomIcon fontSize="small" />
        <span style={{ fontSize: '12px', marginLeft: 2 }}>{statusCounts.green}</span>
      </Box>
    );
  }

  return (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icons}
    </Box>
  );
};

const Row = ({
  row,
  index,
  backgroundColor,
  handleOpenEditModal,
  handleOpenSendbackModal // Add this new prop
}) => {
  const [open, setOpen] = useState(false);
  const [openMaterialId, setOpenMaterialId] = useState(null);

  const toggleDetails = (e) => {
    e.stopPropagation();
    setOpen(!open);
  };

  const toggleMaterialHistory = (materialId) => {
    setOpenMaterialId(openMaterialId === materialId ? null : materialId);
  };

  return (
    <>
      <TableRow >
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell
          style={{
            width: '120px',
            textAlign: 'center',
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            height: '40px',
            padding: '0px 10px',
            borderRight: "0px solid #e0e0e0",
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
            backgroundColor: backgroundColor,
            color: "#787878",
            fontSize: '14px'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ mr: 1 }}>{row.tro_id || '-'}</Typography>
            {getTrolleyStatusIcons(row)}
          </Box>
        </TableCell>
        <TableCell
          style={{
            textAlign: 'center',
            borderLeft: "1px solid #f2f2f2",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            height: '40px',
            padding: '0px 10px',
            backgroundColor: backgroundColor,
            color: "#787878",
            fontSize: '14px'
          }}
        >
          {row.production || '-'}
        </TableCell>
        <TableCell
          style={{
            width: '120px',
            textAlign: 'center',
            borderLeft: "1px solid #f2f2f2",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            height: '40px',
            padding: '0px 10px',
            backgroundColor: backgroundColor,
            color: "#787878",
            fontSize: '14px'
          }}
        >
          {row.total_weight || '-'} kg
        </TableCell>
        <TableCell
          style={{
            width: '120px',
            textAlign: 'center',
            borderLeft: "1px solid #f2f2f2",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            height: '40px',
            padding: '0px 10px',
            backgroundColor: backgroundColor,
            color: "#787878",
            fontSize: '14px'
          }}
        >
          {row.tray_count || '0'}
        </TableCell>

        <ActionButton
          backgroundColor={backgroundColor}
          width={CUSTOM_COLUMN_WIDTHS.details}
          onClick={toggleDetails}
          icon={<VisibilityIcon style={{ color: '#4aaaec', fontSize: '22px' }} />}
          action="รายละเอียด"
        />

        <ActionButton
          backgroundColor={backgroundColor}
          width={CUSTOM_COLUMN_WIDTHS.receive}
          onClick={(e) => {
            e.stopPropagation();
            // เพิ่มการจัดการเมื่อกดปุ่มรับเข้า
            handleOpenEditModal(row);
            console.log("รับเข้ารถเข็น:", row.tro_id);
          }}
          icon={<FcMultipleInputs style={{ color: '#4aaaec', fontSize: '22px' }} />}
          action="รับเข้า"

          borderRight="1px solid #e0e0e0"
        />
        <ActionButton
          backgroundColor={backgroundColor}
          width={CUSTOM_COLUMN_WIDTHS.receive}
          onClick={(e) => {
            e.stopPropagation();
            // เพิ่มการจัดการเมื่อกดปุ่มส่งกลับ
            handleOpenSendbackModal(row);
            console.log("ส่งกลับห้องเย็น:", row.tro_id);
          }}
          icon={<ReplyIcon style={{ color: '#4aaaec', fontSize: '22px' }} />}
          action="ส่งกลับห้องเย็น"
          borderRadius="0 8px 8px 0"
          borderRight="1px solid #e0e0e0"
        />
      </TableRow>



      {/* รายละเอียดวัตถุดิบในรถเข็น */}
      <TableRow>
        <TableCell style={{ padding: 0, border: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, borderRadius: 2, backgroundColor: '#f9f9f9', padding: 2 }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ color: '#4aaaec', fontSize: 16 }}>
                รายละเอียดวัตถุดิบในรถเข็น {row.tro_id}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#787878' }}>DelayTime</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#787878' }}>Batch</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#787878' }}>Mat</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#787878' }}>รายชื่อวัตถุดิบ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#787878' }}>แผนการผลิต</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#787878' }}>น้ำหนักวัตถุดิบ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#787878' }}>จำนวนถาด</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.materials.map((material, matIdx) => (
                    <React.Fragment key={matIdx}>
                      <TableRow
                        sx={{
                          '&:hover': {
                            backgroundColor: '#eaf6ff',
                            cursor: 'pointer'
                          }
                        }}
                        onClick={() => toggleMaterialHistory(material.mapping_id)}
                      >
                        <TableCell align="center">
                          {(() => {
                            const status = getItemStatus(material);
                            return (
                              <Box sx={{
                                color: status.textColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: status.timeRemaining < 0 ? 'bold' : 'normal'
                              }}>
                                {status.hideDelayTime ? (
                                  '-'
                                ) : (
                                  <>
                                    <HourglassBottomIcon fontSize="small" sx={{ mr: 0.5 }} />
                                    {status.statusMessage}
                                  </>
                                )}
                              </Box>
                            );
                          })()}
                        </TableCell> {/* DelayTime */}
                        <TableCell align="center">{material.batch_after || '-'}</TableCell>
                        <TableCell align="center">{material.mat || material.mix_code || '-'}</TableCell>
                        <TableCell align="center">{material.mat_name || material.mix_code_name || '-'}</TableCell>
                        <TableCell align="center">{material.production || '-'}</TableCell>
                        <TableCell align="center">{material.weight_RM || '-'} kg</TableCell>
                        <TableCell align="center">{material.tray_count || '0'}</TableCell>
                      </TableRow>

                      {/* ประวัติวันที่เวลาของวัตถุดิบ */}
                      <TableRow>
                        <TableCell colSpan={7} style={{ padding: 0, border: 0 }}>
                          <Collapse in={openMaterialId === material.mapping_id} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 1, backgroundColor: '#eff8ff', borderRadius: 1, padding: 1 }}>
                              <Typography variant="subtitle2" sx={{ color: '#4aaaec', mb: 1 }}>
                                ประวัติวันที่เวลาของวัตถุดิบ {material.mat_name}
                              </Typography>
                              <TableContainer sx={{ maxWidth: "100%", overflow: "hidden" }}>
                                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px', width: '11%' }}>เวลาต้ม/อบเสร็จ</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px', width: '11%' }}>เวลาแปรรูปเสร็จ</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px', width: '11%' }}>เข้าห้องเย็น1</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px', width: '11%' }}>ออกห้องเย็น1</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px', width: '11%' }}>เข้าห้องเย็น2</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px', width: '11%' }}>ออกห้องเย็น2</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px', width: '11%' }}>เข้าห้องเย็น3</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px', width: '11%' }}>ออกห้องเย็น3</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px', width: '12%' }}>เวลาแก้ไข</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    <TableRow>
                                      <TableCell align="center" sx={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.history?.cooked_date || '-'}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.history?.rmit_date || '-'}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.history?.come_cold_date || '-'}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.history?.out_cold_date || '-'}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.history?.come_cold_date_two || '-'}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.history?.out_cold_date_two || '-'}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.history?.come_cold_date_three || '-'}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.history?.out_cold_date_three || '-'}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.history?.rework_date || '-'}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
    </>
  );
};
// ตรวจสอบว่ารถเข็นมีวัตถุดิบที่มีสถานะตรงกับสีที่เลือกหรือไม่
const filterTrolleyByColor = (trolley, color) => {
  if (!color) return true; // ถ้าไม่มีการเลือกสี ให้แสดงทั้งหมด
  if (!trolley.materials || trolley.materials.length === 0) return false;

  return trolley.materials.some(material => {
    const status = getItemStatus(material);

    switch (color) {
      case 'green':
        // วัตถุดิบที่มีเวลาเหลือมากกว่า 0 และใช้เวลาไปน้อยกว่า 80%
        return status.timeRemaining > 0 && status.percentage < 80;
      case 'yellow':
        // วัตถุดิบที่มีเวลาเหลือมากกว่า 0 และใช้เวลาไปมากกว่าหรือเท่ากับ 80%
        return status.timeRemaining > 0 && status.percentage >= 80;
      case 'red':
        // วัตถุดิบที่เลยเวลากำหนดแล้ว
        return status.timeRemaining < 0;
      default:
        return true;
    }
  });
};

const ActionButton = ({ width, onClick, icon, backgroundColor, action, borderRadius = "0", borderRight = "1px solid #f2f2f2" }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderLeft: '1px solid #f2f2f2',
        borderRight: borderRight,
        borderTopRightRadius: borderRadius.includes("8px") ? "8px" : "0",
        borderBottomRightRadius: borderRadius.includes("8px") ? "8px" : "0",
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
      title={action}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const TableMainPrep = ({ handleOpenModal, data, handleRowClick, handleOpenEditModal, handleOpenSuccess, handleOpenDeleteModal, handleOpenSendbackModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');

  // แปลงข้อมูลให้อยู่ในรูปแบบที่เหมาะสมสำหรับการแสดงผล
  const [formattedData, setFormattedData] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);

  useEffect(() => {
    if (data && data.length > 0) {
      const formatted = formatTrolleyData(data);
      setFormattedData(formatted);
      setFilteredRows(formatted);
    }
  }, [data]);

  useEffect(() => {
    socket.on("dataUpdated", (updatedData) => {
      const formatted = formatTrolleyData(updatedData);
      setFormattedData(formatted);
      setFilteredRows(formatted);
    });

    return () => {
      socket.off("dataUpdated");
    };
  }, []);

  // แก้ไขฟังก์ชัน useEffect สำหรับการกรองข้อมูล
  useEffect(() => {
    if (formattedData.length > 0) {
      const filtered = formattedData.filter((row) => {
        // กรองตามคำค้นหา
        const matchesSearch = Object.values(row).some((value) => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchTerm.toLowerCase());
          } else if (Array.isArray(value)) {
            // ค้นหาใน materials
            return value.some(item =>
              Object.values(item).some(subValue =>
                subValue && typeof subValue === 'string' &&
                subValue.toLowerCase().includes(searchTerm.toLowerCase())
              )
            );
          }
          return false;
        });

        // กรองตามสีที่เลือก
        const matchesColor = filterTrolleyByColor(row, selectedColor);

        // ต้องตรงทั้งคำค้นหาและสีที่เลือก
        return matchesSearch && matchesColor;
      });

      setFilteredRows(filtered);
    }
  }, [searchTerm, formattedData, selectedColor]);

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
    setPage(0); // เมื่อเปลี่ยนฟิลเตอร์ให้กลับไปหน้าแรก
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
      <TableContainer style={{ padding: '0px 20px' }} sx={{ height: 'calc(68vh)', overflowY: 'auto', '@media (max-width: 1200px)': { overflowX: 'scroll', minWidth: "300px" } }}>
        <Table stickyHeader style={{ tableLayout: 'fixed' }} sx={{ minWidth: '1250px', width: '100%' }}>
          <TableHead style={{ marginBottom: "10px" }}>
            <TableRow sx={{ height: '40px' }}>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', borderLeft: "1px solid #e0e0e0", padding: '5px', width: "300px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ป้ายทะเบียน</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px' }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>แผนการผลิต</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "120px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>น้ำหนัก/คัน</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: "120px" }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>จำนวนถาด/คัน</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: CUSTOM_COLUMN_WIDTHS.details }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>รายละเอียด</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: CUSTOM_COLUMN_WIDTHS.receive }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>รับเข้า</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', width: CUSTOM_COLUMN_WIDTHS.receive }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ส่งกลับห้องเย็น</Box>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
            {filteredRows.length > 0 ? (
              filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <Row
                  key={row.tro_id}
                  row={row}
                  index={index}
                  backgroundColor={index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)"}
                  handleOpenEditModal={handleOpenEditModal}
                  handleOpenSendbackModal={handleOpenSendbackModal} // Pass the new function
                />

              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
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