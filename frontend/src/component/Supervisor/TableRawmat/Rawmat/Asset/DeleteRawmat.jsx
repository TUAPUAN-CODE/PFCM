import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import { Button, CircularProgress, Box } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const DeleteRawmat = ({ isOpen, onClose, onSuccess, rawmatData }) => {
  const [mat, setMat] = useState("");
  const [matName, setMatName] = useState("");
  const [selectTypeName, setSelectedTypeName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && rawmatData) {
      setMat(rawmatData?.mat || "");
      setMatName(rawmatData?.mat_name || "");
      setSelectedTypeName(rawmatData?.rm_type_name || "");
    }
  }, [isOpen, rawmatData]);

  const handleClose = () => {
    onClose(); // Close modal
  };
  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.delete(
        `${API_URL}/api/delete-rawmat/${mat}`
      );
      if (response.data.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.data.error || "เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    } catch (error) {
      console.error("Error deleting raw material:", error);
      setError(
        error.response?.data?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal min-w-fit max-w-fit"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h1 className="text-rose-500 text-2xl">ลบประเภทวัตถุดิบ !!</h1>
          <p className="text-gray-700">
            คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลวัตถุดิบนี้?
          </p>
        </div>
        <div className="text-gray-500 p-2 my-5 border rounded-md">
          <p>Mat. : {mat}</p>
          <p>ชื่อวัตถุดิบ : {matName}</p>
          <p>ประเภท : {selectTypeName}</p>
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

export default DeleteRawmat;
