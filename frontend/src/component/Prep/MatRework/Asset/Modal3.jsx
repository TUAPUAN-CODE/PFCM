import React, { useState, useEffect } from "react";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import {
  Dialog,
  Stack,
  DialogContent,
  Button,
  Box,
  Divider,
  Typography,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
axios.defaults.withCredentials = true; 
import ModalAlert from "../../../../Popup/AlertSuccess";

const API_URL = import.meta.env.VITE_API_URL;

const Modal3 = ({ open, onClose, data, onEdit, onSuccess, CookedDateTime }) => {
  const [userId, setUserId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alertMessage, setAlertMessage] = useState("บันทึกข้อมูลเสร็จสิ้น");

  console.log("Data passed to Modal3:", data);
  const { inputValues = {}, input2 = {}, mapping_id, tro_id, rm_status } = data || {};

  const handleConfirm = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    console.log("Input Values:", inputValues);

    try {

      const existingDataResponse = await axios.get(
        `${API_URL}/api/prep/mat/rework/getTrolleyData/${mapping_id}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // ตรวจสอบและรวมข้อมูลการแก้ไข
      // ตรวจสอบและรวมข้อมูลการแก้ไข
      const currentCorrectionMethods = renderCorrectionMethods();
      let combinedEditRework = currentCorrectionMethods;

      // ถ้ามีข้อมูลเดิมและข้อมูลปัจจุบันไม่ใช่ค่าว่าง
      if (existingDataResponse.data?.edit_rework && currentCorrectionMethods !== "") {
        // รวมข้อมูลเดิมกับข้อมูลใหม่ที่ไม่ซ้ำ
        const existingMethods = existingDataResponse.data.edit_rework.split(",").map(method => method.trim());
        const newMethods = currentCorrectionMethods.split(",").map(method => method.trim());

        // กรองวิธีการใหม่ที่ไม่ซ้ำกับวิธีการเดิม
        const uniqueNewMethods = newMethods.filter(method => !existingMethods.includes(method));

        if (uniqueNewMethods.length > 0) {
          // รวมข้อมูลเดิมกับข้อมูลใหม่ที่ไม่ซ้ำ
          combinedEditRework = existingDataResponse.data.edit_rework + "," + uniqueNewMethods.join(",");
        } else {
          // ถ้าไม่มีข้อมูลใหม่ที่ไม่ซ้ำ ใช้ข้อมูลเดิม
          combinedEditRework = existingDataResponse.data.edit_rework;
        }
      }


      const payload = {
        license_plate: inputValues.join(" "),
        mapping_id: mapping_id,
        tro_id: tro_id,
        weightTotal: input2?.weightPerCart,
        ntray: input2?.numberOfTrays,
        recorder: input2?.operator,
        dest: input2?.deliveryLocation,
        userID: Number(userId),
        rm_status: rm_status,
        edit_rework: combinedEditRework || null
      };

      console.log("Payload before sending:", payload);

      const response = await axios.post(
        `${API_URL}/api/prep/mat/rework/saveTrolley`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(response.data);

      if (response.data.success) {
        setAlertMessage("บันทึกข้อมูลเสร็จสิ้น");
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(response.data.message || "การบันทึกข้อมูลล้มเหลว");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      setAlertMessage(error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsLoading(false);
      if (!error) {
        onClose();
      }
      setShowAlert(true);
    }
  };

  const renderCorrectionMethods = () => {
    if (!input2?.correctionMethods) return "";  // เปลี่ยนจาก "ไม่มีการแก้ไข" เป็น ""

    const { correctionMethods, otherCorrectionMethod } = input2;
    const activeMethods = [];

    // เพิ่มวิธีการแก้ไขที่ถูกเลือก
    Object.entries(correctionMethods).forEach(([key, value]) => {
      if (value && key !== 'other') {
        activeMethods.push(correctionMethodLabels[key]);
      }
    });

    // เพิ่มวิธีการอื่นๆ ถ้ามี
    if (correctionMethods.other && otherCorrectionMethod) {
      activeMethods.push(otherCorrectionMethod);
    }

    return activeMethods.length > 0 ? activeMethods.join(", ") : "";  // เปลี่ยนจาก "ไม่มีการแก้ไข" เป็น ""
  };

  // เพิ่มตัวแปร correctionMethodLabels ที่ด้านบนของคอมโพเนนต์
  const correctionMethodLabels = {
    blanching: "ลวก",
    chemicalSoaking: "แช่เคมี",
    washing: "ล้างน้ำ",
    steam: "ผ่าน Steam",
    removeDefect: "คัด Defect ออก",
    removeFRM: "คัด FRM ออก",
    cooking: "หุง",
    boilingBaking: "ต้ม/อบ",
    other: "อื่นๆ"
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  return (
    <div>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          onClose();
        }}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          fontSize: "15px",
          color: "#555"
        }}>
          <DialogContent sx={{ paddingBottom: 0 }}>
            <Typography sx={{
              fontSize: "18px",
              fontWeight: 500,
              color: "#545454",
              marginBottom: "10px"
            }}>
              กรุณาตรวจสอบข้อมูลก่อนทำรายการ
            </Typography>
            <Divider sx={{ mt: 2, mb: 2 }} />

            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Typography>ป้ายทะเบียนคันใหม่: {inputValues[0] || "ไม่มีข้อมูล"}</Typography>
            <Typography>ป้ายทะเบียนคันเก่า: {data?.tro_id || "ข้อมูลไม่พบ"}</Typography>
            <Typography>น้ำหนักวัตถุดิบ/รถเข็น: {input2?.weightPerCart || "ข้อมูลไม่พบ"}</Typography>
            <Typography>จำนวนถาด: {input2?.numberOfTrays || "ข้อมูลไม่พบ"}</Typography>
            
            {(data?.remark_rework || data?.remark_rework_cold) && (
              <>
              {data?.remark_rework_cold &&(
                <Typography>หมายเหตุแก้ไข-ห้องเย็น: {data?.remark_rework_cold}</Typography>
              )}
              {data?.remark_rework &&(
                <Typography>หมายเหตุแก้ไข-บรรจุ: {data?.remark_rework }</Typography>
              )}
            
            
            <Typography>วิธีการแก้ไขวัตถุดิบ: {renderCorrectionMethods()}</Typography>
            </>
            )}
            <Typography color="rgba(0, 0, 0, 0.6)">สถานที่จัดส่ง: {input2?.deliveryLocation || "ข้อมูลไม่พบ"}</Typography>
            <Typography>ผู้ดำเนินการ: {input2?.operator || "ข้อมูลไม่พบ"}</Typography>
            <Divider sx={{ mt: 2, mb: 0 }} />
          </DialogContent>
        </Box>

        <Stack
          sx={{
            padding: "20px"
          }}
          direction="row"
          spacing={10}
          justifyContent="center"
        >
          <Button
            sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={onClose}
            disabled={isLoading}
          >
            ยกเลิก
          </Button>
          <Button
            sx={{ backgroundColor: "#edc026", color: "#fff" }}
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onEdit}
            disabled={isLoading}
          >
            แก้ไข
          </Button>
          <Button
            sx={{ backgroundColor: "#41a2e6", color: "#fff" }}
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "กำลังประมวลผล..." : "ยืนยัน"}
          </Button>
        </Stack>
      </Dialog>

      <ModalAlert
        open={showAlert}
        message={alertMessage}
        onClose={() => {
          setShowAlert(false);
          setError(null);
        }}
      />
    </div>
  );
};

export default Modal3;