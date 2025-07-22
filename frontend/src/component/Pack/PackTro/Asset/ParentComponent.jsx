import React, { useState, useEffect } from 'react';
import TableMainPrep from './Table';
import Modal1 from './Modal1';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import TroDelModal from './TroDel'; // Updated import
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
  const [delayTimeValue, setDelayTimeValue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      });
    setSocket(newSocket);
    newSocket.emit('joinRoom', 'PackRoom');
    
    newSocket.on('dataUpdated', (data) => {
      fetchData();
    });
 
    newSocket.on('dataDelete', () => {
      fetchData();
    });
    
    newSocket.on('deleteTrolley', () => {
      fetchData();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const LineIdFromLocalStorage = localStorage.getItem("line_id");
      if (!LineIdFromLocalStorage) {
        throw new Error("No line_id found in localStorage");
      }

      const response = await axios.get(`${API_URL}/api/pack/Trolley/${LineIdFromLocalStorage}`);
      const fetchedData = response.data.success ? response.data.data : [];
      setTableData(fetchedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
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
      cold: dataForModal1?.cold,
      dest: dataForModal1?.dest,
    });
    setOpenModal2(true);
    setOpenModal1(false);
  };

  const handleOpenModal3 = (data) => {
    setDataForModal3(data);
    setOpenModal3(true);
    setOpenModal1(false);
  };

  const handleOpenEditModal = (data) => {
    setDataForEditModal({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id,
      rm_cold_status: data.rm_cold_status,
      rm_status: data.rm_status,
      tro_id: data.tro_id,
      slot_id: data.slot_id,
      ComeColdDateTime: data.ComeColdDateTime,
      cold: data.cold,
      rm_tro_id: data.rm_tro_id,
    });
    setOpenEditModal(true);
  };
  
  const handleOpenDeleteModal = (data) => {
    setDataForDeleteModal({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id,
      tro_id: data.tro_id,
      // Include any additional fields needed for the modal
      cold: data.cold,
      dest: data.dest,
      slot_id: data.slot_id,
      rm_status: data.rm_status
    });
    setOpenDeleteModal(true);
  };

  const handleOpenSuccess = (data) => {
    const enhancedData = {
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id,
      tro_id: data.tro_id,
      delayTimeValue: data.formattedDelayTime || delayTimeValue,
      // Include any additional success data
      cold: data.cold,
      dest: data.dest
    };

    setDataForSuccessModal(enhancedData);
    setOpenSuccessModal(true);
  };

  const handleopenModal1 = () => {
    setDataForModal1({});
    setOpenModal1(true);
  };

  const handleRowClick = (rowData, delayTime) => {
    setDelayTimeValue(delayTime);

    if (rowData.formattedDelayTime) {
      const updatedTableData = tableData.map(item => {
        if (item.rmfp_id === rowData.rmfp_id) {
          return {
            ...item,
            formattedDelayTime: rowData.formattedDelayTime
          };
        }
        return item;
      });
      setTableData(updatedTableData);
    }
  };

  return (
    <div>
      {isLoading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh' 
        }}>
          <div>กำลังโหลดข้อมูล...</div>
        </div>
      ) : (
        <TableMainPrep
          handleOpenModal={handleOpenModal1}
          handleOpenEditModal={handleOpenEditModal}
          handleOpenDeleteModal={handleOpenDeleteModal}
          handleOpenSuccess={handleOpenSuccess}
          handleopenModal1={handleopenModal1}
          handleRowClick={handleRowClick}
          data={tableData}
        />
      )}
      
      <Modal1
        open={openModal1}
        onClose={() => setOpenModal1(false)}
        onNext={handleOpenModal3}
        data={dataForModal1}
      />
      
      <Modal2
        open={openModal2}
        rmfp_id={dataForModal2?.rmfp_id}
        cold={dataForModal2?.cold}
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
        cold={dataForModal3?.cold}
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
        tro_id={dataForSuccessModal?.tro_id}
        selectedPlans={dataForSuccessModal?.selectedPlans}
        delayTime={dataForSuccessModal?.delayTimeValue}
        onSuccess={fetchData}
      />
      
      <TroDelModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        mat={dataForDeleteModal?.mat}
        mat_name={dataForDeleteModal?.mat_name}
        batch={dataForDeleteModal?.batch}
        production={dataForDeleteModal?.production}
        rmfp_id={dataForDeleteModal?.rmfp_id}
        tro_id={dataForDeleteModal?.tro_id}
        onSuccess={() => {
          fetchData();
          setOpenDeleteModal(false);
        }}
      />
    </div>
  );
};

export default ParentComponent;