import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  TextField,
  RadioGroup,
  Checkbox,
  FormControlLabel,
  Radio,
  Dialog,
  Autocomplete,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";
import { styled } from "@mui/system";
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

axios.defaults.withCredentials = true;

const API_URL = import.meta.env.VITE_API_URL;

const StyledModal = styled(Modal)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const ModalContent = styled(Box)(({ theme }) => ({
  backgroundColor: "#ffffff",
  padding: "24px",
  width: "100%",
  maxWidth: "800px",
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.15)",
  position: "relative",
  maxHeight: "90vh",
  overflow: "auto",
  '&::-webkit-scrollbar': {
    width: '30px',
    height: '30px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#888',
    borderRadius: '10px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#f1f1f1',
  },
}));

const ModalAlert = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 0,
          padding: 3
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box
          sx={{
            backgroundColor: 'white',
            color: '#4caf50',
            borderRadius: 0,
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 40 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: '4px', color: '#333' }}>
          บันทึกข้อมูลเรียบร้อยแล้ว
        </Typography>
        <Button
          onClick={onClose}
          sx={{
            backgroundColor: '#4aaaec',
            color: 'white',
            mt: 3,
            paddingX: 4,
            paddingY: 1.5,
            borderRadius: 0,
            '&:hover': {
              backgroundColor: '#4aaaec',
            }
          }}
        >
          ปิด
        </Button>
      </Box>
    </Dialog>
  );
};

const DeleteConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  planName
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>ยืนยันการลบแผน</DialogTitle>
      <DialogContent>
        <Typography>
          {planName ? `คุณแน่ใจหรือไม่ว่าต้องการลบแผน ${planName}?` : "คุณแน่ใจหรือไม่ว่าต้องการลบแผนนี้?"}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          ยกเลิก
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          ลบ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ConfirmProdModal = ({
  open,
  onClose,
  material,
  materialName,
  batch,
  selectedPlanSets,
  deliveryLocation,
  emulsion,
  operator,
  weighttotal,
  isLoading,
  setIsLoading,
  onSuccess,
  level_eu,
  emulsionweightTotal,
  hu,
  selectedMaterials,
  cookedTime,
  preparedTime,
  mixtime,
  numberOfTrays,
  selectedProcessType,
  gravyTime
}) => {
  const [showAlert, setShowAlert] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);

  const handleAlertClose = () => {
    setShowAlert(false);
  };
  const formatDateTimeForSQL = (isoString) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return null;
    }
  };

  // ⭐⭐⭐ เพิ่มฟังก์ชันนี้ ⭐⭐⭐
  // ฟังก์ชันแปลงวันที่สำหรับแสดงผล UI
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(dateTimeStr));
    } catch (error) {
      console.error("Error formatting display date:", error);
      return '';
    }
  };
  const handleConfirm = async () => {
    const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() + 7);
    const formattedDateTime = currentDateTime.toISOString();

    const weightPerPlan = parseFloat(weighttotal) / (selectedPlanSets.length || 1);
    const cleanEuLevel = level_eu === "-" ? "-" : level_eu.replace("Eu ", "").trim();

    try {
      setIsLoading(true);
      setError(null);

      const url = `${API_URL}/api/pack/manage/insert`;

      console.log("=== SENDING PAYLOAD ===");

      const requests = (selectedPlanSets.length > 0 ? selectedPlanSets : [{}]).map(set => {
        const payload = {
          mat: material,
          batch: batch,
          productId: set.plan?.prod_id || null,
          line_name: set.line?.line_name || "",
          groupId: set.group?.rm_group_id ? [set.group.rm_group_id] : [],
          weight: weightPerPlan,
          operator: operator,
          datetime: formattedDateTime,
          Dest: deliveryLocation,
          level_eu: cleanEuLevel,
          hu: hu || null,
          // cookedTime: cookedTime || null,
          // preparedTime: preparedTime || null,
          // mixtime: mixtime || null,
          cookedTime: formatDateTimeForSQL(cookedTime),       // ✅ แทนที่ cookedTime || null
          preparedTime: formatDateTimeForSQL(preparedTime),   // ✅ แทนที่ preparedTime || null
          mixtime: formatDateTimeForSQL(mixtime),             // ✅ แทนที่ mixtime || null
          numberOfTrays: numberOfTrays || null,
          gravyTime: formatDateTimeForSQL(gravyTime),
          // processType: selectedProcessType?.process_name || null,
          processType: selectedProcessType?.process_id || null,  // ✅ ส่ง id แทน name

          selectedMaterials: (selectedMaterials || []).map(matObj => ({
            mapping_id: matObj.mapping_id || matObj.hu || matObj.rmfemu_id,
            mat: matObj.mat,
            batch: matObj.batch,
            weight: matObj.weight,
            level_eu: matObj.level_eu
          }))
        };

        console.log(`Payload for set ${selectedPlanSets.indexOf(set) + 1}:`, JSON.stringify(payload, null, 2));

        return axios.post(url, payload);
      });

      const responses = await Promise.all(requests);

      console.log("✅ All responses:", responses);

      if (responses.every(res => res.status === 200)) {
        if (onSuccess) onSuccess();
        setShowAlert(true);
        onClose();
      }
    } catch (error) {
      console.error("❌ Error during API call:", error);
      console.error("❌ Server Response:", error.response?.data);

      const errorMessage = error.response?.data?.message || error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล";

      setError(errorMessage);
      alert(`เกิดข้อผิดพลาด: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) setUserId(storedUserId);
  }, []);

  return (
    <div>
      {isLoading && <CircularProgress />}
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          onClose();
        }}
        maxWidth="sm"
        fullWidth
      >
        <ModalContent>
          <Typography variant="h6" sx={{ mb: 2 }}>ยืนยันข้อมูลการผลิต</Typography>

          {/* แสดงข้อมูล Plan Sets */}
          {emulsion !== "true" && selectedPlanSets && selectedPlanSets.length > 0 && (
            <Box sx={{ maxHeight: '400px', overflow: 'auto', mb: 2 }}>
              {selectedPlanSets.map((set, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                  <Typography><strong>ชุดที่ {index + 1}:</strong></Typography>
                  <Typography>แผน: {set.plan?.code} ({set.plan?.doc_no})</Typography>
                  <Typography>ไลน์ผลิต: {set.line?.line_name}</Typography>
                  <Typography>กลุ่มเวลา: {set.group?.rm_group_name}</Typography>
                </Box>
              ))}
            </Box>
          )}

          <Typography>น้ำหนักรวม: {weighttotal} กก.</Typography>
          {level_eu !== "-" && <Typography>Level Eu: {level_eu}</Typography>}
          <Typography>ผู้ดำเนินการ: {operator}</Typography>

          {/* แสดงข้อมูลใหม่ที่เพิ่มเข้ามา */}
          {/* {cookedTime && <Typography>เวลาอบเสร็จ/ต้มเสร็จ: {cookedTime}</Typography>}
          {preparedTime && <Typography>เวลาเตรียมเสร็จ: {preparedTime}</Typography>}
          {mixtime && <Typography>เวลาเริ่มผสม: {mixtime}</Typography>} */}
          {cookedTime && <Typography>เวลาอบเสร็จ/ต้มเสร็จ: {formatDateTime(cookedTime)}</Typography>}
          {preparedTime && <Typography>เวลาเตรียมเสร็จ: {formatDateTime(preparedTime)}</Typography>}
          {gravyTime && <Typography>เวลาใส่ Gravy: {formatDateTime(gravyTime)}</Typography>}
          {mixtime && <Typography>เวลาเริ่มผสม: {formatDateTime(mixtime)}</Typography>}
          {numberOfTrays && <Typography>จำนวนถาด: {numberOfTrays}</Typography>}
          {selectedProcessType && <Typography>ประเภทการแปรรูป: {selectedProcessType.process_name}</Typography>}

          {hu && <Typography>HU Number: {hu}</Typography>}

          {emulsionweightTotal && (
            <Typography sx={{ mt: 1 }}>
              <strong>น้ำหนัก Emulsion รวม: {emulsionweightTotal} กก.</strong>
            </Typography>
          )}

          {selectedMaterials && selectedMaterials.length > 0 && (
            <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>รายการวัตถุดิบ Emulsion:</Typography>
              <Box sx={{ maxHeight: '200px', overflow: 'auto' }}>
                {selectedMaterials.map((matObj, idx) => (
                  <Box key={idx} sx={{ mb: 1, p: 1, backgroundColor: 'white', borderRadius: 1 }}>
                    <Typography variant="body2">
                      <strong>Material:</strong> {matObj.mat || "-"} |
                      <strong> Batch:</strong> {matObj.batch || "-"} |
                      <strong> HU:</strong> {matObj.hu || "-"} |
                      <strong> Weight:</strong> {matObj.weight || "-"} กก. |
                      <strong> Level:</strong> {matObj.level_eu || "-"}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={onClose} disabled={isLoading}>
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'กำลังบันทึก...' : 'ยืนยันทั้งหมด'}
            </Button>
          </Stack>
        </ModalContent>
      </Dialog>

      <ModalAlert open={showAlert} onClose={handleAlertClose} />
    </div>
  );
};

const DataReviewSAP = ({ open, onClose, material, batch, emulsionweightTotal, hu, selectedMaterials }) => {
  const [selectedPlanSets, setSelectedPlanSets] = useState([]);
  const [materialName, setMaterialName] = useState("");
  const [production, setProduction] = useState([]);
  const deliveryLocation = "บรรจุ";
  const [emulsion, setemulsion] = useState("false");
  const [jobType, setJobType] = useState("ผสมวัตถุดิบ");
  const [weighttotal, setWeighttotal] = useState("");
  const [group, setGroup] = useState([]);
  const [operator, setOperator] = useState("");
  const [isConfirmProdOpen, setIsConfirmProdOpen] = useState(false);
  const [weightError, setWeightError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allLinesByType, setAllLinesByType] = useState({});
  const [showDropdowns, setShowDropdowns] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [level_eu, setEuLevel] = useState("-");
  const [canSelectEu, setCanSelectEu] = useState(false);
  const [gravyTime, setGravyTime] = useState('');

  // เก็บข้อมูล emulsion ที่ส่งเข้ามา
  const [currentEmulsionWeight, setCurrentEmulsionWeight] = useState("");
  const [currentSelectedMaterials, setCurrentSelectedMaterials] = useState([]);

  // State ใหม่สำหรับฟิลด์ที่เพิ่มเข้ามา
  const [cookedTime, setCookedTime] = useState('');
  const [preparedTime, setPreparedTime] = useState('');
  const [mixtime, setMixtime] = useState('');
  const [numberOfTrays, setNumberOfTrays] = useState('');
  const [selectedProcessType, setSelectedProcessType] = useState('');
  const [processTypes, setProcessTypes] = useState([]);

  // State สำหรับ validation
  const [trayError, setTrayError] = useState(false);
  const [processTypeError, setProcessTypeError] = useState(false);
  const [preparedTimeError, setPreparedTimeError] = useState(false);
  const [mixtimeError, setMixtimeError] = useState(false);

  // อัปเดตข้อมูล emulsion เมื่อ props เปลี่ยน
  useEffect(() => {
    console.log("DataReviewSAP received props:", {
      material,
      batch,
      emulsionweightTotal,
      selectedMaterials
    });

    setCurrentEmulsionWeight(emulsionweightTotal || "");
    setCurrentSelectedMaterials(selectedMaterials || []);
  }, [material, batch, emulsionweightTotal, selectedMaterials]);

  useEffect(() => {
    if (material) {
      fetchMaterialName();
      fetchProduction();
      fetchGroup();
    }
  }, [material]);

  useEffect(() => {
    if (open) {
      fetchUserDataFromLocalStorage();
      // ตั้งค่าเวลาเตรียมเสร็จเป็นเวลาปัจจุบัน
      setPreparedTime(dayjs().toISOString());
      setMixtime(dayjs().toISOString());
    }
  }, [open]);

  // เพิ่ม useEffect สำหรับดึงข้อมูล Process Types
  useEffect(() => {
    const fetchProcessTypes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/fetchProcess`);
        console.log("API Response:", response.data);

        if (response.status === 200 && Array.isArray(response.data.data)) {
          setProcessTypes(response.data.data);
        } else {
          console.error("Unexpected API response format:", response.data);
        }
      } catch (error) {
        console.error("Error fetching process types:", error);
      }
    };

    if (open) {
      fetchProcessTypes();
    }
  }, [open]);

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

  const fetchMaterialName = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/fetchRawMatName`, { params: { mat: material } });
      if (response.data.success) {
        setMaterialName(response.data.data[0]?.mat_name || "ไม่พบชื่อวัตถุดิบ");
        const rmTypeId = response.data.data[0]?.rm_type_id;
        const allowedTypes = [3, 6, 7, 8];
        setCanSelectEu(allowedTypes.includes(rmTypeId));

        if (!allowedTypes.includes(rmTypeId)) {
          setEuLevel("-");
        }
      }
    } catch (error) {
      console.error("Error fetching material name:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProduction = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/fetchProduction`, { params: { mat: material } });
      if (response.data.success) {
        setProduction(response.data.data);
        setAllLinesByType(response.data.allLinesByType || {});
      }
    } catch (error) {
      console.error("Error fetching production data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroup = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/fetchGroup`, { params: { mat: material } });
      if (response.data.success) {
        setGroup(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewPlanSet = () => {
    setSelectedPlanSets([...selectedPlanSets, {
      plan: null,
      line: null,
      group: null
    }]);
  };

  const updatePlanSet = (index, field, value) => {
    const updated = [...selectedPlanSets];
    updated[index][field] = value;

    if (field === 'plan' && value) {
      updated[index].line = null;
      updated[index].group = null;
    }

    setSelectedPlanSets(updated);
  };

  const handleRequestDelete = (index) => {
    const planName = selectedPlanSets[index].plan
      ? `${selectedPlanSets[index].plan.code} (${selectedPlanSets[index].plan.doc_no})`
      : null;
    setPlanToDelete({ index, planName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (planToDelete !== null) {
      const updated = selectedPlanSets.filter((_, i) => i !== planToDelete.index);
      setSelectedPlanSets(updated);
    }
    setDeleteDialogOpen(false);
    setPlanToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setPlanToDelete(null);
  };

  const validateWeight = (value) => {
    const regex = /^\d*\.?\d*$/;
    return regex.test(value);
  };

  const euOptions = [
    { value: "-", label: "-" },
    ...Array.from({ length: 10 }, (_, i) => ({
      value: (i + 1).toString(),
      label: (i + 1).toString()
    }))
  ];

  const handleWeightChange = (e) => {
    const value = e.target.value;
    if (value === "" || validateWeight(value)) {
      setWeighttotal(value);
      setWeightError(false);
    } else {
      setWeightError(true);
    }
  };

  const handleTrayChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setNumberOfTrays(value);
      setTrayError(false);
    }
  };

  const isFutureTime = (selectedTime) => {
    if (!selectedTime) return false;
    const selectedDate = dayjs(selectedTime);
    const now = dayjs();
    return selectedDate.isAfter(now);
  };

  const isFormComplete = () => {
    if (!weighttotal || isNaN(parseFloat(weighttotal)) || parseFloat(weighttotal) <= 0) {
      return false;
    }

    if (!operator) {
      return false;
    }

    // ตรวจสอบฟิลด์ใหม่
    if (!preparedTime || isFutureTime(preparedTime)) {
      return false;
    }
    if (!mixtime || isFutureTime(mixtime)) {
      return false;
    }

    if (cookedTime && isFutureTime(cookedTime)) {
      return false;
    }

    if (!numberOfTrays || isNaN(parseInt(numberOfTrays, 10))) {
      return false;
    }

    if (!selectedProcessType) {
      return false;
    }

    // ถ้าเป็น emulsion = "true" ไม่ต้องเช็ค plan sets
    if (emulsion === "true") {
      return true;
    }

    return selectedPlanSets.every(set =>
      set.plan && set.line && set.group
    );
  };

  const resetForm = () => {
    setSelectedPlanSets([]);
    setemulsion("false");
    setOperator("");
    setWeighttotal("");
    setEuLevel("-");
    setShowDropdowns(true);
    setCurrentEmulsionWeight("");
    setCurrentSelectedMaterials([]);
    setCookedTime('');
    setPreparedTime('');
    setMixtime('');
    setNumberOfTrays('');
    setSelectedProcessType('');
    setTrayError(false);
    setProcessTypeError(false);
    setPreparedTimeError(false);
    setMixtimeError(false);
    setGravyTime('');
  };

  const handleSaveSuccess = () => {
    resetForm();
    onClose();
  };

  const handleConfirm = () => {
    if (!weighttotal || isNaN(parseFloat(weighttotal)) || parseFloat(weighttotal) <= 0) {
      setErrorMessage("กรุณากรอกน้ำหนักที่ถูกต้อง");
      setSnackbarOpen(true);
      return;
    }

    // ตรวจสอบฟิลด์ใหม่
    if (!numberOfTrays || isNaN(parseInt(numberOfTrays, 10))) {
      setTrayError(true);
      setErrorMessage("กรุณากรอกจำนวนถาดที่ถูกต้อง");
      setSnackbarOpen(true);
      return;
    }

    if (gravyTime && isFutureTime(gravyTime)) {
      setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาใส่ Gravy ได้");
      setSnackbarOpen(true);
      return;
    }

    if (!selectedProcessType) {
      setProcessTypeError(true);
      setErrorMessage("กรุณาเลือกประเภทการแปรรูป");
      setSnackbarOpen(true);
      return;
    }

    if (!preparedTime) {
      setPreparedTimeError(true);
      setErrorMessage("กรุณากรอกวันที่เตรียมเสร็จ");
      setSnackbarOpen(true);
      return;
    }
    if (!mixtime) {
      setMixtimeError(true);
      setErrorMessage("กรุณากรอกวันที่เริ่มผสม");
      setSnackbarOpen(true);
      return;
    }

    if (isFutureTime(preparedTime)) {
      setPreparedTimeError(true);
      setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาการเตรียมเสร็จได้");
      setSnackbarOpen(true);
      return;
    }
    if (isFutureTime(mixtime)) {
      setMixtimeError(true);
      setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาการเริ่มผสมได้");
      setSnackbarOpen(true);
      return;
    }

    if (cookedTime && isFutureTime(cookedTime)) {
      setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาอบเสร็จ/ต้มเสร็จได้");
      setSnackbarOpen(true);
      return;
    }

    if (!isFormComplete()) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      setSnackbarOpen(true);
      return;
    }

    setIsConfirmProdOpen(true);
  };

  const toggleDropdowns = () => {
    setShowDropdowns(!showDropdowns);
  };

  // const formatDateTime = (dateTimeStr) => {
  //   if (!dateTimeStr) return '';
  //   return new Intl.DateTimeFormat("en-GB", {
  //     day: "2-digit",
  //     month: "2-digit",
  //     year: "numeric",
  //     hour: "2-digit",
  //     minute: "2-digit",
  //     hour12: false,
  //   }).format(new Date(dateTimeStr));
  // };

  return (
    <>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          onClose();
        }}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            margin: '16px'
          }
        }}
      >
        <ModalContent>
          <Typography variant="h6" sx={{ mb: 2 }}>บันทึกการเบิกวัตถุดิบ</Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography>Material: {material}</Typography>
              <Typography>Material Name: {materialName}</Typography>
              <Typography>Batch: {batch}</Typography>

              {currentEmulsionWeight && (
                <Typography sx={{ mt: 1, color: 'primary.main', fontWeight: 'bold' }}>
                  น้ำหนักรวม: {currentEmulsionWeight} กก.
                </Typography>
              )}

              {currentSelectedMaterials && currentSelectedMaterials.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    รายการวัตถุดิบ Emulsion ({currentSelectedMaterials.length} รายการ):
                  </Typography>
                  <Box sx={{ maxHeight: '150px', overflow: 'auto', mt: 1 }}>
                    {currentSelectedMaterials.map((matObj, idx) => (
                      <Typography key={idx} variant="body2" sx={{ fontSize: '0.85rem', ml: 1 }}>
                        • {matObj.mat || "-"} (Batch: {matObj.batch || "-"},
                        Weight: {matObj.weight || "-"}กก., Level: {matObj.level_eu || "-"})
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Box>
              <TextField
                label="ผู้ดำเนินการ"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
                required
              />

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField
                  label="น้ำหนักรวม (กก.)"
                  value={weighttotal}
                  onChange={handleWeightChange}
                  error={weightError}
                  helperText={weightError ? "กรุณากรอกเฉพาะตัวเลขเท่านั้น" : ""}
                  fullWidth
                  size="small"
                  required
                  inputProps={{
                    inputMode: 'decimal',
                    pattern: '[0-9]*\\.?[0-9]*'
                  }}
                  sx={{ flex: 1 }}
                />

                <FormControl
                  size="small"
                  sx={{
                    flex: 1,
                    opacity: canSelectEu ? 1 : 0.6
                  }}
                >
                  <InputLabel id="eu-level-label">Level Eu</InputLabel>
                  <Select
                    labelId="eu-level-label"
                    value={level_eu}
                    onChange={(e) => setEuLevel(e.target.value)}
                    label="EU Level"
                    disabled={!canSelectEu}
                    required={canSelectEu}
                  >
                    {euOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {canSelectEu && (
                    <FormHelperText>กรุณาเลือกระดับ EU</FormHelperText>
                  )}
                </FormControl>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* ส่วนฟิลด์ใหม่ */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              ข้อมูลการแปรรูป
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              {/* เวลาอบเสร็จ/ต้มเสร็จ */}
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
                  timeSteps={{ minutes: 1 }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small"
                    }
                  }}
                />
              </LocalizationProvider>

              {/* วันที่เตรียมเสร็จ */}
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="วันที่เตรียมเสร็จ"
                  value={preparedTime ? dayjs(preparedTime) : null}
                  onChange={(newValue) => {
                    if (newValue && newValue.isAfter(dayjs())) {
                      setPreparedTimeError(true);
                      setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาการเตรียมเสร็จได้");
                      setSnackbarOpen(true);
                      return;
                    }
                    setPreparedTime(newValue?.toISOString() || "");
                    setPreparedTimeError(false);
                  }}
                  maxDateTime={dayjs()}
                  ampm={false}
                  timeSteps={{ minutes: 1 }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      required: true,
                      error: preparedTimeError,
                      helperText: preparedTimeError ? "กรุณากรอกวันที่เตรียมเสร็จที่ถูกต้อง และไม่ใช่เวลาอนาคต" : ""
                    }
                  }}
                />
              </LocalizationProvider>

              {/* วันที่เริ่มผสม */}
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="วันที่เริ่มผสม"
                  value={mixtime ? dayjs(mixtime) : null}
                  onChange={(newValue) => {
                    if (newValue && newValue.isAfter(dayjs())) {
                      setMixtimeError(true);
                      setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาการเริ่มผสมได้");
                      setSnackbarOpen(true);
                      return;
                    }
                    setMixtime(newValue?.toISOString() || "");
                    setMixtimeError(false);
                  }}
                  maxDateTime={dayjs()}
                  ampm={false}
                  timeSteps={{ minutes: 1 }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      required: true,
                      error: mixtimeError,
                      helperText: mixtimeError ? "กรุณากรอกวันที่เริ่มผสมที่ถูกต้อง และไม่ใช่เวลาอนาคต" : ""
                    }
                  }}
                />
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="เวลาใส่ Gravy"
                  value={gravyTime ? dayjs(gravyTime) : null}
                  onChange={(newValue) => {
                    if (newValue && newValue.isAfter(dayjs())) {
                      setErrorMessage("ไม่สามารถเลือกเวลาอนาคตเป็นเวลาใส่ Gravy ได้");
                      setSnackbarOpen(true);
                      return;
                    }
                    setGravyTime(newValue?.toISOString() || "");
                  }}
                  maxDateTime={dayjs()}
                  ampm={false}
                  timeSteps={{ minutes: 1 }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small"
                      // ไม่มี required เพราะไม่บังคับ
                    }
                  }}
                />
              </LocalizationProvider>

              {/* จำนวนถาด */}
              <TextField
                label="จำนวนถาด"
                variant="outlined"
                fullWidth
                size="small"
                value={numberOfTrays}
                onChange={handleTrayChange}
                error={trayError}
                helperText={trayError ? "กรุณากรอกจำนวนเป็นตัวเลขเต็มที่ถูกต้อง" : ""}
                required
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*'
                }}
              />

              {/* ประเภทการแปรรูป */}
              <FormControl
                fullWidth
                size="small"
                variant="outlined"
                error={processTypeError}
                required
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
                  <FormHelperText>
                    กรุณาเลือกประเภทการแปรรูป
                  </FormHelperText>
                )}
              </FormControl>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {emulsion === "false" && (
            <>
              {/* แผนการผลิต */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">แผนการผลิต</Typography>
                <Box>
                  <IconButton onClick={toggleDropdowns} size="small" sx={{ mr: 1 }}>
                    <VisibilityIcon color={showDropdowns ? "primary" : "action"} />
                  </IconButton>
                  <Button
                    onClick={addNewPlanSet}
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                  >
                    เพิ่มแผน
                  </Button>
                </Box>
              </Box>

              <Box sx={{
                maxHeight: '400px',
                overflow: 'auto',
                mb: 2,
                '&::-webkit-scrollbar': {
                  width: '17px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f1f1f1',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#888',
                  borderRadius: '10px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  backgroundColor: '#555',
                },
              }}>
                {selectedPlanSets.map((set, index) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 2,
                      p: 2,
                      border: '1px solid #eee',
                      borderRadius: 1,
                      backgroundColor: '#f9f9f9'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography><strong>ชุดที่ {index + 1}</strong></Typography>
                      <Button
                        onClick={() => handleRequestDelete(index)}
                        startIcon={<DeleteIcon />}
                        color="error"
                        size="small"
                      >
                        ลบ
                      </Button>
                    </Box>

                    {showDropdowns && (
                      <>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                          <Autocomplete
                            sx={{ flex: 2 }}
                            options={production}
                            getOptionLabel={(option) => `${option.code} (${option.doc_no})`}
                            value={set.plan}
                            onChange={(e, newValue) => updatePlanSet(index, 'plan', newValue)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="แผนการผลิต"
                                size="small"
                                fullWidth
                                required
                              />
                            )}
                          />

                          <Autocomplete
                            sx={{ flex: 1 }}
                            options={set.plan?.line_type_id ? (allLinesByType[set.plan.line_type_id] || []) : []}
                            getOptionLabel={(option) => option.line_name}
                            value={set.line}
                            onChange={(e, newValue) => updatePlanSet(index, 'line', newValue)}
                            renderInput={(params) => (
                              <TextField {...params} label="เลือกไลน์ผลิต" size="small" fullWidth required />
                            )}
                            disabled={!set.plan}
                          />
                        </Box>

                        <Autocomplete
                          options={group}
                          getOptionLabel={(option) => option.rm_group_name}
                          value={set.group}
                          onChange={(e, newValue) => updatePlanSet(index, 'group', newValue)}
                          renderInput={(params) => (
                            <TextField {...params} label="กลุ่มเวลาการผลิต" size="small" fullWidth required />
                          )}
                          disabled={!set.plan}
                        />
                      </>
                    )}

                    {!showDropdowns && set.plan && (
                      <Box>
                        <Typography>
                          {set.plan.code} ({set.plan.doc_no}) - {set.line?.line_name || 'ยังไม่ได้เลือกไลน์'}
                        </Typography>
                        {set.group && (
                          <Typography sx={{ color: 'text.secondary' }}>
                            - {set.group.rm_group_name}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />
            </>
          )}

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={onClose}
              startIcon={<CancelIcon />}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={!isFormComplete() || isLoading}
              startIcon={<CheckCircleIcon />}
            >
              {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
            </Button>
          </Box>
        </ModalContent>
      </Dialog>

      <ConfirmProdModal
        open={isConfirmProdOpen}
        onClose={() => setIsConfirmProdOpen(false)}
        material={material}
        materialName={materialName}
        batch={batch}
        selectedPlanSets={selectedPlanSets.filter(set => set.plan && set.line && set.group)}
        deliveryLocation={deliveryLocation}
        emulsion={emulsion}
        operator={operator}
        weighttotal={weighttotal}
        level_eu={level_eu}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onSuccess={handleSaveSuccess}
        emulsionweightTotal={currentEmulsionWeight}
        hu={hu}
        selectedMaterials={currentSelectedMaterials}
        // cookedTime={cookedTime ? formatDateTime(cookedTime) : null}
        // preparedTime={preparedTime ? formatDateTime(preparedTime) : null}
        // mixtime={mixtime ? formatDateTime(mixtime) : null}
        cookedTime={cookedTime}           // ✅ แทนที่ cookedTime ? formatDateTime(cookedTime) : null
        preparedTime={preparedTime}       // ✅ แทนที่ preparedTime ? formatDateTime(preparedTime) : null
        mixtime={mixtime}                 // ✅ แทนที่ mixtime ? formatDateTime(mixtime) : null
        numberOfTrays={numberOfTrays}
        selectedProcessType={selectedProcessType}
        gravyTime={gravyTime}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        planName={planToDelete?.planName}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackbarOpen(false)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DataReviewSAP;