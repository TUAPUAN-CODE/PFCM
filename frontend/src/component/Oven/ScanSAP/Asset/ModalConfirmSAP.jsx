
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
axios.defaults.withCredentials = true;
import { styled } from "@mui/system";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

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
    width: '10px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#888',
    borderRadius: '5px',
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
  withdraw,
  batch,
  selectedPlanSets,
  deliveryLocation,
  operator,
  weighttotal,
  level_eu,
  isLoading,
  setIsLoading,
  onSuccess
}) => {
  const [showAlert, setShowAlert] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() + 7);
    const formattedDateTime = currentDateTime.toISOString();

    // ไม่ต้องบวก 7 ชั่วโมงสำหรับ withdraw เพราะระบบส่งค่าเป็นเวลาไทยอยู่แล้ว
    const formattedWithdraw = formatCookedDateTime(withdraw, false);

    const weightPerPlan = parseFloat(weighttotal) / selectedPlanSets.length;

    const formattedEuLevel = level_eu === "NULL" ? null : level_eu !== "" ? `Eu ${level_eu}` : "-";
    try {
      setIsLoading(true);
      const requests = selectedPlanSets.map(set => {
        const payload = {
          mat: material,
          batch: batch,
          productId: set.plan.prod_id,
          line_name: set.line.line_name,
          groupId: [set.group.rm_group_id],
          Dest: deliveryLocation,
          receiver: operator,
          withdraw: formattedWithdraw,
          userID: userId,
          operator: operator,
          datetime: formattedDateTime,
          weight: weightPerPlan,
          level_eu: formattedEuLevel, // ใช้ค่าที่เพิ่ม "Eu" แล้ว
        };
        return axios.post(`${API_URL}/api/oven/saveRMForProd`, payload);
      });

      const responses = await Promise.all(requests);
      if (responses.every(res => res.status === 200)) {
        if (onSuccess) onSuccess();
        setShowAlert(true);
        onClose();
      }
    } catch (error) {
      console.error("Error during API call:", error);
      setError("เกิดข้อผิดพลาดในการบันทึกข้อมูลบางส่วน");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCookedDateTime = (dateTimeString, shouldAddHours = true) => {
    const date = new Date(dateTimeString);

    // บวก 7 ชั่วโมงเฉพาะเมื่อจำเป็น (สำหรับ cooked datetime)
    if (shouldAddHours) {
      date.setHours(date.getHours() + 7);
    }

    // สร้างรูปแบบ "YYYY-MM-DD HH:MM:SS" สำหรับ SQL
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) setUserId(storedUserId);
  }, []);

  const handleAlertClose = () => {
    setShowAlert(false);
  };

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
          <Typography variant="h6" sx={{ mb: 2 }}>ยืนยันข้อมูลการผลิต</Typography>

          <Box sx={{ mb: 2 }}>
            <Typography>Material: {material}</Typography>
            <Typography>Material Name: {materialName}</Typography>
            <Typography>Batch: {batch}</Typography>
            <Typography>น้ำหนักรวม: {weighttotal} กก.</Typography>
            {level_eu !== "" && <Typography>Level Eu : {level_eu}</Typography>}

            <Typography>วันที่เวลาเบิก: {new Date(withdraw).toLocaleString('th-TH')}</Typography>
            <Typography>ผู้ดำเนินการ: {operator}</Typography>
            <Typography>สถานที่จัดส่ง: {deliveryLocation}</Typography>
          </Box>

          <Box sx={{ maxHeight: '400px', overflow: 'auto', mb: 2 }}>
            {selectedPlanSets.map((set, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                <Typography><strong>ชุดที่ {index + 1}:</strong></Typography>
                <Typography>แผน: {set.plan.code} ({set.plan.doc_no})</Typography>
                <Typography>ไลน์ผลิต: {set.line.line_name}</Typography>
                <Typography>กลุ่มเวลา: {set.group.rm_group_name}</Typography>
              </Box>
            ))}
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
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
              disabled={isLoading}
              startIcon={<CheckCircleIcon />}
              sx={{
                backgroundColor: '#41a2e6',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#41a2e6',
                }
              }}
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

