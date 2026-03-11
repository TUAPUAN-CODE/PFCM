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

const API_URL = import.meta.env.VITE_API_URL;

// const ModalSuccess = ({ open, onClose, mat, mat_name, batch, production, rmfp_id, onSuccess }) => {
//   const [confirm, setConfirm] = useState(false);
//   const [showAlert, setShowAlert] = useState(false);

//   useEffect(() => {
//     if (confirm) {
//       const handleConfirm = async () => {
//         try {
//           const response = await axios.post(`${API_URL}/api/oven/toCold/successTrolley`, {
//             rmfpID: rmfp_id,
//           });

//           if (response.data.success) {
//             console.log("Successfully updated production status:", response.data.message);
//             onSuccess();
//             onClose();
//             setShowAlert(true);
//           } else {
//             console.error("Error:", response.data.message);
//           }
//         } catch (error) {
//           console.error("API request failed:", error);
//         }
//         setConfirm(false);
//       };
//       handleConfirm();
//     }
//   }, [confirm, rmfp_id, onClose, onSuccess]);

//   const handleAlertClose = () => {
//     setShowAlert(false);
//   };

//   return (
//     <>
//       <Dialog 
//         open={open} 
//         onClose={(e, reason) => {
//           if (reason === 'backdropClick') return;
//           onClose();
//         }} 
//         fullWidth 
//         maxWidth="xs"
//       >
//         <DialogContent>
//           <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
//             กรุณาตรวจสอบข้อมูลก่อนทำรายการ
//           </Typography>
//           <Divider sx={{ mb: 2 }} />
          
//           <Stack spacing={1}>
//             <Typography color="rgba(0, 0, 0, 0.6)">Mat: {mat}</Typography>
//             <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {mat_name}</Typography>
//             <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
//             <Typography color="rgba(0, 0, 0, 0.6)">Production: {production}</Typography>
//             <Typography color="rgba(0, 0, 0, 0.6)">rmfp_id: {rmfp_id}</Typography>
//           </Stack>

//           <Divider sx={{ my: 2 }} />
          
//           <Box sx={{ display: "flex", justifyContent: "space-between" }}>
//             <Button
//               variant="contained"
//               startIcon={<CancelIcon />}
//               style={{ backgroundColor: "#E74A3B", color: "#fff" }}
//               onClick={onClose}
//             >
//               ยกเลิก
//             </Button>
//             <Button
//               variant="contained"
//               startIcon={<CheckCircleIcon />}
//               style={{ backgroundColor: "#41a2e6", color: "#fff" }}
//               onClick={() => setConfirm(true)}
//             >
//               ยืนยัน
//             </Button>
//           </Box>
//         </DialogContent>
//       </Dialog>
//       <ModalAlert open={showAlert} onClose={handleAlertClose} />
//     </>
//   );
// };

// export default ModalSuccess;
const ModalSuccess = ({ 
  open, 
  onClose, 
  mat, 
  mat_name, 
  batch, 
  production, 
  rmfp_id, 
  onSuccess,
  rawMatType,    // ✅ เพิ่มบรรทัดนี้
  mapping_id     // ✅ เพิ่มบรรทัดนี้
}) => {
  const [confirm, setConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (confirm) {
      const handleConfirm = async () => {
        try {
          // ✅ เลือก endpoint ตาม rawMatType
          let apiEndpoint;
          let payload;

          if (rawMatType === 'checkin') {
            // ✅ กรณีเป็นข้อมูล CheckIn
            apiEndpoint = `${API_URL}/api/checkin/successCheckIn`;
            payload = {
              rmfpID: rmfp_id,
              mapping_id: mapping_id
            };
            console.log("📦 Using CheckIn success endpoint");
          } else {
            // ✅ กรณีปกติ (regular/mixed)
            apiEndpoint = `${API_URL}/api/oven/toCold/successTrolley`;
            payload = {
              rmfpID: rmfp_id
            };
            console.log("📦 Using regular success endpoint");
          }

          const response = await axios.post(apiEndpoint, payload);

          if (response.data.success) {
            console.log("✅ Successfully updated production status:", response.data.message);
            onSuccess();
            onClose();
            setShowAlert(true);
          } else {
            console.error("❌ Error:", response.data.message);
          }
        } catch (error) {
          console.error("❌ API request failed:", error);
        }
        setConfirm(false);
      };
      handleConfirm();
    }
  }, [confirm, rmfp_id, mapping_id, rawMatType, onClose, onSuccess]);

  const handleAlertClose = () => {
    setShowAlert(false);
  };

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
            กรุณาตรวจสอบข้อมูลก่อนทำรายการ
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">Mat: {mat}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {mat_name}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Production: {production}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">rmfp_id: {rmfp_id}</Typography>
            {/* ✅ แสดงข้อมูลเพิ่มเติมสำหรับ CheckIn */}
            {rawMatType === 'checkin' && (
              <>
                <Typography color="rgba(0, 0, 0, 0.6)">Type: Check-In</Typography>
                <Typography color="rgba(0, 0, 0, 0.6)">Mapping ID: {mapping_id}</Typography>
              </>
            )}
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
      <ModalAlert open={showAlert} onClose={handleAlertClose} />
    </>
  );
};

export default ModalSuccess;