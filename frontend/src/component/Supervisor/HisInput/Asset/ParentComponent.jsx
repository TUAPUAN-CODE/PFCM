import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  TextField, 
  InputAdornment, 
  Paper, 
  Typography, 
  CircularProgress,
  IconButton,
  Button,
  Collapse,
  Chip,
  Divider,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ColdStorageTable from "./Table";

const API_URL = import.meta.env.VITE_API_URL;

// ปุ่มสำหรับกรองข้อมูล

const ParentComponent = () => {
  // State สำหรับข้อมูลดิบที่ได้จาก API และข้อมูลที่กรองแล้ว
  const [allColdStorageData, setAllColdStorageData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State สำหรับการค้นหาและกรอง
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColor, setSelectedColor] = useState('');
  
  // State สำหรับการค้นหาตามช่วงเวลา
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDateFiltering, setIsDateFiltering] = useState(false);
  const [filterType, setFilterType] = useState('exit'); // 'exit' สำหรับออกห้องเย็น, 'enter' สำหรับเข้าห้องเย็น
  
  // State สำหรับ Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalRows, setTotalRows] = useState(0);
  
  // State สำหรับเก็บพารามิเตอร์การดึงข้อมูลปัจจุบัน
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: 20
  });

  // ดึงข้อมูลจาก API
  useEffect(() => {
    const fetchColdStorageData = async () => {
      try {
        setLoading(true);
        
        // คำนวณพารามิเตอร์สำหรับการเรียก API
        const params = {
          page: page + 1,
          pageSize: rowsPerPage
        };
        
        // เพิ่มพารามิเตอร์สถานะ (ถ้ามี)
        if (selectedColor) {
          params.status = { 
            green: 'ออกห้องเย็น', 
            yellow: 'รอดำเนินการ', 
            red: 'เข้าห้องเย็น' 
          }[selectedColor];
        }
        
        // เพิ่ม params สำหรับการกรองตามวันที่
        if (isDateFiltering && startDate && endDate) {
          params.startDate = `${startDate}`;
          params.endDate = `${endDate}`;
          params.filterType = filterType;
        }

        // บันทึกพารามิเตอร์ที่ใช้ในการดึงข้อมูลปัจจุบัน
        setQueryParams(params);
        
        console.log('ส่งคำขอข้อมูลด้วยพารามิเตอร์:', params);
        const response = await axios.get(`${API_URL}/api/coldstorage/history`, { params });

        console.log('ได้รับข้อมูลจาก API:', response.data);

        // ตรวจสอบและจัดการข้อมูล
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          // เก็บข้อมูลทั้งหมดที่ได้จาก API
          setAllColdStorageData(response.data.data);
          setFilteredData(response.data.data);
          setTotalRows(response.data.total || response.data.data.length);
          
          console.log(`พบข้อมูล ${response.data.data.length} รายการ จากทั้งหมด ${response.data.total} รายการ`);
          
          // ถ้าไม่พบข้อมูลและมีการกรองวันที่ แสดงข้อความแจ้งเตือน
          if (response.data.data.length === 0 && isDateFiltering) {
            alert(`ไม่พบข้อมูล${filterType === 'exit' ? 'ออก' : 'เข้า'}ห้องเย็นในช่วงวันที่ ${new Date(startDate).toLocaleDateString('th-TH')} - ${new Date(endDate).toLocaleDateString('th-TH')}`);
          }
        } else {
          console.error("รูปแบบข้อมูลไม่ถูกต้อง:", response.data);
          setError("รูปแบบข้อมูลไม่ถูกต้อง");
        }
        
        setLoading(false);
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
        setError(`ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ${err.message}`);
        setLoading(false);
      }
    };

    fetchColdStorageData();
  }, [page, rowsPerPage, selectedColor, isDateFiltering && startDate, isDateFiltering && endDate, isDateFiltering && filterType]);

  // ฟังก์ชันสำหรับกรองข้อมูลโดยใช้ searchTerm (ทำงานเฉพาะ client-side)
  useEffect(() => {
    // ถ้าไม่มีข้อมูลหรือ searchTerm ว่างเปล่า ให้แสดงข้อมูลทั้งหมด
    if (!allColdStorageData.length || !searchTerm.trim()) {
      setFilteredData(allColdStorageData);
      return;
    }
    
    // กรองข้อมูลตาม searchTerm (ตัวอย่างเช่นค้นหาตามชื่อ, ID หรือข้อมูลอื่นๆ)
    // const filtered = allColdStorageData.filter(item => {
    //   // ตรวจสอบว่า searchTerm มีค่าหรือไม่
    //   if (!searchTerm) return true;
      
    //   const term = searchTerm.toLowerCase();
      
    //   return (
    //     // ค้นหาตาม trolleyId หรือ tro_id จากข้อมูล SQL
    //     (item.trolleyId && item.trolleyId.toString().toLowerCase().includes(term)) ||
    //     (item.tro_id && item.tro_id.toString().toLowerCase().includes(term)) ||
        
    //     // ค้นหาด้วยฟิลด์อื่นๆ
    //     (item.rawMaterialName && item.rawMaterialName.toLowerCase().includes(term)) ||
    //     (item.code && item.code.toString().toLowerCase().includes(term)) ||
    //     (item.batch && item.batch.toString().toLowerCase().includes(term)) ||
    //     (item.mat && item.mat.toString().toLowerCase().includes(term)) ||
    //     (item.come_cold_date && item.come_cold_date.toString().toLowerCase().includes(term)) ||
    //     (item.slot_id && item.slot_id.toString().toLowerCase().includes(term))
    //   );
    // });
    const filtered = allColdStorageData.filter(item => {
      // ถ้าไม่มี searchTerm ให้แสดงทั้งหมด
      if (!searchTerm) return true;
      
      const term = searchTerm.toLowerCase();
      
      // สร้างฟังก์ชันสำหรับตรวจสอบวันที่
      const matchesDate = (dateString) => {
        if (!dateString) return false;
        
        // ทดสอบการค้นหาแบบตรงๆ ก่อน
        if (dateString.toLowerCase().includes(term)) return true;
        
        try {
          const itemDate = new Date(dateString);
          
          // รูปแบบวันที่ต่างๆ
          const day = itemDate.getDate();
          const month = itemDate.getMonth() + 1;
          const yearAD = itemDate.getFullYear();
          const yearBE = yearAD + 543; // แปลงเป็นปี พ.ศ.
          
          // ปรับให้วันที่และเดือนเป็นเลข 2 หลักเสมอ (01, 02, ...)
          const dayStr = day.toString().padStart(2, '0');
          const monthStr = month.toString().padStart(2, '0');
          
          // สร้างรูปแบบวันที่ต่างๆ ที่อาจใช้ค้นหา
          const formats = [
            // รูปแบบไทย (พ.ศ.)
            `${dayStr}/${monthStr}/${yearBE}`,
            `${dayStr}-${monthStr}-${yearBE}`,
            `${dayStr}.${monthStr}.${yearBE}`,
            // รูปแบบสากล (ค.ศ.)
            `${dayStr}/${monthStr}/${yearAD}`,
            `${dayStr}-${monthStr}-${yearAD}`,
            `${dayStr}.${monthStr}.${yearAD}`,
            // รูปแบบอเมริกัน
            `${monthStr}/${dayStr}/${yearAD}`,
            `${monthStr}-${dayStr}-${yearAD}`,
            // รูปแบบ ISO
            `${yearAD}-${monthStr}-${dayStr}`,
            // แบบไม่มีศูนย์นำหน้า
            `${day}/${month}/${yearBE}`,
            `${day}/${month}/${yearAD}`,
            `${day}-${month}-${yearBE}`,
            `${day}-${month}-${yearAD}`
          ];
          
          // ตรวจสอบว่า searchTerm ตรงกับรูปแบบใดรูปแบบหนึ่งหรือไม่
          return formats.some(format => format.includes(term));
        } catch (e) {
          return false;
        }
      };
    
      return (
        // ค้นหาตามฟิลด์อื่นๆ เหมือนเดิม...
        (item.trolleyId && item.trolleyId.toString().toLowerCase().includes(term)) ||
        (item.tro_id && item.tro_id.toString().toLowerCase().includes(term)) ||
        (item.rawMaterialName && item.rawMaterialName.toLowerCase().includes(term)) ||
        (item.code && item.code.toString().toLowerCase().includes(term)) ||
        (item.batch && item.batch.toString().toLowerCase().includes(term)) ||
        (item.mat && item.mat.toString().toLowerCase().includes(term)) ||
        (item.slot_id && item.slot_id.toString().toLowerCase().includes(term)) ||
        
        // ค้นหาตามวันที่ต่างๆ
        matchesDate(item.come_cold_date) ||
        matchesDate(item.enterColdTime1) ||
        matchesDate(item.exitColdTime1) ||
        matchesDate(item.enterColdTime2) ||
        matchesDate(item.exitColdTime2) ||
        matchesDate(item.enterColdTime3) ||
        matchesDate(item.exitColdTime3) ||
        matchesDate(item.cooked_date) ||
        matchesDate(item.rmit_date) ||
        matchesDate(item.prepCompleteTime)
      );
    });
    
    setFilteredData(filtered);
  }, [searchTerm, allColdStorageData]);

  // จัดการการเปลี่ยนหน้า - ต้องดึงข้อมูลใหม่จาก API
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // จัดการการเปลี่ยนจำนวนแถวต่อหน้า - ต้องดึงข้อมูลใหม่จาก API
  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // จัดการการเปลี่ยนฟิลเตอร์สี - ต้องดึงข้อมูลใหม่จาก API
  const handleFilterChange = (color) => {
    setSelectedColor(color === selectedColor ? '' : color);
    // รีเซ็ตเพจเมื่อเปลี่ยนการกรอง
    setPage(0);
  };
  
  // จัดการการค้นหาตามช่วงเวลา - ต้องดึงข้อมูลใหม่จาก API
  const handleDateSearch = () => {
    if (!startDate || !endDate) {
      alert('กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุด');
      return;
    }
    
    // ตรวจสอบช่วงวันที่
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      alert('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
      return;
    }
    
    console.log(`กำลังค้นหาข้อมูล ${filterType === 'exit' ? 'ออกห้องเย็น' : 'เข้าห้องเย็น'} ระหว่างวันที่ ${startDate} ถึง ${endDate}`);
    
    setIsDateFiltering(true);
    // กลับไปหน้าแรกเมื่อมีการค้นหาใหม่
    setPage(0);
  };
  
  // รีเซ็ตการค้นหาตามช่วงเวลา
  const handleResetDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsDateFiltering(false);
    // รีเซ็ตเพจเมื่อเปลี่ยนการกรอง
    setPage(0);
  };
  
  // จัดการการปิดแสดงการกรองวันที่
  const handleCloseDateFilter = () => {
    setShowDateFilter(false);
    // ถ้ามีการกรองอยู่แล้ว ให้คงไว้
    if (!isDateFiltering) {
      setStartDate('');
      setEndDate('');
    }
  };

  // จัดการการเปลี่ยนแปลงข้อความค้นหา (ทำงานเฉพาะ client-side)
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // แสดงสถานะการค้นหาตามช่วงเวลา
  const getDateFilterChipLabel = () => {
    const filterTypeText = filterType === 'exit' ? 'ออกห้องเย็น' : 'เข้าห้องเย็น';
    return `${filterTypeText}: ${startDate ? new Date(startDate).toLocaleDateString('th-TH') : '...'} - ${endDate ? new Date(endDate).toLocaleDateString('th-TH') : '...'}`;
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
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        alignItems: 'center', 
        gap: 1, 
        paddingX: 2, 
        height: { xs: 'auto', sm: '60px' }, 
        margin: '5px 5px' 
      }}>
        <TextField
          variant="outlined"
          fullWidth
          placeholder="พิมพ์เพื่อค้นหา..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: { height: "40px" },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              height: "40px",
              fontSize: "14px",
              borderRadius: "8px",
              color: "#787878",
            },
            "& input": {
              padding: "8px",
            },
          }}
        />
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-start", alignItems: "center" }}>
          
          <IconButton 
            sx={{ 
              border: '1px solid #cbcbcb', 
              borderRadius: '5px',
              padding: '7px',
              color: showDateFilter || isDateFiltering ? '#1976d2' : 'inherit',
              backgroundColor: showDateFilter || isDateFiltering ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
            }}
            onClick={() => setShowDateFilter(!showDateFilter)}
          >
            <DateRangeIcon fontSize="medium" />
          </IconButton>
          
          {isDateFiltering && (
            <Chip 
              label={getDateFilterChipLabel()} 
              color="primary" 
              variant="outlined"
              size="small"
              onDelete={handleResetDateFilter}
              sx={{ height: '32px' }}
            />
          )}
        </Box>
      </Box>
      
      {/* ส่วนค้นหาตามช่วงเวลา */}
      <Collapse in={showDateFilter}>
        <Box 
          sx={{ 
            mx: 2, 
            my: 1, 
            p: 2, 
            border: '1px solid #e0e0e0', 
            borderRadius: '8px',
            bgcolor: 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500, color: '#333' }}>
              <CalendarTodayIcon fontSize="small" />
              ค้นหาตามช่วงเวลา
            </Typography>
            <IconButton size="small" onClick={handleCloseDateFilter}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {/* เลือกประเภทการกรอง (เข้า/ออกห้องเย็น) */}
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              เลือกประเภทการกรอง:
            </Typography>
            <RadioGroup
              row
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <FormControlLabel value="enter" control={<Radio size="small" />} label="เข้าห้องเย็น" />
              <FormControlLabel value="exit" control={<Radio size="small" />} label="ออกห้องเย็น" />
            </RadioGroup>
          </FormControl>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
            <TextField
              label="วันที่เริ่มต้น"
              type="date"
              fullWidth
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="วันที่สิ้นสุด"
              type="date"
              fullWidth
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleResetDateFilter}
              sx={{ borderRadius: '4px' }}
            >
              รีเซ็ต
            </Button>
            <Button 
              variant="contained" 
              size="small" 
              onClick={handleDateSearch}
              sx={{ borderRadius: '4px' }}
              startIcon={<FilterAltIcon />}
              disabled={!startDate || !endDate}
            >
              ค้นหา
            </Button>
          </Box>
        </Box>
      </Collapse>

      {/* แสดงข้อความจำนวนผลลัพธ์ */}
      {searchTerm && (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            พบ {filteredData.length} รายการจากคำค้นหา "{searchTerm}"
          </Typography>
        </Box>
      )}

      {/* ตารางข้อมูล */}
      <ColdStorageTable 
        filteredData={filteredData}
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