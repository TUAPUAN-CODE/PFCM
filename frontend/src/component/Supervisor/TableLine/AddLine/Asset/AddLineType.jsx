import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { IoIosAddCircleOutline } from "react-icons/io";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const AddLineModal = ({ open, onClose, onSuccess }) => {
  const [lineTypeName, setLineTypeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleClose = () => {
    setLineTypeName("");
    setError("");
    setSuccess("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ตรวจสอบข้อมูล
    if (!lineTypeName.trim()) {
      setError("กรุณากรอกชื่อประเภทไลน์");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${API_URL}/api/lineType`, {
        line_type_name: lineTypeName.trim()
      });

      setSuccess("เพิ่มประเภทไลน์สำเร็จ");
      
      // เรียก callback เพื่อ refresh ข้อมูล
      if (onSuccess) {
        onSuccess();
      }

      // ปิด modal หลังจาก 1.5 วินาที
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error("Error adding line type:", error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("เกิดข้อผิดพลาดในการเพิ่มข้อมูล");
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
          <IoIosAddCircleOutline 
            style={{ 
              fontSize: "28px", 
              color: "#12D300" 
            }} 
          />
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            เพิ่มประเภทไลน์ใหม่
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
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

            <TextField
              autoFocus
              label="ชื่อประเภทไลน์"
              fullWidth
              variant="outlined"
              value={lineTypeName}
              onChange={(e) => setLineTypeName(e.target.value)}
              placeholder="กรุณากรอกชื่อประเภทไลน์"
              disabled={loading}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                },
              }}
            />
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
            type="submit"
            variant="contained"
            disabled={loading || !lineTypeName.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <IoIosAddCircleOutline />}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "16px",
              padding: "8px 24px",
              backgroundColor: "#12D300",
              "&:hover": {
                backgroundColor: "#0ea300",
              },
            }}
          >
            {loading ? "กำลังเพิ่ม..." : "เพิ่มประเภทไลน์"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddLineModal;