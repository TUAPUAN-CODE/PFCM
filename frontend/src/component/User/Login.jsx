import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  IconButton,
  InputAdornment,
  CssBaseline,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom"; // นำเข้า useNavigate
const API_URL = import.meta.env.VITE_API_URL;

// Schema ตรวจสอบข้อมูล
const schema = yup.object().shape({
  user_id: yup.string().required("กรุณากรอกรหัสพนักงาน"),
  password: yup
    .string()
    .min(4, "กรุณากรอกรหัสผ่าน")
    .required("Password is required"),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    // ล้างข้อมูลทั้งหมดใน localStorage ก่อน เพื่อเคลียร์ข้อมูลของ user ก่อนหน้า
    localStorage.clear();
  });

  const onSubmit = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/api/login`, data);

    if (response.data && response.data.user) {
      const user = response.data.user;
      console.log("Login Success:", response.data);

      // เก็บข้อมูลผู้ใช้ลงใน localStorage
      const userInfo = [
        ["user_id", user.user_id],
        ["first_name", user.first_name],
        ["last_name", user.last_name],
        ["birthday", user.birthday],
        ["leader", user.leader],
        ["pos_id", user.pos_id],
        ["wp_id", user.wp_id],
        ["rm_type_id", user.rm_type_id] // เพิ่ม rm_type_id
      ];

      userInfo.forEach(([key, value]) => localStorage.setItem(key, value));

      // ถ้า rm_type_id เป็น array ให้บันทึกเป็น JSON string
      if (Array.isArray(user.rm_type_id)) {
        localStorage.setItem('rm_type_id', JSON.stringify(user.rm_type_id));
      }

      // ตรวจสอบสถานที่ทำงานของ user และนำทางไปยังหน้าที่เกี่ยวข้อง
      const workplaceRoutes = {
        1: "/oven",
        2: "/prep",
        3: "/qualitycontrol",
        4: "/line/selectwp",
        5: "/coldStorage",
        6: "/sup",
      };

      workplaceRoutes[user.wp_id]
        ? navigate(workplaceRoutes[user.wp_id], { replace: true })
        : setErrorMessage("ไม่มีสถานที่ทำงานของรหัสพนักงานนี้ !!");
    } else {
      setErrorMessage("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
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

          {/* ฟอร์ม Login */}
          <Box
            sx={{
              width: { xs: "100%", md: "50%" },
              paddingTop: 20,
              paddingBottom: 20,
              paddingLeft: 10,
              paddingRight: 10,
              textAlign: "center",
              maxHeight: "650px",
              minHeight: "650px",
            }}
          >
            <Typography
              variant="h4"
              gutterBottom
              sx={{ fontWeight: "bold", color: "#1e3c72" }}
            >
              ยินดีต้อนรับ
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginBottom: 2 }}
            >
              กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ
            </Typography>
            {errorMessage && (
              <Typography color="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Typography>
            )}
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* เพิ่ม onSubmit */}
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
                type={showPassword ? "text" : "password"}
                {...register("password")}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <Box mt={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ padding: 1.2 }}
                  type="submit" // เพิ่ม type="submit"
                >
                  เข้าสู่ระบบ
                </Button>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: "10px"}}>
                <Typography variant="body2" sx={{ marginTop: 2 }} align="left">
                  <a href="/forgot-password" className="text-base text-blue-600 py-3">
                    ลืมรหัสผ่าน ?
                  </a>
                </Typography>
                <Typography variant="body2" sx={{ marginTop: 2 }} align="right">
                  <a href="/signup">ยังไม่มีบัญชี ? </a>
                  <a href="/signup" className="text-base text-blue-600 py-3">
                    ลงทะเบียน
                  </a>
                </Typography>
              </Box>
            </form>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
