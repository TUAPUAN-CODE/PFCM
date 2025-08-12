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
  Snackbar,
  FormGroup,
  Checkbox,
  FormControl,
  FormLabel,
  FormHelperText
} from '@mui/material';
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import axios from "axios";
axios.defaults.withCredentials = true;

const API_URL = import.meta.env.VITE_API_URL;

const Modal2 = ({ open, onClose, onNext, data, mapping_id, tro_id, CookedDateTime, dest }) => {
  const [weightPerCart, setWeightPerCart] = useState('');
  const [operator, setOperator] = useState('');
  const [numberOfTrays, setNumberOfTrays] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [processTypes, setProcessTypes] = useState([]);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [correctionMethods, setCorrectionMethods] = useState({
    blanching: false,
    chemicalSoaking: false,
    washing: false,
    steam: false,
    removeDefect: false,
    removeFRM: false,
    cooking: false,
    boilingBaking: false,
    other: false  // เพิ่มตัวเลือก "อื่นๆ"
  });
  const [weightError, setWeightError] = useState(false);
  const [trayError, setTrayError] = useState(false);
  const [operatorError, setOperatorError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [correctionMethodError, setCorrectionMethodError] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [otherCorrectionMethod, setOtherCorrectionMethod] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  console.log("modal 2 data :", data)

  const correctionMethodLabels = {
    blanching: "ลวก",
    chemicalSoaking: "แช่เคมี",
    washing: "ล้างน้ำ",
    steam: "ผ่าน Steam",
    removeDefect: "คัด Defect ออก",
    removeFRM: "คัด FRM ออก",
    cooking: "หุง",
    boilingBaking: "ต้ม/อบ",
    other: "อื่นๆ"
  };

  useEffect(() => {
    const fetchProcessTypes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/fetchProcess`);
        if (response.status === 200 && Array.isArray(response.data.data)) {
          setProcessTypes(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching process types:", error);
      }
    };

    if (open) {
      fetchProcessTypes();

      if (data && data.input2) {
        setWeightPerCart(data.input2.weightPerCart || '');
        if (data.input2.operator) {
          setOperator(data.input2.operator);
        }
        setNumberOfTrays(data.input2.numberOfTrays || '');
        setDeliveryLocation(data.input2.deliveryLocation || '');

        if (data.input2.correctionMethods) {
          setCorrectionMethods(data.input2.correctionMethods);
        }

        if (data.input2.otherCorrectionMethod) {
          setOtherCorrectionMethod(data.input2.otherCorrectionMethod);
        }

      } else {
        resetForm();
      }
    }
  }, [open, data]);

  useEffect(() => {
    const fetchUserDataFromLocalStorage = () => {
      try {
        const firstName = localStorage.getItem('first_name') || '';

        if (firstName) {
          setOperator(`${firstName}`.trim());
        }
      } catch (error) {
        console.error("Error fetching user data from localStorage:", error);
      }
    };

    if (open) {
      fetchUserDataFromLocalStorage();
    }
  }, [open]);

  const resetForm = () => {
    setWeightPerCart('');
    setNumberOfTrays('');
    setDeliveryLocation('');
    setCorrectionMethods({
      blanching: false,
      chemicalSoaking: false,
      washing: false,
      steam: false,
      removeDefect: false,
      removeFRM: false,
      cooking: false,
      boilingBaking: false,
      other: false  // เพิ่มตัวเลือก "อื่นๆ" ในการรีเซ็ต
    });
    setOtherCorrectionMethod('');  // รีเซ็ตข้อความ "อื่นๆ"
    setWeightError(false);
    setTrayError(false);
    setOperatorError(false);
    setLocationError(false);
    setCorrectionMethodError(false);
  };

  const validateInputs = () => {
    let isValid = true;

    // Validate weight per cart
    const weight = parseFloat(weightPerCart);
    if (!weightPerCart || isNaN(weight) || weight <= 0) {
      setWeightError(true);
      isValid = false;
    } else {
      setWeightError(false);
    }

    // Validate number of trays
    const trays = parseInt(numberOfTrays, 10);
    if (!numberOfTrays || isNaN(trays) || trays <= 0) {
      setTrayError(true);
      isValid = false;
    } else {
      setTrayError(false);
    }

    // Validate operator
    if (!operator) {
      setOperatorError(true);
      isValid = false;
    } else {
      setOperatorError(false);
    }

    // Validate delivery location
    if (data?.rm_status !== "รับฝาก-รอแก้ไข" && !deliveryLocation) {
      setLocationError(true);
      isValid = false;
    } else {
      setLocationError(false);
    }

    if (data?.remark_rework || data?.remark_rework_cold) {
      // ตรวจสอบว่ามีการเลือกวิธีแก้ไขอย่างน้อย 1 วิธี
      const hasSelectedMethod = Object.values(correctionMethods).some(value => value === true);
      if (!hasSelectedMethod) {
        setCorrectionMethodError(true);
        isValid = false;
      } else {
        setCorrectionMethodError(false);

        // ตรวจสอบเพิ่มเติมว่าถ้าเลือก "อื่นๆ" แล้วต้องกรอกข้อความด้วย
        if (correctionMethods.other && !otherCorrectionMethod) {
          setCorrectionMethodError(true);
          isValid = false;
        }
      }
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

    const updatedData = {
      ...data,
      input2: {
        weightPerCart: weight,
        operator,
        numberOfTrays: trays,
        deliveryLocation: String(deliveryLocation),
        correctionMethods: correctionMethods,
        otherCorrectionMethod: otherCorrectionMethod,
      },
      mapping_id: mapping_id,
      tro_id: tro_id,
      cookedDateTime: CookedDateTime,
      dest: dest
    };

    console.log("Sending data to Modal3:", updatedData);
    onNext(updatedData);
  };

  const handleClose = async () => {
  const troId = data?.inputValues?.[0]; // สมมุติว่าเป็นรหัสรถเข็น

  if (troId) {
    const success = await returnreserveTrolley(troId);
    if (!success) {
      setErrorDialogOpen(true);
      return;
    }
  }
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

  const handleDeliveryLocationChange = (event) => {
    setDeliveryLocation(event.target.value);
    setLocationError(false);
  };

  const handleOtherCorrectionMethodChange = (e) => {
    setOtherCorrectionMethod(e.target.value);
    if (e.target.value) {
      setCorrectionMethodError(false);
    }
  };

  const handleCorrectionMethodChange = (event) => {
    const { name, checked } = event.target;
    setCorrectionMethods({
      ...correctionMethods,
      [name]: checked
    });

    // Check if at least one method is selected
    const hasSelectedMethod = Object.values({
      ...correctionMethods,
      [name]: checked
    }).some(value => value === true);

    if (hasSelectedMethod) {
      setCorrectionMethodError(false);
    }
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


          {/* เพิ่มส่วนแสดงค่า remark_rework เมื่อมีค่า */}
          {data?.remark_rework_cold && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography style={{ fontSize: "15px" }} color="rgba(0, 0, 0, 0.6)">
                หมายเหตุแก้ไข-ห้องเย็น:
              </Typography>
              <Typography variant="body1" color="rgba(0, 0, 0, 0.6)" sx={{ fontWeight: 'solid' }}>
                {data.remark_rework_cold}
              </Typography>
            </Box>
          )}

          {data?.remark_rework && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography style={{ fontSize: "15px" }} color="rgba(0, 0, 0, 0.6)">
                หมายเหตุ-แก้ไข:
              </Typography>
              <Typography variant="body1" color="rgba(0, 0, 0, 0.6)" sx={{ fontWeight: 'solid' }}>
                {data.remark_rework}
              </Typography>
            </Box>
          )}

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


          {(data?.remark_rework || data?.remark_rework_cold) && (
            <FormControl
              component="fieldset"
              error={correctionMethodError}
              sx={{ marginBottom: '16px', width: '100%' }}
            >
              <FormLabel component="legend">วิธีการแก้ไขวัตถุดิบ</FormLabel>
              <FormGroup>
                {Object.entries(correctionMethodLabels).map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={correctionMethods[key]}
                        onChange={handleCorrectionMethodChange}
                        name={key}
                      />
                    }
                    label={label}
                  />
                ))}
              </FormGroup>
              {correctionMethodError && (
                <FormHelperText>กรุณาเลือกวิธีการแก้ไขวัตถุดิบอย่างน้อย 1 วิธี</FormHelperText>
              )}
            </FormControl>
          )}


          {correctionMethods.other && (data?.remark_rework || data?.remark_rework_cold) && (
            <TextField
              label="ระบุวิธีการแก้ไขวัตถุดิบอื่นๆ"
              variant="outlined"
              fullWidth
              size="small"
              value={otherCorrectionMethod}
              onChange={handleOtherCorrectionMethodChange}
              sx={{ marginBottom: '16px' }}
              error={correctionMethodError && !otherCorrectionMethod}
              helperText={correctionMethodError && !otherCorrectionMethod ? "กรุณาระบุวิธีการแก้ไขวัตถุดิบ" : ""}
            />
          )}

          {data?.rm_status !== "รับฝาก-รอแก้ไข" && (
            <>
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
                <RadioGroup row name="location" value={deliveryLocation} onChange={handleDeliveryLocationChange}>
                  <FormControlLabel value="ไปบรรจุ" control={<Radio />} style={{ color: "#666" }} label="บรรจุ" />
                  <FormControlLabel value="เข้าห้องเย็น" control={<Radio />} style={{ color: "#666" }} label="ห้องเย็น" />
                </RadioGroup>
              </Box>

              {locationError && (
                <Typography variant="caption" color="error" sx={{ ml: 2, mb: 2 }}>
                  กรุณาเลือกสถานที่จัดส่ง
                </Typography>
              )}
            </>
          )}

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