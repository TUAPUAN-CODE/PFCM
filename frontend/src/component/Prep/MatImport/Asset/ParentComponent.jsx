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
import ClearTrolleyModal from "./ClearTrolleyModal";

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
  const rmTypeIds = JSON.parse(localStorage.getItem('rm_type_id')) || [];
  const [openClearTrolley, setOpenClearTrolley] = useState(false);
  const [trolleyData, setTrolleyData] = useState(null);

  // Debounced fetchData
  const fetchDataDebounced = () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchData();
    }, 300);
  };

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/prep/matimport/fetchRMForProd`, {
        params: {
          rm_type_ids: rmTypeIds.join(',') // ส่งเป็น string คั่นด้วย comma
        }
      });

      setTableData(response.data.success ? response.data.data : []);
      console.log("Table data:", response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Socket.io setup
    const newSocket = io(API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
      reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
      autoConnect: true
    });

    setSocket(newSocket);
    console.log('Socket connected');
    newSocket.emit('joinRoom', 'saveRMForProdRoom');


    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // Event listeners
    newSocket.on('dataUpdated', fetchDataDebounced);
    newSocket.on('dataDelete', fetchDataDebounced);
    newSocket.on('rawMaterialSaved', fetchDataDebounced);

    // Cleanup
    return () => {
      newSocket.off('dataUpdated');
      newSocket.off('dataDelete');
      newSocket.off('rawMaterialSaved');
      newSocket.disconnect();
    };
  }, []);

  const clearData = () => {
    setDataForModal1(null);
    setDataForModal2(null);
    setDataForModal3(null);
  };

  const handleOpenModal1 = (data) => {
    setDataForModal1({
      rm_type_id: data.rm_type_id,
      mapping_id: data.mapping_id,
      tro_id: data.tro_id,
      CookedDateTime: data.CookedDateTime,
      batch: data.batch,
      edit_rework: data.edit_rework
    });
    setOpenModal1(true);
  };

  const handleOpenModal2 = (data) => {
    setDataForModal2({
      ...data,
      batch: data.batch,
      mapping_id: dataForModal1?.mapping_id,
      tro_id: dataForModal1?.tro_id,
      CookedDateTime: dataForModal1?.CookedDateTime,
      rm_type_id: dataForModal1?.rm_type_id,
      edit_rework: dataForModal1?.edit_rework
    });
    setOpenModal2(true);
    setOpenModal1(false);
  };

  const handleOpenModal3 = (data) => {
    setDataForModal3({
      ...data,
      mapping_id: dataForModal1?.mapping_id,
      tro_id: dataForModal1?.tro_id,
      edit_rework: dataForModal1?.edit_rework
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
      mapping_id: data.mapping_id,
    });
    setOpenSuccessModal(true);
  };

  const handleEditSuccess = async (updatedData) => {
    try {
      await axios.put(`${API_URL}/api/oven/toCold/updateProduction`, updatedData);
      if (socket) {
        socket.emit('dataUpdated', updatedData);
      }
      fetchData();
      setOpenEditModal(false);
    } catch (error) {
      console.error("Error updating data:", error);
    }
  };

  const handleOpenClearTrolley = (row) => {
    setTrolleyData(row);
    setOpenClearTrolley(true);
  };


  return (
    <div>
      <TableMainPrep
        handleOpenModal={handleOpenModal1}
        handleOpenEditModal={handleOpenEditModal}
        handleOpenSuccess={handleOpenSuccess}
        handleOpenClearTrolley={handleOpenClearTrolley}
        data={tableData}
      />

      <ClearTrolleyModal
        open={openClearTrolley}
        onClose={() => setOpenClearTrolley(false)}
        trolleyData={trolleyData}
        onSuccess={() => {
          fetchData(); 
          setOpenClearTrolley(false);
        }}
      />

      <Modal1
        open={openModal1}
        onClose={() => setOpenModal1(false)}
        onNext={handleOpenModal2}
        data={dataForModal1}
        mapping_id={dataForModal1?.mapping_id}
        tro_id={dataForModal1?.tro_id}
        rm_type_id={dataForModal1?.rm_type_id}
        batch={dataForModal1?.batch}
        rmfp_id={dataForModal1?.rmfp_id}
      />

      <Modal2
        open={openModal2}
        batch={dataForModal2?.batch}
        batch_before={dataForModal2?.batch_before}
        rm_type_id={dataForModal2?.rm_type_id}
        CookedDateTime={dataForModal2?.CookedDateTime}
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
        level_eu={dataForSuccessModal?.level_eu}
        newBatch={dataForSuccessModal?.newBatch}
        mapping_id={dataForSuccessModal?.mapping_id}
      />
    </div>
  );
};

export default ParentComponent;