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

import ModalAddRawmatType from "./AddRawmatType";
import ModalEditRawmatType from "./EditRawmatType";
import ModalDeleteRawmatType from "./DeleteRawmatType";
const API_URL = import.meta.env.VITE_API_URL;

const MainRawmatType = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);
  const [RawmatTypes, setRawmatTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const navigate = useNavigate();

  // ------> [ เรียกใช้ MODAL ] <------- //
  // MODAL ADD RawmatType
  const [isModalRawmatTypeOpen, setIsModalRawmatTypeOpen] = useState(false);
  const openModalAddRawmatType = () => setIsModalRawmatTypeOpen(true);
  const closeModalRawmatType = () => setIsModalRawmatTypeOpen(false);
  // MODAL EDIT RawmatType
  const [isModalEditRawmatTypeOpen, setIsModalEditRawmatTypeOpen] =
    useState(false);
  const openModalEditRawmatType = () => setIsModalEditRawmatTypeOpen(true);
  const closeModalEditRawmatType = () => setIsModalEditRawmatTypeOpen(false);
  // MODAL DELETE RawmatType
  const [isModalDeleteRawmatTypeOpen, setIsModalDeleteRawmatTypeOpen] =
    useState(false);
  const openModalDeleteRawmatType = () => setIsModalDeleteRawmatTypeOpen(true);
  const closeModalDeleteRawmatType = () =>
    setIsModalDeleteRawmatTypeOpen(false);

  const [selectedColor, setSelectedColor] = useState("");
  const handleFilterChange = (color) => {
    setSelectedColor(color === selectedColor ? "" : color);
  };
  const [selectedRawmatType, setSelectedRawmatType] = useState(null);

  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
    setSelectedRawmatType(rowData);
  };

  const fetchRawmatTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rawmat/types`);
      setRawmatTypes(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching RawmatTypes:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRawmatTypes();
  }, []);

  useEffect(() => {
    if (!loading) {
      const result = RawmatTypes.filter((row) =>
        Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredRows(result);
    }
  }, [searchTerm, RawmatTypes, loading]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const columns = ["ชื่อประเภท", "แก้ไข", "ลบ"];

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
            padding: "2px 8px", // เพิ่ม padding ให้มีขอบเขตที่ชัดเจนขึ้น
            margin: 3,
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background-color 0.2s ease-in-out",
            display: "inline-flex", // ใช้ inline-flex เพื่อให้ขนาดพอดีกับเนื้อหา
            alignItems: "center", // จัดให้อยู่ตรงกลางแนวตั้ง
            gap: "5px", // ระยะห่างระหว่างไอคอนกับข้อความ
            width: "fit-content", // ให้ขนาดพอดีกับเนื้อหา
            whiteSpace: "nowrap", // ป้องกันข้อความขึ้นบรรทัดใหม่
          }}
          variant="contained"
          color="primary"
          onMouseEnter={(e) =>
            (e.currentTarget.querySelector("svg").style.color = "white")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.querySelector("svg").style.color = "#11ec33")
          }
          onClick={openModalAddRawmatType}
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
          <div>เพิ่มประเภทวัตถุดิบ</div>
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
                .map((RawmatType, index) => (
                  <TableRow
                    key={index}
                    // onClick={() => handleRowClick(RawmatType)}
                    sx={{ backgroundColor: index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)",
                      '&:hover': {
                        backgroundColor: index % 2 === 0 ? '#f5f5f5' : "hsl(210, 100.00%, 88%)",
                      } 
                    }}
                  >
                    <TableCell align="center" style={{ fontSize: "12px" }}>
                      {RawmatType.rm_type_name}
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
                        openModalEditRawmatType();
                        handleRowClick(RawmatType);
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
                        openModalDeleteRawmatType();
                        handleRowClick(RawmatType);
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
        <ModalAddRawmatType
          isOpen={isModalRawmatTypeOpen}
          onClose={closeModalRawmatType}
          onSuccess={fetchRawmatTypes}
        />
        <ModalEditRawmatType
          isOpen={isModalEditRawmatTypeOpen}
          onClose={closeModalEditRawmatType}
          onSuccess={fetchRawmatTypes}
          rawmatData={selectedRawmatType} // ส่งข้อมูลของ RawmatType นั้นไปยัง modal การแก้ไขข้อมูล
        />
        <ModalDeleteRawmatType
          isOpen={isModalDeleteRawmatTypeOpen}
          onClose={closeModalDeleteRawmatType}
          onSuccess={fetchRawmatTypes}
          rawmatData={selectedRawmatType} // ส่งข้อมูลของ RawmatType นั้นไปยัง modal การลบข้อมูล
        />
      </div>
    </Paper>
  );
};

export default MainRawmatType;
