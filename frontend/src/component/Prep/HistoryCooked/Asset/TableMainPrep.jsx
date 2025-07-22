import React, { useState, useEffect } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, TextField, Collapse, TablePagination, Divider, Typography } from '@mui/material';
import { LiaShoppingCartSolid } from 'react-icons/lia';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import { SlClose } from "react-icons/sl";
import { FaRegCircle } from "react-icons/fa";
import { FaRegCheckCircle } from "react-icons/fa";
import { BsPrinter } from "react-icons/bs";

const Row = ({
  row,
  columnCount,
  columnWidths,
  handleOpenModal,
  handleRowClick,
  handleOpenEditModal,
  handleOpenSuccess,
  selectedColor,
  openRowId,
  setOpenRowId
}) => {
  const calculateTimeDifference = (cookedDateTime) => {
    const cookedTime = new Date(cookedDateTime);
    const currentDate = new Date();
    const timeDifference = (currentDate - cookedTime) / (1000 * 60);
    return timeDifference;
  };

  const timePassed = calculateTimeDifference(row.CookedDateTime);
  const oven_to_coldMinutes = row.oven_to_cold * 60;
  const percentage = (timePassed / oven_to_coldMinutes) * 100;

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

  const timeRemaining = oven_to_coldMinutes - timePassed;
  const statusMessage = timeRemaining > 0
    ? `เหลืออีก ${formatTime(timeRemaining)}`
    : `เลยกำหนด ${formatTime(Math.abs(timeRemaining))}`;

  let borderColor;
  if (percentage >= 100) {
    borderColor = '#FF8175'; // สีแดง - 100% ขึ้นไป
  } else if (percentage >= 50) {
    borderColor = '#FFF398'; // สีเหลือง - 50-99%
  } else {
    borderColor = '#80FF75'; // สีเขียว - 1-49%
  }

  const colorMatch = (selectedColor === 'green' && borderColor === '#80FF75') ||
    (selectedColor === 'yellow' && borderColor === '#FFF398') ||
    (selectedColor === 'red' && borderColor === '#FF8175');

  if (selectedColor && !colorMatch) return null;

  const isOpen = openRowId === row.rmfp_id;

  // Remove rmfp_id from the row data to be displayed
  const { rmfp_id,oven_to_cold, ...displayRow } = row;

  return (
    <>
      <TableRow onClick={() => {
        setOpenRowId(isOpen ? null : row.rmfp_id);
        handleRowClick(row.rmfp_id);
      }} style={{ cursor: 'pointer' }}>
        <TableCell style={{
          width: columnWidths[columnCount - 2],
          textAlign: 'center',
          borderTop: '1px solid #e0e0e0',
          borderBottom: '1px solid #e0e0e0',
          height: '40px',
          padding: '0px 30px',
          borderRight: "0px solid #e0e0e0",
          borderTopLeftRadius: "8px",
          borderBottomLeftRadius: "8px",
          borderLeft: `5px solid ${borderColor}`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '10px',
            height: '100%',
            color: percentage >= 100 ? 'red' : percentage >= 50 ? 'orange' : 'green',
          }}>
            {statusMessage}
          </div>
        </TableCell>
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
              fontSize: '10px',
              height: '40px',
              lineHeight: '1.5',
              padding: '0px 10px',
              color: "#787878",
            }}
          >
            {value || '-'}
          </TableCell>
        ))}
        {/* <TableCell style={{
          width: columnWidths[columnCount - 2],
          textAlign: 'center',
          borderTop: '1px solid #e0e0e0',
          borderBottom: '1px solid #e0e0e0',
          borderLeft: '1px solid #f2f2f2',
          height: '40px',
          padding: '0px',
          borderRight: "0px solid #e0e0e0"
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}>
            <LiaShoppingCartSolid
              style={{
                cursor: 'pointer',
                color: '#007BFF',
                fontSize: '24px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(row);
              }}
            />
          </div>
        </TableCell> */}
        <TableCell style={{
          width: columnWidths[columnCount - 2],
          textAlign: 'center',
          borderTop: '1px solid #e0e0e0',
          borderBottom: '1px solid #e0e0e0',
          borderLeft: '1px solid #f2f2f2',
          height: '40px',
          padding: '0px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}>
            <BsPrinter
              style={{
                cursor: 'pointer',
                color: '#007BFF',
                fontSize: '20px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenSuccess(row);
              }}
            />
          </div>
        </TableCell>
        {/* <TableCell style={{
          width: columnWidths[columnCount - 2],
          textAlign: 'center',
          borderTop: '1px solid #e0e0e0',
          borderBottom: '1px solid #e0e0e0',
          borderLeft: '1px solid #f2f2f2',
          height: '40px',
          padding: '0px',
          borderRight:'1px solid #e0e0e0',
          borderTopRightRadius:'8px',
          borderBottomRightRadius:'8px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}>
            <EditIcon
              style={{
                cursor: 'pointer',
                color: '#edc026',
                fontSize: '22px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditModal(row);
              }}
            />
          </div>
        </TableCell> */}
      </TableRow>

      <TableRow>
        <TableCell colSpan={columnCount} style={{ padding: '2px', borderBottom: 'none' }}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ backgroundColor: '#f5f5f5', overflowX: 'auto', marginBottom: '5px', marginTop: '5px', borderRadius: '6px' }}>
              <Table style={{ tableLayout: 'fixed' }}>
                <TableBody>
                  {[row].map((detailRow, index) => (
                    <TableRow key={index}>
                      <TableCell style={{
                        width: columnWidths[columnCount - 1],
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        height: '40px',
                        padding: "0px 10px",
                        borderBottomRightRadius: "8px",
                        borderTopRightRadius: "8px"
                      }}></TableCell>
                      {Object.values(displayRow).map((detail, idx) => (
                        <TableCell
                          key={idx}
                          align="center"
                          style={{
                            width: columnWidths[idx],
                            border: '1px solid #e0e0e0',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            fontSize: '10px',
                            lineHeight: '1.5',
                            height: '40px',
                            padding: "0px 10px",
                            color: "#787878"
                          }}
                        >
                          {detail}
                        </TableCell>
                      ))}
                      <TableCell style={{
                        width: columnWidths[columnCount - 3],
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        height: '40px',
                        padding: "0px 10px"
                      }}></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const TableMainPrep = ({ handleOpenModal, data, handleRowClick, handleOpenEditModal,handleOpenSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedColor, setSelectedColor] = useState('');
  const [openRowId, setOpenRowId] = useState(null);

  useEffect(() => {
    setFilteredRows(
      data.filter((row) =>
        Object.values(row).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
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

  // Remove rmfp_id from the columns to be displayed
  // const columns = Object.keys(data[0] || {}).filter(key => key !== 'rmfp_id','oven_to_cold');
  const columns = Object.keys(data[0] || {}).filter(key => key !== 'rmfp_id' && key !== 'oven_to_cold');
  const columnCount = columns.length + 2; // +3 for the additional columns (DelayTime, เลือกรถเข็น, แก้ไขแผนการผลิต)
  const columnWidth = `${100 / columnCount}%`;
  const columnWidths = Array(columnCount).fill(columnWidth);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingX: 2, height: '60px', margin: '0px 5px', minHeight: '60px' }}>
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
              color: "#787878"
            },
            "& input": {
              padding: "8px",
            },
          }}
        />
        <div style={{ border: "1px solid #cbcbcb", padding: "7px", borderRadius: "5px" }}>
          <FaRegCircle
            onClick={() => handleFilterChange('green')}
            style={{
              cursor: 'pointer',
              color: selectedColor === 'green' ? '#80FF75' : '#80FF75',
              fontSize: '24px',
            }}
          />
        </div>
        <div style={{ border: "1px solid #cbcbcb", padding: "7px", borderRadius: "5px" }}>
          <FaRegCircle
            onClick={() => handleFilterChange('yellow')}
            style={{
              cursor: 'pointer',
              color: selectedColor === 'yellow' ? '#FFF398' : '#FFF398',
              fontSize: '24px',
            }}
          />
        </div>
        <div style={{ border: "1px solid #cbcbcb", padding: "7px", borderRadius: "5px" }}>
          <FaRegCircle
            onClick={() => handleFilterChange('red')}
            style={{
              cursor: 'pointer',
              color: selectedColor === 'red' ? '#FF8175' : '#FF8175',
              fontSize: '24px',
            }}
          />
        </div>
      </Box>

      <TableContainer style={{ padding: '0px 20px' }} sx={{ height: 'calc(70vh)', overflowY: 'auto' }}>

<Table stickyHeader style={{ tableLayout: 'auto' }}>
  <TableHead>
    <TableRow sx={{ height: '40px' }}>
      <TableCell align="center"  style={{
                borderTopLeftRadius: '8px',
                borderBottomLeftRadius: '8px',
                borderTop: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
                borderRight: "1px solid #f2f2f2",
                fontSize: '12px', color: '#787878',
                borderLeft: "1px solid #e0e0e0",
                padding: '5px',
                width: columnWidths[columnCount - 2]
              }}
              >
        <Typography style={{ fontSize: '12px' }}>DelayTime</Typography>
      </TableCell>
      {columns.map((key, index) => (
        <TableCell key={index} align="center" style={{
          borderTop: "1px solid #e0e0e0",
          borderBottom: "1px solid #e0e0e0",
          borderRight: "1px solid #f2f2f2",
          fontSize: '12px',
          color: '#787878',
          padding: '5px',
          width: columnWidths[index],
        }}
>
          <Typography style={{ fontSize: '12px' }}>{key}</Typography>
        </TableCell>
      ))}
   
      <TableCell align="center" style={{
                borderLeft: "0px solid ", borderTop: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", borderRight: "1px solid #f2f2f2", fontSize: '12px', color: '#787878', padding: '5px', width: columnWidths[columnCount - 2]
              }}>
        <Typography style={{ fontSize: '12px' }}>ปริ้นย้อนหลัง</Typography>
      </TableCell>
   
    </TableRow>
  </TableHead>
  <Typography sx={{  mb: 1 }}></Typography> {/* ย้ายออกจาก <Table> */}


  <TableBody>
    {filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
      <Row
        key={index}
        row={row}
        columnCount={columnCount}
        columnWidths={columnWidths}
        handleOpenModal={handleOpenModal}
        handleRowClick={handleRowClick}
        handleOpenEditModal={handleOpenEditModal}
        handleOpenSuccess={handleOpenSuccess}
        selectedColor={selectedColor}
        openRowId={openRowId}
        setOpenRowId={setOpenRowId}
      />
    ))}
  </TableBody>
</Table>

      </TableContainer>
      <Divider sx={{ mt: 1, marginLeft: 3, marginRight: 3 }} />
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