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
  InputLabel,
  Snackbar
} from '@mui/material';
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import axios from "axios";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

axios.defaults.withCredentials = true;

const API_URL = import.meta.env.VITE_API_URL;

// ฟังก์ชั่นช่วยแปลงเวลาเป็นเวลาไทย (UTC+7)
const convertToThaiTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';

  const date = new Date(dateTimeStr);

  // เพิ่ม 7 ชั่วโมงเพื่อแปลงเป็นเวลาไทย
  const thaiDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));

  // จัดรูปแบบให้เป็น YYYY-MM-DDThh:mm สำหรับ input type datetime-local
  return thaiDate.toISOString().slice(0, 16);
};

const convertToLocalTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';

  try {
    // ถ้าวันที่อยู่ในรูปแบบ "DD/MM/YYYY HH:MM"
    if (typeof dateTimeStr === 'string' && dateTimeStr.match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)) {
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [day, month, year] = datePart.split('/');

      // สร้าง Date object (เดือนเป็น 0-based)
      const date = new Date(year, month - 1, day, ...timePart.split(':'));

      // ตรวจสอบว่า Date object ถูกต้อง
      if (isNaN(date.getTime())) {
        console.warn("Invalid date format:", dateTimeStr);
        return '';
      }

      // จัดรูปแบบเป็น YYYY-MM-DDThh:mm
      const pad = num => num.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    // ถ้าวันที่อยู่ในรูปแบบอื่นที่ JavaScript สามารถ parse ได้
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date format:", dateTimeStr);
      return '';
    }

    const pad = num => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch (error) {
    console.error("Error converting date:", error);
    return '';
  }
};

// ฟังก์ชั่นแปลงเวลาไทยกลับเป็น UTC สำหรับการส่งข้อมูล
const convertToUTC = (thaiTimeStr) => {
  if (!thaiTimeStr) return '';

  const thaiDate = new Date(thaiTimeStr);

  // ลบ 7 ชั่วโมงเพื่อแปลงกลับเป็นเวลา UTC
  const utcDate = new Date(thaiDate.getTime() - (7 * 60 * 60 * 1000));

  return utcDate.toISOString();
};

