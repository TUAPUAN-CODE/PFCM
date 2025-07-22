import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Box, 
  TextField, 
  InputAdornment, 
  Paper, 
  Typography, 
  CircularProgress, 
  Button, 
  Alert, 
  Snackbar,
  Backdrop
} from '@mui/material';
import { debounce } from 'lodash';
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';

import MDTable from './Asset/MDTable';
import WorkAreaTable from './Asset/WorkAreaTable';
import AddEditModal from './Asset/AddEditModal';
import DeleteModal from './Asset/DeleteModal';

// ถ้า API_URL ไม่ถูกกำหนด ให้ใช้ค่าเริ่มต้น
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ManagementPage = () => {
  // State for Metal Detectors
  const [metalDetectors, setMetalDetectors] = useState([]);
  const [filteredMDs, setFilteredMDs] = useState([]);
  const [mdPage, setMDPage] = useState(0);
  const [mdRowsPerPage, setMDRowsPerPage] = useState(5);
  const [mdTotalRows, setMDTotalRows] = useState(0);
  const [mdSearchTerm, setMDSearchTerm] = useState("");

  // State for Work Areas
  const [workAreas, setWorkAreas] = useState([]);
  const [filteredWAs, setFilteredWAs] = useState([]);
  const [waPage, setWAPage] = useState(0);
  const [waRowsPerPage, setWARowsPerPage] = useState(5);
  const [waTotalRows, setWATotalRows] = useState(0);
  const [waSearchTerm, setWASearchTerm] = useState("");

  // General state
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(false); // เพิ่ม state เพื่อแสดง loading ขณะทำ action
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentItem, setCurrentItem] = useState(null);
  const [tableType, setTableType] = useState(''); // 'md' or 'wa'
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // แสดง snackbar สำหรับการแจ้งเตือน
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // โหลดข้อมูลเมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    fetchData();
  }, []);

  // ฟังก์ชันสำหรับกรองข้อมูล Metal Detector ด้วย debounce
  const filterMDData = useCallback(debounce(() => {
    const filtered = mdSearchTerm.trim() ?
      metalDetectors.filter(item => 
        (item.md_no?.toLowerCase().includes(mdSearchTerm.toLowerCase())) ||
        (item.WorkAreaCode?.toLowerCase().includes(mdSearchTerm.toLowerCase()))
      ) :
      metalDetectors;
    setFilteredMDs(filtered);
    setMDTotalRows(filtered.length);
    setMDPage(0);
  }, 300), [mdSearchTerm, metalDetectors]);

  // ฟังก์ชันสำหรับกรองข้อมูล Work Area ด้วย debounce
  const filterWAData = useCallback(debounce(() => {
    const filtered = waSearchTerm.trim() ?
      workAreas.filter(item => 
        (item.WorkAreaCode?.toLowerCase().includes(waSearchTerm.toLowerCase())) || 
        (item.WorkAreaName?.toLowerCase().includes(waSearchTerm.toLowerCase()))
      ) :
      workAreas;
    setFilteredWAs(filtered);
    setWATotalRows(filtered.length);
    setWAPage(0);
  }, 300), [waSearchTerm, workAreas]);

  // ทำการกรองข้อมูลเมื่อ search term หรือข้อมูลเปลี่ยนแปลง
  useEffect(() => {
    filterMDData();
  }, [mdSearchTerm, metalDetectors, filterMDData]);

  useEffect(() => {
    filterWAData();
  }, [waSearchTerm, workAreas, filterWAData]);

  // ดึงข้อมูลจาก API
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('เริ่มดึงข้อมูลจาก API:', API_URL);

      try {
        const [mdResponse, waResponse] = await Promise.all([
          axios.get(`${API_URL}/api/metal-detectors`),
          axios.get(`${API_URL}/api/work-areas`)
        ]);

        console.log('ข้อมูลเครื่องตรวจจับโลหะ:', mdResponse.data);
        console.log('ข้อมูลพื้นที่ทำงาน:', waResponse.data);

        if (mdResponse.data.success) {
          // แปลงข้อมูล Status ถ้าจำเป็น
          const transformedMdData = mdResponse.data.data.map(item => ({
            ...item,
            Status: typeof item.Status === 'boolean' ? (item.Status ? 1 : 0) : 
                   typeof item.Status === 'string' ? parseInt(item.Status) : item.Status,
            // ถ้ามี WorkArea แต่ไม่มี WorkAreaCode
            WorkAreaCode: item.WorkArea && !item.WorkAreaCode ? item.WorkArea : item.WorkAreaCode
          }));
          
          setMetalDetectors(transformedMdData);
          setFilteredMDs(transformedMdData);
          setMDTotalRows(transformedMdData.length);
        } else {
          showSnackbar('ไม่สามารถดึงข้อมูลเครื่องตรวจจับโลหะได้', 'error');
        }
        
        if (waResponse.data.success) {
          setWorkAreas(waResponse.data.data);
          setFilteredWAs(waResponse.data.data);
          setWATotalRows(waResponse.data.data.length);
        } else {
          showSnackbar('ไม่สามารถดึงข้อมูลพื้นที่ทำงานได้', 'error');
        }
      } catch (apiError) {
        console.error("เกิดข้อผิดพลาดในการเรียก API:", apiError);
        showSnackbar('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
      showSnackbar('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Pagination handlers
  const handleMDChangePage = (event, newPage) => setMDPage(newPage);
  const handleMDChangeRowsPerPage = (event) => {
    setMDRowsPerPage(parseInt(event.target.value, 10));
    setMDPage(0);
  };
  const handleWAChangePage = (event, newPage) => setWAPage(newPage);
  const handleWAChangeRowsPerPage = (event) => {
    setWARowsPerPage(parseInt(event.target.value, 10));
    setWAPage(0);
  };

  // เปิด Modal สำหรับเพิ่มข้อมูลใหม่
  const handleOpenAddModal = (type) => {
    setTableType(type);
    setCurrentItem(type === 'md' ? 
      { md_no: '', WorkAreaCode: '', Status: 1 } : 
      { WorkAreaCode: '', WorkAreaName: '' }
    );
    setModalMode('add');
    setAddEditModalOpen(true);
  };

  // เปิด Modal สำหรับแก้ไขข้อมูล
  const handleOpenEditModal = (item, type) => {
    // แก้ไขกรณีที่มี WorkArea แต่ไม่มี WorkAreaCode
    if (type === 'md' && item.WorkArea && !item.WorkAreaCode) {
      item.WorkAreaCode = item.WorkArea;
    }
    
    setTableType(type);
    setCurrentItem({...item}); // Clone object เพื่อป้องกันการแก้ไขข้อมูลต้นฉบับ
    setModalMode('edit');
    setAddEditModalOpen(true);
  };

  // บันทึกข้อมูลที่เพิ่มหรือแก้ไข
  const handleSaveData = async (data, mode) => {
    try {
      setProcessingAction(true);
      console.log('กำลังบันทึกข้อมูล:', data, 'โหมด:', mode, 'ประเภท:', tableType);
      
      // ตรวจสอบความถูกต้องของข้อมูล
      const validationErrors = validateData(data);
      if (validationErrors.length > 0) {
        showSnackbar(validationErrors.join('\n'), 'error');
        setProcessingAction(false);
        return;
      }
      
      // จัดเตรียมข้อมูลสำหรับส่งไปยัง API
      let apiData = tableType === 'md' 
        ? { 
            md_no: data.md_no, 
            Status: typeof data.Status === 'string' ? parseInt(data.Status) : data.Status 
          } 
        : data;
      
      const url = tableType === 'md' ? `${API_URL}/api/sup/metal-detectors` : `${API_URL}/api/sup/work-areas`;
      const idField = tableType === 'md' ? 'md_no' : 'WorkAreaCode';
      
      try {
        let response;
        if (mode === 'add') {
          response = await axios.post(url, apiData);
        } else {
          response = await axios.put(`${url}/${apiData[idField]}`, apiData);
        }

        console.log('ผลลัพธ์จาก API:', response.data);
        
        if (response.data.success) {
          showSnackbar(mode === 'add' ? 'เพิ่มข้อมูลสำเร็จ' : 'แก้ไขข้อมูลสำเร็จ', 'success');
          fetchData(); // โหลดข้อมูลใหม่
          setAddEditModalOpen(false);
        } else {
          showSnackbar(
            response.data.error || 
            (mode === 'add' ? 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล' : 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล'), 
            'error'
          );
        }
      } catch (apiError) {
        console.error("รายละเอียดข้อผิดพลาดจาก API:", apiError);
        console.error("ข้อความผิดพลาด:", apiError.response?.data);
        
        showSnackbar(
          apiError.response?.data?.error || 
          apiError.response?.data?.errorDetails ||
          'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 
          'error'
        );
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดที่ไม่คาดคิด:", err);
      showSnackbar('เกิดข้อผิดพลาดที่ไม่คาดคิด', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // ตรวจสอบความถูกต้องของข้อมูล
  const validateData = (data) => {
    const errors = [];
    
    if (tableType === 'md') {
      if (!data.md_no) errors.push('หมายเลขเครื่องต้องไม่เป็นค่าว่าง');
      if (data.md_no && data.md_no.length > 10) errors.push('หมายเลขเครื่องต้องไม่เกิน 10 ตัวอักษร');
    } else if (tableType === 'wa') {
      if (!data.WorkAreaCode) errors.push('รหัสพื้นที่ทำงานต้องไม่เป็นค่าว่าง');
      if (!data.WorkAreaName) errors.push('ชื่อพื้นที่ทำงานต้องไม่เป็นค่าว่าง');
    }
    
    return errors;
  };

  // เปิด Modal สำหรับยืนยันการลบข้อมูล
  const handleOpenDeleteModal = (id, type) => {
    setTableType(type);
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  // ลบข้อมูล
  const handleDeleteData = async (id) => {
    try {
      setProcessingAction(true);
      console.log('กำลังลบข้อมูล:', id, 'ประเภท:', tableType);
      
      const url = tableType === 'md' ? `${API_URL}/api/sup/metal-detectors` : `${API_URL}/api/sup/work-areas`;
      
      try {
        const response = await axios.delete(`${url}/${id}`);
        if (response.data.success) {
          showSnackbar('ลบข้อมูลสำเร็จ', 'success');
          fetchData(); // โหลดข้อมูลใหม่
          setDeleteModalOpen(false);
        } else {
          showSnackbar(response.data.error || 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        }
      } catch (apiError) {
        console.error("ข้อผิดพลาดจาก API:", apiError);
        
        // ข้อความผิดพลาดที่ชัดเจน
        const errorMessage = 
          apiError.response?.data?.error || 
          apiError.response?.data?.errorDetails || 
          'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์';
        
        showSnackbar(errorMessage, 'error');
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการลบข้อมูล:", err);
      showSnackbar('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // แสดง Loading ขณะโหลดข้อมูล
  if (loading) {
    return (
      <Paper sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  // ดึงข้อมูลที่จะแสดงในหน้าปัจจุบัน
  const paginatedMDs = filteredMDs.slice(mdPage * mdRowsPerPage, mdPage * mdRowsPerPage + mdRowsPerPage);
  const paginatedWAs = filteredWAs.slice(waPage * waRowsPerPage, waPage * waRowsPerPage + waRowsPerPage);

  return (
    <Paper sx={{ width: '100%', minHeight: 'calc(100vh - 5rem)', p: 2, overflow: 'auto' }}>
      {/* Metal Detector Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">จัดการเครื่องตรวจจับโลหะ</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              variant="outlined"
              placeholder="ค้นหา..."
              size="small"
              value={mdSearchTerm}
              onChange={(e) => setMDSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ width: '250px' }}
            />
            <Button 
              variant="outlined" 
              size="medium"
              startIcon={<RefreshIcon />} 
              onClick={() => { 
                setMDSearchTerm(''); 
                fetchData(); 
              }}
            >
              รีเฟรช
            </Button>
            <Button 
              variant="contained" 
              size="medium"
              startIcon={<AddIcon />} 
              onClick={() => handleOpenAddModal('md')}
            >
              เพิ่มเครื่อง
            </Button>
          </Box>
        </Box>
        <MDTable
          filteredData={paginatedMDs}
          page={mdPage}
          rowsPerPage={mdRowsPerPage}
          totalRows={mdTotalRows}
          handleChangePage={handleMDChangePage}
          handleChangeRowsPerPage={handleMDChangeRowsPerPage}
          handleEdit={(item) => handleOpenEditModal(item, 'md')}
          handleDelete={(id) => handleOpenDeleteModal(id, 'md')}
        />
      </Box>

      {/* Work Area Section */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">จัดการพื้นที่</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              variant="outlined"
              placeholder="ค้นหา..."
              size="small"
              value={waSearchTerm}
              onChange={(e) => setWASearchTerm(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ width: '250px' }}
            />
            <Button 
              variant="outlined" 
              size="medium"
              startIcon={<RefreshIcon />} 
              onClick={() => { 
                setWASearchTerm(''); 
                fetchData(); 
              }}
            >
              รีเฟรช
            </Button>
            <Button 
              variant="contained" 
              size="medium"
              startIcon={<AddIcon />} 
              onClick={() => handleOpenAddModal('wa')}
            >
              เพิ่มพื้นที่
            </Button>
          </Box>
        </Box>
        <WorkAreaTable
          filteredData={paginatedWAs}
          page={waPage}
          rowsPerPage={waRowsPerPage}
          totalRows={waTotalRows}
          handleChangePage={handleWAChangePage}
          handleChangeRowsPerPage={handleWAChangeRowsPerPage}
          handleEdit={(item) => handleOpenEditModal(item, 'wa')}
          handleDelete={(id) => handleOpenDeleteModal(id, 'wa')}
        />
      </Box>

      {/* Add/Edit Modal */}
      <AddEditModal 
        open={addEditModalOpen}
        onClose={() => !processingAction && setAddEditModalOpen(false)}
        mode={modalMode}
        initialData={currentItem}
        tableType={tableType}
        onSave={handleSaveData}
        workAreas={workAreas}
        processing={processingAction}
      />

      {/* Delete Modal */}
      <DeleteModal 
        open={deleteModalOpen}
        onClose={() => !processingAction && setDeleteModalOpen(false)}
        itemId={itemToDelete}
        tableType={tableType}
        onConfirm={handleDeleteData}
        processing={processingAction}
      />

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled" 
          sx={{ width: '100%' }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Backdrop Loading */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={processingAction}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Paper>
  );
};

export default ManagementPage;