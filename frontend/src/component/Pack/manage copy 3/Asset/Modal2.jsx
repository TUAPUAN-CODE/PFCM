
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  InputLabel
} from '@mui/material';
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;

const Modal2 = ({ open, onClose, onNext, data, rmfp_id, rm_tro_id,CookedDateTime, dest }) => {
  const [weightPerCart, setWeightPerCart] = useState('');
  const [operator, setOperator] = useState('');
  const [remarkedit, setRemarkedit] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [numberOfTrays, setNumberOfTrays] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [processTypes, setProcessTypes] = useState([]);
  const [deliveryLocation, setDeliveryLocation] = useState([]);
  const [selectedProcessType, setSelectedProcessType] = useState("");

 

  // useEffect(() => {
  //   const fetchProcessTypes = async () => {
  //     try {
  //       const response = await axios.get(`${API_URL}/api/prep/process/rawmat`);
  //       console.log("API Response:", response.data); // ✅ Debug API Response

  //       if (response.status === 200 && Array.isArray(response.data.process)) {
  //         setProcessTypes(response.data.process); // ✅ ใช้ `process`
  //       } else {
  //         console.error("Unexpected API response format:", response.data);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching process types:", error);
  //     }
  //   };

  //   fetchProcessTypes();
  // }, []);


  // เมื่อเปิด Modal ให้ตั้งค่า state จาก data ที่ส่งมา
  useEffect(() => {
    if (open && data && data.input2) {
      setOperator(data.input2.operator || '');
      setOperator(data.input2.remarkedit || '');
      setDeliveryLocation(data.input2.deliveryLocation || '');
    } else if (open) {
      setWeightPerCart('');
      setOperator('');
      setNumberOfTrays('');
      setSelectedProcessType('');
      setDeliveryLocation('');
    }
  }, [open, data]);

  // ฟังก์ชันสำหรับเคลียร์ข้อมูลใน state
  const clearData = () => {
    setWeightPerCart('');
    setOperator('');
    setSelectedItem(null);
    setNumberOfTrays('');
    setSelectedProcessType('');
    setDeliveryLocation('');
    setErrorMessage('');
  };

  const handleNext = () => {
    const Location = deliveryLocation;

    if ( !operator ||!remarkedit || !deliveryLocation ) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setErrorMessage('');
    const updatedData = {
      ...data,
      input2: {
        operator,
        remarkedit,
        deliveryLocation: String(deliveryLocation),
      },
      rm_tro_id: data?.rm_tro_id || rm_tro_id, 
    };
    
    console.log("ส่งข้อมูลไปrm_tro_Id Modal3:", updatedData);
    onNext(updatedData);
    

    console.log(" ส่งข้อมูลไป Modal3:", updatedData);
    onNext(updatedData);
  };


  const handleClose = () => {
    clearData();
    onClose();
  };

  const handleDeliveryLocationChange = (event) => {
    setDeliveryLocation(event.target.value);
  };


  return (
    <Dialog open={open} onClose={(e, reason) => {
      if (reason === 'backdropClick') return; // ไม่ให้ปิดเมื่อคลิกพื้นที่นอก
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
              กรุณากรอกข้อมูล
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography style={{ fontSize: "15px" }} color="rgba(0, 0, 0, 0.6)">
              ป้ายทะเบียน:
            </Typography>
            {data?.inputValues?.length > 0 ? (
              <Typography variant="body1" color="rgba(0, 0, 0, 0.6)" sx={{ fontWeight: 'solid' }}>
                {data.inputValues.join(", ")}
              </Typography>
            ) : (
              <Typography variant="body2">ไม่มีข้อมูลจาก Modal1</Typography>
            )}
          </Box>

          <Divider sx={{ mt: 1, mb: 2 }} />
          <TextField
            label="หมายเหตุ"
            variant="outlined"
            fullWidth
            size="small"
            value={remarkedit}
            onChange={(e) => setRemarkedit(e.target.value)}
            sx={{ marginBottom: '16px' }}
          />
          <TextField
            label="ผู้ดำเนินการ"
            variant="outlined"
            fullWidth
            size="small"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            sx={{ marginBottom: '16px' }}
          />
         
            <Typography style={{ color: "#666", marginRight: "16px" }}>สถานที่จัดส่ง</Typography>

          <Box sx={{ display: "flex", alignItems: "center", paddingLeft: "12px" }}>
            <RadioGroup row name="location" value={deliveryLocation} onChange={handleDeliveryLocationChange}>
              <FormControlLabel value="ไปจุดเตรียม" control={<Radio />} style={{ color: "#666" }} label="จุดเตรียม" />
              <FormControlLabel value="เข้าห้องเย็น" control={<Radio />} style={{ color: "#666" }} label="ห้องเย็น" />
              <FormControlLabel value="หม้ออบ" control={<Radio />} style={{ color: "#666" }} label="หม้ออบ" />
            </RadioGroup>
          </Box>
          <Divider />
         
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
