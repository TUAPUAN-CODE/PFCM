import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel,
    TextField,
    Box,
    Typography,
    Divider
} from '@mui/material';
import { FaCheckCircle, FaTimesCircle, FaClipboardCheck } from 'react-icons/fa';

const QualityCheckModal = ({
    open,
    handleClose,
    rowData = {},
    handleSubmit
}) => {
    const safeRowData = rowData || {};

    const isAlreadyChecked = safeRowData.rm_status === 'QcCheck' && safeRowData.qccheck_cold !== null;

    useEffect(() => {
        if (open && isAlreadyChecked) {
            // ถ้าวัตถุดิบตรวจสอบแล้ว ให้ปิด Modal และแสดงแจ้งเตือน
            handleClose();
            alert('วัตถุดิบนี้ตรวจสอบแล้ว ไม่สามารถตรวจสอบซ้ำได้');
        }
    }, [open, isAlreadyChecked, handleClose]);

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        color: null,
        odor: null,
        texture: null,
        inspectorName: '',
        remark: '',
        approver: ''
    });
    const [validation, setValidation] = useState({
        color: false,
        odor: false,
        texture: false,
        inspectorName: false,
        remark: false,
        approver: false
    });

    // เพิ่มฟังก์ชันตรวจสอบว่ามีอย่างน้อย 1 ข้อที่ไม่ผ่าน
    const hasFailedCheck = () => {
        return formData.color === '0' || formData.odor === '0' || formData.texture === '0';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear validation when user starts typing/selecting
        if (validation[name]) {
            setValidation(prev => ({
                ...prev,
                [name]: false
            }));
        }
    };

    const handleNext = () => {
        // Validate all fields
        const newValidation = {
            color: formData.color === null,
            odor: formData.odor === null,
            texture: formData.texture === null,
            inspectorName: formData.inspectorName.trim() === '',
            remark: hasFailedCheck() && formData.remark.trim() === '',
            approver: formData.approver.trim() === ''
        };

        setValidation(newValidation);

        // Check if any field is invalid
        if (Object.values(newValidation).some(v => v)) {
            return;
        }

        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleConfirm = () => {
        const payload = {
            mapping_id: rowData.mapping_id,
            color: parseInt(formData.color),
            odor: parseInt(formData.odor),
            texture: parseInt(formData.texture),
            inspector_cold: formData.inspectorName,
            remark: formData.remark,
            approver: formData.approver
        };

        handleSubmit(payload);

        // Reset form after successful submission
            setFormData({
                color: null,
                odor: null,
                texture: null,
                inspectorName: '',
                remark: '',
                approver: ''
            });

            
        handleClose();
    };

    const renderStep1 = () => (
        <>
            <DialogTitle sx={{
                backgroundColor: '#f5f5f5',
                borderBottom: '1px solid #e0e0e0',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center'
            }}>
                <FaClipboardCheck style={{ marginRight: '8px', color: '#3f51b5' }} />
                <Typography variant="h6" component="span" sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                    ตรวจสอบคุณภาพวัตถุดิบ
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ padding: '20px' }}>
                <Box mb={3}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', marginBottom: '8px' }}>
                        ข้อมูลวัตถุดิบ
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        marginBottom: '16px'
                    }}>
                        <Typography variant="body2"><strong>Batch:</strong> {rowData?.batch || '-'}</Typography>
                        <Typography variant="body2"><strong>Material:</strong> {rowData?.mat || '-'}</Typography>
                        <Typography variant="body2"><strong>ชื่อวัตถุดิบ:</strong> {rowData?.mat_name || '-'}</Typography>
                        <Typography variant="body2"><strong>น้ำหนัก:</strong> {rowData?.weight_RM || '-'}</Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', marginBottom: '16px' }}>
                    ตรวจสอบ Sensory
                </Typography>

                {['color', 'odor', 'texture'].map((item) => (
                    <FormControl key={item} component="fieldset" sx={{ mb: 3, width: '100%' }}>
                        <FormLabel component="legend" sx={{
                            mb: 1,
                            fontWeight: 'bold',
                            color: validation[item] ? '#f44336' : 'inherit'
                        }}>
                            {item === 'color' && 'สี'}
                            {item === 'odor' && 'กลิ่น'}
                            {item === 'texture' && 'เนื้อวัตถุดิบ'}
                            {validation[item] && ' (จำเป็นต้องเลือก)'}
                        </FormLabel>
                        <RadioGroup
                            row
                            name={item}
                            value={formData[item] || ''}
                            onChange={handleInputChange}
                        >
                            <FormControlLabel
                                value="1"
                                control={<Radio color="primary" />}
                                label="ผ่าน"
                            />
                            <FormControlLabel
                                value="0"
                                control={<Radio color="primary" />}
                                label="ไม่ผ่าน"
                            />
                        </RadioGroup>
                    </FormControl>
                ))}

                {hasFailedCheck() && (
                    <TextField
                        fullWidth
                        label="หมายเหตุ (จำเป็นเมื่อมีข้อที่ไม่ผ่าน)"
                        variant="outlined"
                        name="remark"
                        value={formData.remark}
                        onChange={handleInputChange}
                        error={validation.remark}
                        helperText={validation.remark ? 'กรุณากรอกหมายเหตุเมื่อมีข้อที่ไม่ผ่าน' : ''}
                        sx={{ mt: 2 }}
                        size="small"
                        multiline
                        rows={3}
                    />
                )}

                <TextField
                    fullWidth
                    label="ชื่อผู้ตรวจสอบ"
                    variant="outlined"
                    name="inspectorName"
                    value={formData.inspectorName}
                    onChange={handleInputChange}
                    error={validation.inspectorName}
                    helperText={validation.inspectorName ? 'กรุณากรอกชื่อผู้ตรวจสอบ' : ''}
                    sx={{ mt: 2 }}
                    size="small"
                />

                <TextField
                    fullWidth
                    label="ผู้อนุมัติ"
                    variant="outlined"
                    name="approver"
                    value={formData.approver}
                    onChange={handleInputChange}
                    error={validation.approver}
                    helperText={validation.approver ? 'กรุณากรอกชื่อผู้อนุมัติ' : ''}
                    sx={{ mt: 2 }}
                    size="small"
                />
                
            </DialogContent>
            <DialogActions sx={{ padding: '16px', borderTop: '1px solid #e0e0e0' }}>
                <Button onClick={handleClose} color="inherit">
                    ยกเลิก
                </Button>
                <Button
                    onClick={handleNext}
                    color="primary"
                    variant="contained"
                    startIcon={<FaCheckCircle />}
                >
                    ถัดไป
                </Button>
            </DialogActions>
        </>
    );

    const renderStep2 = () => (
        <>
            <DialogTitle sx={{
                backgroundColor: '#f5f5f5',
                borderBottom: '1px solid #e0e0e0',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center'
            }}>
                <FaClipboardCheck style={{ marginRight: '8px', color: '#3f51b5' }} />
                <Typography variant="h6" component="span" sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                    ยืนยันการตรวจสอบคุณภาพ
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ padding: '20px' }}>
                <Typography variant="body1" sx={{ mb: 3 }}>
                    โปรดตรวจสอบข้อมูลก่อนยืนยันการตรวจสอบคุณภาพ
                </Typography>

                <Box sx={{
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    padding: '16px',
                    mb: 3
                }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                        ผลการตรวจสอบ
                    </Typography>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px'
                    }}>
                        <Typography variant="body2"><strong>สี:</strong> {formData.color === '1' ? 'ผ่าน' : 'ไม่ผ่าน'}</Typography>
                        <Typography variant="body2"><strong>กลิ่น:</strong> {formData.odor === '1' ? 'ผ่าน' : 'ไม่ผ่าน'}</Typography>
                        <Typography variant="body2"><strong>เนื้อวัตถุดิบ:</strong> {formData.texture === '1' ? 'ผ่าน' : 'ไม่ผ่าน'}</Typography>
                        <Typography variant="body2"><strong>ผู้ตรวจสอบ:</strong> {formData.inspectorName}</Typography>
                        <Typography variant="body2"><strong>ผู้อนุมัติ:</strong> {formData.approver}</Typography>
                    </Box>
                </Box>

                <Typography variant="body2" color="textSecondary">
                    เมื่อยืนยันแล้ว ระบบจะบันทึกผลการตรวจสอบและอัปเดตสถานะวัตถุดิบ
                </Typography>
            </DialogContent>
            <DialogActions sx={{ padding: '16px', borderTop: '1px solid #e0e0e0' }}>
                <Button onClick={handleBack} color="inherit">
                    ย้อนกลับ
                </Button>
                <Button
                    onClick={handleConfirm}
                    color="primary"
                    variant="contained"
                    startIcon={<FaCheckCircle />}
                >
                    ยืนยันการตรวจสอบ
                </Button>
            </DialogActions>
        </>
    );

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '12px'
                }
            }}
        >
            {step === 1 ? renderStep1() : renderStep2()}
        </Dialog>
    );
};

export default QualityCheckModal;