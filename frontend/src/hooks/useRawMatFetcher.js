
import { useRef } from "react";
import axios from "axios";
axios.defaults.withCredentials = true; 

const API_URL = import.meta.env.VITE_API_URL;
  // กำหนด array ของ line_id ทั้งหมด
  const allLineIds = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 44, 45, 46, 47, 48, 49, 50,
    51, 52, 53, 54, 55
  ];
export const useRawMatFetcher = () => {
  const isFetchingRef = useRef(false);

  const fetchAllData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    console.log("🚀 กำลังดึงรีเฟรชข้อมูลรถเข็น...");

    try {
      const CONCURRENT_LIMIT = 5;
      const results = [];

      for (let i = 0; i < allLineIds.length; i += CONCURRENT_LIMIT) {
        const chunk = allLineIds.slice(i, i + CONCURRENT_LIMIT);
        const chunkPromises = chunk.map((lineId) =>
          axios
        .get(`${API_URL}/api/auto-fetch/pack/main/fetchRawMat/${lineId}`)
            .then((res) => (res.data.success ? res.data.data : []))
            .catch(() => [])
        );
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.flat());
        await new Promise((r) => setTimeout(r, 200));
      }

      console.log("✅ รีเฟรชข้อมูลรถเข็นสำเร็จ:", results.length);
    } catch (error) {
      console.error("❌ รีเฟรชข้อมูลรถเข็นล้มเหลว:", error);
    } finally {
      isFetchingRef.current = false;
    }
  };

  return { fetchAllData };
};
