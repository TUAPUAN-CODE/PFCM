import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography, styled } from '@mui/material';
import { InputAdornment } from "@mui/material";
import { LiaShoppingCartSolid } from 'react-icons/lia';
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import { SlClose } from "react-icons/sl";
import { TbListDetails } from "react-icons/tb";
import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";
import DeleteIcon from "@mui/icons-material/Delete";
import { BsFillClipboardCheckFill } from "react-icons/bs";
import { RiArrowUpBoxLine } from "react-icons/ri";

import { io } from "socket.io-client";
const API_URL = import.meta.env.VITE_API_URL;
 const socket= io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      });

const CUSTOM_COLUMN_WIDTHS = {
  delayTime: '180px',
  cart: '70px',
  complete: '70px',
  edit: '70px',
  delete: '70px'
};

const calculateTimeDifference = (ComeColdDateTime) => {
  const comecolddatetime = new Date(ComeColdDateTime);
  const currentDate = new Date();
  return (currentDate - comecolddatetime) / (1000 * 60);
};

const formatTime = (minutes) => {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.floor(minutes % 60);

  let timeString = '';
  if (days > 0) timeString += `${days} วัน`;
  if (hours > 0) timeString += ` ${hours} ชม.`;
  if (mins > 0) timeString += ` ${mins} นาที`;
  return timeString.trim();
};

