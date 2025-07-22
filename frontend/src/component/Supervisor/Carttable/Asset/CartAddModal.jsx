import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Tabs,
  Tab,
  Grid,
  CircularProgress
} from "@mui/material";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const CartAddModal = ({ open, onClose, onSuccess }) => {
  const [tabValue, setTabValue] = useState(0);
  const [singleForm, setSingleForm] = useState({
    tro_id: "",
    tro_status: 1
  });
  const [batchForm, setBatchForm] = useState({
    start_id: "",
    end_id: "",
    tro_status: 1
  });
  const [loading, setLoading] = useState(false);
  const [fetchingNextId, setFetchingNextId] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ฟังก์ชันดึงหมายเลขรถเข็นล่าสุดจากฐานข้อมูล
  const fetchNextAvailableId = async () => {
    try {
      setFetchingNextId(true);
      const response = await axios.get(`${API_URL}/api/cart/next-id`);
      return response.data.next_id;
    } catch (error) {
      console.error("Error fetching next ID:", error);
      return "";
    } finally {
      setFetchingNextId(false);
    }
  };

  // เมื่อเปิด modal และเป็นแท็บแบบกลุ่ม ให้ดึงหมายเลขเริ่มต้น
  useEffect(() => {
    if (open && tabValue === 1) {
      const loadNextId = async () => {
        const nextId = await fetchNextAvailableId();
        if (nextId) {
          setBatchForm(prev => ({
            ...prev,
            start_id: nextId
          }));
        }
      };
      loadNextId();
    }
  }, [open, tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError("");
    setSuccess("");
    
    // เมื่อเปลี่ยนไปแท็บแบบกลุ่ม ให้ดึงหมายเลขเริ่มต้น
    if (newValue === 1) {
      const loadNextId = async () => {
        const nextId = await fetchNextAvailableId();
        if (nextId) {
          setBatchForm(prev => ({
            ...prev,
            start_id: nextId
          }));
        }
      };
      loadNextId();
    }
  };

  const handleSingleInputChange = (e) => {
    const { name, value } = e.target;
    setSingleForm(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleBatchInputChange = (e) => {
    const { name, value } = e.target;
    setBatchForm(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    
    if (!singleForm.tro_id.trim()) {
      setError("กรุณากรอกหมายเลขรถเข็น");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      await axios.post(`${API_URL}/api/cart`, {
        tro_id: singleForm.tro_id.trim(),
        tro_status: singleForm.tro_status
      });
      
      setSuccess("เพิ่มรถเข็นเรียบร้อย");
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error("Error adding cart:", error);
      if (error.response?.status === 400) {
        setError(error.response.data.error || "มีหมายเลขรถเข็นนี้อยู่แล้ว");
      } else {
        setError("เกิดข้อผิดพลาดในการเพิ่มรถเข็น กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    
    if (!batchForm.start_id || !batchForm.end_id) {
      setError("กรุณากรอกหมายเลขเริ่มต้นและสิ้นสุด");
      return;
    }

    if (parseInt(batchForm.start_id) > parseInt(batchForm.end_id)) {
      setError("หมายเลขสิ้นสุดต้องมากกว่าหมายเลขเริ่มต้น");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const response = await axios.post(`${API_URL}/api/cart/batch`, {
        start_id: batchForm.start_id,
        end_id: batchForm.end_id,
        tro_status: batchForm.tro_status
      });
      
      setSuccess(`เพิ่มรถเข็นเรียบร้อย ${response.data.count} คัน (${batchForm.start_id} - ${batchForm.end_id})`);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error("Error adding batch carts:", error);
      if (error.response?.data?.existing_ids) {
        setError(`มีรถเข็นที่ซ้ำกันอยู่แล้ว: ${error.response.data.existing_ids.join(', ')}`);
      } else {
        setError(error.response?.data?.error || "เกิดข้อผิดพลาดในการเพิ่มรถเข็น กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSingleForm({
      tro_id: "",
      tro_status: 1
    });
    setBatchForm({
      start_id: "",
      end_id: "",
      tro_status: 1
    });
    setError("");
    setSuccess("");
    onClose();
  };

  const handleRefreshNextId = async () => {
    const nextId = await fetchNextAvailableId();
    if (nextId) {
      setBatchForm(prev => ({
        ...prev,
        start_id: nextId
      }));
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={!loading ? handleClose : null}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          padding: "8px"
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: "#1976d2" }}>
          เพิ่มรถเข็น
        </Typography>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          sx={{ mt: 2 }}
          variant="fullWidth"
        >
          <Tab label="เพิ่มทีละคัน" />
          <Tab label="เพิ่มแบบหลายคัน" />
        </Tabs>
      </DialogTitle>

      {tabValue === 0 ? (
        <form onSubmit={handleAddSingle}>
          <DialogContent sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                name="tro_id"
                label="หมายเลขรถเข็น"
                value={singleForm.tro_id}
                onChange={handleSingleInputChange}
                fullWidth
                required
                variant="outlined"
                // placeholder= {batchForm.start_id}
                autoFocus
                inputProps={{ maxLength: 4 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: "8px",
                  }
                }}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              disabled={loading}
              sx={{
                borderRadius: "8px",
                px: 3,
                py: 1,
                textTransform: "none",
                fontSize: "16px"
              }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                borderRadius: "8px",
                px: 3,
                py: 1,
                textTransform: "none",
                fontSize: "16px",
                minWidth: "100px"
              }}
            >
              {loading ? "กำลังเพิ่ม..." : "เพิ่มรถเข็น"}
            </Button>
          </DialogActions>
        </form>
      ) : (
        <form onSubmit={handleAddBatch}>
          <DialogContent sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      name="start_id"
                      label="หมายเลขรถเข็น"
                      value={batchForm.start_id}
                      onChange={handleBatchInputChange}
                      fullWidth
                      required
                      variant="outlined"
                      placeholder="เช่น 1501"
                      autoFocus
                      inputProps={{ maxLength: 4 }}
                      disabled={fetchingNextId}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: "8px",
                        }
                      }}
                    />
                    {fetchingNextId && (
                      <CircularProgress
                        size={20}
                        sx={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      />
                    )}
                  </Box>
                  <Button
                    size="small"
                    variant="text"
                    onClick={handleRefreshNextId}
                    disabled={fetchingNextId || loading}
                    sx={{ 
                      mt: 1, 
                      textTransform: "none",
                      fontSize: "12px"
                    }}
                  >
                    รีเฟรชหมายเลขถัดไป
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    name="end_id"
                    label="หมายเลขสิ้นสุด"
                    value={batchForm.end_id}
                    onChange={handleBatchInputChange}
                    fullWidth
                    required
                    variant="outlined"
                    placeholder="เช่น 2000"
                    inputProps={{ maxLength: 4 }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: "8px",
                      }
                    }}
                  />
                </Grid>
              </Grid>
              
              <Typography variant="body2" color="textSecondary">
                ระบบจะเพิ่มรถเข็นตั้งแต่หมายเลข {batchForm.start_id || '___'} ถึง {batchForm.end_id || '___'} 
                {batchForm.start_id && batchForm.end_id ? 
                  ` (ทั้งหมด ${parseInt(batchForm.end_id) - parseInt(batchForm.start_id) + 1} คัน)` : ''}
              </Typography>
              
              {batchForm.start_id && (
                <Alert severity="info" sx={{ fontSize: '14px' }}>
                  หมายเลขรถเข็นคือรถเข็นที่ยังไม่มีในระบบ และจะถูกเพิ่มใหม่ โดยนับจากรถเข็นที่มีอยู่ล่าสุด
                </Alert>
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              disabled={loading}
              sx={{
                borderRadius: "8px",
                px: 3,
                py: 1,
                textTransform: "none",
                fontSize: "16px"
              }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || fetchingNextId}
              sx={{
                borderRadius: "8px",
                px: 3,
                py: 1,
                textTransform: "none",
                fontSize: "16px",
                minWidth: "100px"
              }}
            >
              {loading ? "กำลังเพิ่ม..." : "เพิ่มทั้งหมด"}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
};

export default CartAddModal;