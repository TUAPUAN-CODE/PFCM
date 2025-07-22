import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography, styled } from '@mui/material';
import { LiaShoppingCartSolid } from 'react-icons/lia';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import { SlClose } from "react-icons/sl";
import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";
import DeleteIcon from "@mui/icons-material/Delete";
import { RiArrowUpBoxLine } from "react-icons/ri";
import { TfiShoppingCartFull } from "react-icons/tfi";
import { io } from "socket.io-client";
import EditDestinationModal from './EditDestinationModal'; // นำเข้า Modal component ที่เราสร้างไว้
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL;
 const socket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      });

// ฟังก์ชันเพื่อหาวันที่ล่าสุดในการเข้าห้องเย็น
const getLatestComeColdDate = (row) => {
  // เก็บวันที่ทั้งหมดในอาร์เรย์
  const dates = [
    row.come_cold_date,
    row.come_cold_date_two,
    row.come_cold_date_three
  ].filter(date => date); // กรองเอาเฉพาะค่าที่ไม่เป็น null หรือ undefined

  console.log("เวลาเข้าห้องเย็นทั้งหมด", dates);
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

  // ตรวจสอบว่ามี mix_time หรือไม่
  if (row.mix_time !== null && row.mix_time !== undefined && row.mixed_date) {
    console.log("ใช้โหมด Mix:", row.mix_time, row.mixed_date);

    // ใช้ mixed_date แทน latest cold date
    const mixDateTime = new Date(row.mixed_date);
    console.log("วันที่ mix:", mixDateTime);

    // คำนวณเวลาที่ผ่านไปตั้งแต่ mix
    const timePassed = (new Date() - mixDateTime) / (1000 * 60);
    console.log("เวลาที่ผ่านไปหลัง mix (นาที):", timePassed);

    // ใช้ standard time 2 ชั่วโมง (120 นาที)
    const standardMinutes = 120;
    console.log("เวลามาตรฐาน mix (นาที):", standardMinutes);

    // คำนวณเวลาที่เหลือ
    const timeValue = parseFloat(row.mix_time);
    const timeValueMinutes = Math.floor(timeValue) * 60 + (timeValue % 1) * 100;
    const timeRemaining = timeValueMinutes - timePassed;

    // คำนวณเปอร์เซ็นต์
    const percentage = Math.min(100, Math.max(0, (timePassed / standardMinutes) * 100));

    // ตรวจสอบว่าเลยเวลาหรือไม่
    if (timeRemaining < 0) {
      const exceededMinutes = Math.abs(timeRemaining);
      return {
        borderColor: '#FF8175', // สีแดง - เมื่อเลยกำหนดเวลา
        statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
        hideDelayTime: false,
        percentage: 100 + (exceededMinutes / standardMinutes * 100),
      };
    }

    return {
      borderColor: getBorderColor(percentage, timeRemaining),
      statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
      hideDelayTime: timeRemaining > 0,
      percentage,
    };
  }

  // หาวันที่เข้าห้องเย็นล่าสุด
  const latestComeColdDate = getLatestComeColdDate(row);
  console.log("วันที่เข้าห้องเย็นล่าสุด:", latestComeColdDate);

  if (!latestComeColdDate) {
    return {
      borderColor: "#969696",
      statusMessage: "-",
      hideDelayTime: true,
      percentage: 0,
    };
  }

  // ตรวจสอบว่าต้องใช้ rework_time หรือ cold
  const isReworkMode = row.rework_time !== null && row.rework_time !== undefined;
  console.log("ใช้โหมด Rework:", isReworkMode);

  // กำหนดค่าที่จะใช้งานตามเงื่อนไข
  const timeValue = isReworkMode ? parseFloat(row.rework_time) : parseFloat(row.cold);
  const standardValue = isReworkMode ? parseFloat(row.standard_rework) : parseFloat(row.standard_cold);

  console.log(`เวลาที่เหลืออยู่ที่สามารถอยู่ในห้องเย็นได้ ${isReworkMode ? "rework_time" : "cold"} :`, timeValue);
  console.log(`เวลามาตรฐานที่สามารถอยู่ในห้องเย็นได้ ${isReworkMode ? "standard_rework" : "standard_cold"} :`, standardValue);

  // แปลงค่า standard จากรูปแบบ ชั่วโมง.นาที เป็นนาทีทั้งหมด
  const standardMinutes = Math.floor(standardValue) * 60 + (standardValue % 1) * 100;
  console.log(`เวลามาตรฐานทั้งหมด (นาที) [${isReworkMode ? "rework" : "cold"}]:`, standardMinutes);

  // คำนวณเวลาที่ผ่านไปจริงตั้งแต่เข้าห้องเย็น
  const timePassed = calculateTimeDifference(latestComeColdDate);
  console.log("เวลาที่ผ่านไปจริง (นาที):", timePassed);

  // กรณีที่ค่า timeValue เป็นลบ - แสดงว่าเลยกำหนดแล้วและนำค่า timeValue มาแสดงโดยตรง
  if (timeValue < 0) {
    // แปลงค่า timeValue ที่เป็นลบจากชั่วโมง.นาที เป็นนาทีทั้งหมด
    const exceededMinutesFromValue = Math.floor(Math.abs(timeValue)) * 60 + (Math.abs(timeValue) % 1) * 100;
    console.log(`${isReworkMode ? "rework_time" : "cold"} (นาที):`, exceededMinutesFromValue);
    const rs_exceededMinutesFromValue = -1 * exceededMinutesFromValue - timePassed;
    console.log(`เวลาที่เลยกำหนดจากค่า ${isReworkMode ? "rework_time" : "cold"} (นาที):`, rs_exceededMinutesFromValue);

    // สำคัญ: ใช้ค่า exceededMinutesFromValue ที่ได้จาก timeValue โดยตรง ไม่ต้องคำนวณเพิ่ม
    return {
      borderColor: '#FF8175', // สีแดง - สำหรับกรณีเกินเวลา
      statusMessage: `เลยกำหนด ${formatTime(rs_exceededMinutesFromValue)}`,
      hideDelayTime: false,
      percentage: 100 + (rs_exceededMinutesFromValue / standardMinutes * 100),
      isOverdue: true,
    };
  }

  // กรณีที่ค่า timeValue = 0 แสดงว่าหมดเวลาพอดี (ไม่มีเวลาเหลือ) 
  // ต้องคำนวณว่าเลยกำหนดมาแล้วเท่าไร
  if (timeValue === 0) {
    // เวลาที่เลยกำหนดคือเวลาที่ผ่านไปแล้วทั้งหมด
    console.log(`${isReworkMode ? "rework_time" : "cold"} = 0, เวลาที่เลยกำหนด (นาที):`, timePassed);

    return {
      borderColor: '#FF8175', // สีแดง - กรณี timeValue = 0 ถือว่าเกินเวลาทันที
      statusMessage: `เลยกำหนด ${formatTime(timePassed)}`,
      hideDelayTime: false,
      percentage: 100 + (timePassed / standardMinutes * 100),
    };
  }

  // กรณีที่ค่า timeValue เป็นบวกและมากกว่า 0 - ยังมีเวลาเหลือ
  // แปลงค่า timeValue ที่เป็นบวกจากชั่วโมง.นาที เป็นนาทีทั้งหมด
  const timeValueMinutes = Math.floor(timeValue) * 60 + (timeValue % 1) * 100;
  console.log(`เวลา ${isReworkMode ? "rework_time" : "cold"} ในหน่วยนาที:`, timeValueMinutes);

  // ตรวจสอบว่าเวลาที่ผ่านไปจริงมากกว่าเวลาที่เหลือจาก timeValue หรือไม่
  if (timePassed > timeValueMinutes) {
    const exceededMinutes = timePassed - timeValueMinutes;
    console.log("เวลาที่เลยกำหนด (นาที) จากเวลาจริง:", exceededMinutes);

    return {
      borderColor: '#FF8175', // สีแดง - สำหรับกรณีเกินเวลา
      statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
      hideDelayTime: false,
      percentage: 100 + (exceededMinutes / standardMinutes * 100),
    };
  }

  // กรณีที่ยังไม่เกินเวลา
  const timeRemaining = timeValueMinutes - timePassed;
  console.log("เวลาที่เหลือ (นาที):", timeRemaining.toFixed(2));

  // คำนวณเปอร์เซ็นต์โดยใช้ standardMinutes เป็นฐานเสมอ
  const percentage = Math.min(100, Math.max(0, (timePassed / standardMinutes) * 100));
  console.log("เปอร์เซ็นต์ความคืบหน้า:", percentage.toFixed(2) + "%");

  return {
    borderColor: getBorderColor(percentage, timeRemaining),
    statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
    hideDelayTime: timeRemaining > 0,
    percentage,
  };
};

