import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import SlotModal from "../Asset/SlotModal";
import ParkingLayoutChill5 from "./RoomChill5";
const API_URL = import.meta.env.VITE_API_URL;

const ParentComponentChill5 = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [socket, setSocket] = useState(null);
  const [processingSlot, setProcessingSlot] = useState(null);

  useEffect(() => {
    if (!API_URL) {
      console.error("❌ API_URL is not defined.");
      return;
    }

    const newSocket = io(API_URL, { transports: ["websocket"] });
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

  const handleSlotClick = async (slotData) => {
    if (processingSlot === slotData.slot_id) return;

    setSelectedSlot(slotData);
    setProcessingSlot(slotData.slot_id);

    try {
      console.log("📡 Sending request to API:", { slot_id: slotData.slot_id, cs_id: slotData.cs_id });

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

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        const errorText = await response.text();
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
        socket.emit("reserveSlot", { slot_id: slotData.slot_id, cs_id: slotData.cs_id });
      }
    } catch (error) {
      console.error("❌ Error updating slot reservation:", error);
    }
  };

  const closeModal = async (modalType) => {
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

  return (
    <div className="p-0">
      <ParkingLayoutChill5 onSlotClick={handleSlotClick} />

      {selectedSlot && (
        <SlotModal
          slot={selectedSlot}
          onClose={() => closeModal("slot")}
          onSelectOption={handleOptionSelect}
        />
      )}
    </div>
  );
};

export default ParentComponentChill5;
