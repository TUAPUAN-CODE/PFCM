import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import { FaCheck } from "react-icons/fa";
import axios from "axios";
axios.defaults.withCredentials = true; 
const API_URL = import.meta.env.VITE_API_URL;

const ConfirmProdModal = ({ open, onClose, material, materialName, batch, selectedPlans, rmfp_id,deliveryLocation, operator }) => {
  const handleConfirm = async () => {
  

    const payload = {
      // mat: material,
      // batch: batch,
      rmfp_id: rmfp_id,
      prod_rm_id: selectedPlans.map((plan) => plan.prod_id),
      
    };

    try {
      const response = await axios.post(`${API_URL}/api/UpdateRMForProd`, payload);
      if (response.status === 200) {
        console.log("Data sent successfully:", response.data);
        onClose();
      } else {
        console.error("Error while sending data:", response.status);
      }
    } catch (error) {
      console.error("Error during API call:", error);
    }
    console.log(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent>
        <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
          ข้อมูลการยืนยันการผลิต
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Stack spacing={1}>
          <Typography color="rgba(0, 0, 0, 0.6)">Material: {material}</Typography>
          <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
          <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
          <Typography color="rgba(0, 0, 0, 0.6)">rmfp_id: {rmfp_id}</Typography>
          {/* <Typography color="rgba(0, 0, 0, 0.6)">ผู้ดำเนินการ: {operator}</Typography> */}
          <Typography color="rgba(0, 0, 0, 0.6)">
            แผนการผลิต: {selectedPlans.map((plan) => `${plan.code} (${plan.doc_no} - ${plan.line_name})`).join(", ")}
          </Typography>
          {/* <Typography color="rgba(0, 0, 0, 0.6)">สถานที่จัดส่ง: {deliveryLocation}</Typography> */}
        </Stack>

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            style={{ backgroundColor: "#E74A3B", color: "#fff" }}
            onClick={onClose}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            style={{ backgroundColor: "#41a2e6", color: "#fff" }}
            onClick={handleConfirm}
          >
            ยืนยัน
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const ModalEditPD = ({ open, onClose, data }) => {
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [production, setProduction] = useState([]);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [operator, setOperator] = useState("");
  const [isConfirmProdOpen, setIsConfirmProdOpen] = useState(false);

  const { batch, mat,rmfp_id } = data || {};

  useEffect(() => {
    if (mat) {
      fetchMaterialName();
      fetchProduction();
    }
  }, [mat]);

  const fetchMaterialName = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fetchRawMatName`, { params: { mat } });
      if (response.data.success) {
        setMaterialName(response.data.data[0]?.mat_name || "ไม่พบชื่อวัตถุดิบ");
      } else {
        console.error("Error fetching material name:", response.data.error);
      }
    } catch (error) {
      console.error("Error fetching material name:", error);
    }
  };

  const fetchProduction = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fetchProduction`, { params: { mat } });
      if (response.data.success) {
        setProduction(response.data.data);
      } else {
        console.error("Error fetching production data:", response.data.error);
      }
    } catch (error) {
      console.error("Error fetching production data:", error);
    }
  };

  const handlePlanSelect = (plan) => {
    if (!selectedPlans.some((selectedPlan) => selectedPlan.prod_id === plan.prod_id)) {
      setSelectedPlans([...selectedPlans, plan]);
      setErrorMessage("");
    } else {
      setErrorMessage("คุณเลือกแผนการผลิตนี้แล้ว");
    }
  };

  const handlePlanDelete = (planToDelete) => {
    setSelectedPlans((plans) => plans.filter((plan) => plan.prod_id !== planToDelete.prod_id));
  };

  const handleConfirm = () => {
    if (selectedPlans.length === 0) {               // || !deliveryLocation || !operator
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setErrorMessage("");
    setIsConfirmProdOpen(true);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
            กรุณาเลือกแผนการผลิต และสถานที่จัดส่ง
          </Typography>
          
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Stack spacing={2}>
            <Divider />
            <Typography color="rgba(0, 0, 0, 0.6)">Material: {mat}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
            {/* <Typography color="rgba(0, 0, 0, 0.6)">rmfp_id: {rmfp_id}</Typography> */}

            <Divider />
            
            {/* <TextField
              label="ผู้ดำเนินการ"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              fullWidth
              size="small"
            /> */}

            <FormControl fullWidth size="small">
              <InputLabel>แผนการผลิต</InputLabel>
              <Select value="" onChange={() => {}} renderValue={() => null}>
                {production.map((plan) => (
                  <MenuItem key={plan.prod_id} value={plan.prod_id}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <Typography>{plan.code} ({plan.doc_no} - {plan.line_name})</Typography>
                      <IconButton onClick={() => handlePlanSelect(plan)}><FaCheck style={{ color: "#41a2e6" }} /></IconButton>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              {selectedPlans.map((plan) => (
                <Box key={plan.prod_id} sx={{ mb: 1 }}>
                  <Chip
                    label={`${plan.code} (${plan.doc_no} - ${plan.line_name})`}
                    onDelete={() => handlePlanDelete(plan)}
                    deleteIcon={<DeleteIcon />}
                    style={{
                      minWidth: "100%",
                      padding: "20px 0px",
                      justifyContent: "space-between",
                      borderRadius: "4px",
                      border: "1px solid #c9c9c9"
                    }}
                    sx={{ backgroundColor: "#fff", color: "#787878" }}
                  />
                </Box>
              ))}
            </Box>

            {/* <Box sx={{ display: "flex", alignItems: "center", pl: 1 }}>
              <Typography style={{ color: "#666", mr: 2 }}>สถานที่จัดส่ง</Typography>
              <RadioGroup
                row
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
              >
                <FormControlLabel
                  value="จุดเตรียม"
                  control={<Radio />}
                  label="จุดเตรียม"
                  style={{ color: "#666" }}
                />
                <FormControlLabel
                  value="ห้องเย็น"
                  control={<Radio />}
                  label="ห้องเย็น"
                  style={{ color: "#666" }}
                />
              </RadioGroup>
            </Box> */}

            <Divider />
            
            <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
              <Button
                variant="contained"
                startIcon={<CancelIcon />}
                style={{ backgroundColor: "#E74A3B", color: "#fff" }}
                onClick={onClose}
              >
                ยกเลิก
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                style={{ backgroundColor: "#41a2e6", color: "#fff" }}
                onClick={handleConfirm}
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
        batch={batch}
        rmfp_id={rmfp_id}
        selectedPlans={selectedPlans}
        deliveryLocation={deliveryLocation}
        operator={operator}
      />
    </>
  );
};
// 55
export default ModalEditPD;