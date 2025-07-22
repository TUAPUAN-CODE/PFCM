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
  Paper,
  Checkbox,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import "../Style/ModalStyle.css";

const API_URL = import.meta.env.VITE_API_URL;

const EditRawmat = ({ isOpen, onClose, onSuccess, rawmatData }) => {
  const [step, setStep] = useState(1);
  const [mat, setMat] = useState(rawmatData?.mat || "");
  const [matName, setMatName] = useState(rawmatData?.mat_name || "");
  const [selectedType, setSelectedType] = useState(
    rawmatData?.rm_type_id || ""
  );
  const [selectedGroups, setSelectedGroups] = useState(
    rawmatData?.groups
      ? rawmatData.groups.map((group) => group.rm_group_id)
      : []
  );

  const [selectedTypeName, setSelectedTypeName] = useState("");
  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && rawmatData) {
      setMat(rawmatData?.mat || "");
      setMatName(rawmatData?.mat_name || "");
      setSelectedType(rawmatData?.rm_type_id || "");
      setSelectedGroups(
        rawmatData?.groups
          ? rawmatData.groups.map((group) => group.rm_group_id)
          : []
      );
    }
  }, [isOpen, rawmatData]);

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
    setSelectedGroups([]);
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
    onClose();
  };

  const handleNext = () => {
    if (!mat || !matName || !selectedType) {
      setError("กรุณากรอกข้อมูลให้ครบก่อน !!");
      return;
    }

    // ถ้าข้อมูลครบถ้วนแล้ว
    setError(""); // ล้างข้อความผิดพลาดก่อนหน้า

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
    setStep(1);
  };

  const handleGroupSelection = (groupId) => {
    setSelectedGroups((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else if (prev.length < 2) {
        return [...prev, groupId];
      }
      return prev;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.put(`${API_URL}/api/update-rawmat`, {
        mat,
        mat_name: matName,
        rm_type_id: parseInt(selectedType), // เพิ่มการส่ง rm_type_id
        rm_group_ids: selectedGroups,
      });

      if (response.data.success) {
        onSuccess(); // ทำอะไรบางอย่างเมื่อแก้ไขสำเร็จ
        handleClose(); // ปิด Modal
      } else {
        setError(response.data.error || "เกิดข้อผิดพลาดในการแก้ไขวัตถุดิบ");
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์"
      );
    }

    setLoading(false);
  };
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal min-w-2xl max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="pb-5 text-2xl">แก้ไขข้อมูลวัตถุดิบ</h1>
        <div className="space-y-4">
          {step === 1 && (
            <>
              <TextField
                label="mat"
                value={mat}
                onChange={(e) => setMat(e.target.value)}
                fullWidth
                required
                disabled
              />
              <TextField
                label="ชื่อวัตถุดิบ"
                value={matName}
                onChange={(e) => setMatName(e.target.value)}
                fullWidth
                required
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
                <FormLabel className=" mb-2 mx-2 border-2 rounded-md">
                  <p className="text-gray-500 text-lg mx-2 p-1">Mat.: {mat}</p>
                  <p className="text-gray-500 text-lg mx-2 p-1">
                    ชื่อวัตถุดิบ : {matName}
                  </p>
                </FormLabel>

                <FormLabel>
                  <p className="text-gray-600 text-xl mt-2">
                    เลือกกลุ่มเวลาวัตถุดิบ : {selectedTypeName}
                  </p>
                  {/* <p className="text-gray-400">
                    (เลือกได้สูงสุด 2 กลุ่ม : สำหรับวัตถุดิบสุก และดิบ)
                  </p> */}
                </FormLabel>
                <Box
                  sx={{
                    maxHeight: 250,
                    overflowY: "auto",
                    padding: 1,
                    margin: 1,
                    border: "1px solid #ccc",
                    display: "flex",
                    flexDirection: "column", // จัดให้อยู่ใน 1 คอลัมน์
                    borderRadius: "5px",
                  }}
                >
                  {groups.map((group) => (
                    <FormControlLabel
                      key={group.rm_group_id}
                      control={
                        <Checkbox
                          checked={selectedGroups.includes(group.rm_group_id)}
                          onChange={() =>
                            handleGroupSelection(group.rm_group_id)
                          }
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


export default EditRawmat;
