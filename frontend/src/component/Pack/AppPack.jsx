import { Route, Routes } from "react-router-dom";

import SidebarPack from "./SidebarPack";
// import MainPack from "./Main/MainPage";
import CheckStatusPage from "./CheckStatus/CheckStatusPage";
import HistoryPage from "./History/HistoryPage";
import WorkplacePage from "./Workplace/WorkplacePage";
import LineSelectWP from "../User/LineSelectWP";
import ManagePack from "./manage/ManagePage";
import PackTroPage from "./PackTro/PackTroPage";
import MixRMPage from "./MixRM/MixRMPage";
import RequestRawmat from "./requestrawmat/RequestrawmatPage";
import OrderRequestRawmat from "./OrderRequestrawmat/RequestrawmatPage";
import ManageRequestOrder from "./ManageRequestOrder/ManagePage";
import WorkplaceSelector from "../User/WorkplaceSelector.jsx";
import CSCheckOutPage from "./CheckOut/CheckOutPage.jsx"
import ScanBarcodePage from "./ScanSAP/ScanBatcodePage.jsx"
import ManageRawmatPack from "./manage copy/ManagePage.jsx"
import ReportRawmatPack from "./manage copy 2/ManagePage.jsx"
import TrackTrolley from "./TrackTrolley/TrackTrolley.jsx";
import ReportDelay from "./manage copy 3/ManagePage.jsx"
import Managedelaymaster from "./manage copy 4/ManagePage.jsx";
import CheckInPage from "./CheckIn/CheckInPage.jsx";
import IncludeRawmatPage from "./IncludeRawmatPack/IncludeRawmatPage.jsx";
import PDFArchivePage from "./PDFArchive/PDFArchivePage.jsx";

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
        

        <Route path="/TrackTrolley" element={<TrackTrolley />} />
        <Route path="/CheckStatus/CheckStatusPage" element={<CheckStatusPage />} />
        <Route path="/" element={<TrackTrolley />} />
        {/* <Route path="/manage/ManagePage" element={<ManagePack />} /> */}
        <Route path="/History/HistoryPage" element={<HistoryPage />} />
        <Route path="/Workplace/WorkplacePage" element={<WorkplacePage />} />
        <Route path="/Mixed/Trolley" element={<MixRMPage />} />
        <Route path="/Request/Rawmat" element={<RequestRawmat />} />
        <Route path="/Order/Request/Rawmat" element={<OrderRequestRawmat />} />
        <Route path="/manage/Order/Request/Rawmat" element={<ManageRequestOrder />} />
        <Route path="/WorkplaceSelector" element={<WorkplaceSelector />} />
        {/* <Route path="/" element={<MainPack />} /> */}
        {/* เลือกสถานที่ไลน์ผลิต */}
        <Route path="/User/LineSelectWP" element={<LineSelectWP />} />
        <Route path="/PackTro/PackTroPage" element={<PackTroPage />} />
        <Route path="/CheckOut" element={<CSCheckOutPage />} />
        <Route path="/ScanBarcodePage" element={<ScanBarcodePage />} />
        <Route path="/ManageRawmatPack" element={<ManageRawmatPack />} />
        <Route path="/ReportRawmatPack" element={<ReportRawmatPack />} />
        <Route path="/ReportDelay" element={<ReportDelay />} />
        <Route path="/Managedelaymaster" element={<Managedelaymaster />} />
        <Route path="/PDFArchive" element={<PDFArchivePage />} />
        <Route path="/CheckInPagePack" element={<CheckInPage />} />
        <Route path="/IncludeRawmatPagePack" element={<IncludeRawmatPage />} />

      </Routes>
    </div>
  );
}

export default AppPack;
