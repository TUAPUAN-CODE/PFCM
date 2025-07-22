import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import { Modal, Box, Typography, TextField, Button, IconButton, Alert, useTheme, Divider } from "@mui/material";
import { styled } from "@mui/system";
import { IoClose } from "react-icons/io5";
import QrScanner from "qr-scanner";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
const API_URL = import.meta.env.VITE_API_URL;

const StyledModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const ModalContent = styled(Box)(({ theme }) => ({
  position: "relative",
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  maxWidth: "400px",
  width: "100%",
  boxShadow: theme.shadows[5],
  height: "auto",
}));

const CloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  color: theme.palette.grey[600],
}));

const Modal1 = ({ open, onClose, onNext }) => {
  const theme = useTheme();
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [scannedValue, setScannedValue] = useState('');
  const [inputError, setInputError] = useState(false);
  const [apiError, setApiError] = useState("");

  // รีเซ็ตค่า state เมื่อ modal ถูกเปิด
  useEffect(() => {
    if (open) {
      setInputValue('');
      setScannedValue('');
      setApiError('');
      setInputError(false);
    }
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      const qrScanner = new QrScanner(videoRef.current, async (result) => {
        if (result?.data) {
          setScannedValue(result.data);
          await checkTrolleyStatus(result.data);
        }
      }, {
        highlightScanRegion: true,
        highlightCodeOutline: true
      });

      qrScannerRef.current = qrScanner;
      qrScanner.start();
    } catch (err) {
      console.error("Error opening camera:", err);
    }
  };

  const handleClose = () => {
    onClose();
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (qrScannerRef.current) qrScannerRef.current.stop();
  };

  useEffect(() => {
    if (open) startCamera();
    return stopCamera;
  }, [open]);

  const checkTrolleyStatus = async (value) => {
    try {
      const response = await axios.get(`${API_URL}/api/checkTrolley`, {
        params: { tro: value },
      });

      if (response.status === 200) {
        // รถเข็นพร้อมใช้งาน -> ไปต่อ
        onNext({ inputValues: [value] });
      } else if (response.status === 201) {
        setApiError("รถเข็นไม่พร้อมใช้งาน");
      }
    } catch (error) {
      if (error.response?.status === 400) {
        setApiError("ไม่มีรถเข็นคันนี้ในระบบ");
      } else {
        setApiError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      }
    }
  };

  const handleNextModal2 = async () => {
    if (inputValue.trim() === '') {
      setInputError(true);
      return;
    }
    setInputError(false);
    await checkTrolleyStatus(inputValue);
  };

  return (
    <StyledModal open={open} onClose={(e, reason) => {
      if (reason === 'backdropClick') return; // ไม่ให้ปิดเมื่อคลิกพื้นที่นอก
      onClose(); // ปิดเมื่อกดปุ่มหรือในกรณีอื่นๆ
    }}>
      <ModalContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
          <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
            กรุณากรอกข้อมูลหรือสแกนป้ายทะเบียน
          </Typography>

          {inputError && <Alert severity="error" sx={{ mb: 2 }}>กรุณากรอกข้อมูลหรือสแกนป้ายทะเบียน</Alert>}
          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

          <Divider sx={{ mb: 2 }} />

          <video ref={videoRef} style={{ width: "100%", marginBottom: theme.spacing(1), borderRadius: "4px" }} autoPlay muted />
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <TextField
              fullWidth
              label="เลขทะเบียนรถเข็น"
              value={inputValue}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, ""); // กรองเฉพาะตัวเลข
                const formatted = raw.padStart(4, "0").slice(-4); // เติม 0 ซ้าย และจำกัด 4 ตัว
                setInputValue(formatted);
                setInputError(false);
              }}
              margin="normal"
              size="small"
              style={{ padding: "0" }}
              error={inputError}
            />
          </Box>
          <Divider sx={{ mt: 1, mb: 1 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1, height: "42px" }}>
            <Button style={{ backgroundColor: "#E74A3B", color: "#fff" }} variant="contained" startIcon={<CancelIcon />} onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button style={{ backgroundColor: "#41a2e6", color: "#fff" }} variant="contained" startIcon={<CheckCircleIcon />} onClick={handleNextModal2}>
              ยืนยัน
            </Button>
          </Box>
        </Box>
      </ModalContent>
    </StyledModal>
  );
};

export default Modal1;