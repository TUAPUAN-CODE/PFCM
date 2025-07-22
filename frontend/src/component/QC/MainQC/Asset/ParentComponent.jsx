import React, { useState, useEffect } from 'react';
import TableMainPrep from './Table';
import Modal1 from './Modal1';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import ModalDelete from './ModalDelete';
import axios from "axios";
axios.defaults.withCredentials = true; 
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {
  const [openModal1, setOpenModal1] = useState(false);
  const [openModal2, setOpenModal2] = useState(false);
  const [openModal3, setOpenModal3] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [dataForModal1, setDataForModal1] = useState(null);
  const [dataForModal2, setDataForModal2] = useState(null);
  const [dataForModal3, setDataForModal3] = useState(null);
  const [dataForEditModal, setDataForEditModal] = useState(null);
  const [dataForSuccessModal, setDataForSuccessModal] = useState(null);
  const [dataForDeleteModal, setDataForDeleteModal] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [socket, setSocket] = useState(null);
    const rmTypeIds = JSON.parse(localStorage.getItem('rm_type_id')) || [];


    // Initialize Socket.IO connection
    useEffect(() => {
      const newSocket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      }); // Connect to the backend using Socket.IO
      setSocket(newSocket);
      newSocket.emit('joinRoom', 'toColdOvenRoom');
      newSocket.emit('joinRoom', 'QcCheckRoom');
      // Listen for real-time updates
      newSocket.on('dataUpdated', () => {
        fetchData(); // Update table data when the backend sends an update
      });
      newSocket.on('dataDelete', () => {
        fetchData(); // Update table data when the backend sends an update
      });
      newSocket.on('trolleyUpdated', (broadcastData) => {
        console.log("Trolley data updated:", broadcastData);
    
   
        // ตัวอย่างเช่นถ้า broadcastData มีข้อมูลใหม่ที่ต้องอัปเดตตาราง
        fetchData(); // หรือ setTableData(broadcastData); ถ้า broadcastData มีข้อมูลทั้งหมด
      });
      newSocket.on('trolleyUpdatesRoom', (broadcastData) => {
        console.log("Trolley data updated:", broadcastData);
    
        // Update table data when the backend sends an update
        // คุณสามารถเลือกที่จะทำการอัปเดตข้อมูลที่เกี่ยวข้องกับ table ที่ต้องการ
        // ตัวอย่างเช่นถ้า broadcastData มีข้อมูลใหม่ที่ต้องอัปเดตตาราง
        fetchData(); // หรือ setTableData(broadcastData); ถ้า broadcastData มีข้อมูลทั้งหมด
      });
      // Clean up socket connection when component unmounts
      return () => {
        newSocket.off('dataUpdated');
        newSocket.off('dataDelete');
        newSocket.off('trolleyUpdated');
        newSocket.off('trolleyUpdatesRoom');
        newSocket.disconnect();
      };
    }, []);


  const fetchData = async () => {
    try {

      const response = await axios.get(`${API_URL}/api/qc/main/fetchRMForProd`, {
        params: {
        rm_type_ids: rmTypeIds.join(',') // ส่งเป็น string คั่นด้วย comma
      }
      });
        
      setTableData(response.data.success ? response.data.data : []);
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
    setDataForModal2({
      ...data,
      rmfp_id: dataForModal1?.rmfp_id,
      CookedDateTime: dataForModal1?.CookedDateTime,
      dest: dataForModal1?.dest,
    });
    setOpenModal2(true);
    setOpenModal1(false);
  };

  const handleOpenModal3 = (data) => {
    setDataForModal3({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id
    });
    setOpenModal3(true);
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
  const handleOpenDeleteModal = (data) => {
    setDataForDeleteModal({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id
    });
    setOpenDeleteModal(true);
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
    setDataForModal1({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id,
      CookedDateTime: data.CookedDateTime,
      dest: data.dest,
    });
    setOpenModal1(true);
  };

  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
  };

  const handleEditSuccess = async (updatedData) => {
    // Send the updated data to the backend
    try {
      await axios.put(`${API_URL}/api/oven/toCold/updateProduction`, updatedData);
      
      // Emit the update to all connected clients via Socket.IO
      if (socket) {
        socket.emit('dataUpdated', updatedData); // Emit the data update event
      }

      // Refetch the table data to ensure it is up-to-date
      fetchData();

      // Close the edit modal
      setOpenEditModal(false);
    } catch (error) {
      console.error("Error updating data:", error);
    }
  };
  const handleDeleteModal = async (DeleteData) => {
   
    try {
      await axios.delete(`${API_URL}/api/oven/toCold/updateProduction`, DeleteData);
      
    
      if (socket) {
        socket.emit('dataDelete', DeleteData); 
      }

   
      fetchData();

      // Close the edit modal
      setOpenDeleteModal(false);
    } catch (error) {
      console.error("Error Delete data:", error);
    }
  };

  return (
    <div>
      <TableMainPrep 
        handleOpenModal={handleOpenModal1} 
        handleOpenEditModal={handleOpenEditModal}
        handleOpenDeleteModal={handleOpenDeleteModal}
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
        dest={dataForModal1?.dest}
      />
      <Modal2 
        open={openModal2} 
        rmfp_id={dataForModal2?.rmfp_id}
        CookedDateTime={dataForModal2?.CookedDateTime} 
        dest={dataForModal2?.dest} 
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
        CookedDateTime={dataForModal3?.CookedDateTime}
        mat={dataForModal1?.mat}
        mat_name={dataForModal1?.mat_name}
        batch={dataForModal1?.batch}
        production={dataForModal1?.production}
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
        onSuccess={handleEditSuccess} 
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
      <ModalDelete
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        mat={dataForDeleteModal?.mat}
        mat_name={dataForDeleteModal?.mat_name}
        batch={dataForDeleteModal?.batch}
        production={dataForDeleteModal?.production}
        rmfp_id={dataForDeleteModal?.rmfp_id}
        selectedPlans={dataForDeleteModal?.selectedPlans}
        onSuccess={fetchData} 
      />
    </div>
  );
};

export default ParentComponent;
