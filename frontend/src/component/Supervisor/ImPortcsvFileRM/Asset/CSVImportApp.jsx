import React, { useState, useEffect } from 'react';
import { Upload, Save, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import axios from 'axios';

const CSVImportApp = () => {
  const [csvData, setCsvData] = useState([]);
  const [rawMatGroups, setRawMatGroups] = useState([]);
  const [rawMatTypes, setRawMatTypes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '', show: false });
  const [applyToAll, setApplyToAll] = useState(false);
  const [globalGroupSelection, setGlobalGroupSelection] = useState('');
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchRawMatGroups();
  }, []);

 const fetchRawMatGroups = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/rawmat-groups`);
    setRawMatGroups(response.data);
  } catch (error) {
    showNotification('error', 'ไม่สามารถดึงข้อมูลกลุ่มวัตถุดิบได้');
  }
};


 const fetchRawMatTypes = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/rawmat-types`);
    setRawMatTypes(response.data);
  } catch (error) {
    console.error('Error fetching raw mat types:', error);
  }
};


  useEffect(() => {
    if (rawMatGroups.length > 0) {
      fetchRawMatTypes();
    }
  }, [rawMatGroups]);

  const showNotification = (type, message) => {
    setNotification({ type, message, show: true });
    setTimeout(() => setNotification({ ...notification, show: false }), 5000);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showNotification('error', 'กรุณาเลือกไฟล์ CSV เท่านั้น');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        showNotification('error', 'ไฟล์ CSV ต้องมีข้อมูลอย่างน้อย 2 แถว');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        return {
          id: index,
          mat: values[0] || '',
          mat_name: values[1] || '',
          rm_group_id: '',
          rm_type_id: '',
          rm_group_name: '',
          rm_type_name: ''
        };
      }).filter(row => row.mat && row.mat_name);

      setCsvData(data);
      showNotification('success', `อ่านไฟล์สำเร็จ พบข้อมูล ${data.length} รายการ`);
    };

    reader.readAsText(file);
  };

  const handleGroupSelection = (rowId, groupId) => {
    const selectedGroup = rawMatGroups.find(g => g.rm_group_id == groupId);
    const selectedType = rawMatTypes.find(t => t.rm_type_id == selectedGroup?.rm_type_id);

    setCsvData(prevData => 
      prevData.map(row => 
        row.id === rowId 
          ? {
              ...row,
              rm_group_id: groupId,
              rm_type_id: selectedGroup?.rm_type_id || '',
              rm_group_name: selectedGroup?.rm_group_name || '',
              rm_type_name: selectedType?.rm_type_name || ''
            }
          : row
      )
    );
  };

  const handleApplyToAll = (groupId) => {
    if (!applyToAll) return;

    const selectedGroup = rawMatGroups.find(g => g.rm_group_id == groupId);
    const selectedType = rawMatTypes.find(t => t.rm_type_id == selectedGroup?.rm_type_id);

    setCsvData(prevData => 
      prevData.map(row => ({
        ...row,
        rm_group_id: groupId,
        rm_type_id: selectedGroup?.rm_type_id || '',
        rm_group_name: selectedGroup?.rm_group_name || '',
        rm_type_name: selectedType?.rm_type_name || ''
      }))
    );
    setGlobalGroupSelection(groupId);
  };

  const handleSaveData = async () => {
    // Validate data
    const invalidRows = csvData.filter(row => !row.rm_group_id || !row.rm_type_id);
    if (invalidRows.length > 0) {
      showNotification('error', 'กรุณาเลือกกลุ่มวัตถุดิบให้ครบทุกรายการ');
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = csvData.map(row => ({
        mat: row.mat,
        mat_name: row.mat_name,
        rm_group_id: parseInt(row.rm_group_id),
        rm_type_id: parseInt(row.rm_type_id)
      }));

      const response = await axios.post(`${API_URL}/api/save-materials`, {
        materials: dataToSave
      });

      showNotification('success', `บันทึกข้อมูลสำเร็จ ${response.data.savedCount} รายการ`);
      
      setCsvData([]);
      setSelectedFile(null);
      setGlobalGroupSelection('');
      setApplyToAll(false);
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      showNotification('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSQLTemplate = () => {
    if (csvData.length === 0) {
      showNotification('error', 'ไม่มีข้อมูลสำหรับสร้าง SQL');
      return;
    }

    let sql = "-- SQL Statements for RawMat and RawMatCookedGroup\n\n";
    
    // RawMat INSERT statements
    sql += "-- Insert into RawMat\n";
    csvData.forEach(row => {
      if (row.rm_group_id && row.rm_type_id) {
        sql += `INSERT INTO [PFCMv2].[dbo].[RawMat] ([mat], [mat_name]) VALUES ('${row.mat}', '${row.mat_name}');\n`;
      }
    });
    
    sql += "\n-- Insert into RawMatCookedGroup\n";
    csvData.forEach(row => {
      if (row.rm_group_id && row.rm_type_id) {
        sql += `INSERT INTO [PFCMv2].[dbo].[RawMatCookedGroup] ([mat], [rm_group_id], [rm_type_id]) VALUES ('${row.mat}', ${row.rm_group_id}, ${row.rm_type_id});\n`;
      }
    });

    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'material_insert_statements.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ระบบนำเข้าข้อมูลวัตถุดิบจาก CSV</h1>
        
        {/* Notification */}
        {notification.show && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
              {notification.message}
            </div>
            <button onClick={() => setNotification({...notification, show: false})}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. เลือกไฟล์ CSV</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csvFile"
            />
            <label htmlFor="csvFile" className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-800 font-medium">เลือกไฟล์ CSV</span>
              <span className="text-gray-500"> หรือลากไฟล์มาวางที่นี่</span>
            </label>
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">ไฟล์ที่เลือก: {selectedFile.name}</p>
            )}
          </div>
        </div>

        {/* Data Table Section */}
        {csvData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">2. กำหนดกลุ่มวัตถุดิบ</h2>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="mr-2"
                  />
                  เลือกกลุ่มเดียวกันทั้งหมด
                </label>
                {applyToAll && (
                  <select
                    value={globalGroupSelection}
                    onChange={(e) => handleApplyToAll(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">เลือกกลุ่มวัตถุดิบ</option>
                    {rawMatGroups.map(group => (
                      <option key={group.rm_group_id} value={group.rm_group_id}>
                        {group.rm_group_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">รหัสวัตถุดิบ</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">ชื่อวัตถุดิบ</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">กลุ่มวัตถุดิบ</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">ประเภทวัตถุดิบ</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{row.mat}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.mat_name}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {!applyToAll ? (
                          <select
                            value={row.rm_group_id}
                            onChange={(e) => handleGroupSelection(row.id, e.target.value)}
                            className={`w-full border rounded px-2 py-1 ${
                              !row.rm_group_id ? 'border-red-500 text-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="" className="text-red-500">เลือกกลุ่มวัตถุดิบ</option>
                            {rawMatGroups.map(group => (
                              <option key={group.rm_group_id} value={group.rm_group_id}>
                                {group.rm_group_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`${!row.rm_group_name ? 'text-red-500' : 'text-gray-900'}`}>
                            {row.rm_group_name || 'เลือกกลุ่มวัตถุดิบ'}
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className={`${!row.rm_type_name ? 'text-red-500' : 'text-gray-900'}`}>
                          {row.rm_type_name || 'เลือกกลุ่มวัตถุดิบ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={downloadSQLTemplate}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                ดาวน์โหลด SQL
              </button>
              
              <button
                onClick={handleSaveData}
                disabled={isLoading || csvData.some(row => !row.rm_group_id)}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">คำแนะนำการใช้งาน</h3>
          <ul className="text-blue-800 space-y-2">
            <li>• ไฟล์ CSV ต้องมีคอลัมน์: mat, mat_name</li>
            <li>• เลือกกลุ่มวัตถุดิบสำหรับแต่ละรายการ</li>
            <li>• ประเภทวัตถุดิบจะถูกกำหนดอัตโนมัติตามกลุ่มที่เลือก</li>
            <li>• ระบบจะข้ามข้อมูลที่มีอยู่แล้วในฐานข้อมูล</li>
            <li>• สามารถดาวน์โหลดไฟล์ SQL เพื่อตรวจสอบก่อนบันทึก</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CSVImportApp;