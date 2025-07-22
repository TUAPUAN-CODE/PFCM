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

const QCSelectWP = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:600px)");
  const user_id = localStorage.getItem("user_id");

  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ตรวจสอบสิทธิ์เข้าถึง
  useEffect(() => {
    if (!user_id) {
      navigate("/");
    }
  }, [navigate, user_id]);

  useEffect(() => {
    const fetchWorkplaces = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/wp/userQC?user_id=${user_id}`);
        setWorkplaces(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Error fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkplaces();
  }, [user_id]);

  const handleSelectWorkplace = async (wp_user_id) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/wp/selectQC?user_id=${user_id}&wp_user_id=${wp_user_id}`
      );

      if (response.data.success) {
        const workplaceData = response.data.data[0];
        localStorage.setItem("rm_type_id", workplaceData.rm_type_id);
        navigate("/qualitycontrol");
      }
    } catch (error) {
      console.error("Error selecting workplace:", error);
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
              width: "95%",
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
                  alt="Workplace image"
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
                เลือกสถานที่ทำงาน QC
              </Typography>

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
              ) : workplaces.length === 0 ? (
                <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
                  ไม่พบสถานที่ทำงาน
                </Typography>
              ) : (
                workplaces.map((wp) => (
                  <Button
                    key={wp.wp_user_id}
                    fullWidth
                    variant="contained"
                    onClick={() => handleSelectWorkplace(wp.wp_user_id)}
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
                    {wp.rm_type_name}
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

export default QCSelectWP;