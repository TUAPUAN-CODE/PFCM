import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningIcon from "@mui/icons-material/Warning";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const CartDeleteModal = ({ open, onClose, onSuccess, cartData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!cartData?.tro_id) {
      setError("ไม่พบข้อมูลรถเข็นที่ต้องการลบ");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // แก้ไข API path ให้ตรงกับ backend
      await axios.delete(`${API_URL}/api/cart/${cartData.tro_id}`);
      
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error deleting cart:", error);
      if (error.response?.status === 404) {
        setError("ไม่พบรถเข็นที่ต้องการลบ");
      } else if (error.response?.status === 409) {
        setError("ไม่สามารถลบรถเข็นได้ เนื่องจากกำลังถูกใช้งานอยู่");
      } else {
        setError(error.response?.data?.error || "เกิดข้อผิดพลาดในการลบรถเข็น กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  // ฟังก์ชันแสดงสถานะรถเข็นให้ถูกต้อง
  const getStatusText = (status) => {
    if (status === 0 || status === false) {
      return "ใช้งานอยู่";
    } else if (status === 1 || status === true) {
      return "พร้อมใช้งาน";
    }
    return "ไม่ทราบสถานะ";
  };

  const getStatusColor = (status) => {
    if (status === 0 || status === false) {
      return "#f44336"; // แดง - ใช้งานอยู่
    } else if (status === 1 || status === true) {
      return "#4caf50"; // เขียว - พร้อมใช้งาน
    }
    return "#757575"; // เทา - ไม่ทราบสถานะ
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          padding: "8px"
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon sx={{ color: "#d32f2f", fontSize: "28px" }} />
          <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: "#d32f2f" }}>
            ยืนยันการลบรถเข็น
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, color: "#555" }}>
            คุณต้องการลบรถเข็นนี้ออกจากระบบใช่หรือไม่?
          </Typography>
          
          <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 500 }}>
            ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </Typography>
        </Box>

        {cartData && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ 
              p: 2, 
              backgroundColor: "#ffebee", 
              borderRadius: "8px",
              border: "1px solid #ffcdd2"
            }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                ข้อมูลรถเข็นที่จะถูกลบ:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                หมายเลขรถเข็น: <strong>{cartData.tro_id}</strong>
              </Typography>
              
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            borderRadius: "8px",
            px: 3,
            py: 1,
            textTransform: "none",
            fontSize: "16px"
          }}
        >
          ยกเลิก
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={<DeleteIcon />}
          sx={{
            borderRadius: "8px",
            px: 3,
            py: 1,
            textTransform: "none",
            fontSize: "16px",
            minWidth: "120px"
          }}
        >
          {loading ? "กำลังลบ..." : "ลบรถเข็น"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CartDeleteModal;