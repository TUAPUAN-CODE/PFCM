import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, Grid, TablePagination, Divider, Typography, styled, IconButton } from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { SlClose } from "react-icons/sl";
import { FaRegCircle, FaRegCheckCircle, FaEye, FaClipboardCheck } from "react-icons/fa";
import QualityCheckModal from './QualityCheckModal';
import axios from 'axios';
import { RiArrowUpBoxLine } from "react-icons/ri";


const API_URL = import.meta.env.VITE_API_URL;

const CUSTOM_COLUMN_WIDTHS = {
  delayTime: '200px',
  viewDetails: '80px', // ปรับเป็น 80px สำหรับปุ่มรายละเอียด
  qualityCheck: '80px' // เพิ่มคอลัมน์ใหม่สำหรับปุ่มตรวจสอบ
};

// ฟังก์ชันเพื่อหาวันที่ล่าสุดในการเข้าห้องเย็น
const getLatestComeColdDate = (row) => {
  // เก็บวันที่ทั้งหมดในอาร์เรย์
  const dates = [
    row.come_cold_date,
    row.come_cold_date_two,
    row.come_cold_date_three
  ].filter(date => date); // กรองเอาเฉพาะค่าที่ไม่เป็น null หรือ undefined

  if (dates.length === 0) {
    // ถ้าไม่มีวันที่เข้าห้องเย็นเลย ให้ใช้วันที่ rmit แทน (ถ้ามี)
    return row.rmit_date || null;
  }

  // แปลงเป็น Date objects
  const dateObjects = dates.map(date => new Date(date));

  // หาวันที่ล่าสุด
  return new Date(Math.max(...dateObjects)).toISOString().replace('T', ' ');
};

const calculateTimeDifference = (ComeColdDateTime) => {
  const comecolddatetime = new Date(ComeColdDateTime);
  const currentDate = new Date();
  return (currentDate - comecolddatetime) / (1000 * 60);
};

// ปรับปรุงฟังก์ชัน formatTime เพื่อให้แสดงเวลาอย่างถูกต้อง
const formatTime = (minutes) => {
  if (isNaN(minutes) || minutes === null) return "-";

  const absMinutes = Math.abs(minutes);
  const days = Math.floor(absMinutes / 1440);
  const hours = Math.floor((absMinutes % 1440) / 60);
  const mins = Math.floor(absMinutes % 60);

  let timeString = '';
  if (days > 0) timeString += `${days} วัน`;
  if (hours > 0) timeString += `${timeString.length > 0 ? ' ' : ''}${hours} ชม.`;
  if (mins > 0 || (days === 0 && hours === 0)) timeString += `${timeString.length > 0 ? ' ' : ''}${mins} นาที`;
  return timeString.trim();
};

