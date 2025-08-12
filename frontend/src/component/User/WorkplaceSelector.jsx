import React, { useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  CssBaseline,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  useMediaQuery,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

// Theme ป้องกันการเบลอ
const sharpTheme = createTheme({
  typography: {
    fontFamily: [
      "Prompt",
      "Sarabun",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Oxygen",
      "Ubuntu",
      "Helvetica Neue",
      "sans-serif",
    ].join(","),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body": {
          textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "*": {
          textRendering: "geometricPrecision !important",
          fontFeatureSettings: '"kern" 1',
          fontKerning: "normal",
        },
      },
    },
  },
});

const WorkplaceSelector = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:600px)");
  
  const [selectedWorkplace, setSelectedWorkplace] = useState("");

  // ข้อมูลสถานที่ทำงาน
  const workplaces = [
    {
      wp_id: "1",
      name: "หม้ออบ",
      route: "http://172.16.151.128:5173/oven"
    },
    {
      wp_id: "2", 
      name: "จุดเตรียม",
      route: "http://172.16.151.128:5173/prep"
    },
    {
      wp_id: "3",
      name: "ตรวจสอบคุณภาพ",
      route: "http://172.16.151.128:5173/qualitycontrol"
    },
    {
      wp_id: "4",
      name: "บรรจุ",
      route: "http://172.16.151.128:5173/line/selectwp"
    },
    {
      wp_id: "5",
      name: "ห้องเย็น",
      route: "http://172.16.151.128:5173/coldStorage"
    },
    {
      wp_id: "6",
      name: "Supervisor",
      route: "http://172.16.151.128:5173/sup"
    }
  ];

  const handleWorkplaceChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedWorkplace(selectedValue);
  };

  const handleConfirm = () => {
    if (!selectedWorkplace) {
      alert("กรุณาเลือกสถานที่ทำงาน");
      return;
    }

    // หาข้อมูลสถานที่ทำงานที่เลือก
    const selectedWP = workplaces.find(wp => wp.wp_id === selectedWorkplace);
    
    if (selectedWP) {
      // เก็บค่าใน localStorage
      localStorage.setItem("wp_id", selectedWP.wp_id);
      
      // Navigate ไปยังหน้าที่กำหนด
      if (selectedWP.route.startsWith("http://")) {
        // ถ้าเป็น URL เต็ม ให้ redirect
        window.location.href = selectedWP.route;
      } else {
        // ถ้าเป็น relative path ให้ใช้ navigate
        navigate(selectedWP.route);
      }
    }
  };

  return (
    <ThemeProvider theme={sharpTheme}>
      <CssBaseline />
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1770b8",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg" disableGutters>
          <Paper
            elevation={6}
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              borderRadius: 3,
              overflow: "hidden",
              width: "100%",
              height: isMobile ? "auto" : "80vh",
              mx: "auto",
              my: isMobile ? 2 : "auto",
            }}
          >
            {/* ภาพด้านซ้าย */}
            {!isMobile && (
              <Box
                sx={{
                  width: "50%",
                  position: "relative",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <img
                  src="/Cat.jpg"
                  alt="Workplace selection"
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    imageRendering: "crisp-edges",
                  }}
                  loading="eager"
                />
              </Box>
            )}

            {/* ฟอร์มด้านขวา */}
            <Box
              sx={{
                width: isMobile ? "100%" : "50%",
                padding: isMobile ? 3 : 5,
                backgroundColor: "white",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: "#1e3c72",
                  fontSize: { xs: "1.8rem", md: "2.125rem" },
                  textAlign: "center",
                  mb: 4,
                }}
              >
                เลือกสถานที่ทำงาน
              </Typography>

              <FormControl fullWidth sx={{ mb: 4 }}>
                <InputLabel id="workplace-label">สถานที่ทำงาน</InputLabel>
                <Select
                  labelId="workplace-label"
                  value={selectedWorkplace}
                  onChange={handleWorkplaceChange}
                  label="สถานที่ทำงาน"
                  sx={{ fontSize: "1.1rem" }}
                >
                  {workplaces.map((wp) => (
                    <MenuItem key={wp.wp_id} value={wp.wp_id}>
                      {wp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                fullWidth
                variant="contained"
                onClick={handleConfirm}
                disabled={!selectedWorkplace}
                sx={{
                  fontSize: "1.2rem",
                  padding: 2,
                  fontWeight: 600,
                  borderRadius: 2,
                  letterSpacing: "0.03em",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
                  },
                  "&:disabled": {
                    backgroundColor: "#cccccc",
                    color: "#666666",
                  },
                }}
              >
                ยืนยันการเลือก
              </Button>

              {selectedWorkplace && (
                <Box sx={{ mt: 3, p: 2, backgroundColor: "#f5f5f5", borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ textAlign: "center", color: "#666" }}>
                    คุณเลือก: <strong>{workplaces.find(wp => wp.wp_id === selectedWorkplace)?.name}</strong>
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default WorkplaceSelector;