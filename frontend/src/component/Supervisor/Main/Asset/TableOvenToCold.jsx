import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography, styled, IconButton } from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { SlClose } from "react-icons/sl";
import { FaRegCircle, FaRegCheckCircle, FaEye } from "react-icons/fa";

const CUSTOM_COLUMN_WIDTHS = {
  delayTime: '200px',
  viewDetails: '70px'
};

// ฟังก์ชันเพื่อหาวันที่ล่าสุดในการเข้าห้องเย็น
const getLatestComeColdDate = (row) => {
  // เก็บวันที่ทั้งหมดในอาร์เรย์
  const dates = [
    row.come_cold_date,
    row.come_cold_date_two,
    row.come_cold_date_three
  ].filter(date => date); // กรองเอาเฉพาะค่าที่ไม่เป็น null หรือ undefined

  if (dates.length === 0) {
    // ถ้าไม่มีวันที่เข้าห้องเย็นเลย ให้ใช้วันที่ rmit แทน (ถ้ามี)
    return row.rmit_date || null;
  }

  // แปลงเป็น Date objects
  const dateObjects = dates.map(date => new Date(date));

  // หาวันที่ล่าสุด
  return new Date(Math.max(...dateObjects)).toISOString().replace('T', ' ');
};

const calculateTimeDifference = (ComeColdDateTime) => {
  const comecolddatetime = new Date(ComeColdDateTime);
  const currentDate = new Date();
  return (currentDate - comecolddatetime) / (1000 * 60);
};

// ปรับปรุงฟังก์ชัน formatTime เพื่อให้แสดงเวลาอย่างถูกต้อง
const formatTime = (minutes) => {
  if (isNaN(minutes) || minutes === null) return "-";

  const absMinutes = Math.abs(minutes);
  const days = Math.floor(absMinutes / 1440);
  const hours = Math.floor((absMinutes % 1440) / 60);
  const mins = Math.floor(absMinutes % 60);

  let timeString = '';
  if (days > 0) timeString += `${days} วัน`;
  if (hours > 0) timeString += `${timeString.length > 0 ? ' ' : ''}${hours} ชม.`;
  if (mins > 0 || (days === 0 && hours === 0)) timeString += `${timeString.length > 0 ? ' ' : ''}${mins} นาที`;
  return timeString.trim();
};

