import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Tooltip,
  Chip,
  useTheme,
  styled,
  Alert,
  Badge,
  alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import FilterListIcon from '@mui/icons-material/FilterList';
import NoDataIcon from '@mui/icons-material/Inbox';
import MixIcon from '@mui/icons-material/Blender';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // For trolley items
import VisibilityIcon from '@mui/icons-material/Visibility';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 'none',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StatusChip = ({ status }) => {
  const theme = useTheme();

  // Default case when status is undefined, null, or empty
  if (!status) return (
    <Chip
      label="บรรจุสำเร็จ"
      size="small"
      sx={{
        fontWeight: 500,
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        color: theme.palette.success.dark,
        borderColor: alpha(theme.palette.success.main, 0.3),
      }}
      variant="outlined"
    />
  );

  let color = 'default';
  let backgroundColor = alpha(theme.palette.grey[500], 0.1);
  let textColor = theme.palette.text.primary;

  // Make sure status is a string before calling toLowerCase()
  const statusLower = typeof status === 'string' ? status.toLowerCase() : String(status).toLowerCase();

  if (statusLower.includes('complete')) {
    color = 'success';
    backgroundColor = alpha(theme.palette.success.main, 0.1);
    textColor = theme.palette.success.dark;
  }
  if (statusLower.includes('pending')) {
    color = 'warning';
    backgroundColor = alpha(theme.palette.warning.main, 0.1);
    textColor = theme.palette.warning.dark;
  }
  if (statusLower.includes('error')) {
    color = 'error';
    backgroundColor = alpha(theme.palette.error.main, 0.1);
    textColor = theme.palette.error.dark;
  }

  return (
    <Chip
      label={status}
      color={color}
      size="small"
      sx={{
        fontWeight: 500,
        backgroundColor: backgroundColor,
        color: textColor,
        borderColor: color !== 'default' ? alpha(theme.palette[color].main, 0.3) : undefined,
      }}
      variant={color !== 'default' ? "outlined" : "filled"}
    />
  );
};

// Format date consistently
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  } catch (error) {
    console.error("Date formatting error:", error);
    return '-';
  }
};

// Format full date and time for tooltip
const formatFullDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString();
  } catch (error) {
    console.error("DateTime formatting error:", error);
    return '';
  }
};

