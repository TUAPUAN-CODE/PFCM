import { Route, Routes } from "react-router-dom";


import Login from "../User/Login";
import React from "react";
// import SelectWp from "./component/User/SelectWorkplace";

function AppLogin() {
	return (
		<div className='flex h-screen bg-gray-900 text-gray-100 overflow-hidden'>
			{/* BG */}
			<div className='fixed inset-0 z-0'>
				<div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80' />
				<div className='absolute inset-0 backdrop-blur-sm' />
			</div>

			<Sidebar />
			<Routes>
				<Route path='/' element={<Login />} />
				<Route path='/Login' element={<Login />} />
		
			</Routes>
		</div>
	);
}

export default AppLogin;