const getBorderColor = (percentage, timeRemaining) => {
  // First, check if time has exceeded (negative timeRemaining means overdue)
  if (timeRemaining < 0) return '#FF8175'; // สีแดง - เมื่อเลยกำหนดเวลา

  // Then handle normal percentage cases
  if (percentage >= 100) return '#FF8175'; // สีแดง - 100% ขึ้นไป
  if (percentage >= 70) return '#FFF398'; // สีเหลือง - 50-99%
  return '#80FF75'; // สีเขียว - 1-49%
};


//แปลงเป็นเวลาไทยเพื่อนำไปแสดง
const formatThaiDateTime = (dateTimeString) => {
  if (!dateTimeString) return '-';

  const date = new Date(dateTimeString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};


// ส่วนที่ปรับปรุงในไฟล์ paste-2.txt

const Row = ({
  row,
  columnWidths,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenDeleteModal,
  handleOpenSuccess,
  selectedColor,
  openRowId,
  setOpenRowId
}) => {
  const { borderColor, statusMessage, hideDelayTime, percentage, isOverdue } = getRowStatus(row);

  // เช็คว่าเวลาเลยกำหนดหรือไม่
  const isOverdueStatus = isOverdue || percentage >= 100 || statusMessage.includes("เลยกำหนด");

  const colorMatch =
    (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175');

  if (selectedColor && !colorMatch) return null;

  const isOpen = openRowId === row.rmfp_id || (row.mapping_id && openRowId === row.mapping_id);
  const {
    rmfp_id,
    slot_id,
    rm_status,
    ComeColdDate,
    RawmatTransForm,
    rmf_rm_group_id,
    rmg_rm_group_id,
    cold,
    dest,
    tro_id,
    weight_per_tro,
    weight_RM,
    production,
    ProcessDateTime,
    ntray,
    CookedDateTime,
    rm_type_id,
    cs_id,
    _cs_id,
    ...displayRow
  } = row;

  // ตรวจสอบว่าเป็นวัตถุดิบผสมหรือไม่
  const isMixed = row.isMixed || row.mix_code;

  // รับค่าที่ต้องการแสดงในแต่ละคอลัมน์
  const batch = isMixed ? '-' : row.batch || '-';

  // ถ้าเป็นวัตถุดิบผสม ให้แสดง "Mixed: [mix_code]" ในคอลัมน์ "รายชื่อวัตถุดิบ"
  const matName = isMixed ? `Mixed: ${row.mix_code}` : row.mat_name || '-';

  // ถ้าเป็นวัตถุดิบผสม ให้แสดงค่า mix_code ในคอลัมน์ "MAT"
  const mat = isMixed ? row.mix_code || '-' : row.mat || '-';

  return (
    <>
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }} />
      </TableRow>
      <TableRow
        onClick={() => {
          // ใช้ mapping_id สำหรับวัตถุดิบผสม, rmfp_id สำหรับวัตถุดิบปกติ
          const rowId = isMixed ? row.mapping_id : row.rmfp_id;
          setOpenRowId(isOpen ? null : rowId);
          if (handleRowClick && typeof handleRowClick === 'function') {
            handleRowClick(rowId);
          }
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
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '13px',
              height: '100%',
              color: isOverdueStatus ? "red" : (
                borderColor === "#969696"
                  ? "#626262"
                  : percentage >= 70
                    ? "orange"
                    : "green"
              ),
            }}
          >
            {statusMessage}
          </div>
        </TableCell>

        {/* Batch คอลัมน์ */}
        <TableCell
          align="center"
          style={{
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
          {batch}
        </TableCell>

        {/* รายชื่อวัตถุดิบ คอลัมน์ */}
        <TableCell
          align="center"
          style={{
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
          {matName}
        </TableCell>

        {/* MAT คอลัมน์ */}
        <TableCell
          align="center"
          style={{
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
          {mat}
        </TableCell>

        {/* ย้ายวัตถุดิบ คอลัมน์ - รถเข็น icon */}
        <EditActionCell
          onClick={(e) => {
            e.stopPropagation();
            if (typeof handleOpenEditModal === 'function') {
              handleOpenEditModal(row);
            } else {
              console.warn('handleOpenEditModal is not a function');
            }
          }}
          icon={<TfiShoppingCartFull style={{ color: '#26c200', fontSize: '22px' }} />}
        />

        {/* แก้ไขสถานะ คอลัมน์ - Edit icon */}
        <Move
          onClick={(e) => {
            e.stopPropagation();
            if (typeof handleOpenDeleteModal === 'function') {
              handleOpenDeleteModal(row);
            } else {
              console.warn('handleOpenDeleteModal is not a function');
            }
          }}
          icon={<EditIcon style={{ color: '#edc026', fontSize: '22px' }} />}
        />
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }} />
      </TableRow>

      {/* Collapse Section */}
      <TableRow>
        <TableCell style={{ padding: 0, border: 'none', }} colSpan={6}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, borderRadius: '8px', overflow: 'hidden', borderTop: '1px solid #ececec', borderLeft: '1px solid #ececec', borderBottom: "1px solid #ececec", borderRight: '1px solid #ececec', maxWidth: '100%', }}>
              <Table size="small" aria-label="purchases" sx={{ width: '100%', }}>
                <TableHead >
                  <TableRow style={{ backgroundColor: "#F9F9F9" }}>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "100px" }}>แผนการผลิต</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "100px" }}>จำนวนถาด</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "100px" }}>น้ำหนักวัตถุดิบ</TableCell>
                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "200px" }}>
                      เวลาต้ม/อบเสร็จ
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "13px",
                        textAlign: 'center',
                        borderRight: '1px solid #ececec',
                        verticalAlign: 'middle',
                        color: "#787878",
                        width: "200px"
                      }}
                    >
                      {isMixed ? "เวลาผสมเสร็จ" : (
                        ["รอ Qc", "รอกลับมาเตรียม"].includes(row.rm_status)
                          ? "เวลาส่งมาห้องเย็น"
                          : "เวลาแปรรูปเสร็จ"
                      )}
                    </TableCell>

                    <TableCell sx={{ fontSize: "13px", textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", width: "200px" }}>เวลาเข้าห้องเย็น</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ border: 'none', borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878" }}>{row.production || '-'}</TableCell>
                    <TableCell sx={{ border: 'none', borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878" }}>{row.tray_count || row.ntray || '-'}</TableCell>
                    <TableCell sx={{ border: 'none', borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878" }}>{row.weight_RM || '-'}</TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>
                      {row.CookedDateTime || '-'}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878" }}>
                      {isMixed ? (row.mixed_date || '-') : (row.RawmatTransForm || '-')}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', verticalAlign: 'middle', color: "#787878" }}>{formatThaiDateTime(getLatestComeColdDate(row))}</TableCell>
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
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#26c200';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.querySelector('svg').style.color = '#26c200';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#26c200';
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

const Move = ({ width, onClick, icon }) => {
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
      onClick={(e) => {
        e.stopPropagation();
        if (typeof onClick === 'function') {
          onClick(e);
        }
      }}
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

const TableMainPrep = ({ handleOpenModal, data, handleRowClick, handleOpenEditModal, handleOpenSuccess, handleOpenDeleteModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);

  const [rows, setRows] = useState(data);

  const [destinationModalOpen, setDestinationModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    socket.on("dataUpdated", (updatedData) => {
      // กรอง cs_id ก่อนอัปเดต
      const filteredData = updatedData.map(item => {
        const { cs_id, ...rest } = item;
        return { ...rest, _cs_id: cs_id }; // เก็บ cs_id ไว้ในตัวแปรภายในหากจำเป็น
      });

      setRows(filteredData);
    });

    // ให้แน่ใจว่าทำการยกเลิกการเชื่อมต่อเมื่อคอมโพเนนต์ถูกยกเลิก
    return () => {
      socket.off("dataUpdated");
    };
  }, []); // ใช้ [] เพื่อให้ทำงานแค่ครั้งเดียวเมื่อคอมโพเนนต์ถูก mount


  useEffect(() => {
    if (Array.isArray(data)) {
      setFilteredRows(
        data.filter((row) =>
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

  const openDestinationModal = (row) => {
    setSelectedRow(row);
    setDestinationModalOpen(true);
  };

  const handleSaveDestination = async (rowId, destination) => {
    try {

      // Get the row data for the selected row
      const rowData = rows.find(row => row.tro_id === rowId);

      if (!rowData) {
        console.error("Row data not found for tro_id:", rowId);
        return;
      }

      console.log("cold_time ที่ได้รับมา:", rowData.cold)

      // Calculate the delay time using existing functions
      const latestComeColdDate = getLatestComeColdDate(rowData);
      const timePassed = calculateTimeDifference(latestComeColdDate);
      const coldValue = parseFloat(rowData.cold);

      console.log("timePassed test:", timePassed)

      // Calculate delay time in the decimal format (e.g., -1.25, 3.57)
      let calculatedDelayTime;

      if (coldValue < 0) {
        // คำนวณเฉพาะเวลาที่เลยเพิ่มเติม
        const additionalMinutes = timePassed;

        // แปลงเวลาเดิมให้เป็นนาที
        const coldHours = Math.floor(Math.abs(coldValue));
        const coldMinutes = (Math.abs(coldValue) % 1) * 100;
        const originalOverdueMinutes = coldHours * 60 + coldMinutes;

        // รวมกัน
        const totalMinutes = originalOverdueMinutes + additionalMinutes;

        // แปลงกลับเป็นรูปแบบ ชั่วโมง.นาที
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = Math.round(totalMinutes % 60) / 100;
        calculatedDelayTime = -1 * (newHours + newMinutes);

      } else if (coldValue === 0) {
        // If cold value is exactly 0, the overdue time is the time passed
        const hours = Math.floor(timePassed / 60);
        const minutes = Math.round(timePassed % 60);
        calculatedDelayTime = -1 * parseFloat((hours + (minutes / 100)).toFixed(2));
      } else {
        // If cold value is positive, calculate remaining or overdue time
        const exceededMinutes = Math.abs(timeRemaining);
        const hours = Math.floor(exceededMinutes / 60);
        const minutes = Math.round(exceededMinutes % 60);
        calculatedDelayTime = -1 * parseFloat((hours + (minutes / 100)).toFixed(2));
      }

      // Round to 2 decimal places for cleaner numbers
      calculatedDelayTime = parseFloat(calculatedDelayTime.toFixed(2));

      console.log("เวลาที่ส่งไป cold_time", calculatedDelayTime)

      const payload = {
        tro_id: rowId,
        dest: destination,
        cold_time: calculatedDelayTime
      };


      console.log("API URL:", `${API_URL}/api/update-destination`);

      const response = await axios.put(`${API_URL}/api/update-destination`, payload);

      if (response.status === 200) {
        console.log("✅ อัปเดตข้อมูลสำเร็จ:", response.data);

        // อัปเดตข้อมูลในตารางโดยตรง
        setRows((prevRows) =>
          prevRows.map((row) =>
            row.tro_id === rowId ? { ...row, dest: destination } : row
          )
        );

        // แจ้งเตือนสำเร็จ
        handleOpenSuccess && handleOpenSuccess(`อัปเดตจุดส่งเป็น ${destination} เรียบร้อยแล้ว`);

        // ปิด Modal
        setDestinationModalOpen(false);
      } else {
        console.error("❌ เกิดข้อผิดพลาดขณะอัปเดต:", response.status);
      }
    } catch (error) {
      console.error("❌ เกิดข้อผิดพลาดขณะเรียก API:", error);
    }
  };
  //     const updatedRows = rows.map(row => (row.rmfp_id === rowId ? { ...row, dest: destination } : row));
  //     setRows(updatedRows);
  //     handleOpenSuccess && handleOpenSuccess(`อัปเดตจุดส่งเป็น ${destination} เรียบร้อยแล้ว`);
  //   } catch (error) {
  //     console.error('Error updating destination:', error);
  //   }
  // };

  const columns = Object.keys(data[0] || {}).filter(key =>
    key !== 'rmfp_id' && key !== 'oven_to_pack' && key !== 'cs_id' && key !== '_cs_id'
  );

  return (
    <>
      <Paper sx={{ width: '96%', overflow: 'hidden', marginLeft: '17px', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
        <TableContainer style={{ padding: '20px 20px', width: "1200px" }} sx={{ height: 'calc(50vh)', overflowY: 'auto', whiteSpace: 'nowrap', '@media (max-width: 1200px)': { overflowX: 'scroll', minWidth: "200px" } }}>
          <Table stickyHeader style={{ tableLayout: 'auto' }} sx={{ minWidth: '800px', width: '1110px' }}>
            <TableHead style={{ marginBottom: "10px" }}>
              <TableRow sx={{ height: '40px' }}>
                <TableCell align="center" style={{ borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', borderLeft: "1px solid #e0e0e0", padding: '5px', width: '100px' }}>
                  <Box style={{ fontSize: '12px' }}>DelayTime</Box>
                </TableCell>

                <TableCell align="center" style={{ borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: '100px' }}>
                  <Box style={{ fontSize: '12px' }}>Batch</Box>
                </TableCell>

                <TableCell align="center" style={{ borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: '150px' }}>
                  <Box style={{ fontSize: '12px' }}>รายชื่อวัตถุดิบ</Box>
                </TableCell>

                <TableCell align="center" style={{ borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: '150px' }}>
                  <Box style={{ fontSize: '12px' }}>MAT</Box>
                </TableCell>

                <TableCell align="center" style={{ borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: '120px' }}>
                  <Box style={{ fontSize: '12px' }}>ย้ายวัตถุดิบ</Box>
                </TableCell>
                <TableCell align="center" style={{ borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', borderTopRightRadius: "8px", borderBottomRightRadius: "8px", width: '120px' }}>
                  <Box style={{ fontSize: '12px' }}>แก้ไขแผนการผลิต</Box>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
              {filteredRows.length > 0 ? (
                filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                  <Row
                    key={index}
                    row={row}
                    handleOpenModal={handleOpenModal}
                    handleRowClick={handleRowClick}
                    handleOpenEditModal={handleOpenEditModal}
                    handleOpenDeleteModal={(row) => openDestinationModal(row)}
                    handleOpenSuccess={handleOpenSuccess}
                    selectedColor={selectedColor}
                    openRowId={openRowId}
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
      </Paper>
      <EditDestinationModal
        open={destinationModalOpen}
        handleClose={() => setDestinationModalOpen(false)}
        selectedRow={selectedRow}
        handleSaveDestination={handleSaveDestination}
      />
    </>
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