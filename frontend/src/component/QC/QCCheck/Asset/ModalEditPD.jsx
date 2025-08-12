import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Checkbox,
  Autocomplete,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import { FaCheck } from "react-icons/fa";
import axios from "axios";
axios.defaults.withCredentials = true;
import ModalAlert from "../../../../Popup/AlertSuccess";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import {
  BiMessageSquareCheck,
  BiMessageSquareX,
  BiMessageSquareError,
} from "react-icons/bi";

const API_URL = import.meta.env.VITE_API_URL;

const QcCheck = ({
  open,
  onClose,
  material,
  materialName,
  batch,
  rmfp_id,
  mapping_id,
  rm_status,
  onSuccess,
  CheckDeflect,
  remarkDeflect,
  CheckMetal,
  CheckSensorycolor,
  CheckSensoryperfurm,
  CheckSensorymeet,
  remarkSensory,
  operator,
  general_remark,
  remarkMetal,
  md_no,
  WorkAreaCode,
  WorkAreaDisplayName,
  Sensoryacceptance,
  Defectacceptance,
  batch_after,
  level_eu,
  md_time,
  // qc_cold_time,
  percent_fine,
  coldRoomTime,
  Moisture,
  Temp,
  tro_id,
  process_name,
  weight_RM,
  rmm_line_name,
  tray_count,
  dest,
  stay_place,
  rmit_date,
  edit_rework,
  remark_rework,
  remark_rework_cold,
  // rm_type_id,
  first_prod,
  two_prod,
  three_prod,
  name_edit_prod_two,
  name_edit_prod_three,
  prepare_mor_night
}) => {
  const [showAlert, setShowAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleConfirm = async () => {

    const formatDateTime = (datetimeValue) => {
      if (!datetimeValue) return null;
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok" // เพิ่ม timeZone เป็น Asia/Bangkok
      }).format(new Date(datetimeValue));
    };
    const formattedMdStartTime = formatDateTime(md_time);

    // สร้าง md_time ใหม่เพื่อให้ตรงกับเวลาไทย
    let thaiMdTime = null;
    if (md_time) {
      // สร้างวัตถุ Date จาก md_time และแปลงเป็น ISO string พร้อมระบุ timezone
      const date = new Date(md_time);
      // เพิ่ม offset +7 ชั่วโมงเพื่อให้เป็นเวลาไทย (ถ้าจำเป็น)
      thaiMdTime = date.toISOString();
    }
    // const formattedColdRoomTime = formatDateTime(qc_cold_time);
    const payload = {
      mapping_id: mapping_id ? parseInt(mapping_id, 10) : null,
      rm_status_qc: rm_status || null,
      color: CheckSensorycolor ? Number(CheckSensorycolor) : 0,
      odor: CheckSensoryperfurm ? Number(CheckSensoryperfurm) : 0,
      texture: CheckSensorymeet ? Number(CheckSensorymeet) : 0,
      sq_remark: remarkSensory || null,
      md: CheckMetal ? Number(CheckMetal) : 0,
      md_remark: remarkMetal || null,
      defect: CheckDeflect ? Number(CheckDeflect) : 0,
      defect_remark: remarkDeflect || null,
      Defectacceptance: Defectacceptance ? 1 : 0,
      Sensoryacceptance: Sensoryacceptance ? 1 : 0,
      md_no: CheckMetal === "1" ? md_no : null,
      WorkAreaCode: CheckMetal === "1" ? WorkAreaCode : null,
      operator: operator || null,
      general_remark: general_remark || null,
      Defectacceptance: Defectacceptance ? 1 : 0,
      Sensoryacceptance: Sensoryacceptance ? 1 : 0,
      Moisture: Moisture || null,
      Temp: Temp || null,
      percent_fine: percent_fine || null,
      md_time: thaiMdTime,  // แน่ใจว่า md_time เป็น ISO string แล้ว
      tro_id: tro_id || null,
      // qc_cold_time: qc_cold_time  // แน่ใจว่า qc_cold_time เป็น ISO string แล้ว
      rmm_line_name: rmm_line_name || null,
      weight_RM: weight_RM || null,
      tray_count: tray_count || null,
      dest: dest || null,
      stay_place: stay_place || null,
      prepare_mor_night: prepare_mor_night || null,


    };

    console.log("Payload sent to /api/qc/check:", payload);

    try {
      const response = await axios.post(`${API_URL}/api/qc/check`, payload);
      if (response.status === 200) {
        console.log("✅ Data sent successfully:", response.data);
        onSuccess();
        onClose();
        setShowAlert(true);
      } else {
        console.error("❌ Error while sending data:", response.status, response.data);
        setErrorMessage(response.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (error) {
      console.error("❌ Error during API call:", error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || "เกิดข้อผิดพลาดในระบบ");
    }
  };

  const handleClose = () => {
    setShowAlert(false);
    setErrorMessage("");
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogContent>
          <Typography variant="h6" sx={{ fontSize: 18, color: "#787878", mb: 2 }}>
            กรุณาตรวจสอบข้อมูลก่อนทำรายการ
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Stack spacing={1}>
            <Typography color="rgba(0, 0, 0, 0.6)">Material: {material}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch_after}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              Level Eu (สำหรับปลา): {level_eu || "-"}
            </Typography>

            <Typography color="rgba(0, 0, 0, 0.6)">
              ประเภทการแปรรูป: {process_name}
            </Typography>

            {edit_rework && (
              <Typography color="rgba(0, 0, 0, 0.6)">
                หมายเหตุแก้ไข-ห้องเย็น: {remark_rework_cold}
              </Typography>
            )}

            {remark_rework && (
              <Typography color="rgba(0, 0, 0, 0.6)">
                หมายเหตุแก้ไข-ห้องเย็น: {remark_rework}
              </Typography>
            )}

            {edit_rework && (
              <Typography color="rgba(0, 0, 0, 0.6)">
                วิธีการที่ใช้แก้ไข: {edit_rework}
              </Typography>
            )}

            <Typography color="rgba(0, 0, 0, 0.6)">
              เตรียมเสร็จ: {rmit_date}
            </Typography>
            {name_edit_prod_two && name_edit_prod_two !== "-" && (
              <>
                <Box sx={{
                  bgcolor: "#fff3e0",
                  p: 1,
                  borderLeft: "4px solid #ff9800",
                  borderRadius: 1,
                  my: 1
                }}>
                  <Typography

                    color="#ff6d00"
                    variant="subtitle1"
                  >
                    วัตถุดิบนี้ถูกเปลี่ยน Line
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Line ครั้งแรก: {first_prod || "-"}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Line ครั้งที่ 2: {two_prod || "-"}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">ชื่อผู้อนุมัติแก้ไขครั้งที่ 2: {name_edit_prod_two}</Typography>
                  {three_prod && (
                    <>
                      <Typography color="rgba(0, 0, 0, 0.6)">Line ครั้งที่ 3: {three_prod || "-"}</Typography>
                      <Typography color="rgba(0, 0, 0, 0.6)">ชื่อผู้อนุมัติแก้ไขครั้งที่ 3: {name_edit_prod_three}</Typography>
                    </>
                  )}

                </Box>
              </>
            )}
            <Stack sx={{ border: "1px solid #e3e3e3", borderRadius: 2, p: 2 }}>
              <Typography fontWeight={500} color="rgba(0, 0, 0, 0.6)">Sensory</Typography>
              <Typography color="rgba(0, 0, 0, 0.6)">
                สี: {Number(CheckSensorycolor) === 1 ? (
                  <span className="inline-flex gap-2 items-center ms-2 text-green-600">ผ่าน</span>
                ) : (
                  <span className="inline-flex gap-2 items-center ms-2 text-red-400">ไม่ผ่าน</span>
                )}
              </Typography>
              <Typography color="rgba(0, 0, 0, 0.6)">
                กลิ่น: {Number(CheckSensoryperfurm) === 1 ? (
                  <span className="inline-flex gap-2 items-center ms-2 text-green-600">ผ่าน</span>
                ) : (
                  <span className="inline-flex gap-2 items-center ms-2 text-red-400">ไม่ผ่าน</span>
                )}
              </Typography>
              <Typography color="rgba(0, 0, 0, 0.6)">
                เนื้อ: {Number(CheckSensorymeet) === 1 ? (
                  <span className="inline-flex gap-2 items-center ms-2 text-green-600">ผ่าน</span>
                ) : (
                  <span className="inline-flex gap-2 items-center ms-2 text-red-400">ไม่ผ่าน</span>
                )}
              </Typography>
              {Sensoryacceptance && (
                <Typography color="rgba(0, 0, 0, 0.6)" className="inline-flex gap-2 items-center">
                  ยอมรับพิเศษ <BiMessageSquareCheck className="size-5 text-yellow-500" />
                </Typography>
              )}
              {remarkSensory && (
                <Typography color="rgba(0, 0, 0, 0.6)" sx={{
                  whiteSpace: 'pre-line', // เพิ่มคุณสมบัตินี้เพื่อให้แสดงการเว้นบรรทัด
                  wordBreak: 'break-word' // เพิ่มเพื่อให้ข้อความยาวไม่เกินหน้าจอ
                }}>
                  {Sensoryacceptance ? "ยอมรับพิเศษ หมายเหตุ: " : "หมายเหตุ: "}
                  {remarkSensory}
                </Typography>
              )}
            </Stack>

            <Stack sx={{ border: "1px solid #e3e3e3", borderRadius: 2, p: 2 }}>
              <Typography fontWeight={500} color="rgba(0, 0, 0, 0.6)">Metal Detector</Typography>
              <Typography color="rgba(0, 0, 0, 0.6)">
                ผลการทดสอบ: {Number(CheckMetal) === 1 ? (
                  <span className="inline-flex gap-2 items-center ms-2 text-green-600">ผ่าน</span>
                ) : (
                  <span className="inline-flex gap-2 items-center ms-2 text-red-400">รอผ่าน MD</span>
                )}
              </Typography>
              {/* <Typography color="rgba(0, 0, 0, 0.6)">
                หมายเลขเครื่อง: {WorkAreaCode}/{md_no}
              </Typography> */}

              {Number(CheckMetal) === 1 && (
                <Typography color="rgba(0, 0, 0, 0.6)">
                  หมายเลขเครื่อง: {WorkAreaDisplayName}/{md_no}
                </Typography>
              )}

              {remarkMetal && (
                <Typography color="rgba(0, 0, 0, 0.6)" sx={{
                  whiteSpace: 'pre-line', // เพิ่มคุณสมบัตินี้เพื่อให้แสดงการเว้นบรรทัด
                  wordBreak: 'break-word' // เพิ่มเพื่อให้ข้อความยาวไม่เกินหน้าจอ
                }}>หมายเหตุ: {remarkMetal}</Typography>
              )}
            </Stack>

            <Stack sx={{ border: "1px solid #e3e3e3", borderRadius: 2, p: 2 }}>
              <Typography fontWeight={500} color="rgba(0, 0, 0, 0.6)">Defect</Typography>
              <Typography color="rgba(0, 0, 0, 0.6)" >
                ผลการทดสอบ: {Number(CheckDeflect) === 1 ? (
                  <span className="inline-flex gap-2 items-center ms-2 text-green-600">ผ่าน</span>
                ) : (
                  <span className="inline-flex gap-2 items-center ms-2 text-red-400">ไม่ผ่าน</span>
                )}
              </Typography>
              {Defectacceptance && (
                <Typography color="rgba(0, 0, 0, 0.6)" className="inline-flex gap-2 items-center">
                  ยอมรับพิเศษ <BiMessageSquareCheck className="size-5 text-yellow-500" />
                </Typography>
              )}
              {remarkDeflect && (
                <Typography color="rgba(0, 0, 0, 0.6)" sx={{
                  whiteSpace: 'pre-line', // เพิ่มคุณสมบัตินี้เพื่อให้แสดงการเว้นบรรทัด
                  wordBreak: 'break-word' // เพิ่มเพื่อให้ข้อความยาวไม่เกินหน้าจอ
                }}>
                  {Defectacceptance ? "ยอมรับพิเศษ หมายเหตุ: " : "หมายเหตุ: "}
                  {remarkDeflect}
                </Typography>
              )}
            </Stack>

            {/* {(rm_type_id === 6 || rm_type_id === 8) && (Moisture || percent_fine || Temp) && ( */}
            <Stack sx={{ border: "1px solid #e3e3e3", borderRadius: 2, p: 2 }}>
              <Typography fontWeight={500} color="rgba(0, 0, 0, 0.6)">การตรวจของ MDM/Chunk</Typography>
              {Moisture && (
                <Typography color="rgba(0, 0, 0, 0.6)">Moisture: {Moisture}%</Typography>
              )}
              {percent_fine && (
                <Typography color="rgba(0, 0, 0, 0.6)">Percent (%) Fine: {percent_fine}%</Typography>
              )}
              {Temp && (
                <Typography color="rgba(0, 0, 0, 0.6)">Temp: {Temp} °C</Typography>
              )}
            </Stack>
            {/* )} */}

            {prepare_mor_night && (
              <Stack sx={{ border: "1px solid #e3e3e3", borderRadius: 2, p: 2 }}>

                <Typography fontWeight={500} color="rgba(0, 0, 0, 0.6)">
                  เตรียมงานให้กะ: <span style={{ color: "#1976d2" }}>{prepare_mor_night}</span>
                </Typography>

              </Stack>
            )}
            {/* เพิ่มส่วนแสดงข้อมูลเวลา */}
            <Stack sx={{ border: "1px solid #e3e3e3", borderRadius: 2, p: 2 }}>
              <Typography fontWeight={500} color="rgba(0, 0, 0, 0.6)">ข้อมูลเวลา</Typography>
              {md_time && (
                <Typography color="rgba(0, 0, 0, 0.6)">
                  เวลาที่เริ่มผ่านเครื่อง MD: {new Date(md_time).toLocaleTimeString('th-TH', {
                    timeZone: 'Asia/Bangkok',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })} น.
                </Typography>
              )}

            </Stack>

            <Typography color="rgba(0, 0, 0, 0.6)">ผู้ดำเนินการ: {operator}</Typography>
            {general_remark && (
              <Typography
                color="rgba(0, 0, 0, 0.6)"
                sx={{
                  whiteSpace: 'pre-line', // เพิ่มคุณสมบัตินี้เพื่อให้แสดงการเว้นบรรทัด
                  wordBreak: 'break-word' // เพิ่มเพื่อให้ข้อความยาวไม่เกินหน้าจอ
                }}
              >
                หมายเหตุทั่วไป: {general_remark}
              </Typography>
            )}
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Button
              variant="contained"
              startIcon={<CancelIcon />}
              sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
              onClick={handleClose}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              sx={{ backgroundColor: "#41a2e6", color: "#fff" }}
              onClick={handleConfirm}
            >
              ยืนยัน
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      <ModalAlert open={showAlert} onClose={() => setShowAlert(false)} />
    </>
  );
};

const ModalEditPD = ({ open, onClose, data, onSuccess }) => {
  const [mdTimeError, setMdTimeError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [materialName, setMaterialName] = useState("");
  const [production, setProduction] = useState([]);
  const [CheckSensorycolor, setCheckSensorycolor] = useState("");
  const [CheckSensoryperfurm, setCheckSensoryperfurm] = useState("");
  const [CheckSensorymeet, setCheckSensorymeet] = useState("");
  const [CheckDeflect, setCheckDeflect] = useState("");
  const [remarkSensory, setremarkSensory] = useState("");
  const [remarkMetal, setremarkMetal] = useState("");
  const [operator, setoperator] = useState("");
  const [remarkDeflect, setremarkDeflect] = useState("");
  const [CheckMetal, setCheckMetal] = useState("");
  const [Sensoryacceptance, setSensoryacceptance] = useState(false);
  const [Defectacceptance, setDefectacceptance] = useState(false);
  const [error, setError] = useState(false);
  const [isConfirmProdOpen, setIsConfirmProdOpen] = useState(false);

  // State สำหรับ Autocomplete
  const [workAreas, setWorkAreas] = useState([]);
  const [metalDetectors, setMetalDetectors] = useState([]);
  const [selectedWorkArea, setSelectedWorkArea] = useState(null);
  const [selectedMdNo, setSelectedMdNo] = useState(null);
  const [mdSummary, setMdSummary] = useState("");
  const [md_time, setMdStartTime] = useState(null);

  const [Moisture, setMoisture] = useState("");
  const [Temp, setTemp] = useState("");
  const [percent_fine, setPercentFine] = useState("");
  const [generalRemark, setGeneralRemark] = useState("");

  const [sensorySectionValid, setSensorySectionValid] = useState(true);
  const [mdSectionValid, setMdSectionValid] = useState(true);
  const [defectSectionValid, setDefectSectionValid] = useState(true);
  const [operatorValid, setOperatorValid] = useState(true);
  const [shiftPreparation, setShiftPreparation] = useState("");


  // New state for tracking individual field validation
  const [fieldErrors, setFieldErrors] = useState({
    color: false,
    odor: false,
    texture: false,
    sensoryNote: false,
    md: false,
    mdNote: false,
    defect: false,
    defectNote: false,
    operator: false
  });

  const { batch, mat, rmfp_id, mapping_id, rm_status, batch_after, level_eu, tro_id, rmit_date, ptp_time, rework_time, process_name, tray_count, weight_RM, rmm_line_name, dest, stay_place, name_edit_prod_two, name_edit_prod_three, first_prod, two_prod, three_prod, prepare_mor_night, edit_rework, remark_rework, remark_rework_cold } = data || {};

  const resetForm = () => {
    setCheckSensorycolor("");
    setCheckSensoryperfurm("");
    setCheckSensorymeet("");
    setCheckMetal("");
    setremarkSensory("");
    setoperator("");
    setremarkDeflect("");
    setremarkMetal("");
    setCheckDeflect("");
    setSensoryacceptance(false);
    setDefectacceptance(false);
    setError(false);
    setErrorMessage("");
    setSelectedWorkArea(null);
    setSelectedMdNo(null);
    setMdSummary("");
    setSensorySectionValid(true);
    setMdSectionValid(true);
    setDefectSectionValid(true);
    setOperatorValid(true);
    setFieldErrors({
      color: false,
      odor: false,
      texture: false,
      sensoryNote: false,
      md: false,
      mdNote: false,
      defect: false,
      defectNote: false,
      operator: false
    });
  };

  const fetchUserDataFromLocalStorage = () => {
    try {
      const firstName = localStorage.getItem('first_name') || '';

      if (firstName) {
        setoperator(`${firstName}`.trim());
      }
    } catch (error) {
      console.error("Error fetching user data from localStorage:", error);
    }
  };

  useEffect(() => {
    if (open) {
      resetForm();
      fetchWorkAreas();
      fetchMetalDetectors();
      fetchUserDataFromLocalStorage();
    }
  }, [open]);

  useEffect(() => {
    if (mat) {
      fetchMaterialName();
      fetchProduction();
    }
  }, [mat]);

  const fetchMaterialName = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fetchRawMatName`, {
        params: { mat },
      });
      if (response.data.success) {
        setMaterialName(response.data.data[0]?.mat_name || "ไม่พบชื่อวัตถุดิบ");
      } else {
        console.error("Error fetching material name:", response.data.error);
        setErrorMessage("ไม่สามารถดึงชื่อวัตถุดิบได้");
      }
    } catch (error) {
      console.error("Error fetching material name:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const fetchProduction = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fetchProduction`, {
        params: { mat },
      });
      if (response.data.success) {
        setProduction(response.data.data);
      } else {
        console.error("Error fetching production data:", response.data.error);
        setErrorMessage("ไม่สามารถดึงข้อมูลการผลิตได้");
      }
    } catch (error) {
      console.error("Error fetching production data:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const fetchWorkAreas = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/work-areas`);
      if (response.data.success) {
        setWorkAreas(response.data.data);
      } else {
        console.error("Error fetching work areas:", response.data.error);
        setErrorMessage("ไม่สามารถดึงข้อมูลพื้นที่ทำงานได้");
      }
    } catch (error) {
      console.error("Error fetching work areas:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const fetchMetalDetectors = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/metal-detectors`);
      console.log("Metal Detectors Response:", response.data);
      if (response.data.success) {
        if (response.data.data.length === 0) {
          setErrorMessage("ไม่พบข้อมูลเครื่อง MD");
        } else {
          setMetalDetectors(response.data.data);
        }
      } else {
        console.error("Error fetching metal detectors:", response.data.error);
        setErrorMessage("ไม่สามารถดึงข้อมูลเครื่อง MD ได้");
      }
    } catch (error) {
      console.error("Error fetching metal detectors:", error);
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setErrorMessage("");
  };

  const handleShiftSelection = (shift) => {
    // ถ้ากดปุ่มเดิมซ้ำ ให้ยกเลิกการเลือก
    if (shiftPreparation === shift) {
      setShiftPreparation("");
    } else {
      setShiftPreparation(shift);
    }
  };

  const handleWorkAreaChange = (event, newValue) => {
    setSelectedWorkArea(newValue);
    setSelectedMdNo(null);
    updateMdSummary(newValue?.WorkAreaCode || "", selectedMdNo?.md_no || "");
    validateMdSection(CheckMetal, remarkMetal, newValue, selectedMdNo);

  };

  const handleMdNoChange = (event, newValue) => {
    setSelectedMdNo(newValue);
    updateMdSummary(selectedWorkArea?.WorkAreaCode || "", newValue?.md_no || "");
    validateMdSection(CheckMetal, remarkMetal, selectedWorkArea, newValue);

  };

  const handleCheckMetal = (event) => {
    const value = event.target.value;
    setCheckMetal(value);
    setFieldErrors(prev => ({ ...prev, md: false }));
    if (value === "0") {
      setSelectedWorkArea(null);
      setSelectedMdNo(null);
      setMdSummary("");
    }
    validateMdSection(value, remarkMetal, selectedWorkArea, selectedMdNo);

  };

  const updateMdSummary = (workArea, mdNo) => {
    if (selectedWorkArea && mdNo) {
      setMdSummary(`${selectedWorkArea.DisplayName}/${mdNo}`);
    } else {
      setMdSummary("");
    }
  };

  const handleConfirm = () => {
    let isValid = true;
    const newFieldErrors = {
      color: false,
      odor: false,
      texture: false,
      sensoryNote: false,
      md: false,
      mdNote: false,
      defect: false,
      defectNote: false,
      operator: false
    };

    // Validate Sensory Section
    const isSensoryValid = validateSensorySection(
      CheckSensorycolor,
      CheckSensoryperfurm,
      CheckSensorymeet,
      remarkSensory
    );

    // ตั้งค่า field errors เฉพาะส่วน Sensory
    if (!CheckSensorycolor) {
      newFieldErrors.color = true;
      isValid = false;
    }
    if (!CheckSensoryperfurm) {
      newFieldErrors.odor = true;
      isValid = false;
    }
    if (!CheckSensorymeet) {
      newFieldErrors.texture = true;
      isValid = false;
    }

    // Validate Sensory Note if needed
    const needsSensoryNote = Sensoryacceptance ||
      CheckSensorycolor === "0" ||
      CheckSensoryperfurm === "0" ||
      CheckSensorymeet === "0";
    if (needsSensoryNote && !remarkSensory) {
      newFieldErrors.sensoryNote = true;
      isValid = false;
    }

    // Validate MD Section
    const isMdValid = validateMdSection(
      CheckMetal,
      remarkMetal,
      selectedWorkArea,
      selectedMdNo
    );

    // ตั้งค่า field errors เฉพาะส่วน MD
    if (!CheckMetal) {
      newFieldErrors.md = true;
      isValid = false;
    } else if (CheckMetal === "1" && (!selectedWorkArea || !selectedMdNo)) {
      newFieldErrors.md = true;
      isValid = false;
    } else if (CheckMetal === "0" && !remarkMetal.trim()) {
      newFieldErrors.mdNote = true;
      isValid = false;
    }

    // Validate Defect Section
    const isDefectValid = validateDefectSection(
      CheckDeflect,
      remarkDeflect
    );

    // ตั้งค่า field errors เฉพาะส่วน Defect
    if (!CheckDeflect) {
      newFieldErrors.defect = true;
      isValid = false;
    }

    // Validate Defect Note if needed
    const needsDefectNote = Defectacceptance || CheckDeflect === "0";
    if (needsDefectNote && !remarkDeflect) {
      newFieldErrors.defectNote = true;
      isValid = false;
    }

    // Validate Operator
    const isOperatorValid = !!operator.trim();
    if (!isOperatorValid) {
      newFieldErrors.operator = true;
      isValid = false;
      setErrorMessage("กรุณากรอกชื่อผู้ทำรายการ");
    }

    setFieldErrors(newFieldErrors);

    // ตั้งค่าสถานะความถูกต้องของแต่ละส่วนแยกกัน
    setSensorySectionValid(isSensoryValid);
    setMdSectionValid(isMdValid);
    setDefectSectionValid(isDefectValid);
    setOperatorValid(isOperatorValid);

    if (!isValid) {
      return;
    }

    console.log("Confirm data:", {
      CheckSensorycolor,
      CheckSensoryperfurm,
      CheckSensorymeet,
      CheckDeflect,
      CheckMetal,
      remarkSensory,
      remarkDeflect,
      remarkMetal,
      operator,
      selectedWorkArea,
      selectedMdNo,
      batch_after,
      level_eu,
      process_name
    });

    setErrorMessage("");
    setIsConfirmProdOpen(true);
  };

  const handleRemarkChange = (event) => {
    setremarkSensory(event.target.value);
    setError(event.target.value.trim() === "");
    setFieldErrors(prev => ({ ...prev, sensoryNote: false }));
    validateSensorySection(CheckSensorycolor, CheckSensoryperfurm, CheckSensorymeet, event.target.value);

  };

  const handleChange = () => {
    setSensoryacceptance((prev) => {
      const newValue = !prev;
      if (!newValue) {
        setremarkSensory("");
        setError(false);
      }
      setTimeout(() => {
        validateSensorySection(CheckSensorycolor, CheckSensoryperfurm, CheckSensorymeet, remarkSensory);
      }, 0);
      return newValue;
    });
  };

  const handleDefectChange = (event) => {
    setremarkDeflect(event.target.value);
    setError(event.target.value.trim() === "");
    setFieldErrors(prev => ({ ...prev, defectNote: false }));
    validateDefectSection(CheckDeflect, event.target.value);

  };

  const handleChangeDefect = () => {
    setDefectacceptance((prev) => {
      const newValue = !prev;
      if (!newValue) {
        setremarkDeflect("");
        setError(false);
      }
      setTimeout(() => {
        validateDefectSection(CheckDeflect, remarkDeflect);
      }, 0);
      return newValue;
    });
  };

  const handleremarkMetal = (event) => {
    setremarkMetal(event.target.value);
    setFieldErrors(prev => ({ ...prev, mdNote: false }));
    validateMdSection(CheckMetal, event.target.value, selectedWorkArea, selectedMdNo);

  };

  const handleoperator = (event) => {
    setoperator(event.target.value);
    setFieldErrors(prev => ({ ...prev, operator: false }));
    setErrorMessage("");
    setOperatorValid(!!event.target.value.trim());

  };

  const handleCheckperfurm = (event) => {
    setCheckSensoryperfurm(event.target.value);
    setFieldErrors(prev => ({ ...prev, odor: false }));
    validateSensorySection(CheckSensorycolor, event.target.value, CheckSensorymeet, remarkSensory);

  };

  const handleCheckmeet = (event) => {
    setCheckSensorymeet(event.target.value);
    setFieldErrors(prev => ({ ...prev, texture: false }));
    validateSensorySection(CheckSensorycolor, CheckSensoryperfurm, event.target.value, remarkSensory);

  };

  const handleCheckDeflect = (event) => {
    setCheckDeflect(event.target.value);
    setFieldErrors(prev => ({ ...prev, defect: false }));
    validateDefectSection(event.target.value, remarkDeflect);

  };

  const handleCheckSensorycolor = (event) => {
    setCheckSensorycolor(event.target.value);
    setFieldErrors(prev => ({ ...prev, color: false }));
    validateSensorySection(event.target.value, CheckSensoryperfurm, CheckSensorymeet, remarkSensory);

  };

  const validateSensorySection = (color, odor, texture, remark) => {
    const needsNote = Sensoryacceptance ||
      color === "0" ||
      odor === "0" ||
      texture === "0";

    // ตรวจสอบว่าทุกข้อมูลถูกกรอกครบถ้วนหรือไม่
    const isValid = !!color && !!odor && !!texture && (!needsNote || !!remark.trim());

    setSensorySectionValid(isValid);
    return isValid;
  };

  const validateMdSection = (mdCheck, remark, workArea, mdNo) => {
    let isValid = true;

    if (!mdCheck) {
      isValid = false;
    } else if (mdCheck === "1") {
      isValid = !!workArea && !!mdNo;
    } else if (mdCheck === "0") {
      isValid = !!remark.trim();
    }

    setMdSectionValid(isValid);
    return isValid;
  };

  const validateDefectSection = (defectCheck, remark) => {
    const needsNote = Defectacceptance || defectCheck === "0";

    // ตรวจสอบว่าทุกข้อมูลถูกกรอกครบถ้วนหรือไม่
    const isValid = !!defectCheck && (!needsNote || !!remark.trim());

    setDefectSectionValid(isValid);
    return isValid;
  };

  const showRemarkField =
    Sensoryacceptance ||
    CheckSensorycolor === "0" ||
    CheckSensoryperfurm === "0" ||
    CheckSensorymeet === "0";

  const showDefectField = Defectacceptance || CheckDeflect === "0";

  return (
    <>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === "backdropClick") return;
          resetForm();
          onClose();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent>
          <Typography variant="h6" sx={{ fontSize: "18px", color: "#787878", mb: 2 }}>
            กรุณาเลือกแผนการผลิต
          </Typography>

          <Stack spacing={2}>
            <Divider />
            <Typography color="rgba(0, 0, 0, 0.6)">Material: {mat}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Material Name: {materialName}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">Batch: {batch_after}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              Level Eu (สำหรับปลา): {level_eu || "-"}
            </Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">ประเภทการแปรรูป: {process_name}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">เตรียมเสร็จ: {rmit_date}</Typography>
            {remark_rework_cold && (
              <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุแก้ไข-ห้องเย็น: {remark_rework_cold}</Typography>
            )}
            {remark_rework && (
              <Typography color="rgba(0, 0, 0, 0.6)">หมายเหตุแก้ไข-บรรจุ: {remark_rework}</Typography>
            )}
            {edit_rework && (
              <Typography color="rgba(0, 0, 0, 0.6)">วิธีการที่ใช้แก้ไข: {edit_rework}</Typography>
            )}
            <Typography color="rgba(0, 0, 0, 0.6)">สถานะวัตถุดิบ: {rm_status}</Typography>
            {name_edit_prod_two && name_edit_prod_two !== "-" && (
              <>
                <Box sx={{
                  bgcolor: "#fff3e0",
                  p: 1,
                  borderLeft: "4px solid #ff9800",
                  borderRadius: 1,
                  my: 1
                }}>
                  <Typography color="#ff6d00" variant="subtitle1">
                    วัตถุดิบนี้ถูกเปลี่ยน Line
                  </Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Line ครั้งที่ 1: {first_prod || "-"}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">Line ครั้งที่ 2: {two_prod || "-"}</Typography>
                  <Typography color="rgba(0, 0, 0, 0.6)">ชื่อผู้อนุมัติแก้ไขครั้งที่ 2: {name_edit_prod_two}</Typography>
                  {three_prod && (
                    <>
                      <Typography color="rgba(0, 0, 0, 0.6)">Line ครั้งที่ 3: {three_prod || "-"}</Typography>
                      <Typography color="rgba(0, 0, 0, 0.6)">ชื่อผู้อนุมัติแก้ไขครั้งที่ 3: {name_edit_prod_three}</Typography>
                    </>
                  )}
                </Box>
              </>
            )}

            <Divider />
            {/* ส่วน Sensory */}
            <Stack sx={{
              border: "1px solid #e3e3e3",
              borderRadius: "6px",
              p: 2,
              borderColor: sensorySectionValid ? "#e3e3e3" : "red"
            }}>
              {/* {!sensorySectionValid && (
                <Typography color="error" variant="caption" sx={{ mb: 1 }}>
                  กรุณาตรวจสอบ Sensory ให้ครบทุกหัวข้อ
                </Typography>
              )} */}
              <Typography sx={{ color: "#666", width: "120px", mt: 1 }}>Sensory</Typography>

              <RadioGroup
                row
                name="color"
                value={CheckSensorycolor}
                onChange={handleCheckSensorycolor}
              >
                <Typography sx={{ color: "#666", width: "120px", mt: 1 }}>สี</Typography>
                <FormControlLabel value="1" control={<Radio />} sx={{ color: "#666" }} label="ผ่าน" />
                <FormControlLabel value="0" control={<Radio />} sx={{ color: "#666" }} label="ไม่ผ่าน" />
              </RadioGroup>
              {fieldErrors.color && (
                <Typography color="error" variant="caption">กรุณาเลือกสถานะสี</Typography>
              )}

              <RadioGroup
                row
                name="odor"
                value={CheckSensoryperfurm}
                onChange={handleCheckperfurm}
              >
                <Typography sx={{ color: "#666", width: "120px", mt: 1 }}>กลิ่น</Typography>
                <FormControlLabel value="1" control={<Radio />} sx={{ color: "#666" }} label="ผ่าน" />
                <FormControlLabel value="0" control={<Radio />} sx={{ color: "#666" }} label="ไม่ผ่าน" />
              </RadioGroup>
              {fieldErrors.odor && (
                <Typography color="error" variant="caption">กรุณาเลือกสถานะกลิ่น</Typography>
              )}

              <RadioGroup
                row
                name="texture"
                value={CheckSensorymeet}
                onChange={handleCheckmeet}
              >
                <Typography sx={{ color: "#666", width: "120px", mt: 1 }}>เนื้อ</Typography>
                <FormControlLabel value="1" control={<Radio />} sx={{ color: "#666" }} label="ผ่าน" />
                <FormControlLabel value="0" control={<Radio />} sx={{ color: "#666" }} label="ไม่ผ่าน" />
              </RadioGroup>
              {fieldErrors.texture && (
                <Typography color="error" variant="caption">กรุณาเลือกสถานะเนื้อ</Typography>
              )}

              <Stack direction="row" alignItems="center">
                <Typography sx={{ color: "#666", width: "120px" }}>ยอมรับพิเศษ</Typography>
                <FormControlLabel
                  control={<Checkbox checked={Sensoryacceptance} onChange={handleChange} />}
                  label="ยอมรับพิเศษ"
                  sx={{ color: "#666" }}
                />
              </Stack>

              {showRemarkField && (
                <>
                  <TextField
                    label="หมายเหตุ *"
                    variant="outlined"
                    fullWidth
                    value={remarkSensory}
                    size="small"
                    onChange={handleRemarkChange}
                    error={fieldErrors.sensoryNote}
                    helperText={fieldErrors.sensoryNote ? "กรุณากรอกหมายเหตุ Sensory" : ""}
                    sx={{ mt: 2 }}
                  />
                </>
              )}
            </Stack>

            <Stack sx={{
              border: "1px solid #e3e3e3",
              borderRadius: "6px",
              p: 2,
              borderColor: mdSectionValid ? "#e3e3e3" : "red"
            }}>
              {/* {!mdSectionValid && (
                <Typography color="error" variant="caption" sx={{ mb: 1 }}>
                  กรุณาตรวจสอบ Metal Detector ให้ครบ
                </Typography>
              )} */}

              <RadioGroup row name="md" value={CheckMetal} onChange={handleCheckMetal}>
                <Typography sx={{ color: "#666", width: "120px", mt: 1 }}>MD</Typography>
                <FormControlLabel value="1" control={<Radio />} sx={{ color: "#666" }} label="ผ่าน" />
                <FormControlLabel value="0" control={<Radio />} sx={{ color: "#666" }} label="รอผ่าน MD" />
              </RadioGroup>
              {fieldErrors.md && (
                <Typography color="error" variant="caption">กรุณาเลือกสถานะ MD</Typography>
              )}

              {CheckMetal === "1" && (
                <>
                  <Autocomplete
                    options={workAreas}
                    getOptionLabel={(option) => option.DisplayName || `${option.WorkAreaCode} - ${option.WorkAreaName}`}
                    value={selectedWorkArea}
                    onChange={handleWorkAreaChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="พื้นที่เครื่อง MD"
                        variant="outlined"
                        size="small"
                        sx={{ mb: 2 }}
                      />
                    )}
                    noOptionsText="ไม่พบพื้นที่"
                    isOptionEqualToValue={(option, value) => option.WorkAreaCode === value.WorkAreaCode}
                  />

                  <Autocomplete
                    options={metalDetectors.filter((md) => md.Status === true)}
                    getOptionLabel={(option) => option.md_no || ""}
                    value={selectedMdNo}
                    onChange={handleMdNoChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="เลือกเครื่อง MD"
                        variant="outlined"
                        size="small"
                        sx={{ mb: 2 }}
                      />
                    )}
                    noOptionsText="ไม่พบเครื่อง MD"
                    isOptionEqualToValue={(option, value) => option.md_no === value.md_no}
                  />

                  {mdSummary && (
                    <Typography color="rgba(0, 0, 0, 0.6)" sx={{ mb: 2 }}>
                      พื้นที่/หมายเลขเครื่อง MD: {mdSummary}
                    </Typography>
                  )}
                </>
              )}

              {CheckMetal === "0" && (
                <TextField
                  label="หมายเหตุ *"
                  variant="outlined"
                  fullWidth
                  value={remarkMetal}
                  size="small"
                  onChange={handleremarkMetal}
                  sx={{ mb: 2 }}
                  error={fieldErrors.mdNote}
                  helperText={fieldErrors.mdNote ? "กรุณากรอกหมายเหตุ Metal Detector" : ""}
                />
              )}
            </Stack>

            <Stack sx={{
              border: "1px solid #e3e3e3",
              borderRadius: "6px",
              p: 2,
              borderColor: defectSectionValid ? "#e3e3e3" : "red"
            }}>
              {/* {!defectSectionValid && (
                <Typography color="error" variant="caption" sx={{ mb: 1 }}>
                  กรุณากรอกข้อมูล Defect ให้ครบ
                </Typography>
              )} */}

              <RadioGroup row name="defect" value={CheckDeflect} onChange={handleCheckDeflect}>
                <Typography sx={{ color: "#666", width: "120px", mt: 1 }}>Defect</Typography>
                <FormControlLabel value="1" control={<Radio />} sx={{ color: "#666" }} label="ผ่าน" />
                <FormControlLabel value="0" control={<Radio />} sx={{ color: "#666" }} label="ไม่ผ่าน" />
              </RadioGroup>
              {fieldErrors.defect && (
                <Typography color="error" variant="caption">กรุณาเลือกสถานะ Defect</Typography>
              )}

              <Stack direction="row" alignItems="center">
                <Typography sx={{ color: "#666", width: "120px" }}>ยอมรับพิเศษ</Typography>
                <FormControlLabel
                  control={<Checkbox checked={Defectacceptance} onChange={handleChangeDefect} />}
                  label="ยอมรับพิเศษ"
                  sx={{ color: "#666" }}
                />
              </Stack>
              {showDefectField && (
                <TextField
                  label="หมายเหตุ *"
                  variant="outlined"
                  fullWidth
                  value={remarkDeflect}
                  size="small"
                  onChange={handleDefectChange}
                  sx={{ mt: 2 }}
                  error={fieldErrors.defectNote}
                  helperText={fieldErrors.defectNote ? "กรุณากรอกหมายเหตุ Defect" : ""}
                />
              )}
            </Stack>

            {/* Conditionally show MDM/Chunk section only when rm_type_id is 6 or 8 */}
            {/* {(rm_type_id === 6 || rm_type_id === 8) && ( */}
            <Stack sx={{ border: "1px solid #e3e3e3", borderRadius: 2, p: 2 }}>
              <Typography fontWeight={500} color="rgba(0, 0, 0, 0.6)" sx={{ mb: 2 }}>
                การตรวจของพื้นที่ MDM/Chunk
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography color="rgba(0, 0, 0, 0.6)" sx={{ width: "100px" }}>
                    Moisture:
                  </Typography>
                  <TextField
                    variant="outlined"
                    size="small"
                    value={Moisture || ""}
                    onChange={(e) => {
                      const re = /^[0-9]*\.?[0-9]*$/;
                      if (e.target.value === "" || re.test(e.target.value)) {
                        setMoisture(e.target.value);
                      }
                    }}
                    placeholder="เฉพาะพื้นที่ MDM/Chunk เท่านั้น"
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography color="rgba(0, 0, 0, 0.6)" sx={{ width: "100px" }}>
                    Percent (%) Fine:
                  </Typography>
                  <TextField
                    variant="outlined"
                    size="small"
                    value={percent_fine || ""}
                    onChange={(e) => {
                      const re = /^[0-9]*\.?[0-9]*$/;
                      if (e.target.value === "" || re.test(e.target.value)) {
                        setPercentFine(e.target.value);
                      }
                    }}
                    placeholder="เฉพาะพื้นที่ MDM/Cheunk"
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography color="rgba(0, 0, 0, 0.6)" sx={{ width: "100px" }}>
                    Temp:
                  </Typography>
                  <TextField
                    variant="outlined"
                    size="small"
                    value={Temp || ""}
                    onChange={(e) => {
                      const re = /^[0-9]*\.?[0-9]*$/;
                      if (e.target.value === "" || re.test(e.target.value)) {
                        setTemp(e.target.value);
                      }
                    }}
                    placeholder="เฉพาะพื้นที่ MDM/Chunk เท่านั้น"
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </Box>
              </Stack>
            </Stack>
            {/* )} */}

            <Stack sx={{
              border: "1px solid #e3e3e3",
              borderRadius: "6px",
              p: 2,
              mt: 2
            }}>
              <Typography sx={{ color: "#666", mb: 1 }}>เตรียมงานให้กะ</Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant={shiftPreparation === "DS" ? "contained" : "outlined"}
                  onClick={() => handleShiftSelection("DS")}
                  sx={{
                    bgcolor: shiftPreparation === "DS" ? "#41a2e6" : "transparent",
                    '&:hover': {
                      bgcolor: shiftPreparation === "DS" ? "#3b94d3" : "rgba(65, 162, 230, 0.08)"
                    }
                  }}
                >
                  DS
                </Button>
                <Button
                  variant={shiftPreparation === "NS" ? "contained" : "outlined"}
                  onClick={() => handleShiftSelection("NS")}
                  sx={{
                    bgcolor: shiftPreparation === "NS" ? "#41a2e6" : "transparent",
                    '&:hover': {
                      bgcolor: shiftPreparation === "NS" ? "#3b94d3" : "rgba(65, 162, 230, 0.08)"
                    }
                  }}
                >
                  NS
                </Button>
              </Stack>
            </Stack>

            <Typography sx={{ color: "#666", mt: 2, mb: 1 }}>
              วัน/เวลา ที่เริ่มผ่านเครื่อง MD:
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="วัน/เวลา ที่เริ่มผ่านเครื่อง MD"
                value={md_time ? dayjs(md_time) : null}
                onChange={(newValue) => {
                  if (newValue && newValue.isAfter(dayjs())) {
                    setMdTimeError(true);
                    setErrorMessage("ไม่สามารถเลือกเวลาในอนาคตได้");
                    return;
                  }
                  setMdStartTime(newValue); // เก็บเป็น dayjs object
                  setMdTimeError(false);
                  setErrorMessage("");
                }}

                maxDateTime={dayjs()}
                ampm={false}
                timeSteps={{ minutes: 1 }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    required: true,
                    sx: { marginBottom: 2 },
                    error: mdTimeError,
                    helperText: mdTimeError ? errorMessage : "",
                  }
                }}
              />
            </LocalizationProvider>

            <Typography sx={{ color: "#666", mt: 2, mb: 1 }}>
              ผู้ดำเนินการ
            </Typography>
            <TextField
              label="กรอกชื่อผู้ทำรายการ"
              variant="outlined"
              fullWidth
              value={operator}
              size="small"
              onChange={handleoperator}
              sx={{ mb: 2 }}
              error={fieldErrors.operator}
              helperText={fieldErrors.operator ? "กรุณากรอกชื่อผู้ทำรายการ" : ""}
            />

            <Typography sx={{ color: "#666", mt: 2, mb: 1 }}>
              หมายเหตุทั่วไป
            </Typography>
            <TextField
              label="หมายเหตุเพิ่มเติม (ถ้ามี)"
              variant="outlined"
              fullWidth
              value={generalRemark}
              size="small"
              onChange={(e) => setGeneralRemark(e.target.value)}
              sx={{ mb: 2 }}
              multiline
              rows={2}
            />

            <Divider />
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
              <Button
                variant="contained"
                startIcon={<CancelIcon />}
                sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
                onClick={() => {
                  resetForm();
                  onClose();
                }}
              >
                ยกเลิก
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                sx={{ backgroundColor: "#41a2e6", color: "#fff" }}
                onClick={handleConfirm}
              >
                ยืนยัน
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
      <QcCheck
        open={isConfirmProdOpen}
        onClose={() => setIsConfirmProdOpen(false)}
        material={mat}
        materialName={materialName}
        CheckSensorycolor={CheckSensorycolor}
        CheckSensoryperfurm={CheckSensoryperfurm}
        CheckSensorymeet={CheckSensorymeet}
        remarkSensory={remarkSensory}
        CheckMetal={CheckMetal}
        remarkMetal={remarkMetal}
        CheckDeflect={CheckDeflect}
        remarkDeflect={remarkDeflect}
        operator={operator}
        batch={batch}
        rmfp_id={rmfp_id}
        mapping_id={mapping_id}
        rm_status={rm_status}
        Sensoryacceptance={Sensoryacceptance}
        Defectacceptance={Defectacceptance}
        md_no={selectedMdNo?.md_no}
        WorkAreaCode={selectedWorkArea?.WorkAreaCode}
        WorkAreaDisplayName={selectedWorkArea?.DisplayName}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
        batch_after={batch_after}
        level_eu={level_eu}
        Moisture={Moisture}
        Temp={Temp}
        percent_fine={percent_fine}
        md_time={md_time}
        tro_id={tro_id}
        process_name={process_name}
        tray_count={tray_count}
        weight_RM={weight_RM}
        rmm_line_name={rmm_line_name}
        dest={dest}
        stay_place={stay_place}
        rmit_date={rmit_date}
        edit_rework={edit_rework}
        remark_rework={remark_rework}
        remark_rework_cold={remark_rework_cold}
        general_remark={generalRemark}
        // rm_type_id={rm_type_id}
        first_prod={first_prod}
        two_prod={two_prod}
        three_prod={three_prod}
        prepare_mor_night={shiftPreparation}
        name_edit_prod_two={name_edit_prod_two}
        name_edit_prod_three={name_edit_prod_three}
      />
    </>
  );
};

export default ModalEditPD;