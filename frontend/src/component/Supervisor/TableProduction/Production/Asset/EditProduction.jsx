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
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const EditProduction = ({ isOpen, onClose, onSuccess, Data }) => {
  const [code, setCode] = useState(Data?.code || "");
  const [docNo, setDocNo] = useState(Data?.doc_no || "");
  const [lineType, setLineType] = useState(Data?.line_type_id || "");
  // const [lineId, setLineId] = useState(Data?.line_id || "");
  const [lineTypes, setLineTypes] = useState([]);
  // const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && Data) {
      setCode(Data?.code || "");
      setDocNo(Data?.doc_no || "");
      // setLineId(Data?.line_id || "");
      setLineType(Data?.line_type_id || "");
    }
  }, [isOpen, Data]);

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

  // useEffect(() => {
  //   if (lineType) {
  //     const fetchLines = async () => {
  //       try {
  //         const response = await axios.get(
  //           `${API_URL}/api/linetype/line?line_type_id=${lineType}`
  //         );
  //         setLines(response.data.data);
  //       } catch (err) {
  //         console.error("Error fetching lines:", err);
  //       }
  //     };
  //     fetchLines();
  //   } else {
  //     setLines([]);
  //   }
  // }, [lineType]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    console.log("Updating data:", { code, doc_no: docNo, line_type_id: lineType });

    try {
      const response = await axios.put(`${API_URL}/api/update-production`, {
        prod_id: Data?.prod_id,
        code,
        doc_no: docNo,
        line_type_id: lineType,
      });

      if (response.status === 200) {
        console.log("Production plan updated successfully");
        alert("แก้ไขแผนการผลิตสำเร็จ");
        if (onSuccess) onSuccess();
        handleClose();
      }
    } catch (err) {
      console.error("Error updating production plan:", err);
      setError(
        err.response?.data?.error || "เกิดข้อผิดพลาดในการแก้ไขแผนการผลิต !!"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    console.log("Closing modal and resetting state");
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
        <h1 className="pb-5 text-2xl">แก้ไขแผนการผลิต</h1>
        <div className="space-y-2">
          <TextField
            label="Code"
            fullWidth
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <TextField
            label="Doc.No."
            fullWidth
            required
            value={docNo}
            onChange={(e) => setDocNo(e.target.value)}
          />
          <FormControl fullWidth required>
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
          {/* <FormControl fullWidth required>
            <InputLabel>ไลน์ผลิต</InputLabel>
            <Select
              label="ไลน์ผลิต"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              disabled={!lineType}
            >
              {lines.map((line) => (
                <MenuItem key={line.line_id} value={line.line_id}>
                  {line.line_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl> */}
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
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "ยืนยัน"}
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default EditProduction;
