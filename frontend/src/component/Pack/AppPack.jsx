import { Route, Routes } from "react-router-dom";

import SidebarPack from "./SidebarPack";
import MainPack from "./Main/MainPage";
import CheckStatusPage from "./CheckStatus/CheckStatusPage";
import HistoryPage from "./History/HistoryPage";
import WorkplacePage from "./Workplace/WorkplacePage";
import LineSelectWP from "../User/LineSelectWP";
import ManagePack from "./manage/ManagePage";
import PackTroPage from "./PackTro/PackTroPage";
import MixRMPage from "./MixRM/MixRMPage";

function AppPack() {
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* BG */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
        <div className="absolute inset-0 backdrop-blur-sm" />
      </div>

      <SidebarPack />
      <Routes>
        <Route path="/" element={<MainPack />} />
        <Route path="/CheckStatus/CheckStatusPage" element={<CheckStatusPage />} />
        <Route path="/manage/ManagePage" element={<ManagePack />} />
        <Route path="/History/HistoryPage" element={<HistoryPage />} />
        <Route path="/Workplace/WorkplacePage" element={<WorkplacePage />} />
        <Route path="/Mixed/Trolley" element={<MixRMPage />} />

        {/* เลือกสถานที่ไลน์ผลิต */}
        <Route path="/User/LineSelectWP" element={<LineSelectWP />} />
        <Route path="/PackTro/PackTroPage" element={<PackTroPage />} />

      </Routes>
    </div>
  );
}

export default AppPack;
