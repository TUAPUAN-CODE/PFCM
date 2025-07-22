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
  Paper,
  Tooltip,
  Grid,
  Card,
  TextField,
  InputAdornment
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InventoryIcon from '@mui/icons-material/Inventory';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import ModalPrint from './ModalPrint';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PaletteIcon from '@mui/icons-material/Palette'; // สำหรับ Sensory (สี กลิ่น เนื้อ)
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent'; // สำหรับ MD (เครื่องตรวจโลหะ)
import StraightenIcon from '@mui/icons-material/Straighten'; // สำหรับ Defect (ขนาด,ก้าง)
import FactCheckIcon from '@mui/icons-material/FactCheck'; // สำหรับหัวข้อข้อมูลการตรวจสอบ QC

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

// กำหนดความกว้างของคอลัมน์เป็นเปอร์เซ็นต์
const COLUMN_WIDTHS = {
  Batch: '13.98%',
  Material: '9.68%',
  รายชื่อวัตถุดิบ: '15.05%',
  แผนการผลิต: '8.6%',
  สถานที่จัดส่ง: '9.68%',
  น้ำหนัก: '8%',
  การจัดการ: '11.83%',
  LevelEu: '10.75%',
  เวลาต้มอบเสร็จ: '12.9%'
};

// Row component
const Row = ({ row, index }) => {
  const [open, setOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)"; // เปลี่ยนสีจาราง ขาว เทา
  const uniqueKey = `${row.mapping_id}_${row.created_at || index}`;
  // เปิด modal สำหรับพิมพ์ข้อมูล
  const handlePrintClick = () => {
    setPrintModalOpen(true);
  };

  // ปิด modal พิมพ์
  const handleClosePrintModal = () => {
    setPrintModalOpen(false);
  };

  // ฟังก์ชันช่วยตรวจสอบและแสดงสถานะการตรวจสอบ
  const getStatusButton = (status) => {
    if (!status || status.trim() === '-') return null;

    const statusLower = status.trim().toLowerCase();
    if (statusLower === 'ผ่าน' || statusLower.includes('pass')) {
      return (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mt: 1,
          mb: 1
        }}>
          <Box
            sx={{
              backgroundColor: '#388e3c',
              color: 'white',
              borderRadius: '20px',
              padding: '4px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '14px',
              fontWeight: 'medium'
            }}
          >
            <CheckIcon fontSize="small" />
            ผ่าน
          </Box>
        </Box>
      );
    } else if (statusLower === 'ไม่ผ่าน' || statusLower.includes('fail') || statusLower.includes('not')) {
      return (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mt: 1,
          mb: 1
        }}>
          <Box
            sx={{
              backgroundColor: '#d32f2f',
              color: 'white',
              borderRadius: '20px',
              padding: '4px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '14px',
              fontWeight: 'medium'
            }}
          >
            <CloseIcon fontSize="small" />
            ไม่ผ่าน
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        mt: 1,
        mb: 1
      }}>
        <Box
          sx={{
            backgroundColor: '#388e3c',
            color: 'white',
            borderRadius: '20px',
            padding: '4px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '14px',
            fontWeight: 'medium'
          }}
        >
          <CheckIcon fontSize="small" />
          {status}
        </Box>
      </Box>
    );
  };

  // เช็คว่าควรแสดง batch อะไร: ถ้ามี batch_after ให้ใช้ batch_after แต่ถ้าไม่มีให้ใช้ batch_before
  const displayBatch = row.batch_after || row.batch_before || "-";

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: backgroundColor,
          height: '45px',
        }}
      >
        <TableCell align="left" style={{ padding: '8px 16px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#444', fontWeight: 'medium' }}>
          {displayBatch}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {row.mat || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {row.mat_name || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {row.production || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {row.tro_id || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {row.dest || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {row.weight_RM ? parseFloat(row.weight_RM).toFixed(2) : "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {row.level_eu || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          {formatDate(row.CookedDateTime) || "-"}
        </TableCell>
        <TableCell align="center" style={{ padding: '8px 5px', borderBottom: '1px solid #eaeaea', fontSize: '14px', color: '#666' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
            <Tooltip title="ดูประวัติเพิ่มเติม">
              <IconButton
                aria-label="view history"
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

          <ModalPrint
            open={printModalOpen}
            onClose={handleClosePrintModal}
            rowData={row}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: 0 }} colSpan={9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: '0 1px 16px 1px', backgroundColor: '#f8f9fa', borderRadius: '4px', padding: '16px', border: '1px solid #e0e0e0' }}>
              {/* หัวข้อข้อมูลการตรวจสอบ QC */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FactCheckIcon fontSize="small" sx={{ color: '#1976d2' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#333' }}>
                  ข้อมูลการตรวจสอบ QC
                </Typography>
              </Box>

              {/* การ์ดแสดงผลการตรวจสอบ 3 ส่วน */}
              <Grid container spacing={2}>
                {/* Sensory Card (สี กลิ่น เนื้อ) */}
                <Grid item xs={12} md={4}>
  <Card variant="outlined" sx={{ height: '100%', minHeight: '180px' }}>
    {/* ส่วนหัวการ์ด */}
    <Box sx={{
      backgroundColor: '#e3f2fd',
      px: 2,
      py: 1.5,
      borderBottom: '1px solid #bbdefb'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PaletteIcon sx={{ color: '#2196f3' }} />
        <Typography variant="subtitle1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
          Sensory (สี, กลิ่น, เนื้อ)
        </Typography>
      </Box>
    </Box>

    {/* เนื้อหาการ์ด */}
    <Box sx={{ p: 2 }}>
      {/* สถานะการตรวจสอบ */}
      {getStatusButton(row?.qccheck?.trim())}

      {/* ตรวจสอบเงื่อนไขการยอมรับพิเศษและหมายเหตุ */}
      {row?.sq_remark && row.sq_remark !== '-' && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'medium', mb: 0.5, display: 'block' }}>
            {row?.sq_acceptance === true ? "ยอมรับพิเศษ หมายเหตุ Sensory:" : "หมายเหตุ Sensory:"}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={row.sq_remark || '-'}
            InputProps={{
              readOnly: true,
              sx: { 
                fontSize: '14px', 
                backgroundColor: row?.sq_acceptance === true ? '#fff8e1' : '#f5f5f5' 
              }
            }}
            multiline
            minRows={2}
          />
        </Box>
      )}

      {/* แสดงข้อความเมื่อไม่มีหมายเหตุ */}
      {(!row?.sq_remark || row.sq_remark === '-') && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            ไม่มีหมายเหตุ
          </Typography>
        </Box>
      )}
    </Box>
  </Card>
</Grid>

                {/* MD Card (เครื่องตรวจโลหะ) */}
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ height: '100%', minHeight: '180px' }}>
                    {/* ส่วนหัวการ์ด */}
                    <Box sx={{
                      backgroundColor: '#fff3e0',
                      px: 2,
                      py: 1.5,
                      borderBottom: '1px solid #ffe0b2'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SettingsInputComponentIcon sx={{ color: '#ff9800' }} />
                        <Typography variant="subtitle1" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                          MD (เครื่องตรวจโลหะ)
                        </Typography>
                      </Box>
                    </Box>

                    {/* เนื้อหาการ์ด */}
                    <Box sx={{ p: 2 }}>
                      {/* สถานะการตรวจสอบ */}
                      {getStatusButton(row?.mdcheck?.trim())}

                      {/* พื้นที่/หมายเลขเครื่อง */}
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'medium', mb: 0.5, display: 'block' }}>
                          พื้นที่/หมายเลขเครื่อง:
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          size="small"
                          value={
                            row?.WorkAreaName
                              ? `${row.WorkAreaName} (${row.WorkAreaCode || '-'}/${row.md_no || '-'})`
                              : `${row.WorkAreaCode || '-'}/${row.md_no || '-'}`
                          }
                          InputProps={{
                            readOnly: true,
                            sx: { fontSize: '14px', backgroundColor: '#f5f5f5' }
                          }}
                        />
                      </Box>

                      {/* หมายเหตุ (หากมี) */}
                      {row?.md_remark && row.md_remark !== '-' && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'medium', mb: 0.5, display: 'block' }}>
                            หมายเหตุ:
                          </Typography>
                          <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            value={row.md_remark || '-'}
                            InputProps={{
                              readOnly: true,
                              sx: { fontSize: '14px', backgroundColor: '#f5f5f5' }
                            }}
                            multiline
                            minRows={2}
                          />
                        </Box>
                      )}
                    </Box>
                  </Card>
                </Grid>

                {/* Defect Card (ขนาด, ก้าง) */}
                
<Grid item xs={12} md={4}>
  <Card variant="outlined" sx={{ height: '100%', minHeight: '180px' }}>
    {/* ส่วนหัวการ์ด */}
    <Box sx={{
      backgroundColor: '#ffebee',
      px: 2,
      py: 1.5,
      borderBottom: '1px solid #ffcdd2'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StraightenIcon sx={{ color: '#f44336' }} />
        <Typography variant="subtitle1" sx={{ color: '#f44336', fontWeight: 'bold' }}>
          Defect (ขนาด, ก้าง)
        </Typography>
      </Box>
    </Box>

    {/* เนื้อหาการ์ด */}
    <Box sx={{ p: 2 }}>
      {/* สถานะการตรวจสอบ */}
      {getStatusButton(row?.defectcheck?.trim())}

      {/* ตรวจสอบเงื่อนไขการยอมรับพิเศษและหมายเหตุ */}
      {row?.defect_remark && row.defect_remark !== '-' && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'medium', mb: 0.5, display: 'block' }}>
            {row?.defect_acceptance === true ? "ยอมรับพิเศษ หมายเหตุ Defect:" : "หมายเหตุ Defect:"}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={row.defect_remark || '-'}
            InputProps={{
              readOnly: true,
              sx: { 
                fontSize: '14px', 
                backgroundColor: row?.defect_acceptance === true ? '#fff8e1' : '#f5f5f5' 
              }
            }}
            multiline
            minRows={2}
          />
        </Box>
      )}

      {/* แสดงข้อความเมื่อไม่มีหมายเหตุ */}
      {(!row?.defect_remark || row.defect_remark === '-') && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            ไม่มีหมายเหตุ
          </Typography>
        </Box>
      )}
    </Box>
  </Card>
