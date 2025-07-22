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
} from "@mui/material";
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import axios from "axios";
axios.defaults.withCredentials = true; 
import { IoIosAddCircleOutline } from "react-icons/io";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/Delete";

import ModalAddRawmat from "./AddRawmat";
import ModalEditRawmat from "./EditRawmat";
import ModalDeleteRawmat from "./DeleteRawmat";
const API_URL = import.meta.env.VITE_API_URL;

const MainRawmat = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);
  const [Rawmat, setRawmat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const navigate = useNavigate();

  // --------------------> [ เรียกใช้ MODAL ] <-------------------- //
  // MODAL ADD Rawmat
  const [isModalRawmatOpen, setIsModalRawmatOpen] = useState(false);
  const openModalAddRawmat = () => setIsModalRawmatOpen(true);
  const closeModalRawmat = () => setIsModalRawmatOpen(false);

  // MODAL EDIT Rawmat
  const [isModalEditRawmatOpen, setIsModalEditRawmatOpen] = useState(false);
  const openModalEditRawmat = () => setIsModalEditRawmatOpen(true);
  const closeModalEditRawmat = () => setIsModalEditRawmatOpen(false);

  // MODAL DELETE Rawmat
  const [isModalDeleteRawmatOpen, setIsModalDeleteRawmatOpen] = useState(false);
  const openModalDeleteRawmat = () => setIsModalDeleteRawmatOpen(true);
  const closeModalDeleteRawmat = () => setIsModalDeleteRawmatOpen(false);

  const [selectedColor, setSelectedColor] = useState("");
  const handleFilterChange = (color) => {
    setSelectedColor(color === selectedColor ? "" : color);
  };
  const [selectedRawmat, setSelectedRawmat] = useState(null);

  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
    setSelectedRawmat(rowData);
  };

  const fetchRawmat = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/get-rawmat`);
      console.log("API Response:", response.data); // เช็คโครงสร้างข้อมูลที่ได้

      // ตรวจสอบโครงสร้างข้อมูลใหม่
      if (response.data && response.data.success) {
        const { rawMaterials, groups } = response.data;
        if (Array.isArray(rawMaterials) && Array.isArray(groups)) {
          // รวมข้อมูล rawMaterials และ groups หรือแยกใช้ตามต้องการ
          const combinedData = rawMaterials.map((item) => ({
            ...item,
            groups: groups.filter((g) => g.mat === item.mat),
          }));

          setRawmat(combinedData);
          setFilteredRows(combinedData);
        } else {
          console.error("Invalid API response format:", response.data);
          setRawmat([]);
          setFilteredRows([]);
        }
      } else {
        console.error("Invalid API response format:", response.data);
        setRawmat([]);
        setFilteredRows([]);
      }
    } catch (error) {
      console.error("Error fetching Rawmat:", error);
      setRawmat([]);
      setFilteredRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRawmat();
  }, []);

  useEffect(() => {
    if (!loading) {
      const result = Rawmat.filter((row) =>
        Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredRows(result);
    }
  }, [searchTerm, Rawmat, loading]);

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
    "ประเภทวัตถุดิบ",
    "แก้ไข",
    "ลบ",
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
            padding: 2,
            margin: 2,
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background-color 0.2s ease-in-out",
            width: "180px",
            display: "flex", // จัดให้อยู่ในแนวนอน
            alignItems: "center", // จัดให้อยู่ตรงกลางแนวตั้ง
            gap: "8px", // ระยะห่างระหว่างไอคอนกับข้อความ
          }}
          variant="contained"
          color="primary"
          onClick={openModalAddRawmat}
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
              fontSize: "35px",
              color: selectedColor === "green" ? "#12D300" : "#12D300",
              transition: "color 0.2s ease-in-out",
            }}
          />
          <div>เพิ่มวัตถุดิบ</div>
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
                .map((Rawmat, index) => (
                  <TableRow
                    key={index}
                    // onClick={() => handleRowClick(RawmatType)}
                    sx={{backgroundColor: index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)",
                      '&:hover': {
                        backgroundColor: index % 2 === 0 ? '#f5f5f5' : "hsl(210, 100.00%, 88%)",
                      } 
                    }}
                  >
                    <TableCell align="center" style={{ fontSize: "12px" }}>
                      {Rawmat.mat}
                    </TableCell>
                    <TableCell align="center" style={{ fontSize: "12px" }}>
                      {Rawmat.mat_name}
                    </TableCell>
                    <TableCell align="center" style={{ fontSize: "12px" }}>
                      {Rawmat.rm_type_name}
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
                      onClick={() => {
                        openModalEditRawmat();
                        handleRowClick(Rawmat);
                      }}
                    >
                      <EditIcon className="text-yellow-500 " />
                    </TableCell>

                    <TableCell
                      align="center"
                      className="text-gray-500 hover:text-white hover:bg-red-400"
                      onMouseEnter={(e) =>
                        (e.currentTarget.querySelector("svg").style.color =
                          "white")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.querySelector("svg").style.color = "")
                      }
                      onClick={() => {
                        openModalDeleteRawmat();
                        handleRowClick(Rawmat);
                      }}
                    >
                      <DeleteIcon className="text-red-400 " />
                    </TableCell>
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
        <ModalAddRawmat
          isOpen={isModalRawmatOpen}
          onClose={closeModalRawmat}
          onSuccess={fetchRawmat}
        />
        <ModalEditRawmat
          isOpen={isModalEditRawmatOpen}
          onClose={closeModalEditRawmat}
          onSuccess={fetchRawmat}
          rawmatData={selectedRawmat} // ส่งข้อมูลของ Rawmat นั้นไปยัง modal การแก้ไขข้อมูล
        />
        <ModalDeleteRawmat
          isOpen={isModalDeleteRawmatOpen}
          onClose={closeModalDeleteRawmat}
          onSuccess={fetchRawmat}
          rawmatData={selectedRawmat} // ส่งข้อมูลของ Rawmat นั้นไปยัง modal การลบข้อมูล
        />
      </div>
    </Paper>
  );
};

export default MainRawmat;
