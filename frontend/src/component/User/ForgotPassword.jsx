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
  birthday: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันเกิดไม่ถูกต้อง")
    .required("กรุณากรอกวันเกิด"),
  password: yup
    .string()
    .min(5, "รหัสผ่านต้องมีอย่างน้อย 5 ตัวอักษร")
    .required("กรุณากรอกรหัสผ่านใหม่"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "รหัสผ่านต้องตรงกัน")
    .required("กรุณายืนยันรหัสผ่าน"),
});

const ForgotPassword = () => {
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
      const response = await axios.put(`${API_URL}/api/forgot-password`, data);
      if (response.data && response.data.message) {
        console.log("Password Reset Success:", response.data);
        navigate("/login"); // นำทางไปหน้า Login หลังจากเปลี่ยนรหัสผ่านสำเร็จ
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

          {/* ฟอร์ม ลืมรหัสผ่าน */}
          <Box
            sx={{
              width: { xs: "100%", md: "50%" },
              padding: 10,
              textAlign: "center",
              maxHeight: "650px",
              minHeight: "650px",
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", color: "#1e3c72" }}
            >
              ลืมรหัสผ่าน
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
            >
              กรุณากรอกข้อมูลเพื่อเปลี่ยนรหัสผ่านใหม่
            </Typography>

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
                label="วันเกิด - วัน / เดือน / ปี(ค.ศ.)"
                variant="outlined"
                margin="normal"
                type="date"
                {...register("birthday")}
                error={!!errors.birthday}
                helperText={errors.birthday?.message}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="รหัสผ่านใหม่"
                variant="outlined"
                margin="normal"
                type="password"
                {...register("password")}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <TextField
                fullWidth
                label="ยืนยันรหัสผ่านใหม่"
                variant="outlined"
                margin="normal"
                type="password"
                {...register("confirmPassword")}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
              <Box>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ padding: 1.2 }}
                  type="submit"
                >
                  รีเซ็ตรหัสผ่าน
                </Button>
              </Box>
              {errorMessage && (
                <Typography color="error" sx={{ margin: 0, padding:0 }}>
                  {errorMessage}
                </Typography>
              )}
              <Typography variant="body2" sx={{ marginTop: 2 }}>
                <a href="/login" className="text-base text-blue-600 py-3">
                  กลับไปหน้าเข้าสู่ระบบ
                </a>
              </Typography>
            </form>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
