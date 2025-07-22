import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  Typography,
  Divider
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
const API_URL = import.meta.env.VITE_API_URL;

const CheckTrolley = ({ open, onClose, trolleyData, selectedSlot, selectedOption }) => {
  // ฟังก์ชันในการยืนยันและส่งข้อมูลไปยัง API
  const handleConfirm = async () => {
    console.log("selectedSlot:", selectedSlot);  // ตรวจสอบ selectedSlot
    console.log("trolleyData:", trolleyData);    // ตรวจสอบ trolleyData
  
    const dataToSend = {
      cs_id: selectedSlot?.cs_id,
      slot_id: selectedSlot?.slot_id,
      selectedOption: selectedOption,
      tro_id: trolleyData?.inputValues?.join(", ") || "-",  // เพิ่ม inputValues ในข้อมูลที่จะส่ง
    };
  
    console.log("Data to send:", dataToSend);
    onClose();
    // เช็คว่า fields ทั้งหมดมีค่า
    if (!dataToSend.cs_id || !dataToSend.slot_id || !dataToSend.tro_id || !dataToSend.selectedOption) {
      console.error("Missing required fields:", dataToSend);
      return; // หากมีฟิลด์ที่หายไปไม่ส่งข้อมูล
    }
  
    try {
      const response = await fetch("http://localhost:3000/api/coldstorage/input/trolley", { credentials: "include",
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        console.log("✅ Data submitted successfully:", data);
      } else {
        console.error("❌ Error submitting trolley data:", data);
      }
    } catch (error) {
      console.error("❌ Error submitting trolley data:", error);
    }
  };
  
  
  
  

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontSize: "18px", fontWeight: 500, color: "#545454" }}>
        ตรวจสอบข้อมูลรถเข็น
      </DialogTitle>
      <DialogContent>
      <Divider sx={{mb:2}} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "15px", color: "#555" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography fontWeight={500}>ป้ายทะเบียน:</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              {trolleyData?.inputValues?.join(", ") || "-"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography fontWeight={500}>ประเภทการรับเข้า:</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">{selectedOption || "-"}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0 }}>
            <Typography fontWeight={500}>ข้อมูลช่องจอด:</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              {selectedSlot
                ? `ห้อง : ${selectedSlot.cs_id} ช่องจอด : ${selectedSlot.slot_id}`
                : "ข้อมูลไม่สมบูรณ์"}
            </Typography>
          </Box>
          <Divider />
        </Box>
      </DialogContent>
      
      <Box sx={{ paddingLeft: "18px",paddingRight: "18px",paddingBottom: "18px", display: "flex", justifyContent: "space-between" }}>
        <Button
          style={{ backgroundColor: "#E74A3B", color: "#fff" }}
          variant="contained"
          startIcon={<CancelIcon />}
          onClick={onClose}
        >
          ยกเลิก
        </Button>
        <Button
          style={{ backgroundColor: "#41a2e6", color: "#fff" }}
          variant="contained"
          startIcon={<CheckCircleIcon />}
          onClick={handleConfirm} // เรียกฟังก์ชัน handleConfirm
        >
          ยืนยัน
        </Button>
      </Box>
    </Dialog>
  );
};

export default CheckTrolley;
