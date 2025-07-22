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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const CartEditModal = ({ open, onClose, onSuccess, cartData }) => {
  const [formData, setFormData] = useState({
    tro_id: "",
    tro_status: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cartData && open) {
      setFormData({
        tro_id: cartData.tro_id || "",
        tro_status: cartData.tro_status || false,
      });
      setError("");
    }
  }, [cartData, open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tro_id.trim()) {
      setError("กรุณากรอกหมายเลขรถเข็น");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
         await axios.put(`${API_URL}/api/edit/cart/${cartData.tro_id}`, {
      new_tro_id: formData.tro_id.trim(),  // เปลี่ยนชื่อฟิลด์เพื่อความชัดเจน
      tro_status: formData.tro_status
    });
      
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error updating cart:", error);
      if (error.response?.status === 409) {
        setError("หมายเลขรถเข็นนี้มีอยู่ในระบบแล้ว");
      } else if (error.response?.status === 404) {
        setError("ไม่พบรถเข็นที่ต้องการแก้ไข");
      } else {
        setError("เกิดข้อผิดพลาดในการแก้ไขรถเข็น กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tro_id: "",
      tro_status: false,
    });
    setError("");
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
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
        <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: "#ed6c02" }}>
          แก้ไขข้อมูลรถเข็น
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              name="tro_id"
              label="หมายเลขรถเข็น"
              value={formData.tro_id}
              onChange={handleInputChange}
              fullWidth
              required
              variant="outlined"
              placeholder="กรุณากรอกหมายเลขรถเข็น"
              autoFocus
              inputProps={{maxLength: 4  }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: "8px",
                }
              }}
            />

            <FormControl fullWidth>
              <InputLabel>สถานะ</InputLabel>
              <Select
                name="tro_status"
                value={formData.tro_status}
                onChange={handleInputChange}
                label="สถานะ"
                sx={{
                  borderRadius: "8px",
                }}
              >
                <MenuItem value={false}>ใช้งานอยู่</MenuItem>
                <MenuItem value={true}>ไม่ได้ใช้งาน</MenuItem>
              </Select>
            </FormControl>

            {cartData && (
              <Box sx={{ 
                p: 2, 
                backgroundColor: "#f5f5f5", 
                borderRadius: "8px",
                border: "1px solid #e0e0e0"
              }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  ข้อมูลเดิม:
                </Typography>
                <Typography variant="body2">
                  หมายเลขรถเข็น: <strong>{cartData.tro_id}</strong>
                </Typography>
                <Typography variant="body2">
                  สถานะ: <strong>{cartData.tro_status === false ? "ใช้งานอยู่" : "ไม่ได้ใช้งาน"}</strong>
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
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
            color="warning"
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
            {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CartEditModal;