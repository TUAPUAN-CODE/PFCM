import React, { useState, useEffect, useRef } from 'react';
import TableMainPrep from './Table';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import ModalDelete from './ModalDelete';
import axios from "axios";
axios.defaults.withCredentials = true; 
import io from 'socket.io-client';
import { Percent } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {

  const [openModal3, setOpenModal3] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [dataForModal1, setDataForModal1] = useState(null);
  const [dataForModal2, setDataForModal2] = useState(null);
  const [dataForModal3, setDataForModal3] = useState(null);
  const [dataForEditModal, setDataForEditModal] = useState(null);
  const [dataForPrint, setDataForPrint] = useState(null);
  const [dataForSuccessModal, setDataForSuccessModal] = useState(null);
  const [dataForDeleteModal, setDataForDeleteModal] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [socket, setSocket] = useState(null);
  const [rmTypeId, setRmTypeId] = useState(null);
  const fetchTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const rmTypeIds = JSON.parse(localStorage.getItem('rm_type_id')) || [];



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
    const newSocket = io(API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
      reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
      autoConnect: true
    });
    socketRef.current = newSocket;

    setSocket(newSocket);
    if (!newSocket.connected) {
      newSocket.emit('joinRoom', 'toColdOvenRoom');
      newSocket.emit('joinRoom', 'QcCheckRoom');
    }
    // Listen for real-time updates
    // Set up event listeners
    const handleDataUpdate = () => {
      console.log("Data updated event received");
      fetchDataDebounced();
    };
    newSocket.on('dataUpdated', handleDataUpdate);
    newSocket.on('dataDelete', handleDataUpdate);

    newSocket.on('dataUpdatedd', (data) => {
      fetchDataDebounced(data); // Update table data when the backend sends an update
    });

    newSocket.on('trolleyUpdated', (broadcastData) => {
      console.log("Trolley data updated:", broadcastData);
      fetchDataDebounced(); // หรือ setTableData(broadcastData); ถ้า broadcastData มีข้อมูลทั้งหมด
    });
    // Initial data fetch
    fetchData();
    // Clean up socket connection when component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.off('dataUpdated', handleDataUpdate);
        socketRef.current.off('dataDelete', handleDataUpdate);
        socketRef.current.off('dataUpdatedd', handleDataUpdate);
        socketRef.current.off('trolleyUpdated', handleDataUpdate);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);



  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/qc/fetchRMForProd`, {
        params: {
        rm_type_ids: rmTypeIds.join(',') // ส่งเป็น string คั่นด้วย comma
      }
      });

      // No need to filter on frontend - backend handles it
      setTableData(response.data.success ? response.data.data : []);

      console.log("data api : ", response.data);

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
  };

  const handleOpenModal1 = (data) => {
    setDataForModal1(data);
    // setOpenModal1(true);
  };



  //ทำต่อพรุ่งนี้
  const handleOpenEditModal = (data) => {
    setDataForEditModal({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id,
      mapping_id: data.mapping_id,
      weight_in_trolley: data.weight_in_trolley,
      process_name: data.process_name,
      CookedDateTime: data.CookedDateTime,
      withdraw_date_formatted: data.withdraw_date_formatted,
      tray_count: data.tray_count,
      withdraw_date: data.withdraw_date,
      rmit_date: data.rmit_date,
      edit_rework: data.edit_rework,
      remark_rework: data.remark_rework,
      remark_rework_cold: data.remark_rework_cold,
      ptp_time: data.prep_to_pack,
      rework_time: data.rework_time,
      tro_id: data.tro_id,
      rmfp_line_name: data.rmm_line_name,
      rm_status: data.rm_status,
      dest: data.dest,
      batch_after: data.batch_after,
      level_eu: data.level_eu,
      tro_id: data.tro_id,
      Moisture: data.Moisture,
      percent_fine: data.percent_fine,
      Temp: data.Temp,
      process_name: data.process_name,
      weight_RM: data.weight_RM,
      rmm_line_name: data.rmm_line_name,
      stay_place: data.stay_place,
      rm_type_id: rmTypeId, // เพิ่ม rm_type_id จาก state
      first_prod: data.first_prod,
      two_prod: data.two_prod,
      three_prod: data.three_prod,
      name_edit_prod_two: data.name_edit_prod_two,
      name_edit_prod_three: data.name_edit_prod_three
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
      batch_after: data.batch_after,
      level_eu: data.level_eu,
      first_prod: data.first_prod,
      two_prod: data.two_prod,
      three_prod: data.three_prod,
      name_edit_prod_two: data.name_edit_prod_two,
      name_edit_prod_three: data.name_edit_prod_three
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
      withdraw_date_formatted: data.withdraw_date_formatted,
      dest: data.dest,
      batch_after: data.batch_after,
      level_eu: data.level_eu,
      first_prod: data.first_prod,
      two_prod: data.two_prod,
      three_prod: data.three_prod,
      name_edit_prod_two: data.name_edit_prod_two,
      name_edit_prod_three: data.name_edit_prod_three
    });

  };


  const handleOnSuccess = async () => {
    try {
      // ตรวจสอบค่าของ dataForEditModal ก่อน
      if (!dataForEditModal || !dataForEditModal.mapping_id) {
        console.error("dataForEditModal is missing or invalid:", dataForEditModal);
        return;
      }

      console.log("dataForEditModal:", dataForEditModal);
      console.log("Before update dataForModal3:", dataForModal3);

      // ดึงค่า rm_tro_id
      const { mapping_id } = dataForEditModal;

      // ส่งคำขอไปยัง API
      const response = await axios.get(`${API_URL}/api/qc/print/status`, {
        params: { mapping_id },
      });

      console.log("API response:", response.data); // log แค่ response.data เพื่ออ่านง่าย

      if (response.data.success) {
        // รวมข้อมูล API กับ dataForEditModal
        const updatedDataForModal3 = {
          ...dataForEditModal,
          qcData: response.data.data,
        };

        console.log("Updated dataForModal3:", updatedDataForModal3);

        setDataForModal3(updatedDataForModal3);

        setOpenModal3(true);
      } else {
        console.error("API response error:", response.data.message);
      }

      // อัปเดตข้อมูลใหม่
      fetchData();
    } catch (error) {
      console.error("Error fetching QC data:", error);
    }
  };

  useEffect(() => {
    console.log("dataForModal3 updated:", dataForModal3);

  }, [dataForModal3]);



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

      <Modal3
        open={openModal3}
        CookedDateTime={dataForModal3?.CookedDateTime}
        withdraw_date_formatted={dataForModal3?.withdraw_date_formatted}
        onClose={() => {
          setOpenModal3(false);
        }}
        data={dataForModal3} // ใช้ dataForModal3 ส่งข้อมูลทั้งหมด รวมถึง dest
        onEdit={() => {
          setOpenModal3(false);
        }}
        clearData={clearData}
      />

      <ModalEditPD
        open={openEditModal}
        onClose={() => {
          setOpenEditModal(false);
          clearData();
        }}
        onNext={() => setOpenEditModal(false)}
        data={dataForEditModal}
        onSuccess={handleOnSuccess} // Use the new onSuccess function here
        rm_type_id={rmTypeId} // ส่ง rm_type_id เพิ่มเติมเป็น prop แยก
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
        batch_after={dataForSuccessModal?.batch_after}
        first_prod={dataForSuccessModal?.first_prod}
        two_prod={dataForSuccessModal?.two_prod}
        three_prod={dataForSuccessModal?.three_prod}
        name_edit_prod_two={dataForSuccessModal?.name_edit_prod_two}
        name_edit_prod_three={dataForSuccessModal?.name_edit_prod_three}
        level_eu={dataForSuccessModal?.level_eu}
        process_name={dataForSuccessModal?.process_name}
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