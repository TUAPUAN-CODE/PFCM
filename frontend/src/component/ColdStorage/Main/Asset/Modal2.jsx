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
  Alert,
  Divider
} from '@mui/material';
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
const API_URL = import.meta.env.VITE_API_URL;

const Modal2 = ({ open, onClose, onNext, data }) => {
  const [weightPerCart, setWeightPerCart] = useState('');
  const [operator, setOperator] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [numberOfTrays, setNumberOfTrays] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // เมื่อเปิด Modal ให้ตั้งค่า state จาก data ที่ส่งมา
  useEffect(() => {
     if (open && data && data.input2) {
       setWeightPerCart(data.input2.weightPerCart || '');
       setOperator(data.input2.operator || '');
       setNumberOfTrays(data.input2.numberOfTrays || '');
     } else if (open) {
       setWeightPerCart('');
       setOperator('');
       setNumberOfTrays('');
     }
   }, [open, data]);

  // ฟังก์ชันสำหรับเคลียร์ข้อมูลใน state
  const clearData = () => {
    setWeightPerCart('');
    setOperator('');
    setSelectedItem(null);
    setNumberOfTrays('');
    setErrorMessage('');
  };

  // เมื่อกดยืนยันให้ตรวจสอบและส่งข้อมูลต่อ
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

  // เมื่อกดยกเลิกให้เคลียร์ข้อมูล แล้วปิด Modal
  const handleClose = () => {
    clearData();
    onClose();
  };

  return (
    <Dialog open={open}  onClose={(e, reason) => {
      if (reason === 'backdropClick') return; // ไม่ให้ปิดเมื่อคลิกพื้นที่นอก
      onClose(); // ปิดเมื่อกดปุ่มหรือในกรณีอื่นๆ
    }} fullWidth maxWidth="xs">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
      <DialogContent sx={{ padding: '8px 16px' }}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center',marginTop:"10px" }}>
          <Typography sx={{ fontSize: "18px", fontWeight: 500,color: "#545454", marginBottom: "10px" }}>
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
          label="น้ำหนักวัตถุดิบ/รถเข็น"
          variant="outlined"
          fullWidth
          value={weightPerCart}
          size="small"
          onChange={(e) => setWeightPerCart(e.target.value)}
          sx={{ marginBottom: '16px' }}
          type="number"
        />

        <TextField
          label="จำนวนถาด"
          variant="outlined"
          fullWidth
          size="small"
          value={numberOfTrays}
          onChange={(e) => setNumberOfTrays(e.target.value)}
          sx={{ marginBottom: '16px' }}
          type="number"
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

        <Divider  />
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