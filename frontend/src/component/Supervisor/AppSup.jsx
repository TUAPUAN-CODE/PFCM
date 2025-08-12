import { Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";

import Sidebar from "./SidebarSup";

// ใช้ Lazy Loading เพื่อลดขนาดไฟล์ที่โหลดตอนแรก
const MainSup = lazy(() => import("./Main/MainPage"));
const TableMainSupv = lazy(() => import("./Main/Asset/TableOvenToCold"));
const TableUserPage = lazy(() => import("./TableUser/TableUserPage"));

// Rawmat
const RawmatTypeTable = lazy(() => import("./TableRawmat/RawmatType/RawmatTypeTable"));
const RawmatTable = lazy(() => import("./TableRawmat/Rawmat/RawmatTable"));
const ProcessingTable = lazy(() => import("./TableRawmat/Processing/ProcessingTable"));
const CookGroupTable = lazy(() => import("./TableRawmat/CookGroup/CookGroupTable"));
const RawmatGroupTable = lazy(() => import("./TableRawmat/RawmatGroup/RawmatGroupTable"));

// Production
const ProdRawmatTable = lazy(() => import("./TableProduction/ProdRawmat/ProdRawmatTable"));
const ProductionTable = lazy(() => import("./TableProduction/Production/ProductionTable"));

const ImportRMCSV = lazy(() => import("./ImPortcsvFileRM/mainPage.jsx"));

const HisInputPage = lazy(() => import("./HisInput/HisInputPage"));
const MDmanagepage = lazy(() => import("./MDmanage/MDmanagepage"));

const ImportscVF = lazy(() => import("./ImPortcsvFile/mainPage"));

const TableToCold = lazy(() => import("./MainCold/MainPage"));

const LineTable = lazy(() => import("./TableLine/AddLine/LineTable"));

const LineNameTable = lazy(() => import("./TableLine/AddLineName/LineNameTable"));

const CartTable = lazy(() => import("./Carttable/CartTable"));

const WorkplaceSelector = lazy(() => import("../User/WorkplaceSelector.jsx"));


const DelayTimeTrackingPage = lazy(() => import("./DelayTimeTracking/DelayTimeTrackingPage"));

const WorkplacePage = lazy(() => import("./Workplace/WorkplacePage"));

// เก็บเส้นทางทั้งหมดไว้ใน Array เพื่อลดโค้ดซ้ำซ้อน
const routes = [
  { path: "/", element: <MainSup /> },
  { path: "/TableMainSupv", element: <TableMainSupv /> },

  // จัดการวัตถุดิบ | Rawmat Management
  { path: "/RawmatType", element: <RawmatTypeTable /> },
  { path: "/Rawmat", element: <RawmatTable /> },
  { path: "/RawmatGroup", element: <RawmatGroupTable /> },
  { path: "/Processing", element: <ProcessingTable /> },
  // { path: "/CookGroup", element: <CookGroupTable /> },

  // จัดการการผลิต
  { path: "/ProdRawmat", element: <ProdRawmatTable /> },
  { path: "/Production", element: <ProductionTable /> },

  // จัดการพนักงาน
  { path: "/TableUserPage", element: <TableUserPage /> },

  // จัดการการรถเข็นรอเข้าห้องเย็น
  { path: "/TableToCold", element: <TableToCold /> },

  { path: "HisInput", element: <HisInputPage /> },

// จัดการ Metal Detector
{ path: "/MDmanage", element: <MDmanagepage /> },

{ path: "/ipscvF", element: <ImportscVF /> },

{ path: "/AddLine", element: <LineTable /> },
{ path: "/AddLineName", element: <LineNameTable /> },

{ path: "/CartMange", element: <CartTable /> },

{ path: "/DelayTraking", element: <DelayTimeTrackingPage /> },



{ path: "/WorkplaceSelector", element: <WorkplaceSelector /> },
{ path: "/WorkplacePage", element: <WorkplacePage /> },
{ path: "/import/rm/csv", element: <ImportRMCSV/> },
  // // จัดการการทำงาน
  // { path: "/Table/WorkPlace", element: <TableWorkPlaceSup /> },
  // { path: "/Table/Role", element: <TableRoleSup /> },
  // { path: "/Table/Activity", element: <TableActivitySup /> },
  // { path: "/Table/PD", element: <TablePDSup /> },
];

function AppSup() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* BG */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br opacity-80" />
        <div className="absolute inset-0 " />
      </div>

      <Sidebar />

      {/* ใช้ Suspense เพื่อรองรับ Lazy Loading */}
      <Suspense
        fallback={
          <div className="text-center mt-10 text-white">Loading...</div>
        }
      >
        <Routes>
          {routes.map((route, index) => (
            <Route key={index} path={route.path} element={route.element} />
          ))}
        </Routes>
      </Suspense>
    </div>
  );
}

export default AppSup;
