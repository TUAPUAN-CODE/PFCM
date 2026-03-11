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

// ─────────────────────────────────────────────────────────
// ✅ axiosInstance — มี timeout + retry interceptor
//    แก้ปัญหา: บางครั้ง request timeout หรือ server busy
//    → retry อัตโนมัติสูงสุด 3 ครั้ง
// ─────────────────────────────────────────────────────────
const axiosInstance = axios.create({
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache',  // ✅ ป้องกัน browser cache ข้อมูลเก่า
    'Pragma': 'no-cache'
  }
});

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    config._retryCount = config._retryCount || 0;

    const shouldRetry =
      config._retryCount < 3 &&
      (!error.response || error.response.status >= 500 || error.code === 'ECONNABORTED');

    if (shouldRetry) {
      config._retryCount += 1;
      const delay = 500 * config._retryCount;
      console.warn(`🔄 Retry ${config._retryCount}/3 after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return axiosInstance(config);
    }

    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────
// ParentComponent
// ─────────────────────────────────────────────────────────
const ParentComponent = () => {
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

  const socketRef = useRef(null);
  const fetchDebounceRef = useRef(null);
  const isFetchingRef = useRef(false);  // ✅ ป้องกัน concurrent fetch
  const mountedRef = useRef(true);       // ✅ ป้องกัน setState หลัง unmount
  const tableDataRef = useRef([]);       // ✅ ref สำหรับ check ใน callback

  // sync ref กับ state
  useEffect(() => {
    tableDataRef.current = tableData;
  }, [tableData]);

  // ─────────────────────────────────────────────────────────
  // ✅ fetchData — stable (dependency [] ไม่ recreate)
  // ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!mountedRef.current) {
      isFetchingRef.current = false;
      return;
    }

    // แสดง loading เฉพาะตอนยังไม่มีข้อมูล (ไม่กระพือ UI)
    if (tableDataRef.current.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      const lineId = localStorage.getItem("line_id");

      if (!lineId) {
        console.warn("⚠️ No line_id in localStorage");
        if (mountedRef.current) setTableData([]);
        return;
      }

      // ✅ allSettled — ถ้า API ตัวใดล้มเหลว ยังแสดงข้อมูลจากอีกตัวได้
      const [resLine, resMix] = await Promise.allSettled([
        axiosInstance.get(`${API_URL}/api/pack/manage/all/line`, {
          params: { line_id: lineId }
        }),
        axiosInstance.get(`${API_URL}/api/pack/manage/mixed/all/line`, {
          params: { line_id: lineId }
        })
      ]);

      if (!mountedRef.current) return;

      const lineData = (() => {
        if (resLine.status === 'rejected') {
          console.error("❌ Line API:", resLine.reason?.message);
          return [];
        }
        return resLine.value?.data?.success ? (resLine.value.data.data || []) : [];
      })();

      const mixData = (() => {
        if (resMix.status === 'rejected') {
          console.error("❌ Mix API:", resMix.reason?.message);
          return [];
        }
        return resMix.value?.data?.success ? (resMix.value.data.data || []) : [];
      })();

      console.log(`✅ Fetched: line=${lineData.length}, mix=${mixData.length}`);

      const transformedData = [...lineData, ...mixData].map(item => ({
        ...item,
        production: item.code,
        weight_RM: item.weight_RM,
        weight_per_tray: item.weight_in_trolley / (item.tray_count || 1)
      }));

      if (mountedRef.current) {
        setTableData(transformedData);
      }

    } catch (err) {
      console.error("❌ fetchData error:", err);
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
      isFetchingRef.current = false;
    }
  }, []); // ✅ stable

  // ✅ debounced สำหรับ socket
  const fetchDataDebounced = useCallback(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => fetchData(), 600);
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────
  // Effect 1: mount → fetch + cleanup
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────
  // Effect 2: socket — mount ครั้งเดียว
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const newSocket = io(API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
      autoConnect: true,
    });

    socketRef.current = newSocket;

    newSocket.on('dataUpdated', fetchDataDebounced);
    newSocket.on('dataDelete', fetchDataDebounced);
    newSocket.on('connect', () => console.log('🟢 Socket connected'));
    newSocket.on('disconnect', r => console.log('🔴 Socket disconnected:', r));
    newSocket.on('connect_error', e => console.error('⚠️ Socket error:', e.message));

    return () => {
      newSocket.off('dataUpdated', fetchDataDebounced);
      newSocket.off('dataDelete', fetchDataDebounced);
      newSocket.disconnect();
      socketRef.current = null;
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
  }, [fetchDataDebounced]);

  // ─────────────────────────────────────────────────────────
  // Modal helpers
  // ─────────────────────────────────────────────────────────
  const openModal = (name, data = null) => {
    setModals(prev => ({ ...prev, [name]: true }));
    if (data !== null) setModalData(prev => ({ ...prev, [name]: data }));
  };

  const closeModal = (name) => {
    setModals(prev => ({ ...prev, [name]: false }));
    setModalData(prev => ({ ...prev, [name]: null }));
  };

  const handleModalFlow = (from, to, data = null) => {
    setModals(prev => ({ ...prev, [from]: false, [to]: true }));
    if (data) {
      setModalData(prev => ({ ...prev, [to]: { ...prev[from], ...data } }));
    }
  };

  // ─────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────
  const hasTroId = (data) => {
    if (data.isMixed) return data.groupItems.every(item => !!item.tro_id);
    return !!data.tro_id;
  };

  const handleOpenModal2 = (data) => openModal('modal2', data);
  const handleOpenModal3 = (data) => handleModalFlow('modal2', 'modal3', data);

  const handleOpenEditModal = (data) => {
    openModal('editModal', {
      ...data,
      mapping_id: data.mapping_id,  // ✅ explicit — แก้ undefined bug
      rmfp_id: data.rmfp_id,
      mat: data.mat_id || data.mat,
      production: data.code,
      rm_cold_status: data.rm_status,
      ...(data.come_cold_date && { ComeColdDateTime: data.come_cold_date }),
      ...(data.out_cold_date && { cold: data.out_cold_date })
    });
  };

  const handleOpenEditLineModal = (data) => {
    openModal('editLineModal', {
      ...data,
      mat: data.mat_id || data.mat,
      batch: data.batch_after || data.batch,
      rmfp_id: data.rmfp_id,
      production: data.code,
      line_name: data.line_name
    });
  };

  const handleOpenDeleteModal = (data) => {
    openModal('deleteModal', {
      ...data,
      production: data.code,
      weight_RM: data.weight_in_trolley || data.weight_per_tro,
      ...(data.cooked_date && { CookedDateTime: data.cooked_date }),
      ...(data.withdraw_date && { withdraw_date: data.withdraw_date })
    });
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
      const res = await axiosInstance.post(
        `${API_URL}/api/pack/mixed/delay-time/test`,
        payload
      );
      if (res.data.success) {
        await fetchData();
      } else {
        throw new Error(res.data.message || 'Confirm failed');
      }
    } catch (err) {
      console.error("❌ Confirm error:", err);
      alert("เกิดข้อผิดพลาด: " + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  if (error && tableData.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '50vh', gap: '16px', color: '#666'
      }}>
        <h2 style={{ color: '#e53935' }}>ไม่สามารถโหลดข้อมูลได้</h2>
        <p style={{ fontSize: '14px' }}>{error}</p>
        <button
          onClick={fetchData}
          style={{
            padding: '10px 24px', backgroundColor: '#2196F3', color: '#fff',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600'
          }}
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div>
      {loading && tableData.length === 0 && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          alignItems: 'center', padding: '40px',
          color: '#2196F3', fontSize: '15px', gap: '10px'
        }}>
          <span>⏳</span><span>กำลังโหลดข้อมูล...</span>
        </div>
      )}

      <TableMainPrep
        handleOpenEditModal={handleOpenEditModal}
        handleOpenDeleteModal={handleOpenDeleteModal}
        handleOpenEditLineModal={handleOpenEditLineModal}
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