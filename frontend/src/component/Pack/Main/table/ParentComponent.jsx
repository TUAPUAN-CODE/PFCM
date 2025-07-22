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
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = ({ tro_id, onClose }) => {
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
  const [selectedLineId, setSelectedLineId] = useState(null);

  useEffect(() => {
    const LineIdFromLocalStorage = localStorage.getItem('line_id');
    console.log("line_id from localStorage:", LineIdFromLocalStorage); // ตรวจสอบค่าใน localStorage
    if (LineIdFromLocalStorage) {
      setSelectedLineId(LineIdFromLocalStorage);
    }
    console.log("tro_id received in ParentComponent:", tro_id);
    fetchData();
  }, [tro_id]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      }); // Connect to the backend using Socket.IO
    setSocket(newSocket);

    // Listen for real-time updates
    newSocket.on('dataUpdated', (updatedData) => {
      setTableData(updatedData); // Update table data when the backend sends an update
    });
    newSocket.on('dataDelete', (deleteData) => {
      setTableData(deleteData); // Update table data when the backend sends an update
    });

    // Clean up socket connection when component unmounts
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      if (!tro_id || !selectedLineId) return;

      const response = await axios.get(`${API_URL}/api/pack/main/modal/fetchRawMat`, {
        params: {  
          tro_id: tro_id,
          line_id: selectedLineId
        }
      });

      let fetchedData = response.data.success ? response.data.data : [];
      setTableData(fetchedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tro_id, selectedLineId]);


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
    setOpenModal2(false);


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
      cold: data.cold,
      dest: data.dest,
    });
    setOpenModal1(true);
  };

  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
  };

  // const handleEditSuccess = async (updatedData) => {
  //   // Send the updated data to the backend
  //   try {
  //     await axios.put(`${API_URL}/api/oven/toCold/updateProduction`, updatedData);

  //     // Emit the update to all connected clients via Socket.IO
  //     if (socket) {
  //       socket.emit('dataUpdated', updatedData); // Emit the data update event
  //     }

  //     // Refetch the table data to ensure it is up-to-date
  //     fetchData();

  //     // Close the edit modal
  //     setOpenEditModal(false);
  //   } catch (error) {
  //     console.error("Error updating data:", error);
  //   }
  // };
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
        cold={dataForModal1?.cold}
        dest={dataForModal1?.dest}
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
