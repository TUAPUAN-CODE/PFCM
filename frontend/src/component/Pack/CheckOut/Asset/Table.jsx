import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography, styled } from '@mui/material';

import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";

import { RiArrowUpBoxLine } from "react-icons/ri";
import { FaEye } from "react-icons/fa"; // เพิ่ม icon ดวงตา

import { FaHourglass } from "react-icons/fa"; // เพิ่ม import Icon นาฬิกาทราย
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';

import { io } from "socket.io-client";
import { before } from 'lodash';
const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
  reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
  autoConnect: true
});

const CUSTOM_COLUMN_WIDTHS = {
  delayTime: '180px',
  trolleyStatus: '140px',
  trolleyId: '120px',
  production: '140px',
  view: '70px',
  export: '70px'
};

// ฟังก์ชันเพื่อหาวันที่ล่าสุดในการเข้าห้องเย็น
const getLatestComeColdDate = (row) => {
  const dates = [
    row.come_cold_date,
    row.come_cold_date_two,
    row.come_cold_date_three
  ].filter(date => date); // Remove null/undefined

  console.log("เวลาเข้าห้องเย็นทั้งหมด", dates);

  // Convert to Date objects and filter out invalid ones
  const dateObjects = dates
    .map(date => new Date(date))
    .filter(dateObj => !isNaN(dateObj.getTime())); // Check for valid Date

  if (dateObjects.length === 0) return null; // Return null or fallback if no valid dates

  // Get latest date
  const latestDate = new Date(Math.max(...dateObjects));

  return latestDate.toISOString().replace('T', ' ').split('.')[0]; // Format YYYY-MM-DD HH:MM:SS
};