// Helper function to safely convert any value to string
const safeToString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const HistoryTablePage = ({ data = [], onPrint = () => { }, onViewDetails = () => { } }) => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 25));
    setPage(0);
  };

  // Memoized filtered data for better performance
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (!item) return false;

      const searchLower = searchTerm.toLowerCase();

      // Search in both the item itself and its group items
      const matchesItemSearch = (
        (safeToString(item.doc_no).toLowerCase().includes(searchLower)) ||
        (safeToString(item.code).toLowerCase().includes(searchLower)) ||
        (safeToString(item.mat).toLowerCase().includes(searchLower)) ||
        (safeToString(item.mat_name).toLowerCase().includes(searchLower)) ||
        (safeToString(item.mix_code).toLowerCase().includes(searchLower)) ||
        (safeToString(item.tro_id).toLowerCase().includes(searchLower))
      );

      // Search in grouped items
      const matchesGroupItemsSearch = item.groupItems?.some(groupItem =>
        (safeToString(groupItem.doc_no).toLowerCase().includes(searchLower)) ||
        (safeToString(groupItem.code).toLowerCase().includes(searchLower)) ||
        (safeToString(groupItem.mat).toLowerCase().includes(searchLower)) ||
        (safeToString(groupItem.mat_name).toLowerCase().includes(searchLower))
      );

      return !searchTerm || matchesItemSearch || matchesGroupItemsSearch;
    });
  }, [data, searchTerm]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  const emptyRows =
    page > 0 ? Math.max(0, rowsPerPage - filteredData.length - page * rowsPerPage) : 0;

  // Show empty state if no data
  if (!data || data.length === 0) {
    return (
      <Box sx={{
        padding: 3,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: theme.shadows[1]
      }}>
        <Alert
          severity="info"
          icon={<NoDataIcon />}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}
        >
          No material history data available
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{
      padding: 3,
      backgroundColor: theme.palette.background.paper,
      borderRadius: 2,
      boxShadow: theme.shadows[1]
    }}>

      <TextField
        label="ค้นหาเอกสาร"
        variant="outlined"
        size="small"
        fullWidth
        margin="normal"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="ตัวกรองขั้นสูง">
                <IconButton size="small">
                  <FilterListIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
          sx: {
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper
          }
        }}
        placeholder="พิมพ์เพื่อค้นหา..."
        sx={{ mb: 2 }}
      />

      {filteredData.length === 0 ? (
        <Alert
          severity="info"
          sx={{ mt: 2, mb: 2 }}
        >
          ไม่พบข้อมูลที่ตรงกับคำค้นหา
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            marginTop: 2,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
            overflowX: 'auto'
          }}
        >
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <StyledTableCell sx={{ textAlign: 'center' }}>ลำดับ</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>Code</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>ไลน์การผลิต</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>หมายเลขรถเข็น</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>รหัสการผสม</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>จำนวนรายการ</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>สถานะ</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>เวลาเบิกวัตถุดิบจากห้องเย็นใหญ่</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>เวลาเตรียม</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>วันที่บรรจุเสร็จ</StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>Actions</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  const isGroup = row.isGrouped;
                  const hasDetails = isGroup && row.groupItems && row.groupItems.length > 0;
                  const isMixed = row.isMixed || (row.mixItems && row.mixItems.length > 0);
                  const hasTrolley = row.tro_id || (row.regularItems && row.regularItems.length > 0);
                  const hasBoth = row.hasBoth || (isMixed && hasTrolley);

                  // Determine row background color based on type
                  let rowBgColor;
                  if (hasBoth) {
                    rowBgColor = index % 2 === 0 ? alpha(theme.palette.secondary.light, 0.05) : alpha(theme.palette.secondary.light, 0.1); // Purple-ish for both trolley and mix
                  } else if (isMixed) {
                    rowBgColor = index % 2 === 0 ? alpha(theme.palette.primary.light, 0.05) : alpha(theme.palette.primary.light, 0.1); // Light purple for mix
                  } else if (hasTrolley) {
                    rowBgColor = index % 2 === 0 ? alpha(theme.palette.info.light, 0.05) : alpha(theme.palette.info.light, 0.1); // Light blue for trolley
                  } else {
                    rowBgColor = index % 2 === 0 ? theme.palette.background.paper : alpha(theme.palette.action.hover, 0.05); // Default white/gray
                  }

                  return (
                    <TableRow
                      key={row?.groupKey || row?.mapping_id || index}
                      hover
                      onClick={() => hasDetails && onViewDetails(row)}
                      sx={{
                        '&:last-child td': { borderBottom: 0 },
                        '&:hover': {
                          backgroundColor: hasDetails ? alpha(theme.palette.action.selected, 0.8) : theme.palette.action.hover,
                          cursor: hasDetails ? 'pointer' : 'default'
                        },
                        backgroundColor: rowBgColor
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500, textAlign: 'center' }}>
                        {page * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {`${row.code || ''} ${row.doc_no ? `-(${row.doc_no})` : ''}`.trim() || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {row.line_name || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {hasTrolley ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Badge
                              badgeContent={row.regularItems?.length || 0}
                              color="info"
                              sx={{ mr: 1 }}
                              invisible={!(row.regularItems?.length > 0)}
                            >
                              <ShoppingCartIcon
                                fontSize="small"
                                color="info"
                                sx={{
                                  opacity: hasTrolley ? 1 : 0.3
                                }}
                              />
                            </Badge>
                            <Typography
                              variant="body2"
                              fontWeight={hasTrolley ? 500 : 'normal'}
                              sx={{ color: hasTrolley ? theme.palette.info.dark : theme.palette.text.secondary }}
                            >
                              {row.tro_id || '-'}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {isMixed ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Badge
                              badgeContent={row.mixItems?.length || 0}
                              color="primary"
                              sx={{ mr: 1 }}
                              invisible={!(row.mixItems?.length > 0)}
                            >
                              <MixIcon
                                fontSize="small"
                                color="primary"
                                sx={{
                                  opacity: isMixed ? 1 : 0.3
                                }}
                              />
                            </Badge>
                            <Typography
                              variant="body2"
                              fontWeight={isMixed ? 500 : 'normal'}
                              sx={{ color: isMixed ? theme.palette.primary.dark : theme.palette.text.secondary }}
                            >
                              {row.mix_code || '-'}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          label={row.itemCount || 1}
                          size="small"
                          color={hasBoth ? "secondary" : (isMixed ? "primary" : "info")}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <StatusChip status={row.rm_status} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {row.withdraw_date ? (
                          <Tooltip title={formatFullDateTime(row.withdraw_date)}>
                            <Typography variant="body2">
                              {formatDate(row.withdraw_date)}
                            </Typography>
                          </Tooltip>
                        ) : '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {row.cooked_date ? (
                          <Tooltip title={formatFullDateTime(row.cooked_date)}>
                            <Typography variant="body2">
                              {formatDate(row.cooked_date)}
                            </Typography>
                          </Tooltip>
                        ) : '-'}
                      </TableCell>

                      <TableCell sx={{ textAlign: 'center' }}>
                        {row.sc_pack_date ? (
                          <Tooltip title={formatFullDateTime(row.sc_pack_date)}>
                            <Typography variant="body2">{formatDate(row.sc_pack_date)}</Typography>
                          </Tooltip>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          {hasDetails && (
                            <Tooltip title="ดูรายละเอียด">
                              <IconButton
                                color="info"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewDetails(row);
                                }}
                                sx={{
                                  mr: 1,
                                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.info.main, 0.2),
                                  }
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="พิมพ์เอกสาร">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPrint(row);
                              }}
                              sx={{
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                }
                              }}
                            >
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={10} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={filteredData.length <= page * rowsPerPage && page > 0 ? Math.max(0, Math.ceil(filteredData.length / rowsPerPage) - 1) : page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="แถวต่อหน้า"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          '& .MuiTablePagination-toolbar': {
            paddingLeft: 0
          }
        }}
      />
    </Box>
  );
};

export default HistoryTablePage;