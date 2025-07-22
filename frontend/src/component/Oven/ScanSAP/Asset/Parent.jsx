import React, { useState } from "react";
import { Button } from "@mui/material";
import CameraActivationModal from "./ModalScanSAP";
import DataReviewSAP from "./ModalConfirmSAP";
import { IoBarcodeSharp } from "react-icons/io5";
const API_URL = import.meta.env.VITE_API_URL;

const Parent = () => {
  const [openCameraModal, setOpenCameraModal] = useState(false);
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

  // เมื่อยืนยันใน CameraModal จะส่งข้อมูลไปยัง ParentComponent
  const handleConfirmCameraModal = (newPrimaryBatch, newSecondaryBatch) => {
    setPrimaryBatch(newPrimaryBatch);
    setSecondaryBatch(newSecondaryBatch);
    setOpenDataReview(true); // เปิด DataReviewSAP
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
  

  return (
    <div>
      <Button
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
      </Button>

      <CameraActivationModal
        open={openCameraModal}
        onClose={() => setOpenCameraModal(false)}
        onConfirm={handleConfirmCameraModal} // ส่งข้อมูลไปยัง parent เมื่อยืนยัน
        primaryBatch={primaryBatch} // ส่งข้อมูล Material
        secondaryBatch={secondaryBatch} // ส่งข้อมูล Batch
        setPrimaryBatch={setPrimaryBatch} // ให้สามารถตั้งค่า primaryBatch
        setSecondaryBatch={setSecondaryBatch} // ให้สามารถตั้งค่า secondaryBatch
      />

      <DataReviewSAP
        open={openDataReview}
        onClose={handleCloseDataReview}
        material={primaryBatch}
        batch={secondaryBatch} // ส่งข้อมูลไป DataReviewSAP
      />
    </div>
  );
};

export default Parent;
