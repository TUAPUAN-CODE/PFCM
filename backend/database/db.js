const mssql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: 1433,
  options: {
    encrypt: true, // สำหรับ Azure
    trustServerCertificate: true, // สำหรับ local dev
  },
  pool: {
    max: 2000,
    min: 20,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

const connectToDatabase = async (retryCount = 1, delayMs = 3000) => {
  if (pool && pool.connected) {
    console.log("🔄 Using existing DB connection pool");
    return pool;
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`🔌 Connecting to MSSQL... (Attempt ${attempt}/${retryCount})`);
      pool = await mssql.connect(dbConfig);

      // ตรวจสอบว่า pool ทำงานจริง
      if (!pool.connected) throw new Error("Pool connected is false");

      console.log('✅ Database connection successful!');
      return pool;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      if (attempt < retryCount) {
        console.log(`⏳ Retrying in ${delayMs / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        console.error("❌ All retry attempts failed. Backend will start without DB.");
        // ไม่ process.exit เพื่อให้ backend ยังรันได้ (เช่น /health, Swagger)
        return null;
      }
    }
  }
};

module.exports = {
  connectToDatabase,
  sql: mssql,
};
