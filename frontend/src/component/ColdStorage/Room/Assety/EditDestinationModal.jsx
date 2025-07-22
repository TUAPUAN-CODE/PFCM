import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  TextField,
  IconButton,
  Alert,
  Autocomplete,
  Chip,
  Paper,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Component for confirming production changes
const ConfirmProdModal = ({ open, onClose, material, materialName, batch, mapping_id, selectedPlan, selectedLine, onSuccess, currentProduction, currentLine, approver }) => {
  const handleConfirm = async () => {
    const payload = {
      mat: material,
      ProdID: selectedPlan ? parseInt(selectedPlan.prod_id, 10) : null,
      mapping_id: mapping_id ? parseInt(mapping_id, 10) : null,
      line_name: selectedLine ? selectedLine.line_name : null,
      name_edit_prod: approver, // เพิ่มข้อมูลผู้อนุมัติ
    };

    try {
      const response = await axios.put(`${API_URL}/api/MatOnTrolley/updateProduction`, payload);

      if (response.status === 200) {
        console.log("Data sent successfully:", response.data);

        // สร้างข้อมูลที่อัปเดตแล้วส่งกลับไปยัง parent component
        const updatedData = {
          ...response.data,
          production: `${selectedPlan.code} (${selectedPlan.doc_no})`, // อัปเดตชื่อแผนการผลิต
          line_name: selectedLine.line_name, // อัปเดตชื่อไลน์ผลิต
          approver: approver // เพิ่มข้อมูลผู้อนุมัติ
        };

        onSuccess(updatedData);
        onClose();
      } else {
        console.error("Error while sending data:", response.status);
      }
    } catch (error) {
      console.error("Error during API call:", error);
    }
    console.log("Sending payload:", payload);
  };

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        style: {
          borderRadius: '12px',
        }
      }}
    >
      <DialogContent>
        <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
          กรุณาตรวจสอบข้อมูลก่อนทำรายการ
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f5f5f5', mb: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" gutterBottom>ข้อมูลวัตถุดิบ</Typography>
          <Stack spacing={1} sx={{ pl: 2 }}>
            <Typography color="rgba(0, 0, 0, 0.6)">Material: {material}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
          </Stack>
        </Paper>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>การเปลี่ยนแปลงแผนการผลิต</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
            <Paper
              elevation={0}
              sx={{ p: 1, backgroundColor: '#f0f7ff', flex: 1, borderRadius: 1, textAlign: 'center' }}
            >
              <Typography variant="body2" color="text.secondary">จาก</Typography>
              <Typography fontWeight="medium">{currentProduction || 'ไม่มีแผนการผลิต'}</Typography>
              <Typography variant="caption" color="text.secondary">{currentLine || ''}</Typography>
            </Paper>

            <CompareArrowsIcon sx={{ mx: 2 }} />

            <Paper
              elevation={0}
              sx={{ p: 1, backgroundColor: '#e6f5ec', flex: 1, borderRadius: 1, textAlign: 'center' }}
            >
              <Typography variant="body2" color="text.secondary">เป็น</Typography>
              <Typography fontWeight="medium">
                {selectedPlan ? `${selectedPlan.code} (${selectedPlan.doc_no})` : 'ไม่มีแผนการผลิต'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedLine ? selectedLine.line_name : ''}
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* แสดงข้อมูลผู้อนุมัติ */}
        <Paper elevation={0} sx={{ p: 2, backgroundColor: '#fff8e1', mb: 2, borderRadius: 2, border: '1px solid #ffecb3' }}>
          <Typography variant="subtitle1" gutterBottom>ข้อมูลผู้อนุมัติ</Typography>
          <Typography color="rgba(0, 0, 0, 0.7)">
            <PersonIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
            {approver}
          </Typography>
        </Paper>

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

