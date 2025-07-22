import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import { Button, CircularProgress, Box } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const DeleteRawmatType = ({ isOpen, onClose, onSuccess, rawmatData }) => {
  const [rmTypeId, setRmTypeId] = useState("");
  const [rmTypeName, setRmTypeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && rawmatData) {
      setRmTypeId(rawmatData.rm_type_id);
      setRmTypeName(rawmatData.rm_type_name);
    }
  }, [isOpen, rawmatData]);

  const handleClose = () => {
    onClose(); // Close modal
  };

  const handleDelete = async () => {
    if (!rmTypeId) {
      setError("ไม่พบรหัสประเภทวัตถุดิบ!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.delete(
        `${API_URL}/api/delete/rawmat/type/${rmTypeId}`
      );
      console.log("Delete Response:", response.data);
      onSuccess(); // Reload data after successful deletion
      handleClose();
    } catch (err) {
      console.error("Delete Error:", err);
      setError(err.response?.data?.error || "เกิดข้อผิดพลาดในการลบข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal min-w-fit max-w-fit" onClick={(e) => e.stopPropagation()}>
        <div>
          <h1 className="text-rose-500 text-2xl">ลบประเภทวัตถุดิบ !!</h1>
          <p className="text-gray-700">
            คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลประเภทวัตถุดิบนี้?
          </p>
        </div>
        <div className="text-gray-500 p-2 my-5 border rounded-md">
          <p>รหัสประเภทวัตถุดิบ: {rmTypeId}</p>
          <p>ชื่อประเภทวัตถุดิบ: {rmTypeName}</p>
        </div>

        {error && <p style={{ color: "red", paddingBottom: 20 }}>{error}</p>}

        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
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
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "ยืนยัน"}
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default DeleteRawmatType;
