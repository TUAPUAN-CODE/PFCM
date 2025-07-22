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

import ModalAddUsers from "./AddUsers";
import ModalEditUsers from "./EditUsers";
import ModalDeleteUsers from "./DeleteUsers";
const API_URL = import.meta.env.VITE_API_URL;

const TableMainUser = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const navigate = useNavigate();

  // ------> [ เรียกใช้ MODAL ] <------- //
  // MODAL ADD USERS
  const [isModalAddUsersOpen, setIsModalAddUsersOpen] = useState(false);
  const openModalAddUsers = () => setIsModalAddUsersOpen(true);
  const closeModalAddUsers = () => setIsModalAddUsersOpen(false);
  // MODAL EDIT USERS
  const [isModalEditUsersOpen, setIsModalEditUsersOpen] = useState(false);
  const openModalEditUsers = () => setIsModalEditUsersOpen(true);
  const closeModalEditUsers = () => setIsModalEditUsersOpen(false);
  // MODAL DELETE USERS
  const [isModalDeleteUsersOpen, setIsModalDeleteUsersOpen] = useState(false);
  const openModalDeleteUsers = () => setIsModalDeleteUsersOpen(true);
  const closeModalDeleteUsers = () => setIsModalDeleteUsersOpen(false);

  const [selectedColor, setSelectedColor] = useState("");
  const handleFilterChange = (color) => {
    setSelectedColor(color === selectedColor ? "" : color);
  };
  const [selectedUser, setSelectedUser] = useState(null);

  const handleRowClick = (rowData) => {
    console.log("Row clicked:", rowData);
    setSelectedUser(rowData);
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!loading) {
      const result = users.filter((row) =>
        Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredRows(result);
    }
  }, [searchTerm, users, loading]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const columns = ["รหัสพนักงาน", "ชื่อ", "สกุล", "สถานที่", "แก้ไข", "ลบ"];

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
          onClick={openModalAddUsers}
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
          <div>เพิ่มพนักงาน</div>
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
            <TableRow sx={{ 
              height: "40px", 
              margin: 0
              
              }}>
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
                  <Typography style={{fontSize: "16px", color: "#ffffff" }}>{column}</Typography>
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
                .map((user, index) => (
                  <TableRow
                    key={index}
                    // onClick={() => handleRowClick(user)}
                    sx={{ 
                      cursor: "pointer", 
                      margin: 0,
                      backgroundColor: index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)",
                      '&:hover': {
                        backgroundColor: index % 2 === 0 ? '#f5f5f5' : "hsl(210, 100.00%, 88%)",
                      } 
                    }}
                  >
                    <TableCell align="center" style={{ fontSize: "12px" }}>
                      {user.user_id}
                    </TableCell>
                    <TableCell align="center" style={{ fontSize: "12px" }}>
                      {user.first_name}
                    </TableCell>
                    <TableCell align="center" style={{ fontSize: "12px" }}>
                      {user.last_name}
                    </TableCell>
                    <TableCell align="center" style={{ fontSize: "12px" }}>
                      {user.wp_name}
                    </TableCell>
                    {/* <TableCell align="center" style={{ fontSize: "12px" }}>
                      {user.rm_type_names}
                    </TableCell> */}
                    <TableCell
                      align="center"
                      className="text-gray-500 hover:text-white hover:bg-yellow-400"
                      onMouseEnter={(e) =>
                        (e.currentTarget.querySelector("svg").style.color =
                          "white")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.querySelector("svg").style.color =
                          "")
                      }
                      onClick={() => {
                        openModalEditUsers();
                        handleRowClick(user);
                      }}
                    >
                      <EditIcon className="text-yellow-400 " />
                    </TableCell>

                    <TableCell
                      align="center"
                      className="text-gray-500 hover:text-white hover:bg-red-400"
                      onMouseEnter={(e) =>
                        (e.currentTarget.querySelector("svg").style.color =
                          "white")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.querySelector("svg").style.color =
                          "")
                      }
                      onClick={() => {
                        openModalDeleteUsers();
                        handleRowClick(user);
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
        <ModalAddUsers
          isOpen={isModalAddUsersOpen}
          onClose={closeModalAddUsers}
          onSuccess={fetchUsers}
        />
        <ModalEditUsers
          isOpen={isModalEditUsersOpen}
          onClose={closeModalEditUsers}
          onSuccess={fetchUsers}
          userData={selectedUser} // ส่งข้อมูลของ user_id นั้นไปยัง modal การแก้ไขข้อมูล
        />
        <ModalDeleteUsers
          isOpen={isModalDeleteUsersOpen}
          onClose={closeModalDeleteUsers}
          onSuccess={fetchUsers}
          userData={selectedUser} // ส่งข้อมูลของ user_id นั้นไปยัง modal การลบข้อมูล
        />
      </div>
    </Paper>
  );
};

export default TableMainUser;
