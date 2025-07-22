import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  IconButton,
  Alert,
  Autocomplete,
  TextField,
  Paper,
  CircularProgress 
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { FaCheck } from "react-icons/fa";
import axios from "axios";
axios.defaults.withCredentials = true; 
import ModalAlert from "../../../../Popup/AlertSuccess";

const API_URL = import.meta.env.VITE_API_URL;

const ConfirmProdModal = ({ open, onClose, material, materialName, batch, rmfp_id, prodId, selectedLine, selectedGroup, onSuccess, editorName, currentProdDetails }) => {
  const [showAlert, setShowAlert] = useState(false);
  
  const handleConfirm = async () => {
    // Format the original production plan if it exists
    const beforeProd = currentProdDetails ? 
      `${currentProdDetails.prodCode}${currentProdDetails.prodDocNo ? ` (${currentProdDetails.prodDocNo})` : ''}${currentProdDetails.lineName ? ` - ${currentProdDetails.lineName}` : ''}` : 
      '';
    
    // Format the new production plan
    const afterProd = prodId ? 
      `${currentProdDetails?.newProdCode || ''} (${currentProdDetails?.newProdDocNo || ''})${selectedLine ? ` - ${selectedLine.line_name}` : ''}` : 
      '';
    
    const payload = {
      mat: material,
      rmfpID: rmfp_id ? parseInt(rmfp_id, 10) : null,
      ProdID: parseInt(prodId, 10),
      lineID: selectedLine ? selectedLine.line_id : null,
      groupID: selectedGroup ? selectedGroup.rm_group_id : null,
      line_name: selectedLine ? selectedLine.line_name : null,
      name_edit_prod: editorName,
      before_prod: beforeProd,
      after_prod: afterProd
    };

    try {
      const response = await axios.put(`${API_URL}/api/updateProduction`, payload);
      if (response.status === 200) {
        console.log("Data sent successfully:", response.data);
        onSuccess(response.data);
        onClose();
        setShowAlert(true);
      } else {
        console.error("Error while sending data:", response.status);
      }
    } catch (error) {
      console.error("Error during API call:", error);
    }
    console.log("Sending payload:", payload);
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
            <Typography color="rgba(0, 0, 0, 0.6)">ผู้อนุมัติ: {editorName}</Typography>
            
            {currentProdDetails && (
              <Paper elevation={0} sx={{ p: 1, bgcolor: "#f5f5f5", mb: 1 }}>
                <Typography color="rgba(0, 0, 0, 0.6)" fontWeight="bold">
                  แผนการผลิตเดิม:
                </Typography>
                <Typography color="rgba(0, 0, 0, 0.6)">
                  {currentProdDetails.prodCode}{currentProdDetails.prodDocNo ? ` (${currentProdDetails.prodDocNo})` : ''}
                </Typography>
                {currentProdDetails.lineName && (
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    ไลน์ผลิต: {currentProdDetails.lineName}
                  </Typography>
                )}
              </Paper>
            )}
            
            <Paper elevation={0} sx={{ p: 1, bgcolor: "#e3f2fd", mb: 1 }}>
              <Typography color="rgba(0, 0, 0, 0.6)" fontWeight="bold">
                แผนการผลิตใหม่:
              </Typography>
              <Typography color="rgba(0, 0, 0, 0.6)">
                {currentProdDetails?.newProdCode || ''} {currentProdDetails?.newProdDocNo ? `(${currentProdDetails.newProdDocNo})` : ''}
              </Typography>
              {selectedLine && (
                <Typography color="rgba(0, 0, 0, 0.6)">
                  ไลน์ผลิต: {selectedLine.line_name}
                </Typography>
              )}
            </Paper>
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
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [production, setProduction] = useState([]);
  const [group, setGroup] = useState([]);
  const [allLinesByType, setAllLinesByType] = useState({});
  const [isConfirmProdOpen, setIsConfirmProdOpen] = useState(false);
  const [showDropdowns, setShowDropdowns] = useState(true);
  const [editorName, setEditorName] = useState("");
  const [editorNameError, setEditorNameError] = useState(false);
  const [currentProdDetails, setCurrentProdDetails] = useState(null);
  const [planError, setPlanError] = useState(false);
  const [lineError, setLineError] = useState(false);
  const [editLimitReached, setEditLimitReached] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { batch, mat, rmfp_id, production: currentProduction, line_name } = data || {};

  useEffect(() => {
    if (mat) {
      fetchMaterialName();
      fetchProduction();
      fetchGroup();
      checkEditHistory();
      
      // ถ้ามีข้อมูลแผนการผลิตปัจจุบัน ให้เก็บไว้
      if (currentProduction) {
        // แยกข้อมูลแผนการผลิตปัจจุบัน
        const [prodCode, prodDocNo] = currentProduction.includes('(') ? 
                                       [currentProduction.split('(')[0].trim(), 
                                        currentProduction.split('(')[1].replace(')', '').trim()] :
                                       [currentProduction, ''];
        
        setCurrentProdDetails({
          prodCode,
          prodDocNo,
          lineName: line_name || ''
        });
      }
    }
  }, [mat, currentProduction, line_name]);

  const checkEditHistory = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/checkEditHistory`, { 
        params: { rmfp_id }
      });
      
      if (response.data.success) {
        setEditLimitReached(response.data.editLimitReached);
      } else {
        console.error("Error checking edit history:", response.data.error);
      }
    } catch (error) {
      console.error("Error checking edit history:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
        setAllLinesByType(response.data.allLinesByType || {});
      } else {
        console.error("Error fetching production data:", response.data.error);
      }
    } catch (error) {
      console.error("Error fetching production data:", error);
    }
  };

  const fetchGroup = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fetchGroup`, { params: { mat } });
      if (response.data.success) {
        setGroup(response.data.data);
      } else {
        console.error("Error fetching group data:", response.data.error);
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setSelectedLine(null);
    setSelectedGroup(null);
    setErrorMessage("");
    setPlanError(false);

    
    // เก็บข้อมูลแผนการผลิตใหม่
    if (plan && currentProdDetails) {
      setCurrentProdDetails({
        ...currentProdDetails,
        newProdCode: plan.code,
        newProdDocNo: plan.doc_no
      });
    }
  };

  const handleLineSelect = (line) => {
    setSelectedLine(line);
    setErrorMessage("");
    setLineError(false);
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setErrorMessage("");
  };

  const toggleDropdowns = () => {
    setShowDropdowns(!showDropdowns);
  };

  const handleConfirm = () => {
    let hasError = false;
    
    if (!selectedPlan) {
      setPlanError(true);
      setErrorMessage("กรุณาเลือกแผนการผลิต");
      hasError = true;
    } else {
      setPlanError(false);
    }
    
    if (!selectedLine) {
      setLineError(true);
      if (!hasError) setErrorMessage("กรุณาเลือกไลน์ผลิต");
      hasError = true;
    } else {
      setLineError(false);
    }

    if (!editorName.trim()) {
      setEditorNameError(true);
      setErrorMessage("กรุณากรอกชื่อผู้ให้อนุมัติ");
      hasError = true;
    } else {
      setEditorNameError(false);
    }
    
    if (hasError) {
      return;
    }
    
    setErrorMessage("");
    setIsConfirmProdOpen(true);
  };

  const handleConfirmSuccess = (updatedData) => {
    // ส่งข้อมูลที่อัปเดตกลับไปยัง ParentComponent
    if (onSuccess) {
      onSuccess(updatedData);
    }
  };

  const handleEditorNameChange = (e) => {
    setEditorName(e.target.value);
    if (e.target.value.trim()) {
      setEditorNameError(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} fullWidth maxWidth="sm">
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }} fullWidth maxWidth="sm">
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }}>
              แก้ไขแผนการผลิต
            </Typography>
            {!editLimitReached && (
              <IconButton onClick={toggleDropdowns} size="small">
                <VisibilityIcon color={showDropdowns ? "primary" : "action"} />
              </IconButton>
            )}
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          {editLimitReached && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              ไม่สามารถแก้ไขแผนการผลิตได้ เนื่องจากมีการแก้ไขครบ 3 ครั้งแล้ว
            </Alert>
          )}

          <Stack spacing={2}>
            <Divider />
            <Typography color="rgba(0, 0, 0, 0.6)">Material: {mat}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
            
            {currentProdDetails && (
              <Paper elevation={1} sx={{ p: 2, borderRadius: 1, bgcolor: "#f5f5f5" }}>
                <Typography color="#333" fontWeight="bold" gutterBottom>
                  แผนการผลิตปัจจุบัน
                </Typography>
                <Typography color="rgba(0, 0, 0, 0.6)">
                  {currentProdDetails.prodCode} {currentProdDetails.prodDocNo ? `(${currentProdDetails.prodDocNo})` : ''}
                </Typography>
                {currentProdDetails.lineName && (
                  <Typography color="rgba(0, 0, 0, 0.6)">
                    ไลน์ผลิต: {currentProdDetails.lineName}
                  </Typography>
                )}
              </Paper>
            )}
            
            <Divider />

            {!editLimitReached && showDropdowns && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2, 
                mb: 2,
                p: 2,
                border: '1px solid #eee',
                borderRadius: 1,
                backgroundColor: '#f9f9f9'
              }}>
                <Typography color="#333" fontWeight="bold" gutterBottom>
                  แผนการผลิตใหม่
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <Autocomplete
                    sx={{ flex: 2 }}
                    options={production}
                    getOptionLabel={(option) => `${option.code} (${option.doc_no})`}
                    value={selectedPlan}
                    onChange={(e, newValue) => handlePlanSelect(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="แผนการผลิต"
                        size="small"
                        fullWidth
                        required
                        error={planError}
                        helperText={planError ? "กรุณาเลือกแผนการผลิต" : ""}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box
                        {...props}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                          px: 1,
                        }}
                      >
                        <Typography sx={{ flexGrow: 1 }}>
                          {option.code} ({option.doc_no})
                        </Typography>
                        <IconButton onClick={() => handlePlanSelect(option)} sx={{ ml: "auto" }}>
                          <FaCheck style={{ color: "#41a2e6" }} />
                        </IconButton>
                      </Box>
                    )}
                  />

                  <Autocomplete
                    sx={{ flex: 1 }}
                    options={selectedPlan?.line_type_id ? (allLinesByType[selectedPlan.line_type_id] || []) : []}
                    getOptionLabel={(option) => option.line_name}
                    value={selectedLine}
                    onChange={(e, newValue) => handleLineSelect(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} 
                      label="เลือกไลน์ผลิต" 
                      size="small" 
                      fullWidth 
                      required  
                      error={lineError}
                      helperText={lineError ? "กรุณาเลือกไลน์ผลิต" : ""}
                      />
                    )}
                    disabled={!selectedPlan}
                    renderOption={(props, option) => (
                      <Box
                        {...props}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                          px: 1,
                          
                        }}
                      >
                        <Typography sx={{ flexGrow: 1 }}>
                          {option.line_name}
                        </Typography>
                        <IconButton onClick={() => handleLineSelect(option)} sx={{ ml: "auto" }}>
                          <FaCheck style={{ color: "#41a2e6" }} />
                        </IconButton>
                      </Box>
                    )}
                  />
                </Box>

                <TextField
                  label="ชื่อผู้อนุมัติ"
                  variant="outlined"
                  fullWidth
                  size="small"
                  value={editorName}
                  onChange={handleEditorNameChange}
                  error={editorNameError}
                  helperText={editorNameError ? "กรุณากรอกชื่อผู้อนุมัติ" : ""}
                  required
                  sx={{ mb: 2 }}
                />
              </Box>
            )}

            {!editLimitReached && !showDropdowns && selectedPlan && (
              <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                <Typography fontWeight="bold" gutterBottom>
                  แผนการผลิตใหม่
                </Typography>
                <Typography>
                  {selectedPlan.code} ({selectedPlan.doc_no}) - {selectedLine?.line_name || 'ยังไม่ได้เลือกไลน์'}
                </Typography>
                <Typography sx={{ mt: 1 }}>
                  ผู้อนุมัติ: {editorName || 'ยังไม่ได้กรอกชื่อ'}
                </Typography>
              </Box>
            )}

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
              {!editLimitReached && (
                <Button
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  style={{ backgroundColor: "#41a2e6", color: "#fff" }}
                  onClick={handleConfirm}
                >
                  ยืนยัน
                </Button>
              )}
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
        selectedLine={selectedLine}
        selectedGroup={selectedGroup}
        onSuccess={handleConfirmSuccess}
        editorName={editorName}
        currentProdDetails={currentProdDetails}
      />
    </>
  );
};
export default ModalEditPD;