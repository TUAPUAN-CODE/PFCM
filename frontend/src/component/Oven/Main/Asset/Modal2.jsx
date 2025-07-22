import React, { useState, useEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, Box, Typography, Alert, Divider } from '@mui/material';
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
const API_URL = import.meta.env.VITE_API_URL;

const Modal2 = ({ open, onClose, onNext, data }) => {
  const [weightPerCart, setWeightPerCart] = useState('');
  const [operator, setOperator] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [numberOfTrays, setNumberOfTrays] = useState('');
  const [errorMessage, setErrorMessage] = useState('');




  useEffect(() => {
    if (open && data?.input2) {
      setWeightPerCart(data.input2.weightPerCart || '');
      setOperator(data.input2.operator || '');
      setSelectedItem(data.input2.selectedItem || null);
      setNumberOfTrays(data.input2.numberOfTrays || '');
    }
  }, [open, data]);

  const handleNext = () => {
    const weight = parseFloat(weightPerCart);
    const trays = parseInt(numberOfTrays, 10);

    if (!weightPerCart || isNaN(weight) || !operator || !numberOfTrays || isNaN(trays)) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setErrorMessage('');
    const updatedData = {
      ...data,
      input2: { weightPerCart: weight, operator, selectedItem, numberOfTrays: trays },
    };
    onNext(updatedData);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"> {/* ปรับขนาดให้เล็กลงโดยใช้ maxWidth="xs" */}
    {/* <DialogTitle variant="h6" color="rgba(0, 0, 0, 0.6)">กรุณากรอกข้อมูลให้ครบถ้วน</DialogTitle> */}
    <DialogContent sx={{ padding: '8px 16px' }}> {/* ลด padding ภายใน DialogContent */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
    <Typography style={{fontSize:"18px",color:"#787878"}} sx={{ textAlign: 'left' }}>กรุณากรอกข้อมูล</Typography>

    </Box>
      {/* ป้ายทะเบียนและข้อมูลในบรรทัดเดียวกัน */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1,}}>
        <Typography style={{fontSize:"15px"}} color="rgba(0, 0, 0, 0.6)">ป้ายทะเบียน:</Typography>
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
        label="น้ำหนักวัตถุดิบ/รถเข็น"
        variant="outlined"
        fullWidth
        value={weightPerCart}
        size="small"  // กำหนดขนาดเป็น 'small'
        onChange={(e) => setWeightPerCart(e.target.value)}
        sx={{ marginBottom: '16px' }}
        type="number"
      />
  
      <TextField
        label="จำนวนถาด"
        variant="outlined"
        fullWidth
        size="small"  // กำหนดขนาดเป็น 'small'
        value={numberOfTrays}
        onChange={(e) => setNumberOfTrays(e.target.value)}
        sx={{ marginBottom: '16px' }}
        type="number"
      />
  
      <TextField
        label="ผู้ดำเนินการ"
        variant="outlined"
        fullWidth
        size="small"  // กำหนดขนาดเป็น 'small'
        value={operator}
        onChange={(e) => setOperator(e.target.value)}
        sx={{ marginBottom: '16px' }}
      />
  
      <Divider sx={{ mt: 1, mb: 1 }} />
    </DialogContent>
  
    <Box sx={{ padding: "0px 16px 16px 16px", display: "flex", justifyContent: "space-between" }}>
      <Button style={{ backgroundColor: "#E74A3B", color: "#fff" }} variant="contained" startIcon={<CancelIcon />} onClick={onClose}>
        ยกเลิก
      </Button>
      <Button style={{ backgroundColor: "#41a2e6", color: "#fff" }} variant="contained" startIcon={<CheckCircleIcon />} onClick={handleNext}>
        ยืนยัน
      </Button>
    </Box>
  </Dialog>
  
  );
};

export default Modal2;
