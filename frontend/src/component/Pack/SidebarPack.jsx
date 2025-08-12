import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart2, Menu } from "lucide-react";
import { FaPeopleCarry } from 'react-icons/fa';

const pos_id = localStorage.getItem("pos_id");
const allowedPositions = ["3", "4", "5", "6"];
const showWorkplaceSelector = allowedPositions.includes(pos_id);

const SIDEBAR_ITEMS = [
	{ name: "หน้าหลัก", icon: BarChart2, href: "/packaging" },
	{ name: "จัดการ (วัตถุดิบไม่ผสม)", icon: BarChart2, href: "/packaging/manage/ManagePage" },
	{ name: "จัดการ (วัตถุดิบผสม)", icon: BarChart2, href: "/packaging/Mixed/Trolley" },
	{ name: "จัดการรถเข็น", icon: BarChart2, href: "/packaging/PackTro/PackTroPage" },
	{ name: "ขอวัตถุดิบ", icon: BarChart2, href: "/packaging/Request/Rawmat" },
	{ name: "รายการส่งคำขอ", icon: BarChart2, href: "/packaging/Order/Request/Rawmat" },
	{ name: "รายการคำขอ", icon: BarChart2, href: "/packaging/manage/Order/Request/Rawmat" },
	{ name: "เปลี่ยนสถานที่ทำงาน", icon: BarChart2, href: "/packaging/User/LineSelectWP" },
	{ name: "ประวัติ", icon: BarChart2, href: "/packaging/History/HistoryPage" },
	 ...(showWorkplaceSelector
		? [{ name: "เปลี่ยนที่ทำงาน", icon: FaPeopleCarry, href: "/packaging/WorkplaceSelector" }]
		: []),
	
	{ name: "ออกจากระบบ", icon: BarChart2, href: "/logout" },
];

const SidebarPack = () => {
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
	const [expandedItem, setExpandedItem] = useState(null); // Track expanded item for submenu

	const handleClick = (href) => {
		setClickedItem(href);
		localStorage.setItem("clickedItem", href);
	};

	const handleItemClick = (item) => {
		if (item.submenu) {
			setExpandedItem(expandedItem === item.name ? null : item.name); // Toggle submenu visibility
		} else {
			handleClick(item.href);
		}
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
			{/* เพิ่ม CSS สำหรับซ่อน scrollbar */}
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

				{/* Navigation with Scroll */}
				<nav className="mt-4 flex-grow overflow-y-auto">
					{SIDEBAR_ITEMS.map((item) => (
						<div key={item.href} className="flex flex-col">
							<Link to={item.href}>
								<div
									onMouseEnter={() => setHoveredItem(item.href)}
									onMouseLeave={() => setHoveredItem(null)}
									onClick={() => handleItemClick(item)}
									className="relative flex flex-col cursor-pointer"
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
				</nav>
			</div>
		</div>
	);
};

export default SidebarPack;