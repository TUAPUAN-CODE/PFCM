import { Route, Routes } from "react-router-dom";

import Sidebar from "./SidebarCS";
import CSAntePageCI from "./CheckIn/AntePage/AntePage";
import CS4CPageCI from "./CheckIn/4C/4CPage";
import CSChill2PageCI from "./CheckIn/Chill2/Chill2Page";
import CSCSR3PageCI from "./CheckIn/CSR3/CSR3Page";
import CSChill4PageCI from "./CheckIn/Chill4/Chill4Page";
import CSChill5PageCI from "./CheckIn/Chill5/Chill5Page";
import CSChill6PageCI from "./CheckIn/Chill6/Chill6Page";
import CSLargePageCI from "./CheckIn/LargeColdRoom/LargePage";

import CSAntePageCO from "./Room/AntePage/AntePage";
import CS4CPageCO from "./Room/4C/4CPage";
import CSChill2PageCO from "./Room/Chill2/Chill2Page";
import CSCSR3PageCO from "./Room/CSR3/CSR3Page";
import CSChill4PageCO from "./Room/Chill4/Chill4Page";
import CSChill5PageCO from "./Room/Chill5/Chill5Page";
import CSChill6PageCO from "./Room/Chill6/Chill6Page";
import CSLargePageCO from "./Room/LargeColdRoom/LargePage"


import CSHisInputPage from "./HisInput/HisInputPage";
import MainCS from "./Main/MainPage";
import CSMovePage from "./Move/MovePage";
import CSCheckOutPage from "./CheckOut/CheckOutPage";
import ParentComponent from "./CheckIn/4C/ParentComponent4C";

import Modal4C from "./Room/Assety/Modal4C";
import ModalAnte from "./Room/Assety/ModalAnte";
import Modalchill6 from "./Room/Assety/Modalchill6";
import Modalchill2 from "./Room/Assety/Modalchill2";
import Modalchill4 from "./Room/Assety/Modalchill4";
import Modalchill5 from "./Room/Assety/Modalchill5";
import ModalCSR3 from "./Room/Assety/ModalCSR3";

import CS4CPageMove from "./Move/4C/4CPage";
import CSAntePageMove from "./Move/AntePage/AntePage";
import CSCSR3PageCOS from "./Move/CSR3/CSR3Page";
import CSChill2PageCOS from "./Move/Chill2/Chill2Page";
import CSChill4PageCOS from "./Move/Chill4/Chill4Page";
import CSChill5PageCOS from "./Move/Chill5/Chill5Page";
import CSChill6PageCOS from "./Move/Chill6/Chill6Page";
import CSLargePageCOS from "./Move/LargeColdRoom/LargePage";
import WorkplaceSelector from "../User/WorkplaceSelector.jsx";
import EmptyTrolley from "./EmptyTrolley/DeleteTrolleyPage"

import RoomTableCS from "./RoomTable/RoomTable";
const API_URL = import.meta.env.VITE_API_URL;


function AppColdStorage() {

	return (
		<div className='flex h-screen bg-gray-900 text-gray-100 overflow-hidden'>
			{/* BG */}
			<div className='fixed inset-0 z-0'>
				<div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80' />
				<div className='absolute inset-0 backdrop-blur-sm' />
			</div>

			<Sidebar />
			<Routes>
				<Route path='/' element={<MainCS />} />
				<Route path='/CheckIn/ParentComponent' element={<ParentComponent />} />
				<Route path='/CheckIn/4C/4CPage' element={<CS4CPageCI />} />
				<Route path='/CheckIn/AntePage/AntePage' element={<CSAntePageCI />} />
				<Route path='/CheckIn/Chill2/Chill2Page' element={<CSChill2PageCI />} />
				<Route path='/CheckIn/CSR3/CSR3Page' element={<CSCSR3PageCI />} />
				<Route path='/CheckIn/Chill4/Chill4Page' element={<CSChill4PageCI />} />
				<Route path='/CheckIn/Chill5/Chill5Page' element={<CSChill5PageCI />} />
				<Route path='/CheckIn/Chill6/Chill6Page' element={<CSChill6PageCI />} />
				<Route path='/CheckIn/Large/LargePage' element={<CSLargePageCI />} />

				<Route path='/Room/4C/4CPage' element={<CS4CPageCO />} />
				<Route path='/Room/AntePage/AntePage' element={<CSAntePageCO />} />
				<Route path='/Room/Chill2/Chill2Page' element={<CSChill2PageCO />} />
				<Route path='/Room/CSR3/CSR3Page' element={<CSCSR3PageCO />} />
				<Route path='/Room/Chill4/Chill4Page' element={<CSChill4PageCO />} />
				<Route path='/Room/Chill5/Chill5Page' element={<CSChill5PageCO />} />
				<Route path='/Room/Chill6/Chill6Page' element={<CSChill6PageCO />} />
				<Route path='/Room/Large/LargePage' element={<CSLargePageCO />} />
				<Route path='/HisInput/HisInputPage' element={<CSHisInputPage />} />
				<Route path='/Move/MovePage' element={<CSMovePage />} />
				<Route path='/CheckOut/CheckOutPage' element={<CSCheckOutPage />} />
				<Route path='/RoomTable/RoomTable' element={<RoomTableCS />} />

				<Route path='/Room/Assety/Modal4C' element={<Modal4C />} />
				<Route path='/Room/Assety/ModalAnte' element={<ModalAnte />} />
				<Route path='/Room/Assety/Modalchill6' element={<Modalchill6 />} />
				<Route path='/Room/Assety/Modalchill2' element={<Modalchill2 />} />
				<Route path='/Room/Assety/Modalchill4' element={<Modalchill4 />} />
				<Route path='/Room/Assety/Modalchill5' element={<Modalchill5 />} />
				<Route path='/Room/Assety/ModalCSR3' element={<ModalCSR3 />} />

				<Route path='/Move/4C/4CPage' element={<CS4CPageMove />} />
				<Route path='/Move/AntePage/AntePage' element={<CSAntePageMove />} />
				<Route path='/Move/CSR3/CSR3Page' element={<CSCSR3PageCOS />} />
				<Route path='/Move/Chill2/Chill2Page' element={<CSChill2PageCOS />} />
				<Route path='/Move/Chill4/Chill4Page' element={<CSChill4PageCOS />} />
				<Route path='/Move/Chill5/Chill5Page' element={<CSChill5PageCOS />} />
				<Route path='/Move/Chill6/Chill6Page' element={<CSChill6PageCOS />} />
				<Route path='/Move/Large/LargePage' element={<CSLargePageCOS />} />
				
				<Route path='/WorkplaceSelector' element={<WorkplaceSelector />} />

				<Route path='/EmptyTrolley/DeleteTrolleyPage' element={<EmptyTrolley />} />
			</Routes>
		</div>
	);
}

export default AppColdStorage;
