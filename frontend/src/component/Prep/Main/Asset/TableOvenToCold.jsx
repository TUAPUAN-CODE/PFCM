import React, { useState, useEffect } from 'react';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Box,
  TextField,
  TablePagination,
  Typography,
  Chip
} from '@mui/material';
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const TrolleyTable = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState(data?.trolleys || []);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    if (data?.trolleys) {
      setFilteredRows(
        data.trolleys.filter((row) =>
          Object.values(row).some((value) =>
            value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      );
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'รถเข็นว่าง (ห้องเย็น)': return '#787878';
      case 'มีวัตถุดิบ': return '#007BFF';
      case 'รอบรรจุจัดส่ง': return '#ff9800'; // Orange color for packing trolleys
      default: return '#26c200';
    }
  };

  const Row = ({ row, index }) => {
    const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)";
    const textColor = '#787878';

    return (
      <>
        <TableRow>
          <TableCell style={{ height: "7px", padding: "0px", border: "0px solid" }} />
        </TableRow>
        <TableRow>
          <TableCell
            align="center"
            style={{
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              borderLeft: "1px solid #e0e0e0",
              borderTopLeftRadius: "8px",
              borderBottomLeftRadius: "8px",
              fontSize: '14px',
              height: '40px',
              padding: '0px 10px',
              color: textColor,
              backgroundColor: backgroundColor,
              width: '150px'
            }}
          >
            {row.trolley_number || '-'}
          </TableCell>

          <TableCell
            align="center"
            style={{
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              borderLeft: "1px solid #f2f2f2",
              fontSize: '14px',
              height: '40px',
              padding: '0px 10px',
              backgroundColor: backgroundColor,
              width: '150px'
            }}
          >
            <Chip
              label={row.trolley_status}
              size="small"
              style={{
                backgroundColor: getStatusColor(row.trolley_status),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            />
          </TableCell>
          <TableCell
            align="center"
            style={{
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              borderLeft: "1px solid #f2f2f2",
              fontSize: '14px',
              height: '40px',
              padding: '0px 10px',
              color: textColor,
              backgroundColor: backgroundColor,
              width: '150px'
            }}
          >
            {row.batch || '-'}
          </TableCell>
          <TableCell
            align="center"
            style={{
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              borderLeft: "1px solid #f2f2f2",
              fontSize: '14px',
              height: '40px',
              padding: '0px 10px',
              color: textColor,
              backgroundColor: backgroundColor,
              width: '150px'
            }}
          >
            {row.mat || '-'}
          </TableCell>
          <TableCell
            align="center"
            style={{
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              borderLeft: "1px solid #f2f2f2",
              fontSize: '14px',
              height: '40px',
              padding: '0px 10px',
              color: textColor,
              backgroundColor: backgroundColor,
              width: '150px'
            }}
          >
            {row.mat_name || '-'}
          </TableCell>
          <TableCell
            align="center"
            style={{
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              borderLeft: "1px solid #f2f2f2",
              fontSize: '14px',
              height: '40px',
              padding: '0px 10px',
              color: textColor,
              backgroundColor: backgroundColor,
              width: '150px'
            }}
          >
            {row.production || '-'}
          </TableCell>
          <TableCell
            align="center"
            style={{
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              borderLeft: "1px solid #f2f2f2",
              fontSize: '14px',
              height: '40px',
              padding: '0px 10px',
              color: textColor,
              backgroundColor: backgroundColor,
              width: '150px'
            }}
          >
            {row.cooked_date || '-'}
          </TableCell>
          <TableCell
            align="center"
            style={{
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              fontSize: '14px',
              borderLeft: "1px solid #f2f2f2",
              height: '40px',
              padding: '0px 10px',
              color: textColor,
              backgroundColor: backgroundColor,
              width: '150px'
            }}
          >
            {row.rmit_date || '-'}
          </TableCell>

          <TableCell
            align="center"
            style={{
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              borderLeft: "1px solid #f2f2f2",
              borderRight: "1px solid #e0e0e0",
              borderTopRightRadius: "8px",
              borderBottomRightRadius: "8px",
              fontSize: '14px',
              height: '40px',
              padding: '0px 10px',
              color: textColor,
              backgroundColor: backgroundColor,
              minWidth: '300px'
            }}
          >
            {row.trolley_location || '-'}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ padding: "0px", border: "0px solid" }} />
        </TableRow>
      </>
    );
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0px 0px 3px rgba(0, 0, 0, 0.2)' }}>
      {/* Header Section */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        paddingX: 2,
        paddingY: 1,
        margin: '5px 5px'
      }}>
        <Typography variant="h6" sx={{ color: '#787878', fontWeight: 'bold' }}>
          ข้อมูลรถเข็น
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Summary Stats */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`รถเข็นว่าง: ${data?.summary?.totalEmpty || 0}`}
              size="small"
              style={{ backgroundColor: '#787878', color: 'white' }}
            />
            <Chip
              label={`รถเข็นมีวัตถุดิบ: ${data?.summary?.totalOccupied || 0}`}
              size="small"
              style={{ backgroundColor: '#007BFF', color: 'white' }}
            />
            <Chip
              label={`รถเข็นรอจัดส่ง: ${data?.summary?.totalPacking || 0}`}
              size="small"
              style={{ backgroundColor: '#ff9800', color: 'white' }}
            />
            <Chip
              label={`รวมทั้งหมด: ${data?.summary?.totalTrolleys || 0}`}
              size="small"
              style={{ backgroundColor: '#26c200', color: 'white' }}
            />
          </Box>
        </Box>
      </Box>

      {/* Search Section */}
      <Box sx={{ paddingX: 2, paddingBottom: 1 }}>
        <TextField
          variant="outlined"
          fullWidth
          placeholder="พิมพ์เพื่อค้นหารถเข็น..."
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

      {/* Table Section */}
      <TableContainer
        style={{ padding: '0px 20px' }}
        sx={{
          height: 'calc(68vh)',
          overflowY: 'auto'
        }}
      >

        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ height: '40px' }}>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: '12px',
                  padding: '5px',
                  width: "150px"
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>หมายเลขรถเข็น</Box>
              </TableCell>

              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  borderLeft: "1px solid #f2f2f2",
                  fontSize: '12px',
                  padding: '5px',
                  width: "150px"
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>สถานะรถเข็น</Box>
              </TableCell>

              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: '12px',
                  padding: '5px',
                  width: "200px"
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>Batch</Box>
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: '12px',
                  padding: '5px',
                  width: "200px"
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>Material</Box>
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: '12px',
                  padding: '5px',
                  minWidth: "280px"
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>รายชื่อวัตถุดิบ</Box>
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: '12px',
                  padding: '5px',
                  width: "200px"
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>แผนการผลิต</Box>
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: '12px',
                  padding: '5px',
                  minWidth: "160px"
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>เวลาอบเสร็จ/ต้มเสร็จ</Box>
              </TableCell>

              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: '12px',
                  padding: '5px',
                  minWidth: "160px"
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>เวลาเตรียมเสร็จ</Box>
              </TableCell>


              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTopRightRadius: "8px",
                  borderBottomRightRadius: "8px",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #e0e0e0",
                  fontSize: '12px',
                  padding: '5px',
                  minWidth: "300px"
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>สถานที่รถเข็น</Box>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredRows.length > 0 ? (
              filteredRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <Row key={`${row.trolley_number}-${index}`} row={row} index={index} />
                ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  align="center"
                  sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}
                >
                  ไม่มีข้อมูลรถเข็นในขณะนี้
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
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

export default TrolleyTable;