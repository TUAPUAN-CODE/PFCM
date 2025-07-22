import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Button } from '@mui/material';
import HistoryTablePage from './table';
import Printer from './PrinterComponent';
import MixDetailsDialog from './MixDetailsDialog';

const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [isMixDetailsOpen, setIsMixDetailsOpen] = useState(false);
  const [selectedMixDetails, setSelectedMixDetails] = useState(null);

  // ฟังก์ชั่นช่วยในการ normalize ข้อมูล tro_id เพื่อให้จัดกลุ่มได้ถูกต้อง
  const normalizeTrolleyId = (trolleyId) => {
    if (!trolleyId) return null;
    // แปลงเป็น string และ trim ช่องว่าง
    return String(trolleyId).trim();
  };

  const fetchAndGroupData = async () => {
    try {
      setLoading(true);
      const lineId = localStorage.getItem("line_id");
      console.log("line_id from localStorage:", lineId);
      
      if (!lineId) {
        throw new Error("ไม่พบ line_id ใน localStorage");
      }
  
      const [regularResponse, mixResponse] = await Promise.all([
        fetch(`${API_URL}/api/pack/history/All/${lineId}`, { credentials: "include" }),
        fetch(`${API_URL}/api/pack/history/All/mix/${lineId}`, { credentials: "include" }),
      ]);
      
      if (!regularResponse.ok) {
        throw new Error(`HTTP error for regular data! status: ${regularResponse.status}`);
      }
      
      if (!mixResponse.ok) {
        throw new Error(`HTTP error for mix data! status: ${mixResponse.status}`);
      }
  
      const regularResult = await regularResponse.json();
      const mixResult = await mixResponse.json();
  
      if (regularResult.success && mixResult.success) {
        // แปลงข้อมูลและ normalize trolley IDs
        const regularItems = regularResult.data.map(item => ({ 
          ...item, 
          dataType: 'regular',
          tro_id: normalizeTrolleyId(item.tro_id)
        }));
        
        const mixItems = mixResult.data.map(item => ({ 
          ...item, 
          dataType: 'mix', 
          isMixed: true,
          tro_id: normalizeTrolleyId(item.tro_id)
        }));
        
        const allItems = [...regularItems, ...mixItems];
        
        // จัดกลุ่มข้อมูลใหม่โดยใช้รถเข็นเป็นหลัก
        const trolleyGroups = {};
        
        // จัดกลุ่มตามรถเข็นก่อน (โดยไม่แบ่งตาม mix_code)
        allItems.forEach(item => {
          if (item.tro_id) {
            if (!trolleyGroups[item.tro_id]) {
              trolleyGroups[item.tro_id] = [];
            }
            trolleyGroups[item.tro_id].push(item);
          }
        });
        
        // สร้างข้อมูลกลุ่มสำหรับแต่ละรถเข็น
        const groupedData = {};
        
        // สร้างกลุ่มจากรถเข็น
        Object.keys(trolleyGroups).forEach(troId => {
          const items = trolleyGroups[troId];
          const firstItem = items[0];
          
          // ตรวจสอบว่ามีรายการ mix ในรถเข็นนี้หรือไม่
          const hasMixItems = items.some(item => item.dataType === 'mix' || item.mix_code);
          const mixItems = items.filter(item => item.dataType === 'mix' || item.mix_code);
          
          // ใช้ mix_code ตัวแรกที่พบ (ถ้ามี)
          const firstMixCode = mixItems.length > 0 ? mixItems[0].mix_code : null;
          
          // สร้าง key ที่ไม่ซ้ำสำหรับกลุ่มนี้
          const groupKey = `trolley_${troId}`;
          
          groupedData[groupKey] = {
            ...firstItem,
            isGrouped: true,
            groupKey: groupKey,
            hasBoth: hasMixItems,
            isMixed: hasMixItems,
            tro_id: troId,
            mix_code: firstMixCode,  // ใช้รหัสผสมตัวแรกที่พบในกลุ่ม
            groupLabel: troId,
            itemCount: items.length,
            groupItems: items,
            regularItems: items.filter(item => item.dataType === 'regular'),
            mixItems: mixItems
          };
        });
        
        // จัดการกับรายการที่มีเฉพาะรหัสผสม (mix_code) แต่ไม่มี tro_id
        const mixOnlyItems = allItems.filter(item => !item.tro_id && item.mix_code);
        const mixOnlyGroups = {};
        
        mixOnlyItems.forEach(item => {
          const mixCode = item.mix_code;
          if (!mixOnlyGroups[mixCode]) {
            mixOnlyGroups[mixCode] = [];
          }
          mixOnlyGroups[mixCode].push(item);
        });
        
        // สร้างกลุ่มสำหรับแต่ละ mix_code ที่ไม่มี tro_id
        Object.keys(mixOnlyGroups).forEach(mixCode => {
          const items = mixOnlyGroups[mixCode];
          const firstItem = items[0];
          const groupKey = `mix_${mixCode}`;
          
          groupedData[groupKey] = {
            ...firstItem,
            isGrouped: true,
            groupKey: groupKey,
            hasBoth: false,
            isMixed: true,
            mix_code: mixCode,
            tro_id: null,
            groupLabel: mixCode,
            itemCount: items.length,
            groupItems: items,
            regularItems: items.filter(item => item.dataType === 'regular'),
            mixItems: items.filter(item => item.dataType === 'mix')
          };
        });
        
        // จัดการกับรายการที่ไม่มีทั้ง tro_id และ mix_code
        const individualItems = allItems.filter(item => !item.tro_id && !item.mix_code);
        
        individualItems.forEach(item => {
          const individualKey = `individual_${Math.random()}`;
          groupedData[individualKey] = {
            ...item,
            isGrouped: false,
            itemCount: 1,
            groupItems: [item]
          };
        });
        
        const finalData = Object.values(groupedData);
        setData(finalData);
      } else {
        setError((regularResult.message || mixResult.message) || 'ดึงข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndGroupData();
  }, []);

  const handleRetry = () => {
    setError(null);
    fetchAndGroupData();
  };

  const handleOpenPrinter = (rowData) => {
    console.log("Print data:", rowData);
    
    if (rowData.isGrouped && rowData.groupItems) {
      const materialsData = {
        ...rowData,
        materials: rowData.groupItems.map(item => ({
          ...item,
        }))
      };
      setSelectedData(materialsData);
    } else {
      setSelectedData(rowData);
    }
    setIsPrinterOpen(true);
  };

  const handleClosePrinter = () => {
    setIsPrinterOpen(false);
    setSelectedData(null);
  };

  const handleViewDetails = (groupData) => {
    if (groupData.isGrouped && groupData.groupItems) {
      setSelectedMixDetails(groupData);
      setIsMixDetailsOpen(true);
    }
  };

  const handleCloseMixDetails = () => {
    setIsMixDetailsOpen(false);
    setSelectedMixDetails(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ margin: 2 }}>
        {error}
        <Button
          variant="contained"
          color="primary"
          sx={{ ml: 2 }}
          onClick={handleRetry}
        >
          ลองใหม่
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      <HistoryTablePage
        data={data}
        onPrint={handleOpenPrinter}
        onViewDetails={handleViewDetails}
      />

      <Printer
        open={isPrinterOpen}
        onClose={handleClosePrinter}
        data={selectedData}
      />

      <MixDetailsDialog
        open={isMixDetailsOpen}
        onClose={handleCloseMixDetails}
        mixData={selectedMixDetails}
        onPrint={handleOpenPrinter}
      />
    </Box>
  );
};

export default ParentComponent;