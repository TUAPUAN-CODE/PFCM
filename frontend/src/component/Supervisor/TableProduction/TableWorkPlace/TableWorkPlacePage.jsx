import { UserCheck, UserPlus, UsersIcon, UserX } from "lucide-react";
import { motion } from "framer-motion";

import Header from "../../../Layout/Header";


const userStats = {
	totalUsers: 152845,
	newUsersToday: 243,
	activeUsers: 98520,
	churnRate: "2.4%",
};

const TableWorkPlaceSup = () => {
	return (
			<div style={{ backgroundColor: "#f9f9f9" }} className="flex-1 overflow-auto relative z-10">
			<Header title='ตารางจัดการสถานที่ทำงาน' />

			<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8  mt-[4rem]'>
				
			</main>
		</div>
	);
};
export default TableWorkPlaceSup;
