import React, { useState, useEffect } from "react";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import {
  Dialog,
  Stack,
  DialogContent,
  Button,
  Box,
  Divider,
  Typography,
} from "@mui/material";
import axios from "axios";
axios.defaults.withCredentials = true;
import ModalAlert from "../../../../Popup/AlertSuccess";
const API_URL = import.meta.env.VITE_API_URL;

const Modal3 = ({ open, onClose, data, CookedDateTime }) => {
  const [userId, setUserId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  console.log("Data passed to Modal3:", data); // Debugging line to check data
  const { inputValues = {}, input2 = {}, rmfp_id } = data || {};

  const handleClose = async () => {
    const troId = data?.inputValues?.[0];

    if (troId) {
      const success = await returnreserveTrolley(troId);
      if (!success) {
        setErrorDialogOpen(true);
        return;
      }
    }
    // clearData();
    onClose();
  };

  const returnreserveTrolley = async (tro_id) => {
    try {
      const response = await axios.post(`${API_URL}/api/re/reserveTrolley`, {
        tro_id: tro_id,
      });
      return response.data.success;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const handleConfirm = async () => {
    console.log("Input Values:", inputValues);

    try {
      const LineIdFromLocalStorage = localStorage.getItem("line_id");
      if (!LineIdFromLocalStorage) {
        throw new Error("No line_id found in localStorage");
      }

      // Create the request payload
      const requestData = {
        tro_id: inputValues.length > 0 ? inputValues[0] : "",
        line_id: LineIdFromLocalStorage,
      };

      console.log("Payload before sending:", requestData);

      const response = await axios.post(`${API_URL}/api/pack/Add/Trolley`, requestData, {
        headers: {
          "Content-Type": "application/json",
        }
      });

      // Handle the API response
      console.log(response.data); // Log the received data
    } catch (error) {
      console.error("Error:", error);
    } finally {
      onClose();
      setShowAlert(true);
    }
  };

  useEffect(() => {
    // Get user_id from localStorage
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  return (
    <div>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return; // Don't close when clicking outside
          onClose(); // Close for other cases
        }}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "15px", color: "#555" }}>
          <DialogContent sx={{ paddingBottom: 0 }} >
            <Typography sx={{ fontSize: "18px", fontWeight: 500, color: "#545454", marginBottom: "10px" }}>
              กรุณาตรวจสอบข้อมูลก่อนทำรายการ
            </Typography>
            <Divider sx={{ mt: 2, mb: 2 }} />

            <Typography>
              ป้ายทะเบียน : {inputValues.length > 0 ? inputValues[0] : "ไม่มีข้อมูลจาก Modal1"}
            </Typography>
            <Divider sx={{ mt: 2, mb: 0 }} />
          </DialogContent>
        </Box>
        <Stack
          sx={{
            paddingTop: "20px",
            paddingRight: "10px",
            paddingBottom: "20px",
            paddingLeft: "10px"
          }}
          direction="row"
          spacing={20}
          justifyContent="center"
        >
          <Button
            sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={handleClose}
          >
            ยกเลิก
          </Button>

          <Button
            sx={{ backgroundColor: "#41a2e6", color: "#fff" }}
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleConfirm}
          >
            ยืนยัน
          </Button>
        </Stack>
      </Dialog>
      <ModalAlert open={showAlert} onClose={() => setShowAlert(false)} />
    </div>
  );
};

export default Modal3;