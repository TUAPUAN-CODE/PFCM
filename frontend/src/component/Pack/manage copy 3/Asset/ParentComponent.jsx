import React, { useState, useEffect, useRef, useCallback } from 'react';
import TableMainPrep from './Table';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import ModalDelete from './ModalDelete';
import ModalEditLine from './ModalEditLine';
import axios from "axios";
axios.defaults.withCredentials = true;
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {
  // State management
  const [modals, setModals] = useState({
    modal2: false,
    modal3: false,
    editModal: false,
    editLineModal: false,
    deleteModal: false,
    successModal: false
  });

  const [modalData, setModalData] = useState({
    modal2: null,
    modal3: null,
    editModal: null,
    editLineModal: null,
    deleteModal: null,
    successModal: null
  });

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  // Memoized fetch function
const fetchData = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await axios.get(
      `${API_URL}/api/pack/report/fetchRM/all/line`
    );

    if (!response.data.success) {
      throw new Error("Failed to fetch data");
    }

    const transformedData = response.data.data.map(item => ({
      ...item,
      production: item.code,
      weight_RM: item.weight_RM,
      weight_per_tray: item.weight_in_trolley / (item.tray_count || 1)
    }));

    setTableData(transformedData || []);
  } catch (err) {
    console.error("Error fetching data:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, []);


  // Debounced fetch function
  const fetchDataDebounced = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchData();
    }, 300);
  }, [fetchData]);

  // Initialize component and socket
  useEffect(() => {
    fetchData();

    // Initialize socket if not already exists
    if (!socketRef.current) {
      const newSocket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
      });

      socketRef.current = newSocket;

      const handleDataUpdated = (updatedData) => {
        setTableData(prev => {
          if (updatedData.isMixed && updatedData.groupItems) {
            return prev.map(group =>
              group.mix_code === updatedData.mix_code ? updatedData : group
            );
          }
          return prev.map(item =>
            item.mapping_id === updatedData.mapping_id ? updatedData : item
          );
        });
        // Refresh data after update
        fetchDataDebounced();
      };

      const handleDataDelete = (deleteData) => {
        setTableData(prev => {
          if (deleteData.isMixed) {
            return prev.filter(group => group.mix_code !== deleteData.mix_code);
          }
          return prev.filter(item => item.mapping_id !== deleteData.mapping_id);
        });
        // Refresh data after delete
        fetchDataDebounced();
      };

      const handleConnectError = (err) => {
        console.error('Socket connection error:', err);
      };

      newSocket.on('dataUpdated', handleDataUpdated);
      newSocket.on('dataDelete', handleDataDelete);
      newSocket.on('connect_error', handleConnectError);

      // Cleanup function
      return () => {
        if (socketRef.current) {
          newSocket.off('dataUpdated', handleDataUpdated);
          newSocket.off('dataDelete', handleDataDelete);
          newSocket.off('connect_error', handleConnectError);
          newSocket.disconnect();
          socketRef.current = null;
        }
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
      };
    }
  }, [fetchData, fetchDataDebounced]);

  // Modal handlers
  const openModal = (modalName, data = null) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
    if (data) {
      setModalData(prev => ({ ...prev, [modalName]: data }));
    }
  };

  const closeModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    setModalData(prev => ({ ...prev, [modalName]: null }));
  };

  const handleModalFlow = (currentModal, nextModal, data = null) => {
    setModals(prev => ({
      ...prev,
      [currentModal]: false,
      [nextModal]: true
    }));

    if (data) {
      setModalData(prev => ({
        ...prev,
        [nextModal]: {
          ...prev[currentModal],
          ...data
        }
      }));
    }
  };

  // Enhanced function to check if item has tro_id and handle mixed trolleys
  const hasTroId = (data) => {
    if (data.isMixed) {
      // For mixed trolleys, check if all items have tro_id
      return data.groupItems.every(item => !!item.tro_id);
    }
    return !!data.tro_id;
  };


  const handleOpenModal2 = (data) => {

  };

  const handleOpenModal3 = (data) => {
    handleModalFlow('modal2', 'modal3', data);
  };

  const handleOpenEditModal = (data) => {
    const editData = {
      ...data,
      production: data.code,
      rm_cold_status: data.rm_status,
      // Include cold storage dates if available
      ...(data.come_cold_date && { ComeColdDateTime: data.come_cold_date }),
      ...(data.out_cold_date && { cold: data.out_cold_date })
    };

    openModal('editModal', editData);
  };

  const handleOpenEditLineModal = (data) => {
    const editLineData = {
      ...data,
      mat: data.mat_id || data.mat,
      batch: data.batch_after || data.batch,
      rmfp_id: data.rmfp_id,
      production: data.code,
      line_name: data.line_name
    };

    openModal('editLineModal', editLineData);
  };

  const handleOpenDeleteModal = (data, delayTime = null) => {
    const deleteData = {
      ...data,
      production: data.code,
      weight_RM: data.weight_in_trolley || data.weight_per_tro,
      // Include quality check data
      qccheck: data.qccheck,
      mdcheck: data.mdcheck,
      defectcheck: data.defectcheck,
      WorkAreaCode: data.WorkAreaCode,
      // Include dates
      ...(data.cooked_date && { CookedDateTime: data.cooked_date }),
      ...(data.withdraw_date && { withdraw_date: data.withdraw_date })
    };

    openModal('deleteModal', deleteData);
  };

  const handleOpenSuccess = (data) => {
    openModal('successModal', {
      batch: data.batch_after,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.code,
      rmfp_id: data.rmfp_id
    });
  };

  const handleConfirmRow = async (payload) => {
    try {
      console.log("Confirm payload scp:", payload);

      const res = await axios.post(
        `${API_URL}/api/pack/mixed/delay-time/test`,
        payload
      );

      if (res.data.success) {
        fetchData();

      }
    } catch (error) {
      console.error("Confirm error:", error);
      alert("เกิดข้อผิดพลาดในการยืนยันข้อมูล");
    }
  };


  // Error boundary would be better, but this is a simple fallback
  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <button onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {loading && <div className="loading-indicator">Loading...</div>}

      <TableMainPrep

        handleOpenEditModal={handleOpenEditModal}
        handleOpenDeleteModal={handleOpenDeleteModal}
        handleOpenEditLineModal={handleOpenEditLineModal} // เพิ่มการส่ง prop นี้ไปยัง TableMainPrep
        handleOpenSuccess={handleOpenSuccess}
        onConfirmRow={handleConfirmRow} 
        data={tableData}
        loading={loading}
        checkTroId={hasTroId}
      />



      <Modal2
        open={modals.modal2}
        onClose={() => closeModal('modal2')}
        onNext={handleOpenModal3}
        data={modalData.modal2}
      />

      <Modal3
        open={modals.modal3}
        onSuccess={fetchData}
        onClose={() => closeModal('modal3')}
        data={modalData.modal3}
        onEdit={() => handleModalFlow('modal3', 'modal2')}
      />

      <ModalEditPD
        open={modals.editModal}
        onClose={() => closeModal('editModal')}
        data={modalData.editModal}
        onSuccess={fetchData}
      />

      <ModalSuccess
        open={modals.successModal}
        onClose={() => closeModal('successModal')}
        data={modalData.successModal}
        onSuccess={fetchData}
      />

      <ModalEditLine
        open={modals.editLineModal}
        onClose={() => closeModal('editLineModal')}
        data={modalData.editLineModal}
        onSuccess={fetchData}
      />

      <ModalDelete
        open={modals.deleteModal}
        onClose={() => closeModal('deleteModal')}
        data={modalData.deleteModal}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ParentComponent;