const DataReviewSAP = ({ open, onClose, material, batch }) => {
  const [selectedPlanSets, setSelectedPlanSets] = useState([]);
  const [materialName, setMaterialName] = useState("");
  const [production, setProduction] = useState([]);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [weighttotal, setWeighttotal] = useState("");
  const [withdraw, setWithdraw] = useState("");
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
  const [level_eu, setEuLevel] = useState("");  // Changed from "-" to empty string
  const [canSelectEu, setCanSelectEu] = useState(false);  // Added state to track if EU level can be selected


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

        // Reset EU level to default if not selectable
        if (!allowedTypes.includes(rmTypeId)) {
          setEuLevel("");
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

  const handleWeightChange = (e) => {
    const value = e.target.value;
    if (value === "" || validateWeight(value)) {
      setWeighttotal(value);
      setWeightError(false);
    } else {
      setWeightError(true);
    }
  };

  const euOptions = [
    { value: "", label: "" },
    { value: "NULL", label: "-" }, // เพิ่มตัวเลือกเครื่องหมาย "-"
    ...Array.from({ length: 10 }, (_, i) => ({
      value: (i + 1).toString(),
      label: (i + 1).toString()
    }))
  ];

  const isFormComplete = () => {
    if (!weighttotal || isNaN(parseFloat(weighttotal)) || parseFloat(weighttotal) <= 0) {
      return false;
    }

    if (!operator || !withdraw || !deliveryLocation) {
      return false;
    }

    // กรณีที่ต้องเลือก EU แต่ยังไม่ได้เลือก
    if (canSelectEu && !level_eu) {
      return false;
    }

    return selectedPlanSets.every(set =>
      set.plan && set.line && set.group
    );
  };

  const resetForm = () => {
    setSelectedPlanSets([]);
    setDeliveryLocation("");
    setOperator("");
    setWithdraw("");
    setWeighttotal("");
    setEuLevel("");  // Reset to empty string
    setShowDropdowns(true);
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

    if (canSelectEu && (level_eu === "" || !level_eu)) {
      setErrorMessage("กรุณาเลือกระดับ EU");
      setSnackbarOpen(true);
      return;
    }

    if (!isFormComplete()) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบทุกชุดแผน");
      setSnackbarOpen(true);
      return;
    }

    setIsConfirmProdOpen(true);
  };

  const toggleDropdowns = () => {
    setShowDropdowns(!showDropdowns);
  };

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
                    error={canSelectEu && level_eu === ""}
                  >
                    {euOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {canSelectEu && (
                    <FormHelperText error={level_eu === ""}>
                      {level_eu === "" ? "กรุณาเลือกระดับ EU" : ""}
                    </FormHelperText>
                  )}
                </FormControl>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

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
              width: '10px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#888',
              borderRadius: '5px',
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

          <Box sx={{ mb: 2 }}>
            <Typography sx={{ mb: 1 }}>วันที่เบิกวัตถุดิบจากห้องเย็นใหญ่</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="วันที่เบิก"
                  value={withdraw ? dayjs(withdraw) : null}
                  onChange={(newValue) => {
                    if (newValue && newValue.isAfter(dayjs())) {
                      alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                      return;
                    }
                    setWithdraw(newValue?.toISOString() || "");
                  }}
                  maxDateTime={dayjs()} // ห้ามเลือกเวลาในอนาคต
                  ampm={false} // ใช้รูปแบบ 24 ชั่วโมง (ไม่มี AM/PM)
                  timeSteps={{ minutes: 1 }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      required: true
                    }
                  }}
                />
              </LocalizationProvider>
              <Button
                variant="outlined"
                onClick={() => {
                  const now = new Date();
                  now.setHours(now.getHours() + 7); // เวลาไทย
                  const formattedDateTime = now.toISOString().slice(0, 16);
                  setWithdraw(formattedDateTime);
                }}
                sx={{ whiteSpace: 'nowrap' }}
              >
                เลือกเวลาตอนนี้
              </Button>
            </Box>
          </Box>


          <Box sx={{ mb: 2 }}>
            <Typography sx={{ mb: 1 }}>สถานที่จัดส่ง</Typography>
            <RadioGroup
              row
              name="location"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              sx={{ flexWrap: 'wrap' }}
            >
              <FormControlLabel value="ไปจุดเตรียม" control={<Radio />} label="จุดเตรียม" />
              <FormControlLabel value="เข้าห้องเย็น-รอรถเข็น" control={<Radio />} label="ห้องเย็น" />
            </RadioGroup>
          </Box>

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
              sx={{
                backgroundColor: '#41a2e6',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#41a2e6',
                }
              }}
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
        operator={operator}
        withdraw={withdraw}
        weighttotal={weighttotal}
        level_eu={level_eu}  // Pass EU level to confirm modal
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onSuccess={handleSaveSuccess}
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