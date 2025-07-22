import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";
import PrintModal from "./PrintModal";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import { FaCheck } from "react-icons/fa";
import axios from "axios";
axios.defaults.withCredentials = true; 
import ModalAlert from "../../../../Popup/AlertSuccess";

const API_URL = import.meta.env.VITE_API_URL;

const QcCheck = ({ open, onClose, material_code, materialName, ptc_time, standard_ptc, heck, cold, rm_cold_status, rm_status, ComeColdDateTime, slot_id,
  tro_id, batch, rmfp_id, onSuccess, Location, ColdOut, operator, level_eu, formattedDelayTime, latestComeColdDate, cooked_date, rmit_date, materials,
  qccheck, sq_remark, mdcheck, md_remark, defect_remark, defectcheck, machine_MD, sq_acceptance, defect_acceptance, dest, weight_RM, tray_count
  , rmm_line_name, withdraw_date, name_edit_prod_two,name_edit_prod_three, first_prod, two_prod, three_prod, qccheck_cold, receiver_qc_cold,approver,production, remark_rework,remark_rework_cold, edit_rework, prepare_mor_night
}) => {

  const [showAlert, setShowAlert] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [dataForPrint, setDataForPrint] = useState(null);

  // ฟังก์ชันแปลงเวลาจาก UTC เป็นเวลาไทย
  const formatThaiDateTime = (utcDateTimeStr) => {
    if (!utcDateTimeStr) return "-";

    try {
      // สร้าง Date object จาก UTC string
      const utcDate = new Date(utcDateTimeStr);

      // เพิ่ม 7 ชั่วโมงเพื่อแปลงเป็นเวลาไทย (GMT+7)
      // หรือใช้ toLocaleString กับ time zone 'Asia/Bangkok'
      return utcDate.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        // second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };
  //แปลง / เป็น -
  const formatSpecialChars = (value) => {
    if (!value) return "-";
    return value === "/" ? "-" : value;
  };
  // คำนวณระยะเวลาระหว่างสองเวลา (เป็นชั่วโมง)
  const calculateTimeDifference = (startDate, endDate) => {
    if (!startDate || !endDate) return "-";

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      start.setSeconds(0, 0);
      end.setSeconds(0, 0);

      console.log("start Time :", start);
      console.log("end :", end);

      // คำนวณความแตกต่างในมิลลิวินาที
      const diffMilliseconds = end - start;

      // แปลงเป็นนาที (1000 มิลลิวินาที = 1 วินาที, 60 วินาที = 1 นาที)
      const diffMinutes = diffMilliseconds / (1000 * 60);

      // แยกเป็นชั่วโมงและนาที
      const hours = Math.floor(diffMinutes / 60);
      const minutes = Math.floor(diffMinutes % 60);

      // เก็บค่าชั่วโมงทศนิยมไว้ใช้ในการคำนวณอื่นๆ ถ้าจำเป็น
      const diffHours = diffMinutes / 60;

      console.log("diffHours :", diffHours);
      console.log("hours:", hours, "minutes:", minutes);

      // สร้างข้อความแสดงผลตามรูปแบบที่ต้องการ
      if (hours > 0) {
        return `${hours} ชม. ${minutes} นาที`;
      } else {
        return `${minutes} นาที`;
      }
    } catch (error) {
      console.error("Error calculating time difference:", error);
      return "-";
    }
  };

  // คำนวณ DBS
  const calculateDBS = (standardPtc, ptcTime) => {
    if (!standardPtc || !ptcTime) return "-";

    try {
      // แปลงเวลาจากรูปแบบ HH.MM เป็นนาที
      const standardParts = standardPtc.toString().split('.');
      const ptcParts = ptcTime.toString().split('.');

      // แปลงชั่วโมงเป็นนาที และรวมกับนาที
      const standardMinutes = parseInt(standardParts[0]) * 60 +
        (standardParts.length > 1 ? parseInt(standardParts[1]) : 0);
      const ptcMinutes = parseInt(ptcParts[0]) * 60 +
        (ptcParts.length > 1 ? parseInt(ptcParts[1]) : 0);

      // คำนวณความแตกต่าง
      let diffMinutes = standardMinutes - ptcMinutes;

      // ถ้าติดลบ ให้แสดงเป็น 0
      if (diffMinutes < 0) diffMinutes = 0;

      // แปลงเป็นชั่วโมงและนาที
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      // สร้างข้อความแสดงผล
      if (hours > 0) {
        return `${hours} ชม. ${minutes} นาที`;
      } else {
        return `${minutes} นาที`;
      }
    } catch (error) {
      console.error("Error calculating DBS:", error);
      return "-";
    }
  };

  // คำนวณ DCS (เวลาออกห้องเย็น - เวลาเข้าห้องเย็น)
  const calculateDCS = (comeColdDate, outColdDate) => {
    const timeDiff = calculateTimeDifference(comeColdDate, outColdDate);
    if (timeDiff === "-") return "-";

    return timeDiff;
  };


  // ฟังก์ชันแปลงข้อความเวลาเป็นรูปแบบ HH.MM
  const convertDelayTimeToHHMM = (delayTimeText) => {
    if (!delayTimeText || delayTimeText === "-") return 0;

    // ตรวจสอบว่าเป็นเวลาที่เลยกำหนดหรือเวลาที่เหลือ
    const isExceeded = delayTimeText.includes("เลยกำหนด");

    // แยกข้อความเพื่อดึงวัน ชั่วโมง และนาที
    let timeText = delayTimeText.replace("เลยกำหนด ", "").replace("เหลืออีก ", "");

    let days = 0;
    let hours = 0;
    let minutes = 0;

    // ดึงจำนวนวัน
    if (timeText.includes("วัน")) {
      const daysPart = timeText.split("วัน")[0].trim();
      days = parseInt(daysPart, 10);
      timeText = timeText.split("วัน")[1].trim();
    }

    // ดึงชั่วโมง
    if (timeText.includes("ชม.")) {
      const hoursPart = timeText.split("ชม.")[0].trim();
      hours = parseInt(hoursPart, 10);
      timeText = timeText.split("ชม.")[1].trim();
    }

    // ดึงนาที
    if (timeText.includes("นาที")) {
      const minutesPart = timeText.split("นาที")[0].trim();
      minutes = parseInt(minutesPart, 10);
    }

    // แปลงวันเป็นชั่วโมง และรวมกับชั่วโมงที่มีอยู่
    const totalHours = (days * 24) + hours;

    // แปลงเป็นรูปแบบ HH.MM
    const formattedTime = totalHours + (minutes / 100);

    // ถ้าเป็นเวลาที่เลยกำหนด ให้ใส่เครื่องหมายลบ
    return isExceeded ? -formattedTime : formattedTime;
  };

  const handleConfirm = async () => {
    const processedMaterials = materials ? materials.map(item => {
      // ตรวจสอบประเภทวัตถุดิบและจัดการกับ delayTime
      if (item.rawMatType === "mixed" && item.delayTime) {
        // แปลง delayTime จากข้อความเป็นตัวเลขในรูปแบบ HH.MM
        const convertedDelayTime = convertDelayTimeToHHMM(item.delayTime);
        return {
          ...item,
          mix_time: convertedDelayTime // เก็บค่าที่แปลงแล้วใน mix_time สำหรับวัตถุดิบผสม
        };
      } else if (item.delayTime && item.remaining_rework_time !== null && item.remaining_rework_time !== undefined) {
        // สำหรับวัตถุดิบที่มี remaining_rework_time
        const convertedDelayTime = convertDelayTimeToHHMM(item.delayTime);
        return {
          ...item,
          rework_delay_time: convertedDelayTime
        };
      } else if (item.delayTime) {
        // กรณีทั่วไปที่มีแค่ delayTime
        const convertedDelayTime = convertDelayTimeToHHMM(item.delayTime);
        return {
          ...item,
          cold: convertedDelayTime
        };
      }
      return item;
    }) : [];

    const payload = {
      mat: material_code,
      rmfpID: rmfp_id ? parseInt(rmfp_id, 10) : null,
      cold: formattedDelayTime,
      ptc_time: ptc_time,
      ColdOut: ColdOut,
      dest: Location,
      operator: operator,
      rm_status: rm_status,
      tro_id: tro_id,
      slot_id: slot_id,
      rm_cold_status: rm_cold_status,
      batch: batch,
      level_eu: level_eu,

      weight_RM: weight_RM,
      tray_count: tray_count,
      rmm_line_name: rmm_line_name,
      materials: processedMaterials.length > 0 ? processedMaterials : materials
    };

    console.log("Sending payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await axios.put(`${API_URL}/api/coldstorage/outcoldstorage`, payload);
      if (response.status === 200) {
        console.log("✅ Data sent successfully:", response.data);
        setDataForPrint({
          material_code,
          materialName,
          batch,
          Location,
          operator,
          ColdOut,
          tro_id,
          slot_id,
          rm_status,
          rm_cold_status,
          ComeColdDateTime: formatThaiDateTime(latestComeColdDate),
          ptc_time,
          cold: formattedDelayTime,
          level_eu,
          qccheck,
          sq_remark,
          mdcheck,
          md_remark,
          defect_remark,
          defectcheck,
          machine_MD,
          cooked_date,
          withdraw_date,
          rmit_date,
          rmm_line_name,
          name_edit_prod_two,
          name_edit_prod_three,
          first_prod,
          two_prod,
          three_prod,
          remark_rework,
          remark_rework_cold,
          edit_rework,
          receiver_qc_cold,
          approver,
          production,
          qccheck_cold,
          prepare_mor_night,
          materials: materials
        });
        setShowPrintModal(true);
        onSuccess();
        onClose();
        setShowAlert(true);
      } else {
        console.error("Error while sending data:", response.status);
      }
    } catch (error) {
      console.error("Error during API call:", error);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          onClose();
        }}
        fullWidth
        maxWidth="xs"
        sx={{
          '@media print': {
            width: 'auto',
            maxWidth: 'none',
            padding: '10px',
          },
        }}
      >
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
            กรุณาตรวจสอบข้อมูลก่อนทำรายการ
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle1" style={{ fontSize: "16px", color: "#505050", marginBottom: "10px" }}>
            รายการวัตถุดิบในรถเข็น: {tro_id}
          </Typography>

          <Box sx={{ mb: 2, maxHeight: 300, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px', p: 2 }}>
            {materials && materials.length > 0 ? (
              materials.map((item, index) => (
                <Box key={index} sx={{ mb: 3, pb: 2, borderBottom: index < materials.length - 1 ? '1px dashed #ccc' : 'none' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#2388d1' }}>
                    วัตถุดิบที่ {index + 1}
                  </Typography>
                  <Stack spacing={1}>
                    <Typography color="rgba(0, 0, 0, 0.6)">Batch: {item.batch || '-'}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">Material: {item.material_code}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">รายชื่อวัตถุดิบ: {item.materialName}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">Level EU: {item.levelEu || "-"}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">สถานะวัตถุดิบ: {item.materialStatus}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">เวลาเบิกจากห้องเย็นใหญ่: {formatThaiDateTime(item.withdraw_date || "-")}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">เวลาต้มเสร็จ/อบเสร็จ: {formatThaiDateTime(item.cooked_date || "-")}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">เวลาเตรียมเสร็จ: {formatThaiDateTime(item.rmit_date || "-")}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">เวลาเข้าห้องเย็น (ครั้งที่ 1): {formatThaiDateTime(item.come_cold_date || "-")}</Typography>
                    {item.out_cold_date && (
                      <Typography color="rgba(0, 0, 0, 0.6)">ออกห้องเย็น (ครั้งที่ 1): {formatThaiDateTime(item.out_cold_date)}</Typography>
                    )}
                    {item.come_cold_date && item.out_cold_date && (
                      <Typography color="rgba(0, 0, 0, 0.6)">DCS ครั้งที่ 1: {calculateDCS(item.come_cold_date, item.out_cold_date)}</Typography>
                    )}

                    {item.come_cold_date_two && (
                      <Typography color="rgba(0, 0, 0, 0.6)">เวลาเข้าห้องเย็น (ครั้งที่ 2): {formatThaiDateTime(item.come_cold_date_two)}</Typography>
                    )}
                    {item.out_cold_date_two && (
                      <Typography color="rgba(0, 0, 0, 0.6)">ออกห้องเย็น (ครั้งที่ 2): {formatThaiDateTime(item.out_cold_date_two)}</Typography>
                    )}
                    {item.come_cold_date_two && item.out_cold_date_two && (
                      <Typography color="rgba(0, 0, 0, 0.6)">DCS ครั้งที่ 2: {calculateDCS(item.come_cold_date_two, item.out_cold_date_two)}</Typography>
                    )}


                    {item.come_cold_date_three && (
                      <Typography color="rgba(0, 0, 0, 0.6)">เวลาเข้าห้องเย็น (ครั้งที่ 3): {formatThaiDateTime(item.come_cold_date_three)}</Typography>
                    )}
                    {item.out_cold_date_three && (
                      <Typography color="rgba(0, 0, 0, 0.6)">ออกห้องเย็น (ครั้งที่ 3): {formatThaiDateTime(item.out_cold_date_three)}</Typography>
                    )}
                    {item.come_cold_date_three && item.out_cold_date_three && (
                      <Typography color="rgba(0, 0, 0, 0.6)">DCS ครั้งที่ 3: {calculateDCS(item.come_cold_date_three, item.out_cold_date_three)}</Typography>
                    )}


                    {/* แสดง DBS (เวลาเข้าห้องเย็นล่าสุด - เวลาต้มเสร็จ/อบเสร็จ) */}
                    {item.cooked_date && latestComeColdDate && (
                      <Typography color="rgba(0, 0, 0, 0.6)">DBS เตรียม - เข้า CS: {calculateDBS(item.standard_ptc, item.ptc_time)}</Typography>
                    )}

                    {/* ถ้ามีข้อมูล Delay Time สำหรับแต่ละรายการ ก็แสดงด้วย */}
                    <Typography color="rgba(0, 0, 0, 0.6)">Qc check sensory: {item.qccheck || "-"}</Typography>
                    {/* <Typography color="rgba(0, 0, 0, 0.6)">ยอมรับพิเศษ Sensory: {item.sq_remark || "-"}</Typography> */}

                    {item.sq_remark && item.sq_acceptance === true && (
                      <Typography color="rgba(0, 0, 0, 0.6)">ยอมรับพิเศษ Sensory: {item.sq_remark}</Typography>
                    )}
                    {item.sq_remark && item.sq_acceptance !== true && (
                      <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุ Sensory: {item.sq_remark}</Typography>
                    )}
                    <Typography color="rgba(0, 0, 0, 0.6)">Qc MD check: {item.mdcheck || "-"}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุ MD: {item.md_remark || "-"}</Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">Qc defect check: {item.defectcheck || "-"}</Typography>
                    {/* <Typography color="rgba(0, 0, 0, 0.6)">ยอมรับพิเศษ Defect: {item.defect_remark || "-"}</Typography> */}
                    {item.defect_remark && item.defect_acceptance === true && (
                      <Typography color="rgba(0, 0, 0, 0.6)">ยอมรับพิเศษ Defect: {item.defect_remark}</Typography>
                    )}
                    {item.defect_remark && item.defect_acceptance !== true && (
                      <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุ Defect: {item.defect_remark}</Typography>
                    )}
                    <Typography color="rgba(0, 0, 0, 0.6)">หมายเลขเครื่อง : {formatSpecialChars(item.machine_MD)}</Typography>


                    {(item.qccheck_cold || item.receiver_qc_cold || item.approver) && (
                      <>
                        <Typography color="black">การตรวจสอบ Sensory ในห้องเย็น</Typography>
                        {item.qccheck_cold && item.qccheck_cold !== "-" && (
                          <Typography color="rgba(0, 0, 0, 0.6)">ผลการตรวจสอบ Sensory : {item.qccheck_cold}</Typography>
                        )}
                        {item.remark_rework_cold && item.remark_rework_cold !== "-" && (
                          <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุไม่ผ่าน : {item.remark_rework_cold}</Typography>
                        )}
                        {item.receiver_qc_cold && item.receiver_qc_cold !== "-" && (
                          <Typography color="rgba(0, 0, 0, 0.6)">ผู้ตรวจ : {item.receiver_qc_cold}</Typography>
                        )}
                        {item.approver && item.approver !== "-" && (
                          <Typography color="rgba(0, 0, 0, 0.6)">ผู้อนุมัติ : {item.approver}</Typography>
                        )}
                      </>
                    )}

                    {item.remark_rework && (

                        <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุแก้ไข-บรรจุ  : {item.remark_rework}</Typography>
                    )}

                    {item.edit_rework && item.edit_rework !== "-" && (
                          <>
                        <Typography color="black">วิธีการที่เคยใช้ในการแก้ไขวัตถุดิบ</Typography>
                        <Typography color="rgba(0, 0, 0, 0.6)">ประวัติการแก้ไข : {item.edit_rework}</Typography>
                          </>
                      )}
      
                    {(item.first_prod || item.two_prod || item.name_edit_prod_two) && (
                      <>
                        <Typography color="black">วัตถุดิบเคยเปลี่ยนแผนการผลิต</Typography>

                        {item.first_prod && (
                          <Typography color="rgba(0, 0, 0, 0.6)">แผนการผลิต ครั้งที่ 1 : {item.first_prod}</Typography>
                        )}

                        {item.two_prod && (
                          <Typography color="rgba(0, 0, 0, 0.6)">แผนการผลิตใหม่ ครั้งที่ 2 : {item.two_prod}</Typography>
                        )}

                        {item.name_edit_prod_two && (
                          <Typography color="rgba(0, 0, 0, 0.6)">ผู้อนุมัติแก้ไข ครั้งที่ 2 : {item.name_edit_prod_two}</Typography>
                        )}

                        {item.three_prod && (
                          <Typography color="rgba(0, 0, 0, 0.6)">แผนการผลิตใหม่ ครั้งที่ 3 : {item.three_prod}</Typography>
                        )}
                        {item.name_edit_prod_three && (
                          <Typography color="rgba(0, 0, 0, 0.6)">ผู้อนุมัติแก้ไข ครั้งที่ 3 : {item.name_edit_prod_three}</Typography>
                        )}

                        
                      </>
                    )}
                    {/* {item.name_edit_prod && ( */}
                    {item.prepare_mor_night && (<Typography color="rgba(0, 0, 0, 0.6)">เตรียมงานให้กะ : {item.prepare_mor_night}</Typography>)}

                    {/* )} */}
                  </Stack>
                </Box>
              ))
            ) : (
              <Box sx={{ mb: 2 }}>
                <Stack spacing={1}>
                  <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Material: {material_code}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">รายชื่อวัตถุดิบ: {materialName}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Level EU: {level_eu || "-"}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">สถานะวัตถุดิบ: {rm_status}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">เวลาต้มเสร็จ/อบเสร็จ: {formatThaiDateTime(cooked_date) || "-"}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">เวลาเตรียมเสร็จ: {formatThaiDateTime(rmit_date || "-")}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">เวลาเข้าห้องเย็น (ครั้งที่ 1): {formatThaiDateTime(latestComeColdDate || "-")}</Typography>
                  {/* แสดง DBS (เวลาเข้าห้องเย็นล่าสุด - เวลาต้มเสร็จ/อบเสร็จ) */}
                  {cooked_date && latestComeColdDate && (
                    <Typography color="rgba(0, 0, 0, 0.6)">DBS เตรียม - เข้า CS: {calculateDBS(standard_ptc, ptc_time)}</Typography>
                  )}

                  {/* ถ้ามีข้อมูล Delay Time สำหรับแต่ละรายการ ก็แสดงด้วย */}
                  <Typography color="rgba(0, 0, 0, 0.6)">Qc check sensory: {qccheck || "-"}</Typography>
                  {sq_remark && sq_acceptance === true && (
                    <Typography color="rgba(0, 0, 0, 0.6)">ยอมรับพิเศษ Sensory: {sq_remark}</Typography>
                  )}
                  {sq_remark && sq_acceptance !== true && (
                    <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุ Sensory: {sq_remark}</Typography>
                  )}
                  <Typography color="rgba(0, 0, 0, 0.6)">Qc MD check: {mdcheck || "-"}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุ MD: {md_remark || "-"}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Qc defect check: {defectcheck || "-"}</Typography>
                  {defect_remark && defect_acceptance === true && (
                    <Typography color="rgba(0, 0, 0, 0.6)">ยอมรับพิเศษ Defect: {defect_remark}</Typography>
                  )}
                  {defect_remark && defect_acceptance !== true && (
                    <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุ Defect: {defect_remark}</Typography>
                  )}
                  <Typography color="rgba(0, 0, 0, 0.6)">หมายเลขเครื่อง : {machine_MD === "/" ? "-" : (machine_MD || "-")}</Typography>
                </Stack>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* ข้อมูลทั่วไปของรถเข็น */}
          <Typography variant="subtitle1" style={{ fontSize: "16px", color: "#505050", marginBottom: "10px" }}>
            ข้อมูลทั่วไป
          </Typography>

          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">ป้ายทะเบียน: {tro_id}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">พื้นที่จอด: {slot_id}</Typography>
            {/* <Typography color="rgba(0, 0, 0, 0.6)">ประเภทการส่งออก: {ColdOut}</Typography> */}
            <Typography color="rgba(0, 0, 0, 0.6)">สถานที่จัดส่ง: {Location}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">ไลน์ผลิต: {rmm_line_name || "-"}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">ผู้ดำเนินการ: {operator}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">สถานะรถเข็นในห้องเย็น: {rm_cold_status}</Typography>
            {/* {prepare_mor_night && prepare_mor_night !== "-" && (
            <Typography color="rgba(0, 0, 0, 0.6)">เตรียมกะ: {prepare_mor_night}</Typography>
            )} */}
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Button
              variant="contained"
              onClick={onClose}
              sx={{
                width: "250px",
                marginBottom: "20px",
                height: "50px",
                margin: "5px",
                backgroundColor: "#ff4444",
                '@media print': {
                  display: 'none',
                },
              }}
            >
              ยกเลิก
            </Button>

            <Button
              id="confirmButton"
              variant="contained"
              onClick={handleConfirm}
              sx={{
                width: "250px",
                height: "50px",
                marginBottom: "20px",
                margin: "5px",
                backgroundColor: "#2388d1",
                '@media print': {
                  display: 'none',
                },
              }}
            >
              ยืนยัน
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {showPrintModal && (
        <PrintModal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          data={{
            material_code,
            materialName,
            batch,
            Location,
            operator,
            ColdOut,
            tro_id,
            slot_id,
            rm_status,
            rm_cold_status,
            ComeColdDateTime: formatThaiDateTime(latestComeColdDate),
            cooked_date,
            withdraw_date,
            rmit_date,
            level_eu,
            rmm_line_name,
            qccheck_cold,
            receiver_qc_cold,
            approver,
            production,
            remark_rework,
            remark_rework_cold,
            edit_rework,
            prepare_mor_night,
            materials: materials
          }}
        />
      )}
      <ModalAlert open={showAlert} onClose={() => setShowAlert(false)} />
    </>
  );
};

const ModalEditPD = ({ open, onClose, data, onSuccess, showModal }) => {
  const [errorMessage, setErrorMessage] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [Location, setLocation] = useState("");
  const [operator, setoperator] = useState("");
  const [isConfirmProdOpen, setIsConfirmProdOpen] = useState(false);
  const [processedMaterials, setProcessedMaterials] = useState([]);
  const [showLocationError, setShowLocationError] = useState(false);

  const {
    batch,
    mat,
    rmfp_id,
    rm_cold_status,
    rm_status,
    tro_id,
    line_name,
    slot_id,
    ComeColdDateTime,
    cold,
    ptc_time,
    standard_ptc,
    batch_after,
    level_eu,
    formattedDelayTime,
    latestComeColdDate,
    // Add QC-related fields
    sq_remark,
    md_remark,
    defect_remark,
    qccheck,
    mdcheck,
    defectcheck,
    cooked_date,
    withdraw_date,
    rmit_date,
    machine_MD,
    sq_acceptance,
    defect_acceptance,
    rmm_line_name,
    tray_count,
    weight_RM,
    name_edit_prod_two,
    name_edit_prod_three,
    first_prod,
    two_prod,
    three_prod,
    remark_rework,
    remark_rework_cold,
    edit_rework,
    receiver_qc_cold,
    approver,
    production,
    qccheck_cold,
    prepare_mor_night,
    materials = []
  } = data || {};

  console.log("Materials received:", materials);
  materials.forEach((item, idx) => {
    console.log(`Material ${idx} comeColdDateTime:`, item.latestComeColdDate);
  });

  const handleClose = () => {
    onClose();
  };

  const fetchUserDataFromLocalStorage = () => {
    try {
      const firstName = localStorage.getItem('first_name') || '';

      if (firstName) {
        setoperator(`${firstName}`.trim());
      }
    } catch (error) {
      console.error("Error fetching user data from localStorage:", error);
    }
  };

  useEffect(() => {
    if (open) {
      setLocation("");
      setoperator("");
      fetchUserDataFromLocalStorage(); // เพิ่มการเรียกฟังก์ชันตรงนี้

    }
  }, [open]);

  useEffect(() => {
    if (mat) {
      fetchMaterialName();
      fetchProduction();
    }
  }, [mat]);

  const fetchMaterialName = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fetchRawMatName`, { params: { mat } });
      if (response.data.success) {
        setMaterialName(response.data.data[0]?.mat_name || "ไม่พบชื่อวัตถุดิบ");
      } else {
        console.error("Error fetching material name:", response.data.error);
      }
    } catch (error) {
      console.error("Error fetching material name:", error);
    }
  };

  const fetchProduction = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fetchProduction`, { params: { mat } });
      if (response.data.success) {
        setProduction(response.data.data);
      } else {
        console.error("Error fetching production data:", response.data.error);
      }
    } catch (error) {
      console.error("Error fetching production data:", error);
    }
  };

  const handleConfirm = () => {
    if (!operator || !Location) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      if (!Location) {
        setShowLocationError(true);
      }
      if (!operator) {
        // You might want to highlight operator field too
      }
    } else {
      setErrorMessage("");
      setShowLocationError(false);

      let processedMaterials = materials;

      if (materials && materials.length > 0) {
        processedMaterials = materials.map(item => {
          if (item.formattedDelayTime !== undefined) {
            return item;
          }

          const individualDelayTime = calculateDelayTimeForItem(item);

          return {
            ...item,
            formattedDelayTime: individualDelayTime,
          };
        });
      }

      setIsConfirmProdOpen(true);
      onClose();

      setProcessedMaterials(processedMaterials);
    }
  };

  // เพิ่มฟังก์ชันคำนวณ formattedDelayTime สำหรับแต่ละรายการ
  const calculateDelayTimeForItem = (item) => {
    if (!item.latestComeColdDate) return formattedDelayTime;

    const coldDate = new Date(item.latestComeColdDate);
    const now = new Date();
    const diffHours = (now - coldDate) / (1000 * 60 * 60);

    return Number((diffHours).toFixed(2));
  };
  //แปลง / เป้น -
  const formatSpecialChars = (value) => {
    if (!value) return "-";
    return value === "/" ? "-" : value;
  };
  const handleoperator = (event) => {
    setoperator(event.target.value);
  };

  const handleLocation = (event) => {
    setLocation(event.target.value);
  };

  // ฟังก์ชันแปลงเวลาจาก UTC เป็นเวลาไทย
  const formatThaiDateTime = (utcDateTimeStr) => {
    if (!utcDateTimeStr) return "-";

    try {
      const utcDate = new Date(utcDateTimeStr);

      return utcDate.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        // second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  // คำนวณระยะเวลาระหว่างสองเวลา (เป็นชั่วโมง)
  const calculateTimeDifference = (startDate, endDate) => {
    if (!startDate || !endDate) return "-";

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      console.log("start Time :", start);
      console.log("end :", end);

      // คำนวณความแตกต่างในมิลลิวินาที
      const diffMilliseconds = end - start;

      // แปลงเป็นนาที (1000 มิลลิวินาที = 1 วินาที, 60 วินาที = 1 นาที)
      const diffMinutes = diffMilliseconds / (1000 * 60);

      // แยกเป็นชั่วโมงและนาที
      const hours = Math.floor(diffMinutes / 60);
      const minutes = Math.floor(diffMinutes % 60);

      // เก็บค่าชั่วโมงทศนิยมไว้ใช้ในการคำนวณอื่นๆ ถ้าจำเป็น
      const diffHours = diffMinutes / 60;

      console.log("diffHours :", diffHours);
      console.log("hours:", hours, "minutes:", minutes);

      // สร้างข้อความแสดงผลตามรูปแบบที่ต้องการ
      if (hours > 0) {
        return `${hours} ชม. ${minutes} นาที`;
      } else {
        return `${minutes} นาที`;
      }
    } catch (error) {
      console.error("Error calculating time difference:", error);
      return "-";
    }
  };

  // คำนวณ DBS
  const calculateDBS = (standardPtc, ptcTime) => {
    if (!standardPtc || !ptcTime) return "-";

    try {
      // แปลงเวลาจากรูปแบบ HH.MM เป็นนาที
      const standardParts = standardPtc.toString().split('.');
      const ptcParts = ptcTime.toString().split('.');

      // แปลงชั่วโมงเป็นนาที และรวมกับนาที
      const standardMinutes = parseInt(standardParts[0]) * 60 +
        (standardParts.length > 1 ? parseInt(standardParts[1]) : 0);
      const ptcMinutes = parseInt(ptcParts[0]) * 60 +
        (ptcParts.length > 1 ? parseInt(ptcParts[1]) : 0);

      // คำนวณความแตกต่าง
      let diffMinutes = standardMinutes - ptcMinutes;

      // ถ้าติดลบ ให้แสดงเป็น 0
      if (diffMinutes < 0) diffMinutes = 0;

      // แปลงเป็นชั่วโมงและนาที
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      // สร้างข้อความแสดงผล
      if (hours > 0) {
        return `${hours} ชม. ${minutes} นาที`;
      } else {
        return `${minutes} นาที`;
      }
    } catch (error) {
      console.error("Error calculating DBS:", error);
      return "-";
    }
  };

  return (
    <>
      <Dialog open={open} onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }} fullWidth maxWidth="md">
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
            กรุณาระบุข้อมูลในการส่งออก
          </Typography>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Stack spacing={2}>
            <Divider />

            <Typography variant="h6" style={{ fontSize: "16px", color: "#505050" }}>
              รายการวัตถุดิบในรถเข็น: {tro_id}
            </Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Batch</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell>รายชื่อวัตถุดิบ</TableCell>
                    <TableCell>Level EU</TableCell>
                    <TableCell>สถานะวัตถุดิบ</TableCell>
                    <TableCell>เวลาเบิกจากห้องเย็นใหญ่</TableCell>
                    <TableCell>เวลาต้มเสร็จ/อบเสร็จ</TableCell>
                    <TableCell>เวลาเตรียมเสร็จ</TableCell>
                    <TableCell>เวลาเข้าห้องเย็น</TableCell>
                    <TableCell>DBS เตรียม - เข้า CS</TableCell>
                    <TableCell>QC Check Sensory</TableCell>
                    <TableCell>หมายเหตุ Sensory </TableCell>
                    <TableCell>MD Check</TableCell>
                    <TableCell>หมายเหตุ MD</TableCell>
                    <TableCell>Defect Check</TableCell>
                    <TableCell>หมายเหตุ Defect</TableCell>
                    <TableCell>หมายเลขเครื่อง</TableCell>        
                    <TableCell>แผนผลิตครั้งที่ 1</TableCell>
                    <TableCell>แผนผลิตครั้งที่ 2</TableCell>
                    <TableCell>ผู้อนุมัติแก้ไข 2</TableCell>
                    <TableCell>แผนผลิตครั้งที่ 3</TableCell>
                    <TableCell>ผู้อนุมัติแก้ไข ครั้งที่ 3</TableCell>
                    <TableCell>Sensory เช็คในห้องเย็น</TableCell>
                    <TableCell>หมายเหตุที่ไม่ผ่าน</TableCell>
                    <TableCell>หมายเหตุแก้ไข-บรรจุ</TableCell>
                    <TableCell>ประวัติการแก้ไข</TableCell>
                    


                  </TableRow>
                </TableHead>
                <TableBody>
                  {materials && materials.length > 0 ? (
                    materials.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.batch || '-'}</TableCell>
                        <TableCell>{item.material_code}</TableCell>
                        <TableCell>{item.materialName}</TableCell>
                        <TableCell>{item.levelEu || "-"}</TableCell>
                        <TableCell>{item.materialStatus}</TableCell>
                        <TableCell>{formatThaiDateTime(item.withdraw_date) || "-"}</TableCell>
                        <TableCell>{formatThaiDateTime(item.cooked_date) || "-"}</TableCell>
                        <TableCell>{formatThaiDateTime(item.rmit_date) || "-"}</TableCell>
                        <TableCell>{formatThaiDateTime(item.come_cold_date) || "-"}</TableCell>
                        <TableCell> {calculateDBS(item.standard_ptc, item.ptc_time) || "-"}</TableCell>
                        <TableCell>{item.qccheck || "-"}</TableCell>
                        <TableCell>{item.sq_remark || "-"}</TableCell>
                        <TableCell>{item.mdcheck || "-"}</TableCell>
                        <TableCell>{item.md_remark || "-"}</TableCell>
                        <TableCell>{item.defectcheck || "-"}</TableCell>
                        <TableCell>{item.defect_remark || "-"}</TableCell>
                        <TableCell>{formatSpecialChars(item.machine_MD) || "-"}</TableCell>
                        
                        <TableCell>{item.first_prod|| "-"}</TableCell>
                        <TableCell>{item.two_prod|| "-"}</TableCell>
                        <TableCell>{item.name_edit_prod_two|| "-"}</TableCell>
                        <TableCell>{item.three_prod|| "-"}</TableCell>
                        <TableCell>{item.name_edit_prod_three|| "-"}</TableCell>
                        <TableCell>{item.qccheck_cold || "-"}</TableCell>
                        <TableCell>{item.remark_rework_cold || "-"}</TableCell>
                        <TableCell>{item.remark_rework || "-"}</TableCell>
                        <TableCell>{item.edit_rework || "-"}</TableCell>
                        


                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell>{batch}</TableCell>
                      <TableCell>{mat}</TableCell>
                      <TableCell>{materialName}</TableCell>
                      <TableCell>{level_eu || "-"}</TableCell>
                      <TableCell>{rm_status}</TableCell>
                      <TableCell>{formatThaiDateTime(withdraw_date || "-")}</TableCell>
                      <TableCell>{formatThaiDateTime(cooked_date || "-")}</TableCell>
                      <TableCell>{formatThaiDateTime(rmit_date || "-")}</TableCell>
                      <TableCell>{formatThaiDateTime(latestComeColdDate || "-")}</TableCell>
                      <TableCell>{calculateDBS(standard_ptc, ptc_time)}
                      </TableCell>
                      <TableCell>{qccheck || "-"}</TableCell>
                      <TableCell>{sq_remark || "-"}</TableCell>
                      <TableCell>{mdcheck || "-"}</TableCell>
                      <TableCell>{md_remark || "-"}</TableCell>
                      <TableCell>{defectcheck || "-"}</TableCell>
                      <TableCell>{defect_remark || "-"}</TableCell>
                      <TableCell>{remark_rework || "-"}</TableCell>
                      <TableCell>{remark_rework_cold || "-"}</TableCell>
                      <TableCell>{edit_rework || "-"}</TableCell>
                      <TableCell>{qccheck_cold || "-"}</TableCell>
                      <TableCell>{formatSpecialChars(machine_MD) || "-"}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />
            <Typography color="rgba(0, 0, 0, 0.6)">เลขรถเข็น: {tro_id}</Typography>
            {/* <Typography color="rgba(0, 0, 0, 0.6)">ไลน์ผลิต: {line_name || "-"}</Typography> */}
            <Typography color="rgba(0, 0, 0, 0.6)">สถานะรถเข็นในห้องเย็น: {rm_cold_status}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">ไลน์ผลิต: {rmm_line_name || "-"}</Typography>
            <Divider />
            <Box sx={{
              paddingLeft: "12px",
              border: showLocationError ? '2px solid red' : 'none',  // Add red border when error
              borderRadius: showLocationError ? '4px' : '0',         // Optional: add border radius
              padding: showLocationError ? '8px' : '0 0 0 12px',     // Adjust padding
              transition: 'all 0.3s ease'                            // Smooth transition
            }}>
              <Typography style={{ color: "#666", marginRight: "16px" }}>สถานที่จัดส่ง</Typography>
              <RadioGroup row name="location" value={Location} onChange={(e) => {
                handleLocation(e);
                setShowLocationError(false); // Remove error when user selects something
              }}>
                {["เหลือจากไลน์ผลิต", "QcCheck"].includes(rm_status) && (
                  <FormControlLabel value="บรรจุ" control={<Radio />} style={{ color: "#666" }} label="บรรจุ" />
                )}

                {["QcCheck รอกลับมาเตรียม", "รอ Qc", "QcCheck รอ MD", "รอกลับมาเตรียม"].includes(rm_status) && (
                  <>
                    <FormControlLabel value="จุดเตรียม" control={<Radio />} style={{ color: "#666" }} label="จุดเตรียม" />
                  </>
                )}

                {["รอแก้ไข"].includes(rm_status) && ["เหลือจากไลน์ผลิต", "วัตถุดิบตรง"].includes(rm_cold_status) && remark_rework_cold === null  && (
                  <>
                    <FormControlLabel value="จุดเตรียม" control={<Radio />} style={{ color: "#ff2020" }} label="จุดเตรียม (กรณีส่งวัตถุดิบไปแก้ไข)" />
                    <FormControlLabel value="บรรจุ" control={<Radio />} style={{ color: "#666" }} label="บรรจุ" />
                  </>
                )}
                
                {["รอแก้ไข"].includes(rm_status) && ["เหลือจากไลน์ผลิต", "วัตถุดิบตรง"].includes(rm_cold_status) && remark_rework_cold !== null  && (
                  <>
                    <FormControlLabel value="จุดเตรียม" control={<Radio />} style={{ color: "#666" }} label="จุดเตรียม" />
                  </>
                )}

                {["รอแก้ไข"].includes(rm_status) && ["วัตถุดิบรอแก้ไข", "วัตถุดิบรับฝาก"].includes(rm_cold_status) && (
                  <>
                    <FormControlLabel value="จุดเตรียม" control={<Radio />} style={{ color: "#666" }} label="จุดเตรียม" />
                  </>
                )}
              </RadioGroup>
            </Box>

            <Box sx={{ paddingLeft: "12px" }}>
              <Typography style={{ color: "#666", width: "100px", marginBottom: "9px" }}>ผู้ดำเนินการ</Typography>
              <TextField
                label="กรอกชื่อผู้ทำรายการ"
                variant="outlined"
                fullWidth
                value={operator}
                size="small"
                onChange={handleoperator}
                sx={{ marginBottom: '16px' }}
                type="text"
              />
            </Box>

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
              <Button
                variant="contained"
                startIcon={<CancelIcon />}
                style={{ backgroundColor: "#E74A3B", color: "#fff" }}
                onClick={onClose}
              >
                ยกเลิก
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                style={{ backgroundColor: "#41a2e6", color: "#fff" }}
                onClick={handleConfirm}
              >
                ยืนยัน
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
      <QcCheck

        open={isConfirmProdOpen}
        onClose={() => setIsConfirmProdOpen(false)}
        material_code={mat}
        materialName={materialName}
        ColdOut=""
        weight=""
        Location={Location}
        operator={operator}
        rm_cold_status={rm_cold_status}
        tro_id={tro_id}
        slot_id={slot_id}
        rm_status={rm_status}
        batch={batch}
        rmfp_id={rmfp_id}
        ComeColdDateTime={ComeColdDateTime}
        cold={cold}
        ptc_time={ptc_time}
        onSuccess={onSuccess}
        batch_after={batch_after}
        level_eu={level_eu}
        formattedDelayTime={formattedDelayTime}
        latestComeColdDate={latestComeColdDate}
        cooked_date={cooked_date}
        withdraw_date={withdraw_date}
        rmit_date={rmit_date}
        sq_remark={sq_remark}
        md_remark={md_remark}
        defect_remark={defect_remark}
        qccheck={qccheck}
        mdcheck={mdcheck}

        defectcheck={defectcheck}
        machine_MD={machine_MD}
        rmm_line_name={rmm_line_name} // Make sure to pass rmm_line_name
        weight_RM={weight_RM}
        tray_count={tray_count}
        name_edit_prod_two={name_edit_prod_two}
        name_edit_prod_three={name_edit_prod_three}
        first_prod={first_prod}
        two_prod={two_prod}
        three_prod={three_prod}
        remark_rework={remark_rework}
        remark_rework_cold ={remark_rework_cold}
        edit_rework={edit_rework}
        receiver_qc_cold={receiver_qc_cold}
        approver={approver}
        production={production}
        qccheck_cold={qccheck_cold}
        prepare_mor_night={prepare_mor_night}
        materials={processedMaterials.length > 0 ? processedMaterials : materials}
      />
    </>
  );
};
export default ModalEditPD;