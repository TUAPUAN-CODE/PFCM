import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  TextField,
  Button,
  CircularProgress,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Snackbar,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const API_URL = import.meta.env.VITE_API_URL;

const AddRawmatGroup = ({ isOpen, onClose, onSuccess }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawmatTypes, setRawmatTypes] = useState([]);
  const [selectedRawmatType, setSelectedRawmatType] = useState("");
  const [rawmatGroupName, setRawmatGroupName] = useState("");
  const [times, setTimes] = useState({
    prep_to_pack: "",
    prep_to_cold: "",
    cold_to_pack: "",
    cold: "",
    rework: "",
  });
  
  // เพิ่ม state สำหรับ Snackbar alert
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("success");

  // ชื่อคอลัมน์ที่ต้องการใช้ในตาราง
  const timeFields = [
    { label: "เตรียม > บรรจุ", field: "prep_to_pack" },
    { label: "เตรียม > ห้องเย็น", field: "prep_to_cold" },
    { label: "ห้องเย็น > บรรจุ", field: "cold_to_pack" },
    { label: "ในห้องเย็น", field: "cold" },
    { label: "Rework", field: "rework" },
  ];

  const fetchRawmatTypes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/rawmat/types`);
      if (response.data.success) setRawmatTypes(response.data.data);
      else setError("ไม่พบข้อมูลประเภทวัตถุดิบ");
    } catch {
      setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRawmatTypes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "rawmatGroupName") {
      setRawmatGroupName(value);
    } else {
      setTimes({ ...times, [name]: value });
    }
  };

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

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // ตรวจสอบว่าทุกช่องมีค่าก่อนส่ง
    if (
      !rawmatGroupName ||
      !selectedRawmatType ||
      Object.values(times).some((val) => val === "" || val === null)
    ) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง!");
      setLoading(false);
      return;
    }

    // ส่งข้อมูลตามโครงสร้างที่ API ต้องการ
    const rawmatGroupData = {
      rm_group_name: rawmatGroupName,
      rm_type_id: selectedRawmatType,
      prep_to_pack: parseFloat(times.prep_to_pack),
      prep_to_cold: parseFloat(times.prep_to_cold),
      cold_to_pack: parseFloat(times.cold_to_pack),
      cold: parseFloat(times.cold),
      rework: parseFloat(times.rework),
    };

    try {
      console.log("Sending data:", rawmatGroupData);
      const response = await axios.post(
        `${API_URL}/api/add/rawmat-group`,
        rawmatGroupData
      );
      
      if (response.data.success) {
        // แสดง alert แทนการใช้ alert() ของ browser
        showAlert("เพิ่มกลุ่มวัตถุดิบสำเร็จ!");
        
        // เรียก callback onSuccess ถ้ามี
        if (onSuccess) onSuccess();
        
        // ล้างฟอร์มและปิด modal หลังจากแสดง alert สักครู่
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1500);
      } else {
        setError(response.data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        showAlert(response.data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.details || 
                          "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์";
      setError(errorMessage);
      showAlert(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm(); // รีเซ็ตข้อมูลเมื่อปิด modal
    onClose(); // ปิด modal
  };

  const resetForm = () => {
    setRawmatGroupName("");
    setSelectedRawmatType("");
    setTimes({
      prep_to_pack: "",
      prep_to_cold: "",
      cold_to_pack: "",
      cold: "",
      rework: "",
    });
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal min-w-2xl max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="pb-5 text-2xl">เพิ่มกลุ่มวัตถุดิบ</h1>
        <div className="space-y-2">
          <TextField
            label="ชื่อกลุ่มวัตถุดิบ"
            fullWidth
            variant="outlined"
            required
            value={rawmatGroupName || ""}
            name="rawmatGroupName"
            onChange={handleChange}
            size="small"
          />

          <FormControl fullWidth required size="small">
            <InputLabel>ประเภทวัตถุดิบ</InputLabel>
            <Select
              label="ประเภทวัตถุดิบ"
              value={selectedRawmatType}
              onChange={(e) => setSelectedRawmatType(e.target.value)}
              size="small"
              sx={{ height: "36px" }}
            >
              {loading ? (
                <MenuItem disabled>
                  <CircularProgress size={16} />
                </MenuItem>
              ) : (
                rawmatTypes.map((rawmat) => (
                  <MenuItem key={rawmat.rm_type_id} value={rawmat.rm_type_id}>
                    {rawmat.rm_type_name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* ตารางสำหรับกรอกข้อมูลเวลา */}
          <div className="my-5 pb-3">
            <TableContainer className="table-container px-5 border rounded-md">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ขั้นตอน</TableCell>
                    <TableCell>เวลา (ชม : นาที)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeFields.map(({ label, field }) => (
                    <TableRow key={field}>
                      <TableCell
                        sx={{
                          fontSize: "0.9rem",
                          padding: "5px",
                          color: "#787878",
                        }}
                      >
                        {label}
                      </TableCell>
                      <TableCell sx={{ padding: "0px", color: "#787878" }}>
                        <TextField
                          variant="outlined"
                          name={field}
                          value={times[field]}
                          onChange={handleChange}
                          type="number"
                          inputProps={{ step: "0.01", min: 0 }}
                          fullWidth
                          sx={{
                            fontSize: "0.8rem",
                            padding: "0px",
                            marginY: "5px",
                          }}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

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
            onClick={handleSubmit}
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

export default AddRawmatGroup;