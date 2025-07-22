const axios = require("axios");

const API_URL = process.env.API_URL || "http://10.53.61.97:3000";

const allLineIds = [
   7, 8, 10, 12, 18, 19, 20, 21, 23, 24, 30, 32, 33, 34,  40, 41, 48, 57, 13, 15,68
];

let latestData = [];

const fetchAllData = async () => {
  console.log(`[${new Date().toISOString()}] ⏳ Auto-fetching...`);
  try {
    const CONCURRENT_LIMIT = 5;
    const results = [];

    for (let i = 0; i < allLineIds.length; i += CONCURRENT_LIMIT) {
      const chunk = allLineIds.slice(i, i + CONCURRENT_LIMIT);
      const chunkPromises = chunk.map(lineId =>
        axios
          .get(`${API_URL}/api/auto-fetch/pack/main/fetchRawMat/${lineId}`)
          .then(res => (res.data.success ? res.data.data : []))
          .catch(() => [])
      );

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.flat());
      await new Promise((r) => setTimeout(r, 200));
    }

    latestData = results;
    console.log(`✅ Updated ${results.length} items`);

  } catch (err) {
    console.error("❌ Auto-fetch error:", err.message);
  }
};

// เรียกครั้งแรก + ตั้ง interval
fetchAllData();
setInterval(fetchAllData, 10000); 

// ส่งออกข้อมูล
module.exports = {
  getLatestData: () => latestData,
};
