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
  AlertTitle
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
const ConfirmProdModal = ({ 
  open, 
  onClose, 
  material, 
  tro_id, 
  materialName, 
  batch, 
  mapping_id, 
  selectedPlan, 
  selectedLine, 
  onSuccess, 
  currentProduction, 
  currentLine, 
  approver,
  editLimitWarning
}) => {
  const handleConfirm = async () => {
  // เพิ่มตรวจสอบว่ามีวัตถุดิบที่แก้ไขครบ 3 ครั้งหรือไม่

     if (editLimitWarning.length > 0) {
    setErrorMessage("ไม่สามารถแก้ไขได้เนื่องจากมีวัตถุดิบที่แก้ไขครบ 3 ครั้งแล้ว");
    return;
  }
    const payload = {
      mat: material,
      ProdID: selectedPlan ? parseInt(selectedPlan.prod_id, 10) : null,
      mapping_id: mapping_id,
      tro_id: tro_id,
      line_name: selectedLine ? selectedLine.line_name : null,
      name_edit_prod: approver,
      updateAllMaterials: true // เปลี่ยนเป็น true ตลอดเพื่ออัปเดตทั้งรถเข็น
    };

    try {
      const response = await axios.put(`${API_URL}/api/MatOnTrolley/updateProductionAll`, payload);

      if (response.data.success) {
        const updatedData = {
          ...response.data,
          production: `${selectedPlan.code} (${selectedPlan.doc_no})`,
          line_name: selectedLine.line_name,
          approver: approver,
          updateAllMaterials: true, // ตั้งค่าเป็น true ตลอด
          updatedCount: response.data.update_count || 1
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

        {/* แสดงข้อความแจ้งเตือนว่าการเปลี่ยนแปลงจะมีผลกับทั้งรถเข็น */}
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>การเปลี่ยนแปลงจะมีผลกับทั้งรถเข็น</AlertTitle>
          การแก้ไขนี้จะมีผลกับ<b>ทุกวัตถุดิบ</b>บนรถเข็นหมายเลข {tro_id}
        </Alert>

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

// Main EditAllMat component
// Main EditAllMat component
const EditAllMat = ({ open, handleClose, selectedRow, onSuccess }) => {
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
  const [approver, setApprover] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editLimitWarning, setEditLimitWarning] = useState([]);
  const [blockEditing, setBlockEditing] = useState(false);

  useEffect(() => {
    if (open && selectedRow) {
      setCurrentProduction(selectedRow.production || "ไม่มีแผนการผลิต");
      setCurrentLine(selectedRow.line_name || "");

      if (selectedRow.mat_name) {
        setMaterialName(selectedRow.mat_name);
      } else {
        fetchMaterialName(selectedRow.mat);
      }
      fetchProduction(selectedRow.mat);
      checkEditLimit(selectedRow.tro_id);
      setApprover("");
    }
  }, [open, selectedRow]);

  const fetchMaterialName = async (mat) => {
    try {
      const response = await axios.get(`${API_URL}/api/fetchRawMatName`, { params: { mat } });
      if (response.data.success) {
        setMaterialName(response.data.data[0]?.mat_name || "ไม่พบชื่อวัตถุดิบ");
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
      }
    } catch (error) {
      console.error("Error fetching production data:", error);
    }
  };

  const checkEditLimit = async (tro_id) => {
    try {
      const response = await axios.get(`${API_URL}/api/checkEditHistoryOnTrolleyAll`, { 
        params: { tro_id } 
      });
      
      if (response.data.success && response.data.materialsAtLimit.length > 0) {
        setEditLimitWarning(response.data.materialsAtLimit);
        setBlockEditing(true);
      } else {
        setEditLimitWarning([]);
        setBlockEditing(false);
      }
    } catch (error) {
      console.error("Error checking edit limit:", error);
      setEditLimitWarning([]);
      setBlockEditing(false);
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
    if (blockEditing) {
      setErrorMessage("ไม่สามารถแก้ไขได้เนื่องจากมีวัตถุดิบที่แก้ไขครบ 3 ครั้งแล้ว");
      return;
    }

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
    const message = `อัปเดตแผนการผลิตสำหรับทุกวัตถุดิบบนรถเข็นหมายเลข ${selectedRow.tro_id} สำเร็จ`;
    setSuccessMessage(message);
    onSuccess(updatedData);
    setIsConfirmProdOpen(false);
    onClose();
  };

  const onClose = () => {
    setSelectedPlan(null);
    setSelectedLine(null);
    setErrorMessage("");
    setApprover("");
    setSuccessMessage("");
    setEditLimitWarning([]);
    setBlockEditing(false);
    handleClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          onClose();
        }}
        fullWidth
        maxWidth="md"
        PaperProps={{
          style: {
            borderRadius: '12px',
            padding: '8px'
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
          แก้ไขแผนการผลิตทั้งรถเข็น
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
          {/* แสดงข้อความแจ้งเตือนเมื่อมีวัตถุดิบที่แก้ไขครบ 3 ครั้ง */}
          {editLimitWarning.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>ไม่สามารถแก้ไขแผนการผลิตได้</AlertTitle>
              มีวัตถุดิบที่แก้ไขแผนการผลิตครบ 3 ครั้งแล้วในรถเข็นนี้:
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                {editLimitWarning.map((material, index) => (
                  <Box component="li" key={index} sx={{ mb: 0.5 }}>
                    <Typography variant="body2">
                      <strong>{material.mat}</strong> ({material.mat_name})
                    </Typography>
                  </Box>
                ))}
              </Box>
              
            </Alert>
          )}

          {errorMessage && !blockEditing && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Stack spacing={2}>
            {selectedRow && (
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  ข้อมูลรถเข็นและวัตถุดิบทั้งหมด ({selectedRow.allMaterials?.length || 0} รายการ)
                </Typography>
                <Stack spacing={1} sx={{ pl: 2 }}>
                  <Typography color="rgba(0, 0, 0, 0.6)" fontWeight="medium">
                    Trolley: {selectedRow.tro_id}
                  </Typography>
                  
                  {/* แสดงรายการวัตถุดิบทั้งหมดแทนที่ Production */}
                  {selectedRow.allMaterials?.map((material, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '80px 1fr 1fr',
                        gap: 1,
                        py: 0.5,
                        alignItems: 'center'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Chip 
                          label={material.isMixed ? "Mixed" : "Raw"} 
                          size="small" 
                          sx={{ 
                            backgroundColor: material.isMixed ? '#ff9800' : '#4caf50', 
                            color: 'white',
                            height: '20px',
                            fontSize: '0.7rem',
                            minWidth: '50px'
                          }} 
                        />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight="medium" sx={{ 
                          color: '#333',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {material.mat_name}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{
                          color: '#666',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {material.production || 'ไม่มีแผนการผลิต'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

            {!blockEditing && (
              <>
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
                  
                  {/* แสดงทุก production ที่มีในรถเข็น */}
                  {selectedRow?.allMaterials && (() => {
                    // สร้าง Set เพื่อเก็บ production ที่ไม่ซ้ำกัน
                    const uniqueProductions = [...new Set(
                      selectedRow.allMaterials
                        .map(material => material.production)
                        .filter(prod => prod && prod !== 'ไม่มีแผนการผลิต')
                    )];
                    
                    // ถ้าไม่มี production เลย ให้แสดงข้อความเดิม
                    if (uniqueProductions.length === 0) {
                      return (
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 'medium',
                            fontSize: '16px',
                            color: '#0277bd'
                          }}
                        >
                          ไม่มีแผนการผลิต
                        </Typography>
                      );
                    }
                    
                    // แสดงรายการ production ทั้งหมด
                    return uniqueProductions.map((prod, index) => (
                      <Typography
                        key={index}
                        variant="body1"
                        sx={{
                          fontWeight: 'medium',
                          fontSize: '16px',
                          color: '#0277bd',
                          mb: index < uniqueProductions.length - 1 ? 1 : 0
                        }}
                      >
                        {prod}
                      </Typography>
                    ));
                  })()}
                  
                  {currentLine && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
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

                {showDropdowns && (
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

                {!showDropdowns && selectedPlan && (
                  <Box sx={{ p: 2, border: '1px solid #e1f5fe', borderRadius: 2, backgroundColor: '#f9f9f9' }}>
                    <Typography>
                      {selectedPlan.code} ({selectedPlan.doc_no}) - {selectedLine?.line_name || 'ยังไม่ได้เลือกไลน์'}
                    </Typography>
                  </Box>
                )}

                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>การเปลี่ยนแปลงจะมีผลกับทั้งรถเข็น</AlertTitle>
                  การแก้ไขนี้จะมีผลกับ<b>ทุกวัตถุดิบ ({selectedRow?.allMaterials?.length || 0} รายการ)</b> บนรถเข็นหมายเลข {selectedRow?.tro_id}
                </Alert>

                {selectedPlan && selectedLine && (
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
              </>
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
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            style={{
              backgroundColor: blockEditing || !selectedPlan || !selectedLine || !approver.trim() 
                ? "#A0A0A0" 
                : "#41a2e6",
              color: "#fff"
            }}
            onClick={handleConfirm}
            disabled={blockEditing || !selectedPlan || !selectedLine || !approver.trim()}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>

      {/* Overlay ปิดกั้นการทำงานเมื่อมีวัตถุดิบที่แก้ไขครบ 3 ครั้ง */}
      {open && blockEditing && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1400
        }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
            <CancelIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              ไม่สามารถแก้ไขแผนการผลิต
            </Typography>
            <Typography sx={{ mb: 2 }}>
              มีวัตถุดิบในรถเข็นนี้ที่แก้ไขแผนการผลิตครบ 3 ครั้งแล้ว
            </Typography>
            <Button 
              variant="contained" 
              color="error" 
              sx={{ mt: 2 }}
              onClick={onClose}
            >
              ปิด
            </Button>
          </Paper>
        </Box>
      )}

      {/* Confirm Dialog */}
      {selectedRow && !blockEditing && (
        <ConfirmProdModal
          open={isConfirmProdOpen}
          onClose={() => setIsConfirmProdOpen(false)}
          material={selectedRow.mat}
          materialName={materialName}
          batch={selectedRow.batch}
          mapping_id={selectedRow.mapping_id}
          tro_id={selectedRow.tro_id}
          selectedPlan={selectedPlan}
          selectedLine={selectedLine}
          approver={approver}
          onSuccess={handleConfirmSuccess}
          currentProduction={currentProduction}
          currentLine={currentLine}
          editLimitWarning={editLimitWarning}
        />
      )}
    </>
  );
};
export default EditAllMat;