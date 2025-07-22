import React from "react";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import {
  Dialog,
  DialogContent,
  Button,
  Box,
  Divider,
  Typography,
} from "@mui/material";
const API_URL = import.meta.env.VITE_API_URL;


const Modal3 = ({ open, onClose, data, onEdit }) => {
  console.log("Data passed to Modal3:", data); // Debugging line to check data
  const { inputValues = {}, input2 = {}, rmfp_id } = data || {};

  const handleConfirm = async () => {
    console.log("Input Values:", inputValues);
    const payload = {
      license_plate: inputValues.join(" "),
      rmfpID: rmfp_id || "",
      weight: input2?.weightPerCart || "",
      weightTotal: input2?.weightPerCart || "",
      ntray: input2?.numberOfTrays || "",
      // wp_id: input2?.operator || "",
    };
    console.log("Payload before sending:", payload);

    try {
      const response = await fetch(`${API_URL}/api/saveTrolley`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("API Response:", result);
      onClose();
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ color: "#787878", fontSize: "15px" }}>
        <Typography sx={{ fontSize: "18px", color: "#787878", textAlign: "left" }}>
          กรุณาตรวจสอบข้อมูลก่อนทำรายการ
        </Typography>
        <Divider sx={{ mt: 2, mb: 2 }} />

        <Box mt={0.5}>
        <Typography sx={{ fontSize: "15px", color: "#787878" }}>
  ป้ายทะเบียน : {inputValues.length > 0 ? inputValues[0] : "ไม่มีข้อมูลจาก Modal1"}
</Typography>

        </Box>

        <Box mt={0.5}>
          <Typography sx={{ fontSize: "15px", color: "#787878" }}>
            น้ำหนักวัตถุดิบ/รถเข็น : {input2?.weightPerCart || "ข้อมูลไม่พบ"}
          </Typography>
        </Box>

        <Box mt={0.5}>
          <Typography sx={{ fontSize: "15px", color: "#787878" }}>
            จำนวนถาด : {input2?.numberOfTrays || "ข้อมูลไม่พบ"}
          </Typography>
        </Box>

        <Box mt={0.5}>
          <Typography sx={{ fontSize: "15px", color: "#787878" }}>
            ผู้ดำเนินการ : {input2?.operator || "ข้อมูลไม่พบ"}
          </Typography>
        </Box>

        {rmfp_id ? (
          <Box mt={0.5}>
            <Typography sx={{ fontSize: "15px", color: "#787878" }}>
              RMFP ID : {rmfp_id}
            </Typography>
          </Box>
        ) : (
          <Box mt={0.5}>
            <Typography sx={{ fontSize: "15px", color: "#787878" }}>
              RMFP ID ไม่พบข้อมูล
            </Typography>
          </Box>
        )}

        <Divider sx={{ mt: 2, mb: 0 }} />
      </DialogContent>

      <Box sx={{ padding: "0px 20px 10px 20px", display: "flex", justifyContent: "space-between", height: "42px" }}>
        <Button
          sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
          variant="contained"
          startIcon={<CancelIcon />}
          onClick={onClose}
        >
          ยกเลิก
        </Button>
        <Button
          sx={{ backgroundColor: "#edc026", color: "#fff" }}
          variant="contained"
          startIcon={<EditIcon />}
          onClick={onEdit}
        >
          แก้ไข
        </Button>
        <Button
          sx={{ backgroundColor: "#41a2e6", color: "#fff" }}
          variant="contained"
          startIcon={<CheckCircleIcon />}
          onClick={handleConfirm}
        >
          ยืนยัน
        </Button>
      </Box>
    </Dialog>
  );
};

export default Modal3;
