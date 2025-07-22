import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  Switch, 
  FormControlLabel,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';

const AddEditModal = ({ 
  open, 
  onClose, 
  mode, 
  initialData, 
  tableType, 
  onSave,
  workAreas = [] // เพิ่มพารามิเตอร์เพื่อรับ workAreas (ถ้ามี)
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Reset form data when initialData changes or dialog opens
  useEffect(() => {
    if (open && initialData) {
      console.log('Initializing form data:', initialData);
      // สร้าง copy ของ initialData เพื่อป้องกันการแก้ไขข้อมูลต้นฉบับโดยตรง
      // จัดการกับกรณี WorkArea/WorkAreaCode ที่อาจสับสน
      let formattedData = { ...initialData };
      
      if (tableType === 'wa') {
        // ให้แน่ใจว่าใช้ชื่อฟิลด์ถูกต้องสำหรับ Work Area
        formattedData.WorkAreaCode = initialData.WorkAreaCode || initialData.WorkArea || '';
        formattedData.WorkAreaName = initialData.WorkAreaName || '';
      } else if (tableType === 'md') {
        // ให้แน่ใจว่าใช้ชื่อฟิลด์ถูกต้องสำหรับ Metal Detector
        formattedData.md_no = initialData.md_no || '';
        formattedData.WorkAreaCode = initialData.WorkAreaCode || initialData.WorkArea || '';
        formattedData.Status = initialData.Status === undefined ? 1 : initialData.Status;
      }
      
      setFormData(formattedData);
    } else if (open) {
      // กรณีเพิ่มข้อมูลใหม่
      if (tableType === 'md') {
        setFormData({ md_no: '', WorkAreaCode: '', Status: 1 });
      } else {
        setFormData({ WorkAreaCode: '', WorkAreaName: '' });
      }
    }
    
    setErrors({});
    setFormError('');
  }, [initialData, open, tableType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      const newErrors = {...errors};
      delete newErrors[name];
      setErrors(newErrors);
    }
    
    // Clear general form error
    if (formError) {
      setFormError('');
    }
  };

  const handleStatusChange = (e) => {
    setFormData(prev => ({ ...prev, Status: e.target.checked ? 1 : 0 }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (tableType === 'md') {
      if (!formData.md_no || formData.md_no.trim() === '') {
        newErrors.md_no = 'กรุณากรอกหมายเลขเครื่อง';
      }
    } else if (tableType === 'wa') {
      if (!formData.WorkAreaCode || formData.WorkAreaCode.trim() === '') {
        newErrors.WorkAreaCode = 'กรุณากรอกรหัสพื้นที่';
      }

      if (!formData.WorkAreaName || formData.WorkAreaName.trim() === '') {
        newErrors.WorkAreaName = 'กรุณากรอกชื่อพื้นที่';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setLoading(true);
        setFormError('');
        await onSave(formData, mode);
        // ถ้าไม่มีข้อผิดพลาด จะปิดฟอร์มโดยอัตโนมัติผ่าน onSave function
      } catch (error) {
        console.error("Form submission error:", error);
        setFormError(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
      } finally {
        setLoading(false);
      }
    }
  };

  const getTitle = () => {
    const actionText = mode === 'add' ? 'เพิ่ม' : 'แก้ไข';
    const itemType = tableType === 'md' ? 'เครื่องตรวจจับโลหะ' : 'พื้นที่';
    return `${actionText}${itemType}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose} // ป้องกันการปิดฟอร์มขณะบันทึกข้อมูล
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>
        {getTitle()}
        {mode === 'edit' && tableType === 'md' && (
          <Typography variant="subtitle2" color="text.secondary">
            หมายเลขเครื่อง: {formData.md_no}
          </Typography>
        )}
        {mode === 'edit' && tableType === 'wa' && (
          <Typography variant="subtitle2" color="text.secondary">
            รหัสพื้นที่: {formData.WorkAreaCode}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}
        
        {tableType === 'md' ? (
          // Metal Detector Form
          <>
            <TextField
              margin="dense"
              name="md_no"
              label="หมายเลขเครื่อง"
              fullWidth
              value={formData.md_no || ''}
              onChange={handleChange}
              disabled={mode === 'edit'}
              error={!!errors.md_no}
              helperText={errors.md_no}
              sx={{ mb: 2, mt: 1 }}
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={formData.Status === 1} 
                  onChange={handleStatusChange} 
                />
              }
              label="สถานะ (เปิดใช้งาน)"
            />
          </>
        ) : (
          // Work Area Form
          <>
            <TextField
              margin="dense"
              name="WorkAreaCode"
              label="รหัสพื้นที่"
              fullWidth
              value={formData.WorkAreaCode || ''}
              onChange={handleChange}
              disabled={mode === 'edit'}
              error={!!errors.WorkAreaCode}
              helperText={errors.WorkAreaCode}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              margin="dense"
              name="WorkAreaName"
              label="ชื่อพื้นที่"
              fullWidth
              value={formData.WorkAreaName || ''}
              onChange={handleChange}
              error={!!errors.WorkAreaName}
              helperText={errors.WorkAreaName}
              sx={{ mb: 1 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>ยกเลิก</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditModal;