import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  TextField,
  Button,
  CircularProgress,
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Checkbox,
  IconButton,
  Tooltip
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IoInformationCircle } from "react-icons/io5";
import { useTheme } from "@mui/material/styles";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const AddRawmat = ({ isOpen, onClose, onSuccess }) => {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [mat, setMat] = useState("");
  const [matName, setMatName] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedTypeName, setSelectedTypeName] = useState("");
  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/rawmat/types`);
        if (response.data.success) {
          setTypes(response.data.data);
        } else {
          setError("ไม่พบข้อมูลประเภทวัตถุดิบ");
        }
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
      }
    };
    fetchTypes();
  }, []);

  const handleTypeChange = (e) => {
    const selectedId = e.target.value;
    setSelectedType(selectedId);

    // ค้นหาชื่อประเภทจากรายการที่มี
    const typeName =
      types.find((type) => type.rm_type_id === parseInt(selectedId))
        ?.rm_type_name || "";
    setSelectedTypeName(typeName);
  };

  useEffect(() => {
    if (step === 2 && selectedType) {
      const fetchGroups = async () => {
        try {
          const response = await axios.get(
            `${API_URL}/api/get/rawmat-groups/${selectedType}`
          );
          if (response.data.success) {
            setGroups(response.data.data);
          } else {
            setError("ไม่พบข้อมูลกลุ่มวัตถุดิบ");
          }
        } catch (err) {
          setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
        }
      };
      fetchGroups();
    }
  }, [step, selectedType]);

  const handleClose = () => {
    setError(null);
    setStep(1);
    resetForm();
    onClose();
  };

  const handleNext = () => {
    if (!mat || !matName || !selectedType) {
      setError("กรุณากรอกข้อมูลให้ครบก่อน !!");
      return;
    }
    setError("");
    if (step === 1) {
      setStep(2);
    } else {
      const rawmatData = {
        mat,
        matName,
        selectedType,
        selectedGroups,
      };
      console.log("Raw Material Data: ", rawmatData);
      onSuccess(rawmatData);
    }
  };

  const handleBack = () => {
    setSelectedGroups([]);
    setStep(1);
  };

  const handleGroupSelection = (groupId) => {
    setSelectedGroups((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_URL}/api/add/rawmat`, {
      mat: mat.toUpperCase(), // Ensure mat is saved in uppercase
      mat_name: matName,
      rm_type_id: parseInt(selectedType), // เพิ่มการส่ง rm_type_id
      rm_group_ids: selectedGroups,
    });

      if (response.data.success) {
        onSuccess();
        resetForm();
        handleClose();
      } else {
        setError(response.data.error || "เกิดข้อผิดพลาดในการเพิ่มวัตถุดิบ");
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์"
      );
    }
    setLoading(false);
  };

  const resetForm = () => {
    setMat("");
    setMatName("");
    setSelectedType("");
    setSelectedGroups([]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal min-w-2xl max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h1 className="pb-5 text-2xl">เพิ่มวัตถุดิบ</h1>
        <div className="space-y-4">
          {step === 1 && (
            <>
              <TextField
                label="Material Code (MAT)"
                value={mat}
                onChange={(e) => {
                  const upperValue = e.target.value.toUpperCase();
                  setMat(upperValue);
                }}
                fullWidth
                required
                size="small"
                margin="normal"
                inputProps={{
                  style: { textTransform: 'uppercase' },
                  maxLength: 20,
                }}
                InputProps={{
                  endAdornment: (
                    <Tooltip title="กรุณากรอกข้อมูล Material Code (ตัวอักษรใหญ่เท่านั้น)">
                      <IconButton edge="end" size="small">
                        <IoInformationCircle color={theme.palette.info.main} />
                      </IconButton>
                    </Tooltip>
                  ),
                }}
              />
              <TextField
                label="ชื่อวัตถุดิบ"
                value={matName}
                onChange={(e) => setMatName(e.target.value)}
                fullWidth
                required
                size="small"
                margin="normal"
              />
              <FormControl fullWidth>
                <FormLabel>ประเภทวัตถุดิบ</FormLabel>
                <Box
                  sx={{
                    maxHeight: 200,
                    overflowY: "auto",
                    padding: 1,
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                  }}
                >
                  <RadioGroup value={selectedType} onChange={handleTypeChange}>
                    {types.map((type) => (
                      <FormControlLabel
                        key={type.rm_type_id}
                        value={type.rm_type_id}
                        control={<Radio />}
                        label={type.rm_type_name}
                      />
                    ))}
                  </RadioGroup>
                </Box>
              </FormControl>
            </>
          )}

          {step === 2 && (
            <div>
              <FormControl fullWidth>
                <FormLabel className="mb-2 mx-2 border-2 rounded-md">
                  <p className="text-gray-500 text-lg mx-2 p-1">Mat.: {mat.toUpperCase()}</p>
                  <p className="text-gray-500 text-lg mx-2 p-1">ชื่อวัตถุดิบ : {matName}</p>
                </FormLabel>

                <FormLabel>
                  <p className="text-gray-600 text-xl mt-2">
                    เลือกกลุ่มเวลาวัตถุดิบ : {selectedTypeName}
                  </p>
                </FormLabel>
                <Box
                  sx={{
                    maxHeight: 250,
                    overflowY: "auto",
                    padding: 1,
                    margin: 1,
                    border: "1px solid #ccc",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "5px",
                  }}
                >
                  {groups.map((group) => (
                    <FormControlLabel
                      key={group.rm_group_id}
                      control={
                        <Checkbox
                          checked={selectedGroups.includes(group.rm_group_id)}
                          onChange={() => handleGroupSelection(group.rm_group_id)}
                        />
                      }
                      label={group.rm_group_name}
                    />
                  ))}
                </Box>
              </FormControl>
            </div>
          )}
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <Box
          className="space-x-20"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 2,
          }}
        >
          {step === 2 && (
            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              ย้อนกลับ
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={handleClose}
            style={{ backgroundColor: "#E74A3B", color: "#fff" }}
          >
            ยกเลิก
          </Button>

          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            style={{ backgroundColor: "#41a2e6", color: "#fff" }}
            onClick={step === 1 ? handleNext : handleSubmit}
            disabled={(step === 2 && selectedGroups.length === 0) || loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : step === 1 ? (
              "ถัดไป"
            ) : (
              "ยืนยัน"
            )}
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default AddRawmat;