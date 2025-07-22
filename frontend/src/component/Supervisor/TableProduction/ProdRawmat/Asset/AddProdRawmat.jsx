import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  TextField,
  Button,
  CircularProgress,
  Box,
  Autocomplete,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";
const API_URL = import.meta.env.VITE_API_URL;

const AddProdRawmat = ({ isOpen, onClose, onSuccess }) => {
  const [error, setError] = useState(null); // เก็บข้อผิดพลาด
  const [loading, setLoading] = useState(false); // เก็บสถานะการโหลดข้อมูล
  // rawmat
  const [rawmatType, setRawmatType] = useState(null); // เก็บวัตถุดิบที่เลือก
  const [searchTerm, setSearchTerm] = useState(""); // ค่าที่ค้นหาวัตถุดิบ
  const [rawmatList, setRawmatList] = useState([]); // รายการวัตถุดิบ
  // production
  const [prodList, setProdList] = useState([]); // รายการการผลิต
  const [selectedProds, setSelectedProds] = useState([]); // การผลิตที่เลือก
  const [searchTermProd, setSearchTermProd] = useState(""); // ค่าที่ค้นหาการผลิต

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/api/rawmat/not-prodrm`) // ดึงข้อมูลวัตถุดิบ
      .then((response) => {
        setRawmatList(response.data.data); // เก็บข้อมูลวัตถุดิบที่ไม่ใช่สำหรับการผลิต
      })
      .catch((error) => console.error("Error fetching raw materials:", error))
      .finally(() => setLoading(false)); // ปิดสถานะการโหลด
  }, []);

  const handleSelect = (event, newValue) => {
    if (newValue) {
      setRawmatType(newValue); // เก็บค่าที่เลือก
      setSearchTerm(newValue.mat); // กำหนดให้แสดงเฉพาะชื่อวัตถุดิบที่เลือก
    } else {
      setRawmatType(null);
      setSearchTerm(""); // ถ้ายกเลิกการเลือก ให้ล้างค่า
    }
  };

  // ดึงข้อมูลการผลิต
  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/api/get-production`) // ดึงข้อมูลการผลิตทั้งหมด
      .then((response) => {
        setProdList(response.data.data); // เก็บข้อมูลการผลิต
      })
      .catch((error) => console.error("Error fetching production data:", error))
      .finally(() => setLoading(false)); // ปิดสถานะการโหลด
  }, []);

  // ฟังก์ชันสำหรับเลือกการผลิต
  const handleSelectProd = (event, newValue) => {
    if (newValue) {
      const updatedSelectedProds = [...selectedProds, newValue]; // เพิ่มค่าที่เลือกเข้าไปใน selectedProds
      setSelectedProds(updatedSelectedProds);
      console.log("Selected Productions (After Add):", updatedSelectedProds); // แสดงค่าที่เลือกทั้งหมด
    }
  };

  // ฟังก์ชันสำหรับลบการผลิตที่เลือก
  const handleRemove = (prod_id) => {
    const updatedSelectedProds = selectedProds.filter(
      (prod) => prod.prod_id !== prod_id
    );
    setSelectedProds(updatedSelectedProds);
    console.log("Selected Productions (After Remove):", updatedSelectedProds); // แสดงค่าหลังจากลบ
  };

  // ฟังก์ชันสำหรับการส่งข้อมูล
  const handleSubmit = async () => {
    if (!rawmatType || selectedProds.length === 0) {
      setError("กรุณาเลือกวัตถุดิบและการผลิตอย่างน้อยหนึ่งรายการ");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/add/prod-rawmat`, {
        mat: rawmatType.mat,
        prod_ids: selectedProds.map((prod) => prod.prod_id),
      });

      if (response.data.success) {
        onSuccess(); // เรียก callback เมื่อสำเร็จ
        handleClose(); // ปิดโมดอล
      } else {
        setError(response.data.error || "เกิดข้อผิดพลาดในการเพิ่มข้อมูล");
      }
    } catch (error) {
      console.error("Error submitting production raw material:", error);
      setError("ไม่สามารถบันทึกข้อมูลได้ โปรดลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับปิดโมดอล
  const handleClose = () => {
    setRawmatType(null);
    setSearchTerm("");
    setSelectedProds([]); // ล้างการเลือกการผลิตเมื่อปิดโมดอล
    setError(null);
    onClose(); // เรียก onClose เพื่อปิดโมดอล
  };

  if (!isOpen) return null; // ถ้าโมดอลไม่ได้เปิดจะไม่แสดงอะไร

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal min-w-2xl max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="pb-5 text-2xl">เพิ่มการผลิตวัตถุดิบ</h1>

        {/* ส่วนค้นหาวัตถุดิบ */}
        <Autocomplete
          value={rawmatType}
          onChange={handleSelect}
          inputValue={searchTerm}
          onInputChange={(event, newInputValue) => {
            if (!rawmatType) {
              setSearchTerm(newInputValue); // อัปเดตค่าค้นหาวัตถุดิบ
            }
          }}
          options={rawmatList}
          getOptionLabel={(option) => `${option.mat} (${option.mat_name})`} // แสดงชื่อวัตถุดิบในรายการ
          isOptionEqualToValue={(option, value) => option.mat === value.mat}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="ค้นหาวัตถุดิบ"
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <div>
                    {loading ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </div>
                ),
              }}
            />
          )}
        />

        {/* ส่วนค้นหาการผลิต */}
        <h2 className="pt-5 pb-2 text-lg">เลือกการผลิต</h2>
        <Autocomplete
          inputValue={searchTermProd}
          onInputChange={(event, newInputValue) =>
            setSearchTermProd(newInputValue)
          }
          // ค้นหาการผลิต
          options={prodList.filter(
            (option) =>
              !selectedProds.some((prod) => prod.prod_id === option.prod_id) // กรองรายการที่เลือกแล้ว
          )}
          getOptionLabel={(option) =>
            `${option.code} (${option.doc_no} - ${option.line_type_name})`
          } // แสดงข้อมูลการผลิต
          isOptionEqualToValue={(option, value) =>
            option.prod_id === value.prod_id
          }
          onChange={handleSelectProd} // เพิ่มการผลิตที่เลือก
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="ค้นหาการผลิต"
              fullWidth
              variant="outlined"
              size="small"
            />
          )}
        />

        {/* แสดงรายการการผลิตที่เลือก */}
        <Box
          sx={{
            maxHeight: 200, // กำหนดความสูงสูงสุดของกรอบ
            overflowY: "auto", // เปิดใช้งาน scrollbar แนวตั้ง
            border: "1px solid #ccc", // ขอบกรอบ
            borderRadius: "4px", // มุมกรอบกลม
            marginTop: 1,
          }}
        >
          <List>
            {selectedProds.map((prod) => (
              <ListItem
                key={prod.prod_id} // Combined key
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => handleRemove(prod.prod_id)}
                  >
                    <DeleteIcon className="text-red-400 " />
                  </IconButton>
                }
              >
                {/* <Checkbox checked disabled /> */}
                <ListItemText
                  primary={`${prod.code} (${prod.doc_no} - ${prod.line_name})`}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* ข้อความแสดงข้อผิดพลาด */}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* ปุ่มยืนยันและยกเลิก */}
        <Box
          className="mt-4"
          sx={{ display: "flex", justifyContent: "space-between", gap: 30 }}
        >
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            style={{ backgroundColor: "#E74A3B", color: "#fff" }}
            onClick={handleClose}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            style={{ backgroundColor: "#41a2e6", color: "#fff" }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "ยืนยัน"}
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default AddProdRawmat;
