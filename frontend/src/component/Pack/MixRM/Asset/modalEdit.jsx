import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  Alert,
  Autocomplete,
  TextField,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import axios from "axios";
axios.defaults.withCredentials = true; 
import ModalAlert from "../../../../Popup/AlertSuccess";

const API_URL = import.meta.env.VITE_API_URL;

const ConfirmProdModal = ({ open, onClose, material, materialName, batch, mapping_id, tro_id, ntray, weight_per_tro, onSuccess }) => {
  const [showAlert, setShowAlert] = useState(false);

  const handleConfirm = async () => {
    const payload = {
      tro_id,
      mapping_id,
      weight_per_tro,
      ntray,
    };

    try {
      const response = await axios.post(`${API_URL}/api/pack/mixtrolley/Add/rm/TrolleyMapping`, payload);
      if (response.status === 200) {
        onSuccess();
        onClose();
        setShowAlert(true);
      } else {
        console.error("Error while sending data:", response.status);
      }
    } catch (error) {
      console.error("Error during API call:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={(e, reason) => { if (reason !== 'backdropClick') onClose(); }} fullWidth maxWidth="xs">
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>กรุณาตรวจสอบข้อมูลก่อนทำรายการ</Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">รหัสการผสม: {material}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch || "ไม่มีข้อมูล"}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">รถเข็น: {tro_id}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">จำนวนถาด: {ntray}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">น้ำหนักต่อรถเข็น: {weight_per_tro}</Typography>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Button variant="contained" startIcon={<CancelIcon />} style={{ backgroundColor: "#E74A3B", color: "#fff" }} onClick={onClose}>ยกเลิก</Button>
            <Button variant="contained" startIcon={<CheckCircleIcon />} style={{ backgroundColor: "#41a2e6", color: "#fff" }} onClick={handleConfirm}>ยืนยัน</Button>
          </Box>
        </DialogContent>
      </Dialog>
      <ModalAlert open={showAlert} onClose={() => setShowAlert(false)} />
    </>
  );
};

const ModalEditPD = ({ open, onClose, data, onSuccess }) => {
  const [selectedTrolley, setSelectedTrolley] = useState(null);
  const [ntray, setNtray] = useState("");
  const [weightPerTro, setWeightPerTro] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [trolleys, setTrolleys] = useState([]);
  const [isConfirmProdOpen, setIsConfirmProdOpen] = useState(false);
  const [maxWeight, setMaxWeight] = useState(0);
  const [isValidWeight, setIsValidWeight] = useState(false);

  const handleConfirmSuccess = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  }; 

  // Extract relevant data from the data prop
  const extractDataFromProps = () => {
    if (!data) return {};

    return {
      mat: data.materials?.[0]?.mat || "",
      materialName: data.materials?.[0]?.mat_name || "",
      batch_after: data.materials?.[0]?.batch_after || "",
      mapping_id: data.materials?.[0]?.mapping_id || "",
      mix_code: data.header?.mix_code || data.materials?.[0]?.mix_code || "",
      totalWeight: data.header?.totalWeight || 0 // เปลี่ยนจาก weight_RM เป็น totalWeight
    };
  };

  const { mat, batch_after, mapping_id, mix_code, totalWeight } = extractDataFromProps();

  useEffect(() => {
    if (data?.materials?.[0]?.mat_name) {
      setMaterialName(data.materials[0].mat_name);
    }
    if (data?.header?.totalWeight) { // เปลี่ยนจาก weight_RM เป็น totalWeight
      setMaxWeight(parseFloat(data.header.totalWeight));
    }
    fetchTrolleys();
  }, [data]);

  const fetchTrolleys = async () => {
    try {
      const LineIdFromLocalStorage = localStorage.getItem("line_id");
      if (!LineIdFromLocalStorage) {
        throw new Error("No line_id found in localStorage");
      }

      const response = await axios.get(`${API_URL}/api/pack/Trolley/${LineIdFromLocalStorage}`);
      if (response.data.success) {
        setTrolleys(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching trolley data:", error);
    }
  };

  const handleWeightChange = (e) => {
    const value = parseFloat(e.target.value);
    if (value > maxWeight) {
      setErrorMessage(`น้ำหนักต้องไม่เกิน ${maxWeight} กิโลกรัม`);
      setWeightPerTro(maxWeight.toString());
      setIsValidWeight(false);
    } else if (value < 0) {
      setErrorMessage("น้ำหนักต้องไม่น้อยกว่า 0");
      setWeightPerTro("0");
      setIsValidWeight(false);
    } else if (isNaN(value)) {
      setErrorMessage("กรุณากรอกน้ำหนักให้ถูกต้อง");
      setWeightPerTro("");
      setIsValidWeight(false);
    } else {
      setErrorMessage("");
      setWeightPerTro(e.target.value);
      setIsValidWeight(true);
    }
  };

  const isFormValid = () => {
    return selectedTrolley && 
           ntray && 
           weightPerTro && 
           isValidWeight && 
           parseFloat(weightPerTro) > 0 && 
           parseFloat(weightPerTro) <= maxWeight;
  };

  const handleConfirm = () => {
    if (!selectedTrolley || !ntray || !weightPerTro) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const weightValue = parseFloat(weightPerTro);
    if (weightValue > maxWeight) {
      setErrorMessage(`น้ำหนักต้องไม่เกิน ${maxWeight} กิโลกรัม`);
      return;
    }

    if (weightValue <= 0) {
      setErrorMessage("น้ำหนักต้องมากกว่า 0");
      return;
    }

    setErrorMessage("");
    setIsConfirmProdOpen(true);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>กรุณาเลือกรถเข็น</Typography>
          {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
          <Stack spacing={2}>
            <Divider />
            <Typography>Mix Code: {mix_code}</Typography>
            <Typography color="text.secondary">น้ำหนักสูงสุดที่สามารถใส่ได้: {maxWeight} กิโลกรัม</Typography>
            <Divider />
            <Autocomplete
              options={trolleys}
              getOptionLabel={(option) => `${option.tro_id}`}
              value={selectedTrolley}
              onChange={(event, newValue) => setSelectedTrolley(newValue)}
              renderInput={(params) => <TextField {...params} label="เลือกรถเข็น" variant="outlined" />}
            />
            <TextField
              label="จำนวนถาด"
              type="number"
              value={ntray}
              onChange={(e) => setNtray(e.target.value)}
              fullWidth
              inputProps={{ min: 1 }}
              error={ntray !== "" && parseInt(ntray) < 1}
              helperText={ntray !== "" && parseInt(ntray) < 1 ? "จำนวนถาดต้องมากกว่า 0" : ""}
            />
            <TextField
              label="น้ำหนักต่อรถเข็น"
              type="number"
              value={weightPerTro}
              onChange={handleWeightChange}
              fullWidth
              error={!!errorMessage}
              inputProps={{ 
                min: 0,
                max: maxWeight,
                step: 0.01 
              }}
              helperText={errorMessage || `น้ำหนักต้องอยู่ระหว่าง 0 - ${maxWeight} กิโลกรัม`}
            />
            <Divider />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button 
                style={{ backgroundColor: "#ff4444", color: "#fff" }} 
                variant="contained" 
                startIcon={<CancelIcon />} 
                onClick={onClose}
              >
                ยกเลิก
              </Button>
              <Button 
                style={{ 
                  backgroundColor: isFormValid() ? "#41a2e6" : "#A0A0A0",
                  color: "#fff" 
                }} 
                variant="contained" 
                startIcon={<CheckCircleIcon />} 
                onClick={handleConfirm}
                disabled={!isFormValid()}
              >
                ยืนยัน
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
      <ConfirmProdModal
        open={isConfirmProdOpen}
        onClose={() => setIsConfirmProdOpen(false)}
        material={mat}
        materialName={materialName}
        batch={batch_after}
        mapping_id={mapping_id}
        tro_id={selectedTrolley?.tro_id}
        ntray={ntray}
        weight_per_tro={weightPerTro}
        onSuccess={handleConfirmSuccess}
      />
    </>
  );
};

export default ModalEditPD;