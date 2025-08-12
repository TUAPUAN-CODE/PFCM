import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Alert,
  Divider,
  RadioGroup,
  Radio,
  FormControlLabel,
  Button
} from '@mui/material';
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;

const Modal2 = ({ open, onClose, onNext, data, rmfp_id, CookedDateTime, dest }) => {
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open && data && data.input2) {
      setDeliveryLocation(data.input2.deliveryLocation || '');
    } else if (open) {
      setDeliveryLocation('');
    }
  }, [open, data]);

  const clearData = () => {
    setDeliveryLocation('');
    setErrorMessage('');
  };

  const handleNext = () => {
    if (!deliveryLocation) {
      setErrorMessage("กรุณาเลือกสถานที่จัดส่ง");
      return;
    }

    setErrorMessage('');
    const updatedData = {
      ...data,
      input2: {
        deliveryLocation: String(deliveryLocation),
      },
      rmfp_id: rmfp_id,
      cookedDateTime: CookedDateTime,
      dest: dest
    };

    console.log(" ส่งข้อมูลไป Modal3:", updatedData);
    onNext(updatedData);
  };

 const handleClose = async () => {
    const troId = data?.inputValues?.[0];

    if (troId) {
      const success = await returnreserveTrolley(troId);
      if (!success) {
        setErrorDialogOpen(true);
        return;
      }
    }
    clearData();
    onClose();
  };

    const returnreserveTrolley = async (tro_id) => {
    try {
      const response = await axios.post(`${API_URL}/api/re/reserveTrolley`, {
        tro_id: tro_id,
      });
      return response.data.success;
    } catch (error) {
      console.error(error);
      return false;
    }
  };
  const handleDeliveryLocationChange = (event) => {
    setDeliveryLocation(event.target.value);
  };

  return (
    <Dialog open={open} onClose={(e, reason) => {
      if (reason === 'backdropClick') return;
      onClose();
    }} fullWidth maxWidth="xs">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
        <DialogContent sx={{ padding: '8px 16px' }}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', marginTop: "10px" }}>
            <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
              กรุณาเลือกสถานที่จัดส่ง
            </Typography>
          </Box>

          <Divider sx={{ mt: 1, mb: 2 }} />

          {/* <Box sx={{ display: "flex", alignItems: "center", paddingLeft: "12px" }}>
            <RadioGroup row name="location" value={deliveryLocation} onChange={handleDeliveryLocationChange}>
              <FormControlLabel value="ไปจุดเตรียม" control={<Radio />} style={{ color: "#666" }} label="จุดเตรียม" />
              <FormControlLabel value="เข้าห้องเย็น" control={<Radio />} style={{ color: "#666" }} label="ห้องเย็น" />
            </RadioGroup>
          </Box> */}

          <Divider sx={{pt:0,pb:2}} />
        </DialogContent>

        <Box sx={{ padding: "0px 16px 16px 16px", display: "flex", justifyContent: "space-between" }}>
          <Button
            style={{ backgroundColor: "#E74A3B", color: "#fff" }}
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={handleClose}
          >
            ยกเลิก
          </Button>
          <Button
            style={{ backgroundColor: "#41a2e6", color: "#fff" }}
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleNext}
          >
            ยืนยัน
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default Modal2;
