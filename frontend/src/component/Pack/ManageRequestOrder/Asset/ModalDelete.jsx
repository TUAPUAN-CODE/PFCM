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

const ModalDelete = ({ open, onClose, data, onSuccess }) => {
  const [confirm, setConfirm] = useState(false);
  const [responseData, setResponseData] = useState(null);

  useEffect(() => {
    if (confirm && data) {
      const handleDelete = async () => {
        try {
          const response = await axios.delete(`${API_URL}/api/delete/request/RM/${data.request_rm_id}`);

          if (response.data.success) {
            console.log("ลบข้อมูล RequestRawmat สำเร็จ:", response.data.message);

            // เก็บข้อมูลที่ลบ (optional)
            setResponseData({
              ...data,
              deleted: true,
            });

            // เรียก onSuccess และปิด modal
            onSuccess();
            onClose();
          } else {
            console.error("เกิดข้อผิดพลาด:", response.data.message);
          }
        } catch (error) {
          console.error("API request failed:", error);
        }
        setConfirm(false);
      };

      handleDelete();
    }
  }, [confirm, data, onSuccess, onClose]);


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
            กรุณาตรวจสอบข้อมูลก่อนลบรายการ
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">Mat: {data.mat}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {data.mat_name}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {data.batch_after}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Production: {data.production}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Production: {data.request_rm_id}</Typography>
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

      {/* ไม่มีการแสดง SuccessPrinter และ ModalAlert อีกต่อไป */}
      <SuccessPrinter
        open={false}
        onClose={() => { }}
        data={responseData}
      />
    </>
  );
};

export default ModalDelete;