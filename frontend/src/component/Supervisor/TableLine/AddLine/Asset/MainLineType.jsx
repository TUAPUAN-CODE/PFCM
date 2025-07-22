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
} from "@mui/material";
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { IoIosAddCircleOutline } from "react-icons/io";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/Delete";

// Import Modal components
import AddLineModal from "./AddLineType";
import EditLineModal from "./EditLineType";
import DeleteLineModal from "./DeleteModal";

const API_URL = import.meta.env.VITE_API_URL;

const MainLineType = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);
  const [lineTypes, setLineTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedLineType, setSelectedLineType] = useState(null);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
    setSelectedLineType(rowData);
  };

  const fetchLineTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/lineType`);
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      setLineTypes(data);
      setFilteredRows(data);
    } catch (error) {
      console.error("Error fetching line types:", error);
      setLineTypes([]);
      setFilteredRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineTypes();
  }, []);

  useEffect(() => {
    if (!loading && Array.isArray(lineTypes)) {
      const result = lineTypes.filter((row) =>
        Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredRows(result);
    }
  }, [searchTerm, lineTypes, loading]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Modal handlers
  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAddModalOpen(true);
  };

  const handleEditClick = (lineType, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedLineType(lineType);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (lineType, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedLineType(lineType);
    setDeleteModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchLineTypes(); // Refresh data
    
    // ปิด Modal ทั้งหมด
    setAddModalOpen(false);
    setEditModalOpen(false);
    setDeleteModalOpen(false);
  };

  const columns = ["ชื่อประเภทไลน์", "แก้ไข", "ลบ"];

  return (
    <>
      <Paper
        sx={{
          width: "86vw", // ใช้ viewport width เต็มจอ
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          margin: 0,
          padding: 0,
          borderRadius: 0, // ลบมุมโค้ง
          boxShadow: "none", // ลบเงา
          position: "relative",
          left: 0,
          right: 0,
        }}
      >
        {/* Search Bar และ Add Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            padding: "10px 15px", // ปรับ padding ให้น้อยลง
            height: "70px",
            minHeight: "70px",
            flexShrink: 0,
            width: "100%",
            margin: 0,
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
              sx: { height: "45px" },
            }}
            sx={{
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
            <span>เพิ่มประเภทไลน์</span>
          </Button>
        </Box>

        {/* Table Container - ใช้พื้นที่ที่เหลือทั้งหมด */}
        <TableContainer
          sx={{
            flex: 1,
            overflow: "auto",
            padding: "0 15px", // padding น้อยมาก
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
                      minWidth: index === 0 ? "300px" : "120px",
                      width: index === 0 ? "70%" : "15%",
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
                    <Typography sx={{ fontSize: "16px" }}>ไม่พบข้อมูล</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((lineType, index) => (
                    <TableRow
                      key={lineType.id || index}
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
                          minWidth: "300px",
                          width: "70%",
                          whiteSpace: "nowrap",
                          overflow: "visible",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {lineType.line_type_name}
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
                          handleRowClick(lineType);
                          handleEditClick(lineType, e);
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
                          handleRowClick(lineType);
                          handleDeleteClick(lineType, e);
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

        {/* Pagination - ความสูงคงที่ */}
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
      <AddLineModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <EditLineModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleModalSuccess}
        selectedLineType={selectedLineType}
      />

      <DeleteLineModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={handleModalSuccess}
        selectedLineType={selectedLineType}
      />
    </>
  );
};

export default MainLineType;