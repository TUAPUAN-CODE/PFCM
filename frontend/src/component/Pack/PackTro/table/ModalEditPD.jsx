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
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
} from "@mui/material";

import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import { FaCheck } from "react-icons/fa";
import axios from "axios";
axios.defaults.withCredentials = true; 
import ModalAlert from "../../../../Popup/AlertSuccess";


const API_URL = import.meta.env.VITE_API_URL;

const QcCheck = ({ open, onClose, material, materialName,cold, rm_cold_status,rm_status,ComeColdDateTime,slot_id,tro_id,batch, rmfp_id, onSuccess,  Location, ColdOut,  operator, }) => {
  const [showAlert, setShowAlert] = useState(false);
  const handleConfirm = async () => {
    const payload = {
      mat: material,
      rmfpID: rmfp_id ? parseInt(rmfp_id, 10) : null,
      cold: cold ? parseInt(cold, 10) : null,
      ColdOut: ColdOut,
      dest: Location,
      operator: operator,
      rm_status: rm_status,
      tro_id: tro_id,
      slot_id: slot_id,
      rm_cold_status: rm_cold_status,
      ComeColdDateTime: ComeColdDateTime,
      
    };

    try {
      const response = await axios.put(`${API_URL}/api/coldstorage/outcoldstorage`, payload);
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

  const handleClose = () => {
    onClose();
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
          <Stack style={{}} spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">Material: {material}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
            {/* <Typography color="rgba(0, 0, 0, 0.6)">rmfp_id: {rmfp_id}</Typography> */}
            <Typography color="rgba(0, 0, 0, 0.6)">ประเภทการส่งออก : {ColdOut}</Typography>
          
            <Typography color="rgba(0, 0, 0, 0.6)">สถานที่จัดส่ง: {Location}</Typography>

            <Typography color="rgba(0, 0, 0, 0.6)">ผู้ดำเนินการ: {operator}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">ป้ายทะเบียน: {tro_id}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">พิ้นที่จอด: {slot_id}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">สถานะวัตถุดิบ: {rm_status}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">สถานะวัตถุดิบในห้องเย็น: {rm_cold_status}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">เวลาเข้าห้องเย็น: {ComeColdDateTime}</Typography>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
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

const ModalEditPD = ({ open, onClose, data, onSuccess, showModal }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [production, setProduction] = useState([]);
  const [CheckSensory, setDeliveryLocation] = useState("");
  const [CheckSensoryperfurm, setCheckSensoryperfurm] = useState("");
  const [CheckSensorymeet, setCheckSensorymeet] = useState("");
  const [CheckDeflect, setCheckDeflect] = useState("");
  const [ColdOut, setColdOut] = useState("");
  const [weight, setweight] = useState("");
  const [remarkMetal, setremarkMetal] = useState("");
  const [operator, setoperator] = useState("");
  const [remarkDeflect, setremarkDeflect] = useState("");
  const [Location, setLocation] = useState("");
  const [isConfirmProdOpen, setIsConfirmProdOpen] = useState(false);


  const { batch, mat, rmfp_id, rm_cold_status ,rm_status,tro_id,slot_id,ComeColdDateTime,cold} = data || {};

  const handleClose = () => {
    // setLocation(null);
    // setColdOut(null);
    // setoperator("");
    onClose(); // ปิด Modal
  };

  

  useEffect(() => {
    if (open) {
      setLocation("");
      setColdOut("");
      setoperator("");
    }
  }, [open]);



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
    if ( !operator || !Location) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
    } else {
      setErrorMessage("");
      setIsConfirmProdOpen(true);
      onClose();
    }
  };

  const handleweight = (event) => {
    setweight(event.target.value);
  };

  const handleremarkMetal = (event) => {
    setremarkMetal(event.target.value);
  };
  const handleremarkDeflect = (event) => {
    setremarkDeflect(event.target.value);
  };
  const handleoperator = (event) => {
    setoperator(event.target.value);
  };
  const handleCheckperfurm = (event) => {
    setCheckSensoryperfurm(event.target.value);
  };
  const handleCheckmeet = (event) => {
    setCheckSensorymeet(event.target.value);
  };
  const handleLocation = (event) => {
    setLocation(event.target.value);
  };
  const handleCheckDeflect = (event) => {
    setCheckDeflect(event.target.value);
  };
  const handleColdOut = (event) => {
    setColdOut(event.target.value);
  };



  return (
    <>
      <Dialog open={open} onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }} fullWidth maxWidth="xs">
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
            กรุณาระบุข้อมูลในการส่งออก
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
            <Typography color="rgba(0, 0, 0, 0.6)">Coldstatus: {rm_cold_status}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">เลขรถเข็น: {tro_id}</Typography>
            {/* <Typography color="rgba(0, 0, 0, 0.6)">เวลาเข้าห้องเย็น: {ComeColdDateTime}</Typography> */}
            <Divider />


            <Box sx={{ paddingLeft: "12px" }}>
              <Typography style={{ color: "#666", marginRight: "16px" }}>สถานที่จัดส่ง</Typography>
              <RadioGroup row name="location" value={Location} onChange={handleLocation}>
                {["เหลือจากไลน์ผลิต", "QcCheck"].includes(rm_status) && (
                  <FormControlLabel value="บรรจุ" control={<Radio />} style={{ color: "#666" }} label="บรรจุ" />
                )}

                {["รอ Qc"].includes(rm_status) && (
                  <>
                    <FormControlLabel value=" Qc" control={<Radio />} style={{ color: "#666" }} label="Qc" />
                  </>
                )}
                {["รอกลับมาเตรียม"].includes(rm_status) && (
                  <>
                    <FormControlLabel value="จุดเตรียม" control={<Radio />} style={{ color: "#666" }} label="จุดเตรียม" />
                  </>
                )}

                {["รอแก้ไข"].includes(rm_status) && (
                  <>
                    <FormControlLabel value="จุดเตรียม" control={<Radio />} style={{ color: "#666" }} label="จุดเตรียม" />
                    <FormControlLabel value="หม้ออบ" control={<Radio />} style={{ color: "#666" }} label="หม้ออบ" />
                  </>
                )}

              </RadioGroup>
            </Box>

            <Box sx={{ paddingLeft: "12px" }}>
        
              <Typography style={{ color: "#666", width: "100px", marginBottom: "9px" }}>ผู้ดำเนินการ</Typography>
              <TextField
                label="กรอกชื่อผู้ทำรายการ"
                variant="outlined"
                fullWidth
                value={operator}
                size="small"
                onChange={handleoperator}
                sx={{ marginBottom: '16px' }}
                type="text"
              />

            </Box>

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
      <QcCheck
        open={isConfirmProdOpen}
        onClose={() => setIsConfirmProdOpen(false)}
        material={mat}
        materialName={materialName}
        ColdOut={ColdOut}
        weight={weight}
        Location={Location}
        operator={operator}
        rm_cold_status={rm_cold_status}
        tro_id={tro_id}
        slot_id={slot_id}
        rm_status={rm_status}
        batch={batch}
        rmfp_id={rmfp_id}
        ComeColdDateTime={ComeColdDateTime}
        cold={cold}
        onSuccess={onSuccess} 
      />
    </>
  );
};

export default ModalEditPD;
