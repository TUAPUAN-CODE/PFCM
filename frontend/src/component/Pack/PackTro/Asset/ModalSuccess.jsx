import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Paper
} from "@mui/material";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import PrintIcon from "@mui/icons-material/Print";
import BuildIcon from "@mui/icons-material/Build";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import FactoryIcon from "@mui/icons-material/Factory";
import InventoryIcon from "@mui/icons-material/Inventory";
import axios from "axios";
axios.defaults.withCredentials = true;
import ModalAlert from "../../../../Popup/AlertSuccess";
import SendColdPrinter from "../../History/Asset/SendColdPrinter";
import TrolleyReworkModal from "./ModalTroRework";

const API_URL = import.meta.env.VITE_API_URL;

const ModalSuccess = ({ open, onClose, tro_id, tableData, onSuccess, delayTime, closeParentModal }) => {
  const [confirm, setConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [tableDataSuccess, setTableDataSuccess] = useState(null);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [reworkModalOpen, setReworkModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [combinedMaterials, setCombinedMaterials] = useState([]);

  // ฟังก์ชันดึงข้อมูลวัตถุดิบทั้งหมด
  const extractAllMaterials = (data) => {
    if (!data) return [];

    console.log("Extracting materials from tableData:", data);

    let allMaterials = [];

    // ตรวจสอบโครงสร้างข้อมูลในหลายรูปแบบ
    if (data.allMaterials && Array.isArray(data.allMaterials)) {
      // ใช้ข้อมูล allMaterials ที่ส่งมา
      allMaterials = data.allMaterials;
    } else if (data.rawMaterials && Array.isArray(data.rawMaterials)) {
      // รวมวัตถุดิบปกติและวัตถุดิบผสม
      allMaterials = [...data.rawMaterials];

      if (data.mixedMaterials && Array.isArray(data.mixedMaterials)) {
        allMaterials = [...allMaterials, ...data.mixedMaterials];
      }
    } else if (data.materials && Array.isArray(data.materials)) {
      allMaterials = data.materials;
    } else if (data.groupItems && Array.isArray(data.groupItems)) {
      allMaterials = data.groupItems;
    } else if (Array.isArray(data)) {
      allMaterials = data;
    } else {
      // Single item case
      allMaterials = [data];
    }

    console.log("Extracted all materials:", allMaterials);
    return allMaterials;
  };

  // ฟังก์ชันใหม่สำหรับรวมรายการที่มีรหัสการผสมเดียวกัน
  const combineSameMixedMaterials = (materials) => {
    if (!materials || materials.length === 0) return [];

    const materialMap = new Map();

    materials.forEach(item => {
      // ตรวจสอบว่า item เป็น object หรือไม่
      if (!item || typeof item !== 'object') return;

      // ตรวจสอบว่าเป็นวัตถุดิบผสมหรือไม่
      const isMixed = Boolean(item.mix_code || item.mixed_code);

      // กำหนดรหัสที่จะใช้เป็น key
      const code = isMixed
        ? (item.mix_code || item.mixed_code)
        : (item.mat || item.code || item.material_code || item.id || '');

      // ถ้าไม่มีรหัส ให้ใช้เป็นรายการแยก
      if (!code) {
        const uniqueKey = `no-code-${materialMap.size}`;
        materialMap.set(uniqueKey, { ...item });
        return;
      }

      // ถ้าเป็นวัตถุดิบปกติ (ไม่ใช่วัตถุดิบผสม) ให้ใช้รหัส+ลำดับเป็น key เพื่อไม่ให้รวมกัน
      if (!isMixed) {
        const uniqueKey = `${code}-${materialMap.size}`;
        materialMap.set(uniqueKey, { ...item });
        return;
      }

      // สำหรับวัตถุดิบผสมเท่านั้น ให้รวมรายการที่มีรหัสเดียวกัน
      if (!materialMap.has(code)) {
        materialMap.set(code, { ...item });
      }
    });

    return Array.from(materialMap.values());
  };

  useEffect(() => {
    console.log("tableData in ModalSuccess:", tableData);

    if (tableData) {
      setTableDataSuccess(tableData);

      // ดึงข้อมูลวัตถุดิบและจัดเก็บในสเตท
      const extractedMaterials = extractAllMaterials(tableData);
      setMaterials(extractedMaterials);

      // รวมรายการที่มีรหัสการผสมเดียวกัน
      const combined = combineSameMixedMaterials(extractedMaterials);
      setCombinedMaterials(combined);

      console.log("Materials set in state:", extractedMaterials);
      console.log("Combined materials:", combined);
    }
  }, [tableData]);

  const coldStorageData = {
    doc_no: tro_id
  };

  useEffect(() => {
    if (open) {
      setIsSubmitSuccess(false);
      setSelectedAction('');
    }
  }, [open]);

  useEffect(() => {
    if (confirm) {
      handleConfirm();
    }
  }, [confirm]);

  const handleConfirm = async () => {
    try {
      let url = '';
      if (selectedAction === 'cold') {
        url = `${API_URL}/api/pack/export/Trolley`;
      } else if (selectedAction === 'line') {
        url = `${API_URL}/api/pack/export/topack/Trolley`;
      } else {
        console.error("Invalid action:", selectedAction);
        return;
      }

      const response = await axios.post(url, { tro_id });

      if (response.data.success) {
        console.log("Successfully updated production status:", response.data.message);
        setIsSubmitSuccess(true);
        onSuccess();
        onClose();
        closeParentModal();
        setShowAlert(true);
        setPrintDialogOpen(true);
      } else {
        console.error("Error:", response.data.message);
      }
    } catch (error) {
      console.error("API request failed:", error);
    }

    setConfirm(false);
  };


  const handleAlertClose = () => {
    setShowAlert(false);
  };

  const handlePrintButtonClick = () => {
    setPrintDialogOpen(true);
  };

  const handlePrintDialogClose = () => {
    setPrintDialogOpen(false);
  };

  // Handle dispatch action based on selection
  const handleDispatchAction = () => {
    if (selectedAction === 'rework') {
      setReworkModalOpen(true);
    } else if (selectedAction === 'cold') {
      setConfirm(true);
    } else if (selectedAction === 'line') {
      setConfirm(true);
    }
  };

  // Handle rework modal close
  const handleReworkModalClose = () => {
    setReworkModalOpen(false);
    onClose(); // Close the main modal
  };

  // Handle completion from rework modal
  const handleReworkComplete = (reworkData) => {
    setReworkModalOpen(false);
    onSuccess();
    onClose();
    if (closeParentModal) {
      closeParentModal(); // ปิด ModalEditPD (parent modal)
    }
  };

  // Get status type indicator
  const getStatusType = (status) => {
    if (status === "เหลือจากไลน์ผลิต") {
      return { icon: <LocalShippingIcon fontSize="small" />, color: "primary" };
    } else {
      return { icon: <BuildIcon fontSize="small" />, color: "warning" };
    }
  };

  // ฟังก์ชันตรวจสอบว่าเป็นวัตถุดิบผสมหรือไม่
  const isMixedMaterial = (item) => {
    return Boolean(item.mix_code || item.mixed_code);
  };

  // ฟังก์ชันดึงรหัสวัตถุดิบที่ถูกต้อง (ปกติหรือผสม)
  const getMaterialCode = (item) => {
    return item.mix_code || item.mixed_code || item.mat || '-';
  };

  // คำนวณจำนวนรายการที่จะแสดง
  const getTotalItemCount = () => {
    if (tableData) {
      // ใช้จำนวนรายการที่รวมแล้ว
      if (combinedMaterials.length > 0) {
        return combinedMaterials.length;
      } else if (tableData.itemCount) {
        return tableData.itemCount;
      }
    }
    return 0;
  };

  // ดึงค่าน้ำหนักและจำนวนถาด
  const getWeight = (item) => {
    return item.weight_RM || '-';
  };

  const getTrayCount = (item) => {
    return item.tray_count || '-';
  };

  // กำหนดรูปแบบตารางและข้อมูลที่จะแสดง
  return (
    <>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason === 'backdropClick') return;
          onClose();
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogContent>
          <Typography variant="h6" style={{ fontSize: "18px", color: "#787878" }} mb={2}>
            รายการวัตถุดิบและประเภทการส่ง
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1} mb={2}>
            <Typography color="rgba(0, 0, 0, 0.6)">ป้ายทะเบียน: {tro_id}</Typography>
            <Typography color="rgba(0, 0, 0, 0.6)">
              จำนวนรายการในรถเข็น: {getTotalItemCount()}
            </Typography>
          </Stack>

          <TableContainer component={Paper} sx={{ maxHeight: 300, mb: 2 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ลำดับ</TableCell>
                  <TableCell>รหัสวัตถุดิบ</TableCell>
                  <TableCell>ชื่อวัตถุดิบ</TableCell>
                  <TableCell align="right">น้ำหนัก (กก.)</TableCell>
                  <TableCell align="center">จำนวนถาด</TableCell>
                  <TableCell align="center">ประเภทวัตถุดิบ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {combinedMaterials.map((item, index) => {
                  const mixed = isMixedMaterial(item);
                  return (
                    <TableRow key={index} sx={mixed ? { backgroundColor: 'rgba(144, 202, 249, 0.08)' } : {}}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {getMaterialCode(item)}
                        {mixed && (
                          <Chip
                            label="ผสม"
                            size="small"
                            color="info"
                            sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{item.mat_name}</TableCell>
                      <TableCell align="right">{getWeight(item)}</TableCell>
                      <TableCell align="center">{getTrayCount(item)}</TableCell>
                      <TableCell align="center">
                        {mixed ? 'วัตถุดิบผสม' : 'วัตถุดิบปกติ'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {combinedMaterials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">ไม่พบข้อมูลวัตถุดิบ</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} mb={1}>
              <Typography variant="subtitle2">ประเภทการดำเนินการ:</Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button
                variant={selectedAction === 'cold' ? "contained" : "outlined"}
                startIcon={<LocalShippingIcon />}
                onClick={() => setSelectedAction('cold')}
                sx={{ flex: 1 }}
              >
                ส่งเข้าห้องเย็น
              </Button>
              <Button
                variant={selectedAction === 'rework' ? "contained" : "outlined"}
                startIcon={<BuildIcon />}
                onClick={() => setSelectedAction('rework')}
                color="warning"
                sx={{ flex: 1 }}
              >
                แก้ไขวัตถุดิบ
              </Button>
              <Button
                variant={selectedAction === 'line' ? "contained" : "outlined"}
                startIcon={<LocalShippingIcon />}
                onClick={() => setSelectedAction('line')}
                sx={{ flex: 1 }}
              >
                ส่งให้ไลน์บรรจุอื่น
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<CancelIcon />}
              style={{ backgroundColor: "#E74A3B", color: "#fff" }}
              onClick={onClose}
              disabled={isLoading}
            >
              ยกเลิก
            </Button>

            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              style={{ backgroundColor: "#41a2e6", color: "#fff" }}
              onClick={handleDispatchAction}
              disabled={!selectedAction || isLoading}
            >
              {isLoading ? "กำลังดำเนินการ..." : "ดำเนินการ"}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Alert Modal พร้อมปุ่มพิมพ์ */}
      <ModalAlert
        open={showAlert}
        onClose={handleAlertClose}
        additionalButton={
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            style={{ backgroundColor: "#2388d1", color: "#fff" }}
            onClick={handlePrintButtonClick}
          >
            พิมพ์
          </Button>
        }
      />

      {/* Cold Storage Print Dialog */}
      <SendColdPrinter
        open={printDialogOpen}
        onClose={handlePrintDialogClose}
        data={tableDataSuccess || coldStorageData}
        status={"เหลือจากไลน์ผลิต"}
      />

      {/* TrolleyReworkModal for materials that need correction */}
      <TrolleyReworkModal
        open={reworkModalOpen}
        onClose={handleReworkModalClose}
        onNext={handleReworkComplete}
        data={{
          ...tableDataSuccess,
          tro_id: tro_id,
          delayTime: delayTime,
          itemCount: getTotalItemCount(),
          inputValues: [tro_id]
        }}
      />
    </>
  );
};

export default ModalSuccess;