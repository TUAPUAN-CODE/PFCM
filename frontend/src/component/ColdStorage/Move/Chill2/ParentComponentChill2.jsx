import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import SlotModal from "../Asset/SlotModal";
import ParkingLayoutChill2 from "./RoomChill2";

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponentChill2 = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [socket, setSocket] = useState(null);
  const [processingSlot, setProcessingSlot] = useState(null);

  // การเชื่อมต่อกับ WebSocket
  useEffect(() => {
    if (!API_URL) {
      console.error("❌ API_URL is not defined.");
      return;
    }

    const newSocket = io(API_URL, {
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.warn("⚠️ Socket disconnected.");
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  // ฟังก์ชันจัดการเมื่อเลือกช่องเก็บของ
  const handleSlotClick = async (slotData) => {
    if (processingSlot === slotData.slot_id) return;

    setSelectedSlot(slotData);
    setProcessingSlot(slotData.slot_id);

    try {
      const response = await fetch(`${API_URL}/api/coldstorage/update-rsrv-slot`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slotData.slot_id,
          cs_id: slotData.cs_id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update slot reservation: ${errorText}`);
      }

      const data = await response.json();

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

  // ฟังก์ชันปิด Modal ช่องเก็บของ
  const closeSlotModal = async () => {
    setSelectedSlot(null);
    setProcessingSlot(null);
  };

  // ฟังก์ชันเลือกตัวเลือก
  const handleOptionSelect = (option, slotData) => {
    setSelectedOption(option);
    setSelectedSlot(null);
    setTimeout(() => {
      setSelectedSlot(slotData);
    }, 100);
  };

  return (
    <div className="p-0">
      <ParkingLayoutChill2 onSlotClick={handleSlotClick} />

      {selectedSlot && (
        <SlotModal
          slot={selectedSlot}
          onClose={closeSlotModal}
          onSelectOption={handleOptionSelect}
        />
      )}
    </div>
  );
};

export default ParentComponentChill2;
