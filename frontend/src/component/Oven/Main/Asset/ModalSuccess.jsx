import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import { FaCheck } from "react-icons/fa";
import axios from "axios";
axios.defaults.withCredentials = true; 
const API_URL = import.meta.env.VITE_API_URL;



const ModalSuccess = ({ open, onClose, mat, mat_name, batch, production, rmfp_id }) => {
  
  const handleConfirm = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/SuccessTrolley`, {
        rmfpID: rmfp_id, // ส่ง rmfp_id ไปยัง API
      });
  
      if (response.data.success) {
        console.log("Successfully updated production status:", response.data.message);
      } else {
        console.error("Error:", response.data.message);
      }
  
      onClose(); // ปิด modal หลังจากกดยืนยัน
    } catch (error) {
      console.error("API request failed:", error);
      onClose(); // ปิด modal หลังจากกดยืนยัน
    }
  };
  

  

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent>
        <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
          กรุณาตรวจสอบข้อมูลก่อนทำรายการ
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Stack spacing={1}>
          <Typography color="rgba(0, 0, 0, 0.6)">Mat: {mat}</Typography>
          <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {mat_name}</Typography>
          <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
          <Typography color="rgba(0, 0, 0, 0.6)">Production: {production}</Typography>
          <Typography color="rgba(0, 0, 0, 0.6)">rmfp_id: {rmfp_id}</Typography>
         
        </Stack>

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            style={{ backgroundColor: "#E74A3B", color: "#fff" }}
            onClick={onClose}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            style={{ backgroundColor: "#41a2e6", color: "#fff" }}
            onClick={handleConfirm}
          >
            ยืนยัน
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};


export default ModalSuccess;