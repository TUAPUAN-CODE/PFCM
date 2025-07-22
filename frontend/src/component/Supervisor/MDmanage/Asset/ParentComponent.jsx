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
  Container
} from '@mui/material';
import { debounce } from 'lodash';
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';

import MDTable from './Asset/MDTable';
import WorkAreaTable from './Asset/WorkAreaTable';
import AddEditModal from './Asset/AddEditModal';
import DeleteModal from './Asset/DeleteModal';

const API_URL = import.meta.env.VITE_API_URL;

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
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentItem, setCurrentItem] = useState(null);
  const [tableType, setTableType] = useState(''); // 'md' or 'wa'
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchData();
  }, []);

  // Debounced filter functions
  const filterMDData = useCallback(debounce(() => {
    const filtered = mdSearchTerm.trim() ?
      metalDetectors.filter(item => item.md_no?.toLowerCase().includes(mdSearchTerm.toLowerCase())) :
      metalDetectors;
    setFilteredMDs(filtered);
    setMDTotalRows(filtered.length);
    setMDPage(0);
  }, 300), [mdSearchTerm, metalDetectors]);

  const filterWAData = useCallback(debounce(() => {
    const filtered = waSearchTerm.trim() ?
      workAreas.filter(item => 
        item.WorkArea?.toLowerCase().includes(waSearchTerm.toLowerCase()) || 
        item.WorkAreaName?.toLowerCase().includes(waSearchTerm.toLowerCase())
      ) :
      workAreas;
    setFilteredWAs(filtered);
    setWATotalRows(filtered.length);
    setWAPage(0);
  }, 300), [waSearchTerm, workAreas]);

  useEffect(() => {
    filterMDData();
  }, [mdSearchTerm, metalDetectors, filterMDData]);

  useEffect(() => {
    filterWAData();
  }, [waSearchTerm, workAreas, filterWAData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mdResponse, waResponse] = await Promise.all([
        axios.get(`${API_URL}/api/metal-detectors`),
        axios.get(`${API_URL}/api/work-areas`)
      ]);

      if (mdResponse.data.success) {
        setMetalDetectors(mdResponse.data.data);
        setFilteredMDs(mdResponse.data.data);
        setMDTotalRows(mdResponse.data.data.length);
      }
      if (waResponse.data.success) {
        setWorkAreas(waResponse.data.data);
        setFilteredWAs(waResponse.data.data);
        setWATotalRows(waResponse.data.data.length);
      }
    } catch (err) {
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

  // Modal handlers
  const handleOpenAddModal = (type) => {
    setTableType(type);
    setCurrentItem(type === 'md' ? { md_no: '', Status: 1 } : { WorkArea: '', WorkAreaName: '' });
    setModalMode('add');
    setAddEditModalOpen(true);
  };

  const handleOpenEditModal = (item, type) => {
    setTableType(type);
    setCurrentItem(item);
    setModalMode('edit');
    setAddEditModalOpen(true);
  };

  const handleOpenDeleteModal = (id, type) => {
    setTableType(type);
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteData = async (id) => {
    try {
      const url = tableType === 'md' ? `${API_URL}/api/metal-detectors` : `${API_URL}/api/work-areas`;
      const response = await axios.delete(`${url}/${id}`);
      if (response.data.success) {
        showSnackbar('ลบข้อมูลสำเร็จ', 'success');
        fetchData();
      }
    } catch (err) {
      showSnackbar('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box 
        sx={{ 
          height: '100%',
          overflow: 'auto',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        }}
      >
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            {/* Metal Detector Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">จัดการเครื่องตรวจจับโลหะ</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    variant="outlined"
                    placeholder="ค้นหา..."
                    value={mdSearchTerm}
                    onChange={(e) => setMDSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                    sx={{ width: '250px' }}
                  />
                  <Button 
                    variant="outlined" 
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
                    startIcon={<AddIcon />} 
                    onClick={() => handleOpenAddModal('md')}
                  >
                    เพิ่มเครื่อง
                  </Button>
                </Box>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <MDTable
                  filteredData={filteredMDs.slice(mdPage * mdRowsPerPage, mdPage * mdRowsPerPage + mdRowsPerPage)}
                  page={mdPage}
                  rowsPerPage={mdRowsPerPage}
                  totalRows={mdTotalRows}
                  handleChangePage={handleMDChangePage}
                  handleChangeRowsPerPage={handleMDChangeRowsPerPage}
                  handleEdit={(item) => handleOpenEditModal(item, 'md')}
                  handleDelete={(id) => handleOpenDeleteModal(id, 'md')}
                />
              </Box>
            </Box>

            {/* Work Area Section */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">จัดการพื้นที่</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    variant="outlined"
                    placeholder="ค้นหา..."
                    value={waSearchTerm}
                    onChange={(e) => setWASearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                    sx={{ width: '250px' }}
                  />
                  <Button 
                    variant="outlined" 
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
                    startIcon={<AddIcon />} 
                    onClick={() => handleOpenAddModal('wa')}
                  >
                    เพิ่มพื้นที่
                  </Button>
                </Box>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <WorkAreaTable
                  filteredData={filteredWAs.slice(waPage * waRowsPerPage, waPage * waRowsPerPage + waRowsPerPage)}
                  page={waPage}
                  rowsPerPage={waRowsPerPage}
                  totalRows={waTotalRows}
                  handleChangePage={handleWAChangePage}
                  handleChangeRowsPerPage={handleWAChangeRowsPerPage}
                  handleEdit={(item) => handleOpenEditModal(item, 'wa')}
                  handleDelete={(id) => handleOpenDeleteModal(id, 'wa')}
                />
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Add/Edit Modal */}
      <AddEditModal 
        open={addEditModalOpen}
        onClose={() => setAddEditModalOpen(false)}
        mode={modalMode}
        initialData={currentItem}
        tableType={tableType}
        onSave={handleSaveData}
      />

      {/* Delete Modal */}
      <DeleteModal 
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        itemId={itemToDelete}
        tableType={tableType}
        onConfirm={handleDeleteData}
      />

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={5000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManagementPage;