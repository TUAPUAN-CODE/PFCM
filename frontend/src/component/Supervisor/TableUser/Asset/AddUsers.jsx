import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../Style/ModalStyle.css";
const API_URL = import.meta.env.VITE_API_URL;

const AddUsers = ({ isOpen, onClose, onSuccess }) => {
  const [userId, setUserId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [leader, setLeader] = useState("");
  const [positions, setPositions] = useState([]);
  const [posId, setPosId] = useState("");
  const [wpId, setWpId] = useState(""); // ค่าปริยายให้เป็น "" หรือ null
  const [workplaces, setWorkplaces] = useState([]);
  const [rawmatTypes, setRawmatTypes] = useState([]); // เก็บข้อมูล rawmatType
  const [selectedRawmatTypes, setSelectedRawmatTypes] = useState([]); // เก็บ rawmatType ที่เลือก
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch workplaces data
    const fetchWorkplaces = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/get/workplaces`);
        setWorkplaces(response.data.data);
      } catch (err) {
        setError("Error fetching workplaces data");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkplaces();
  }, []);

  useEffect(() => {
    // เมื่อเลือก wpId ให้ดึงข้อมูล rawmatTypes
    const fetchRawmatTypes = async () => {
      if (wpId === 2 || wpId === 3) {
        setLoading(true);
        try {
          const response = await axios.get(`${API_URL}/api/rawmat/types`);
          setRawmatTypes(response.data.data); // เก็บข้อมูล rawmatType
        } catch (err) {
          setError("Error fetching rawmatTypes data");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchRawmatTypes();
  }, [wpId]);

  useEffect(() => {
    if (wpId === 2) {
      // เมื่อ wpId เป็น 2 ให้ clear ค่าที่เลือกทั้งหมด
      setSelectedRawmatTypes([]);
    }
  }, [wpId]); // รีเฟรชค่าหลังจากเปลี่ยน wpId

  const handleRawMatTypeChange = useCallback(
    (rawMatTypeId) => {
      setSelectedRawmatTypes((prev) => {
     
        if (wpId === 3  ||wpId === 2 ) {
          return prev.includes(rawMatTypeId)
            ? prev.filter((item) => item !== rawMatTypeId)
            : [...prev, rawMatTypeId];
        }
        return prev;
      });
    },
    [wpId]
  );

  // useEffect(() => {
  //   console.log("Selected Rawmat Types: ", selectedRawmatTypes);
  // }, [selectedRawmatTypes]); // ตรวจสอบค่าเมื่อมีการเปลี่ยนแปลง

  // ฟังก์ชันสำหรับการส่งคำขอ API เพื่อเพิ่มผู้ใช้ในแต่ละประเภท
  const addWorkplaceUser = async (userId, rmTypeId) => {
    try {
      const response = await axios.post(`${API_URL}/api/add-workplace-user`, {
        user_id: userId,
        rm_type_id: rmTypeId,
      });

      if (response.status === 201) {
        return { success: true };
      } else {
        return {
          success: false,
          error: "ไม่สามารถเพิ่มการเข้าถึงของวัตถุดิบได้ !!",
        };
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        return { success: false, error: err.response.data.error };
      } else {
        return {
          success: false,
          error: "เกิดข้อผิดพลาดในการเพิ่มการเข้าถึงวัตถุดิบ",
        };
      }
    }
  };

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/get/positions`);
        setPositions(response.data.data);
      } catch (err) {
        setError("Error fetching positions data");
      }
    };

    fetchPositions();
  }, []);

  // ฟังก์ชัน handleSubmit ที่เรียกใช้งานทั้ง add-user API และ addWorkplaceUser
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // ตรวจสอบว่าผู้ใช้เลือกประเภทวัตถุดิบหรือไม่ ถ้ายังไม่เลือกให้แสดง error
    if (
      (wpId === 3 && selectedRawmatTypes.length === 0) ||
      (wpId === 2 && selectedRawmatTypes.length === 0)
    ) {
      setError("กรุณาเลือกประเภทวัตถุดิบก่อน");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/add-user`, {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        leader,
        pos_id: posId,
        wp_id: wpId,
      });

      if (response.status === 201) {
        // หาก wpId เป็น 3 ให้ทำการเพิ่ม workplaceUser
        const requests = selectedRawmatTypes.map((rmTypeId) =>
          addWorkplaceUser(userId, rmTypeId)
        );

        const results = await Promise.all(requests);

        const failedRequests = results.filter((result) => !result.success);

        if (failedRequests.length > 0) {
          setError(failedRequests[0].error);
        } else {
          if (onSuccess) onSuccess(); // แจ้งให้ TableMainUser รีเฟรช
          alert("เพิ่มพนักงานสำเร็จ /");
          onClose(); // ปิด modal หลังจากสำเร็จ
          resetForm(); // รีเซ็ตค่าหลังจากสำเร็จ
        }
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("เกิดข้อผิดพลาดในการเพิ่มผู้ใช้");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm(); // รีเซ็ตข้อมูลเมื่อปิด modal
    onClose(); // ปิด modal
  };

  const resetForm = () => {
    setUserId("");
    setFirstName("");
    setLastName("");
    setLeader("");
    setPosId("");
    setWpId(""); // รีเซ็ตค่า wpId
    setSelectedRawmatTypes([]); // รีเซ็ตค่าที่เลือก rawmatTypes
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal min-w-2xl max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h1 className="pb-5 text-2xl">เพิ่มพนักงาน</h1>
        <form
          style={{
            display: "grid",
            gap: 25,
            gridTemplateColumns: wpId === 2 || wpId === 3 ? "1fr 1fr" : "1fr",
            paddingBottom: 10,
          }}
        >
          <div className="space-y-4">
            {/* Columns 1 */}
            <InputLabel>ข้อมูลพนักงาน</InputLabel>
            <TextField
              label="รหัสพนักงาน"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="ชื่อ"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="สกุล"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="รหัสพนักงานของหัวหน้า"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>ตำแหน่ง</InputLabel>
              <Select
                value={posId}
                onChange={(e) => setPosId(e.target.value)}
                label="ตำแหน่ง"
              >
                {positions.length > 0 ? (
                  positions.map((position) => (
                    <MenuItem key={position.pos_id} value={position.pos_id}>
                      {position.pos_name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>ไม่มีตำแหน่งให้เลือก</MenuItem>
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Workplace</InputLabel>
              <Select
                value={wpId}
                onChange={(e) => {
                  const selectedWpId = e.target.value;
                  setWpId(selectedWpId);
                  setSelectedRawmatTypes([]); // Clear selected values when wpId changes
                  console.log(selectedWpId);
                }}
                label="Workplace"
              >
                {loading ? (
                  <MenuItem disabled>
                    <CircularProgress size={24} />
                  </MenuItem>
                ) : workplaces.length > 0 ? (
                  workplaces.map((workplace) => (
                    <MenuItem key={workplace.wp_id} value={workplace.wp_id}>
                      {workplace.wp_name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No workplaces available</MenuItem>
                )}
              </Select>
            </FormControl>
          </div>

          <div>
            {/* Columns 2 */}
            {wpId === 2 || wpId === 3 ? (
              <div>
                <InputLabel className="mb-4">วัตถุดิบของพนักงาน</InputLabel>
                <Box
                  sx={{
                    maxHeight: 415, // กำหนดความสูงสูงสุดที่กล่องนี้สามารถแสดงได้
                    overflowY: "auto", // ถ้ารายการยาวเกินไปจะมี scroll bar ในกล่องนี้เท่านั้น
                    padding: "15px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    border: "1px solid #ccc", // เพิ่ม border เพื่อทำให้กล่องดูชัดเจนขึ้น
                    borderRadius: "5px", // ทำให้มุมของกล่องมีความโค้ง
                  }}
                >
                  {rawmatTypes.map((rawMatType) => (
                    <FormControlLabel
                      key={rawMatType.rm_type_id}
                      control={
                        <Checkbox
                          checked={selectedRawmatTypes.includes(
                            rawMatType.rm_type_id
                          )}
                          onChange={() =>
                            handleRawMatTypeChange(rawMatType.rm_type_id)
                          }
                          color="primary"
                          className="size-"
                        />
                      }
                      label={rawMatType.rm_type_name}
                      style={{
                        whiteSpace: "nowrap", // เพื่อไม่ให้ข้อความขยายออกไป
                        overflowY: "100%", // ซ่อนข้อความที่ยาวเกิน
                        textOverflow: "ellipsis", // แสดง ... เมื่อข้อความยาวเกิน
                      }}
                    />
                  ))}
                </Box>
              </div>
            ) : null}
          </div>
        </form>
        {error && <p style={{ color: "red", paddingBottom: 20 }}>{error}</p>}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
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

export default AddUsers;
