import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    CircularProgress,
    Snackbar,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const MoveRawMaterialModal = ({
    open,
    onClose,
    selectedMaterials,
    currentTroId,
    currentSlotId,
    onSuccess
}) => {
    const [materialsWithWeight, setMaterialsWithWeight] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // ตั้งค่าน้ำหนักเริ่มต้นเมื่อโหลด Modal
    useEffect(() => {
        if (open && selectedMaterials.length > 0) {
            const initialMaterials = selectedMaterials.map(material => ({
                ...material,
                weightToMove: material.weight_RM.toString(), // ตั้งค่าน้ำหนักเริ่มต้นเป็นน้ำหนักที่มีทั้งหมด
                error: ''
            }));
            setMaterialsWithWeight(initialMaterials);
        }
    }, [open, selectedMaterials]);

    // ตรวจสอบความถูกต้องของน้ำหนักที่กรอก
    const validateWeight = (weight, maxWeight) => {
        if (!weight) return 'กรุณากรอกน้ำหนัก';
        const num = parseFloat(weight);
        if (isNaN(num)) return 'กรุณากรอกตัวเลข';
        if (num <= 0) return 'น้ำหนักต้องมากกว่า 0';
        if (num > maxWeight) return `น้ำหนักเกิน (มี ${maxWeight} กก.)`;
        return '';
    };

    // ฟังก์ชันเมื่อเปลี่ยนน้ำหนักในแต่ละรายการ
    const handleWeightChange = (index, value) => {
        const newMaterials = [...materialsWithWeight];
        const material = newMaterials[index];

        material.weightToMove = value;
        material.error = validateWeight(value, parseFloat(material.weight_RM));

        setMaterialsWithWeight(newMaterials);
    };

    // ตรวจสอบว่ามีข้อผิดพลาดในฟอร์มหรือไม่
    const hasErrors = () => {
        return materialsWithWeight.some(material =>
            material.error || !material.weightToMove || parseFloat(material.weightToMove) <= 0
        );
    };

    // ฟังก์ชันสำหรับย้ายวัตถุดิบ
    const handleMoveRawMaterials = async () => {
  if (hasErrors()) {
    showSnackbar('กรุณาตรวจสอบน้ำหนักที่กรอกให้ถูกต้อง', 'error');
    return;
  }

  setIsLoading(true);

  try {
    for (const material of materialsWithWeight) {
      const weight = parseFloat(material.weightToMove);

      const payload = {
        source_tro_id: material.tro_id,
        target_tro_id: currentTroId,
        weight: weight,
        slot_id: currentSlotId,
        rmfp_id: material.rmfp_id,
        mix_code: material.mix_code,
        mapping_id: material.mapping_id,
        isMixed: material.isMixed || false
      };

      const response = await axios.put(
        `${API_URL}/api/coldstorage/addRawMatToTrolley`,
        payload
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'เกิดข้อผิดพลาดในการย้ายวัตถุดิบ');
      }
    }

    showSnackbar('ย้ายวัตถุดิบสำเร็จ', 'success');
    onSuccess(); // ส่ง callback ไปเคลียร์การเลือก
    onClose();
  } catch (error) {
    console.error('Error moving raw materials:', error);
    showSnackbar(
      error.response?.data?.error || error.message || 'เกิดข้อผิดพลาดในการย้ายวัตถุดิบ',
      'error'
    );
  } finally {
    setIsLoading(false);
  }
};

    const handleCancel = () => {
        onClose(); // แค่ปิด Modal โดยไม่เคลียร์ state
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center">
                        <LocalShippingIcon sx={{ mr: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            ย้ายวัตถุดิบเข้าสู่รถเข็นปัจจุบัน
                        </Typography>
                        <Chip
                            label={`รถเข็นปลายทาง: ${currentTroId}`}
                            color="primary"
                            variant="outlined"
                            sx={{ ml: 2 }}
                        />
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        กรุณากำหนดน้ำหนักที่ต้องการย้ายสำหรับแต่ละรายการ:
                    </Typography>

                    <TableContainer component={Paper} sx={{ maxHeight: 500, overflowY: 'auto' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>รถเข็นต้นทาง</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>วัตถุดิบ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }} align="right">น้ำหนักที่มี (กก.)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '20%' }} align="right">น้ำหนักที่จะย้าย (กก.)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }} align="center">สถานะ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {materialsWithWeight.map((material, index) => (
                                    <TableRow key={index} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center">
                                                <LocalShippingIcon color="action" sx={{ mr: 1 }} />
                                                <Typography variant="body2">
                                                    {material.tro_id}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="textSecondary">
                                                ช่องจอด: {material.slot_id}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {material.isMixed ? (
                                                <Box>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        Mixed: {material.mix_code}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Prod: {material.production}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Box>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {material.mat_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {material.mat} | Batch: {material.batch || '-'}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">
                                                {parseFloat(material.weight_RM).toFixed(2)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={material.weightToMove}
                                                onChange={(e) => handleWeightChange(index, e.target.value)}
                                                inputProps={{
                                                    min: 0,
                                                    max: material.weight_RM,
                                                    step: "0.01"
                                                }}
                                                error={!!material.error}
                                                helperText={material.error}
                                                sx={{ width: 120 }}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            {material.error ? (
                                                <Chip
                                                    label="ข้อมูลไม่ถูกต้อง"
                                                    color="error"
                                                    size="small"
                                                />
                                            ) : (
                                                <Chip
                                                    label="พร้อมย้าย"
                                                    color="success"
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={handleCancel}
                        color="inherit"
                        variant="outlined"
                        sx={{ mr: 1 }}
                        disabled={isLoading}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleMoveRawMaterials}
                        color="primary"
                        variant="contained"
                        disabled={isLoading || hasErrors()}
                        startIcon={isLoading ? <CircularProgress size={20} /> : null}
                    >
                        {isLoading ? 'กำลังดำเนินการ...' : 'ย้ายวัตถุดิบทั้งหมด'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default MoveRawMaterialModal;