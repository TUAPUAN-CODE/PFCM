import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // ล้างข้อมูลทั้งหมดใน localStorage
    localStorage.clear();
    // นำทางกลับไปหน้า login
    navigate("/login");
  }, [navigate]);

  return null;
};

export default Logout;
