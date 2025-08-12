import { Route, Routes } from "react-router-dom";

import HisCheck from "./HisCheck/HisCheckPage";
import QCCheckPage from "./QCCheck/QCCheckPage";
import SidebarQC from "./SidebarQC";
import QCMain from "./MainQC/MainPage";
import WorkplaceSelector from "../User/WorkplaceSelector.jsx";
import QCSelectWP from "../User/QCSelectWP"

function AppQualityControl() {
	return (
		<div className='flex h-screen text-gray-100 overflow-hidden'>
			{/* BG */}
			<div className='fixed inset-0 z-0'>
				<div className='absolute inset-0 bg-gradient-to-br ' />
				<div className='absolute inset-0 backdrop-blur-sm' />
			</div>

			<SidebarQC />
			<Routes>
				<Route path='/' element={<QCMain />} />
				<Route path='/HisCheck/HisCheckPage' element={<HisCheck />} />
				<Route path='/QCCheck/QCCheckPage' element={<QCCheckPage />} />
				<Route path="/User/SelectWP" element={<QCSelectWP />} />
				<Route path="/WorkplaceSelector" element={<WorkplaceSelector />} />
			</Routes>
		</div>
	);
}

export default AppQualityControl;
