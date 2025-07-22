import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, CheckCircle, AlertCircle, X } from "lucide-react";
import { GoHomeFill } from "react-icons/go";
import { LuScanBarcode } from "react-icons/lu";
import { PiFishLight } from "react-icons/pi";
import { VscHistory } from "react-icons/vsc";
import { TbLogout2 } from "react-icons/tb";
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;

// คอมโพเนนต์ Toast
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-100" : type === "info" ? "bg-blue-100" : "bg-red-100";
  const textColor = type === "success" ? "text-green-800" : type === "info" ? "text-blue-800" : "text-red-800";
  const borderColor = type === "success" ? "border-green-400" : type === "info" ? "border-blue-400" : "border-red-400";
  const IconComponent = type === "success" ? CheckCircle : AlertCircle;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${bgColor} ${textColor} ${borderColor} border px-4 py-3 rounded shadow-md flex items-center`}>
      <IconComponent size={20} className="mr-2" />
      <div className="flex-grow">{message}</div>
      <button onClick={onClose} className="ml-4">
        <X size={16} />
      </button>
    </div>
  );
};

// Custom Hook สำหรับดึงข้อมูลวัตถุดิบ
const useRawMatFetcher = () => {
  const isFetchingRef = useRef(false);
  
  // กำหนด array ของ line_id ทั้งหมด
  const allLineIds = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 44, 45, 46, 47, 48, 49, 50,
    51, 52, 53, 54, 55
  ];

  const fetchAllData = async (onSuccess, onError) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    console.log("🚀 กำลังดึงรีเฟรชข้อมูลรถเข็น...");

    try {
      const CONCURRENT_LIMIT = 5;
      const results = [];

      for (let i = 0; i < allLineIds.length; i += CONCURRENT_LIMIT) {
        const chunk = allLineIds.slice(i, i + CONCURRENT_LIMIT);
        const chunkPromises = chunk.map((lineId) =>
          axios
            .get(`${API_URL}/api/auto-fetch/pack/main/fetchRawMat/${lineId}`)
            .then((res) => (res.data.success ? res.data.data : []))
            .catch(() => [])
        );
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.flat());
        await new Promise((r) => setTimeout(r, 200));
      }

      console.log("✅ รีเฟรชข้อมูลรถเข็นสำเร็จ:", results.length);
      if (onSuccess) onSuccess(results.length);
    } catch (error) {
      console.error("❌ รีเฟรชข้อมูลรถเข็นล้มเหลว:", error);
      if (onError) onError(error);
    } finally {
      isFetchingRef.current = false;
    }
  };

  return { fetchAllData };
};

const SIDEBAR_ITEMS = [
  { name: "หน้าหลัก", icon: GoHomeFill, href: "/oven" },
  { name: "Scan SAP", icon: LuScanBarcode, href: "/oven/products" },

  { name: "วัตถุดิบฝากห้องเย็น", icon: PiFishLight, href: "/oven/sales" },
  // { name: "ประวัติต้ม/อบเสร็จ", icon: VscHistory, href: "/oven/analytics" },
  // { 
  //   name: "รีเฟรชข้อมูลรถเข็น", 
  //   icon: VscHistory, 
  //   href: "#refresh",
  //   type: "action"
  // },
  { name: "ออกจากระบบ", icon: TbLogout2, href: "/logout" },
];

// คอมโพเนนต์ย่อยสำหรับรายการเมนู
const MenuItem = ({
  item,
  isSidebarOpen,
  active,
  hovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className="relative flex flex-col cursor-pointer"
    >
      {/* Top Decoration */}
      <div
        style={{
          background:
            active || hovered
              ? "#f9f9f9"
              : "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
        }}
      >
        <div
          style={{
            height: "10px",
            borderBottomRightRadius: "20px",
            background: "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
          }}
        />
      </div>

      {/* Main Item */}
      <div
        className="flex items-center p-3 text-xs font-medium"
        style={{
          backgroundColor: active || hovered ? "#fff" : "transparent",
          color: active || hovered ? "#4aaaec" : "#fff",
          borderTopRightRadius: "0px",
          borderBottomRightRadius: "0px",
          borderTopLeftRadius: "50px",
          borderBottomLeftRadius: "50px",
          marginLeft: "10px",
        }}
      >
        {item.icon && <item.icon size={16} />}
        {isSidebarOpen && <span className="ml-2 whitespace-nowrap">{item.name}</span>}
      </div>

      {/* Bottom Decoration */}
      <div
        style={{
          background:
            active || hovered
              ? "#f9f9f9"
              : "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
        }}
      >
        <div
          style={{
            height: "10px",
            borderTopRightRadius: "20px",
            background: "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
          }}
        />
      </div>
    </div>
  );
};

const SidebarOven = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const activeItem = location.pathname;
  const [hoveredItem, setHoveredItem] = useState(null);
  const [clickedItem, setClickedItem] = useState(
    localStorage.getItem("clickedItem") || null
  );
  
  // State สำหรับ toast
  const [toast, setToast] = useState(null);
  
  // นำเข้า hook สำหรับรีเฟรชข้อมูล
  const { fetchAllData } = useRawMatFetcher();

  const showToast = (message, type) => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // ฟังก์ชันสำหรับรีเฟรชข้อมูลรถเข็น
  const handleRefresh = () => {
    showToast("กำลังรีเฟรชข้อมูลรถเข็น...", "info");
    
    fetchAllData(
      (count) => {
        showToast(`รีเฟรชข้อมูลรถเข็นสำเร็จ!`, "success");
      },
      (error) => {
        showToast(`รีเฟรชข้อมูลรถเข็นล้มเหลว: ${error.message}`, "error");
      }
    );
  };

  // อัปเดตค่าใน localStorage ทุกครั้งที่มีการคลิก
  const handleClick = (href, item) => {
    // ตรวจสอบว่าเป็นปุ่ม action หรือไม่
    if (item && item.type === "action") {
      if (item.href === "#refresh") {
        handleRefresh();
      }
      return;
    }
    
    setClickedItem(href);
    localStorage.setItem("clickedItem", href);
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      
      <div
        className={`relative z-10 flex-shrink-0 ${
          isSidebarOpen ? "w-35" : "w-16"
        }`}
        style={{ 
          transition: "width 0.2s ease-in-out", 
          backgroundColor: "#fff",
          width: isSidebarOpen ? "159px" : "60px"
        }}
      >
        <div
          className="h-full flex flex-col"
          style={{
            background: "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
            color: "#fff",
          }}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-full text-white transition-colors max-w-fit"
            style={{
              color: "#E0F2FE",
              borderRadius: "8px",
              marginLeft: "17px",
              marginTop: "20px",
            }}
          >
            <Menu size={20} />
          </button>

          {/* Navigation Items with Scroll - เพิ่ม style และ CSS สำหรับการเลื่อน */}
          <nav className="mt-4 flex-grow overflow-y-auto">
            <style>
              {`
                /* ซ่อน scrollbar สำหรับ Chrome, Edge, Safari */
                nav::-webkit-scrollbar {
                  display: none;
                }

                /* ซ่อน scrollbar สำหรับ Firefox */
                nav {
                  -ms-overflow-style: none; /* IE and Edge */
                  scrollbar-width: none; /* Firefox */
                }
              `}
            </style>
            
            {SIDEBAR_ITEMS.map((item) => (
              <div key={item.href} className="mb-1">
                {item.type === "action" ? (
                  // สำหรับปุ่มที่มี action พิเศษ (ไม่ใช่ navigation)
                  <MenuItem
                    item={item}
                    isSidebarOpen={isSidebarOpen}
                    active={activeItem === item.href || clickedItem === item.href}
                    hovered={hoveredItem === item.href}
                    onClick={() => handleClick(item.href, item)}
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                  />
                ) : (
                  // สำหรับปุ่ม navigation ปกติ
                  <Link to={item.href}>
                    <MenuItem
                      item={item}
                      isSidebarOpen={isSidebarOpen}
                      active={activeItem === item.href || clickedItem === item.href}
                      hovered={hoveredItem === item.href}
                      onClick={() => handleClick(item.href, item)}
                      onMouseEnter={() => setHoveredItem(item.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                    />
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default SidebarOven;