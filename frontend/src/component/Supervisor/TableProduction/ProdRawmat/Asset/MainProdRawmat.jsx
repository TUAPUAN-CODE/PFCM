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
  Collapse,
  TablePagination,
  Divider,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import axios from "axios";
axios.defaults.withCredentials = true; 
import { IoIosAddCircleOutline } from "react-icons/io";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import ModalAddProdRawmat from "./AddProdRawmat";
import ModalEditProdRawmat from "./EditProdRawmat";
import ModalDeleteProdRawmat from "./DeleteProdRawmat";
import ViewProdInfoModal from "./ViewProdInfoModal";

const API_URL = import.meta.env.VITE_API_URL;

const MainProdRawmat = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);
  const [ProdRawmat, setProdRawmat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const navigate = useNavigate();

  // --------------------> [ เรียกใช้ MODAL ] <-------------------- //
  // MODAL ADD ProducProdRawmat
  const [isModalProdRawmatOpen, setIsModalProdRawmatOpen] = useState(false);
  const openModalAddProdRawmat = () => setIsModalProdRawmatOpen(true);
  const closeModalProdRawmat = () => setIsModalProdRawmatOpen(false);

  // MODAL EDIT ProdRawmat
  const [isModalEditProdRawmatOpen, setIsModalEditProdRawmatOpen] =
    useState(false);
  const openModalEditProdRawmat = () => setIsModalEditProdRawmatOpen(true);
  const closeModalEditProdRawmat = () => setIsModalEditProdRawmatOpen(false);

  // MODAL DELETE ProdRawmat
  const [isModalDeleteProdRawmatOpen, setIsModalDeleteProdRawmatOpen] =
    useState(false);
  const openModalDeleteProdRawmat = () => setIsModalDeleteProdRawmatOpen(true);
  const closeModalDeleteProdRawmat = () =>
    setIsModalDeleteProdRawmatOpen(false);
    
  // MODAL VIEW PROD INFO
  const [isViewProdInfoModalOpen, setIsViewProdInfoModalOpen] = useState(false);
  const openViewProdInfoModal = () => setIsViewProdInfoModalOpen(true);
  const closeViewProdInfoModal = () => setIsViewProdInfoModalOpen(false);

  const [selectedColor, setSelectedColor] = useState("");
  const handleFilterChange = (color) => {
    setSelectedColor(color === selectedColor ? "" : color);
  };
  const [selectedProdRawmat, setSelectedProdRawmat] = useState(null);

  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
    setSelectedProdRawmat(rowData);
  };

  const fetchProdRawmat = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/prod-rawmat`);
      const data = response.data.data;

      // แปลง prod_ids จาก string ที่คั่นด้วย comma (,) ให้เป็น array
      const formattedData = data.map((item) => ({
        ...item,
      }));

      setProdRawmat(formattedData); // เก็บข้อมูลที่จัดรูปแบบแล้ว
      setLoading(false);
    } catch (error) {
      console.error("Error fetching Prodrawmat:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdRawmat();
  }, []);

  useEffect(() => {
    if (!loading) {
      const result = ProdRawmat.filter((row) =>
        Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredRows(result);
    }
  }, [searchTerm, ProdRawmat, loading]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const columns = [
    "รหัสวัตถุดิบ (mat.)",
    "ชื่อวัตถุดิบ",
    "แผนการผลิต (Production Code)",
    "แก้ไข",
    // "ลบ",
  ];

  return (
    <Paper
      sx={{
        width: "100%",
        overflow: "hidden",
        boxShadow: "0px 0px 3px rgba(0, 0, 0, 0.2)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          paddingX: 2,
          height: "60px",
          margin: "0px 5px",
          minHeight: "60px",
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
        <div
          className="text-gray-500 hover:text-white hover:bg-green-500"
          style={{
            border: "1px solid #cbcbcb",
            padding: "2px 8px",
            margin: 3,
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background-color 0.2s ease-in-out",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            width: "fit-content",
            whiteSpace: "nowrap",
          }}
          variant="contained"
          color="primary"
          onClick={openModalAddProdRawmat}
          onMouseEnter={(e) =>
            (e.currentTarget.querySelector("svg").style.color = "white")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.querySelector("svg").style.color = "#11ec33")
          }
        >
          <IoIosAddCircleOutline
            style={{
              margin: 0,
              padding: 0,
              color: selectedColor === "green" ? "#12D300" : "#12D300",
              fontSize: "35px",
              transition: "color 0.2s ease-in-out",
            }}
          />
          <div >เพิ่มการผลิตวัตถุดิบ</div>
        </div>
      </Box>

      <TableContainer
        sx={{
          height: "calc(68vh)",
          overflowY: "auto",
          paddingLeft: "20px",
          paddingRight: "10px",
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ height: "40px", margin: 0 }}>
              {columns.map((column, index) => (
                <TableCell
                  key={index}
                  align="center"
                  style={{
                    backgroundColor: "hsl(210, 100%, 60%)",
                    border: "1px solid #e0e0e0",
                    margin: 0,
                    borderRadius:
                      index === 0
                        ? "8px 0 0 8px"
                        : index === columns.length - 1
                        ? "0 8px 8px 0"
                        : "0", // กำหนดขอบมนที่มุมทั้ง 4
                  }}
                >
                  <Typography style={{fontSize: "16px", color: "#ffffff"}}>{column}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography>Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <TableRow
                    key={index}
                    sx={{ 
                      cursor: "pointer", 
                      margin: 0, padding: 0,
                      backgroundColor: index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)",
                      '&:hover': {
                        backgroundColor: index % 2 === 0 ? '#f5f5f5' : "hsl(210, 100.00%, 88%)",
                      } 
                    }}
                  >
                    <TableCell
                      align="center"
                      style={{
                        fontSize: "12px",
                        margin: 0,
                        padding: 20,
                        verticalAlign: "top",
                      }}
                    >
                      {row.mat} {/* รหัสวัตถุดิบ */}
                    </TableCell>
                    <TableCell
                      align="center"
                      style={{
                        fontSize: "12px",
                        margin: 0,
                        padding: 20,
                        verticalAlign: "top",
                      }}
                    >
                      {row.mat_name} {/* ชื่อวัตถุดิบ */}
                    </TableCell>

                    <TableCell
                      align="start"
                      style={{ fontSize: "12px", padding: 5, paddingTop: 5 }}
                    >
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          }
                        }}
                        onClick={() => {
                          openViewProdInfoModal();
                          handleRowClick(row);
                        }}
                      >
                        <VisibilityIcon 
                          sx={{ 
                            fontSize: '20px', 
                            color: 'primary.main' 
                          }} 
                        />
                        <Typography>
                          ดูแผนการผลิตของวัตถุดิบ {row.prod_info && `(${row.prod_info.length} รายการ)`}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell
                      align="center"
                      className="text-gray-500 hover:text-white hover:bg-yellow-400"
                      onMouseEnter={(e) =>
                        (e.currentTarget.querySelector("svg").style.color =
                          "white")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.querySelector("svg").style.color = "")
                      }
                      style={{
                        fontSize: "12px",
                        margin: 0,
                        padding: 20,
                        verticalAlign: "top",
                      }}
                      onClick={() => {
                        openModalEditProdRawmat();
                        handleRowClick(row);
                      }}
                    >
                      <EditIcon className="text-yellow-500 " />
                    </TableCell>
                    {/* <TableCell
                      align="center"
                      className="text-gray-500 hover:text-white hover:bg-red-400"
                      onMouseEnter={(e) =>
                        (e.currentTarget.querySelector("svg").style.color =
                          "white")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.querySelector("svg").style.color = "")
                      }
                      style={{
                        fontSize: "12px",
                        margin: 0,
                        padding: 20,
                        verticalAlign: "top",
                      }}
                      onClick={() => {
                        openModalDeleteProdRawmat();
                        handleRowClick(row);
                      }}
                    >
                      <DeleteIcon className="text-red-400 " />
                    </TableCell> */}
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ mt: 1, marginLeft: 3, marginRight: 3 }} />
      <TablePagination
        sx={{
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar":
            {
              fontSize: "10px",
              color: "#787878",
              padding: "0px",
            },
        }}
        rowsPerPageOptions={[20, 50, 100]}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/*  modal */}
      <div>
        <ModalAddProdRawmat
          isOpen={isModalProdRawmatOpen}
          onClose={closeModalProdRawmat}
          onSuccess={fetchProdRawmat}
        />
        <ModalEditProdRawmat
          isOpen={isModalEditProdRawmatOpen}
          onClose={closeModalEditProdRawmat}
          onSuccess={fetchProdRawmat}
          data={selectedProdRawmat} // ส่งข้อมูลของ ProdRawmat นั้นไปยัง modal การแก้ไขข้อมูล
        />
        {/* <ModalDeleteProdRawmat
          isOpen={isModalDeleteProdRawmatOpen}
          onClose={closeModalDeleteProdRawmat}
          onSuccess={fetchProdRawmat}
          data={selectedProdRawmat} // ส่งข้อมูลของ ProdRawmat นั้นไปยัง modal การลบข้อมูล
        /> */}
        <ViewProdInfoModal
          isOpen={isViewProdInfoModalOpen}
          onClose={closeViewProdInfoModal}
          data={selectedProdRawmat} // ส่งข้อมูลของ ProdRawmat ที่ผู้ใช้เลือกไปยัง modal
        />
      </div>
    </Paper>
  );
};

export default MainProdRawmat;