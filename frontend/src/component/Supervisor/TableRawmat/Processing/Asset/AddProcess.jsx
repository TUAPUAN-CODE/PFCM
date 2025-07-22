import React, { useState } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  TextField,
  Button,
  CircularProgress,
  Box,
  Alert,
  Collapse
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const AddProcess = ({ isOpen, onClose, onSuccess }) => {
  const [processName, setProcessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    // Validate input first
    if (!processName.trim()) {
      setError("กรุณากรอกชื่อกระบวนการ");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/addProcess`, {
        process_name: processName,
      });

      if (response.status === 201) {
        alert("เพิ่มกระบวนการสำเร็จ");
        if (onSuccess) onSuccess();
        handleClose();
      }
    } catch (err) {
      console.error("Error adding process:", err);
      
      // Better error handling for different error types
      if (err.response?.status === 400 && err.response.data?.error === "Process name already exists.") {
        setError("กระบวนการนี้มีอยู่แล้วในระบบ กรุณาใช้ชื่อกระบวนการอื่น");
      } else {
        setError(err.response?.data?.error || "เกิดข้อผิดพลาดในการเพิ่มกระบวนการ");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProcessName("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal min-w-2xl max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h1 className="pb-5 text-2xl">เพิ่มกระบวนการ</h1>
        
        <TextField
          label="ชื่อกระบวนการ"
          value={processName}
          onChange={(e) => setProcessName(e.target.value)}
          fullWidth
          required
          error={!!error}
          helperText={error ? " " : ""}
        />
        
        <Collapse in={!!error}>
          <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
            {error}
          </Alert>
        </Collapse>

        <Box className="mt-4" sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            style={{ backgroundColor: "#E74A3B", color: "#fff" }}
            onClick={handleClose}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            style={{ backgroundColor: "#41a2e6", color: "#fff" }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "ยืนยัน"}
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default AddProcess;