import React, { useState, useEffect } from "react";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { TbBackground } from "react-icons/tb";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import {
  IconButton,
  Button,
  Box,
  Snackbar,
  Alert,
  Paper,
  CircularProgress,
  Chip,
  AppBar,
  Toolbar,
} from "@mui/material";
import Typography from "@mui/material/Typography"; // Import Typography
import ParentComponent from "../Assety/ParentComponent";

const SlotModal = ({ slot, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // กำหนด style สำหรับ font ที่ต้องการ
  const customFontStyle = {
    fontFamily: 'Kanit, sans-serif', // เปลี่ยน 'Kanit' เป็นชื่อ Font ที่คุณต้องการ
  };

  // ฟังก์ชันสำหรับรีเฟรชข้อมูล
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showSnackbar("รีเฟรชข้อมูลสำเร็จ", "success");
    }, 1000);
  };

  // ฟังก์ชันแสดง Snackbar
  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  // ฟังก์ชันปิด Snackbar
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <Paper
        elevation={8}
        style={{ color: "#585858" }}
        className="bg-white rounded-lg shadow-lg w-[1200px] h-[600px] overflow-hidden"
      >
        {/* Header */}
        <AppBar position="static" sx={{ backgroundColor: "#4e73df" }}>
          <Toolbar sx={{ minHeight: "50px", px: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <WarehouseIcon sx={{ mr: 1 }} />
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, ...customFontStyle }}>
                ข้อมูลช่องจอด
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton color="inherit" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* ข้อมูลช่องจอด */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            backgroundColor: "#f8f9fc",
            borderBottom: "1px solid #e3e6f0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Chip
              icon={<WarehouseIcon />}
              label={<Typography style={customFontStyle}>ห้อง: {slot.cs_id}</Typography>}
              color="primary"
              variant="outlined"
              sx={{ mr: 1, borderRadius: "4px" }}
            />
            <Chip
              icon={<TbBackground size={20} />}
              label={<Typography style={customFontStyle}>ช่องจอด: {slot.slot_id}</Typography>}
              color="primary"
              variant="outlined"
              sx={{ mr: 1, borderRadius: "4px" }}
            />
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Chip
                icon={<LocalShippingIcon />}
                label={
                  <Typography style={customFontStyle}>
                    {slot.tro_id ? `เลขทะเบียน: ${slot.tro_id}` : "ไม่มีรถเข็น"}
                  </Typography>
                }
                color={slot.tro_id ? "secondary" : "error"}
                variant="outlined"
                sx={{ borderRadius: "4px", mr: 1 }}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" style={customFontStyle}>
              อัปเดตล่าสุด: {new Date().toLocaleString("th-TH")}
            </Typography>
          </Box>
        </Box>

        {/* ส่วนเนื้อหาหลัก */}
        <Box sx={{ height: "calc(100% - 200px)", overflow: "auto" }}>
          <ParentComponent slotId={slot.slot_id} onClose={() => {}} slotInfo={slot} tro={slot.tro_id}/>
        </Box>

        {/* ส่วนล่าง */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid #e3e6f0",
            backgroundColor: "#f8f9fc",
          }}
        >
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            sx={{ bgcolor: "#E74A3B", color: "#fff", "&:hover": { bgcolor: "#d52a1a" } }}
            onClick={() => onClose(false)} // ปิด Modal
          >
            <Typography style={customFontStyle}>ยกเลิก</Typography>
          </Button>
        </Box>

        {/* Snackbar สำหรับแสดงข้อความแจ้งเตือน */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbarSeverity}
            sx={{ width: "100%" }}
            variant="filled"
            elevation={6}
          >
            <Typography style={customFontStyle}>{snackbarMessage}</Typography>
          </Alert>
        </Snackbar>
      </Paper>
    </div>
  );
};

export default SlotModal;