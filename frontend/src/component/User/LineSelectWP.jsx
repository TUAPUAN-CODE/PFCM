import React, { useEffect, useState } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  CircularProgress,
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

const API_URL = import.meta.env.VITE_API_URL;

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

const LineSelectWP = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:600px)");
  const wp_id = localStorage.getItem("wp_id");

  const [lineTypes, setLineTypes] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedLineType, setSelectedLineType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // ตรวจสอบสิทธิ์เข้าถึง
  useEffect(() => {
    if (!wp_id || wp_id !== "4") {
      alert("คุณไม่สามารถเข้าถึงหน้านี้ได้");
      navigate("/");
    }
  }, [navigate, wp_id]);

  useEffect(() => {
    const fetchLineTypes = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/linetype`);
        setLineTypes(res.data.data);
      } catch (err) {
        setError("ไม่สามารถโหลดประเภทไลน์ผลิตได้");
      }
    };
    fetchLineTypes();
  }, []);

  // เพิ่มการตรวจสอบเงื่อนไขพิเศษสำหรับ "All Line"
  const handleLineTypeChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedLineType(selectedValue);

    // ตรวจสอบว่าเป็น "All Line" หรือไม่
    const selectedType = lineTypes.find(lt => lt.line_type_id === selectedValue);

    if (selectedValue === "1001" || (selectedType && selectedType.line_type_name === "All Line")) {
      localStorage.setItem("line_id", selectedValue);
      navigate("/packaging");
    }
  };

  useEffect(() => {
    const fetchLines = async () => {
      if (!selectedLineType) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/api/linetype/line?line_type_id=${selectedLineType}`
        );
        setLines(res.data.data);
      } catch (err) {
        setError("ไม่สามารถโหลดไลน์ผลิตได้");
      } finally {
        setLoading(false);
      }
    };
    fetchLines();
  }, [selectedLineType]);

  const handleLineSelect = (line_id) => {
    localStorage.setItem("line_id", line_id);
    navigate("/packaging");
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
                  alt="Line image"
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
                  mb: 3,
                }}
              >
                เลือกประเภทไลน์ผลิต
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="line-type-label">ประเภทไลน์</InputLabel>
                <Select
                  labelId="line-type-label"
                  value={selectedLineType}
                  onChange={handleLineTypeChange}
                  label="ประเภทไลน์"
                >
                  <MenuItem value="1001">All Line</MenuItem>
                  {lineTypes.map((lt) => (
                    <MenuItem key={lt.line_type_id} value={lt.line_type_id}>
                      {lt.line_type_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100px",
                  }}
                >
                  <CircularProgress size={50} />
                </Box>
              ) : error ? (
                <Typography color="error" sx={{ textAlign: "center" }}>
                  {error}
                </Typography>
              ) : (
                lines.map((line) => (
                  <Button
                    key={line.line_id}
                    fullWidth
                    variant="contained"
                    onClick={() => handleLineSelect(line.line_id)}
                    sx={{
                      fontSize: "1rem",
                      padding: 2,
                      fontWeight: 600,
                      my: 1.5,
                      borderRadius: 2,
                      letterSpacing: "0.03em",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
                      },
                    }}
                  >
                    {line.line_name}
                  </Button>
                ))
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default LineSelectWP;