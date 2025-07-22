import React from 'react';
import { 
  Table, 
  TableBody, 
  TableRow, 
  TableCell, 
  TablePagination, 
  Box, 
  Typography, 
  IconButton, 
  Paper, 
  Tooltip, 
  Stack,
  Chip,
  Fade,
  useTheme,
  Skeleton,
  TableHead
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Inventory2 as InventoryIcon,
  Search as SearchIcon,
  WorkOutline as WorkIcon
} from '@mui/icons-material';
import { PiMapPinAreaFill } from "react-icons/pi";


// กำหนดสีฟ้าที่ใช้ทั้งระบบ
const BLUE_COLOR = "hsl(210, 100%, 60%)";
const LIGHT_BLUE_COLOR = "hsl(210, 100%, 95%)";

const WorkAreaTable = ({ 
  filteredData, 
  page, 
  rowsPerPage, 
  totalRows, 
  handleChangePage, 
  handleChangeRowsPerPage, 
  handleEdit, 
  handleDelete,
  loading = false
}) => {
  const theme = useTheme();
  const hasData = filteredData && filteredData.length > 0;

  // Component สำหรับแสดง Loading Skeleton
  const LoadingSkeleton = () => (
    <>
      {[...Array(rowsPerPage)].map((_, index) => (
        <TableRow key={index}>
          <TableCell align="center">
            <Skeleton animation="wave" height={24} width="80%" sx={{ mx: 'auto' }} />
          </TableCell>
          <TableCell align="center">
            <Skeleton animation="wave" height={24} width="90%" sx={{ mx: 'auto' }} />
          </TableCell>
          <TableCell align="center">
            <Stack direction="row" spacing={1} justifyContent="center">
              <Skeleton animation="wave" variant="circular" width={30} height={30} />
              <Skeleton animation="wave" variant="circular" width={30} height={30} />
            </Stack>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  // Component สำหรับแสดงเมื่อไม่มีข้อมูล
  const NoDataDisplay = () => (
    <TableRow>
      <TableCell colSpan={3} align="center">
        <Fade in={true} timeout={800}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: 2, 
            py: 6,
            opacity: 0.7
          }}>
            <InventoryIcon sx={{ fontSize: 48, color: theme.palette.text.secondary }} />
            <Typography variant="body1" color="text.secondary">
              ไม่พบข้อมูลพื้นที่ทำงาน
            </Typography>
            {filteredData?.length === 0 && totalRows > 0 && (
              <Chip 
                icon={<SearchIcon fontSize="small" />} 
                label="ไม่พบข้อมูลตรงตามการค้นหา" 
                color="primary" 
                variant="outlined" 
                size="small"
              />
            )}
          </Box>
        </Fade>
      </TableCell>
    </TableRow>
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Paper 
        elevation={2}
        sx={{ 
          borderRadius: 2,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: 4
          },
          overflow: 'hidden' // สำคัญมากเพื่อให้ส่วนหัวตารางอยู่ติดกันกับเนื้อหา
        }}
      >
        {/* ส่วนหัวตาราง (ไม่มี scrollbar) */}
        <Box>
          <Table size="medium" padding="normal">
            <TableHead>
              <TableRow>
                <TableCell 
                  align="center" 
                  sx={{ 
                    bgcolor: BLUE_COLOR, 
                    color: '#ffffff', 
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    py: 2
                  }}
                >
                  รหัสพื้นที่
                </TableCell>
                <TableCell 
                  align="center" 
                  sx={{ 
                    bgcolor: BLUE_COLOR, 
                    color: '#ffffff', 
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    fontWeight: 'bold',
                    py: 2
                  }}
                >
                  ชื่อพื้นที่
                </TableCell>
                <TableCell 
                  align="center" 
                  sx={{ 
                    bgcolor: BLUE_COLOR, 
                    color: '#ffffff', 
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    fontWeight: 'bold',
                    width: '120px',
                    minWidth: '120px',
                    py: 2
                  }}
                >
                  จัดการ
                </TableCell>
              </TableRow>
            </TableHead>
          </Table>
        </Box>
        
        {/* ส่วนเนื้อหาตารางที่ scroll ได้ */}
        <Box sx={{ 
          maxHeight: { xs: 'calc(38vh)', md: 'calc(43vh - 3rem)' },
          overflowY: 'auto',
          position: 'relative' // สำคัญ! ทำให้ scrollbar ไม่ซ้อนทับกัน
        }}>
          <Table size="medium">
            <TableBody>
              {loading ? (
                <LoadingSkeleton />
              ) : hasData ? (
                filteredData.map((item, index) => (
                  <TableRow 
                    key={item.WorkAreaCode || index} 
                    sx={{ 
                      '&:nth-of-type(odd)': { 
                        bgcolor: LIGHT_BLUE_COLOR
                      },
                      '&:nth-of-type(even)': {
                        bgcolor: '#ffffff'
                      },
                      '&:hover': {
                        bgcolor: 'rgba(0, 120, 255, 0.1)'
                      },
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <PiMapPinAreaFill fontSize="1.5rem" sx={{ color: BLUE_COLOR }} />
                        <Typography fontWeight="medium">
                          {item.WorkAreaCode || "-"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography>
                        {item.WorkAreaName || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="แก้ไขข้อมูล" arrow placement="top">
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: BLUE_COLOR,
                              border: '1px solid',
                              borderColor: `${BLUE_COLOR}80`, // เพิ่มความโปร่งใส 50%
                              '&:hover': {
                                bgcolor: BLUE_COLOR,
                                color: '#ffffff'
                              }
                            }}
                            onClick={() => handleEdit(item)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบข้อมูล" arrow placement="top">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDelete(item.WorkAreaCode)}
                            sx={{ 
                              border: '1px solid',
                              borderColor: 'error.light',
                              '&:hover': {
                                bgcolor: 'error.light',
                                color: 'error.contrastText'
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <NoDataDisplay />
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Box sx={{ pl: 2 }}>
          {hasData && (
            <Chip 
              icon={<InventoryIcon fontSize="small" />}
              label={`ทั้งหมด ${totalRows} รายการ`}
              sx={{ bgcolor: `${BLUE_COLOR}20`, color: BLUE_COLOR, borderColor: `${BLUE_COLOR}60` }}
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalRows}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="แสดง"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}–${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
          }
          sx={{
            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
              margin: 0,
              [theme.breakpoints.down('sm')]: {
                fontSize: '0.75rem'
              }
            },
            '.MuiTablePagination-select': {
              [theme.breakpoints.down('sm')]: {
                fontSize: '0.75rem'
              }
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default WorkAreaTable;