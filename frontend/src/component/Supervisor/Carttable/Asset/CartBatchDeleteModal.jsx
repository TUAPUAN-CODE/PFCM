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
    CircularProgress,
    Grid
} from "@mui/material";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const CartBatchDeleteModal = ({ open, onClose, onSuccess }) => {
    const [form, setForm] = useState({
        start_id: "",
        end_id: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (open) {
            setForm({ start_id: "", end_id: "" });
            setError("");
            setWarning("");
            setCount(0);
        }
    }, [open]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const numericValue = value.replace(/\D/g, ''); // รับเฉพาะตัวเลข

        setForm(prev => {
            const newForm = {
                ...prev,
                [name]: numericValue
            };

            // คำนวณจำนวนรถเข็นที่จะลบทันทีเมื่อมีการเปลี่ยนแปลงค่า
            calculateCount(newForm);
            return newForm;
        });
    };

    const calculateCount = (currentForm) => {
        const startNum = parseInt(currentForm.start_id);
        const endNum = parseInt(currentForm.end_id);

        if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
            const newCount = endNum - startNum + 1;
            setCount(newCount);

            if (newCount > 100) {
                setWarning(`คุณกำลังจะลบรถเข็น ${newCount} คัน (มากกว่า 100 คัน)`);
            } else if (newCount > 0) {
                setWarning(`คุณกำลังจะลบรถเข็น ${newCount} คัน (${currentForm.start_id} ถึง ${currentForm.end_id})`);
            } else {
                setWarning("");
            }
        } else {
            setCount(0);
            setWarning("");
        }
    };

    const validateInputs = () => {
        if (!form.start_id || !form.end_id) {
            setError("กรุณากรอกหมายเลขรถเข็นเริ่มต้นและสิ้นสุด");
            return false;
        }

        const startNum = parseInt(form.start_id);
        const endNum = parseInt(form.end_id);

        if (isNaN(startNum)) {
            setError("หมายเลขเริ่มต้นต้องเป็นตัวเลขเท่านั้น");
            return false;
        }

        if (isNaN(endNum)) {
            setError("หมายเลขสิ้นสุดต้องเป็นตัวเลขเท่านั้น");
            return false;
        }

        if (startNum > endNum) {
            setError("หมายเลขสิ้นสุดต้องมากกว่าหมายเลขเริ่มต้น");
            return false;
        }

        if (count > 100) {
            setError("ไม่สามารถลบรถเข็นได้เกิน 100 คันในครั้งเดียว");
            return false;
        }

        setError("");
        return true;
    };

    const handleDelete = async () => {
  if (!validateInputs()) return;

  try {
    setLoading(true);
    console.log("Start ID:", form.start_id);
    console.log("End ID:", form.end_id);

    const response = await axios.delete(`${API_URL}/api/del/cart/batch`, {
      data: {
        start_id: form.start_id,
        end_id: form.end_id
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      onSuccess();
      onClose();
      alert(`ลบรถเข็นสำเร็จ ${response.data.count} คัน`);
    }
  } catch (error) {
    console.error("Batch delete error:", error);
    setError(error.response?.data?.error || "เกิดข้อผิดพลาดในการลบ");
  } finally {
    setLoading(false);
  }
};


    const handleClose = () => {
        if (!loading) {
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
                    padding: "8px",
                },
            }}
        >
            <DialogTitle
                sx={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#333",
                    textAlign: "center",
                    paddingBottom: "16px",
                }}
            >
                ลบรถเข็นหลายคัน
            </DialogTitle>

            <DialogContent sx={{ paddingBottom: "16px" }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        กรอกช่วงหมายเลขรถเข็นที่ต้องการลบ
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField
                                name="start_id"
                                label="หมายเลขรถเข็นเริ่มต้น"
                                value={form.start_id}
                                onChange={handleInputChange}
                                fullWidth
                                placeholder="เช่น 1490"
                                disabled={loading}
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' , maxLength: 4 }}
                                
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "8px",
                                    },
                                }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name="end_id"
                                label="หมายเลขรถเข็นสิ้นสุด"
                                value={form.end_id}
                                onChange={handleInputChange}
                                fullWidth
                                placeholder="เช่น 1500"
                                disabled={loading}
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 4 }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "8px",
                                    },
                                }}
                            />
                        </Grid>
                    </Grid>

                    {warning && (
                        <Alert severity="warning" sx={{ borderRadius: "8px" }}>
                            {warning}
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ borderRadius: "8px" }}>
                            {error}
                        </Alert>
                    )}

                    <Alert severity="error" sx={{ borderRadius: "8px" }}>
                        <Typography variant="body2" sx={{ fontWeight: "500" }}>
                            ⚠️ คำเตือน: การลบข้อมูลจะไม่สามารถกู้คืนได้
                        </Typography>
                    </Alert>
                </Box>
            </DialogContent>

            <DialogActions sx={{ padding: "16px 24px 24px", gap: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    sx={{
                        borderRadius: "8px",
                        textTransform: "none",
                        fontSize: "16px",
                        fontWeight: "500",
                        px: 3,
                        py: 1,
                        color: "#666",
                        borderColor: "#ddd",
                        "&:hover": {
                            borderColor: "#bbb",
                            backgroundColor: "#f5f5f5",
                        },
                    }}
                    variant="outlined"
                >
                    ยกเลิก
                </Button>

                <Button
                    onClick={handleDelete}
                    disabled={loading || !form.start_id || !form.end_id || count === 0}
                    variant="contained"
                    sx={{
                        borderRadius: "8px",
                        textTransform: "none",
                        fontSize: "16px",
                        fontWeight: "500",
                        px: 3,
                        py: 1,
                        backgroundColor: "#d32f2f",
                        "&:hover": {
                            backgroundColor: "#b71c1c",
                        },
                        "&:disabled": {
                            backgroundColor: "#cccccc",
                        },
                    }}
                >
                    {loading ? (
                        <>
                            <CircularProgress size={16} sx={{ mr: 1, color: "white" }} />
                            กำลังลบ...
                        </>
                    ) : (
                        `ลบรถเข็น (${count} คัน)`
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CartBatchDeleteModal;