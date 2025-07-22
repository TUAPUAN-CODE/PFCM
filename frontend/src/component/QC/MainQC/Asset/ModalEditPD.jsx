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
  IconButton,
  Alert
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import { FaCheck } from "react-icons/fa";
import axios from "axios";
axios.defaults.withCredentials = true; 
import ModalAlert from "../../../../Popup/AlertSuccess";


const API_URL = import.meta.env.VITE_API_URL;

const ConfirmProdModal = ({ open, onClose, material, materialName, batch, prodId, rmfp_id, onSuccess }) => {
  const [showAlert, setShowAlert] = useState(false);
  const handleConfirm = async () => {
    const payload = {
      mat: material,
      rmfpID: rmfp_id ? parseInt(rmfp_id, 10) : null,
      ProdID: parseInt(prodId, 10)
    };

    try {
      const response = await axios.put(`${API_URL}/api/oven/toCold/updateProduction`, payload);
      if (response.status === 200) {
        console.log("Data sent successfully:", response.data);
        onSuccess();
        onClose();
        setShowAlert(true);
      } else {
        console.error("Error while sending data:", response.status);
      }
    } catch (error) {
      console.error("Error during API call:", error);
    }
    console.log(payload);
  };

  return (
    <>
      <Dialog open={open} onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }} fullWidth maxWidth="xs">
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
            กรุณาตรวจสอบข้อมูลก่อนทำรายการ
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">Material: {material}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">rmfp_id: {rmfp_id}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">แผนการผลิต: {prodId}</Typography>
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
      <ModalAlert open={showAlert} onClose={() => setShowAlert(false)} />
    </>
  );
};

const ModalEditPD = ({ open, onClose, data, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [production, setProduction] = useState([]);
  const [isConfirmProdOpen, setIsConfirmProdOpen] = useState(false);

  const { batch, mat, rmfp_id } = data || {};

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
    setSelectedPlan(plan);
    setErrorMessage("");
  };

  const handleConfirm = () => {
    if (!selectedPlan) {
      setErrorMessage("กรุณาเลือกแผนการผลิต");
      return;
    }
    setErrorMessage("");
    setIsConfirmProdOpen(true);
    onClose(); // ปิด Modal ของ ModalEditPD
  };

  return (
    <>
      <Dialog open={open} onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }} fullWidth maxWidth="xs">
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
            กรุณาเลือกแผนการผลิต
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

            <Divider />

            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="production-plan-label">แผนการผลิต</InputLabel>
              <Select
                labelId="production-plan-label"
                label="แผนการผลิต"
                value={selectedPlan ? selectedPlan.prod_id : ""}
                onChange={(e) =>
                  handlePlanSelect(production.find(plan => plan.prod_id === e.target.value))
                }
                renderValue={() =>
                  selectedPlan
                    ? `${selectedPlan.code} (${selectedPlan.doc_no} - ${selectedPlan.line_name})`
                    : "เลือกแผนการผลิต"
                }
              >
                {production.map((plan) => (
                  <MenuItem key={plan.prod_id} value={plan.prod_id}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%"
                      }}
                    >
                      <Typography>
                        {plan.code} ({plan.doc_no} - {plan.line_name})
                      </Typography>
                      <IconButton onClick={() => handlePlanSelect(plan)}>
                        <FaCheck style={{ color: "#41a2e6" }} />
                      </IconButton>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>


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
        prodId={selectedPlan ? selectedPlan.prod_id : ""}
        onSuccess={onSuccess} // ส่งฟังก์ชัน onSuccess ไปยัง ConfirmProdModal
      />
    </>
  );
};

export default ModalEditPD;
