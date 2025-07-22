import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline"; // Changed from CheckCircleIcon to DeleteIcon
import SendIcon from "@mui/icons-material/Send";
import ParentComponent from "../table/ParentComponent";
import ModalAlert from "../../../../Popup/AlertSuccess";
import ModalSuccess from "./ModalSuccess";
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const ModalEditPD = ({ open, onClose, data, onSuccess }) => {
  const { tro_id, rm_tro_id, delayTimeValue } = data || {};
  const [showAlert, setShowAlert] = useState(false);
  const [fetchedTableData, setFetchedTableData] = useState(null);
  const [showModalSuccess, setShowModalSuccess] = useState(false);

  const handleDataReceived = (data) => {
    setFetchedTableData(data);

    console.log("Data received in ModalEditPD:", data);

  };

  const handleConfirm = async () => {
    const rm_tro_id_array = Array.isArray(rm_tro_id) ? rm_tro_id : [rm_tro_id];
    const payload = {
      tro_id: tro_id,
      rm_tro_id: rm_tro_id_array,
    };
    console.log("Payload being sent:", payload);

    try {
      const response = await axios.post(`${API_URL}/api/pack/getout/Trolley`, payload);
      if (response.status === 200) {
        console.log("Data sent successfully:", response.data);
        onSuccess();
        onClose();
        setShowAlert(true);
      } else {
        console.error("Error while sending data:", response.status);
      }
    } catch (error) {
      console.error("Error during API call:", error);
    }

    console.log(payload);
  };

  const handleSendMaterial = () => {
    setShowModalSuccess(true);
  };

  const handleModalSuccessClose = () => {
    setShowModalSuccess(false);
  };

  const handleModalSuccessSuccess = () => {
    // Handle any updates needed after successful material sending
    onSuccess();

    setTimeout(() => {
      onClose(); // ปิด ModalEditPD
    }, 100);
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
        maxWidth={false}
        sx={{ "& .MuiDialog-paper": { width: "1400px", height: "610px", padding: "0" } }}
      >
        <DialogContent sx={{ p: "0" }}>
          <Typography variant="h6" sx={{ fontSize: "18px", color: "#787878", mb: 2, pt: 2, pl: 3 }}>
            กรุณาตรวจสอบข้อมูลก่อนส่งวัตถุดิบ
          </Typography>

          <ParentComponent
            tro_id={tro_id}
            onDataFetched={handleDataReceived}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", pl: 3, pr: 3, pt: 2 }}>
            <Button
              variant="contained"
              startIcon={<CancelIcon />}
              sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
              onClick={onClose}
            >
              ยกเลิก
            </Button>

            {/* Added Send Material Button */}
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              sx={{ backgroundColor: "#4e73df", color: "#fff" }}
              onClick={handleSendMaterial}
            >
              ส่งวัตถุดิบ
            </Button>

            {/* Changed button text from "ยืนยัน" to "ลบวัตถุดิบทั้งหมด" and icon */}
            <Button
              variant="contained"
              startIcon={<DeleteIcon />}
              sx={{ backgroundColor: "#41a2e6", color: "#fff" }}
              onClick={handleConfirm}
            >
              ลบวัตถุดิบทั้งหมด
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Alert Modal */}
      <ModalAlert open={showAlert} onClose={() => setShowAlert(false)} />

      {/* Success Modal for sending materials */}
      <ModalSuccess
        open={showModalSuccess}
        onClose={handleModalSuccessClose}
        tro_id={tro_id}
        tableData={fetchedTableData}
        onSuccess={handleModalSuccessSuccess}
        delayTime={delayTimeValue} // เพิ่มการส่งค่า delayTime
        closeParentModal={onClose}
      />
    </>
  );
};

export default ModalEditPD;