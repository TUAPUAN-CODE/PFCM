import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import axios from "axios";
axios.defaults.withCredentials = true; 
import ModalAlert from "../../../../Popup/AlertSuccess";
import SuccessPrinter from "../../History/Asset/SuccessPrinter"; 

const API_URL = import.meta.env.VITE_API_URL;

const ModalDelete = ({ open, onClose, data, onSuccess, dataPrinter }) => {
  const [confirm, setConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showPrinter, setShowPrinter] = useState(false);
  const [processedData, setProcessedData] = useState(null);

  useEffect(() => {
    console.log(data);
    console.log(dataPrinter);
    
    if (confirm && data) {
      console.log("mixed_code :" ,data.mix_code);

      const handleConfirm = async () => {
        try {
          const response = await axios.post(`${API_URL}/api/pack/mixed/delay-time`, {
            mixed_code: data.mix_code,
            mapping_id: data.mapping_ids
          });

          if (response.data.success || response.status === 200) {
            console.log("Successfully updated production status:", response.data.message);
            
            // ตรวจสอบว่า dataPrinter มีค่าหรือไม่
            if (dataPrinter) {
              setProcessedData(dataPrinter);
              setShowPrinter(true);
              // ย้าย onClose และ onSuccess ไปที่ handlePrinterClose แทน
            } else {
              console.warn("No printer data available");
              setShowAlert(true);
              // ถ้าไม่มี printer data ให้ปิด modal ทันที
              onClose();
              onSuccess();
            }
            
          } else {
            console.error("Error:", response.data.message);
            setShowAlert(true);
          }
          
        } catch (error) {
          console.error("API request failed:", error);
          setShowAlert(true);
        }
        setConfirm(false);
      };
      handleConfirm();
    }
  }, [confirm, data, onClose, onSuccess, dataPrinter]);

  const handleAlertClose = () => {
    setShowAlert(false);
  };

  const handlePrinterClose = () => {
    setShowPrinter(false);
    // เรียก onClose และ onSuccess หลังจากปิดหน้า printer
    onClose();
    onSuccess();
  };

  if (!data) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          onClose();
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
            กรุณาตรวจสอบข้อมูลก่อนยืนยันการบรรจุสำเร็จ
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">รหัสการผสม: {data.mix_code}</Typography>
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
              onClick={() => setConfirm(true)}
            >
              ยืนยัน
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      
      {/* Success alert for errors */}
      <ModalAlert open={showAlert} onClose={handleAlertClose} />
      
      {/* Success printer dialog */}
      {showPrinter && processedData && (
        <SuccessPrinter 
          open={showPrinter} 
          onClose={handlePrinterClose} 
          data={processedData} 
        />
      )}
    </>
  );
};

export default ModalDelete;