const getStatusMessage = (timeRemaining, coldValue) => {
  // กรณีที่ค่า coldValue เป็นลบ (ส่งมาโดยตรง)
  if (coldValue !== undefined && coldValue < 0) {
    // แปลงค่า cold ที่เป็นลบจากชั่วโมง.นาที เป็นนาทีทั้งหมด
    const exceededMinutes = Math.floor(Math.abs(coldValue)) * 60 + (Math.abs(coldValue) % 1) * 100;
    return `เลยกำหนด ${formatTime(exceededMinutes)}`;
  }

  // สำหรับ timeRemaining (กรณีปกติ)
  if (timeRemaining === null || timeRemaining === undefined) {
    return "-";
  }

  // Normal logic for positive cold values or based on timeRemaining
  return timeRemaining > 0
    ? `เหลืออีก ${formatTime(timeRemaining)}`
    : `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;
};

const getBorderColor = (percentage, timeRemaining) => {
  if (timeRemaining < 0) return '#FF8175'; // สีแดง - เมื่อเลยกำหนดเวลา
  if (percentage >= 100) return '#FF8175'; // สีแดง - 100% ขึ้นไป
  if (percentage >= 70) return '#FFF398'; // สีเหลือง - 70-99%
  return '#80FF75'; // สีเขียว - 1-69%
};

const getRowStatus = (row) => {
  if (!row) return { borderColor: "#969696", statusMessage: "-", hideDelayTime: true, percentage: 0 };

  // หาวันที่เข้าห้องเย็นล่าสุด
  const latestComeColdDate = getLatestComeColdDate(row);

  if (!latestComeColdDate) {
    return {
      borderColor: "#969696",
      statusMessage: "รอดำเนินการ",
      hideDelayTime: true,
      percentage: 0,
    };
  }

  // คำนวณเวลาที่ผ่านไปจริงตั้งแต่เข้าห้องเย็น (นาที)
  const timePassed = calculateTimeDifference(latestComeColdDate);

  // กรณีวัตถุดิบผสม (มี mix_time)
  if (row.mix_time !== null && row.mix_time !== undefined) {
    const mixTimeValue = parseFloat(row.mix_time);
    const mixTimeMinutes = Math.floor(mixTimeValue) * 60 + (mixTimeValue % 1) * 100;

    // กรณีเกินเวลา mix_time
    if (timePassed > mixTimeMinutes) {
      const exceededMinutes = timePassed - mixTimeMinutes;
      const standardTime = 120; // 2 ชั่วโมง (120 นาที) สำหรับวัตถุดิบผสม
      const percentage = ((standardTime + exceededMinutes) / standardTime) * 100;

      return {
        borderColor: '#FF8175',
        statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
        hideDelayTime: false,
        percentage: percentage
      };
    }

    // กรณียังไม่เกินเวลา
    const timeRemaining = mixTimeMinutes - timePassed;
    const percentage = Math.min(100, Math.max(0, (timePassed / mixTimeMinutes) * 100));

    return {
      borderColor: getBorderColor(percentage, timeRemaining),
      statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
      hideDelayTime: timeRemaining > 0,
      percentage: percentage
    };
  }

  // กรณีมี remaining_rework_time
  if (row.remaining_rework_time !== null && row.remaining_rework_time !== undefined) {
    const remainingReworkTime = parseFloat(row.remaining_rework_time);
    const standardReworkTime = parseFloat(row.standard_rework_time);
    const standardReworkTimeMinutes = Math.floor(standardReworkTime) * 60 + (standardReworkTime % 1) * 100;

    // กรณีค่า remaining_rework_time เป็นลบ
    if (remainingReworkTime < 0) {
      const exceededMinutes = Math.floor(Math.abs(remainingReworkTime)) * 60 + (Math.abs(remainingReworkTime) % 1) * 100;
      const rs_exceededMinutesFormRework = -1 * exceededMinutes - timePassed;
      const percentage = ((standardReworkTimeMinutes + exceededMinutes) / standardReworkTimeMinutes) * 100;

      return {
        borderColor: '#FF8175',
        statusMessage: `เลยกำหนด ${formatTime(rs_exceededMinutesFormRework)}`,
        hideDelayTime: false,
        percentage: percentage
      };
    }

    // กรณีค่า remaining_rework_time = 0
    if (remainingReworkTime === 0) {
      return {
        borderColor: '#FF8175',
        statusMessage: `เลยกำหนด ${formatTime(timePassed)}`,
        hideDelayTime: false,
        percentage: 100 + (timePassed / standardReworkTimeMinutes * 100)
      };
    }

    // กรณีค่า remaining_rework_time เป็นบวก
    const remainingReworkTimeMinutes = Math.floor(remainingReworkTime) * 60 + (remainingReworkTime % 1) * 100;
    const timeRemaining = remainingReworkTimeMinutes - timePassed;
    const percentage = Math.min(100, Math.max(0, (1 - timeRemaining / standardReworkTimeMinutes) * 100));

    return {
      borderColor: getBorderColor(percentage, timeRemaining),
      statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
      hideDelayTime: timeRemaining > 0,
      percentage: percentage
    };
  }

  // กรณีใช้ cold_time (กรณีทั่วไป)
  const coldValue = parseFloat(row.cold);
  const standardCold = parseFloat(row.standard_cold);
  const standardColdMinutes = Math.floor(standardCold) * 60 + (standardCold % 1) * 100;

  // กรณีค่า cold เป็นลบ
  if (coldValue < 0) {
    const exceededMinutesFromCold = Math.floor(Math.abs(coldValue)) * 60 + (Math.abs(coldValue) % 1) * 100;
    const rs_exceededMinutesFromCold = -1 * exceededMinutesFromCold - timePassed;
    const percentage = ((standardColdMinutes + exceededMinutesFromCold) / standardColdMinutes) * 100;

    return {
      borderColor: '#FF8175',
      statusMessage: `เลยกำหนด ${formatTime(rs_exceededMinutesFromCold)}`,
      hideDelayTime: false,
      percentage: percentage
    };
  }

  // กรณีค่า cold = 0
  if (coldValue === 0) {
    return {
      borderColor: '#FF8175',
      statusMessage: `เลยกำหนด ${formatTime(timePassed)}`,
      hideDelayTime: false,
      percentage: 100 + (timePassed / standardColdMinutes * 100)
    };
  }

  // กรณีค่า cold เป็นบวก
  const coldValueMinutes = Math.floor(coldValue) * 60 + (coldValue % 1) * 100;

  // ตรวจสอบว่าเวลาที่ผ่านไปจริงมากกว่าเวลาที่เหลือจาก cold หรือไม่
  if (timePassed > coldValueMinutes) {
    const exceededMinutes = timePassed - coldValueMinutes;
    const percentage = ((standardColdMinutes + exceededMinutes) / standardColdMinutes) * 100;

    return {
      borderColor: '#FF8175',
      statusMessage: `เลยกำหนด ${formatTime(exceededMinutes)}`,
      hideDelayTime: false,
      percentage: percentage
    };
  }

  // กรณีที่ยังไม่เกินเวลา
  const timeRemaining = coldValueMinutes - timePassed;
  const percentage = Math.min(100, Math.max(0, (timePassed / standardColdMinutes) * 100));

  return {
    borderColor: getBorderColor(percentage, timeRemaining),
    statusMessage: `เหลืออีก ${formatTime(timeRemaining)}`,
    hideDelayTime: timeRemaining > 0,
    percentage: percentage
  };
};

const Row = ({
  row,
  tableColumns,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenSuccess,
  selectedColor,
  openRowId,
  setOpenRowId,
  index
}) => {
  if (!row) return null;

  const { borderColor, statusMessage, hideDelayTime, percentage } = getRowStatus(row);
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)"; // เปลี่ยนสีตาราง ขาว เทา
  const isOverdue = percentage >= 100 || statusMessage.includes("เลยกำหนด");
  const isOpen = openRowId === row.mapping_id;

  const colorMatch =
    (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175') ||
    (selectedColor === 'gray' && borderColor === '#969696');

  if (selectedColor && !colorMatch) return null;



  // ฟังก์ชันสำหรับการคลิกที่ไอคอนตา
  const handleDetailClick = (e) => {
    e.stopPropagation();
    setOpenRowId(isOpen ? null : row.mapping_id);
    if (typeof handleRowClick === 'function') {
      handleRowClick(row.mapping_id);
    } else if (typeof handleOpenModal === 'function') {
      handleOpenModal(row);
    }
  };

  // แสดงข้อมูลตามคอลัมน์ที่กำหนด
  return (
    <>
      <TableRow>
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>
      <TableRow>
        {/* คอลัมน์แรก - DelayTime */}
        <TableCell
          style={{
            width: CUSTOM_COLUMN_WIDTHS.delayTime,
            textAlign: 'center',
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            height: '40px',
            padding: '0px 0px',
            borderRight: "0px solid #e0e0e0",
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
            borderLeft: `5px solid ${borderColor}`,
            backgroundColor: backgroundColor
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '13px',
              height: '100%',
              color:
                borderColor === "#969696"
                  ? "#626262"
                  : isOverdue
                    ? "red"
                    : percentage >= 70
                      ? "orange"
                      : "green",
            }}
          >
            {statusMessage}
          </div>
        </TableCell>

        {/* คอลัมน์ข้อมูลตาม tableColumns */}
        {tableColumns.map((column) => (
          <TableCell
            key={column.id}
            align="center"
            style={{
              width: column.width,
              borderLeft: "1px solid #f2f2f2",
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '14px',
              height: '40px',
              lineHeight: '1.5',
              padding: '0px 10px',
              color: "#787878",
              backgroundColor: backgroundColor
            }}
          >
            {column.id === 'rm_status' ? (
              (() => {
                if (row.rm_status === "QcCheck" || row.rm_status === "เหลือจากไลน์ผลิต" || row.rm_status === "รอแก้ไข") {
                  return "อยู่ในห้องเย็น"; // เปลี่ยนจาก "รอห้องเย็นรับเข้า" เป็น "อยู่ในห้องเย็น"
                } else {
                  return row.rm_status || "-";
                }
              })()
            ) : (
              row[column.id] || '-'
            )}
          </TableCell>
        ))}

        {/* คอลัมน์ไอคอนดูรายละเอียด */}
        <TableCell
          style={{
            borderLeft: "1px solid #f2f2f2",
            borderRight: "1px solid #e0e0e0",
            borderTop: '1px solid #e0e0e0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px',
            height: '40px',
            padding: '0px',
            textAlign: 'center',
            borderTopRightRadius: "8px",
            borderBottomRightRadius: "8px",
            width: CUSTOM_COLUMN_WIDTHS.viewDetails,
            backgroundColor: backgroundColor
          }}>
          <IconButton
            onClick={handleDetailClick}
            size="small"
            sx={{
              color: isOpen ? '#1976d2' : '#2196f3', // สีฟ้าเข้มเมื่อเปิด, สีฟ้าอ่อนเมื่อปิด
              '&:hover': {
                color: '#0d47a1', // สีฟ้าเข้มเมื่อโฮเวอร์
                transform: 'scale(1.2)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            <FaEye style={{ fontSize: '18px' }} />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>

      {/* Collapse row สำหรับแสดงรายละเอียดเพิ่มเติม */}
      <TableRow>
        <TableCell style={{ padding: 0, border: 'none', }} colSpan={tableColumns.length + 2}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, borderRadius: '8px', overflow: 'hidden', borderTop: '1px solid #ececec', borderLeft: '1px solid #ececec', borderBottom: "1px solid #ececec", borderRight: '1px solid #ececec', maxWidth: '100%', }}>
              <Table size="small" aria-label="purchases" sx={{ width: '100%', }}>
                <TableHead>
                  <TableRow style={{ backgroundColor: "#F9F9F9" }}>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px", padding: '6px 0px' }}>เวลาเบิกห้องเย็นใหญ่</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px", padding: '6px 0px' }}>เวลาต้มอบเสร็จ</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px", padding: '6px 0px' }}>เวลาเข้าห้องเย็น1</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px", padding: '6px 0px' }}>เวลาออกห้องเย็น1</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px", padding: '6px 0px' }}>เวลาเข้าห้องเย็น2</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px", padding: '6px 0px' }}>เวลาออกห้องเย็น2</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px", padding: '6px 0px' }}>เวลาเข้าห้องเย็น3</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px", padding: '6px 0px' }}>เวลาออกห้องเย็น3</TableCell>
                    <TableCell sx={{ fontSize: "13px", borderRight: '1px solid #ececec', textAlign: 'center', verticalAlign: 'middle', color: "#787878", width: "50px", padding: '6px 0px' }}>เวลาแก้ไข</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow key={row.rm_tro_id}>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '6px 0px' }}>
                      {row.withdraw_date ? new Date(row.withdraw_date).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '6px 0px' }}>
                      {row.rmit_date ? new Date(row.rmit_date).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '6px 0px' }}>
                      {row.come_cold_date ? new Date(row.come_cold_date).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '6px 0px' }}>
                      {row.out_cold_date ? new Date(row.out_cold_date).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '6px 0px' }}>
                      {row.come_cold_date_two ? new Date(row.come_cold_date_two).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '6px 0px' }}>
                      {row.out_cold_date_two ? new Date(row.out_cold_date_two).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '6px 0px' }}>
                      {row.come_cold_date_three ? new Date(row.come_cold_date_three).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '6px 0px' }}>
                      {row.out_cold_date_three ? new Date(row.out_cold_date_three).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell sx={{ border: 'none', textAlign: 'center', borderRight: '1px solid #ececec', verticalAlign: 'middle', color: "#787878", padding: '6px 0px' }}>
                      {row.rework_date ? new Date(row.rework_date).toLocaleString() : "-"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const TableMainSupv = ({ handleOpenModal, data, handleRowClick, handleOpenEditModal, handleOpenSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(1000);//จำนวนแถวที่แสดง
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);

  useEffect(() => {
    // เพิ่ม qc_datetime ให้กับข้อมูลเพื่อใช้ในการคำนวณเวลา
    const processedData = Array.isArray(data) ? data.map(row => ({
      ...row,
      qc_datetime: row.come_cold_date || row.rmit_date
    })) : [];

    // ตรวจสอบว่า data มีค่าและเป็น array หรือไม่
    if (processedData.length > 0) {
      setFilteredRows(
        processedData.filter((row) =>
          row && Object.values(row).some((value) =>
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      );
    } else {
      setFilteredRows([]);
    }
  }, [searchTerm, data]);

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

  const visibleRows = filteredRows.filter((row) => {
  const { borderColor } = getRowStatus(row);
  return (
    selectedColor === '' || (
      (selectedColor === 'green' && borderColor === '#80FF75') ||
      (selectedColor === 'yellow' && borderColor === '#FFF398') ||
      (selectedColor === 'red' && borderColor === '#FF8175') ||
      (selectedColor === 'gray' && borderColor === '#969696')
    )
  );
});


  // คอลัมน์ที่ต้องการแสดงในตาราง 
  const tableColumns = [
    { id: 'batch', name: 'Batch', width: '120px' },
    { id: 'mat', name: 'Material', width: '130px' },
    { id: 'mat_name', name: 'รายชื่อวัตถุดิบ', width: '300px' },
    { id: 'production', name: 'แผนการผลิต', width: '130px' },
    { id: 'cooked_date', name: 'เวลาเตรียมเสร็จ', width: '140px' },
    { id: 'tro_id', name: 'ป้ายทะเบียน', width: '100px' },
    { id: 'weight_RM', name: 'น้ำหนัก', width: '100px' },
    { id: 'rm_cold_status', name: 'ประเภทวัตถุดิบ', width: '120px' },
    { id: 'rm_status', name: 'สถานะวัตถุดิบ', width: '120px' },
    { id: 'cs_name', name: 'ชื่อห้องเย็น', width: '90px' },
    { id: 'slot_id', name: 'ช่องจอด', width: '90px' }
  ];

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 1, paddingX: 2, height: { xs: 'auto', sm: '60px' }, margin: '5px 5px' }}>
        <TextField
          variant="outlined"
          fullWidth
          placeholder="พิมพ์เพื่อค้นหา..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-start" }}>
          {['green', 'yellow', 'red'].map((color) => (
            <FilterButton
              key={color}
              color={color}
              selectedColor={selectedColor}
              onClick={() => handleFilterChange(color)}
            />
          ))}
        </Box>
      </Box>
       <Typography variant="subtitle1" sx={{ mb: 2, px: 2 }}>
  {selectedColor
    ? `รายการวัตถุดิบที่เลือก ${visibleRows.length} รายการ`
    : `รายการวัตถุดิบทั้งหมดทั้งหมด ${visibleRows.length} รายการ`}
</Typography>
      <TableContainer
        style={{ padding: '0px 5px' }}
        sx={{
          height: 'calc(68vh)',
          overflowY: 'auto',
          whiteSpace: 'nowrap',
          width: '100%'
        }}
      >
        <Table
          stickyHeader
          style={{ tableLayout: 'fixed' }}
          sx={{ width: '100%' }}
        >
          <TableHead style={{ marginBottom: "10px" }}>
            <TableRow sx={{ height: '40px' }}>
              {/* คอลัมน์ DelayTime */}
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  borderLeft: "1px solid #e0e0e0",
                  borderRight: "1px solid #e0e0e0",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  fontSize: '12px',
                  padding: '5px',
                  width: CUSTOM_COLUMN_WIDTHS.delayTime,
                  height: '40px',  // กำหนดความสูงของ cell ให้เท่ากันทุกคอลัมน์
                }}>
                <Box style={{
                  fontSize: '16px',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%'
                }}>
                  DelayTime
                </Box>
              </TableCell>

              {/* แสดงคอลัมน์จาก tableColumns */}
              {tableColumns.map((column) => (
                <TableCell key={column.id} align="center" style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  // borderRight: "1px solid #e0e0e0",
                  fontSize: '12px',
                  padding: '5px',
                  borderLeft: "1px solid #f2f2f2",
                  width: column.width
                }}>
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>{column.name}</Box>
                </TableCell>
              ))}

              {/* คอลัมน์ดูข้อมูล */}
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderTopRightRadius: "8px", borderBottomRightRadius: "8px", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderLeft: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#787878', padding: '5px', width: CUSTOM_COLUMN_WIDTHS.viewDetails }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ดูข้อมูล</Box>
              </TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
            {filteredRows.length > 0 ? (
              filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <Row
                  key={index}
                  row={row}
                  tableColumns={tableColumns}
                  handleOpenModal={handleOpenModal}
                  handleRowClick={handleRowClick}
                  handleOpenEditModal={handleOpenEditModal}
                  handleOpenSuccess={handleOpenSuccess}
                  selectedColor={selectedColor}
                  openRowId={openRowId}
                  setOpenRowId={setOpenRowId}
                  index={index}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length + 2} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
                  ไม่มีรายการวัตถุดิบในขณะนี้
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        sx={{
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar": {
            fontSize: '10px',
            color: "#787878",
            padding: "0px",
          }
        }}
        rowsPerPageOptions={[1000,2000, 3000, 4000]}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
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

export default TableMainSupv;