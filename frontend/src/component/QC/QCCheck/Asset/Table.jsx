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
  styled,
} from "@mui/material";
import { LiaShoppingCartSolid } from "react-icons/lia";
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/EditOutlined";
import { SlClose } from "react-icons/sl";
import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa";
import DeleteIcon from "@mui/icons-material/Delete";
import { BsFillClipboardCheckFill } from "react-icons/bs";

import { io } from "socket.io-client";
const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL, {
  transports: ["websocket"] // 👈 ห้าม fallback เป็น polling
});


const CUSTOM_COLUMN_WIDTHS = {
  delayTime: "180px",
  cart: "70px",
  complete: "70px",
  edit: "70px",
  delete: "70px",
};

const Row = ({
  row,
  columnWidths,
  handleOpenModal,
  handleOpenEditModal,
  handleOpenDeleteModal,
  handleOpenSuccess,
  selectedColor,
  openRowId,
  setOpenRowId,
  index
}) => {
  const backgroundColor = index % 2 === 0 ? '#ffffff' : "hsl(210, 100.00%, 88%)"; // เปลี่ยนสีจาราง ขาว เทา
  const isOpen = openRowId === row.rmfp_id;
  //ซ่อนคอลัม
  const {
    mapping_id,
    rmfp_id,
    oven_to_pack,
    rmf_rm_group_id,
    rmg_rm_group_id,
    rm_type_id,
    process_name,
    withdraw_date,
    rmit_date,
    rmm_line_name,
    withdraw_date_formatted,
    weight_in_trolley,
    prep_to_pack,
    rework_time,
    first_prod,
    two_prod,
    three_prod,
    name_edit_prod_two,
    name_edit_prod_three,
    edit_rework,
    remark_rework,
    remark_rework_cold,
    ...displayRow
  } = row;

  return (
    <>
      <TableRow>
        <TableCell
          style={{ height: "7px", padding: "0px", border: "0px solid" }}
        ></TableCell>
      </TableRow>
      <TableRow
        onClick={() => {
          setOpenRowId(isOpen ? null : row.rmfp_id);

        }}
      >
        {Object.values(displayRow).map((value, idx) => (
          <TableCell
            key={idx}
            align="center"
            style={{
              width: columnWidths[idx],
              borderTop: "1px solid #e0e0e0",
              borderBottom: "1px solid #e0e0e0",
              whiteSpace: "normal",
              wordWrap: "break-word",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "14px",
              height: "40px",
              lineHeight: "1.5",
              padding: "0px 10px",
              color: "#787878",
              borderLeft: idx === 0 ? "1px solid #e0e0e0" : "1px solid #f2f2f2",
              borderTopLeftRadius: idx === 0 ? "8px" : "0px",
              borderBottomLeftRadius: idx === 0 ? "8px" : "0px",
              backgroundColor: backgroundColor // เปลี่ยนสีจาราง ขาว เทา

            }}
          >
            {value || "-"}
          </TableCell>
        ))}

        <QcCheck
          width={CUSTOM_COLUMN_WIDTHS.edit}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditModal(row);
          }}
          icon={
            <BsFillClipboardCheckFill
              style={{ color: "#26c200", fontSize: "22px" }}
            />
          }
          backgroundColor={backgroundColor}
        />
      </TableRow>

      <TableRow>
        <TableCell style={{ padding: "0px", border: "0px solid" }}></TableCell>
      </TableRow>
    </>
  );
};

