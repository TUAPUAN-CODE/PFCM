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
} from "@mui/material";
import axios from "axios";
axios.defaults.withCredentials = true; 
import ModalAlert from "../../../Popup/AlertSuccess";
const API_URL = import.meta.env.VITE_API_URL;

const Modal3 = ({ open, onClose, data, onEdit , CookedDateTime }) => {
  const [userId, setUserId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  console.log("Data passed to Modal3:", data); // Debugging line to check data
  const { inputValues = {}, input2 = {}, rmfp_id } = data || {};
  const level_eu = data?.level_eu || input2?.level_eu  || '';
  
  const handleConfirm = async () => {
    console.log("Input Values:", inputValues);
    const payload = {
      license_plate: inputValues.join(" "), // ค่าที่ส่งคือ license plate ที่ได้รับจาก inputValues
      rmfpID: rmfp_id || "", // รหัส RMFP หรือค่าว่างถ้าไม่พบ
      CookedDateTime: CookedDateTime || "", // ค่าของ CookedDateTime ถ้าไม่มีจะเป็นค่าว่าง
      weight: input2?.weightPerCart || "", // น้ำหนักจาก input2 หรือค่าว่างถ้าไม่พบ
      weightTotal: input2?.weightPerCart || "", // น้ำหนักรวมจาก input2 หรือค่าว่าง
      ntray: input2?.numberOfTrays || "", // จำนวนถาดจาก input2 หรือค่าว่าง
      recorder: input2?.operator || "", // ผู้ดำเนินการจาก input2 หรือค่าว่าง
      userID: Number(userId), // รหัสผู้ใช้งานที่เก็บไว้ใน localStorage
      level_eu: level_eu || "",
    };
    
    console.log("Payload before sending:", payload);

    try {
      const response = await axios.post(`${API_URL}/api/oven/toCold/saveTrolley`, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      // ทำงานกับ response ที่ได้รับจาก API
      console.log(response.data); // ดูข้อมูลที่ได้รับ
    } catch (error) {
      console.error("Error:", error);
    } finally {
      onClose();
      setShowAlert(true);

    }
  };

  useEffect(() => {
    // ดึงค่า user_id จาก localStorage
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);


  return (
    <div>
      <Dialog open={open} onClose={(e, reason) => {
        if (reason === 'backdropClick') return; // ไม่ให้ปิดเมื่อคลิกพื้นที่นอก
        onClose(); // ปิดเมื่อกดปุ่มหรือในกรณีอื่นๆ
      }} maxWidth="xs" fullWidth>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
          <DialogContent sx={{ paddingBottom: 0 }} >
            <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
              กรุณาตรวจสอบข้อมูลก่อนทำรายการ
            </Typography>
            <Divider sx={{ mt: 2, mb: 2 }} />

            <Typography >
              ป้ายทะเบียน : {inputValues.length > 0 ? inputValues[0] : "ไม่มีข้อมูลจาก Modal1"}
            </Typography>

            <Typography >
              น้ำหนักวัตถุดิบ/รถเข็น : {input2?.weightPerCart || "ข้อมูลไม่พบ"}
            </Typography>

            <Typography >
              จำนวนถาด : {input2?.numberOfTrays || "ข้อมูลไม่พบ"}
            </Typography>

           
            <Typography>
              Level EU (สำหรับวัตถุดิบปลา): {level_eu || "ไม่มีข้อมูล EU"}
            </Typography>
            
               <Typography color="rgba(0, 0, 0, 0.6)">เวลาต้ม/อบเสร็จ: {data?.cookedDateTime || "ไม่มีข้อมูล"}</Typography>
               <Typography >
              ผู้ดำเนินการ : {input2?.operator || "ข้อมูลไม่พบ"}
            </Typography>
            <Divider sx={{ mt: 2, mb: 0 }} />
          </DialogContent>



        </Box>
        <Stack sx={{
          paddingTop: "20px",
          paddingRight: "20px",
          paddingBottom: "20px",
          paddingLeft: "20px"
        }}
          direction="row" spacing={10} justifyContent="center">
          <Button
            sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={onClose}
          >
            ยกเลิก
          </Button>
          <Button
            sx={{ backgroundColor: "#edc026", color: "#fff" }}
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onEdit}
          >
            แก้ไข
          </Button>
          <Button
            sx={{ backgroundColor: "#41a2e6", color: "#fff" }}
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleConfirm}
          >
            ยืนยัน
          </Button>
        </Stack>
      </Dialog>
      <ModalAlert open={showAlert} onClose={() => setShowAlert(false)} />
    </div>
  );
};

export default Modal3;
// 