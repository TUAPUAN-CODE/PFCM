import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Users,
  Menu,
} from "lucide-react";
import { PiFishSimple } from "react-icons/pi";
import { MdConveyorBelt } from "react-icons/md";
import { TbLogout2 } from "react-icons/tb";
import { GoHomeFill } from "react-icons/go";
import { IoNewspaperOutline } from "react-icons/io5";
import { ShoppingCart } from 'lucide-react';
import { GiOpenedFoodCan } from "react-icons/gi";
import { FaPeopleCarry } from 'react-icons/fa';


const rawPosId = localStorage.getItem("pos_id");
const posId = parseInt(rawPosId, 10);



// แก้ไข SIDEBAR_ITEMS เพื่อเพิ่มรายการเมนู
const SIDEBAR_ITEMS = [
  { name: "หน้าหลัก", icon: GoHomeFill, href: "/sup" },
  {
    name: "จัดการวัตถุดิบ",
    icon: PiFishSimple,
    submenu: [
      { name: "ตารางวัตถุดิบ", href: "/sup/Rawmat" },
      { name: "ตารางประเภทวัตถุดิบ", href: "/sup/RawmatType" },
      { name: "ตารางกลุ่มเวลาวัตถุดิบ", href: "/sup/RawmatGroup" },
      { name: "ตารางการแปรรูป", href: "/sup/Processing" },
    ],
    href: "#",
  },
  {
    name: "จัดการการผลิต",
    icon: MdConveyorBelt,
    submenu: [
      { name: "ตารางการผลิตวัตถุดิบ", href: "/sup/ProdRawmat" },
      { name: "ตารางแผนการผลิต", href: "/sup/Production" },
    ],
    href: "##",
  },
  {
    name: "เพิ่ม Line Type/Line name",
    icon: GiOpenedFoodCan,
    submenu: [
      { name: "เพิ่ม Line Type", href: "/sup/AddLine" },
      { name: "เพิ่ม Line Name", href: "/sup/AddLineName" },
    ],
    href: "###",
  },
  {
    name: "จัดการรถเข็น",
    icon: ShoppingCart,
    submenu: [
      
      { name: "เคลียร์รถเข็น", href: "/sup/TableToCold" },
      { name: "จัดการรถเข็น", href: "/sup/CartMange" },
    ],
    href: "####",
  },
   
  { name: "การจัดการพนักงาน", icon: Users, href: "/sup/TableUserPage" },
  { name: "ประวัติเข้า/ออก ห้องเย็น", icon: IoNewspaperOutline, href: "/sup/HisInput" },
  { name: "จัดการ Metal Detector", icon: MdConveyorBelt, href: "/sup/MDmanage" },
  { name: "นำเข้าแผนการผลิต", icon: MdConveyorBelt, href: "/sup/ipscvF" },
  { name: "นำเข้าข้อมูลวัตถุดิบ", icon: MdConveyorBelt, href: "/sup/import/rm/csv" },
  { name: "Delay Time Traking", icon: MdConveyorBelt, href: "/sup/DelayTraking" },
  { name: "เปลี่ยนที่ทำงาน", icon: FaPeopleCarry, href: "/sup/WorkplaceSelector" },
  { name: "ออกจากระบบ", icon: TbLogout2, href: "/logout" },
];

const SidebarSup = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const activeItem = location.pathname;

  const [hoveredItem, setHoveredItem] = useState({
    main: null,
    submenu: null,
  });

  const [clickedItem, setClickedItem] = useState(
    localStorage.getItem("clickedItem") || null
  );
  const [expandedItem, setExpandedItem] = useState(null);

  const handleClick = (href) => {
    setClickedItem(href);
    localStorage.setItem("clickedItem", href);
  };

  const handleItemClick = (item) => {
    if (item.submenu) {
      setExpandedItem(expandedItem === item.name ? null : item.name);
    } else {
      handleClick(item.href);
    }
  };