const QcCheck = ({ width, onClick, icon, backgroundColor }) => {
  return (
    <TableCell
      style={{
        width,
        textAlign: "center",
        borderTop: "1px solid #e0e0e0",
        borderBottom: "1px solid #e0e0e0",
        borderLeft: "1px solid #f2f2f2",
        borderRight: "1px solid #e0e0e0",
        borderTopRightRadius: "8px",
        borderBottomRightRadius: "8px",
        height: "40px",
        padding: "0px",
        cursor: "pointer",
        transition: "background-color 0.2s ease-in-out",
        backgroundColor: backgroundColor // เปลี่ยนสีจาราง ขาว เทา
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#26c200";
        e.currentTarget.querySelector("svg").style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector("svg").style.color = "#26c200";
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.backgroundColor = "#26c200";
        e.currentTarget.querySelector("svg").style.color = "#fff";
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
        e.currentTarget.querySelector("svg").style.color = "#edc026";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        {icon}
      </div>
    </TableCell>
  );
};

const TableMainPrep = ({
  handleOpenModal,
  data,
  handleOpenEditModal,
  handleOpenSuccess,
  handleOpenDeleteModal,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRows, setFilteredRows] = useState(data);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [selectedColor, setSelectedColor] = useState("");
  const [openRowId, setOpenRowId] = useState(null);

  const [rows, setRows] = useState(data);

  useEffect(() => {
    socket.on("dataUpdated", (updatedData) => {
      setRows(updatedData);
    });

    // ให้แน่ใจว่าทำการยกเลิกการเชื่อมต่อเมื่อคอมโพเนนต์ถูกยกเลิก
    return () => {
      socket.off("dataUpdated");
    };
  }, []); // ใช้ [] เพื่อให้ทำงานแค่ครั้งเดียวเมื่อคอมโพเนนต์ถูก mount

  useEffect(() => {
    setFilteredRows(
      data.filter((row) =>
        Object.values(row).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }, [searchTerm, data]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const handleFilterChange = (color) => {
    setSelectedColor(color === selectedColor ? "" : color);
  };

  const columns = Object.keys(data[0] || {}).filter(
    (key) => key !== "rmfp_id" && key !== "oven_to_pack"
  );
  const totalCustomWidth = Object.values(CUSTOM_COLUMN_WIDTHS).reduce(
    (sum, width) => sum + parseInt(width),
    0
  );
  const remainingWidth = `calc((100% - ${totalCustomWidth}px) / ${columns.length})`;
  const columnWidths = Array(columns.length).fill(remainingWidth);

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
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          gap: 1,
          paddingX: 2,
          height: { xs: "auto", sm: "60px" },
          margin: "5px 5px",
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
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-start" }}>
          {["green", "yellow", "red"].map((color) => (
            <FilterButton
              key={color}
              color={color}
              selectedColor={selectedColor}
              onClick={() => handleFilterChange(color)}
            />
          ))}
        </Box>
      </Box>
      <TableContainer
        style={{ padding: "0px 20px" }}
        sx={{
          height: "calc(68vh)",
          overflowY: "auto",
          whiteSpace: "nowrap",
          "@media (max-width: 1200px)": {
            overflowX: "scroll",
            minWidth: "200px",
          },
        }}
      >
        <Table
          stickyHeader
          style={{ tableLayout: "auto" }}
          sx={{ minWidth: "1270px", width: "max-content" }}
        >
          <TableHead style={{ marginBottom: "10px" }}>
            <TableRow sx={{ height: "40px" }}>
              {/* เปลี่ยนชื่อคอลัมน์ที่นี่ */}
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: '12px',
                  color: '#787878',
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
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "120px",
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
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "400px",
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
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "90px",
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>แผนการผลิต</Box>{" "}
                {/* production */}
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "90px",
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>สถานที่จัดส่ง</Box>
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "80px",
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>น้ำหนัก</Box>
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "80px",
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>จำนวนถาด</Box>
              </TableCell>

              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "90px",
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ป้ายทะเบียน</Box>
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "120px",
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>Level Eu</Box>
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "120px",
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>สถานะ</Box>{" "}
              </TableCell>
              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #f2f2f2",
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  width: "160px",
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>เวลาต้ม/อบเสร็จ</Box>{" "}
                {/* CookedDateTime */}
              </TableCell>

              <TableCell
                align="center"
                style={{
                  backgroundColor: "hsl(210, 100%, 60%)",
                  borderLeft: "0px solid ",
                  borderTop: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: "1px solid #e0e0e0",
                  fontSize: "12px",
                  color: "#787878",
                  padding: "5px",
                  borderTopRightRadius: "8px",
                  borderBottomRightRadius: "8px",
                  width: "80px",
                }}
              >
                <Box style={{ fontSize: '16px', color: '#ffffff' }}>ตรวจสอบ</Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ "& > tr": { marginBottom: "8px" } }}>
            {filteredRows.length > 0 ? (
              filteredRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <Row
                    key={index}
                    row={row}
                    columnWidths={columnWidths}
                    handleOpenModal={handleOpenModal}
                    handleOpenEditModal={handleOpenEditModal}
                    handleOpenDeleteModal={handleOpenDeleteModal}
                    handleOpenSuccess={handleOpenSuccess}
                    selectedColor={selectedColor}
                    openRowId={openRowId}
                    index={index}
                    setOpenRowId={setOpenRowId}
                  />
                ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 11}
                  align="center"
                  sx={{ padding: "20px", fontSize: "16px", color: "#787878" }}
                >
                  ไม่มีรายการวัตถุดิบในขณะนี้
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        sx={{
          "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-toolbar":
          {
            fontSize: "10px",
            color: "#787878",
            padding: "0px",
          },
        }}
        rowsPerPageOptions={[50, 60, 100]}
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

const FilterButton = ({ color, selectedColor, onClick }) => {
  const [isHovered, setHovered] = useState(false);

  const colors = {
    green: { default: "#54e032", hover: "#6eff42", selected: "#54e032" },
    yellow: { default: "#f0cb4d", hover: "#ffdf5d", selected: "#f0cb4d" },
    red: { default: "#ff4444", hover: "#ff6666", selected: "#ff4444" },
  };

  const isSelected = selectedColor === color;
  const noSelection = selectedColor == null;
  const currentColor = colors[color];

  const baseStyle = {
    border: isSelected
      ? `2px solid ${currentColor.selected}`
      : `1px solid ${isHovered ? currentColor.hover : "#e0e0e0"}`,
    padding: 6,
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    backgroundColor: isSelected
      ? "transparent"
      : isHovered
        ? currentColor.hover
        : currentColor.default,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  return (
    <div
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: currentColor.selected,
            opacity: 0.2,
            zIndex: 0,
          }}
        />
      )}

      <FaRegCircle
        style={{
          color: isSelected
            ? currentColor.selected
            : noSelection
              ? "#ffffff"
              : "#ffffff",
          fontSize: 24,
          transition: "color 0.2s ease-in-out",
          position: "relative",
          zIndex: 1,
          opacity: isSelected ? 1 : 0.9,
        }}
      />
    </div>
  );
};

export default TableMainPrep;
