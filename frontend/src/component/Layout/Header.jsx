import { useEffect, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL;

const Header = ({ title }) => {
  const [user, setUser] = useState(null);
  const [position, setPosition] = useState(""); // state สำหรับเก็บ pos_name
  const [workplace, setWorkplace] = useState(""); // state สำหรับเก็บ wp_name
  const [rawmatType, setRawmatType] = useState(""); // state สำหรับเก็บ wp_name

  useEffect(() => {
    // ดึงข้อมูลจาก localStorage
    const userData = {
      name: `${
        localStorage.getItem("first_name") || "ไม่พบรายชื่อ"
      } ${localStorage.getItem("last_name")}`,
      role: `ตำแหน่ง ID: ${
        localStorage.getItem("pos_id") || "Administrator"
      } | จุดทำงาน ID: ${localStorage.getItem("wp_id") || "ไม่พบสถานที่ทำงาน"}`,
    };

    setUser(userData);

    // ดึง pos_id จาก localStorage
    const pos_id = localStorage.getItem("pos_id");

    // ส่ง pos_id ไปที่ API
    if (pos_id) {
      fetch(`${API_URL}/api/header/pos/${pos_id}`, { credentials: "include" })
        .then((response) => response.json())
        .then((data) => {
          if (data.position) {
            setPosition(data.position.pos_name); // นำ pos_name มาใช้
          }
        })
        .catch((error) => console.error("Error fetching position:", error));
    }

    // ดึง wp_id จาก localStorage
    const wp_id = localStorage.getItem("wp_id");

    // ส่ง wp_id ไปที่ API
    if (wp_id) {
      fetch(`${API_URL}/api/header/wp/${wp_id}`, { credentials: "include" })
        .then((response) => response.json())
        .then((data) => {
          if (data.workplace) {
            setWorkplace(data.workplace.wp_name); // นำ wp_name มาใช้
          }
        })
        .catch((error) => console.error("Error fetching workplace:", error));
    }

    // ดึง rm_type_id จาก localStorage
    // const rm_type_id = localStorage.getItem("rm_type_id");

    // if (rm_type_id && rm_type_id !== "1") {
    //   // ตรวจสอบว่าไม่ใช่ rm_type_id = 1
    //   fetch(`${API_URL}/api/rawmat/${rm_type_id}`, { credentials: "include" })
    //     .then((response) => response.json())
    //     .then((data) => {
    //       if (data.rawMaterial) {
    //         // แก้ให้ตรงกับ key ของ API
    //         setRawmatType(data.rawMaterial.rm_type_name); // ตั้งค่า rm_type_name
    //       }
    //     })
    //     .catch((error) => console.error("Error fetching raw material:", error));
    // }
  }, []);

  return (
    <header
      style={{
        backgroundColor: "#fff",
        color: "#686868",
        marginTop: "10px",
        borderRadius: "4px",
        height: "40px",
        boxShadow: "0 0px 3px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div
        style={{ alignItems: "center", marginTop: "4px" }}
        className="mx-auto sm:px-6 lg:px-5 flex items-center justify-between"
      >
        {/* Title */}
        <h6 className="header-title">{title}</h6>

        {/* User Card */}
        <div
          style={{
            backgroundColor: "#fff",
            padding: "4px 10px",
            color: "#787878",
            fontSize: "10px",
            marginTop: "1px",
            width: "fit-content", // ขยายตามข้อความ
            display: "flex",
            alignItems: "center",
            borderRadius: "8px",
          }}
          className="user-card"
        >
          {/* Icon หรือ Profile Picture */}
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "#787878",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              marginRight: "10px",
              flexShrink: 0, // ป้องกันการบีบขนาดของไอคอน
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {/* User Details */}
          <div style={{ whiteSpace: "nowrap" }}>
            <p style={{ margin: "0", fontWeight: "bold" }}>
              {user?.name || "ไม่พบรายชื่อ"}
            </p>
            <p style={{ margin: "0" }}>
              {position || "ตำแหน่งไม่พบ"} | {workplace || "จุดทำงานไม่พบ"}{" "}
              {rawmatType || ""}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
