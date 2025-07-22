// src/api/historyService.js
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;

// ดึงข้อมูลสถิติน้ำหนักย้อนหลัง
export const getHistoricalData = async (hoursBack = 4) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/coldstorage/history/getWeightStats`, 
      { 
        params: { 
          hoursBack: hoursBack
        } 
      }
    );
    
    return response.data;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return []; // ส่งคืนอาร์เรย์ว่างในกรณีที่เกิดข้อผิดพลาด
  }
};