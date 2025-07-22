import React, { useState, useEffect } from 'react';
import TableMainPrep from './Table';
import Modal1 from './Modal1';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import ModalDelete from './ModalDelete';
import MixedDetail from './MixedDetail';
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

const ParentComponent = ({ tro_id, onClose, onDataFetched }) => {
  const [openModal1, setOpenModal1] = useState(false);
  const [openModal2, setOpenModal2] = useState(false);
  const [openModal3, setOpenModal3] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [openMixedDetail, setOpenMixedDetail] = useState(false);
  const [dataForModal1, setDataForModal1] = useState(null);
  const [dataForModal2, setDataForModal2] = useState(null);
  const [dataForModal3, setDataForModal3] = useState(null);
  const [dataForEditModal, setDataForEditModal] = useState(null);
  const [dataForSuccessModal, setDataForSuccessModal] = useState(null);
  const [dataForDeleteModal, setDataForDeleteModal] = useState(null);
  const [dataForMixedDetail, setDataForMixedDetail] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [socket, setSocket] = useState(null);
  const [groupedData, setGroupedData] = useState([]);
  const [rawMatData, setRawMatData] = useState([]);
  const [mixedMatData, setMixedMatData] = useState([]);

  useEffect(() => {
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
      });
    setSocket(newSocket);

    // Listen for real-time updates
    newSocket.on('dataUpdated', (updatedData) => {
      setTableData(updatedData);
    });
    newSocket.on('dataDelete', (deleteData) => {
      setTableData(deleteData);
    });

    // Clean up socket connection when component unmounts
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      if (!tro_id) return;

      // เรียกทั้งสอง API พร้อมกันด้วย Promise.all
      const [rawMatResponse, mixDataResponse] = await Promise.all([
        axios.get(`${API_URL}/api/pack/main/modal/fetchRawMat?tro_id=${tro_id}`),
        axios.get(`${API_URL}/api/pack/main/modal/fetchRawMatMix?tro_id=${tro_id}`)
      ]);

      console.log("Raw material response:", rawMatResponse.data);
      console.log("Mixed material response:", mixDataResponse.data);

      // เก็บข้อมูลดิบแยกประเภท
      if (rawMatResponse.data.success) {
        setRawMatData(rawMatResponse.data.data);
      }

      if (mixDataResponse.data.success) {
        setMixedMatData(mixDataResponse.data.data);
      }

      // รวมข้อมูลจากทั้งสองแหล่งเข้าด้วยกัน
      let combinedData = [];

      if (rawMatResponse.data.success) {
        combinedData = [...combinedData, ...rawMatResponse.data.data];
      }

      if (mixDataResponse.data.success) {
        combinedData = [...combinedData, ...mixDataResponse.data.data];
      }

      // จัดกลุ่มข้อมูลตาม tro_id หรือ criteria อื่นๆ
      const groupedItems = groupItemsByKey(combinedData, 'tro_id');
      setGroupedData(groupedItems);

      // ถ้าต้องการใช้ tableData แบบเดิม
      setTableData(combinedData);

      // ส่งข้อมูลกลุ่มแรก (หรือตามที่ต้องการ) ไปยังส่วนอื่น
      if (onDataFetched && groupedItems.length > 0) {
        // สร้างข้อมูลที่มีทั้งข้อมูลกลุ่มและอ้างอิงถึงข้อมูลดิบทั้งหมด
        const completeData = {
          ...groupedItems[0],
          Materials: combinedData,
          rawMaterials: rawMatResponse.data.success ? rawMatResponse.data.data : [],
          mixedMaterials: mixDataResponse.data.success ? mixDataResponse.data.data : []
        };
        
        console.log("Sending complete data to parent:", completeData);
        onDataFetched(completeData);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  const groupItemsByKey = (items, key) => {
    const groupMap = {};

    // จัดกลุ่มตาม key ที่กำหนด (เช่น rmfp_id)
    items.forEach(item => {
      const groupKey = item[key];
      if (!groupMap[groupKey]) {
        groupMap[groupKey] = {
          ...item,
          isGrouped: false,
          itemCount: 1,
          groupItems: [item],
          materials: [item]
        };
      } else {
        groupMap[groupKey].itemCount += 1;
        groupMap[groupKey].isGrouped = true;
        groupMap[groupKey].groupItems.push(item);
        groupMap[groupKey].materials.push(item);
      }
    });

    // แปลงเป็น array
    return Object.values(groupMap);
  };

  useEffect(() => {
    fetchData();
  }, [tro_id]);

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
    console.log("Data received in handleOpenModal3:", data);
    setDataForModal3(data);
    console.log("After setDataForModal3:", dataForModal3);
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

  const handleOpenMixedDetail = (data) => {
    setDataForMixedDetail({
      mix_code: data.mix_code || data.batch,
      // เพิ่มฟิลด์อื่นๆ ที่ต้องการส่งไปยัง MixedDetail ตามความเหมาะสม
    });
    setOpenMixedDetail(true);
  };

  const handleOpenSuccess = (data) => {
    console.log("Opening success modal with delay time:", window.formattedDelayTime);
    
    // สร้างข้อมูลที่จะส่งไปยัง ModalSuccess ที่มีข้อมูลครบถ้วน
    const combinedData = {
      ...data,
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id,
      delayTime: window.formattedDelayTime,
      allMaterials: tableData,
      rawMaterials: rawMatData,
      mixedMaterials: mixedMatData
    };
    
    setDataForSuccessModal(combinedData);
    console.log("dataForSuccessModal set with:", combinedData);
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

  const handleRowClick = (rowData, formattedDelayTime, rmfp_id) => {
    console.log("Row clicked:", rowData);
    console.log("formattedDelayTime : ", formattedDelayTime);
    console.log("Row rmfp_id:", rmfp_id);
    // เพิ่มบรรทัดนี้เพื่อเก็บค่า formattedDelayTime
    window.formattedDelayTime = formattedDelayTime;

    // ถ้าต้องการเปิด MixedDetail เมื่อคลิกที่แถว สามารถเพิ่มโค้ดต่อไปนี้
    if (rowData && rowData.mix_code) {
      handleOpenMixedDetail(rowData);
    }
  };

  return (
    <div>
      <TableMainPrep
        groupedData={groupedData}
        onSelectGroup={(group) => {
          // เมื่อเลือกกลุ่ม ส่งข้อมูลกลุ่มไปยังส่วนอื่น
          if (onDataFetched) {
            // สร้างข้อมูลที่มีทั้งข้อมูลกลุ่มและอ้างอิงถึงข้อมูลดิบทั้งหมด
            const completeData = {
              ...group,
              allMaterials: tableData,
              rawMaterials: rawMatData,
              mixedMaterials: mixedMatData
            };
            onDataFetched(completeData);
          }
        }}
        handleOpenModal={handleOpenModal1}
        handleOpenEditModal={handleOpenEditModal}
        handleOpenDeleteModal={handleOpenDeleteModal}
        handleOpenSuccess={handleOpenSuccess}
        handleopenModal1={handleopenModal1}
        handleRowClick={handleRowClick}
        handleOpenMixedDetail={handleOpenMixedDetail}
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
        delayTime={dataForSuccessModal?.delayTime}
        onSuccess={fetchData}
        tro_id={tro_id}
        tableData={dataForSuccessModal} // ส่งข้อมูลที่รวมทั้งวัตถุดิบปกติและวัตถุดิบผสม
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

      {/* เพิ่ม MixedDetail component */}
      {openMixedDetail && dataForMixedDetail && (
        <MixedDetail
          item={dataForMixedDetail}
          onClose={() => setOpenMixedDetail(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default ParentComponent;