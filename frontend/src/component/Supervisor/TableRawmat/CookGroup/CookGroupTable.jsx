import React, { useState } from "react";
import Header from "../../../Layout/Header";
import Buttom from "../../../Layout/Buttom";
// import TableMainUser from "./Asset/TableMainUser";

const RawmatTypeTable = () => {
  return (
    <div
      style={{ backgroundColor: "#fff" }}
      className="flex-1 overflow-auto relative z-10"
    >
      <main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
        <Header title="Managemant Employees | ตารางจัดการพนักงาน" />
      </main>
      <main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
        {/* <TableMainUser /> */}
      </main>
      <main className="max-w-8xl mx-auto py-1 px-1 lg:px-8">
        <Buttom title="Copyright © 2025 i-Tail Corporation Public Company Limited. All right reserved" />
      </main>
    </div>
  );
};

export default RawmatTypeTable;
