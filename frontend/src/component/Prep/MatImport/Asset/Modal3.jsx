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

const Modal3 = ({ open, onClose, data, onEdit, onSuccess }) => {
  const [userId, setUserId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("บันทึกข้อมูลเสร็จสิ้น");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const cookedDateTimeNew = data?.cookedDateTimeNew || '';
  

  const { inputValues = {}, input2 = {}, mapping_id, tro_id } = data || {};
  const [batchBefore, setBatchBefore] = useState(data?.batch || "ยังไม่ได้กำหนด");
  const [batchAfter, setBatchAfter] = useState(data?.newBatch || "ยังไม่ได้กำหนด");

  function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return null;
  
  dateTimeStr = dateTimeStr.replace(',', '');
  
  try {
    // สำหรับรูปแบบเวลาไทย (DD/MM/YYYY HH:MM)
    if (dateTimeStr.includes('/')) {
      const parts = dateTimeStr.split(' ');
      const dateParts = parts[0].split('/');
      const timePart = parts[1];
      return `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')} ${timePart}:00`;
    }
    // สำหรับรูปแบบ ISO (จาก input datetime-local)
    else if (dateTimeStr.includes('T')) {
      const date = new Date(dateTimeStr);
      date.setHours(date.getHours() + 7); // แปลงเป็นเวลาไทย
      return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`;
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return null;
  }
}

 const handleClose = async () => {
    const troId = data?.inputValues?.[0]; // สมมุติว่าเป็นรหัสรถเข็น

    if (troId) {
      const success = await returnreserveTrolley(troId);
      if (!success) {
        setErrorDialogOpen(true);
        return;
      }
    }
    onClose();
  };

    const returnreserveTrolley = async (tro_id) => {
    try {
      const response = await axios.post(`${API_URL}/api/re/reserveTrolley`, {
        tro_id: tro_id,
      });
      return response.data.success;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

const formattedPreparedTime = formatDateTime(data?.preparedDateTimeNew);

 const handleConfirm = async () => {
  if (isLoading) return;

  setIsLoading(true);
  setError(null);
  console.log("Input Values:", inputValues);

  try {
    const formattedDateTime = formatDateTime(cookedDateTimeNew);

    const payload = {
      license_plate: inputValues.join(" "),
      mapping_id: mapping_id,
      tro_id: tro_id,
      batch_after: batchAfter || "",
      batch_before: batchBefore || "",
      cookedDateTimeNew: formattedDateTime || "",
      preparedDateTimeNew: formattedPreparedTime || "",
      weightTotal: input2?.weightPerCart,
      ntray: input2?.numberOfTrays,
      recorder: input2?.operator,
      dest: input2?.deliveryLocation,
      desttype: input2?.deliveryType,
      operator: input2?.operator,
      level_eu: input2?.level_eu || "",
      Process: input2?.selectedProcessType?.process_id,
      userID: Number(userId),
    };

    console.log("Payload before sending:", payload);

    const response = await axios.post(
      `${API_URL}/api/prep/matimport/add/saveTrolley`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log(response.data);

    if (response.data.success) {
      setAlertMessage(response.data.message || "บันทึกข้อมูลเสร็จสิ้น");

      if (onSuccess) {
        onSuccess(response.data.new_mapping_id || undefined);
      }

      onClose();             // ✅ ปิด modal เฉพาะเมื่อสำเร็จ
      setShowAlert(true);   // ✅ แสดง alert เฉพาะเมื่อสำเร็จ
    } else {
      // API ส่ง success: false กลับมา
      throw new Error(response.data.error || "ไม่สามารถบันทึกข้อมูลได้");
    }
  }  catch (error) {
  console.error("Error:", error);

  // ถ้า error มาจาก response ของ API
  if (error.response && error.response.data && error.response.data.error) {
    setError(error.response.data.error);
    setAlertMessage("เกิดข้อผิดพลาด: " + error.response.data.error);
  } else {
    // กรณีอื่น (เช่น network error หรือ server ล่ม)
    setError(error.message || "เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์");
    setAlertMessage("เกิดข้อผิดพลาด: " + (error.message || "ไม่สามารถบันทึกข้อมูลได้"));
  }
}
finally {
    setIsLoading(false);
  }
};


  useEffect(() => {
    setBatchBefore(data?.batch || "ยังไม่ได้กำหนด");
    setBatchAfter(data?.newBatch || data?.batch || "ยังไม่ได้กำหนด");

    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, [data]);

  const handleBatchAfterChange = (event) => {
    setBatchAfter(event.target.value);
  };

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
            <Typography>Batch ก่อน: {batchBefore || "ยังไม่ได้กำหนด"}</Typography>
            <Typography>Batch ใหม่: {batchAfter || "ยังไม่ได้กำหนด"}</Typography>
            <Typography>น้ำหนักวัตถุดิบ/รถเข็น: {input2?.weightPerCart || "ข้อมูลไม่พบ"}</Typography>
            <Typography>จำนวนถาด: {input2?.numberOfTrays || "ข้อมูลไม่พบ"}</Typography>
            <Typography>ผู้ดำเนินการ: {input2?.operator || "ข้อมูลไม่พบ"}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">User-ID: {userId || "ยังไม่มีข้อมูล"}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">เวลาต้ม/อบเสร็จ: {data?.cookedDateTimeNew}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">เวลาเตรียมเสร็จ: {data?.preparedDateTimeNew || ""}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              ประเภทการแปรรูป: {input2?.selectedProcessType?.process_name || "ข้อมูลไม่พบ"}
            </Typography>
            {data?.edit_rework &&
              (<Typography color="rgba(0, 0, 0, 0.6)">
                ประวัติการแก้ไข: {data?.edit_rework || "ข้อมูลไม่พบ"}
              </Typography>
            )}
            <Typography color="rgba(0, 0, 0, 0.6)">
              สถานที่จัดส่ง: {input2?.deliveryLocation || "ข้อมูลไม่พบ"}
            </Typography>
            {input2?.deliveryType && (
              <Typography color="rgba(0, 0, 0, 0.6)">
                ประเภทการส่ง: {input2.deliveryType}
              </Typography>
            )}
            <Divider sx={{ mt: 2, mb: 0 }} />
          </DialogContent>
        </Box>

        <Stack sx={{ p: "20px" }} direction="row" spacing={10} justifyContent="center">
          <Button
            sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={handleClose}
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
          if (error) {
            setError(null);
          }
        }}
      />
    </div>
  );
};

export default Modal3;