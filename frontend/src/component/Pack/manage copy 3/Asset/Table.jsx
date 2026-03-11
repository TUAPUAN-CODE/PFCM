import React, { useState, useEffect, useRef } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, TablePagination, IconButton, Chip } from '@mui/material';
import { LiaShoppingCartSolid } from 'react-icons/lia';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { FaRegCircle, FaRegCheckCircle, FaFileExcel, FaWeight } from "react-icons/fa";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { thSarabunBase64 } from "../../../../fonts/thSarabunBase64";
import { thSarabunBoldBase64 } from "../../../../fonts/thSarabunBoldBase64";


import axios from "axios";
axios.defaults.withCredentials = true;
import io from 'socket.io-client';
const API_URL = import.meta.env.VITE_API_URL;


const CUSTOM_COLUMN_WIDTHS = {
  delayTime: '180px',
  weight: '120px',
  prepDateTime: '200px',
  confirm: '90px',
  cart: '70px',
  complete: '70px',
  edit: '70px',
  delete: '70px'
};


const formatDateOnly = (dateTime) => {
  if (!dateTime || dateTime === '-') return '';
  return dateTime.split(' ')[0];
};


const calculateMinutesDifference = (startDate, endDate) => {
  if (!startDate || startDate === '-' || !endDate || endDate === '-') return null;


  const start = new Date(startDate);
  const end = new Date(endDate);


  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;


  const diffInMinutes = (end - start) / (1000 * 60);
  return diffInMinutes >= 0 ? diffInMinutes : null;
};


const formatMinutesToTime = (minutes) => {
  if (minutes === null || minutes === undefined) return '-';


  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);


  let timeString = '';
  if (hours > 0) timeString += `${hours} h`;
  if (mins > 0) {
    if (timeString) timeString += ' ';
    timeString += `${mins} m`;
  }


  return timeString || '-';
};


const calculateDBS1 = (row) => {
  const minutes = calculateMinutesDifference(row.rmit_date, row.come_cold_date);
  return formatMinutesToTime(minutes);
};


const calculateDBS2 = (row) => {
  let totalMinutes = 0;
  let hasData = false;


  const cold1 = calculateMinutesDifference(row.come_cold_date, row.out_cold_date);
  if (cold1 !== null) {
    totalMinutes += cold1;
    hasData = true;
  }


  const cold2 = calculateMinutesDifference(row.come_cold_date_two, row.out_cold_date_two);
  if (cold2 !== null) {
    totalMinutes += cold2;
    hasData = true;
  }


  const cold3 = calculateMinutesDifference(row.come_cold_date_three, row.out_cold_date_three);
  if (cold3 !== null) {
    totalMinutes += cold3;
    hasData = true;
  }


  return hasData ? formatMinutesToTime(totalMinutes) : '-';
};


const calculateDBS3 = (row) => {
  let minutes = null;


  if (row.out_cold_date_three && row.out_cold_date_three !== '-') {
    minutes = calculateMinutesDifference(row.out_cold_date_three, row.sc_pack_date);
  }
  else if (row.out_cold_date_two && row.out_cold_date_two !== '-') {
    minutes = calculateMinutesDifference(row.out_cold_date_two, row.sc_pack_date);
  }
  else if (row.out_cold_date && row.out_cold_date !== '-') {
    minutes = calculateMinutesDifference(row.out_cold_date, row.sc_pack_date);
  }


  return formatMinutesToTime(minutes);
};


const calculateDBS4 = (row) => {
  const dbs1Minutes = calculateMinutesDifference(row.rmit_date, row.come_cold_date);


  let dbs3Minutes = null;
  if (row.out_cold_date_three && row.out_cold_date_three !== '-') {
    dbs3Minutes = calculateMinutesDifference(row.out_cold_date_three, row.sc_pack_date);
  } else if (row.out_cold_date_two && row.out_cold_date_two !== '-') {
    dbs3Minutes = calculateMinutesDifference(row.out_cold_date_two, row.sc_pack_date);
  } else if (row.out_cold_date && row.out_cold_date !== '-') {
    dbs3Minutes = calculateMinutesDifference(row.out_cold_date, row.sc_pack_date);
  }


  if (dbs1Minutes !== null && dbs3Minutes !== null) {
    return formatMinutesToTime(dbs1Minutes + dbs3Minutes);
  }


  const directMinutes = calculateMinutesDifference(row.rmit_date, row.sc_pack_date);
  return formatMinutesToTime(directMinutes);
};


const formatTime = (minutes) => {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.floor(minutes % 60);


  let timeString = '';
  if (days > 0) timeString += `${days}day`;
  if (hours > 0) timeString += ` ${hours} h`;
  if (mins > 0) timeString += ` ${mins} m`;
  return timeString.trim();
};


const calculateTimeDifference = (dateString) => {
  if (!dateString || dateString === '-') return 0;


  const effectiveDate = new Date(dateString);
  const currentDate = new Date();


  const diffInMinutes = (currentDate - effectiveDate) / (1000 * 60);
  return diffInMinutes > 0 ? diffInMinutes : 0;
};


const parseTimeValue = (timeStr) => {
  if (!timeStr || timeStr === '-') return null;


  const timeParts = timeStr.split('.');
  const hours = parseInt(timeParts[0], 10);
  const minutes = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;


  return hours * 60 + minutes;
};


const getLatestColdRoomExitDate = (item) => {
  if (item.out_cold_date_three && item.out_cold_date_three !== '-') {
    return item.out_cold_date_three;
  } else if (item.out_cold_date_two && item.out_cold_date_two !== '-') {
    return item.out_cold_date_two;
  } else if (item.out_cold_date && item.out_cold_date !== '-') {
    return item.out_cold_date;
  }
  return '-';
};


