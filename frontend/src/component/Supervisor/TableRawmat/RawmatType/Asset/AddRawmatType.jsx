import React, { useState } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  TextField,
  Button,
  CircularProgress,
  Box,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const AddRawmatType = ({ isOpen, onClose, onSuccess }) => {
  const [rawmatType, setRawmatType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/add/rawmat/type`, {
        rm_type_name: rawmatType,
      });

      if (response.status === 201) {
        alert("เพิ่มประเภทวัตถุดิบสำเร็จ /");
        if (onSuccess) onSuccess();
        handleClose();
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "เกิดข้อผิดพลาดในการเพิ่มประเภทวัตถุดิบ"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRawmatType("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal min-w-2xl max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h1 className="pb-5 text-2xl">เพิ่มประเภทวัตถุดิบ</h1>
        <TextField
          label="ประเภทวัตถุดิบ"
          value={rawmatType}
          onChange={(e) => setRawmatType(e.target.value)}
          fullWidth
          required
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
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

export default AddRawmatType;
