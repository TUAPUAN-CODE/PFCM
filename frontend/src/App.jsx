import React, { useState, lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// MUI Theme
const theme = createTheme({
  typography: {
    fontFamily: "'Prompt', sans-serif",
  },
});

// Lazy-loaded components (ใส่ .jsx ให้ครบ)
const AppSup = lazy(() => import("./component/Supervisor/AppSup.jsx"));
const AppColdStorage = lazy(() => import("./component/ColdStorage/AppColdStorage.jsx"));
const AppQualityControl = lazy(() => import("./component/QC/AppQC.jsx"));
const AppPack = lazy(() => import("./component/Pack/AppPack.jsx"));
const AppOven = lazy(() => import("./component/Oven/AppOven.jsx"));
const AppPrep = lazy(() => import("./component/Prep/AppPerp.jsx")); // แก้ชื่อให้ตรงและใส่ .jsx

// User-related components
const Login = lazy(() => import("./component/User/Login.jsx"));
const Logout = lazy(() => import("./component/User/Logout.jsx"));
const Signup = lazy(() => import("./component/User/Signup.jsx"));
const ForgotPassword = lazy(() => import("./component/User/ForgotPassword.jsx"));
const QCSelectWP = lazy(() => import("./component/User/QCSelectWP.jsx"));
const LineSelectWP = lazy(() => import("./component/User/LineSelectWP.jsx"));
const ManageSelect = lazy(() => import("./component/User/ManageSelect.jsx"));

// Loading Spinner Component สวย ๆ ด้วย MUI
function Loading() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",  // เต็มหน้าจอแนวตั้ง
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (status) => {
    setIsLoggedIn(status);
  };

  return (
    <ThemeProvider theme={theme}>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Auth */}
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Work Point Selection */}
          <Route path="/preparation/selectwp" element={<ManageSelect />} />
          <Route path="/qc/selectwp" element={<QCSelectWP />} />
          <Route path="/line/selectwp" element={<LineSelectWP />} />

          {/* Main App Sections */}
          <Route path="/oven/*" element={<AppOven />} />
          <Route path="/sup/*" element={<AppSup />} />
          <Route path="/coldStorage/*" element={<AppColdStorage />} />
          <Route path="/qualitycontrol/*" element={<AppQualityControl />} />
          <Route path="/packaging/*" element={<AppPack />} />
          <Route path="/prep/*" element={<AppPrep />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
