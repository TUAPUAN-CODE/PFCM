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
  
  // State สำหรับเก็บข้อความ error จาก API
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  
  console.log("Data passed to Modal3:", data);
  const { inputValues = {}, input2 = {}, rmfp_id } = data || {};
  const level_eu = data?.level_eu || input2?.level_eu  || '';
  
  const handleConfirm = async () => {
    console.log("Input Values:", inputValues);
    // ล้างข้อความ error เก่าก่อนเริ่มทำรายการใหม่
    setApiErrorMessage("");
    
    const payload = {
      license_plate: inputValues.join(" "),
      rmfpID: rmfp_id || "",
      CookedDateTime: CookedDateTime || "",
      weight: input2?.weightPerCart || "",
      weightTotal: input2?.weightPerCart || "",
      ntray: input2?.numberOfTrays || "",
      recorder: input2?.operator || "",
      userID: Number(userId),
      level_eu: level_eu || "",
    };
    
    console.log("Payload before sending:", payload);
    
    try {
      const response = await axios.post(`${API_URL}/api/oven/toCold/saveTrolley`, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("API Response:", response.data);
      
      if (response.data.success) {
        // กรณีสำเร็จให้ปิด Modal
        onClose();
        setShowAlert(true);
      }
      
    } catch (error) {
      console.error("Error:", error);
      
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
        
        console.log("API Error Message:", errorMessage);
        console.log("Status Code:", error.response.status);
        
        // แสดงข้อความ error บนป้ายทะเบียน
        setApiErrorMessage(errorMessage);
        
      } else {
        // กรณีที่ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้
        setApiErrorMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      }
    }
  };

  const handleClose = async () => {
    const troId = data?.inputValues?.[0];

    if (troId) {
      const success = await returnreserveTrolley(troId);
      if (!success) {
        setErrorDialogOpen(true);
        return;
      }
    }
    onClose();
    setShowAlert(true);
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

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // ล้างข้อความ error เมื่อ Modal เปิดขึ้นใหม่
  useEffect(() => {
    if (open) {
      setApiErrorMessage("");
    }
  }, [open]);

  return (
    <div>
      {/* Modal หลัก */}
      <Dialog open={open} onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        handleClose();
      }} maxWidth="xs" fullWidth>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
          <DialogContent sx={{ paddingBottom: 0 }} >
            <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
              กรุณาตรวจสอบข้อมูลก่อนทำรายการ
            </Typography>
            <Divider sx={{ mt: 2, mb: 2 }} />

            <Typography sx={{ marginBottom: 1 }}>
              ป้ายทะเบียน : {inputValues.length > 0 ? inputValues[0] : "ไม่มีข้อมูลจาก Modal1"}
            </Typography>
            
            {/* แสดงข้อความ error จาก API ในสีแดง */}
            {apiErrorMessage && (
              <Typography 
                sx={{ 
                  color: '#d32f2f', 
                  fontSize: '14px', 
                  fontWeight: 500,
                  marginBottom: 2,
                  backgroundColor: '#ffebee',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ffcdd2'
                }}
              >
                {apiErrorMessage}
              </Typography>
            )}

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
            onClick={handleClose}
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