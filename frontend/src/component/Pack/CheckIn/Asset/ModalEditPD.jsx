import React, { useState, useEffect, useCallback } from "react";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { useRef } from "react";
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
  TableBody,
  CircularProgress,
} from "@mui/material";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PrintModal from "./PrintModal";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { FaCheck } from "react-icons/fa";
import axios from "axios";
axios.defaults.withCredentials = true;
import ModalAlert from "../../../../Popup/AlertSuccess";

const API_URL = import.meta.env.VITE_API_URL;

const QcCheck = ({
  open,
  onClose,
  material_code,
  materialName,
  ptc_time,
  standard_ptc,
  heck,
  cold,
  rm_cold_status,
  rm_status,
  ComeColdDateTime,
  slot_id,
  tro_id,
  batch,
  rmfp_id,
  onSuccess,
  Location,
  ColdOut,
  operator,
  level_eu,
  formattedDelayTime,
  latestComeColdDate,
  cooked_date,
  rmit_date,
  materials,
  qccheck,
  sq_remark,
  mdcheck,
  md_remark,
  defect_remark,
  defectcheck,
  machine_MD,
  sq_acceptance,
  defect_acceptance,
  dest,
  weight_RM,
  tray_count,
  rmm_line_name,
  withdraw_date,
  name_edit_prod_two,
  name_edit_prod_three,
  first_prod,
  two_prod,
  three_prod,
  qccheck_cold,
  receiver_qc_cold,
  approver,
  production,
  remark_rework,
  remark_rework_cold,
  edit_rework,
  prepare_mor_night,
  rawMatType, // ✅ เพิ่มบรรทัดนี้
  mapping_id, // ✅ เพิ่มบรรทัดนี้
}) => {
  const [showAlert, setShowAlert] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [dataForPrint, setDataForPrint] = useState(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  const [scannedCode, setScannedCode] = useState("");
  const [scanError, setScanError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerInstanceRef = useRef(null);

  const loadHtml5QrcodeScript = () => {
    return new Promise((resolve, reject) => {
      setIsLoadingLibrary(true);

      if (window.Html5Qrcode) {
        console.log("Html5Qrcode already loaded");
        setIsLoadingLibrary(false);
        resolve();
        return;
      }

      const existingScript = document.querySelector(
        'script[src*="html5-qrcode"]',
      );
      if (existingScript) {
        console.log("Script tag exists, waiting for load...");
        existingScript.addEventListener("load", () => {
          console.log("Html5Qrcode loaded from existing script");
          setIsLoadingLibrary(false);
          resolve();
        });
        existingScript.addEventListener("error", () => {
          setIsLoadingLibrary(false);
          reject(new Error("Failed to load script"));
        });
        return;
      }

      console.log("Loading Html5Qrcode script...");
      const script = document.createElement("script");
      script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      script.async = true;

      script.onload = () => {
        console.log("Html5Qrcode script loaded successfully");
        setTimeout(() => {
          setIsLoadingLibrary(false);
          if (window.Html5Qrcode) {
            resolve();
          } else {
            reject(new Error("Html5Qrcode not available after script load"));
          }
        }, 100);
      };

      script.onerror = () => {
        console.error("Failed to load Html5Qrcode script");
        setIsLoadingLibrary(false);
        reject(new Error("ไม่สามารถโหลด QR Scanner Library ได้"));
      };

      document.head.appendChild(script);
    });
  };

  const handleScanVerify = () => {
    const troIdLast4 = tro_id.slice(-4);

    if (scannedCode === troIdLast4) {
      setScanError("");
      // ✅ ถ้า verify สำเร็จ ให้ปิด error และพร้อมทำงานต่อ
      console.log("✅ Verified successfully!");
      // คุณอาจจะต้องทำอะไรต่อที่นี่ เช่น เปิด dialog ถัดไป หรือ submit ข้อมูล
    } else {
      setScanError(`ป้ายทะเบียนไม่ตรงกับรถเข็น ${tro_id}`);
      setScannedCode("");
    }
  };

  // ฟังก์ชันแปลงเวลาจาก UTC เป็นเวลาไทย
  const formatThaiDateTime = (utcDateTimeStr) => {
    if (!utcDateTimeStr) return "-";

    try {
      // สร้าง Date object จาก UTC string
      const utcDate = new Date(utcDateTimeStr);

      // เพิ่ม 7 ชั่วโมงเพื่อแปลงเป็นเวลาไทย (GMT+7)
      // หรือใช้ toLocaleString กับ time zone 'Asia/Bangkok'
      return utcDate.toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        // second: '2-digit',
        hour12: false,
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
      const standardParts = standardPtc.toString().split(".");
      const ptcParts = ptcTime.toString().split(".");

      // แปลงชั่วโมงเป็นนาที และรวมกับนาที
      const standardMinutes =
        parseInt(standardParts[0]) * 60 +
        (standardParts.length > 1 ? parseInt(standardParts[1]) : 0);
      const ptcMinutes =
        parseInt(ptcParts[0]) * 60 +
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
    let timeText = delayTimeText
      .replace("เลยกำหนด ", "")
      .replace("เหลืออีก ", "");

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
    const totalHours = days * 24 + hours;

    // แปลงเป็นรูปแบบ HH.MM
    const formattedTime = totalHours + minutes / 100;

    // ถ้าเป็นเวลาที่เลยกำหนด ให้ใส่เครื่องหมายลบ
    return isExceeded ? -formattedTime : formattedTime;
  };

  const stopCameraScanner = async () => {
    console.log("Stopping camera scanner...");
    if (scannerInstanceRef.current) {
      try {
        await scannerInstanceRef.current.stop();
        await scannerInstanceRef.current.clear();
        console.log("Camera stopped successfully");
      } catch (error) {
        console.warn("Error stopping scanner:", error);
      }
      scannerInstanceRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleScanInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setScannedCode(value);
    setScanError("");

    // ✅ เมื่อผู้ใช้พิมพ์เอง ให้ปิดกล้อง
    if (e.nativeEvent.inputType && isCameraActive) {
      stopCameraScanner();
      setInputMode("manual"); // ✅ เพิ่มบรรทัดนี้
    }

    // ✅ ปิดกล้องเฉพาะเมื่อผู้ใช้พิมพ์เอง
    if (
      e.nativeEvent.inputType &&
      isCameraActive &&
      scannerInstanceRef.current
    ) {
      stopCameraScanner();
      setIsCameraActive(false);
    }

    // Auto-submit เมื่อครบ 4 หลัก
    if (value.length === 4) {
      setTimeout(() => handleScanVerify(), 100);
    }
  };

  // const handleScanKeyPress = (e) => {
  //   if (e.key === "Enter" && scannedCode.length === 4) {
  //     handleScanVerify();
  //   }
  // };

  // ✅ แก้เป็น (เพิ่ม log เพื่อ debug)
  const handleScanKeyPress = (e) => {
    console.log("Key pressed:", e.key);
    console.log("Current scannedCode:", scannedCode);
    console.log("Code length:", scannedCode.length);

    if (e.key === "Enter" && scannedCode.length === 4) {
      console.log("Enter key - triggering verify");
      handleScanVerify();
    }
  };

  const handleConfirm = async () => {
    const processedMaterials = materials
      ? materials.map((item) => {
          // ตรวจสอบประเภทวัตถุดิบและจัดการกับ delayTime
          if (item.rawMatType === "mixed" && item.delayTime) {
            // แปลง delayTime จากข้อความเป็นตัวเลขในรูปแบบ HH.MM
            const convertedDelayTime = convertDelayTimeToHHMM(item.delayTime);
            return {
              ...item,
              mix_time: convertedDelayTime, // เก็บค่าที่แปลงแล้วใน mix_time สำหรับวัตถุดิบผสม
            };
          } else if (
            item.delayTime &&
            item.remaining_rework_time !== null &&
            item.remaining_rework_time !== undefined
          ) {
            // สำหรับวัตถุดิบที่มี remaining_rework_time
            const convertedDelayTime = convertDelayTimeToHHMM(item.delayTime);
            return {
              ...item,
              rework_delay_time: convertedDelayTime,
            };
          } else if (item.delayTime) {
            // กรณีทั่วไปที่มีแค่ delayTime
            const convertedDelayTime = convertDelayTimeToHHMM(item.delayTime);
            return {
              ...item,
              cold: convertedDelayTime,
            };
          }
          return item;
        })
      : [];

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
      mapping_id: mapping_id, // ✅ เพิ่ม mapping_id
      materials: processedMaterials.length > 0 ? processedMaterials : materials,
    };

    console.log("Sending payload:", JSON.stringify(payload, null, 2));

    // try {
    //   const response = await axios.put(
    //     `${API_URL}/api/coldstorage/outcoldstorage`,
    //     payload
    //   );
    try {
      // ✅ เพิ่มการเช็คประเภทข้อมูลที่นี่
      let apiEndpoint = `${API_URL}/api/coldstorage/outcoldstorage`; // default endpoint

      // ถ้าเป็นข้อมูล CheckIn ให้ใช้ endpoint สำหรับ CheckIn
       if (rawMatType === 'checkin') {
      apiEndpoint = `${API_URL}/api/checkin/pack`; // ✅ endpoint ใหม่สำหรับ CheckIn
    }

      const response = await axios.put(apiEndpoint, payload);
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
          materials: materials,
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
          if (reason === "backdropClick") return;
          onClose();
        }}
        fullWidth
        maxWidth="xs"
        sx={{
          "@media print": {
            width: "auto",
            maxWidth: "none",
            padding: "10px",
          },
        }}
      >
        <DialogContent>
          <Typography
            variant="h6"
            style={{ fontSize: "18px", color: "#787878" }}
            mb={2}
          >
            กรุณาตรวจสอบข้อมูลก่อนทำรายการ
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography
            variant="subtitle1"
            style={{ fontSize: "16px", color: "#505050", marginBottom: "10px" }}
          >
            รายการวัตถุดิบในรถเข็น: {tro_id}
          </Typography>

          <Box
            sx={{
              mb: 2,
              maxHeight: 300,
              overflow: "auto",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              p: 2,
            }}
          >
            {materials && materials.length > 0 ? (
              materials.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 3,
                    pb: 2,
                    borderBottom:
                      index < materials.length - 1 ? "1px dashed #ccc" : "none",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: "bold", mb: 1, color: "#2388d1" }}
                  >
                    วัตถุดิบที่ {index + 1}
                  </Typography>
                  <Stack spacing={1}>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      Batch: {item.batch || "-"}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      Material: {item.material_code}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      รายชื่อวัตถุดิบ: {item.materialName}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      Level EU: {item.levelEu || "-"}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      สถานะวัตถุดิบ: {item.materialStatus}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      เวลาเบิกจากห้องเย็นใหญ่:{" "}
                      {formatThaiDateTime(item.withdraw_date || "-")}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      เวลาต้มเสร็จ/อบเสร็จ:{" "}
                      {formatThaiDateTime(item.cooked_date || "-")}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      เวลาเตรียมเสร็จ:{" "}
                      {formatThaiDateTime(item.rmit_date || "-")}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      เวลาเข้าห้องเย็น (ครั้งที่ 1):{" "}
                      {formatThaiDateTime(item.come_cold_date || "-")}
                    </Typography>
                    {item.out_cold_date && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        ออกห้องเย็น (ครั้งที่ 1):{" "}
                        {formatThaiDateTime(item.out_cold_date)}
                      </Typography>
                    )}
                    {item.come_cold_date && item.out_cold_date && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        DCS ครั้งที่ 1:{" "}
                        {calculateDCS(item.come_cold_date, item.out_cold_date)}
                      </Typography>
                    )}

                    {item.come_cold_date_two && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        เวลาเข้าห้องเย็น (ครั้งที่ 2):{" "}
                        {formatThaiDateTime(item.come_cold_date_two)}
                      </Typography>
                    )}
                    {item.out_cold_date_two && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        ออกห้องเย็น (ครั้งที่ 2):{" "}
                        {formatThaiDateTime(item.out_cold_date_two)}
                      </Typography>
                    )}
                    {item.come_cold_date_two && item.out_cold_date_two && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        DCS ครั้งที่ 2:{" "}
                        {calculateDCS(
                          item.come_cold_date_two,
                          item.out_cold_date_two,
                        )}
                      </Typography>
                    )}

                    {item.come_cold_date_three && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        เวลาเข้าห้องเย็น (ครั้งที่ 3):{" "}
                        {formatThaiDateTime(item.come_cold_date_three)}
                      </Typography>
                    )}
                    {item.out_cold_date_three && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        ออกห้องเย็น (ครั้งที่ 3):{" "}
                        {formatThaiDateTime(item.out_cold_date_three)}
                      </Typography>
                    )}
                    {item.come_cold_date_three && item.out_cold_date_three && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        DCS ครั้งที่ 3:{" "}
                        {calculateDCS(
                          item.come_cold_date_three,
                          item.out_cold_date_three,
                        )}
                      </Typography>
                    )}

                    {/* แสดง DBS (เวลาเข้าห้องเย็นล่าสุด - เวลาต้มเสร็จ/อบเสร็จ) */}
                    {item.cooked_date && latestComeColdDate && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        DBS เตรียม - เข้า CS:{" "}
                        {calculateDBS(item.standard_ptc, item.ptc_time)}
                      </Typography>
                    )}

                    {/* ถ้ามีข้อมูล Delay Time สำหรับแต่ละรายการ ก็แสดงด้วย */}
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      Qc check sensory: {item.qccheck || "-"}
                    </Typography>
                    {/* <Typography color="rgba(0, 0, 0, 0.6)">ยอมรับพิเศษ Sensory: {item.sq_remark || "-"}</Typography> */}

                    {item.sq_remark && item.sq_acceptance === true && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        ยอมรับพิเศษ Sensory: {item.sq_remark}
                      </Typography>
                    )}
                    {item.sq_remark && item.sq_acceptance !== true && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        หมายเหตุ Sensory: {item.sq_remark}
                      </Typography>
                    )}
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      Qc MD check: {item.mdcheck || "-"}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      หมายเหตุ MD: {item.md_remark || "-"}
                    </Typography>
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      Qc defect check: {item.defectcheck || "-"}
                    </Typography>
                    {/* <Typography color="rgba(0, 0, 0, 0.6)">ยอมรับพิเศษ Defect: {item.defect_remark || "-"}</Typography> */}
                    {item.defect_remark && item.defect_acceptance === true && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        ยอมรับพิเศษ Defect: {item.defect_remark}
                      </Typography>
                    )}
                    {item.defect_remark && item.defect_acceptance !== true && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        หมายเหตุ Defect: {item.defect_remark}
                      </Typography>
                    )}
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      หมายเลขเครื่อง : {formatSpecialChars(item.machine_MD)}
                    </Typography>

                    {(item.qccheck_cold ||
                      item.receiver_qc_cold ||
                      item.approver) && (
                      <>
                        <Typography color="black">
                          การตรวจสอบ Sensory ในห้องเย็น
                        </Typography>
                        {item.qccheck_cold && item.qccheck_cold !== "-" && (
                          <Typography color="rgba(0, 0, 0, 0.6)">
                            ผลการตรวจสอบ Sensory : {item.qccheck_cold}
                          </Typography>
                        )}
                        {item.remark_rework_cold &&
                          item.remark_rework_cold !== "-" && (
                            <Typography color="rgba(0, 0, 0, 0.6)">
                              หมายเหตุไม่ผ่าน : {item.remark_rework_cold}
                            </Typography>
                          )}
                        {item.receiver_qc_cold &&
                          item.receiver_qc_cold !== "-" && (
                            <Typography color="rgba(0, 0, 0, 0.6)">
                              ผู้ตรวจ : {item.receiver_qc_cold}
                            </Typography>
                          )}
                        {item.approver && item.approver !== "-" && (
                          <Typography color="rgba(0, 0, 0, 0.6)">
                            ผู้อนุมัติ : {item.approver}
                          </Typography>
                        )}
                      </>
                    )}

                    {item.remark_rework && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        หมายเหตุแก้ไข-บรรจุ : {item.remark_rework}
                      </Typography>
                    )}

                    {item.edit_rework && item.edit_rework !== "-" && (
                      <>
                        <Typography color="black">
                          วิธีการที่เคยใช้ในการแก้ไขวัตถุดิบ
                        </Typography>
                        <Typography color="rgba(0, 0, 0, 0.6)">
                          ประวัติการแก้ไข : {item.edit_rework}
                        </Typography>
                      </>
                    )}

                    {(item.first_prod ||
                      item.two_prod ||
                      item.name_edit_prod_two) && (
                      <>
                        <Typography color="black">
                          วัตถุดิบเคยเปลี่ยนแผนการผลิต
                        </Typography>

                        {item.first_prod && (
                          <Typography color="rgba(0, 0, 0, 0.6)">
                            แผนการผลิต ครั้งที่ 1 : {item.first_prod}
                          </Typography>
                        )}

                        {item.two_prod && (
                          <Typography color="rgba(0, 0, 0, 0.6)">
                            แผนการผลิตใหม่ ครั้งที่ 2 : {item.two_prod}
                          </Typography>
                        )}

                        {item.name_edit_prod_two && (
                          <Typography color="rgba(0, 0, 0, 0.6)">
                            ผู้อนุมัติแก้ไข ครั้งที่ 2 :{" "}
                            {item.name_edit_prod_two}
                          </Typography>
                        )}

                        {item.three_prod && (
                          <Typography color="rgba(0, 0, 0, 0.6)">
                            แผนการผลิตใหม่ ครั้งที่ 3 : {item.three_prod}
                          </Typography>
                        )}
                        {item.name_edit_prod_three && (
                          <Typography color="rgba(0, 0, 0, 0.6)">
                            ผู้อนุมัติแก้ไข ครั้งที่ 3 :{" "}
                            {item.name_edit_prod_three}
                          </Typography>
                        )}
                      </>
                    )}
                    {/* {item.name_edit_prod && ( */}
                    {item.prepare_mor_night && (
                      <Typography color="rgba(0, 0, 0, 0.6)">
                        เตรียมงานให้กะ : {item.prepare_mor_night}
                      </Typography>
                    )}

                    {/* )} */}
                  </Stack>
                </Box>
              ))
            ) : (
              <Box sx={{ mb: 2 }}>
                <Stack spacing={1}>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    Batch: {batch}
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    Material: {material_code}
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    รายชื่อวัตถุดิบ: {materialName}
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    Level EU: {level_eu || "-"}
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    สถานะวัตถุดิบ: {rm_status}
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    เวลาต้มเสร็จ/อบเสร็จ:{" "}
                    {formatThaiDateTime(cooked_date) || "-"}
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    เวลาเตรียมเสร็จ: {formatThaiDateTime(rmit_date || "-")}
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    เวลาเข้าห้องเย็น (ครั้งที่ 1):{" "}
                    {formatThaiDateTime(latestComeColdDate || "-")}
                  </Typography>
                  {/* แสดง DBS (เวลาเข้าห้องเย็นล่าสุด - เวลาต้มเสร็จ/อบเสร็จ) */}
                  {cooked_date && latestComeColdDate && (
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      DBS เตรียม - เข้า CS:{" "}
                      {calculateDBS(standard_ptc, ptc_time)}
                    </Typography>
                  )}

                  {/* ถ้ามีข้อมูล Delay Time สำหรับแต่ละรายการ ก็แสดงด้วย */}
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    Qc check sensory: {qccheck || "-"}
                  </Typography>
                  {sq_remark && sq_acceptance === true && (
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      ยอมรับพิเศษ Sensory: {sq_remark}
                    </Typography>
                  )}
                  {sq_remark && sq_acceptance !== true && (
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      หมายเหตุ Sensory: {sq_remark}
                    </Typography>
                  )}
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    Qc MD check: {mdcheck || "-"}
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    หมายเหตุ MD: {md_remark || "-"}
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    Qc defect check: {defectcheck || "-"}
                  </Typography>
                  {defect_remark && defect_acceptance === true && (
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      ยอมรับพิเศษ Defect: {defect_remark}
                    </Typography>
                  )}
                  {defect_remark && defect_acceptance !== true && (
                    <Typography color="rgba(0, 0, 0, 0.6)">
                      หมายเหตุ Defect: {defect_remark}
                    </Typography>
                  )}
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    หมายเลขเครื่อง :{" "}
                    {machine_MD === "/" ? "-" : machine_MD || "-"}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* ข้อมูลทั่วไปของรถเข็น */}
          <Typography
            variant="subtitle1"
            style={{ fontSize: "16px", color: "#505050", marginBottom: "10px" }}
          >
            ข้อมูลทั่วไป
          </Typography>

          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">
              ป้ายทะเบียน: {tro_id}
            </Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              พื้นที่จอด: {slot_id}
            </Typography>
            {/* <Typography color="rgba(0, 0, 0, 0.6)">ประเภทการส่งออก: {ColdOut}</Typography> */}
            <Typography color="rgba(0, 0, 0, 0.6)">
              สถานที่จัดส่ง: {Location}
            </Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              ไลน์ผลิต: {rmm_line_name || "-"}
            </Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              ผู้ดำเนินการ: {operator}
            </Typography>
            {/* <Typography color="rgba(0, 0, 0, 0.6)">
              สถานะรถเข็นในห้องเย็น: {rm_cold_status}
            </Typography> */}
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
                "@media print": {
                  display: "none",
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
                "@media print": {
                  display: "none",
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
            materials: materials,
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
  const [showScanDialog, setShowScanDialog] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [scanError, setScanError] = useState("");
  const scanInputRef = useRef(null);
  const [inputMode, setInputMode] = useState("camera"); // 'camera' หรือ 'manual'
 
  // State สำหรับ QR Scanner
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const qrScannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

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
    rawMatType, // ✅ เพิ่มบรรทัดนี้
    materials = [],
  } = data || {};

  const loadHtml5QrcodeScript = () => {
    return new Promise((resolve, reject) => {
      // เช็คว่าโหลดไว้แล้วหรือยัง
      if (window.Html5Qrcode) {
        console.log("Html5Qrcode already loaded");
        resolve();
        return;
      }

      // เช็คว่ามี script tag อยู่แล้วหรือยัง
      const existingScript = document.querySelector(
        'script[src*="html5-qrcode"]',
      );
      if (existingScript) {
        console.log("Script tag exists, waiting for load...");
        existingScript.addEventListener("load", () => {
          console.log("Html5Qrcode loaded from existing script");
          resolve();
        });
        existingScript.addEventListener("error", reject);
        return;
      }

      // สร้าง script tag ใหม่
      console.log("Loading Html5Qrcode script...");
      const script = document.createElement("script");
      script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      script.async = true;

      script.onload = () => {
        console.log("Html5Qrcode script loaded successfully");
        // รอสักครู่ให้แน่ใจว่า library พร้อมใช้งาน
        setTimeout(() => {
          if (window.Html5Qrcode) {
            resolve();
          } else {
            reject(new Error("Html5Qrcode not available after script load"));
          }
        }, 100);
      };

      script.onerror = () => {
        console.error("Failed to load Html5Qrcode script");
        reject(new Error("ไม่สามารถโหลด QR Scanner Library ได้"));
      };

      document.head.appendChild(script);
    });
  };

  const checkCameraPermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          hasPermission: false,
          error: "Browser ไม่รองรับการใช้กล้อง",
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      stream.getTracks().forEach((track) => track.stop());

      return { hasPermission: true, error: null };
    } catch (error) {
      console.error("Camera permission error:", error);

      let errorMessage = "ไม่สามารถเข้าถึงกล้องได้";

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        errorMessage = "กรุณาอนุญาตให้เข้าถึงกล้องในการตั้งค่า Browser";
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        errorMessage = "ไม่พบกล้องในอุปกรณ์";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        errorMessage = "กล้องถูกใช้งานโดยแอปอื่นอยู่";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "ไม่สามารถเข้าถึงกล้องหลังได้";
      } else if (error.name === "SecurityError") {
        errorMessage = "ต้องใช้ HTTPS เพื่อเข้าถึงกล้อง";
      }

      return { hasPermission: false, error: errorMessage };
    }
  };

  const stopCameraScanner = async () => {
    console.log("Stopping camera scanner...");
    if (scannerInstanceRef.current) {
      try {
        await scannerInstanceRef.current.stop();
        await scannerInstanceRef.current.clear();
        console.log("Camera stopped successfully");
      } catch (error) {
        console.warn("Error stopping scanner:", error);
      }
      scannerInstanceRef.current = null;
    }
    setIsScanning(false);
    setIsCameraActive(false);
  };

  // const handleScanVerify = () => {
  //   console.log("handleScanVerify called");
  //   const troIdLast4 = tro_id.slice(-4);

  //   if (scannedCode === troIdLast4) {
  //     console.log("✅ Verification successful!");
  //     setScanError("");
  //     setIsVerified(true);
  //     setShowScanDialog(false);
  //     stopCameraScanner(); // ✅ เรียกใช้ฟังก์ชันที่ define ไว้แล้ว
  //   } else {
  //     console.log("❌ Verification failed!");
  //     setScanError(`ป้ายทะเบียนไม่ตรงกับรถเข็น ${tro_id}`);
  //     setScannedCode("");
  //   }
  // };
  //   const handleScanVerify = () => {
  //   console.log("handleScanVerify called");
  //   console.log("scannedCode:", scannedCode);
  //   console.log("tro_id:", tro_id);

  //   const troIdLast4 = tro_id.slice(-4);
  //   console.log("troIdLast4:", troIdLast4);

  //   if (scannedCode === troIdLast4) {
  //     console.log("✅ Verification successful!");
  //     setScanError("");
  //     setIsVerified(true);
  //     setShowScanDialog(false);
  //     stopCameraScanner();
  //   } else {
  //     console.log("❌ Verification failed!");
  //     console.log(`Expected: ${troIdLast4}, Got: ${scannedCode}`);
  //     setScanError(`ป้ายทะเบียนไม่ตรงกับรถเข็น ${tro_id}`);
  //     setScannedCode("");
  //   }
  // };

  // ✅ แทนที่ด้วยโค้ดใหม่นี้
  const handleScanVerify = useCallback(() => {
    console.log("=== handleScanVerify called ===");
    console.log("Current scannedCode:", scannedCode);
    console.log("Expected tro_id:", tro_id);

    const troIdLast4 = tro_id.slice(-4);
    console.log("Expected last 4 digits:", troIdLast4);

    if (scannedCode === troIdLast4) {
      console.log("✅ Verification successful!");
      setScanError("");
      setIsVerified(true);
      setShowScanDialog(false);
      stopCameraScanner();
    } else {
      console.log("❌ Verification failed!");
      console.log(`Expected: ${troIdLast4}, Got: ${scannedCode}`);
      setScanError(`ป้ายทะเบียนไม่ตรงกับรถเข็น ${tro_id}`);
      setScannedCode("");
    }
  }, [scannedCode, tro_id]); // ⚠️ ส่วนนี้สำคัญมาก!

  // const handleScanInputChange = (e) => {
  //   const value = e.target.value.replace(/\D/g, "").slice(0, 4);
  //   setScannedCode(value);
  //   setScanError("");

  //   if (e.nativeEvent.inputType && isCameraActive) {
  //     stopCameraScanner();
  //     setIsCameraActive(false);
  //   }

  //   // Auto-submit เมื่อครบ 4 หลัก
  //   if (value.length === 4) {
  //     setTimeout(() => handleScanVerify(), 100); // ✅ เรียกใช้ฟังก์ชันที่ define ไว้แล้ว
  //   }
  // };

  // ✅ แทนที่ด้วยโค้ดใหม่นี้
  const handleScanInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    console.log("Input value:", value); // เพิ่ม log

    setScannedCode(value);
    setScanError("");

    // ปิดกล้องเมื่อผู้ใช้พิมพ์เอง
    if (e.nativeEvent.inputType && isCameraActive) {
      stopCameraScanner();
      setInputMode("manual");
    }

    // ❌ ไม่มี auto-submit ตรงนี้แล้ว
  };
  const handleScanKeyPress = (e) => {
    if (e.key === "Enter" && scannedCode.length === 4) {
      handleScanVerify();
    }
  };

  const startCameraScanner = async () => {
    // ✅ เพิ่มการเช็คให้เข้มงวดขึ้น
    if (isScanning || scannerInstanceRef.current) {
      console.log("Camera already active, skipping...");
      return;
    }

    console.log("Starting camera scanner...");
    setIsScanning(true);
    setIsCameraActive(true);
    setScanError("");

    try {
      // 1. โหลด Html5Qrcode library ก่อน
      console.log("Step 1: Loading Html5Qrcode library...");
      await loadHtml5QrcodeScript();
      console.log("✓ Library loaded");

      // 2. เช็ค permission
      console.log("Step 2: Checking camera permission...");
      const permissionCheck = await checkCameraPermission();
      if (!permissionCheck.hasPermission) {
        throw new Error(permissionCheck.error);
      }
      console.log("✓ Permission granted");

      // 3. ตรวจสอบว่ามี element
      console.log("Step 3: Checking element...");
      if (!qrScannerRef.current) {
        throw new Error("ไม่พบพื้นที่แสดงกล้อง");
      }
      console.log("✓ Element found");

      // 4. ปิด scanner เก่า (ถ้ามี)
      console.log("Step 4: Cleaning old scanner...");
      if (scannerInstanceRef.current) {
        try {
          await scannerInstanceRef.current.stop();
          await scannerInstanceRef.current.clear();
        } catch (e) {
          console.warn("Error clearing old scanner:", e);
        }
        scannerInstanceRef.current = null;
      }
      console.log("✓ Old scanner cleaned");

      // 5. สร้าง scanner instance ใหม่
      console.log("Step 5: Creating scanner instance...");
      const Html5Qrcode = window.Html5Qrcode;
      if (!Html5Qrcode) {
        throw new Error("Html5Qrcode is not available");
      }
      scannerInstanceRef.current = new Html5Qrcode("qr-reader");
      console.log("✓ Scanner instance created");

      // 6. เริ่มต้น scanner
      console.log("Step 6: Starting camera...");
      await scannerInstanceRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          console.log("QR Code detected:", decodedText);
          const last4 = decodedText.slice(-4).replace(/\D/g, "");

          if (last4.length === 4) {
            setScannedCode(last4);

            if (last4 === tro_id.slice(-4)) {
              setIsVerified(true);
              setShowScanDialog(false);
              stopCameraScanner();
            } else {
              setScanError(`ป้ายทะเบียนไม่ตรงกับรถเข็น ${tro_id}`);
              setScannedCode("");

              setTimeout(() => {
                setScanError("");
              }, 3000);
            }
          }
        },
        (errorMessage) => {
          // Ignore scanning errors
        },
      );

      console.log("✅ Camera started successfully!");
    } catch (error) {
      console.error("❌ Error starting camera:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      let errorMsg = error.message || "ไม่สามารถเปิดกล้องได้";

      if (errorMsg.includes("HTTPS")) {
        errorMsg += " (ต้องใช้ HTTPS หรือ localhost)";
      } else if (
        errorMsg.includes("permission") ||
        errorMsg.includes("อนุญาต")
      ) {
        errorMsg += " (ไปที่การตั้งค่า Browser)";
      } else if (errorMsg.includes("Library") || errorMsg.includes("โหลด")) {
        errorMsg = "ไม่สามารถโหลด QR Scanner ได้ กรุณา Reload หน้าเว็บ";
      }

      setScanError(errorMsg);
      setIsScanning(false);
      setIsCameraActive(false);

      // Focus ที่ input แทน
      setTimeout(() => {
        if (scanInputRef.current) {
          scanInputRef.current.focus();
        }
      }, 500);
    }
  };

  const restartCamera = async () => {
    console.log("Restarting camera...");
    setScannedCode("");
    setScanError("");
    await stopCameraScanner();

    // รอสักครู่ก่อนเปิดใหม่
    setTimeout(() => {
      startCameraScanner();
    }, 500);
  };

  // ✅ เพิ่มฟังก์ชันใหม่ตรงนี้
  const switchToManualMode = () => {
    stopCameraScanner();
    setInputMode("manual");
    setScannedCode("");
    setScanError("");
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 100);
  };

  const switchToCameraMode = () => {
    setInputMode("camera");
    setScannedCode("");
    setScanError("");
    startCameraScanner();
  };

  const handleClose = () => {
    stopCameraScanner();
    setShowScanDialog(true);
    setIsVerified(false);
    setScannedCode("");
    setScanError("");
    setIsCameraActive(true);
    setIsScanning(false);

    onClose();
  };

  const fetchUserDataFromLocalStorage = () => {
    try {
      const firstName = localStorage.getItem("first_name") || "";
      if (firstName) {
        setoperator(`${firstName}`.trim());
      }
    } catch (error) {
      console.error("Error fetching user data from localStorage:", error);
    }
  };

  // ✅ เพิ่ม useEffect ใหม่นี้
  useEffect(() => {
    if (
      open &&
      showScanDialog &&
      inputMode === "manual" &&
      scanInputRef.current
    ) {
      setTimeout(() => {
        scanInputRef.current.focus();
      }, 300);
    }
  }, [open, showScanDialog, inputMode]);

  // useEffect - จัดการเมื่อเปิด dialog
  useEffect(() => {
    if (open) {
      console.log("Dialog opened, initializing scanner...");
      setLocation("");
      setoperator("");
      setShowScanDialog(true);
      setIsVerified(false);
      setScannedCode("");
      setScanError("");
      setIsCameraActive(false);
      setIsScanning(false);
      fetchUserDataFromLocalStorage();

      // เริ่มกล้องหลังจาก dialog เปิดแล้ว
      // const timer = setTimeout(() => {
      //   startCameraScanner();
      // }, 300);

      // return () => {
      //   clearTimeout(timer);
      //   stopCameraScanner();
      // };
    } else {
      stopCameraScanner();
    }
  }, [open]);

  // เพิ่ม useEffect นี้หลัง useEffect ที่มีอยู่
  useEffect(() => {
    return () => {
      console.log("Component unmounting, cleaning up...");
      stopCameraScanner();
    };
  }, []);

  useEffect(() => {
    if (mat) {
      fetchMaterialName();
      fetchProduction();
    }
  }, [mat]);

  // ✅ เพิ่มตรงนี้
  useEffect(() => {
    if (scannedCode.length === 4) {
      const timer = setTimeout(() => {
        handleScanVerify();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [scannedCode, handleScanVerify]);
 
  const fetchMaterialName = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fetchRawMatName`, {
        params: { mat },
      });
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
      const response = await axios.get(`${API_URL}/api/fetchProduction`, {
        params: { mat },
      });
      if (response.data.success) {
        setProduction(response.data.data);
      } else {
        console.error("Error fetching production data:", response.data.error);
      }
    } catch (error) {
      console.error("Error fetching production data:", error);
    }
  };

  // const handleConfirm = () => {
  //   if (!operator || !Location) {
  //     setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
  //     if (!Location) {
  //       setShowLocationError(true);
  //     }
  //   } else {
  //     setErrorMessage("");
  //     setShowLocationError(false);

  //     let processedMaterials = materials;

  //     if (materials && materials.length > 0) {
  //       processedMaterials = materials.map((item) => {
  //         if (item.formattedDelayTime !== undefined) {
  //           return item;
  //         }

  //         const individualDelayTime = calculateDelayTimeForItem(item);

  //         return {
  //           ...item,
  //           formattedDelayTime: individualDelayTime,
  //         };
  //       });
  //     }

  //     setIsConfirmProdOpen(true);
  //     onClose();
  //     setProcessedMaterials(processedMaterials);
  //   }
  // };
  
  const handleConfirm = () => {
  // ✅ ปรับเงื่อนไขให้เช็คเฉพาะ operator
  if (!operator) {
    setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
  } else {
    setErrorMessage("");
    setShowLocationError(false);

    // ✅ กำหนด dest เป็น "ผสมเตรียม" อัตโนมัติ
    const finalLocation = "ผสมเตรียม";

    let processedMaterials = materials;

    if (materials && materials.length > 0) {
      processedMaterials = materials.map((item) => {
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
  const calculateDelayTimeForItem = (item) => {
    if (!item.latestComeColdDate) return formattedDelayTime;

    const coldDate = new Date(item.latestComeColdDate);
    const now = new Date();
    const diffHours = (now - coldDate) / (1000 * 60 * 60);

    return Number(diffHours.toFixed(2));
  };

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

  const formatThaiDateTime = (utcDateTimeStr) => {
    if (!utcDateTimeStr) return "-";

    try {
      const utcDate = new Date(utcDateTimeStr);
      return utcDate.toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  const calculateTimeDifference = (startDate, endDate) => {
    if (!startDate || !endDate) return "-";

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMilliseconds = end - start;
      const diffMinutes = diffMilliseconds / (1000 * 60);
      const hours = Math.floor(diffMinutes / 60);
      const minutes = Math.floor(diffMinutes % 60);

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

  const calculateDBS = (standardPtc, ptcTime) => {
    if (!standardPtc || !ptcTime) return "-";

    try {
      const standardParts = standardPtc.toString().split(".");
      const ptcParts = ptcTime.toString().split(".");

      const standardMinutes =
        parseInt(standardParts[0]) * 60 +
        (standardParts.length > 1 ? parseInt(standardParts[1]) : 0);
      const ptcMinutes =
        parseInt(ptcParts[0]) * 60 +
        (ptcParts.length > 1 ? parseInt(ptcParts[1]) : 0);

      let diffMinutes = standardMinutes - ptcMinutes;
      if (diffMinutes < 0) diffMinutes = 0;

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

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
      {/* Dialog แรก - สแกนรหัส */}
      <Dialog
        open={open && showScanDialog}
        onClose={(e, reason) => {
          if (reason === "backdropClick") return;
          handleClose();
        }}
        fullWidth
        maxWidth="sm"
        // TransitionProps={{
        //   onEntered: () => {
        //     // เปิดกล้องทันทีหลัง modal แสดงเสร็จจริง
        //     startCameraScanner();
        //   },
        TransitionProps={{
          onEntered: () => {
            // ✅ เปิดกล้องเฉพาะเมื่อโหมดกล้อง
            if (inputMode === "camera") {
              startCameraScanner();
            }
          },
        }}
      >
        <DialogContent>
          <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
            {/* Icon */}
            <Box
              sx={{
                fontSize: 60,
                color: scannedCode.length === 4 ? "#4caf50" : "#2388d1",
                transition: "color 0.3s",
              }}
            >
              <QrCodeScannerIcon sx={{ fontSize: "inherit" }} />
            </Box>

            {/* Header */}
            <Typography
              variant="h6"
              align="center"
              style={{ color: "#787878" }}
            >
              สแกนป้ายทะเบียนรถเข็น
            </Typography>

            {/* Trolley ID */}
            <Typography
              variant="body2"
              align="center"
              style={{ color: "#787878" }}
            >
              รถเข็น: <strong>{tro_id}</strong>
            </Typography>

            {/* ✅ เพิ่มปุ่มสลับโหมดตรงนี้ */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant={inputMode === "camera" ? "contained" : "outlined"}
                startIcon={<CameraAltIcon />}
                onClick={switchToCameraMode}
                size="small"
                disabled={inputMode === "camera"}
              >
                สแกนกล้อง
              </Button>
              <Button
                variant={inputMode === "manual" ? "contained" : "outlined"}
                startIcon={<KeyboardIcon />}
                onClick={switchToManualMode}
                size="small"
                disabled={inputMode === "manual"}
              >
                พิมพ์เอง
              </Button>
            </Box>

            {/* พื้นที่แสดงกล้อง */}
            {/* ในส่วน DialogContent ของ Dialog แรก */}
            <Box sx={{ width: "100%", maxWidth: 400 }}>
              {isLoadingLibrary ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 300,
                    backgroundColor: "#f5f5f5",
                    borderRadius: 2,
                  }}
                >
                  <CircularProgress size={50} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    กำลังโหลด QR Scanner...
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* <div
                    id="qr-reader"
                    ref={qrScannerRef}
                    style={{
                      width: "100%",
                      display: isCameraActive ? "block" : "none",
                    }}
                  ></div> */}
                  {/* ✅ แสดงกล้องเฉพาะโหมดกล้อง */}
                  {inputMode === "camera" && (
                    <div
                      id="qr-reader"
                      ref={qrScannerRef}
                      style={{
                        width: "100%",
                        display: isCameraActive ? "block" : "none",
                      }}
                    ></div>
                  )}

                  {inputMode === "camera" && !isCameraActive && !isScanning && (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 4,
                        backgroundColor: "#f5f5f5",
                        borderRadius: 2,
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        กล้องปิดอยู่
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={restartCamera}
                        startIcon={<CameraAltIcon />}
                        size="small"
                      >
                        เปิดกล้องใหม่
                      </Button>
                    </Box>
                  )}

                  {/* ✅ เพิ่มส่วนแสดงโหมดพิมพ์เอง */}
                  {inputMode === "manual" && (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 4,
                        backgroundColor: "#f0f7ff",
                        borderRadius: 2,
                        border: "2px dashed #2388d1",
                      }}
                    >
                      <KeyboardIcon
                        sx={{ fontSize: 48, color: "#2388d1", mb: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        โหมดพิมพ์เอง
                      </Typography>
                      {/* <Typography variant="caption" color="text.secondary">
      กรอกเลข 4 หลักท้ายของรถเข็น
    </Typography> */}
                      <Typography
                        variant="caption"
                        style={{ color: "#999" }}
                        align="center"
                      >
                        {inputMode === "camera"
                          ? "สแกน QR Code หรือพิมพ์เลข 4 หลักท้ายของป้ายทะเบียน"
                          : "พิมพ์เลข 4 หลักท้ายของป้ายทะเบียนรถเข็น"}
                      </Typography>
                    </Box>
                  )}

                  {!isCameraActive && !isScanning && (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 2,
                        backgroundColor: "#f5f5f5",
                        borderRadius: 2,
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        กล้องปิดอยู่
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={restartCamera}
                        startIcon={<CameraAltIcon />}
                        size="small"
                      >
                        เปิดกล้องใหม่
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>

            {/* Input Field */}
            <Box sx={{ width: "100%", maxWidth: 350 }}>
              <TextField
                inputRef={scanInputRef}
                fullWidth
                label="หรือพิมพ์เลข 4 หลักท้าย / ใช้ Scanner"
                value={scannedCode}
                onChange={handleScanInputChange}
                onKeyPress={handleScanKeyPress}
                placeholder="0000"
                inputProps={{
                  maxLength: 4,
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  style: {
                    fontSize: 24,
                    textAlign: "center",
                    letterSpacing: 8,
                  },
                }}
                error={!!scanError}
                autoFocus={inputMode === "manual"} // ✅ เพิ่มบรรทัดนี้
                onFocus={(e) => {
                  console.log("Input focused");
                }}
                onBlur={(e) => {
                  // ✅ แก้ไขส่วนนี้
                  if (
                    inputMode === "camera" &&
                    !scannedCode &&
                    !isCameraActive &&
                    !isScanning &&
                    !scannerInstanceRef.current
                  ) {
                    setTimeout(() => {
                      startCameraScanner();
                    }, 500);
                  }
                }}
                autoComplete="off"
              />

              {/* Progress Dots */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 1,
                  mt: 2,
                }}
              >
                {[1, 2, 3, 4].map((dot) => (
                  <Box
                    key={dot}
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor:
                        scannedCode.length >= dot ? "#2388d1" : "#e0e0e0",
                      transition: "background-color 0.3s",
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Error Message */}
            {scanError && (
              <Alert severity="error" sx={{ width: "100%" }}>
                {scanError}
              </Alert>
            )}

            {/* Helper Text */}
            <Typography
              variant="caption"
              style={{ color: "#999" }}
              align="center"
            >
              สแกน QR Code หรือพิมพ์เลข 4 หลักท้ายของป้ายทะเบียน
            </Typography>

            {/* Buttons */}
            <Box sx={{ display: "flex", gap: 2, width: "100%", mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleClose}
                fullWidth
                sx={{
                  color: "#E74A3B",
                  borderColor: "#E74A3B",
                }}
              >
                ยกเลิก
              </Button>

              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={handleScanVerify}
                disabled={scannedCode.length !== 4}
                fullWidth
                sx={{ backgroundColor: "#41a2e6" }}
              >
                ยืนยัน
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Dialog ที่สอง - ข้อมูลการส่งออก */}
      <Dialog
        open={open && !showScanDialog && isVerified}
        onClose={(e, reason) => {
          if (reason === "backdropClick") return;
          onClose();
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogContent>
          <Typography
            variant="h6"
            style={{ fontSize: "18px", color: "#787878" }}
            mb={2}
          >
            จุดเตรียม Check In
          </Typography>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Stack spacing={2}>
            <Divider />

            <Typography
              variant="h6"
              style={{ fontSize: "16px", color: "#505050" }}
            >
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
                        <TableCell>{item.batch || "-"}</TableCell>
                        <TableCell>{item.material_code}</TableCell>
                        <TableCell>{item.materialName}</TableCell>
                        <TableCell>{item.levelEu || "-"}</TableCell>
                        <TableCell>{item.materialStatus}</TableCell>
                        <TableCell>
                          {formatThaiDateTime(item.withdraw_date) || "-"}
                        </TableCell>
                        <TableCell>
                          {formatThaiDateTime(item.cooked_date) || "-"}
                        </TableCell>
                        <TableCell>
                          {formatThaiDateTime(item.rmit_date) || "-"}
                        </TableCell>
                        <TableCell>
                          {formatThaiDateTime(item.come_cold_date) || "-"}
                        </TableCell>
                        <TableCell>
                          {calculateDBS(item.standard_ptc, item.ptc_time) ||
                            "-"}
                        </TableCell>
                        <TableCell>{item.qccheck || "-"}</TableCell>
                        <TableCell>{item.sq_remark || "-"}</TableCell>
                        <TableCell>{item.mdcheck || "-"}</TableCell>
                        <TableCell>{item.md_remark || "-"}</TableCell>
                        <TableCell>{item.defectcheck || "-"}</TableCell>
                        <TableCell>{item.defect_remark || "-"}</TableCell>
                        <TableCell>
                          {formatSpecialChars(item.machine_MD) || "-"}
                        </TableCell>
                        <TableCell>{item.first_prod || "-"}</TableCell>
                        <TableCell>{item.two_prod || "-"}</TableCell>
                        <TableCell>{item.name_edit_prod_two || "-"}</TableCell>
                        <TableCell>{item.three_prod || "-"}</TableCell>
                        <TableCell>
                          {item.name_edit_prod_three || "-"}
                        </TableCell>
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
                      <TableCell>
                        {formatThaiDateTime(withdraw_date || "-")}
                      </TableCell>
                      <TableCell>
                        {formatThaiDateTime(cooked_date || "-")}
                      </TableCell>
                      <TableCell>
                        {formatThaiDateTime(rmit_date || "-")}
                      </TableCell>
                      <TableCell>
                        {formatThaiDateTime(latestComeColdDate || "-")}
                      </TableCell>
                      <TableCell>
                        {calculateDBS(standard_ptc, ptc_time)}
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
                      <TableCell>
                        {formatSpecialChars(machine_MD) || "-"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />
            <Typography color="rgba(0, 0, 0, 0.6)">
              เลขรถเข็น: {tro_id}
            </Typography>
            {/* <Typography color="rgba(0, 0, 0, 0.6)">
              สถานะรถเข็นในห้องเย็น: {rm_cold_status}
            </Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              ไลน์ผลิต: {rmm_line_name || "-"}
            </Typography>
            <Divider /> */}

            {/* <Box
              sx={{
                paddingLeft: "12px",
                border: showLocationError ? "2px solid red" : "none",
                borderRadius: showLocationError ? "4px" : "0",
                padding: showLocationError ? "8px" : "0 0 0 12px",
                transition: "all 0.3s ease",
              }}
            >
              <Typography style={{ color: "#666", marginRight: "16px" }}>
                สถานที่จัดส่ง
              </Typography>
              <RadioGroup
                row
                name="location"
                value={Location}
                onChange={(e) => {
                  handleLocation(e);
                  setShowLocationError(false);
                }}
              >
                {["เหลือจากไลน์ผลิต", "QcCheck"].includes(rm_status) && (
                  <Box
                    sx={{
                      backgroundColor: "#09af00ff",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      marginRight: "20px",
                    }}
                  >
                    <FormControlLabel
                      value="บรรจุ"
                      control={
                        <Radio
                          sx={{
                            color: "#2196f3",
                            "&.Mui-checked": { color: "#1976d2" },
                          }}
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography sx={{ color: "#333", fontWeight: 500 }}>
                            บรรจุ
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                )}

                {[
                  "QcCheck รอกลับมาเตรียม",
                  "รอ Qc",
                  "QcCheck รอ MD",
                  "รอกลับมาเตรียม",
                ].includes(rm_status) && (
                  <Box
                    sx={{
                      backgroundColor: "#ff0000ff",
                      borderRadius: "4px",
                      padding: "4px 8px",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography sx={{ color: "#ffffffff", fontWeight: 500 }}>
                        ไม่สามารถจัดส่งไปบรรจุได้
                      </Typography>
                    </Box>
                  </Box>
                )}

                {["รอแก้ไข"].includes(rm_status) &&
                  ["เหลือจากไลน์ผลิต", "วัตถุดิบตรง"].includes(
                    rm_cold_status,
                  ) &&
                  remark_rework_cold === null && (
                    <Box
                      sx={{
                        backgroundColor: "#ff0000ff",
                        borderRadius: "4px",
                        padding: "4px 8px",
                      }}
                    >
                      <FormControlLabel
                        value="จุดเตรียม"
                        control={
                          <Radio
                            sx={{
                              color: "#2196f3",
                              "&.Mui-checked": { color: "#1976d2" },
                            }}
                          />
                        }
                        label={
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography
                              sx={{ color: "#ffffffff", fontWeight: 500 }}
                            >
                              จุดเตรียม
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  )}

                {["รอแก้ไข"].includes(rm_status) &&
                  ["เหลือจากไลน์ผลิต", "วัตถุดิบตรง"].includes(
                    rm_cold_status,
                  ) &&
                  remark_rework_cold !== null && (
                    <Box
                      sx={{
                        backgroundColor: "#09af00ff",
                        borderRadius: "4px",
                        padding: "4px 8px",
                      }}
                    >
                      <FormControlLabel
                        value="บรรจุ"
                        control={
                          <Radio
                            sx={{
                              color: "#2196f3",
                              "&.Mui-checked": { color: "#1976d2" },
                            }}
                          />
                        }
                        label={
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography sx={{ color: "#333", fontWeight: 500 }}>
                              บรรจุ
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  )}
              </RadioGroup>
            </Box> */}

            <Divider />
            <TextField
              label="ผู้ส่งออก"
              variant="outlined"
              fullWidth
              value={operator}
              onChange={handleoperator}
              // InputProps={{
              //   readOnly: true,
              // }}
            />

            <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={onClose}
                sx={{
                  color: "#E74A3B",
                  borderColor: "#E74A3B",
                  "&:hover": {
                    borderColor: "#C0392B",
                    backgroundColor: "rgba(231, 74, 59, 0.04)",
                  },
                }}
              >
                ยกเลิก
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={handleConfirm}
                sx={{
                  backgroundColor: "#41a2e6",
                  "&:hover": {
                    backgroundColor: "#2196f3",
                  },
                }}
              >
                ยืนยัน
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Dialog ยืนยันการส่งออก */}
      {isConfirmProdOpen && (
        <QcCheck
          open={isConfirmProdOpen}
          onClose={() => {
            setIsConfirmProdOpen(false);
            showModal();
          }}
          onSuccess={() => {
            setIsConfirmProdOpen(false);
            onSuccess();
          }}
          material_code={mat}
          materialName={materialName}
          ptc_time={ptc_time}
          standard_ptc={standard_ptc}
          cold={cold}
          rm_cold_status={rm_cold_status}
          rm_status={rm_status}
          ComeColdDateTime={ComeColdDateTime}
          slot_id={slot_id}
          tro_id={tro_id}
          batch={batch}
          rmfp_id={rmfp_id}
          Location={Location}
          operator={operator}
          level_eu={level_eu}
          formattedDelayTime={formattedDelayTime}
          latestComeColdDate={latestComeColdDate}
          cooked_date={cooked_date}
          rmit_date={rmit_date}
          materials={processedMaterials}
          qccheck={qccheck}
          sq_remark={sq_remark}
          mdcheck={mdcheck}
          md_remark={md_remark}
          defect_remark={defect_remark}
          defectcheck={defectcheck}
          machine_MD={machine_MD}
          sq_acceptance={sq_acceptance}
          defect_acceptance={defect_acceptance}
          weight_RM={weight_RM}
          tray_count={tray_count}
          rmm_line_name={rmm_line_name}
          withdraw_date={withdraw_date}
          name_edit_prod_two={name_edit_prod_two}
          name_edit_prod_three={name_edit_prod_three}
          first_prod={first_prod}
          two_prod={two_prod}
          three_prod={three_prod}
          qccheck_cold={qccheck_cold}
          receiver_qc_cold={receiver_qc_cold}
          approver={approver}
          production={production}
          remark_rework={remark_rework}
          remark_rework_cold={remark_rework_cold}
          edit_rework={edit_rework}
          prepare_mor_night={prepare_mor_night}
          rawMatType={rawMatType} // ✅ เพิ่มบรรทัดนี้
          mapping_id={data?.mapping_id} // ✅ เพิ่มบรรทัดนี้
        />
      )}
    </>
  );
};

export default ModalEditPD;
