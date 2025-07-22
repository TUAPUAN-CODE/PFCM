import React, { useState, useEffect, useRef,useCallback } from 'react';
import TableMainPrep from './TableOvenToCold';
import Modal1 from './Modal1';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import axios from "axios";
axios.defaults.withCredentials = true; 
import { io } from "socket.io-client";

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

  const rmTypeIds = JSON.parse(localStorage.getItem('rm_type_id')) || [];
  const socketRef = useRef(null); // 🔧 ใช้ ref สำหรับ socket

  // Debounced fetchData
    const fetchDataDebounced = useCallback(() => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchData();
      }, 300);
    }, []);



  const fetchData = async () => {
    try {
      const [response1, response2] = await Promise.all([
        axios.get(`${API_URL}/api/prep/mat/rework/fetchRMForProd`, {
          params: {
        rm_type_ids: rmTypeIds.join(',') // ส่งเป็น string คั่นด้วย comma
      }
        }),
        axios.get(`${API_URL}/api/prep/mat/rework/fetchRMForProdNoBatchAfter`, {
          params: {
        rm_type_ids: rmTypeIds.join(',') // ส่งเป็น string คั่นด้วย comma
      }
        })
      ]);

      const combinedData = [
        ...(response1.data.success ? response1.data.data : []), 
        ...(response2.data.success ? response2.data.data : [])
      ];

      setTableData(combinedData);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
    }
  };

  useEffect(() => {
    

    // 🔧 Setup Socket.io connection
    const socket = io(API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to socket:", socket.id);
    });

    socket.emit('joinRoom', 'QcCheckRoom');

    socket.on('dataUpdated', () => {
      console.log("📥 dataUpdated received");
      fetchDataDebounced();
    });

    socket.on('dataDelete', () => {
      console.log("📥 dataDelete received");
      fetchDataDebounced();
    });

    socket.on('qcUpdated', (broadcastData) => {
      console.log("📥 qcUpdated received:", broadcastData);
      fetchDataDebounced();
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
    }); 

fetchData();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('dataUpdated');
        socketRef.current.off('dataDelete');
        socketRef.current.off('qcUpdated');
        socketRef.current.disconnect();
        console.log("🔌 Socket cleaned up.");
      }
    };
  }, []);


  const clearData = () => {
    setDataForModal1(null);
    setDataForModal2(null);
    setDataForModal3(null);
  };

  const handleOpenModal1 = (data) => {
    setDataForModal1({
      mapping_id: data.mapping_id,
      tro_id: data.tro_id,
      rm_status: data.rm_status,
      qccheck_cold: data.qccheck_cold,
      remark_rework:data.remark_rework,
      remark_rework_cold:data.remark_rework_cold
    });
    setOpenModal1(true);
  };
  const handleOpenModal2 = (data) => {
    setDataForModal2({
      ...data,
      mapping_id: dataForModal1?.mapping_id,
      tro_id: dataForModal1?.tro_id,
      rm_status: dataForModal1?.rm_status,
      qccheck_cold: dataForModal1?.qccheck_cold,
      remark_rework_cold: dataForModal1?.remark_rework_cold,
      remark_rework: dataForModal1?.remark_rework
    });
    setOpenModal2(true);
    setOpenModal1(false);
  };

  const handleOpenModal3 = (data) => {
    setDataForModal3({
      ...data,
      mapping_id: dataForModal1?.mapping_id,
      tro_id: dataForModal1?.tro_id,
      rm_status: dataForModal1?.rm_status,
      qccheck_cold: dataForModal1?.qccheck_cold,
      remark_rework_cold: dataForModal1?.remark_rework_cold,
      remark_rework: dataForModal1?.remark_rework

    });
    setOpenModal3(true);
    setOpenModal2(false);
  };

  const handleOpenEditModal = (data) => {
    setDataForEditModal({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      mapping_id: data.mapping_id
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

  // useEffect(() => {
  //   const fetchData = async () => {
  //     const response = await axios.get(`${API_URL}/api/prep/mat/rework/fetchRMForProd`);
  //     const data = response.data;
  //     setTableData(data.success ? data.data : []);
  //   };
  //   fetchData();
  // }, []);

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
        mapping_id={dataForModal1?.mapping_id}
        tro_id={dataForModal1?.tro_id}
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
         {openModal3 && dataForModal3 && (
  <Modal3
    open={openModal3}
    CookedDateTime={dataForModal3?.CookedDateTime} 
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
)}
      <ModalEditPD
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        onNext={() => setOpenEditModal(false)}
        data={dataForEditModal}
        onSuccess={fetchData}
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
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ParentComponent;
