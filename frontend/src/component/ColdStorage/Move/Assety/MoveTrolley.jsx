import React, { useState, useEffect } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 
import { io } from "socket.io-client";

const MoveTrolley = ({ Tro_id, slot_id, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [socket, setSocket] = useState(null);
    const [tableData, setTableData] = useState([]); // Assuming you have table data to update
    const API_URL = import.meta.env.VITE_API_URL;

    // Initialize Socket.IO connection
    useEffect(() => {
        const newSocket = io(API_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5, // จำนวนครั้งที่ลอง reconnect
        reconnectionDelay: 1000, // หน่วงเวลา 1 วินาทีระหว่างการ reconnect
        autoConnect: true
      }); // Connect to the backend using Socket.IO
        setSocket(newSocket);
   

        // Clean up socket connection when component unmounts
        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Handle the trolley move operation
    const handleMoveTrolley = async () => {
        setIsLoading(true);
        try {
            const response = await axios.put(`${API_URL}/api/coldstorage/movetrolley`, {
                tro_id: Tro_id,
                new_slot_id: slot_id,
            });

            if (response.data.success) {
                console.log("ย้ายรถเข็นเสร็จสมบูรณ์");
                socket.emit("reserveSlot", {
                    slot_id: tableData.slot_id,
                    cs_id: tableData.cs_id,
                  });
                onClose(); // Close modal when move is complete
            } else {
                console.log("เกิดข้อผิดพลาดในการย้ายรถเข็น");
            }
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Placeholder fetchData function (You can implement this based on your needs)
    const fetchData = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/coldstorage/getTableData`);
            setTableData(response.data); // Assuming the response contains the updated table data
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    return (
        <div>
            <button
                onClick={handleMoveTrolley}
                disabled={isLoading}
                className="py-2 px-4 rounded-full text-white bg-blue-500 hover:bg-blue-600"
            >
                {isLoading ? "กำลังย้าย..." : "ย้ายรถเข็น"}
            </button>
        </div>
    );
};

export default MoveTrolley;
