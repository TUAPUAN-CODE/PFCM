import { motion } from "framer-motion";
import Header from "../../Layout/Header";
import Buttom from "../../Layout/Buttom";
import ParentComponent from "./Asset/ParentComponent";


const orderStats = {
	totalOrders: "1,234",
	pendingOrders: "56",
	completedOrders: "1,178",
	totalRevenue: "$98,765",
};

const HisCheck = () => {
	return (
		<div style={{ backgroundColor: "#f9f9f9" }} className="flex-1 overflow-auto relative z-10">
			<main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">

			
			<Header title={"ตารางประวัติเช็คคุณภาพ"}   />
			<ParentComponent /> 
			</main>

			<main className='max-w-7xl py-6 px-4 lg:px-8 mx-auto mt-[4rem] '>
			<Buttom title="Copyright © 2025 i-Tail Corporation Public Company Limited. All right reserved" />

			</main>
		</div>
	);
};
export default HisCheck;
