import React, { useState, useEffect } from 'react';
import TableMainPrep from './Table';
import Modal1 from './Modal1';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import ModalDelete from './ModalDelete';
import ModalSendback from './ModalSendback'
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
  const [lineMapping, setLineMapping] = useState({});
  const [socket, setSocket] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openSendbackModal, setOpenSendbackModal] = useState(false);
  const [selectedSendbackData, setSelectedSendbackData] = useState(null);

  useEffect(() => {
    const LineIdFromLocalStorage = localStorage.getItem("line_id");
    console.log("line_id from localStorage:", LineIdFromLocalStorage);
    if (LineIdFromLocalStorage) {
      setSelectedLineId(LineIdFromLocalStorage);
    }
  }, []);


  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      });
    setSocket(newSocket);
    newSocket.emit('joinRoom', 'QcCheckRoom');
    newSocket.on('dataUpdated', () => {
      fetchAllData(selectedLineId); // เรียก fetchAllData โดยไม่ต้องส่ง selectedLineId
    });
  
    newSocket.on("refreshPack", (msg) => {
      fetchAllData(selectedLineId);  
      console.log("🔄 รับ event refreshData:", msg);
      // ทำ action ที่ต้องการ เช่น refetch ข้อมูล
    });
  
    return () => {
      newSocket.disconnect();
    };
  }, [selectedLineId]);

  // Function to fetch all types of raw materials
  const fetchAllData = async () => {
    if (!selectedLineId) return;
    
    setIsLoading(true);
    try {
      // Fetch regular raw materials
      const [rawMatResponse, mixedRawMatResponse] = await Promise.all([
        axios.get(`${API_URL}/api/pack/main/fetchRawMat/${selectedLineId}`),
        axios.get(`${API_URL}/api/pack/main/fetchMixedRawMat/${selectedLineId}`)
      ]);

      const rawMaterials = rawMatResponse.data.success ? rawMatResponse.data.data : [];
      const mixedMaterials = mixedRawMatResponse.data.success ? mixedRawMatResponse.data.data : [];
      console.log("mixedMaterials :",mixedMaterials)

      // Process mixed materials to match the structure of raw materials
      const processedMixedMaterials = mixedMaterials.map(trolley => {
        return {
          tro_id: trolley.tro_id,
          materials: trolley.mixedMaterials.map(mixedMat => ({
            mapping_id: mixedMat.mapping_id,
            rmfp_id: mixedMat.rmfp_id,
            batch_after: null,  // Mixed materials may not have batch
            mix_code: mixedMat.mix_code,  // Use mix_code as mat
            mix_code_name: `Mix: ${mixedMat.mix_code}`,  // Create a name for mixed materials
            production: mixedMat.production,
            cold: null,  // May not have cold value
            dest: mixedMat.dest,
            weight_in_trolley: mixedMat.weight_in_trolley,
            weight_RM: mixedMat.weight_RM,
            tray_count: mixedMat.tray_count,
            remaining_mix_time:mixedMat.mix_time,
            tro_id: trolley.tro_id, // Fixed: use trolley.tro_id instead of undefined tro_id
            // Add history data
            history: mixedMat.history
          }))
        };
      });

      // Combine both types of materials
      // If a trolley exists in both arrays, merge the materials
      const combinedData = [...rawMaterials];
      
      mixedMaterials.forEach(mixedTrolley => {
        const existingTrolleyIndex = combinedData.findIndex(t => t.tro_id === mixedTrolley.tro_id);
        
        if (existingTrolleyIndex >= 0) {
          // Trolley exists, merge the materials
          combinedData[existingTrolleyIndex].materials = [
            ...combinedData[existingTrolleyIndex].materials,
            ...processedMixedMaterials.find(t => t.tro_id === mixedTrolley.tro_id).materials
          ];
        } else {
          // Trolley doesn't exist, add it
          combinedData.push(processedMixedMaterials.find(t => t.tro_id === mixedTrolley.tro_id));
        }
      });

      console.log("combinedData :",combinedData)

      setTableData(combinedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when selectedLineId changes
  useEffect(() => {
    if (selectedLineId) {
      fetchAllData();
    }
  }, [selectedLineId]);

  const clearData = () => {
    setDataForModal1(null);
    setDataForModal2(null);
    setDataForModal3(null);
  };

  const handleOpenModal1 = (data) => {
    setDataForModal1(data);
    setOpenModal1(true);
  };

   const handleOpenSendbackModal = (data) => {
    setSelectedSendbackData({
      tro_id: data.tro_id // ต้องมีค่า tro_id ในข้อมูลที่ส่งมา
    });
    setOpenSendbackModal(true);
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
      tro_id: data.tro_id,
      production: data.production,
      total_weight: data.total_weight,
      tray_count: data.tray_count 
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
  
  // Log data for debugging
  console.log("Selected Line ID:", selectedLineId);
  console.log("Table data:", tableData);

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

  const handleDeleteModal = async (DeleteData) => {
    try {
      await axios.delete(`${API_URL}/api/oven/toCold/updateProduction`, DeleteData);

      if (socket) {
        socket.emit('dataDelete', DeleteData);
      }

      fetchAllData();
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
        handleOpenSendbackModal={handleOpenSendbackModal} // Add this prop
        handleOpenSuccess={handleOpenSuccess}
        handleopenModal1={handleopenModal1} 
        data={tableData}  
        handleRowClick={handleRowClick}
        isLoading={isLoading}
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
        onSuccess={fetchAllData}
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
        onSuccess={fetchAllData}
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
        onSuccess={fetchAllData}
      />

      <ModalSendback
  open={openSendbackModal}
  onClose={() => setOpenSendbackModal(false)}
  mapping_id={selectedSendbackData?.mapping_id}
  tro_id={selectedSendbackData?.tro_id}  // เพิ่มบรรทัดนี้
  onSuccess={fetchAllData}
/>
    </div>
  );
};

export default ParentComponent;