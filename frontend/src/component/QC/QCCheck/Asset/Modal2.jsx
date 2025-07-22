import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  Button,
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Alert,
  Divider,
  RadioGroup,
  Radio,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar
} from '@mui/material';
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;

const Modal2 = ({ open, onClose, onNext, data, rmfp_id, CookedDateTime, dest,tro_id,tray_count,weight_RM,rmm_line_name }) => {
  const [weightPerCart, setWeightPerCart] = useState('');
  const [operator, setOperator] = useState('');
  const [numberOfTrays, setNumberOfTrays] = useState('');
  const [mdNo, setMdNo] = useState(''); // เก็บ md_no ที่เลือก
  const [mdOptions, setMdOptions] = useState([]); // เก็บตัวเลือกเครื่อง MD  
  const [errorMessage, setErrorMessage] = useState('');
  const [processTypes, setProcessTypes] = useState([]);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [selectedProcessType, setSelectedProcessType] = useState("");
  const [weightError, setWeightError] = useState(false);
  const [trayError, setTrayError] = useState(false);
  const [operatorError, setOperatorError] = useState(false);
  const [mdNoError, setMdNoError] = useState(false);
  const [processError, setProcessError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    const fetchProcessTypes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/prep/process/rawmat`);
        if (response.status === 200 && Array.isArray(response.data.process)) {
          setProcessTypes(response.data.process);
        }
      } catch (error) {
        console.error("Error fetching process types:", error);
      }
    };

    const fetchMdOptions = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/metal-detectors`); // สมมติ endpoint
        if (response.status === 200 && Array.isArray(response.data)) {
          setMdOptions(response.data); // เก็บข้อมูลเครื่อง MD (md_no และ WorkArea)
        }
      } catch (error) {
        console.error("Error fetching MD options:", error);
      }
    };

    if (open) {
      fetchProcessTypes();
      fetchMdOptions();
      
      if (data && data.input2) {
        setWeightPerCart(data.input2.weightPerCart || '');
        setOperator(data.input2.operator || '');
        setNumberOfTrays(data.input2.numberOfTrays || '');
        setSelectedProcessType(data.input2.selectedProcessType || '');
        setDeliveryLocation(data.input2.deliveryLocation || '');
        setMdNo(data.input2.mdNo || ''); // โหลด md_no จาก data
      } else {
        resetForm();
      }
    }
  }, [open, data]);

  const resetForm = () => {
    setWeightPerCart('');
    setOperator('');
    setNumberOfTrays('');
    setMdNo('');
    setSelectedProcessType('');
    setDeliveryLocation('');
    setWeightError(false);
    setTrayError(false);
    setOperatorError(false);
    setMdNoError(false);
    setProcessError(false);
    setLocationError(false);
  };

  const validateInputs = () => {
    let isValid = true;
    
    const weight = parseFloat(weightPerCart);
    if (!weightPerCart || isNaN(weight) || weight <= 0) {
      setWeightError(true);
      isValid = false;
    } else {
      setWeightError(false);
    }

    const trays = parseInt(numberOfTrays, 10);
    if (!numberOfTrays || isNaN(trays) || trays <= 0) {
      setTrayError(true);
      isValid = false;
    } else {
      setTrayError(false);
    }

    if (!operator) {
      setOperatorError(true);
      isValid = false;
    } else {
      setOperatorError(false);
    }

    if (!mdNo) {
      setMdNoError(true);
      isValid = false;
    } else {
      setMdNoError(false);
    }

    if (!selectedProcessType) {
      setProcessError(true);
      isValid = false;
    } else {
      setProcessError(false);
    }

    if (!deliveryLocation) {
      setLocationError(true);
      isValid = false;
    } else {
      setLocationError(false);
    }

    return isValid;
  };

  const handleNext = () => {
    if (!validateInputs()) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง");
      setSnackbarOpen(true);
      return;
    }

    const weight = parseFloat(weightPerCart);
    const trays = parseInt(numberOfTrays, 10);
    const selectedMd = mdOptions.find(md => md.md_no === mdNo); // หาข้อมูลเครื่อง MD ที่เลือก

