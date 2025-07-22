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
import ModalAlert from "../../../../Popup/AlertSuccess";
const API_URL = import.meta.env.VITE_API_URL;

const Modal3 = ({ open, onClose, data, onEdit,onSuccess }) => {
  const [userId, setUserId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  console.log("Data passed to Modal3:", data); 
  const { inputValues = {}, input2 = {}, rm_tro_id,deliveryLocation } = data || {};
  const handleConfirm = async () => {
    console.log("Input Values:", inputValues);
    const payload = {
      license_plate: inputValues.join(" "), 
      rm_tro_id: rm_tro_id , 
      recorder: input2?.operator || "", 
      Dest: input2?.deliveryLocation || "", 
      remark: input2?.remarkedit || "", 
    };

    console.log("Payload before sending:", payload);

    try {
      const response = await axios.post(`${API_URL}/api/rework/saveTrolley`, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(response);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      onSuccess();
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
              หมายเหตุ : {input2?.remarkedit || "ข้อมูลไม่พบ"}
            </Typography>
            
            <Typography >
              สถานที่จัดส่ง : {input2?.deliveryLocation || "ข้อมูลไม่พบ"}
            </Typography>
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