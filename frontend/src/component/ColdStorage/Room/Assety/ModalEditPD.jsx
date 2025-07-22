import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  FormControl,
  FormLabel,
  Alert,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  Grid,
  Fade,
  Tooltip,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import ScaleIcon from '@mui/icons-material/Scale';
import EventIcon from '@mui/icons-material/Event';
import CategoryIcon from '@mui/icons-material/Category';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';

const API_URL = import.meta.env.VITE_API_URL;

const ModalEditPD = ({ open, onClose, data, onSuccess, slotInfo }) => {
  const [errorMessage, setErrorMessage] = useState("");
  const [TypeColdMove, setTypeColdMove] = useState("");
  const [ColdMove, setColdMove] = useState("");
  const [weight, setWeight] = useState("");
  const [formData, setFormData] = useState(data || {});
  const [showSuccess, setShowSuccess] = useState(false);
  const [itemWeight, setItemWeight] = useState(0); // น้ำหนักของรายการวัตถุดิบนี้
  const [totalWeight, setTotalWeight] = useState(0); // น้ำหนักรวมของรถเข็น
  const [weightError, setWeightError] = useState("");

  // Log ข้อมูลที่ได้รับเพื่อตรวจสอบ
  useEffect(() => {
    if (data) {
      console.log("ModalEditPD ได้รับข้อมูล:", data);
      console.log("แผนการผลิต:", data.production || data.แผนการผลิต || "ไม่พบข้อมูลแผนการผลิต");

      setFormData(data);
      setErrorMessage("");
      setShowSuccess(false);
      setWeightError("");

      // รีเซ็ตค่าการเลือกทุกครั้งที่เปิด Modal ใหม่
      setTypeColdMove("");
      setColdMove("");

      // ตั้งค่าน้ำหนักรายการวัตถุดิบ (weight_RM)
      const itemWeightValue = parseFloat(data?.weight || data?.weight_RM || 0);
      setItemWeight(itemWeightValue);

      // ตั้งค่าน้ำหนักรวม (weight_per_tro)
      const totalWeightValue = parseFloat(data?.weighttotal || data?.weight_RM || 0);
      setTotalWeight(totalWeightValue);

      setWeight(""); // รีเซ็ตค่าน้ำหนักทุกครั้ง
    }
  }, [data, open]);

  const handleSave = () => {
    if (!TypeColdMove || !ColdMove) {
      setErrorMessage("กรุณาเลือกประเภทการย้ายและห้องเย็น");
      return;
    }

    const updatedData = {
      ...data,
      oldTrolleyId: data?.tro || data?.tro_id || slotInfo?.tro_id || "", // ต้องมีค่าเสมอ
      tro: data?.tro || data?.tro_id || slotInfo?.tro_id || "",
      // ใช้ itemWeight (weight_RM) สำหรับย้ายทั้งรายการ แทนที่จะใช้ totalWeight (weight_per_tro)
      weight: TypeColdMove === "ย้ายทั้งรายการ" ? itemWeight : parseFloat(weight),
      TypeColdMove,
      ColdMove,
      cs_id: data?.cs_id || slotInfo?.cs_id || "",
      slot_id: data?.slot_id || slotInfo?.slot_id || "",

      // เพิ่มข้อมูลวัตถุดิบเพื่อระบุรายการที่ชัดเจน
      rawmat: data?.mat || data?.material_id || "",
      mat_name: data?.mat_name || data?.material_name || "",

      mix_code: data?.mix_code || "",
      mapping_id: data?.mapping_id || "",
      isMixed: data?.isMixed || false

    };

    console.log("ModalEditPD - ข้อมูลที่จะส่งไป:", updatedData);
    setShowSuccess(true);
    setTimeout(() => {
      // เรียก callback onSuccess เพื่อส่งข้อมูลกลับไปยัง SlotModal
      if (onSuccess) {
        console.log("ModalEditPD - เรียกใช้ onSuccess");
        onSuccess(updatedData);
      } else {
        console.log("ModalEditPD - ไม่มี onSuccess, เรียกใช้ onClose");
        onClose(); // ถ้าไม่มี onSuccess ให้ปิด modal
      }
    }, 1000);
  };

  const handleTypeColdMove = (event) => {
    const selectedType = event.target.value;
    setTypeColdMove(selectedType);
    setErrorMessage(""); // ล้างข้อความแจ้งเตือน
    setWeightError("");

    // เมื่อเลือก "ย้ายทั้งรายการ" ให้ใช้น้ำหนักของรายการนั้น
    if (selectedType === "ย้ายทั้งรายการ") {
      setWeight(itemWeight.toString());
    } else if (selectedType === "ย้ายบางส่วน") {
      // เมื่อเลือก "ย้ายบางส่วน" ให้เริ่มจากศูนย์
      setWeight("0");
    }
  };

  const handleWeight = (event) => {
    const inputWeight = event.target.value;
    setWeight(inputWeight);
    setErrorMessage(""); // ล้างข้อความแจ้งเตือน

    // ตรวจสอบว่าน้ำหนักที่ใส่เกินน้ำหนักของรายการหรือไม่
    if (inputWeight && parseFloat(inputWeight) > itemWeight) {
      setWeightError(`น้ำหนักต้องไม่เกิน ${itemWeight} กก. (น้ำหนักของรายการนี้)`);
    } else {
      setWeightError("");
    }
  };

  const handleColdMove = (event) => {
    setColdMove(event.target.value);
    setErrorMessage(""); // ล้างข้อความแจ้งเตือน
  };

  // ฟังก์ชันแสดงข้อมูลหรือข้อความ "ไม่พบข้อมูล"
  const displayValue = (value) => {
    if (value === undefined || value === null || value === "") {
      return "ไม่พบข้อมูล";
    }
    return value;
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
          sx: {
            borderRadius: '10px',
            overflow: 'hidden'
          }
        }}
      >
        {/* AppBar Header */}
        <AppBar position="relative" sx={{ bgcolor: '#4e73df' }}>
          <Toolbar sx={{ minHeight: '64px', px: 2 }}>
            <InventoryIcon sx={{ mr: 1 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              ย้ายวัตถุดิบไปห้องเย็น
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={onClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* ข้อความแจ้งเตือน */}
        {errorMessage && (
          <Alert
            severity="error"
            sx={{
              m: 2,
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
            onClose={() => setErrorMessage("")}
          >
            <Typography variant="body1" fontWeight={500}>{errorMessage}</Typography>
          </Alert>
        )}

        {/* ข้อความแจ้งสำเร็จ */}
        {showSuccess && (
          <Fade in={showSuccess}>
            <Alert
              severity="success"
              sx={{
                m: 2,
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}
            >
              <Typography variant="body1" fontWeight={500}>ข้อมูลถูกต้อง กรุณาเลือกรถเข็นปลายทาง...</Typography>
            </Alert>
          </Fade>
        )}

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* ข้อมูลวัตถุดิบ */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  height: '100%',
                  borderRadius: '10px',
                  border: '1px solid #e0e0e0'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <InfoIcon sx={{ mr: 1, color: '#4e73df' }} />
                  <Typography variant="h6" sx={{ fontSize: '18px', color: '#4e73df', fontWeight: 600 }}>
                    ข้อมูลวัตถุดิบ (รถเข็นต้นทาง)
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {/* แสดงข้อมูลช่องจอด (ถ้ามี) */}
                {slotInfo && (
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      icon={<WarehouseIcon />}
                      label={`ห้อง: ${slotInfo.cs_id || 'ไม่ระบุ'}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: '12px' }}
                    />
                    <Chip
                      label={`ช่องจอด: ${slotInfo.slot_id || 'ไม่ระบุ'}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: '12px' }}
                    />
                    {slotInfo.tro_id && (
                      <Chip
                        icon={<LocalShippingIcon />}
                        label={`ทะเบียนรถเข็น: ${slotInfo.tro_id}`}
                        color="secondary"
                        variant="outlined"
                        size="small"
                        sx={{ fontSize: '12px' }}
                      />
                    )}
                  </Stack>
                )}

                {/* รายละเอียดวัตถุดิบ */}

                <Stack spacing={1.5}>
                  {/* แสดงข้อมูล Material */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ width: '130px', color: 'text.secondary', fontSize: '14px' }}>
                      Material:
                    </Typography>
                    <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                      {data?.isMixed ? `Mixed: ${data?.mix_code}` : displayValue(data?.mat)}
                    </Typography>
                  </Box>

                  {/* แสดงชื่อวัตถุดิบ */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Typography sx={{ width: '130px', color: 'text.secondary', fontSize: '14px' }}>
                      Material Name:
                    </Typography>
                    <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px', flex: 1, wordBreak: 'break-word' }}>
                      {data?.isMixed ? `วัตถุดิบผสม (${data?.mix_code})` : displayValue(data?.mat_name)}
                    </Typography>
                  </Box>

                  {/* แสดง Batch (เฉพาะวัตถุดิบปกติ) */}
                  {!data?.isMixed && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography sx={{ width: '130px', color: 'text.secondary', fontSize: '14px' }}>
                        Batch:
                      </Typography>
                      <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                        {displayValue(data?.batch)}
                      </Typography>
                    </Box>
                  )}

                  {/* แสดงน้ำหนัก */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ width: '130px', color: 'text.secondary', fontSize: '14px' }}>
                      น้ำหนักรายการนี้:
                    </Typography>
                    <Typography sx={{ fontWeight: 600, color: '#0d47a1', fontSize: '14px' }}>
                      {displayValue(data?.weight || data?.weight_RM)} กก.
                    </Typography>
                  </Box>

                  {/* แสดงน้ำหนักรถเข็นรวม */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ width: '130px', color: 'text.secondary', fontSize: '14px' }}>
                      น้ำหนักรถเข็นรวม:
                    </Typography>
                    <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                      {displayValue(data?.weighttotal || data?.weight_RM)} กก.
                    </Typography>
                  </Box>

                  {/* แสดงเลขรถเข็น */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ width: '130px', color: 'text.secondary', fontSize: '14px' }}>
                      เลขรถเข็น:
                    </Typography>
                    <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                      {displayValue(data?.tro || data?.tro_id)}
                    </Typography>
                  </Box>

                  {/* แสดงเวลาต้ม/อบเสร็จ (เฉพาะวัตถุดิบปกติ) */}
                  {!data?.isMixed && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography sx={{ width: '130px', color: 'text.secondary', fontSize: '14px' }}>
                        เวลาต้ม/อบเสร็จ:
                      </Typography>
                      <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                        {displayValue(data?.CookedDateTime)}
                      </Typography>
                    </Box>
                  )}

                  {/* แสดงเวลาผสมเสร็จ (เฉพาะวัตถุดิบผสม) */}
                  {data?.isMixed && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography sx={{ width: '130px', color: 'text.secondary', fontSize: '14px' }}>
                        เวลาผสมเสร็จ:
                      </Typography>
                      <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                        {displayValue(data?.mixed_date)}
                      </Typography>
                    </Box>
                  )}

                  {/* แสดงแผนการผลิต */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Typography sx={{ width: '130px', color: 'text.secondary', fontSize: '14px' }}>
                      แผนการผลิต:
                    </Typography>
                    <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px', flex: 1, wordBreak: 'break-word' }}>
                      {displayValue(data?.production || data?.แผนการผลิต)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* เลือกการย้ายวัตถุดิบ */}
            <Grid item xs={12} md={7}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  height: '100%',
                  borderRadius: '10px',
                  border: '1px solid #e0e0e0'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CategoryIcon sx={{ mr: 1, color: '#4e73df' }} />
                  <Typography variant="h6" sx={{ fontSize: '18px', color: '#4e73df', fontWeight: 600 }}>
                    เลือกประเภทการย้ายวัตถุดิบ
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
                  <FormLabel component="legend" sx={{ mb: 1, color: '#555', fontWeight: 500 }}>
                    ประเภทการส่งออก
                  </FormLabel>
                  <RadioGroup row name="type" value={TypeColdMove} onChange={handleTypeColdMove}>
                    <FormControlLabel
                      value="ย้ายทั้งรายการ"
                      control={<Radio sx={{ color: '#4e73df', '&.Mui-checked': { color: '#4e73df' } }} />}
                      label={
                        <Tooltip title={`จะย้ายรายการนี้ทั้งหมด ${itemWeight} กก.`} arrow placement="top">
                          <Typography>ทั้งรายการ</Typography>
                        </Tooltip>
                      }
                      sx={{ minWidth: '120px' }}
                    />
                    <FormControlLabel
                      value="ย้ายบางส่วน"
                      control={<Radio sx={{ color: '#4e73df', '&.Mui-checked': { color: '#4e73df' } }} />}
                      label="บางส่วน"
                      sx={{ minWidth: '120px' }}
                    />
                  </RadioGroup>
                </FormControl>

                {(TypeColdMove === "ย้ายบางส่วน") && (
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      label="กรอกน้ำหนัก"
                      variant="outlined"
                      fullWidth
                      value={weight}
                      size="small"
                      onChange={handleWeight}
                      type="number"
                      error={!!weightError}
                      helperText={weightError}
                      InputProps={{
                        endAdornment: <Typography sx={{ ml: 1, color: '#666' }}>กก.</Typography>,
                        startAdornment: <ScaleIcon sx={{ mr: 1, color: weightError ? '#f44336' : '#666' }} />,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                        }
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      <InfoIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      น้ำหนักสูงสุดที่ย้ายได้: {itemWeight} กก. (น้ำหนักของรายการนี้)
                    </Typography>
                  </Box>
                )}

                {TypeColdMove === "ย้ายทั้งรายการ" && (
                  <Box
                    sx={{
                      mb: 3,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: '#e8f4fd',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <InfoIcon sx={{ color: '#2196f3', mr: 1 }} />
                    <Typography variant="body2" color="primary">
                      จะย้ายรายการนี้ทั้งหมด {itemWeight} กก.
                    </Typography>
                  </Box>
                )}

                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <FormLabel component="legend" sx={{ mb: 1, color: '#555', fontWeight: 500 }}>
                    เลือกห้องเย็น
                  </FormLabel>
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <RadioGroup row name="coldroom-1" value={ColdMove} onChange={handleColdMove}>
                        <FormControlLabel
                          value="CSR3"
                          control={<Radio sx={{ color: '#4e73df', '&.Mui-checked': { color: '#4e73df' } }} />}
                          label="CSR3"
                          sx={{ minWidth: '100px' }}
                        />
                        <FormControlLabel
                          value="4C"
                          control={<Radio sx={{ color: '#4e73df', '&.Mui-checked': { color: '#4e73df' } }} />}
                          label="4C"
                          sx={{ minWidth: '100px' }}
                        />
                        <FormControlLabel
                          value="Chill 2"
                          control={<Radio sx={{ color: '#4e73df', '&.Mui-checked': { color: '#4e73df' } }} />}
                          label="Chill 2"
                          sx={{ minWidth: '100px' }}
                        />
                      </RadioGroup>
                    </Grid>
                    <Grid item xs={12}>
                      <RadioGroup row name="coldroom-2" value={ColdMove} onChange={handleColdMove}>
                        <FormControlLabel
                          value="Chill 4"
                          control={<Radio sx={{ color: '#4e73df', '&.Mui-checked': { color: '#4e73df' } }} />}
                          label="Chill 4"
                          sx={{ minWidth: '100px' }}
                        />
                        <FormControlLabel
                          value="Chill 5"
                          control={<Radio sx={{ color: '#4e73df', '&.Mui-checked': { color: '#4e73df' } }} />}
                          label="Chill 5"
                          sx={{ minWidth: '100px' }}
                        />
                        <FormControlLabel
                          value="Chill 6"
                          control={<Radio sx={{ color: '#4e73df', '&.Mui-checked': { color: '#4e73df' } }} />}
                          label="Chill 6"
                          sx={{ minWidth: '100px' }}
                        />
                      </RadioGroup>
                    </Grid>
                    <Grid item xs={12}>
                      <RadioGroup row name="coldroom-3" value={ColdMove} onChange={handleColdMove}>
                        <FormControlLabel
                          value="Ante"
                          control={<Radio sx={{ color: '#4e73df', '&.Mui-checked': { color: '#4e73df' } }} />}
                          label="Ante"
                          sx={{ minWidth: '100px' }}
                        />
                      </RadioGroup>
                    </Grid>
                  </Grid>
                </FormControl>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <Box sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#f8f9fc' }}>
          <Grid container spacing={2} justifyContent="flex-end">
            <Grid item>
              <Button
                variant="contained"
                startIcon={<CancelIcon />}
                sx={{
                  bgcolor: "#E74A3B",
                  color: "#fff",
                  '&:hover': {
                    bgcolor: "#d52a1a",
                  },
                  borderRadius: '8px',
                  px: 3
                }}
                onClick={onClose}
                disabled={showSuccess}
              >
                ยกเลิก
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                sx={{
                  bgcolor: "#41a2e6",
                  color: "#fff",
                  '&:hover': {
                    bgcolor: "#2a8dce",
                  },
                  borderRadius: '8px',
                  px: 3
                }}
                onClick={handleSave}
                disabled={
                  !TypeColdMove ||
                  !ColdMove ||
                  (TypeColdMove === "ย้ายบางส่วน" && (!weight || weight <= 0 || parseFloat(weight) > itemWeight)) ||
                  showSuccess
                }
              >
                ถัดไป
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Dialog>
    </>
  );
};

export default ModalEditPD;