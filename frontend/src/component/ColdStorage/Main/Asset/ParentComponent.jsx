import React, { useState, useEffect, useRef } from 'react';
import TableMainPrep from './TableOvenToCold';
import Modal1 from './Modal1';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import axios from "axios";
axios.defaults.withCredentials = true; 
import io from 'socket.io-client';
const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {
  const [openModal1, setOpenModal1] = useState(false);
  const [openModal2, setOpenModal2] = useState(false);
  const [openModal3, setOpenModal3] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [dataForModal1, setDataForModal1] = useState(null);
  const [dataForModal2, setDataForModal2] = useState(null);
  const [dataForModal3, setDataForModal3] = useState(null);
  const [dataForEditModal, setDataForEditModal] = useState(null);
  const [dataForSuccessModal, setDataForSuccessModal] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [socket, setSocket] = useState(null);
  const fetchTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  // Debounced fetchData
  const fetchDataDebounced = () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchData();
    }, 300); // หน่วง 300ms
  };

  // Initialize Socket.IO connection
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
    socketRef.current = newSocket;
    setSocket(newSocket);
    
    // Set up event listeners
    const handleDataUpdate = () => {
      console.log("Data updated event received");
      fetchDataDebounced();
    };

   

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
      fetchDataDebounced();
    });
  newSocket.emit('joinRoom', 'saveRMForProdRoom');
      newSocket.emit('joinRoom', 'trolleyUpdatesRoom');
      newSocket.emit('joinRoom', 'QcCheckRoom');


       newSocket.on('dataUpdated', handleDataUpdate);
    newSocket.on('dataDelete', handleDataUpdate);
    newSocket.on('rawMaterialSaved', handleDataUpdate);
    newSocket.on('trolleyUpdated', handleDataUpdate);
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

    newSocket.on("slotUpdated", async (updatedSlot) => {
      console.log("🔄 Slot update received:", updatedSlot);
      await fetchDataDebounced();
    });

    newSocket.on("reservationError", (error) => {
      console.error("❌ Reservation error:", error.message);
    });

    setSocket(newSocket);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(reconnectTimer);
      if (newSocket) {
        newSocket.off("connect");
        newSocket.off("disconnect");
        newSocket.off("connect_error");
        newSocket.off("slotUpdated");
        newSocket.off("reservationError");
        newSocket.off('dataUpdated', handleDataUpdate);
        newSocket.off('dataDelete', handleDataUpdate);
        newSocket.off('rawMaterialSaved', handleDataUpdate);
        newSocket.off('trolleyUpdated', handleDataUpdate);
        newSocket.disconnect();
      }
    };
  }, [API_URL]);



  const fetchData = async () => {
    try {
      const [response1, response2, response3] = await Promise.all([
        fetch(`${API_URL}/api/coldstorage/main/fetchSlotRawMat`, { credentials: "include" }),
        fetch(`${API_URL}/api/coldstorage/main/md/fetchSlotRawMat`, { credentials: "include" }),
        fetch(`${API_URL}/api/coldstorage/main/mix/fetchSlotRawMat`, { credentials: "include" }),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();
      const data3 = await response3.json();

      const combinedData = [...(data1.success ? data1.data : []), ...(data2.success ? data2.data : []), ...(data3.success ? data3.data : [])];

      setTableData(combinedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [response1, response2, response3] = await Promise.all([
          fetch(`${API_URL}/api/coldstorage/main/fetchSlotRawMat`, { credentials: "include" }),
          fetch(`${API_URL}/api/coldstorage/main/md/fetchSlotRawMat`, { credentials: "include" }),
          fetch(`${API_URL}/api/coldstorage/main/mix/fetchSlotRawMat`, { credentials: "include" }),
        ]);

        const data1 = await response1.json();
        const data2 = await response2.json();
        const data3 = await response3.json();

        const combinedData = [...(data1.success ? data1.data : []), ...(data2.success ? data2.data : []), ...(data3.success ? data3.data : [])];

        setTableData(combinedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);




  const clearData = () => {
    setDataForModal1(null);
    setDataForModal2(null);
    setDataForModal3(null);
  };

  const handleOpenModal1 = (data) => {
    setDataForModal1(data);
    setOpenModal1(true);
  };

  const handleOpenModal2 = (data) => {
    setDataForModal2({
      ...data,
      rmfp_id: dataForModal1?.rmfp_id
    });
    setOpenModal2(true);
    setOpenModal1(false);
  };

  const handleOpenModal3 = (data) => {
    setDataForModal3(data);
    setOpenModal3(true);
    setOpenModal2(false);
  };

  const handleOpenEditModal = (data) => {
    setDataForEditModal({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id
    });
    setOpenEditModal(true);
  };

  const handleOpenSuccess = (data) => {
    setDataForSuccessModal({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id,
    });
    setOpenSuccessModal(true);
  };


  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
    // Add any logic to handle the row click event
  };



  return (
    <div>
      <TableMainPrep
        handleOpenModal={handleOpenModal1}
        handleOpenEditModal={handleOpenEditModal}
        handleOpenSuccess={handleOpenSuccess}
        data={tableData}
      />
      <Modal1
        open={openModal1}
        onClose={() => setOpenModal1(false)}
        onNext={handleOpenModal2}
        data={dataForModal1}
      />
      <Modal2
        open={openModal2}
        onClose={() => {
          setOpenModal2(false);
          clearData();
        }}
        onNext={handleOpenModal3}
        data={dataForModal2}
        clearData={clearData}
      />
      <Modal3
        open={openModal3}
        onClose={() => {
          setOpenModal3(false);
          clearData();
        }}
        data={dataForModal3}
        onEdit={() => {
          setOpenModal2(true);
          setOpenModal3(false);
        }}
        clearData={clearData}
      />
      <ModalEditPD
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        onNext={() => setOpenEditModal(false)}
        data={dataForEditModal}
      />
      <ModalSuccess
        open={openSuccessModal}
        onClose={() => setOpenSuccessModal(false)}
        mat={dataForSuccessModal?.mat}
        mat_name={dataForSuccessModal?.mat_name}
        batch={dataForSuccessModal?.batch}
        production={dataForSuccessModal?.production}
        rmfp_id={dataForSuccessModal?.rmfp_id}
        selectedPlans={dataForSuccessModal?.selectedPlans}
      />
    </div>
  );
};

export default ParentComponent;