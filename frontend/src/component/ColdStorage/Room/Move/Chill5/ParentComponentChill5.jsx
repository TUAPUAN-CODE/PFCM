import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import ParkingLayoutChill5 from "./RoomChill5";
import ScanTrolley from "../../Asset/ScanTrolley";
import CheckTrolley from "../../Asset/CheckTrolley";
const API_URL = import.meta.env.VITE_API_URL;

const ParentComponentChill5 = ({ onSelectOption }) => {
  console.log("ParentComponentChill5 - ถูกเรียกใช้ด้วย onSelectOption:", onSelectOption);
  
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isScanTrolleyOpen, setIsScanTrolleyOpen] = useState(false);
  const [isCheckTrolleyOpen, setIsCheckTrolleyOpen] = useState(false);
  const [trolleyData, setTrolleyData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [processingSlot, setProcessingSlot] = useState(null);

  useEffect(() => {
    if (!API_URL) {
      console.error("❌ API_URL is not defined.");
      return;
    }
  
    // เชื่อมต่อ Socket.IO ไปที่ API_URL
    const newSocket = io(API_URL, {
      transports: ["websocket"], // บังคับให้ใช้ WebSocket
    });
  
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });
  
    newSocket.on("disconnect", () => {
      console.warn("⚠️ Socket disconnected.");
    });
  
    setSocket(newSocket);
  
    // Cleanup function
    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  const handleSlotClick = async (slotData) => {
    console.log("ParentComponentChill5 - ช่องจอดถูกคลิก:", slotData);
    if (processingSlot === slotData.slot_id) return;
  
    setSelectedSlot(slotData);
    setProcessingSlot(slotData.slot_id);
  
    try {
      console.log("ParentComponentChill5 - กำลังอัปเดตสถานะช่องจอด:", {
        slot_id: slotData.slot_id,
        cs_id: slotData.cs_id,
      });
  
      const response = await fetch(`${API_URL}/api/coldstorage/update-rsrv-slot`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slotData.slot_id,
          cs_id: slotData.cs_id,
        }),
      });
  
      console.log("ParentComponentChill5 - ผลการตอบกลับจาก API:", response);
  
      // เช็คว่า response เป็น JSON หรือไม่
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        const errorText = await response.text(); // อ่าน response เป็น text
        throw new Error(`Failed to update slot reservation: ${errorText}`);
      }
  
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API did not return JSON. Check server response.");
      }
  
      const data = await response.json();
      console.log("ParentComponentChill5 - ข้อมูลจาก API:", data);
  
      if (!data.success) {
        throw new Error(`Failed to update slot reservation: ${data.message || "Unknown error"}`);
      }
  
      console.log("ParentComponentChill5 - อัปเดตสถานะช่องจอดสำเร็จ");
  
      if (socket) {
        socket.emit("reserveSlot", {
          slot_id: slotData.slot_id,
          cs_id: slotData.cs_id,
        });
      }

      // ส่งข้อมูลกลับไปยัง Modalchill5 โดยตรง
      if (onSelectOption && typeof onSelectOption === 'function') {
        console.log("ParentComponentChill5 - ส่งข้อมูลกลับไปยัง Modalchill5:", slotData);
        onSelectOption("SELECT_SLOT", slotData);
      } else {
        console.log("ParentComponentChill5 - ไม่สามารถส่งข้อมูลได้ - onSelectOption ไม่ใช่ฟังก์ชัน:", onSelectOption);
      }
    } catch (error) {
      console.error("❌ Error updating slot reservation:", error);
      setProcessingSlot(null);
    }
  };

  const closeMoveRawMatModal = async () => {
    if (selectedSlot) {
      try {
        // โค้ดสำหรับรีเซ็ต state
      } catch (error) {
        console.error("❌ Error updating slot via API:", error);
      }
    }

    setSelectedSlot(null);
    setProcessingSlot(null);
  };

  const handleOptionSelect = (option, slotData) => {
    // เรียกใช้ onSelectOption ที่ส่งมาจาก Modalchill5
    if (onSelectOption && typeof onSelectOption === 'function') {
      onSelectOption(option, slotData);
    }
    
    // ดำเนินการอื่นๆ ที่ต้องการ
    setSelectedOption(option);
    setSelectedSlot(null);
    setTimeout(() => {
      setSelectedSlot(slotData);
      setIsScanTrolleyOpen(true);
    }, 100);
  };

  const closeScanTrolley = async () => {
    setIsScanTrolleyOpen(false);
    // รีเซ็ตสถานะอื่นๆ ถ้าจำเป็น
  };

  const handleScanConfirm = (data) => {
    setTrolleyData(data);
    setIsScanTrolleyOpen(false);
    setIsCheckTrolleyOpen(true);
  };

  const closeCheckTrolley = async () => {
    setIsCheckTrolleyOpen(false);
    // รีเซ็ตสถานะอื่นๆ ถ้าจำเป็น
  };

  return (
    <div className="p-0">
      <ParkingLayoutChill5 onSlotClick={handleSlotClick} />

      <ScanTrolley
        open={isScanTrolleyOpen}
        onClose={closeScanTrolley}
        onNext={handleScanConfirm}
        selectedOption={selectedOption}
        selectedSlot={selectedSlot}
      />

      <CheckTrolley
        open={isCheckTrolleyOpen}
        onClose={closeCheckTrolley}
        trolleyData={trolleyData}
        selectedSlot={selectedSlot}
        selectedOption={selectedOption}
      />
    </div>
  );
};

export default ParentComponentChill5;