const getStatusMessage = (timeRemaining) => {
  return timeRemaining > 0
    ? `เหลืออีก ${formatTime(timeRemaining)}`
    : `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;
};

const getBorderColor = (percentage) => {
  if (percentage >= 100) return '#FF8175'; // สีแดง - 100% ขึ้นไป
  if (percentage >= 50) return '#FFF398'; // สีเหลือง - 50-99%
  return '#80FF75'; // สีเขียว - 1-49%
};

const getRowStatus = (row) => {
  console.log("Row Data:", row); // Debugging

  if (row.rm_status === "รอกลับมาเตรียม" || row.rm_status === "รอ Qc") {
    return {
      borderColor: "#969696",
      statusMessage: "รอ MD",
      hideDelayTime: true,
      percentage: 0, // กำหนดค่าเริ่มต้นให้ percentage
    };
  }

  const timePassed = calculateTimeDifference(row.ComeColdDateTime);
  const coldMinutes = Math.floor(row.cold) * 60 + (row.cold % 1) * 100;
  const percentage = Math.max(0, (timePassed / coldMinutes) * 100);
  const timeRemaining = coldMinutes - timePassed;

  return {
    borderColor: getBorderColor(percentage),
    statusMessage: getStatusMessage(timeRemaining),
    hideDelayTime: timeRemaining > 0,
    percentage,
  };
};

const Row = ({
  row,
  columnWidths,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleopenModal1,
  handleOpenDeleteModal,
  handleOpenSuccess,
  selectedColor,
  openRowId,
  setOpenRowId,
  index
}) => {
  const { borderColor, statusMessage, hideDelayTime, percentage } = getRowStatus(row);
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)"; // เปลี่ยนสีจาราง ขาว เทา

  const colorMatch =
    (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175') ||
    (selectedColor === 'gray' && borderColor === '#969696');

  if (selectedColor && !colorMatch) return null;

  const isOpen = openRowId === row.rmfp_id;
  //ซ่อนคอลัม
  const { rmfp_id, oven_to_pack, CookedDateTime, batch, mat_name, production, rm_tro_id, mat, rm_status, prep_to_cold, rmf_rm_group_id, ComeColdDateTime, dest, rm_cold_status, slot_id, cold, rmg_rm_group_id, rm_type_id, ...displayRow } = row;

  return (
    <>
      <TableRow >
        <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>
      <TableRow onClick={() => {
        setOpenRowId(isOpen ? null : row.rmfp_id);
        handleRowClick(row.rmfp_id);
      }}>

        {Object.values(displayRow).map((value, idx) => (
          <TableCell
            key={idx}
            align="center"
            style={{
              width: columnWidths[idx],
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
            {value || '-'}
          </TableCell>
        ))}

        <Packdetail
          width={CUSTOM_COLUMN_WIDTHS.edit}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditModal(row);
          }}
          icon={<TbListDetails style={{ color: '#41cc4f', fontSize: '22px' }} />}
          backgroundColor={backgroundColor}
        />

        <DeleteCart
          width={CUSTOM_COLUMN_WIDTHS.delete}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDeleteModal(row);
          }}
          icon={<DeleteIcon style={{ color: '#ff5252', fontSize: '20px' }} />}
          backgroundColor={backgroundColor}
        />

      </TableRow>

      <TableRow >
        <TableCell style={{ padding: "0px", border: "0px solid" }}>
        </TableCell>
      </TableRow>

    </>
  );
};

const DeleteCart = ({ width, onClick, icon, backgroundColor }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderLeft: '1px solid #f2f2f2',
        borderRight: "1px solid #e0e0e0",
        height: '40px',
        padding: '0px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#ff5252';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#ff5252';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#ff5252';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#ff5252';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const Packdetail = ({ width, onClick, icon, backgroundColor }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderLeft: '1px solid #f2f2f2',
        height: '40px',
        padding: '0px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#41cc4f';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#41cc4f';
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#41cc4f';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#edc026';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const Addtro = ({ width, onClick, icon, backgroundColor, onMouseEnter, onMouseLeave }) => {
  return (
    <TableCell
      style={{
        textAlign: 'center',
        border: '1px solid #d2d2d2',
        borderRadius: "8px",
        height: '40px',
        width: '160px',
        padding: '0px',
        cursor: 'pointer',
        backgroundColor: backgroundColor
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const Packsend = ({ width, onClick, icon, backgroundColor }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        borderBottom: '1px solid #e0e0e0',
        borderLeft: '1px solid #f2f2f2',
        borderRight: "1px solid #e0e0e0",
        borderTopRightRadius: "8px",
        borderBottomRightRadius: "8px",
        height: '40px',
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
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = '#4aaaec';
        e.currentTarget.querySelector('svg').style.color = '#fff';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector('svg').style.color = '#edc026';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {icon}
      </div>
    </TableCell>
  );
};

const TableMainPrep = ({ handleOpenModal, handleopenModal1, data, handleRowClick, handleOpenEditModal, handleOpenSuccess, handleOpenDeleteModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);
  const [tableWidth, setTableWidth] = useState('100%');
  const searchBoxRef = React.useRef(null);

  const [rows, setRows] = useState(data);

  useEffect(() => {
    socket.on("dataUpdated", (updatedData) => {
      setRows(updatedData);
    });

    return () => {
      socket.off("dataUpdated");
    };
  }, []);

  useEffect(() => {
    setFilteredRows(
      data.filter((row) =>
        Object.values(row).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }, [searchTerm, data]);

  // Use ResizeObserver to match table width with search box width
  useEffect(() => {
    if (searchBoxRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const width = entry.contentRect.width;
          setTableWidth(`${width}px`);
        }
      });

      resizeObserver.observe(searchBoxRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

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

  const columns = Object.keys(data[0] || {}).filter(key => key !== 'rmfp_id' && key !== 'oven_to_pack');
  const totalCustomWidth = Object.values(CUSTOM_COLUMN_WIDTHS).reduce((sum, width) => sum + parseInt(width), 0);
  const remainingWidth = `calc((100% - ${totalCustomWidth}px) / ${columns.length})`;
  const columnWidths = Array(columns.length).fill(remainingWidth);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
      <Box
        ref={searchBoxRef}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          gap: 1,
          paddingX: 2,
          height: { xs: 'auto', sm: '60px' },
          margin: '5px 5px',
          width: 'calc(100% - 20px)' // Subtract padding to get accurate width
        }}
      >
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
        <Addtro
          backgroundColor="#08d242"
          width={CUSTOM_COLUMN_WIDTHS.edit}
          style={{ transition: "background-color 0.3s", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0edd3d")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#08d242")}
          onClick={(e) => {
            e.stopPropagation();
            handleopenModal1();
          }}
          icon={
            <>
              <span style={{ marginLeft: "5px", paddingRight: "15px", color: "#fff" }}>เพิ่มรถเข็น</span>
              <LiaShoppingCartSolid style={{ color: '#fff', fontSize: '24px' }} />
            </>
          }
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <TableContainer
          style={{
            padding: '0px 20px',
            width: tableWidth,
            margin: '0 auto'
          }}
          sx={{
            height: 'calc(68vh)',
            overflowY: 'auto',
            whiteSpace: 'nowrap',
            '@media (max-width: 1200px)': {
              overflowX: 'scroll'
            }
          }}
        >
          <Table
            stickyHeader
            style={{ tableLayout: 'auto' }}
            sx={{
              width: '100%',
              maxWidth: tableWidth
            }}
          >
            <TableHead style={{ marginBottom: "10px" }}>
              <TableRow sx={{ height: '40px' }}>
                <TableCell
                  align="center"
                  style={{
                    backgroundColor: "hsl(210, 100%, 60%)",
                    borderTop: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    borderRight: "1px solid #f2f2f2",
                    fontSize: '12px',
                    color: '#787878',
                    padding: '5px',
                    width: "calc(100% - 80px)", // Adjusted for two buttons
                    borderRadius: '8px 0 0 8px',
                  }}
                >
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>ป้ายทะเบียน</Box>
                </TableCell>
                <TableCell
                  align="center"
                  style={{
                    backgroundColor: "hsl(210, 100%, 60%)",
                    borderLeft: "0px solid ",
                    borderTop: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    borderRight: "1px solid #e0e0e0",
                    fontSize: '12px',
                    color: '#787878',
                    padding: '5px',
                    width: "40px",
                  }}
                >
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>รายละเอียด</Box>
                </TableCell>
                <TableCell
                  align="center"
                  style={{
                    backgroundColor: "hsl(210, 100%, 60%)",
                    borderLeft: "0px solid ",
                    borderTop: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    borderRight: "1px solid #e0e0e0",
                    fontSize: '12px',
                    color: '#787878',
                    padding: '5px',
                    width: "40px",
                    borderRadius: '0 8px 8px 0',
                  }}
                >
                  <Box style={{ fontSize: '16px', color: '#ffffff' }}>ลบ</Box>
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
                    handleopenModal1={handleopenModal1}
                    handleOpenDeleteModal={handleOpenDeleteModal}
                    handleOpenSuccess={handleOpenSuccess}
                    selectedColor={selectedColor}
                    openRowId={openRowId}
                    index={index}
                    setOpenRowId={setOpenRowId}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + 8} align="center" sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}>
                    ไม่มีรายการวัตถุดิบในขณะนี้
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <TablePagination
        sx={{
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar": {
            fontSize: '10px',
            color: "#787878",
            padding: "0px",
          }
        }}
        rowsPerPageOptions={[20, 50, 100]}
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

export default TableMainPrep;