// Main EditProductionModal component
const EditProductionModal = ({ open, handleClose, selectedRow, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [production, setProduction] = useState([]);
  const [allLinesByType, setAllLinesByType] = useState({});
  const [isConfirmProdOpen, setIsConfirmProdOpen] = useState(false);
  const [showDropdowns, setShowDropdowns] = useState(true);
  const [currentProduction, setCurrentProduction] = useState("");
  const [currentLine, setCurrentLine] = useState("");
  const [approver, setApprover] = useState(""); // เพิ่ม state สำหรับเก็บชื่อผู้อนุมัติ
  const [editLimitReached, setEditLimitReached] = useState(false); // เพิ่ม state สำหรับเช็คขีดจำกัดการแก้ไข
  const [isLoading, setIsLoading] = useState(true); // เพิ่ม state สำหรับ loading

  useEffect(() => {
    if (open && selectedRow) {
      // เก็บข้อมูลแผนการผลิตปัจจุบัน
      setCurrentProduction(selectedRow.production || "ไม่มีแผนการผลิต");
      setCurrentLine(selectedRow.line_name || "");

      if (selectedRow.mat_name) {
        setMaterialName(selectedRow.mat_name);
      } else {
        fetchMaterialName(selectedRow.mat);
      }
      fetchProduction(selectedRow.mat);
      checkEditHistory(); // เพิ่มการเช็คประวัติการแก้ไข

      // รีเซ็ตค่าผู้อนุมัติเมื่อเปิด modal ใหม่
      setApprover("");
    }
  }, [open, selectedRow]);

  // เพิ่มฟังก์ชันสำหรับเช็คประวัติการแก้ไข
  const checkEditHistory = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/checkEditHistoryOnTrolley`, { 
        params: { mapping_id: selectedRow?.mapping_id }
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

  const fetchMaterialName = async (mat) => {
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

  const fetchProduction = async (mat) => {
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

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setSelectedLine(null);
    setErrorMessage("");
  };

  const handleLineSelect = (line) => {
    setSelectedLine(line);
    setErrorMessage("");
  };

  const handleApproverChange = (e) => {
    setApprover(e.target.value);
    setErrorMessage("");
  };

  const toggleDropdowns = () => {
    setShowDropdowns(!showDropdowns);
  };

  const handleConfirm = () => {
    if (!selectedPlan) {
      setErrorMessage("กรุณาเลือกแผนการผลิต");
      return;
    }

    if (!selectedLine) {
      setErrorMessage("กรุณาเลือกไลน์ผลิต");
      return;
    }

    if (!approver.trim()) {
      setErrorMessage("กรุณาระบุชื่อผู้อนุมัติ");
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

    // อัปเดตข้อมูลปัจจุบันใน modal
    setCurrentProduction(`${selectedPlan.code} (${selectedPlan.doc_no})`);
    setCurrentLine(selectedLine.line_name);

    setIsConfirmProdOpen(false);
    // ไม่ต้องปิด modal ทันที เพื่อให้ผู้ใช้เห็นผลการอัปเดต
    handleClose();
  };

  // Reset states when modal closes
  const onClose = () => {
    setSelectedPlan(null);
    setSelectedLine(null);
    setErrorMessage("");
    setApprover("");
    setEditLimitReached(false); // รีเซ็ต editLimitReached
    setIsLoading(true); // รีเซ็ต loading state
    handleClose();
  };

  // เพิ่ม loading state เมื่อกำลัง check edit history
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
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          onClose();
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          style: {
            borderRadius: '12px',
            padding: '8px'
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
          แก้ไขแผนการผลิต
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          {/* เพิ่ม Alert สำหรับแสดงเมื่อเกินขีดจำกัดการแก้ไข */}
          {editLimitReached && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              ไม่สามารถแก้ไขแผนการผลิตได้ เนื่องจากมีการแก้ไขครบ 3 ครั้งแล้ว
            </Alert>
          )}

          <Stack spacing={2}>
            {selectedRow && (
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="subtitle1" gutterBottom>ข้อมูลวัตถุดิบ</Typography>
                <Stack spacing={1} sx={{ pl: 2 }}>
                  <Typography color="rgba(0, 0, 0, 0.6)">Material: {selectedRow.mat}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Batch: {selectedRow.batch}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Production: {selectedRow.production}</Typography>
                </Stack>
              </Paper>
            )}

            {/* แสดงแผนการผลิตปัจจุบัน ที่มีการออกแบบใหม่ให้เด่นชัด */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: '#f0f7ff',
                borderRadius: 2,
                border: '1px solid #d0e4f8'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1">แผนการผลิตปัจจุบัน</Typography>
                <Chip
                  label="ปัจจุบัน"
                  size="small"
                  sx={{
                    backgroundColor: '#e1f5fe',
                    color: '#0277bd',
                    height: '22px'
                  }}
                />
              </Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 'medium',
                  fontSize: '16px',
                  color: '#0277bd'
                }}
              >
                {currentProduction}
              </Typography>
              {currentLine && (
                <Typography variant="caption" color="text.secondary">
                  ไลน์: {currentLine}
                </Typography>
              )}
            </Paper>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">ตั้งค่าแผนการผลิตใหม่</Typography>
              <IconButton onClick={toggleDropdowns} size="small">
                <VisibilityIcon color={showDropdowns ? "primary" : "action"} />
              </IconButton>
            </Box>

            {/* ซ่อน dropdown เมื่อ editLimitReached เป็น true */}
            {!editLimitReached && showDropdowns && (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                mb: 2,
                p: 2,
                border: '1px solid #e1f5fe',
                borderRadius: 2,
                backgroundColor: '#f9f9f9'
              }}>
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
                        label="เลือกแผนการผลิตใหม่"
                        size="small"
                        fullWidth
                        required
                      />
                    )}
                  />

                  <Autocomplete
                    sx={{ flex: 1 }}
                    options={selectedPlan?.line_type_id ? (allLinesByType[selectedPlan.line_type_id] || []) : []}
                    getOptionLabel={(option) => option.line_name}
                    value={selectedLine}
                    onChange={(e, newValue) => handleLineSelect(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="เลือกไลน์ผลิต" size="small" fullWidth required />
                    )}
                    disabled={!selectedPlan}
                  />
                </Box>
              </Box>
            )}

            {!editLimitReached && !showDropdowns && selectedPlan && (
              <Box sx={{ p: 2, border: '1px solid #e1f5fe', borderRadius: 2, backgroundColor: '#f9f9f9' }}>
                <Typography>
                  {selectedPlan.code} ({selectedPlan.doc_no}) - {selectedLine?.line_name || 'ยังไม่ได้เลือกไลน์'}
                </Typography>
              </Box>
            )}

            {/* สรุปการเปลี่ยนแปลง */}
            {!editLimitReached && selectedPlan && selectedLine && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: '#e8f5e9',
                  borderRadius: 2,
                  border: '1px solid #c8e6c9',
                  mt: 1
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">แผนการผลิตที่เลือกใหม่</Typography>
                  <Chip
                    label="ใหม่"
                    size="small"
                    sx={{
                      backgroundColor: '#c8e6c9',
                      color: '#2e7d32',
                      height: '22px'
                    }}
                  />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 'medium',
                    fontSize: '16px',
                    color: '#2e7d32'
                  }}
                >
                  {`${selectedPlan.code} (${selectedPlan.doc_no})`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ไลน์: {selectedLine.line_name}
                </Typography>
              </Paper>
            )}

            {/* เพิ่มส่วนกรอกชื่อผู้อนุมัติ แต่ซ่อนเมื่อ editLimitReached */}
            {!editLimitReached && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: '#fff8e1',
                  borderRadius: 2,
                  border: '1px solid #ffecb3',
                  mt: 1
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">ข้อมูลผู้อนุมัติ</Typography>
                  <Chip
                    label="จำเป็น"
                    size="small"
                    sx={{
                      backgroundColor: '#ffecb3',
                      color: '#ff6f00',
                      height: '22px'
                    }}
                  />
                </Box>
                <TextField
                  fullWidth
                  label="ชื่อ-นามสกุล ผู้อนุมัติ"
                  size="small"
                  value={approver}
                  onChange={handleApproverChange}
                  required
                  placeholder="ระบุชื่อผู้อนุมัติแก้ไขแผนการผลิต"
                  InputProps={{
                    startAdornment: (
                      <PersonIcon sx={{ color: 'action.active', mr: 1 }} />
                    ),
                  }}
                  helperText="กรุณาระบุชื่อ-นามสกุลของผู้มีอำนาจอนุมัติในการแก้ไขแผนการผลิต"
                />
              </Paper>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            style={{ backgroundColor: "#E74A3B", color: "#fff" }}
            onClick={onClose}
          >
            ยกเลิก
          </Button>
          {/* ปิดปุ่มยืนยันเมื่อ editLimitReached */}
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            style={{
              backgroundColor: editLimitReached || !selectedPlan || !selectedLine || !approver.trim() ? "#A0A0A0" : "#41a2e6",
              color: "#fff"
            }}
            onClick={handleConfirm}
            disabled={editLimitReached || !selectedPlan || !selectedLine || !approver.trim()}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>

      {selectedRow && (
        <ConfirmProdModal
          open={isConfirmProdOpen}
          onClose={() => setIsConfirmProdOpen(false)}
          material={selectedRow.mat}
          materialName={materialName}
          batch={selectedRow.batch}
          mapping_id={selectedRow.mapping_id}
          selectedPlan={selectedPlan}
          selectedLine={selectedLine}
          approver={approver}
          onSuccess={handleConfirmSuccess}
          currentProduction={currentProduction}
          currentLine={currentLine}
        />
      )}
    </>
  );
};

export default EditProductionModal;