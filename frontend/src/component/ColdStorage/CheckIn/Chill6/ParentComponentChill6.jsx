import React, { useState, useEffect ,useRef} from "react";
import { io } from "socket.io-client";
import SlotModal from "../Asset/SlotModal";
import ParkingLayoutChill6 from "./RoomChill6";
import ScanTrolley from "../Asset/ScanTrolley";
import CheckTrolley from "../Asset/CheckTrolley";
const API_URL = import.meta.env.VITE_API_URL;

const ParentComponentChill6 = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
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

  let isTabActive = true;
  let reconnectTimer = null;
  let reconnectDelay = 2000; // เริ่มที่ 2 วินาที
  const MAX_DELAY = 60000; // สูงสุด 1 นาที

  const handleVisibilityChange = () => {
    isTabActive = !document.hidden;
    if (isTabActive && !newSocket?.connected) {
      console.log("🔄 Tab กลับมา active, พยายามเชื่อมต่อ...");
      manualReconnect();
    }
  };

  const newSocket = io(API_URL, {
    transports: ["websocket"],
    reconnection: false,
    autoConnect: false,
  });

  const manualReconnect = () => {
    if (!newSocket.connected && isTabActive) {
      console.log(`🔁 พยายาม reconnect... รอ ${reconnectDelay / 1000} วินาที`);
      newSocket.connect();
      reconnectTimer = setTimeout(manualReconnect, reconnectDelay);
      // เพิ่มเวลาแบบ exponential (double ทุกครั้ง แต่ไม่เกิน MAX_DELAY)
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  if (!document.hidden) {
    newSocket.connect();
  }

  newSocket.on("connect", () => {
    console.log("✅ Socket connected:", newSocket.id);
    reconnectDelay = 2000; // reset delay เมื่อเชื่อมต่อสำเร็จ
  });

  newSocket.on("disconnect", (reason) => {
    console.warn("⚠️ Socket disconnected:", reason);
    if (isTabActive) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(manualReconnect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    }
  });

  newSocket.on("connect_error", (error) => {
    console.error("❌ Connection error:", error);
    if (isTabActive) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(manualReconnect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    }
  });



  setSocket(newSocket);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    clearTimeout(reconnectTimer);
    if (newSocket) {
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("connect_error");
      newSocket.disconnect();
    }
  };
}, [API_URL]);

  //   const handleUpdateSlotToNull = (slotData) => {
  //   if (socket) {
  //     socket.emit('updateSlotToNULL', {
  //       slot_id: slotData.slot_id,
  //       cs_id: slotData.cs_id
  //     });
  //     console.log("Slot updated to NULL via WebSocket");
  //   }
  // };

  const handleSlotClick = async (slotData) => {
    if (processingSlot === slotData.slot_id) return;
  
    setSelectedSlot(slotData);
    setProcessingSlot(slotData.slot_id);
  
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
  
    
  
  

  const closeSlotModal = async () => {
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
    }
  
    setSelectedSlot(null);
    setProcessingSlot(null);
  
    // ส่งข้อมูลผ่าน WebSocket
    if (selectedSlot && socket) {
      socket.emit("updateSlotToNULL", {
        slot_id: selectedSlot.slot_id,
        cs_id: selectedSlot.cs_id,
      });
      console.log("Slot updated successfully via WebSocket");
    }
  };
  

  const handleOptionSelect = (option, slotData) => {
    setSelectedOption(option);
    setSelectedSlot(null);
    setTimeout(() => {
      setSelectedSlot(slotData);
      setIsScanTrolleyOpen(true);
    }, 100);
  };

  const closeScanTrolley = async () => {
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
    setIsScanTrolleyOpen(false);
    setSelectedOption(null);
    setSelectedSlot(null);
    setProcessingSlot(null);
  };
  
  

  const handleScanConfirm = (data) => {
    setTrolleyData(data);
    setIsScanTrolleyOpen(false);
    setIsCheckTrolleyOpen(true);
  };

  const closeCheckTrolley = async () => {
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
    }
  
    setIsCheckTrolleyOpen(false);
    setTrolleyData(null);
    setSelectedSlot(null);
    setProcessingSlot(null);
  
    // ส่งข้อมูลผ่าน WebSocket
    if (selectedSlot && socket) {
      socket.emit("updateSlotToNULL", {
        slot_id: selectedSlot.slot_id,
        cs_id: selectedSlot.cs_id,
      });
      console.log("Slot updated successfully via WebSocket");
    }
  };
  

  return (
    <div className="p-0">
      <ParkingLayoutChill6 onSlotClick={handleSlotClick} />

      {selectedSlot && !isScanTrolleyOpen && !isCheckTrolleyOpen && (
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

export default ParentComponentChill6;
