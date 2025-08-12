const { connectToDatabase } = require("./database/db"); 
const cron = require("node-cron");

async function resetRSRV() {
  try {
    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .query(`
        UPDATE [dbo].[Trolley]
        SET tro_status = '1', rsrv_timestamp = NULL
        WHERE tro_status = 'rsrv'
          AND DATEDIFF(MINUTE, rsrv_timestamp, GETDATE()) > 1;
      `);

    const rowsAffected = result.rowsAffected[0];
    const time = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

    if (rowsAffected > 0) {
      console.log(`[${time}] ✅ เคลียร์ RSRV แล้ว ${rowsAffected} รายการ`);
    } else {
      console.log(`[${time}] ✅ ไม่มีรายการค้าง`);
    }
  } catch (err) {
    const time = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    console.error(`[${time}] ❌ เกิดข้อผิดพลาด: ${err.message}`);
  }
}

// รันทันทีตอนเปิด
resetRSRV();

// รันทุก 1 นาที
cron.schedule("* * * * *", resetRSRV);

