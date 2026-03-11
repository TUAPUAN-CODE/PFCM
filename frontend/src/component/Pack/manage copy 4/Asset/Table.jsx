import React, { useState, useEffect, useRef } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, TablePagination, IconButton, Chip } from '@mui/material';
import { LiaShoppingCartSolid } from 'react-icons/lia';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { FaRegCheckCircle, FaWeight } from "react-icons/fa";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

const CUSTOM_COLUMN_WIDTHS = {
  weight: '120px',
  prepDateTime: '100px',
  confirm: '40px',
  cart: '40px',
  complete: '40px',
  edit: '40px',
  delete: '40px'
};

// SearchableDropdown Component
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
  openRowId,
  setOpenRowId,
  index,
  displayColumns
}) => {
  const backgroundColor = index % 2 === 0 ? '#ffffff' : '#F0F8FF';
  const isOpen = openRowId === row.rmfp_id;
  const isConfirmed = row.sc_pack_date && row.sc_pack_date !== '-';

  const [weight, setWeight] = useState(row.weight || '');
  const [group, setGroup] = useState(row.group || '');
  const [prepDateTime, setPrepDateTime] = useState(row.sc_pack_date || '');
  const [errors, setErrors] = useState({ weight: '', prepDateTime: '', group: '' });

  const validateInputs = () => {
    const newErrors = { weight: '', prepDateTime: '', group: '' };
    let isValid = true;

    if (!weight || parseFloat(weight) <= 0) {
      newErrors.weight = 'น้ำหนักต้องมากกว่า 0';
      isValid = false;
    }


    if (isNaN(Number(group)) || Number(group) <= 0) {
      newErrors.group = 'ต้องมีค่ามากกว่า 0';
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
    if (!validateInputs()) return;

    const payload = {
      mapping_id: row.mapping_id,
      weight: Number(weight),
      group: Number(group),
      sc_pack_date: prepDateTime
    };

    console.log("CONFIRM PAYLOAD:", payload);

    handleConfirmRow(payload);
  };


  const displayRow = {};
  displayColumns.forEach(col => {
    if (col === 'tro_id') {
      displayRow['tro_id'] = row['tro_id'];
    } else if (row.hasOwnProperty(col)) {
      displayRow[col] = row[col];
    }
  });

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

        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.group,
            borderLeft: "1px solid #E3F2FD",
            borderTop: '1px solid #E3F2FD',
            borderBottom: '1px solid #E3F2FD',
            fontSize: '14px',
            height: '48px',
            padding: '5px',
            backgroundColor: backgroundColor,
            transition: 'background-color 0.2s ease'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {isConfirmed ? (
            <span style={{ color: '#28a745', fontWeight: 'bold' }}>{group || row.group || '-'}</span>
          ) : (
            <TextField
              type="number"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              error={!!errors.group}
              helperText={errors.group}
              InputProps={{
                sx: {
                  height: "35px",
                  fontSize: "13px",
                  backgroundColor: '#fff'
                },
              }}
              sx={{
                width: '100%',
                "& .MuiOutlinedInput-root": {
                  height: "35px",
                  fontSize: "13px",
                },
                "& input": {
                  padding: "6px",
                  textAlign: 'center'
                },
              }}
            />
          )}
        </TableCell>

        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.weight,
            borderLeft: "1px solid #E3F2FD",
            borderTop: '1px solid #E3F2FD',
            borderBottom: '1px solid #E3F2FD',
            fontSize: '14px',
            height: '48px',
            padding: '5px',
            backgroundColor: backgroundColor,
            transition: 'background-color 0.2s ease'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {isConfirmed ? (
            <span style={{ color: '#28a745', fontWeight: 'bold' }}>{weight || row.weight || '-'}</span>
          ) : (
            <TextField
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              error={!!errors.weight}
              helperText={errors.weight}
              InputProps={{
                sx: {
                  height: "35px",
                  fontSize: "13px",
                  backgroundColor: '#fff'
                },
              }}
              sx={{
                width: '100%',
                "& .MuiOutlinedInput-root": {
                  height: "35px",
                  fontSize: "13px",
                },
                "& input": {
                  padding: "6px",
                  textAlign: 'center'
                },
              }}
            />
          )}
        </TableCell>

        <TableCell
          align="center"
          style={{
            width: CUSTOM_COLUMN_WIDTHS.prepDateTime,
            borderLeft: "1px solid #E3F2FD",
            borderTop: '1px solid #E3F2FD',
            borderBottom: '1px solid #E3F2FD',
            fontSize: '14px',
            height: '48px',
            padding: '5px',
            backgroundColor: backgroundColor,
            transition: 'background-color 0.2s ease'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {isConfirmed ? (
            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
              {prepDateTime
                ? dayjs(prepDateTime).format('DD/MM/YYYY HH:mm')
                : '-'}
            </span>
          ) : (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                ampm={false}
                minutesStep={1}
                timeSteps={{ minutes: 1 }}
                maxDateTime={dayjs()}
                value={prepDateTime ? dayjs(prepDateTime) : null}
                onChange={(newValue) => {
                  setPrepDateTime(
                    newValue ? newValue.format('YYYY-MM-DDTHH:mm') : ''
                  );
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    error: !!errors.prepDateTime,
                    helperText: errors.prepDateTime,
                    sx: {
                      "& .MuiOutlinedInput-root": {
                        height: "35px",
                        fontSize: "13px",
                        backgroundColor: "#fff",
                      },
                      "& input": {
                        padding: "6px",
                        textAlign: "center",
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          )}
        </TableCell>

        <TableCell
          style={{
            width: CUSTOM_COLUMN_WIDTHS.confirm,
            textAlign: 'center',
            borderTop: '1px solid #E3F2FD',
            borderBottom: '1px solid #E3F2FD',
            borderLeft: '1px solid #E3F2FD',
            height: '48px',
            padding: '0px',
            backgroundColor: backgroundColor,
            transition: 'background-color 0.2s ease'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {isConfirmed ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#28a745' }}>
              <CheckCircleIcon style={{ fontSize: '24px' }} />
              <span style={{ marginLeft: '5px', fontSize: '12px', fontWeight: 'bold' }}>ยืนยันแล้ว</span>
            </div>
          ) : (
            <IconButton
              onClick={handleConfirm}
              style={{
                color: '#28a745',
                padding: '5px'
              }}
            >
              <CheckCircleIcon style={{ fontSize: '24px' }} />
            </IconButton>
          )}
        </TableCell>

        <PackSC
          width={CUSTOM_COLUMN_WIDTHS.cart}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditModal(row);
          }}
          icon={<LiaShoppingCartSolid style={{ color: '#4aaaec', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />
        <PackEdit
          width={CUSTOM_COLUMN_WIDTHS.edit}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditLineModal(row);
          }}
          icon={<EditIcon style={{ color: '#ffc107', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />
        <Packsend
          width={CUSTOM_COLUMN_WIDTHS.delete}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDeleteModal(row);
          }}
          icon={<FaRegCheckCircle style={{ color: '#ff0000', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
    </>
  );
};

const Packsend = ({ width, onClick, icon, backgroundColor }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #E3F2FD',
        borderBottom: '1px solid #E3F2FD',
        borderLeft: '1px solid #E3F2FD',
        height: '48px',
        padding: '0px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#ff4444';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#ff0000';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const PackSC = ({ width, onClick, icon, backgroundColor }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #E3F2FD',
        borderBottom: '1px solid #E3F2FD',
        borderLeft: '1px solid #E3F2FD',
        height: '48px',
        padding: '0px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#4aaaec';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#4aaaec';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const PackEdit = ({ width, onClick, icon, backgroundColor }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #E3F2FD',
        borderBottom: '1px solid #E3F2FD',
        borderLeft: '1px solid #E3F2FD',
        height: '48px',
        padding: '0px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#ffc107';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#ffc107';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const TableMainPrep = ({
  handleOpenModal,
  data,
  handleRowClick,
  handleOpenEditModal,
  handleOpenDeleteModal,
  handleOpenEditLineModal,
  handleOpenSuccess,
  onConfirmRow,
  handleOpenModalInputRM
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [openRowId, setOpenRowId] = useState(null);
  const [selectedDocNo, setSelectedDocNo] = useState('');

  const displayColumns = ['batch_after', 'mat_name', 'production', 'rmit_date', 'out_cold_date', 'out_cold_date_two', 'weight_RM'];

  const uniqueDocNos = [...new Set(data.map(row => row.doc_no).filter(Boolean))].sort();

  // Calculate total weight
  const totalWeight = filteredRows.reduce((sum, row) => {
    const weight = parseFloat(row.weight_RM) || 0;
    return sum + weight;
  }, 0);

  useEffect(() => {
    let filtered = data;

    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (selectedDocNo) {
      filtered = filtered.filter(row => row.doc_no === selectedDocNo);
    }

    setFilteredRows(filtered);
    setPage(0);
  }, [searchTerm, data, selectedDocNo]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const totalCustomWidth = Object.values(CUSTOM_COLUMN_WIDTHS).reduce((sum, width) => sum + parseInt(width), 0);
  const remainingWidth = `calc((100% - ${totalCustomWidth}px) / ${displayColumns.length})`;
  const columnWidths = Array(displayColumns.length).fill(remainingWidth);

  const headerNames = {
    "batch_after": "Batch",
    "mat_name": "ชื่อวัตถุดิบ",
    "rmit_date": "เวลาเตรียม",
    // "qc_date": "เวลา QC ตรวจสอบ",
    // "come_cold_date": "เวลาเข้าห้องเย็นรอบที่ 1",
    "out_cold_date": "ออกห้องเย็น 1",
    //  "come_cold_date_two": "เวลาเข้าห้องเย็นรอบที่ 2",
    "out_cold_date_two": "ออกห้องเย็น 2",
    //  "come_cold_date_three": "เวลาเข้าห้องเย็นรอบที่ 3",
    //  "out_cold_date_three": "ออกห้องเย็นรอบที่ 3",

    "production": "แผน",
    "weight_RM": "น้ำหนัก",
  };

  const getColumnWidth = (header) => {
    if (header === "mat_name") return "150px";
    if (header === "rmit_date") return "110px";
    //    if (header === "qc_date") return "110px";
    //  if (header === "come_cold_date") return "110px";
    if (header === "out_cold_date") return "110px";
    //  if (header === "come_cold_date_two") return "110px";
    if (header === "out_cold_date_two") return "110px";
    //   if (header === "come_cold_date_three") return "110px";
    //   if (header === "out_cold_date_three") return "110px";
    if (header === "production") return "80px";
    if (header === "tro_id") return "180px";
    if (["weight_RM"].includes(header)) return "10px";
    if (header === "batch_after") return "50px";
    return "150px";
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

      {/* Header Section */}
      <Box sx={{
        background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
        padding: '20px 24px',
        borderRadius: '16px 16px 0 0'
      }}>
        {/* Search Row */}
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
        </Box>

        {/* Filters and Weight Summary Row */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }} >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon sx={{ color: '#fff', fontSize: '20px' }} />
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>ตัวกรอง:</span>
            </Box>



            <SearchableDropdown
              label="Doc No"
              options={uniqueDocNos}
              value={selectedDocNo}
              onChange={setSelectedDocNo}
              placeholder="เลือก Doc No"
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
          <Box>
            <IconButton
              onClick={() => handleOpenModalInputRM({})}
              sx={{
                backgroundColor: '#fff',
                color: '#2196F3',
                width: 'auto',           
                height: '42px',
                px: 2,                   
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                gap: 1,                  
                '&:hover': {
                  backgroundColor: '#E3F2FD'
                }
              }}
            >
              <LiaShoppingCartSolid size={22} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                เพิ่ม RM
              </span>
            </IconButton>
          </Box>

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
                    borderRight: "1px solid rgba(255,255,255,0.1)",
                    fontSize: '14px',
                    color: '#fff',
                    padding: '12px',
                    width: getColumnWidth(header),
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    borderTopLeftRadius: index === 0 ? '12px' : '0',
                    borderBottomLeftRadius: index === 0 ? '12px' : '0'
                  }}
                >
                  <Box style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px' }}>
                    {headerNames[header] || header}
                  </Box>
                </TableCell>
              ))}

              <TableCell align="center" style={{
                backgroundColor: "#2196F3",
                borderTop: "1px solid #1976D2",
                borderBottom: "1px solid #1976D2",
                borderRight: "1px solid rgba(255,255,255,0.1)",
                fontSize: '14px',
                color: '#fff',
                padding: '12px',
                width: CUSTOM_COLUMN_WIDTHS.group,
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <Box style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px' }}>หม้อที่</Box>
              </TableCell>

              <TableCell align="center" style={{
                backgroundColor: "#2196F3",
                borderTop: "1px solid #1976D2",
                borderBottom: "1px solid #1976D2",
                borderRight: "1px solid rgba(255,255,255,0.1)",
                fontSize: '14px',
                color: '#fff',
                padding: '12px',
                width: CUSTOM_COLUMN_WIDTHS.weight,
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <Box style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px' }}>น้ำหนัก (kg)</Box>
              </TableCell>

              <TableCell align="center" style={{
                backgroundColor: "#2196F3",
                borderTop: "1px solid #1976D2",
                borderBottom: "1px solid #1976D2",
                borderRight: "1px solid rgba(255,255,255,0.1)",
                fontSize: '14px',
                color: '#fff',
                padding: '12px',
                width: CUSTOM_COLUMN_WIDTHS.prepDateTime,
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <Box style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px' }}>เวลาบรรจุเสร็จ</Box>
              </TableCell>

              <TableCell align="center" style={{
                backgroundColor: "#2196F3",
                borderTop: "1px solid #1976D2",
                borderBottom: "1px solid #1976D2",
                borderRight: "1px solid rgba(255,255,255,0.1)",
                fontSize: '14px',
                color: '#fff',
                padding: '12px',
                width: CUSTOM_COLUMN_WIDTHS.confirm,
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <Box style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px' }}>ยืนยัน</Box>
              </TableCell>

              <TableCell align="center" style={{
                backgroundColor: "#2196F3",
                borderTop: "1px solid #1976D2",
                borderBottom: "1px solid #1976D2",
                borderRight: "1px solid rgba(255,255,255,0.1)",
                fontSize: '14px',
                color: '#fff',
                padding: '12px',
                width: "90px",
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <Box style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px' }}>รถเข็น</Box>
              </TableCell>

              <TableCell align="center" style={{
                backgroundColor: "#2196F3",
                borderTop: "1px solid #1976D2",
                borderBottom: "1px solid #1976D2",
                borderRight: "1px solid rgba(255,255,255,0.1)",
                fontSize: '14px',
                color: '#fff',
                padding: '12px',
                width: "90px",
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <Box style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px' }}>แก้ไข</Box>
              </TableCell>

              <TableCell align="center" style={{
                backgroundColor: "#2196F3",
                borderTop: "1px solid #1976D2",
                borderBottom: "1px solid #1976D2",
                borderRight: "1px solid #1976D2",
                fontSize: '14px',
                color: '#fff',
                padding: '12px',
                borderTopRightRadius: '12px',
                borderBottomRightRadius: '12px',
                width: "90px",
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <Box style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px' }}>ลบ</Box>
              </TableCell>
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
                  handleOpenDeleteModal={handleOpenDeleteModal}
                  handleOpenSuccess={handleOpenSuccess}
                  handleConfirmRow={onConfirmRow}
                  openRowId={openRowId}
                  index={index}
                  setOpenRowId={setOpenRowId}
                  displayColumns={displayColumns}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 7} align="center" sx={{
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
    </Paper>
  );
};

export default TableMainPrep;