import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  FormControl,
  Alert,
  Autocomplete,
  TextField,
  IconButton,
  Tooltip,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  CircularProgress,
  DialogTitle,
  DialogActions,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { IoClose, IoInformationCircle } from "react-icons/io5";
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import QrScanner from "qr-scanner";
import axios from "axios";
import { styled } from "@mui/system";

axios.defaults.withCredentials = true;

const API_URL = import.meta.env.VITE_API_URL;

const CloseButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  top: theme.spacing(1),
  right: theme.spacing(1),
  color: theme.palette.grey[600],
}));

// Modal Alert Success Component
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

// Delete Confirmation Dialog
const DeleteConfirmationDialog = ({ open, onClose, onConfirm, planName }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>ยืนยันการลบแผน</DialogTitle>
      <DialogContent>
        <Typography>
          {planName ? `คุณแน่ใจหรือไม่ว่าต้องการลบแผน ${planName}?` : "คุณแน่ใจหรือไม่ว่าต้องการลบแผนนี้?"}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">ยกเลิก</Button>
        <Button onClick={onConfirm} color="error" variant="contained">ลบ</Button>
      </DialogActions>
    </Dialog>
  );
};

// Confirm Production Modal (for SAP data)
const ConfirmProdModalSAP = ({
  open,
  onClose,
  material,
  materialName,
  batch,
  selectedPlanSets,
  emulsion,
  batchmix,
  operator,
  withdraw,
  cooked_date,
  rmit_date,
  qc_date,
  detail,
  come_cold_date,
  out_cold_date,
  come_cold_date_two,
  out_cold_date_two,
  come_cold_date_three,
  out_cold_date_three,
  hu,
  weighttotal,
  tray_count,
  isLoading,
  setIsLoading,
  onSuccess,
  level_eu,
  emu_status
}) => {
  const [showAlert, setShowAlert] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);

 const formatCookedDateTime = (dateTimeString) => {
  if (!dateTimeString) return null;
  // ถ้าเก็บเป็น "YYYY-MM-DD HH:mm:ss" แล้ว ส่งตรงๆ ได้เลย
  return dateTimeString;
 };


  const handleConfirm = async () => {
    const formattedDateTime = dayjs().toISOString();
    // setWithdraw(formattedDateTime);
    const weightPerPlan = parseFloat(weighttotal) / (selectedPlanSets.length || 1);
    const formattedEuLevel = level_eu !== "-" ? `Eu ${level_eu}` : "-";
    const status = emu_status || "pending";

    // Format withdraw date
    const formattedWithdraw = withdraw ? formatCookedDateTime(withdraw, false) : null;
    const formattedCookedDate = cooked_date ? formatCookedDateTime(cooked_date, false) : null;
    const formattedRmitDate = rmit_date ? formatCookedDateTime(rmit_date, false) : null;
    const formattedQcDate = qc_date ? formatCookedDateTime(qc_date, false) : null;
    const formattedComeColdDate = come_cold_date ? formatCookedDateTime(come_cold_date, false) : null;
    const formattedOutColdDate = out_cold_date ? formatCookedDateTime(out_cold_date, false) : null;
    const formattedComeColdDateTwo = come_cold_date_two ? formatCookedDateTime(come_cold_date_two, false) : null;
    const formattedOutColdDateTwo = out_cold_date_two ? formatCookedDateTime(out_cold_date_two, false) : null;
    const formattedComeColdDateThree = come_cold_date_three ? formatCookedDateTime(come_cold_date_three, false) : null;
    const formattedOutColdDateThree = out_cold_date_three ? formatCookedDateTime(out_cold_date_three, false) : null;

    try {
      setIsLoading(true);
      const url =
        batchmix === "true"
          ? `${API_URL}/api/prep/saveRMMixBatch/for/BatchMIX`
          : emulsion === "true"
            ? `${API_URL}/api/prep/saveRMForEmu/for/emulsion`
            : `${API_URL}/api/prep/create/rm/forprod`;

      const requests = (
        batchmix === "true"
          ? [{}]
          : emulsion === "true"
            ? [{}]
            : selectedPlanSets
      ).map(set => {
        const isEmulsion = emulsion === "true";
        const isBatchMix = batchmix === "true";

        const payload = {
          mat: material,
          batch: batch,
          productId: isEmulsion || isBatchMix ? null : set.plan?.prod_rm_id,
          line_name: isEmulsion || isBatchMix ? "" : set.line?.line_name || "",
          groupId:
            isEmulsion || isBatchMix
              ? set.group?.rm_group_id || null
              : set.group?.rm_group_id
                ? [set.group.rm_group_id]
                : [],
          Emulsion: emulsion,
          BatchMix: batchmix,
          receiver: operator,
          withdraw: formattedWithdraw,
          cooked_date: formattedCookedDate,
          rmit_date: formattedRmitDate,
          detail: detail,
          qc_date: formattedQcDate,
          come_cold_date: formattedComeColdDate,
          out_cold_date: formattedOutColdDate,
          come_cold_date_two: formattedComeColdDateTwo,
          out_cold_date_two: formattedOutColdDateTwo,
          come_cold_date_three: formattedComeColdDateThree,
          out_cold_date_three: formattedOutColdDateThree,
          hu: hu,
          userID: userId,
          operator: operator,
          datetime: formattedDateTime,
          weight: weightPerPlan,
          tray_count: tray_count,
          level_eu: formattedEuLevel,
          emu_status: status,
        };

        return axios.post(url, payload);
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

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) setUserId(storedUserId);
  }, []);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>ยืนยันข้อมูลการผลิต</Typography>
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
          <Typography>น้ำหนักรวม: {weighttotal} กก.</Typography>
          <Typography>จำนวนถาด: {tray_count}</Typography>
          {level_eu !== "-" && <Typography>Level Eu: {level_eu}</Typography>}
          <Typography>ผู้ดำเนินการ: {operator}</Typography>
          <Typography>วันที่เบิก: {withdraw ? new Date(withdraw).toLocaleString('th-TH') : '-'}</Typography>
          {cooked_date && <Typography>วันที่ต้ม/อบเสร็จ: {new Date(cooked_date).toLocaleString('th-TH')}</Typography>}
          {rmit_date && <Typography>วันที่เตรียมเสร็จ: {new Date(rmit_date).toLocaleString('th-TH')}</Typography>}
          {qc_date && <Typography>วันที่ QC ตรวจสอบ: {new Date(qc_date).toLocaleString('th-TH')}</Typography>}
          {come_cold_date && <Typography>วันที่เข้าห้องเย็นครั้งที่ 1: {new Date(come_cold_date).toLocaleString('th-TH')}</Typography>}
          {out_cold_date && <Typography>วันที่ออกห้องเย็นครั้งที่ 1: {new Date(out_cold_date).toLocaleString('th-TH')}</Typography>}
          {come_cold_date_two && <Typography>วันที่เข้าห้องเย็นครั้งที่ 2: {new Date(come_cold_date_two).toLocaleString('th-TH')}</Typography>}
          {out_cold_date_two && <Typography>วันที่ออกห้องเย็นครั้งที่ 2: {new Date(out_cold_date_two).toLocaleString('th-TH')}</Typography>}
          {come_cold_date_three && <Typography>วันที่เข้าห้องเย็นครั้งที่ 3: {new Date(come_cold_date_three).toLocaleString('th-TH')}</Typography>}
          {out_cold_date_three && <Typography>วันที่ออกห้องเย็นครั้งที่ 3: {new Date(out_cold_date_three).toLocaleString('th-TH')}</Typography>}
          <Typography>Hist. /ความหนืด / อุณหภูมิ Hist./Viscosity /temp © : {detail}</Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={onClose}>ยกเลิก</Button>
            <Button variant="contained" onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? 'กำลังบันทึก...' : 'ยืนยันทั้งหมด'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <ModalAlert open={showAlert} onClose={() => setShowAlert(false)} />
    </>
  );
};

