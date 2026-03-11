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

const Modal1 = ({ open, onClose, onNext, mat, mat_name, batch, production, rmfp_id, dest, rm_type_id }) => {
  const [rmTypeId, setRmTypeId] = useState(rm_type_id ?? 3);
  const theme = useTheme();
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [scannedValue, setScannedValue] = useState('');
  const [inputError, setInputError] = useState(false);
  const [apiError, setApiError] = useState("");
  const [batchInput, setBatchInput] = useState(batch || "");
  const [batchError, setBatchError] = useState(false);

  // Check if form is valid
  // const isFormValid = () => {
  //   const isTrolleyValid = inputValue.trim() !== '';
  //   const isBatchValid = rm_type_id !== 3 || (batchInput.trim() !== '' && batchInput.length === 10);
  //   return isTrolleyValid && isBatchValid;
  // };
  const isFormValid = () => {
    const isTrolleyValid = inputValue.trim() !== '';
    const isBatchValid = (rm_type_id !== 3 && rm_type_id !== 7 && rm_type_id === !8 && rm_type_id === !6) || (batchInput.trim() !== '' && batchInput.length === 10);
    return isTrolleyValid && isBatchValid;
  };

  useEffect(() => {
    if (open) {
      setBatchInput('');
      setInputValue('');
      setScannedValue('');
      setApiError('');
      setInputError(false);
      setBatchError(false);
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

  // useEffect(() => {
  //   if (open) {
  //     if (rm_type_id === 3) {
  //       setBatchInput('');
  //     } else {
  //       setBatchInput(batch || 'ไม่มีข้อมูล');
  //     }
  //   }
  // }, [open, batch, rm_type_id]);
  useEffect(() => {
    if (open) {
      if (rm_type_id === 3 || rm_type_id === 7 || rm_type_id === 8 || rm_type_id === 6) {
        setBatchInput('');
      } else {
        setBatchInput(batch || 'ไม่มีข้อมูล');
      }
    }
  }, [open, batch, rm_type_id]);

  useEffect(() => {
    if (open) startCamera();
    return stopCamera;
  }, [open]);

  const checkTrolleyStatus = async (value) => {
    try {
      const response = await axios.get(`${API_URL}/api/checkTrolley`, {
        params: { tro: value },
      });

      if (response.data.success === false) {
        setApiError(response.data.message || "ไม่มีรถเข็นคันนี้ในระบบ");
        return false;
      } else if (response.data.success === true && response.data.message === "รถเข็นไม่พร้อมใช้งาน") {
        setApiError("รถเข็นไม่พร้อมใช้งาน");
        return false;
      } else if (response.data.success === true && response.data.message === "รถเข็นถูกจองใช้งาน") {
        setApiError("รถเข็นถูกจองใช้งาน");
        return false;
      }

      return true;
    } catch (error) {
      setApiError("ไม่มีรถเข็นคันนี้ในระบบ");
      return false;
    }
  };

  const reserveTrolley = async (tro_id) => {
    try {
      const response = await axios.post(`${API_URL}/api/reserveTrolley`, {
        tro_id: tro_id,
      });
      return response.data.success;
    } catch (error) {
      setApiError("รถเข็นถูกจองแล้ว");
      return false;
    }
  };


  const handleNextModal2 = async () => {
    setInputError(false);
    setBatchError(false);
    setApiError("");

    if (inputValue.trim() === '') {
      setInputError(true);
      return;
    }

    if ([3, 6, 7, 8].includes(rm_type_id)) {
      if (batchInput.trim() === '') {
        setBatchError(true);
        return;
      }
      if (batchInput.length !== 10) {
        setBatchError(true);
        return;
      }
    }

    const isValid = await checkTrolleyStatus(inputValue);
    if (!isValid) return;

    const isReserved = await reserveTrolley(inputValue);
    if (!isReserved) return;

    onNext({
      inputValues: [inputValue],
      batch: batch,
      newBatch: batchInput,
      rmfp_id: rmfp_id
    });
  };

  return (
    <StyledModal open={open} onClose={(e, reason) => {
      if (reason === 'backdropClick') return;
      onClose();
    }}>
      <ModalContent>
        <CloseButton aria-label="close" onClick={handleClose}><IoClose /></CloseButton>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
          <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
            กรุณากรอกข้อมูลหรือสแกนป้ายทะเบียน
          </Typography>
          <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
            Old Batch: {batch || "ไม่มีข้อมูล"}
          </Typography>

          {inputError && <Alert severity="error" sx={{ mb: 2 }}>กรุณากรอกข้อมูลหรือสแกนป้ายทะเบียน</Alert>}
          {batchError && <Alert severity="error" sx={{ mb: 2 }}>กรุณากรอก Batch ใหม่ให้ครบ 10 ตัวอักษร </Alert>}
          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

          <Divider sx={{ mb: 2 }} />

          <video ref={videoRef} style={{ width: "100%", marginBottom: theme.spacing(1), borderRadius: "4px" }} autoPlay muted />

          <Divider sx={{ mt: 1, mb: 1 }} />

          {/* {rm_type_id === 3 && ( */}

          {(rm_type_id === 3 || rm_type_id === 7 || rm_type_id === 8 || rm_type_id === 6) && (
            <Box sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}>
              <TextField
                fullWidth
                label={(() => {
                  if (rm_type_id === 3) return "กรอก Batch ใหม่(สำหรับวัตถุดิบปลา) 10 ตัวอักษร";
                  else if (rm_type_id === 6) return "กรอก Batch ใหม่(สำหรับวัตถุดิบกุ้ง) 10 ตัวอักษร";
                  else if (rm_type_id === 7) return "กรอก Batch ใหม่(สำหรับวัตถุดิบหมึก) 10 ตัวอักษร";
                  else if (rm_type_id === 8) return "กรอก Batch ใหม่(สำหรับวัตถุดิบอื่นๆ) 10 ตัวอักษร";
                  else return "กรอก Batch ใหม่ 10 ตัวอักษร";
                })()}
                value={batchInput}
                onChange={(e) => {
                  // Convert to uppercase and limit to 10 characters
                  const upperValue = e.target.value.toUpperCase();
                  if (upperValue.length <= 10) {
                    setBatchInput(upperValue);
                    setBatchError(false);
                  }
                }}
                size="small"
                error={batchError}
                inputProps={{
                  maxLength: 10,
                  style: { textTransform: 'uppercase' } // Visual feedback
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    height: '40px',
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  // Also convert existing batch to uppercase when resetting
                  setBatchInput(batch ? batch.toUpperCase() : '');
                  setBatchError(false);
                }}
                sx={{
                  backgroundColor: "#41b0e6",
                  color: "#fff",
                  height: '40px',
                  minWidth: 'auto',
                  px: 2,
                  fontSize: '0.875rem',
                  '&:hover': {
                    backgroundColor: "#2c8fcc",
                  }
                }}
              >
                ใช้ Batch เดิม
              </Button>
            </Box>
          )}

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
            <Button
              style={{
                backgroundColor: isFormValid() ? "#41a2e6" : "#e0e0e0",
                color: "#fff"
              }}
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={handleNextModal2}
              disabled={!isFormValid()}
            >
              ยืนยัน
            </Button>
          </Box>
        </Box>
      </ModalContent>
    </StyledModal>
  );
};

export default Modal1;