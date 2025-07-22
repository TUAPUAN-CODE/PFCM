import React, { useState, useEffect } from "react";
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
import EditIcon from "@mui/icons-material/EditOutlined";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const EditLineModal = ({ open, onClose, onSuccess, selectedLineType }) => {
  const [lineTypeName, setLineTypeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // โหลดข้อมูลเมื่อเปิด modal
  useEffect(() => {
    if (open && selectedLineType) {
      setLineTypeName(selectedLineType.line_type_name || "");
      setError("");
      setSuccess("");
    }
  }, [open, selectedLineType]);

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
    
    if (!selectedLineType?.line_type_id) {
      setError("ไม่พบข้อมูลที่ต้องการแก้ไข");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.put(
        `${API_URL}/api/lineType/${selectedLineType.line_type_id}`, 
        {
          line_type_name: lineTypeName.trim()
        }
      );

      setSuccess("แก้ไขประเภทไลน์สำเร็จ");
      
      // เรียก callback เพื่อ refresh ข้อมูล
      if (onSuccess) {
        onSuccess();
      }

      // ปิด modal หลังจาก 1.5 วินาที
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error("Error updating line type:", error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalSuccess = () => {
  fetchLineTypes(); // Refresh data after successful operation
  
  // ปิด Modal ทั้งหมด
  setAddModalOpen(false);
  setEditModalOpen(false);
  setDeleteModalOpen(false);
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
          <EditIcon 
            sx={{ 
              fontSize: "28px", 
              color: "#FFA726" 
            }} 
          />
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            แก้ไขประเภทไลน์
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

            {selectedLineType && (
              <Typography variant="body2" color="text.secondary">
                ID: {selectedLineType.line_type_id}
              </Typography>
            )}
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
            startIcon={loading ? <CircularProgress size={16} /> : <EditIcon />}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "16px",
              padding: "8px 24px",
              backgroundColor: "#FFA726",
              "&:hover": {
                backgroundColor: "#FF9800",
              },
            }}
          >
            {loading ? "กำลังแก้ไข..." : "บันทึกการแก้ไข"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditLineModal;