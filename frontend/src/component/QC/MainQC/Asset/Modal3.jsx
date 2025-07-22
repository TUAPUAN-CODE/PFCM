import React, { useState, useEffect } from "react";
import {
  Dialog,
  Stack,
  DialogContent,
  Button,
  Box,
  Divider,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;

const Modal3 = ({ open, onClose, data, onEdit, CookedDateTime }) => {
  const [userId, setUserId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { inputValues = [], input2 = {}, rmfp_id } = data || {};

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const handleConfirm = async () => {
    if (!validateData()) {
      setError("กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนยืนยัน");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      license_plate: inputValues.join(" "),
      rmfpID: rmfp_id || "",
      CookedDateTime: CookedDateTime || "",
      weight: input2?.weightPerCart || "",
      weightTotal: input2?.weightPerCart || "",
      ntray: input2?.numberOfTrays || "",
      recorder: input2?.operator || "",
      userID: Number(userId),
    };

    try {
      const response = await axios.post(
        `${API_URL}/api/oven/toCold/saveTrolley`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("API Response:", response.data);
      setSuccess(true);
      setShowAlert(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("API Error:", err);
      setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const validateData = () => {
    return (
      inputValues.length > 0 &&
      input2?.weightPerCart &&
      input2?.numberOfTrays &&
      input2?.operator &&
      userId
    );
  };

  const handleCloseAlert = () => {
    setShowAlert(false);
    setSuccess(false);
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <div>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === "backdropClick") return;
          onClose();
        }}
        maxWidth="xs"
        fullWidth
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            fontSize: "15px",
            color: "#555",
          }}
        >
          <DialogContent sx={{ paddingBottom: 0 }}>
            <Typography
              sx={{
                fontSize: "18px",
                fontWeight: 500,
                color: "#545454",
                marginBottom: "10px",
              }}
            >
              กรุณาตรวจสอบข้อมูลก่อนทำรายการ
            </Typography>
            <Divider sx={{ mt: 2, mb: 2 }} />

            <Stack spacing={1.5}>
              <Typography>
                ป้ายทะเบียน:{" "}
                {inputValues.length > 0 ? inputValues.join(", ") : "ไม่มีข้อมูล"}
              </Typography>

              <Typography>
                น้ำหนักวัตถุดิบ/รถเข็น: {input2?.weightPerCart || "ข้อมูลไม่พบ"} กก.
              </Typography>

              <Typography>
                จำนวนถาด: {input2?.numberOfTrays || "ข้อมูลไม่พบ"}
              </Typography>

              <Typography>
                ผู้ดำเนินการ: {input2?.operator || "ข้อมูลไม่พบ"}
              </Typography>

              <Typography color="rgba(0, 0, 0, 0.6)">
                User-ID: {userId || "ยังไม่มีข้อมูล"}
              </Typography>

              <Typography color="rgba(0, 0, 0, 0.6)">
                CookedDateTime: {CookedDateTime || "ไม่มีข้อมูล"}
              </Typography>

              {input2?.deliveryLocation && (
                <Typography color="rgba(0, 0, 0, 0.6)">
                  สถานที่จัดส่ง: {input2.deliveryLocation}
                </Typography>
              )}
            </Stack>

            <Divider sx={{ mt: 2, mb: 0 }} />
          </DialogContent>
        </Box>

        <Stack
          sx={{
            padding: "20px",
          }}
          direction="row"
          spacing={2}
          justifyContent="center"
        >
          <Button
            sx={{ backgroundColor: "#E74A3B", color: "#fff", flex: 1 }}
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={onClose}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button
            sx={{ backgroundColor: "#edc026", color: "#fff", flex: 1 }}
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onEdit}
            disabled={loading}
          >
            แก้ไข
          </Button>
          <Button
            sx={{ backgroundColor: "#41a2e6", color: "#fff", flex: 1 }}
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "กำลังประมวลผล..." : "ยืนยัน"}
          </Button>
        </Stack>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseError} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showAlert && success}
        autoHideDuration={3000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseAlert} severity="success">
          บันทึกข้อมูลสำเร็จแล้ว!
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Modal3;