const net   = require("net");
const axios = require("axios");

const READER_IP   = "192.168.1.116";
const READER_PORT = 49152;
const API_HOST = process.env.API_HOST || process.env.DB_SERVER || "localhost";
const API_PORT = process.env.API_PORT || process.env.PORT || 3000;
// Prefer explicit API_BASE, else derive from env host/port
const API_BASE = process.env.API_BASE || `http://${API_HOST}:${API_PORT}/api`;

const DELAY_MS        = 60000;  // 1 นาที
const DUPLICATE_MS    = 5000;   // กัน tag ซ้ำ 5 วิ
const CLEANUP_TIMEOUT = 10 * 60 * 1000; // ลบ state 10 นาที

// =============================
// memory state
// =============================

const tagState = {};
const lastSeen = {};

// =============================
// API call
// =============================

async function callColdRoomStatus(epc, isCheckIn) {

  const stay_place = isCheckIn ? "เข้าห้องเย็น" : "ออกห้องเย็น";
  const dest       = isCheckIn ? "ห้องเย็น"     : "รอCheckin";

  try {

    const res = await axios.post(`${API_BASE}/rfid/coldroom`, {
      epc,
      stay_place,
      dest
    });

    console.log(`✅ API [${epc}] -> ${stay_place}`);

  } catch (err) {

    console.error("❌ API ERROR", err.message);

  }

}

// =============================
// Tag logic
// =============================

function onTagSeen(epc, io) {

  const now = Date.now();

  // --------------------------
  // anti duplicate filter
  // --------------------------

  if (lastSeen[epc] && now - lastSeen[epc] < DUPLICATE_MS) {
    return;
  }

  lastSeen[epc] = now;

  if (!tagState[epc]) {

    tagState[epc] = {
      status: 0,
      timer: null,
      lastActive: now
    };

  }

  const state = tagState[epc];

  state.lastActive = now;

  if (state.timer) {
    clearTimeout(state.timer);
  }

  // --------------------------
  // 1 minute logic
  // --------------------------

  state.timer = setTimeout(async () => {

    state.timer = null;

    state.status = state.status === 0 ? 1 : 0;

    const isCheckIn = state.status === 1;

    console.log(`⏱ ${epc} -> ${isCheckIn ? "CHECK IN" : "CHECK OUT"}`);

    io.emit("rfidColdRoom", {

      epc,
      action: isCheckIn ? "checkin" : "checkout",
      stay_place: isCheckIn ? "เข้าห้องเย็น" : "ออกห้องเย็น",
      timestamp: new Date().toISOString()

    });

    await callColdRoomStatus(epc, isCheckIn);

  }, DELAY_MS);

}

// =============================
// checksum command
// =============================

function buildCommand7C(hexString) {

  const buf = Buffer.from(hexString, "hex");

  let sum = 0;

  for (let i = 0; i < buf.length; i++) {
    sum += buf[i];
  }

  const checksum = ((~sum) + 1) & 0xff;

  return Buffer.concat([buf, Buffer.from([checksum])]);

}

// =============================
// RFID connect
// =============================

function connectRFID(io) {

  const client = new net.Socket();

  client.connect(READER_PORT, READER_IP, () => {

    console.log(`✅ RFID CONNECTED ${READER_IP}:${READER_PORT}`);

    const initCmd = buildCommand7C("7CFFFF823200D2");
    client.write(initCmd);

    setTimeout(() => {

      const startCmd = Buffer.from(
        "7CFFFF20000501000200C896",
        "hex"
      );

      client.write(startCmd);

      console.log("🚀 RFID START SCAN");

    }, 500);

  });

  client.on("data", (data) => {

    const hex = data.toString("hex").toUpperCase();

    if (hex.startsWith("CCFFFF82")) {

      console.log("📡 READER INIT");

    }

    else if (hex.startsWith("CCFFFF20") && hex.length >= 42) {

      const epc = hex.substring(18, 42);

      console.log("🎯 EPC", epc);

      onTagSeen(epc, io);

    }

  });

  client.on("error", (err) => {

    console.error("❌ RFID ERROR", err.message);

  });

  client.on("close", () => {

    console.log("⚠ RFID DISCONNECTED");

    setTimeout(() => {
      connectRFID(io);
    }, 5000);

  });

}

// =============================
// cleanup memory
// =============================

setInterval(() => {

  const now = Date.now();

  for (const epc in tagState) {

    if (now - tagState[epc].lastActive > CLEANUP_TIMEOUT) {

      console.log("🧹 CLEAN TAG", epc);

      if (tagState[epc].timer) {
        clearTimeout(tagState[epc].timer);
      }

      delete tagState[epc];
      delete lastSeen[epc];

    }

  }

}, 60000);

// =============================
// export module
// =============================

module.exports = (io) => {

  const express = require("express");
  const router  = express.Router();

  connectRFID(io);

  // =================================
  // API route
  // =================================

  router.post("/rfid/coldroom", async (req, res) => {

    const { epc, stay_place, dest } = req.body;

    if (!epc) {

      return res.status(400).json({
        success:false,
        message:"missing epc"
      });

    }

    try {

      const { connectToDatabase } = require("./database/db");

      const pool = await connectToDatabase();

      const tagResult = await pool.request()
      .input("epc", epc)
      .query(`
        SELECT tro_id
        FROM Trolley_tag
        WHERE rfid_id=@epc
      `);

      if (!tagResult.recordset.length) {

        return res.status(404).json({
          success:false,
          message:"trolley not found"
        });

      }

      const tro_id = tagResult.recordset[0].tro_id;

      const mapping = await pool.request()
      .input("tro_id", tro_id)
      .query(`
        SELECT TOP 1 mapping_id
        FROM TrolleyRMMapping
        WHERE tro_id=@tro_id
        ORDER BY mapping_id DESC
      `);

      if (!mapping.recordset.length) {

        return res.status(404).json({
          success:false,
          message:"mapping not found"
        });

      }

      const mapping_id = mapping.recordset[0].mapping_id;

      const now = new Date();

      await pool.request()
      .input("mapping_id", mapping_id)
      .input("now", now)
      .query(`

        UPDATE History
        SET
        come_cold_date_rfid =
        CASE
          WHEN come_cold_date_rfid IS NULL THEN @now
          ELSE come_cold_date_rfid
        END

        WHERE mapping_id=@mapping_id

      `);

      io.emit("trolleyColdRoom", {

        tro_id,
        mapping_id,
        stay_place,
        dest,
        timestamp: now.toISOString()

      });

      res.json({

        success:true,
        tro_id,
        mapping_id

      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success:false,
        error:err.message
      });

    }

  });

  return router;

};