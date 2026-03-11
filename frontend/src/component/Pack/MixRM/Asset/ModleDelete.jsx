import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  TextField
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import axios from "axios";
axios.defaults.withCredentials = true;

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

import ModalAlert from "../../../../Popup/AlertSuccess";
import SuccessPrinter from "../../History/Asset/SuccessPrinter";

const API_URL = import.meta.env.VITE_API_URL;

const ModalDelete = ({ open, onClose, data, onSuccess, dataPrinter }) => {
  const [confirm, setConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showPrinter, setShowPrinter] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [selectedDateTime, setSelectedDateTime] = useState(dayjs().tz("Asia/Bangkok"));

  useEffect(() => {
    if (confirm && data && selectedDateTime) {
      const handleConfirm = async () => {
        try {

          const payload = {
            mixed_code: data.mix_code,
            mapping_id: data.mapping_ids,
            selectedDateTime: selectedDateTime.format("YYYY-MM-DD HH:mm:ss"),
          };

          console.log("📦 Payload:", payload);

          const response = await axios.post(`${API_URL}/api/pack/mixed/delay-time`, payload);

          if (response.data.success || response.status === 200) {
            console.log("✅ Successfully updated:", response.data.message);

            if (dataPrinter) {
              setProcessedData(dataPrinter);
              setShowPrinter(true);
            } else {
              setShowAlert(true);
              onClose();
              onSuccess();
            }
          } else {
            console.error("❌ Error:", response.data.message);
            setShowAlert(true);
          }
        } catch (error) {
          console.error("⚠️ API request failed:", error);
          setShowAlert(true);
        }
        setConfirm(false);
      };
      handleConfirm();
    }
  }, [confirm, data, onClose, onSuccess, dataPrinter, selectedDateTime]);

  const handleAlertClose = () => setShowAlert(false);
  const handlePrinterClose = () => {
    setShowPrinter(false);
    onClose();
    onSuccess();
  };

  if (!data) return null;

  // ✅ ฟังก์ชันตรวจสอบเวลาให้อยู่ระหว่าง 00:00–23:00
  const handleDateTimeChange = (newValue) => {
    if (!newValue) return;
    const hour = newValue.hour();
    if (hour >= 0 && hour <= 23) {
      setSelectedDateTime(newValue);
    } else {
      alert("กรุณาเลือกเวลาในช่วง 00:00 - 23:00 เท่านั้น");
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === "backdropClick") return;
          onClose();
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogContent>
          <Typography variant="h6" sx={{ fontSize: "18px", color: "#787878" }} mb={2}>
            กรุณาตรวจสอบข้อมูลก่อนยืนยันการบรรจุสำเร็จ
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* ℹ️ ข้อมูลรหัสการผสม */}
          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">
              รหัสการผสม: {data.mix_code}
            </Typography>
          </Stack>

          {/* 🕒 ช่องเลือกวันที่และเวลา */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="เลือกวันที่และเวลา"
                value={selectedDateTime}
                onChange={handleDateTimeChange} // ✅ ใช้ฟังก์ชันตรวจสอบช่วงเวลา
                ampm={false} // ใช้รูปแบบ 24 ชั่วโมง
                minutesStep={1}
                disableFuture={false}
                disablePast={false}
                slotProps={{
                  textField: { fullWidth: true, size: "small" }
                }}
              />
            </LocalizationProvider>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Button
              variant="contained"
              startIcon={<CancelIcon />}
              sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
              onClick={onClose}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              sx={{ backgroundColor: selectedDateTime ? "#41a2e6" : "#b0bec5", color: "#fff" }}
              disabled={!selectedDateTime}
              onClick={() => setConfirm(true)}
            >
              ยืนยัน
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* แจ้งเตือนเมื่อเกิดข้อผิดพลาด */}
      <ModalAlert open={showAlert} onClose={handleAlertClose} />

      {/* หน้าพิมพ์สำเร็จ */}
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