const getItemStatus = (item) => {
  const latestColdRoomExitDate = getLatestColdRoomExitDate(item);


  let referenceDate = null;
  let remainingTimeValue = null;
  let standardTimeValue = null;
  const defaultStatus = {
    textColor: "#787878",
    statusMessage: "-",
    borderColor: "#969696",
    hideDelayTime: true,
    percentage: 0,
    timeRemaining: 0
  };


  if (!item) return defaultStatus;


  if ((latestColdRoomExitDate !== '-') &&
    (!item.remaining_rework_time || item.remaining_rework_time === '-')) {
    referenceDate = latestColdRoomExitDate;
    remainingTimeValue = parseTimeValue(item.remaining_ctp_time);
    standardTimeValue = parseTimeValue(item.standard_ctp_time);
  }
  else if ((latestColdRoomExitDate === '-') &&
    (!item.remaining_rework_time || item.remaining_rework_time === '-')) {
    referenceDate = item.rmit_date;
    remainingTimeValue = parseTimeValue(item.remaining_ptp_time);
    standardTimeValue = parseTimeValue(item.standard_ptp_time);
  }
  else if (item.remaining_rework_time && item.remaining_rework_time !== '-') {
    referenceDate = item.qc_date;
    remainingTimeValue = parseTimeValue(item.remaining_rework_time);
    standardTimeValue = parseTimeValue(item.standard_rework_time);
  }
  else if ((latestColdRoomExitDate !== '-') &&
    item.remaining_rework_time && item.remaining_rework_time !== '-') {
    referenceDate = latestColdRoomExitDate;
    remainingTimeValue = parseTimeValue(item.remaining_rework_time);
    standardTimeValue = parseTimeValue(item.standard_rework_time);
  }


  if (!referenceDate || (!remainingTimeValue && !standardTimeValue)) {
    return defaultStatus;
  }


  const elapsedMinutes = calculateTimeDifference(referenceDate);
  let timeRemaining;
  if (remainingTimeValue !== null) {
    timeRemaining = remainingTimeValue - elapsedMinutes;
  } else if (standardTimeValue !== null) {
    timeRemaining = standardTimeValue - elapsedMinutes;
  } else {
    timeRemaining = 0;
  }


  let percentage = 0;
  if (standardTimeValue) {
    percentage = (elapsedMinutes / standardTimeValue) * 100;
  }


  let statusMessage;
  if (timeRemaining > 0) {
    statusMessage = `เหลืออีก ${formatTime(timeRemaining)}`;
  } else {
    statusMessage = `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;
  }


  let textColor, borderColor;
  if (timeRemaining < 0) {
    textColor = "#FF0000";
    borderColor = "#FF8175";
  } else if (percentage >= 80) {
    textColor = "#FFA500";
    borderColor = "#FFF398";
  } else {
    textColor = "#008000";
    borderColor = "#80FF75";
  }


  let formattedDelayTime = null;


  const isNegative = timeRemaining < 0;
  const absoluteTimeRemaining = Math.abs(timeRemaining);


  const hours = Math.floor(absoluteTimeRemaining / 60);
  const minutes = Math.floor(absoluteTimeRemaining % 60);


  const sign = isNegative ? '-' : '';
  formattedDelayTime = `${sign}${hours}.${minutes.toString().padStart(2, '0')}`;


  return {
    textColor,
    statusMessage,
    borderColor,
    hideDelayTime: false,
    percentage,
    timeRemaining,
    formattedDelayTime
  };
};


// SearchableDropdown Component with improved styling
const SearchableDropdown = ({ label, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);


  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };


    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };


  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };


  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '200px' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          border: value ? '2px solid #2196F3' : '1px solid #e0e0e0',
          borderRadius: '12px',
          cursor: 'pointer',
          backgroundColor: '#fff',
          height: '42px',
          fontSize: '14px',
          color: value ? '#2196F3' : '#999',
          transition: 'all 0.3s ease',
          boxShadow: isOpen ? '0 4px 12px rgba(33, 150, 243, 0.15)' : 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: value ? '500' : '400' }}>
          {value || placeholder}
        </span>
        <KeyboardArrowDownIcon
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            color: value ? '#2196F3' : '#666'
          }}
        />
      </div>


      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            zIndex: 1000,
            maxHeight: '320px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideDown 0.2s ease'
          }}
        >
          <div style={{ padding: '10px' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon style={{ fontSize: '18px', color: '#999' }} />
                  </InputAdornment>
                ),
                sx: { height: '38px', fontSize: '13px', borderRadius: '8px' }
              }}
            />
          </div>


          <div style={{ overflowY: 'auto', maxHeight: '270px' }}>
            {value && (
              <div
                onClick={handleClear}
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#ff4444',
                  borderBottom: '1px solid #f0f0f0',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff3f3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ClearIcon style={{ fontSize: '16px' }} />
                <span>ล้างตัวกรอง</span>
              </div>
            )}


            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(option)}
                  style={{
                    padding: '12px 14px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: value === option ? '#E3F2FD' : 'transparent',
                    borderBottom: index < filteredOptions.length - 1 ? '1px solid #f0f0f0' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (value !== option) e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    if (value !== option) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {option}
                </div>
              ))
            ) : (
              <div style={{ padding: '20px 14px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                ไม่พบข้อมูล
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


const SearchableLineDropdown = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);


  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };


    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          border: value ? '2px solid #00a6ff' : '1px solid #ddd',
          borderRadius: '10px',
          cursor: 'pointer',
          backgroundColor: '#fff',
          fontSize: '14px',
          color: value ? '#333' : '#999',
          transition: 'all 0.3s ease',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '-- เลือก Line --'}
        </span>
        <KeyboardArrowDownIcon
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            color: value ? '#00a6ff' : '#666',
            fontSize: '20px'
          }}
        />
      </div>


      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            zIndex: 1000,
            maxHeight: '300px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: '10px' }}>
            <input
              type="text"
              placeholder="ค้นหา Line..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.border = '2px solid #00a6ff';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid #ddd';
              }}
            />
          </div>


          <div style={{ overflowY: 'auto', maxHeight: '240px' }}>
            {value && (
              <div
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#ff4444',
                  borderBottom: '1px solid #f0f0f0',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff3f3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ClearIcon style={{ fontSize: '16px' }} />
                <span>ล้างตัวเลือก</span>
              </div>
            )}


            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#333',
                    backgroundColor: value === option ? '#E3F2FD' : 'transparent',
                    borderBottom: index < filteredOptions.length - 1 ? '1px solid #f0f0f0' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (value !== option) e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    if (value !== option) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {option}
                </div>
              ))
            ) : (
              <div style={{ padding: '20px 14px', fontSize: '13px', color: '#999', textAlign: 'center' }}>
                ไม่พบข้อมูล
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


const Row = ({
  row,
  columnWidths,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenDeleteModal,
  handleOpenEditLineModal,
  handleOpenSuccess,
  handleConfirmRow,
  selectedColor,
  openRowId,
  setOpenRowId,
  index,
  displayColumns
}) => {
  const { borderColor, statusMessage, hideDelayTime, percentage, formattedDelayTime } = getItemStatus(row);
  const backgroundColor = index % 2 === 0 ? '#ffffff' : '#F0F8FF';


  const displayRow = {};
  displayColumns.forEach(col => {
    if (col === 'tro_id') {
      displayRow[col] = row.tro_id;
    } else if (col === 'dbs1') {
      displayRow[col] = calculateDBS1(row);
    } else if (col === 'dbs2') {
      displayRow[col] = calculateDBS2(row);
    } else if (col === 'dbs3') {
      displayRow[col] = calculateDBS3(row);
    } else if (col === 'dbs4') {
      displayRow[col] = calculateDBS4(row);
    } else {
      const value = row[col];


      // ถ้าเป็น boolean ให้แปลงเป็นข้อความ
      if (typeof value === 'boolean') {
        displayRow[col] = value ? 'ผ่าน' : 'ไม่ผ่าน';
        // หรือ displayRow[col] = value ? '✓' : '✗';
        // หรือ displayRow[col] = value ? 'มี' : 'ไม่มี';
      }
      // ถ้าเป็น null, undefined, หรือ empty string
      else if (value === null || value === undefined || value === '') {
        displayRow[col] = '-';
      }
      // กรณีอื่นๆ (string, number)
      else {
        displayRow[col] = value;
      }
    }
  });


  const colorMatch =
    (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175') ||
    (selectedColor === 'gray' && borderColor === '#969696');


  if (selectedColor && !colorMatch) return null;


  const isOpen = openRowId === row.rmfp_id;
  const isConfirmed = row.sc_pack_date && row.sc_pack_date !== '-';


  const [weight, setWeight] = useState(row.weight || '');
  const [prepDateTime, setPrepDateTime] = useState(row.sc_pack_date || '');
  const [errors, setErrors] = useState({ weight: '', prepDateTime: '' });


  const validateInputs = () => {
    const newErrors = { weight: '', prepDateTime: '' };
    let isValid = true;


    if (!weight || parseFloat(weight) <= 0) {
      newErrors.weight = 'น้ำหนักต้องมากกว่า 0';
      isValid = false;
    }


    if (!prepDateTime) {
      newErrors.prepDateTime = 'กรุณาระบุเวลา';
      isValid = false;
    } else {
      const selectedDate = new Date(prepDateTime);
      const now = new Date();
      if (selectedDate > now) {
        newErrors.prepDateTime = 'เวลาต้องไม่เป็นอดีต';
        isValid = false;
      }
    }


    setErrors(newErrors);
    return isValid;
  };


  const handleConfirm = () => {
    if (validateInputs()) {
      handleConfirmRow({
        mapping_id: row.mapping_id,
        weight: parseFloat(weight),
        sc_pack_date: prepDateTime
      });
    }
  };


  return (
    <>
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
      <TableRow
        onClick={() => {
          setOpenRowId(isOpen ? null : row.rmfp_id);
          handleRowClick(row.rmfp_id);
        }}
        style={{
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          const cells = e.currentTarget.querySelectorAll('td');
          cells.forEach(cell => {
            cell.style.backgroundColor = index % 2 === 0 ? '#F5F9FF' : '#E8F4FF';
          });
        }}
        onMouseLeave={(e) => {
          const cells = e.currentTarget.querySelectorAll('td');
          cells.forEach(cell => {
            cell.style.backgroundColor = backgroundColor;
          });
        }}
      >
        {Object.entries(displayRow).map(([key, value], idx) => (
          <TableCell
            key={idx}
            align="center"
            style={{
              width: columnWidths[idx],
              borderLeft: "1px solid #E3F2FD",
              borderTop: '1px solid #E3F2FD',
              borderBottom: '1px solid #E3F2FD',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '14px',
              height: '48px',
              lineHeight: '1.5',
              padding: '0px 12px',
              color: "#353535ff",
              backgroundColor: backgroundColor,
              transition: 'background-color 0.2s ease'
            }}
          >
            {value || '-'}
          </TableCell>
        ))}
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
    </>
  );
};


// ฟังก์ชัน Upload/Import PDF
const handleUploadPDF = async (event) => {
  const file = event.target.files[0];
  if (!file) return;


  try {
    // ใช้ FileReader อ่านไฟล์
    const reader = new FileReader();


    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;


      // ใช้ pdfjs-dist อ่าน PDF
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;


      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let extractedText = '';


      // อ่านทุกหน้า
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        extractedText += pageText + '\n';
      }


      console.log('Extracted text from PDF:', extractedText);
      alert('อัปโหลด PDF สำเร็จ!\nข้อมูลที่สกัดได้:\n' + extractedText.substring(0, 200) + '...');


      // TODO: ประมวลผลข้อมูลที่สกัดได้ตามต้องการ
    };


    reader.readAsArrayBuffer(file);


  } catch (error) {
    console.error('Error uploading PDF:', error);
    alert('เกิดข้อผิดพลาดในการอัปโหลด PDF');
  }


  // Reset input
  event.target.value = '';
};




// ✅ แก้ใหม่ - parse string ตรงๆ ไม่ผ่าน Date object เลย
const parseDateTime = (dateTimeStr) => {
  if (!dateTimeStr || dateTimeStr === '-') return null;
  const str = String(dateTimeStr).replace('T', ' ').split('.')[0]; // ตัด milliseconds
  const parts = str.split(' ');
  if (parts.length < 2) return null;
  const datePart = parts[0];
  const timePart = parts[1];
  const [h, m] = timePart.split(':').map(Number);
  return { datePart, hours: h, minutes: m, totalMinutes: h * 60 + m };
};

const getShiftFromDate = (dateTimeStr) => {
  const parsed = parseDateTime(dateTimeStr);
  if (!parsed) return null;
  const { totalMinutes } = parsed;
  // DS: 06:00 (360) ถึง 17:59 (1079)
  // NS: 18:00 (1080) ถึง 05:59 (359) ข้ามคืน
  return (totalMinutes >= 360 && totalMinutes < 1080) ? 'DS' : 'NS';
};

// const getShiftBaseDate = (dateTimeStr) => {
//   const parsed = parseDateTime(dateTimeStr);
//   if (!parsed) return null;
//   const { datePart, totalMinutes } = parsed;

//   // ถ้าเป็น 00:00-05:59 → NS ของคืนก่อนหน้า → ลดวันลง 1
//   if (totalMinutes < 360) {
//     const [y, mo, d] = datePart.split('-').map(Number);
//     const prev = new Date(y, mo - 1, d - 1);
//     const py = prev.getFullYear();
//     const pm = String(prev.getMonth() + 1).padStart(2, '0');
//     const pd = String(prev.getDate()).padStart(2, '0');
//     return `${py}-${pm}-${pd}`;
//   }

//   return datePart;
// };

const isInShift = (dateTimeStr, baseDate, shift) => {
  if (!dateTimeStr || dateTimeStr === '-') return false;
  if (!baseDate || !shift) return false;

  // parse sc_pack_date
  const str = String(dateTimeStr).replace('T', ' ').split('.')[0];
  const parts = str.split(' ');
  if (parts.length < 2) return false;

  const datePart = parts[0];         // "2025-03-03"
  const timePart = parts[1];         // "18:30:00"
  const [h, m] = timePart.split(':').map(Number);
  const totalMinutes = h * 60 + m;   // นาทีนับจาก 00:00

  if (shift === 'DS') {
    // DS: 06:00-17:59 → ต้องเป็นวันเดียวกับ baseDate
    return datePart === baseDate && totalMinutes >= 360 && totalMinutes < 1080;

  } else if (shift === 'NS') {
    // NS ช่วงแรก: 18:00-23:59 → วันเดียวกับ baseDate
    const isNightFirstHalf = datePart === baseDate && totalMinutes >= 1080;

    // NS ช่วงหลัง: 00:00-05:59 → วันถัดจาก baseDate
    const [y, mo, d] = baseDate.split('-').map(Number);
    const nextDay = new Date(y, mo - 1, d + 1);
    const nextDateStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
    const isNightSecondHalf = datePart === nextDateStr && totalMinutes < 360;

    return isNightFirstHalf || isNightSecondHalf;
  }

  return false;
};







const TableMainPrep = ({
  handleOpenModal,
  data,
  handleRowClick,
  handleOpenEditModal,
  handleOpenDeleteModal,
  handleOpenEditLineModal,
  handleOpenSuccess,
  onConfirmRow
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);
  const [selectedLineName, setSelectedLineName] = useState('');
  const [selectedDocNo, setSelectedDocNo] = useState('');
  const [selectedSCPackDate, setselectedSCPackDate] = useState('');
  const [exportLine, setExportLine] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const lineOptions = [...new Set(data.map(row => row.line_name).filter(Boolean))].sort();
  const [signatureData, setSignatureData] = useState({   // ← เพิ่มใหม่


    recordedBy: '',
    reviewedBy: '',
    qcManager: ''
  });
  const [exportDate, setExportDate] = useState('');
  const [exportShift, setExportShift] = useState('');
  const [exportPlant, setExportPlant] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);


  const displayColumns = ['production', 'mat_name', 'batch_after', 'group_no', 'weight_RM', 'detail', 'color', 'odor', 'texture', 'rmit_date', 'come_cold_date', 'out_cold_date', 'come_cold_date_two', 'out_cold_date_two', 'come_cold_date_three', 'out_cold_date_three', 'sc_pack_date', 'dbs1', 'dbs2', 'dbs3', 'dbs4'];


  const uniqueLineNames = [...new Set(data.map(row => row.line_name).filter(Boolean))].sort();
  const uniqueDocNos = [...new Set(data.map(row => row.doc_no).filter(Boolean))].sort();
  const uniqueSCPackDate = [...new Set(
    data.flatMap(row => {
      const packDate = row.sc_pack_date;
      if (!packDate || packDate === '-') return [];

      const str = String(packDate).replace('T', ' ').split('.')[0];
      const parts = str.split(' ');
      if (parts.length < 2) return [parts[0]];

      const datePart = parts[0];
      const totalMinutes = parts[1].split(':').slice(0, 2).map(Number)
        .reduce((h, m, i) => i === 0 ? h + m * 60 : h + m, 0);

      // NS ช่วง 00:00-05:59 → นับเป็นวันก่อนหน้า
      if (totalMinutes < 360) {
        const [y, mo, d] = datePart.split('-').map(Number);
        const prev = new Date(y, mo - 1, d - 1);
        return [`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`];
      }

      return [datePart];
    })
  )].sort((a, b) => new Date(a) - new Date(b));


  // Calculate total weight
  const totalWeight = filteredRows.reduce((sum, row) => {
    const weight = parseFloat(row.weight_RM) || 0;
    return sum + weight;
  }, 0);


  const formatDateTimeForPDF = (dateTimeStr) => {
    if (!dateTimeStr || dateTimeStr === '-') return '-';


    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return dateTimeStr;


      // แยกวันที่และเวลา
      const datePart = date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });


      const timePart = date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });


      // ใช้ \n เพื่อขึ้นบรรทัดใหม่
      return `${datePart}\n${timePart}`;
    } catch (error) {
      return dateTimeStr;
    }
  };




  // แก้ใน useEffect ส่วน filter selectedShift
  // if (selectedShift) {
  //   filtered = filtered.filter(row => {
  //     const shift = getShiftFromDate(row.sc_pack_date);
  //     return shift === selectedShift;
  //   });
  // }


  useEffect(() => {
    let filtered = data;


    // เพิ่มใน useEffect ชั่วคราว
    data.forEach(row => {
      const base = getShiftBaseDate(row.sc_pack_date);
      const shift = getShiftFromDate(row.sc_pack_date);
      if (row.sc_pack_date && row.sc_pack_date.includes('2026-02-27')) {
        console.log('=== ROW วันที่ 27 ===', {
          sc_pack_date: row.sc_pack_date,
          shiftBase: base,
          shift: shift
        });
      }
    });


    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }


    if (selectedLineName) {
      filtered = filtered.filter(row => row.line_name === selectedLineName);
    }


    if (selectedDocNo) {
      filtered = filtered.filter(row => row.doc_no === selectedDocNo);
    }


    if (selectedSCPackDate || selectedShift) {
      filtered = filtered.filter(row => {
        const packDate = row.sc_pack_date;
        if (!packDate || packDate === '-') return false;

        if (selectedSCPackDate && selectedShift) {
          // มีทั้งวันที่และ shift → ใช้ isInShift เพื่อ handle NS ข้ามคืน
          return isInShift(packDate, selectedSCPackDate, selectedShift);
        }

        if (selectedSCPackDate && !selectedShift) {
          // เลือกแค่วันที่ → แสดงทั้ง DS และ NS ของวันนั้น
          // DS: วันที่ตรง + 06:00-17:59
          // NS: วันที่ตรง + 18:00-23:59  หรือ  วันถัดไป + 00:00-05:59
          return isInShift(packDate, selectedSCPackDate, 'DS')
            || isInShift(packDate, selectedSCPackDate, 'NS');
        }

        if (!selectedSCPackDate && selectedShift) {
          // เลือกแค่ shift → กรองตาม shift อย่างเดียว
          const shift = getShiftFromDate(packDate);
          return shift === selectedShift;
        }

        return true;
      });
    }

    // ✅ โค้ดใหม่ - เพิ่ม fallback และ debug
    // if (selectedSCPackDate || selectedShift) {
    //   filtered = filtered.filter(row => {
    //     const packDate = row.sc_pack_date;

    //     // ถ้าไม่มี sc_pack_date เลย ให้ตกกรอง
    //     if (!packDate || packDate === '-') return false;

    //     const shiftBase = getShiftBaseDate(packDate);
    //     const shift = getShiftFromDate(packDate);

    //     const dateMatch = selectedSCPackDate
    //       ? shiftBase === selectedSCPackDate
    //       : true;
    //     const shiftMatch = selectedShift
    //       ? shift === selectedShift
    //       : true;

    //     return dateMatch && shiftMatch;
    //   });
    // }



    // if (selectedSCPackDate) {
    //   filtered = filtered.filter(
    //     row => getShiftBaseDate(row.sc_pack_date) === selectedSCPackDate
    //   );
    // }


    // if (selectedShift) {
    //   filtered = filtered.filter(
    //     row => getShiftFromDate(row.sc_pack_date) === selectedShift
    //   );
    // }


    setFilteredRows(filtered);
    setPage(0);
  }, [searchTerm, data, selectedLineName, selectedDocNo, selectedSCPackDate, selectedShift]);


  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };


  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };




  const handleFilterChange = (color) => {
    setSelectedColor(color === selectedColor ? '' : color);
  };


  const handleOpenPDFPreview = () => {
    // ✅ เพิ่มการดึงข้อมูลจาก filteredRows
    const pageRows = filteredRows.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );


    setPreviewData(pageRows.map(row => ({ ...row })));
    setSignatureData({ recordedBy: '', reviewedBy: '', qcManager: '' });


    // ตั้งค่า default
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    setExportDate(dateStr);


    // กำหนด shift อัตโนมัติ
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const autoShift = (currentMinutes >= 360 && currentMinutes < 1080) ? 'DS' : 'NS';
    setExportShift(autoShift);






    setExportPlant('');
    setExportLine(selectedLineName || '');
    setShowPDFPreview(true);
  };






  const saveSignatureToAPI = async (sigData, dataRows) => {
    const mappingIds = dataRows
      .map(row => row.mapping_id)
      .filter(id => id !== null && id !== undefined);


    const pdfBlob = await generatePDFBlob(previewData, signatureData);


    const formData = new FormData();
    formData.append('pdf', pdfBlob, 'report.pdf');


    // ✅ ข้อมูลผู้รับผิดชอบ
    formData.append('recorded_by', sigData.recordedBy || '');
    formData.append('reviewed_by', sigData.reviewedBy || '');
    formData.append('qc_manager', sigData.qcManager || '');


    // ✅ ข้อมูลเอกสาร
    formData.append('date', exportDate || '');        // จาก state exportDate
    formData.append('shift', exportShift || '');      // จาก state exportShift  
    formData.append('line', exportLine || '');
    formData.append('plant', exportPlant || '');      // จาก state exportPlant


    formData.append('mapping_ids', JSON.stringify(mappingIds));


    const response = await fetch(`${API_URL}/api/pack/data/pdf`, {
      method: 'POST',
      body: formData,
    });


    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`บันทึกไม่สำเร็จ: ${response.status} - ${errText}`);
    }


    return await response.json();
  };




  const generatePDFBlob = async (dataRows, sigData = {}) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 5;


    doc.addFileToVFS('Sarabun-Regular.ttf', thSarabunBase64);
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    doc.addFileToVFS('Sarabun-Bold.ttf', thSarabunBoldBase64);
    doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
    doc.setFont('Sarabun', 'normal');


    doc.setLineWidth(0.03); // ค่าเริ่มต้นเส้นบาง (0.2 mm)


    const drawRect = (x, y, w, h) => { doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.1); doc.rect(x, y, w, h); };
    const fillRect = (x, y, w, h, rgb) => { doc.setFillColor(...rgb); doc.rect(x, y, w, h, 'F'); };
    const drawText = (text, x, y, opts = {}) => {
      const { fontSize = 7, align = 'center', bold = false, color = [0, 0, 0] } = opts;
      doc.setFontSize(fontSize);
      doc.setFont('THSarabunNew', bold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      doc.text(String(text ?? ''), x, y, { align });
      doc.setLineWidth(0.1);
    };
    const drawCell = (text, x, y, w, h, opts = {}) => {
      const { fill, fontSize = 7, bold = false, align = 'center' } = opts;
      if (fill) fillRect(x, y, w, h, fill);
      drawRect(x, y, w, h);
      const lines = String(text ?? '').split('\n');
      const lineH = fontSize * 0.42;
      const totalH = lines.length * lineH;
      const startY = y + (h - totalH) / 2 + lineH * 0.5;
      lines.forEach((line, i) => {
        const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w - 1.5 : x + 1.5;
        drawText(line, tx, startY + i * lineH, { fontSize, bold, align });
      });
    };
    // ─── TITLE ────────────────────────────────────────────────
    drawText('บริษัท ไอ-เทล คอร์ปอเรชั่น จำกัด (มหาชน)', pageW / 2, 9, {
      fontSize: 10, bold: true, align: 'center'
    });
    drawText(
      'รายงานควบคุมเวลากระบวนการผลิต โรงผลิตอาหารสัตว์เลี้ยง (Delay Time for Production Control Report)',
      pageW / 2, 15, { fontSize: 8, align: 'center' }
    );
    drawText('F3PFPF67-0-25/08/25', pageW - margin, 9, { fontSize: 6, align: 'right' });


    // ─── INFO BAR ─────────────────────────────────────────────
    const infoY = 20;
    const gap = 4; // ระยะห่างระหว่างแต่ละรายการ (mm)


    const infoItems = [
      { label: 'Date:', value: exportDate, width: 35 },
      { label: 'Shift:', value: exportShift, width: 20 },
      { label: 'Line:', value: exportLine, width: 25 },
      { label: 'Plant:', value: exportPlant, width: 25 },
    ];


    // วาดจากซ้ายไปขวาติดกัน
    let infoX = margin;
    doc.setFontSize(7);
    doc.setFont('THSarabunNew', 'normal');


    infoItems.forEach(({ label, value, width }) => {
      // วาด Label
      drawText(label, infoX, infoY, { fontSize: 7, align: 'left', bold: true });
      const labelWidth = doc.getTextWidth(label);


      // วาดเส้นประ
      const lineY = infoY + 1;
      const lineStartX = infoX + labelWidth + 1;
      const lineEndX = lineStartX + width;


      doc.setDrawColor(0, 0, 0);
      doc.line(lineStartX, lineY, lineEndX, lineY);


      // วาดค่าบนเส้นประ (ถ้ามี)
      if (value) {
        const valueX = lineStartX + (width / 2);
        drawText(value, valueX, infoY - 0.5, {
          fontSize: 7,
          align: 'center',
          bold: false,
          color: [33, 150, 243] // สีน้ำเงิน
        });
      }


      infoX = lineEndX + gap;
    });




    // Page อยู่ชิดขวาเสมอ
    drawText('Page:....../ .......', pageW - margin, infoY, { fontSize: 7, align: 'right' });


    // ─── TABLE COLUMN WIDTHS ──────────────────────────────────
    const tX = margin;
    const tY = 24;
    const tW = pageW - margin * 2;


    const colCode = 14;
    const colRM = 30;
    const colBatch = 18;
    const batchCols = 10;
    const batchCellW = colBatch / batchCols;
    const colWeight = 13;
    const colGrpNo = 11;
    const colDate = 15;
    const colHist = 15;
    const sensoryCellW = 9;
    const colSensory = sensoryCellW * 3;
    const colPrepA = 13;
    const colCold1 = 13;
    const colColdOut1 = 13;
    const colCold2 = 13;
    const colColdOut2 = 13;
    const colPacked = 13;
    const colDBS1 = 10;
    const colDBS2 = 10;
    const colDBS3 = 10;
    const colDBS4 = 10;
    const colRemark = tW - colCode - colRM - colBatch - colWeight - colGrpNo
      - colDate - colHist - colSensory
      - colPrepA - colCold1 - colColdOut1
      - colCold2 - colColdOut2 - colPacked
      - colDBS1 - colDBS2 - colDBS3 - colDBS4;


    const h1 = 7;
    const h2 = 14;
    const headerH = h1 + h2;
    // const rowH = 8;
    const hFill = [210, 228, 255];


    const minRows = 17;
    const bottomReserved = 75; // mm สำหรับ legend + footer + signature
    const availableH = pageH - (tY + headerH) - bottomReserved;
    const rowH = Math.floor((availableH / minRows) * 10) / 10; // ปัดทศนิยม 1 ตำแหน่ง


    // ─── HEADER ───────────────────────────────────────────────
    let cx = tX;
    const cy = tY;


    drawCell('โค้ด\n(Product\nCode)', cx, cy, colCode, headerH, { fill: hFill, bold: true, fontSize: 10 });
    cx += colCode;


    drawCell('วัตถุดิบ\n(Raw Mat.)', cx, cy, colRM, headerH, { fill: hFill, bold: true, fontSize: 7 });
    cx += colRM;


    fillRect(cx, cy, colBatch, h1, hFill);
    drawRect(cx, cy, colBatch, h1);
    drawText('Batch', cx + colBatch / 2, cy + h1 / 2 + 2.5, { fontSize: 7, bold: true });


    for (let i = 0; i < batchCols; i++) {
      drawCell('', cx + i * batchCellW, cy + h1, batchCellW, h2, {
        fill: hFill,
        fontSize: 6
      });
    }


    cx += colBatch;


    drawCell('น้ำหนัก\n(nn.)\nWeight\n(kgs.)', cx, cy, colWeight, headerH, { fill: hFill, bold: true, fontSize: 6 });
    cx += colWeight;


    drawCell('ชุดที่\n(Batch)', cx, cy, colGrpNo, headerH, { fill: hFill, bold: true, fontSize: 6 });
    cx += colGrpNo;


    drawCell('วันที่-\nเวลา\nเตรียม', cx, cy, colDate, headerH, { fill: hFill, bold: true, fontSize: 6 });
    cx += colDate;


    drawCell('Hist. /ความ\nหนืด / อุณหภูมิ\nHist./ Viscosity\n/Temp', cx, cy, colHist, headerH, { fill: hFill, bold: true, fontSize: 6 });
    cx += colHist;


    // Sensory group
    fillRect(cx, cy, colSensory, h1, hFill);
    drawRect(cx, cy, colSensory, h1);
    drawText('Sensory', cx + colSensory / 2, cy + h1 / 2 + 2.5, { fontSize: 7, bold: true });
    [['สี', 'Color'], ['กลิ่น', 'Odor'], ['เนื้อสัมผัส', 'Texture']].forEach(([th, en], i) => {
      drawCell(`${th}\n${en}`, cx + i * sensoryCellW, cy + h1, sensoryCellW, h2, { fill: hFill, fontSize: 6 });
    });
    cx += colSensory;


    // เวลา (Time) group
    const timeGroupW = colPrepA + colCold1 + colColdOut1 + colCold2 + colColdOut2 + colPacked;
    fillRect(cx, cy, timeGroupW, h1, hFill);
    drawRect(cx, cy, timeGroupW, h1);
    drawText('เวลา (Time)', cx + timeGroupW / 2, cy + h1 / 2 + 2.5, { fontSize: 7, bold: true });
    const timeCols = [
      { label: 'เตรียมเสร็จ\n(Preparing\nFinished)\n(A)\n(เวลาออกห้อง\nเย็น)(A)', w: colPrepA },
      { label: 'เข้าห้องเย็น 1\n(Moving to\nCold Storage)\n(B)\n(เวลาเริ่มผสม)\n(B)', w: colCold1 },
      { label: 'ออกห้องเย็น 1\n(Leaving From\nCold Storage)\n(C)\n(เวลาผสมเสร็จ)\n(C)', w: colColdOut1 },
      { label: 'เข้าห้องเย็น 2\n(Moving to\nCold Storage)\n(D)', w: colCold2 },
      { label: 'ออกห้องเย็น 2\n(Leaving From\nCold Storage)\n(E)', w: colColdOut2 },
      { label: 'บรรจุเสร็จ\n(Finished\npacking)\n(F)\n(บรรจุเสร็จ)\n(F)', w: colPacked },
    ];
    let tcx = cx;
    timeCols.forEach(tc => {
      drawCell(tc.label, tcx, cy + h1, tc.w, h2, { fill: hFill, fontSize: 5 });
      tcx += tc.w;
    });
    cx += timeGroupW;


    // Delay Time group
    const delayGroupW = colDBS1 + colDBS2 + colDBS3 + colDBS4;
    fillRect(cx, cy, delayGroupW, h1, hFill);
    drawRect(cx, cy, delayGroupW, h1);
    drawText('ดีเลย์ (Delay time) (hr.)', cx + delayGroupW / 2, cy + h1 / 2 + 2.5, { fontSize: 6, bold: true });
    [
      { label: '1\n(B-A)', w: colDBS1 },
      { label: '2\n(C-B)', w: colDBS2 },
      { label: '3\n(F-C)/\n(+D-C)', w: colDBS3 },
      { label: '4\n(C-A)+\n(F-C)', w: colDBS4 },
    ].forEach(dc => {
      drawCell(dc.label, cx, cy + h1, dc.w, h2, { fill: hFill, fontSize: 6 });
      cx += dc.w;
    });


    drawCell('หมายเหตุ\n(Remark)', cx, cy, colRemark, headerH, { fill: hFill, bold: true, fontSize: 6 });


    // ─── DATA ROWS ────────────────────────────────────────────
    const toDisplay = (v) => {
      if (v === null || v === undefined || v === '') return '-';
      if (typeof v === 'boolean') return v ? 'ผ่าน' : 'ไม่ผ่าน';
      return String(v);
    };


    // const pageRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const pageRows = dataRows;


    pageRows.forEach((row, i) => {
      const ry = tY + headerH + i * rowH;
      if (ry + rowH > pageH - 22) return;


      const rowFill = i % 2 === 0 ? [255, 255, 255] : [240, 248, 255];
      let rx = tX;


      const cell = (text, w, opts = {}) => {
        drawCell(toDisplay(text), rx, ry, w, rowH, { fill: rowFill, fontSize: 6, ...opts });
        rx += w;
      };


      cell(row.production, colCode);
      cell(row.mat_name, colRM, { align: 'left' });
      const batchStr = String(row.batch_after ?? '').padEnd(batchCols, ' ');
      for (let b = 0; b < batchCols; b++) {
        cell(batchStr[b] || '', batchCellW);
      }
      cell(row.weight_RM, colWeight);
      cell(row.group_no, colGrpNo);
      cell(formatDateTimeForPDF(row.rmit_date), colDate, { fontSize: 5.5 });
      cell(row.detail, colHist);
      cell(row.color, sensoryCellW);
      cell(row.odor, sensoryCellW);
      cell(row.texture, sensoryCellW);
      cell(formatDateTimeForPDF(row.rmit_date), colPrepA, { fontSize: 5 });
      cell(formatDateTimeForPDF(row.come_cold_date), colCold1, { fontSize: 5 });
      cell(formatDateTimeForPDF(row.out_cold_date), colColdOut1, { fontSize: 5 });
      cell(formatDateTimeForPDF(row.come_cold_date_two), colCold2, { fontSize: 5 });
      cell(formatDateTimeForPDF(row.out_cold_date_two), colColdOut2, { fontSize: 5 });
      cell(formatDateTimeForPDF(row.sc_pack_date), colPacked, { fontSize: 5 });
      cell(calculateDBS1(row), colDBS1);
      cell(calculateDBS2(row), colDBS2);
      cell(calculateDBS3(row), colDBS3);
      cell(calculateDBS4(row), colDBS4);
      cell('', colRemark);
    });


    // ─── EMPTY ROWS ───────────────────────────────────────────




    for (let e = pageRows.length; e < minRows; e++) {
      const ry = tY + headerH + e * rowH;
      let rx = tX;
      const emptyCell = (w) => { drawRect(rx, ry, w, rowH); rx += w; };
      [colCode, colRM, ...Array(batchCols).fill(batchCellW), colWeight, colGrpNo, colDate, colHist,
        sensoryCellW, sensoryCellW, sensoryCellW,
        colPrepA, colCold1, colColdOut1, colCold2, colColdOut2, colPacked,
        colDBS1, colDBS2, colDBS3, colDBS4, colRemark
      ].forEach(emptyCell);
    }


    // ✅ แก้ไข: ประกาศ finalY ก่อน แล้วค่อยคำนวณ legendY
    const finalY = tY + headerH + Math.max(pageRows.length, minRows) * rowH + 4;
    const legendY = finalY + 8;
    const noteRowH = 4;
    const hFillLegend = [210, 228, 255];


    // ── Helper: วาด sub-table แบบ วัตถุดิบ + ช่วงที่ 1-4 ──
    const drawMatTable = (startX, startY, colMatW, colChW, rows) => {
      // Row 1: วัตถุดิบ (rowspan 2) + ช่วงที่ (span 4)
      drawCell('วัตถุดิบ', startX, startY, colMatW, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 7 });
      fillRect(startX + colMatW, startY, colChW * 4, noteRowH, hFillLegend);
      drawRect(startX + colMatW, startY, colChW * 4, noteRowH);
      drawText('ช่วงที่', startX + colMatW + (colChW * 4) / 2, startY + noteRowH / 2 + 1, { fontSize: 7, bold: true });
      // Row 2: 1, 2, 3, 4
      [1, 2, 3, 4].forEach((n, i) => {
        drawCell(String(n), startX + colMatW + i * colChW, startY + noteRowH, colChW, noteRowH, { fill: hFillLegend, bold: true, fontSize: 7 });
      });
      // Data rows
      rows.forEach((r, i) => {
        const ry = startY + noteRowH * 2 + i * noteRowH;
        drawCell(r.mat, startX, ry, colMatW, noteRowH, { fontSize: 6, align: 'left' });
        r.v.forEach((val, j) => {
          drawCell(String(val), startX + colMatW + j * colChW, ry, colChW, noteRowH, { fontSize: 7 });
        });
      });
    };


    // ── Block 1: หมายเหตุ + คำจำกัดความ ──
    const blk1X = margin;
    const colNote = 20;
    const colDesc = 25;


    drawCell('หมายเหตุ', blk1X, legendY, colNote, noteRowH, { fill: hFillLegend, bold: true, fontSize: 7 });
    drawCell('คำจำกัดความ', blk1X + colNote, legendY, colDesc, noteRowH, { fill: hFillLegend, bold: true, fontSize: 7 });


    [
      { note: 'ช่วงที่ 1', desc: 'เตรียมเสร็จ - เข้าห้องเย็น' },
      { note: 'ช่วงที่ 2', desc: 'เข้าห้องเย็น - ออกห้องเย็น' },
      { note: 'ช่วงที่ 3', desc: 'ออกห้องเย็น - บรรจุเสร็จ' },
      { note: 'ช่วงที่ 4', desc: 'เตรียมเสร็จ - บรรจุเสร็จ' },
    ].forEach((r, i) => {
      const ry = legendY + noteRowH + i * noteRowH;
      drawCell(r.note, blk1X, ry, colNote, noteRowH, { fontSize: 7 });
      drawCell(r.desc, blk1X + colNote, ry, colDesc, noteRowH, { fontSize: 7, align: 'left' });
    });


    // ── Block 2: วัตถุดิบกลุ่ม 1 ──
    const colMat2 = 25;
    const colCh2 = 5;
    const blk2X = blk1X + colNote + colDesc + 4;


    drawMatTable(blk2X, legendY, colMat2, colCh2, [
      { mat: 'เนื้อสัตว์ (วัว/ เป็ด/ แกะ)', v: [3, 9, 2, 5] },
      { mat: 'เนื้อไก่ (ไก่/ ไก่งวง)', v: [2, 5, 2, 4] },
      { mat: 'ปลาแกะ (MK/ SE/ SD)', v: [3, 6, 2, 5] },
      { mat: 'ปลาแกะ (TN/ SM)', v: [6, 6, 2, 8] },
      { mat: 'Shelf fish (กุ้ง/ ปลาหมึก/ หอย)', v: [2, 3, 2, 4] },
      { mat: 'เลือดทูน่า/ เศษทูน่า', v: [2, 4, 2, 4] },
    ]);


    // ── Block 3: วัตถุดิบกลุ่ม 2 ──
    const colMat3 = 25;
    const colCh3 = 5;
    const blk3X = blk2X + colMat2 + colCh2 * 4 + 4;


    drawMatTable(blk3X, legendY, colMat3, colCh3, [
      { mat: 'ปลาสับสด/ เนื้อไก่สด', v: [1, 6, 1, 2] },
      { mat: 'ผัก-ผลไม้สด/ ผัก+ผลไม้แช่/ ผัก+ผลไม้ต้มแช่', v: [2, 10, 2, 4] },
      { mat: 'ผักต้ม/ ลวก/ ฟักทองต้ม', v: [2, 6, 2, 4] },
      { mat: 'ปลากระตัก/ ปลาข้าวสาร', v: [2, 6, 2, 4] },
      { mat: 'ข้าว/ ปลายข้าว', v: [2, 9, 2, 4] },
      { mat: 'น้ำอบไก่/ น้ำอบ MDM', v: [1, '-', '-', '-'] },
    ]);


    // ── Block 4: วัตถุดิบกลุ่ม 3 (Clunk / Stuff) ──
    const colMat4 = 25;
    const colCh4 = 5;
    const blk4X = blk3X + colMat3 + colCh3 * 4 + 4;


    drawMatTable(blk4X, legendY, colMat4, colCh4, [
      { mat: 'Clunk', v: [1, 12, 2, 3] },
      { mat: 'Stuff clunk (แท่ง)', v: [2, 48, 3, 5] },
      { mat: 'Stuff clunk (เส้น)', v: [2, 9, 3, 5] },
      { mat: 'CCM/ MDM อบ', v: [4, 2, 2, 6] },
      { mat: 'CCM/ MDM อบ (Cai 300)*', v: ['-', '-', '-', 3] },
      { mat: 'สาวละสาย/ เกรวี่', v: ['-', 6, '-', 2] },
    ]);


    // ── Block 5: Loaf types ──
    const colMat5 = 25;
    const colCh5 = 10;
    const blk5X = blk4X + colMat4 + colCh4 * 4 + 4;


    const colLoafExit = 10;
    const colLoafPack = 10;


    drawCell('วัตถุดิบ', blk5X, legendY, colMat5, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 7 });
    drawCell('ช่วงที่ 1', blk5X + colMat5, legendY, colCh5, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 7 });
    drawCell('ช่วงที่ 2', blk5X + colMat5 + colCh5, legendY, colCh5, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 7 });
    drawCell('ออกห้องเย็น -\nผสมเสร็จ', blk5X + colMat5 + colCh5 * 2, legendY, colLoafExit, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 6 });
    drawCell('ผสมเสร็จ -\nบรรจุเสร็จ', blk5X + colMat5 + colCh5 * 2 + colLoafExit, legendY, colLoafPack, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 6 });


    [
      { mat: 'Loaf (ของสด)', v1: 1, v2: 6, exit: 1, pack: 2 },
      { mat: 'Loaf (ของสุก)**', v1: 'ตามชนิดวัตถุดิบ', v2: 'ตามชนิดวัตถุดิบ', exit: 1, pack: 2 },
      { mat: 'Loaf sachet', v1: 'ตามชนิดวัตถุดิบ', v2: 'ตามชนิดวัตถุดิบ', exit: '1.0', pack: '1.0' },
      { mat: 'Loaf Mousse', v1: 'ตามชนิดวัตถุดิบ', v2: 'ตามชนิดวัตถุดิบ', exit: 1.5, pack: 1.5 },
    ].forEach((r, i) => {
      const ry = legendY + noteRowH * 2 + i * noteRowH;
      const isText = (v) => typeof v === 'string' && v === 'ตามชนิดวัตถุดิบ';
      drawCell(r.mat, blk5X, ry, colMat5, noteRowH, { fontSize: 6, align: 'left' });
      drawCell(String(r.v1), blk5X + colMat5, ry, colCh5, noteRowH, { fontSize: isText(r.v1) ? 4.5 : 7 });
      drawCell(String(r.v2), blk5X + colMat5 + colCh5, ry, colCh5, noteRowH, { fontSize: isText(r.v2) ? 4.5 : 7 });
      drawCell(String(r.exit), blk5X + colMat5 + colCh5 * 2, ry, colLoafExit, noteRowH, { fontSize: 7 });
      drawCell(String(r.pack), blk5X + colMat5 + colCh5 * 2 + colLoafExit, ry, colLoafPack, noteRowH, { fontSize: 7 });
    });


    // ─── FOOTER ───────────────────────────────────────────────
    // คำนวณ footerY จาก legendY + ความสูง header (2 แถว) + data rows (6 แถว) ของ legend blocks
    const legendBlockH = noteRowH * 2 + 6 * noteRowH;  // header 2 แถว + ข้อมูล 6 แถว
    const footerY = legendY + legendBlockH + 5;


    drawText('เอกสารการควบคุม Delay time:', margin, footerY, { fontSize: 7, align: 'left' });
    drawText('W3QCPF18, SQCIS001/ ISPP018', margin, footerY + 5, { fontSize: 7, align: 'left' });
    drawText(
      '** ปลาแกง(TN/SM) ช่วงที่ 1 เวลา 6 ชั่วโมง โดยแบ่งเป็นเอนเซอร์ - cooling เวที 3 ชั่วโมง และ Cooling เวที-เข้าห้องเย็นอีก 3 ชั่วโมง',
      margin + 52, footerY, { fontSize: 6, align: 'left' }
    );


    const sigY = footerY + 5 + 8;
    const subOffsetY = 7; // ระยะห่างบรรทัดล่าง


    [
      {
        label: 'Recorded by :',
        name: sigData.recordedBy || '',
        sub: '(Production Staff)',
        x: margin + 25
      },
      {
        label: 'Reviewed by :',
        name: sigData.reviewedBy || '',
        sub: '(Production Section Manager)',
        x: pageW / 2
      },
      {
        label: '',
        name: sigData.qcManager || '',
        sub: '(Quality Control Section Manager)',
        x: pageW - margin - 38
      },
    ].forEach(({ label, name, sub, x }) => {
      if (label) {
        drawText(label, x, sigY, { fontSize: 7, align: 'center' });
      }
      if (name) {
        drawText(name, x, sigY + subOffsetY * 0.6, { fontSize: 7, bold: true, align: 'center' });
      }
      drawText(sub, x, sigY + subOffsetY, { fontSize: 7, align: 'center' });
    });






    // ─── SAVE ─────────────────────────────────────────────────
    return doc.output('blob');
  };




  const exportToPDFWithData = async (dataRows, sigData = {}) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 5;


    doc.addFileToVFS('Sarabun-Regular.ttf', thSarabunBase64);
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    doc.addFileToVFS('Sarabun-Bold.ttf', thSarabunBoldBase64);
    doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
    doc.setFont('Sarabun', 'normal');
    doc.setLanguage('th');
    doc.setLineWidth(0.05);


    // ─── Helper functions ─────────────────────────────────────
    const drawRect = (x, y, w, h) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.rect(x, y, w, h);
    };


    const fillRect = (x, y, w, h, rgb) => {
      doc.setFillColor(...rgb);
      doc.rect(x, y, w, h, 'F');
    };


    const drawText = (text, x, y, opts = {}) => {
      const {
        fontSize = 8,
        align = 'center',
        bold = false,
        color = [0, 0, 0]
      } = opts;


      doc.setFont('Sarabun', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);


      const normalizedText = String(text ?? '').normalize('NFC');


      doc.text(normalizedText, x, y, {
        align,
      });
    };


    const drawCell = (text, x, y, w, h, opts = {}) => {
      const { fill, fontSize = 8, bold = false, align = 'center' } = opts;
      if (fill) fillRect(x, y, w, h, fill);
      drawRect(x, y, w, h);


      const lines = String(text ?? '').split('\n');
      const lineH = fontSize * 0.5;
      const totalH = lines.length * lineH;
      const startY = y + (h - totalH) / 2 + lineH * 0.8;


      lines.forEach((line, i) => {
        const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w - 1.5 : x + 1.5;
        drawText(line, tx, startY + i * lineH, { fontSize, bold, align });
      });
    };


    // ─── TABLE COLUMN WIDTHS ──────────────────────────────────
    const tX = margin;
    const tY = 29;
    const tW = pageW - margin * 2;


    const colCode = 14;
    const colRM = 50;
    const colBatch = 18;
    const batchCols = 10;
    const batchCellW = colBatch / batchCols;
    const colWeight = 10;
    const colGrpNo = 9;
    const colDate = 15;
    const colHist = 15;
    const sensoryCellW = 7;
    const colSensory = sensoryCellW * 3;
    const colPrepA = 13;
    const colCold1 = 13;
    const colColdOut1 = 13;
    const colCold2 = 13;
    const colColdOut2 = 13;
    const colPacked = 13;
    const colDBS1 = 10;
    const colDBS2 = 10;
    const colDBS3 = 10;
    const colDBS4 = 10;
    const colRemark = tW - colCode - colRM - colBatch - colWeight - colGrpNo
      - colDate - colHist - colSensory
      - colPrepA - colCold1 - colColdOut1
      - colCold2 - colColdOut2 - colPacked
      - colDBS1 - colDBS2 - colDBS3 - colDBS4;


    const h1 = 7;
    const h2 = 14;
    const headerH = h1 + h2;
    const hFill = [210, 228, 255];


    const minRows = 17;
    const bottomReserved = 80; // พื้นที่สำหรับ legend + signature
    const availableH = pageH - (tY + headerH) - bottomReserved;
    const rowH = Math.floor((availableH / minRows) * 10) / 10;


    // ฟังก์ชันวาด Header, Title, Info Bar
    const drawPageHeader = (pageNumber, totalPages) => {
      drawText('บริษัท ไอ-เทล คอร์ปอเรชั่น จำกัด (มหาชน)', pageW / 2, 12, {
        fontSize: 16, bold: true, align: 'center'
      });
      drawText(
        'รายงานควบคุมเวลากระบวนการผลิต โรงผลิตอาหารสัตว์เลี้ยง (Delay Time for Production Control Report)',
        pageW / 2, 19, { fontSize: 10, align: 'center' }
      );
      drawText('F3PFPF67-0-25/08/25', pageW - margin, 12, { fontSize: 8, align: 'right' });


      const infoY = 24;
      const gap = 4;


      const infoItems = [
        { label: 'Date:', value: exportDate || '', dotWidth: 30 },
        { label: 'Shift:', value: exportShift || '', dotWidth: 15 },
        { label: 'Line:', value: exportLine || '', dotWidth: 20 },
        { label: 'Plant:', value: exportPlant || '', dotWidth: 20 },
      ];


      let infoX = margin;
      doc.setFontSize(9);


      infoItems.forEach(({ label, value, dotWidth }) => {
        drawText(label, infoX, infoY, { fontSize: 9, align: 'left' });
        const labelWidth = doc.getTextWidth(label);


        const lineStartX = infoX + labelWidth + 1;
        const lineEndX = lineStartX + dotWidth;
        const lineY = infoY + 1;


        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(lineStartX, lineY, lineEndX, lineY);
        doc.setLineWidth(0.5);


        if (value) {
          const valueX = lineStartX + dotWidth / 2;
          drawText(value, valueX, infoY - 0.5, {
            fontSize: 9,
            align: 'center',
            color: [0, 0, 0]
          });
        }


        infoX = lineEndX + gap;
      });


      drawText(`Page: ${pageNumber} / ${totalPages}`, pageW - margin, infoY, { fontSize: 9, align: 'right' });
    };


    // ฟังก์ชันวาด Table Header
    const drawTableHeader = () => {
      let cx = tX;
      const cy = tY;


      drawCell('โค้ด\n(Product\nCode)', cx, cy, colCode, headerH, { fill: hFill, bold: true, fontSize: 5 });
      cx += colCode;


      drawCell('วัตถุดิบ\n(Raw Mat.)', cx, cy, colRM, headerH, { fill: hFill, bold: true, fontSize: 5 });
      cx += colRM;


      fillRect(cx, cy, colBatch, h1, hFill);
      drawRect(cx, cy, colBatch, h1);
      drawText('Batch', cx + colBatch / 2, cy + h1 / 2 + 2, { fontSize: 5, bold: true });


      for (let i = 0; i < batchCols; i++) {
        drawCell('', cx + i * batchCellW, cy + h1, batchCellW, h2, {
          fill: hFill,
          fontSize: 5
        });
      }


      cx += colBatch;


      drawCell('น้ำหนัก\n(nn.)\nWeight\n(kgs.)', cx, cy, colWeight, headerH, { fill: hFill, bold: true, fontSize: 5 });
      cx += colWeight;


      drawCell('ชุดที่\n(Batch)', cx, cy, colGrpNo, headerH, { fill: hFill, bold: true, fontSize: 5 });
      cx += colGrpNo;


      drawCell('วันที่-\nเวลา\nเตรียม', cx, cy, colDate, headerH, { fill: hFill, bold: true, fontSize: 5 });
      cx += colDate;


      drawCell('Hist. /ความ\nหนืด / อุณหภูมิ\nHist./ Viscosity\n/Temp', cx, cy, colHist, headerH, { fill: hFill, bold: true, fontSize: 5 });
      cx += colHist;


      fillRect(cx, cy, colSensory, h1, hFill);
      drawRect(cx, cy, colSensory, h1);
      drawText('Sensory', cx + colSensory / 2, cy + h1 / 2 + 2, { fontSize: 5, bold: true });
      [['สี', 'Color'], ['กลิ่น', 'Odor'], ['เนื้อสัมผัส', 'Texture']].forEach(([th, en], i) => {
        drawCell(`${th}\n${en}`, cx + i * sensoryCellW, cy + h1, sensoryCellW, h2, { fill: hFill, fontSize: 5 });
      });
      cx += colSensory;


      const timeGroupW = colPrepA + colCold1 + colColdOut1 + colCold2 + colColdOut2 + colPacked;
      fillRect(cx, cy, timeGroupW, h1, hFill);
      drawRect(cx, cy, timeGroupW, h1);
      drawText('เวลา (Time)', cx + timeGroupW / 2, cy + h1 / 2 + 2, { fontSize: 5, bold: true });
      const timeCols = [
        { label: 'เตรียมเสร็จ\n(Preparing\nFinished)\n(A)\n(เวลาออกห้อง\nเย็น)(A)', w: colPrepA },
        { label: 'เข้าห้องเย็น 1\n(Moving to\nCold Storage)\n(B)\n(เวลาเริ่มผสม)\n(B)', w: colCold1 },
        { label: 'ออกห้องเย็น 1\n(Leaving From\nCold Storage)\n(C)\n(เวลาผสมเสร็จ)\n(C)', w: colColdOut1 },
        { label: 'เข้าห้องเย็น 2\n(Moving to\nCold Storage)\n(D)', w: colCold2 },
        { label: 'ออกห้องเย็น 2\n(Leaving From\nCold Storage)\n(E)', w: colColdOut2 },
        { label: 'บรรจุเสร็จ\n(Finished\npacking)\n(F)\n(บรรจุเสร็จ)\n(F)', w: colPacked },
      ];
      let tcx = cx;
      timeCols.forEach(tc => {
        drawCell(tc.label, tcx, cy + h1, tc.w, h2, { fill: hFill, fontSize: 5 });
        tcx += tc.w;
      });
      cx += timeGroupW;


      const delayGroupW = colDBS1 + colDBS2 + colDBS3 + colDBS4;
      fillRect(cx, cy, delayGroupW, h1, hFill);
      drawRect(cx, cy, delayGroupW, h1);
      drawText('ดีเลย์ (Delay time) (hr.)', cx + delayGroupW / 2, cy + h1 / 2 + 2, { fontSize: 5, bold: true });
      [
        { label: '1\n(B-A)', w: colDBS1 },
        { label: '2\n(C-B)', w: colDBS2 },
        { label: '3\n(F-C)/\n(+D-C)', w: colDBS3 },
        { label: '4\n(C-A)+\n(F-C)', w: colDBS4 },
      ].forEach(dc => {
        drawCell(dc.label, cx, cy + h1, dc.w, h2, { fill: hFill, fontSize: 5 });
        cx += dc.w;
      });


      drawCell('หมายเหตุ\n(Remark)', cx, cy, colRemark, headerH, { fill: hFill, bold: true, fontSize: 5 });
    };


    // ฟังก์ชันวาด Footer (ทุกหน้า)
    const drawPageFooter = () => {
      const finalY = tY + headerH + minRows * rowH + 4;
      const legendY = finalY + 8;
      const noteRowH = 4;
      const hFillLegend = [210, 228, 255];


      const drawMatTable = (startX, startY, colMatW, colChW, rows) => {
        drawCell('วัตถุดิบ', startX, startY, colMatW, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 5.5 });


        fillRect(startX + colMatW, startY, colChW * 4, noteRowH, hFillLegend);
        drawRect(startX + colMatW, startY, colChW * 4, noteRowH);
        drawText('ช่วงที่', startX + colMatW + (colChW * 4) / 2, startY + noteRowH / 2 + 1.2, { fontSize: 5.5, bold: true });


        [1, 2, 3, 4].forEach((n, i) => {
          drawCell(String(n), startX + colMatW + i * colChW, startY + noteRowH, colChW, noteRowH, { fill: hFillLegend, bold: true, fontSize: 5.5 });
        });


        rows.forEach((r, i) => {
          const ry = startY + noteRowH * 2 + i * noteRowH;
          drawCell(r.mat, startX, ry, colMatW, noteRowH, { fontSize: 5.5, align: 'left' });
          r.v.forEach((val, j) => {
            drawCell(String(val), startX + colMatW + j * colChW, ry, colChW, noteRowH, { fontSize: 5.5 });
          });
        });
      };


      // Block 1
      const blk1X = margin;
      const colNote = 12.5;
      const colDesc = 32;


      drawCell('หมายเหตุ', blk1X, legendY, colNote, noteRowH, { fill: hFillLegend, bold: true, fontSize: 5.5 });
      drawCell('คำจำกัดความ', blk1X + colNote, legendY, colDesc, noteRowH, { fill: hFillLegend, bold: true, fontSize: 5.5 });


      [
        { note: 'ช่วงที่ 1', desc: 'เตรียมเสร็จ - เข้าห้องเย็น' },
        { note: 'ช่วงที่ 2', desc: 'เข้าห้องเย็น - ออกห้องเย็น' },
        { note: 'ช่วงที่ 3', desc: 'ออกห้องเย็น - บรรจุเสร็จ' },
        { note: 'ช่วงที่ 4', desc: 'เตรียมเสร็จ - บรรจุเสร็จ' },
      ].forEach((r, i) => {
        const ry = legendY + noteRowH + i * noteRowH;
        drawCell(r.note, blk1X, ry, colNote, noteRowH, { fontSize: 5.5 });
        drawCell(r.desc, blk1X + colNote, ry, colDesc, noteRowH, { fontSize: 5.5, align: 'left' });
      });


      // Block 2
      const colMat2 = 28;
      const colCh2 = 5;
      const blk2X = blk1X + colNote + colDesc + 4;


      drawMatTable(blk2X, legendY, colMat2, colCh2, [
        { mat: 'เนื้อสัตว์ (วัว/ เป็ด/ แกะ)', v: [3, 9, 2, 5] },
        { mat: 'เนื้อไก่ (ไก่/ ไก่งวง)', v: [2, 5, 2, 4] },
        { mat: 'ปลาแกะ (MK/ SE/ SD)', v: [3, 6, 2, 5] },
        { mat: 'ปลาแกะ (TN/ SM)', v: [6, 6, 2, 8] },
        { mat: 'Shelf fish (กุ้ง/ ปลาหมึก/ หอย)', v: [2, 3, 2, 4] },
        { mat: 'เลือดทูน่า/ เศษทูน่า', v: [2, 4, 2, 4] },
      ]);


      // Block 3
      const colMat3 = 38;
      const colCh3 = 5;
      const blk3X = blk2X + colMat2 + colCh2 * 4 + 4;


      drawMatTable(blk3X, legendY, colMat3, colCh3, [
        { mat: 'ปลาสับสด/ เนื้อไก่สด', v: [1, 6, 1, 2] },
        { mat: 'ผัก-ผลไม้สด/ ผัก+ผลไม้แช่/ ผัก+ผลไม้ต้มแช่', v: [2, 10, 2, 4] },
        { mat: 'ผักต้ม/ ลวก/ ฟักทองต้ม', v: [2, 6, 2, 4] },
        { mat: 'ปลากระตัก/ ปลาข้าวสาร', v: [2, 6, 2, 4] },
        { mat: 'ข้าว/ ปลายข้าว', v: [2, 9, 2, 4] },
        { mat: 'น้ำอบไก่/ น้ำอบ MDM', v: [1, '-', '-', '-'] },
      ]);


      // Block 4
      const colMat4 = 27;
      const colCh4 = 5;
      const blk4X = blk3X + colMat3 + colCh3 * 4 + 4;


      drawMatTable(blk4X, legendY, colMat4, colCh4, [
        { mat: 'Clunk', v: [1, 12, 2, 3] },
        { mat: 'Stuff clunk (แท่ง)', v: [2, 48, 3, 5] },
        { mat: 'Stuff clunk (เส้น)', v: [2, 9, 3, 5] },
        { mat: 'CCM/ MDM อบ', v: [4, 2, 2, 6] },
        { mat: 'CCM/ MDM อบ (Cai 300)*', v: ['-', '-', '-', 3] },
        { mat: 'สาวละสาย/ เกรวี่', v: ['-', 6, '-', 2] },
      ]);


      // Block 5
      const colMat5 = 20;
      const colCh5 = 13;
      const blk5X = blk4X + colMat4 + colCh4 * 4 + 4;
      const colLoafExit = 13;
      const colLoafPack = 13;


      drawCell('วัตถุดิบ', blk5X, legendY, colMat5, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 5.5 });
      drawCell('ช่วงที่ 1', blk5X + colMat5, legendY, colCh5, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 5.5 });
      drawCell('ช่วงที่ 2', blk5X + colMat5 + colCh5, legendY, colCh5, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 5.5 });
      drawCell('ออกห้องเย็น -\nผสมเสร็จ', blk5X + colMat5 + colCh5 * 2, legendY, colLoafExit, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 5.5 });
      drawCell('ผสมเสร็จ -\nบรรจุเสร็จ', blk5X + colMat5 + colCh5 * 2 + colLoafExit, legendY, colLoafPack, noteRowH * 2, { fill: hFillLegend, bold: true, fontSize: 5.5 });


      [
        { mat: 'Loaf (ของสด)', v1: 1, v2: 6, exit: 1, pack: 2 },
        { mat: 'Loaf (ของสุก)**', v1: 'ตามชนิดวัตถุดิบ', v2: 'ตามชนิดวัตถุดิบ', exit: 1, pack: 2 },
        { mat: 'Loaf sachet', v1: 'ตามชนิดวัตถุดิบ', v2: 'ตามชนิดวัตถุดิบ', exit: '1.0', pack: '1.0' },
        { mat: 'Loaf Mousse', v1: 'ตามชนิดวัตถุดิบ', v2: 'ตามชนิดวัตถุดิบ', exit: 1.5, pack: 1.5 },
      ].forEach((r, i) => {
        const ry = legendY + noteRowH * 2 + i * noteRowH;
        drawCell(r.mat, blk5X, ry, colMat5, noteRowH, { fontSize: 5.5, align: 'left' });
        drawCell(String(r.v1), blk5X + colMat5, ry, colCh5, noteRowH, { fontSize: 5.5 });
        drawCell(String(r.v2), blk5X + colMat5 + colCh5, ry, colCh5, noteRowH, { fontSize: 5.5 });
        drawCell(String(r.exit), blk5X + colMat5 + colCh5 * 2, ry, colLoafExit, noteRowH, { fontSize: 5.5 });
        drawCell(String(r.pack), blk5X + colMat5 + colCh5 * 2 + colLoafExit, ry, colLoafPack, noteRowH, { fontSize: 5.5 });
      });


      // Footer text + signatures
      const legendBlockH = noteRowH * 2 + 6 * noteRowH;
      const footerY = legendY + legendBlockH + 5;


      drawText('เอกสารการควบคุม Delay time:', margin, footerY, { fontSize: 8, align: 'left' });
      drawText('W3QCPF18, SQCIS001/ ISPP018', margin, footerY + 5, { fontSize: 8, align: 'left' });
      drawText(
        '** ปลาแกง(TN/SM) ช่วงที่ 1 เวลา 6 ชั่วโมง โดยแบ่งเป็นเอนเซอร์ - cooling เวที 3 ชั่วโมง และ Cooling เวที-เข้าห้องเย็นอีก 3 ชั่วโมง',
        margin + 52, footerY, { fontSize: 7, align: 'left' }
      );


      const sigY = footerY + 5 + 7;
      const lineSpacing = 5;


      [
        { label: 'Recorded by :', name: sigData.recordedBy || '', sub: '(Production Staff)', x: margin + 40, lineWidth: 40 },
        { label: 'Reviewed by :', name: sigData.reviewedBy || '', sub: '(Production Section Manager)', x: pageW / 2, lineWidth: 40 },
        { label: '', name: sigData.qcManager || '', sub: '(Quality Control Section Manager)', x: pageW - margin - 38, lineWidth: 40 },
      ].forEach(({ label, name, sub, x, lineWidth }) => {
        if (label) {
          const labelWidth = doc.getTextWidth(label);
          const startX = x - lineWidth / 2 - labelWidth - 2;
          drawText(label, startX, sigY, { fontSize: 8, align: 'left' });
        }


        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(x - lineWidth / 2, sigY + 1, x + lineWidth / 2, sigY + 1);
        doc.setLineWidth(0.5);


        if (name) {
          drawText(name, x, sigY - 0.5, { fontSize: 8, bold: true, align: 'center' });
        }


        drawText(sub, x, sigY + lineSpacing, { fontSize: 8, align: 'center' });
      });
    };


    // ─── MAIN LOGIC ───────────────────────────────────────────
    const toDisplay = (v, isSensory = false) => {
      if (v === null || v === undefined || v === '') return '-';
      if (typeof v === 'boolean') {
        if (isSensory) {
          return v ? 'ผ่าน' : 'ไม่ผ่าน';
        }
        return v ? '✓' : '✗';
      }
      return String(v);
    };


    const totalPages = Math.ceil(dataRows.length / minRows);


    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) {
        doc.addPage();
      }


      drawPageHeader(pageNum, totalPages);
      drawTableHeader();


      const startIdx = (pageNum - 1) * minRows;
      const endIdx = Math.min(startIdx + minRows, dataRows.length);
      const pageRows = dataRows.slice(startIdx, endIdx);


      pageRows.forEach((row, i) => {
        const ry = tY + headerH + i * rowH;
        const rowFill = i % 2 === 0 ? [255, 255, 255] : [240, 248, 255];
        let rx = tX;


        const cell = (text, w, opts = {}, isSensory = false) => {
          drawCell(toDisplay(text, isSensory), rx, ry, w, rowH, { fill: rowFill, fontSize: 8, ...opts });
          rx += w;
        };


        cell(row.production, colCode, { fontSize: 6.5, bold: true });
        cell(row.mat_name, colRM, { align: 'left', fontSize: 6 });
        const batchStr = String(row.batch_after ?? '').padEnd(batchCols, ' ');
        for (let b = 0; b < batchCols; b++) {
          cell(batchStr[b] || '', batchCellW);
        }
        cell(row.weight_RM, colWeight);
        cell(row.group_no, colGrpNo);
        cell(formatDateTimeForPDF(row.rmit_date), colDate, { fontSize: 5, bold: true });
        cell(row.detail, colHist, { fontSize: 7, bold: true });
        cell(row.color, sensoryCellW, { fontSize: 7 }, true);
        cell(row.odor, sensoryCellW, { fontSize: 7 }, true);
        cell(row.texture, sensoryCellW, { fontSize: 7 }, true);
        cell(formatDateTimeForPDF(row.rmit_date), colPrepA, { fontSize: 5, bold: true });
        cell(formatDateTimeForPDF(row.come_cold_date), colCold1, { fontSize: 5, bold: true });
        cell(formatDateTimeForPDF(row.out_cold_date), colColdOut1, { fontSize: 5, bold: true });
        cell(formatDateTimeForPDF(row.come_cold_date_two), colCold2, { fontSize: 5, bold: true });
        cell(formatDateTimeForPDF(row.out_cold_date_two), colColdOut2, { fontSize: 5, bold: true });
        cell(formatDateTimeForPDF(row.sc_pack_date), colPacked, { fontSize: 5, bold: true });
        cell(calculateDBS1(row), colDBS1, { fontSize: 5, bold: true });
        cell(calculateDBS2(row), colDBS2, { fontSize: 5, bold: true });
        cell(calculateDBS3(row), colDBS3, { fontSize: 5, bold: true });
        cell(calculateDBS4(row), colDBS4, { fontSize: 5, bold: true });
        cell('', colRemark);
      });


      const remainingRows = minRows - pageRows.length;
      for (let e = 0; e < remainingRows; e++) {
        const ry = tY + headerH + (pageRows.length + e) * rowH;
        let rx = tX;
        const emptyCell = (w) => { drawRect(rx, ry, w, rowH); rx += w; };
        [colCode, colRM, ...Array(batchCols).fill(batchCellW), colWeight, colGrpNo, colDate, colHist,
          sensoryCellW, sensoryCellW, sensoryCellW,
          colPrepA, colCold1, colColdOut1, colCold2, colColdOut2, colPacked,
          colDBS1, colDBS2, colDBS3, colDBS4, colRemark
        ].forEach(emptyCell);
      }


      // ✅ วาด Footer ทุกหน้า (ไม่ต้องเช็ค pageNum === totalPages)
      drawPageFooter();
    }


    doc.save(`F3PFPF67_${new Date().toISOString().split('T')[0]}.pdf`);
  };


  const handleUploadPDF = async (event) => {
    const file = event.target.files[0];
    if (!file) return;


    try {
      const reader = new FileReader();


      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;


        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let extractedText = '';


        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          extractedText += pageText + '\n';
        }


        console.log('Extracted text from PDF:', extractedText);
        alert('อัปโหลด PDF สำเร็จ!\nข้อมูลที่สกัดได้:\n' + extractedText.substring(0, 200) + '...');
      };


      reader.readAsArrayBuffer(file);


    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลด PDF');
    }


    event.target.value = '';
  };


  // Export to Excel function
  const exportToExcel = () => {
    const headerNames = {
      "production": "แผนการผลิต",
      "mat_name": "รายชื่อวัตถุดิบ",
      "batch_after": "Batch",
      "group_no": "ชุดที่",
      "rmit_date": "เวลาเตรียมเสร็จ",
      "color": "สี",
      "odor": "กลิ่น",
      "texture": "เนื้อสัมผัส",
      "weight_RM": "น้ำหนักวัตถุดิบ",
      "detail": "รายละเอียดวัตถุดิบ",
      "come_cold_date": "เข้าห้องเย็น1",
      "come_cold_date_two": "เข้าห้องเย็น2",
      "come_cold_date_three": "เข้าห้องเย็น3",
      "out_cold_date": "ออกห้องเย็น1",
      "out_cold_date_two": "ออกห้องเย็น2",
      "out_cold_date_three": "ออกห้องเย็น3",
      "sc_pack_date": "บรรจุเสร็จ",
      "dbs1": "DBS 1",
      "dbs2": "DBS 2",
      "dbs3": "DBS 3",
      "dbs4": "DBS 4"
    };


    // Prepare data for export
    const exportData = filteredRows.map(row => {
      const exportRow = {};
      displayColumns.forEach(col => {
        if (col === 'dbs1') {
          exportRow[headerNames[col]] = calculateDBS1(row);
        } else if (col === 'dbs2') {
          exportRow[headerNames[col]] = calculateDBS2(row);
        } else if (col === 'dbs3') {
          exportRow[headerNames[col]] = calculateDBS3(row);
        } else if (col === 'dbs4') {
          exportRow[headerNames[col]] = calculateDBS4(row);
        } else {
          exportRow[headerNames[col]] = row[col] ?? '-';
        }
      });
      return exportRow;
    });


    // Convert to CSV
    const headers = displayColumns.map(col => headerNames[col]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(header => {
          const value = row[header] || '-';
          return `"${value}"`;
        }).join(',')
      )
    ].join('\n');


    // Add BOM for UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);


    link.setAttribute('href', url);
    link.setAttribute('download', `prep_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const totalCustomWidth = Object.values(CUSTOM_COLUMN_WIDTHS).reduce((sum, width) => sum + parseInt(width), 0);
  const remainingWidth = `calc((100% - ${totalCustomWidth}px) / ${displayColumns.length})`;
  const columnWidths = Array(displayColumns.length).fill(remainingWidth);


  const headerNames = {
    "production": "แผนการผลิต",
    "mat_name": "รายชื่อวัตถุดิบ",
    "batch_after": "Batch",
    "group_no": "ชุดที่",
    "rmit_date": "เวลาเตรียมเสร็จ",
    "color": "สี",
    "odor": "กลิ่น",
    "texture": "เนื้อสัมผัส",
    "weight_RM": "น้ำหนักวัตถุดิบ",
    "detail": "รายละเอียดวัตถุดิบ",
    "come_cold_date": "เข้าห้องเย็น1",
    "come_cold_date_two": "เข้าห้องเย็น2",
    "come_cold_date_three": "เข้าห้องเย็น3",
    "out_cold_date": "ออกห้องเย็น1",
    "out_cold_date_two": "ออกห้องเย็น2",
    "out_cold_date_three": "ออกห้องเย็น3",
    "sc_pack_date": "บรรจุเสร็จ",
    "dbs1": "DBS 1",
    "dbs2": "DBS 2",
    "dbs3": "DBS 3",
    "dbs4": "DBS 4"
  };


  const getColumnWidth = (header) => {
    if (header === "production") return "150px";
    if (header === "mat_name") return "200px";
    if (header === "rmit_date") return "150px";
    if (header === "color") return "150px";
    if (header === "odor") return "150px";
    if (header === "texture") return "150px";
    if (header === "tro_id") return "180px";
    if (["weight_RM"].includes(header)) return "90px";
    if (header === "batch_after") return "120px";
    if (header === "group_no") return "120px";
    if (header === "detail") return "150px";
    if (header === "mat") return "150px";
    if (header === "out_cold_date") return "150px";
    if (header === "out_cold_date_two") return "150px";
    if (header === "out_cold_date_three") return "150px";
    if (header === "come_cold_date") return "150px";
    if (header === "come_cold_date_two") return "150px";
    if (header === "come_cold_date_three") return "150px";
    if (header === "sc_pack_date") return "150px";
    if (["dbs1", "dbs2", "dbs3", "dbs4"].includes(header)) return "153px";
    return "150px";
  };


  const handleDeleteItemWithDelay = (row) => {
    const rowWithDelay = { ...row };
    handleOpenDeleteModal(rowWithDelay);
  };




  return (
    <Paper sx={{
      width: '100%',
      overflow: 'hidden',
      boxShadow: '0px 4px 20px rgba(33, 150, 243, 0.1)',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)'
    }}>
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
        `}
      </style>


      {/* Header Section with improved design */}
      <Box sx={{
        background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
        padding: '20px 24px',
        borderRadius: '16px 16px 0 0'
      }}>
        {/* Search and Actions Row */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          gap: 2,
          marginBottom: 2
        }}>
          <TextField
            variant="outlined"
            fullWidth
            placeholder="พิมพ์เพื่อค้นหา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: '#2196F3' }} />
                </InputAdornment>
              ),
              sx: {
                height: "44px",
                backgroundColor: '#fff',
                borderRadius: '12px',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)'
                }
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                height: "44px",
                fontSize: "14px",
                borderRadius: "12px",
                color: "#546E7A",
                '& fieldset': {
                  borderColor: 'transparent',
                },
                '&:hover fieldset': {
                  borderColor: '#2196F3',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#2196F3',
                  borderWidth: '2px'
                },
              },
              "& input": {
                padding: "10px",
              },
            }}
          />
          {/* Export & Upload Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Export CSV Button */}
            <IconButton
              onClick={exportToExcel}
              sx={{
                backgroundColor: '#fff',
                color: '#4CAF50',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: '#E8F5E9',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(76, 175, 80, 0.25)'
                }
              }}
              title="Export เป็น CSV"
            >
              <FileDownloadIcon />
            </IconButton>


            {/* Export PDF Button */}
            <IconButton
              onClick={handleOpenPDFPreview}
              sx={{
                backgroundColor: '#fff',
                color: '#00a6ff',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: '#eeebff',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(244, 67, 54, 0.25)'
                }
              }}
              title="Export เป็น PDF"
            >
              <PictureAsPdfIcon />
            </IconButton>


          </Box>




        </Box>


        {/* Filters and Weight Summary Row */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon sx={{ color: '#fff', fontSize: '20px' }} />
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>ตัวกรอง:</span>
          </Box>


          <SearchableDropdown
            label="Line Name"
            options={uniqueLineNames}
            value={selectedLineName}
            onChange={setSelectedLineName}
            placeholder="เลือก Line Name"
          />
          <SearchableDropdown
            label="Doc No"
            options={uniqueDocNos}
            value={selectedDocNo}
            onChange={setSelectedDocNo}
            placeholder="เลือก Doc No"
          />
          <SearchableDropdown
            label="sc_pack_date"
            options={uniqueSCPackDate}
            value={selectedSCPackDate}
            onChange={setselectedSCPackDate}
            placeholder="เลือกวันที่บรรจุเสร็จ"
          />
          <SearchableDropdown
            label="Shift"
            options={['DS', 'NS']}
            value={selectedShift}
            onChange={setSelectedShift}
            placeholder="เลือก Shift"
          />


          {/* Weight Summary Chip */}
          <Chip
            icon={<FaWeight style={{ fontSize: '16px' }} />}
            label={`น้ำหนักรวม: ${totalWeight.toFixed(2)} กก.`}
            sx={{
              backgroundColor: '#fff',
              color: '#2196F3',
              fontWeight: '600',
              fontSize: '14px',
              height: '42px',
              borderRadius: '12px',
              padding: '0 8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              animation: 'pulse 2s infinite',
              '& .MuiChip-icon': {
                color: '#2196F3'
              }
            }}
          />
        </Box>
      </Box>


      <TableContainer
        style={{ padding: '0px 20px' }}
        sx={{
          height: 'calc(68vh)',
          overflowY: 'auto',
          whiteSpace: 'nowrap',
          '@media (max-width: 1200px)': {
            overflowX: 'scroll',
            minWidth: "200px"
          },
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '10px'
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#2196F3',
            borderRadius: '10px',
            '&:hover': {
              background: '#1976D2'
            }
          }
        }}
      >
        <Table stickyHeader style={{ tableLayout: 'auto' }} sx={{ minWidth: '1270px', width: 'max-content' }}>
          <TableHead style={{ marginBottom: "10px" }}>
            <TableRow sx={{ height: '48px' }}>
              {displayColumns.map((header, index) => (
                <TableCell
                  key={index}
                  align="center"
                  style={{
                    backgroundColor: "#2196F3",
                    borderTop: "1px solid #1976D2",
                    borderBottom: "1px solid #1976D2",
                    borderLeft: index === 0 ? "1px solid #1976D2" : "1px solid rgba(255,255,255,0.1)",
                    borderRight: index === displayColumns.length - 1 ? "1px solid #1976D2" : "1px solid rgba(255,255,255,0.1)",
                    fontSize: '14px',
                    color: '#fff',
                    padding: '12px',
                    width: getColumnWidth(header),
                    fontWeight: '600',
                    borderTopLeftRadius: index === 0 ? '12px' : '0',
                    borderTopRightRadius: index === displayColumns.length - 1 ? '12px' : '0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <Box style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px' }}>
                    {headerNames[header] || header}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>


          <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
            {filteredRows.length > 0 ? (
              filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <Row
                  key={index}
                  row={row}
                  columnWidths={columnWidths}
                  handleOpenModal={handleOpenModal}
                  handleRowClick={handleRowClick}
                  handleOpenEditModal={handleOpenEditModal}
                  handleOpenEditLineModal={handleOpenEditLineModal}
                  handleOpenDeleteModal={handleDeleteItemWithDelay}
                  handleOpenSuccess={handleOpenSuccess}
                  handleConfirmRow={onConfirmRow}
                  selectedColor={selectedColor}
                  openRowId={openRowId}
                  index={index}
                  setOpenRowId={setOpenRowId}
                  displayColumns={displayColumns}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={displayColumns.length} align="center" sx={{
                  padding: "40px",
                  fontSize: "16px",
                  color: "#90A4AE",
                  fontWeight: '500'
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <SearchIcon sx={{ fontSize: '48px', color: '#BBDEFB' }} />
                    <span>ไม่มีรายการวัตถุดิบในขณะนี้</span>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>


      <TablePagination
        sx={{
          borderTop: '1px solid #E3F2FD',
          backgroundColor: '#F8FBFF',
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar": {
            fontSize: '13px',
            color: "#546E7A",
            padding: "0px",
            fontWeight: '500'
          },
          "& .MuiTablePagination-select": {
            fontSize: '13px',
            color: "#2196F3",
            fontWeight: '600'
          },
          "& .MuiTablePagination-actions button": {
            color: "#2196F3",
            '&:hover': {
              backgroundColor: '#E3F2FD'
            }
          }
        }}
        rowsPerPageOptions={[100, 500, 1000]}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="แถวต่อหน้า:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
      />
      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '95vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>


            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #00a6ff 0%, #0b0082 100%)',
              padding: '5px 5px',
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <PictureAsPdfIcon style={{ color: '#fff', fontSize: '28px' }} />
                <div>
                  <div style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                    ตรวจสอบก่อน Export PDF
                  </div>


                </div>
              </div>
              <IconButton
                onClick={() => setShowPDFPreview(false)}
                sx={{ color: '#fff', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
              >
                <ClearIcon />
              </IconButton>
            </div>


            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #cdeeff',
              backgroundColor: '#F0F8FF',
              flexShrink: 0
            }}>
              {/* <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '4px', height: '18px', backgroundColor: '#00a6ff', borderRadius: '2px' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>ข้อมูลเอกสาร</span>
              </div> */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {/* Date Input */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' }}>
                    Date <span style={{ color: '#00a6ff' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={exportDate}
                    onChange={(e) => setExportDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#fff',
                      color: '#333'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '2px solid #00a6ff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0,166,255,0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid #ddd';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>


                {/* Shift Select */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' }}>
                    Shift <span style={{ color: '#00a6ff' }}>*</span>
                  </label>
                  <select
                    value={exportShift}
                    onChange={(e) => setExportShift(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#fff',
                      color: '#333',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '2px solid #00a6ff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0,166,255,0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid #ddd';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">-- เลือก Shift --</option>
                    <option value="DS">DS (Day Shift)</option>
                    <option value="NS">NS (Night Shift)</option>
                  </select>
                </div>


                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' }}>
                    Line <span style={{ color: '#00a6ff' }}>*</span>
                  </label>
                  <SearchableLineDropdown
                    value={exportLine}
                    onChange={setExportLine}
                    options={lineOptions}
                  />
                </div>


                {/* Plant Input */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' }}>
                    Plant
                  </label>
                  <input
                    type="text"
                    value={exportPlant}
                    onChange={(e) => setExportPlant(e.target.value)}
                    placeholder="ระบุ Plant (ถ้ามี)"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#fff',
                      color: '#333'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '2px solid #00a6ff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0,166,255,0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid #ddd';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>








              </div>
            </div>






            {/* Table */}
            <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, padding: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1200px' }}>
                <thead>
                  <tr>
                    {displayColumns.map((col, i) => (
                      <th key={i} style={{
                        backgroundColor: '#00a6ff', color: '#fff',
                        padding: '10px 12px', textAlign: 'center',
                        fontWeight: '600', whiteSpace: 'nowrap',
                        border: '1px solid #00a6ff',
                        position: 'sticky', top: 0, zIndex: 10
                      }}>
                        {headerNames[col] || col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.length > 0 ? (
                    previewData.map((row, rowIdx) => (
                      <tr key={rowIdx} style={{
                        backgroundColor: rowIdx % 2 === 0 ? '#fff' : '#FFF8F8'
                      }}>
                        {displayColumns.map((col, colIdx) => {
                          const isCalculated = ['dbs1', 'dbs2', 'dbs3', 'dbs4'].includes(col);
                          const cellValue = isCalculated
                            ? (col === 'dbs1' ? calculateDBS1(row)
                              : col === 'dbs2' ? calculateDBS2(row)
                                : col === 'dbs3' ? calculateDBS3(row)
                                  : calculateDBS4(row))
                            : (row[col] ?? '');


                          return (
                            <td key={colIdx} style={{
                              padding: '4px 6px',
                              border: '1px solid #cdeeff',
                              textAlign: 'center',
                              whiteSpace: 'nowrap'
                            }}>
                              {isCalculated ? (
                                <span style={{ color: '#888', fontSize: '12px' }}>
                                  {cellValue}
                                </span>
                              ) : (
                                <input
                                  value={String(cellValue)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPreviewData(prev => {
                                      const updated = [...prev];
                                      updated[rowIdx] = { ...updated[rowIdx], [col]: val };
                                      return updated;
                                    });
                                  }}
                                  style={{
                                    border: '1px solid transparent',
                                    borderRadius: '4px',
                                    padding: '4px 6px',
                                    fontSize: '13px',
                                    textAlign: 'center',
                                    width: '100%',
                                    minWidth: '80px',
                                    backgroundColor: 'transparent',
                                    outline: 'none'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.border = '1px solid #00a6ff';
                                    e.target.style.backgroundColor = '#fff';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(244,67,54,0.15)';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.border = '1px solid transparent';
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.boxShadow = 'none';
                                  }}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={displayColumns.length} style={{
                        textAlign: 'center', padding: '40px', color: '#aaa'
                      }}>
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>


            {/* Signature Section */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #cdeeff',
              backgroundColor: '#FFFAFA',
              flexShrink: 0
            }}>
              {/* <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '4px', height: '18px', backgroundColor: '#00a6ff', borderRadius: '2px' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>ข้อมูลผู้รับผิดชอบ</span>
              </div> */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[
                  { key: 'recordedBy', label: 'Recorded by', placeholder: 'ชื่อผู้บันทึก', sub: '(Production Staff)', required: true },
                  { key: 'reviewedBy', label: 'Reviewed by', placeholder: 'ชื่อผู้ตรวจสอบ', sub: '(Production Section Manager)', required: true },
                  { key: 'qcManager', label: 'QC Manager', placeholder: 'ชื่อผู้จัดการ QC', sub: '(Quality Control Section Manager)', required: false },
                ].map(({ key, label, placeholder, sub, required }) => (
                  <div key={key} style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' }}>
                      {label} {required && <span style={{ color: '#00a6ff' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={signatureData[key]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSignatureData(prev => ({ ...prev, [key]: val }));
                      }}
                      placeholder={placeholder}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: '#fff',
                        color: '#333'
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '2px solid #00a6ff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(244,67,54,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid #ddd';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>


            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #cdeeff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#FFF8F8',
              borderRadius: '0 0 16px 16px',
              flexShrink: 0
            }}>
              <div style={{ flex: 1 }}>
                {saveError && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    color: '#0b0082', fontSize: '13px',
                    backgroundColor: '#ffffff', padding: '8px 12px',
                    borderRadius: '8px', border: '1px solid #cdeeff'
                  }}>
                    <ClearIcon style={{ fontSize: '16px' }} />
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    color: '#2E7D32', fontSize: '13px',
                    backgroundColor: '#E8F5E9', padding: '8px 12px',
                    borderRadius: '8px', border: '1px solid #C8E6C9'
                  }}>
                    ✓ บันทึกรายชื่อสำเร็จ กำลังสร้าง PDF...
                  </div>
                )}
              </div>


              <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                <button
                  onClick={() => { setShowPDFPreview(false); setSaveError(''); setSaveSuccess(false); }}
                  disabled={isSaving}
                  style={{
                    padding: '10px 24px', borderRadius: '10px',
                    border: '1px solid #ddd', backgroundColor: '#fff',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '14px', color: '#666', opacity: isSaving ? 0.6 : 1
                  }}
                >
                  ยกเลิก
                </button>


                <button
                  onClick={async () => {
                    // ✅ Validation
                    if (!exportDate) {
                      setSaveError('กรุณาระบุวันที่');
                      return;
                    }
                    if (!exportShift) {
                      setSaveError('กรุณาเลือก Shift');
                      return;
                    }
                    if (!exportLine) {  // ✅ เพิ่ม validation
                      setSaveError('กรุณาเลือก Line');
                      return;
                    }
                    if (!signatureData.recordedBy) {
                      setSaveError('กรุณาระบุผู้บันทึก (Recorded by)');
                      return;
                    }
                    if (!signatureData.reviewedBy) {
                      setSaveError('กรุณาระบุผู้ตรวจสอบ (Reviewed by)');
                      return;
                    }


                    // ดำเนินการบันทึก...
                    setSaveError('');
                    setSaveSuccess(false);
                    setIsSaving(true);
                    try {
                      await saveSignatureToAPI(signatureData, previewData);
                      setSaveSuccess(true);
                      await new Promise(resolve => setTimeout(resolve, 800));
                      await exportToPDFWithData(previewData, signatureData);
                      setShowPDFPreview(false);
                      setSaveSuccess(false);
                    } catch (err) {
                      console.error('Error:', err);
                      setSaveError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  style={{
                    padding: '10px 24px', borderRadius: '10px', border: 'none',
                    background: isSaving
                      ? 'linear-gradient(135deg, #00a6ff 0%, #E57373 100%)'
                      : 'linear-gradient(135deg, #00a6ff 0%, #0b0082 100%)',
                    color: '#fff',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '14px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    minWidth: '160px', justifyContent: 'center'
                  }}
                >
                  {isSaving ? (
                    <>
                      <div style={{
                        width: '16px', height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid #fff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <PictureAsPdfIcon style={{ fontSize: '18px' }} />
                      บันทึก & Export PDF
                    </>
                  )}
                </button>
              </div>
            </div>


          </div>
        </div>
      )}


    </Paper>
  );
};


const FilterButton = ({ color, selectedColor, onClick }) => {
  const [isHovered, setHovered] = useState(false);


  const colors = {
    green: { default: "#54e032", hover: "#6eff42", selected: "#54e032" },
    yellow: { default: "#f0cb4d", hover: "#ffdf5d", selected: "#f0cb4d" },
    red: { default: "#ff4444", hover: "#ff6666", selected: "#ff4444" },
  };


  const isSelected = selectedColor === color;
  const noSelection = selectedColor == null;
  const currentColor = colors[color];


  const baseStyle = {
    border: isSelected
      ? `2px solid ${currentColor.selected}`
      : `1px solid ${isHovered ? currentColor.hover : "#e0e0e0"}`,
    padding: 6,
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    backgroundColor: isSelected
      ? "transparent"
      : isHovered
        ? currentColor.hover
        : currentColor.default,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
  };


  return (
    <div
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: currentColor.selected,
            opacity: 0.2,
            zIndex: 0,
          }}
        />
      )}


      <FaRegCircle
        style={{
          color: isSelected
            ? currentColor.selected
            : noSelection
              ? "#ffffff"
              : "#ffffff",
          fontSize: 24,
          transition: "color 0.2s ease-in-out",
          position: "relative",
          zIndex: 1,
          opacity: isSelected ? 1 : 0.9,
        }}
      />
    </div>
  );
};


export default TableMainPrep;



