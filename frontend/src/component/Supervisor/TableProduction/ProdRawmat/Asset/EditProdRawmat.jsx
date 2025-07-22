import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  TextField,
  Button,
  CircularProgress,
  Box,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  IconButton,
  InputAdornment,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import { IoIosAddCircleOutline } from "react-icons/io";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const EditProdRawmat = ({ isOpen, onClose, onSuccess, data }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mat, setMat] = useState(data?.mat || "");
  const [rawmatName, setRawmatName] = useState(data?.mat_name || "");
  const [searchTermProd, setSearchTermProd] = useState("");
  const [searchExistingProd, setSearchExistingProd] = useState("");
  const [prodList, setProdList] = useState([]);
  const [selectedProd, setSelectedProd] = useState(data?.prod_info || []);
  const [filteredExistingProd, setFilteredExistingProd] = useState([]);
  const [selectedProds, setSelectedProds] = useState([]);
  const [prodToRemove, setProdToRemove] = useState([]);

  useEffect(() => {
    if (isOpen && data) {
      setMat(data?.mat || "");
      setRawmatName(data?.mat_name || "");
      setSelectedProd(data?.prod_info || []);
      setFilteredExistingProd(data?.prod_info || []);
      if (data?.prod_info) {
        data.prod_info.forEach((prod, idx) => {
          console.log(`Prod ${idx} details:`, prod.details);
        });
      }
    }
  }, [isOpen, data]);

  useEffect(() => {
    const fetchProdData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/get-production`);
        if (response.data.success) {
          setProdList(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching updated production data:", error);
      }
    };

    fetchProdData();
  }, [selectedProds]);

  // ฟังก์ชันสำหรับค้นหาแผนการผลิตที่มีอยู่
  useEffect(() => {
    if (selectedProd) {
      const filtered = selectedProd.filter((prod) => {
        // ค้นหาจากข้อมูลใน details
        if (prod.details && prod.details.length > 0) {
          return prod.details.some(detail => 
            (detail.code && detail.code.toLowerCase().includes(searchExistingProd.toLowerCase())) ||
            (detail.doc_no && detail.doc_no.toLowerCase().includes(searchExistingProd.toLowerCase())) ||
            (detail.line_type_name && detail.line_type_name.toLowerCase().includes(searchExistingProd.toLowerCase()))
          );
        }
        return false;
      });
      setFilteredExistingProd(filtered);
    }
  }, [searchExistingProd, selectedProd]);

  const handleSelectProd = (event, newValue) => {
    if (newValue) {
      const updatedSelectedProds = [...selectedProds, newValue];
      setSelectedProds(updatedSelectedProds);
      console.log("Selected Productions (After Add):", updatedSelectedProds);
    }
  };

  const handleRemove = (prod_id) => {
    setSelectedProds(selectedProds.filter((prod) => prod.prod_id !== prod_id));
  };

  const handleRemoveProd = (prod_id) => {
    setProdToRemove((prev) => [...prev, prod_id]);
    setSelectedProd((prev) => prev.filter((prod) => prod.prod_id !== prod_id));
    setFilteredExistingProd((prev) => prev.filter((prod) => prod.prod_id !== prod_id));
  };

  // ฟังก์ชันสำหรับการส่งข้อมูล
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // ลบรายการที่ถูกเลือก
      for (const prod_id of prodToRemove) {
        await axios.delete(
          `${API_URL}/api/delete-prod-rawmat/${mat}/${prod_id}`
        );
      }

      // ถ้ามีการเพิ่มข้อมูลใหม่ ให้ส่ง API เพิ่ม
      if (selectedProds.length > 0) {
        const response = await axios.post(`${API_URL}/api/add/prod-rawmat`, {
          mat: mat,
          prod_ids: selectedProds.map((prod) => prod.prod_id),
        });

        if (!response.data.success) {
          throw new Error(
            response.data.error || "เกิดข้อผิดพลาดในการเพิ่มข้อมูล"
          );
        }
      }

      onSuccess(); // แจ้งให้หน้าหลักรู้ว่ามีการอัปเดต
      handleClose();
    } catch (error) {
      console.error("Error updating production raw material:", error);
      setError(
        error.response?.data?.error ||
        "ไม่สามารถบันทึกข้อมูลได้ โปรดลองอีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedProds([]);
    setProdToRemove([]);
    setError(null);
    setSearchExistingProd("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal w-[800px] "
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="pb-2 text-2xl">แก้ไขการผลิตวัตถุดิบ</h1>
        <div className="border-2 rounded-md p-2 text-lg">
          <p>วัตถุดิบ: {mat}</p>
          <p>ชื่อวัตถุดิบ: {rawmatName}</p>
        </div>
        <form
          className="text-gray-500"
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "1fr 1fr",
            paddingBottom: 10,
          }}
        >
          <div>
            <h1 className="mt-2 text-lg text-gray-900">
              แผนการผลิตของวัตถุดิบ
            </h1>
            
            {/* เพิ่มช่องค้นหาสำหรับแผนการผลิตที่มีอยู่ */}
            <TextField
              className="mt-1 mb-2"
              fullWidth
              size="small"
              label="ค้นหาแผนการผลิตที่มีอยู่"
              variant="outlined"
              value={searchExistingProd}
              onChange={(e) => setSearchExistingProd(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <Box
              sx={{
                height: 300,
                overflowY: "auto",
                border: "1px solid #ccc",
                borderRadius: "4px",
                marginTop: 1,
              }}
            >
              <List>
                {filteredExistingProd.length > 0 ? (
                  filteredExistingProd.map((prod) => (
                    <ListItem
                      className="border-b-2 border-gray-100 m-0 p-0 text-sm"
                      key={prod.prod_id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveProd(prod.prod_id)}
                        >
                          <DeleteIcon className="text-red-400" />
                        </IconButton>
                      }
                    >
                      <ListItemText />
                      {prod.details && prod.details.length > 0 && (
                        <div className="text-sm">
                          <ul>
                            {prod.details.map((detail, subIdx) => (
                              <li key={subIdx}>
                                {detail.code || "ไม่ระบุ"} (
                                {detail.doc_no || "ไม่ระบุ"} -
                                {detail.line_type_name || "ไม่ระบุ"})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary={searchExistingProd ? "ไม่พบข้อมูลที่ค้นหา" : "ไม่มีข้อมูลแผนการผลิต"} />
                  </ListItem>
                )}
              </List>
            </Box>
          </div>

          <div>
            <div
              style={{
                transition: "background-color 0.2s ease-in-out",
                display: "inline-flex",
                gap: "5px",
                width: "fit-content",
                whiteSpace: "nowrap",
                paddingTop: 5,
                marginTop: 3,
              }}
            >
              <IoIosAddCircleOutline
                style={{
                  fontSize: "25px",
                  color: "green",
                }}
              />
              <h2 className="text-lg text-gray-900"> เพิ่มแผนการผลิต</h2>
            </div>

            <Autocomplete
              className="mt-1"
              inputValue={searchTermProd}
              onInputChange={(event, newInputValue) =>
                setSearchTermProd(newInputValue)
              }
              options={prodList.filter(
                (option) =>
                  !selectedProds.some((prod) => prod.prod_id === option.prod_id)
              )}
              getOptionLabel={(option) =>
                `${option.code || "ไม่ระบุ"} (${option.doc_no || "ไม่ระบุ"} - ${option.line_type_name || "ไม่ระบุ"
                })`
              }
              isOptionEqualToValue={(option, value) =>
                option.prod_id === value.prod_id
              }
              onChange={handleSelectProd}
              loading={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ค้นหาการผลิตเพื่อเพิ่ม"
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              )}
            />

            {/* แสดงรายการการผลิตที่เลือก */}
            <Box
              sx={{
                height: 300,
                overflowY: "auto",
                border: "1px solid #ccc",
                borderRadius: "4px",
                marginTop: 1,
              }}
            >
              <List>
                {selectedProds.length > 0 ? (
                  selectedProds.map((prod) => (
                    <ListItem
                      className="border-b-2 border-gray-100 m-0 p-0 text-sm"
                      key={prod.prod_id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => handleRemove(prod.prod_id)}
                        >
                          <DeleteIcon className="text-red-400" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={`${prod.code || "ไม่ระบุ"} (${prod.doc_no || "ไม่ระบุ"} - ${prod.line_type_name || "ไม่ระบุ"})`}
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="ยังไม่มีรายการที่เลือก" />
                  </ListItem>
                )}
              </List>
            </Box>
          </div>
        </form>

        {error && (
          <p style={{ color: "red" }}>
            {error.split("\n").map((line, index) => (
              <span key={index}>
                {line}
                <br />
              </span>
            ))}
          </p>
        )}

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
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? <CircularProgress size={24} /> : "ยืนยัน"}
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default EditProdRawmat;