</Grid>
              </Grid>

              {/* ส่วนข้อมูลผู้ดำเนินการและวันเวลาตรวจสอบ */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ color: '#1976d2' }} />
                  <Typography variant="body2" sx={{ color: '#555' }}>
                    <b>ผู้ดำเนินการ:</b> {row?.receiver_qc ?? '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon sx={{ color: '#1976d2' }} />
                  <Typography variant="body2" sx={{ color: '#555' }}>
                    <b>วันเวลาที่ QC ตรวจสอบ:</b> {row?.qc_datetime_formatted ?? '-'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const QcHisTable = ({
  filteredData = [],
  page = 0,
  rowsPerPage = 20,
  handleChangePage,
  handleChangeRowsPerPage,
  backgroundColor = "#ffffff"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalFilteredData, setInternalFilteredData] = useState(filteredData);

  useEffect(() => {
    if (searchTerm === '') {
      setInternalFilteredData(filteredData);
    } else {
      const filtered = filteredData.filter(row =>
        Object.values(row).some(value =>
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setInternalFilteredData(filtered);
    }
  }, [searchTerm, filteredData]);

  return (
    <>
      {/* ส่วนของช่องค้นหา */}
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
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        variant="outlined"
        style={{ padding: '0' }}
        sx={{
          height: 'calc(80vh - 8rem)',
          width: '100%',
          overflowY: 'auto',
          marginTop: 0,
          borderRadius: '8px',
          borderColor: '#e0e0e0',
          backgroundColor: backgroundColor
        }}
      >
        <Table stickyHeader style={{ tableLayout: 'fixed' }} sx={{ width: '100%' }}>
          <TableHead>
            <TableRow sx={{ height: '45px', backgroundColor: '#f5f5f5' }}>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.Batch, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>Batch</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.Material, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>Material</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.รายชื่อวัตถุดิบ, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>รายชื่อวัตถุดิบ
                </Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.แผนการผลิต, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>แผนการผลิต
                </Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.แผนการผลิต, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>หมายเลขรถเข็น
                </Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.สถานที่จัดส่ง, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>สถานที่จัดส่ง</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.น้ำหนัก, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>น้ำหนัก (kg)</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderRight: "1px solid #e0e0e0", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.LevelEu, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>Level Eu</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.เวลาต้มอบเสร็จ, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>เวลาต้ม/อบเสร็จ</Box>
              </TableCell>
              <TableCell align="center" style={{ backgroundColor: "hsl(210, 100%, 60%)", borderBottom: "2px solid #e0e0e0", borderLeft: "1px solid #ffffff", fontSize: '12px', color: '#555', padding: '5px', width: COLUMN_WIDTHS.การจัดการ, fontWeight: 'normal' }}>
                <Box style={{ fontSize: '14px', color: '#ffffff' }}>การจัดการ</Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ '& > tr': { marginBottom: '8px' } }}>
            {internalFilteredData.length > 0 ? (
              internalFilteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <React.Fragment key={`${row.mapping_id}_${row.create_at || index}`}>  
                <Row key={index} row={row} index={index} />
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ padding: "40px", fontSize: "16px", color: "#787878" }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <InventoryIcon sx={{ fontSize: 40, color: '#bdbdbd' }} />
                    <Typography>ไม่มีข้อมูลประวัติการตรวจสอบ</Typography>
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
        count={internalFilteredData.length || 0}
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

export default QcHisTable;