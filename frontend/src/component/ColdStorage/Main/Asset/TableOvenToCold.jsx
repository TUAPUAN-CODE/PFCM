import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Typography } from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { FaRegCircle } from "react-icons/fa";
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import InfoIcon from '@mui/icons-material/Info';

// ปรับขนาดของคอลัมน์ให้กว้างขึ้น
const CUSTOM_COLUMN_WIDTHS = {
  licensePlate: '300px',
  production: '300px',
  weight: '200px',
  trayCount: '180px',
  status: '220px',
  action: '120px'
};

const calculateTimeDifference = (date_str) => {
  console.log("🕒 คำนวณเวลาจาก date_str:", date_str);

  if (!date_str) return 0;

  const effectiveDate = new Date(date_str);
  const currentDate = new Date();

  console.log("📅 วันที่เริ่มต้น:", effectiveDate);
  console.log("📅 วันที่ปัจจุบัน:", currentDate);

  const diffInMinutes = (currentDate - effectiveDate) / (1000 * 60);
  console.log("⏱️ เวลาที่ผ่านไป (นาที):", diffInMinutes);

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

const getStatusColor = (status) => {
  if (!status) return '#787878'; // Default gray color

  if (status === 'QcCheck') {
    return '#008000'; // Green
  } else if (status === 'รอกลับมาเตรียม' || status === 'QcCheck รอ MD') {
    return '#0000FF'; // Blue
  } else if (status === 'เหลือจากไลน์ผลิต') {
    return '#FFA500'; // Yellow
  } else if (status === 'รอแก้ไข') {
    return '#FF0000'; // Red
  }

  return '#787878'; // Default gray color
};

const getItemStatus = (item) => {
  console.log("✅ rm_status:", item.rm_status);

  let timePassed = 0;
  let standardTimeInMinutes = 0;
  let timeRemaining = 0;
  
  // กรณีวัตถุดิบที่มีสถานะ QcCheck และมีเวลาออกจากห้องเย็น
  if ((item.rm_status === 'QcCheck' || item.rm_status === 'รอแก้ไข') && (item.out_cold_date || item.out_cold_date_two || item.out_cold_date_three)) {
    console.log("❄️ กรณี QcCheck ที่มีเวลาออกจากห้องเย็น");
    
    // หาเวลาออกจากห้องเย็นล่าสุด
    const outColdDates = [
      item.out_cold_date_three,
      item.out_cold_date_two,
      item.out_cold_date
    ].filter(date => date);
    
    const latestOutColdDate = outColdDates[0]; // เรียงจากล่าสุดไปเก่าสุดแล้วเลือกตัวแรก
    console.log("❄️ เวลาออกจากห้องเย็นล่าสุด:", latestOutColdDate);
    
    timePassed = calculateTimeDifference(latestOutColdDate);
    console.log("⏱️ เวลาที่ผ่านไปจาก out_cold_date:", timePassed, "นาที");
    
    // ถ้ามี remaining_time ให้ใช้ remaining_time ในการคำนวณ
    if (item.remaining_time !== null && item.remaining_time !== undefined) {
      console.log("⏱️ พบค่า remaining_time =", item.remaining_time);
      const remainingFloat = parseFloat(item.remaining_time);
      const isNegative = remainingFloat < 0;
      const absValue = Math.abs(remainingFloat);
      const remainingHours = Math.floor(absValue);
      const remainingMinutes = Math.round((absValue - remainingHours) * 100);
      const remainingTimeInMinutes = remainingHours * 60 + remainingMinutes;

      if (isNegative || remainingFloat === 0) {
        timeRemaining = -(remainingTimeInMinutes + timePassed);
        console.log("⏱️ กรณีเวลาเหลือติดลบหรือ 0:", timeRemaining);
      } else {
        timeRemaining = remainingTimeInMinutes - timePassed;
        console.log("⏱️ กรณีเวลาเหลือปกติ:", timeRemaining);
      }
    } 
    // ถ้าไม่มี remaining_time ให้ใช้ standard_time
    else if (item.standard_time) {
      const stdHours = Math.floor(parseFloat(item.standard_time));
      const stdMinutes = Math.round((parseFloat(item.standard_time) - stdHours) * 100);
      standardTimeInMinutes = stdHours * 60 + stdMinutes;
      console.log("⏱️ เวลามาตรฐานจาก standard_time:", item.standard_time, "->", standardTimeInMinutes, "นาที");
      timeRemaining = standardTimeInMinutes - timePassed;
    } 
    // ถ้าไม่มีทั้ง remaining_time และ standard_time ให้ใช้ค่าเริ่มต้น 2 ชั่วโมง
    else {
      standardTimeInMinutes = 120;
      console.log("⏱️ ไม่พบ standard_time ใช้ค่าเริ่มต้น 2 ชั่วโมง ->", standardTimeInMinutes, "นาที");
      timeRemaining = standardTimeInMinutes - timePassed;
    }
    
    console.log("⏱️ เวลาที่เหลือหลังจากออกจากห้องเย็น:", timeRemaining);
  }
  // เพิ่มเงื่อนไขใหม่: ตรวจสอบว่ามี mix_time หรือไม่
  else if (item.mix_time !== null && item.mix_time !== undefined) {
    console.log("🧪 กรณี MIX: พบค่า mix_time");
    console.log("🧪 ใช้ mixed_date =", item.mixed_date);

    timePassed = calculateTimeDifference(item.mixed_date);
    console.log("⏱️ เวลาที่ผ่านไปจาก mixed_date:", timePassed, "นาที");

    // กำหนดค่าเวลามาตรฐานเป็น 2 ชั่วโมง (120 นาที)
    standardTimeInMinutes = 120;
    console.log("⏱️ เวลามาตรฐาน mix_time: 2 ชั่วโมง ->", standardTimeInMinutes, "นาที");

    // คำนวณเวลาที่เหลือ
    timeRemaining = standardTimeInMinutes - timePassed;
    console.log("⏱️ กรณี mix_time เวลาที่เหลือ:", timeRemaining);
  }
  else if (item.remaining_rework_time !== null && item.remaining_rework_time !== undefined) {
    console.log("🔄 กรณี REWORK: พบค่า remaining_rework_time =", item.remaining_rework_time);
    console.log("🔄 ใช้ qc_date =", item.qc_date);

    timePassed = calculateTimeDifference(item.qc_date);
    console.log("⏱️ เวลาที่ผ่านไปจาก qc_date:", timePassed, "นาที");

    // คำนวณเวลามาตรฐานจาก standard_rework_time
    if (item.standard_rework_time) {
      const stdHours = Math.floor(parseFloat(item.standard_rework_time));
      const stdMinutes = Math.round((parseFloat(item.standard_rework_time) - stdHours) * 100);
      standardTimeInMinutes = stdHours * 60 + stdMinutes;
      console.log("⏱️ เวลามาตรฐาน rework:", item.standard_rework_time, "->", standardTimeInMinutes, "นาที");
    }

    // คำนวณเวลาที่เหลือจาก remaining_rework_time
    const remainingFloat = parseFloat(item.remaining_rework_time);
    console.log("⏱️ remaining_rework_time เป็นตัวเลข:", remainingFloat);

    const isNegative = remainingFloat < 0;
    const absValue = Math.abs(remainingFloat);
    const remainingHours = Math.floor(absValue);
    const remainingMinutes = Math.round((absValue - remainingHours) * 100);
    const remainingTimeInMinutes = remainingHours * 60 + remainingMinutes;

    if (isNegative || remainingFloat === 0) {
      timeRemaining = -(remainingTimeInMinutes + timePassed);
      console.log("⏱️ กรณีเวลาเหลือติดลบหรือ 0:", timeRemaining);
    } else {
      timeRemaining = remainingTimeInMinutes - timePassed;
      console.log("⏱️ กรณีเวลาเหลือปกติ:", timeRemaining);
    }
  }
  // กรณีปกติ
  else {
    console.log("🕒 กรณีปกติ: ไม่พบค่า remaining_rework_time หรือ mix_time");
    console.log("🕒 ใช้ค่า rmit_date หรือ cooked_date =", item.rmit_date || item.cooked_date);
    timePassed = calculateTimeDifference(item.rmit_date || item.cooked_date);

    console.log("⏱️ เวลาที่ผ่านไปจาก rmit_date/cooked_date:", timePassed, "นาที");

    if (item.standard_time) {
      const stdHours = Math.floor(parseFloat(item.standard_time));
      const stdMinutes = Math.round((parseFloat(item.standard_time) - stdHours) * 100);
      standardTimeInMinutes = stdHours * 60 + stdMinutes;
      console.log("⏱️ เวลามาตรฐานปกติ:", item.standard_time, "->", standardTimeInMinutes, "นาที");
    }

    if (item.remaining_time !== null && item.remaining_time !== undefined) {
      console.log("⏱️ พบค่า remaining_time =", item.remaining_time);
      const remainingFloat = parseFloat(item.remaining_time);
      const isNegative = remainingFloat < 0;
      const absValue = Math.abs(remainingFloat);
      const remainingHours = Math.floor(absValue);
      const remainingMinutes = Math.round((absValue - remainingHours) * 100);
      const remainingTimeInMinutes = remainingHours * 60 + remainingMinutes;

      if (isNegative || remainingFloat === 0) {
        timeRemaining = -(remainingTimeInMinutes + timePassed);
        console.log("⏱️ กรณีเวลาเหลือติดลบหรือ 0:", timeRemaining);
      } else {
        timeRemaining = remainingTimeInMinutes - timePassed;
        console.log("⏱️ กรณีเวลาเหลือปกติ:", timeRemaining);
      }
    } else if (standardTimeInMinutes > 0) {
      timeRemaining = standardTimeInMinutes - timePassed;
      console.log("⏱️ ไม่พบค่า remaining_time ใช้ standardTime - timePassed:", timeRemaining);
    }
  }

  let percentage = standardTimeInMinutes > 0 ? (timePassed / standardTimeInMinutes) * 100 : 0;
  console.log("📊 เปอร์เซ็นต์เวลาที่ใช้ไป:", percentage, "%");

  let statusMessage = timeRemaining > 0
    ? `เหลืออีก ${formatTime(timeRemaining)}`
    : `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;

  let textColor;
  if (timeRemaining < 0) {
    textColor = "#FF0000";
  } else if (percentage >= 80) {
    textColor = "#FFA500";
  } else {
    textColor = "#008000";
  }

  return {
    textColor,
    statusMessage,
    hideDelayTime: timeRemaining > 0,
    percentage,
    timeRemaining
  };
};

const getRowStatus = (row) => {
  if (row.rawMaterials && row.rawMaterials.length > 0) {
    const statuses = row.rawMaterials.map(rm => getItemStatus(rm));

    // Find the worst status (priority: red > yellow > green)
    if (statuses.some(s => s.textColor === "#FF0000")) {
      return {
        textColor: "#FF0000",
        statusMessage: "มีวัตถุดิบเลยกำหนด",
        percentage: 100
      };
    } else if (statuses.some(s => s.textColor === "#FFA500")) {
      return {
        textColor: "#FFA500",
        statusMessage: "มีวัตถุดิบใกล้หมดเวลา",
        percentage: 75
      };
    } else {
      return {
        textColor: "#008000",
        statusMessage: "วัตถุดิบปกติ",
        percentage: 25
      };
    }
  } else {
    return getItemStatus(row);
  }
};

const getTrolleyStatusIcons = (row) => {
  if (!row.rawMaterials || row.rawMaterials.length === 0) {
    return null;
  }

  const statusCounts = {
    red: 0,
    yellow: 0,
    green: 0
  };

  row.rawMaterials.forEach(material => {
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
        <span style={{ fontSize: '12px', marginRight: 2 }}>{statusCounts.red}</span>
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
        <span style={{ fontSize: '12px', marginRight: 2 }}>{statusCounts.yellow}</span>
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
        <span style={{ fontSize: '12px', marginRight: 2 }}>{statusCounts.green}</span>
      </Box>
    );
  }

  return (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icons}
    </Box>
  );
};

const ViewActionCell = ({ width, onClick, icon, backgroundColor, status }) => {
  // กำหนดสีของ icon ดวงตาให้เป็นสีเดียวกับ table head (สีฟ้า)
  const iconColor = "hsl(210, 100%, 60%)";

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
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#007BFF';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = iconColor;
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#007BFF';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = iconColor;
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <VisibilityIcon style={{ color: iconColor, fontSize: '22px' }} />
      </div>
    </TableCell>
  );
};

const Row = ({
  row,
  handleOpenModal,
  handleOpenEditModal,
  handleOpenSuccess,
  openRowId,
  setOpenRowId,
  index
}) => {
  const { textColor } = getRowStatus(row);
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";
  const isOpen = openRowId === row.tro_id;

  const mainRowData = {
    licensePlate: (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {getTrolleyStatusIcons(row)}
        {row.tro_id || '-'}

      </Box>
    ),
    production: row.productions ? row.productions.join(", ") : (row.production || '-'),
    weight: row.totalWeight ? `${row.totalWeight} kg` : (row.weight_RM || '-'),
    trayCount: row.totalTrays || row.tray_count || '-',
    status: (() => {
      const status = (row.dest === "เข้าห้องเย็น" || (row.rawMaterials && row.rawMaterials.some(rm => rm.dest === "เข้าห้องเย็น")))
        ? "รอห้องเย็นรับเข้า"
        : (row.rm_status || '-');

      let color;
      // ถ้ามีวัตถุดิบในรถเข็น ให้ตรวจสอบทั้งหมด
      if (row.rawMaterials && row.rawMaterials.length > 0) {
        // ลำดับความสำคัญ: รอแก้ไข > เหลือจากไลน์ผลิต > รอกลับมาเตรียม/QcCheck รอ MD > QcCheck
        if (row.rawMaterials.some(rm => rm.rm_status === 'รอแก้ไข')) color = '#FF0000'; // สีแดง
        else if (row.rawMaterials.some(rm => rm.rm_status === 'เหลือจากไลน์ผลิต')) color = '#FFA500'; // สีส้ม
        else if (row.rawMaterials.some(rm => rm.rm_status === 'รอกลับมาเตรียม' || rm.rm_status === 'QcCheck รอ MD'))
          color = '#0000FF'; // สีน้ำเงิน
        else if (row.rawMaterials.some(rm => rm.rm_status === 'QcCheck')) color = '#008000'; // สีเขียว
        else color = '#787878'; // สีเทา (ค่าเริ่มต้น)
      } else {
        color = getStatusColor(status);
      }

      return (
        <span style={{ color }}>
          {status}
        </span>
      );
    })()
  };

  return (
    <>
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
      <TableRow>
        {Object.values(mainRowData).map((value, idx) => (
          <TableCell
            key={idx}
            align="center"
            style={{
              width: Object.values(CUSTOM_COLUMN_WIDTHS)[idx],
              borderLeft: idx === 0 ? `5px solid ${textColor}` : "1px solid #f2f2f2",
              borderTopLeftRadius: idx === 0 ? "8px" : "0",
              borderBottomLeftRadius: idx === 0 ? "8px" : "0",
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '14px',
              height: '40px',
              lineHeight: '1.5',
              padding: '0px 15px',
              color: "#787878",
              backgroundColor: backgroundColor
            }}
          >
            {value}
          </TableCell>
        ))}

        <ViewActionCell
          width={CUSTOM_COLUMN_WIDTHS.action}
          onClick={(e) => {
            e.stopPropagation();
            setOpenRowId(isOpen ? null : row.tro_id);
          }}
          backgroundColor={backgroundColor}
          status={null} // ไม่จำเป็นต้องส่งค่า status แล้วเพราะเราใช้สีเดียว
        />
      </TableRow>

      <TableRow>
        <TableCell colSpan={6} style={{ paddingBottom: 0, paddingTop: 0, border: 0 }}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{
              margin: 1,
              backgroundColor: "#f9f9f9",
              padding: 2,
              borderRadius: 2,
              boxShadow: '0px 2px 4px rgba(0,0,0,0.1)'
            }}>
              <Typography
                variant="h6"
                gutterBottom
                component="div"
                sx={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <InfoIcon color="primary" />
                รายละเอียดวัตถุดิบในรถเข็น {row.tro_id}
              </Typography>

              <Table size="small" sx={{
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #e0e0e0'
              }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '14px' }}>สถานะเวลา</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '14px' }}>Batch</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '14px' }}>Material</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '14px' }}>รายชื่อวัตถุดิบ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '14px' }}>ไลน์ผลิต</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '14px' }}>Level Eu</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '14px' }}>น้ำหนัก</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '14px' }}>จำนวนถาด</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '14px' }}>สถานะวัตถุดิบ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.rawMaterials ? (
                    row.rawMaterials.map((material, idx) => {
                      const materialStatus = getItemStatus(material);
                      return (
                        <TableRow
                          key={`${material.rmfp_id}-${idx}`}
                          sx={{
                            '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' },
                            '&:hover': { backgroundColor: '#f0f7ff' }
                          }}
                        >
                          <TableCell
                            align="center"
                            sx={{

                              color: materialStatus.textColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <HourglassBottomIcon style={{ marginRight: 4, color: materialStatus.textColor }} />
                            {materialStatus.statusMessage}
                          </TableCell>
                          <TableCell align="center">{material.batch || material.batch_after || '-'}</TableCell>
                          <TableCell align="center">{material.mat || material.mix_code || '-'}</TableCell>
                          <TableCell align="center">{material.mat_name || `Mixed : ${material.mix_code}` || '-'}</TableCell>
                          <TableCell align="center">{material.production || '-'}</TableCell>
                          <TableCell align="center">{material.level_eu || '-'}</TableCell>
                          <TableCell align="center">{material.weight_RM || '-'}</TableCell>
                          <TableCell align="center">{material.tray_count || '-'}</TableCell>
                          <TableCell align="center" style={{ color: getStatusColor(material.rm_status) }}>
                            {material.rm_status || (material.dest === "เข้าห้องเย็น" ? "รอห้องเย็นรับเข้า" : "-")}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          color: getItemStatus(row).textColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <HourglassBottomIcon style={{ marginRight: 4, color: getItemStatus(row).textColor }} />
                        {getItemStatus(row).statusMessage}
                      </TableCell>
                      <TableCell align="center">{row.batch || row.batch_after || '-'}</TableCell>
                      <TableCell align="center">{row.mat || '-'}</TableCell>
                      <TableCell align="center">{row.mat_name || '-'}</TableCell>
                      <TableCell align="center">{row.level_eu || '-'}</TableCell>
                      <TableCell align="center">{row.weight_RM || '-'}</TableCell>
                      <TableCell align="center">{row.tray_count || '-'}</TableCell>
                      <TableCell align="center" style={{ color: getStatusColor(row.rm_status) }}>
                        {row.rm_status || (row.dest === "เข้าห้องเย็น" ? "รอห้องเย็นรับเข้า" : "-")}
                      </TableCell>
                    </TableRow>
                  )}
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

const TableOvenToCold = ({ handleOpenModal, handleOpenEditModal, handleOpenSuccess, data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedData, setGroupedData] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    if (data && data.length > 0) {
      const groupedByTrolley = data.reduce((acc, item) => {
        if (!acc[item.tro_id]) {
          acc[item.tro_id] = {
            tro_id: item.tro_id,
            totalWeight: 0,
            totalTrays: 0,
            productions: [],
            rawMaterials: []
          };
        }

        if (item.production && !acc[item.tro_id].productions.includes(item.production)) {
          acc[item.tro_id].productions.push(item.production);
        }

        acc[item.tro_id].totalWeight += parseFloat(item.weight_RM || 0);
        acc[item.tro_id].totalTrays += parseInt(item.tray_count || 0, 10);

        acc[item.tro_id].rawMaterials.push(item);

        return acc;
      }, {});

      // Convert to array and calculate time remaining for each trolley
      let groupedArray = Object.values(groupedByTrolley).map(trolley => {
        trolley.totalWeight = trolley.totalWeight.toFixed(2);

        // Calculate worst case time remaining for the trolley
        if (trolley.rawMaterials && trolley.rawMaterials.length > 0) {
          // Find the material with the least time remaining (most urgent)
          const worstMaterial = trolley.rawMaterials.reduce((prev, current) => {
            const prevTime = getItemStatus(prev).timeRemaining;
            const currentTime = getItemStatus(current).timeRemaining;
            return prevTime < currentTime ? prev : current;
          });

          trolley.timeRemaining = getItemStatus(worstMaterial).timeRemaining;
        } else {
          trolley.timeRemaining = getItemStatus(trolley).timeRemaining;
        }

        return trolley;
      });

      // Sort by time remaining (ascending - most urgent first)
      groupedArray.sort((a, b) => a.timeRemaining - b.timeRemaining);

      setGroupedData(groupedArray);
    } else {
      setGroupedData([]);
    }

    setIsLoading(false);
  }, [data]);

  useEffect(() => {
    const filterData = () => {
      let filtered = [...groupedData]; // Create a copy to maintain original sorting

      // Filter by search term
      if (searchTerm) {
        filtered = filtered.filter((trolley) => {
          // Search logic remains the same
          if (Object.values(trolley).some(value =>
            value && typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())
          )) {
            return true;
          }

          if (trolley.productions && trolley.productions.some(prod =>
            prod.toLowerCase().includes(searchTerm.toLowerCase())
          )) {
            return true;
          }

          if (trolley.rawMaterials && trolley.rawMaterials.some(material =>
            Object.values(material).some(value =>
              value && typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())
            )
          )) {
            return true;
          }

          return false;
        });
      }

      // Filter by color
      if (selectedColor) {
        filtered = filtered.filter((trolley) => {
          const status = getRowStatus(trolley);

          if (selectedColor === 'green' && status.textColor === "#008000") return true;
          if (selectedColor === 'yellow' && status.textColor === "#FFA500") return true;
          if (selectedColor === 'red' && status.textColor === "#FF0000") return true;

          return false;
        });
      }

      // Maintain sorting by time remaining after filtering
      filtered.sort((a, b) => a.timeRemaining - b.timeRemaining);

      setFilteredRows(filtered);
    };

    filterData();
  }, [searchTerm, groupedData, selectedColor]);

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

  const mainColumns = [
    "ป้ายทะเบียนรถเข็น", "แผนการผลิต", "น้ำหนักรถเข็น", "จำนวนถาด", "สถานะรถเข็น", "Action"
  ];

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
      <TableContainer
        style={{ padding: '0px 20px' }}
        sx={{
          height: 'calc(68vh)',
          overflowY: 'auto',
          whiteSpace: 'nowrap',
          '@media (max-width: 1200px)': {
            overflowX: 'scroll',
            minWidth: "1200px"
          }
        }}
      >
        <Table
          stickyHeader
          style={{ tableLayout: 'auto' }}
          sx={{ minWidth: '1400px', width: '100%' }} // เพิ่มความกว้างขั้นต่ำของตาราง
        >
          <TableHead style={{ marginBottom: "10px" }}>
            <TableRow sx={{ height: '40px' }}>
              {mainColumns.slice(0, 5).map((header, index) => (
                <TableCell
                  key={index}
                  align="center"
                  style={{
                    backgroundColor: "hsl(210, 100%, 60%)",
                    borderTop: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    borderRight: "1px solid #f2f2f2",
                    borderTopLeftRadius: index === 0 ? "8px" : "0",
                    borderBottomLeftRadius: index === 0 ? "8px" : "0",
                    fontSize: '16px',
                    color: '#ffffff',
                    padding: '10px',
                    width: Object.values(CUSTOM_COLUMN_WIDTHS)[index]
                  }}
                >
                  {header}
                </TableCell>
              ))}

              {/* Action column */}
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTopRightRadius: "8px",
                  borderBottomRightRadius: "8px",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #e0e0e0",
                  fontSize: '16px',
                  color: '#ffffff',
                  padding: '10px',
                  width: CUSTOM_COLUMN_WIDTHS.action
                }}
              >
                Action
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
                  กำลังโหลดข้อมูล...
                </TableCell>
              </TableRow>
            ) : filteredRows.length > 0 ? (
              filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <Row
                  key={row.tro_id || index}
                  row={row}
                  handleOpenModal={handleOpenModal}
                  handleOpenEditModal={handleOpenEditModal}
                  handleOpenSuccess={handleOpenSuccess}
                  openRowId={openRowId}
                  index={index}
                  setOpenRowId={setOpenRowId}
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

export default TableOvenToCold;