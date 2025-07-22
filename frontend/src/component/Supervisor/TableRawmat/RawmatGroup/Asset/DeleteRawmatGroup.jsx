import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import { 
  Button, 
  CircularProgress, 
  Box, 
  Snackbar,
  Alert
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const DeleteRawmatGroup = ({ isOpen, onClose, onSuccess, data }) => {
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [rmType, setRmType] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // เพิ่ม state สำหรับ Snackbar alert
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("success");

  useEffect(() => {
    if (isOpen && data) {
      setGroupId(data?.rm_group_id || "");
      setGroupName(data?.rm_group_name || "");
      setRmType(data?.rm_type_name || "");
    }
  }, [isOpen, data]);

  // ฟังก์ชันสำหรับแสดง Alert
  const showAlert = (message, severity = "success") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  // ฟังก์ชันสำหรับปิด Alert
  const handleAlertClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlertOpen(false);
  };

  const handleClose = () => {
    setError(null);
    onClose(); // Close modal
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    
    if (!groupId) {
      setError("ไม่พบรหัสกลุ่มวัตถุดิบที่ต้องการลบ");
      setLoading(false);
      return;
    }
    
    try {
      // Ensure you're using the correct endpoint
      console.log("Deleting rawmat group ID:", groupId);
      const response = await axios.delete(
        `${API_URL}/api/delete-rawmatgroup/${groupId}`
      );
      
      // Check if the response indicates success
      if (response.data.success) {
        showAlert("ลบกลุ่มวัตถุดิบสำเร็จ!");
        
        // เรียก callback onSuccess ถ้ามี
        if (onSuccess) onSuccess();
        
        // ปิด modal หลังจากแสดง alert สักครู่
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(response.data.error || "เกิดข้อผิดพลาดในการลบข้อมูล");
        showAlert(response.data.error || "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
      }
    } catch (error) {
      console.error("Error deleting raw material group:", error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.details || 
                          "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
      setError(errorMessage);
      showAlert(errorMessage, "error");
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
          <h1 className="text-rose-500 text-2xl">ลบกลุ่มวัตถุดิบ !!</h1>
          <p className="text-gray-700">
            คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลกลุ่มเวลาวัตถุดิบนี้ ?
          </p>
        </div>
        <div className="text-gray-500 p-2 my-5 border rounded-md">
          <p>ชื่อกลุ่มวัตถุดิบ : {groupName}</p>
          <p>ประเภทวัตถุดิบ : {rmType}</p>
        </div>

        {error && <p style={{ color: "red", paddingBottom: 20 }}>{error}</p>}

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
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

        {/* Snackbar Alert สำหรับแสดงข้อความแจ้งเตือน */}
        <Snackbar 
          open={alertOpen} 
          autoHideDuration={4000} 
          onClose={handleAlertClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleAlertClose} 
            severity={alertSeverity} 
            variant="filled"
            sx={{ width: '100%' }}
          >
            {alertMessage}
          </Alert>
        </Snackbar>
      </div>
    </div>
  );
};

export default DeleteRawmatGroup;