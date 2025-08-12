import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  Typography,
  Divider,
  CircularProgress
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import { LiaShoppingCartSolid } from "react-icons/lia";

const API_URL = import.meta.env.VITE_API_URL;

const ClearTrolleyModal = ({ open, onClose, trolleyData, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  // Debug log
  React.useEffect(() => {
    if (open && trolleyData) {
      console.log("Modal opened with trolley data:", trolleyData);
    }
  }, [open, trolleyData]);

  const handleConfirm = async () => {
    console.log("handleConfirm called with trolleyData:", trolleyData);
    
    if (!trolleyData?.tro_id) {
      console.error("No trolley ID found. Full data:", trolleyData);
      alert("ไม่พบรหัสรถเข็น กรุณาลองใหม่อีกครั้ง");
      return;
    }

    setLoading(true);
    try {
      console.log("Sending API request with tro_id:", trolleyData.tro_id);
      
      const response = await fetch(`${API_URL}/api/trolley/status/reset/return/rawmat`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tro_id: trolleyData.tro_id 
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("✅ Trolley cleared successfully:", data);
        
        // เรียก callback function เมื่อสำเร็จ
        if (onSuccess) {
          onSuccess(trolleyData.tro_id);
        }
        
        onClose();
      } else {
        console.error("❌ Error clearing trolley:", data.message);
        alert(`เกิดข้อผิดพลาด: ${data.message || 'ไม่สามารถเคลียร์รถเข็นได้'}`);
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth 
      maxWidth="xs"
    >
      <DialogTitle sx={{ 
        fontSize: "18px", 
        fontWeight: 500, 
        color: "#545454",
        display: "flex",
        alignItems: "center",
        gap: 1
      }}>
        <LiaShoppingCartSolid style={{ color: '#ff0000ff', fontSize: '24px' }} />
        เคลียร์รถเข็น
      </DialogTitle>
      
      <DialogContent>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: 2, 
          fontSize: "15px", 
          color: "#555" 
        }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography fontWeight={500}>รหัสรถเข็น:</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              {trolleyData?.tro_id || "-"}
            </Typography>
          </Box>

          {trolleyData?.batch && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography fontWeight={500}>Batch:</Typography>
              <Typography color="rgba(0, 0, 0, 0.6)">
                {trolleyData.batch}
              </Typography>
            </Box>
          )}

          {trolleyData?.mat_name && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography fontWeight={500}>วัตถุดิบ:</Typography>
              <Typography color="rgba(0, 0, 0, 0.6)" sx={{ wordBreak: 'break-word' }}>
                {trolleyData.mat_name}
              </Typography>
            </Box>
          )}
          
          {/* <Box sx={{ display: "flex", gap: 1 }}>
            <Typography fontWeight={500}>สถานะปัจจุบัน:</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              {trolleyData?.tro_status || "1"}
            </Typography>
          </Box>

          {trolleyData?.rsrv_timestamp && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography fontWeight={500}>เวลาจอง:</Typography>
              <Typography color="rgba(0, 0, 0, 0.6)">
                {new Date(trolleyData.rsrv_timestamp).toLocaleString('th-TH')}
              </Typography>
            </Box>
          )} */}

          <Divider />
          
          <Box sx={{ 
            backgroundColor: "#fff3cd", 
            padding: 2, 
            borderRadius: 1,
            border: "1px solid #ffeaa7"
          }}>
            <Typography sx={{ 
              fontSize: "14px", 
              color: "#856404",
              textAlign: "center"
            }}>
              ⚠️ กดยืนยันเพื่อเคลียร์รถเข็นให้พร้อมใช้งาน
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <Box sx={{ 
        paddingLeft: "18px", 
        paddingRight: "18px", 
        paddingBottom: "18px", 
        display: "flex", 
        justifyContent: "space-between" 
      }}>
        <Button
          style={{ backgroundColor: "#6c757d", color: "#fff" }}
          variant="contained"
          startIcon={<CancelIcon />}
          onClick={onClose}
          disabled={loading}
        >
          ยกเลิก
        </Button>
        
        <Button
          style={{ backgroundColor: "#dc3545", color: "#fff" }}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? "กำลังเคลียร์..." : "ยืนยันเคลียร์"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default ClearTrolleyModal;