import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import ParkingLayoutChill6 from "./RoomChill6";
import SlotModal from "../Asset/SlotModal";

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponentChill6 = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]); // สถานะช่องเก็บของ
  const [socket, setSocket] = useState(null);
  const [processingSlot, setProcessingSlot] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // สถานะการเปิด Modal

  // ฟังก์ชันในการดึงข้อมูลช่องเก็บของจากฐานข้อมูล
  const fetchSlots = async () => {
    try {
      const response = await fetch(`${API_URL}/api/coldstorage/room`, { credentials: "include" });
      const data = await response.json();
      if (data && data.slot) {
        setSlots(data.slot); // เซ็ตข้อมูลช่องเก็บของ
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };


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
  
      // ดึงข้อมูลช่องเก็บของเมื่อคอมโพเนนต์โหลด
      fetchSlots();
  
      // Cleanup function
      return () => {
        if (newSocket) newSocket.disconnect();
      };
    }, []);
  
    // ฟังก์ชันในการจัดการเมื่อคลิกที่ช่องเก็บของ
    const handleSlotClick = async (slotData) => {
      if (processingSlot === slotData.slot_id) return;
  
      setSelectedSlot(slotData);
      setProcessingSlot(slotData.slot_id);
      setIsModalOpen(true); // เปิด Modal เมื่อเลือกช่อง
  
      try {
        console.log("📡 Sending request to API:", {
          slot_id: slotData.slot_id,
          cs_id: slotData.cs_id,
        });
  
        const response = await fetch(`${API_URL}/api/coldstorage/update-rsrv-slot`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot_id: slotData.slot_id,
            cs_id: slotData.cs_id,
          }),
        });
  
        const data = await response.json();
        if (data.success) {
          console.log("✅ Slot reservation updated successfully");
          if (socket) {
            socket.emit("reserveSlot", {
              slot_id: slotData.slot_id,
              cs_id: slotData.cs_id,
            });
          }
        } else {
          throw new Error(data.message || "Failed to update slot reservation.");
        }
      } catch (error) {
        console.error("❌ Error updating slot reservation:", error);
      }
    };


  const closeSlotModal = async () => {
    setSelectedSlot(null);
    setProcessingSlot(null);
  };

  const handleOptionSelect = (option, slotData) => {
    setSelectedOption(option);
    setSelectedSlot(null);
    setTimeout(() => {
      setSelectedSlot(slotData);
    }, 100);
  };

    // ฟังก์ชันย้ายตำแหน่งรถเข็น
    const handleMoveTrolley = ({ newSlotId }) => {
      if (!newSlotId) {
        console.log("❌ กรุณากรอกช่องจอดใหม่");
        return;
      }
      console.log("ย้ายรถเข็นไปยังช่องจอดใหม่:", newSlotId);
      closeSlotModal(); // ปิด Modal หลังย้าย
    };

    return (
      <div className="p-0">
        <ParkingLayoutChill6
          slots={slots} // ส่งข้อมูลช่องเก็บของไปที่ Layout
          onSlotClick={handleSlotClick}
        />
  
        {/* เปิดใช้งาน SlotModal เมื่อมีการเลือกช่องเก็บของ */}
        {isModalOpen && selectedSlot && (
          <SlotModal
            slot={selectedSlot}
            onClose={closeSlotModal}
            onMoveTrolley={handleMoveTrolley}
          />
        )}
      </div>
    );
  };

export default ParentComponentChill6;
