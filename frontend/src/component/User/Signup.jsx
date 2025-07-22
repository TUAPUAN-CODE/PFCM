import React, { useState } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  CssBaseline,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

// Schema ตรวจสอบข้อมูล
const schema = yup.object().shape({
  user_id: yup.string().required("กรุณากรอกรหัสพนักงาน"),
  password: yup
    .string()
    .min(5, "กรุณากรอกรหัสผ่านที่มีความยาวอย่างน้อย 5 ตัว")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "รหัสผ่านต้องตรงกัน")
    .required("กรุณายืนยันรหัสผ่าน"),
  birthday: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันเกิดไม่ถูกต้อง")
    .required("กรุณากรอกวันเกิด"),
});

const Signup = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const formattedData = {
        ...data,
        birthday: new Date(data.birthday).toISOString(), // แปลง string เป็น ISO Date
      };

      const response = await axios.put(`${API_URL}/api/signup`, formattedData);

      if (response.data && response.data.message) {
        console.log("Signup Success:", response.data);
        navigate("/login"); // นำทางไปหน้า Login หลังจากสมัครสมาชิกสำเร็จ
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1770b8",
        backgroundImage: "url('/')",
      }}
    >
      <CssBaseline />
      <Container maxWidth="lg">
        <Paper
          elevation={6}
          sx={{
            display: "flex",
            overflow: "hidden",
            borderRadius: 3,
          }}
        >
          {/* พื้นที่รูปภาพ */}
          <Box
            sx={{
              width: "50%",
              backgroundImage: "url('/Cat.jpg')",
              backgroundSize: "80vh",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              display: { xs: "none", md: "block" },
            }}
          />

          {/* ฟอร์ม Signup */}
          <Box
            sx={{
              width: { xs: "100%", md: "50%" },
              maxHeight: "650px",
              minHeight: "650px",
              padding: "5%",
              paddingX: "7%",
              textAlign: "center",
            }}
          >
            <Typography
              variant="h4"
              gutterBottom
              sx={{ fontWeight: "bold", color: "#1e3c72" }}
            >
              สมัครสมาชิก
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginBottom: 2 }}
            >
              กรุณากรอกข้อมูลเพื่อสมัครสมาชิก
            </Typography>
            {errorMessage && (
              <Typography color="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Typography>
            )}
            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label="รหัสพนักงาน"
                variant="outlined"
                margin="normal"
                {...register("user_id")}
                error={!!errors.user_id}
                helperText={errors.user_id?.message}
              />
              <TextField
                fullWidth
                label="รหัสผ่าน"
                variant="outlined"
                margin="normal"
                type="password"
                {...register("password")}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <TextField
                fullWidth
                label="ยืนยันรหัสผ่าน"
                variant="outlined"
                margin="normal"
                type="password"
                {...register("confirmPassword")}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
              <TextField
                fullWidth
                label="วันเกิด - วัน / เดือน / ปี(ค.ศ.)"
                variant="outlined"
                margin="normal"
                type="date"
                {...register("birthday")}
                error={!!errors.birthday}
                helperText={errors.birthday?.message}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <Box mt={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ padding: 1.2 }}
                  type="submit"
                >
                  สมัครสมาชิก
                </Button>
              </Box>
              <Typography variant="body2" sx={{ marginTop: 2 }}>
                มีบัญชีอยู่แล้ว? <a href="/login" className="text-base text-blue-600 py-3">เข้าสู่ระบบ</a>
              </Typography>
            </form>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Signup;
