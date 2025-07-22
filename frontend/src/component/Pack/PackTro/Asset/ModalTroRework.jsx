import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  useTheme,
  Divider,
  FormControlLabel,
  CircularProgress,
  TextField,
  RadioGroup,
  Radio
} from "@mui/material";
import { styled } from "@mui/system";
import { IoClose } from "react-icons/io5";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PrinterContainer from "../../History/Asset/PrinterComponent"; 

const API_URL = import.meta.env.VITE_API_URL;

const StyledModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const ModalContent = styled(Box)(({ theme }) => ({
  position: "relative",
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  maxWidth: "400px",
  width: "100%",
  boxShadow: theme.shadows[5],
  height: "auto",
}));

const CloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  color: theme.palette.grey[600],
}));

const TrolleyReworkModal = ({ open, onClose, onNext, data, rmfp_id, mapping_id, CookedDateTime }) => {
  const theme = useTheme();
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // State for destination selection
  const [deliveryLocation, setDeliveryLocation] = useState('');
  
  // Form fields
  const [operator, setOperator] = useState('');
  const [remarkedit, setRemarkedit] = useState('');
  
  // State for printer modal
  const [printerOpen, setPrinterOpen] = useState(false);
  const [printData, setPrintData] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setApiError('');
      setSuccessMessage("");
      setDeliveryLocation('');
      setOperator('');
      setRemarkedit('');
      setPrinterOpen(false);
      setPrintData(null);
      
      // If we have data from a previous step, restore it
      if (data && data.formData) {
        setOperator(data.formData.operator || '');
        setRemarkedit(data.formData.remarkedit || '');
        setDeliveryLocation(data.formData.deliveryLocation || '');
      }
    }
  }, [open, data]);

  // Handle radio button changes for delivery location
  const handleDeliveryLocationChange = (event) => {
    setDeliveryLocation(event.target.value);
  };

  const handleSubmit = async () => {
    // Validation
    if (!deliveryLocation) {
      setApiError("กรุณาเลือกปลายทาง (ห้องเย็น, หม้ออบ, หรือกลับมาเตรียม)");
      return;
    }

    if (!operator || !remarkedit) {
      setApiError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // Check for valid data
    if (!data || !data.tro_id) {
      setApiError("ข้อมูลไม่ถูกต้อง ไม่พบ tro_id");
      return;
    }
    console.log("Data mapping_id:", data.mapping_id || mapping_id);

    
    
    if (!data.mapping_id) {
      setApiError("ข้อมูลไม่ถูกต้อง ไม่พบ mapping_id");
      return;
    }

    setIsSubmitting(true);

    try {
      // Using the backend endpoint
      const response = await axios.put(`${API_URL}/api/pack/rework/trolley`, {
        dest: deliveryLocation,
        tro_id: data.tro_id,
        receiver_pack_edit: operator,
        remark_pack_edit: remarkedit,
        mapping_id: data.mapping_id,
        delayTime: data.delayTime
      });

      if (response.data.success) {
        setSuccessMessage(response.data.message || "บันทึกข้อมูลสำเร็จ");
        
        // Prepare data for the printer
        const printDataObj = {
          ...data,
          dest: deliveryLocation,
          receiver_pack_edit: operator,
          remark_pack_edit: remarkedit,
          // Add any additional data needed for the printer
        };
        
        setPrintData(printDataObj);

         // เรียกใช้ onNext เพื่อปิด parent modal (ModalEditPD)
        onNext(printDataObj);
        
        // Open printer modal after short delay
          setPrinterOpen(true);
        
      } else {
        setApiError(response.data.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (error) {
      console.error("Error updating destination:", error);
      setApiError(error.response?.data?.message || "เกิดข้อผิดพลาดในการติดต่อกับเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrinterClose = () => {
    setPrinterOpen(false);
    setPrintData(null);
    onClose(); // Close the main modal after printer dialog is closed
    onNext();
  };

  return (
    <>
      <StyledModal 
        open={open} 
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return; // Prevent closing on backdrop click
          onClose(); // Close on button click or other cases
        }}
      >
        <ModalContent>
          <CloseButton aria-label="close" onClick={onClose}><IoClose /></CloseButton>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
            <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
              กรุณากรอกข้อมูล
            </Typography>

            {/* แสดงข้อมูลวัตถุดิบที่ได้รับมา */}
            {data && (
              <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  รายละเอียด:
                </Typography>
                <Typography variant="body2">
                  {data.tro_id && `หมายเลขรถเข็น: ${data.tro_id}`}
                </Typography>
                <Typography variant="body2">
                  {data.itemCount && `จำนวนรายการในรถเข็น: ${data.itemCount}`}
                </Typography>
              </Box>
            )}

            {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            <Divider sx={{ mb: 2 }} />

            {/* Form Fields */}
            <TextField
              label="หมายเหตุ"
              variant="outlined"
              fullWidth
              size="small"
              value={remarkedit}
              onChange={(e) => setRemarkedit(e.target.value)}
              sx={{ marginBottom: '16px' }}
            />
            
            <TextField
              label="ผู้ดำเนินการ"
              variant="outlined"
              fullWidth
              size="small"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              sx={{ marginBottom: '16px' }}
            />

            {/* Delivery location selection with Radio buttons */}
            <Typography sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
              เลือกปลายทาง:
            </Typography>
            
            <Box sx={{ display: "flex", alignItems: "center", paddingLeft: "12px", mb: 2 }}>
              <RadioGroup 
                row 
                name="location" 
                value={deliveryLocation} 
                onChange={handleDeliveryLocationChange}
              >
                <FormControlLabel 
                  value="จุดเตรียม" 
                  control={<Radio />} 
                  style={{ color: "#666" }} 
                  label="จุดเตรียม" 
                />
                <FormControlLabel 
                  value="เข้าห้องเย็น" 
                  control={<Radio />} 
                  style={{ color: "#666" }} 
                  label="ห้องเย็น" 
                />
              </RadioGroup>
            </Box>

            <Divider sx={{ mt: 1, mb: 1 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1, height: "42px" }}>
              <Button
                style={{ backgroundColor: "#E74A3B", color: "#fff" }}
                variant="contained"
                startIcon={<CancelIcon />}
                onClick={onClose}
                disabled={isSubmitting}
              >
                ยกเลิก
              </Button>
              <Button
                style={{ backgroundColor: "#41a2e6", color: "#fff" }}
                variant="contained"
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "กำลังบันทึก..." : "ยืนยัน"}
              </Button>
            </Box>
          </Box>
        </ModalContent>
      </StyledModal>

      {/* Printer Container Modal */}
      {printData && (
        <PrinterContainer
          open={printerOpen}
          onClose={handlePrinterClose}
          data={printData}
        />
      )}
    </>
  );
};

export default TrolleyReworkModal;