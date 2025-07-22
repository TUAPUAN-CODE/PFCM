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

const MatImportPage = () => {
	return (

		<div style={{ backgroundColor: "#fff" }} className="flex-1 overflow-auto relative z-10">
		  <main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
		  <Header title={"วัตถุดิบกลับมาเตรียมผลิต"} />
				</main>
		   <main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
		   <ParentComponent /> 
	
				</main>
				<main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
		  <Buttom title="Copyright © 2025 i-Tail Corporation Public Company Limited. All right reserved" />
	
				</main>
		</div>
	);
};
export default MatImportPage;