const filteredSidebarItems = SIDEBAR_ITEMS.map(item => {
  if (item.name === "จัดการรถเข็น" && item.submenu) {
    const filteredSubmenu = item.submenu.filter(sub =>
      sub.name !== "เคลียร์รถเข็น" || [4, 6].includes(posId)
    );
    return { ...item, submenu: filteredSubmenu };
  }
  return item;
});


  return (
    <div
      className={`relative z-10 flex-shrink-0 ${isSidebarOpen ? "w-35" : "w-16"}`}
      style={{ transition: "width 0.2s ease-in-out", backgroundColor: "#fff" }}
    >
       <div
        className="flex flex-col"
        style={{
          background: "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
          color: "#fff",
          height: "100%", // ใช้ความสูงทั้งหมด
          overflowY: "auto", // อนุญาตให้เลื่อนได้
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.5) transparent",
        }}
      >
        {/* Fixed Toggle Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-full text-white transition-colors max-w-fit"
            style={{
              color: "#E0F2FE",
              borderRadius: "8px",
              marginLeft: "17px",
              marginTop: "20px",
              marginBottom: "20px"
            }}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <nav 
          className="flex-1 overflow-y-auto" 
          style={{
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          <style>
            {`
              nav::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>
          <div className="mt-4">
            {filteredSidebarItems.map((item) => (
              <div key={item.href} className="flex flex-col">
                <Link to={item.href}>
                  <div
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => handleItemClick(item)}
                    className="relative flex flex-col"
                  >
                    {/* Top Decoration */}
                    <div
                      style={{
                        background:
                          clickedItem === item.href || hoveredItem === item.href
                            ? "#f9f9f9"
                            : "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
                      }}
                    >
                      <div
                        style={{
                          height: "10px",
                          borderBottomRightRadius:
                            clickedItem === item.href || hoveredItem === item.href
                              ? "20px"
                              : "20px",
                          background:
                            clickedItem === item.href || hoveredItem === item.href
                              ? "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)"
                              : "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
                        }}
                      />
                    </div>

                    {/* Main Item */}
                    <div
                      className="flex items-center p-3 text-xs font-medium"
                      style={{
                        backgroundColor:
                          activeItem === item.href || hoveredItem === item.href
                            ? "#fff"
                            : "transparent",
                        color:
                          activeItem === item.href || hoveredItem === item.href
                            ? "#4aaaec"
                            : "#fff",
                        borderTopRightRadius: "0px",
                        borderBottomRightRadius: "0px",
                        borderTopLeftRadius: "50px",
                        borderBottomLeftRadius: "50px",
                        marginLeft: "10px",
                      }}
                    >
                      <item.icon size={16} />
                      {isSidebarOpen && (
                        <span className="ml-2 whitespace-nowrap">
                          {item.name}
                        </span>
                      )}
                    </div>

                    {/* Bottom Decoration */}
                    <div
                      style={{
                        background:
                          clickedItem === item.href || hoveredItem === item.href
                            ? "#f9f9f9"
                            : "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
                      }}
                    >
                      <div
                        style={{
                          height: "10px",
                          borderTopRightRadius:
                            clickedItem === item.href || hoveredItem === item.href
                              ? "20px"
                              : "20px",
                          background:
                            clickedItem === item.href || hoveredItem === item.href
                              ? "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)"
                              : "linear-gradient(to right, #4aaaec 0%, #2288d1 100%)",
                        }}
                      />
                    </div>
                  </div>
                </Link>

                {/* Submenu */}
                {item.submenu && expandedItem === item.name && (
                  <div className="ml-6">
                    {item.submenu.map((submenuItem) => (
                      <Link
                        key={submenuItem.href}
                        to={submenuItem.href}
                        className="flex items-center p-3 text-xs font-medium"
                        onClick={() => handleClick(submenuItem.href)}
                        onMouseEnter={() => setHoveredItem(submenuItem.href)}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                          backgroundColor:
                            clickedItem === submenuItem.href ||
                              hoveredItem === submenuItem.href
                              ? "#fff"
                              : "transparent",
                          color:
                            clickedItem === submenuItem.href ||
                              hoveredItem === submenuItem.href
                              ? "#4aaaec"
                              : "#fff",
                          borderTopRightRadius: "0px",
                          borderBottomRightRadius: "0px",
                          borderTopLeftRadius: "50px",
                          borderBottomLeftRadius: "50px",
                          marginLeft: "10px",
                          transition: "background-color 0.3s",
                        }}
                      >
                        <item.icon size={16} />
                        {isSidebarOpen && (
                          <span className="ml-2 whitespace-nowrap">
                            {submenuItem.name}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default SidebarSup;
