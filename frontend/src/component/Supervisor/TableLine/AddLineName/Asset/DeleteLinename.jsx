import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { IoClose, IoWarning } from "react-icons/io5";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const DeleteLineNameModal = ({ open, onClose, onSuccess, selectedItem, itemType }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!selectedItem?.line_id) {
      setError("ไม่พบข้อมูลที่ต้องการลบ");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      
      await axios.delete(`${API_URL}/api/lineName/DeleteLineName/${selectedItem.line_id}`);
      
      // Success
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error deleting line name:", error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setError("");
      onClose();
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
          minHeight: "300px",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px 16px 24px",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333" }}>
          ยืนยันการลบ
        </Typography>
        <Button
          onClick={handleClose}
          disabled={submitting}
          sx={{
            minWidth: "auto",
            padding: "4px",
            color: "#666",
            "&:hover": {
              backgroundColor: "#f5f5f5",
            },
          }}
        >
          <IoClose size={24} />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ padding: "24px" }}>
        {error && (
          <Alert severity="error" sx={{ marginBottom: "16px" }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            textAlign: "center",
          }}
        >
          <IoWarning 
            size={64} 
            style={{ 
              color: "#ef4444",
              marginBottom: "8px"
            }} 
          />
          
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333" }}>
            คุณต้องการลบข้อมูลนี้หรือไม่?
          </Typography>
          
          {selectedItem && (
            <Box sx={{ 
              backgroundColor: "#f8f9fa", 
              padding: "16px", 
              borderRadius: "8px",
              border: "1px solid #e9ecef",
              width: "100%"
            }}>
              <Typography sx={{ 
                fontSize: "14px", 
                color: "#666", 
                marginBottom: "4px" 
              }}>
                ประเภทไลน์:
              </Typography>
              <Typography sx={{ 
                fontSize: "16px", 
                fontWeight: "bold", 
                color: "#333",
                marginBottom: "8px"
              }}>
                {selectedItem.line_type_name}
              </Typography>
              
              <Typography sx={{ 
                fontSize: "14px", 
                color: "#666", 
                marginBottom: "4px" 
              }}>
                ชื่อไลน์:
              </Typography>
              <Typography sx={{ 
                fontSize: "16px", 
                fontWeight: "bold", 
                color: "#333" 
              }}>
                {selectedItem.line_name}
              </Typography>
            </Box>
          )}
          
          <Typography sx={{ 
            fontSize: "14px", 
            color: "#666",
            lineHeight: 1.6
          }}>
            การดำเนินการนี้ไม่สามารถย้อนกลับได้ กรุณาตรวจสอบข้อมูลก่อนยืนยัน
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          padding: "16px 24px 24px 24px",
          gap: "12px",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <Button
          onClick={handleClose}
          disabled={submitting}
          variant="outlined"
          sx={{
            padding: "10px 24px",
            borderColor: "#d0d0d0",
            color: "#666",
            "&:hover": {
              borderColor: "#bbb",
              backgroundColor: "#f8f8f8",
            },
          }}
        >
          ยกเลิก
        </Button>
        
        <Button
          onClick={handleDelete}
          disabled={submitting}
          variant="contained"
          sx={{
            padding: "10px 24px",
            backgroundColor: "#ef4444",
            "&:hover": {
              backgroundColor: "#dc2626",
            },
            "&:disabled": {
              backgroundColor: "#d0d0d0",
            },
          }}
        >
          {submitting ? (
            <>
              <CircularProgress size={20} sx={{ marginRight: "8px", color: "white" }} />
              กำลังลบ...
            </>
          ) : (
            "ยืนยันการลบ"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteLineNameModal;