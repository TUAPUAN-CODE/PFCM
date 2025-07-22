import React from "react";
import MoveTrolley from "./MoveTrolley";
import { Typography } from "@mui/material"; // Import Typography

const ModalSuccess = ({ tro_id, Tro_id, slot_id, onClose }) => {
    const isInvalidSlot = tro_id !== null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full">
                <Typography variant="h6" className={`font-semibold ${isInvalidSlot ? "text-red-600" : "text-blue-600"}`} gutterBottom style={{ fontFamily: "'Prompt', sans-serif" }}>
                    {isInvalidSlot
                        ? `ไม่สามารถย้ายรถเข็นไปตำแหน่ง ${slot_id} ได้!`
                        : `ต้องการย้ายรถเข็นหมายเลข ${Tro_id} ไปช่อง ${slot_id} หรือไม่`}
                </Typography>

                <div className="mt-4 text-center">
                    {isInvalidSlot ? (
                        <div className="flex justify-center">
                            <button
                                onClick={onClose}
                                className="py-2 px-4 rounded-full text-white bg-red-500 hover:bg-red-600"
                            >
                                ปิด
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* ปุ่มจัดให้อยู่ซ้าย-ขวา */}
                            <div className="flex justify-between items-center mt-4">
                                <button
                                    onClick={onClose}
                                    className="py-2 px-4 rounded-full text-white bg-gray-500 hover:bg-gray-600"
                                >
                                    ยกเลิก
                                </button>

                                <MoveTrolley Tro_id={Tro_id} slot_id={slot_id} onClose={onClose} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModalSuccess;
