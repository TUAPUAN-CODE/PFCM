import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  CircularProgress
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import axios from "axios";
axios.defaults.withCredentials = true; 
import ModalAlert from "../../../../Popup/AlertSuccess";

const API_URL = import.meta.env.VITE_API_URL;

const ModalSuccess = ({ open, onClose, mat, mat_name, batch, production, mapping_id, rmfp_id, onSuccess }) => {
  const [confirm, setConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/api/mapping/successTrolley`, {
        mapping_id: mapping_id,
      });

      console.log("API Response:", response.data);

      if (response.data.success) {
        console.log("Successfully updated production status:", response.data.message);
        setShowAlert(true);
        
        // เรียกใช้ onSuccess เพื่ออัปเดตข้อมูลใน parent component
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
        
        onClose();
      } else {
        setError(response.data.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
        console.error("Error:", response.data.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
      console.error("API request failed:", error);
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  useEffect(() => {
    if (confirm) {
      handleConfirm();
    }
  }, [confirm]);

  const handleAlertClose = () => {
    setShowAlert(false);
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
      >
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
            กรุณาตรวจสอบข้อมูลก่อนทำรายการ
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">Mat: {mat}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {mat_name}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Production: {production}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">rmfp_id: {rmfp_id}</Typography>
          </Stack>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              ข้อผิดพลาด: {error}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Button
              variant="contained"
              startIcon={<CancelIcon />}
              style={{ backgroundColor: "#E74A3B", color: "#fff" }}
              onClick={onClose}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <CheckCircleIcon />}
              style={{ backgroundColor: "#41a2e6", color: "#fff" }}
              onClick={() => setConfirm(true)}
              disabled={loading}
            >
              {loading ? "กำลังดำเนินการ..." : "ยืนยัน"}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      <ModalAlert open={showAlert} onClose={handleAlertClose} />
    </>
  );
};

export default ModalSuccess;