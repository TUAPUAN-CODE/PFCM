import React, { useState, useEffect } from 'react';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Box,
  Typography,
  Collapse,
  IconButton,
  Chip,
  Paper,
  Tooltip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InventoryIcon from '@mui/icons-material/Inventory';
import SensorsIcon from '@mui/icons-material/Sensors';
import PrintIcon from '@mui/icons-material/Print';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ModalPrint from './ModalPrint';

// จัดรูปแบบวันที่
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };

  return new Intl.DateTimeFormat('th-TH', options).format(date);
};

// ปรับความกว้างของคอลัมน์ให้เหมาะกับข้อมูล - ส่วนเลขรถเข็น
const TROLLEY_COLUMN_WIDTHS = {
  เลขรถเข็น: '25%',
  น้ำหนักรวม: '25%',
  จำนวนถาดรวม: '25%',
  การจัดการ: '25%'
};

// ปรับความกว้างของคอลัมน์ให้เหมาะกับข้อมูล - ส่วนวัตถุดิบ
const MATERIAL_COLUMN_WIDTHS = {
  วัตถุดิบ: '20%',
  รหัสวัตถุดิบ: '20%',
  batch: '10%',
  production: '10%',
  น้ำหนัก: '10%',
  จำนวนถาด: '10%',
  เวลาเตรียม: '10%',
  ประวัติ: '10%'
};

