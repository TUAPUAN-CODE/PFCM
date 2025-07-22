  import React, { useState, useEffect } from 'react';
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

    // Initialize Socket.IO connection
    useEffect(() => {
      const newSocket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      }); // Connect to the backend using Socket.IO
      setSocket(newSocket);
      newSocket.emit('joinRoom', 'saveRMForProdRoom');
      // Listen for real-time updates
      newSocket.on('dataUpdated', fetchData);

      // Clean up socket connection when component unmounts
      return () => {
        newSocket.off('dataUpdated');
        newSocket.disconnect();
      };
    }, []);

    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/oven/toCold/fetchRMForProd`);
        console.log("Fetched data:", response.data); // ดูว่าข้อมูลใหม่มาไหม
        setTableData(response.data.success ? [...response.data.data] : []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    

    useEffect(() => {
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
      console.log("📥 Data received in handleOpenModal2:", data);
      setDataForModal2({
        ...data,
        rmfp_id: dataForModal1?.rmfp_id,
        CookedDateTime: dataForModal1?.CookedDateTime,
        rm_type_id: dataForModal1?.rm_type_id,
        level_eu : dataForModal1?.level_eu
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

    const handleopenModal1 = (data) => {
      console.log("📥 Data received in handleOpenModal1:", data);

      setDataForModal1({
        batch: data.batch,
        mat: data.mat,
        mat_name: data.mat_name,
        production: data.production,
        rmfp_id: data.rmfp_id,
        CookedDateTime: data.CookedDateTime,
        level_eu : data.level_eu,
        rm_type_id: data.rm_type_id, // ✅ ตรวจสอบค่า
      });
      setOpenModal1(true);
    };

    const handleRowClick = (rowData) => {
      console.log("Row clicked:", rowData);
    };

    // const handleEditSuccess = async (updatedData) => {
    //   console.log("🔍 Data before sending:", updatedData); // ดูว่าข้อมูลถูกต้องไหม
      
    //   try {
    //     const response = await axios.put(`${API_URL}/api/oven/toCold/updateProduction`, updatedData);
        
    //     if (socket) {
    //       socket.emit("dataUpdated", updatedData);
    //     }
    
    //     fetchData();
    //     setOpenEditModal(false);
    //   } catch (error) {
    //     console.error("🚨 Error updating data:", error);
    //   }
    // };
    

    return (
      <div>
        <TableMainPrep 
          handleOpenModal={handleOpenModal1} 
          handleOpenEditModal={handleOpenEditModal}
          handleOpenSuccess={handleOpenSuccess}
          handleopenModal1={handleopenModal1}
          data={tableData} 
        />
        <Modal1 
          open={openModal1} 
          onClose={() => setOpenModal1(false)} 
          onNext={handleOpenModal2} 
          data={dataForModal1}
          mat={dataForModal1?.mat}
          mat_name={dataForModal1?.mat_name}
          batch={dataForModal1?.batch}
          production={dataForModal1?.production}
          rmfp_id={dataForModal1?.rmfp_id}
          CookedDateTime={dataForModal1?.CookedDateTime}
          rm_type_id={dataForModal1?.rm_type_id} // ✅ เพิ่มให้แน่ใจว่ามีการส่งค่า
          level_eu = {dataForModal1?.level_eu}
        />
        <Modal2 
          open={openModal2} 
          rmfp_id={dataForModal2?.rmfp_id}
          CookedDateTime={dataForModal2?.CookedDateTime} 
          level_eu = {dataForModal2?.level_eu}
          rm_type_id={dataForModal2?.rm_type_id}  // ✅ ส่งค่าไปด้วย
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
          level_eu = {dataForModal3?.level_eu}
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
          level_eu = {dataForSuccessModal?.level_eu}
          onSuccess={fetchData} 
        />
      </div>
    );
  };

  export default ParentComponent;
