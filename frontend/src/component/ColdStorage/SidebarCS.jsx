import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { GoHomeFill } from "react-icons/go";
import { LuScanBarcode } from "react-icons/lu";
import { PiFishSimple } from "react-icons/pi";
import { PiFishLight } from "react-icons/pi";
import { PiFishSimpleFill } from "react-icons/pi";
import { VscHistory } from "react-icons/vsc";
import { TbLogout2 } from "react-icons/tb";
import { RiArrowDownBoxLine } from "react-icons/ri";
import { RiArrowUpBoxLine } from "react-icons/ri";
import { PiThermometerColdThin } from "react-icons/pi";
import { PiThermometerColdBold } from "react-icons/pi";
import { BsFillCartXFill } from "react-icons/bs";
import { FaPeopleCarry } from 'react-icons/fa';
import { IoMove } from "react-icons/io5";

const API_URL = import.meta.env.VITE_API_URL;
const pos_id = localStorage.getItem("pos_id");
const allowedPositions = ["3", "4", "5", "6"];
const showWorkplaceSelector = allowedPositions.includes(pos_id);
const SIDEBAR_ITEMS = [
  { name: "หน้าหลัก", icon: GoHomeFill, href: "/coldStorage" },
  {
    name: "รับเข้า",
    icon: RiArrowDownBoxLine,
    href: "#",
    submenu: [
      { name: "CSR 3", href: "/coldStorage/CheckIn/CSR3/CSR3Page" },
      { name: "Chill 2", href: "/coldStorage/CheckIn/Chill2/Chill2Page" },
      { name: "Chill 4", href: "/coldStorage/CheckIn/Chill4/Chill4Page" },
      { name: "Chill 5", href: "/coldStorage/CheckIn/Chill5/Chill5Page" },
      { name: "Chill 6", href: "/coldStorage/CheckIn/Chill6/Chill6Page" },
      { name: "4C", href: "/coldStorage/CheckIn/4C/4CPage" },
      { name: "Ante", href: "/coldStorage/CheckIn/AntePage/AntePage" },
      { name: "LargeRoom", href: "/coldStorage/CheckIn/Large/LargePage" },
    ],
  },
  { name: "ส่งออก", icon: RiArrowUpBoxLine, href: "/coldStorage/CheckOut/CheckOutPage" },
  {
    name: "ห้องเย็น",
    icon: PiThermometerColdBold,
    href: "#",
    submenu: [
      { name: "CSR 3", href: "/coldStorage/Room/CSR3/CSR3Page" },
      { name: "Chill 2", href: "/coldStorage/Room/Chill2/Chill2Page" },
      { name: "Chill 4", href: "/coldStorage/Room/Chill4/Chill4Page" },
      { name: "Chill 5", href: "/coldStorage/Room/Chill5/Chill5Page" },
      { name: "Chill 6", href: "/coldStorage/Room/Chill6/Chill6Page" },
      { name: "4C", href: "/coldStorage/Room/4C/4CPage" },
      { name: "Ante", href: "/coldStorage/Room/AntePage/AntePage" },
      { name: "LargeRoom", href: "/coldStorage/Room/Large/LargePage" },
    ],
  },
  { name: "ตารางวัตถุดิบ", icon: IoMove, href: "/coldStorage/RoomTable/RoomTable" },
  { name: "ย้ายรถเข็น", icon: IoMove,
    href: "#",
    submenu: [
      { name: "CSR 3", href: "/coldStorage/Move/CSR3/CSR3Page" },
      { name: "Chill 2", href: "/coldStorage/Move/Chill2/Chill2Page" },
      { name: "Chill 4", href: "/coldStorage/Move/Chill4/Chill4Page" },
      { name: "Chill 5", href: "/coldStorage/Move/Chill5/Chill5Page" },
      { name: "Chill 6", href: "/coldStorage/Move/Chill6/Chill6Page" },
      { name: "4C", href: "/coldStorage/Move/4C/4CPage" },
      { name: "Ante", href: "/coldStorage/Move/AntePage/AntePage" },
      { name: "LargeRoom", href: "/coldStorage/Move/Large/LargePage" },
    ],
  },
  { name: "รถเข็นว่าง", icon: BsFillCartXFill, href: "/coldStorage/EmptyTrolley/DeleteTrolleyPage" },
  {
    name: "ประวัติ",
    icon: VscHistory,
    href: "/coldStorage/HisInput/HisInputPage",
    // submenu: [
    //   { name: "ประวัติรับเข้า", href: "/coldStorage/HisInput/HisInputPage" },
    //   // { name: "ประวัติส่งออก", href: "/coldStorage/HisOutput/HisOutputPage" },
    // ],
  },
  
   ...(showWorkplaceSelector
      ? [{ name: "เปลี่ยนที่ทำงาน", icon: FaPeopleCarry, href: "/coldStorage/WorkplaceSelector" }]
      : []),
  
  { name: "ออกจากระบบ", icon: TbLogout2, href: "/logout" },
  
];

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
          background: active || hovered
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
        className="flex items-center p-3 text-xs font-normal"
        style={{
          backgroundColor: active || hovered ? "#fff" : "transparent",
          color: active || hovered ? "#4aaaec" : "#fff",
          borderTopRightRadius: "0px",
          borderBottomRightRadius: "0px",
        }}
      >
        {item.icon && <item.icon size={18} style={{ width: "36px" }} />}
        {isSidebarOpen && <span className="ml-2 whitespace-nowrap">{item.name}</span>}
      </div>

      {/* Bottom Decoration */}
      <div
        style={{
          background: active || hovered
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

const Sidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const activeItem = location.pathname;
  const [hoveredItem, setHoveredItem] = useState(null);
  const [clickedItem, setClickedItem] = useState(localStorage.getItem("clickedItem") || null);
  const [expandedMenus, setExpandedMenus] = useState({});

  const handleClick = (href, itemName) => {
    setClickedItem(href);
    localStorage.setItem("clickedItem", href);

    // ปิด submenu ทั้งหมดเมื่อคลิกที่เมนูใหม่
    setExpandedMenus({});

    // ถ้าเมนูที่คลิกมี submenu ให้เปิด submenu นั้น
    const clickedMenuItem = SIDEBAR_ITEMS.find((item) => item.name === itemName);
    if (clickedMenuItem?.submenu) {
      setExpandedMenus((prev) => ({ ...prev, [itemName]: !prev[itemName] }));
    }
  };

  const toggleSubmenu = (name) => {
    // ปิด submenu ของเมนูที่คลิก
    setExpandedMenus((prev) => {
      const newExpandedMenus = { ...prev };
      // ปิด submenu ของเมนูอื่น ๆ
      Object.keys(newExpandedMenus).forEach((key) => {
        if (key !== name) {
          newExpandedMenus[key] = false;
        }
      });
      // เปลี่ยนสถานะ submenu ที่ถูกคลิก
      newExpandedMenus[name] = !newExpandedMenus[name];
      return newExpandedMenus;
    });
  };

  return (
    <div
      className={`relative z-10 flex-shrink-0 ${isSidebarOpen ? "w-35" : "w-16"}`}
      style={{
        transition: "width 0.2s ease-in-out",
        backgroundColor: "#fff",
        width: isSidebarOpen ? "159px" : "60px",
      }}
    >
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

        {/* Navigation Items with Scroll */}
        <nav className="mt-4 flex-grow overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => (
            <div key={item.name}>
              <Link to={item.href !== "#" ? item.href : "#"}>
                <MenuItem
                  item={item}
                  isSidebarOpen={isSidebarOpen}
                  active={activeItem === item.href || clickedItem === item.href}
                  hovered={hoveredItem === item.name}
                  onClick={(e) => {
                    if (item.submenu) {
                      e.preventDefault();
                      toggleSubmenu(item.name);
                    } else {
                      handleClick(item.href, item.name);
                    }
                  }}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                />
              </Link>

              {/* แสดงรายการ submenu หากมีและถูกเปิด */}
              {item.submenu && expandedMenus[item.name] && (
                <div className={`flex flex-col ${isSidebarOpen ? "ml-0" : "items-center"}`}>
                  {item.submenu.map((subitem) => (
                    <Link key={subitem.href} to={subitem.href}>
                      <MenuItem
                        item={{
                          ...subitem,
                          icon: isSidebarOpen ? subitem.icon : item.icon,
                        }}
                        isSidebarOpen={isSidebarOpen}
                        active={activeItem === subitem.href || clickedItem === subitem.href}
                        hovered={hoveredItem === subitem.name}
                        onClick={() => handleClick(subitem.href, item.name)}
                        onMouseEnter={() => setHoveredItem(subitem.name)}
                        onMouseLeave={() => setHoveredItem(null)}
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;