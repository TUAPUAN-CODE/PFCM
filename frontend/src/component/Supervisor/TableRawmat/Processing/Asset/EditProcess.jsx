import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import { TextField, Button, CircularProgress, Box } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const EditProcess = ({ isOpen, onClose, onSuccess, processData }) => {
  const [processId, setProcessId] = useState(processData?.process_id || "");
  const [processName, setProcessName] = useState(processData?.process_name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {

    if (isOpen && processData) {
      setProcessId(processData?.process_id || "");
      setProcessName(processData?.process_name || "");
    }
  }, [isOpen, processData]);

  const handleSubmit = async () => {
    if (!processName.trim()) {
      setError("กรุณากรอกชื่อกระบวนการ");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { status } = await axios.put(
        `${API_URL}/api/updateProcess`,
        {
          process_name: processName,
          id: processId
        }
      );
      if (status === 200) {
        alert("แก้ไขกระบวนการสำเร็จ");
        onSuccess?.();
        handleClose();
      } else {
        setError(response?.data?.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
      }
    } catch (err) {
      setError(err.response?.data?.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
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
      <div
        className="modal min-w-2xl max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="pb-5 text-2xl">แก้ไขกระบวนการ</h1>
        <TextField
          label="ชื่อกระบวนการ"
          value={processName}
          onChange={(e) => setProcessName(e.target.value)}
          fullWidth
          required
        />
        {error && <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 2,
          }}
        >
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            sx={{
              bgcolor: "#E74A3B",
              color: "#fff",
              "&:hover": { bgcolor: "#c0392b" },
            }}
            onClick={handleClose}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            sx={{
              bgcolor: "#41a2e6",
              color: "#fff",
              "&:hover": { bgcolor: "#3498db" },
            }}
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

export default EditProcess;