// เมื่อส่งข้อมูลไปยัง Modal ถัดไป
const updatedData = {
  ...data,
  input2: {
    weightPerCart: weight,
    operator,
    numberOfTrays: trays,
    mdNo, // ส่งเฉพาะ md_no
    WorkAreaCode: selectedMd?.WorkAreaCode || null, // เปลี่ยนจาก WorkArea เป็น WorkAreaCode
    selectedProcessType,
    deliveryLocation: String(deliveryLocation),
  },
  rmfp_id: rmfp_id,
  cookedDateTime: CookedDateTime,
  withdraw_date_formatted: withdraw_date_formatted,
  dest: dest,
  tro_id : tro_id,
  process_name : process_name,
  tray_count : tray_count,
  weight_RM : weight_RM,
  rmm_line_name : rmm_line_name
};

    console.log("Sending data to Modal3:", updatedData);
    onNext(updatedData);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setWeightPerCart(value);
      setWeightError(false);
    }
  };

  const handleTrayChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setNumberOfTrays(value);
      setTrayError(false);
    }
  };

  const handleOperatorChange = (e) => {
    setOperator(e.target.value);
    setOperatorError(false);
  };

  const handleMdNoChange = (e) => {
    setMdNo(e.target.value);
    setMdNoError(false);
  };

  const handleProcessTypeChange = (e) => {
    setSelectedProcessType(e.target.value);
    setProcessError(false);
  };

  const handleDeliveryLocationChange = (event) => {
    setDeliveryLocation(event.target.value);
    setLocationError(false);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Dialog open={open} onClose={(e, reason) => {
      if (reason === 'backdropClick') return;
      onClose();
    }} fullWidth maxWidth="xs">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
        <DialogContent sx={{ padding: '8px 16px' }}>
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
            label="น้ำหนักวัตถุดิบ/รถเข็น (กก.)"
            variant="outlined"
            fullWidth
            value={weightPerCart}
            size="small"
            onChange={handleWeightChange}
            sx={{ marginBottom: '16px' }}
            error={weightError}
            helperText={weightError ? "กรุณากรอกน้ำหนักเป็นตัวเลขที่ถูกต้อง" : ""}
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9]*\\.?[0-9]*'
            }}
          />

          <TextField
            label="จำนวนถาด"
            variant="outlined"
            fullWidth
            size="small"
            value={numberOfTrays}
            onChange={handleTrayChange}
            sx={{ marginBottom: '16px' }}
            error={trayError}
            helperText={trayError ? "กรุณากรอกจำนวนเป็นตัวเลขเต็มที่ถูกต้อง" : ""}
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*'
            }}
          />

          <FormControl 
            fullWidth 
            size="small" 
            sx={{ marginBottom: '16px' }} 
            variant="outlined"
            error={processError}
          >
            <InputLabel>ประเภทการแปรรูป</InputLabel>
            <Select
              value={selectedProcessType}
              onChange={handleProcessTypeChange}
              label="ประเภทการแปรรูป"
            >
              {processTypes.map((process, index) => (
                <MenuItem key={index} value={process.process_name}>
                  {process.process_name}
                </MenuItem>
              ))}
            </Select>
            {processError && (
              <Typography variant="caption" color="error">
                กรุณาเลือกประเภทการแปรรูป
              </Typography>
            )}
          </FormControl>

          <TextField
            label="ผู้ดำเนินการ"
            variant="outlined"
            fullWidth
            size="small"
            value={operator}
            onChange={handleOperatorChange}
            sx={{ marginBottom: '16px' }}
            error={operatorError}
            helperText={operatorError ? "กรุณากรอกชื่อผู้ดำเนินการ" : ""}
          />

          <FormControl 
            fullWidth 
            size="small" 
            sx={{ marginBottom: '16px' }} 
            variant="outlined"
            error={mdNoError}
          >
            <InputLabel>หมายเลขเครื่อง MD</InputLabel>
            <Select
              value={mdNo}
              onChange={handleMdNoChange}
              label="หมายเลขเครื่อง MD"
            >
              {mdOptions.map((md, index) => (
                <MenuItem key={index} value={md.md_no}>
  {`${md.md_no} - ${md.WorkAreaCode}`} {/* เปลี่ยนจาก WorkArea เป็น WorkAreaCode */}
</MenuItem>
              ))}
            </Select>
            {mdNoError && (
              <Typography variant="caption" color="error">
                กรุณาเลือกหมายเลขเครื่อง MD
              </Typography>
            )}
          </FormControl>

          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            paddingLeft: "12px",
            border: locationError ? '1px solid red' : 'none',
            borderRadius: locationError ? '4px' : '0',
            padding: locationError ? '8px' : '0',
            marginBottom: '16px'
          }}>
            <Typography style={{ color: "#666", marginRight: "16px" }}>สถานที่จัดส่ง</Typography>
            <RadioGroup 
              row 
              name="location" 
              value={deliveryLocation} 
              onChange={handleDeliveryLocationChange}
            >
              <FormControlLabel 
                value="ไปจุดเตรียม" 
                control={<Radio />} 
                style={{ color: "#666" }} 
                label="จุดเตรียม" 
              />
              <FormControlLabel 
                value="เข้าห้องเย็น" 
                control={<Radio />} 
                style={{ color: "#666" }} 
                label="ห้องเย็น" 
              />
            </RadioGroup>
          </Box>
          {locationError && (
            <Typography variant="caption" color="error" sx={{ ml: 2, mb: 2 }}>
              กรุณาเลือกสถานที่จัดส่ง
            </Typography>
          )}

          <Divider />
          <Typography color="rgba(0, 0, 0, 0.6)">rmfp_id: {rmfp_id}</Typography>
          <Typography color="rgba(0, 0, 0, 0.6)">dest: {dest}</Typography>
          <Typography color="rgba(0, 0, 0, 0.6)">CookedDateTime: {data?.cookedDateTime || "ไม่มีข้อมูล"}</Typography>
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default Modal2;