// import React, { useEffect, useRef, useState } from "react";
// import axios from "axios";
// axios.defaults.withCredentials = true; 

// const API_URL = import.meta.env.VITE_API_URL; 


// const AutoFetchPage = () => {
//   const [allLineData, setAllLineData] = useState([]);
//   const [tableData, setTableData] = useState([]);
//   const [selectedLineId, setSelectedLineId] = useState(null);
//   const isFetchingRef = useRef(false);
//   // กำหนด array ของ line_id ทั้งหมด
//   const allLineIds = [
//     1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
//     11, 12, 13, 14, 15, 16, 18, 19, 20,
//     21, 22, 23, 24, 25, 26, 29, 30,
//     31, 32, 33, 34, 35, 36, 38, 39, 40,
//     41, 42, 44, 47, 48, 50,
//     51, 52, 53, 54, 55
//   ];
  
//   const fetchAllData = async () => {
//     if (isFetchingRef.current) return;
//     isFetchingRef.current = true;

//     try {
//       const CONCURRENT_LIMIT = 5;
//       const results = [];

//       for (let i = 0; i < allLineIds.length; i += CONCURRENT_LIMIT) {
//         const chunk = allLineIds.slice(i, i + CONCURRENT_LIMIT);
//         const chunkPromises = chunk.map(lineId =>
//           axios
//             .get(`${API_URL}/api/auto-fetch/pack/main/fetchRawMat/${lineId}`)
//             .then((res) => (res.data.success ? res.data.data : []))
//             .catch(() => [])
//         );
//         const chunkResults = await Promise.all(chunkPromises);
//         results.push(...chunkResults.flat());
//         await new Promise((r) => setTimeout(r, 200));
//       }

//       setAllLineData(results);

//       if (selectedLineId) {
//         setTableData(results.filter((item) => item.line_id == selectedLineId));
//       } else {
//         setTableData(results);
//       }
//     } catch (err) {
//       console.error("Error fetching:", err);
//     } finally {
//       isFetchingRef.current = false;
//     }
//   };

//   // เรียก fetch ครั้งแรก
//   useEffect(() => {
//     fetchAllData();
//   }, []);

//   // Polling ทุก 30 วิ
//   useEffect(() => {
//     let interval;

//     const startPolling = () => {
//       interval = setInterval(fetchAllData, 200000);
//     };

//     const stopPolling = () => clearInterval(interval);

//     const handleVisibility = () => {
//       if (document.visibilityState === "visible") {
//         startPolling();
//         fetchAllData();
//       } else {
//         stopPolling();
//       }
//     };

//     document.addEventListener("visibilitychange", handleVisibility);
//     startPolling();

//     return () => {
//       stopPolling();
//       document.removeEventListener("visibilitychange", handleVisibility);
//     };
//   }, []);

//   return (
//     <div style={{ padding: 20 }}>
//       <h2>📦 Real-time Raw Material Data</h2>

//       <select
//         value={selectedLineId || ""}
//         onChange={(e) => setSelectedLineId(e.target.value || null)}
//       >
//         <option value="">🔍 เลือกไลน์ทั้งหมด</option>
//         {allLineIds.map((id) => (
//           <option key={id} value={id}>
//             Line {id}
//           </option>
//         ))}
//       </select>

//       <table border="1" cellPadding="6" style={{ marginTop: 20, width: "100%" }}>
//         <thead>
//           <tr>
//             <th>Line ID</th>
//             <th>Material</th>
//             <th>Qty</th>
//             {/* เพิ่ม column ได้ตามต้องการ */}
//           </tr>
//         </thead>
//         <tbody>
//           {tableData.map((row, i) => (
//             <tr key={i}>
//               <td>{row.line_id}</td>
//               <td>{row.material_name}</td>
//               <td>{row.qty}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default AutoFetchPage;