const calculateTimeDifference = (ComeColdDateTime) => {
  const comecolddatetime = new Date(ComeColdDateTime);
  const currentDate = new Date();
  console.log("เวลาเข้าห้องเย็นล่าสุด : ", comecolddatetime);
  console.log("เวลาปัจจุบัน : ", currentDate);
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


const getLatestComeColdDateForMaterial = (material) => {
  // เก็บวันที่ทั้งหมดในอาร์เรย์
  const dates = [
    material.come_cold_date,
    material.come_cold_date_two,
    material.come_cold_date_three
  ].filter(date => date); // กรองเอาเฉพาะค่าที่ไม่เป็น null หรือ undefined

  console.log("เวลาเข้าห้องเย็นทั้งหมดของวัตถุดิบ:", material.material, dates);
  if (dates.length === 0) return null;

  // แปลงเป็น Date objects
  const dateObjects = dates.map(date => new Date(date));

  // หาวันที่ล่าสุด
  return new Date(Math.max(...dateObjects)).toISOString().replace('T', ' ');
};

const calculateTimeDifferenceForMaterial = (comeColdDateTime) => {
  if (!comeColdDateTime) return null;
  const comecolddatetime = new Date(comeColdDateTime);
  const currentDate = new Date();
  return (currentDate - comecolddatetime) / (1000 * 60);
};


// ปรับปรุงฟังก์ชัน calculateMaterialDelayTime เพื่อแก้ไขวิธีการคำนวณเวลาสำหรับวัตถุดิบผสม
const calculateMaterialDelayTime = (material) => {
  console.log("Calculating delay time for material:", material);

  const checkAndUpdateMaterialStatus = (material, percentage) => {
    if (percentage > 100 && material.materialStatus !== "รอแก้ไข" && material.mapping_id) {
      try {
        updateRmStatus(material.mapping_id);
        console.log(`Updated status to "รอแก้ไข" for material ${material.material_code}`);
        return true;
      } catch (error) {
        console.error(`Failed to update status for material ${material.material_code}:`, error);
        return false;
      }
    }
    return false;
  };

  // เช็คว่าเป็นวัตถุดิบผสมหรือไม่ โดยดูจาก mix_time และ rawMatType
  if (material.rawMatType === "mixed" && material.mix_time !== null && material.mix_time !== undefined) {
    console.log(`Material ${material.material_code} is a mixed material with mix_time:`, material.mix_time);

    // หาวันที่เข้าห้องเย็นล่าสุดของวัตถุดิบนี้
    const latestComeColdDate = getLatestComeColdDateForMaterial(material);
    console.log("วันที่เข้าห้องเย็นล่าสุดของวัตถุดิบผสม:", material.material_code, latestComeColdDate);

    if (!latestComeColdDate) {
      return {
        statusMessage: "รอดำเนินการ",
        color: "#626262",
        delayTimeValue: null
      };
    }

    // แปลงค่า mix_time จากรูปแบบ ชั่วโมง.นาที เป็นนาทีทั้งหมด
    const mixTimeValue = parseFloat(material.mix_time);
    const mixTimeMinutes = Math.floor(Math.abs(mixTimeValue)) * 60 + (Math.abs(mixTimeValue) % 1) * 100;
    console.log(`Material ${material.material_code} mixTimeMinutes:`, mixTimeMinutes);

    // คำนวณเวลาที่ผ่านไปจริงตั้งแต่เข้าห้องเย็น
    const standardTime = 120;
    const timePassed = calculateTimeDifferenceForMaterial(latestComeColdDate);
    console.log(`Material ${material.material_code} time passed since entering cold room (minutes):`, timePassed);

    if (mixTimeValue < 0) {
      const exceededMinutesFromMix = mixTimeMinutes;
      const rs_exceededMinutesFromMix = -1 * exceededMinutesFromMix - timePassed;
      console.log(`การคำนวนเวลาที่เหลืออยู่ ${rs_exceededMinutesFromMix}= -1 * ${exceededMinutesFromMix} - ${timePassed}`)
      console.log("Material exceeded minutes from mix_time:", rs_exceededMinutesFromMix);

      const percentage = ((standardTime + (-1 * rs_exceededMinutesFromMix)) / standardTime) * 100;
      console.log(`เปอร์เซ็นของ mix_time < 0 (${standardTime} + ${-1 * rs_exceededMinutesFromMix}) / ${standardTime} = ${percentage}`);
      console.log("Material percentage (exceeded): mix_time < 0", percentage);

      checkAndUpdateMaterialStatus(material, percentage);

      return {
        statusMessage: `เลยกำหนด ${formatTime(rs_exceededMinutesFromMix)}`,
        color: "red",
        delayTimeValue: mixTimeValue,
        isOverdue: true
      };
    }

    // กรณีที่ค่า mix_time = 0 แสดงว่าหมดเวลาพอดี
    if (mixTimeValue === 0) {
      const percentage = ((standardTime + timePassed) / standardTime) * 100;
      console.log("Material percentage (exceeded) mix_time = 0:", percentage);

      checkAndUpdateMaterialStatus(material, percentage);

      return {
        statusMessage: `เลยกำหนด ${formatTime(timePassed)}`,
        color: "red",
        delayTimeValue: 0
      };
    }


    // ตรวจสอบว่าเวลาที่ผ่านไปจริงมากกว่าเวลาที่กำหนดจาก mix_time หรือไม่
    if (timePassed > mixTimeMinutes) {
      const exceededMinutes = timePassed - mixTimeMinutes;
      console.log(`Material ${material.material_code} exceeded minutes:`, exceededMinutes);

      // คำนวณ percentage สำหรับกรณีเกินเวลา
      const percentage = ((standardTime + exceededMinutes) / standardTime) * 100;
      console.log(`Material ${material.material_code} percentage (exceeded):`, percentage);

      checkAndUpdateMaterialStatus(material, percentage);

      // คำนวณค่า mix_time ที่ปรับปรุงแล้ว (เป็นค่าลบ)
      // แปลงจากนาทีเป็นรูปแบบ ชั่วโมง.นาที (ติดลบ)
      const updatedMixTime = -1 * (Math.floor(exceededMinutes / 60) + ((exceededMinutes % 60) / 100));

      return {
        statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
        color: "red",
        delayTimeValue: updatedMixTime,
        isOverdue: true
      };
    }

    // กรณีที่ยังไม่เกินเวลา

    const resultRemainning = standardTime - mixTimeMinutes;
    const timeRemaining = mixTimeMinutes - timePassed;
    console.log(`Material ${material.material_code} time remaining (minutes):`, timeRemaining);

    // คำนวณเปอร์เซ็นต์
    const percentage = ((resultRemainning + timePassed) / standardTime) * 100;

    console.log(`Material ${material.material_code} percentage:`, percentage);

    checkAndUpdateMaterialStatus(material, percentage);

    // กำหนดสีตามเปอร์เซ็นต์
    let color;
    if (percentage >= 100) color = "red";
    else if (percentage >= 70) color = "orange";
    else color = "green";

    // คำนวณค่า mix_time ที่ปรับปรุงแล้ว
    // แปลงจากนาทีกลับเป็นรูปแบบ ชั่วโมง.นาที
    const updatedMixTime = Math.floor(timeRemaining / 60) + ((timeRemaining % 60) / 100);

    return {
      statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
      color,
      delayTimeValue: updatedMixTime
    };
  }

  // หาวันที่เข้าห้องเย็นล่าสุดของวัตถุดิบนี้
  const latestComeColdDate = getLatestComeColdDateForMaterial(material);
  console.log("วันที่เข้าห้องเย็นล่าสุดของวัตถุดิบ:", material.material_code, latestComeColdDate);

  if (!latestComeColdDate) {
    return {
      statusMessage: "รอดำเนินการ",
      color: "#626262",
      delayTimeValue: null
    };
  }

  // ตรวจสอบว่ามี remaining_rework_time หรือไม่
  if (material.remaining_rework_time !== null && material.remaining_rework_time !== undefined) {
    console.log(`Material ${material.material_code} ใช้ remaining_rework_time:`, material.remaining_rework_time);

    // ใช้ข้อมูล remaining_rework_time จากวัตถุดิบ
    const remainingReworkTime = parseFloat(material.remaining_rework_time);

    // ใช้ standard_rework_time จากวัตถุดิบ
    const standardReworkTime = parseFloat(material.standard_rework_time);
    console.log(`Material ${material.material_code} standard_rework_time:`, standardReworkTime);

    // แปลงค่า standard_rework_time จากรูปแบบ ชั่วโมง.นาที เป็นนาทีทั้งหมด
    const standardReworkTimeMinutes = Math.floor(standardReworkTime) * 60 + (standardReworkTime % 1) * 100;
    console.log("Material standard rework minutes:", standardReworkTimeMinutes);

    // คำนวณเวลาที่ผ่านไปจริงตั้งแต่เข้าห้องเย็น
    const timePassed = calculateTimeDifferenceForMaterial(latestComeColdDate);
    console.log("Material time passed (minutes):", timePassed);

    // กรณีที่ค่า remaining_rework_time เป็นลบ - แสดงว่าเลยกำหนดแล้ว
    if (remainingReworkTime < 0) {
      const exceededMinutes = Math.floor(Math.abs(remainingReworkTime)) * 60 + (Math.abs(remainingReworkTime) % 1) * 100;
      console.log("Material exceeded minutes:", exceededMinutes);
      const rs_exceededMinutesFormRework = -1 * exceededMinutes - timePassed;

      const percentage = ((standardReworkTimeMinutes + (-1 * rs_exceededMinutesFormRework)) / standardReworkTimeMinutes) * 100;
      console.log("Material percentage (exceeded) rework < 0:", percentage);

      checkAndUpdateMaterialStatus(material, percentage);

      return {
        statusMessage: `เลยกำหนด ${formatTime(rs_exceededMinutesFormRework)}`,
        color: "red",
        delayTimeValue: remainingReworkTime,
        isOverdue: true
      };
    }

    // กรณีที่ค่า remaining_rework_time = 0 แสดงว่าหมดเวลาพอดี
    if (remainingReworkTime === 0) {

      const percentage = ((standardReworkTimeMinutes + timePassed) / standardReworkTimeMinutes) * 100;
      console.log("Material percentage (exceeded) rework = 0:", percentage);

      checkAndUpdateMaterialStatus(material, percentage);

      return {
        statusMessage: `เลยกำหนด ${formatTime(timePassed)}`,
        color: "red",
        delayTimeValue: 0
      };
    }

    // กรณีที่ค่า remaining_rework_time เป็นบวกและมากกว่า 0 - ยังมีเวลาเหลือ
    const remainingReworkTimeMinutes = Math.floor(remainingReworkTime) * 60 + (remainingReworkTime % 1) * 100;
    console.log("Material remaining rework time minutes:", remainingReworkTimeMinutes);

    // เวลาที่เหลือคือ remaining_rework_time
    const timeRemaining = remainingReworkTimeMinutes - timePassed;
    const resultRemainningRework = standardReworkTimeMinutes - remainingReworkTimeMinutes
    console.log("Material time remaining (minutes):", timeRemaining);

    // คำนวณเปอร์เซ็นต์
    const percentage = ((timePassed + resultRemainningRework) / standardReworkTimeMinutes) * 100;

    console.log("Material percentage:", percentage);

    // ตรวจสอบว่าเปอร์เซ็นต์เกิน 100% และสถานะยังไม่ใช่ "รอแก้ไข"
    if (percentage >= 100 && material.materialStatus !== "รอแก้ไข" && material.mapping_id) {
      try {
        updateRmStatus(material.mapping_id);
        console.log(`Updated status to "รอแก้ไข" for material ${material.material_code}`);
      } catch (error) {
        console.error(`Failed to update status for material ${material.material_code}:`, error);
      }
    }

    // กำหนดสีตามเปอร์เซ็นต์
    let color;
    if (percentage >= 100) color = "red";
    else if (percentage >= 70) color = "orange";
    else color = "green";

    // คำนวณค่า rework_time ที่ปรับปรุงแล้ว
    // แปลงจากนาทีกลับเป็นรูปแบบ ชั่วโมง.นาที
    const updatedReworkTime = Math.floor(timeRemaining / 60) + ((timeRemaining % 60) / 100);

    return {
      statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
      color,
      delayTimeValue: updatedReworkTime
    };
  }
  // กรณีไม่มี remaining_rework_time ให้ใช้การคำนวณแบบเดิม (ใช้ cold_time)
  else {
    // ใช้ข้อมูล cold_time จากตัวข้อมูลวัตถุดิบแต่ละรายการ
    const coldValue = parseFloat(material.cold_time);
    console.log(`Material ${material.material_code} cold_time:`, coldValue);

    const standardCold = parseFloat(material.standard_cold);
    console.log(`Material ${material.material_code} standard_cold:`, standardCold);

    // แปลงค่า standard_cold จากรูปแบบ ชั่วโมง.นาที เป็นนาทีทั้งหมด
    const standardColdMinutes = Math.floor(standardCold) * 60 + (standardCold % 1) * 100;
    console.log("Material standard cold minutes:", standardColdMinutes);

    // คำนวณเวลาที่ผ่านไปจริงตั้งแต่เข้าห้องเย็น
    const timePassed = calculateTimeDifferenceForMaterial(latestComeColdDate);
    console.log("Material time passed (minutes):", timePassed);

    // กรณีที่ค่า cold เป็นลบ - แสดงว่าเลยกำหนดแล้ว
    if (coldValue < 0) {
      const exceededMinutesFromCold = Math.floor(Math.abs(coldValue)) * 60 + (Math.abs(coldValue) % 1) * 100;
      const rs_exceededMinutesFromCold = -1 * exceededMinutesFromCold - timePassed;
      console.log("Material exceeded minutes:", rs_exceededMinutesFromCold);

      const percentage = ((standardColdMinutes + (-1 * rs_exceededMinutesFromCold)) / standardColdMinutes) * 100;

      console.log(`เปอร์เซ็นของ cold < 0 (${standardColdMinutes} + ${-1 * rs_exceededMinutesFromCold}) / ${standardColdMinutes} = ${percentage}`)
      console.log("Material percentage (exceeded): coldtime < 0", percentage);

      checkAndUpdateMaterialStatus(material, percentage);

      return {
        statusMessage: `เลยกำหนด ${formatTime(rs_exceededMinutesFromCold)}`,
        color: "red",
        delayTimeValue: coldValue,
        isOverdue: true
      };
    }

    // กรณีที่ค่า cold = 0 แสดงว่าหมดเวลาพอดี
    if (coldValue === 0) {

      const percentage = ((standardColdMinutes + timePassed) / standardColdMinutes) * 100;
      console.log("Material percentage (exceeded) coldtime = 0 :", percentage);

      checkAndUpdateMaterialStatus(material, percentage);

      return {
        statusMessage: `เลยกำหนด ${formatTime(timePassed)}`,
        color: "red",
        delayTimeValue: 0
      };
    }

    // กรณีที่ค่า cold เป็นบวกและมากกว่า 0 - ยังมีเวลาเหลือ
    const coldValueMinutes = Math.floor(coldValue) * 60 + (coldValue % 1) * 100;

    // ตรวจสอบว่าเวลาที่ผ่านไปจริงมากกว่าเวลาที่เหลือจาก cold หรือไม่
    if (timePassed > coldValueMinutes) {
      const exceededMinutes = timePassed - coldValueMinutes;
      console.log("Material exceeded minutes from real time:", exceededMinutes);

      const percentage = ((standardColdMinutes + exceededMinutes) / standardColdMinutes) * 100;

      checkAndUpdateMaterialStatus(material, percentage);

      // คำนวณค่า cold_time ที่ปรับปรุงแล้ว (เป็นค่าลบ)
      // แปลงจากนาทีเป็นรูปแบบ ชั่วโมง.นาที (ติดลบ)
      const updatedColdTime = -1 * (Math.floor(exceededMinutes / 60) + ((exceededMinutes % 60) / 100));

      return {
        statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
        color: "red",
        delayTimeValue: updatedColdTime
      };
    }

    // กรณีที่ยังไม่เกินเวลา
    const timeRemaining = coldValueMinutes - timePassed;
    const resultRemainningCold = standardColdMinutes - coldValueMinutes;
    console.log("Material time remaining (minutes):", timeRemaining);

    console.log(`การคำนวณ percentage: ${resultRemainningCold} = ${standardColdMinutes} - ${coldValueMinutes}`)

    // คำนวณเปอร์เซ็นต์
    const percentage = ((timePassed + resultRemainningCold) / standardColdMinutes) * 100;
    console.log("Material percentage:", percentage);

    checkAndUpdateMaterialStatus(material, percentage);

    // กำหนดสีตามเปอร์เซ็นต์
    let color;
    if (percentage >= 100) color = "red";
    else if (percentage >= 70) color = "orange";
    else color = "green";

    // คำนวณค่า cold_time ที่ปรับปรุงแล้ว
    // แปลงจากนาทีกลับเป็นรูปแบบ ชั่วโมง.นาที
    const updatedColdTime = Math.floor(timeRemaining / 60) + ((timeRemaining % 60) / 100);

    return {
      statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
      color,
      delayTimeValue: updatedColdTime
    };
  }
};

// ฟังก์ชันสำหรับเรียก API อัปเดตสถานะ
const updateRmStatus = async (mapping_id) => {
  try {
    console.log('Attempting to update status for mapping_id:', mapping_id);
    
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
    console.log('Update status response:', data);
    
    return data;
  } catch (error) {
    console.error('Error updating RM status:', error);
    throw error;
  }
};

// Updated Row Component to better handle filtering
const Row = ({
  row,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenSuccess,
  handleOpenDeleteModal,
  selectedColor,
  colorMatch,
  openRowId,
  setOpenRowId,
  openDetailRowId,
  setOpenDetailRowId,
  index
}) => {

  const calculateTotalWeight = () => {
    if (!row.materials || row.materials.length === 0) return 0;
    return row.materials.reduce((total, material) => {
      return total + (material.weight_RM || 0);
    }, 0);
  };

  const calculateTotalTrays = () => {
    if (!row.materials || row.materials.length === 0) return 0;
    return row.materials.reduce((total, material) => {
      return total + (material.tray_count || 0);
    }, 0);
  };

  const totalTrays = calculateTotalTrays();
  const totalWeight = calculateTotalWeight();
  // คำนวณสถานะของรถเข็น (สี, ข้อความเวลา)
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";

  // Get the latest cold room entry date
  const latestComeColdDate = getLatestComeColdDate(row);

  // Skip rendering this row if it doesn't match the color filter
  if (selectedColor && !colorMatch) return null;

  // Row display state
  const isOpen = openRowId === row.tro_id;
  const isDetailOpen = openDetailRowId === row.tro_id;

  // Find the worst material status in this trolley
  const getWorstMaterialStatus = () => {
    if (!row.materials || row.materials.length === 0) return null;

    let worstStatus = null;

    row.materials.forEach(material => {
      const { color } = calculateMaterialDelayTime(material);

      if (!worstStatus) {
        worstStatus = color;
      } else {
        // Priority order: red > orange > green
        if (color === 'red') {
          worstStatus = 'red';
        } else if (color === 'orange' && worstStatus !== 'red') {
          worstStatus = 'orange';
        } else if (color === 'green' && worstStatus !== 'red' && worstStatus !== 'orange') {
          worstStatus = 'green';
        }
      }
    });

    return worstStatus;
  };

  const worstMaterialStatus = getWorstMaterialStatus();

  // Set hourglass color based on worst material status
  const getHourglassColor = () => {
    switch (worstMaterialStatus) {
      case 'red': return '#FF4444'; // Red when time has expired
      case 'orange': return '#FFA500'; // Orange when time is almost up
      case 'green': return '#4CAF50'; // Green when plenty of time remains
      default: return '#969696'; // Gray when no data available
    }
  };

  const hourglassColor = getHourglassColor();

  return (
    <>
      {/* Gap between rows */}
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>

      {/* Main row displaying trolley data */}
      <TableRow onClick={() => {
        setOpenRowId(isOpen ? null : row.tro_id);
        handleRowClick(row.tro_id);
      }}>
        {/* Trolley ID - first column */}
        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.trolleyId,
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px 10px',
            color: "#787878",
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
            backgroundColor: backgroundColor
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <HourglassBottomIcon
              style={{
                color: hourglassColor,
                fontSize: '20px',
                transition: 'color 0.3s ease'
              }}
            />
            <span>{row.tro_id || '-'}</span>
          </div>
        </TableCell>

        {/* Production Plan */}
        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.production,
            borderLeft: "1px solid #f2f2f2",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor
          }}
        >
          {row.production || '-'}
        </TableCell>

        {/* Trolley Status */}
        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.trolleyStatus,
            borderLeft: "1px solid #f2f2f2",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px 10px',
            color:
              row.trolleyStatus === "วัตถุดิบตรง" ? "#4CAF50" : // สีเขียว
                row.trolleyStatus === "วัตถุดิบรับฝาก" ? "#2196F3" : // สีน้ำเงิน
                  row.trolleyStatus === "เหลือจากไลน์ผลิต" ? "#FFC107" : // สีเหลือง
                    row.trolleyStatus === "วัตถุดิบรอแก้ไข" ? "#FF4444" : // สีแดง
                      "#787878", // สีเดิมถ้าไม่ตรงกับเงื่อนไขใดๆ
            backgroundColor: backgroundColor,
            // fontWeight: 'bold' // ทำให้ตัวอักษรหนาขึ้นเพื่อให้อ่านง่าย
          }}
        >
          {row.trolleyStatus || '-'}
        </TableCell>

        {/* Total Weight */}
        <TableCell
          align="center"
          style={{
            width: '120px',
            borderLeft: "1px solid #f2f2f2",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor,
          }}
        >
          {totalWeight.toFixed(2)} kg
        </TableCell>

        {/* Total Trays */}
        <TableCell
          align="center"
          style={{
            width: '120px',
            borderLeft: "1px solid #f2f2f2",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px 10px',
            color: "#787878",
            backgroundColor: backgroundColor,
          }}
        >
          {totalTrays} ถาด
        </TableCell>

        {/* View Details button */}
        <ActionButton
          width={CUSTOM_COLUMN_WIDTHS.view}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the row's onClick
            setOpenDetailRowId(isDetailOpen ? null : row.tro_id);
          }}
          icon={<FaEye style={{ color: '#4aaaec', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />

        {/* Export button */}
        <ActionButton
          width={CUSTOM_COLUMN_WIDTHS.export}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the row's onClick
            // Add Delay Time to each material before sending to Edit Modal
            const materialsWithDelayTime = row.materials.map(material => {
              const { statusMessage, color } = calculateMaterialDelayTime(material);
              return {
                ...material,
                delayTime: statusMessage,
                delayTimeColor: color
              };
            });

            handleOpenEditModal({
              ...row,
              ptc_time: row.ptc_time,
              materials: materialsWithDelayTime // Send materials with Delay Time
            });
          }}
          icon={<RiArrowUpBoxLine style={{ color: '#4aaaec', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
          isLastCell={true}
        />
      </TableRow>

      {/* Display material details when eye button is clicked, including DelayTime */}
      <MaterialDetails
        isOpen={isDetailOpen}
        materials={row.materials || []}
        row={row} // Send all row data
      />

      {/* Gap below row */}
      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>
    </>
  );
};

// คอมโพเนนต์สำหรับแสดงรายละเอียดวัตถุดิบในรถเข็น
// Modified MaterialDetails component to properly display mixed materials
const MaterialDetails = ({ materials, isOpen, row }) => {
  if (!isOpen || !materials || materials.length === 0) return null;

  console.log("Row data in MaterialDetails:", row);
  console.log("Materials data:", materials);

  return (
    <TableRow>
      <TableCell colSpan={5} style={{ padding: '0px' }}>
        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <Box sx={{ margin: 2 }}>
            <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '16px', fontWeight: 'bold', color: '#4aaaec' }}>
              รายการวัตถุดิบในรถเข็น
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 'bold', padding: '8px 16px' }}>Delay Time</TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 'bold', padding: '8px 16px' }}>Batch</TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 'bold', padding: '8px 16px' }}>Material</TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 'bold', padding: '8px 16px' }}>รายชื่อวัตถุดิบ</TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 'bold', padding: '8px 16px' }}>น้ำหนักวัตถุดิบ (kg.)</TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 'bold', padding: '8px 16px' }}>จำนวนถาด</TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 'bold', padding: '8px 16px' }}>Level EU</TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 'bold', padding: '8px 16px' }}>สถานะวัตถุดิบ</TableCell>
                  <TableCell sx={{ fontSize: '14px', fontWeight: 'bold', padding: '8px 16px' }}>ประเภท</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {materials.map((material, index) => {
                  // ตรวจสอบว่าเป็นวัตถุดิบผสมหรือไม่
                  const isMixed = row.rawMatType === 'mixed' || material.rawMatType === 'mixed';

                  // คำนวณ Delay Time
                  const { statusMessage, color } = calculateMaterialDelayTime(material);
                  material.delayTime = statusMessage;
                  material.delayTimeColor = color;

                  // กำหนดค่าที่จะแสดงสำหรับรายชื่อวัตถุดิบและรหัสวัตถุดิบตามประเภท
                  const displayMaterialCode = isMixed ? (material.mix_code || row.mix_code || '-') : (material.material_code || '-');
                  const displayMaterialName = isMixed ? `Mixed: ${material.mix_code || row.mix_code || '-'}` : (material.materialName || '-');

                  return (
                    <TableRow key={index}>
                      <TableCell sx={{ fontSize: '12px', padding: '8px 16px', color: color }}>{statusMessage || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '12px', padding: '8px 16px' }}>{material.batch || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '12px', padding: '8px 16px' }}>{displayMaterialCode}</TableCell>
                      <TableCell sx={{ fontSize: '12px', padding: '8px 16px' }}>{displayMaterialName}</TableCell>
                      <TableCell sx={{ fontSize: '12px', padding: '8px 16px' }}>{material.weight_RM !== null && material.weight_RM !== undefined ? `${material.weight_RM}` : '-'}</TableCell>
                      <TableCell sx={{ fontSize: '12px', padding: '8px 16px' }}>{material.tray_count !== null && material.tray_count !== undefined ? material.tray_count : '-'}</TableCell>
                      <TableCell sx={{ fontSize: '12px', padding: '8px 16px' }}>{material.levelEu || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '12px', padding: '8px 16px' }}>
                        {material.isOverdue ? 'รอแก้ไข' : (material.materialStatus || '-')}
                      </TableCell>
                      <TableCell sx={{ fontSize: '12px', padding: '8px 16px' }}>{isMixed ? 'ผสม' : 'ปกติ'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
};

// คอมโพเนนต์สำหรับปุ่ม Action
const ActionButton = ({ width, onClick, icon, backgroundColor, isLastCell = false }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderLeft: '1px solid #f2f2f2',
        borderRight: isLastCell ? "1px solid #e0e0e0" : "0px solid",
        borderTopRightRadius: isLastCell ? "8px" : "0px",
        borderBottomRightRadius: isLastCell ? "8px" : "0px",
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
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#4aaaec';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
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




// ตั้งแต่บรรทัดที่ 496 เป็นต้นไป

// ปรับปรุงคอมโพเนนต์หลัก TableMainPrep เพื่อลบคอลัมน์ DelayTime ออกจากส่วนหัว
// Updated TableMainPrep component with improved filtering
const TableMainPrep = ({ handleOpenModal, data, handleRowClick, handleOpenEditModal, handleOpenSuccess, handleOpenDeleteModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);
  const [openDetailRowId, setOpenDetailRowId] = useState(null);

  // Function to check if a trolley matches the selected color filter
  const checkColorMatch = (row) => {
    if (!selectedColor) return true; // If no color filter is selected, show all rows

    // Get the worst material status in the trolley
    const getWorstMaterialStatus = () => {
      if (!row.materials || row.materials.length === 0) return null;

      let worstStatus = null;

      row.materials.forEach(material => {
        const { color } = calculateMaterialDelayTime(material);

        if (!worstStatus) {
          worstStatus = color;
        } else {
          // Priority order: red > orange > green
          if (color === 'red') {
            worstStatus = 'red';
          } else if (color === 'orange' && worstStatus !== 'red') {
            worstStatus = 'orange';
          } else if (color === 'green' && worstStatus !== 'red' && worstStatus !== 'orange') {
            worstStatus = 'green';
          }
        }
      });

      return worstStatus;
    };

    const worstStatus = getWorstMaterialStatus();

    // Map the selected color to the corresponding status color
    const colorMap = {
      'red': 'red',
      'yellow': 'orange',
      'green': 'green'
    };

    return worstStatus === colorMap[selectedColor];
  };

  // Update filtered rows when data or search term changes
  useEffect(() => {
    if (data && data.length > 0) {
      // Create a Map to combine trolley data
      const trolleyMap = new Map();

      // Filter data by searchTerm first
      const filteredData = data.filter(item =>
        Object.values(item).some(value =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );

      filteredData.forEach(item => {
        const troId = item.tro_id;

        if (!trolleyMap.has(troId)) {
          // สร้างข้อมูลรถเข็นใหม่
          trolleyMap.set(troId, {
            tro_id: troId,
            slot_id: item.slot_id,
            mapping_id: item.mapping_id,
            production: item.production,
            rmm_line_name: item.rmm_line_name,
            trolleyStatus: item.rm_cold_status,
            cold: item.cold,
            cooked_date: item.cooked_date,
            rmit_date: item.rmit_date,
            standard_cold: item.standard_cold,
            remaining_rework_time: item.remaining_rework_time,
            standard_rework_time: item.standard_rework_time,
            come_cold_date: item.come_cold_date,
            come_cold_date_two: item.come_cold_date_two,
            come_cold_date_three: item.come_cold_date_three,
            ptc_time: item.ptc_time,
            standard_ptc: item.standard_ptc,
            rawMatType: item.rawMatType, // เพิ่มประเภทของวัตถุดิบ
            mix_time: item.mix_time, // เพิ่ม mix_time สำหรับวัตถุดิบผสม
            mixed_date: item.mixed_date, // เพิ่ม mixed_date
            mix_code: item.mix_code, // เพิ่ม mix_code สำหรับรถเข็น
            prod_mix: item.prod_mix, // เพิ่ม prod_mix
            name_edit_prod_two: item.name_edit_prod_two,
            name_edit_prod_three: item.name_edit_prod_three,
            first_prod: item.first_prod,
            two_prod: item.two_prod,
            three_prod: item.three_prod,
            remark_rework: item.remark_rework,
            remark_rework_cold: item.remark_rework_cold,
            edit_rework: item.edit_rework,
            receiver_qc_cold: item.receiver_qc_cold,
            approver: item.approver,
            qccheck_cold: item.qccheck_cold,
            prepare_mor_night: item.prepare_mor_night,
            materials: []
          });
        }

        // เพิ่มข้อมูลวัตถุดิบลงในรถเข็น
        // ในส่วนของ useEffect ที่จัดการข้อมูล
        trolleyMap.get(troId).materials.push({
          batch: item.batch,
          material_code: item.mat,
          materialName: item.mat_name,
          production: item.production,
          levelEu: item.level_eu,
          materialStatus: item.rm_status,
          cold_time: item.cold,
          standard_cold: item.standard_cold,
          remaining_rework_time: item.remaining_rework_time,
          standard_rework_time: item.standard_rework_time,
          mapping_id: item.mapping_id,
          cooked_date: item.cooked_date,
          rmit_date: item.rmit_date,
          come_cold_date: item.come_cold_date,
          come_cold_date_two: item.come_cold_date_two,
          come_cold_date_three: item.come_cold_date_three,
          withdraw_date: item.withdraw_date,
          ptc_time: item.ptc_time,
          standard_ptc: item.standard_ptc,
          sq_remark: item.sq_remark,
          md_remark: item.md_remark,
          defect_remark: item.defect_remark,
          qccheck: item.qccheck,
          mdcheck: item.mdcheck,
          defectcheck: item.defectcheck,
          machine_MD: item.machine_MD,
          sq_acceptance: item.sq_acceptance,
          defect_acceptance: item.defect_acceptance,
          rawMatType: item.rawMatType,
          mix_time: item.mix_time,
          mixed_date: item.mixed_date,
          mix_code: item.mix_code,
          prod_mix: item.prod_mix,
          weight_RM: item.weight_RM, // เพิ่มข้อมูลน้ำหนักวัตถุดิบ
          tray_count: item.tray_count, // เพิ่มข้อมูลจำนวนถาด
          name_edit_prod_two: item.name_edit_prod_two,
          name_edit_prod_three: item.name_edit_prod_three,
          first_prod: item.first_prod,
          two_prod: item.two_prod,
          three_prod: item.three_prod,
          remark_rework: item.remark_rework,
          remark_rework_cold: item.remark_rework_cold,
          edit_rework: item.edit_rework,
          receiver_qc_cold: item.receiver_qc_cold,
          approver: item.approver,
          qccheck_cold: item.qccheck_cold,
          prepare_mor_night: item.prepare_mor_night,
        });
      });

      // Convert Map to Array
      const trolleyList = Array.from(trolleyMap.values());

      // Apply color filtering if selected
      const colorFilteredList = trolleyList.filter(row => checkColorMatch(row));

      setFilteredRows(colorFilteredList);
    } else {
      setFilteredRows([]);
    }
  }, [searchTerm, data, selectedColor]); // Added selectedColor as dependency

  // Update data from Socket
  useEffect(() => {
    socket.on("dataUpdated", (updatedData) => {
      // Create a Map to combine trolley data
      const trolleyMap = new Map();

      updatedData.forEach(item => {
        const troId = item.tro_id;

        if (!trolleyMap.has(troId)) {
          // Create new trolley data
          trolleyMap.set(troId, {
            tro_id: troId,
            slot_id: item.slot_id,
            mapping_id: item.mapping_id,
            production: item.production,
            trolleyStatus: item.trolleyStatus,
            rmm_line_name: item.rmm_line_name,
            cold: item.cold,
            standard_cold: item.standard_cold,
            cooked_date: item.cooked_date,
            rmit_date: item.rmit_date,
            come_cold_date: item.come_cold_date,
            come_cold_date_two: item.come_cold_date_two,
            come_cold_date_three: item.come_cold_date_three,
            withdraw_date: item.withdraw_date,
            ptc_time: item.ptc_time, // เพิ่มบรรทัดนี้
            standard_ptc: item.standard_ptc,
            // sq_remark: item.sq_remark,
            // md_remark: item.md_remark,
            // defect_remark: item.defect_remark,
            // qccheck: item.qccheck,
            // mdcheck: item.mdcheck,
            // defectcheck: item.defectcheck,
            materials: []
          });
        }

        // Add material data to the trolley
        trolleyMap.get(troId).materials.push({
          batch: item.batch,
          material_code: item.material_code,
          materialName: item.materialName,
          levelEu: item.levelEu,
          materialStatus: item.materialStatus,
          cold_time: item.cold_time || item.cold,
          standard_cold: item.standard_cold,
          mapping_id: item.mapping_id,
          cooked_date: item.cooked_date,
          withdraw_date: item.withdraw_date,
          rmit_date: item.rmit_date,
          come_cold_date: item.come_cold_date,
          come_cold_date_two: item.come_cold_date_two,
          come_cold_date_three: item.come_cold_date_three,
          withdraw_date: item.withdraw_date,
          ptc_time: item.ptc_time, // เพิ่มบรรทัดนี้
          standard_ptc: item.standard_ptc,
          name_edit_prod_two: item.name_edit_prod_two,
          name_edit_prod_three: item.name_edit_prod_three,
          first_prod: item.first_prod,
          two_prod: item.two_prod,
          three_prod: item.three_prod,
          // sq_remark: item.sq_remark,
          // md_remark: item.md_remark,
          // defect_remark: item.defect_remark,
          // qccheck: item.qccheck,
          // mdcheck: item.mdcheck,
          // defectcheck: item.defectcheck,
        });
      });

      // Convert Map to Array
      const trolleyList = Array.from(trolleyMap.values());

      // Apply color filtering
      const colorFilteredList = trolleyList.filter(row => checkColorMatch(row));

      setFilteredRows(colorFilteredList);
    });

    // Disconnect when component unmounts
    return () => {
      socket.off("dataUpdated");
    };
  }, [selectedColor]); // Added selectedColor as dependency

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
    setPage(0); // Reset to first page when filter changes
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
              {/* Table header - ID Badge */}
              <TableCell align="center" style={{
                backgroundColor: "hsl(210, 100%, 60%)",
                borderTopLeftRadius: '8px',
                borderBottomLeftRadius: '8px',
                borderTop: "1px solid #e0e0e0",
                borderRight: "1px solid #f2f2f2",
                borderBottom: "1px solid #e0e0e0",
                borderLeft: "1px solid #e0e0e0",
                padding: '5px',
                width: CUSTOM_COLUMN_WIDTHS.trolleyId
              }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ป้ายทะเบียน</Box>
              </TableCell>

              {/* Table header - Production Plan */}
              <TableCell align="center" style={{
                backgroundColor: "hsl(210, 100%, 60%)",
                borderTop: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
                borderRight: "1px solid #f2f2f2",
                padding: '5px',
                width: CUSTOM_COLUMN_WIDTHS.production
              }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>แผนการผลิต</Box>
              </TableCell>

              {/* Table header - Trolley Status */}
              <TableCell align="center" style={{
                backgroundColor: "hsl(210, 100%, 60%)",
                borderTop: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
                borderRight: "1px solid #f2f2f2",
                padding: '5px',
                width: CUSTOM_COLUMN_WIDTHS.trolleyStatus
              }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>สถานะรถเข็น</Box>
              </TableCell>

              {/* Table header - Total Weight */}
              <TableCell align="center" style={{
                backgroundColor: "hsl(210, 100%, 60%)",
                borderTop: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
                borderRight: "1px solid #f2f2f2",
                padding: '5px',
                width: '120px'
              }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>น้ำหนักรวม (kg.)</Box>
              </TableCell>

              {/* Table header - Total Trays */}
              <TableCell align="center" style={{
                backgroundColor: "hsl(210, 100%, 60%)",
                borderTop: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
                borderRight: "1px solid #f2f2f2",
                padding: '5px',
                width: '120px'
              }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>จำนวนถาดรวม</Box>
              </TableCell>

              {/* Table header - View Details */}
              <TableCell align="center" style={{
                backgroundColor: "hsl(210, 100%, 60%)",
                borderTop: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
                borderRight: "1px solid #f2f2f2",
                padding: '5px',
                width: CUSTOM_COLUMN_WIDTHS.view
              }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ดูรายละเอียด</Box>
              </TableCell>

              {/* Table header - Export */}
              <TableCell align="center" style={{
                backgroundColor: "hsl(210, 100%, 60%)",
                borderTop: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
                borderRight: "1px solid #e0e0e0",
                borderTopRightRadius: '8px',
                borderBottomRightRadius: '8px',
                padding: '5px',
                width: CUSTOM_COLUMN_WIDTHS.export
              }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ส่งออก</Box>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
            {filteredRows.length > 0 ? (
              filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <React.Fragment key={row.tro_id}>
                  <Row
                    row={row}
                    handleOpenModal={handleOpenModal}
                    handleRowClick={handleRowClick}
                    handleOpenEditModal={handleOpenEditModal}
                    handleOpenDeleteModal={handleOpenDeleteModal}
                    handleOpenSuccess={handleOpenSuccess}
                    selectedColor={selectedColor}
                    colorMatch={true} // We already filtered the rows above
                    openRowId={openRowId}
                    setOpenRowId={setOpenRowId}
                    openDetailRowId={openDetailRowId}
                    setOpenDetailRowId={setOpenDetailRowId}
                    index={index}
                  />
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
                  ไม่มีรายการรถเข็นในขณะนี้
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

// Updated FilterButton Component
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