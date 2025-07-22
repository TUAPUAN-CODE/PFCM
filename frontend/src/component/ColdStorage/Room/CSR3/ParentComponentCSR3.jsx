import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import SlotModal from "../Asset/SlotModal";
import ParkingLayoutCSR3 from "./RoomCSR3";
import ScanTrolley from "../Asset/ScanTrolley";
import CheckTrolley from "../Asset/CheckTrolley";
const API_URL = import.meta.env.VITE_API_URL;

const ParentComponentCSR3 = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
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

  // ฟังก์ชัน handleSlotClick ที่ไม่มีการอัพเดตช่องจอด
  const handleSlotClick = async (slotData) => {
    if (processingSlot === slotData.slot_id) {
      // กรณีคลิกช่องเดิมที่กำลังประมวลผลอยู่ ให้แสดงโมดัลโดยไม่ต้องทำอะไรเพิ่มเติม
      setShowSlotModal(true);
      return;
    }
    
    // กรณีคลิกช่องใหม่
    setSelectedSlot(slotData);
    setShowSlotModal(true); // เปิดโมดัลเมื่อคลิกที่ช่องจอด
    setProcessingSlot(slotData.slot_id);
    
    // ตัดส่วนการอัพเดตช่องจอดผ่าน API และ WebSocket ออกทั้งหมด
    console.log("แสดงข้อมูลช่องจอด:", slotData);
  };

  // ฟังก์ชัน closeSlotModal ที่ไม่มีการอัพเดตช่องจอด
  const closeSlotModal = async (shouldClearSlot = true) => {
    // ปิดโมดัลเท่านั้น ไม่มีการอัพเดตช่องจอด
    setShowSlotModal(false);
    
    // รีเซ็ต processingSlot เพื่อให้สามารถเปิดช่องเดิมได้อีก แต่ไม่ล้าง selectedSlot
    setProcessingSlot(null);
    
    // ล้างข้อมูลเฉพาะเมื่อต้องการล้าง
    if (shouldClearSlot) {
      setSelectedSlot(null);
    }
  };

  // ฟังก์ชัน handleOptionSelect ที่ไม่มีการอัพเดตช่องจอด
  const handleOptionSelect = (option, slotData) => {
    setSelectedOption(option);
    setShowSlotModal(false); // ปิดโมดัลช่องจอด
    
    setTimeout(() => {
      setIsScanTrolleyOpen(true);
    }, 100);
  };

  // ฟังก์ชัน closeScanTrolley ที่ไม่มีการอัพเดตช่องจอด
  const closeScanTrolley = async () => {
    // เพียงแค่ปิดโมดัล ScanTrolley และรีเซ็ตสถานะที่เกี่ยวข้อง
    setIsScanTrolleyOpen(false);
    setSelectedOption(null);
    
    // ไม่ต้องล้าง selectedSlot เพื่อให้สามารถเปิดโมดัลอื่นๆ ได้
    setProcessingSlot(null);
  };

  // ฟังก์ชัน handleScanConfirm
  const handleScanConfirm = (data) => {
    setTrolleyData(data);
    setIsScanTrolleyOpen(false);
    setIsCheckTrolleyOpen(true);
  };

  // ฟังก์ชัน closeCheckTrolley ที่ไม่มีการอัพเดตช่องจอด
  const closeCheckTrolley = async () => {
    // เพียงแค่ปิดโมดัล CheckTrolley และรีเซ็ตสถานะที่เกี่ยวข้อง
    setIsCheckTrolleyOpen(false);
    setTrolleyData(null);
    
    // ไม่ต้องล้าง selectedSlot เพื่อให้สามารถเปิดโมดัลอื่นๆ ได้
    setProcessingSlot(null);
  };

  return (
    <div className="p-0">
      <ParkingLayoutCSR3 onSlotClick={handleSlotClick} />

      {selectedSlot && showSlotModal && !isScanTrolleyOpen && !isCheckTrolleyOpen && (
        <SlotModal
          slot={selectedSlot}
          onClose={closeSlotModal}
          onSelectOption={handleOptionSelect}
        />
      )}

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

export default ParentComponentCSR3;