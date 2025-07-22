import React, { useState, useEffect } from 'react';
import Table from './Table';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
const API_URL = import.meta.env.VITE_API_URL;

const ParentComponent = () => {
  const [tableData, setTableData] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const formatDateForAPI = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', formatDateForAPI(startDate));
      if (endDate) params.append('endDate', formatDateForAPI(endDate));

      const response = await fetch(`${API_URL}/api/get/DelayTime/Tracking?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        setTableData(null);
        setRawData([]);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setTableData(null);
        setRawData([]);
        return;
      }

      const data = await response.json();

      if (data.success && data.data && Object.keys(data.data).length > 0) {
        setTableData(data.data);
        setRawData(data.data);
        const firstGroup = Object.keys(data.data)[0];
        setSelectedGroup(firstGroup);
      } else {
        setTableData(null);
        setRawData([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setTableData(null);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDateFilter = () => {
    fetchData();
  };

  const resetDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    fetchData();
  };

  const exportToExcel = async () => {
  try {
    setLoading(true);
    
    // สร้างพารามิเตอร์สำหรับ API ตามวันที่ที่เลือก
    const params = new URLSearchParams();
    
    // กรณีเลือกแค่ startDate ให้ใช้จนถึงวันปัจจุบัน
    if (startDate && !endDate) {
      params.append('startDate', formatDateForAPI(startDate));
      params.append('endDate', formatDateForAPI(new Date()));
    } 
    // กรณีเลือกแค่ endDate ให้ใช้ข้อมูลทั้งหมดจนถึง endDate
    else if (!startDate && endDate) {
      params.append('endDate', formatDateForAPI(endDate));
    }
    // กรณีเลือกทั้งคู่
    else if (startDate && endDate) {
      params.append('startDate', formatDateForAPI(startDate));
      params.append('endDate', formatDateForAPI(endDate));
    }
    
    // เรียก API เพื่อขอข้อมูลตามวันที่ที่เลือก
    const response = await fetch(`${API_URL}/api/get/DelayTime/Tracking?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data for export');
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format');
    }

    const data = await response.json();

    if (!data.success || !data.data || Object.keys(data.data).length === 0) {
      throw new Error('No data available for export');
    }

    // เตรียมข้อมูลสำหรับ Excel
    const exportData = [];
    
    Object.values(data.data).forEach(groupData => {
      if (groupData.rawDataSample && groupData.rawDataSample.length > 0) {
        groupData.rawDataSample.forEach(row => {
          exportData.push({
            'Line': row.rmm_line_name,
            'Group': row.rm_group_name,
            'ชนิด RM': row.rm_type_name,
            'เตรียม->เข้าห้องเย็น (นาที)': row.ptc_time_minutes,
            'เข้า->ออกห้องเย็น (นาที)': row.cold_time_minutes,
            'ออกห้องเย็น->บรรจุเสร็จ (นาที)': row.ctp_time_minutes,
            'เตรียม->บรรจุเสร็จ (นาที)': row.ptp_time_minutes,
            'วันที่ต้มเสร็จ/อบเสร็จ': row.cooked_date,
            'วันที่เตรียมเสร็จ': row.rmit_date,
            'วันที่ Qc ตรวจสอบ': row.qc_date,
            'วันที่เข้าห้องเย็นครั้งที่ 1': row.come_cold_date,
            'วันที่ออกห้องเย็น ครั้ง 1': row.out_cold_date,
            'วันที่เข้าห้องเย็นครั้งที่ 2': row.come_cold_date_two,
            'วันที่ออกห้องเย็น ครั้ง 2': row.out_cold_date_two,
            'วันที่เข้าห้องเย็นครั้งที่ 3': row.come_cold_date_three,
            'วันที่ออกห้องเย็น ครั้ง 3': row.out_cold_date_three,
            'วันที่แก้ไขวัตถุดิบ': row.rework_date,
            'วันที่บรรจุเสร็จสิ้น': row.sc_pack_date
          });
        });
      }
    });

    if (exportData.length === 0) {
      alert('No data available for export');
      return;
    }

    // สร้างชื่อไฟล์ตามวันที่ที่เลือก
    let fileName = 'DelayTimeTracking';
    
    if (startDate && endDate) {
      fileName += `_${formatDateForAPI(startDate)}_to_${formatDateForAPI(endDate)}`;
    } else if (startDate) {
      fileName += `_from_${formatDateForAPI(startDate)}`;
    } else if (endDate) {
      fileName += `_until_${formatDateForAPI(endDate)}`;
    } else {
      fileName += `_all_data`;
    }

    // สร้าง Excel
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DelayTimeTracking");
    XLSX.writeFile(wb, `${fileName}.xlsx`);

  } catch (err) {
    console.error('Export error:', err);
    alert(`Error exporting data: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  const renderFilterSection = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">กรองตามวันที่เสร็จสิ้นการบรรจุ</h2>
      <div className="flex flex-wrap gap-6 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">เริ่มต้นวันที่</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4aaaec] focus:ring focus:ring-[#4aaaec] focus:ring-opacity-50 px-3 py-2 border"
            dateFormat="yyyy-MM-dd"
            isClearable
            placeholderText="Select start date"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4aaaec] focus:ring focus:ring-[#4aaaec] focus:ring-opacity-50 px-3 py-2 border"
            dateFormat="yyyy-MM-dd"
            isClearable
            placeholderText="Select end date"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDateFilter}
            className="px-4 py-2 bg-[#4aaaec] text-white rounded-md hover:bg-[#3a92d4] focus:outline-none focus:ring-2 focus:ring-[#4aaaec] focus:ring-opacity-50 transition-colors"
          >
            ยืนยัน
          </button>
          <button
            onClick={resetDateFilter}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors"
          >
            รีเซ็ต
          </button>
        </div>
      </div>
      {(startDate || endDate) && (
        <div className="mt-3 text-sm text-gray-600 bg-blue-50 p-2 rounded">
          Showing data where packing completed between: 
          {startDate && ` ${formatDateForAPI(startDate)}`}
          {endDate && ` to ${formatDateForAPI(endDate)}`}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        {renderFilterSection()}
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4aaaec]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-6">
        {renderFilterSection()}
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Error: {error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tableData || Object.keys(tableData).length === 0) {
    return (
      <div className="p-4 space-y-6">
        {renderFilterSection()}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {startDate || endDate ? "No data found for selected date range" : "No data available"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {startDate || endDate 
                ? "Please try a different date range or reset the filter" 
                : "There is currently no data in the system"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {renderFilterSection()}
      
      {/* Controls Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="w-full md:w-1/2">
          <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Raw Material Group:
          </label>
          <select
            id="group-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4aaaec] focus:ring focus:ring-[#4aaaec] focus:ring-opacity-50 px-3 py-2 border"
          >
            {Object.keys(tableData).map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-[#008000] text-white rounded-md hover:bg-[#3a92d4] focus:outline-none focus:ring-2 focus:ring-[#4aaaec] focus:ring-opacity-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to Excel
        </button>
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table data={tableData[selectedGroup]} />
      </div>
    </div>
  );
};

export default ParentComponent;