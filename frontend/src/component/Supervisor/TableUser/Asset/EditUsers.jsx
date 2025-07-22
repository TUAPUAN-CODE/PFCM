import React, { useState, useEffect, useCallback, useRef  } from "react";
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

const EditUsers = ({ isOpen, onClose, onSuccess, userData }) => {
  const [userId, setUserId] = useState(userData?.user_id || "");
  const [firstName, setFirstName] = useState(userData?.first_name || "");
  const [lastName, setLastName] = useState(userData?.last_name || "");
  const [leaderFname, setLeaderFname] = useState(
    userData?.leader_first_name || ""
  );
  const [leaderLname, setLeaderLname] = useState(
    userData?.leader_last_name || ""
  );
  const [leader, setLeader] = useState(userData?.leader || "");
  const [positions, setPositions] = useState([]);
  const [posId, setPosId] = useState(userData?.pos_id || "");
  const [wpId, setWpId] = useState(userData?.wp_id || "");
  const [workplaces, setWorkplaces] = useState([]);

  const [rawmatTypes, setRawmatTypes] = useState([]); // เก็บข้อมูล rawmatType
  const [selectedRawmatTypes, setSelectedRawmatTypes] = useState(
    Array.isArray(userData?.rm_type_ids) ? userData.rm_type_ids : []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && userData) {
      console.log("userData:", userData);
      console.log("rm_type_ids:", userData.rm_type_ids);

      setUserId(userData.user_id);
      setFirstName(userData.first_name);
      setLastName(userData.last_name);
      setLeaderFname(userData.leader_first_name);
      setLeaderLname(userData.leader_last_name);
      setLeader(userData.leader);
      setPosId(userData.pos_id);
      setWpId(userData.wp_id);

      // ใช้ค่า rm_type_ids โดยตรงถ้าเป็น array
      setSelectedRawmatTypes(
        Array.isArray(userData.rm_type_ids) ? userData.rm_type_ids : []
      );
    }
  }, [isOpen, userData]);

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
  
  const isFirstRender = useRef(true);

  useEffect(() => {
    console.log("Selected Rawmat Types: ", selectedRawmatTypes);
  }, [selectedRawmatTypes]); // ตรวจสอบค่าเมื่อมีการเปลี่ยนแปลง

  const handleRawMatTypeChange = useCallback(
    (rawMatTypeId) => {
      setSelectedRawmatTypes((prev) => {
      
        if (wpId === 3  ||wpId === 2 ){
          return prev.includes(rawMatTypeId)
            ? prev.filter((item) => item !== rawMatTypeId)
            : [...prev, rawMatTypeId];
        }
        return prev;
      });
    },
    [wpId]
  );

  // ฟังก์ชันสำหรับการส่งคำขอ API เพื่อเพิ่มผู้ใช้ในแต่ละประเภท
  const updateWorkplaceUser = async (userId, rmTypeIds) => {
    try {
      const response = await axios.put(`${API_URL}/api/update-workplace-user`, {
        user_id: userId,
        rm_type_ids: rmTypeIds, // ส่งเป็น array
      });

      if (response.status === 200) {
        return { success: true };
      } else {
        return {
          success: false,
          error: "ไม่สามารถเพิ่มการเข้าถึงของวัตถุดิบได้ !!",
        };
      }
    } catch (err) {
      return {
        success: false,
        error:
          err.response?.data?.error ||
          "เกิดข้อผิดพลาดในการเพิ่มการเข้าถึงวัตถุดิบ",
      };
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

    if (
      (wpId === 3 && selectedRawmatTypes.length === 0) ||
      (wpId === 2 && selectedRawmatTypes.length === 0)
    ) {
      setError("กรุณาเลือกประเภทวัตถุดิบก่อน");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/api/update-user`, {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        leader,
        pos_id: posId,
        wp_id: wpId,
      });

      if (response.status === 200) {
        // 📌 เรียก updateWorkplaceUser ทีเดียว (แทนที่จะ loop)
        const updateResult = await updateWorkplaceUser(
          userId,
          selectedRawmatTypes
        );

        if (!updateResult.success) {
          setError(updateResult.error);
        } else {
          if (onSuccess) onSuccess();
          alert("แก้ไขข้อมูลพนักงานสำเร็จ");
          onClose();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose(); // ปิด modal
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal min-h-2xl max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="pb-5 text-2xl">แก้ไขข้อมูลพนักงาน</h1>
        <form
          style={{
            display: "grid",
            gap: 25,
            gridTemplateColumns: wpId === 2 || wpId === 3 ? "1fr 1fr" : "1fr",
            paddingBottom: 10,
          }}
        >
          <div className="space-y-3">
            {/* Columns 1 */}
            <InputLabel>ข้อมูลพนักงาน</InputLabel>
            <TextField label="รหัสพนักงาน" value={userId} fullWidth disabled />
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
            <p className="text-gray-500 ps-3">
              |-- ชื่อหัวหน้า : {leaderFname} {leaderLname}
            </p>
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
              <InputLabel>สถานที่ทำงาน</InputLabel>
              <Select
                value={wpId}
                onChange={(e) => {
                  const selectedWpId = e.target.value;
                  setWpId(selectedWpId);
                  setSelectedRawmatTypes([]); // Clear selected values when wpId changes
                  console.log(selectedWpId);
                }}
                label="สถานที่ทำงาน"
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

export default EditUsers;
