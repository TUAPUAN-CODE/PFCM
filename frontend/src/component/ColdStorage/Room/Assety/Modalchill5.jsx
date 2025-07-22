import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Alert,
  Divider,
  Select,
  RadioGroup,
  Radio,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  AppBar,
  Toolbar,
  IconButton,
  Grid
} from '@mui/material';
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { TbBackground } from "react-icons/tb";
import { IoBarcodeSharp } from "react-icons/io5";
import { GiCannedFish } from "react-icons/gi";
import { TfiShoppingCartFull } from "react-icons/tfi";
import { LuPackageCheck } from "react-icons/lu";
import { GiFriedFish } from "react-icons/gi";
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InfoIcon from '@mui/icons-material/Info';
import ParentComponentChill5 from '../Move/Chill5/ParentComponentChill5';

const API_URL = import.meta.env.VITE_API_URL;

const Modalchill5 = ({ open, onClose, onNext, data, rmfp_id, CookedDateTime, dest }) => {
  console.log("Modalchill5 - ได้รับข้อมูล:", { data, rmfp_id, CookedDateTime, dest });

  // ฟังก์ชันจัดการเมื่อได้รับข้อมูลจาก ParentComponentChill5
  const handleSlotSelect = (option, slotData) => {
    console.log("Modalchill5 - ได้รับข้อมูลจาก ParentComponentChill5:", option, slotData);

    // ส่งข้อมูลไปยัง parent component
    if (onNext && typeof onNext === 'function') {
      console.log("Modalchill5 - ส่งข้อมูลไปยัง SlotModal:", option, slotData);
      onNext("SELECT_TROLLEY", slotData);
    } else {
      console.log("Modalchill5 - ไม่มี onNext หรือไม่ใช่ฟังก์ชัน:", onNext);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        console.log("Modalchill5 - ปิด modal");
        onClose();
      }}
      fullWidth
      maxWidth="lg"
    >
      <AppBar position="static" sx={{ backgroundColor: '#4e73df' }}>
        <Toolbar sx={{ minHeight: '50px', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarehouseIcon sx={{ mr: 1 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              เลือกรถเข็นปลายทาง - {data?.ColdMove || "Chill 5"}
            </Typography>
          </Box>
          <IconButton color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <DialogContent>
        <Box sx={{ mb: 3, p: 2, borderRadius: '8px', bgcolor: '#f8f9fc', border: '1px solid #e3e6f0' }}>
          <Typography variant="h6" gutterBottom>ข้อมูลการย้ายวัตถุดิบ</Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body1">
                <strong>Material:</strong> {data?.isMixed ? `Mixed: ${data?.mix_code}` : data?.mat || "ไม่มีข้อมูล"}
              </Typography>
              <Typography variant="body1">
                <strong>ชื่อวัตถุดิบ:</strong> {data?.isMixed ? `วัตถุดิบผสม (${data?.mix_code})` : data?.mat_name || "ไม่มีข้อมูล"}
              </Typography>
              <Typography variant="body1">
                <strong>Batch:</strong> {data?.batch || (data?.isMixed ? '-' : 'ไม่มีข้อมูล')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body1"><strong>ประเภทการย้าย:</strong> {data?.TypeColdMove || "ไม่มีข้อมูล"}</Typography>
              <Typography variant="body1"><strong>ห้องเย็นปลายทาง:</strong> {data?.ColdMove || "Chill 2"}</Typography>
              <Typography variant="body1"><strong>น้ำหนักที่ย้าย:</strong> {data?.weight || 0} กก.</Typography>
              {data?.isMixed && data?.mixed_date && (
                <Typography variant="body1">
                  <strong>เวลาผสมเสร็จ:</strong> {data.mixed_date}
                </Typography>
              )}
            </Grid>
          </Grid>
        </Box>

        <Typography variant="h6" gutterBottom>กรุณาเลือกรถเข็นเพื่อทำการย้ายวัตถุดิบ</Typography>
        <ParentComponentChill5 onSelectOption={handleSlotSelect} />
      </DialogContent>

      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e3e6f0', bgcolor: '#f8f9fc' }}>
        <Button
          variant="contained"
          startIcon={<CancelIcon />}
          sx={{
            bgcolor: "#E74A3B",
            color: "#fff", '&:hover': { bgcolor: "#d52a1a" }
          }}
          onClick={onClose}
        >
          ยกเลิก
        </Button>
      </Box>
    </Dialog>
  );
};

export default Modalchill5;