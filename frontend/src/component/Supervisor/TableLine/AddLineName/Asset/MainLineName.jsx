import React, { useState, useEffect } from "react";
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
  Divider,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import axios from "axios";
import { IoIosAddCircleOutline } from "react-icons/io";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/Delete";

// Import Modal components
import AddLineNameModal from "./AddLinename";
import EditLineNameModal from "./EditLinename";
import DeleteModal from "./DeleteLinename";

const API_URL = import.meta.env.VITE_API_URL;

const LineName = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);
  const [lineNames, setLineNames] = useState([]);
  const [lineTypes, setLineTypes] = useState([]);
  const [selectedLineType, setSelectedLineType] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedLineName, setSelectedLineName] = useState(null);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
    setSelectedLineName(rowData);
  };

  const fetchLineNames = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/lineName`);
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      setLineNames(data);
    } catch (error) {
      console.error("Error fetching line names:", error);
      setLineNames([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLineTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/lineType`);
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      setLineTypes(data);
    } catch (error) {
      console.error("Error fetching line types:", error);
      setLineTypes([]);
    }
  };

  useEffect(() => {
    fetchLineNames();
    fetchLineTypes();
  }, []);

  // Apply filters
  useEffect(() => {
    if (!loading && Array.isArray(lineNames)) {
      let result = [...lineNames];

      // Filter by line type
      if (selectedLineType) {
        result = result.filter((row) => row.line_type_id === selectedLineType);
      }

      // Filter by search term
      if (searchTerm) {
        result = result.filter((row) =>
          Object.values(row)
            .join(" ")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        );
      }

      setFilteredRows(result);
      setPage(0); // Reset to first page when filters change
    }
  }, [searchTerm, selectedLineType, lineNames, loading]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const handleLineTypeChange = (event) => {
    setSelectedLineType(event.target.value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedLineType("");
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedLineType) count++;
    return count;
  };

  // Modal handlers
  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAddModalOpen(true);
  };

  const handleEditClick = (lineName, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedLineName(lineName);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (lineName, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedLineName(lineName);
    setDeleteModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchLineNames(); // Refresh data
    
    // Close all modals
    setAddModalOpen(false);
    setEditModalOpen(false);
    setDeleteModalOpen(false);
  };

  const columns = ["ประเภทไลน์", "ชื่อไลน์", "แก้ไข", "ลบ"];

  return (
    <>
      <Paper
        sx={{
          width: "86vw",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          margin: 0,
          padding: 0,
          borderRadius: 0,
          boxShadow: "none",
          position: "relative",
          left: 0,
          right: 0,
        }}
      >
        {/* Search Bar, Filter และ Add Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            padding: "10px 15px",
            minHeight: "70px",
            flexShrink: 0,
            width: "100%",
            margin: 0,
            flexWrap: "wrap",
          }}
        >
          {/* Search Field */}
          <TextField
            variant="outlined"
            placeholder="พิมพ์เพื่อค้นหา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              sx: { height: "45px" },
            }}
            sx={{
              flex: 1,
              minWidth: "200px",
              "& .MuiOutlinedInput-root": {
                height: "45px",
                fontSize: "16px",
                borderRadius: "8px",
                color: "#787878",
              },
              "& input": {
                padding: "10px",
              },
            }}
          />

          {/* Line Type Filter */}
          <FormControl sx={{ minWidth: "150px", height: "45px" }}>
            <InputLabel id="line-type-filter-label" sx={{ 
                fontSize: "14px",
                color: "#787878",
                transform: "translate(14px, 12px) scale(1)", // ตำแหน่งกลางกรอบ
                "&.Mui-focused": {
                  color: "#787878",
                  transform: "translate(14px, -6px) scale(0.75)", // เลื่อนขึ้นเมื่อ focus
                },
                "&.MuiInputLabel-shrink": {
                  transform: "translate(14px, -6px) scale(0.75)", // เลื่อนขึ้นเมื่อมีค่า
                }
              }}
            >
              Line Type
            </InputLabel>
            <Select
              labelId="line-type-filter-label"
              value={selectedLineType}
              onChange={handleLineTypeChange}
              label="ประเภทไลน์"
              sx={{
                height: "45px",
                fontSize: "16px",
                borderRadius: "8px",
                color: "#787878",
              }}
            >
              <MenuItem value="">
                <em>ทั้งหมด</em>
              </MenuItem>
              {lineTypes.map((type) => (
                <MenuItem key={type.line_type_id} value={type.line_type_id}>
                  {type.line_type_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Clear Filters Button */}
          {getActiveFiltersCount() > 0 && (
            <Button
              onClick={clearFilters}
              variant="outlined"
              startIcon={<ClearIcon />}
              sx={{
                height: "45px",
                borderColor: "#ff6b6b",
                color: "#ff6b6b",
                "&:hover": {
                  borderColor: "#ff5252",
                  backgroundColor: "#fff5f5",
                },
              }}
            >
              ล้างตัวกรอง
            </Button>
          )}
          
          {/* Add Button */}
          <Button
            variant="outlined"
            onClick={handleAddClick}
            sx={{
              border: "1px solid #cbcbcb",
              padding: "8px 16px",
              margin: "3px",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              width: "fit-content",
              whiteSpace: "nowrap",
              fontSize: "16px",
              color: "#787878",
              backgroundColor: "transparent",
              minWidth: "auto",
              height: "45px",
              position: "relative",
              zIndex: 10,
              "&:hover": {
                backgroundColor: "#22c55e",
                color: "white",
                borderColor: "#22c55e",
                "& .add-icon": {
                  color: "white !important",
                },
              },
            }}
          >
            <IoIosAddCircleOutline
              className="add-icon"
              style={{
                margin: 0,
                padding: 0,
                color: "#12D300",
                fontSize: "25px",
                transition: "color 0.2s ease-in-out",
              }}
            />
            <span>เพิ่มชื่อไลน์</span>
          </Button>
        </Box>

        {/* Active Filters Display */}
        {getActiveFiltersCount() > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              padding: "0 15px 10px 15px",
              flexWrap: "wrap",
            }}
          >
            <FilterListIcon sx={{ color: "#666", fontSize: "20px" }} />
            <Typography sx={{ fontSize: "14px", color: "#666", marginRight: "8px" }}>
              ตัวกรองที่ใช้:
            </Typography>
            
            {selectedLineType && (
              <Chip
                label={`ประเภท: ${lineTypes.find(t => t.line_type_id === selectedLineType)?.line_type_name || ""}`}
                onDelete={() => setSelectedLineType("")}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            
            {searchTerm && (
              <Chip
                label={`ค้นหา: "${searchTerm}"`}
                onDelete={() => setSearchTerm("")}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        )}

        {/* Results Summary */}
        <Box sx={{ padding: "0 15px 10px 15px" }}>
          <Typography sx={{ fontSize: "14px", color: "#666" }}>
            แสดงผลลัพธ์ {filteredRows.length} รายการ
            {getActiveFiltersCount() > 0 && ` (จากทั้งหมด ${lineNames.length} รายการ)`}
          </Typography>
        </Box>

        {/* Table Container */}
        <TableContainer
          sx={{
            flex: 1,
            overflow: "auto",
            padding: "0 15px",
            width: "100%",
            margin: 0,
          }}
        >
          <Table stickyHeader sx={{ minWidth: "100%", width: "100%" }}>
            <TableHead>
              <TableRow sx={{ height: "50px", margin: 0 }}>
                {columns.map((column, index) => (
                  <TableCell
                    key={index}
                    align="center"
                    sx={{
                      backgroundColor: "hsl(210, 100%, 60%)",
                      border: "1px solid #e0e0e0",
                      margin: 0,
                      padding: "16px",
                      minWidth: index === 0 ? "250px" : index === 1 ? "250px" : "120px",
                      width: index === 0 ? "35%" : index === 1 ? "35%" : "15%",
                      borderRadius:
                        index === 0
                          ? "8px 0 0 8px"
                          : index === columns.length - 1
                          ? "0 8px 8px 0"
                          : "0",
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                    }}
                  >
                    <Typography sx={{ fontSize: "18px", color: "#ffffff", fontWeight: "normal" }}>
                      {column}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ padding: "20px" }}>
                    <Typography sx={{ fontSize: "16px" }}>Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ padding: "20px" }}>
                    <Typography sx={{ fontSize: "16px" }}>
                      {getActiveFiltersCount() > 0 ? "ไม่พบข้อมูลที่ตรงกับตัวกรอง" : "ไม่พบข้อมูล"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((lineName, index) => (
                    <TableRow
                      key={lineName.line_id || index}
                      sx={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)",
                        '&:hover': {
                          backgroundColor: index % 2 === 0 ? '#f5f5f5' : "hsl(210, 100.00%, 88%)",
                        },
                        height: "60px",
                      }}
                    >
                      <TableCell 
                        align="center" 
                        sx={{ 
                          fontSize: "16px",
                          padding: "16px",
                          minWidth: "250px",
                          width: "35%",
                          whiteSpace: "nowrap",
                          overflow: "visible",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {lineName.line_type_name}
                      </TableCell>
                      
                      <TableCell 
                        align="center" 
                        sx={{ 
                          fontSize: "16px",
                          padding: "16px",
                          minWidth: "250px",
                          width: "35%",
                          whiteSpace: "nowrap",
                          overflow: "visible",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {lineName.line_name}
                      </TableCell>
                      
                      {/* Edit Cell - ปรับให้เต็มช่อง */}
                      <TableCell
                        align="center"
                        sx={{
                          padding: 0,
                          minWidth: "120px",
                          width: "15%",
                          "&:hover": {
                            backgroundColor: "rgba(234, 179, 8, 0.1)",
                          },
                        }}
                        onClick={(e) => {
                          handleRowClick(lineName);
                          handleEditClick(lineName, e);
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            cursor: "pointer",
                            padding: "16px",
                          }}
                        >
                          <EditIcon 
                            sx={{ 
                              fontSize: "24px",
                              color: "#eab308",
                              "&:hover": {
                                color: "#ca8a04",
                              },
                            }} 
                          />
                        </Box>
                      </TableCell>

                      {/* Delete Cell - ปรับให้เต็มช่อง */}
                      <TableCell
                        align="center"
                        sx={{
                          padding: 0,
                          minWidth: "120px",
                          width: "15%",
                          "&:hover": {
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                          },
                        }}
                        onClick={(e) => {
                          handleRowClick(lineName);
                          handleDeleteClick(lineName, e);
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            cursor: "pointer",
                            padding: "16px",
                          }}
                        >
                          <DeleteIcon 
                            sx={{ 
                              fontSize: "24px",
                              color: "#ef4444",
                              "&:hover": {
                                color: "#dc2626",
                              },
                            }} 
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ flexShrink: 0, margin: 0, padding: 0 }}>
          <Divider sx={{ margin: 0 }} />
          <TablePagination
            sx={{
              "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar":
                {
                  fontSize: "12px",
                  color: "#787878",
                  padding: "8px",
                },
              margin: 0,
              padding: "0 15px",
            }}
            rowsPerPageOptions={[20, 50, 100]}
            component="div"
            count={filteredRows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </Paper>

      {/* Modals */}
      <AddLineNameModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <EditLineNameModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleModalSuccess}
        selectedLineName={selectedLineName}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={handleModalSuccess}
        selectedItem={selectedLineName}
        itemType="lineName"
      />
    </>
  );
};

export default LineName;