import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  TextField,
  Button,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { IoInformationCircle } from "react-icons/io5";
import { useTheme } from "@mui/material/styles";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const AddProduction = ({ isOpen, onClose, onSuccess }) => {
  const theme = useTheme();
  const [code, setCode] = useState("");
  const [docNo, setDocNo] = useState("");
  const [lineType, setLineType] = useState("");
  const [lineTypes, setLineTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLineTypes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/linetype`);
        setLineTypes(response.data.data);
      } catch (err) {
        console.error("Error fetching line types:", err);
      }
    };
    fetchLineTypes();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/add-production`, {
        code: code.toUpperCase(), // Ensure code is saved in uppercase
        doc_no: docNo.toUpperCase(), // Ensure docNo is saved in uppercase
        line_type_id: lineType,
      });

      if (response.status === 201) {
        alert("เพิ่มแผนการผลิตสำเร็จ");
        if (onSuccess) onSuccess();
        handleClose();
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "เกิดข้อผิดพลาดในการเพิ่มแผนการผลิต !!"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setCode("");
    setDocNo("");
    setLineType("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal min-w-2xl max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h1 className="pb-5 text-2xl">เพิ่มแผนการผลิต</h1>
        <div className="space-y-4">
          <TextField
            label="Code"
            fullWidth
            required
            value={code}
            onChange={(e) => {
              const upperValue = e.target.value.toUpperCase();
              setCode(upperValue);
            }}
            size="small"
            margin="normal"
            inputProps={{
              style: { textTransform: 'uppercase' },
              maxLength: 20,
            }}
            InputProps={{
              endAdornment: (
                <Tooltip title="กรุณากรอกข้อมูล Code (ตัวอักษรใหญ่เท่านั้น)">
                  <IconButton edge="end" size="small">
                    <IoInformationCircle color={theme.palette.info.main} />
                  </IconButton>
                </Tooltip>
              ),
            }}
          />
          <TextField
            label="Document No."
            fullWidth
            required
            value={docNo}
            onChange={(e) => {
              const upperValue = e.target.value.toUpperCase();
              setDocNo(upperValue);
            }}
            size="small"
            margin="normal"
            inputProps={{
              style: { textTransform: 'uppercase' },
              maxLength: 20,
            }}
            InputProps={{
              endAdornment: (
                <Tooltip title="กรุณากรอกข้อมูล Document No. (ตัวอักษรใหญ่เท่านั้น)">
                  <IconButton edge="end" size="small">
                    <IoInformationCircle color={theme.palette.info.main} />
                  </IconButton>
                </Tooltip>
              ),
            }}
          />
          <FormControl fullWidth required size="small" margin="normal">
            <InputLabel>ประเภทไลน์ผลิต</InputLabel>
            <Select
              label="ประเภทไลน์ผลิต"
              value={lineType}
              onChange={(e) => setLineType(e.target.value)}
            >
              {lineTypes.map((type) => (
                <MenuItem key={type.line_type_id} value={type.line_type_id}>
                  {type.line_type_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <Box
          className="mt-4"
          sx={{ display: "flex", justifyContent: "space-between" }}
        >
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
            disabled={loading || !code || !docNo || !lineType}
          >
            {loading ? <CircularProgress size={24} /> : "ยืนยัน"}
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default AddProduction;