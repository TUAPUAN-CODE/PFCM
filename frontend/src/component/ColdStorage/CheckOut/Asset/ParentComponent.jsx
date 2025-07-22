import React, { useState, useEffect } from 'react';
import TableMainPrep from './Table';
import Modal1 from './Modal1';
import Modal2 from './Modal2';
import Modal3 from './Modal3';
import ModalEditPD from './ModalEditPD';
import ModalSuccess from './ModalSuccess';
import ModalDelete from './ModalDelete';
import PrintModal from './PrintModal';
import axios from "axios";
axios.defaults.withCredentials = true; 
import io from 'socket.io-client';
import { after } from 'lodash';

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {

  const [openPrintModal, setOpenPrintModal] = useState(false);
  const [dataForPrintModal, setDataForPrintModal] = useState(null);

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
  
  // สร้าง state สำหรับเก็บข้อมูลแยกตามประเภท
  const [regularRawMatData, setRegularRawMatData] = useState([]);
  const [mixedRawMatData, setMixedRawMatData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [socket, setSocket] = useState(null);

  // Initialize Socket.IO connection

useEffect(() => {
  if (!API_URL) {
    console.error("❌ API_URL is not defined.");
    return;
  }

  let isTabActive = true;
  let reconnectTimer = null;
  let reconnectDelay = 2000; // เริ่มที่ 2 วินาที
  const MAX_DELAY = 60000; // สูงสุด 1 นาที

  const handleVisibilityChange = () => {
    isTabActive = !document.hidden;
    if (isTabActive && !newSocket?.connected) {
      console.log("🔄 Tab กลับมา active, พยายามเชื่อมต่อ...");
      manualReconnect();
    }
  };

  const newSocket = io(API_URL, {
    transports: ["websocket"],
    reconnection: false,
    autoConnect: false,
  });

  const manualReconnect = () => {
    if (!newSocket.connected && isTabActive) {
      console.log(`🔁 พยายาม reconnect... รอ ${reconnectDelay / 1000} วินาที`);
      newSocket.connect();
      reconnectTimer = setTimeout(manualReconnect, reconnectDelay);
      // เพิ่มเวลาแบบ exponential (double ทุกครั้ง แต่ไม่เกิน MAX_DELAY)
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  if (!document.hidden) {
    newSocket.connect();
  }

  newSocket.on("connect", () => {
    console.log("✅ Socket connected:", newSocket.id);
    reconnectDelay = 2000; // reset delay เมื่อเชื่อมต่อสำเร็จ
    fetchAllData();
  });

  
    // Listen for real-time updates
    newSocket.on('dataUpdated', (updatedData) => {
      // ปรับปรุงข้อมูลตาราง เมื่อมีการอัปเดตจาก backend
      fetchAllData();
    });
    
    newSocket.on('dataDelete', (deleteData) => {
      // ปรับปรุงข้อมูลตาราง เมื่อมีการลบจาก backend
      fetchAllData();
    });

  newSocket.on("disconnect", (reason) => {
    console.warn("⚠️ Socket disconnected:", reason);
    if (isTabActive) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(manualReconnect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    }
  });

  newSocket.on("connect_error", (error) => {
    console.error("❌ Connection error:", error);
    if (isTabActive) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(manualReconnect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
    }
  });

  setSocket(newSocket);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    clearTimeout(reconnectTimer);
    if (newSocket) {
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("connect_error");
      newSocket.off("dataUpdated");
      newSocket.off("dataDelete");
      newSocket.disconnect();
    }
  };
}, [API_URL]);
  // ฟังก์ชันสำหรับดึงข้อมูลทั้งหมด (ทั้งวัตถุดิบแบบปกติและแบบผสม)
  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchRegularRawMat(),
        fetchMixedRawMat()
      ]);
    } catch (error) {
      console.error("Error fetching all data:", error);
    }
  };

  // ฟังก์ชันสำหรับดึงข้อมูลวัตถุดิบแบบปกติ (ไม่ผสม)
  const fetchRegularRawMat = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/coldstorage/export/fetchSlotRawMat`);
      const fetchedData = response.data.success ? response.data.data : [];

      console.log("fetchedData :",fetchedData)
      setRegularRawMatData(fetchedData);
      
      // รวมข้อมูลทั้งหมดและอัปเดต tableData
      combineAndUpdateTableData(fetchedData, mixedRawMatData);
    } catch (error) {
      console.error("Error fetching regular raw material data:", error);
    }
  };

  // ฟังก์ชันสำหรับดึงข้อมูลวัตถุดิบแบบผสม
  const fetchMixedRawMat = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/coldstorage/mix/export/fetchSlotRawMat`);
      const fetchedData = response.data.success ? response.data.data : [];
      setMixedRawMatData(fetchedData);
      
      // รวมข้อมูลทั้งหมดและอัปเดต tableData
      combineAndUpdateTableData(regularRawMatData, fetchedData);
    } catch (error) {
      console.error("Error fetching mixed raw material data:", error);
    }
  };

  // ฟังก์ชันรวมข้อมูลจากทั้งสองแหล่งและอัปเดต state tableData
  const combineAndUpdateTableData = (regularData, mixedData) => {
    // ตรวจสอบว่าข้อมูลแต่ละประเภทถูกโหลดเรียบร้อยแล้ว
    if (regularData && mixedData) {
      // เพิ่ม field สำหรับระบุประเภทข้อมูล
      const regularWithType = regularData.map(item => ({
        ...item,
        rawMatType: 'regular'
      }));
      
      const mixedWithType = mixedData.map(item => ({
        ...item,
        rawMatType: 'mixed',
      }));
      
      // รวมข้อมูลทั้งสองประเภท
      const combinedData = [...regularWithType, ...mixedWithType];
      
      // อัปเดต state tableData
      setTableData(combinedData);
    }
  };

  // ดึงข้อมูลตั้งแต่เริ่มต้น
  useEffect(() => {
    fetchAllData();
  }, []);

  // useEffect เพื่อรวมข้อมูลเมื่อ state ของข้อมูลแต่ละประเภทมีการเปลี่ยนแปลง
  useEffect(() => {
    combineAndUpdateTableData(regularRawMatData, mixedRawMatData);
  }, [regularRawMatData, mixedRawMatData]);

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
    // ตรวจสอบ ptc_time จากทั้งระดับบนสุดและใน materials
    const mainPtcTime = data.ptc_time; // ptc_time จากข้อมูลหลัก
    const materialPtcTime = data.materials?.[0]?.ptc_time; // ptc_time จากวัตถุดิบชิ้นแรก
    const effectivePtcTime = mainPtcTime || materialPtcTime || "-"; // ใช้ค่าใดค่าหนึ่งที่มีอยู่
    
    // ตรวจสอบว่าเป็นวัตถุดิบผสมหรือไม่
    const isMixed = data.rawMatType === 'mixed';
    
    // กำหนดค่ารหัสวัตถุดิบและชื่อวัตถุดิบตามประเภท
    const materialCode = isMixed ? data.mix_code : data.materials?.[0]?.material_code;
    const materialName = isMixed ? `Mixed: ${data.mix_code}` : data.materials?.[0]?.materialName;
    
    setDataForEditModal({
      batch: data.batch || data.materials?.[0]?.batch,
      mat: materialCode, // ใช้ mix_code ถ้าเป็นวัตถุดิบผสม
      mat_name: materialName, // ใช้ "Mixed: [mix_code]" ถ้าเป็นวัตถุดิบผสม
      production: data.production, // ส่งข้อมูล production
      rmm_line_name: data.rmm_line_name, // เพิ่มการส่งค่า rmm_line_name
      remark_rework : data.remark_rework,
      remark_rework_cold : data.remark_rework_cold,
      edit_rework: data.edit_rework,
      qccheck_cold : data.qccheck_cold,
      prepare_mor_night : data.prepare_mor_night,
      rmfp_id: data.rmfp_id,
      rm_cold_status: data.trolleyStatus,
      rm_status: data.materials?.[0]?.materialStatus,
      tro_id: data.tro_id,
      slot_id: data.slot_id,
      ComeColdDateTime: data.latestComeColdDate,
      ptc_time: effectivePtcTime, // ใช้ค่า ptc_time ที่มีประสิทธิภาพ
      cold: data.cold || "-",
      batch_after: data.batch_after,
      level_eu: data.materials?.[0]?.levelEu,
      
      // เพิ่มข้อมูลอื่นๆ ที่อาจจำเป็น
      weight_RM: data.weight_RM,
      tray_count: data.tray_count,
      name_edit_prod_two : data.name_edit_prod_two || data.materials?.[0]?.name_edit_prod_two,
      name_edit_prod_three : data.name_edit_prod_three || data.materials?.[0]?.name_edit_prod_three,
      first_prod : data.first_prod || data.materials?.[0]?.first_prod,
      two_prod : data.two_prod || data.two_prod?.[0]?.two_prod,
      three_prod : data.three_prod || data.three_prod?.[0]?.three_prod,
      remark_rework : data.remark_rework || data.materials?.[0]?.remark_rework,
      remark_rework_cold : data.remark_rework_cold || data.materials?.[0]?.remark_rework_cold,
      edit_rework : data.edit_rework || data.materials?.[0]?.edit_rework,
      receiver_qc_cold : data.receiver_qc_cold || data.materials?.[0]?.receiver_qc_cold,
      approver : data.approver || data.materials?.[0]?.approver,
      qccheck_cold : data.qccheck_cold || data.materials?.[0]?.qccheck_cold,
      prepare_mor_night : data.prepare_mor_night || data.materials?.[0]?.prepare_mor_night,
      // ข้อมูลอื่นๆ ยังคงเหมือนเดิม
      cooked_date: data.cooked_date,
      rmit_date: data.rmit_date,
      standard_ptc: data.standard_ptc,
      mapping_id: data.mapping_id,
      remaining_rework_time: data.remaining_rework_time,
      standard_rework_time: data.standard_rework_time,
      
      formattedDelayTime: data.formattedDelayTime,
      latestComeColdDate: data.latestComeColdDate,
      
      // ข้อมูลเพิ่มเติมสำหรับวัตถุดิบแบบผสม
      mix_code: data.mix_code,
      prod_mix: data.prod_mix,
      mix_time: data.mix_time,
      mixed_date: data.mixed_date,
      come_cold_date: data.come_cold_date,
      come_cold_date_two: data.come_cold_date_two,
      come_cold_date_three: data.come_cold_date_three,
      rawMatType: data.rawMatType, // เพิ่มประเภทของวัตถุดิบ
      
      // Add QC information
      sq_remark: data.sq_remark || data.materials?.[0]?.sq_remark,
      md_remark: data.md_remark || data.materials?.[0]?.md_remark,
      defect_remark: data.defect_remark || data.materials?.[0]?.defect_remark,
      qccheck: data.qccheck || data.materials?.[0]?.qccheck,
      mdcheck: data.mdcheck || data.materials?.[0]?.mdcheck,
      defectcheck: data.defectcheck || data.materials?.[0]?.defectcheck,
      machine_MD: data.machine_MD,
      sq_acceptance: data.sq_acceptance,
      defect_acceptance: data.defect_acceptance,
      withdraw_date: data.withdraw_date || data.materials?.[0]?.withdraw_date,
      
      
      materials: data.materials ? data.materials.map(material => {
        // กำหนดค่ารหัสวัตถุดิบและชื่อวัตถุดิบสำหรับแต่ละวัตถุดิบตามประเภท
        const isMaterialMixed = material.rawMatType === 'mixed' || data.rawMatType === 'mixed';
        const materialCode = isMaterialMixed ? (material.mix_code || data.mix_code) : material.material_code;
        const materialName = isMaterialMixed ? `Mixed: ${material.mix_code || data.mix_code}` : material.materialName;
        
        return {
          ...material,
          material_code: materialCode, // ปรับปรุงรหัสวัตถุดิบ
          materialName: materialName, // ปรับปรุงชื่อวัตถุดิบ
          ptc_time: material.ptc_time || effectivePtcTime, // ใช้ค่า ptc_time ของแต่ละวัตถุดิบหรือค่าหลักถ้าไม่มี
          formattedDelayTime: material.formattedDelayTime || data.cold || "-",
          cooked_date: material.cooked_date || data.cooked_date || "-",
          rmit_date: material.rmit_date || data.rmit_date,
          mapping_id: material.mapping_id || data.mapping_id,
          remaining_rework_time: material.remaining_rework_time || data.remaining_rework_time,
          standard_rework_time: material.standard_rework_time || data.standard_rework_time,
          withdraw_date : material.withdraw_date || data.withdraw_date,
          weight_RM: material.weight_RM || data.weight_RM,
          tray_count: material.tray_count|| data.tray_count,
          name_edit_prod_two : material.name_edit_prod_two || data.name_edit_prod_two,
          name_edit_prod_three : material.name_edit_prod_three || data.name_edit_prod_three,
          first_prod : material.first_prod || data.first_prod,
          two_prod : material.two_prod || data.two_prod,
          three_prod : material.three_prod || data.three_prod,
          remark_rework : material.remark_rework || data.remark_rework,
          remark_rework_cold : material.remark_rework_cold || data.remark_rework_cold,
          edit_rework : material.edit_rework || data.edit_rework,
        receiver_qc_cold : material.receiver_qc_cold || data.receiver_qc_cold,
        approver : material.approver || data.approver,
        qccheck_cold : material.qccheck_cold || data.qccheck_cold,
        prepare_mor_night : material.prepare_mor_night || data.prepare_mor_night,

          // Pass QC information for each material
          sq_remark: material.sq_remark || data.sq_remark || "-",
          md_remark: material.md_remark || data.md_remark || "-",
          defect_remark: material.defect_remark || data.defect_remark || "-",
          qccheck: material.qccheck || data.qccheck || "-",
          mdcheck: material.mdcheck || data.mdcheck || "-",
          defectcheck: material.defectcheck || data.defectcheck || "-",
          machine_MD: material.machine_MD || data.machine_MD,
          sq_acceptance: material.sq_acceptance || data.sq_acceptance || "-",
          defect_acceptance: material.defect_acceptance || data.defect_acceptance || "-",
        };
      }) : []
    });
    
    setOpenEditModal(true);
    console.log("QC information:", {
      sq_remark: data.sq_remark,
      md_remark: data.md_remark,
      defect_remark: data.defect_remark,
      qccheck: data.qccheck,
      mdcheck: data.mdcheck,
      defectcheck: data.defectcheck,
      sq_acceptance: data.sq_acceptance,
      defect_acceptance: data.defect_acceptance,
    });
    console.log("data in handleOpenEditModal:", data);
    console.log("mapping_id:", data.mapping_id);
    console.log("rawMatType:", data.rawMatType); // Log ประเภทของวัตถุดิบ
    console.log("cooked_date:", data.cooked_date);
    console.log("ptc_time:", data.ptc_time);
    console.log("formattedDelayTime:", data.formattedDelayTime);
    console.log("latestComeColdDate:", data.latestComeColdDate);
    console.log("mix_code:", data.mix_code); // เพิ่มการ log mix_code
  };

  const handleOpenDeleteModal = (data) => {
    setDataForDeleteModal({
      batch: data.batch,
      mat: data.mat,
      mat_name: data.mat_name,
      production: data.production,
      rmfp_id: data.rmfp_id,
      mapping_id: data.mapping_id,
      rawMatType: data.rawMatType // เพิ่มประเภทของวัตถุดิบ
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
      new_edit_prod_two: data.new_edit_prod_two,
      new_edit_prod_three: data.new_edit_prod_three,
      first_prod: data.first_prod,
      two_prod: data.two_prod,
      three_prod: data.three_prod,
      remark_rework : data.remark_rework,
      remark_rework_cold : data.remark_rework_cold,
      edit_rework : data.edit_rework,
        receiver_qc_cold : data.receiver_qc_cold,
        approver : data.approver,
        qccheck_cold : data.qccheck_cold,
        prepare_mor_night : data.prepare_mor_night,

      mapping_id: data.mapping_id,
      rawMatType: data.rawMatType, // เพิ่มประเภทของวัตถุดิบ
      // Add QC information
      sq_remark: data.sq_remark,
      md_remark: data.md_remark,
      defect_remark: data.defect_remark,
      qccheck: data.qccheck,
      mdcheck: data.mdcheck,
      defectcheck: data.defectcheck,
      sq_acceptance: data.sq_acceptance,
      defect_acceptance: data.defect_acceptance,
    });
    setOpenSuccessModal(true);
  };

  // Add for print modal
  const handleOpenPrintModal = (data) => {
    setDataForPrintModal({data});
    setOpenPrintModal(true);
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
      mapping_id: data.mapping_id,
      rawMatType: data.rawMatType, // เพิ่มประเภทของวัตถุดิบ
      // Add QC information
      sq_remark: data.sq_remark,
      md_remark: data.md_remark,
      defect_remark: data.defect_remark,
      qccheck: data.qccheck,
      mdcheck: data.mdcheck,
      defectcheck: data.defectcheck,
      sq_acceptance: data.sq_acceptance,
      defect_acceptance: data.defect_acceptance,
    });
    setOpenModal1(true);
  };

  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
  };

  const handleDeleteModal = async (DeleteData) => {
    try {
      // ส่ง API call ตามประเภทของวัตถุดิบ
      const endpoint = DeleteData.rawMatType === 'mixed' 
        ? `${API_URL}/api/oven/toCold/deleteMixedProduction` 
        : `${API_URL}/api/oven/toCold/deleteProduction`;
        
      await axios.delete(endpoint, { data: DeleteData });
      
      if (socket) {
        socket.emit('dataDelete', DeleteData); 
      }

      // ดึงข้อมูลใหม่ทั้งหมด
      fetchAllData();

      // ปิด modal
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
        regularData={regularRawMatData}
        mixedData={mixedRawMatData}
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
        batch_after={dataForModal1?.batch_after}
        level_eu={dataForModal1?.level_eu}
        new_edit_prod_two={dataForModal1?.new_edit_prod_two}
        new_edit_prod_three={dataForModal1?.new_edit_prod_three}
        first_prod={dataForModal1?.first_prod}
        two_prod={dataForModal1?.two_prod}
        three_prod={dataForModal1?.three_prod}
        remark_rework ={dataForModal1?.remark_rework}
        remark_rework_cold ={dataForModal1?.remark_rework_cold}
        edit_rework ={dataForModal1?.edit_rework}
        receiver_qc_cold ={dataForModal1?.receiver_qc_cold}
        approver ={dataForModal1?.approver}
        qccheck_cold ={dataForModal1?.qccheck_cold}
        prepare_mor_night ={dataForModal1?.prepare_mor_night}
        
        mapping_id={dataForModal1?.mapping_id}
        rawMatType={dataForModal1?.rawMatType}
        // Pass QC information
        sq_remark={dataForModal1?.sq_remark}
        md_remark={dataForModal1?.md_remark}
        defect_remark={dataForModal1?.defect_remark}
        qccheck={dataForModal1?.qccheck}
        mdcheck={dataForModal1?.mdcheck}
        defectcheck={dataForModal1?.defectcheck}
        sq_acceptance={dataForModal1?.sq_acceptance}
        defect_acceptance={dataForModal1?.defect_acceptance}
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
        mapping_id={dataForModal2?.mapping_id}
        rawMatType={dataForModal2?.rawMatType}
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
        mapping_id={dataForModal3?.mapping_id}
        rawMatType={dataForModal3?.rawMatType}
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
        batch_after={dataForSuccessModal?.batch_after}
        level_eu={dataForSuccessModal?.level_eu}
        new_edit_prod_two={dataForModal1?.new_edit_prod_two}
        new_edit_prod_three={dataForModal1?.new_edit_prod_three}
        first_prod={dataForModal1?.first_prod}
        two_prod={dataForModal1?.two_prod}
        three_prod={dataForModal1?.three_prod}
        remark_rework ={dataForSuccessModal?.remark_rework}
        remark_rework_cold ={dataForSuccessModal?.remark_rework_cold}
        edit_rework ={dataForSuccessModal?.edit_rework}
        receiver_qc_cold ={dataForSuccessModal?.receiver_qc_cold}
        approver ={dataForSuccessModal?.approver}
        qccheck_cold ={dataForSuccessModal?.qccheck_cold}
        prepare_mor_night ={dataForSuccessModal?.prepare_mor_night}
        mapping_id={dataForSuccessModal?.mapping_id}
        rawMatType={dataForSuccessModal?.rawMatType}
        // Pass QC information
        sq_remark={dataForSuccessModal?.sq_remark}
        md_remark={dataForSuccessModal?.md_remark}
        defect_remark={dataForSuccessModal?.defect_remark}
        qccheck={dataForSuccessModal?.qccheck}
        mdcheck={dataForSuccessModal?.mdcheck}
        defectcheck={dataForSuccessModal?.defectcheck}
        sq_acceptance={dataForSuccessModal?.sq_acceptance}
        defect_acceptance={dataForSuccessModal?.defect_acceptance}
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
        mapping_id={dataForDeleteModal?.mapping_id}
        rawMatType={dataForDeleteModal?.rawMatType}
        onSuccess={fetchAllData} 
      />
      <PrintModal
        open={openPrintModal}
        onClose={() => setOpenPrintModal(false)}
        data={dataForPrintModal}
      />
    </div>
  );
};

export default ParentComponent;