const getRowStatus = (row) => {
  if (!row) return { borderColor: "#969696", statusMessage: "-", hideDelayTime: true, percentage: 0 };

  console.log("Row Data:", row); // Debugging

  // หาวันที่เข้าห้องเย็นล่าสุด
  const latestComeColdDate = getLatestComeColdDate(row);
  console.log("วันที่เข้าห้องเย็นล่าสุด:", latestComeColdDate);

  if (!latestComeColdDate) {
    return {
      borderColor: "#969696",
      statusMessage: "รอดำเนินการ",
      hideDelayTime: true,
      percentage: 0,
    };
  }

  // คำนวณเวลาที่ผ่านไปจริงตั้งแต่เข้าห้องเย็น (นาที)
  const timePassed = calculateTimeDifference(latestComeColdDate);
  console.log("เวลาที่ผ่านไปจริง (นาที):", timePassed);

  // กรณีวัตถุดิบผสม (มี mix_time)
  if (row.mix_time !== null && row.mix_time !== undefined) {
    const mixTimeValue = parseFloat(row.mix_time);
    const mixTimeMinutes = Math.floor(mixTimeValue) * 60 + (mixTimeValue % 1) * 100;
    console.log("เวลาผสมมาตรฐาน (นาที):", mixTimeMinutes);

    // กรณีเกินเวลา mix_time
    if (timePassed > mixTimeMinutes) {
      const exceededMinutes = timePassed - mixTimeMinutes;
      const standardTime = 120; // 2 ชั่วโมง (120 นาที) สำหรับวัตถุดิบผสม
      const percentage = ((standardTime + exceededMinutes) / standardTime) * 100;

      return {
        borderColor: '#FF8175',
        statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
        hideDelayTime: false,
        percentage: percentage
      };
    }

    // กรณียังไม่เกินเวลา
    const timeRemaining = mixTimeMinutes - timePassed;
    const percentage = Math.min(100, Math.max(0, (timePassed / mixTimeMinutes) * 100));

    return {
      borderColor: getBorderColor(percentage, timeRemaining),
      statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
      hideDelayTime: timeRemaining > 0,
      percentage: percentage
    };
  }

  // กรณีมี remaining_rework_time
  if (row.remaining_rework_time !== null && row.remaining_rework_time !== undefined) {
    const remainingReworkTime = parseFloat(row.remaining_rework_time);
    const standardReworkTime = parseFloat(row.standard_rework_time);
    const standardReworkTimeMinutes = Math.floor(standardReworkTime) * 60 + (standardReworkTime % 1) * 100;

    // กรณีค่า remaining_rework_time เป็นลบ
    if (remainingReworkTime < 0) {
      const exceededMinutes = Math.floor(Math.abs(remainingReworkTime)) * 60 + (Math.abs(remainingReworkTime) % 1) * 100;
      const rs_exceededMinutesFormRework = -1 * exceededMinutes - timePassed;
      const percentage = ((standardReworkTimeMinutes + exceededMinutes) / standardReworkTimeMinutes) * 100;

      return {
        borderColor: '#FF8175',
        statusMessage: `เลยกำหนด ${formatTime(rs_exceededMinutesFormRework)}`,
        hideDelayTime: false,
        percentage: percentage
      };
    }

    // กรณีค่า remaining_rework_time = 0
    if (remainingReworkTime === 0) {
      return {
        borderColor: '#FF8175',
        statusMessage: `เลยกำหนด ${formatTime(timePassed)}`,
        hideDelayTime: false,
        percentage: 100 + (timePassed / standardReworkTimeMinutes * 100)
      };
    }

    // กรณีค่า remaining_rework_time เป็นบวก
    const remainingReworkTimeMinutes = Math.floor(remainingReworkTime) * 60 + (remainingReworkTime % 1) * 100;
    const timeRemaining = remainingReworkTimeMinutes - timePassed;
    const percentage = Math.min(100, Math.max(0, (1 - timeRemaining / standardReworkTimeMinutes) * 100));

    return {
      borderColor: getBorderColor(percentage, timeRemaining),
      statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
      hideDelayTime: timeRemaining > 0,
      percentage: percentage
    };
  }

  // กรณีใช้ cold_time (กรณีทั่วไป)
  const coldValue = parseFloat(row.cold);
  const standardCold = parseFloat(row.standard_cold);
  const standardColdMinutes = Math.floor(standardCold) * 60 + (standardCold % 1) * 100;

  // กรณีค่า cold เป็นลบ
  if (coldValue < 0) {
    const exceededMinutesFromCold = Math.floor(Math.abs(coldValue)) * 60 + (Math.abs(coldValue) % 1) * 100;
    const rs_exceededMinutesFromCold = -1 * exceededMinutesFromCold - timePassed;
    const percentage = ((standardColdMinutes + exceededMinutesFromCold) / standardColdMinutes) * 100;

    return {
      borderColor: '#FF8175',
      statusMessage: `เลยกำหนด ${formatTime(rs_exceededMinutesFromCold)}`,
      hideDelayTime: false,
      percentage: percentage
    };
  }

  // กรณีค่า cold = 0
  if (coldValue === 0) {
    return {
      borderColor: '#FF8175',
      statusMessage: `เลยกำหนด ${formatTime(timePassed)}`,
      hideDelayTime: false,
      percentage: 100 + (timePassed / standardColdMinutes * 100)
    };
  }

  // กรณีค่า cold เป็นบวก
  const coldValueMinutes = Math.floor(coldValue) * 60 + (coldValue % 1) * 100;

  // ตรวจสอบว่าเวลาที่ผ่านไปจริงมากกว่าเวลาที่เหลือจาก cold หรือไม่
  if (timePassed > coldValueMinutes) {
    const exceededMinutes = timePassed - coldValueMinutes;
    const percentage = ((standardColdMinutes + exceededMinutes) / standardColdMinutes) * 100;

    return {
      borderColor: '#FF8175',
      statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
      hideDelayTime: false,
      percentage: percentage
    };
  }

  // กรณีที่ยังไม่เกินเวลา
  const timeRemaining = coldValueMinutes - timePassed;
  const percentage = Math.min(100, Math.max(0, (timePassed / standardColdMinutes) * 100));

  return {
    borderColor: getBorderColor(percentage, timeRemaining),
    statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
    hideDelayTime: timeRemaining > 0,
    percentage: percentage
  };
};

