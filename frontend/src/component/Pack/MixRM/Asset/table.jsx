import React, { useState, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Typography, TextField, IconButton, Tooltip,
  Box, Button, Checkbox, FormControlLabel, InputAdornment, Slider,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import EditIcon from "@mui/icons-material/Edit";

const TableList = ({
  productionPlan,
  availableTrolleys,
  basketItems,
  weights,
  onWeightChange,
  onAddToBasket,
  onRemoveFromBasket,
  isLoading,
  totalWeight
}) => {
  // States
  const [selectedTrolleys, setSelectedTrolleys] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentEditTrolley, setCurrentEditTrolley] = useState(null);
  const [tempWeight, setTempWeight] = useState(0);
  const [weightError, setWeightError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Filter available trolleys (those not in the basket)
  const filteredAvailableTrolleys = availableTrolleys.filter(
    trolley => !basketItems.some(item => item.mapping_id === trolley.mapping_id)
  );

  // Reset selected trolleys when available trolleys change
  useEffect(() => {
    setSelectedTrolleys([]);
    setSelectAll(false);
  }, [availableTrolleys]);

  // Update selectAll state based on selections
  useEffect(() => {
    const availableTrolleysCount = filteredAvailableTrolleys.length;
    setSelectAll(
      availableTrolleysCount > 0 && 
      selectedTrolleys.length === availableTrolleysCount
    );
  }, [selectedTrolleys, filteredAvailableTrolleys.length]);

  // ----- Handlers -----
  
  // Selection Handlers
  const handleToggleSelectTrolley = (mappingTroId) => {
    setSelectedTrolleys(prev => {
      return prev.includes(mappingTroId)
        ? prev.filter(id => id !== mappingTroId)
        : [...prev, mappingTroId];
    });
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedTrolleys([]);
    } else {
      const availableTrolleyIds = filteredAvailableTrolleys.map(
        trolley => trolley.mapping_id
      );
      setSelectedTrolleys(availableTrolleyIds);
    }
  };

  // Basket Handlers
  const handleAddSelectedToBasket = () => {
    if (selectedTrolleys.length === 0) return;

    const selectedTrolleysData = availableTrolleys.filter(
      trolley => selectedTrolleys.includes(trolley.mapping_id)
    );
    onAddToBasket(selectedTrolleysData);
    setSelectedTrolleys([]);
  };

  // Weight Edit Dialog Handlers
  const openWeightEditDialog = (trolley) => {
    setCurrentEditTrolley(trolley);
    setTempWeight(weights[trolley.mapping_id] || parseFloat(trolley.weight_RM));
    setWeightError(false);
    setErrorMessage("");
    setEditDialogOpen(true);
  };

  const closeWeightEditDialog = () => {
    setEditDialogOpen(false);
    setCurrentEditTrolley(null);
    setWeightError(false);
    setErrorMessage("");
  };

  const validateWeight = (value) => {
    if (!currentEditTrolley) return false;
    
    const maxWeight = parseFloat(currentEditTrolley.weight_RM);
    
    if (isNaN(value) || value <= 0) {
      setWeightError(true);
      setErrorMessage("น้ำหนักต้องมากกว่า 0");
      return false;
    }
    
    if (value > maxWeight) {
      setWeightError(true);
      setErrorMessage(`น้ำหนักต้องไม่เกิน ${maxWeight} กก.`);
      return false;
    }
    
    setWeightError(false);
    setErrorMessage("");
    return true;
  };

  const handleWeightChange = (value) => {
    const numValue = parseFloat(value) || 0;
    setTempWeight(numValue);
    validateWeight(numValue);
  };

  const saveWeight = () => {
    if (currentEditTrolley) {
      if (validateWeight(tempWeight)) {
        onWeightChange(currentEditTrolley.mapping_id, tempWeight);
        closeWeightEditDialog();
      }
    }
  };

  // Weight Adjustment Helpers
  const adjustWeight = (percentage) => {
    if (currentEditTrolley) {
      const maxWeight = parseFloat(currentEditTrolley.weight_RM);
      const calculatedWeight = (maxWeight * percentage) / 100;
      const roundedWeight = parseFloat(calculatedWeight.toFixed(2));
      setTempWeight(roundedWeight);
      validateWeight(roundedWeight);
    }
  };

  // ----- Render Helper Functions -----
  
  const renderBasketSection = () => {
    if (basketItems.length === 0) {
      return (
        <Box sx={{ mb: 4, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body1">
            ยังไม่มีวัตถุดิบในตะกร้า
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ textAlign: 'center' }}>ชื่อวัตถุดิบ</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>เวลาเตรียมเสร็จ</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>Batch</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>น้ำหนักวัตถุดิบ (กก.)</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>น้ำหนักที่ใช้ (กก.)</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>แก้ไขน้ำหนัก</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>ลบออกจากตะกร้า</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {basketItems.map((trolley) => (
              <TableRow key={`basket-${trolley.mapping_id}`}>
                <TableCell sx={{ textAlign: 'center' }}>{trolley.mat_name}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>{trolley.rmit_date}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>{trolley.batch}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>{trolley.weight_RM}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: weights[trolley.mapping_id] !== parseFloat(trolley.weight_RM) ? 'orange' : 'inherit'
                    }}
                  >
                    {(weights[trolley.mapping_id] || parseFloat(trolley.weight_RM)).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Tooltip title="แก้ไขน้ำหนัก">
                    <IconButton
                      onClick={() => openWeightEditDialog(trolley)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Tooltip title="ลบออกจากตะกร้า">
                    <IconButton
                      onClick={() => onRemoveFromBasket(trolley.mapping_id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={4} align="right">
                <Typography variant="h6">
                  น้ำหนักรวม:
                </Typography>
              </TableCell>
              <TableCell colSpan={3}>
                <Typography variant="h6">
                  {totalWeight.toFixed(2)} กิโลกรัม
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderAvailableTrolleysTable = () => {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectAll}
                      onChange={handleToggleSelectAll}
                      disabled={isLoading || filteredAvailableTrolleys.length === 0}
                    />
                  }
                  label="เลือกทั้งหมด"
                />
              </TableCell>
              <TableCell sx={{ textAlign: 'center' }}>หมายเลขวัตถุดิบ</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>ชื่อวัตถุดิบ</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>เวลาเตรียมเสร็จ</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>Batch</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>น้ำหนักวัตถุดิบ (กก.)</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>เอกสาร</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>เพิ่ม</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {renderTableContent()}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={8} align="center">
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>กำลังโหลดข้อมูล...</Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (filteredAvailableTrolleys.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} align="center">
            <Typography variant="body1">
              {!productionPlan?.code && !productionPlan?.prod_id
                ? "กรุณาเลือกแผนการผลิตก่อน"
                : basketItems.length > 0
                  ? "ไม่มีวัตถุดิบเหลืออยู่ในรายการทั้งหมด"
                  : "ไม่พบรายการวัตถุดิบสำหรับแผนการผลิตนี้"}
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return filteredAvailableTrolleys.map((trolley) => {
      const isSelected = selectedTrolleys.includes(trolley.mapping_id);
      return (
        <TableRow
          key={trolley.mapping_id}
          sx={{ backgroundColor: isSelected ? '#f9fbe7' : 'inherit' }}
        >
          <TableCell>
            <Checkbox
              checked={isSelected}
              onChange={() => handleToggleSelectTrolley(trolley.mapping_id)}
            />
          </TableCell>
          <TableCell sx={{ textAlign: 'center' }}>{trolley.mapping_id}</TableCell>
          <TableCell sx={{ textAlign: 'center' }}>{trolley.mat_name}</TableCell>
          <TableCell sx={{ textAlign: 'center' }}>{trolley.rmit_date}</TableCell>
          <TableCell sx={{ textAlign: 'center' }}>{trolley.batch}</TableCell>
          <TableCell sx={{ textAlign: 'center' }}>{trolley.weight_RM}</TableCell>
          <TableCell sx={{ textAlign: 'center' }}>{trolley.doc_no}</TableCell>
          <TableCell sx={{ textAlign: 'center' }}>
            <Tooltip title="เพิ่มในตะกร้า">
              <IconButton
                onClick={() => onAddToBasket([trolley])}
                color="primary"
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          </TableCell>
        </TableRow>
      );
    });
  };

  const renderWeightEditDialog = () => {
    if (!currentEditTrolley) return null;
    
    const maxWeight = parseFloat(currentEditTrolley.weight_RM);
    const weightPercentage = parseFloat(((tempWeight / maxWeight) * 100).toFixed(2));
    
    return (
      <Dialog 
        open={editDialogOpen} 
        onClose={closeWeightEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>แก้ไขน้ำหนักวัตถุดิบ</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="subtitle1">
              หมายเลขวัตถุดิบ: {currentEditTrolley.mapping_id}
            </Typography>
            <Typography variant="subtitle1">
              ชื่อวัตถุดิบ: {currentEditTrolley.mat_name}
            </Typography>
            <Typography variant="subtitle1">
              เวลาเตรียมเสร็จ: {currentEditTrolley.rmit_date}
            </Typography>
            <Typography variant="subtitle1">
              น้ำหนักทั้งหมด: {currentEditTrolley.weight_RM} กก.
            </Typography>
          </Box>

          {weightError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              น้ำหนักที่ต้องการใช้:
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={tempWeight}
              onChange={(e) => handleWeightChange(e.target.value)}
              inputProps={{
                min: 0.01,
                max: maxWeight,
                step: 0.01
              }}
              error={weightError}
              helperText={weightError ? errorMessage : ""}
              InputProps={{
                endAdornment: <InputAdornment position="end">กก.</InputAdornment>,
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              ปรับน้ำหนัก:
            </Typography>
            <Slider
              value={weightPercentage > 100 ? 100 : weightPercentage}
              onChange={(e, newValue) => adjustWeight(newValue)}
              aria-labelledby="weight-slider"
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              step={5}
              marks={[
                { value: 0, label: '0%' },
                { value: 25, label: '25%' },
                { value: 50, label: '50%' },
                { value: 75, label: '75%' },
                { value: 100, label: '100%' }
              ]}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => adjustWeight(100)} 
              sx={{ mr: 1, mb: 1 }}
            >
              ใช้ทั้งหมด (100%)
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => adjustWeight(50)} 
              sx={{ mr: 1, mb: 1 }}
            >
              ใช้ครึ่งหนึ่ง (50%)
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => adjustWeight(75)} 
              sx={{ mr: 1, mb: 1 }}
            >
              ใช้ 75%
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => adjustWeight(25)} 
              sx={{ mr: 1, mb: 1 }}
            >
              ใช้ 25%
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeWeightEditDialog}>ยกเลิก</Button>
          <Button 
            onClick={saveWeight} 
            variant="contained" 
            color="primary"
            disabled={weightError || tempWeight <= 0 || tempWeight > maxWeight}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ----- Main Render -----
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        รายการวัตถุดิบที่เลือก
      </Typography>
      
      {renderBasketSection()}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          รายการวัตถุดิบทั้งหมด
        </Typography>
        {selectedTrolleys.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<ShoppingCartIcon />}
            onClick={handleAddSelectedToBasket}
            disabled={isLoading}
          >
            เพิ่มรายการที่เลือกในตะกร้า ({selectedTrolleys.length})
          </Button>
        )}
      </Box>

      {renderAvailableTrolleysTable()}
      {renderWeightEditDialog()}
    </Box>
  );
  
};

export default TableList;