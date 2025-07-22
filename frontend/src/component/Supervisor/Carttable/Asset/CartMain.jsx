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
  Typography,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Divider
} from "@mui/material";
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import axios from "axios";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";

// Import Modal components
import CartAddModal from "./CartAddModal";
import CartEditModal from "./CartEditModal";
import CartDeleteModal from "./CartDeleteModal";
import CartBatchDeleteModal from "./CartBatchDeleteModal"; // New modal

const API_URL = import.meta.env.VITE_API_URL;

const CartMain = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedCart, setSelectedCart] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false); // New state

  const fetchCarts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/cart`);
      const data = Array.isArray(response.data) ? response.data : [];
      setCarts(data);
      setFilteredRows(data);
    } catch (error) {
      console.error("Error fetching carts:", error);
      setCarts([]);
      setFilteredRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (cartId, currentStatus) => {
    try {
      // สลับสถานะ: ถ้าปัจจุบันเป็น false (ใช้งานอยู่) ให้เปลี่ยนเป็น true (ไม่ได้ใช้งาน) และในทางกลับกัน
      const newStatus = currentStatus === false ? true : false;
      await axios.put(`${API_URL}/cart/${cartId}`, { 
        tro_status: newStatus
      });
      fetchCarts();
    } catch (error) {
      console.error("Error updating cart status:", error);
    }
  };

  const handleDeleteCart = async (cartId) => {
    try {
      await axios.delete(`${API_URL}/cart/${cartId}`);
      fetchCarts();
    } catch (error) {
      console.error("Error deleting cart:", error);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  useEffect(() => {
    if (!loading && Array.isArray(carts)) {
      const result = carts.filter((cart) =>
        Object.values(cart)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredRows(result);
      setPage(0);
    }
  }, [searchTerm, carts, loading]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const handleRowClick = (cartData) => {
    setSelectedCart(cartData);
  };

  // Modal handlers
  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleOpenEditModal = (cartData) => {
    setSelectedCart(cartData);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedCart(null);
  };

  const handleOpenDeleteModal = (cartData) => {
    setSelectedCart(cartData);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCart(null);
  };

  // New batch delete handlers
  const handleOpenBatchDeleteModal = () => {
    setShowBatchDeleteModal(true);
  };

  const handleCloseBatchDeleteModal = () => {
    setShowBatchDeleteModal(false);
  };

  const handleModalSuccess = () => {
    fetchCarts();
  };

  const columns = ["หมายเลขรถเข็น", "สถานะ", "จัดการ"];

  return (
    <Paper
      sx={{
        width: "86vw",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 0,
        boxShadow: "none",
        position: "relative",
        left: 0,
        right: 0,
      }}
    >
      {/* Search, Add, Batch Delete and Refresh Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          padding: "10px 15px",
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
          placeholder="ค้นหารหัสรถเข็น..."
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
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddModal}
          sx={{
            height: "45px",
            px: 3,
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            minWidth: "140px"
          }}
        >
          เพิ่มรถเข็น
        </Button>

        <Button
          variant="contained"
          startIcon={<DeleteSweepIcon />}
          onClick={handleOpenBatchDeleteModal}
          sx={{
            height: "45px",
            px: 3,
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            minWidth: "140px",
            backgroundColor: "#ff5722",
            color: "white",
            '&:hover': {
              backgroundColor: "#d84315",
            },
          }}
        >
          ลบหลายคัน
        </Button>
        
        <IconButton onClick={fetchCarts} color="primary" sx={{ height: "45px", width: "45px" }}>
          <RefreshIcon />
        </IconButton>
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
                    minWidth: index === 0 ? "200px" : "150px",
                    width: index === 0 ? "30%" : "20%",
                    borderRadius: index === 0 ? "8px 0 0 8px" : index === columns.length - 1 ? "0 8px 8px 0" : "0",
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
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1">
                    ไม่พบข้อมูลรถเข็น
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((cart, index) => (
                  <TableRow
                    key={cart.tro_id}
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
                        minWidth: "200px",
                        width: "30%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {cart.tro_id}
                    </TableCell>
                    
                    <TableCell align="center">
                      <Chip
                        label={cart.tro_status === false ? "ใช้งานอยู่" : "ไม่ได้ใช้งาน"}
                        color={cart.tro_status === false ? "success" : "error"}
                        onClick={() => handleUpdateStatus(cart.tro_id, cart.tro_status)}
                        sx={{ cursor: "pointer" }}
                      />
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        padding: "16px",
                        minWidth: "120px",
                        width: "15%",
                      }}
                    >
                      <Box display="flex" justifyContent="center" gap={1}>
                        <Button
                          variant="contained"
                          startIcon={<EditIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(cart);
                          }}
                          sx={{
                            backgroundColor: "#eedf60",
                            color: "black",
                            '&:hover': {
                              backgroundColor: "#fdef73",
                            },
                            flex: 1,
                            height: "36px",
                            fontSize: "14px",
                          }}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<DeleteIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteModal(cart);
                          }}
                          sx={{
                            backgroundColor: "#ff0505",
                            color: "white",
                            '&:hover': {
                              backgroundColor: "#fc6464",
                            },
                            flex: 1,
                            height: "36px",
                            fontSize: "14px",
                          }}
                        >
                          ลบ
                        </Button>
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

      {/* Modals */}
      <CartAddModal
        open={showAddModal}
        onClose={handleCloseAddModal}
        onSuccess={handleModalSuccess}
      />

      <CartEditModal
        open={showEditModal}
        onClose={handleCloseEditModal}
        onSuccess={handleModalSuccess}
        cartData={selectedCart}
      />

      <CartDeleteModal
        open={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onSuccess={handleModalSuccess}
        cartData={selectedCart}
      />

      <CartBatchDeleteModal
        open={showBatchDeleteModal}
        onClose={handleCloseBatchDeleteModal}
        onSuccess={handleModalSuccess}
      />
    </Paper>
  );
};

export default CartMain;