// Main Integrated Modal
const ModalInputRM = ({ open, onClose, data, onSuccess }) => {
  const theme = useTheme();

  // Step control
  const [currentStep, setCurrentStep] = useState(1); // 1: Scan, 2: SAP Review

  // Camera/Scan states
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const rawMaterialInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanError, setScanError] = useState("");
  const [primaryError, setPrimaryError] = useState(false);
  const [secondaryError, setSecondaryError] = useState(false);
  const [huError, setHuError] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isRawMaterialFocused, setIsRawMaterialFocused] = useState(false);

  // Scanned data
  const [scannedMaterial, setScannedMaterial] = useState("");
  const [scannedBatch, setScannedBatch] = useState("");
  const [scannedHu, setScannedHu] = useState("");

  // SAP Review states
  const [selectedPlanSets, setSelectedPlanSets] = useState([]);
  const [materialName, setMaterialName] = useState("");
  const [production, setProduction] = useState([]);
  const [emulsion, setemulsion] = useState("false");
  const [batchmix, setbatchmix] = useState("false");
  const [weighttotal, setWeighttotal] = useState("");
  const [tray_count, setTrayCount] = useState("");
  const [withdraw, setWithdraw] = useState("");
  const [cooked_date, setCookedDate] = useState("");
  const [rmit_date, setRmitDate] = useState("");
  const [qc_date, setQcDate] = useState("");
  const [come_cold_date, setComeColdDate] = useState("");
  const [out_cold_date, setOutColdDate] = useState("");
  const [come_cold_date_two, setComeColdDateTwo] = useState("");
  const [out_cold_date_two, setOutColdDateTwo] = useState("");
  const [come_cold_date_three, setComeColdDateThree] = useState("");
  const [out_cold_date_three, setOutColdDateThree] = useState("");
  const [group, setGroup] = useState([]);
  const [operator, setOperator] = useState("");
  const [detail, setDetail] = useState("");
  const [isConfirmProdSAPOpen, setIsConfirmProdSAPOpen] = useState(false);
  const [weightError, setWeightError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [allLinesByType, setAllLinesByType] = useState({});
  const [showDropdowns, setShowDropdowns] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [level_eu, setEuLevel] = useState("-");
  const [canSelectEu, setCanSelectEu] = useState(false);
  const [emu_status, setEmuStatus] = useState("pending");

  // ========================= STEP 1: CAMERA/SCAN LOGIC =========================

  const fetchRawMaterials = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/rawmat/AllSearch`, { credentials: "include" });
      const responseData = await response.json();
      if (responseData.success) {
        const uniqueMaterials = Array.from(
          new Map(responseData.data.map(item => [item.mat, item])).values()
        );
        setRawMaterials(uniqueMaterials);
      } else {
        setScanError("ไม่สามารถดึงข้อมูลวัตถุดิบได้");
      }
    } catch (err) {
      setScanError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);

        const qrScanner = new QrScanner(
          videoRef.current,
          async (result) => {
            handleScannedData(result.data);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        qrScannerRef.current = qrScanner;
        qrScanner.start();
      }
    } catch (err) {
      setScanError("ไม่สามารถเปิดกล้องได้ โปรดตรวจสอบการยอมรับของอุปกรณ์");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    setCameraActive(false);
  };

  const handleScannedData = async (result) => {
    if (processing) return;
    setProcessing(true);

    try {
      const qrParts = result.split("|");

      if (qrParts.length < 3) {
        setScanError("รูปแบบ QR Code ไม่ถูกต้อง ต้องมีข้อมูล Raw Material, Batch และ HU");
        setProcessing(false);
        return;
      }

      const rawMaterial = qrParts[0].trim();
      const batch = qrParts[1].trim().toUpperCase();
      const huValue = qrParts[2].trim();

      if (batch.length !== 10) {
        setScanError(`Batch ต้องมี 10 ตัวอักษร (ได้รับ ${batch.length} ตัวอักษร)`);
        setSecondaryError(true);
        setProcessing(false);
        return;
      }

      if (huValue.length !== 9) {
        setScanError(`HU ต้องมี 9 หลัก (ได้รับ ${huValue.length} หลัก)`);
        setHuError(true);
        setProcessing(false);
        return;
      }

      setScannedMaterial(rawMaterial);
      setScannedBatch(batch);
      setScannedHu(huValue);
      setInputValue(rawMaterial);
      setPrimaryError(false);
      setSecondaryError(false);
      setHuError(false);
      setScanError("");

      try {
        const response = await fetch(
          `${API_URL}/api/checkRawMat?mat=${encodeURIComponent(rawMaterial)}`
        );
        const checkData = await response.json();

        if (response.ok) {
          setScanSuccess(true);
          setTimeout(() => {
            handleConfirmScan(rawMaterial, batch, huValue);
            setProcessing(false);
            setScanSuccess(false);
          }, 800);
        } else {
          setPrimaryError(true);
          setScanError(checkData.message || "ไม่พบข้อมูลวัตถุดิบในฐานข้อมูล");
          setProcessing(false);
        }
      } catch (err) {
        setScanError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
        setProcessing(false);
      }

    } catch (err) {
      setScanError("เกิดข้อผิดพลาดในการประมวลผล QR Code");
      setProcessing(false);
    }
  };

  const handleConfirmScan = (material, batch, hu) => {
    stopCamera();
    setCurrentStep(2);
  };

  const handleManualConfirmScan = async () => {
    if (processing) return;
    setProcessing(true);

    let hasError = false;

    if (!scannedMaterial) {
      setPrimaryError(true);
      setScanError("กรุณากรอกข้อมูล Raw Material");
      hasError = true;
    } else {
      setPrimaryError(false);
    }

    if (!scannedBatch) {
      setSecondaryError(true);
      setScanError("กรุณากรอกข้อมูล Batch");
      hasError = true;
    } else if (scannedBatch.length !== 10) {
      setSecondaryError(true);
      setScanError("Batch ต้องมี 10 ตัวอักษรเท่านั้น");
      hasError = true;
    } else {
      setSecondaryError(false);
    }

    if (!scannedHu) {
      setHuError(true);
      setScanError("กรุณากรอกข้อมูล HU");
      hasError = true;
    } else if (scannedHu.length !== 9) {
      setHuError(true);
      setScanError("HU ต้องมี 9 หลักเท่านั้น");
      hasError = true;
    } else {
      setHuError(false);
    }

    if (!hasError) {
      try {
        const response = await fetch(
          `${API_URL}/api/checkRawMat?mat=${encodeURIComponent(scannedMaterial)}`
        );
        const checkData = await response.json();

        if (response.ok) {
          handleConfirmScan(scannedMaterial, scannedBatch, scannedHu);
          setProcessing(false);
        } else {
          setPrimaryError(true);
          setScanError(checkData.message || "ไม่พบข้อมูลวัตถุดิบในฐานข้อมูล");
          setProcessing(false);
        }
      } catch (err) {
        setScanError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
        setProcessing(false);
      }
    } else {
      setProcessing(false);
    }
  };

  const processScannerInput = () => {
    if (!inputValue) return;

    const parts = inputValue.split('|');
    if (parts.length >= 3) {
      const var1 = parts[0].substring(0, 12);
      const var2 = parts[1].substring(0, 10);
      const var3 = parts[2].substring(0, 9);

      setScannedMaterial(var1);
      setScannedBatch(var2);
      setScannedHu(var3);
      setInputValue(var1);

      setScanSuccess(true);
      setTimeout(() => {
        handleConfirmScan(var1, var2, var3);
        setProcessing(false);
        setScanSuccess(false);
      }, 800);
    }
  };

  // ========================= STEP 2: SAP REVIEW LOGIC =========================

  useEffect(() => {
    if (currentStep === 2 && scannedMaterial) {
      fetchMaterialName();
      fetchProduction();
      fetchGroup();
      fetchUserDataFromLocalStorage();
    }
  }, [currentStep, scannedMaterial]);

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
      const response = await axios.get(`${API_URL}/api/fetchRawMatName`, { params: { mat: scannedMaterial } });
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
      const response = await axios.get(`${API_URL}/api/fetchProduction`, { params: { mat: scannedMaterial } });
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
      const response = await axios.get(`${API_URL}/api/fetchGroup`, { params: { mat: scannedMaterial } });
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

  const handleTrayCountChange = (e) => {
    const value = e.target.value;
    if (value === "" || validateWeight(value)) {
      setTrayCount(value);
    }
  };

const setCurrentTime = (setter) => {
  setter(dayjs().format("YYYY-MM-DD HH:mm:ss"));
};


  const isFormCompleteSAP = () => {
    if (!weighttotal || isNaN(parseFloat(weighttotal)) || parseFloat(weighttotal) <= 0) {
      return false;
    }
    if (!operator || !withdraw) {
      return false;
    }
    if (emulsion === "true" || batchmix === "true") {
      return true;
    }
    return selectedPlanSets.length > 0 && selectedPlanSets.every(set =>
      set.plan && set.line && set.group
    );
  };

  const handleConfirmSAPReview = () => {
    if (!weighttotal || isNaN(parseFloat(weighttotal)) || parseFloat(weighttotal) <= 0) {
      setErrorMessage("กรุณากรอกน้ำหนักที่ถูกต้อง");
      return;
    }
    if (!operator || !withdraw) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (emulsion !== "true" && batchmix !== "true") {
      if (selectedPlanSets.length === 0 || !selectedPlanSets.every(set => set.plan && set.line && set.group)) {
        setErrorMessage("กรุณากรอกข้อมูลให้ครบทุกชุดแผน");
        return;
      }
    }
    setIsConfirmProdSAPOpen(true);
  };

  const handleSAPSaveSuccess = () => {
    setIsConfirmProdSAPOpen(false);
    if (onSuccess) onSuccess();
    handleClose();
  };

  const toggleDropdowns = () => {
    setShowDropdowns(!showDropdowns);
  };

  // ========================= MODAL CONTROL =========================

  const resetAllStates = () => {
    setCurrentStep(1);
    setScannedMaterial("");
    setScannedBatch("");
    setScannedHu("");
    setInputValue("");
    setScanError("");
    setPrimaryError(false);
    setSecondaryError(false);
    setHuError(false);
    setScanSuccess(false);
    setProcessing(false);
    setSelectedPlanSets([]);
    setMaterialName("");
    setProduction([]);
    setemulsion("false");
    setbatchmix("false");
    setWeighttotal("");
    setTrayCount("");
    setWithdraw("");
    setCookedDate("");
    setRmitDate("");
    setDetail("");
    setQcDate("");
    setComeColdDate("");
    setOutColdDate("");
    setComeColdDateTwo("");
    setOutColdDateTwo("");
    setComeColdDateThree("");
    setOutColdDateThree("");
    setGroup([]);
    setOperator("");
    setWeightError(false);
    setErrorMessage("");
    setAllLinesByType({});
    setShowDropdowns(true);
    setEuLevel("-");
    setCanSelectEu(false);
    setEmuStatus("pending");
  };

  const handleClose = () => {
    stopCamera();
    resetAllStates();
    onClose();
  };

  useEffect(() => {
    if (open && currentStep === 1) {
      startCamera();
      fetchRawMaterials();
    }
    return () => {
      stopCamera();
    };
  }, [open, currentStep]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (isRawMaterialFocused && e.key !== 'Enter') {
        // Scanner input handling
      }
    };
    const handleKeyPress = (e) => {
      if (isRawMaterialFocused && e.key === 'Enter') {
        e.preventDefault();
        processScannerInput();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [open, isRawMaterialFocused, inputValue]);

  useEffect(() => {
    if (open && currentStep === 1 && rawMaterialInputRef.current) {
      const inputElement = rawMaterialInputRef.current.querySelector('input');
      if (inputElement) {
        inputElement.focus();
        setIsRawMaterialFocused(true);
      }
    }
  }, [open, currentStep]);

  const isFormValidScan = scannedMaterial && scannedBatch && scannedBatch.length === 10 && scannedHu && scannedHu.length === 9;

  // ========================= RENDER =========================

  return (
    <>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          handleClose();
        }}
        maxWidth={currentStep === 1 ? "xs" : "md"}
        fullWidth
      >
        <DialogContent>
          <CloseButton aria-label="close" onClick={handleClose}>
            <IoClose />
          </CloseButton>

          {/* STEP 1: SCAN QR CODE */}
          {currentStep === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
              <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
                สแกน Qr Code เพื่อรับข้อมูลวัตถุดิบ
              </Typography>

              {scanError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {scanError}
                </Alert>
              )}

              {scanSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  สแกน QR Code สำเร็จ! กำลังดำเนินการต่อ...
                </Alert>
              )}

              <Divider />

              <video
                ref={videoRef}
                style={{
                  width: "100%",
                  marginBottom: theme.spacing(2),
                  marginTop: "15px",
                  borderRadius: "4px",
                  border: scanSuccess ? "2px solid #4CAF50" : "2px solid #f0f0f0"
                }}
                autoPlay
                muted
              />

              <Box>
                <Autocomplete
                  id="raw-material-autocomplete"
                  options={rawMaterials}
                  fullWidth
                  loading={loading}
                  value={rawMaterials.find(mat => mat.mat === scannedMaterial) || null}
                  onChange={(event, newValue) => {
                    setScannedMaterial(newValue ? newValue.mat : '');
                    setPrimaryError(false);
                    setScanError("");
                  }}
                  inputValue={inputValue}
                  onInputChange={(event, newInputValue) => {
                    setInputValue(newInputValue);
                  }}
                  getOptionLabel={(option) => `${option.mat}`}
                  isOptionEqualToValue={(option, value) => option.mat === value.mat}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Raw Materials (พร้อมรับข้อมูลจากสแกนเนอร์)"
                      error={primaryError}
                      helperText={primaryError ? (scanError || "กรุณาเลือก Raw Material") : ""}
                      size="small"
                      margin="normal"
                      required
                      inputRef={rawMaterialInputRef}
                      onFocus={() => setIsRawMaterialFocused(true)}
                      onBlur={() => setIsRawMaterialFocused(false)}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            <IoInformationCircle color={theme.palette.info.main} />
                            {params.InputProps.endAdornment}
                          </>
                        ),
                        readOnly: scanSuccess
                      }}
                      sx={{
                        '& label': {
                          color: isRawMaterialFocused ? theme.palette.primary.main : 'inherit',
                        },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: isRawMaterialFocused ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.23)',
                          },
                        },
                      }}
                    />
                  )}
                  loadingText="กำลังโหลดข้อมูล..."
                  noOptionsText="ไม่พบข้อมูลวัตถุดิบที่ตรงกัน"
                />

                <Tooltip title="กรุณากรอกข้อมูล Batch (ต้องกรอก 10 ตัวอักษรเท่านั้น)">
                  <TextField
                    fullWidth
                    label="Batch (ต้องกรอก 10 ตัวอักษร)"
                    size="small"
                    value={scannedBatch}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      if (value.length <= 10) {
                        setScannedBatch(value);
                        setSecondaryError(false);
                        setScanError("");
                        setScanSuccess(false);
                      }
                    }}
                    error={secondaryError}
                    helperText={secondaryError ?
                      (scannedBatch.length === 0 ? "กรุณากรอกข้อมูล Batch" : "Batch ต้องมี 10 ตัวอักษรเท่านั้น")
                      : ""}
                    margin="normal"
                    required
                    InputProps={{
                      endAdornment: <IoInformationCircle color={theme.palette.info.main} />,
                      readOnly: scanSuccess
                    }}
                    inputProps={{
                      maxLength: 10,
                      pattern: ".{10}",
                      style: { textTransform: 'uppercase' }
                    }}
                  />
                </Tooltip>

                <Tooltip title="กรุณากรอกข้อมูล HU (ต้องกรอก 9 หลักเท่านั้น)">
                  <TextField
                    fullWidth
                    label="HU (ต้องกรอก 9 หลัก)"
                    size="small"
                    value={scannedHu}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 9) {
                        setScannedHu(value);
                        setHuError(false);
                        setScanError("");
                        setScanSuccess(false);
                      }
                    }}
                    error={huError}
                    helperText={huError ?
                      (scannedHu.length === 0 ? "กรุณากรอกข้อมูล HU" : "HU ต้องมี 9 หลักเท่านั้น")
                      : ""}
                    margin="normal"
                    required
                    InputProps={{
                      endAdornment: <IoInformationCircle color={theme.palette.info.main} />,
                      readOnly: scanSuccess
                    }}
                    inputProps={{
                      maxLength: 9,
                      pattern: "[0-9]{9}",
                      inputMode: 'numeric'
                    }}
                  />
                </Tooltip>

                <Divider sx={{ mt: 1 }} />

                <Box sx={{ display: "flex", justifyContent: "space-between", pt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<CancelIcon />}
                    style={{ backgroundColor: "#E74A3B", color: "#fff" }}
                    onClick={handleClose}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircleIcon />}
                    style={{
                      backgroundColor: isFormValidScan ? "#41a2e6" : "#cccccc",
                      color: "#fff",
                    }}
                    onClick={handleManualConfirmScan}
                    disabled={!isFormValidScan || processing}
                  >
                    ยืนยัน
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          {/* STEP 2: SAP REVIEW */}
          {currentStep === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>บันทึกการเบิกวัตถุดิบ</Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography>Material: {scannedMaterial}</Typography>
                  <Typography>Material Name: {materialName}</Typography>
                  <Typography>Batch: {scannedBatch}</Typography>
                  <Typography>HU: {scannedHu}</Typography>
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

                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
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
                    <TextField
                      label="จำนวนถาด"
                      value={tray_count}
                      onChange={handleTrayCountChange}
                      fullWidth
                      size="small"
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
                        label="Level Eu"
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

              {emulsion === "false" && batchmix === "false" && (
                <>
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

              {/* Date Time Pickers */}
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
                        setWithdraw(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
                      }}
                      maxDateTime={dayjs()}
                      ampm={false}
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
                    onClick={() => setCurrentTime(setWithdraw)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ mb: 1 }}>วันที่เวลาต้ม/อบเสร็จ</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="วันที่เวลาต้ม/อบเสร็จ"
                      value={cooked_date ? dayjs(cooked_date) : null}
                      onChange={(newValue) => {
                        if (newValue && newValue.isAfter(dayjs())) {
                          alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                          return;
                        }
                        setCookedDate(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
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
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentTime(setCookedDate)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ mb: 1 }}>วันที่เวลาเตรียมเสร็จ</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="วันที่เวลาเตรียมเสร็จ"
                      value={rmit_date ? dayjs(rmit_date) : null}
                      onChange={(newValue) => {
                        if (newValue && newValue.isAfter(dayjs())) {
                          alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                          return;
                        }
                        setRmitDate(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
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
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentTime(setRmitDate)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ mb: 1 }}>วันที่เวลา QC ตรวจสอบ</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="วันที่เวลา QC ตรวจสอบ"
                      value={qc_date ? dayjs(qc_date) : null}
                      onChange={(newValue) => {
                        if (newValue && newValue.isAfter(dayjs())) {
                          alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                          return;
                        }
                        setQcDate(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
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
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentTime(setQcDate)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ mb: 1 }}>วันที่เวลารับเข้าห้องเย็นครั้งที่ 1</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="วันที่เวลารับเข้าห้องเย็นครั้งที่ 1"
                      value={come_cold_date ? dayjs(come_cold_date) : null}
                      onChange={(newValue) => {
                        if (newValue && newValue.isAfter(dayjs())) {
                          alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                          return;
                        }
                        setComeColdDate(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
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
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentTime(setComeColdDate)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ mb: 1 }}>วันที่เวลาออกห้องเย็นครั้งที่ 1</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="วันที่เวลาออกห้องเย็นครั้งที่ 1"
                      value={out_cold_date ? dayjs(out_cold_date) : null}
                      onChange={(newValue) => {
                        if (newValue && newValue.isAfter(dayjs())) {
                          alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                          return;
                        }
                        setOutColdDate(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
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
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentTime(setOutColdDate)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ mb: 1 }}>วันที่เวลารับเข้าห้องเย็นครั้งที่ 2</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="วันที่เวลารับเข้าห้องเย็นครั้งที่ 2"
                      value={come_cold_date_two ? dayjs(come_cold_date_two) : null}
                      onChange={(newValue) => {
                        if (newValue && newValue.isAfter(dayjs())) {
                          alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                          return;
                        }
                       setComeColdDateTwo(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
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
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentTime(setComeColdDateTwo)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ mb: 1 }}>วันที่ส่งออกห้องเย็นครั้งที่ 2</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="วันที่ส่งออกห้องเย็นครั้งที่ 2"
                      value={out_cold_date_two ? dayjs(out_cold_date_two) : null}
                      onChange={(newValue) => {
                        if (newValue && newValue.isAfter(dayjs())) {
                          alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                          return;
                        }
                        setOutColdDateTwo(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
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
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentTime(setOutColdDateTwo)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ mb: 1 }}>วันที่เวลารับเข้าห้องเย็นครั้งที่ 3</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="วันที่เวลารับเข้าห้องเย็นครั้งที่ 3"
                      value={come_cold_date_three ? dayjs(come_cold_date_three) : null}
                      onChange={(newValue) => {
                        if (newValue && newValue.isAfter(dayjs())) {
                          alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                          return;
                        }
                        setComeColdDateThree(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
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
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentTime(setComeColdDateThree)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ mb: 1 }}>วันที่เวลาออกห้องเย็นครั้งที่ 3</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="วันที่เวลาออกห้องเย็นครั้งที่ 3"
                      value={out_cold_date_three ? dayjs(out_cold_date_three) : null}
                      onChange={(newValue) => {
                        if (newValue && newValue.isAfter(dayjs())) {
                          alert("ไม่สามารถเลือกเวลาในอนาคตได้");
                          return;
                        }
                        setOutColdDateThree(newValue ? newValue.format("YYYY-MM-DD HH:mm:ss") : "");
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
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentTime(setOutColdDateThree)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    เลือกเวลาตอนนี้
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <TextField
                  label="Hist. /ความหนืด / อุณหภูมิ Hist./Viscosity /temp ©"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                />
              </Box>

              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMessage}
                </Alert>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setCurrentStep(1)}
                  startIcon={<CancelIcon />}
                >
                  ย้อนกลับ
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirmSAPReview}
                  disabled={!isFormCompleteSAP() || isLoading}
                  startIcon={<CheckCircleIcon />}
                >
                  {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
                </Button>
              </Box>
            </Box>
          )}

        </DialogContent>
      </Dialog>

      {/* Confirmation Modals */}
      <ConfirmProdModalSAP
        open={isConfirmProdSAPOpen}
        onClose={() => setIsConfirmProdSAPOpen(false)}
        material={scannedMaterial}
        materialName={materialName}
        batch={scannedBatch}
        hu={scannedHu}
        selectedPlanSets={selectedPlanSets.filter(set => set.plan && set.line && set.group)}
        emulsion={emulsion}
        batchmix={batchmix}
        operator={operator}
        withdraw={withdraw}
        cooked_date={cooked_date}
        rmit_date={rmit_date}
        detail={detail}
        qc_date={qc_date}
        come_cold_date={come_cold_date}
        out_cold_date={out_cold_date}
        come_cold_date_two={come_cold_date_two}
        out_cold_date_two={out_cold_date_two}
        come_cold_date_three={come_cold_date_three}
        out_cold_date_three={out_cold_date_three}
        weighttotal={weighttotal}
        tray_count={tray_count}
        level_eu={level_eu}
        emu_status={emu_status}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onSuccess={handleSAPSaveSuccess}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        planName={planToDelete?.planName}
      />
    </>
  );
};

export default ModalInputRM;