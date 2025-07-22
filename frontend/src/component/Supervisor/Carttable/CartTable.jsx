// LineTable.js - แก้ไข Layout ให้เต็มจอ
import React from "react";
import Header from "../../Layout/Header";
import Buttom from "../../Layout/Buttom";
import CartMain from "./Asset/CartMain"

const CartTable = () => {
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header - ความสูงคงที่ */}
      <header className="shrink-0">
        <Header title="Cart Management | ตารางจัดการรถเข็น" />
      </header>

      {/* Main Content - ใช้พื้นที่ที่เหลือทั้งหมด แก้ไขจาก max-w-8xl เป็น w-full */}
      <main className="flex-1 w-full overflow-hidden">
        <CartMain/>
      </main>

      {/* Footer - ความสูงคงที่ */}
      <footer className="shrink-0">
        <Buttom title="Copyright © 2025 i-Tail Corporation Public Company Limited. All right reserved" />
      </footer>
    </div>
  );
};

export default CartTable;