// TrolleyRow component - แสดงข้อมูลรถเข็น
const TrolleyRow = ({ trolleyData, index }) => {
  const [open, setOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";

  // เปิด modal สำหรับพิมพ์ข้อมูล
  const handlePrintClick = () => {
    setPrintModalOpen(true);
  };

  // ปิด modal พิมพ์
  const handleClosePrintModal = () => {
    setPrintModalOpen(false);
  };

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: backgroundColor,
          height: '45px',
        }}
      >
        <TableCell align="center" style={{ padding: '8px 16px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#444', fontWeight: 'medium' }}>
          {trolleyData.trolleyId || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {trolleyData.totalWeight ? parseFloat(trolleyData.totalWeight).toFixed(2) : "-"} kg
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {trolleyData.totalTrayCount || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
            <Tooltip title="ดูรายละเอียดวัตถุดิบในรถเข็น">
              <IconButton
                aria-label="view materials"
                size="small"
                onClick={() => setOpen(!open)}
                color={open ? "primary" : "default"}
                sx={{ width: '30px', height: '30px', border: open ? '1px solid #90caf9' : '1px solid #e0e0e0', backgroundColor: '#ffffff' }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="พิมพ์ข้อมูล">
              <IconButton
                aria-label="print"
                size="small"
                onClick={handlePrintClick}
                sx={{ width: '30px', height: '30px', border: '1px solid #e0e0e0', backgroundColor: '#ffffff' }}
              >
                <PrintIcon fontSize="small" color="action" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Modal สำหรับพิมพ์ข้อมูล */}
          <ModalPrint
            open={printModalOpen}
            onClose={handleClosePrintModal}
            rowData={trolleyData}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: '0 1px 16px 1px', backgroundColor: '#f8f9fa', borderRadius: '4px', padding: '12px', border: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" gutterBottom component="div" sx={{ fontWeight: 'bold', color: '#555', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box sx={{ width: '8px', height: '20px', backgroundColor: '#3f51b5', borderRadius: '4px' }}></Box>
                รายละเอียดวัตถุดิบในรถเข็น {trolleyData.trolleyId} ({trolleyData.materials.length} รายการ)
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '300px' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell align="center" style={{ fontWeight: 'bold', color: '#666', fontSize: '12px', width: MATERIAL_COLUMN_WIDTHS.วัตถุดิบ }}>ชื่อวัตถุดิบ</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', color: '#666', fontSize: '12px', width: MATERIAL_COLUMN_WIDTHS.รหัสวัตถุดิบ }}>รหัสวัตถุดิบ</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', color: '#666', fontSize: '12px', width: MATERIAL_COLUMN_WIDTHS.batch }}>Batch</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', color: '#666', fontSize: '12px', width: MATERIAL_COLUMN_WIDTHS.production }}>Code (Line)</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', color: '#666', fontSize: '12px', width: MATERIAL_COLUMN_WIDTHS.น้ำหนัก }}>น้ำหนัก</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', color: '#666', fontSize: '12px', width: MATERIAL_COLUMN_WIDTHS.จำนวนถาด }}>จำนวนถาด</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', color: '#666', fontSize: '12px', width: MATERIAL_COLUMN_WIDTHS.เวลาเตรียม }}>เวลาเตรียมเสร็จ</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', color: '#666', fontSize: '12px' }}>ประวัติเข้าออกห้องเย็น</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trolleyData.materials.map((material, matIndex) => (
                      <MaterialRow key={matIndex} material={material} matIndex={matIndex} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// MaterialRow component - แสดงข้อมูลวัตถุดิบในรถเข็น
const MaterialRow = ({ material, matIndex }) => {
  const [showHistory, setShowHistory] = useState(false);
  const backgroundColor = matIndex % 2 ? '#ffffff' : '#fafafa';

  // ตรวจสอบว่ามีประวัติการเข้าออกห้องเย็นหรือไม่
  const hasHistory = material.entryExitHistory && material.entryExitHistory.length > 0;
  console.log(material.entryExitHistory);
  return (
    <>
      <TableRow sx={{ backgroundColor }}>
        <TableCell align="left" style={{ padding: '8px 16px', fontSize: '12px', color: '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {material.rawMaterialName || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {material.mat || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {material.batch || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {material.code || "-"}
        </TableCell>
        {/* เพิ่มคอลัมน์น้ำหนัก */}
        <TableCell align="center" style={{ padding: '8px 5px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {material.weight ? parseFloat(material.weight).toFixed(2) : "-"} kg
        </TableCell>
        {/* เพิ่มคอลัมน์จำนวนถาด */}
        <TableCell align="center" style={{ padding: '8px 5px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {material.trayCount || "-"}
        </TableCell>

        <TableCell align="center" style={{ padding: '8px 5px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
          {formatDate(material.prepCompleteTime) || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', fontSize: '12px', color: '#666' }}>
          {hasHistory ? (
            <IconButton
              aria-label="view history"
              size="small"
              onClick={() => setShowHistory(!showHistory)}
              color={showHistory ? "primary" : "default"}
              sx={{ width: '26px', height: '26px', border: showHistory ? '1px solid #90caf9' : '1px solid #e0e0e0' }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          ) : (
            <Typography variant="caption" color="text.secondary">ไม่มีประวัติ</Typography>
          )}
        </TableCell>
      </TableRow>

      {hasHistory && showHistory && (
        <TableRow>
          <TableCell colSpan={6} style={{ padding: '0 8px 8px 40px' }}>
            <Box sx={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                ประวัติการเข้า-ออกห้องเย็น ({material.entryExitHistory.length} รายการ)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '150px' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                      <TableCell align="center" style={{ fontWeight: 'bold', fontSize: '11px', padding: '4px' }}>ประเภท</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', fontSize: '11px', padding: '4px' }}>ครั้งที่</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', fontSize: '11px', padding: '4px' }}>เวลา</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', fontSize: '11px', padding: '4px' }}>ผู้ทำรายการ</TableCell>
                      <TableCell align="center" style={{ fontWeight: 'bold', fontSize: '11px', padding: '4px' }}>ห้อง + ช่องจอด</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {material.entryExitHistory.map((historyItem, historyIndex) => (
                      <TableRow key={historyIndex} sx={{ backgroundColor: historyIndex % 2 ? '#ffffff' : '#fafafa' }}>
                        <TableCell align="center" style={{ fontSize: '11px', padding: '4px' }}>
                          <Chip
                            label={historyItem.type === 'enterColdRoom' ? 'เข้าห้องเย็น' : 'ออกห้องเย็น'}
                            size="small"
                            icon={historyItem.type === 'enterColdRoom' ? <SensorsIcon fontSize="small" /> : <InventoryIcon fontSize="small" />}
                            sx={{
                              fontSize: '10px',
                              height: '20px',
                              '& .MuiChip-label': { padding: '0 4px' },
                              '& .MuiChip-icon': { fontSize: '10px' },
                              backgroundColor: historyItem.type === 'enterColdRoom' ? '#e3f2fd' : '#e8f5e9',
                              color: historyItem.type === 'enterColdRoom' ? '#0d47a1' : '#1b5e20'
                            }}
                          />
                        </TableCell>
                        <TableCell align="center" style={{ fontSize: '11px', padding: '4px' }}>{historyItem.sequence}</TableCell>
                        <TableCell align="center" style={{ fontSize: '11px', padding: '4px' }}>{formatDate(historyItem.time)}</TableCell>
                        <TableCell align="center" style={{ fontSize: '11px', padding: '4px' }}>
                          {historyItem.operator && historyItem.operator !== "unspecified" ? historyItem.operator : "-"}
                        </TableCell>
                        <TableCell align="center" style={{ fontSize: '11px', padding: '4px' }}>{material.roomAndSlot || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const ColdStorageTable = ({
  filteredData = [],
  page = 0,
  rowsPerPage = 20,
  totalRows = 0,
  handleChangePage,
  handleChangeRowsPerPage,
  backgroundColor
}) => {
  // จัดกลุ่มข้อมูลตามรถเข็น
  const [groupedData, setGroupedData] = useState([]);

  useEffect(() => {
    // จัดกลุ่มข้อมูลตามรถเข็น
    const groupByTrolley = () => {
      const trolleys = {};

      // จัดกลุ่มข้อมูลตาม trolleyId
      filteredData.forEach(item => {
        const trolleyId = item.trolleyId;
        const prepare_mor_night = item.prepare_mor_night;
        
        if (!trolleys[trolleyId]) {
          trolleys[trolleyId] = {
            trolleyId: trolleyId,
            cold_dest: item.cold_dest,
            prepare_mor_night : prepare_mor_night,
            materials: [],
            totalWeight: 0,
            totalTrayCount: 0
          };
        }

        // เพิ่มวัตถุดิบลงในรถเข็น
        trolleys[trolleyId].materials.push(item);

        // คำนวณน้ำหนักรวมและจำนวนถาดรวม
        trolleys[trolleyId].totalWeight += parseFloat(item.weight || 0);
        trolleys[trolleyId].totalTrayCount += parseInt(item.trayCount || 0, 10);
      });

      // แปลงเป็น array เพื่อใช้ใน map
      return Object.values(trolleys);
    };

    setGroupedData(groupByTrolley());
  }, [filteredData]);

  return (
    <>
      <TableContainer
        component={Paper}
        elevation={0}
        variant="outlined"
        style={{ padding: '0 5px' }}
        sx={{
          height: 'calc(100vh - 16rem)',
          width: '100%',
          overflowY: 'auto',
          marginTop: 0,
          borderRadius: '8px',
          borderColor: '#e0e0e0',
          backgroundColor: backgroundColor
        }}
      >
        <Table
          stickyHeader
          style={{ tableLayout: 'fixed' }}
          sx={{ width: '100%' }}
        >
          <TableHead>
            <TableRow sx={{ height: '45px', backgroundColor: '#f5f5f5' }}>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#555', padding: '5px', width: TROLLEY_COLUMN_WIDTHS.เลขรถเข็น, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <ShoppingCartIcon />
                  <span>เลขรถเข็น</span>
                </Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#555', padding: '5px', width: TROLLEY_COLUMN_WIDTHS.น้ำหนักรวม, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>น้ำหนักรวม</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#555', padding: '5px', width: TROLLEY_COLUMN_WIDTHS.จำนวนถาดรวม, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>จำนวนถาดรวม</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#555', padding: '5px', width: TROLLEY_COLUMN_WIDTHS.การจัดการ, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>การจัดการ</Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
            {groupedData.length > 0 ? (
              groupedData.map((trolley, index) => (
                <TrolleyRow key={trolley.trolleyId} trolleyData={trolley} index={index} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ padding: "40px", fontSize: "16px", color: "#787878" }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <InventoryIcon sx={{ fontSize: 40, color: '#bdbdbd' }} />
                    <Typography>ไม่มีข้อมูลประวัติการเข้า-ออกห้องเย็นในขณะนี้</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        sx={{
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar": {
            fontSize: '12px',
            color: "#555",
            padding: "0px",
          },
          marginTop: '8px',
          padding: '0'
        }}
        rowsPerPageOptions={[20, 50, 100]}
        component="div"
        count={totalRows || groupedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="แสดง"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
        }
      />
    </>
  );
};

export default ColdStorageTable;