const Modal2 = ({ open, onClose, onNext, data, rmfp_id, CookedDateTime, dest, rm_type_id }) => {
  const [rmTypeId, setRmTypeId] = useState(rm_type_id ?? 3);
  const [euOptions, setEuOptions] = useState([]);
  const [weightPerCart, setWeightPerCart] = useState('');
  const [operator, setOperator] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [numberOfTrays, setNumberOfTrays] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [processTypes, setProcessTypes] = useState([]);
  const [deliveryLocation, setDeliveryLocation] = useState([]);
  const [deliveryType, setDeliveryType] = useState("");
  const [selectedProcessType, setSelectedProcessType] = useState("");
  const [cookedTime, setCookedTime] = useState('');
  const [weightError, setWeightError] = useState(false);
  const [trayError, setTrayError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [processTypeError, setProcessTypeError] = useState(false);
  const [operatorError, setOperatorError] = useState(false);
  const [preparedTimeError, setPreparedTimeError] = useState(false);
  const [preparedTime, setPreparedTime] = useState('');
  const [timeValid, setTimeValid] = useState(true);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false); // สำหรับแจ้ง error

  useEffect(() => {
    console.log("rm_type_id updated:", rm_type_id);
    setRmTypeId(rm_type_id ?? 3);
  }, [rm_type_id]);

  useEffect(() => {
    console.log("เวลา :", CookedDateTime);
    if (open && CookedDateTime) {
      const formattedDateTime = convertToLocalTime(CookedDateTime);
      if (formattedDateTime) {
        setCookedTime(formattedDateTime);
      }
    }
  }, [open, CookedDateTime]);

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

    const fetchProcessTypes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/fetchProcess`);
        console.log("API Response:", response.data);

        if (response.status === 200 && Array.isArray(response.data.data)) {
          setProcessTypes(response.data.data);
          const numbers = [
            { id: 0, value: '-' },
            ...Array.from({ length: 10 }, (_, i) => ({
              id: i + 1,
              value: `Eu ${i + 1}`
            }))
          ];
          setEuOptions(numbers);
          console.log("euOptions:", numbers);
        } else {
          console.error("Unexpected API response format:", response.data);
        }
      } catch (error) {
        console.error("Error fetching process types:", error);
      }
    };

    fetchProcessTypes();
    if (open) {
      fetchUserDataFromLocalStorage();
      // ตั้งค่าเวลาเตรียมเสร็จเป็นเวลาปัจจุบันเมื่อเปิด modal (ในเวลาไทย)
      const now = new Date();
      // แปลงเวลาปัจจุบันเป็นเวลาไทย (บวก 7 ชั่วโมง)
      const thaiTime = convertToThaiTime(now.toISOString());
      setPreparedTime(thaiTime);
    }
  }, [open]);

  useEffect(() => {
    if (open && data && data.input2) {
      setWeightPerCart(data.input2.weightPerCart || '');
      if (data.input2.operator) {
        setOperator(data.input2.operator);
      }
      setNumberOfTrays(data.input2.numberOfTrays || '');
      setSelectedProcessType(data.input2.selectedProcessType || '');
      setDeliveryLocation(data.input2.deliveryLocation || '');
      setDeliveryType(data.input2.deliveryType || '');

      // ถ้ามีข้อมูล preparedTime แล้วให้แปลงเป็นรูปแบบที่ถูกต้อง
      if (data.input2.preparedTime) {
        // แปลงข้อมูลจากรูปแบบ DD/MM/YYYY HH:MM เป็น YYYY-MM-DDThh:mm
        try {
          const [datePart, timePart] = data.input2.preparedTime.split(" ");
          const [day, month, year] = datePart.split("/");
          const formattedDateTime = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}`;
          setPreparedTime(formattedDateTime);
        } catch (error) {
          // ถ้าแปลงไม่สำเร็จ ให้ใช้เวลาปัจจุบันในเวลาไทย
          setPreparedTime(convertToThaiTime(new Date().toISOString()));
        }
      } else {
        // ถ้าไม่มีข้อมูล ให้ใช้เวลาปัจจุบันในเวลาไทย
        setPreparedTime(convertToThaiTime(new Date().toISOString()));
      }
    } else if (open) {
      setWeightPerCart('');
      setNumberOfTrays('');
      setSelectedProcessType('');
      setDeliveryLocation('');
      setDeliveryType('');
      // ตั้งค่าเป็นเวลาปัจจุบันในเวลาไทย
      setPreparedTime(convertToThaiTime(new Date().toISOString()));
    }
  }, [open, data]);

  useEffect(() => {
    console.log("เวลา :", CookedDateTime);
    if (open && CookedDateTime) {
      try {
        const [datePart, timePart] = CookedDateTime.split(" ");
        const [day, month, year] = datePart.split("/");
        const formattedDateTime = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}`;
        setCookedTime(formattedDateTime);
      } catch (error) {
        console.error("Error formatting CookedDateTime:", error);
      }
    }
  }, [open, CookedDateTime]);

  const clearData = () => {
    setWeightPerCart('');
    setSelectedItem(null);
    setNumberOfTrays('');
    setSelectedProcessType('');
    setDeliveryLocation('');
    setDeliveryType('');
    setErrorMessage('');
    setWeightError(false);
    setTrayError(false);
    setLocationError(false);
    setProcessTypeError(false);
    setOperatorError(false);
    setPreparedTimeError(false);
  };

  const isFutureTime = (selectedTime) => {
    if (!selectedTime) return false;

    // สร้างวันที่จากค่า selectedTime
    const selectedDate = new Date(selectedTime);

    // สร้างวันที่ปัจจุบัน (ไม่ต้องแปลงเป็นเวลาไทย เพราะเราเปรียบเทียบค่าวันที่โดยตรง)
    const now = new Date();

    // เปรียบเทียบเวลาโดยตรง
    return selectedDate > now;
  };

  const validateInputs = () => {
    let isValid = true;

    if (!operator) {
      setOperatorError(true);
      isValid = false;
    } else {
      setOperatorError(false);
    }

    if (!weightPerCart || isNaN(parseFloat(weightPerCart))) {
      setWeightError(true);
      isValid = false;
    } else {
      setWeightError(false);
    }

    if (!selectedProcessType) {
      setProcessTypeError(true);
      isValid = false;
    } else {
      setProcessTypeError(false);
    }

    if (!numberOfTrays || isNaN(parseInt(numberOfTrays, 10))) {
      setTrayError(true);
      isValid = false;
    } else {
      setTrayError(false);
    }

    if (!operator || !selectedProcessType) {
      isValid = false;
    }

    if (!deliveryLocation) {
      setLocationError(true);
      isValid = false;
    } else {
      setLocationError(false);
    }

    if (deliveryLocation === "เข้าห้องเย็น" && !deliveryType) {
      isValid = false;
    }

    // ตรวจสอบวันที่เตรียมเสร็จ
    if (!preparedTime) {
      setPreparedTimeError(true);
      isValid = false;
    } else if (isFutureTime(preparedTime)) {
      setPreparedTimeError(true);
      setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาการเตรียมเสร็จได้");
      isValid = false;
      return false; // หยุดการตรวจสอบทันทีถ้าเป็นเวลาอนาคต
    } else {
      setPreparedTimeError(false);
    }

    // ตรวจสอบเวลาอบเสร็จ/ต้มเสร็จ
    if (cookedTime && isFutureTime(cookedTime)) {
      setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาอบเสร็จ/ต้มเสร็จได้");
      isValid = false;
      return false; // หยุดการตรวจสอบทันทีถ้าเป็นเวลาอนาคต
    }

    return isValid;
  };

  const handleNext = () => {
    if (!validateInputs()) {
      setSnackbarOpen(true);
      return;
    }

    setErrorMessage('');

    if (isFutureTime(preparedTime) || (cookedTime && isFutureTime(cookedTime))) {
      setErrorMessage("ไม่สามารถใช้เวลาอนาคตในการบันทึกข้อมูล");
      setSnackbarOpen(true);
      return;
    }

    // แปลงเวลาอบเสร็จ/ต้มเสร็จให้เป็นรูปแบบ DD/MM/YYYY HH:MM
    const formattedCookedTime = cookedTime
      ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(cookedTime))
      : "";

    // แปลงเวลาเตรียมเสร็จให้เป็นรูปแบบ DD/MM/YYYY HH:MM
    // แต่ต้องแปลงเวลาไทยกลับเป็น UTC ก่อนเพื่อให้ Intl.DateTimeFormat ทำงานได้ถูกต้อง
    const preparedTimeUTC = preparedTime ? new Date(preparedTime) : null;
    const formattedPreparedTime = preparedTimeUTC
      ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(preparedTimeUTC)
      : "";

    const updatedData = {
      ...data,
      input2: {
        weightPerCart: parseFloat(weightPerCart),
        operator,
        selectedItem,
        numberOfTrays: parseInt(numberOfTrays, 10),
        selectedProcessType: selectedProcessType,
        deliveryLocation: String(deliveryLocation),
        deliveryType: String(deliveryType),
        preparedTime: formattedPreparedTime, // เวลาในรูปแบบ DD/MM/YYYY HH:MM
      },
      batch: data?.batch || '',
      newBatch: data?.newBatch || '',
      rmfp_id: rmfp_id,
      cookedDateTimeNew: formattedCookedTime,
      preparedDateTimeNew: formattedPreparedTime, // เพิ่ม preparedDateTimeNew ในข้อมูลหลัก
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
    if (event.target.value !== "เข้าห้องเย็น") {
      setDeliveryType("");
    }
  };

  const handleDeliveryTypeChange = (event) => {
    setDeliveryType(event.target.value);
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

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // สร้างค่า max datetime สำหรับ input fields (ใช้เวลาไทย)
  const maxDateTime = convertToThaiTime(new Date().toISOString());

  // Check if rm_type_id is 3 or 7 to show EU Level select
  const shouldShowEuSelect = rmTypeId === 3 || rmTypeId === 7 || rm_type_id === 8 || rm_type_id === 6;



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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: "5px" }}>
            <Typography style={{ fontSize: "15px" }} color="rgba(0, 0, 0, 0.6)">
              Batch เก่า:
            </Typography>

            {data?.batch ? (
              <Typography variant="body1" color="rgba(0, 0, 0, 0.6)" sx={{ fontWeight: 'solid' }}>
                {data.batch}
              </Typography>
            ) : (
              <Typography variant="body2">ไม่มีข้อมูล</Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: "5px" }}>
            <Typography style={{ fontSize: "15px" }} color="rgba(0, 0, 0, 0.6)">
              Batch ใหม่:
            </Typography>

            {data?.newBatch ? (
              <Typography variant="body1" color="rgba(0, 0, 0, 0.6)" sx={{ fontWeight: 'solid' }}>
                {data.newBatch}
              </Typography>
            ) : (
              <Typography variant="body2">ไม่มีข้อมูล</Typography>
            )}
          </Box>

          <Divider sx={{ mt: 1, mb: 2 }} />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              label="เวลาอบเสร็จ/ต้มเสร็จ"
              value={cookedTime ? dayjs(cookedTime) : null}
              onChange={(newValue) => {
                if (newValue && newValue.isAfter(dayjs())) {
                  setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาอบเสร็จ/ต้มเสร็จได้");
                  setSnackbarOpen(true);
                  return;
                }
                setCookedTime(newValue?.toISOString() || "");
              }}
              maxDateTime={dayjs()}
              ampm={false}
               // ✅ ใช้ timeSteps แทน minutesStep
              timeSteps={{ minutes: 1 }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  required: true,
                  sx: { marginBottom: '16px' }
                }
              }}
            />
          </LocalizationProvider>


          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              label="วันที่เตรียมเสร็จ"
              value={preparedTime ? dayjs(preparedTime) : null}
              onChange={(newValue) => {
                if (newValue && newValue.isAfter(dayjs())) {
                  setPreparedTimeError(true);
                  setTimeValid(false);
                  setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาการเตรียมเสร็จได้");
                  setSnackbarOpen(true);
                  return;
                }
                setPreparedTime(newValue?.toISOString() || "");
                setPreparedTimeError(false);
                setTimeValid(true);
              }}
              maxDateTime={dayjs()}
              ampm={false}
              // ✅ ใช้ timeSteps แทน minutesStep
              timeSteps={{ minutes: 1 }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  required: true,
                  sx: { marginBottom: '16px' },
                  error: preparedTimeError,
                  helperText: preparedTimeError ? "กรุณากรอกวันที่เตรียมเสร็จที่ถูกต้อง และไม่ใช่เวลาอนาคต" : ""
                }
              }}
            />


          </LocalizationProvider>

          <TextField
            label="น้ำหนักวัตถุดิบ/รถเข็น (กก.)"
            variant="outlined"
            fullWidth
            value={weightPerCart}
            size="small"
            onChange={handleWeightChange}
            sx={{
              marginBottom: '16px',

            }}
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
            sx={{
              marginBottom: '16px',

            }}
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
            sx={{
              marginBottom: '16px',

            }}
            variant="outlined"
            error={processTypeError}
          >
            <InputLabel>ประเภทการแปรรูป</InputLabel>
            <Select
              value={selectedProcessType}
              onChange={(e) => {
                setSelectedProcessType(e.target.value);
                setProcessTypeError(false);
              }}
              label="ประเภทการแปรรูป"
            >
              {processTypes.map((process) => (
                <MenuItem key={process.process_id} value={process}>
                  {process.process_name}
                </MenuItem>
              ))}
            </Select>
            {processTypeError && (
              <Typography variant="caption" color="error" sx={{ ml: 2 }}>
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
            onChange={(e) => {
              setOperator(e.target.value);
              setOperatorError(false);
            }}
            sx={{
              marginBottom: '16px',

            }}
            error={operatorError}
            helperText={operatorError ? "กรุณากรอกชื่อผู้ดำเนินการ" : ""}
          />

          <Box sx={{
            display: "flex",
            alignItems: "center",
            paddingLeft: "12px",
            border: locationError ? '1px solid red' : 'none',
            borderRadius: locationError ? '4px' : '0',
            padding: locationError ? '8px' : '0'
          }}>
            <Typography style={{ color: "#666", marginRight: "16px" }}>สถานที่จัดส่ง</Typography>
            <RadioGroup row name="location" value={deliveryLocation} onChange={handleDeliveryLocationChange}>
              <FormControlLabel value="ไปบรรจุ" control={<Radio />} style={{ color: "#666" }} label="บรรจุ" />
              <FormControlLabel value="เข้าห้องเย็น" control={<Radio />} style={{ color: "#666" }} label="ห้องเย็น" />
            </RadioGroup>
          </Box>
          {locationError && (
            <Typography variant="caption" color="error" sx={{ ml: 2 }}>
              กรุณาเลือกสถานที่จัดส่ง
            </Typography>
          )}

          {deliveryLocation === "เข้าห้องเย็น" && (
            <Box sx={{
              display: "flex",
              alignItems: "center",
              paddingLeft: "12px",
              marginTop: "8px"
            }}>
              <Typography style={{ color: "#666", marginRight: "16px" }}>
                ประเภทการส่ง
              </Typography>
              <RadioGroup
                row
                name="deliveryType"
                value={deliveryType}
                onChange={handleDeliveryTypeChange}
              >
                <FormControlLabel
                  value="Qc ตรวจสอบ"
                  control={<Radio />}
                  style={{ color: "#666" }}
                  label="Qc ตรวจสอบ"
                />
                <FormControlLabel
                  value="รอกลับมาเตรียม"
                  control={<Radio />}
                  style={{ color: "#666" }}
                  label="รอกลับมาเตรียม"
                />
              </RadioGroup>
            </Box>
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
            style={{
              backgroundColor: !timeValid || preparedTimeError ? "#A0A0A0" : "#41a2e6",
              color: "#fff"
            }}
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleNext}
            disabled={!timeValid || preparedTimeError}
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
          {errorMessage || "กรุณากรอกข้อมูลให้ครบถ้วน"}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default Modal2;