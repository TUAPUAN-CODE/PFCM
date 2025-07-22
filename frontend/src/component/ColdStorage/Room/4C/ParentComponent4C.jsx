import React, { useState, useEffect,useRef } from "react";
import { io } from "socket.io-client";
import SlotModal from "../Asset/SlotModal";
import ParkingLayou4C from "./Room4C";
import ScanTrolley from "../Asset/ScanTrolley";
import CheckTrolley from "../Asset/CheckTrolley";
const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent4C = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showSlotModal, setShowSlotModal] = useState(false); // เพิ่มตัวแปรนี้
  const [selectedOption, setSelectedOption] = useState(null);
  const [isScanTrolleyOpen, setIsScanTrolleyOpen] = useState(false);
  const [isCheckTrolleyOpen, setIsCheckTrolleyOpen] = useState(false);
  const [trolleyData, setTrolleyData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [processingSlot, setProcessingSlot] = useState(null);

  const socketRef = useRef(null);


  useEffect(() => {
    if (!API_URL) {
      console.error("❌ API_URL is not defined.");
      return;
    }
  
    // เชื่อมต่อ Socket.IO ไปที่ API_URL
     const newSocket = io(API_URL, {
            transports: ["websocket"],
            reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
            reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
            autoConnect: true
          });
      socketRef.current = newSocket;
          setSocket(newSocket);
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });
  
    newSocket.on("disconnect", () => {
      console.warn("⚠️ Socket disconnected.");
    });
  
    setSocket(newSocket);
  
    // Cleanup function
       if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
  }, []);
  const handleSlotClick = async (slotData) => {
    if (processingSlot === slotData.slot_id) {
      // กรณีคลิกช่องเดิมที่กำลังประมวลผลอยู่ ให้แสดงโมดัลเท่านั้น
      setShowSlotModal(true);
      return;
    }
  
    setSelectedSlot(slotData);
    setProcessingSlot(slotData.slot_id);
    setShowSlotModal(true); // เปิดโมดัลเมื่อคลิกที่ช่องจอด
  
    try {
      console.log("📡 Sending request to API:", {
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
  
      console.log("📩 API Response:", response);
  
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
      console.log("📩 API Response Data:", data);
  
      if (!data.success) {
        throw new Error(`Failed to update slot reservation: ${data.message || "Unknown error"}`);
      }
  
      console.log("✅ Slot reservation updated successfully");
  
      if (socket) {
        socket.emit("reserveSlot", {
          slot_id: slotData.slot_id,
          cs_id: slotData.cs_id,
        });
      }
    } catch (error) {
      console.error("❌ Error updating slot reservation:", error);
    }
  };
  
  // แก้ไขฟังก์ชัน closeSlotModal
  const closeSlotModal = async (action) => {
    console.log("📌 closeSlotModal called with action:", action);
    
    // ปิดโมดัลทุกกรณี
    setShowSlotModal(false);
    
    // รีเซ็ต processingSlot ทุกกรณี เพื่อให้สามารถเปิดช่องเดิมได้อีก
    setProcessingSlot(null);
    
    // ถ้าเป็นการกดปุ่มยกเลิก
    if (action === 'CANCEL_ONLY') {
      console.log("📌 CANCEL button was clicked, NOT clearing slot data");
      return; // ออกจากฟังก์ชัน ไม่ล้างข้อมูลช่องจอด
    }
    
    // กรณีอื่นๆ (ไม่ใช่การกดปุ่มยกเลิก) ให้ล้างข้อมูลและส่ง API
    console.log("📌 This is NOT from CANCEL button, clearing slot data");
    
    if (selectedSlot) {
      try {
        const response = await fetch(`${API_URL}/api/clodstorage/update-NULL-slot`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot_id: selectedSlot.slot_id,
            cs_id: selectedSlot.cs_id,
          }),
        });
  
        const data = await response.json();
  
        if (response.ok) {
          console.log("✅ Slot updated successfully via API:", data);
        } else {
          console.error("❌ Failed to update slot:", data);
        }
      } catch (error) {
        console.error("❌ Error updating slot via API:", error);
      }
      
      // ส่งข้อมูลผ่าน WebSocket
      if (socket) {
        socket.emit("updateSlotToNULL", {
          slot_id: selectedSlot.slot_id,
          cs_id: selectedSlot.cs_id,
        });
        console.log("Slot updated successfully via WebSocket");
      }
    }
  
    // ล้างค่า selectedSlot
    setSelectedSlot(null);
  };
  
  const handleOptionSelect = (option, slotData) => {
    setSelectedOption(option);
    setShowSlotModal(false); // ปิดโมดัลช่องจอด
    
    setTimeout(() => {
      setIsScanTrolleyOpen(true);
    }, 100);
  };

  const closeScanTrolley = async () => {
    setIsScanTrolleyOpen(false);
    setSelectedOption(null);
    
    // รีเซ็ต processingSlot เพื่อให้สามารถเปิดช่องเดิมได้อีก
    setProcessingSlot(null);
    
    // ส่ง API และ WebSocket เพื่ออัพเดต NULL
    if (selectedSlot) {
      try {
        // ส่งข้อมูลผ่าน WebSocket ก่อน
        if (socket) {
          socket.emit("updateSlotToNULL", {
            slot_id: selectedSlot.slot_id,
            cs_id: selectedSlot.cs_id,
          });
          console.log("Slot updated successfully via WebSocket");
        }
  
        // อัปเดตฐานข้อมูลด้วย API หากจำเป็น
        const response = await fetch(`${API_URL}/api/clodstorage/update-NULL-slot`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot_id: selectedSlot.slot_id,
            cs_id: selectedSlot.cs_id,
          }),
        });
  
        const data = await response.json();
  
        if (response.ok) {
          console.log("✅ Slot updated successfully via API:", data);
        } else {
          console.error("❌ Failed to update slot:", data);
        }
      } catch (error) {
        console.error("❌ Error updating slot via API:", error);
      }
    }
  
    // รีเซ็ตสถานะต่าง ๆ
    setSelectedSlot(null);
  };
  
  const handleScanConfirm = (data) => {
    setTrolleyData(data);
    setIsScanTrolleyOpen(false);
    setIsCheckTrolleyOpen(true);
  };

  const closeCheckTrolley = async () => {
    setIsCheckTrolleyOpen(false);
    setTrolleyData(null);
    setProcessingSlot(null);
    
    // ส่ง API และ WebSocket เพื่ออัพเดต NULL
    if (selectedSlot) {
      try {
        const response = await fetch(`${API_URL}/api/clodstorage/update-NULL-slot`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot_id: selectedSlot.slot_id,
            cs_id: selectedSlot.cs_id,
          }),
        });
  
        const data = await response.json();
  
        if (response.ok) {
          console.log("✅ Slot updated successfully via API:", data);
        } else {
          console.error("❌ Failed to update slot:", data);
        }
      } catch (error) {
        console.error("❌ Error updating slot via API:", error);
      }
      
      // ส่งข้อมูลผ่าน WebSocket
      if (selectedSlot && socket) {
        socket.emit("updateSlotToNULL", {
          slot_id: selectedSlot.slot_id,
          cs_id: selectedSlot.cs_id,
        });
        console.log("Slot updated successfully via WebSocket");
      }
    }
  
    // ล้างข้อมูล selectedSlot
    setSelectedSlot(null);
  };
  
  return (
    <div className="p-0">
      <ParkingLayou4C onSlotClick={handleSlotClick} />

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

export default ParentComponent4C;