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
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const DeleteLineModal = ({ open, onClose, onSuccess, selectedLineType }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleClose = () => {
    setError("");
    setSuccess("");
    onClose();
  };

  const handleDelete = async () => {
    if (!selectedLineType?.line_type_id) {
      setError("ไม่พบข้อมูลที่ต้องการลบ");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.delete(
        `${API_URL}/api/lineType/${selectedLineType.line_type_id}`
      );

      setSuccess("ลบประเภทไลน์สำเร็จ");
      
      // เรียก callback เพื่อ refresh ข้อมูล
      if (onSuccess) {
        onSuccess();
      }

      // ปิด modal หลังจาก 1.5 วินาที
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error("Error deleting line type:", error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    } finally {
      setLoading(false);
    }
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
          padding: "8px",
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <WarningAmberIcon 
            sx={{ 
              fontSize: "28px", 
              color: "#f44336" 
            }} 
          />
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            ยืนยันการลบประเภทไลน์
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 1 }}>
              {success}
            </Alert>
          )}

          <Box 
            sx={{ 
              padding: "16px", 
              backgroundColor: "#fff3cd", 
              borderRadius: "8px",
              border: "1px solid #ffeaa7"
            }}
          >
            <Typography variant="body1" sx={{ mb: 1, fontWeight: "bold" }}>
              คุณต้องการลบประเภทไลน์นี้หรือไม่?
            </Typography>
            
            {selectedLineType && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: "white", borderRadius: "4px" }}>
                <Typography variant="body2" color="text.secondary">
                  ID: {selectedLineType.line_type_id}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "bold", mt: 1 }}>
                  ชื่อประเภทไลน์: {selectedLineType.line_type_name}
                </Typography>
              </Box>
            )}

            <Typography 
              variant="body2" 
              color="error" 
              sx={{ mt: 2, fontWeight: "bold" }}
            >
              ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: "16px 24px" }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          disabled={loading}
          sx={{
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            padding: "8px 24px",
          }}
        >
          ยกเลิก
        </Button>
        
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
          sx={{
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            padding: "8px 24px",
            backgroundColor: "#f44336",
            "&:hover": {
              backgroundColor: "#d32f2f",
            },
          }}
        >
          {loading ? "กำลังลบ..." : "ลบประเภทไลน์"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteLineModal;