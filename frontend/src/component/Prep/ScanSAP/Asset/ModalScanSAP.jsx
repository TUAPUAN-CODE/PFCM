import React, { useState, useEffect, useRef } from "react";
import { Modal, Box, Typography, TextField, Button, IconButton, Tooltip, Alert, useTheme, Divider, DialogContent, Dialog, Autocomplete } from "@mui/material";
import { styled } from "@mui/system";
import { IoClose, IoInformationCircle } from "react-icons/io5";
import QrScanner from "qr-scanner";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const API_URL = import.meta.env.VITE_API_URL;

const StyledModal = styled(Modal)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const ModalContent = styled(Box)(({ theme }) => ({
  position: "relative",
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  maxWidth: "600px",
  width: "100%",
  boxShadow: theme.shadows[5],
}));

const CameraActivationModal = ({
  open,
  onClose,
  onConfirm,
  primaryBatch,
  secondaryBatch,
  setPrimaryBatch,
  setSecondaryBatch,
}) => {
  const theme = useTheme();
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const rawMaterialInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");
  const [primaryError, setPrimaryError] = useState(false);
  const [secondaryError, setSecondaryError] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isRawMaterialFocused, setIsRawMaterialFocused] = useState(false);

  const CloseButton = styled(IconButton)(({ theme }) => ({
    position: "absolute",
    top: theme.spacing(1),
    right: theme.spacing(1),
    color: theme.palette.grey[600],
  }));

  const isFormValid = primaryBatch && secondaryBatch && secondaryBatch.length === 10;

  // Add keyboard event listener for USB scanner
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      // Only process input if raw material field is focused
      if (isRawMaterialFocused && e.key !== 'Enter') {
        // For USB scanner that sends data as keypress events
        // We'll let the input field handle the data naturally
      }
    };

    const handleKeyPress = (e) => {
      // Handle the Enter key from scanner (scanners often send Enter after data)
      if (isRawMaterialFocused && e.key === 'Enter') {
        e.preventDefault();
        processScannerInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [open, isRawMaterialFocused, inputValue]);

  // Auto-focus on Raw Materials field when modal opens
  useEffect(() => {
    if (open && rawMaterialInputRef.current) {
      const inputElement = rawMaterialInputRef.current.querySelector('input');
      if (inputElement) {
        inputElement.focus();
        setIsRawMaterialFocused(true);
      }
    }
  }, [open]);

  const processScannerInput = () => {
    if (!inputValue) return;
    
    // Example input: 11M1EL003002|08FFXNCT38|301598575|270.000|KG
    const parts = inputValue.split('|');
    if (parts.length >= 2) {
      const var1 = parts[0].substring(0, 12); // First 12 characters
      const var2 = parts[1].substring(0, 10); // First 10 characters of second part
      
      console.log('Scanner input processed:', { var1, var2 });
      
      setPrimaryBatch(var1);
      setSecondaryBatch(var2);
      setInputValue(var1);
      
      // Simulate the scan success flow
      setScanSuccess(true);
      setTimeout(() => {
        onConfirm(var1, var2);
        setProcessing(false);
        setScanSuccess(false);
      }, 800);
    }
  };

  const fetchRawMaterials = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/rawmat/AllSearch`, { credentials: "include" });
      const data = await response.json();

      if (data.success) {
        const uniqueMaterials = Array.from(
          new Map(data.data.map(item => [item.mat, item])).values()
        );
        setRawMaterials(uniqueMaterials);
      } else {
        console.error("Failed to fetch raw materials:", data.message);
        setError("ไม่สามารถดึงข้อมูลวัตถุดิบได้");
      }
    } catch (err) {
      console.error("Error fetching raw materials:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);

        const qrScanner = new QrScanner(
          videoRef.current,
          async (result) => {
            handleScannedData(result.data);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );
        
        qrScannerRef.current = qrScanner;
        qrScanner.start();
      }
    } catch (err) {
      setError("ไม่สามารถเปิดกล้องได้. โปรดตรวจสอบการยอมรับของอุปกรณ์");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    setCameraActive(false);
  };

  const resetForm = () => {
    setPrimaryBatch("");
    setSecondaryBatch("");
    setError("");
    setPrimaryError(false);
    setSecondaryError(false);
    setScanSuccess(false);
    setProcessing(false);
    setInputValue('');
    setIsRawMaterialFocused(false);
  };

  const handleClose = () => {
    onClose();
    stopCamera();
    resetForm();
  };

  const handleScannedData = async (result) => {
    if (processing) return;
    
    setProcessing(true);
    
    try {
      const qrParts = result.split("|");
      
      if (qrParts.length < 2) {
        setError("รูปแบบ QR Code ไม่ถูกต้อง ต้องมีข้อมูล Raw Material และ Batch");
        setProcessing(false);
        return;
      }
      
      const rawMaterial = qrParts[0].trim();
      const batch = qrParts[1].trim().toUpperCase(); // Convert to uppercase
      
      if (batch.length !== 10) {
        setError(`Batch ต้องมี 10 ตัวอักษร (ได้รับ ${batch.length} ตัวอักษร)`);
        setSecondaryError(true);
        setProcessing(false);
        return;
      }
      
      setPrimaryBatch(rawMaterial);
      setSecondaryBatch(batch);
      setInputValue(rawMaterial);
      setPrimaryError(false);
      setSecondaryError(false);
      setError("");
      
      try {
        const response = await fetch(
          `${API_URL}/api/checkRawMat?mat=${encodeURIComponent(rawMaterial)}`
        );
        const data = await response.json();

        if (response.ok) {
          setScanSuccess(true);
          setTimeout(() => {
            onConfirm(rawMaterial, batch);
            setProcessing(false);
            setScanSuccess(false);
          }, 800);
        } else {
          setPrimaryError(true);
          setError(data.message || "ไม่พบข้อมูลวัตถุดิบในฐานข้อมูล");
          setProcessing(false);
        }
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
        setProcessing(false);
      }
      
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการประมวลผล QR Code");
      setProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (processing) return;
    setProcessing(true);
    
    let hasError = false;

    if (!primaryBatch) {
      setPrimaryError(true);
      setError("กรุณากรอกข้อมูล Raw Material");
      hasError = true;
    } else {
      setPrimaryError(false);
    }

    if (!secondaryBatch) {
      setSecondaryError(true);
      setError("กรุณากรอกข้อมูล Batch");
      hasError = true;
    } else if (secondaryBatch.length !== 10) {
      setSecondaryError(true);
      setError("Batch ต้องมี 10 ตัวอักษรเท่านั้น");
      hasError = true;
    } else {
      setSecondaryError(false);
    }

    if (!hasError) {
      try {
        const response = await fetch(
          `${API_URL}/api/checkRawMat?mat=${encodeURIComponent(primaryBatch)}`
        );
        const data = await response.json();

        if (response.ok) {
          onConfirm(primaryBatch, secondaryBatch);
          setProcessing(false);
        } else {
          setPrimaryError(true);
          setError(data.message || "ไม่พบข้อมูลวัตถุดิบในฐานข้อมูล");
          setProcessing(false);
        }
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
        setProcessing(false);
      }
    } else {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (open) {
      startCamera();
      fetchRawMaterials();
      setScanSuccess(false);
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  return (
    <Dialog 
      open={open} 
      onClose={(e, reason) => {
        if (reason === 'backdropClick') return;
        handleClose();
      }} 
      maxWidth="xs" 
      fullWidth
    >
      <DialogContent>
        <CloseButton aria-label="close" onClick={handleClose}>
          <IoClose />
        </CloseButton>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
          <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
            สแกน Qr Code เพื่อรับข้อมูลวัตถุดิบ
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {scanSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              สแกน QR Code สำเร็จ! กำลังดำเนินการต่อ...
            </Alert>
          )}

          <Divider />
          
          <video 
            ref={videoRef} 
            style={{ 
              width: "100%", 
              marginBottom: theme.spacing(2), 
              marginTop: "15px", 
              borderRadius: "4px",
              border: scanSuccess ? "2px solid #4CAF50" : "2px solid #f0f0f0"
            }} 
            autoPlay 
            muted 
          />

          <Box>
            <Autocomplete
              id="raw-material-autocomplete"
              options={rawMaterials}
              fullWidth
              loading={loading}
              value={rawMaterials.find(mat => mat.mat === primaryBatch) || null}
              onChange={(event, newValue) => {
                setPrimaryBatch(newValue ? newValue.mat : '');
                setPrimaryError(false);
                setError("");
              }}
              inputValue={inputValue}
              onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
              }}
              getOptionLabel={(option) => `${option.mat}`}
              isOptionEqualToValue={(option, value) => option.mat === value.mat}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Raw Materials (พร้อมรับข้อมูลจากสแกนเนอร์)"
                  error={primaryError}
                  helperText={primaryError ? (error || "กรุณาเลือก Raw Material") : ""}
                  size="small"
                  margin="normal"
                  required
                  inputRef={rawMaterialInputRef}
                  onFocus={() => setIsRawMaterialFocused(true)}
                  onBlur={() => setIsRawMaterialFocused(false)}
                  InputProps={{ 
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        <IoInformationCircle color={theme.palette.info.main} />
                        {params.InputProps.endAdornment}
                      </>
                    ),
                    readOnly: scanSuccess
                  }}
                  sx={{
                    '& label': {
                      color: isRawMaterialFocused ? theme.palette.primary.main : 'inherit',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: isRawMaterialFocused ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.23)',
                      },
                    },
                  }}
                />
              )}
              loadingText="กำลังโหลดข้อมูล..."
              noOptionsText="ไม่พบข้อมูลวัตถุดิบที่ตรงกัน"
            />
            
            <Tooltip title="กรุณากรอกข้อมูล Batch (ต้องกรอก 10 ตัวอักษรเท่านั้น)">
              <TextField
                fullWidth
                label="Batch (ต้องกรอก 10 ตัวอักษร)"
                size="small"
                value={secondaryBatch}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase(); // Convert to uppercase
                  if (value.length <= 10) {
                    setSecondaryBatch(value);
                    setSecondaryError(false);
                    setError("");
                    setScanSuccess(false);
                  }
                }}
                error={secondaryError}
                helperText={secondaryError ? 
                  (secondaryBatch.length === 0 ? "กรุณากรอกข้อมูล Batch" : "Batch ต้องมี 10 ตัวอักษรเท่านั้น") 
                  : ""}
                margin="normal"
                required
                InputProps={{ 
                  endAdornment: <IoInformationCircle color={theme.palette.info.main} />,
                  readOnly: scanSuccess
                }}
                inputProps={{ 
                  maxLength: 10,
                  pattern: ".{10}",
                  style: { textTransform: 'uppercase' } // Visual feedback for uppercase
                }}
              />
            </Tooltip>

            <Divider sx={{ mt: 1 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", pt: 3 }}>
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
                style={{ 
                  backgroundColor: isFormValid ? "#41a2e6" : "#cccccc",
                  color: "#fff",
                }}
                onClick={handleConfirm}
                disabled={!isFormValid || processing}
              >
                ยืนยัน
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CameraActivationModal;