import React from "react";
import Header from "../../Layout/Header";
import Buttom from "../../Layout/Buttom";
import ParentComponent from "./Asset/ParentComponent";

const MainPage = () => {
  return (
    <div
      style={{ backgroundColor: "#f5f7fa" }}
      className="flex-1 overflow-auto relative z-10"
    >
      <main className="max-w-8xl mx-auto py-3 px-4 lg:px-8">
        <Header title="ระบบนำเข้าข้อมูล CSV" />
      </main>
      
      <main className="max-w-8xl mx-auto py-2 px-4 lg:px-8">
        {/* Display the ParentComponent with the CSV importer */}
        <ParentComponent />
      </main>
      
      <main className="max-w-8xl mx-auto py-4 px-4 lg:px-8">
        <Buttom title="Copyright © 2025 i-Tail Corporation Public Company Limited. All right reserved" />
      </main>
    </div>
  );
};

export default MainPage;