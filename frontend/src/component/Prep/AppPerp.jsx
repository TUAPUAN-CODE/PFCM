import { Route, Routes } from "react-router-dom";

import SidebarPrep from "./SidebarPrep";
import MainProduction from "./Main/MainPage";
import HistoryCookedPage from "./HistoryCooked/HistoryCookedPage";
import MatManagePage from "./MatManage/MatManagePage";
import MatReworkPage from "./MatRework/MatReworkPage";
import ScanSAPPage from "./ScanSAP/ScanSAPPage";
import HistoryTranform from "./HistoryTranform/HistoryTranformPage";
import MatImportPage from "./MatImport/MatImportPage";
import ManageSelect from "../User/ManageSelect";
import HistoryPage from "./History/HistoryPage";

function AppPrep() {
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* BG */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
        <div className="absolute inset-0 backdrop-blur-sm" />
      </div>

      <SidebarPrep />
      <Routes>
        <Route path="/" element={<MainProduction />} />
        <Route
          path="/HistoryCooked/HistoryCookedPage"
          element={<HistoryCookedPage />}
        />
        <Route path="/MatManage/MatManagePage" element={<MatManagePage />} />
        <Route path="/MatRework/MatReworkPage" element={<MatReworkPage />} />
        <Route path="/ScanSAP/ScanSAPPage" element={<ScanSAPPage />} />
        <Route path="/MatImport/MatImportPage" element={<MatImportPage />} />
        <Route
          path="/HistoryTranform/HistoryTranformPage"
          element={<HistoryTranform />}
        />
        <Route path="/User/SelectWP" element={<ManageSelect />} />
        
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </div>
  );
}

export default AppPrep;
