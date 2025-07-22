import React, { useState, useEffect } from 'react';
import TableMainPrep from './TableOvenToCold';
import Modal1 from './Modal1';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import axios from "axios";
axios.defaults.withCredentials = true; 
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

  const fetchData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/oven/toCold/fetchRMForProd`);
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

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get(`${API_URL}/api/oven/toCold/fetchRMForProd`);
      const data = response.data;
      setTableData(data.success ? data.data : []);
    };
    fetchData();
  }, []);

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
