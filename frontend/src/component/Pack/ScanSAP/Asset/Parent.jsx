import React, { useState, useEffect } from "react";
import { Button } from "@mui/material";
import TableMainPrep from './TableMainPrep';
import CameraActivationModal from "./ModalScanSAP";
import { IoBarcodeSharp } from "react-icons/io5";
import io from 'socket.io-client';
const API_URL = import.meta.env.VITE_API_URL;

const Parent = () => {
  const [openCameraModal, setOpenCameraModal] = useState(true);
  const [primaryBatch, setPrimaryBatch] = useState(""); // เก็บ Material
  const [secondaryBatch, setSecondaryBatch] = useState(""); // เก็บ Batch
  const [openDataReview, setOpenDataReview] = useState(false);

  const [material, setMaterial] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [batch, setBatch] = useState("");
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [selectedgroup, setSelectedGroup] = useState([]);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [operator, setOperator] = useState("");
  const [weighttotal, setWeightTotal] = useState("");
  const [socket, setSocket] = useState(null);
  const [tableData, setTableData] = useState([]);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/coldstorages/scan/sap`, {
        credentials: "include",
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        setTableData(data);
      } else if (data.success) {
        setTableData(data.data);
      } else {
        console.error("API Error:", data.message || "Unknown error");
        setTableData([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setTableData([]);
    }
  };

  // เมื่อยืนยันใน CameraModal จะส่งข้อมูลไปยัง ParentComponent
  const handleConfirmCameraModal = (newPrimaryBatch, newSecondaryBatch) => {
    setPrimaryBatch(newPrimaryBatch);
    setSecondaryBatch(newSecondaryBatch);
    setOpenCameraModal(false); // ปิด CameraActivationModal
  };

  const handleCloseDataReview = () => {
    setOpenDataReview(false);
  };

  const resetData = () => {
    setPrimaryBatch("");
    setSecondaryBatch("");
    setMaterial("");
    setMaterialName("");
    setBatch("");
    setSelectedPlans([]);
    setSelectedGroup([]);
    setDeliveryLocation("");
    setOperator("");
    setWeightTotal("");
    setOpenCameraModal(true);
  };

  useEffect(() => {
    const newSocket = io(API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });
    setSocket(newSocket);
    newSocket.emit('joinRoom', 'QcCheckRoom');

    newSocket.on('qcUpdated', (data) => {
      console.log('QC data updated:', data);
      fetchData(); // ✅ ใช้ฟังก์ชันที่อยู่ข้างนอก
    });

    return () => {
      newSocket.off('qcUpdated');
      newSocket.disconnect();
    };
  }, []);

  // ✅ fetch initial data เมื่อเปิดหน้า
  useEffect(() => {
    fetchData();
  }, []);


  return (
    <div>
     
      <CameraActivationModal
        open={openCameraModal}
        onClose={() => setOpenCameraModal(true)}
      />

      {/* <Button

        variant="contained"
        onClick={() => {
          resetData();
        }}
        style={{
          backgroundColor: "#fff",
          color: "#787878",
          padding: "10px 40px",
          fontSize: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderLeft: "8px solid #41a2e6",
          width: "300px",
          marginTop: "20px",
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div
            style={{ color: "#41a2e6", paddingBottom: "5px", fontSize: "15px" }}
          >
            สแกนป้าย SAP
          </div>
          <div
            style={{ color: "#787878", paddingBottom: "5px", fontSize: "14px" }}
          >
            เพื่อรับข้อมูลวัตถุดิบ
          </div>
        </div>
        <IoBarcodeSharp
          size={40}
          style={{ marginLeft: "50px", minWidth: "30px", color: "#41a2e6" }}
        />
      </Button> */}


    </div>
  );
};

export default Parent;