const getStatusMessage = (timeRemaining, coldValue) => {
  // กรณีที่ค่า coldValue เป็นลบ (ส่งมาโดยตรง)
  if (coldValue !== undefined && coldValue < 0) {
    // แปลงค่า cold ที่เป็นลบจากชั่วโมง.นาที เป็นนาทีทั้งหมด
    const exceededMinutes = Math.floor(Math.abs(coldValue)) * 60 + (Math.abs(coldValue) % 1) * 100;
    return `เลยกำหนด ${formatTime(exceededMinutes)}`;
  }

  // สำหรับ timeRemaining (กรณีปกติ)
  if (timeRemaining === null || timeRemaining === undefined) {
    return "-";
  }

  // Normal logic for positive cold values or based on timeRemaining
  return timeRemaining > 0
    ? `เหลืออีก ${formatTime(timeRemaining)}`
    : `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;
};

const getBorderColor = (percentage, timeRemaining) => {
  if (timeRemaining < 0) return '#FF8175'; // สีแดง - เมื่อเลยกำหนดเวลา
  if (percentage >= 100) return '#FF8175'; // สีแดง - 100% ขึ้นไป
  if (percentage >= 70) return '#FFF398'; // สีเหลือง - 70-99%
  return '#80FF75'; // สีเขียว - 1-69%
};

// ฟังก์ชันสำหรับเรียก API อัปเดตสถานะ
const updateRmStatus = async (mapping_id) => {
  try {
    const response = await fetch(`${API_URL}/api/clodstorage/rmInTrolley`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mapping_id: mapping_id,
        rm_status: 'รอแก้ไข'
      }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating RM status:', error);
    throw error;
  }
};

const Row = ({
  row,
  tableColumns,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenSuccess,
  handleOpenQualityCheckModal,
  selectedColor,
  openRowId,
  setOpenRowId,
  index
}) => {
  if (!row) return null;

  const isQcChecked = (row.rm_status === 'QcCheck') && row.qccheck_cold !== null;

  const { borderColor, statusMessage, hideDelayTime, percentage } = getRowStatus(row);
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";

  const isOverdue = percentage >= 100 || statusMessage.includes("เลยกำหนด");
  const shouldBeReworkStatus = isOverdue && row.rm_status !== 'รอแก้ไข';

  useEffect(() => {
    if (shouldBeReworkStatus) {
      updateRmStatus(row.mapping_id)
        .then((response) => {
          console.log(`Updated status for ${row.mapping_id} to 'รอแก้ไข'`, response);
        })
        .catch(error => {
          console.error('Failed to update status:', error);
        });
    }
  }, [isOverdue, row.rm_status, row.mapping_id]);

  const colorMatch =
    (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175') ||
    (selectedColor === 'gray' && borderColor === '#969696');

  if (selectedColor && !colorMatch) return null;

  const isOpen = openRowId === row.mapping_id;

  const handleDetailClick = (e) => {
    e.stopPropagation();
    setOpenRowId(isOpen ? null : row.mapping_id);
    if (typeof handleRowClick === 'function') {
      handleRowClick(row.mapping_id);
    } else if (typeof handleOpenModal === 'function') {
      handleOpenModal(row);
    }
  };





  return (
    <>
      <TableRow>
        <TableCell style={{ height: "4px", padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>
      <TableRow>
        {/* DelayTime column with hourglass icon */}
        <TableCell
          style={{
            width: CUSTOM_COLUMN_WIDTHS.delayTime,
            textAlign: 'center',
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            height: '36px',
            padding: '0px 0px',
            borderRight: "0px solid #e0e0e0",
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
            borderLeft: `5px solid ${borderColor}`,
            backgroundColor: backgroundColor
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>

            <span style={{
              fontSize: '12px',
              color: isOverdue ? "red" : (
                borderColor === "#969696"
                  ? "#626262"
                  : percentage >= 50
                    ? "orange"
                    : "green"
              ),
            }}>
              {statusMessage}
            </span>
          </div>
        </TableCell>

        {/* Data columns */}
        {tableColumns.map((column) => (
          <TableCell
            key={column.id}
            align="center"
            style={{
              width: column.width,
              borderLeft: "1px solid #f2f2f2",
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '13px',
              height: '36px',
              lineHeight: '1.4',
              padding: '0px 8px',
              color: column.id === 'rm_cold_status' && column.getColor
                ? column.getColor(row[column.id])
                : "#787878",
              backgroundColor: backgroundColor
            }}
          >
            {row[column.id]}
          </TableCell>
        ))}

        {/* View Details button */}
        <TableCell
          onClick={handleDetailClick}
          align="center"
          sx={{
            borderLeft: "1px solid #e0e0e0", // เพิ่มเส้นขอบด้านซ้ายให้ชัดเจนขึ้น
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '13px',
            height: '36px',
            padding: '0px',
            cursor: 'pointer',
            backgroundColor: backgroundColor,
            '&:hover': {
              backgroundColor: 'rgba(33, 150, 243, 0.2)' // เพิ่มความเข้มของสีพื้นหลังเมื่อ hover
            },
            '&:hover .view-details-icon': {
              color: '#0D47A1',
              transform: 'scale(1.2)' // เพิ่มขนาดไอคอนเมื่อ hover
            }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              width: '100%', // ให้ Box ขยายเต็มความกว้าง
              color: '#2196F3',
              padding: '8px', // เพิ่ม padding เพื่อเพิ่มพื้นที่คลิก
              transition: 'all 0.2s ease' // เพิ่ม transition effect
            }}
            aria-label="รายละเอียด"
            className="view-details-icon"
          >
            <FaEye style={{ fontSize: '18px' }} /> {/* เพิ่มขนาดไอคอน */}
          </Box>
        </TableCell>

        {/* Quality Check button */}
        <TableCell
          onClick={(e) => {
            if (!isQcChecked && !row.mix_code && row.rm_cold_status !== "วัตถุดิบรอแก้ไข" &&
              row.rm_cold_status !== "วัตถุดิบรับฝาก" && row.rm_status === "รอแก้ไข" &&
              row.remark_rework_cold === null) {
              e.stopPropagation();
              handleOpenQualityCheckModal(row);
            }
          }}
          align="center"
          sx={{
            borderLeft: "1px solid #e0e0e0", // เพิ่มเส้นขอบด้านซ้ายให้ชัดเจนขึ้น
            borderRight: "1px solid #e0e0e0",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '13px',
            height: '36px',
            padding: '0px',
            cursor: isQcChecked || row.mix_code || row.rm_cold_status === "วัตถุดิบรอแก้ไข" ||
              row.rm_cold_status === "วัตถุดิบรับฝาก" || row.rm_status !== "รอแก้ไข" ||
              row.remark_rework_cold !== null
              ? 'default'
              : 'pointer',
            backgroundColor: backgroundColor,
            borderTopRightRadius: "8px",
            borderBottomRightRadius: "8px",
            '&:hover': {
              backgroundColor: isQcChecked || row.mix_code || row.rm_cold_status === "วัตถุดิบรอแก้ไข" ||
                row.rm_cold_status === "วัตถุดิบรับฝาก" || row.rm_status !== "รอแก้ไข" ||
                row.remark_rework_cold !== null
                ? backgroundColor
                : 'rgba(76, 175, 80, 0.2)' // เพิ่มสีพื้นหลังเมื่อ hover สำหรับกรณีที่คลิกได้
            },
            '&:hover .quality-check-icon': {
              color: isQcChecked || row.mix_code || row.rm_cold_status === "วัตถุดิบรอแก้ไข" ||
                row.rm_cold_status === "วัตถุดิบรับฝาก" || row.rm_status !== "รอแก้ไข" ||
                row.remark_rework_cold !== null
                ? '#e0e0e0'
                : '#2E7D32',
              transform: isQcChecked || row.mix_code || row.rm_cold_status === "วัตถุดิบรอแก้ไข" ||
                row.rm_cold_status === "วัตถุดิบรับฝาก" || row.rm_status !== "รอแก้ไข" ||
                row.remark_rework_cold !== null
                ? 'none'
                : 'scale(1.2)' // เพิ่มขนาดไอคอนเมื่อ hover สำหรับกรณีที่คลิกได้
            }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              width: '100%', // ให้ Box ขยายเต็มความกว้าง
              color: isQcChecked || row.mix_code || row.rm_cold_status === "วัตถุดิบรอแก้ไข" ||
                row.rm_cold_status === "วัตถุดิบรับฝาก" || row.rm_status !== "รอแก้ไข" ||
                row.remark_rework_cold !== null
                ? '#e0e0e0'
                : '#4CAF50',
              padding: '8px', // เพิ่ม padding เพื่อเพิ่มพื้นที่คลิก
              transition: 'all 0.2s ease' // เพิ่ม transition effect
            }}
            aria-label="ตรวจสอบคุณภาพ"
            className="quality-check-icon"
          >
            <FaClipboardCheck style={{ fontSize: '18px' }} /> {/* เพิ่มขนาดไอคอน */}
          </Box>
        </TableCell>

      </TableRow>
      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid", height: "4px" }}>
        </TableCell>
      </TableRow>

      {/* Collapse row for details */}
      <TableRow>
        <TableCell style={{ padding: 0, border: 'none' }} colSpan={tableColumns.length + 2}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, borderRadius: '8px', overflow: 'hidden', borderTop: '1px solid #ececec', borderLeft: '1px solid #ececec', borderBottom: "1px solid #ececec", borderRight: '1px solid #ececec', maxWidth: '100%' }}>
              <Box sx={{ padding: 0 }}>
                <Box sx={{ backgroundColor: "#f5f5f5", padding: "8px", borderBottom: '1px solid #ececec' }}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 'bold', color: "#555555" }}>รายละเอียดมูลในรถเข็น {row.tro_id}</Typography>
                </Box>
                <Table size="small" sx={{ width: '100%' }}>
                  <TableHead>
                    <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell sx={{ fontSize: "12px", fontWeight: 'bold', borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>DelayTime</TableCell>
                      <TableCell sx={{ fontSize: "12px", fontWeight: 'bold', borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>Batch</TableCell>
                      <TableCell sx={{ fontSize: "12px", fontWeight: 'bold', borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>Material</TableCell>
                      <TableCell sx={{ fontSize: "12px", fontWeight: 'bold', borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>รายชื่อวัตถุดิบ</TableCell>
                      <TableCell sx={{ fontSize: "12px", fontWeight: 'bold', borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>Level EU</TableCell>
                      <TableCell sx={{ fontSize: "12px", fontWeight: 'bold', borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>น้ำหนัก</TableCell>
                      <TableCell sx={{ fontSize: "12px", fontWeight: 'bold', borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>จำนวนถาด</TableCell>
                      <TableCell sx={{ fontSize: "12px", fontWeight: 'bold', textAlign: 'center', color: "#000000", padding: '8px' }}>สถานะวัตถุดิบ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{
                        fontSize: "12px",
                        borderRight: '1px solid #ececec',
                        textAlign: 'center',
                        color: isOverdue ? "red" : (percentage >= 50 ? "orange" : "green"),
                        padding: '8px',
                        backgroundColor: isOverdue ? "#fff0f0" : (percentage >= 50 ? "#fffcef" : "#f0fff0")
                      }}>
                        {statusMessage}
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>
                        {row.batch || "-"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>
                        {row.mat || "-"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>
                        {row.mat_name || "-"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>
                        {row.level_eu || "-"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>
                        {row.weight_RM || "-"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', color: "#000000", padding: '8px' }}>
                        {row.tray_count || "-"}
                      </TableCell>
                      <TableCell sx={{
                        fontSize: "12px",
                        textAlign: 'center',
                        color:
                          ["รอกลับมาเตรียม", "QcCheck รอ MD"].includes(row.rm_status) ? "#00bcd4" :
                            row.rm_status === "เหลือจากไลน์ผลิต" ? "#ff9800" :
                              row.rm_status === "QcCheck" ? "#4caf50" :
                                row.rm_status === "รอแก้ไข" ? "#f44336" :
                                  "#000000",
                        padding: '8px'
                      }}>
                        {row.rm_status}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              <Divider sx={{ my: 0 }} />
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <Table size="small" aria-label="purchases" sx={{ width: '100%' }}>
                  <TableHead>
                    <TableRow style={{ backgroundColor: "#F9F9F9" }}>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>เวลาเบิกห้องเย็นใหญ่</TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>เวลาต้มอบเสร็จ</TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>
                        {row.isMixed ? "เวลาผสมเสร็จ" : "เวลาเตรียมเสร็จ"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>เวลาเข้าห้องเย็น1</TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>เวลาออกห้องเย็น1</TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>เวลาเข้าห้องเย็น2</TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>เวลาออกห้องเย็น2</TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>เวลาเข้าห้องเย็น3</TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>เวลาออกห้องเย็น3</TableCell>
                      <TableCell sx={{ fontSize: "12px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", padding: '4px' }}>เวลาแก้ไข</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow key={row.mapping_id}>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.withdraw_date ? new Date(row.withdraw_date).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.cooked_date ? new Date(row.cooked_date).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.isMixed
                          ? (row.mixed_date ? new Date(row.mixed_date).toLocaleString() : "-")
                          : (row.rmit_date ? new Date(row.rmit_date).toLocaleString() : "-")
                        }
                      </TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.come_cold_date ? new Date(row.come_cold_date).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.out_cold_date ? new Date(row.out_cold_date).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.come_cold_date_two ? new Date(row.come_cold_date_two).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.out_cold_date_two ? new Date(row.out_cold_date_two).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.come_cold_date_three ? new Date(row.come_cold_date_three).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.out_cold_date_three ? new Date(row.out_cold_date_three).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '4px', fontSize: '12px' }}>
                        {row.rework_date ? new Date(row.rework_date).toLocaleString() : "-"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// ปรับปรุงรายการคอลัมน์ที่ใช้ในตาราง
const tableColumns = [
  // { id: 'batch', name: 'Batch', width: '95px' }, // ลดลง
  // { id: 'mat', name: 'Material', width: '95px' }, // ลดลง
  { id: 'mat_name', name: 'รายชื่อวัตถุดิบ', width: '240px' }, // ลดลง
  { id: 'production', name: 'แผนการผลิต', width: '140px' }, // ลดลง
  { id: 'tro_id', name: 'ป้ายทะเบียน', width: '95px' }, // ลดลง
  { id: 'weight_RM', name: 'น้ำหนักวัตถุดิบ', width: '100px' }, // ลดลง
  // { id: 'weight_RM', name: 'น้ำหนักวัตถุดิบ', width: '90px' }, // ลดลง
  // { id: 'ntray', name: 'จำนวนถาด', width: '75px' }, // ลดลง
  {
    id: 'rm_cold_status',
    name: 'ประเภทวัตถุดิบ',
    width: '150px',
    getColor: (value) => {
      switch (value) {
        case "วัตถุดิบรับฝาก": return "#1976d2"; // สีน้ำเงิน
        case "เหลือจากไลน์ผลิต": return "#ff9800"; // สีเหลือง
        case "วัตถุดิบตรง": return "#4caf50"; // สีเขียว
        case "วัตถุดิบรอแก้ไข": return "#f44336"; // สีแดง
        default: return "#787878"; // สีเดิม
      }
    }
  },// ลดลง
  { id: 'cs_name', name: 'ชื่อห้องเย็น', width: '90px' }, // ลดลง
  { id: 'slot_id', name: 'ช่องจอด', width: '60px' }, // ลดลง

];

const TableMainPrep = ({ handleOpenModal, data, handleRowClick, handleOpenEditModal, handleOpenSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);
  const [qualityCheckModalOpen, setQualityCheckModalOpen] = useState(false);
  const [selectedRowForQC, setSelectedRowForQC] = useState(null);

  const handleOpenQualityCheckModal = (row) => {
    if (!row) {
      console.error('Row data is null or undefined');
      return;
    }

    setSelectedRowForQC(row);
    setQualityCheckModalOpen(true);
  };

  const handleCloseQualityCheckModal = () => {
    setQualityCheckModalOpen(false);
  };

  const handleSubmitQualityCheck = async (data) => {
    try {
      const response = await axios.put(`${API_URL}/api/qc/cold/check`, data);
      console.log('Quality check submitted:', response.data);
      handleCloseQualityCheckModal();
      alert('บันทึกข้อมูลสำเร็จ');
      // อาจเพิ่มการแจ้งเตือนหรือรีเฟรชข้อมูลที่นี่
    } catch (error) {
      console.error('Error submitting quality check:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
      // จัดการข้อผิดพลาด
    }
  };


  useEffect(() => {
    // เพิ่ม qc_datetime ให้กับข้อมูลเพื่อใช้ในการคำนวณเวลา
    const processedData = Array.isArray(data) ? data.map(row => ({
      ...row,
      qc_datetime: row.come_cold_date || row.rmit_date
    })) : [];

    // ตรวจสอบว่า data มีค่าและเป็น array หรือไม่
    if (processedData.length > 0) {
      setFilteredRows(
        processedData.filter((row) =>
          row && Object.values(row).some((value) =>
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      );
    } else {
      setFilteredRows([]);
    }
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

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        gap: 1,
        paddingX: 2,
        height: { xs: 'auto', sm: '50px' },
        margin: '5px 5px'
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
            sx: { height: "36px" }, // ลดความสูงลง
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              height: "36px", // ลดความสูงลง
              fontSize: "13px", // ลดขนาดฟอนต์ลง
              borderRadius: "8px",
              color: "#787878",
            },
            "& input": {
              padding: "6px", // ลด padding ลง
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
      <div style={{ padding: '0px 10px', position: 'relative' }}>
        <TableContainer
          style={{ padding: '0px 5px' }}
          sx={{
            height: 'calc(70vh)',
            overflowY: 'auto',
            whiteSpace: 'nowrap',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#ccc',
              borderRadius: '4px'
            }
          }}
        >
          <Table stickyHeader style={{ tableLayout: 'fixed' }} sx={{ width: '100%' }}>
            <TableHead style={{ marginBottom: "5px" }}>
              <TableRow sx={{ height: '36px' }}>
                {/* คอลัมน์ DelayTime */}
                <TableCell align="center" style={{
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  borderLeft: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: '12px',
                  backgroundColor: "hsl(210, 100%, 60%)",
                  color: '#787878',
                  padding: '4px',
                  width: CUSTOM_COLUMN_WIDTHS.delayTime
                }}>
                  <Box style={{ fontSize: '12px', color: '#ffffff' }}>DelayTime</Box>
                </TableCell>

                {/* แสดงคอลัมน์จาก tableColumns */}
                {tableColumns.map((column) => (
                  <TableCell key={column.id} align="center" style={{
                    backgroundColor: "hsl(210, 100%, 60%)",
                    borderTop: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    borderRight: "1px solid #f2f2f2",
                    fontSize: '12px',
                    color: '#787878',
                    padding: '4px',
                    width: column.width
                  }}>
                    <Box style={{ fontSize: '12px', color: '#ffffff' }}>{column.name}</Box>
                  </TableCell>
                ))}

                {/* คอลัมน์ดูข้อมูล */}
                <TableCell align="center" style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: '12px',
                  color: '#787878',
                  padding: '4px',
                  width: CUSTOM_COLUMN_WIDTHS.viewDetails
                }}>
                  <Box style={{ fontSize: '12px', color: '#ffffff' }}>รายละเอียด</Box>
                </TableCell>

                {/* คอลัมน์ตรวจสอบ */}
                <TableCell align="center" style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTopRightRadius: "8px",
                  borderBottomRightRadius: "8px",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderLeft: "1px solid #f2f2f2",
                  borderRight: "1px solid #e0e0e0",
                  fontSize: '12px',
                  color: '#787878',
                  padding: '4px',
                  width: CUSTOM_COLUMN_WIDTHS.qualityCheck
                }}>
                  <Box style={{ fontSize: '12px', color: '#ffffff' }}>ตรวจสอบ</Box>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody sx={{ '& > tr': { marginBottom: '4px' } }}>
              {filteredRows.length > 0 ? (
                filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                  <Row
                    key={index}
                    row={row}
                    tableColumns={tableColumns}
                    handleOpenModal={handleOpenModal}
                    handleRowClick={handleRowClick}
                    handleOpenEditModal={handleOpenEditModal}
                    handleOpenQualityCheckModal={handleOpenQualityCheckModal}
                    handleOpenSuccess={handleOpenSuccess}
                    selectedColor={selectedColor}
                    openRowId={openRowId}
                    setOpenRowId={setOpenRowId}
                    index={index}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={tableColumns.length + 2} align="center" sx={{ padding: "20px", fontSize: "14px", color: "#787878" }}>
                    ไม่มีรายการวัตถุดิบในขณะนี้
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <TablePagination
        sx={{
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar": {
            fontSize: '12px',
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
      <QualityCheckModal
        open={qualityCheckModalOpen}
        handleClose={handleCloseQualityCheckModal}
        rowData={selectedRowForQC}
        handleSubmit={handleSubmitQualityCheck}
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