import React, { useState, useEffect } from 'react';
// Update this import path to match your project structure
import TableMainPrep from './TableOvenToCold';
import axios from "axios";
axios.defaults.withCredentials = true; 
import ExportExcelButton from "./ExportExcelButton";
import WeightSummaryCard from "./WeightSummaryCard"; // นำเข้าคอมโพเนนต์การ์ดสรุปน้ำหนัก
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
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSummaryCard, setShowSummaryCard] = useState(false); // เพิ่มสถานะสำหรับเปิด/ปิดการ์ดสรุป
  
  // เพิ่มสถานะสำหรับการค้นหาตามช่วงเวลา
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  // ฟังก์ชันสำหรับดึงข้อมูลจาก API
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูลจาก API ทั้งสองตัวพร้อมกัน
      const [normalDataResponse, mixDataResponse] = await Promise.all([
        axios.get(`${API_URL}/api/coldstorage/incold/fetchSlotRawMat`),
        axios.get(`${API_URL}/api/coldstorage/incold/mix/fetchSlotRawMat`)
      ]);

      // ประมวลผลข้อมูลวัตถุดิบทั่วไป
      const processedNormalData = normalDataResponse.data && Array.isArray(normalDataResponse.data) 
        ? normalDataResponse.data.map(item => ({
            ...item,
            qc_datetime: item.come_cold_date || item.rmit_date,
            isMixed: false // เพิ่ม flag เพื่อระบุว่าไม่ใช่วัตถุดิบผสม
          }))
        : [];

      // ประมวลผลข้อมูลวัตถุดิบผสม
      const processedMixData = mixDataResponse.data && Array.isArray(mixDataResponse.data)
        ? mixDataResponse.data.map(item => ({
            ...item,
            qc_datetime: item.come_cold_date || item.mixed_date,
            isMixed: true, // เพิ่ม flag เพื่อระบุว่าเป็นวัตถุดิบผสม
            mat: item.mix_code, // ใช้ mix_code เป็น mat
            mat_name: `Mixed : ${item.mix_code}` // ปรับรูปแบบชื่อวัตถุดิบผสม
          }))
        : [];

      // รวมข้อมูลทั้งสองส่วนเข้าด้วยกัน
      const combinedData = [...processedNormalData, ...processedMixData];
      
      setTableData(combinedData);
      setFilteredData(combinedData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setTableData([]);
      setFilteredData([]);
      setLoading(false);
    }
  };

  // เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อ component โหลด
  useEffect(() => {
    fetchData();
  }, []);

  // ฟังก์ชันกรองข้อมูลตามช่วงเวลา
  const filterDataByDateRange = () => {
    if (!startDate && !endDate) {
      // ถ้าไม่ได้ระบุวันที่ให้แสดงข้อมูลทั้งหมด
      setFilteredData(tableData);
      setIsFiltering(false);
      return;
    }

    setIsFiltering(true);
    
    const filtered = tableData.filter(item => {
      if (!item.qc_datetime) return false;
      
      const itemDate = new Date(item.qc_datetime);
      let isInRange = true;
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        isInRange = isInRange && itemDate >= start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        isInRange = isInRange && itemDate <= end;
      }
      
      return isInRange;
    });
    
    setFilteredData(filtered);
  };

  // ฟังก์ชันรีเซ็ตการกรอง
  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
    setFilteredData(tableData);
    setIsFiltering(false);
  };

  const clearData = () => {
    setDataForModal1(null);
    setDataForModal2(null);
    setDataForModal3(null);
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
  
  // ฟังก์ชันที่จะถูกเรียกเมื่อคลิกที่ไอคอนตา
  const handleRowClick = (rowId) => {
    console.log("Row clicked with ID:", rowId);
    
    // ค้นหาข้อมูลแถวจาก rowId
    const rowData = filteredData.find(item => item.mapping_id === rowId);
  };
  
  // สร้างฟังก์ชันเพื่อให้ส่งให้ TableMainPrep
  const handleOpenModal = (data) => {
    console.log("Selected row data:", data);
    // ไม่ต้องเปิด Modal แล้ว เพียงแค่ log ข้อมูล
  };
  
  const handleOpenEditModal = (data) => {
    console.log("Edit row data:", data);
    // ไม่ต้องเปิด Modal แล้ว เพียงแค่ log ข้อมูล
  };

  // ฟังก์ชันสลับการแสดง/ซ่อนการ์ดสรุป
  const toggleSummaryCard = () => {
    setShowSummaryCard(!showSummaryCard);
  };

  return (
    <div>
      {/* ส่วนค้นหาตามช่วงเวลา */}
      <div style={{ 
        marginBottom: '25px', 
        padding: '20px', 
        backgroundColor: 'white', 
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(255, 255, 255, 0.08)',
        border: '1px solid rgb(212, 211, 211)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '15px',
          borderBottom: '1px solid rgb(255, 255, 255)',
          paddingBottom: '10px'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px', 
            color: '#2c3e50', 
            fontWeight: 600 
          }}>
            <span style={{ marginRight: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            ค้นหาตามช่วงเวลา
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* ปุ่มเปิด/ปิดการ์ดสรุป */}
            <button 
              onClick={toggleSummaryCard}
              style={{
                padding: '6px 12px',
                backgroundColor: showSummaryCard ? '#e9eef6' : '#f1f5f9',
                color: showSummaryCard ? '#3b82f6' : '#64748b',
                border: `1px solid ${showSummaryCard ? '#bfdbfe' : '#e2e8f0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {showSummaryCard ? 'ซ่อนสรุปข้อมูล' : 'แสดงสรุปข้อมูล'}
            </button>
            
            {isFiltering && (
              <span style={{
                fontSize: '14px', 
                color: '#007bff', 
                backgroundColor: 'rgba(0, 123, 255, 0.1)', 
                padding: '4px 10px', 
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 500
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '5px' }}>
                  <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="#007bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                กำลังกรอง
              </span>
            )}
          </div>
        </div>
        
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'flex-end'
        }}>
          <div style={{ minWidth: '200px', flex: '1' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              color: '#4a5568',
              fontWeight: '500'
            }}>
              วันที่เริ่มต้น
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                color: '#718096'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ 
                  color: '#000000',
                  padding: '10px 12px 10px 38px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  width: '100%',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(179, 178, 178, 0.05)'
                }}
              />
            </div>
          </div>
          
          <div style={{ minWidth: '200px', flex: '1' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              color: '#4a5568',
              fontWeight: '500'
            }}>
              วันที่สิ้นสุด
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                color: '#718096'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ 
                  color: '#000000',
                  padding: '10px 12px 10px 38px', 
                  borderRadius: '8px', 
                  border: '1px solidrgb(13, 32, 56)',
                  width: '100%',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={filterDataByDateRange}
              style={{
                padding: '10px 18px',
                backgroundColor: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(13, 110, 253, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              ค้นหา
            </button>
            <button
              onClick={resetFilter}
              style={{
                padding: '10px 18px',
                backgroundColor: 'white',
                color: '#6B7280',
                border: '1px solidrgb(15, 16, 16)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3V9H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.05 9C4.36 5.44 7.77 3 11.7 3C16.67 3 20.7 7.03 20.7 12C20.7 16.97 16.67 21 11.7 21C7.97 21 4.71 18.88 3.25 15.68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              รีเซ็ต
            </button>
            
            {/* เพิ่มปุ่มส่งออกเป็น Excel */}
            <ExportExcelButton data={filteredData} />
          </div>
        </div>
        
        {isFiltering && (
          <div style={{ 
            marginTop: '16px', 
            fontSize: '14px', 
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: '12px 16px',
            borderRadius: '8px',
  border: '1px solid #000000', // แก้ไขตรงนี้ (เพิ่มช่องว่างระหว่าง solid กับสี และใช้ # แทน rgb)
            display: 'flex',
            alignItems: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px', color: '#4a5568' }}>
              <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <span style={{ fontWeight: '500' }}>กำลังแสดงผลการค้นหา: </span> 
              <span style={{ fontWeight: '600', color: '#0d6efd' }}>{filteredData.length}</span> รายการ
              {startDate && endDate && (
                <span style={{ marginLeft: '4px' }}>
                  ระหว่างวันที่ <span style={{ fontWeight: '500' , color: '#0d6efd'}}>{new Date(startDate).toLocaleDateString('th-TH')}</span> ถึง 
                  <span style={{ fontWeight: '500' , color: '#0d6efd' }}> {new Date(endDate).toLocaleDateString('th-TH')}</span>
                </span>
              )}
              {startDate && !endDate && (
                <span style={{ marginLeft: '4px' }}>
                  ตั้งแต่วันที่ <span style={{ fontWeight: '500' ,color: '#0d6efd' }}>{new Date(startDate).toLocaleDateString('th-TH')}</span>
                </span>
              )}
              {!startDate && endDate && (
                <span style={{ marginLeft: '4px' }}>
                  จนถึงวันที่ <span style={{ fontWeight: '500' ,color: '#0d6efd'}}>{new Date(endDate).toLocaleDateString('th-TH')}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* การ์ดสรุปน้ำหนัก - แสดงเมื่อ showSummaryCard เป็น true */}
      {!loading && showSummaryCard && <WeightSummaryCard data={filteredData} />}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 150px)' }}>
          <p style={{ color: '#787878', fontSize: '16px' }}>กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <TableMainPrep
          handleOpenModal={handleOpenModal}
          handleOpenEditModal={handleOpenEditModal}
          handleOpenSuccess={handleOpenSuccess}
          data={filteredData || []} 
          handleRowClick={handleRowClick}
        />
      )}
    </div>
  );
};

export default ParentComponent;