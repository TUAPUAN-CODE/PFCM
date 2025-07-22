import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import { Button, CircularProgress, Box } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const DeleteUsers = ({ isOpen, onClose, onSuccess, userData }) => {
  const [userId, setUserId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && userData) {
      setUserId(userData.user_id);
      setFirstName(userData.first_name);
      setLastName(userData.last_name);
    }
  }, [isOpen, userData]);

  const handleClose = () => {
    onClose(); // ปิด modal
  };

  const handleDelete = async () => {
    if (!userId) {
      setError("ไม่พบรหัสพนักงาน!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.delete(
        `${API_URL}/api/delete-user/${userId}`
      );
      console.log("Delete Response:", response.data);
      onSuccess(); // โหลดข้อมูลใหม่หลังจากลบสำเร็จ
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
          <h1 className="text-rose-500 text-2xl">ลบข้อมูลพนักงาน !!</h1>
          <p className="text-gray-700">
            คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลพนักงานนี้?
          </p>
        </div>
        <div className="text-gray-500 p-2 my-5 border rounded-md">
          <p>รหัสพนักงาน: {userId}</p>
          <p>
            ชื่อ: {firstName} {lastName}
          </p>
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

export default DeleteUsers;
