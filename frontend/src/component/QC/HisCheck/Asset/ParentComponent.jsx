import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress
} from '@mui/material';

import QcHisTable from "./Table";

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {
  // State สำหรับจัดการข้อมูล
  const [qcHistoryData, setQcHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State สำหรับ Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalRows, setTotalRows] = useState(0);

  // ดึง rm_type_id จาก localStorage
  const rmTypeIds = JSON.parse(localStorage.getItem('rm_type_id')) || [];

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // สร้าง params สำหรับการเรียก API
      const params = {
        page: page + 1,
        pageSize: rowsPerPage,
        rm_type_ids: rmTypeIds.join(',') // ส่ง rm_type_ids เป็น string คั่นด้วย comma
      };
  
      const response = await axios.get(`${API_URL}/api/qc/History/All`, { params });
      console.log('ได้รับข้อมูลจาก API:', response.data);
  
      const preparedData = response.data.data.map(item => {
        return {
          ...item,
          qcData: {
            sq_remark: item.sq_remark,
            md: item.md,
            md_remark: item.md_remark,
            defect: item.defect,
            defect_remark: item.defect_remark,
            md_no: item.md_no,
            WorkAreaCode: item.WorkAreaCode,
            WorkAreaName: item.WorkAreaName,
            qccheck: item.qccheck,
            mdcheck: item.mdcheck,
            defectcheck: item.defectcheck,
            sq_acceptance: item.sq_acceptance,
            defect_acceptance: item.defect_acceptance,
            process_name: item.process_name,
            name_edit_prod_two: item.name_edit_prod_two,
            name_edit_prod_three: item.name_edit_prod_three,
            first_prod: item.first_prod,
            two_prod: item.two_prod,
            three_prod: item.three_prod,
          }
        };
      });
      
      setQcHistoryData(preparedData);
      setTotalRows(response.data.total || preparedData.length || 0);
      setLoading(false);
      
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
      setError(`ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ${error.message}`);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage]);

  // จัดการการเปลี่ยนหน้า
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // จัดการการเปลี่ยนจำนวนแถวต่อหน้า
  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // แสดงข้อความโหลด
  if (loading) {
    return (
      <Paper sx={{ 
        width: '100%', 
        height: 'calc(100vh - 5rem)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Paper>
    );
  }

  // แสดงข้อความ error
  if (error) {
    return (
      <Paper sx={{ 
        width: '100%', 
        height: 'calc(100vh - 5rem)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Box sx={{ 
          padding: '20px', 
          textAlign: 'center', 
          backgroundColor: '#fff3cd',
          borderRadius: '8px'
        }}>
          <Typography color="error" variant="h6">
            {error}
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ 
      width: '100%', 
      height: 'calc(100vh - 5rem)',
      overflow: 'hidden', 
      boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)'
    }}>
      {/* ตารางข้อมูล */}
      <QcHisTable 
        filteredData={qcHistoryData}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
        handleChangePage={handleChangePage}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default ParentComponent;