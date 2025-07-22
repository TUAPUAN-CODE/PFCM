import React from "react";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import { IoFishOutline } from "react-icons/io5";
import { GiFriedFish } from "react-icons/gi";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import { TbBackground } from "react-icons/tb";
import { IoBarcodeSharp } from "react-icons/io5";
import { GiCannedFish } from "react-icons/gi";
import { TfiShoppingCartFull } from "react-icons/tfi";
import { LuPackageCheck } from "react-icons/lu";
import {
  Dialog,
  Stack,
  DialogContent,
  Button,
  Box,
  Divider,
  Typography,
} from "@mui/material";
const API_URL = import.meta.env.VITE_API_URL;

const onSelectOption = (option, slotData) => {
  setSelectedOption(option);
  setSelectedSlot(slotData); // Ensure this sets the slot correctly
  setIsScanTrolleyOpen(true);
};

const SlotModal = ({ slot, onClose, onSelectOption }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div style={{ color: "#000" }} className="bg-white p-6 rounded-lg shadow-lg w-96">

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: "10px" }}>

          <h2 className="text-lg font-semibold ">เลือกประเภทการรับเข้า</h2>
          {/* <p><strong>Slot ID:</strong> {slot.slot_id}</p>
          <p><strong>CS ID:</strong> {slot.cs_id}</p>
          <p><strong>Tro ID:</strong> {slot.tro_id ? slot.tro_id : "ไม่มีรถเข็น"}</p>
          <p><strong>Status:</strong> {slot.slot_status ? "ว่าง" : "ไม่ว่าง"}</p> */}
          < Divider sx={{ marginTop: 1, marginBottom: 1 }}></ Divider>
   
          <Button
          onClick={() => onSelectOption("วัตถุดิบตรง",slot)}
          variant="contained"
          style={{
            backgroundColor: "#fff",
            color: "#787878",
            padding: "6px 40px",
            fontSize: "20px",
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: "center",
            borderLeft: "6px solid #41cc4f",
            width: "100%",
            maxHeightheight: "40",
            marginTop: "2px"
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#41cc4f", fontSize: "20px" }}> วัตถุดิบตรง </div>
            <div style={{ color: "#787878", paddingBottom: "5px", fontSize: "12px" }} > สำหรับวัตถุดิบพร้อมใช้งาน </div>
          </div>
          <LuPackageCheck size={40} style={{ marginLeft: "50px", minWidth: "30px", color: "#41cc4f" }} />
        </Button>
          <Button
          onClick={() => onSelectOption("วัตถุดิบรับฝาก",slot)}
          variant="contained"
          style={{
            backgroundColor: "#fff",
            color: "#787878",
            padding: "6px 40px",
            fontSize: "20px",
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: "center",
            borderLeft: "6px solid #41a2e6",
            width: "100%",
            height: "40",
            marginTop: "2px"
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#41a2e6", fontSize: "20px" }}> วัตถุดิบรับฝาก </div>
            <div style={{ color: "#787878", paddingBottom: "5px", fontSize: "12px" }} > สำหรับวัตถุดิบฝากชั่วคราว </div>
          </div>
          <TfiShoppingCartFull size={40} style={{ marginLeft: "50px", minWidth: "30px", color: "#41a2e6" }} />
        </Button>
          <Button
          onClick={() => onSelectOption("เหลือจากไลน์ผลิต",slot)}
          variant="contained"
          style={{
            backgroundColor: "#fff",
            color: "#787878",
            padding: "6px 40px",
            fontSize: "20px",
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: "center",
            borderLeft: "6px solid #f0cb4d",
            width: "100%",
            height: "40",
            marginTop: "2px"
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#f0cb4d", fontSize: "20px" }}> เหลือจากไลน์ผลิต </div>
            <div style={{ color: "#787878", paddingBottom: "5px", fontSize: "12px" }} > สำหรับวัตถุดิบที่เหลือจากบรรจุ </div>
          </div>
          <GiCannedFish size={40} style={{ marginLeft: "50px", minWidth: "30px", color: "#f0cb4d" }} />
        </Button>
          <Button
          onClick={() => onSelectOption("วัตถุดิบรอแก้ไข",slot)}
          variant="contained"
          style={{
            backgroundColor: "#fff",
            color: "#787878",
            padding: "6px 40px",
            fontSize: "20px",
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: "center",
            borderLeft: "6px solid #ff4444",
            width: "100%",
            height: "40",
            marginTop: "2px"
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#ff4444",  fontSize: "20px" }}>รอแก้ไข </div>
            <div style={{ color: "#787878", paddingBottom: "5px", fontSize: "12px" }} > สำหรับวัตถุดิบรอแก้ไข </div>
          </div>
          <GiFriedFish size={40} style={{ marginLeft: "50px", minWidth: "30px", color: "#ff4444" }} />
        </Button>
          <Button
          onClick={() => onSelectOption("รถเข็นว่าง",slot)}
          variant="contained"
          style={{
            backgroundColor: "#fff",
            color: "#787878",
            padding: "6px 40px",
            fontSize: "20px",
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: "center",
            borderLeft: "6px solid #686868",
            width: "100%",
            height: "40",
            marginTop: "2px"
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#686868",  fontSize: "20px" }}>รถเข็นว่าง </div>
            <div style={{ color: "#787878", paddingBottom: "5px", fontSize: "12px" }} > สำหรับวัตถุดิบภายในห้องเย็น </div>
          </div>
          <IoBarcodeSharp size={40} style={{ marginLeft: "50px", minWidth: "30px", color: "#686868" }} />
        </Button>
       
        </Box>
       

        < Divider sx={{ marginTop: 2, marginBottom: 2 }}></ Divider>

        <Stack>
          <Button
            sx={{ backgroundColor: "#E74A3B", color: "#fff" }}
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={onClose}
          >
            ยกเลิก
          </Button>
        </Stack>
     
      </div>

    </div>
  );
};

export default SlotModal;