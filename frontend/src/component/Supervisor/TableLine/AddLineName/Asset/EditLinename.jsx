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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import { IoClose } from "react-icons/io5";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const EditLineNameModal = ({ open, onClose, onSuccess, selectedLineName }) => {
  const [formData, setFormData] = useState({
    line_name: "",
    line_type_id: "",
  });
  const [lineTypes, setLineTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Initialize form data when modal opens or selectedLineName changes
  useEffect(() => {
    if (open && selectedLineName) {
      fetchLineTypes();
      setFormData({
        line_name: selectedLineName.line_name || "",
        line_type_id: selectedLineName.line_type_id || "",
      });
      setError("");
    }
  }, [open, selectedLineName]);

  const fetchLineTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/lineType`);
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      setLineTypes(data);
    } catch (error) {
      console.error("Error fetching line types:", error);
      setError("ไม่สามารถโหลดประเภทไลน์ได้");
      setLineTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedLineName?.line_id) {
      setError("ไม่พบข้อมูลไลน์ที่ต้องการแก้ไข");
      return;
    }

    // Validation
    if (!formData.line_name.trim()) {
      setError("กรุณากรอกชื่อไลน์");
      return;
    }
    
    if (!formData.line_type_id) {
      setError("กรุณาเลือกประเภทไลน์");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      
      await axios.put(`${API_URL}/api/lineName/EditLineName/${selectedLineName.line_id}`, {
        line_name: formData.line_name.trim(),
        line_type_id: formData.line_type_id,
      });
      
      // Success
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error updating line name:", error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("เกิดข้อผิดพลาดในการแก้ไขชื่อไลน์");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        line_name: "",
        line_type_id: "",
      });
      setError("");
      onClose();
    }
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
          minHeight: "400px",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px 16px 24px",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333" }}>
          แก้ไขชื่อไลน์
        </Typography>
        <Button
          onClick={handleClose}
          disabled={submitting}
          sx={{
            minWidth: "auto",
            padding: "4px",
            color: "#666",
            "&:hover": {
              backgroundColor: "#f5f5f5",
            },
          }}
        >
          <IoClose size={24} />
        </Button>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ padding: "24px" }}>
          {error && (
            <Alert severity="error" sx={{ marginBottom: "16px" }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Line Type Selection */}
            <FormControl fullWidth required>
              <InputLabel id="line-type-label">ประเภทไลน์</InputLabel>
              <Select
                labelId="line-type-label"
                name="line_type_id"
                value={formData.line_type_id}
                onChange={handleInputChange}
                label="ประเภทไลน์"
                disabled={loading || submitting}
                sx={{ fontSize: "16px" }}
              >
                {loading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ marginRight: "8px" }} />
                    กำลังโหลด...
                  </MenuItem>
                ) : lineTypes.length === 0 ? (
                  <MenuItem disabled>ไม่พบประเภทไลน์</MenuItem>
                ) : (
                  lineTypes.map((type) => (
                    <MenuItem key={type.line_type_id} value={type.line_type_id}>
                      {type.line_type_name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {/* Line Name Input */}
            <TextField
              fullWidth
              required
              name="line_name"
              label="ชื่อไลน์"
              value={formData.line_name}
              onChange={handleInputChange}
              disabled={submitting}
              placeholder="กรอกชื่อไลน์"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "16px",
                },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            padding: "16px 24px 24px 24px",
            gap: "12px",
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            onClick={handleClose}
            disabled={submitting}
            variant="outlined"
            sx={{
              padding: "10px 24px",
              borderColor: "#d0d0d0",
              color: "#666",
              "&:hover": {
                borderColor: "#bbb",
                backgroundColor: "#f8f8f8",
              },
            }}
          >
            ยกเลิก
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || loading}
            sx={{
              padding: "10px 24px",
              backgroundColor: "#eab308",
              "&:hover": {
                backgroundColor: "#d97706",
              },
              "&:disabled": {
                backgroundColor: "#d0d0d0",
              },
            }}
          >
            {submitting ? (
              <>
                <CircularProgress size={20} sx={{ marginRight: "8px", color: "white" }} />
                กำลังแก้ไข...
              </>
            ) : (
              "บันทึกการแก้ไข"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditLineNameModal;