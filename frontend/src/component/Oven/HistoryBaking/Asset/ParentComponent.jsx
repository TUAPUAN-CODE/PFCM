import React, { useState, useEffect } from 'react';
import TableMainPrep from './TableMainPrep';
import Modal1 from './Modal1';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
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
      const response = await fetch(`${API_URL}/api/oven/toCold/fetchRMForProd`, { credentials: "include" });
      const data = await response.json();
      setTableData(data.success ? data.data : []);
    };
    fetchData();
  }, []);

  return (
    <>
      <TableMainPrep 
        handleOpenModal={handleOpenModal1} 
        handleOpenEditModal={handleOpenEditModal}
        handleOpenSuccess={handleOpenSuccess}
        data={tableData} 
        handleRowClick={handleRowClick}
      />
      <Modal1 
        open={openModal1} 
        onClose={() => setOpenModal1(false)} 
        onNext={handleOpenModal2} 
        data={dataForModal1}
      />
      <Modal2 
        open={openModal2} 
        onClose={() => setOpenModal2(false)} 
        onNext={handleOpenModal3} 
        data={dataForModal2}
      />
      <Modal3 
        open={openModal3} 
        onClose={() => setOpenModal3(false)} 
        data={dataForModal3} 
        onEdit={() => {
          setOpenModal2(true);
          setOpenModal3(false);
        }}
      />
      <ModalEditPD
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        onNext={(updatedData) => {
          // Handle the updated data here
          setOpenEditModal(false);
        }}
        data={dataForEditModal}
      />
      <ModalSuccess
        open={openSuccessModal}
        onClose={() => setOpenSuccessModal(false)}
        mat={dataForSuccessModal?.mat}
        mat_name={dataForSuccessModal?.mat_name}
        batch={dataForSuccessModal?.batch}
        production={dataForSuccessModal?.production}
        rmfp_id={dataForSuccessModal?.rmfp_id}
        selectedPlans={dataForSuccessModal?.selectedPlans} // Ensure selectedPlans is passed correctly
      />
    </>
  );
};



export default ParentComponent;