import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import CSVTable from './Table';
import ModalSuccess from './modalsuccess';

const ParentComponent = () => {
  const [csvData, setCsvData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [availableSuffixes, setAvailableSuffixes] = useState([]);
  const [selectedSuffixes, setSelectedSuffixes] = useState([]);
  const [filteredColumnsData, setFilteredColumnsData] = useState([]);
  const defaultSuffixes = ['_1', '_7', '_8', '_11', '_13', '_14', '_15'];

  // ค้นหา suffixes ที่มีในไฟล์ CSV
  useEffect(() => {
    if (headers.length > 0) {
      const suffixes = new Set();
      headers.forEach(header => {
        const match = header.match(/_\d+$/);
        if (match) {
          suffixes.add(match[0]);
        }
      });
      const allSuffixes = Array.from(suffixes).sort();
      setAvailableSuffixes(allSuffixes);
      
      // เลือก suffix ที่เป็นค่าเริ่มต้นที่มีอยู่ในไฟล์
      const initialSelectedSuffixes = defaultSuffixes.filter(suffix => 
        allSuffixes.includes(suffix)
      );
      setSelectedSuffixes(initialSelectedSuffixes);
    }
  }, [headers]);

  // Filter data based on selected suffixes
  useEffect(() => {
    if (csvData.length > 0 && headers.length > 0 && selectedSuffixes.length > 0) {
      const suffixColumns = {};
      selectedSuffixes.forEach(suffix => {
        suffixColumns[suffix] = headers.filter(header => header.endsWith(suffix));
      });
  
      let lastValid10 = null;
      let lastValid8 = null;
  
      const filtered = csvData.map((row, index, arr) => {
        // จัดการกับคอลัมน์ _10 ถ้ามีการเลือก
        if (selectedSuffixes.includes('_10')) {
          suffixColumns['_10'].forEach(column => {
            const value = row[column];
            if (value !== null && value !== undefined && value !== '' && String(value).length <= 4) {
              lastValid10 = value;
            } else if (lastValid10 !== null) {
              row[column] = lastValid10;
            }
          });
        }

        // จัดการกับคอลัมน์ _8 ถ้ามีการเลือก
        if (selectedSuffixes.includes('_8')) {
          suffixColumns['_8'].forEach(column => {
            const value = row[column];
            if (value !== null && value !== undefined && value !== '' && String(value).length <= 5) {
              lastValid8 = value;
            } else if (lastValid8 !== null) {
              row[column] = lastValid8;
            }
          });
        }
  
        // ตรวจสอบว่ามีข้อมูลครบทุก suffix ที่เลือกหรือไม่
        const hasAllRequiredData = selectedSuffixes.every(suffix => {
          const columns = suffixColumns[suffix];
          return columns.some(column => {
            const value = row[column];
            return value !== null && value !== undefined && value !== '';
          });
        });
  
        // หากไม่ valid แถวก่อนหน้า จะเติมค่า Doc.No ให้ Rawmat
        if (selectedSuffixes.includes('_10')) {
          const original10Valid = suffixColumns['_10'].every(column => {
            const value = row[column];
            return value === null || value === undefined || value === '' || String(value).length <= 4;
          });
    
          if (!original10Valid && index > 0) {
            row['Rawmat'] = arr[index - 1]['Doc.No'];
          }
        }

        // เพิ่มการตรวจสอบสำหรับ _8
        if (selectedSuffixes.includes('_8')) {
          const original8Valid = suffixColumns['_8'].every(column => {
            const value = row[column];
            return value === null || value === undefined || value === '' || String(value).length <= 5;
          });
    
          if (!original8Valid && index > 0) {
            row['Rawmat'] = arr[index - 1]['Doc.No'];
          }
        }
  
        return hasAllRequiredData ? row : null;
      }).filter(row => row !== null);
  
      setFilteredData(filtered);
      
      // สร้างข้อมูลเฉพาะคอลัมน์ที่ต้องการสำหรับส่งไป API
      const suffixOnlyColumns = [];
      selectedSuffixes.forEach(suffix => {
        suffixOnlyColumns.push(...suffixColumns[suffix]);
      });
      
      // เพิ่ม Doc.No และ Rawmat เข้าไปด้วย
      suffixOnlyColumns.push('Doc.No', 'Rawmat');
      
      // กรองข้อมูลให้เหลือเฉพาะคอลัมน์ที่ต้องการ
      const filteredColumnsOnly = filtered.map(row => {
        const newRow = {};
        suffixOnlyColumns.forEach(column => {
          if (column in row) {
            newRow[column] = row[column];
          }
        });
        return newRow;
      });
      
      // ตัดข้อมูลลำดับที่ 0 ออก เริ่มแสดงตั้งแต่ลำดับที่ 1
      const finalFilteredData = filteredColumnsOnly.slice(1);
      
      setFilteredColumnsData(finalFilteredData);
    }
  }, [csvData, headers, selectedSuffixes]);

  // Handle suffix selection
  const handleSuffixChange = (suffix) => {
    setSelectedSuffixes(prev => {
      if (prev.includes(suffix)) {
        return prev.filter(s => s !== suffix);
      } else {
        return [...prev, suffix].sort();
      }
    });
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setShowModal(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const results = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          encoding: 'UTF-8'
        });

        const originalHeaders = results.meta.fields;
        const cleanHeaders = originalHeaders.map(h => h.trim());

        // Clean each row's keys as well
        const cleanedData = results.data.map(row => {
          const cleanedRow = {};
          originalHeaders.forEach((originalKey, index) => {
            const trimmedKey = cleanHeaders[index];
            cleanedRow[trimmedKey] = row[originalKey];
          });
          return cleanedRow;
        });

        // ลบรายการแรก หากพบว่าเป็น header ซ้ำ
        const firstRow = cleanedData[0];
        const isHeaderRow = Object.values(firstRow).every(value => 
          typeof value === 'string' && value.trim() === value);
        const finalData = isHeaderRow ? cleanedData.slice(1) : cleanedData;

        setCsvData(finalData);
        setHeaders(cleanHeaders);
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing CSV data:', error);
        setIsLoading(false);
        setShowModal(true);
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      setIsLoading(false);
      setShowModal(true);
    };

    reader.readAsText(file);
  };

  // Handle import to database
  const handleImport = () => {
    if (filteredColumnsData.length === 0) {
      setShowModal(true);
      return;
    }

    setShowModal(true);
  };

  // Download sample CSV template
  const downloadSampleTemplate = () => {
    // Create sample data
    const sampleData = [
      { "Doc.No": "DOC001", "Rawmat": "", "_9": "MAT001", "_10": "1001", "_13": "5", "_15": "5" },
      { "Doc.No": "DOC002", "Rawmat": "", "_9": "MAT002", "_10": "1002", "_13": "10", "_15": "10" }
    ];
    
    // Convert to CSV
    const csv = Papa.unparse(sampleData);
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">นำเข้าข้อมูลวัตถุดิบการผลิต</h1>
        <button 
          onClick={downloadSampleTemplate}
          className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-md border border-green-200 hover:bg-green-100"
        >
          ดาวน์โหลดไฟล์ตัวอย่าง
        </button>
      </div>

      {/* File Upload Section */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">นำเข้าไฟล์ CSV</h2>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0 file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {filteredData.length > 0 && (
            <button
              onClick={handleImport}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'กำลังประมวลผล...' : 'นำเข้าข้อมูล'}
            </button>
          )}
        </div>
        {fileName && <p className="mt-2 text-sm text-gray-600">ไฟล์ที่เลือก: {fileName}</p>}
      </div>

      {/* Suffix Selection Section */}
      {availableSuffixes.length > 0 && (
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-md font-semibold mb-3">เลือก Suffix ที่ต้องการ</h3>
          <div className="flex flex-wrap gap-3">
            {availableSuffixes.map(suffix => (
              <label key={suffix} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selectedSuffixes.includes(suffix)}
                  onChange={() => handleSuffixChange(suffix)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2">{suffix}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && !showModal && (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Filter info section */}
      {csvData.length > 0 && selectedSuffixes.length > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-md font-semibold text-blue-700 mb-2">ข้อมูลการกรอง</h3>
          <p className="text-sm text-blue-800">
            แสดงเฉพาะรายการที่มีข้อมูลในคอลัมน์ที่ลงท้ายด้วย {selectedSuffixes.join(', ')} ครบทุกคอลัมน์
          </p>
          <p className="text-sm text-blue-600 mt-1">
            ข้อมูลทั้งหมด: {csvData.length} รายการ | หลังกรอง: {filteredData.length} รายการ
          </p>
        </div>
      )}

      {/* Table Section */}
      {filteredData.length > 0 && (
        <div>
          <CSVTable
            data={filteredData.slice(1)}
            headers={headers}
          />
        </div>
      )}

      {/* No data message */}
      {csvData.length > 0 && selectedSuffixes.length > 0 && filteredData.length === 0 && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
          <p className="text-yellow-700">
            ไม่พบข้อมูลที่มีค่าในคอลัมน์ที่ลงท้ายด้วย {selectedSuffixes.join(', ')} ครบทุกคอลัมน์
          </p>
        </div>
      )}

      {/* Success/Error Modal */}
      <ModalSuccess
        show={showModal}
        onClose={closeModal}
        csvData={filteredColumnsData.length > 0 ? filteredColumnsData : null}
        hasNoFilteredData={csvData.length > 0 && filteredColumnsData.length === 0}
      />
    </div>
  );
};

export default ParentComponent;