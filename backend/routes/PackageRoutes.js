module.exports = (io) => {
  const express = require("express");
  const { connectToDatabase } = require("../database/db");
  const sql = require("mssql");
  const { Line } = require("recharts");
  const router = express.Router();
  const multer = require('multer');
  const upload = multer({ storage: multer.memoryStorage() });



  // ─────────────────────────────────────────────────────────
  // ✅ Pool Singleton — สร้างครั้งเดียว ใช้ซ้ำ
  //    แก้ปัญหา: getPool() ทุก request ทำให้ connection ไม่เสถียร
  // ─────────────────────────────────────────────────────────
  let _pool = null;
  let _poolPromise = null;

  async function getPool() {
    // มี pool และยัง connected → ใช้เลย
    if (_pool && _pool.connected) {
      return _pool;
    }

    // กำลัง connect อยู่ → รอ promise เดิม (ป้องกัน race condition)
    if (_poolPromise) {
      return _poolPromise;
    }

    // สร้าง pool ใหม่
    _poolPromise = connectToDatabase()
      .then(pool => {
        _pool = pool;
        _poolPromise = null;

        // ✅ reset pool เมื่อ error → จะสร้างใหม่ครั้งหน้า
        pool.on('error', (err) => {
          console.error('❌ SQL Pool error:', err.message);
          _pool = null;
          _poolPromise = null;
        });

        return pool;
      })
      .catch(err => {
        _poolPromise = null;
        throw err;
      });

    return _poolPromise;
  }

  // ─────────────────────────────────────────────────────────
  // ✅ withRetry — retry สูงสุด 3 ครั้ง เมื่อ connection ล้มเหลว
  // ─────────────────────────────────────────────────────────
  async function withRetry(fn, retries = 3, delayMs = 500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        console.error(`❌ Attempt ${attempt}/${retries} failed:`, err.message);

        // connection error → reset pool ให้สร้างใหม่ครั้งหน้า
        if (['ECONNRESET', 'ESOCKET', 'ECONNREFUSED', 'ETIMEOUT'].includes(err.code)) {
          _pool = null;
          _poolPromise = null;
        }

        if (attempt === retries) throw err;

        // รอก่อน retry (500ms, 1000ms, 1500ms)
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }


  // เชื่อมต่อฐานข้อมูล
  // async function getPool() {
  //   return await connectToDatabase();
  // }

  //ใช้ชั่วคราว
  // Function to calculate delay time based on the provided logic
  function calculateDelayTime(item) {
    // Helper functions from your provided code
    const parseTimeValue = (timeStr) => {
      if (!timeStr || timeStr === '-') return null;
      const timeParts = timeStr.split('.');
      const hours = parseInt(timeParts[0], 10);
      const minutes = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
      return hours * 60 + minutes;
    };

    const calculateTimeDifference = (dateString) => {
      if (!dateString || dateString === '-') return 0;
      const effectiveDate = new Date(dateString);
      const currentDate = new Date();
      const diffInMinutes = (currentDate - effectiveDate) / (1000 * 60);
      return diffInMinutes > 0 ? diffInMinutes : 0;
    };

    const getLatestColdRoomExitDate = (item) => {
      if (item.out_cold_date_three && item.out_cold_date_three !== '-') {
        return item.out_cold_date_three;
      } else if (item.out_cold_date_two && item.out_cold_date_two !== '-') {
        return item.out_cold_date_two;
      } else if (item.out_cold_date && item.out_cold_date !== '-') {
        return item.out_cold_date;
      }
      return '-';
    };

    // Main calculation logic
    const latestColdRoomExitDate = getLatestColdRoomExitDate(item);

    let referenceDate = null;
    let remainingTimeValue = null;
    let standardTimeValue = null;
    let usedField = '';

    // Scenario 1: Cold room history exists and no rework
    if ((latestColdRoomExitDate !== '-') &&
      (!item.remaining_rework_time || item.remaining_rework_time === '-')) {
      referenceDate = latestColdRoomExitDate;
      remainingTimeValue = parseTimeValue(item.remaining_ctp_time);
      standardTimeValue = parseTimeValue(item.standard_ctp_time);
      usedField = 'remaining_ctp_time';
    }
    // Scenario 2: No cold room history and no rework
    else if ((latestColdRoomExitDate === '-') &&
      (!item.remaining_rework_time || item.remaining_rework_time === '-')) {
      referenceDate = item.rmit_date;
      remainingTimeValue = parseTimeValue(item.remaining_ptp_time);
      standardTimeValue = parseTimeValue(item.standard_ptp_time);
      usedField = 'remaining_ptp_time';
    }
    // Scenario 3: Rework case
    else if (item.remaining_rework_time && item.remaining_rework_time !== '-') {
      referenceDate = item.qc_date;
      remainingTimeValue = parseTimeValue(item.remaining_rework_time);
      standardTimeValue = parseTimeValue(item.standard_rework_time);
      usedField = 'remaining_rework_time';
    }
    // Scenario 4: Cold room history exists and rework
    else if ((latestColdRoomExitDate !== '-') &&
      item.remaining_rework_time && item.remaining_rework_time !== '-') {
      referenceDate = latestColdRoomExitDate;
      remainingTimeValue = parseTimeValue(item.remaining_rework_time);
      standardTimeValue = parseTimeValue(item.standard_rework_time);
      usedField = 'remaining_rework_time';
    }

    // If we couldn't determine the scenario or don't have enough data
    if (!referenceDate || (remainingTimeValue === null && standardTimeValue === null)) {
      return {
        formattedDelayTime: '0.00',
        usedField: null
      };
    }

    // Calculate elapsed time from reference date
    const elapsedMinutes = calculateTimeDifference(referenceDate);

    // Calculate remaining time
    let timeRemaining;
    if (remainingTimeValue !== null) {
      timeRemaining = remainingTimeValue - elapsedMinutes;
    } else if (standardTimeValue !== null) {
      timeRemaining = standardTimeValue - elapsedMinutes;
    } else {
      timeRemaining = 0;
    }

    // Format the delay time as requested (-1.56 means overdue by 1 hour 56 minutes)
    const isNegative = timeRemaining < 0;
    const absoluteTimeRemaining = Math.abs(timeRemaining);

    const hours = Math.floor(absoluteTimeRemaining / 60);
    const minutes = Math.floor(absoluteTimeRemaining % 60);

    // Add minus sign if overdue
    const sign = isNegative ? '-' : '';
    const formattedDelayTime = `${sign}${hours}.${minutes.toString().padStart(2, '0')}`;

    return {
      formattedDelayTime,
      usedField
    };
  }


  //คำนวณหา Dalay time
  const calculateDelayTimeSurplus = (params) => {
    const {
      remaining_ctp_time,
      standard_ctp_time,
      remaining_ptp_time,
      standard_ptp_time,
      remaining_rework_time,
      standard_rework_time,
      remaining_mix_time,
      qc_date,
      rmit_date,
      out_cold_date,
      out_cold_date_two,
      out_cold_date_three,
      rework_date,
      mixed_date
    } = params;

    const currentTime = new Date();
    let delayTime = 0;
    let fieldToUpdate = '';

    // Helper function to convert date strings to Date objects safely
    const safeParseDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    // Helper function to get latest date from an array of dates
    const getLatestDate = (...dates) => {
      const validDates = dates.filter(date => date !== null);
      if (validDates.length === 0) return null;
      return new Date(Math.max(...validDates.map(date => date.getTime())));
    };

    // Helper function to calculate time difference in hours (as decimal)
    const calculateTimeDiff = (startDate, endDate) => {
      if (!startDate || !endDate) return 0;
      const diffMs = endDate - startDate;
      const diffHrs = diffMs / (1000 * 60 * 60);
      return parseFloat(diffHrs.toFixed(2));
    };

    // Format time to match the required format (h.mm)
    const formatTime = (timeInHours) => {
      // แก้ไขฟังก์ชันเพื่อคำนวณค่าติดลบอย่างถูกต้อง
      const isNegative = timeInHours < 0;
      const absHours = Math.abs(timeInHours);

      // แยกส่วนชั่วโมงและนาที
      const hours = Math.floor(absHours);
      const minutesDecimal = (absHours - hours) * 60;
      const minutes = Math.round(minutesDecimal);

      // สร้างรูปแบบ h.mm
      let formattedValue;
      if (minutes === 60) {
        // กรณีปัดเศษแล้วได้ 60 นาที ให้เพิ่มชั่วโมงแทน
        formattedValue = (hours + 1) + ".00";
      } else {
        formattedValue = hours + "." + minutes.toString().padStart(2, '0');
      }

      // เติมเครื่องหมายลบหากเป็นค่าติดลบ
      return parseFloat(isNegative ? "-" + formattedValue : formattedValue);
    };

    // Parse all dates
    const qcDateTime = safeParseDate(qc_date);
    const rmitDateTime = safeParseDate(rmit_date);
    const outColdDateTime = safeParseDate(out_cold_date);
    const outColdDateTime2 = safeParseDate(out_cold_date_two);
    const outColdDateTime3 = safeParseDate(out_cold_date_three);
    const reworkDateTime = safeParseDate(rework_date);
    const mixedDateTime = safeParseDate(mixed_date);

    // Get latest out cold date
    const latestOutColdDate = getLatestDate(outColdDateTime, outColdDateTime2, outColdDateTime3);

    // Case 4: Check for Mix time first (highest priority for mixed materials)
    if (remaining_mix_time !== null && remaining_mix_time < 2 && mixedDateTime) {
      console.log("วันที่ผสม :", mixedDateTime);
      console.log("วันที่ปัจจุบัน :", currentTime);
      const elapsedTime = calculateTimeDiff(mixedDateTime, currentTime);
      console.log("เวลาที่ใช้ไป :", elapsedTime);
      delayTime = remaining_mix_time - elapsedTime;
      console.log("delayTime :", delayTime);
      fieldToUpdate = 'mix_time';
    }
    // Case 3: Check for Rework time
    else if (remaining_rework_time !== null) {
      // Use the latest of QC date or latest out_cold_date
      const referenceDate = getLatestDate(qcDateTime, latestOutColdDate);
      console.log("วันที่ออกห้องเย็น :", latestOutColdDate);
      console.log("วันที่ Qc :", qcDateTime);
      console.log("วันที่ออกห้องเย็น || Qc (วัตถุดิบแก้ไข) :", referenceDate);
      console.log("วันที่ปัจจุบัน :", currentTime);
      if (referenceDate) {
        const elapsedTime = calculateTimeDiff(referenceDate, currentTime);
        console.log("เวลาที่ใช้ไป :", elapsedTime);
        delayTime = remaining_rework_time - elapsedTime;
        console.log("delayTime :", delayTime);
        fieldToUpdate = 'rework_time';
      }
    }
    // Case 1: Check for Cold to Pack time
    else if (latestOutColdDate) {
      console.log("วันที่ออกห้องเย็นล่าสุด :", latestOutColdDate);
      console.log("วันที่ปัจจุบัน :", currentTime);
      const elapsedTime = calculateTimeDiff(latestOutColdDate, currentTime);
      console.log("เวลาที่ใช้ไป :", elapsedTime);

      // Use remaining time if available, otherwise use standard time
      const timeToUse = remaining_ctp_time !== null ? remaining_ctp_time : standard_ctp_time;
      delayTime = timeToUse - elapsedTime;
      console.log("delayTime :", delayTime);

      fieldToUpdate = 'cold_to_pack_time';
    }
    // Case 2: Use Prep to Pack time if no out_cold_date
    else if (rmitDateTime) {
      console.log("วันที่เตรียมเสร็จ :", rmitDateTime);
      console.log("วันที่ปัจจุบัน :", currentTime);
      const elapsedTime = calculateTimeDiff(rmitDateTime, currentTime);
      console.log("เวลาที่ใช้ไป :", elapsedTime);
      // Use remaining time if available, otherwise use standard time
      const timeToUse = remaining_ptp_time !== null ? remaining_ptp_time : standard_ptp_time;
      delayTime = timeToUse - elapsedTime;
      console.log("delayTime :", delayTime);
      fieldToUpdate = 'prep_to_pack_time';
    }

    // Format the delay time to h.mm format
    const formattedDelayTime = formatTime(delayTime);

    return {
      delayTime: delayTime,
      formattedDelayTime: formattedDelayTime,
      fieldToUpdate: fieldToUpdate
    };
  };

  module.exports = {
    calculateDelayTime
  };

  // -----------------------[ PACKAGING ]-----------------------
  /**
   * @swagger
   * /api/linetype:
   *    get:
   *      summary: แสดงประเภทไลน์ผลิต
   *      tags:
   *          - packaging
   *      responses:
   *        200:
   *          description: Successfull response
   *        500:
   *          description: Internal server error
   */
  // Select ข้อมูลแสดงประเภทไลน์ผลิตทั้งหมดของพนักงานบรรจุ
  router.get("/linetype", async (req, res) => {
    try {
      const pool = await getPool();
      if (!pool) {
        return res
          .status(500)
          .json({ success: false, error: "Database connection failed" });
      }
      const result = await pool.request().query(`
          SELECT
            line_type_id,
            line_type_name
          FROM
            LineType
        `);

      const data = result.recordset;

      if (!data.length) {
        return res
          .status(404)
          .json({ success: false, message: "No matching data found!" });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        details: error.message,
      });
    }
  });

  // router.put("/checkin/pack", async (req, res) => {
  //   const transaction = new sql.Transaction();

  //   try {
  //     const { tro_id, operator } = req.body;

  //     if (!tro_id) {
  //       return res.status(400).json({ error: "tro_id is required" });
  //     }

  //     const pool = await connectToDatabase();
  //     transaction.connection = pool;
  //     await transaction.begin();

  //     // 🔍 ดึงข้อมูลจาก TrolleyRMMapping + History
  //     const dataResult = await new sql.Request(transaction)
  //       .input("tro_id", tro_id)
  //       .query(`
  //       SELECT 
  //         trm.mapping_id,
  //         trm.rm_status AS สถานะวัตถุดิบ,
  //         h.withdraw_date AS เวลาเบิกจากห้องเย็นใหม่,
  //         h.cooked_date AS เวลาดึงเสร็จ_อบเสร็จ,
  //         h.rmit_date AS เวลาเตรียมเสร็จ
  //       FROM TrolleyRMMapping trm
  //       LEFT JOIN History h ON trm.mapping_id = h.mapping_id
  //       WHERE trm.tro_id = @tro_id
  //     `);

  //     if (dataResult.recordset.length === 0) {
  //       throw new Error(`ไม่พบข้อมูล tro_id: ${tro_id}`);
  //     }

  //     const displayData = dataResult.recordset[0];

  //     // 1. Update TrolleyRMMapping → dest = 'บรรจุ'
  //     const updateMappingResult = await new sql.Request(transaction)
  //       .input("tro_id", tro_id)
  //       .query(`
  //       UPDATE TrolleyRMMapping
  //       SET 
  //         dest = N'บรรจุ',
  //         tro_id = null
  //       WHERE tro_id = @tro_id
  //     `);

  //     if (updateMappingResult.rowsAffected[0] === 0) {
  //       throw new Error("No data updated in TrolleyRMMapping");
  //     }

  //     // 2. Update Trolley status
  //     await new sql.Request(transaction)
  //       .input("tro_id", tro_id)
  //       .query(`
  //       UPDATE Trolley
  //       SET tro_status = 1
  //       WHERE tro_id = @tro_id
  //     `);

  //     await transaction.commit();

  //     const payload = {
  //       message: "นำวัตถุดิบออกจากห้องเย็นไปบรรจุเรียบร้อย",
  //       tro_id,
  //       operator,
  //       historyData: {
  //         สถานะวัตถุดิบ: displayData.สถานะวัตถุดิบ,
  //         เวลาเบิกจากห้องเย็นใหม่: displayData.เวลาเบิกจากห้องเย็นใหม่,
  //         เวลาดึงเสร็จ_อบเสร็จ: displayData.เวลาดึงเสร็จ_อบเสร็จ,
  //         เวลาเตรียมเสร็จ: displayData.เวลาเตรียมเสร็จ
  //       },
  //       updatedAt: new Date()
  //     };

  //     io.to("saveRMForProdRoom").emit("dataUpdated", payload);
  //     io.to("QcCheckRoom").emit("dataUpdated", payload);

  //     res.status(200).json(payload);

  //   } catch (error) {
  //     await transaction.rollback();
  //     console.error("checkin/pack error:", error);
  //     res.status(500).json({ error: error.message });
  //   }
  // });

  router.put("/checkin/pack", async (req, res) => {
    const transaction = new sql.Transaction();


    try {
      const { tro_id, operator } = req.body;


      if (!tro_id) {
        return res.status(400).json({ error: "tro_id is required" });
      }


      const pool = await connectToDatabase();
      transaction.connection = pool;
      await transaction.begin();


      // ✅ STEP 1: ดึง mapping ทั้งหมดของ trolley
      const mappingResult = await new sql.Request(transaction)
        .input("tro_id", tro_id)
        .query(`
        SELECT mapping_id
        FROM TrolleyRMMapping
        WHERE tro_id = @tro_id
      `);


      const mappings = mappingResult.recordset;


      if (!mappings.length) {
        throw new Error("No mapping found for this trolley");
      }


      // ✅ STEP 2: loop update History ทีละ mapping
      for (const m of mappings) {
        await new sql.Request(transaction)
          .input("mapping_id", m.mapping_id)
          .query(`
          UPDATE History
          SET pack_checkin_date = GETDATE()
          WHERE mapping_id = @mapping_id
        `);
      }


      // ✅ 3. Update TrolleyRMMapping → dest = 'บรรจุ'
      const updateMappingResult = await new sql.Request(transaction)
        .input("tro_id", tro_id)
        .query(`
        UPDATE TrolleyRMMapping
        SET
          dest = N'บรรจุ',
          tro_id = NULL
        WHERE tro_id = @tro_id
      `);


      if (updateMappingResult.rowsAffected[0] === 0) {
        throw new Error("No data updated in TrolleyRMMapping");
      }


      // ✅ 4. Update Trolley status
      await new sql.Request(transaction)
        .input("tro_id", tro_id)
        .query(`
        UPDATE Trolley
        SET tro_status = 1
        WHERE tro_id = @tro_id
      `);


      await transaction.commit();


      const payload = {
        message: "นำวัตถุดิบออกจากห้องเย็นไปบรรจุเรียบร้อย",
        tro_id,
        operator,
        updatedAt: new Date()
      };


      io.to("saveRMForProdRoom").emit("dataUpdated", payload);
      io.to("QcCheckRoom").emit("dataUpdated", payload);


      res.status(200).json(payload);


    } catch (error) {
      await transaction.rollback();
      console.error("checkin/pack error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/delete/mixpack', async (req, res) => {
    const { mapping_id } = req.body;
    const sql = require("mssql");

    console.log("=== SOFT DELETE MIXPACK REQUEST ===");
    console.log("mapping_id:", mapping_id);

    // ===============================
    // Validation
    // ===============================
    if (!mapping_id) {
      return res.status(400).json({
        success: false,
        message: "ต้องระบุ mapping_id"
      });
    }

    let transaction;

    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // ===============================
      // 1) ตรวจสอบว่า mapping_id มีอยู่จริง
      // ===============================
      const checkResult = await transaction.request()
        .input('mapping_id', sql.Int, parseInt(mapping_id))
        .query(`
        SELECT 
          trm.mapping_id,
          trm.rmfp_id,
          trm.weight_RM,
          rmf.hist_id_rmfp,
          rmf.batch, 
          rm.mat,
          rm.mat_name
        FROM TrolleyRMMapping trm
        LEFT JOIN RMForProd rmf ON trm.rmfp_id = rmf.rmfp_id
        LEFT JOIN ProdRawMat pr ON trm.tro_production_id = pr.prod_rm_id
        LEFT JOIN RawMat rm ON pr.mat = rm.mat
        WHERE trm.mapping_id = @mapping_id
      `);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `ไม่พบข้อมูล mapping_id: ${mapping_id}`
        });
      }

      const mappingData = checkResult.recordset[0];
      const rmfp_id = mappingData.rmfp_id;

      console.log("📋 ข้อมูลที่จะอัปเดตสถานะ:");
      console.log("  - Material:", mappingData.mat, mappingData.mat_name);
      console.log("  - mapping_id:", mapping_id);
      console.log("  - rmfp_id:", rmfp_id);
      console.log("  - weight_RM:", mappingData.weight_RM, "กก.");

      // ===============================
      // 2) ดึงรายการวัตถุดิบที่ถูกผสม (เพื่อแสดงข้อมูล)
      // ===============================
      const mixPeckResult = await transaction.request()
        .input('rmfp_id', sql.Int, rmfp_id)
        .query(`
        SELECT mapping_id 
        FROM RM_MixPeck 
        WHERE rmfp_id = @rmfp_id
      `);

      const mixedMaterials = mixPeckResult.recordset;
      console.log(`📦 พบวัตถุดิบที่ถูกผสม ${mixedMaterials.length} รายการ`);

      // ===============================
      // 3) อัปเดตสถานะแทนการลบ (Soft Delete)
      // ===============================
      const updateTrolley = await transaction.request()
        .input('mapping_id', sql.Int, parseInt(mapping_id))
        .query(`
        UPDATE TrolleyRMMapping
        SET stay_place = 'ผสมบรรจุลบจากปุ่มเคลียร์',
            dest = 'ผสมบรรจุลบจากปุ่มเคลียร์'
        WHERE mapping_id = @mapping_id
      `);

      if (updateTrolley.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "ไม่สามารถอัปเดตสถานะได้ (ไม่พบ mapping_id)"
        });
      }

      console.log("  ✅ อัปเดตสถานะ TrolleyRMMapping เรียบร้อย");

      // ===============================
      // 4) Commit Transaction
      // ===============================
      await transaction.commit();
      console.log("✅ Transaction committed successfully");

      // ===============================
      // 5) ส่งผลลัพธ์กลับ
      // ===============================
      res.json({
        success: true,
        message: 'อัปเดตสถานะเรียบร้อยแล้ว (ไม่ได้ลบข้อมูล)',
        data: {
          updated_mapping_id: parseInt(mapping_id),
          rmfp_id: rmfp_id,
          material: `${mappingData.mat} (${mappingData.mat_name})`,
          weight: mappingData.weight_RM,
          materials_count: mixedMaterials.length,
          new_status: 'ลบโดย Mixpack'
        }
      });

    } catch (err) {
      if (transaction) {
        await transaction.rollback();
        console.log("❌ Transaction rolled back");
      }
      console.error('❌ Update error:', err);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ",
        error: err.message
      });
    }
  });

  router.post("/pack/manage/insert", async (req, res) => {
    const {
      mat,
      batch,
      productId,
      line_name,
      groupId,
      weight,
      operator,
      datetime: receiveDT,
      Dest,
      level_eu,
      hu,
      selectedMaterials,
      // ⭐ เพิ่มการรับข้อมูลใหม่
      cookedTime,
      preparedTime,
      mixtime,  // เพิ่ม mixtime สำหรับเวลาเริ่มผสม
      numberOfTrays,
      gravyTime,
      processType  // ✅ รับค่ามา แต่ไม่ INSERT ลงฐานข้อมูล
    } = req.body;

    console.log("=== RECEIVED PAYLOAD ===");
    console.log("selectedMaterials:", JSON.stringify(selectedMaterials, null, 2));
    console.log("batch:", batch);
    console.log("cookedTime:", cookedTime);
    console.log("preparedTime:", preparedTime);
    console.log("mixtime:", mixtime);
    console.log("numberOfTrays:", numberOfTrays);
    console.log("processType:", processType);  // ✅ แสดงค่าใน log
    console.log("========================");

    // ⭐ ฟังก์ชันแปลงวันที่ให้เป็นรูปแบบที่ SQL Server รองรับ
    const formatDateTimeForSQL = (dateTimeStr) => {
      if (!dateTimeStr) return null;

      try {
        // ถ้าเป็นรูปแบบ YYYY-MM-DD HH:mm:ss อยู่แล้ว ให้ใช้เลย
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateTimeStr)) {
          return dateTimeStr;
        }

        // ถ้าเป็น ISO string หรือรูปแบบอื่น ให้แปลง
        const date = new Date(dateTimeStr);

        // ตรวจสอบว่าวันที่ valid หรือไม่
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date: ${dateTimeStr}`);
          return null;
        }

        // แปลงเป็น YYYY-MM-DD HH:mm:ss
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      } catch (error) {
        console.error("Error formatting date:", error);
        return null;
      }
    };

    // แปลงวันที่ทั้งหมด
    const formattedCookedTime = formatDateTimeForSQL(cookedTime);
    const formattedPreparedTime = formatDateTimeForSQL(preparedTime);
    const formattedMixtime = formatDateTimeForSQL(mixtime);
    const formattedGravyTime = formatDateTimeForSQL(gravyTime);  // ✅ เพิ่มตรงนี้

    console.log("=== FORMATTED DATES ===");
    console.log("formattedCookedTime:", formattedCookedTime);
    console.log("formattedPreparedTime:", formattedPreparedTime);
    console.log("formattedMixtime:", formattedMixtime);
    console.log("========================");

    // ===============================
    // Validation
    // ===============================
    if (!mat || !batch || !weight) {
      return res.status(400).json({
        success: false,
        message: "ข้อมูล mat, batch, weight ต้องระบุ"
      });
    }

    if (!productId || !line_name) {
      return res.status(400).json({
        success: false,
        message: "ต้องระบุ productId และ line_name"
      });
    }

    if (!Array.isArray(groupId) || groupId.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ไม่มีข้อมูล groupId"
      });
    }

    if (!Array.isArray(selectedMaterials) || selectedMaterials.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ไม่มีข้อมูล selectedMaterials"
      });
    }

    // ⭐ เพิ่มการ validate ข้อมูลใหม่ (ใช้ formatted แทน)
    if (!formattedPreparedTime) {
      return res.status(400).json({
        success: false,
        message: "ต้องระบุวันที่เตรียมเสร็จ (preparedTime) ที่ถูกต้อง"
      });
    }

    if (!formattedMixtime) {
      return res.status(400).json({
        success: false,
        message: "ต้องระบุเวลาเริ่มผสม (mixtime) ที่ถูกต้อง"
      });
    }

    if (!numberOfTrays || isNaN(parseInt(numberOfTrays))) {
      return res.status(400).json({
        success: false,
        message: "ต้องระบุจำนวนถาดที่ถูกต้อง (numberOfTrays)"
      });
    }

    if (!processType) {
      return res.status(400).json({
        success: false,
        message: "ต้องระบุประเภทการแปรรูป (processType)"
      });
    }

    let transaction;

    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      // ===============================
      // ⭐ 0) อัปเดตน้ำหนักคงเหลือก่อน
      // ===============================
      console.log("=== UPDATING WEIGHTS ===");

      for (const material of selectedMaterials) {
        if (!material.mapping_id || !material.weight) {
          console.warn("⚠️ ข้ามรายการที่ไม่มี mapping_id หรือ weight:", material);
          continue;
        }

        // ตรวจสอบน้ำหนักคงเหลือก่อน
        const checkRequest = transaction.request();
        checkRequest.input("mapping_id", parseInt(material.mapping_id));

        const checkResult = await checkRequest.query(`
    SELECT weight_RM, mat = (
      SELECT rm.mat 
      FROM ProdRawMat pr
      JOIN RawMat rm ON pr.mat = rm.mat
      WHERE pr.prod_rm_id = TrolleyRMMapping.tro_production_id
    )
    FROM TrolleyRMMapping 
    WHERE mapping_id = @mapping_id
  `);

        if (checkResult.recordset.length === 0) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: `ไม่พบข้อมูล mapping_id: ${material.mapping_id}`
          });
        }

        const currentWeight = checkResult.recordset[0].weight_RM;
        const materialCode = checkResult.recordset[0].mat;

        console.log(`  - mapping_id ${material.mapping_id} (${materialCode}): น้ำหนักปัจจุบัน ${currentWeight} กก., ต้องการใช้ ${material.weight} กก.`);

        if (currentWeight < material.weight) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `น้ำหนักคงเหลือไม่เพียงพอสำหรับ ${materialCode} (mapping_id: ${material.mapping_id})\nน้ำหนักคงเหลือ: ${currentWeight} กก.\nต้องการใช้: ${material.weight} กก.`
          });
        }

        // อัปเดตน้ำหนักคงเหลือ
        const updateRequest = transaction.request();
        updateRequest.input("mapping_id", parseInt(material.mapping_id));
        updateRequest.input("weight_used", parseFloat(material.weight));

        const updateResult = await updateRequest.query(`
    UPDATE TrolleyRMMapping
    SET weight_RM = weight_RM - @weight_used
    OUTPUT 
      DELETED.weight_RM as old_weight,
      INSERTED.weight_RM as new_weight,
      INSERTED.mapping_id
    WHERE mapping_id = @mapping_id
  `);

        if (updateResult.recordset.length > 0) {
          const result = updateResult.recordset[0];
          console.log(`  ✅ อัปเดต mapping_id ${result.mapping_id}: ${result.old_weight} → ${result.new_weight} กก. (ใช้ไป ${material.weight} กก.)`);
        }
      }

      console.log("✅ อัปเดตน้ำหนักทั้งหมดเรียบร้อย");
      console.log("========================");

      // ===============================
      // 1) ดึง prod_rm_id
      // ===============================
      const prodResult = await transaction.request()
        .input("productId", productId)
        .input("mat", mat)
        .query(`
        SELECT prod_rm_id
        FROM ProdRawMat
        WHERE prod_Id = @productId
          AND mat = @mat
      `);

      if (prodResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "ไม่พบ prod_rm_id สำหรับ product และ material นี้"
        });
      }

      const prod_rm_id = prodResult.recordset[0].prod_rm_id;

      // ===============================
      // 2) ดึง withdraw_date
      // ===============================
      const fromMappingIds = selectedMaterials
        .map(m => m.mapping_id)
        .filter(id => id != null && id !== undefined && id !== '' && !isNaN(id));

      console.log("✅ Filtered mapping IDs:", fromMappingIds);

      let withdraw_date = null;

      if (fromMappingIds.length > 0) {
        try {
          const request = transaction.request();
          const placeholders = fromMappingIds.map((id, index) => {
            request.input(`p${index}`, parseInt(id));
            return `@p${index}`;
          }).join(',');

          const sqlQuery = `
          SELECT MIN(his.withdraw_date) AS withdraw_date
          FROM TrolleyRMMapping trm
          LEFT JOIN History his 
            ON trm.mapping_id = his.mapping_id
          WHERE trm.mapping_id IN (${placeholders})
        `;

          const minWithdrawResult = await request.query(sqlQuery);

          withdraw_date = minWithdrawResult.recordset[0]?.withdraw_date || null;
          console.log("✅ withdraw_date:", withdraw_date);
        } catch (error) {
          console.error("❌ Error in withdraw_date query:", error);
        }
      }

      if (!withdraw_date) {
        const now = new Date();
        now.setHours(now.getHours() + 7);
        withdraw_date = now.toISOString().slice(0, 19).replace('T', ' ');
        console.warn("⚠️ ใช้เวลาปัจจุบันแทน:", withdraw_date);
      }

      // ===============================
      // 3) ดึง production info
      // ===============================
      const prodInfoResult = await transaction.request()
        .input("prod_rm_id", prod_rm_id)
        .input("line_name", line_name)
        .query(`
        SELECT CONCAT(p.doc_no, ' (', @line_name, ')') AS production
        FROM ProdRawMat pr
        JOIN Production p ON pr.prod_id = p.prod_id
        WHERE pr.prod_rm_id = @prod_rm_id
      `);

      const production = prodInfoResult.recordset[0]?.production || null;

      if (!production) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "ไม่พบข้อมูล production"
        });
      }

      // ===============================
      // 4) Loop ตาม groupId
      // ===============================
      for (const gID of groupId) {

        // 4.1 INSERT RMForProd
        const rmfpResult = await transaction.request()
          .input("prod_rm_id", prod_rm_id)
          .input("batch", batch)
          .input("weight", weight)
          .input("dest", Dest || "บรรจุ")
          .input("stay_place", "จุดเตรียม")
          .input("rm_group_id", gID)
          .input("rmfp_line_name", line_name)
          .input("level_eu", level_eu !== "-" ? level_eu : null)
          .input("row_status", "P_P")
          .query(`
          INSERT INTO RMForProd (
            prod_rm_id, batch, weight, dest, stay_place, 
            rm_group_id, rmfp_line_name, level_eu, row_status
          )
          OUTPUT INSERTED.rmfp_id
          VALUES (
            @prod_rm_id, @batch, @weight, @dest, @stay_place,
            @rm_group_id, @rmfp_line_name, @level_eu, @row_status
          )
        `);

        const RMFP_ID = rmfpResult.recordset[0].rmfp_id;
        console.log("✅ Created RMFP_ID:", RMFP_ID);

        // ⭐ 4.2 INSERT History (ใช้ formatted dates)
        const historyResult = await transaction.request()
          .input("receiver", operator || "")
          .input("withdraw_date", withdraw_date)
          .input("cooked_date", formattedCookedTime)           // ⭐ ใช้ formatted
          .input("rmit_date", formattedPreparedTime)           // ⭐ ใช้ formatted
          .input("start_mixed_date", formattedMixtime)
          .input("start_gravy_date", formattedGravyTime)         // ⭐ ใช้ formatted
          .input("first_prod", production)
          .query(`
          INSERT INTO History (
            receiver, 
            withdraw_date, 
            cooked_date, 
            rmit_date,
            start_mixed_date,
            start_gravy_date, 
            first_prod, 
            created_at
          )
          OUTPUT INSERTED.hist_id
          VALUES (
            @receiver, 
            @withdraw_date, 
            @cooked_date, 
            @rmit_date,
            @start_mixed_date,
            @start_gravy_date,  
            @first_prod, 
            GETDATE()
          )
        `);

        const hist_id = historyResult.recordset[0].hist_id;
        console.log("✅ Created hist_id:", hist_id);

        // ⭐ 4.3 INSERT TrolleyRMMapping (เพิ่มเฉพาะ tray_count)
        const mappingResult = await transaction.request()
          .input("rmfp_id", RMFP_ID)
          .input("tro_production_id", prod_rm_id)
          // .input("dest", "บรรจุ")
          .input("dest", "รอCheckin")
          .input("stay_place", "จุดเตรียม")
          // .input("rm_status", "QcCheck")
          .input("rm_status", "รอQCตรวจสอบ")
          .input("weight_RM", weight)
          .input("level_eu", level_eu !== "-" ? level_eu : null)
          .input("rmm_line_name", line_name)
          .input("tray_count", numberOfTrays ? parseInt(numberOfTrays) : null)  // จำนวนถาด
          .input("process_id", processType || null)  // ✅ ต้องมีตรงนี้
          // ❌ ไม่ใส่ process_type ในฐานข้อมูล
          .query(`
          INSERT INTO TrolleyRMMapping (
            rmfp_id,
            tro_production_id,
            dest,
            stay_place,
            rm_status,
            weight_RM,
            level_eu,
            rmm_line_name,
            tray_count,
            process_id,
            created_at
          )
          OUTPUT INSERTED.mapping_id
          VALUES (
            @rmfp_id,
            @tro_production_id,
            @dest,
            @stay_place,
            @rm_status,
            @weight_RM,
            @level_eu,
            @rmm_line_name,
            @tray_count,
            @process_id,
            GETDATE()
          )
        `);

        const mapping_id = mappingResult.recordset[0].mapping_id;
        console.log("✅ Created mapping_id:", mapping_id);

        // 4.4 UPDATE History
        await transaction.request()
          .input("mapping_id", mapping_id)
          .input("hist_id", hist_id)
          .query(`
          UPDATE History
          SET mapping_id = @mapping_id
          WHERE hist_id = @hist_id
        `);
        console.log("✅ Updated History with mapping_id");

        // 4.5 UPDATE RMForProd
        await transaction.request()
          .input("hist_id", hist_id)
          .input("rmfp_id", RMFP_ID)
          .query(`
          UPDATE RMForProd
          SET hist_id_rmfp = @hist_id
          WHERE rmfp_id = @rmfp_id
        `);
        console.log("✅ Updated RMForProd with hist_id");

        // 4.5.1 INSERT Batch
        if (batch) {
          await transaction.request()
            .input("mapping_id", mapping_id)
            .input("batch_after", batch)
            .query(`
            INSERT INTO Batch (mapping_id, batch_after)
            VALUES (@mapping_id, @batch_after)
          `);
          console.log("✅ Inserted Batch:", batch);
        }

        // 4.6 INSERT RM_MixPeck
        console.log("📝 Inserting into RM_MixPeck...");
        for (const material of selectedMaterials) {
          console.log("  - Material mapping_id:", material.mapping_id);

          if (material.mapping_id) {
            await transaction.request()
              .input("rmfp_id", RMFP_ID)
              .input("mapping_id", parseInt(material.mapping_id))
              .query(`
              INSERT INTO RM_MixPeck (rmfp_id, mapping_id)
              VALUES (@rmfp_id, @mapping_id)
            `);
            console.log("  ✅ Inserted successfully");
          } else {
            console.warn("  ⚠️ Skipped - no mapping_id");
          }
        }
      }

      await transaction.commit();
      console.log("✅ Transaction committed successfully");

      // ✅ ส่งค่า processType กลับไปใน emit (เพื่อแสดงผลเฉยๆ)
      req.app.get("io")?.emit("trolleyRMMappingSaved", {
        message: "TrolleyRMMapping data saved successfully!",
        productId,
        line_name,
        groupId,
        batch,
        weight,
        selectedMaterials: selectedMaterials.length,
        cookedTime: formattedCookedTime,
        preparedTime: formattedPreparedTime,
        mixtime: formattedMixtime,
        numberOfTrays,
        processType  // ✅ ส่งกลับไปแสดงผลเฉยๆ (ไม่ได้ INSERT ลงฐานข้อมูล)
      });

      // ✅ ส่งค่า processType กลับไปใน response (เพื่อแสดงผลเฉยๆ)
      res.json({
        success: true,
        message: "บันทึก RMForProd, TrolleyRMMapping, History, Batch และ RM_MixPeck สำเร็จ",
        data: {
          cookedTime: formattedCookedTime,
          preparedTime: formattedPreparedTime,
          mixtime: formattedMixtime,
          numberOfTrays,
          processType  // ✅ ส่งกลับไปแสดงผลเฉยๆ (ไม่ได้ INSERT ลงฐานข้อมูล)
        }
      });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("❌ SQL error:", err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  router.put("/coldstorage/outcoldstorage/pack/pull", async (req, res) => {
    try {
      console.log("Raw Request Body:", req.body);

      const { tro_id, slot_id, rm_cold_status, rm_status, dest, operator, materials } = req.body;

      // ตรวจสอบค่าที่ได้รับว่าครบถ้วน
      if (!tro_id || !slot_id || !rm_status || !rm_cold_status || !dest || !materials) {
        console.log("Missing fields:", { tro_id, slot_id, rm_status, rm_cold_status, dest, materials });
        return res.status(400).json({ error: "Missing required fields" });
      }

      const pool = await connectToDatabase();
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // 1. อัปเดตสถานะของ slot
        const updateSlotResult = await new sql.Request(transaction)
          .input("tro_id", tro_id)
          .query(`
          UPDATE Slot 
          SET tro_id = NULL,
              status = '2001'
          WHERE tro_id = @tro_id;
        `);

        if (updateSlotResult.rowsAffected[0] === 0) {
          throw new Error(`Slot update failed for slot_id ${slot_id}`);
        }

        // 2. วนลูปปรับปรุงข้อมูลแต่ละรายการวัตถุดิบใน TrolleyRMMapping
        for (const material of materials) {
          const { mapping_id, remaining_rework_time, delayTime, cold, mix_time } = material;

          // ดึงข้อมูล cold_to_pack และ cold_to_pack_time
          const rmDataResult = await new sql.Request(transaction)
            .input("mapping_id", mapping_id)
            .query(`
            SELECT rmg.cold_to_pack, rmm.cold_to_pack_time 
            FROM TrolleyRMMapping rmm
            JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
            JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
            WHERE rmm.mapping_id = @mapping_id
          `);

          if (rmDataResult.recordset.length === 0) {
            throw new Error(`Raw material not found for mapping_id: ${mapping_id}`);
          }

          let cold_to_pack_time = rmDataResult.recordset[0].cold_to_pack_time ?? rmDataResult.recordset[0].cold_to_pack;

          // สร้างคำสั่ง SQL พื้นฐานสำหรับอัปเดต TrolleyRMMapping
          let updateQuery = `
          UPDATE TrolleyRMMapping
          SET dest = CASE
              WHEN rm_status = 'QcCheck' AND @rm_cold_status IN ('เหลือจากไลน์ผลิต', 'วัตถุดิบตรง')  AND @dest = 'บรรจุ' THEN 'บรรจุ'
              WHEN rm_status = 'QcCheck' AND @rm_cold_status IN ('เหลือจากไลน์ผลิต', 'วัตถุดิบตรง')  AND @dest = 'จุดเตรียม' THEN 'จุดเตรียม'
              WHEN rm_status = 'QcCheck รอ MD' AND @rm_cold_status = 'วัตถุดิบรับฝาก' THEN 'จุดเตรียม'
              WHEN rm_status = 'QcCheck รอกลับมาเตรียม' AND @rm_cold_status = 'วัตถุดิบรับฝาก' THEN 'จุดเตรียม'
              WHEN rm_status = 'รอกลับมาเตรียม' AND @rm_cold_status = 'วัตถุดิบรับฝาก' THEN 'จุดเตรียม'
              WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบรับฝาก' AND @dest = 'จุดเตรียม' THEN 'จุดเตรียม'
              WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบรอแก้ไข' AND @dest = 'จุดเตรียม' THEN 'จุดเตรียม'
              WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบตรง' AND @dest = 'บรรจุ' THEN 'บรรจุ'
              WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบตรง' AND @dest = 'จุดเตรียม' THEN 'จุดเตรียม'
              WHEN rm_status = 'เหลือจากไลน์ผลิต' AND @rm_cold_status = 'เหลือจากไลน์ผลิต' AND @dest = 'บรรจุ' THEN 'บรรจุ'
              WHEN rm_status = 'ส่งฟรีช' AND @rm_cold_status = 'รอส่งฟรีช' THEN 'จุดเตรียม'
              ELSE @dest
          END,
          rm_status = CASE
              WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบตรง' AND @dest = 'บรรจุ' THEN 'QcCheck'
              WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบรับฝาก' AND @dest = 'จุดเตรียม' THEN 'รับฝาก-รอแก้ไข'
              ELSE rm_status
          END,
          rm_cold_status = NULL,
          stay_place = @stay_place,
          cold_to_pack_time = @cold_to_pack_time
        `;

          // กำหนด field เฉพาะประเภทวัตถุดิบ
          if (mix_time !== null && mix_time !== undefined) {
            updateQuery += `, mix_time = @mix_time`;
          } else if (remaining_rework_time !== null && remaining_rework_time !== undefined) {
            updateQuery += `, rework_time = @rework_delay_time`;
          } else {
            updateQuery += `, cold_time = @cold`;
          }

          // เพิ่มเงื่อนไขสำหรับ dest = 'บรรจุ'
          if (dest === 'บรรจุ') {
            updateQuery += `, tro_id = NULL`;
          }

          if (dest === 'จุดเตรียม') {
            updateQuery += `, tro_id = NULL`;
          }

          // Execute TrolleyRMMapping update
          const updateRmResult = await new sql.Request(transaction)
            .input("mapping_id", mapping_id)
            .input("rm_status", rm_status)
            .input("rm_cold_status", rm_cold_status)
            .input("dest", 'บรรจุ')
            .input("mix_time", mix_time)
            .input("rework_delay_time", material.rework_delay_time)
            .input("cold", cold)
            .input("stay_place", 'ออกห้องเย็น')
            .input("cold_to_pack_time", cold_to_pack_time)
            .query(updateQuery + ` WHERE mapping_id = @mapping_id;`);

          if (updateRmResult.rowsAffected[0] === 0) {
            throw new Error(`Failed to update TrolleyRMMapping for mapping_id ${mapping_id}`);
          }

          // ถ้า dest = 'บรรจุ' อัปเดต Trolley.tro_status = 1
          if (dest === 'บรรจุ' || dest === 'จุดเตรียม') {
            await new sql.Request(transaction)
              .input("tro_id", tro_id)
              .query(`
              UPDATE Trolley
              SET tro_status = 1
              WHERE tro_id = @tro_id;
            `);
          }

          // 3. อัปเดต History
          const updatedRmDataResult = await new sql.Request(transaction)
            .input("mapping_id", mapping_id)
            .query(`
            SELECT cold_to_pack_time, mix_time, rework_time
            FROM TrolleyRMMapping
            WHERE mapping_id = @mapping_id
          `);
          const updatedRmData = updatedRmDataResult.recordset[0];

          const historyUpdateQuery = `
          UPDATE History
          SET out_cold_date = CASE WHEN come_cold_date IS NOT NULL AND out_cold_date IS NULL THEN GETDATE() ELSE out_cold_date END,
              out_cold_date_two = CASE WHEN come_cold_date_two IS NOT NULL AND out_cold_date_two IS NULL THEN GETDATE() ELSE out_cold_date_two END,
              out_cold_date_three = CASE WHEN come_cold_date_three IS NOT NULL AND out_cold_date_three IS NULL THEN GETDATE() ELSE out_cold_date_three END,
              receiver_out_cold = CASE WHEN come_cold_date IS NOT NULL AND out_cold_date IS NULL THEN @operator ELSE receiver_out_cold END,
              receiver_out_cold_two = CASE WHEN come_cold_date_two IS NOT NULL AND out_cold_date_two IS NULL THEN @operator ELSE receiver_out_cold_two END,
              receiver_out_cold_three = CASE WHEN come_cold_date_three IS NOT NULL AND out_cold_date_three IS NULL THEN @operator ELSE receiver_out_cold_three END,
              cold_to_pack_time = @cold_to_pack_time,
              mix_time = @mix_time,
              rework_time = @rework_time,
              cold_dest = @dest
          WHERE mapping_id = @mapping_id;
        `;

          await new sql.Request(transaction)
            .input("mapping_id", mapping_id)
            .input("operator", operator)
            .input("cold_to_pack_time", updatedRmData.cold_to_pack_time)
            .input("mix_time", updatedRmData.mix_time)
            .input("rework_time", updatedRmData.rework_time)
            .input("dest", dest)
            .query(historyUpdateQuery);
        }

        // Commit transaction
        await transaction.commit();

        const formattedData = {
          message: "วัตถุดิบถูกนำออกจากห้องเย็นแล้ว",
          updatedAt: new Date(),
          tro_id,
          operator
        };

        io.to('saveRMForProdRoom').emit('dataUpdated', formattedData);
        io.to('QcCheckRoom').emit('dataUpdated', formattedData);

        res.status(200).json({ message: "Data updated successfully" });

      } catch (innerError) {
        await transaction.rollback();
        console.error("Transaction error:", innerError);
        res.status(500).json({ error: innerError.message });
      }

    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "An error occurred while updating the data." });
    }
  });



  // -----------------------[ PACKAGING ]-----------------------
  /**
   * @swagger
   * /api/linetype/line:
   *    get:
   *      summary: แสดงไลน์ผลิตของประเภทที่เลือก
   *      tags:
   *          - packaging
   *      parameters:
   *        - name: line_type_id
   *          in: query
   *          description: รหัสประเภทไลน์ผลิต
   *          required: true
   *          schema:
   *            type: integer
   *      responses:
   *        200:
   *          description: Successfull response
   *        500:
   *          description: Internal server error
   */

  // Select ข้อมูลแสดงไลน์ผลิตของประเภทไลน์ผลิตนั้นๆที่พนักงานเลือก
  router.get("/linetype/line", async (req, res) => {
    const line_type_id = req.query.line_type_id;
    try {
      const pool = await getPool();
      if (!pool) {
        return res
          .status(500)
          .json({ success: false, error: "Database connection failed" });
      }

      // Special handling for All Line type
      if (line_type_id === "1001") {
        const result = await pool.request()
          .query(`
            SELECT 
              l.line_id,
              l.line_name,
              l.line_type_id
            FROM
              Line l
            WHERE
              l.line_name NOT IN ('CUP', 'CAN', 'POUCH','Pouch Auto')
            ORDER BY l.line_name
          `);

        const data = result.recordset;
        if (!data.length) {
          return res
            .status(404)
            .json({ success: false, message: "No matching data found!" });
        }
        return res.json({ success: true, data });
      }

      // Normal line type handling
      const result = await pool.request().input("line_type_id", line_type_id)
        .query(`
          SELECT 
            l.line_id,
            l.line_name,
            l.line_type_id
          FROM
            Line l
          JOIN
            LineType lt ON lt.line_type_id = l.line_type_id
          WHERE
            lt.line_type_id = @line_type_id 
            AND l.line_name NOT IN ('CUP', 'CAN', 'POUCH','Pouch Auto')
          ORDER BY l.line_name
        `);

      const data = result.recordset;

      if (!data.length) {
        return res
          .status(404)
          .json({ success: false, message: "No matching data found!" });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        details: error.message,
      });
    }
  });
  // -----------------------[ PACKAGING ]-----------------------
  /**
   * @swagger
   * /api/rmtrolley/forpackaging:
   *    get:
   *      summary: แสดงข้อมูลวัตถุดิบที่อยู่ที่จุดเตรียมหรือหม้ออบและมีปลายทางเป็นบรรจุ
   *      tags:
   *          - packaging
   *      responses:
   *        200:
   *          description: ดึงข้อมูลสำเร็จ
   *        404:
   *          description: ไม่พบข้อมูล
   *        500:
   *          description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
   */
  // Select ข้อมูลวัตถุดิบที่อยู่ที่จุดเตรียมหรือหม้ออบและมีปลายทางเป็นบรรจุ
  router.get("/rmtrolley/forpackaging", async (req, res) => {
    try {
      const pool = await getPool();
      if (!pool) {
        return res
          .status(500)
          .json({ success: false, error: "Database connection failed" });
      }

      const result = await pool.request().query(`
      SELECT
        rm.rm_tro_id,
        rm.tro_id,
        rm.stay_place,
        rm.dest,
        rm.weight_per_tro,
        rm.out_cold_date,
        rm.rmit_date,
        q.qc_datetime
      FROM 
        RMInTrolley rm
      LEFT JOIN
        [PFCMv2].[dbo].[QC] q ON rm.qc_id = q.qc_id
      WHERE
        (rm.stay_place = N'จุดเตรียม' OR rm.stay_place = N'ห้องเย็น')
        AND rm.dest = N'บรรจุ'
    `);

      const data = result.recordset;

      if (!data.length) {
        return res
          .status(404)
          .json({ success: false, message: "ไม่พบข้อมูลที่ตรงตามเงื่อนไข" });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
        details: error.message,
      });
    }
  });

  // แก้ไข API endpoint ให้ใช้แค่ rm_tro_id
  router.get("/trolley/detail/:rmTrolleyId", async (req, res) => {
    try {
      const pool = await getPool();
      if (!pool) {
        return res
          .status(500)
          .json({ success: false, error: "Database connection failed" });
      }

      const rmTrolleyId = req.params.rmTrolleyId;
      console.log("Searching for trolley with rm_tro_id:", rmTrolleyId);

      // ปรับให้ค้นหาด้วย rm_tro_id เท่านั้น
      const result = await pool.request()
        .input("rm_tro_id", parseInt(rmTrolleyId) || 0)
        .query(`
        SELECT
          r.rm_tro_id,
          r.tro_id,
          r.weight_per_tro,
          r.ntray,
          r.cooked_date,
          r.come_cold_date,
          r.out_cold_date,
          r.weight_RM,
          r.cold_time,
          rfp.batch,
          q.qc_datetime,
          prm.mat,
          rm.mat_name
        FROM
          [PFCMv2].[dbo].[RMInTrolley] r
        LEFT JOIN
          [PFCMv2].[dbo].[RMForProd] rfp ON r.rmfp_id = rfp.rmfp_id
        LEFT JOIN
          [PFCMv2].[dbo].[QC] q ON r.qc_id = q.qc_id
        LEFT JOIN
          [PFCMv2].[dbo].[ProdRawMat] prm ON r.tro_production_id = prm.prod_id
        LEFT JOIN
          [PFCMv2].[dbo].[RawMat] rm ON prm.mat = rm.mat
        WHERE
          r.rm_tro_id = @rm_tro_id
      `);

      console.log("Query result rows:", result.recordset.length);

      const data = result.recordset;

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบข้อมูลรถเข็นที่ระบุ"
        });
      }

      // ปรับโครงสร้างข้อมูลให้ตรงกับที่ frontend ต้องการ
      const trolleyInfo = {
        rm_tro_id: data[0].rm_tro_id,
        trolley_id: data[0].tro_id || "-",
        production_code: data[0].batch || "-", // เปลี่ยนจาก batch เป็น production_code ให้ตรงกับที่ Modal1 ใช้
        mat: data[0].mat || "-",
        mat_name: data[0].mat_name || "-",
        cooked_date: data[0].cooked_date,
        come_cold_date: data[0].come_cold_date,
        out_cold_date: data[0].out_cold_date,
        ntray: data[0].ntray,
        total_weight: data[0].weight_per_tro, // เปลี่ยนจาก weight_per_tro เป็น total_weight ให้ตรงกับที่ Modal1 ใช้
        qc_datetime: data[0].qc_datetime
      };

      res.json({ success: true, data: trolleyInfo });
    } catch (error) {
      console.error("Error fetching trolley data:", error);
      res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
        details: error.message,
      });
    }
  });
  //เพิ่มเข้ามาเพื่อกรองข้อมูล
  router.get("/line/getLines", async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
      SELECT line_id, line_name, line_type_id
      FROM [PFCMv2].[dbo].[Line]
    `);

      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/pack/main/fetchRawMat/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params;

      if (!line_id) {
        return res.status(400).json({ success: false, error: "Missing line_id parameter" });
      }

      const pool = await connectToDatabase();

      const query = `
      WITH RawMaterialDetails AS (
        SELECT
          rmm.mapping_id,
          rmm.tro_id,
          rmf.rmfp_id,
          b.batch_after,
          rm.mat,
          rm.mat_name,
          CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
          FORMAT(rmg.cold, 'N2') AS cold,
          rmg.rm_group_id AS rmg_rm_group_id,
          p.doc_no,
          rmm.rm_status,
          rmm.dest,
          rmm.weight_RM,
          rmm.tray_count,
          rmm.rmm_line_name,
          FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
          FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
          FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,
          CONVERT(VARCHAR, htr.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, htr.come_cold_date, 120) AS come_cold_date,
          CONVERT(VARCHAR, htr.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, htr.come_cold_date_two, 120) AS come_cold_date_two,
          CONVERT(VARCHAR, htr.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three,
          CONVERT(VARCHAR, htr.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, htr.qc_date, 120) AS qc_date
        FROM
          TrolleyRMMapping rmm
          JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
          JOIN ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
          JOIN RawMat rm ON pr.mat = rm.mat
          JOIN Production p ON pr.prod_id = p.prod_id
          JOIN Line l ON rmm.rmm_line_name = l.line_name
          JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
          JOIN Batch b ON rmm.batch_id = b.batch_id
          JOIN history htr ON rmm.mapping_id = htr.mapping_id
        WHERE
          rmm.dest IN ('บรรจุ', 'ไปบรรจุ', 'รถเข็นรอจัดส่ง') AND
          rmm.stay_place IN ('ออกห้องเย็น', 'จุดเตรียม', 'หม้ออบ','บรรจุ') AND
          rmm.rm_status IN ('QcCheck', 'เหลือจากไลน์ผลิต','รอแก้ไข') AND
          rmm.tro_id is not null
          ${line_id !== "1001" ? "AND l.line_id = @line_id" : ""}
      )
      SELECT * FROM RawMaterialDetails
      ORDER BY tro_id, mat
    `;

      const request = pool.request();
      if (line_id !== "1001") {
        request.input("line_id", sql.Int, parseInt(line_id, 10));
      }

      const result = await request.query(query);

      // จัดกลุ่มข้อมูลตาม tro_id
      const trolleyMap = new Map();

      result.recordset.forEach(item => {
        if (!trolleyMap.has(item.tro_id)) {
          trolleyMap.set(item.tro_id, {
            tro_id: item.tro_id,
            materials: []
          });
        }

        trolleyMap.get(item.tro_id).materials.push({
          mapping_id: item.mapping_id,
          rmfp_id: item.rmfp_id,
          batch_after: item.batch_after,
          mat: item.mat,
          mat_name: item.mat_name,
          production: item.production,
          cold: item.cold,
          rmg_rm_group_id: item.rmg_rm_group_id,
          doc_no: item.doc_no,
          rm_status: item.rm_status,
          dest: item.dest,
          weight_RM: item.weight_RM,
          tray_count: item.tray_count,
          remaining_ctp_time: item.remaining_ctp_time,
          standard_ctp_time: item.standard_ctp_time,
          remaining_ptp_time: item.remaining_ptp_time,
          standard_ptp_time: item.standard_ptp_time,
          remaining_rework_time: item.remaining_rework_time,
          standard_rework_time: item.standard_rework_time,
          history: {
            cooked_date: item.cooked_date || '-',
            rmit_date: item.rmit_date || '-',
            come_cold_date: item.come_cold_date || '-',
            out_cold_date: item.out_cold_date || '-',
            come_cold_date_two: item.come_cold_date_two || '-',
            out_cold_date_two: item.out_cold_date_two || '-',
            come_cold_date_three: item.come_cold_date_three || '-',
            out_cold_date_three: item.out_cold_date_three || '-',
            qc_date: item.qc_date || '-'
          }
        });
      });

      res.json({
        success: true,
        data: Array.from(trolleyMap.values())
      });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/auto-fetch/pack/main/fetchRawMat/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params;

      if (!line_id) {
        return res.status(400).json({ success: false, error: "Missing line_id parameter" });
      }

      const pool = await connectToDatabase();
      const result = await pool.request()
        .input('line_id', sql.Int, parseInt(line_id, 10))
        .query(`
        WITH RawMaterialDetails AS (
            SELECT
                rmm.mapping_id,
                rmm.tro_id,
                rmf.rmfp_id,
                b.batch_after,
                rm.mat,
                rm.mat_name,
                CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                FORMAT(rmg.cold, 'N2') AS cold,
                rmf.rm_group_id AS rmf_rm_group_id,
                rmg.rm_group_id AS rmg_rm_group_id,
                p.doc_no,
                rmm.rm_status,
                rmm.dest,
                rmm.weight_RM,
                rmm.tray_count,
                rmm.rmm_line_name,
                
                -- Remaining times and standard times for delay calculations
                FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
                FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
                FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
                FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
                FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
                FORMAT(rmg.rework, 'N2') AS standard_rework_time,

                CONVERT(VARCHAR, htr.cooked_date, 120) AS cooked_date,
                CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
                CONVERT(VARCHAR, htr.come_cold_date, 120) AS come_cold_date,
                CONVERT(VARCHAR, htr.out_cold_date, 120) AS out_cold_date,
                CONVERT(VARCHAR, htr.come_cold_date_two, 120) AS come_cold_date_two,
                CONVERT(VARCHAR, htr.out_cold_date_two, 120) AS out_cold_date_two,
                CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three,
                CONVERT(VARCHAR, htr.out_cold_date_three, 120) AS out_cold_date_three,
                CONVERT(VARCHAR, htr.qc_date, 120) AS qc_date
            FROM
                TrolleyRMMapping rmm
            JOIN
                RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
            JOIN
                ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
            JOIN
                RawMat rm ON pr.mat = rm.mat
            JOIN
                Production p ON pr.prod_id = p.prod_id
            JOIN
                Line l ON rmf.rmfp_line_name = l.line_name
            JOIN
                RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
            JOIN
                Batch b ON rmm.batch_id = b.batch_id
            JOIN
                history htr ON rmm.mapping_id = htr.mapping_id
            WHERE
                rmm.dest IN ('บรรจุ','ไปบรรจุ','รถเข็นรอจัดส่ง')
                AND rmm.stay_place IN ('ออกห้องเย็น','จุดเตรียม','หม้ออบ')
                AND rmm.rm_status IN ('QcCheck','เหลือจากไลน์ผลิต')
                AND rmf.rm_group_id = rmg.rm_group_id
                AND l.line_id = @line_id
        )
        SELECT * FROM RawMaterialDetails
        ORDER BY tro_id, mat
      `);

      // กลุ่มข้อมูลตาม tro_id โดยเก็บข้อมูลของแต่ละวัตถุดิบแยกกัน
      const trolleyMap = new Map();

      // สร้างอาร์เรย์เพื่อเก็บ mapping_id ทั้งหมดที่พบ
      const mappingIds = [];

      result.recordset.forEach(item => {
        // เก็บ mapping_id ทุกรายการ
        mappingIds.push(item.mapping_id);

        if (!trolleyMap.has(item.tro_id)) {
          trolleyMap.set(item.tro_id, {
            tro_id: item.tro_id,
            materials: []
          });
        }

        // เพิ่มข้อมูลวัตถุดิบเข้าไปในรถเข็น
        trolleyMap.get(item.tro_id).materials.push({
          mapping_id: item.mapping_id,
          rmfp_id: item.rmfp_id,
          batch_after: item.batch_after,
          mat: item.mat,
          mat_name: item.mat_name,
          production: item.production,
          cold: item.cold,
          rmf_rm_group_id: item.rmf_rm_group_id,
          rmg_rm_group_id: item.rmg_rm_group_id,
          doc_no: item.doc_no,
          rm_status: item.rm_status,
          dest: item.dest,
          weight_in_trolley: item.weight_in_trolley,
          weight_RM: item.weight_RM,
          tray_count: item.tray_count,

          // Delay time calculation fields
          remaining_ctp_time: item.remaining_ctp_time,
          standard_ctp_time: item.standard_ctp_time,
          remaining_ptp_time: item.remaining_ptp_time,
          standard_ptp_time: item.standard_ptp_time,
          remaining_rework_time: item.remaining_rework_time,
          standard_rework_time: item.standard_rework_time,

          // เพิ่มข้อมูลประวัติวันที่
          history: {
            cooked_date: item.cooked_date || '-',
            rmit_date: item.rmit_date || '-',
            come_cold_date: item.come_cold_date || '-',
            out_cold_date: item.out_cold_date || '-',
            come_cold_date_two: item.come_cold_date_two || '-',
            out_cold_date_two: item.out_cold_date_two || '-',
            come_cold_date_three: item.come_cold_date_three || '-',
            out_cold_date_three: item.out_cold_date_three || '-',
            qc_date: item.qc_date || '-'
          }
        });

        // Update trolley status for each trolley
        if (item.tro_id) {
          pool.request().query(`
          UPDATE Trolley SET tro_status = '1', status = '1.2' WHERE tro_id = '${item.tro_id}'
        `);
        }
      });

      // อัพเดต tro_id เป็น null สำหรับทุก mapping_id ที่พบ
      // โดยไม่มีเงื่อนไขเกี่ยวกับ dest
      for (const mappingId of mappingIds) {
        await pool.request().query(`
        UPDATE TrolleyRMMapping
        SET stay_place = 'บรรจุเสร็จสิ้น1', dest = 'บรรจุเสร็จสิ้น1', tro_id = NULL, tl_status = '845'
        WHERE mapping_id = ${mappingId}
      `);
      }

      // แปลง Map เป็น Array เพื่อส่งกลับไปยัง client
      const formattedData = Array.from(trolleyMap.values());

      res.json({
        success: true,
        data: formattedData
      });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  router.get("/pack/main/fetchMixedRawMat/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params;

      if (!line_id) {
        return res.status(400).json({ success: false, error: "Missing line_id parameter" });
      }

      const pool = await connectToDatabase();
      const result = await pool.request()
        .input('line_id', sql.Int, parseInt(line_id, 10))
        .query(`
        WITH MixedRawMaterialDetails AS (
            SELECT
                rmm.mapping_id,
                rmm.tro_id,
                rmm.rmfp_id,
                CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                rmm.mix_code,
                rmm.prod_mix,
                FORMAT(rmm.mix_time, 'N2') AS mix_time,
                p.doc_no,
                rmm.rm_status,
                rmm.dest,
                rmm.weight_RM,
                rmm.tray_count,
                rmm.rmm_line_name,
                -- History dates
                CONVERT(VARCHAR, htr.mixed_date, 120) AS mixed_date,
                CONVERT(VARCHAR, htr.come_cold_date, 120) AS come_cold_date,
                CONVERT(VARCHAR, htr.out_cold_date, 120) AS out_cold_date,
                CONVERT(VARCHAR, htr.come_cold_date_two, 120) AS come_cold_date_two,
                CONVERT(VARCHAR, htr.out_cold_date_two, 120) AS out_cold_date_two,
                CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three,
                CONVERT(VARCHAR, htr.out_cold_date_three, 120) AS out_cold_date_three
            FROM
                TrolleyRMMapping rmm
            JOIN
                RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
            JOIN
                Production p ON rmm.prod_mix = p.prod_id
            JOIN
                Line l ON rmm.rmm_line_name = l.line_name
            JOIN
                history htr ON rmm.mapping_id = htr.mapping_id
            WHERE
                rmm.rm_status IN ('เหลือจากไลน์ผลิต', 'รอแก้ไข')
                AND rmm.stay_place IN ('ออกห้องเย็น','บรรจุ')
                AND rmm.dest IN  ('บรรจุ', 'ไปบรรจุ')
                AND rmm.mix_code IS NOT NULL
                AND rmm.prod_mix IS NOT NULL
                AND rmm.tro_id IS NOT NULL
                ${line_id !== "1001" ? "AND l.line_id = @line_id" : ""}
        )
        SELECT * FROM MixedRawMaterialDetails
        ORDER BY tro_id, mix_code
      `);

      // Group data by trolley ID
      const trolleyMap = new Map();

      result.recordset.forEach(item => {
        if (!trolleyMap.has(item.tro_id)) {
          trolleyMap.set(item.tro_id, {
            tro_id: item.tro_id,
            mixedMaterials: []
          });
        }

        // Add mixed material information to the trolley
        trolleyMap.get(item.tro_id).mixedMaterials.push({
          mapping_id: item.mapping_id,
          rmfp_id: item.rmfp_id,
          production: item.production,
          mix_code: item.mix_code,
          prod_mix: item.prod_mix,
          mix_time: item.mix_time,
          doc_no: item.doc_no,
          rm_status: item.rm_status,
          dest: item.dest,
          weight_in_trolley: item.weight_in_trolley,
          weight_RM: item.weight_RM,
          tray_count: item.tray_count,
          rmm_line_name: item.rmm_line_name,

          // Add history dates
          history: {
            mixed_date: item.mixed_date || '-',
            come_cold_date: item.come_cold_date || '-',
            out_cold_date: item.out_cold_date || '-',
            come_cold_date_two: item.come_cold_date_two || '-',
            out_cold_date_two: item.out_cold_date_two || '-',
            come_cold_date_three: item.come_cold_date_three || '-',
            out_cold_date_three: item.out_cold_date_three || '-'
          }
        });
      });

      // Convert Map to Array to send to client
      const formattedData = Array.from(trolleyMap.values());

      res.json({
        success: true,
        data: formattedData
      });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/pack/main/modal/fetchRawMat", async (req, res) => {
    try {
      const { tro_id } = req.query;

      if (!tro_id) {
        return res.status(400).json({ success: false, message: "Missing tro_id" });
      }

      const pool = await connectToDatabase();
      const result = await pool
        .request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
              SELECT
                  rmm.tro_id,
                  rmm.mapping_id,
                  rmm.mix_code,
                  rmf.rmfp_id,
                  b.batch_after,
                  rm.mat,
                  rm.mat_name,
                  l.line_name,
                  CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production,
                  FORMAT(rmg.cold, 'N2') AS cold,
                  rmm.rm_status,
                  rmm.dest,
                  rmm.weight_RM,
                  rmm.tray_count,
                  FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
                  FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
                  FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
                  FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
                  FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
                  FORMAT(rmg.rework, 'N2') AS standard_rework_time,
                  CONVERT(VARCHAR, h.withdraw_date, 120) AS withdraw_date,
                  CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
                  CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
                  CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
                  CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
                  CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
                  CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
                  CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
                  CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
                  CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
                  CONVERT(VARCHAR, h.rework_date, 120) AS rework_date,
                  q.sq_remark,
                  q.md,
                  q.md_remark,
                  q.defect,
                  q.defect_remark,
                  q.md_no,
                  q.qccheck,
                  q.mdcheck,
                  q.defectcheck
              FROM
                  TrolleyRMMapping rmm
             LEFT JOIN  
                  RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id  
             LEFT JOIN
                  ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
             LEFT JOIN
                  RawMat rm ON pr.mat = rm.mat
             LEFT JOIN
                  Production p ON pr.prod_id = p.prod_id
             LEFT JOIN
                  Line l ON rmf.rmfp_line_name = l.line_name
             LEFT JOIN
                  RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
             LEFT JOIN
                  History h ON rmm.mapping_id = h.mapping_id
             LEFT JOIN  
                  QC q ON rmm.qc_id = q.qc_id
           
             LEFT JOIN
                  Batch b ON b.batch_id = rmm.batch_id
              WHERE 
                  rmm.dest IN ('บรรจุ','รถเข็นรอจัดส่ง')
                  AND rmf.rm_group_id = rmg.rm_group_id
                  AND rmm.tro_id = @tro_id 
                  AND rmm.tro_id is not null
          `);

      const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };

      const formattedData = result.recordset.map(item => ({
        ...item,
        // "เวลาเบิกวัตถุดิบ": formatDate(item.withdraw_date),
        // "เวลาต้มอบเสร็จ": formatDate(item.cooked_date),
        // "เวลาแปรรูปเสร็จ": formatDate(item.rmit_date),
        // "เวลาเข้าห้องเย็น": formatDate(item.come_cold_date),
        // "เวลาออกห้องเย็น": formatDate(item.out_cold_date),
        // "เวลาแก้ไขเสร็จ": formatDate(item.rework_date),
      }));

      res.json({ success: true, data: formattedData });

    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/pack/main/modal/fetchRawMatMix", async (req, res) => {
    try {
      const { tro_id } = req.query;

      if (!tro_id) {
        return res.status(400).json({ success: false, message: "Missing tro_id" });
      }

      const pool = await connectToDatabase();
      const result = await pool
        .request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
              SELECT
                rmm.tro_id,
                rmm.mapping_id,
                rmf.rmfp_id,
                b.batch_after,
                p.doc_no,
                p.code,
                l.line_name,
                rm.mat,
                rm.mat_name,
                rmm.dest,
                rmm.weight_RM,
                rmm.tray_count,
                rmg.rm_type_id,
                rmm.level_eu,
                rmf.rm_group_id,
                rmm.rm_status,
                q.sq_remark,
                q.md,
                q.md_remark,
                q.defect,
                q.defect_remark,
                q.md_no,
                q.qccheck,
                q.mdcheck,
                q.defectcheck,
                rmm.mix_code,
                h.hist_id,
                CONVERT(VARCHAR, h.withdraw_date, 120) AS withdraw_date,
                CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
                CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
                CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
                CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
                CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
                CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
                CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
                CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
                CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
                CONVERT(VARCHAR, h.sc_pack_date, 120) AS sc_pack_date,
                CONVERT(VARCHAR, h.rework_date, 120) AS rework_date,
                CONVERT(VARCHAR, h.mixed_date, 120) AS mixed_date,
                h.receiver,
                h.receiver_prep_two,
                h.receiver_qc,
                h.receiver_out_cold,
                h.receiver_out_cold_two,
                h.receiver_out_cold_three,
                h.receiver_oven_edit,
                h.receiver_pack_edit,
                h.remark_rework,
                h.location,
                CONCAT(p.doc_no, ' (', l.line_name, ')') AS production,
                CONVERT(VARCHAR, h.receiver, 120) AS receiver,
                CONVERT(VARCHAR, h.receiver_qc, 120) AS receiver_qc
              FROM
                TrolleyRMMapping rmm
              JOIN 
                RM_Mixed rmx ON rmm.mix_code = rmx.mixed_code
              JOIN
                RMForProd rmf ON rmf.rmfp_id = rmx.rmfp_id
              JOIN 
                history h ON rmx.mapping_id = h.mapping_id
              JOIN
                Line l ON l.line_name = rmf.rmfp_line_name
              JOIN
                Production p ON p.prod_id = rmm.prod_mix
              LEFT JOIN
                Batch b ON b.batch_id = rmx.batch_id
              JOIN 
                ProdRawMat prm ON prm.prod_rm_id = rmx.tro_production_id
              JOIN
                QC q ON q.qc_id = rmx.qc_id
              JOIN 
                RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
              JOIN
                RawMat rm ON prm.mat = rm.mat
              WHERE 
                  rmm.dest IN ('บรรจุ','ไปบรรจุ','รถเข็นรอจัดส่ง')
                  AND rmf.rm_group_id = rmg.rm_group_id
                  AND rmm.tro_id = @tro_id 
                  AND rmm.tro_id is not null
          `);

      const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };

      const formattedData = result.recordset.map(item => ({
        ...item,
        // "เวลาเบิกวัตถุดิบ": formatDate(item.withdraw_date),
        // "เวลาต้มอบเสร็จ": formatDate(item.cooked_date),
        // "เวลาแปรรูปเสร็จ": formatDate(item.rmit_date),
        // "เวลาเข้าห้องเย็น": formatDate(item.come_cold_date),
        // "เวลาออกห้องเย็น": formatDate(item.out_cold_date),
        // "เวลาแก้ไขเสร็จ": formatDate(item.rework_date),
      }));

      res.json({ success: true, data: formattedData });

    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put("/checkin/prep", async (req, res) => {
    const transaction = new sql.Transaction();

    try {
      const { tro_id, operator } = req.body;

      if (!tro_id) {
        return res.status(400).json({ error: "tro_id is required" });
      }

      const pool = await connectToDatabase();
      transaction.connection = pool;
      await transaction.begin();

      // 🔍 ดึงข้อมูลจาก TrolleyRMMapping ก่อน UPDATE
      const mappingDataResult = await new sql.Request(transaction)
        .input("tro_id", tro_id)
        .query(`
        SELECT 
          mapping_id,
          tro_id,
          rmfp_id,
          batch_id,
          tro_production_id,
          process_id,
          qc_id,
          weight_in_trolley,
          tray_count,
          weight_per_tray,
          weight_RM,
          level_eu,
          prep_to_cold_time,
          cold_time,
          prep_to_pack_time,
          cold_to_pack_time,
          rework_time,
          rm_status,
          rm_cold_status,
          stay_place,
          dest,
          mix_code,
          prod_mix,
          allocation_date,
          removal_date,
          status,
          production_batch,
          created_by,
          rmm_line_name,
          mix_time,
          from_mapping_id,
          tl_status
        FROM TrolleyRMMapping
        WHERE tro_id = @tro_id
      `);

      if (mappingDataResult.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูล tro_id: ${tro_id} ใน TrolleyRMMapping`);
      }

      const data = mappingDataResult.recordset[0];
      const mapping_id = data.mapping_id;

      // ✅ ตรวจสอบข้อมูลสำคัญ
      if (!data.rmfp_id) {
        throw new Error("ไม่พบข้อมูล rmfp_id ในระบบ");
      }

      // ✅ ตรวจสอบว่า QC ผ่านหรือไม่ (optional - ขึ้นอยู่กับ business logic)
      if (data.rm_status !== 'QcCheck') {
        console.warn(`⚠️ Warning: rm_status = '${data.rm_status}' (ไม่ใช่ 'QcCheck')`);
        // อาจจะ throw error หรือให้ผ่านไปก็ได้ ขึ้นอยู่กับความต้องการ
      }

      // 📝 INSERT เข้า MixToPack
      const insertMixToPackResult = await new sql.Request(transaction)
        .input("rmfp_id", sql.Int, data.rmfp_id)
        .input("batch_id", sql.Int, data.batch_id)
        .input("tro_production_id", sql.Int, data.tro_production_id)
        .input("process_id", sql.Int, data.process_id)
        .input("qc_id", sql.Int, data.qc_id)
        .input("weight_in_trolley", sql.Float, data.weight_in_trolley)
        .input("tray_count", sql.Int, data.tray_count)
        .input("weight_per_tray", sql.Float, data.weight_per_tray)
        .input("weight_RM", sql.Float, data.weight_RM)
        .input("level_eu", sql.NVarChar, data.level_eu)
        .input("prep_to_cold_time", sql.Int, data.prep_to_cold_time)
        .input("cold_time", sql.Int, data.cold_time)
        .input("prep_to_pack_time", sql.Int, data.prep_to_pack_time)
        .input("cold_to_pack_time", sql.Int, data.cold_to_pack_time)
        .input("rework_time", sql.Int, data.rework_time)
        .input("rm_status", sql.NVarChar, data.rm_status)
        .input("rm_cold_status", sql.NVarChar, data.rm_cold_status)
        .input("stay_place", sql.NVarChar, data.stay_place)
        .input("dest", sql.NVarChar, 'ผสมเตรียม') // ใช้ค่าใหม่
        .input("mix_code", sql.NVarChar, data.mix_code)
        .input("prod_mix", sql.NVarChar, data.prod_mix)
        .input("allocation_date", sql.DateTime, data.allocation_date)
        .input("removal_date", sql.DateTime, data.removal_date)
        .input("status", sql.NVarChar, data.status)
        .input("production_batch", sql.NVarChar, data.production_batch)
        .input("created_by", sql.NVarChar, operator) // ใช้ operator ปัจจุบัน
        .input("rmm_line_name", sql.NVarChar, data.rmm_line_name)
        .input("mix_time", sql.Int, data.mix_time)
        .input("from_mapping_id", sql.Int, mapping_id) // อ้างอิงกลับไป mapping_id เดิม
        .input("tl_status", sql.NVarChar, data.tl_status)
        .query(`
        DECLARE @InsertedMixToPackTable TABLE (mixtp_id INT);
        
        INSERT INTO [PFCMv2].[dbo].[MixToPack]
          (tro_id, rmfp_id, batch_id, tro_production_id, process_id, qc_id,
           weight_in_trolley, tray_count, weight_per_tray, weight_RM, level_eu,
           prep_to_cold_time, cold_time, prep_to_pack_time, cold_to_pack_time,
           rework_time, rm_status, rm_cold_status, stay_place, dest,
           mix_code, prod_mix, allocation_date, removal_date, status,
           production_batch, created_by, created_at, rmm_line_name, mix_time,
           from_mapping_id, tl_status)
        OUTPUT INSERTED.mixtp_id INTO @InsertedMixToPackTable
        VALUES
          (NULL, @rmfp_id, @batch_id, @tro_production_id, @process_id, @qc_id,
           @weight_in_trolley, @tray_count, @weight_per_tray, @weight_RM, @level_eu,
           @prep_to_cold_time, @cold_time, @prep_to_pack_time, @cold_to_pack_time,
           @rework_time, @rm_status, @rm_cold_status, @stay_place, @dest,
           @mix_code, @prod_mix, @allocation_date, @removal_date, @status,
           @production_batch, @created_by, GETDATE(), @rmm_line_name, @mix_time,
           @from_mapping_id, @tl_status);
        
        SELECT mixtp_id FROM @InsertedMixToPackTable;
      `);

      const new_mixtp_id = insertMixToPackResult.recordset[0].mixtp_id;
      console.log(`✅ INSERT ข้อมูลเข้า MixToPack สำเร็จ (mixtp_id: ${new_mixtp_id})`);

      // 1️⃣ เปลี่ยน dest → ผสมเตรียม + เคลียร์รถเข็น
      const updateMappingResult = await new sql.Request(transaction)
        .input("tro_id", tro_id)
        .query(`
        UPDATE TrolleyRMMapping
        SET 
          dest = N'ผสมเตรียม',
          tro_id = NULL
        WHERE tro_id = @tro_id
      `);

      if (updateMappingResult.rowsAffected[0] === 0) {
        throw new Error("No data updated in TrolleyRMMapping");
      }

      // 2️⃣ reset สถานะรถเข็น
      await new sql.Request(transaction)
        .input("tro_id", tro_id)
        .query(`
        UPDATE Trolley
        SET tro_status = 1
        WHERE tro_id = @tro_id
      `);

      console.log(`✅ เคลียร์รถเข็น tro_id = ${tro_id} ให้เป็นว่างแล้ว`);

      await transaction.commit();

      const payload = {
        message: "นำวัตถุดิบออกไปผสมเตรียมเรียบร้อย",
        tro_id,
        operator,
        mixtp_id: new_mixtp_id,
        mapping_id: mapping_id,
        updatedAt: new Date()
      };

      io.to("saveRMForProdRoom").emit("dataUpdated", payload);
      io.to("QcCheckRoom").emit("dataUpdated", payload);

      res.status(200).json(payload);

    } catch (error) {
      await transaction.rollback();
      console.error("checkin/prep error:", error);
      res.status(500).json({ error: error.message });
    }
  });




  // router.put("/prep/clear/trolley", async (req, res) => {
  //   try {
  //     const { tro_id } = req.body;

  //     if (!tro_id) {
  //       return res.status(400).json({ error: "tro_id is required" });
  //     }

  //     const troIdsArray = Array.isArray(tro_id) ? tro_id : [tro_id];

  //     const pool = await connectToDatabase();

  //     const table = new sql.Table();
  //     table.columns.add("tro_id", sql.VarChar(50));

  //     troIdsArray.forEach(id => {
  //       if (id) table.rows.add(id);
  //     });

  //     await pool.request()
  //       .input("TroIds", table)
  //       .execute("UpdateTrolleyData");

  //     const payload = {
  //       message: "อัพเดตรถเข็นเรียบร้อย",
  //       tro_ids: troIdsArray,
  //       updatedAt: new Date()
  //     };

  //     io.to("saveRMForProdRoom").emit("dataUpdated", payload);
  //     io.to("QcCheckRoom").emit("dataUpdated", payload);

  //     res.status(200).json(payload);

  //   } catch (error) {
  //     console.error("prep/clear/trolley error:", error);
  //     res.status(500).json({ error: error.message });
  //   }
  // });




  router.post("/pack/input/Trolley", async (req, res) => {
    const { tro_id } = req.body;
    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // ------- SELECT TrolleyRMMapping -------
      const data = await new sql.Request(transaction)
        .input("tro_id", sql.VarChar(20), tro_id)
        .query(`
        SELECT * FROM TrolleyRMMapping
        WHERE tro_id = @tro_id
      `);

      if (data.recordset.length > 0) {
        // ------- UPDATE TrolleyRMMapping -------
        const resultMapping = await new sql.Request(transaction)
          .input("tro_id", sql.VarChar(20), tro_id)
          .query(`
          UPDATE TrolleyRMMapping
          SET stay_place = N'บรรจุรับเข้า', dest = N'บรรจุ', tro_id = NULL, tl_status = '1226'
          WHERE tro_id = @tro_id
        `);

        if (resultMapping.rowsAffected[0] === 0) {
          throw new Error("ไม่สามารถอัปเดต TrolleyRMMapping ได้");
        }

        // ------- UPDATE History (ถ้าต้องการ) -------
        // const resultHistory = await new sql.Request(transaction)
        //   .input("tro_id", sql.VarChar(20), tro_id)
        //   .query(`
        //     UPDATE History 
        //     SET tro_id = NULL
        //     WHERE tro_id = @tro_id
        //   `);
      }

      // ------- UPDATE Trolley status -------
      const resultTrolley = await new sql.Request(transaction)
        .input("tro_id", sql.VarChar(20), tro_id)
        .query(`
        UPDATE Trolley
        SET tro_status = '1', status = '1.3'
        WHERE tro_id = @tro_id AND tro_status = '0'
      `);

      if (resultTrolley.rowsAffected[0] === 0) {
        throw new Error("ไม่สามารถอัปเดตสถานะ Trolley ได้ (อาจถูกใช้งานแล้ว)");
      }

      await transaction.commit();
      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });




  router.post("/pack/getout/Trolley", async (req, res) => {
    const { tro_id } = req.body;
    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // ✅ ใช้ request ผูกกับ transaction เดียว
      const request = new sql.Request(transaction);

      // ดึงข้อมูลที่อยู่ใน Trolley นี้ทั้งหมด
      const data = await request
        .input("tro_id", sql.VarChar(20), tro_id)
        .query(`
        SELECT mapping_id, from_mapping_id, weight_RM 
        FROM TrolleyRMMapping
        WHERE tro_id = @tro_id
      `);

      // ถ้ามีข้อมูลที่ต้องลบ
      if (data.recordset.length > 0) {
        // คืนค่าน้ำหนักกลับไปยัง mapping_id ต้นทาง
        for (const row of data.recordset) {
          const { from_mapping_id, weight_RM } = row;

          if (from_mapping_id) {
            // ดึงค่าน้ำหนักเดิมจาก mapping_id ต้นทาง
            const old = await request
              .input("mapping_id", sql.Int, from_mapping_id)
              .query(`
              SELECT * 
              FROM TrolleyRMMapping
              WHERE mapping_id = @mapping_id
            `);

            if (old.recordset.length > 0) {
              const updatedWeight = old.recordset[0].weight_RM + weight_RM;

              // อัปเดตน้ำหนักกลับไปที่ต้นทาง
              const updateWeight = await request
                .input("mapping_id", sql.Int, from_mapping_id)
                .input("weight_RM", sql.Float, updatedWeight)
                .query(`
                UPDATE TrolleyRMMapping 
                SET weight_RM = @weight_RM
                WHERE mapping_id = @mapping_id
              `);

              if (updateWeight.rowsAffected[0] === 0) {
                throw new Error("ไม่สามารถอัปเดตน้ำหนักกลับไปยังต้นทางได้");
              }
            }

            if (old.recordset[0].dest === 'บรรจุลบวัตถุดิบในรถเข็น' || old.recordset[0].stay_place === 'บรรจุลบวัตถุดิบในรถเข็น') {
              const oldRecord = old.recordset[0];
              const currentDate = new Date();

              // ดึงข้อมูลจาก History เดิม
              const selectHis = await request
                .input("mapping_id", sql.Int, from_mapping_id)
                .query(`
                SELECT withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date, 
                      come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three, 
                      sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc, 
                      receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three, 
                      receiver_oven_edit, receiver_pack_edit, remark_rework, location
                FROM History
                WHERE mapping_id = @mapping_id
              `);

              if (selectHis.recordset.length === 0) {
                throw new Error("ไม่พบข้อมูลใน History");
              }

              const historyData = selectHis.recordset[0];

              // เพิ่มข้อมูลใหม่เข้าไปใน TrolleyRMMapping
              const insertMap = await request
                .input("tro_id", sql.VarChar(20), oldRecord.tro_id || null)
                .input("rmfp_id", sql.Int, oldRecord.rmfp_id || null)
                .input("batch_id", sql.Int, oldRecord.batch_id || null)
                .input("tro_production_id", sql.Int, oldRecord.tro_production_id || null)
                .input("process_id", sql.Int, oldRecord.process_id || null)
                .input("qc_id", sql.Int, oldRecord.qc_id || null)
                .input("weight_in_trolley", sql.Float, oldRecord.weight_in_trolley || null)
                .input("tray_count", sql.Int, oldRecord.tray_count || null)
                .input("weight_per_tray", sql.Float, oldRecord.weight_per_tray || null)
                .input("weight_RM", sql.Float, weight_RM || null)
                .input("level_eu", sql.VarChar(5), oldRecord.level_eu || '')
                .input("prep_to_cold_time", sql.Float, oldRecord.prep_to_cold_time || null)
                .input("cold_time", sql.Float, oldRecord.cold_time || null)
                .input("prep_to_pack_time", sql.Float, oldRecord.prep_to_pack_time || null)
                .input("cold_to_pack_time", sql.Float, oldRecord.cold_to_pack_time || null)
                .input("rework_time", sql.Float, oldRecord.rework_time || null)
                .input("rm_status", sql.VarChar(25), oldRecord.rm_status || null)
                .input("rm_cold_status", sql.VarChar(25), oldRecord.rm_cold_status || null)
                .input("stay_place", sql.VarChar(25), 'บรรจุรับเข้า')
                .input("dest", sql.VarChar(25), 'บรรจุ')
                .input("mix_code", sql.Int, oldRecord.mix_code || null)
                .input("prod_mix", sql.Int, oldRecord.prod_mix || null)
                .input("allocation_date", sql.DateTime, currentDate)
                .input("removal_date", sql.DateTime, oldRecord.removal_date || null)
                .input("status", sql.VarChar(25), oldRecord.status || null)
                .input("production_batch", sql.VarChar(25), oldRecord.production_batch || null)
                .input("created_by", sql.VarChar(50), oldRecord.created_by || null)
                .input("created_at", sql.DateTime, currentDate)
                .input("updated_at", sql.DateTime, currentDate)
                .input("rmm_line_name", sql.VarChar(20), oldRecord.rmm_line_name || null)
                .input("mix_time", sql.Float, oldRecord.mix_time || null)
                .input("from_mapping_id", sql.Int, from_mapping_id || null)
                .input("tl_status", "1.4")

                .query(`
                INSERT INTO TrolleyRMMapping (
                  tro_id, rmfp_id, batch_id, tro_production_id, process_id,
                  qc_id, weight_in_trolley, tray_count, weight_per_tray, weight_RM,
                  level_eu, prep_to_cold_time, cold_time, prep_to_pack_time,
                  cold_to_pack_time, rework_time, rm_status, rm_cold_status,
                  stay_place, dest, mix_code, prod_mix, allocation_date,
                  removal_date, status, production_batch, created_by, created_at,
                  updated_at, rmm_line_name, mix_time, from_mapping_id,tl_status
                )
                OUTPUT INSERTED.mapping_id
                VALUES (
                  @tro_id, @rmfp_id, @batch_id, @tro_production_id, @process_id,
                  @qc_id, @weight_in_trolley, @tray_count, @weight_per_tray, @weight_RM,
                  @level_eu, @prep_to_cold_time, @cold_time, @prep_to_pack_time,
                  @cold_to_pack_time, @rework_time, @rm_status, @rm_cold_status,
                  @stay_place, @dest, @mix_code, @prod_mix, @allocation_date,
                  @removal_date, @status, @production_batch, @created_by, @created_at,
                  @updated_at, @rmm_line_name, @mix_time, @from_mapping_id,@tl_status
                )
              `);

              if (insertMap.rowsAffected[0] === 0) {
                throw new Error("Insert ลง TrolleyRMMapping ไม่สำเร็จ");
              }

              const newMappingId = insertMap.recordset[0].mapping_id;

              // เพิ่มข้อมูลใหม่ใน History
              const insertHis = await request
                .input("withdraw_date", sql.VarChar(25), historyData.withdraw_date)
                .input("cooked_date", sql.DateTime, historyData.cooked_date)
                .input("rmit_date", sql.DateTime, historyData.rmit_date)
                .input("qc_date", sql.DateTime, historyData.qc_date)
                .input("come_cold_date", sql.DateTime, historyData.come_cold_date)
                .input("out_cold_date", sql.DateTime, historyData.out_cold_date)
                .input("come_cold_date_two", sql.DateTime, historyData.come_cold_date_two)
                .input("out_cold_date_two", sql.DateTime, historyData.out_cold_date_two)
                .input("come_cold_date_three", sql.DateTime, historyData.come_cold_date_three)
                .input("out_cold_date_three", sql.DateTime, historyData.out_cold_date_three)
                .input("sc_pack_date", sql.DateTime, historyData.sc_pack_date)
                .input("rework_date", sql.DateTime, historyData.rework_date)
                .input("receiver", sql.VarChar(50), historyData.receiver)
                .input("receiver_prep_two", sql.VarChar(50), historyData.receiver_prep_two)
                .input("receiver_qc", sql.VarChar(50), historyData.receiver_qc)
                .input("receiver_out_cold", sql.VarChar(50), historyData.receiver_out_cold)
                .input("receiver_out_cold_two", sql.VarChar(50), historyData.receiver_out_cold_two)
                .input("receiver_out_cold_three", sql.VarChar(50), historyData.receiver_out_cold_three)
                .input("receiver_oven_edit", sql.VarChar(50), historyData.receiver_oven_edit)
                .input("receiver_pack_edit", sql.VarChar(50), historyData.receiver_pack_edit)
                .input("remark_rework", sql.VarChar(255), historyData.remark_rework)
                .input("location", sql.VarChar(50), historyData.location)
                .input("mapping_id", sql.Int, newMappingId)
                .input("rmm_line_name", sql.VarChar(20), oldRecord.rmm_line_name)
                .input("weight_RM", sql.Float, weight_RM)
                .input("tray_count", sql.Int, oldRecord.tray_count)
                .query(`
                INSERT INTO History 
                (withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date, 
                come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three, 
                sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc, 
                receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three, 
                receiver_oven_edit, receiver_pack_edit, remark_rework, location, mapping_id, rmm_line_name, created_at, weight_RM, tray_count)
                VALUES 
                (@withdraw_date, @cooked_date, @rmit_date, @qc_date, @come_cold_date, @out_cold_date, 
                @come_cold_date_two, @out_cold_date_two, @come_cold_date_three, @out_cold_date_three, 
                @sc_pack_date, @rework_date, @receiver, @receiver_prep_two, @receiver_qc, 
                @receiver_out_cold, @receiver_out_cold_two, @receiver_out_cold_three, 
                @receiver_oven_edit, @receiver_pack_edit, @remark_rework, @location, @mapping_id, @rmm_line_name, GETDATE(), @weight_RM, @tray_count)
              `);

              if (insertHis.rowsAffected[0] === 0) {
                throw new Error("Insert ลง History ไม่สำเร็จ");
              }
            }
          }
        }

        // ลบข้อมูลออกจาก Trolley เดิม
        const deleteResult = await request
          .input("tro_id", sql.VarChar(20), tro_id)
          .query(`
          DELETE FROM TrolleyRMMapping
          WHERE tro_id = @tro_id
        `);

        if (deleteResult.rowsAffected[0] === 0) {
          throw new Error("ไม่สามารถลบข้อมูลออกจาก Trolley ได้");
        }
      }

      await transaction.commit();
      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น และคืนน้ำหนักแล้ว" });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });



  router.get("/pack/manage/fetchRM/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params;
      const pool = await connectToDatabase();

      const lineFilter = line_id !== "1001" ? "AND l.line_id = @line_id" : "";

      const request = pool.request();
      if (line_id !== "1001") {
        request.input("line_id", sql.Int, parseInt(line_id, 10));
      }

      const result = await request.query(`
      SELECT
          rmf.rmfp_id,
          STRING_AGG(b.batch_after, ', ') AS batch_after,
          rm.mat,
          rm.mat_name,
          rmm.mapping_id,
          rmm.dest,
          rmm.stay_place,
          rmg.rm_type_id,
          rmm.rm_status,
          rmm.tray_count,
          rmm.weight_RM,
          rmm.level_eu,
          rmm.tro_id,
          FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
          FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
          FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,
          CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
          CONVERT(VARCHAR, h.receiver, 120) AS receiver,
          CONVERT(VARCHAR, h.receiver_qc, 120) AS receiver_qc,
          l.line_name,
          CONCAT(p.doc_no, ' (',rmm.rmm_line_name, ')') AS code,
          q.qc_id
      FROM
          RMForProd rmf
      JOIN
          TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
      LEFT JOIN
          Batch b ON rmm.mapping_id = b.mapping_id
      JOIN
          ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
      JOIN
          RawMat rm ON pr.mat = rm.mat
      JOIN
          Production p ON pr.prod_id = p.prod_id
      JOIN
          Line l ON rmm.rmm_line_name = l.line_name
      JOIN
          RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
      JOIN  
          History h ON rmm.mapping_id = h.mapping_id
      LEFT JOIN
          QC q ON rmm.qc_id = q.qc_id
      WHERE 
          rmm.stay_place IN ('จุดเตรียม','ออกห้องเย็น','บรรจุรับเข้า') 
          AND rmm.dest IN ('ไปบรรจุ', 'บรรจุ')
          AND rmf.rm_group_id = rmg.rm_group_id
           AND rmm.rm_status IN ('QcCheck','เหลือจากไลน์ผลิต')
          ${lineFilter}
      GROUP BY
          rmf.rmfp_id,
          rm.mat,
          rm.mat_name,
          rmm.mapping_id,
          rmm.dest,
          rmm.stay_place,
          rmg.rm_type_id,
          rmm.rm_status,
          rmm.tray_count,
          rmm.weight_RM,
          rmm.level_eu,
          rmm.tro_id,
          rmm.cold_to_pack_time,
          rmg.cold_to_pack,
          rmm.prep_to_pack_time,
          rmg.prep_to_pack,
          rmm.rework_time,
          rmg.rework,
          h.cooked_date,
          h.rmit_date,
          h.come_cold_date,
          h.out_cold_date,
          h.come_cold_date_two,
          h.out_cold_date_two,
          h.come_cold_date_three,
          h.out_cold_date_three,
          h.qc_date,
          h.receiver,
          h.receiver_qc,
          l.line_name,
          p.doc_no,
          rmm.rmm_line_name,
          q.qc_id
    `);

      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');

        item.CookedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;
        delete item.cooked_date;
        return item;
      });

      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });



  //name
  router.get("/pack/select/Trolley", async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
          WITH UniqueItems AS (
              SELECT
                  STRING_AGG(CAST(rmt.rm_tro_id AS NVARCHAR), ',') AS rm_tro_id,
                  rmt.tro_id,
                  rmt.weight_per_tro,
                  rmt.weight_RM,
                  rmt.ntray
              FROM
                  RMInTrolley rmt
              JOIN  
                  RMForProd rmf ON rmt.rmfp_id = rmf.rmfp_id  
              JOIN
                  RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
              WHERE 
                  rmt.dest = 'บรรจุ-รอรถเข็น'
                  AND rmf.rm_group_id = rmg.rm_group_id
              GROUP BY
                  rmt.tro_id,
                  rmt.weight_per_tro,
                  rmt.weight_RM,
                  rmt.ntray
          )
          SELECT * FROM UniqueItems
      `);

      // Group items by `tro_id` and merge `rm_tro_id` into an array
      const groupedData = result.recordset.reduce((acc, item) => {
        if (!acc[item.tro_id]) {
          acc[item.tro_id] = {
            ...item,
            rm_tro_id: [item.rm_tro_id],
          };
        } else {
          acc[item.tro_id].rm_tro_id.push(item.rm_tro_id);
        }
        return acc;
      }, {});

      // Convert grouped data into an array and send as response
      const formattedData = Object.values(groupedData);

      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post("/packed/mix/success", async (req, res) => {
    const { mix_code } = req.body;


    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      if (!mix_code) {
        return res.status(400).json({ success: false, error: "Missing required fields or invalid mix_code" });
      }

      await transaction.begin();

      // ตรวจสอบสถานะของ rework_time และ cold_time เพื่อกำหนดตัวแปรที่จะอัปเดต delay_time
      const checkResult = await transaction.request()
        .input("mix_code", sql.Int, mix_code)
        .query(`
        SELECT mapping_id,rework_time, cold_time 
        FROM TrolleyRMMapping 
        WHERE mix_code = @mix_code
      `);

      if (checkResult.recordset.length > 0) {
        const { mapping_id, rework_time, cold_time } = checkResult.recordset[0];

        // ทำการอัปเดตตามเงื่อนไข
        if (rework_time !== null) {
          // กรณี rework_time ไม่เท่ากับ null
          await transaction.request()
            .input("mapping_id", sql.Int, mapping_id)
            .query(`
            UPDATE TrolleyRMMapping
            SET rework_time = @delay_time
            WHERE mapping_id = @mapping_id
          `);
        } else if (cold_time !== null) {
          // กรณี rework_time เป็น null และ cold_time ไม่เป็น null
          await transaction.request()
            .input("mapping_id", sql.Int, mapping_id)
            .query(`
            UPDATE TrolleyRMMapping
            SET cold_to_pack_time = @delay_time
            WHERE mapping_id = @mapping_id
          `);
        } else {
          // กรณี rework_time เป็น null และ cold_time เป็น null
          await transaction.request()
            .input("mapping_id", sql.Int, mapping_id)
            .query(`
            UPDATE TrolleyRMMapping
            SET prep_to_pack_time = @delay_time
            WHERE mapping_id = @mapping_id
          `);
        }
      }

      // Update RMInTrolley
      await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
       UPDATE TrolleyRMMapping
       SET stay_place = 'บรรจุเสร็จสิ้นm', dest = 'บรรจุเสร็จสิ้นm'
       WHERE mapping_id = @mapping_id
    `);

      await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
        UPDATE History
        SET sc_pack_date = GETDATE()
        WHERE mapping_id = @mapping_id
      `);

      const result = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query("SELECT hist_id_rmfp FROM TrolleyRMMapping AS rmm JOIN RMForProd AS rmfp ON rmfp.rmfp_id = rmm.rmfp_id WHERE mapping_id = @mapping_id");

      if (result.recordset.length === 0) {
        console.warn("ไม่พบข้อมูล hist_id_rmfp สำหรับ mapping_id:", mapping_id);
      } else {
        for (const row of result.recordset) {
          try {
            const hist_id_rmfp = row.hist_id_rmfp;

            await transaction.request()
              .input("hist_id_rmfp", sql.Int, hist_id_rmfp)
              .query(`
              UPDATE History
              SET sc_pack_date = GETDATE()
              WHERE hist_id = @hist_id_rmfp
            `);

          } catch (updateError) {
            console.error("เกิดข้อผิดพลาดในการอัปเดต History:", updateError);
          }
        }
      }

      // Commit transaction
      await transaction.commit();
      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post("/pack/success/packing", async (req, res) => {
    const { mapping_id } = req.body;

    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      if (!mapping_id) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields or invalid mapping_id",
        });
      }

      await transaction.begin();

      const updateTrolley = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
        UPDATE TrolleyRMMapping
        SET stay_place = 'บรรจุลบจากปุ่มเคลียร์',
            dest = 'บรรจุลบจากปุ่มเคลียร์'
        WHERE mapping_id = @mapping_id
      `);

      if (updateTrolley.rowsAffected[0] === 0) {
        throw new Error("อัปเดต TrolleyRMMapping ไม่สำเร็จ (ไม่พบ mapping_id ที่ต้องการ)");
      }

      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลเสร็จสิ้น",
      });

    } catch (err) {
      if (transaction._aborted !== true) {
        try {
          await transaction.rollback();
        } catch (rollbackErr) {
          console.error("Rollback failed:", rollbackErr);
        }
      }
      console.error("SQL error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });


  router.post("/rework/saveTrolley", async (req, res) => {
    const { license_plate, recorder, Dest, rm_tro_id, remark } = req.body;

    console.log("Received data:", req.body);
    const pool = await connectToDatabase();
    const sql = require("mssql");
    const transaction = new sql.Transaction(pool);

    try {
      if (!rm_tro_id || isNaN(rm_tro_id)) {
        return res.status(400).json({ success: false, error: "Missing or invalid rm_tro_id" });
      }

      await transaction.begin();

      // Update RMInTrolley
      const request1 = new sql.Request(transaction);
      const updateRMInTrolley = await request1
        .input("rm_tro_id", sql.Int, rm_tro_id)
        .input("tro_id", sql.VarChar(10), license_plate)
        .input("dest", sql.NVarChar(50), Dest)
        .query(`
        UPDATE RMInTrolley 
        SET tro_id = @tro_id, dest = @dest, rm_status = 'รอแก้ไข', stay_place = 'บรรจุ'
        WHERE rm_tro_id = @rm_tro_id
      `);

      if (updateRMInTrolley.rowsAffected[0] === 0) {
        throw new Error("Update RMInTrolley ไม่สำเร็จ");
      }

      // Update Trolley
      const updateTrolley = await transaction.request()
        .input("tro_id", sql.VarChar(10), license_plate)
        .query(`
        UPDATE Trolley
        SET tro_status = '0'
        WHERE tro_id = @tro_id
      `);

      if (updateTrolley.rowsAffected[0] === 0) {
        throw new Error("Update Trolley ไม่สำเร็จ");
      }

      // ดึง hist_id_rmit
      const result = await transaction.request()
        .input("rm_tro_id", sql.Int, rm_tro_id) // ใช้ค่าเดียวของ rm_tro_id
        .query(`
        SELECT hist_id_rmit 
        FROM RMInTrolley 
        WHERE rm_tro_id = @rm_tro_id
      `);

      if (result.recordset.length === 0) {
        console.warn("ไม่พบข้อมูล hist_id_rmit สำหรับ rm_tro_id:", rm_tro_id);
      } else {
        const hist_id_rmit = result.recordset[0].hist_id_rmit;

        const request4 = new sql.Request(transaction);
        const updateHistory = await request4
          .input("hist_id_rmit", sql.Int, hist_id_rmit)
          .input("receiver_pack_edit", sql.NVarChar(100), recorder)
          .input("remark_rework", sql.NVarChar(255), remark)
          .query(`
          UPDATE History
          SET receiver_pack_edit = @receiver_pack_edit, remark_rework = @remark_rework
          WHERE hist_id = @hist_id_rmit
        `);

        if (updateHistory.rowsAffected[0] === 0) {
          throw new Error("Update History ไม่สำเร็จ");
        }
      }

      await transaction.commit();

      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post("/pack/Add/Trolley", async (req, res) => {
    const { tro_id, line_id } = req.body;
    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {

      await transaction.begin();

      const result = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .input("line_id", sql.Int, line_id)
        .input("pack_tro_status", '0')
        .query(`
        Insert into PackTrolley (tro_id,pack_tro_status,line_tro)
        values (@tro_id,@pack_tro_status,@line_id)
    `);

      await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
      UPDATE Trolley SET tro_status = 0 ,rsrv_timestamp = null WHERE tro_id = @tro_id
  `);

      await transaction.commit();
      io.to('PackRoom').emit('dataUpdated', 'gotUpdate!');

      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/pack/Trolley/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params;
      const pool = await connectToDatabase();
      const packtrolley = await pool
        .request()
        .query(`
                SELECT
                   ptl.tro_id
                FROM
                    PackTrolley ptl
                WHERE 
                    ptl.pack_tro_status = '0' 
                    AND ptl.line_tro = '${line_id}'
            `);

      res.json({ success: true, data: packtrolley.recordset });

    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // router.put("/pack/matmanage/Add/rm/TrolleyMapping", async (req, res) => {
  //   const { tro_id, rmfpID, mapping_id, weight_per_tro, ntray, batch_after } = req.body;
  //   console.log("body :", req.body);
  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);

  //   try {
  //     await transaction.begin();
  //     let batch_id = null;

  //     if (batch_after) {
  //       const batchResult = await transaction.request()
  //         .input("batch_after", sql.NVarChar, batch_after)
  //         .query(`
  //         SELECT batch_id 
  //         FROM Batch 
  //         WHERE batch_after = @batch_after
  //       `);

  //       if (batchResult.recordset.length > 0) {
  //         batch_id = batchResult.recordset[0].batch_id;
  //       }
  //     }

  //     // ดึงข้อมูล mapping ปัจจุบัน
  //     const selectRawMat = await transaction.request()
  //       .input("mapping_id", sql.Int, mapping_id)
  //       .query(`
  //       SELECT rmfp.hist_id_rmfp, rmm.tro_production_id, rmm.process_id, rmm.qc_id, rmm.cold_time, rmm.rmfp_id,
  //             rmm.weight_RM, rmm.level_eu, rmm.prep_to_cold_time, rmm.rm_cold_status,
  //             rmm.mix_code, rmm.prod_mix, rmm.production_batch,rmm_line_name
  //       FROM TrolleyRMMapping AS rmm
  //       JOIN RMForProd AS rmfp ON rmfp.rmfp_id = rmm.rmfp_id
  //       WHERE mapping_id = @mapping_id
  //     `);

  //     if (selectRawMat.recordset.length === 0) {
  //       throw new Error("ไม่พบข้อมูลใน TrolleyRMMapping");
  //     }

  //     const {
  //       hist_id_rmfp,
  //       tro_production_id,
  //       process_id,
  //       qc_id,
  //       cold_time,
  //       rmfp_id,
  //       weight_RM,
  //       level_eu,
  //       prep_to_cold_time,
  //       rm_cold_status,
  //       mix_code,
  //       prod_mix,
  //       production_batch,
  //       rmm_line_name
  //     } = selectRawMat.recordset[0];

  //     // ตรวจสอบน้ำหนักก่อน
  //     const remainingWeight = weight_RM - weight_per_tro;
  //     if (remainingWeight < 0) {
  //       throw new Error("น้ำหนักที่ย้ายมากกว่าน้ำหนักที่มีอยู่");
  //     }
  //     // ตรวจสอบว่าน้ำหนักที่เหลือเป็น 0 หรือไม่ (ย้ายทั้งหมด)
  //     const isMovingAll = remainingWeight === 0;

  //     // อัปเดตน้ำหนักใน mapping เดิม
  //     await transaction.request()
  //       .input("mapping_id", sql.Int, mapping_id)
  //       .input("remainingWeight", sql.Float, remainingWeight)
  //       .input("dest", sql.VarChar(25), isMovingAll ? "บรรจุเสร็จสิ้น" : "บรรจุ")
  //       .input("stay_place", sql.VarChar(25), isMovingAll ? "บรรจุเสร็จสิ้น" : "บรรจุรับเข้า")
  //       .query(`
  //       UPDATE TrolleyRMMapping
  //       SET weight_RM = @remainingWeight,
  //           dest = @dest,
  //           stay_place = @stay_place
  //       WHERE mapping_id = @mapping_id
  //     `);

  //     // ดึงข้อมูลจาก History เดิม
  //     const selectHis = await transaction.request()
  //       .input("mapping_id", sql.Int, mapping_id)
  //       .query(`
  //       SELECT withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date, 
  //              come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three, 
  //              sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc, 
  //              receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three, 
  //              receiver_oven_edit, receiver_pack_edit, remark_rework, location
  //       FROM History
  //       WHERE mapping_id = @mapping_id
  //     `);

  //     if (selectHis.recordset.length === 0) {
  //       throw new Error("ไม่พบข้อมูลใน History");
  //     }

  //     const historyData = selectHis.recordset[0];

  //     // เพิ่มข้อมูลใหม่ใน History (ยังไม่ใส่ mapping_id ตอนนี้)
  //     const insertHis = await transaction.request()
  //       .input("withdraw_date", historyData.withdraw_date)
  //       .input("cooked_date", historyData.cooked_date)
  //       .input("rmit_date", historyData.rmit_date)
  //       .input("qc_date", historyData.qc_date)
  //       .input("come_cold_date", historyData.come_cold_date)
  //       .input("out_cold_date", historyData.out_cold_date)
  //       .input("come_cold_date_two", historyData.come_cold_date_two)
  //       .input("out_cold_date_two", historyData.out_cold_date_two)
  //       .input("come_cold_date_three", historyData.come_cold_date_three)
  //       .input("out_cold_date_three", historyData.out_cold_date_three)
  //       .input("sc_pack_date", historyData.sc_pack_date)
  //       .input("rework_date", historyData.rework_date)
  //       .input("receiver", historyData.receiver)
  //       .input("receiver_prep_two", historyData.receiver_prep_two)
  //       .input("receiver_qc", historyData.receiver_qc)
  //       .input("receiver_out_cold", historyData.receiver_out_cold)
  //       .input("receiver_out_cold_two", historyData.receiver_out_cold_two)
  //       .input("receiver_out_cold_three", historyData.receiver_out_cold_three)
  //       .input("receiver_oven_edit", historyData.receiver_oven_edit)
  //       .input("receiver_pack_edit", historyData.receiver_pack_edit)
  //       .input("remark_rework", historyData.remark_rework)
  //       .input("rmm_line_name", rmm_line_name)
  //       .input("location", historyData.location)
  //       .input("weight_RM", sql.Float, weight_per_tro)
  //       .input("tray_count", sql.Int, ntray)
  //       .query(`
  //       INSERT INTO History 
  //       (withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date, 
  //        come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three, 
  //        sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc, 
  //        receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three, 
  //        receiver_oven_edit, receiver_pack_edit, remark_rework, location, mapping_id, rmm_line_name,created_at,weight_RM,tray_count)
  //       OUTPUT INSERTED.hist_id
  //       VALUES (@withdraw_date, @cooked_date, @rmit_date, @qc_date, @come_cold_date, @out_cold_date, 
  //               @come_cold_date_two, @out_cold_date_two, @come_cold_date_three, @out_cold_date_three, 
  //               @sc_pack_date, @rework_date, @receiver, @receiver_prep_two, @receiver_qc, 
  //               @receiver_out_cold, @receiver_out_cold_two, @receiver_out_cold_three, 
  //               @receiver_oven_edit, @receiver_pack_edit, @remark_rework, @location, NULL, @rmm_line_name,GETDATE(),@weight_RM,@tray_count)
  //     `);

  //     const pkhis = insertHis.recordset[0].hist_id;
  //     const currentDate = new Date();

  //     // เพิ่มรายการใหม่ใน TrolleyRMMapping
  //     await transaction.request()
  //       .input("tro_id", sql.VarChar(4), tro_id)
  //       .input("rmfp_id", sql.Int, rmfpID)
  //       .input("batch_id", sql.Int, batch_id)
  //       .input("weight_RM", sql.Float, weight_per_tro)
  //       .input("tray_count", sql.Int, ntray)
  //       .input("rm_status", sql.VarChar(25), "QcCheck")
  //       .input("allocation_date", sql.DateTime, currentDate)
  //       .input("status", sql.VarChar(25), "active")
  //       .input("dest", sql.VarChar(25), "รถเข็นรอจัดส่ง")
  //       .input("stay_place", sql.VarChar(25), "บรรจุ")
  //       .input("created_by", sql.VarChar(50), req.user?.username || "system2095")
  //       .input("tro_production_id", sql.Int, tro_production_id)
  //       .input("process_id", sql.Int, process_id)
  //       .input("qc_id", sql.Int, qc_id)
  //       .input("cold_time", sql.Float, cold_time)
  //       .input("level_eu", sql.NVarChar(50), level_eu)
  //       .input("prep_to_cold_time", sql.Float, prep_to_cold_time)
  //       .input("rm_cold_status", sql.VarChar(20), rm_cold_status)
  //       .input("mix_code", sql.VarChar(20), mix_code)
  //       .input("prod_mix", sql.VarChar(20), prod_mix)
  //       .input("production_batch", sql.VarChar(20), production_batch)
  //       .input("rmm_line_name", sql.VarChar(20), rmm_line_name)
  //       .input("from_mapping_id", sql.Int, mapping_id)
  //       .input("tl_status", "1.5")
  //       .query(`
  //       INSERT INTO TrolleyRMMapping 
  //       (tro_id, rmfp_id, batch_id, weight_RM, tray_count, rm_status, allocation_date, status, dest, stay_place, created_by, 
  //        tro_production_id, process_id, qc_id, cold_time, level_eu, prep_to_cold_time, rm_cold_status, rmm_line_name,
  //        mix_code, prod_mix, production_batch, from_mapping_id,created_at,tl_status)
  //       VALUES 
  //       (@tro_id, @rmfp_id, @batch_id, @weight_RM, @tray_count, @rm_status, @allocation_date, @status, @dest, @stay_place, @created_by, 
  //        @tro_production_id, @process_id, @qc_id, @cold_time, @level_eu, @prep_to_cold_time, @rm_cold_status, @rmm_line_name,
  //        @mix_code, @prod_mix, @production_batch, @from_mapping_id,GETDATE(),@tl_status)
  //     `);

  //     // ดึง mapping_id ที่เพิ่ง insert
  //     const newMappingResult = await transaction.request()
  //       .input("tro_id", sql.VarChar(4), tro_id)
  //       .input("rmfp_id", sql.Int, rmfpID)
  //       .input("allocation_date", sql.DateTime, currentDate)
  //       .query(`
  //       SELECT TOP 1 mapping_id
  //       FROM TrolleyRMMapping
  //       WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id AND allocation_date = @allocation_date
  //       ORDER BY mapping_id DESC
  //     `);

  //     const newMappingId = newMappingResult.recordset[0]?.mapping_id;
  //     if (!newMappingId) {
  //       throw new Error("ไม่สามารถดึง mapping_id ของรายการใหม่ได้");
  //     }

  //     // อัปเดต mapping_id ลงใน History
  //     await transaction.request()
  //       .input("hist_id", sql.Int, pkhis)
  //       .input("mapping_id", sql.Int, newMappingId)
  //       .query(`
  //       UPDATE History
  //       SET mapping_id = @mapping_id
  //       WHERE hist_id = @hist_id
  //     `);

  //     await transaction.commit();
  //     return res.status(200).json({ success: true, message: "บันทึกและย้ายวัตถุเสร็จสิ้น" });

  //   } catch (err) {
  //     await transaction.rollback();
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });

  router.put("/pack/matmanage/Add/rm/TrolleyMapping", async (req, res) => {
    const { tro_id, rmfpID, mapping_id, weight_per_tro, ntray, batch_after } = req.body;


    console.log("body :", req.body);


    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);


    const toVarChar = (v) => (v !== undefined && v !== null ? String(v).trim() : null);


    try {
      await transaction.begin();


      let batch_id = null;


      // ===============================
      // หา batch_id จาก batch_after
      // ===============================
      if (batch_after) {
        const batchResult = await transaction.request()
          .input("batch_after", sql.NVarChar, toVarChar(batch_after))
          .query(`
          SELECT batch_id
          FROM Batch
          WHERE batch_after = @batch_after
        `);


        if (batchResult.recordset.length > 0) {
          batch_id = batchResult.recordset[0].batch_id;
        }
      }


      // ===============================
      // ดึง mapping เดิม
      // ===============================
      const selectRawMat = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
        SELECT rmfp.hist_id_rmfp, rmm.tro_production_id, rmm.process_id, rmm.qc_id,
               rmm.cold_time, rmm.rmfp_id, rmm.weight_RM, rmm.level_eu,
               rmm.prep_to_cold_time, rmm.rm_cold_status,
               rmm.mix_code, rmm.prod_mix, rmm.production_batch, rmm_line_name
        FROM TrolleyRMMapping AS rmm
        JOIN RMForProd AS rmfp ON rmfp.rmfp_id = rmm.rmfp_id
        WHERE mapping_id = @mapping_id
      `);


      if (selectRawMat.recordset.length === 0) {
        throw new Error("ไม่พบข้อมูลใน TrolleyRMMapping");
      }


      const data = selectRawMat.recordset[0];


      // ===============================
      // คำนวณน้ำหนักคงเหลือ
      // ===============================
      const remainingWeight = data.weight_RM - weight_per_tro;


      if (remainingWeight < 0) {
        throw new Error("น้ำหนักที่ย้ายมากกว่าน้ำหนักที่มีอยู่");
      }


      // ===============================
      // ✅ update mapping เดิม — ลดน้ำหนักอย่างเดียว
      // ===============================
      await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .input("remainingWeight", sql.Float, remainingWeight)
        .query(`
        UPDATE TrolleyRMMapping
        SET weight_RM = @remainingWeight
        WHERE mapping_id = @mapping_id
      `);


      // ===============================
      // ดึง History เดิม
      // ===============================
      const selectHis = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`SELECT * FROM History WHERE mapping_id = @mapping_id`);


      if (selectHis.recordset.length === 0) {
        throw new Error("ไม่พบข้อมูลใน History");
      }


      const historyData = selectHis.recordset[0];


      // ===============================
      // insert History ใหม่
      // ===============================
      const insertHis = await transaction.request()
        .input("withdraw_date", historyData.withdraw_date)
        .input("cooked_date", historyData.cooked_date)
        .input("rmit_date", historyData.rmit_date)
        .input("qc_date", historyData.qc_date)
        .input("come_cold_date", historyData.come_cold_date)
        .input("out_cold_date", historyData.out_cold_date)
        .input("come_cold_date_two", historyData.come_cold_date_two)
        .input("out_cold_date_two", historyData.out_cold_date_two)
        .input("come_cold_date_three", historyData.come_cold_date_three)
        .input("out_cold_date_three", historyData.out_cold_date_three)
        .input("sc_pack_date", historyData.sc_pack_date)
        .input("rework_date", historyData.rework_date)
        .input("receiver", historyData.receiver)
        .input("receiver_prep_two", historyData.receiver_prep_two)
        .input("receiver_qc", historyData.receiver_qc)
        .input("receiver_out_cold", historyData.receiver_out_cold)
        .input("receiver_out_cold_two", historyData.receiver_out_cold_two)
        .input("receiver_out_cold_three", historyData.receiver_out_cold_three)
        .input("receiver_oven_edit", historyData.receiver_oven_edit)
        .input("receiver_pack_edit", historyData.receiver_pack_edit)
        .input("remark_rework", historyData.remark_rework)
        .input("location", historyData.location)
        .input("rmm_line_name", toVarChar(data.rmm_line_name))
        .input("weight_RM", sql.Float, weight_per_tro)
        .input("tray_count", sql.Int, ntray)
        .query(`
        INSERT INTO History
        (withdraw_date,cooked_date,rmit_date,qc_date,come_cold_date,out_cold_date,
         come_cold_date_two,out_cold_date_two,come_cold_date_three,out_cold_date_three,
         sc_pack_date,rework_date,receiver,receiver_prep_two,receiver_qc,
         receiver_out_cold,receiver_out_cold_two,receiver_out_cold_three,
         receiver_oven_edit,receiver_pack_edit,remark_rework,location,
         mapping_id,rmm_line_name,created_at,weight_RM,tray_count)
        OUTPUT INSERTED.hist_id
        VALUES
        (@withdraw_date,@cooked_date,@rmit_date,@qc_date,@come_cold_date,@out_cold_date,
         @come_cold_date_two,@out_cold_date_two,@come_cold_date_three,@out_cold_date_three,
         @sc_pack_date,@rework_date,@receiver,@receiver_prep_two,@receiver_qc,
         @receiver_out_cold,@receiver_out_cold_two,@receiver_out_cold_three,
         @receiver_oven_edit,@receiver_pack_edit,@remark_rework,@location,
         NULL,@rmm_line_name,GETDATE(),@weight_RM,@tray_count)
      `);


      const pkhis = insertHis.recordset[0].hist_id;
      const currentDate = new Date();


      // ===============================
      // insert mapping ใหม่
      // ===============================
      const insertMapping = await transaction.request()
        .input("tro_id", sql.VarChar(4), toVarChar(tro_id))
        .input("rmfp_id", sql.Int, rmfpID)
        .input("batch_id", sql.Int, batch_id)
        .input("weight_RM", sql.Float, weight_per_tro)
        .input("tray_count", sql.Int, ntray)
        .input("rm_status", sql.VarChar(25), "QcCheck")
        .input("allocation_date", sql.DateTime, currentDate)
        .input("status", sql.VarChar(25), "active")
        .input("dest", sql.VarChar(25), "รถเข็นรอจัดส่ง")
        .input("stay_place", sql.VarChar(25), "บรรจุ")
        .input("created_by", sql.VarChar(50), toVarChar(req.user?.username || "system2095"))
        .input("tro_production_id", sql.Int, data.tro_production_id)
        .input("process_id", sql.Int, data.process_id)
        .input("qc_id", sql.Int, data.qc_id)
        .input("cold_time", sql.Float, data.cold_time)
        .input("level_eu", sql.NVarChar(50), toVarChar(data.level_eu))
        .input("prep_to_cold_time", sql.Float, data.prep_to_cold_time)
        .input("rm_cold_status", sql.VarChar(20), toVarChar(data.rm_cold_status))
        .input("mix_code", sql.VarChar(20), toVarChar(data.mix_code))
        .input("prod_mix", sql.VarChar(20), toVarChar(data.prod_mix))
        .input("production_batch", sql.VarChar(20), toVarChar(data.production_batch))
        .input("rmm_line_name", sql.VarChar(20), toVarChar(data.rmm_line_name))
        .input("from_mapping_id", sql.Int, mapping_id)
        .input("tl_status", sql.VarChar(10), "1.5")
        .query(`
        INSERT INTO TrolleyRMMapping
        (tro_id,rmfp_id,batch_id,weight_RM,tray_count,rm_status,allocation_date,status,
         dest,stay_place,created_by,tro_production_id,process_id,qc_id,cold_time,
         level_eu,prep_to_cold_time,rm_cold_status,rmm_line_name,mix_code,
         prod_mix,production_batch,from_mapping_id,created_at,tl_status)
        OUTPUT INSERTED.mapping_id
        VALUES
        (@tro_id,@rmfp_id,@batch_id,@weight_RM,@tray_count,@rm_status,@allocation_date,@status,
         @dest,@stay_place,@created_by,@tro_production_id,@process_id,@qc_id,@cold_time,
         @level_eu,@prep_to_cold_time,@rm_cold_status,@rmm_line_name,@mix_code,
         @prod_mix,@production_batch,@from_mapping_id,GETDATE(),@tl_status)
      `);


      const newMappingId = insertMapping.recordset[0].mapping_id;


      // ===============================
      // copy batch เดิม
      // ===============================
      const oldBatch = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
        SELECT batch_before, batch_after
        FROM Batch
        WHERE mapping_id = @mapping_id
      `);


      if (oldBatch.recordset.length > 0) {
        const b = oldBatch.recordset[0];


        await transaction.request()
          .input("mapping_id", sql.Int, newMappingId)
          .input("batch_before", sql.NVarChar(50), toVarChar(b.batch_before))
          .input("batch_after", sql.NVarChar(50), toVarChar(batch_after || b.batch_after))
          .query(`
          INSERT INTO Batch
          (mapping_id, batch_before, batch_after)
          VALUES
          (@mapping_id, @batch_before, @batch_after)
        `);
      }


      // ===============================
      // update history → mapping ใหม่
      // ===============================
      await transaction.request()
        .input("hist_id", sql.Int, pkhis)
        .input("mapping_id", sql.Int, newMappingId)
        .query(`
        UPDATE History
        SET mapping_id = @mapping_id
        WHERE hist_id = @hist_id
      `);


      await transaction.commit();


      res.status(200).json({
        success: true,
        message: "บันทึกและย้ายวัตถุเสร็จสิ้น"
      });


    } catch (err) {
      await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });





  router.post("/pack/matmanage/Add/rm/Trolley/v1", async (req, res) => {
    const { tro_id, rmfpID, rm_tro_id, weight_per_tro, ntray, batch_after } = req.body;
    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      if (batch_after) {
        const batchResult = await transaction.request()
          .input("batch_after", sql.NVarChar, batch_after)
          .query(`
          SELECT batch_id 
          FROM Batch 
          WHERE batch_after = @batch_after
        `);

        if (batchResult.recordset.length > 0) {
          batch_id = batchResult.recordset[0].batch_id;
        }
      }
      const selectRawMat = await transaction.request()
        .input("rm_tro_id", sql.Int, rm_tro_id)
        .query(`
        SELECT withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date, 
               come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three, 
               sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc, 
               receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three, 
               receiver_oven_edit, receiver_pack_edit, remark_rework, location
        FROM History
        WHERE hist_id = @hist_id_rmit
      `);

      if (selectHis.recordset.length === 0) {
        throw new Error("ไม่พบข้อมูลใน History");
      }

      const historyData = selectHis.recordset[0];

      const insertHis = await transaction.request()
        .input("withdraw_date", historyData.withdraw_date)
        .input("cooked_date", historyData.cooked_date)
        .input("rmit_date", historyData.rmit_date)
        .input("qc_date", historyData.qc_date)
        .input("come_cold_date", historyData.come_cold_date)
        .input("out_cold_date", historyData.out_cold_date)
        .input("come_cold_date_two", historyData.come_cold_date_two)
        .input("out_cold_date_two", historyData.out_cold_date_two)
        .input("come_cold_date_three", historyData.come_cold_date_three)
        .input("out_cold_date_three", historyData.out_cold_date_three)
        .input("sc_pack_date", historyData.sc_pack_date)
        .input("rework_date", historyData.rework_date)
        .input("receiver", historyData.receiver)
        .input("receiver_prep_two", historyData.receiver_prep_two)
        .input("receiver_qc", historyData.receiver_qc)
        .input("receiver_out_cold", historyData.receiver_out_cold)
        .input("receiver_out_cold_two", historyData.receiver_out_cold_two)
        .input("receiver_out_cold_three", historyData.receiver_out_cold_three)
        .input("receiver_oven_edit", historyData.receiver_oven_edit)
        .input("receiver_pack_edit", historyData.receiver_pack_edit)
        .input("remark_rework", historyData.remark_rework)
        .input("location", historyData.location)
        .query(`
        INSERT INTO History 
        (withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date, 
         come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three, 
         sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc, 
         receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three, 
         receiver_oven_edit, receiver_pack_edit, remark_rework, location)
        OUTPUT INSERTED.hist_id
        VALUES (@withdraw_date, @cooked_date, @rmit_date, @qc_date, @come_cold_date, @out_cold_date, 
                @come_cold_date_two, @out_cold_date_two, @come_cold_date_three, @out_cold_date_three, 
                @sc_pack_date, @rework_date, @receiver, @receiver_prep_two, @receiver_qc, 
                @receiver_out_cold, @receiver_out_cold_two, @receiver_out_cold_three, 
                @receiver_oven_edit, @receiver_pack_edit, @remark_rework, @location)
      `);

      const pkhis = insertHis.recordset[0].hist_id; // เก็บค่า hist_id ที่ insert ใหม่

      const insertRMInTrolley = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .input("rmfp_id", sql.Int, rmfpID)
        .input("stay_place", sql.NVarChar, "บรรจุ")
        .input("dest", sql.NVarChar, "รถเข็นรอจัดส่ง")
        .input("rm_status", sql.NVarChar, "QcCheck")
        .input("hist_id_rmit", sql.Int, pkhis)
        .input("tro_production_id", sql.Int, tro_production_id)
        .input("process_id", sql.Int, process_id)
        .input("qc_id", sql.Int, qc_id)
        .input("cold_time", sql.Decimal(5, 2), cold_time)
        .input("weight_RM", weight_per_tro)
        .input("ntray", ntray)
        .query(`
        INSERT INTO RMInTrolley 
        (tro_id, rmfp_id, stay_place, dest, rm_status, hist_id_rmit, tro_production_id, process_id, qc_id, cold_time,weight_RM,ntray)
        VALUES (@tro_id, @rmfp_id, @stay_place, @dest, @rm_status, @hist_id_rmit, @tro_production_id, @process_id, @qc_id, @cold_time,@weight_per_tro,@ntray)
      `);

      await transaction.commit();
      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น", batchId: batch_id });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });




  router.post("/pack/matmanage/Add/rm/Trolley", async (req, res) => {
    const { tro_id, rmfpID, rm_tro_id, weight_per_tro, ntray, batch_after } = req.body;
    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);


    try {
      await transaction.begin();


      if (batch_after) {
        const batchResult = await transaction.request()
          .input("batch_after", sql.NVarChar, batch_after)
          .query(`
          SELECT batch_id
          FROM Batch
          WHERE batch_after = @batch_after
        `);


        if (batchResult.recordset.length > 0) {
          batch_id = batchResult.recordset[0].batch_id;
        }
      }
      const selectRawMat = await transaction.request()
        .input("rm_tro_id", sql.Int, rm_tro_id)
        .query(`
        SELECT withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date,
               come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three,
               sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc,
               receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three,
               receiver_oven_edit, receiver_pack_edit, remark_rework, location
        FROM History
        WHERE hist_id = @hist_id_rmit
      `);


      if (selectHis.recordset.length === 0) {
        throw new Error("ไม่พบข้อมูลใน History");
      }


      const historyData = selectHis.recordset[0];


      const insertHis = await transaction.request()
        .input("withdraw_date", historyData.withdraw_date)
        .input("cooked_date", historyData.cooked_date)
        .input("rmit_date", historyData.rmit_date)
        .input("qc_date", historyData.qc_date)
        .input("come_cold_date", historyData.come_cold_date)
        .input("out_cold_date", historyData.out_cold_date)
        .input("come_cold_date_two", historyData.come_cold_date_two)
        .input("out_cold_date_two", historyData.out_cold_date_two)
        .input("come_cold_date_three", historyData.come_cold_date_three)
        .input("out_cold_date_three", historyData.out_cold_date_three)
        .input("sc_pack_date", historyData.sc_pack_date)
        .input("rework_date", historyData.rework_date)
        .input("receiver", historyData.receiver)
        .input("receiver_prep_two", historyData.receiver_prep_two)
        .input("receiver_qc", historyData.receiver_qc)
        .input("receiver_out_cold", historyData.receiver_out_cold)
        .input("receiver_out_cold_two", historyData.receiver_out_cold_two)
        .input("receiver_out_cold_three", historyData.receiver_out_cold_three)
        .input("receiver_oven_edit", historyData.receiver_oven_edit)
        .input("receiver_pack_edit", historyData.receiver_pack_edit)
        .input("remark_rework", historyData.remark_rework)
        .input("location", historyData.location)
        .query(`
        INSERT INTO History
        (withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date,
         come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three,
         sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc,
         receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three,
         receiver_oven_edit, receiver_pack_edit, remark_rework, location)
        OUTPUT INSERTED.hist_id
        VALUES (@withdraw_date, @cooked_date, @rmit_date, @qc_date, @come_cold_date, @out_cold_date,
                @come_cold_date_two, @out_cold_date_two, @come_cold_date_three, @out_cold_date_three,
                @sc_pack_date, @rework_date, @receiver, @receiver_prep_two, @receiver_qc,
                @receiver_out_cold, @receiver_out_cold_two, @receiver_out_cold_three,
                @receiver_oven_edit, @receiver_pack_edit, @remark_rework, @location)
      `);


      const pkhis = insertHis.recordset[0].hist_id; // เก็บค่า hist_id ที่ insert ใหม่


      const insertRMInTrolley = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .input("rmfp_id", sql.Int, rmfpID)
        .input("stay_place", sql.NVarChar, "บรรจุ")
        .input("dest", sql.NVarChar, "รถเข็นรอจัดส่ง")
        .input("rm_status", sql.NVarChar, "QcCheck")
        .input("hist_id_rmit", sql.Int, pkhis)
        .input("tro_production_id", sql.Int, tro_production_id)
        .input("process_id", sql.Int, process_id)
        .input("qc_id", sql.Int, qc_id)
        .input("cold_time", sql.Decimal(5, 2), cold_time)
        .input("weight_RM", weight_per_tro)
        .input("ntray", ntray)
        .query(`
        INSERT INTO RMInTrolley
        (tro_id, rmfp_id, stay_place, dest, rm_status, hist_id_rmit, tro_production_id, process_id, qc_id, cold_time,weight_RM,ntray)
        VALUES (@tro_id, @rmfp_id, @stay_place, @dest, @rm_status, @hist_id_rmit, @tro_production_id, @process_id, @qc_id, @cold_time,@weight_per_tro,@ntray)
      `);


      await transaction.commit();
      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น", batchId: batch_id });


    } catch (err) {
      await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });











  // router.post("/pack/matmanage/Add/rm/Trolley", async (req, res) => {
  //   const { tro_id, rm_tro_id, weight_per_tro, ntray } = req.body;
  //   const sql = require("mssql");
  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);

  //   try {
  //     await transaction.begin();

  //     // ตรวจสอบว่ามี rm_tro_id ที่ระบุหรือไม่
  //     const checkRecord = await transaction.request()
  //       .input("rm_tro_id", sql.Int, rm_tro_id)
  //       .query(`
  //         SELECT 1 FROM RMInTrolley WHERE rm_tro_id = @rm_tro_id
  //       `);

  //     if (checkRecord.recordset.length === 0) {
  //       throw new Error("ไม่พบข้อมูลที่ต้องการแก้ไข");
  //     }

  //     // ทำการอัพเดต tro_id, weight_per_tro และ ntray สำหรับ rm_tro_id ที่ระบุ
  //     const updateTrolley = await transaction.request()
  //       .input("rm_tro_id", sql.Int, rm_tro_id)
  //       .input("tro_id", sql.VarChar(4), tro_id)
  //       .input("weight_per_tro", sql.Float, weight_per_tro)
  //       .input("ntray", sql.Int, ntray)
  //       .input("stay_place", sql.NVarChar, "บรรจุ")
  //       .input("dest", sql.NVarChar, "รถเข็นรอจัดส่ง")
  //       .query(`
  //         UPDATE RMInTrolley 
  //         SET tro_id = @tro_id, 
  //             weight_per_tro = @weight_per_tro, 
  //             ntray = @ntray,
  //             stay_place = @stay_place,
  //             dest = @dest
  //         WHERE rm_tro_id = @rm_tro_id
  //       `);

  //     await transaction.commit();
  //     return res.status(200).json({ 
  //       success: true, 
  //       message: "อัพเดตข้อมูลเสร็จสิ้น",
  //       updatedRecord: {
  //         rm_tro_id,
  //         tro_id,
  //         weight_per_tro,
  //         ntray
  //       }
  //     });

  //   } catch (err) {
  //     await transaction.rollback();
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });


  //ใช้ชั่วคราว
  // Function to calculate delay time based on the provided logic
  function calculateDelayTime(item) {
    // Helper functions from your provided code
    const parseTimeValue = (timeStr) => {
      if (!timeStr || timeStr === '-') return null;
      const timeParts = timeStr.split('.');
      const hours = parseInt(timeParts[0], 10);
      const minutes = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
      return hours * 60 + minutes;
    };

    const calculateTimeDifference = (dateString) => {
      if (!dateString || dateString === '-') return 0;
      const effectiveDate = new Date(dateString);
      const currentDate = new Date();
      const diffInMinutes = (currentDate - effectiveDate) / (1000 * 60);
      return diffInMinutes > 0 ? diffInMinutes : 0;
    };

    const getLatestColdRoomExitDate = (item) => {
      if (item.out_cold_date_three && item.out_cold_date_three !== '-') {
        return item.out_cold_date_three;
      } else if (item.out_cold_date_two && item.out_cold_date_two !== '-') {
        return item.out_cold_date_two;
      } else if (item.out_cold_date && item.out_cold_date !== '-') {
        return item.out_cold_date;
      }
      return '-';
    };

    // Main calculation logic
    const latestColdRoomExitDate = getLatestColdRoomExitDate(item);

    let referenceDate = null;
    let remainingTimeValue = null;
    let standardTimeValue = null;
    let usedField = '';

    // Scenario 1: Cold room history exists and no rework
    if ((latestColdRoomExitDate !== '-') &&
      (!item.remaining_rework_time || item.remaining_rework_time === '-')) {
      referenceDate = latestColdRoomExitDate;
      remainingTimeValue = parseTimeValue(item.remaining_ctp_time);
      standardTimeValue = parseTimeValue(item.standard_ctp_time);
      usedField = 'remaining_ctp_time';
    }
    // Scenario 2: No cold room history and no rework
    else if ((latestColdRoomExitDate === '-') &&
      (!item.remaining_rework_time || item.remaining_rework_time === '-')) {
      referenceDate = item.rmit_date;
      remainingTimeValue = parseTimeValue(item.remaining_ptp_time);
      standardTimeValue = parseTimeValue(item.standard_ptp_time);
      usedField = 'remaining_ptp_time';
    }
    // Scenario 3: Rework case
    else if (item.remaining_rework_time && item.remaining_rework_time !== '-') {
      referenceDate = item.qc_date;
      remainingTimeValue = parseTimeValue(item.remaining_rework_time);
      standardTimeValue = parseTimeValue(item.standard_rework_time);
      usedField = 'remaining_rework_time';
    }
    // Scenario 4: Cold room history exists and rework
    else if ((latestColdRoomExitDate !== '-') &&
      item.remaining_rework_time && item.remaining_rework_time !== '-') {
      referenceDate = latestColdRoomExitDate;
      remainingTimeValue = parseTimeValue(item.remaining_rework_time);
      standardTimeValue = parseTimeValue(item.standard_rework_time);
      usedField = 'remaining_rework_time';
    }

    // If we couldn't determine the scenario or don't have enough data
    if (!referenceDate || (remainingTimeValue === null && standardTimeValue === null)) {
      return {
        formattedDelayTime: '0.00',
        usedField: null
      };
    }

    // Calculate elapsed time from reference date
    const elapsedMinutes = calculateTimeDifference(referenceDate);

    // Calculate remaining time
    let timeRemaining;
    if (remainingTimeValue !== null) {
      timeRemaining = remainingTimeValue - elapsedMinutes;
    } else if (standardTimeValue !== null) {
      timeRemaining = standardTimeValue - elapsedMinutes;
    } else {
      timeRemaining = 0;
    }

    // Format the delay time as requested (-1.56 means overdue by 1 hour 56 minutes)
    const isNegative = timeRemaining < 0;
    const absoluteTimeRemaining = Math.abs(timeRemaining);

    const hours = Math.floor(absoluteTimeRemaining / 60);
    const minutes = Math.floor(absoluteTimeRemaining % 60);

    // Add minus sign if overdue
    const sign = isNegative ? '-' : '';
    const formattedDelayTime = `${sign}${hours}.${minutes.toString().padStart(2, '0')}`;

    return {
      formattedDelayTime,
      usedField
    };
  }


  router.post("/pack/export/Trolley", async (req, res) => {
    const { tro_id } = req.body;
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);


    try {
      await transaction.begin();


      // ตรวจสอบว่ามี trolley นี้ในระบบหรือไม่
      const rmTrolleyResult = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`SELECT tro_id FROM TrolleyRMMapping WHERE tro_id = @tro_id`);


      if (rmTrolleyResult.recordset.length === 0) {
        throw new Error("ไม่พบข้อมูล TrolleyRMMapping สำหรับ tro_id นี้");
      }


      console.log("tro_id:", tro_id);


      // ดึงข้อมูลวัตถุดิบในรถเข็นเพื่อคำนวณเวลา delay
      const rawMaterialsResult = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
                SELECT
                    rmm.mapping_id,
                    rmm.mix_code,
                    b.batch_after,
                    FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
                    FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
                    FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
                    FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
                    FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
                    FORMAT(rmg.rework, 'N2') AS standard_rework_time,
                    CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
                    CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
                    CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
                    CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
                    CONVERT(VARCHAR, h.qc_date, 120) AS qc_date
                FROM
                    TrolleyRMMapping rmm
                JOIN  
                    RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id  
                JOIN
                    RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
                JOIN
                    History h ON rmm.mapping_id = h.mapping_id
                JOIN
                    Batch b ON rmm.mapping_id = b.mapping_id
                WHERE
                    rmm.tro_id = @tro_id
            `);


      // ประมวลผลแต่ละวัตถุดิบในรถเข็น
      for (const item of rawMaterialsResult.recordset) {
        // คำนวณเวลา delay
        const delayTimeResult = calculateDelayTime(item);


        // กำหนดฟิลด์ที่จะอัปเดตตามการคำนวณ
        let fieldToUpdate = '';


        if (delayTimeResult.usedField === 'remaining_ctp_time') {
          fieldToUpdate = 'cold_to_pack_time';
        } else if (delayTimeResult.usedField === 'remaining_ptp_time') {
          fieldToUpdate = 'prep_to_pack_time';
        } else if (delayTimeResult.usedField === 'remaining_rework_time') {
          fieldToUpdate = 'rework_time';
        }


        // อัปเดตฟิลด์ที่เหมาะสมในฐานข้อมูล
        if (fieldToUpdate) {
          await transaction.request()
            .input("mapping_id", sql.Int, item.mapping_id)
            .input("delayTime", sql.VarChar, delayTimeResult.formattedDelayTime)
            .query(`
                        UPDATE TrolleyRMMapping
                        SET ${fieldToUpdate} = @delayTime
                        WHERE mapping_id = @mapping_id
                    `);
        }
      }


      // อัปเดต tro_id ในตาราง History สำหรับแต่ละ mapping_id ในรถเข็นนี้
      await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .input("dest", sql.VarChar, "เข้าห้องเย็น")
        .input("rm_status", sql.VarChar, "เหลือจากไลน์ผลิต")
        .input("stay_place", sql.VarChar, "บรรจุ")
        .query(`
                UPDATE History
                SET tro_id = @tro_id,
                dest = @dest,
                stay_place = @stay_place,
                rm_status = @rm_status
                WHERE mapping_id IN (
                    SELECT mapping_id
                    FROM TrolleyRMMapping
                    WHERE tro_id = @tro_id
                )
            `);


      // อัปเดตสถานะของวัตถุดิบในรถเข็น
      await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .input("dest", sql.VarChar, "เข้าห้องเย็น")
        .input("rm_status", sql.VarChar, "เหลือจากไลน์ผลิต")
        .input("stay_place", sql.VarChar, "บรรจุ")
        .query(`
                UPDATE TrolleyRMMapping
                SET
                    dest = @dest,
                    stay_place = @stay_place,
                    rm_status = @rm_status
                WHERE tro_id = @tro_id
            `);


      // ลบรถเข็นออกจากตาราง PackTrolley
      await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
                DELETE PackTrolley
                WHERE tro_id = @tro_id
            `);


      await transaction.commit();


      return res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลเสร็จสิ้น"
      });


    } catch (err) {
      await transaction.rollback();
      console.error("SQL error", err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });



  // router.post("/pack/export/to/rework/Trolley", async (req, res) => {
  //   const { tro_id } = req.body;
  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);

  //   try {
  //     await transaction.begin();

  //     // ตรวจสอบว่ามี trolley นี้ในระบบหรือไม่
  //     const rmTrolleyResult = await transaction.request()
  //       .input("tro_id", sql.NVarChar, tro_id)
  //       .query(`SELECT tro_id FROM TrolleyRMMapping WHERE tro_id = @tro_id`);

  //     if (rmTrolleyResult.recordset.length === 0) {
  //       throw new Error("ไม่พบข้อมูล TrolleyRMMapping สำหรับ tro_id นี้");
  //     }

  //     console.log("tro_id:", tro_id);

  //     // ดึงข้อมูลวัตถุดิบในรถเข็นเพื่อคำนวณเวลา delay
  //     const rawMaterialsResult = await transaction.request()
  //       .input("tro_id", sql.NVarChar, tro_id)
  //       .query(`
  //               SELECT
  //                   rmm.mapping_id,
  //                   rmm.mix_code,
  //                   FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
  //                   FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
  //                   FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
  //                   FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
  //                   FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
  //                   FORMAT(rmg.rework, 'N2') AS standard_rework_time,
  //                   CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
  //                   CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
  //                   CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
  //                   CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
  //                   CONVERT(VARCHAR, h.qc_date, 120) AS qc_date
  //               FROM
  //                   TrolleyRMMapping rmm
  //               JOIN  
  //                   RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id  
  //               JOIN
  //                   RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
  //               JOIN
  //                   History h ON rmm.mapping_id = h.mapping_id
  //               WHERE 
  //                   rmm.tro_id = @tro_id
  //           `);

  //     // ประมวลผลแต่ละวัตถุดิบในรถเข็น
  //     for (const item of rawMaterialsResult.recordset) {
  //       // คำนวณเวลา delay
  //       const delayTimeResult = calculateDelayTime(item);

  //       // กำหนดฟิลด์ที่จะอัปเดตตามการคำนวณ
  //       let fieldToUpdate = '';

  //       if (delayTimeResult.usedField === 'remaining_ctp_time') {
  //         fieldToUpdate = 'cold_to_pack_time';
  //       } else if (delayTimeResult.usedField === 'remaining_ptp_time') {
  //         fieldToUpdate = 'prep_to_pack_time';
  //       } else if (delayTimeResult.usedField === 'remaining_rework_time') {
  //         fieldToUpdate = 'rework_time';
  //       }

  //       // อัปเดตฟิลด์ที่เหมาะสมในฐานข้อมูล
  //       if (fieldToUpdate) {
  //         await transaction.request()
  //           .input("mapping_id", sql.Int, item.mapping_id)
  //           .input("delayTime", sql.VarChar, delayTimeResult.formattedDelayTime)
  //           .query(`
  //                       UPDATE TrolleyRMMapping
  //                       SET ${fieldToUpdate} = @delayTime
  //                       WHERE mapping_id = @mapping_id
  //                   `);
  //       }
  //     }

  //     // อัปเดต tro_id ในตาราง History สำหรับแต่ละ mapping_id ในรถเข็นนี้
  //     await transaction.request()
  //       .input("tro_id", sql.NVarChar, tro_id)
  //       .input("dest", sql.VarChar, "จุดเตรียม")
  //       .input("rm_status", sql.VarChar, "รอแก้ไข")
  //       .input("stay_place", sql.VarChar, "บรรจุ")
  //       .query(`
  //               UPDATE History
  //               SET tro_id = @tro_id, 
  //               dest = @dest,
  //               stay_place = @stay_place,
  //               rm_status = @rm_status
  //               WHERE mapping_id IN (
  //                   SELECT mapping_id 
  //                   FROM TrolleyRMMapping 
  //                   WHERE tro_id = @tro_id
  //               )
  //           `);

  //     // อัปเดตสถานะของวัตถุดิบในรถเข็น
  //     await transaction.request()
  //       .input("tro_id", sql.NVarChar, tro_id)
  //       .input("dest", sql.VarChar, "จุดเตรียม")
  //       .input("rm_status", sql.VarChar, "รอแก้ไข")
  //       .input("stay_place", sql.VarChar, "บรรจุ")
  //       .query(`
  //               UPDATE TrolleyRMMapping
  //               SET 
  //                   dest = @dest,
  //                   stay_place = @stay_place,
  //                   rm_status = @rm_status
  //                   tro_id  = NULL
  //               WHERE tro_id = @tro_id
  //           `);



  //     // ลบรถเข็นออกจากตาราง PackTrolley
  //     await transaction.request()
  //       .input("tro_id", sql.NVarChar, tro_id)
  //       .query(`
  //              UPDATE Trolley
  //               SET 
  //                   tro_status = "1",
  //               WHERE tro_id = @tro_id
  //           `);

  //     await transaction.request()
  //       .input("tro_id", sql.NVarChar, tro_id)
  //       .query(`
  //               DELETE PackTrolley
  //               WHERE tro_id = @tro_id
  //           `);

  //     await transaction.commit();

  //     return res.status(200).json({
  //       success: true,
  //       message: "บันทึกข้อมูลเสร็จสิ้น"
  //     });

  //   } catch (err) {
  //     await transaction.rollback();
  //     console.error("SQL error", err);
  //     return res.status(500).json({
  //       success: false,
  //       error: err.message
  //     });
  //   }
  // });

  //APIบรรจุเสร็จ
  router.post("/pack/mixed/delay-time", async (req, res) => {
    const { mixed_code, mapping_id, selectedDateTime } = req.body;

    console.log("mixed_code:", mixed_code);
    console.log("mapping_id:", mapping_id);
    console.log("selectedDateTime (from frontend):", selectedDateTime);

    if (!mixed_code) {
      return res.status(400).json({ message: "mixed_code จำเป็นต้องระบุ" });
    }

    if (!selectedDateTime) {
      return res.status(400).json({ message: "selectedDateTime จำเป็นต้องระบุ" });
    }

    let transaction;

    try {
      const pool = await connectToDatabase();
      const bangkokTime = selectedDateTime;


      const queryRawMaterials = `
      SELECT 
        rmm.mapping_id,
        rmm.batch_id,
        rmm.rmfp_id,
        rmm.cold_to_pack_time AS remaining_ctp_time,
        rmg.cold_to_pack AS standard_ctp_time,
        rmm.prep_to_pack_time AS remaining_ptp_time,
        rmg.prep_to_pack AS standard_ptp_time,
        rmm.rework_time AS remaining_rework_time,
        rmg.rework AS standard_rework_time,
        CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
        CONVERT(VARCHAR, htr.out_cold_date, 120) AS out_cold_date,
        CONVERT(VARCHAR, htr.out_cold_date_two, 120) AS out_cold_date_two,
        CONVERT(VARCHAR, htr.out_cold_date_three, 120) AS out_cold_date_three,
        CONVERT(VARCHAR, htr.qc_date, 120) AS qc_date,
        htr.rework_date
      FROM RM_Mixed AS rm
      JOIN TrolleyRMMapping AS rmm ON rmm.mapping_id = rm.mapping_id
      JOIN RMForProd AS rmp ON rmm.rmfp_id = rmp.rmfp_id
      JOIN RawMatGroup AS rmg ON rmp.rm_group_id = rmg.rm_group_id
      JOIN History AS htr ON htr.mapping_id = rm.mapping_id
      WHERE rm.mixed_code = @mixed_code
    `;

      const result = await pool.request()
        .input("mixed_code", sql.Int, mixed_code)
        .query(queryRawMaterials);

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "ไม่พบข้อมูลวัตถุดิบจาก mixed_code ที่ระบุ" });
      }

      // ------------------------------------------------------
      // ดึงข้อมูลเฉพาะ mixed สำหรับ mapping_id
      // ------------------------------------------------------
      const queryMixed = `
      SELECT 
        rmm.mix_time AS remaining_mix_time,
        CONVERT(VARCHAR, h.mixed_date, 120) AS mixed_date
      FROM RM_Mixed AS rm
      JOIN TrolleyRMMapping AS rmm ON rmm.mapping_id = rm.mapping_id
      JOIN History AS h ON h.mapping_id = rm.mapping_id
      WHERE rm.mixed_code = @mixed_code AND rmm.mapping_id = @mapping_id
    `;

      const resultMix = await pool.request()
        .input("mixed_code", sql.Int, mixed_code)
        .input("mapping_id", sql.Int, mapping_id)
        .query(queryMixed);

      // ------------------------------------------------------
      // เริ่ม transaction
      // ------------------------------------------------------
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      const updatedItems = [];

      for (let item of result.recordset) {
        console.log("Processing item:", item);

        let remaining_mix_time = null;
        let mixed_date = null;

        if (mapping_id && item.mapping_id === parseInt(mapping_id) && resultMix.recordset.length > 0) {
          remaining_mix_time = resultMix.recordset[0].remaining_mix_time;
          mixed_date = resultMix.recordset[0].mixed_date;
        }

        // ------------------------------------------------------
        // คำนวณ delay time
        // ------------------------------------------------------
        const delayTimeResult = calculateDelayTimeSurplus({
          remaining_ctp_time: item.remaining_ctp_time,
          standard_ctp_time: item.standard_ctp_time,
          remaining_ptp_time: item.remaining_ptp_time,
          standard_ptp_time: item.standard_ptp_time,
          remaining_rework_time: item.remaining_rework_time,
          standard_rework_time: item.standard_rework_time,
          remaining_mix_time: remaining_mix_time,
          qc_date: item.qc_date,
          rmit_date: item.rmit_date,
          out_cold_date: item.out_cold_date,
          out_cold_date_two: item.out_cold_date_two,
          out_cold_date_three: item.out_cold_date_three,
          rework_date: item.rework_date,
          mixed_date: mixed_date
        });

        console.log("Delay calculation result:", delayTimeResult);

        if (!delayTimeResult.fieldToUpdate) {
          console.log("No field to update for item:", item.mapping_id);
          continue;
        }

        // ------------------------------------------------------
        // อัปเดต Delay Time ใน TrolleyRMMapping
        // ------------------------------------------------------
        await transaction.request()
          .input("delayTime", sql.Float, parseFloat(delayTimeResult.formattedDelayTime))
          .input("mapping_id", sql.Int, item.mapping_id)
          .query(`
          UPDATE TrolleyRMMapping
          SET stay_place = 'บรรจุเสร็จสิ้นD',
              dest = 'บรรจุเสร็จสิ้นD',
              ${delayTimeResult.fieldToUpdate} = @delayTime
          WHERE mapping_id = @mapping_id
        `);

        // ------------------------------------------------------
        // อัปเดต History ใช้ UTC
        // ------------------------------------------------------
        await transaction.request()
          .input("mapping_id", sql.Int, item.mapping_id)
          .input("selectedDateTime", sql.VarChar, selectedDateTime)
          .query(`
          UPDATE History
          SET sc_pack_date = @selectedDateTime
          WHERE mapping_id = @mapping_id
        `);

        updatedItems.push({
          mapping_id: item.mapping_id,
          batch_id: item.batch_id,
          rmfp_id: item.rmfp_id,
          fieldUpdated: delayTimeResult.fieldToUpdate,
          delayTime: delayTimeResult.formattedDelayTime
        });
      }

      // ------------------------------------------------------
      // อัปเดตเฉพาะ mapping_id ที่ส่งมา
      // ------------------------------------------------------
      if (mapping_id) {
        await transaction.request()
          .input("mapping_id", sql.Int, mapping_id)
          .input("selectedDateTime", sql.VarChar, selectedDateTime)
          .query(`
          UPDATE TrolleyRMMapping
          SET stay_place = 'บรรจุเสร็จสิ้นB',
              dest = 'บรรจุเสร็จสิ้นB'
          WHERE mapping_id = @mapping_id
        `);

        await transaction.request()
          .input("mapping_id", sql.Int, mapping_id)
          .input("selectedDateTime", sql.VarChar, selectedDateTime)
          .query(`
          UPDATE History
          SET sc_pack_date = @selectedDateTime
          WHERE mapping_id = @mapping_id
        `);
      }

      if (updatedItems.length > 0) {
        await transaction.commit();
        return res.status(200).json({
          success: true,
          message: "บันทึกค่า Delay Time สำเร็จ",
          updatedItems
        });
      } else {
        await transaction.rollback();
        return res.status(404).json({ message: "ไม่สามารถคำนวณหรือบันทึก Delay Time ได้" });
      }

    } catch (error) {
      console.error("SQL error:", error);
      if (transaction) await transaction.rollback();
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        error: error.message
      });
    } finally {
      sql.close();
    }
  });



  // Route for recording delay times for mixed raw materials
  //   router.post("/pack/mixed/delay-time", async (req, res) => {
  //   let transaction;
  //   try {
  //     const { mixed_code, mapping_id } = req.body;

  //     // ตรวจสอบค่า mixed_code
  //     const mixedCodeNum = parseInt(mixed_code, 10);
  //     if (isNaN(mixedCodeNum)) {
  //       return res.status(400).json({ message: "mixed_code ต้องเป็นตัวเลข" });
  //     }

  //     // ตรวจสอบค่า mapping_id (สามารถว่างได้)
  //     let mappingIdNum = null;
  //     if (mapping_id !== undefined && mapping_id !== null && mapping_id !== "") {
  //       mappingIdNum = parseInt(mapping_id, 10);
  //       if (isNaN(mappingIdNum)) {
  //         return res.status(400).json({ message: "mapping_id ต้องเป็นตัวเลข" });
  //       }
  //     }

  //     const pool = await connectToDatabase();

  //     // ดึงข้อมูลวัตถุดิบ
  //     const queryRawMaterials = `
  //       SELECT 
  //         rmm.mapping_id,
  //         rmm.cold_to_pack_time AS remaining_ctp_time,
  //         rmg.cold_to_pack AS standard_ctp_time,
  //         rmm.prep_to_pack_time AS remaining_ptp_time,
  //         rmg.prep_to_pack AS standard_ptp_time,
  //         rmm.rework_time AS remaining_rework_time,
  //         rmg.rework AS standard_rework_time,
  //         CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
  //         CONVERT(VARCHAR, htr.out_cold_date, 120) AS out_cold_date,
  //         CONVERT(VARCHAR, htr.out_cold_date_two, 120) AS out_cold_date_two,
  //         CONVERT(VARCHAR, htr.out_cold_date_three, 120) AS out_cold_date_three,
  //         CONVERT(VARCHAR, htr.qc_date, 120) AS qc_date
  //       FROM RM_Mixed AS rm
  //       JOIN TrolleyRMMapping AS rmm ON rmm.mapping_id = rm.mapping_id
  //       JOIN RMForProd AS rmp ON rmm.rmfp_id = rmp.rmfp_id
  //       JOIN RawMatGroup AS rmg ON rmp.rm_group_id = rmg.rm_group_id
  //       JOIN History AS htr ON htr.mapping_id = rm.mapping_id
  //       WHERE rm.mixed_code = @mixed_code
  //     `;

  //     const result = await pool.request()
  //       .input('mixed_code', sql.Int, mixedCodeNum)
  //       .query(queryRawMaterials);

  //     if (result.recordset.length === 0) {
  //       return res.status(404).json({ message: "ไม่พบข้อมูลวัตถุดิบจาก mixed_code ที่ระบุ" });
  //     }

  //     // ดึงข้อมูลเฉพาะ mapping_id ถ้ามี
  //     let resultMix = { recordset: [] };
  //     if (mappingIdNum !== null) {
  //       const queryMixed = `
  //         SELECT 
  //           rmm.mix_time AS remaining_mix_time,
  //           CONVERT(VARCHAR, h.mixed_date, 120) AS mixed_date
  //         FROM RM_Mixed AS rm
  //         JOIN TrolleyRMMapping AS rmm ON rmm.mapping_id = rm.mapping_id
  //         JOIN History AS h ON h.mapping_id = rm.mapping_id
  //         WHERE rm.mixed_code = @mixed_code AND rmm.mapping_id = @mapping_id
  //       `;

  //       resultMix = await pool.request()
  //         .input('mixed_code', sql.Int, mixedCodeNum)
  //         .input('mapping_id', sql.Int, mappingIdNum)
  //         .query(queryMixed);
  //     }

  //     transaction = new sql.Transaction(pool);
  //     await transaction.begin();

  //     const updatedItems = [];

  //     for (let item of result.recordset) {
  //       let remaining_mix_time = null;
  //       let mixed_date = null;

  //       if (mappingIdNum !== null && item.mapping_id === mappingIdNum && resultMix.recordset.length > 0) {
  //         remaining_mix_time = resultMix.recordset[0].remaining_mix_time;
  //         mixed_date = resultMix.recordset[0].mixed_date;
  //       }

  //       const delayTimeResult = calculateDelayTimeSurplus({
  //         remaining_ctp_time: item.remaining_ctp_time,
  //         standard_ctp_time: item.standard_ctp_time,
  //         remaining_ptp_time: item.remaining_ptp_time,
  //         standard_ptp_time: item.standard_ptp_time,
  //         remaining_rework_time: item.remaining_rework_time,
  //         standard_rework_time: item.standard_rework_time,
  //         remaining_mix_time,
  //         qc_date: item.qc_date,
  //         rmit_date: item.rmit_date,
  //         out_cold_date: item.out_cold_date,
  //         out_cold_date_two: item.out_cold_date_two,
  //         out_cold_date_three: item.out_cold_date_three,
  //         rework_date: item.rework_date,
  //         mixed_date
  //       });

  //       if (!delayTimeResult.fieldToUpdate) continue;

  //       await transaction.request()
  //         .input('delayTime', sql.Float, parseFloat(delayTimeResult.formattedDelayTime))
  //         .input('mapping_id', sql.Int, item.mapping_id)
  //         .query(`
  //           UPDATE TrolleyRMMapping
  //           SET stay_place = 'บรรจุเสร็จสิ้น', dest = 'บรรจุเสร็จสิ้น',
  //               ${delayTimeResult.fieldToUpdate} = @delayTime
  //           WHERE mapping_id = @mapping_id
  //         `);

  //       await transaction.request()
  //         .input("mapping_id", sql.Int, item.mapping_id)
  //         .query(`UPDATE History SET sc_pack_date = GETDATE() WHERE mapping_id = @mapping_id`);

  //       updatedItems.push({
  //         mapping_id: item.mapping_id,
  //         batch_id: item.batch_id,
  //         rmfp_id: item.rmfp_id,
  //         fieldUpdated: delayTimeResult.fieldToUpdate,
  //         delayTime: delayTimeResult.formattedDelayTime
  //       });
  //     }

  //     if (updatedItems.length > 0) {
  //       await transaction.commit();
  //       return res.status(200).json({
  //         message: "บันทึกค่า Delay Time สำเร็จ",
  //         updatedItems
  //       });
  //     } else {
  //       await transaction.rollback();
  //       return res.status(404).json({ message: "ไม่สามารถคำนวณหรือบันทึก Delay Time ได้" });
  //     }

  //   } catch (error) {
  //     console.error("SQL error:", error);
  //     if (transaction) await transaction.rollback();
  //     res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล", error: error.message });
  //   } finally {
  //     sql.close();
  //   }
  // });





  router.put("/pack/mixed/trolley", async (req, res) => {
    const { mapping_id, weights, tro_production_id } = req.body;

    if (!mapping_id || !Array.isArray(weights) || weights.length === 0 || !tro_production_id) {
      return res.status(400).json({ message: "mapping_id, weights และ tro_production_id จำเป็นต้องระบุ" });
    }

    let transaction;

    try {
      const pool = await connectToDatabase();

      // Query หลักไม่ JOIN กับ Batch
      const query = `
      SELECT DISTINCT
          rmm.mapping_id,
          rmm.rmfp_id,
          rmm.batch_id,
          rmm.tro_production_id,
          rmm.process_id,
          rmm.qc_id,
          rmm.level_eu,
          rmm.prep_to_cold_time,
          rmm.cold_time,
          rmm.prep_to_pack_time,
          rmm.cold_to_pack_time,
          rmm.rework_time,
          rmm.rm_status,
          rmm.rm_cold_status,
          rmm.stay_place,
          rmm.allocation_date,
          rmm.removal_date,
          rmm.status,
          rmm.production_batch,
          rmm.created_by,
          rmm.created_at,
          rmm.updated_at,
          rmm.rmm_line_name,
          rmm.weight_RM,
          rmm.tray_count,
          rmm.tro_id,
          rmm.mix_time,
          b.batch_after,
          rfp.rm_group_id,
          htr.hist_id,
          htr.withdraw_date,
          htr.cooked_date,
          htr.rmit_date,
          htr.qc_date,
          htr.come_cold_date,
          htr.out_cold_date,
          htr.come_cold_date_two,
          htr.out_cold_date_two,
          htr.come_cold_date_three,
          htr.out_cold_date_three,
          htr.sc_pack_date,
          htr.rework_date,
          htr.receiver,
          htr.receiver_prep_two,
          htr.receiver_qc,
          htr.receiver_out_cold,
          htr.receiver_out_cold_two,
          htr.receiver_out_cold_three,
          htr.receiver_oven_edit,
          htr.receiver_pack_edit,
          htr.remark_rework,
          htr.remark_rework_cold,
          htr.qccheck_cold,
          htr.edit_rework,
          htr.location
      FROM TrolleyRMMapping AS rmm
      JOIN History AS htr ON htr.mapping_id = rmm.mapping_id
      LEFT JOIN batch AS b ON b.mapping_id = rmm.mapping_id
      LEFT JOIN RMForProd AS rfp ON rfp.rmfp_id = rmm.rmfp_id
      WHERE rmm.mapping_id IN (${mapping_id.map(id => `'${id}'`).join(',')})
    `;

      const result = await pool.request().query(query);

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "ไม่พบวัตถุดิบในรถเข็นที่เลือก" });
      }

      // Query แยกสำหรับดึงข้อมูล Batch ทั้งหมด
      const batchQuery = `
        SELECT batch_id, batch_before, batch_after, mapping_id
        FROM Batch
        WHERE mapping_id IN (${mapping_id.map(id => `'${id}'`).join(',')})
      `;

      const batchResult = await pool.request().query(batchQuery);

      // จัดกลุ่ม Batch ตาม mapping_id
      const batchByMappingId = {};
      batchResult.recordset.forEach(batch => {
        if (!batchByMappingId[batch.mapping_id]) {
          batchByMappingId[batch.mapping_id] = [];
        }
        batchByMappingId[batch.mapping_id].push(batch);
      });

      const mixCode = Date.now() % 2147483647;
      const line_name = result.recordset[0].rmm_line_name;
      let total_weight = 0;
      let total_trays = 0;

      transaction = new sql.Transaction(pool);
      await transaction.begin();

      for (let i = 0; i < result.recordset.length; i++) {
        const record = result.recordset[i];
        const weightToMove = weights[i];

        // Log เพื่อ debug
        console.log(`Record ${i}:`, {
          mapping_id: record.mapping_id,
          weight_RM: weight_RM,
          tray_count: record.tray_count,
          weightToMove: weightToMove
        });

        // คำนวณน้ำหนักต่อถาด
        const weightPerTray = record.weight_RM / record.tray_count;

        // คำนวณจำนวนถาดที่ใช้
        const traysUsed = weightToMove / weightPerTray;
        const roundedTraysUsed = Math.round(traysUsed * 100) / 100;

        // รวมค่าน้ำหนักและจำนวนถาด
        total_weight += weightToMove;
        total_trays += roundedTraysUsed;

        // สร้าง mapping ใหม่สำหรับวัตถุดิบที่ถูกย้าย
        const saveRMMResult = await transaction.request()
          .input(`batch_id${i}`, sql.Int, record.batch_id)
          .input(`rmfp_id${i}`, sql.Int, record.rmfp_id)
          .input(`tro_id${i}`, sql.VarChar(4), record.tro_id)
          .input(`tro_production_id${i}`, sql.Int, tro_production_id)
          .input(`process_id${i}`, sql.Int, record.process_id)
          .input(`qc_id${i}`, sql.Int, record.qc_id)
          .input(`weight_RM${i}`, sql.Float, weightToMove)
          .input(`tray_count${i}`, sql.Float, roundedTraysUsed)
          .input(`level_eu${i}`, sql.VarChar(5), record.level_eu)
          .input(`prep_to_cold_time${i}`, sql.Float, record.prep_to_cold_time)
          .input(`cold_time${i}`, sql.Float, record.cold_time)
          .input(`prep_to_pack_time${i}`, sql.Float, record.prep_to_pack_time)
          .input(`cold_to_pack_time${i}`, sql.Float, record.cold_to_pack_time)
          .input(`mix_time${i}`, sql.Float, record.mix_time)
          .input(`rework_time${i}`, sql.Float, record.rework_time)
          .input(`rm_status${i}`, sql.VarChar(25), record.rm_status)
          .input(`rm_cold_status${i}`, sql.VarChar(25), record.rm_cold_status || null)
          .input(`stay_place${i}`, sql.VarChar(25), record.stay_place)
          .input(`dest${i}`, sql.VarChar(25), "จุดผสมวัตถุดิบ")
          .input(`allocation_date${i}`, sql.DateTime, record.allocation_date)
          .input(`removal_date${i}`, sql.DateTime, record.removal_date)
          .input(`status${i}`, sql.VarChar(25), record.status)
          .input(`production_batch${i}`, sql.VarChar(25), record.production_batch)
          .input(`created_by${i}`, sql.VarChar(50), record.created_by)
          .input(`rmm_line_name${i}`, sql.VarChar(20), record.rmm_line_name)
          .query(`
          INSERT INTO TrolleyRMMapping
          (tro_id, rmfp_id, batch_id, tro_production_id, process_id, qc_id,
          tray_count, weight_RM, level_eu,
          prep_to_cold_time, cold_time, prep_to_pack_time, cold_to_pack_time, mix_time, rework_time,
          rm_status, rm_cold_status, stay_place, dest,
          allocation_date, removal_date, status, production_batch, created_by, rmm_line_name, created_at)
          OUTPUT INSERTED.mapping_id
          VALUES
          (@tro_id${i}, @rmfp_id${i}, @batch_id${i}, @tro_production_id${i}, @process_id${i}, @qc_id${i},
          @tray_count${i}, @weight_RM${i}, @level_eu${i},
          @prep_to_cold_time${i}, @cold_time${i}, @prep_to_pack_time${i}, @cold_to_pack_time${i}, @mix_time${i}, @rework_time${i},
          @rm_status${i}, @rm_cold_status${i}, @stay_place${i}, @dest${i},
          @allocation_date${i}, @removal_date${i}, @status${i}, @production_batch${i}, @created_by${i}, @rmm_line_name${i}, GETDATE())
        `);

        const newMappingId = saveRMMResult.recordset[0].mapping_id;

        // สร้างประวัติใหม่
        await transaction.request()
          .input(`mapping_id${i}`, sql.Int, newMappingId)
          .input(`withdraw_date${i}`, sql.VarChar(25), record.withdraw_date)
          .input(`cooked_date${i}`, sql.DateTime, record.cooked_date)
          .input(`rmit_date${i}`, sql.DateTime, record.rmit_date)
          .input(`qc_date${i}`, sql.DateTime, record.qc_date)
          .input(`come_cold_date${i}`, sql.DateTime, record.come_cold_date)
          .input(`out_cold_date${i}`, sql.DateTime, record.out_cold_date)
          .input(`come_cold_date_two${i}`, sql.DateTime, record.come_cold_date_two)
          .input(`out_cold_date_two${i}`, sql.DateTime, record.out_cold_date_two)
          .input(`come_cold_date_three${i}`, sql.DateTime, record.come_cold_date_three)
          .input(`out_cold_date_three${i}`, sql.DateTime, record.out_cold_date_three)
          .input(`sc_pack_date${i}`, sql.DateTime, record.sc_pack_date)
          .input(`rework_date${i}`, sql.DateTime, record.rework_date)
          .input(`receiver${i}`, sql.VarChar(25), record.receiver)
          .input(`receiver_prep_two${i}`, sql.VarChar(25), record.receiver_prep_two)
          .input(`receiver_qc${i}`, sql.VarChar(25), record.receiver_qc)
          .input(`receiver_out_cold${i}`, sql.VarChar(25), record.receiver_out_cold)
          .input(`receiver_out_cold_two${i}`, sql.VarChar(25), record.receiver_out_cold_two)
          .input(`receiver_out_cold_three${i}`, sql.VarChar(25), record.receiver_out_cold_three)
          .input(`receiver_oven_edit${i}`, sql.VarChar(25), record.receiver_oven_edit)
          .input(`receiver_pack_edit${i}`, sql.VarChar(25), record.receiver_pack_edit)
          .input(`remark_rework${i}`, sql.VarChar(255), record.remark_rework)
          .input(`remark_rework_cold${i}`, sql.VarChar(255), record.remark_rework_cold)
          .input(`location${i}`, sql.VarChar(30), record.location)
          .input(`qccheck_cold${i}`, sql.VarChar(10), record.qccheck_cold)
          .input(`edit_rework${i}`, sql.VarChar(50), record.edit_rework)
          .query(`
          INSERT INTO History
          (mapping_id, withdraw_date, cooked_date, rmit_date, qc_date,
          come_cold_date, out_cold_date, come_cold_date_two, out_cold_date_two,
          come_cold_date_three, out_cold_date_three, sc_pack_date, rework_date,
          receiver, receiver_prep_two, receiver_qc, receiver_out_cold,
          receiver_out_cold_two, receiver_out_cold_three, receiver_oven_edit,
          receiver_pack_edit, remark_rework, remark_rework_cold, location, qccheck_cold, edit_rework, created_at)
          VALUES
          (@mapping_id${i}, @withdraw_date${i}, @cooked_date${i}, @rmit_date${i}, @qc_date${i},
          @come_cold_date${i}, @out_cold_date${i}, @come_cold_date_two${i}, @out_cold_date_two${i},
          @come_cold_date_three${i}, @out_cold_date_three${i}, @sc_pack_date${i}, @rework_date${i},
          @receiver${i}, @receiver_prep_two${i}, @receiver_qc${i}, @receiver_out_cold${i},
          @receiver_out_cold_two${i}, @receiver_out_cold_three${i}, @receiver_oven_edit${i},
          @receiver_pack_edit${i}, @remark_rework${i}, @remark_rework_cold${i}, @location${i}, @qccheck_cold${i}, @edit_rework${i}, GETDATE())
        `);

        // Copy ทุกแถวจากตาราง Batch ที่เกี่ยวข้องกับ mapping_id เดิม
        const batchRecords = batchByMappingId[record.mapping_id] || [];
        for (let j = 0; j < batchRecords.length; j++) {
          const batchRecord = batchRecords[j];
          await transaction.request()
            .input(`batch_before_${i}_${j}`, sql.VarChar(15), batchRecord.batch_before)
            .input(`batch_after_${i}_${j}`, sql.VarChar(15), batchRecord.batch_after)
            .input(`mapping_id_${i}_${j}`, sql.Int, newMappingId)
            .query(`
              INSERT INTO Batch
              (mapping_id, batch_before, batch_after)
              VALUES
              (@mapping_id_${i}_${j}, @batch_before_${i}_${j}, @batch_after_${i}_${j})
            `);
        }

        // เพิ่มข้อมูลใน RM_mixed
        await transaction.request()
          .input(`mapping_id${i}`, sql.Int, newMappingId)
          .input(`batch_id${i}`, sql.Int, record.batch_id)
          .input(`rmfp_id${i}`, sql.Int, record.rmfp_id)
          .input(`mixed_code${i}`, sql.Int, mixCode)
          .input(`tro_production_id${i}`, sql.Int, record.tro_production_id)
          .input(`weight_per_tro${i}`, sql.Float, weightToMove)
          .input(`weight_ntray${i}`, sql.Float, weightPerTray)
          .input(`ntray${i}`, sql.Float, roundedTraysUsed)
          .input(`process_id${i}`, sql.Int, record.process_id)
          .input(`qc_id${i}`, sql.Int, record.qc_id)
          .input(`weight_RM${i}`, sql.Float, weightToMove)
          .input(`level_eu${i}`, sql.NVarChar, record.level_eu || null)
          .query(`
          INSERT INTO RM_Mixed
          (mapping_id, batch_id, rmfp_id, mixed_code, tro_production_id, weight_per_tro,
          weight_ntray, ntray, process_id, qc_id, weight_RM, level_eu)
          VALUES
          (@mapping_id${i}, @batch_id${i}, @rmfp_id${i}, @mixed_code${i}, @tro_production_id${i}, @weight_per_tro${i},
          @weight_ntray${i}, @ntray${i}, @process_id${i}, @qc_id${i}, @weight_RM${i}, @level_eu${i})
        `);

        // *** เพิ่มส่วนนี้: สร้างข้อมูลในตาราง batch สำหรับ mapping_id ใหม่ ***
        if (record.batch_after !== null && record.batch_after !== undefined && record.batch_after !== '') {
          await transaction.request()
            .input(`new_mapping_id${i}`, sql.Int, newMappingId)
            .input(`batch_after${i}`, sql.VarChar, record.batch_after)
            .query(`
            INSERT INTO batch (mapping_id, batch_after)
            VALUES (@new_mapping_id${i}, @batch_after${i})
          `);
        }

        // อัปเดตรายการวัตถุดิบในรถเข็นเดิม
        // ปัดเศษเพื่อป้องกันความผิดพลาดจากทศนิยม
        const roundedRemainingWeight = Math.round(remainingWeight * 100) / 100;

        if (roundedRemainingWeight > 0.01) {
          const remainingTrays = Math.round((record.tray_count - roundedTraysUsed) * 100) / 100;
          await transaction.request()
            .input('remainingWeight', sql.Float, remainingWeight)
            .input('remainingTrays', sql.Float, remainingTrays)
            .input('mapping_id', sql.Int, record.mapping_id)
            .query(`
            UPDATE TrolleyRMMapping
            SET weight_RM = @remainingWeight,
                tray_count = @remainingTrays
            WHERE mapping_id = @mapping_id
          `);
        } else if (remainingWeight >= -tolerance && remainingWeight <= tolerance) {
          await transaction.request()
            .input('mapping_id', sql.Int, record.mapping_id)
            .query(`
            UPDATE TrolleyRMMapping
            SET stay_place = 'บรรจุเสร็จสิ้นM',
                dest = 'บรรจุเสร็จสิ้นM',
                rm_status = NULL,
                tray_count = 0,
                weight_RM = 0
            WHERE mapping_id = @mapping_id
          `);
        }
      }

      // สร้างรายการวัตถุดิบสำหรับการผลิตใหม่
      const dataRM = await transaction.request()
        .input('prod_rm_id', sql.Int, tro_production_id)
        .input('weight', sql.Float, total_weight)
        .input('rm_group_id', sql.Int, rm_group_id)
        .input('rm_group_id', sql.Int, rm_group_id)
        .query(`      
    INSERT INTO RMForProd (prod_rm_id, weight, rm_group_id)
    OUTPUT INSERTED.rmfp_id
    VALUES (@prod_rm_id, @weight, @rm_group_id)
  `);
      const new_rmfp_id = dataRM.recordset[0].rmfp_id;


      // สร้าง TrolleyRMMapping ใหม่สำหรับรถเข็นที่ผสมแล้ว
      const insert_result = await transaction.request()
        .input('rmfp_id', sql.Int, new_rmfp_id)
        .input('prod_mix', sql.Int, tro_production_id)
        .input('mix_code', sql.Int, mixCode)
        .input('total_weight', sql.Float, total_weight)
        .input('total_trays', sql.Float, total_trays)
        .input('stay_place', sql.NVarChar, 'บรรจุรับเข้า')
        .input('dest', sql.NVarChar, 'บรรจุ')
        .input('mix_time', sql.Float, 2.00)
        .input('rmm_line_name', sql.NVarChar, line_name)
        .query(`
        INSERT INTO TrolleyRMMapping
        (rmfp_id, prod_mix, mix_code, weight_RM, tray_count, stay_place, dest, mix_time, rmm_line_name, created_at)
        (rmfp_id, prod_mix, mix_code, weight_RM, tray_count, stay_place, dest, mix_time, rmm_line_name, created_at)
        OUTPUT INSERTED.mapping_id
        VALUES
        (@rmfp_id, @prod_mix, @mix_code, @total_weight, @total_trays, @stay_place, @dest, @mix_time, @rmm_line_name, GETDATE())
        (@rmfp_id, @prod_mix, @mix_code, @total_weight, @total_trays, @stay_place, @dest, @mix_time, @rmm_line_name, GETDATE())
      `);


      const newMixedMappingId = insert_result.recordset[0].mapping_id;


      // สร้างประวัติใหม่สำหรับรถเข็นที่ผสมแล้ว
      await transaction.request()
      await transaction.request()
        .input('mapping_id', sql.Int, newMixedMappingId)
        .input('total_weight', sql.Float, total_weight)
        .input('total_trays', sql.Float, total_trays)
        .query(`
        INSERT INTO History
        (mapping_id, mixed_date, weight_RM, tray_count, created_at)
        (mapping_id, mixed_date, weight_RM, tray_count, created_at)
        VALUES
        (@mapping_id, GETDATE(), @total_weight, @total_trays, GETDATE())
      `);

      io.to('PackMixRoom').emit('dataUpdated', 'gotUpdated');
      if (insert_result.rowsAffected[0] > 0) {
        await transaction.commit();
        return res.status(200).json({
          message: "เพิ่มข้อมูลสำเร็จ",
          data: {
            mix_code: mixCode,
            total_weight: total_weight,
            total_trays: total_trays,
            new_mapping_id: newMixedMappingId
          }
        });
      } else {
        await transaction.rollback();
        return res.status(404).json({ message: "เพิ่มข้อมูลไม่สำเร็จ" });
      }

    } catch (error) {
      console.error("SQL error: ", error);
      if (transaction) await transaction.rollback();
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล", error: error.message });
    } finally {
      await sql.close();
    }
  });


  router.put("/pack/mix/trolley", async (req, res) => {
    const { code, line_id } = req.body;

    if (!code) {
      return res.status(400).json({ message: "ต้องระบุ code" });
    }

    try {
      const pool = await connectToDatabase();

      const query = `
      SELECT 
        rmm.mapping_id,
        STRING_AGG(ba.batch_after, ', ') AS batch_after,
        rmm.weight_RM,
        rmm.tray_count,
        rg.rm_group_name,
        prm.prod_id AS code,
        rm.mat,
        rm.mat_name,
        prod.doc_no,
         FORMAT(h.rmit_date, 'yyyy-MM-dd HH:mm') AS rmit_date
      FROM TrolleyRMMapping rmm
      LEFT JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
      LEFT JOIN RawMatGroup rg ON rmf.rm_group_id = rg.rm_group_id
      LEFT JOIN ProdRawMat prm ON rmm.tro_production_id = prm.prod_rm_id
      LEFT JOIN Batch ba ON rmm.mapping_id = ba.mapping_id
      LEFT JOIN Production prod ON prm.prod_id = prod.prod_id
      JOIN Line li ON rmm.rmm_line_name = li.line_name
      JOIN RawMat rm ON prm.mat = rm.mat
      JOIN History h ON rmm.mapping_id = h.mapping_id
      WHERE prm.prod_id = @code
        AND rmm.dest IN ('ไปบรรจุ','บรรจุ')
        AND rmm.stay_place IN ('จุดเตรียม','ออกห้องเย็น')
        AND rmm.mix_code IS NULL
        AND li.line_id = @line_id
      GROUP BY
        rmm.mapping_id,
        rmm.weight_RM,
        rmm.tray_count,
        rg.rm_group_name,
        prm.prod_id,
        rm.mat,
        rm.mat_name,
        h.rmit_date,
        prod.doc_no
      ORDER BY 
        rmm.mapping_id DESC
    `;


      const result = await pool.request()
        .input("code", sql.Int, parseInt(code, 10))
        .input("line_id", sql.Int, parseInt(line_id, 10))
        .query(query);

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "ไม่พบรถเข็นสำหรับ Code นี้" });
      }

      return res.status(200).json(result.recordset);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
        error: error.message
      });
    }
  });

  router.put("/pack/trolley/not", async (req, res) => {
    const { tro_ids, status } = req.body;
    try {
      const pool = await connectToDatabase();

      const query = `
      UPDATE [PFCMv2].[dbo].[RMInTrolley] 
      SET status = '${status}' 
      WHERE tro_id IN (${tro_ids.join(",")})
    `;
      const result = await pool.request().query(query);

      return res.status(200).json(result.rowsAffected);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "ไม่พบข้อมูล", error: error.message });
    }
  });

  router.put("/pack/trolley/setstatus", async (req, res) => {
    try {
      const pool = await connectToDatabase();

      const query = `
      UPDATE [PFCMv2].[dbo].[RMInTrolley] 
      SET status = '1' 
    `;
      const result = await pool.request().query(query);

      return res.status(200).json(result.rowsAffected);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "ไม่พบข้อมูล", error: error.message });
    }
  });

  router.put("/prep/clear/trolley", async (req, res) => {
    const { tro_id } = req.body;

    if (!tro_id) {
      return res.status(400).json({ message: "กรุณาระบุ tro_id" });
    }

    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const request = new sql.Request(transaction);
      request.input("tro_id", sql.VarChar, tro_id);

      // 1️⃣ Update TrolleyRMMapping
      await request.query(`
        UPDATE TrolleyRMMapping
        SET tro_id = NULL,
            stay_place = N'ลบจากQC',
            dest = N'ลบจากQC',
            updated_at = GETDATE()
        WHERE tro_id = @tro_id
    `);

      // 2️⃣ Update Trolley
      await request.query(`
        UPDATE Trolley
        SET tro_status = 1,
            rsrv_timestamp = NULL
        WHERE tro_id = @tro_id
    `);

      // 3️⃣ Update Slot
      await request.query(`
        UPDATE Slot
        SET tro_id = NULL,
            status = 'sql'
        WHERE tro_id = @tro_id
    `);

      // 4️⃣ Delete PackTrolley
      await request.query(`
        DELETE FROM PackTrolley
        WHERE tro_id = @tro_id
    `);

      await transaction.commit();

      return res.status(200).json({
        message: "เคลียร์ tro_id สำเร็จ",
        tro_id
      });

    } catch (error) {
      await transaction.rollback();
      console.error(error);

      return res.status(500).json({
        message: "เกิดข้อผิดพลาด",
        error: error.message
      });
    }
  });


  router.get("/pack/mixed/trolley/head/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params;
      const pool = await connectToDatabase();

      const query = `
        SELECT
          rmm.mapping_id,
          rmf.rmfp_id,
          (
            SELECT STRING_AGG(batch_after, ', ') 
            FROM Batch 
            WHERE mapping_id = rmx.mapping_id
          ) AS batch_after,
          p.doc_no,
          p.code,
          l.line_name,
          rm.mat,
          rm.mat_name,
          rmm.dest,
          rmx.weight_RM AS individual_material_weight, 
          rmm.weight_RM AS total_weight, 
          rmm.tray_count,
          rmg.rm_type_id,
          rmm.level_eu,
          rmf.rm_group_id,
          rmm.rm_status,
          q.sq_remark,
          q.md,
          q.md_remark,
          q.defect,
          q.defect_remark,
          q.md_no,
          CONCAT(q.WorkAreaCode, '-', mwa.WorkAreaName) AS WorkAreaCode,
          q.qccheck,
          q.mdcheck,
          q.defectcheck,
          rmm.mix_code,
          h.hist_id,
          CONVERT(VARCHAR, h.withdraw_date, 120) AS withdraw_date,
          CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
          CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.sc_pack_date, 120) AS sc_pack_date,
          CONVERT(VARCHAR, h.rework_date, 120) AS rework_date,
          h.receiver,
          h.receiver_prep_two,
          h.receiver_qc,
          h.receiver_out_cold,
          h.receiver_out_cold_two,
          h.receiver_out_cold_three,
          h.receiver_oven_edit,
          h.receiver_pack_edit,
          h.remark_rework,
          h.remark_rework_cold,
          h.edit_rework,
          h.location
        FROM
          TrolleyRMMapping rmm
        JOIN 
          RM_Mixed rmx ON rmm.mix_code = rmx.mixed_code
        JOIN
          RMForProd rmf ON rmf.rmfp_id = rmx.rmfp_id
        JOIN 
          history h ON rmx.mapping_id = h.mapping_id
        JOIN
          Line l ON l.line_name = rmm.rmm_line_name
        JOIN
          Production p ON p.prod_id = rmm.prod_mix
        JOIN 
          ProdRawMat prm ON prm.prod_rm_id = rmx.tro_production_id
        JOIN
          QC q ON q.qc_id = rmx.qc_id
        JOIN
          WorkAreas mwa ON q.WorkAreaCode = mwa.WorkAreaCode
        JOIN 
          RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
        JOIN
          RawMat rm ON prm.mat = rm.mat
        WHERE
            rmm.mix_code IS NOT NULL
            AND rmm.dest IN ('บรรจุ', 'ไปบรรจุ')
            AND rmm.stay_place = 'บรรจุรับเข้า'
            AND l.line_id = @line_id
    `;
      const result = await pool.request()
        .input(`line_id`, sql.Int, parseInt(line_id, 10))
        .query(query);

      return res.status(200).json(result.recordset);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "ไม่พบข้อมูล", error: error.message });
    }
  });

  router.put("/pack/mixed/history", async (req, res) => {
    const { mixed_code } = req.body;

    try {
      if (!mixed_code) {
        return res.status(400).json({ message: "กรุณาระบุ mixed_code ใน parameters" });
      }

      const pool = await connectToDatabase();

      const result = await pool
        .request()
        .input("mixed_code", sql.Int, mixed_code)
        .query(`
          SELECT rmx.*,
            b.batch_after,
            rmf.rmfp_line_name,
            q.*,
            l.line_name,
            prm.mat,
            p.doc_no,
            p.code,
            rmg.rm_group_name,
            prm.mat,
            h.*
          FROM RM_Mixed rmx
            JOIN Batch b ON b.mapping_id = rmx.mapping_id
            JOIN RMForProd rmf ON rmf.rmfp_id = rmx.rmfp_id
            JOIN History h ON h.mapping_id = rmx.mapping_id
            JOIN Line l ON l.line_name = rmf.rmfp_line_name
            JOIN ProdRawMat prm ON prm.prod_rm_id = rmx.tro_production_id
            JOIN Production p ON p.prod_id = prm.prod_id
            JOIN QC q ON q.qc_id = rmx.qc_id
            JOIN RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
          WHERE rmx.mixed_code = @mixed_code
      `);

      if (result.recordset.length > 0) {
        return res.status(200).json(result.recordset);
      } else {
        return res.status(404).json({ message: `ไม่พบประวัติส่วนผสมสำหรับ mixed_code: ${mixed_code}` });
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการค้นหาประวัติส่วนผสม:", error);
      return res.status(500).json({ message: "เกิดข้อผิดพลาดในการค้นหาข้อมูล", error: error.message });
    }
  });

  router.get("/production-plans", async (req, res) => {
    const pool = await connectToDatabase();
    try {
      // ดึงข้อมูลแผนการผลิตจากฐานข้อมูล
      const result = await pool
        .request()
        .query(`
          SELECT 
                *
          FROM [PFCMv2].[dbo].[Production]
        `);

      // ส่งกลับข้อมูลในรูปแบบ JSON
      res.json({
        success: true,
        data: result.recordset,
        message: "Production plans retrieved successfully"
      });

    } catch (error) {
      console.error("Error fetching production plans:", error);

      // ส่งข้อความ error กลับไปยัง client
      res.status(500).json({
        success: false,
        message: "Failed to retrieve production plans",
        error: error.message
      });
    } finally {
      // ปิดการเชื่อมต่อกับ database
      if (pool) {
        await pool.close();
      }
    }
  });

  router.get("/pack/history/All/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params
      const pool = await connectToDatabase();
      const result = await pool
        .request()
        .input(`line_id`, sql.Int, parseInt(line_id, 10))
        .query(`
    SELECT 
        rmit.mapping_id,
        his.tro_id,
        rmfp.rmfp_id,
        (
          SELECT STRING_AGG(batch_after, ', ') 
          FROM Batch 
          WHERE mapping_id = rmit.mapping_id
        ) AS batch_after,
        prod.doc_no,
        prod.code,
        li.line_name,
        rm.mat,
        rm.mat_name,
        rmit.dest,
        his.weight_RM,
        rmit.tray_count,
        rmg.rm_type_id,
        rmit.level_eu,
        rmfp.rm_group_id,
        rmit.rm_status,
        q.sq_remark,
        q.md,
        q.md_remark,
        q.defect,
        q.defect_remark,
        md_no,
        CONCAT(q.WorkAreaCode, '-', mwa.WorkAreaName) AS WorkAreaCode,
        q.qccheck,
        q.mdcheck,
        q.defectcheck,
        rmit.mix_code,
        his.hist_id,
        CONVERT(VARCHAR, his.cooked_date, 120) AS cooked_date,
        CONVERT(VARCHAR, his.rmit_date, 120) AS rmit_date,
        CONVERT(VARCHAR, his.qc_date, 120) AS qc_date,
        CONVERT(VARCHAR, his.come_cold_date, 120) AS come_cold_date,
        CONVERT(VARCHAR, his.out_cold_date, 120) AS out_cold_date,
        CONVERT(VARCHAR, his.come_cold_date_two, 120) AS come_cold_date_two,
        CONVERT(VARCHAR, his.out_cold_date_two, 120) AS out_cold_date_two,
        CONVERT(VARCHAR, his.come_cold_date_three, 120) AS come_cold_date_three,
        CONVERT(VARCHAR, his.out_cold_date_three, 120) AS out_cold_date_three,
        CONVERT(VARCHAR, his.sc_pack_date, 120) AS sc_pack_date,
        CONVERT(VARCHAR, his.rework_date, 120) AS rework_date,
        his.receiver,
        his.receiver_prep_two,
        his.receiver_qc,
        his.receiver_out_cold,
        his.receiver_out_cold_two,
        his.receiver_out_cold_three,
        his.receiver_oven_edit,
        his.receiver_pack_edit,
        his.remark_rework,
        his.remark_rework_cold,
        his.edit_rework,
        his.location
    FROM RMForProd AS rmfp
        JOIN 
          TrolleyRMMapping AS rmit ON rmit.rmfp_id = rmfp.rmfp_id
        JOIN 
          History AS his ON rmit.mapping_id = his.mapping_id
        JOIN 
          ProdRawMat AS prm ON rmit.tro_production_id = prm.prod_rm_id
        JOIN 
          Production AS prod ON prm.prod_id = prod.prod_id
        JOIN 
          Line li ON rmfp.rmfp_line_name = li.line_name
        JOIN 
          RawMatGroup AS rmg ON rmfp.rm_group_id = rmg.rm_group_id
        JOIN 
          RawMat AS rm ON prm.mat = rm.mat
        JOIN 
          QC q ON rmit.qc_id = q.qc_id
        JOIN 
          WorkAreas mwa ON q.WorkAreaCode = mwa.WorkAreaCode
    WHERE
        rmit.dest IN ('จุดเตรียม','บรรจุเสร็จสิ้น','บรรจุ','เข้าห้องเย็น','ออกห้องเย็น','หม้ออบ','ไปบรรจุ')
        AND rmit.stay_place IN ('บรรจุ','บรรจุเสร็จสิ้น','ออกห้องเย็น','เข้าห้องเย็น','หม้ออบ')
        AND rmit.rm_status IN ('รอแก้ไข','เหลือจากไลน์ผลิต')
        AND rmfp.rm_group_id = rmg.rm_group_id
        AND li.line_id = @line_id
    ORDER BY his.sc_pack_date DESC, his.rework_date DESC, his.come_cold_date DESC, his.come_cold_date_two DESC, his.come_cold_date_three DESC
    `);
      res.status(200).json({
        success: true,
        data: result.recordset,
      });

    } catch (error) {
      console.error("Error fetching history data:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });

  router.get("/pack/history/All/mix/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params
      const pool = await connectToDatabase();
      const result = await pool
        .request()
        .input(`line_id`, sql.Int, parseInt(line_id, 10))
        .query(`
        SELECT
          rmm.mapping_id,
          h.tro_id,
          rmf.rmfp_id,
          (
            SELECT STRING_AGG(batch_after, ', ') 
            FROM Batch 
            WHERE mapping_id = rmx.mapping_id
          ) AS batch_after,
          p.doc_no,
          p.code,
          l.line_name,
          rm.mat,
          rm.mat_name,
          rmm.dest,
          rmx.weight_RM,
          rmm.tray_count,
          rmg.rm_type_id,
          rmm.level_eu,
          rmf.rm_group_id,
          rmm.rm_status,
          q.sq_remark,
          q.md,
          q.md_remark,
          q.defect,
          q.defect_remark,
          q.md_no,
          CONCAT(q.WorkAreaCode, '-', mwa.WorkAreaName) AS WorkAreaCode,
          q.qccheck,
          q.mdcheck,
          q.defectcheck,
          rmm.mix_code,
          h.hist_id,
          CONVERT(VARCHAR, h.withdraw_date, 120) AS withdraw_date,
          CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
          CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.sc_pack_date, 120) AS sc_pack_date,
          CONVERT(VARCHAR, h.rework_date, 120) AS rework_date,
          h.receiver,
          h.receiver_prep_two,
          h.receiver_qc,
          h.receiver_out_cold,
          h.receiver_out_cold_two,
          h.receiver_out_cold_three,
          h.receiver_oven_edit,
          h.receiver_pack_edit,
          h.remark_rework,
          h.remark_rework_cold,
          h.edit_rework,
          h.location
        FROM
          TrolleyRMMapping rmm
        JOIN 
          RM_Mixed rmx ON rmm.mix_code = rmx.mixed_code
        JOIN
          RMForProd rmf ON rmf.rmfp_id = rmx.rmfp_id
        JOIN 
          history h ON rmx.mapping_id = h.mapping_id
        JOIN
          Line l ON l.line_name = rmf.rmfp_line_name
        JOIN
          Production p ON p.prod_id = rmm.prod_mix
        JOIN 
          ProdRawMat prm ON prm.prod_rm_id = rmx.tro_production_id
        JOIN
          QC q ON q.qc_id = rmx.qc_id
        JOIN 
          WorkAreas mwa ON q.WorkAreaCode = mwa.WorkAreaCode
        JOIN 
          RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
        JOIN
          RawMat rm ON prm.mat = rm.mat
        WHERE 
          rmm.dest IN ('จุดเตรียม','บรรจุเสร็จสิ้น','บรรจุ','เข้าห้องเย็น','ออกห้องเย็น','หม้ออบ','ไปบรรจุ')
          AND rmm.stay_place IN ('บรรจุ','บรรจุเสร็จสิ้น','ออกห้องเย็น','เข้าห้องเย็น','หม้ออบ')
          AND rmf.rm_group_id = rmg.rm_group_id
          AND l.line_id = @line_id
        ORDER BY h.sc_pack_date DESC, h.rework_date DESC, h.come_cold_date DESC, h.come_cold_date_two DESC, h.come_cold_date_three DESC
      `);

      res.status(200).json({
        success: true,
        data: result.recordset,
      });

    } catch (error) {
      console.error("Error fetching history data:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });


  router.put("/pack/export/to/rework/Trolley", async (req, res) => {
    try {
      const { dest, tro_id, receiver_pack_edit, remark_pack_edit, mapping_id } = req.body;
      const io = req.app.get("io"); // ✅ ดึง io object จาก express app

      console.log("body : ", req.body);

      if (!dest || !tro_id) {
        return res.status(400).json({
          success: false,
          message: "กรุณาระบุ dest และ tro_id"
        });
      }

      const pool = await connectToDatabase();

      // ดึงข้อมูล mapping และเวลาต่างๆ
      const itemData = await pool.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
        SELECT
          rmm.mapping_id,
          FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
          FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
          FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date
        FROM
          TrolleyRMMapping rmm
        JOIN  
          RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id  
        JOIN
          RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
        JOIN
          History h ON rmm.mapping_id = h.mapping_id
        WHERE 
          rmm.tro_id = @tro_id
      `);

      if (itemData.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่สามารถส่งแก้ไขข้อมูลได้"
        });
      }

      // คำนวณและอัปเดตเวลาล่าช้า
      for (const item of itemData.recordset) {
        const delayTimeResult = calculateDelayTime(item);

        let fieldToUpdate = '';
        if (delayTimeResult.usedField === 'remaining_ctp_time') {
          fieldToUpdate = 'cold_to_pack_time';
        } else if (delayTimeResult.usedField === 'remaining_ptp_time') {
          fieldToUpdate = 'prep_to_pack_time';
        } else if (delayTimeResult.usedField === 'remaining_rework_time') {
          fieldToUpdate = 'rework_time';
        }

        if (fieldToUpdate) {
          await pool.request()
            .input("mapping_id", sql.Int, item.mapping_id)
            .input("delayTime", sql.VarChar, delayTimeResult.formattedDelayTime)
            .query(`
            UPDATE TrolleyRMMapping
            SET ${fieldToUpdate} = @delayTime
            WHERE mapping_id = @mapping_id
          `);
        }
      }

      // อัปเดตสถานะและปลายทางของ trolley
      const updateTrolleyQuery = `
  UPDATE 
    TrolleyRMMapping 
  SET
    rm_status = 'รอแก้ไข',
    stay_place = 'บรรจุ',
    dest = @dest,
    tro_id = CASE 
               WHEN @dest = N'จุดเตรียม' THEN NULL 
               ELSE @tro_id 
             END
  WHERE 
    tro_id = @tro_id
`;

      const updateTroQuery = `
  UPDATE Trolley
SET
  tro_status = CASE
                 WHEN @dest = N'จุดเตรียม' THEN '1'
                 ELSE tro_status
               END
WHERE
  tro_id = @tro_id

`;

      // --- เรียกใช้งานทั้งสอง query ---
      const result = await pool.request()
        .input("dest", sql.NVarChar, dest)
        .input("tro_id", sql.NVarChar, tro_id)
        .query(updateTrolleyQuery);


      await pool.request()
        .input("dest", sql.NVarChar, dest)
        .input("tro_id", sql.NVarChar, tro_id)
        .query(updateTroQuery);

      // อัปเดต tro_id ในตาราง History สำหรับทุก mapping_id ที่เกี่ยวข้อง
      await pool.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .input("dest", sql.NVarChar, dest)
        .input("receiver_pack_edit", sql.NVarChar, receiver_pack_edit)
        .input("remark_rework", sql.NVarChar, remark_pack_edit)
        .query(`
          UPDATE History
          SET tro_id = @tro_id,
          receiver_pack_edit = @receiver_pack_edit,
          remark_rework = @remark_rework,
          rm_status = 'รอแก้ไข',
          stay_place = 'บรรจุ',
          dest = @dest
          WHERE mapping_id IN (
            SELECT mapping_id 
            FROM TrolleyRMMapping 
            WHERE tro_id = @tro_id
          )
        `);


      // ลบข้อมูลจาก PackTrolley
      await pool.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
        DELETE PackTrolley
        WHERE tro_id = @tro_id
      `);

      await pool.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
        UPDATE Trolley
        set tro_status = '1'
        WHERE tro_id = @tro_id
      `);

      await pool.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
        UPDATE TrolleyRMMapping
        set tro_id = NULL
        WHERE tro_id = @tro_id
      `);

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบข้อมูล tro_id ที่ระบุ"
        });
      }

      // ✅ Emit real-time event ให้ client ในห้อง "QcCheckRoom"
      const formattedData = {
        tro_id,
        dest,
        rm_status: "รอแก้ไข",
        stay_place: "บรรจุ",
        timestamp: new Date().toISOString(),
        message: `Rework trolley ${tro_id} ถูกแก้ไขแล้ว`
      };

      io.to("QcCheckRoom").emit("dataUpdated", formattedData);

      res.status(200).json({
        success: true,
        message: "อัปเดตเส้นทางปลายทางและเวลาล่าช้าสำเร็จ",
        updatedRows: result.rowsAffected[0]
      });

    } catch (error) {
      console.error("Error updating trolley destination:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล",
        error: error.message
      });
    }
  });


  router.get("/pack/time-variables", async (req, res) => {
    try {
      const { mix_code } = req.query;
      console.log("mix_code : ", mix_code);

      // ตรวจสอบพารามิเตอร์ที่จำเป็น
      if (!mix_code) {
        return res.status(400).json({
          success: false,
          message: "กรุณาระบุ mix_code"
        });
      }

      const pool = await connectToDatabase();

      // ค้นหา mix_time จากตาราง TrolleyRMMapping
      const mixTimeResult = await pool.request()
        .input("mixed_code", sql.Int, mix_code)
        .query(`
        SELECT FORMAT(mix_time, 'N2') AS mix_time
        FROM TrolleyRMMapping
        WHERE mix_code = @mixed_code
      `);

      console.log("mixTimeResult : ", mixTimeResult)

      // เก็บค่า mix_time
      let mixTime = null;
      if (mixTimeResult.recordset.length > 0) {
        mixTime = mixTimeResult.recordset[0].mix_time;
      }

      console.log("mixTime :", mixTime)

      // ค้นหา mapping_id ทั้งหมดจากตาราง RM_Mixed
      const mappingResult = await pool.request()
        .input("mixed_code", sql.Int, mix_code)
        .query(`
        SELECT mapping_id
        FROM RM_Mixed
        WHERE mixed_code = @mixed_code
      `);

      if (mappingResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบข้อมูล mapping_id สำหรับ mix_code ที่ระบุ"
        });
      }

      console.log("mappingResult :", mappingResult.recordset);

      // สร้าง array สำหรับเก็บผลลัพธ์ทั้งหมด
      const allTimeVariables = [];

      // วนลูปผ่านทุก mapping_id ที่พบและดึงข้อมูลตัวแปรเวลา
      for (const item of mappingResult.recordset) {
        const mapping_id = item.mapping_id;

        // ใช้ mapping_id ที่ได้มาเพื่อดึงข้อมูลตัวแปรเวลา
        const timeVariables = await pool.request()
          .input("mapping_id", sql.Int, mapping_id)
          .query(`
          SELECT
            rmm.mapping_id,
            FORMAT(rmm.rework_time, 'N2') AS rework_time,
            FORMAT(rmg.rework, 'N2') AS standard_rework,
            FORMAT(rmm.prep_to_pack_time, 'N2') AS prep_to_pack_time,
            FORMAT(rmg.prep_to_pack, 'N2') AS standard_prep_to_pack,
            FORMAT(rmm.cold_to_pack_time, 'N2') AS cold_to_pack_time,
            FORMAT(rmg.cold_to_pack, 'N2') AS standard_cold_to_pack,
            FORMAT(rmm.prep_to_cold_time, 'N2') AS ptc_time,
            FORMAT(rmg.prep_to_cold, 'N2') AS standard_ptc_time,
            FORMAT(rmm.cold_time, 'N2') AS cold_time,
            FORMAT(rmg.cold, 'N2') AS standard_cold_time
          FROM
            TrolleyRMMapping rmm
          JOIN  
            RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id  
          JOIN
            RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
          WHERE 
            rmm.mapping_id = @mapping_id
        `);

        if (timeVariables.recordset.length > 0) {
          // เพิ่มข้อมูลเข้าไปใน array
          allTimeVariables.push(...timeVariables.recordset);
        }
      }

      if (allTimeVariables.length === 0 && !mixTime) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบข้อมูลตัวแปรเวลาสำหรับ mix_code ที่ระบุ"
        });
      }

      // ส่งค่า mix_time แยกต่างหากในผลลัพธ์
      return res.status(200).json({
        success: true,
        data: {
          timeVariables: allTimeVariables,
          mixTime: mixTime
        },
        message: "ดึงข้อมูลตัวแปรเวลาสำเร็จ",
        count: allTimeVariables.length
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลตัวแปรเวลา:", error);
      return res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลตัวแปรเวลา",
        error: error.message
      });
    }
  });



  router.post("/pack/mixtrolley/Add/rm/TrolleyMapping", async (req, res) => {
    const sql = require("mssql"); // ต้องมีการ import sql
    try {
      const { mapping_id, ntray, tro_id, weight_per_tro } = req.body;

      if (!mapping_id || !ntray || !tro_id || !weight_per_tro) {
        return res.status(400).json({ message: "Missing required fields in request body" });
      }

      const pool = await connectToDatabase();
      const transaction = new sql.Transaction(pool);

      try {
        await transaction.begin();

        // ดึงข้อมูลเดิม
        const result = await transaction.request()
          .input("mapping_id", sql.Int, mapping_id)
          .query(`SELECT * FROM TrolleyRMMapping WHERE mapping_id = @mapping_id`);

        const oldData = result.recordset[0];
        if (!oldData) throw new Error("ไม่พบข้อมูล mapping เดิม");

        const pull_history = await transaction.request()
          .input("mapping_id", sql.Int, mapping_id)
          .query(`SELECT mixed_date, weight_RM, tray_count FROM History WHERE mapping_id = @mapping_id`);

        const oldHis = pull_history.recordset[0];
        if (!oldHis) throw new Error("ไม่พบข้อมูล mapping เดิม");

        const moveWeight = parseFloat(weight_per_tro);
        const trayCount = parseInt(ntray);
        const oldWeight = parseFloat(oldData.weight_RM);

        if (moveWeight > oldWeight) throw new Error("น้ำหนักที่ผสมมากกว่าน้ำหนักที่มีอยู่");

        const remainingWeight = oldWeight - moveWeight;

        // ✅ อัปเดตน้ำหนักรายการเดิม
        const updateOld = await transaction.request()
          .input("mapping_id", sql.Int, mapping_id)
          .input("weight_RM", sql.Float, remainingWeight)
          .input("stay_place", sql.NVarChar, remainingWeight > 0 ? "บรรจุรับเข้า" : "บรรจุเสร็จสิ้น")
          .input("dest", sql.NVarChar, remainingWeight > 0 ? "บรรจุ" : "บรรจุเสร็จสิ้น")
          .query(`UPDATE TrolleyRMMapping SET weight_RM=@weight_RM, stay_place=@stay_place, dest=@dest WHERE mapping_id=@mapping_id`);

        if (updateOld.rowsAffected[0] === 0) throw new Error("อัปเดตรายการเดิมไม่สำเร็จ");

        // ✅ เพิ่มรายการใหม่ สำหรับรถเข็นที่ย้ายไป และดึง mapping_id ของรายการใหม่
        const insertNewMapping = await transaction.request()
          .input("tro_id", sql.NVarChar, tro_id)
          .input("rmfp_id", sql.Float, oldData.rmfp_id)
          .input("weight_RM", sql.Float, moveWeight)
          .input("tray_count", sql.Int, trayCount)
          .input("dest", sql.NVarChar, "รถเข็นรอจัดส่ง")
          .input("stay_place", sql.NVarChar, "รอจัดส่ง")
          .input("mix_code", sql.Int, oldData.mix_code)
          .input("prod_mix", sql.Int, oldData.prod_mix)
          .input("rmm_line_name", sql.NVarChar, oldData.rmm_line_name)
          .input("mix_time", sql.Float, oldData.mix_time)
          .input("from_mapping_id", sql.Int, mapping_id)
          .input("tl_status", "1.6")
          .query(`
          INSERT INTO TrolleyRMMapping (tro_id, rmfp_id, weight_RM, tray_count, dest, stay_place, mix_code, prod_mix, rmm_line_name, mix_time, from_mapping_id,created_at,tl_status)
          OUTPUT INSERTED.mapping_id
          VALUES (@tro_id,@rmfp_id,@weight_RM,@tray_count,@dest,@stay_place,@mix_code,@prod_mix,@rmm_line_name,@mix_time,@from_mapping_id,GETDATE(),@tl_status)
        `);

        const newMappingId = insertNewMapping.recordset[0]?.mapping_id;
        if (!newMappingId) throw new Error("สร้าง mapping ใหม่ไม่สำเร็จ");

        // ✅ เพิ่มข้อมูลลงใน History โดยใช้ mapping_id ของรายการใหม่
        const insertHistory = await transaction.request()
          .input("mapping_id", sql.Int, newMappingId)
          .input("mixed_date", sql.DateTime, oldHis.mixed_date)
          .input("weight_RM", sql.Float, moveWeight)
          .input("tray_count", sql.Int, trayCount)
          .query(`
          INSERT INTO History (mapping_id, mixed_date, weight_RM, tray_count,created_at)
          VALUES (@mapping_id,@mixed_date,@weight_RM,@tray_count,GETDATE())
        `);

        if (insertHistory.rowsAffected[0] === 0) throw new Error("สร้าง history ใหม่ไม่สำเร็จ");

        await transaction.commit();

        res.status(200).json({
          message: "ย้ายวัตถุดิบเรียบร้อย",
          data: {
            original_mapping_id: mapping_id,
            new_mapping_id: newMappingId,
            remaining_weight: remainingWeight,
            moved_weight: moveWeight,
            tro_id,
            tray_count: trayCount
          }
        });

      } catch (innerError) {
        await transaction.rollback();
        console.error("Transaction failed:", innerError);
        res.status(500).json({ message: "Internal Server Error", error: innerError.message });
      }

    } catch (error) {
      console.error("Error during trolley RM movement:", error);
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  });




  router.put("/Trolley/del", async (req, res) => {
    try {
      const { tro_id } = req.body;

      if (!tro_id) {
        return res.status(400).json({ error: "tro_id is required" });
      }

      const pool = await connectToDatabase();

      // ตรวจสอบว่ามีวัตถุดิบในรถเข็นหรือไม่
      const haverawmat = await pool.request()
        .input('tro_id', sql.NVarChar, tro_id)
        .query(`
          SELECT * 
          FROM TrolleyRMMapping
          WHERE tro_id = @tro_id
        `);

      // ถ้ามีวัตถุดิบในรถเข็น ไม่สามารถลบได้
      if (haverawmat.recordset && haverawmat.recordset.length > 0) {
        return res.status(400).json({ error: "มีวัตถุดิบในรถเข็น ไม่สามารถลบได้" });
      }

      // ตรวจสอบว่ารถเข็นมีอยู่จริงในฐานข้อมูล
      const trolleyExists = await pool.request()
        .input('tro_id', sql.NVarChar, tro_id)
        .query(`
          SELECT tro_id 
          FROM Trolley 
          WHERE tro_id = @tro_id
        `);

      if (!trolleyExists.recordset || trolleyExists.recordset.length === 0) {
        return res.status(404).json({ error: "ไม่พบรถเข็นที่ต้องการลบ" });
      }

      // อัปเดต Trolley
      const result2 = await pool.request()
        .input('tro_id', sql.NVarChar, tro_id)
        .query(`
          UPDATE Trolley
          SET tro_status = '1',status = '2.2'
          WHERE tro_id = @tro_id
        `);

      if (result2.rowsAffected[0] === 0) {
        return res.status(404).json({ error: "ไม่สามารถอัปเดตสถานะรถเข็นได้" });
      }

      const result1 = await pool.request()
        .input('tro_id', sql.NVarChar, tro_id)
        .query(`
          DELETE PackTrolley
          WHERE tro_id = @tro_id
        `);

      // แจ้งผลลัพธ์
      const packTrolleyUpdated = result1.rowsAffected[0] > 0;
      let message = "อัปเดตสถานะรถเข็นเป็นไม่ใช้งานเรียบร้อยแล้ว";

      if (packTrolleyUpdated) {
        message += " (อัปเดตข้อมูลในตาราง Trolley และ PackTrolley แล้ว)";
      } else {
        message += " (อัปเดตข้อมูลในตาราง Trolley แล้ว)";
      }

      res.json({ message });

    } catch (error) {
      console.error("Error updating trolley status:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
  });

  router.put("/pack/sendback", async (req, res) => {
    try {
      console.log("Raw Request Body:", req.body);
      const { tro_id } = req.body;

      // ตรวจสอบค่าที่ได้รับมาอย่างละเอียด
      if (!tro_id || typeof tro_id !== 'string' || tro_id.trim() === '') {
        console.log("Invalid trolley ID:", tro_id);
        return res.status(400).json({
          success: false,
          error: "Invalid trolley ID"
        });
      }

      const pool = await connectToDatabase();

      // อัปเดตข้อมูล
      const result = await pool.request()
        .input("tro_id", tro_id)
        .input("dest", "เข้าห้องเย็น")
        .query(`UPDATE TrolleyRMMapping 
                    SET dest = @dest
                    WHERE tro_id = @tro_id`);

      // ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({
          success: false,
          error: "Trolley not found or no changes made"
        });
      }

      // แจ้งเตือนผ่าน Socket.io
      if (io) {
        io.to('QcCheckRoom').emit('refreshPack', {
          message: 'Trolley sent back to cold room',
          tro_id: tro_id
        });
      }

      // ส่ง response กลับ
      res.status(200).json({
        success: true,
        message: "Trolley sent back to cold room successfully",
        tro_id: tro_id
      });

    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        error: "An error occurred while updating the data."
      });
    }
  });

  router.get("/pack/request/fetchRM/", async (req, res) => {
    try {
      const pool = await connectToDatabase();

      const result = await pool.query(`
      SELECT
          rmf.rmfp_id,
          b.batch_after,
          rm.mat,
          rm.mat_name,
          rmm.mapping_id,
          rmm.dest,
          rmm.stay_place,
          rmg.rm_type_id,
          rmm.rm_status,
          rmm.tray_count,
          rmm.weight_RM,
          rmm.level_eu,
          rmm.tro_id,
          FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
          FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
          FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,
          CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
          CONVERT(VARCHAR, h.receiver, 120) AS receiver,
          CONVERT(VARCHAR, h.receiver_qc, 120) AS receiver_qc,
          l.line_name,
          CONCAT(p.doc_no, ' (',rmm.rmm_line_name, ')') AS code,
          q.*
      FROM
          RMForProd rmf
      JOIN
          TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
      LEFT JOIN
          Batch b ON rmm.batch_id = b.batch_id
      JOIN
          ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
      JOIN
          RawMat rm ON pr.mat = rm.mat
      JOIN
          Production p ON pr.prod_id = p.prod_id
      JOIN
          Line l ON rmm.rmm_line_name = l.line_name
      JOIN
          RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
      JOIN  
          History h ON rmm.mapping_id = h.mapping_id
      JOIN
          QC q ON rmm.qc_id = q.qc_id
      WHERE 
          rmm.stay_place = 'บรรจุรับเข้า' 
          AND rmm.dest IN ('ไปบรรจุ', 'บรรจุ' )
          AND rmf.rm_group_id = rmg.rm_group_id
    `);

      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');

        item.CookedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;
        delete item.cooked_date;

        return item;
      });

      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put("/pack/Add/request/rm/TrolleyMapping", async (req, res) => {
    const { mapping_id, weight_per_tro, line_id } = req.body;
    console.log("body:", req.body);

    try {
      const pool = await connectToDatabase();
      const transaction = new sql.Transaction(pool);

      await transaction.begin();

      const request = new sql.Request(transaction);
      await request
        .input("mapping_id", sql.Int, mapping_id)
        .input("weight_per_tro", sql.Int, weight_per_tro)
        .input("line_id", sql.Int, line_id)
        .query(`
        INSERT INTO RequestRawmat (mapping_id, weight_per_tro, line_id)
        VALUES (@mapping_id, @weight_per_tro, @line_id)
      `);

      await transaction.commit();

      res.status(200).json({ success: true, message: "Insert successful." });
    } catch (error) {
      console.error("Insert error:", error);

      try {
        if (transaction && transaction._aborted !== true) {
          await transaction.rollback();
        }
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }

      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get("/pack/request/rawmat/fetchRM/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params;
      const pool = await connectToDatabase();

      const request = pool.request();
      request.input("line_id", sql.Int, parseInt(line_id, 10));

      const result = await request.query(`
      SELECT
          rqrm.request_rm_id,
          rqrm.weight_per_tro,
          rqrm.line_id,
          b.batch_after,
          rm.mat,
          rm.mat_name,
          rmm.mapping_id,
          rmm.dest,
          rmm.stay_place,
          rmg.rm_type_id,
          rmm.rm_status,
          rmm.tray_count,
          rmm.weight_RM,
          rmm.level_eu,
          rmm.tro_id,
          FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
          FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
          FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,
          CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
          CONVERT(VARCHAR, h.receiver, 120) AS receiver,
          CONVERT(VARCHAR, h.receiver_qc, 120) AS receiver_qc,
          l.line_name,
          CONCAT(p.doc_no, ' (',rmm.rmm_line_name, ')') AS code,
          q.*
      FROM
          RequestRawmat rqrm
      JOIN
          TrolleyRMMapping rmm ON rqrm.mapping_id = rmm.mapping_id
      LEFT JOIN
          Batch b ON rmm.batch_id = b.batch_id
      JOIN
          RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
      JOIN
          ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
      JOIN
          RawMat rm ON pr.mat = rm.mat
      JOIN
          Production p ON pr.prod_id = p.prod_id
      JOIN
          Line l ON rmm.rmm_line_name = l.line_name
      JOIN
          RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
      JOIN  
          History h ON rmm.mapping_id = h.mapping_id
      JOIN
          QC q ON rmm.qc_id = q.qc_id
      WHERE 
          rmm.stay_place = 'บรรจุรับเข้า' 
          AND rmm.dest IN ('ไปบรรจุ', 'บรรจุ')
          AND rmf.rm_group_id = rmg.rm_group_id
          AND rqrm.line_id = @line_id
    `);

      const formattedData = result.recordset.map(item => {
        if (item.cooked_date) {
          const date = new Date(item.cooked_date);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');

          item.CookedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;
        } else {
          item.CookedDateTime = null;
        }

        delete item.cooked_date;
        return item;
      });

      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete("/delete/request/RM/:request_rm_id", async (req, res) => {
    const { request_rm_id } = req.params;

    try {
      const pool = await connectToDatabase();
      const request = pool.request();

      request.input("request_rm_id", sql.Int, parseInt(request_rm_id, 10));

      const result = await request.query(`
      DELETE FROM RequestRawmat
      WHERE request_rm_id = @request_rm_id
    `);

      res.status(200).json({ success: true, message: "ลบข้อมูลสำเร็จ" });
    } catch (error) {
      console.error("Error deleting RequestRawmat:", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด", error });
    }
  });

  router.get("/pack/manage/order/fetchRM/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params;
      const pool = await connectToDatabase();

      const request = pool.request();
      request.input("line_id", sql.Int, parseInt(line_id, 10));

      const result = await request.query(`
      SELECT
          rqrm.request_rm_id,
          rqrm.weight_per_tro,
          rqrm.line_id,
          rmf.rmfp_id,
          li.line_name AS from_line_name,
          b.batch_after,
          rm.mat,
          rm.mat_name,
          rmm.mapping_id,
          rmm.dest,
          rmm.stay_place,
          rmg.rm_type_id,
          rmm.rm_status,
          rmm.tray_count,
          rmm.weight_RM,
          rmm.level_eu,
          rmm.tro_id,
          FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
          FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
          FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,
          CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
          CONVERT(VARCHAR, h.receiver, 120) AS receiver,
          CONVERT(VARCHAR, h.receiver_qc, 120) AS receiver_qc,
          l.line_name,
          CONCAT(p.doc_no, ' (',rmm.rmm_line_name, ')') AS code,
          q.*
      FROM
          RequestRawmat rqrm
      JOIN
          TrolleyRMMapping rmm ON rqrm.mapping_id = rmm.mapping_id
      LEFT JOIN
          Batch b ON rmm.batch_id = b.batch_id
      JOIN
          RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
      JOIN
          ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
      JOIN
          RawMat rm ON pr.mat = rm.mat
      JOIN
          Production p ON pr.prod_id = p.prod_id
      JOIN
          Line l ON rmm.rmm_line_name = l.line_name
      JOIN
          RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
      JOIN  
          History h ON rmm.mapping_id = h.mapping_id
      JOIN
          QC q ON rmm.qc_id = q.qc_id
      JOIN 
          Line li ON rqrm.line_id = li.line_id

      WHERE 
          rmm.stay_place = 'บรรจุรับเข้า' 
          AND rmm.dest IN ('ไปบรรจุ', 'บรรจุ' )
          AND rmf.rm_group_id = rmg.rm_group_id
          AND l.line_id = @line_id
    `);

      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');

        item.CookedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;
        delete item.cooked_date;

        return item;
      });

      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put("/pack/matmanage/Add/rm/request/TrolleyMapping", async (req, res) => {
    const { tro_id, rmfpID, mapping_id, weight_per_tro, ntray, request_rm_id, batch_after, from_line_name } = req.body;
    console.log("body :", req.body);
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();
      let batch_id = null;

      if (batch_after) {
        const batchResult = await transaction.request()
          .input("batch_after", sql.NVarChar, batch_after)
          .query(`
          SELECT batch_id 
          FROM Batch 
          WHERE batch_after = @batch_after
        `);

        if (batchResult.recordset.length > 0) {
          batch_id = batchResult.recordset[0].batch_id;
        }
      }

      // ดึงข้อมูล mapping ปัจจุบัน
      const selectRawMat = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
        SELECT rmfp.hist_id_rmfp, rmm.tro_production_id, rmm.process_id, rmm.qc_id, rmm.cold_time, rmm.rmfp_id,
              rmm.weight_RM, rmm.level_eu, rmm.prep_to_cold_time, rmm.rm_cold_status,
              rmm.mix_code, rmm.prod_mix, rmm.production_batch,rmm_line_name
        FROM TrolleyRMMapping AS rmm
        JOIN RMForProd AS rmfp ON rmfp.rmfp_id = rmm.rmfp_id
        WHERE mapping_id = @mapping_id
      `);

      if (selectRawMat.recordset.length === 0) {
        throw new Error("ไม่พบข้อมูลใน TrolleyRMMapping");
      }

      const {
        hist_id_rmfp,
        tro_production_id,
        process_id,
        qc_id,
        cold_time,
        rmfp_id,
        weight_RM,
        level_eu,
        prep_to_cold_time,
        rm_cold_status,
        mix_code,
        prod_mix,
        production_batch,
        rmm_line_name
      } = selectRawMat.recordset[0];

      // ตรวจสอบน้ำหนักก่อน
      const remainingWeight = weight_RM - weight_per_tro;
      if (remainingWeight < 0) {
        throw new Error("น้ำหนักที่ขอมากกว่าน้ำหนักที่มีอยู่");
      }
      // ตรวจสอบว่าน้ำหนักที่เหลือเป็น 0 หรือไม่ (ย้ายทั้งหมด)
      const isMovingAll = remainingWeight === 0;

      // อัปเดตน้ำหนักใน mapping เดิม
      await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .input("remainingWeight", sql.Float, remainingWeight)
        .input("dest", sql.VarChar(25), isMovingAll ? "บรรจุเสร็จสิ้น" : "บรรจุ")
        .input("stay_place", sql.VarChar(25), isMovingAll ? "บรรจุเสร็จสิ้น" : "บรรจุรับเข้า")
        .query(`
        UPDATE TrolleyRMMapping
        SET weight_RM = @remainingWeight,
            dest = @dest,
            stay_place = @stay_place
        WHERE mapping_id = @mapping_id
      `);

      // ดึงข้อมูลจาก History เดิม
      const selectHis = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
        SELECT withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date, 
               come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three, 
               sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc, 
               receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three, 
               receiver_oven_edit, receiver_pack_edit, remark_rework, location
        FROM History
        WHERE mapping_id = @mapping_id
      `);

      if (selectHis.recordset.length === 0) {
        throw new Error("ไม่พบข้อมูลใน History");
      }

      const historyData = selectHis.recordset[0];

      // เพิ่มข้อมูลใหม่ใน History (ยังไม่ใส่ mapping_id ตอนนี้)
      const insertHis = await transaction.request()
        .input("withdraw_date", historyData.withdraw_date)
        .input("cooked_date", historyData.cooked_date)
        .input("rmit_date", historyData.rmit_date)
        .input("qc_date", historyData.qc_date)
        .input("come_cold_date", historyData.come_cold_date)
        .input("out_cold_date", historyData.out_cold_date)
        .input("come_cold_date_two", historyData.come_cold_date_two)
        .input("out_cold_date_two", historyData.out_cold_date_two)
        .input("come_cold_date_three", historyData.come_cold_date_three)
        .input("out_cold_date_three", historyData.out_cold_date_three)
        .input("sc_pack_date", historyData.sc_pack_date)
        .input("rework_date", historyData.rework_date)
        .input("receiver", historyData.receiver)
        .input("receiver_prep_two", historyData.receiver_prep_two)
        .input("receiver_qc", historyData.receiver_qc)
        .input("receiver_out_cold", historyData.receiver_out_cold)
        .input("receiver_out_cold_two", historyData.receiver_out_cold_two)
        .input("receiver_out_cold_three", historyData.receiver_out_cold_three)
        .input("receiver_oven_edit", historyData.receiver_oven_edit)
        .input("receiver_pack_edit", historyData.receiver_pack_edit)
        .input("remark_rework", historyData.remark_rework)
        .input("rmm_line_name", rmm_line_name)
        .input("location", historyData.location)
        .input("weight_RM", sql.Float, weight_per_tro)
        .input("tray_count", sql.Int, ntray)
        .input("from_line_name", sql.NVarChar, from_line_name)
        .query(`
        INSERT INTO History 
        (withdraw_date, cooked_date, rmit_date, qc_date, come_cold_date, out_cold_date, 
         come_cold_date_two, out_cold_date_two, come_cold_date_three, out_cold_date_three, 
         sc_pack_date, rework_date, receiver, receiver_prep_two, receiver_qc, 
         receiver_out_cold, receiver_out_cold_two, receiver_out_cold_three, 
         receiver_oven_edit, receiver_pack_edit, remark_rework, location, mapping_id, rmm_line_name,created_at,weight_RM,tray_count)
        OUTPUT INSERTED.hist_id
        VALUES (@withdraw_date, @cooked_date, @rmit_date, @qc_date, @come_cold_date, @out_cold_date, 
                @come_cold_date_two, @out_cold_date_two, @come_cold_date_three, @out_cold_date_three, 
                @sc_pack_date, @rework_date, @receiver, @receiver_prep_two, @receiver_qc, 
                @receiver_out_cold, @receiver_out_cold_two, @receiver_out_cold_three, 
                @receiver_oven_edit, @receiver_pack_edit, @remark_rework, @location, NULL, @from_line_name,GETDATE(),@weight_RM,@tray_count)
      `);

      const pkhis = insertHis.recordset[0].hist_id;
      const currentDate = new Date();

      // เพิ่มรายการใหม่ใน TrolleyRMMapping
      await transaction.request()
        .input("tro_id", sql.VarChar(4), tro_id)
        .input("rmfp_id", sql.Int, rmfpID)
        .input("batch_id", sql.Int, batch_id)
        .input("weight_RM", sql.Float, weight_per_tro)
        .input("tray_count", sql.Int, ntray)
        .input("rm_status", sql.VarChar(25), "QcCheck")
        .input("allocation_date", sql.DateTime, currentDate)
        .input("status", sql.VarChar(25), "active")
        .input("dest", sql.VarChar(25), "รถเข็นรอจัดส่ง")
        .input("stay_place", sql.VarChar(25), "บรรจุ")
        .input("created_by", sql.VarChar(50), req.user?.username || "system4732")
        .input("tro_production_id", sql.Int, tro_production_id)
        .input("process_id", sql.Int, process_id)
        .input("qc_id", sql.Int, qc_id)
        .input("cold_time", sql.Float, cold_time)
        .input("level_eu", sql.NVarChar(50), level_eu)
        .input("prep_to_cold_time", sql.Float, prep_to_cold_time)
        .input("rm_cold_status", sql.VarChar(20), rm_cold_status)
        .input("mix_code", sql.VarChar(20), mix_code)
        .input("prod_mix", sql.VarChar(20), prod_mix)
        .input("production_batch", sql.VarChar(20), production_batch)
        .input("rmm_line_name", sql.VarChar(20), rmm_line_name)
        .input("from_mapping_id", sql.Int, mapping_id)
        .input("from_line_name", sql.NVarChar, from_line_name)
        .input("tl_status", "1.7")
        .query(`
        INSERT INTO TrolleyRMMapping 
        (tro_id, rmfp_id, batch_id, weight_RM, tray_count, rm_status, allocation_date, status, dest, stay_place, created_by, 
         tro_production_id, process_id, qc_id, cold_time, level_eu, prep_to_cold_time, rm_cold_status, 
         mix_code, prod_mix, production_batch, from_mapping_id,created_at,rmm_line_name,tl_status)
        VALUES 
        (@tro_id, @rmfp_id, @batch_id, @weight_RM, @tray_count, @rm_status, @allocation_date, @status, @dest, @stay_place, @created_by, 
         @tro_production_id, @process_id, @qc_id, @cold_time, @level_eu, @prep_to_cold_time, @rm_cold_status,
         @mix_code, @prod_mix, @production_batch, @from_mapping_id,GETDATE(),@from_line_name,@tl_status)
      `);



      // ดึง mapping_id ที่เพิ่ง insert
      const newMappingResult = await transaction.request()
        .input("tro_id", sql.VarChar(4), tro_id)
        .input("rmfp_id", sql.Int, rmfpID)
        .input("allocation_date", sql.DateTime, currentDate)
        .query(`
        SELECT TOP 1 mapping_id
        FROM TrolleyRMMapping
        WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id AND allocation_date = @allocation_date
        ORDER BY mapping_id DESC
      `);

      const newMappingId = newMappingResult.recordset[0]?.mapping_id;
      if (!newMappingId) {
        throw new Error("ไม่สามารถดึง mapping_id ของรายการใหม่ได้");
      }

      await transaction.request()
        .input("request_rm_id", sql.Int, request_rm_id)
        .query(`
          DELETE FROM RequestRawmat
          WHERE request_rm_id = @request_rm_id
  `);

      // อัปเดต mapping_id ลงใน History
      await transaction.request()
        .input("hist_id", sql.Int, pkhis)
        .input("mapping_id", sql.Int, newMappingId)
        .query(`
        UPDATE History
        SET mapping_id = @mapping_id
        WHERE hist_id = @hist_id
      `);

      await transaction.commit();
      return res.status(200).json({ success: true, message: "บันทึกและย้ายวัตถุเสร็จสิ้น" });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/pack/data/pdf', upload.single('pdf'), async (req, res) => {
    console.log('✅ /pack/data/pdf hit!');
    console.log('File received:', req.file?.originalname, req.file?.size, 'bytes');


    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);


    try {
      const {
        recorded_by,
        reviewed_by,
        qc_manager,
        date,
        shift,
        line,       // ← ใหม่
        plant,
        mapping_ids: mapping_ids_raw
      } = req.body;


      let mapping_ids;
      try {
        mapping_ids = JSON.parse(mapping_ids_raw);
      } catch {
        return res.status(400).json({ success: false, error: 'mapping_ids JSON parse failed' });
      }


      if (!Array.isArray(mapping_ids)) {
        return res.status(400).json({ success: false, error: 'mapping_ids ต้องเป็น array' });
      }


      // ✅ รับ PDF buffer จาก multer
      const pdfBuffer = req.file?.buffer || null;


      await transaction.begin();


      const paperResult = await transaction.request()
        .input('recorded_by', sql.VarChar(50), recorded_by || null)
        .input('reviewed_by', sql.VarChar(50), reviewed_by || null)
        .input('qc_manager', sql.VarChar(50), qc_manager || null)
        .input('date', sql.DateTime, date ? new Date(date) : null)
        .input('shift', sql.VarChar(2), shift || null)
        .input('line', sql.VarChar(50), line || null)  // ← ใหม่
        .input('plant', sql.VarChar(10), plant || null)
        .input('paper_status', sql.VarChar(1), 'N')
        .input('pdf', sql.VarBinary(sql.MAX), pdfBuffer)       // ✅ บันทึก PDF
        .query(`
        INSERT INTO PaperPDF
          (recorded_by, reviewed_by, qc_manager, date, shift, line, plant, paper_status, pdf)
        OUTPUT INSERTED.paper_id
        VALUES
          (@recorded_by, @reviewed_by, @qc_manager, @date, @shift, @line, @plant, @paper_status, @pdf);
      `);


      const paper_id = paperResult.recordset[0].paper_id;


      for (const mapping_id of mapping_ids) {
        await transaction.request()
          .input('paper_id', sql.Int, paper_id)
          .input('mapping_id', sql.Int, Number(mapping_id))
          .query(`
          INSERT INTO DataToPdf (paper_id, mapping_id)
          VALUES (@paper_id, @mapping_id)
        `);
      }


      await transaction.commit();


      res.status(200).json({
        success: true,
        paper_id,
        count: mapping_ids.length,
        message: `บันทึกสำเร็จ paper_id=${paper_id}`
      });


    } catch (err) {
      await transaction.rollback();
      console.error('DB Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==============================
  // PDF retrieval (PaperPDF)
  // ==============================
  router.get("/pack/data/pdf", async (req, res) => {
    try {
      const {
        q,
        date_from,
        date_to,
        shift,
        line,
        plant,
        paper_status,
        limit = "100",
        offset = "0",
      } = req.query;

      const take = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
      const skip = Math.max(parseInt(offset, 10) || 0, 0);

      const pool = await connectToDatabase();

      let where = `WHERE 1=1`;
      const request = pool.request();

      if (q) {
        where += ` AND (
          recorded_by LIKE @q OR reviewed_by LIKE @q OR qc_manager LIKE @q
          OR line LIKE @q OR plant LIKE @q
        )`;
        request.input("q", sql.VarChar(120), `%${q}%`);
      }
      if (shift) {
        where += ` AND shift = @shift`;
        request.input("shift", sql.VarChar(2), shift);
      }
      if (line) {
        where += ` AND line = @line`;
        request.input("line", sql.VarChar(50), line);
      }
      if (plant) {
        where += ` AND plant = @plant`;
        request.input("plant", sql.VarChar(10), plant);
      }
      if (paper_status) {
        where += ` AND paper_status = @paper_status`;
        request.input("paper_status", sql.VarChar(1), paper_status);
      }
      if (date_from) {
        where += ` AND date >= @date_from`;
        request.input("date_from", sql.DateTime, new Date(date_from));
      }
      if (date_to) {
        where += ` AND date <= @date_to`;
        request.input("date_to", sql.DateTime, new Date(date_to));
      }

      request.input("take", sql.Int, take);
      request.input("skip", sql.Int, skip);

      const result = await request.query(`
        SELECT
          paper_id,
          recorded_by,
          reviewed_by,
          qc_manager,
          date,
          shift,
          line,
          plant,
          paper_status,
          DATALENGTH(pdf) AS pdf_bytes,
          (
            SELECT COUNT(1)
            FROM DataToPdf dtp
            WHERE dtp.paper_id = PaperPDF.paper_id
          ) AS mapping_count
        FROM PaperPDF
        ${where}
        ORDER BY paper_id DESC
        OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;
      `);

      return res.json({ success: true, data: result.recordset, limit: take, offset: skip });
    } catch (err) {
      console.error("GET /pack/data/pdf error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/pack/data/pdf/:paper_id", async (req, res) => {
    try {
      const paper_id = Number(req.params.paper_id);
      if (!Number.isFinite(paper_id)) {
        return res.status(400).json({ success: false, error: "paper_id invalid" });
      }

      const pool = await connectToDatabase();
      const result = await pool.request()
        .input("paper_id", sql.Int, paper_id)
        .query(`
          SELECT
            paper_id,
            pdf
          FROM PaperPDF
          WHERE paper_id = @paper_id
        `);

      if (!result.recordset.length) {
        return res.status(404).json({ success: false, error: "not found" });
      }

      const row = result.recordset[0];
      if (!row.pdf) {
        return res.status(404).json({ success: false, error: "pdf is empty" });
      }

      const filename = `paper_${row.paper_id}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      return res.status(200).send(row.pdf);
    } catch (err) {
      console.error("GET /pack/data/pdf/:paper_id error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });



  router.post("/pack/export/topack/Trolley", async (req, res) => {
    const sql = require("mssql"); // ต้องมีการ import sql
    const { tro_id } = req.body;
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // ตรวจสอบว่ามี trolley นี้ในระบบหรือไม่
      const rmTrolleyResult = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`SELECT tro_id FROM TrolleyRMMapping WHERE tro_id = @tro_id`);

      if (rmTrolleyResult.recordset.length === 0) {
        throw new Error("ไม่พบข้อมูล TrolleyRMMapping สำหรับ tro_id นี้");
      }

      console.log("tro_id:", tro_id);

      // ดึงข้อมูลวัตถุดิบในรถเข็นเพื่อคำนวณเวลา delay
      const rawMaterialsResult = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`
        SELECT
          rmm.mapping_id,
          rmm.mix_code,
          FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
          FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
          FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date
        FROM
          TrolleyRMMapping rmm
        JOIN  
          RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id  
        JOIN
          RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
        JOIN
          History h ON rmm.mapping_id = h.mapping_id
        WHERE 
          rmm.tro_id = @tro_id
      `);

      // ประมวลผลแต่ละวัตถุดิบในรถเข็น
      for (const item of rawMaterialsResult.recordset) {
        const delayTimeResult = calculateDelayTime(item);
        let fieldToUpdate = '';

        if (delayTimeResult.usedField === 'remaining_ctp_time') fieldToUpdate = 'cold_to_pack_time';
        else if (delayTimeResult.usedField === 'remaining_ptp_time') fieldToUpdate = 'prep_to_pack_time';
        else if (delayTimeResult.usedField === 'remaining_rework_time') fieldToUpdate = 'rework_time';

        if (fieldToUpdate) {
          const updateResult = await transaction.request()
            .input("mapping_id", sql.Int, item.mapping_id)
            .input("delayTime", sql.VarChar, delayTimeResult.formattedDelayTime)
            .query(`UPDATE TrolleyRMMapping SET ${fieldToUpdate} = @delayTime WHERE mapping_id = @mapping_id`);

          if (updateResult.rowsAffected[0] === 0) throw new Error(`อัปเดต ${fieldToUpdate} สำหรับ mapping_id ${item.mapping_id} ไม่สำเร็จ`);
        }
      }

      // อัปเดต tro_id ในตาราง History
      const updateHistory = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .input("dest", sql.VarChar, "ไปบรรจุ")
        .input("rm_status", sql.VarChar, "เหลือจากไลน์ผลิต")
        .input("stay_place", sql.VarChar, "บรรจุ")
        .query(`
        UPDATE History
        SET tro_id = @tro_id, 
            dest = @dest,
            stay_place = @stay_place,
            rm_status = @rm_status
        WHERE mapping_id IN (SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id)
      `);

      if (updateHistory.rowsAffected[0] === 0) throw new Error("อัปเดต History ไม่สำเร็จ");

      // อัปเดตสถานะของวัตถุดิบในรถเข็น
      const updateMapping = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .input("dest", sql.VarChar, "ไปบรรจุ")
        .input("rm_status", sql.VarChar, "เหลือจากไลน์ผลิต")
        .input("stay_place", sql.VarChar, "บรรจุ")
        .query(`
        UPDATE TrolleyRMMapping
        SET dest = @dest,
            stay_place = @stay_place,
            rm_status = @rm_status
        WHERE tro_id = @tro_id
      `);

      if (updateMapping.rowsAffected[0] === 0) throw new Error("อัปเดต TrolleyRMMapping ไม่สำเร็จ");

      // ลบรถเข็นออกจากตาราง PackTrolley
      const deletePackTrolley = await transaction.request()
        .input("tro_id", sql.NVarChar, tro_id)
        .query(`DELETE PackTrolley WHERE tro_id = @tro_id`);

      if (deletePackTrolley.rowsAffected[0] === 0) throw new Error("ลบ PackTrolley ไม่สำเร็จ");

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลเสร็จสิ้น"
      });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error", err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  //APIบรรจุเสร็จ

  // router.post("/pack/mixed/delay-time/test", async (req, res) => {
  //   const { mapping_id, sc_pack_date, weight } = req.body;

  //   console.log("mapping_id:", mapping_id);
  //   console.log("sc_pack_date:", sc_pack_date);
  //   console.log("weight:", weight);

  //   // ✅ mapping_id เป็นตัวเดียว
  //   if (!mapping_id || isNaN(mapping_id)) {
  //     return res.status(400).json({
  //       message: "mapping_id จำเป็นต้องเป็นตัวเลข"
  //     });
  //   }

  //   if (!sc_pack_date) {
  //     return res.status(400).json({
  //       message: "sc_pack_date จำเป็นต้องระบุ"
  //     });
  //   }

  //   if (weight == null || isNaN(weight)) {
  //     return res.status(400).json({
  //       message: "weight จำเป็นต้องเป็นตัวเลข"
  //     });
  //   }

  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);

  //   try {
  //     await transaction.begin();

  //     // 1) ดึง weight_RM เดิม
  //     const result = await transaction.request()
  //       .input("mapping_id", sql.Int, mapping_id)
  //       .query(`
  //         SELECT weight_RM
  //         FROM TrolleyRMMapping
  //         WHERE mapping_id = @mapping_id
  //       `);

  //     if (!result.recordset.length) {
  //       await transaction.rollback();
  //       return res.status(404).json({
  //         message: "ไม่พบข้อมูล mapping_id นี้"
  //       });
  //     }

  //     const oldWeightRM = result.recordset[0].weight_RM || 0;
  //     const newWeightRM = Math.max(oldWeightRM - weight, 0); // 🔐 กันติดลบ

  //     // 2) อัปเดตสถานะรถเข็น
  //     await transaction.request()
  //       .input("mapping_id", sql.Int, mapping_id)
  //       .query(`
  //         UPDATE TrolleyRMMapping
  //         SET 
  //           stay_place = 'บรรจุเสร็จสิ้น',
  //           dest = 'บรรจุเสร็จสิ้น'
  //         WHERE mapping_id = @mapping_id
  //       `);

  //     // 3) อัปเดต sc_pack_date ใน History
  //     await transaction.request()
  //       .input("mapping_id", sql.Int, mapping_id)
  //       .input("sc_pack_date", sql.DateTime, new Date(sc_pack_date))

  //       .query(`
  //         UPDATE History
  //         SET sc_pack_date = @sc_pack_date
  //         WHERE mapping_id = @mapping_id
  //       `);

  //     // 4) อัปเดต weight_RM ใหม่
  //     await transaction.request()
  //       .input("mapping_id", sql.Int, mapping_id)
  //       .input("newWeightRM", sql.Decimal(10, 2), newWeightRM)
  //       .query(`
  //         UPDATE TrolleyRMMapping
  //         SET weight_RM = @newWeightRM
  //         WHERE mapping_id = @mapping_id
  //       `);

  //     await transaction.commit();

  //     return res.status(200).json({
  //       success: true,
  //       result: {
  //         mapping_id,
  //         oldWeightRM,
  //         usedWeight: weight,
  //         newWeightRM
  //       }
  //     });

  //   } catch (err) {
  //     await transaction.rollback();
  //     console.error(err);
  //     return res.status(500).json({
  //       message: "เกิดข้อผิดพลาด",
  //       error: err.message
  //     });
  //   }
  // });

  router.post("/pack/mixed/delay-time/test", async (req, res) => {
    const { mapping_id, sc_pack_date, weight, group } = req.body;

    if (!mapping_id || isNaN(mapping_id)) {
      return res.status(400).json({ message: "mapping_id ต้องเป็นตัวเลข" });
    }
    if (!sc_pack_date) {
      return res.status(400).json({ message: "sc_pack_date จำเป็นต้องระบุ" });
    }
    if (weight == null || isNaN(weight) || weight <= 0) {
      return res.status(400).json({ message: "weight ต้องมากกว่า 0" });
    }
    if (group == null || isNaN(group) || group <= 0) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลชุดให้ถูกต้อง" });
    }

    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // ================= 1. GET SOURCE MAPPING =================
      const mapRes = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`SELECT * FROM TrolleyRMMapping WHERE mapping_id = @mapping_id`);

      if (!mapRes.recordset.length) {
        throw new Error("ไม่พบ mapping_id");
      }

      const src = mapRes.recordset[0];

      if (src.weight_RM < weight) {
        throw new Error("น้ำหนักคงเหลือไม่พอ");
      }

      // ================= 2. GET SOURCE BATCH =================
      const batchSrcRes = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
        SELECT TOP 1 batch_before, batch_after
        FROM Batch
        WHERE mapping_id = @mapping_id
      `);

      if (!batchSrcRes.recordset.length) {
        throw new Error("ไม่พบ batch ของ mapping เดิม");
      }

      const batchSrc = batchSrcRes.recordset[0];

      // ================= 3. COPY QC =================
      const qcRes = await transaction.request()
        .input("qc_id", sql.Int, src.qc_id)
        .query(`
        INSERT INTO QC (
          color, odor, texture, sq_acceptance, sq_remark,
          md, md_remark, defect, defect_remark, defect_acceptance,
          qc_datetime, md_no, qccheck, mdcheck, defectcheck,
          WorkAreaCode, Moisture, Temp, md_time,
          percent_fine, general_remark, prepare_mor_night
        )
        SELECT
          color, odor, texture, sq_acceptance, sq_remark,
          md, md_remark, defect, defect_remark, defect_acceptance,
          qc_datetime, md_no, qccheck, mdcheck, defectcheck,
          WorkAreaCode, Moisture, Temp, md_time,
          percent_fine, general_remark, prepare_mor_night
        FROM QC
        WHERE qc_id = @qc_id;

        SELECT SCOPE_IDENTITY() AS newQcId;
      `);

      const newQcId = qcRes.recordset[0].newQcId;

      // ================= 4. INSERT NEW MAPPING =================
      const newMapRes = await transaction.request()
        .input("rmfp_id", src.rmfp_id)
        .input("tro_production_id", src.tro_production_id)
        .input("process_id", src.process_id)
        .input("weight_in_trolley", src.weight_in_trolley)
        .input("weight_RM", weight)
        .input("group_no", group)
        .input("level_eu", src.level_eu)
        .input("rm_status", src.rm_status)
        .input("mix_code", src.mix_code)
        .input("prod_mix", src.prod_mix)
        .input("allocation_date", src.allocation_date)
        .input("status", src.status)
        .input("production_batch", src.production_batch)
        .input("created_by", src.created_by)
        .input("rmm_line_name", src.rmm_line_name)
        .input("mix_time", src.mix_time)
        .input("from_mapping_id", mapping_id)
        .input("tl_status", src.tl_status)
        .input("qc_id", newQcId)
        .query(`
        INSERT INTO TrolleyRMMapping (
          rmfp_id, tro_production_id, process_id,
          weight_in_trolley, weight_RM, group_no,level_eu,
          rm_status, mix_code, prod_mix, allocation_date,
          status, production_batch, created_by,
          rmm_line_name, mix_time, from_mapping_id,
          tl_status, qc_id,
          stay_place, dest
        )
        VALUES (
          @rmfp_id, @tro_production_id, @process_id,
          @weight_in_trolley, @weight_RM,@group_no, @level_eu,
          @rm_status, @mix_code, @prod_mix, @allocation_date,
          @status, @production_batch, @created_by,
          @rmm_line_name, @mix_time, @from_mapping_id,
          @tl_status, @qc_id,
          N'บรรจุเสร็จ', N'บรรจุเสร็จ'
        );

        SELECT SCOPE_IDENTITY() AS newMappingId;
      `);

      const newMappingId = newMapRes.recordset[0].newMappingId;

      // ================= 5. INSERT NEW BATCH (ผูก mapping ใหม่) =================
      await transaction.request()
        .input("batch_before", batchSrc.batch_before)
        .input("batch_after", batchSrc.batch_after)
        .input("mapping_id", sql.Int, newMappingId)
        .query(`
        INSERT INTO Batch (batch_before, batch_after, mapping_id)
        VALUES (@batch_before, @batch_after, @mapping_id)
      `);

      // ================= 6. COPY HISTORY (FULL ROW) =================
      const scPackDate = sc_pack_date.includes("+")
        ? new Date(sc_pack_date)
        : new Date(`${sc_pack_date}:00+07:00`);

      const histRes = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`SELECT * FROM History WHERE mapping_id = @mapping_id`);

      for (const h of histRes.recordset) {
        await transaction.request()
          .input("tro_id", h.tro_id)
          .input("mapping_id", sql.Int, newMappingId) // ✅ mapping ใหม่
          .input("withdraw_date", h.withdraw_date)
          .input("cooked_date", h.cooked_date)
          .input("rmit_date", h.rmit_date)
          .input("qc_date", h.qc_date)
          .input("come_cold_date", h.come_cold_date)
          .input("out_cold_date", h.out_cold_date)
          .input("come_cold_date_two", h.come_cold_date_two)
          .input("out_cold_date_two", h.out_cold_date_two)
          .input("come_cold_date_three", h.come_cold_date_three)
          .input("out_cold_date_three", h.out_cold_date_three)
          .input("sc_pack_date", sql.DateTimeOffset, scPackDate) // ✅ override
          .input("rework_date", h.rework_date)
          .input("receiver", h.receiver)
          .input("receiver_prep_two", h.receiver_prep_two)
          .input("receiver_qc", h.receiver_qc)
          .input("receiver_out_cold", h.receiver_out_cold)
          .input("receiver_out_cold_two", h.receiver_out_cold_two)
          .input("receiver_out_cold_three", h.receiver_out_cold_three)
          .input("receiver_oven_edit", h.receiver_oven_edit)
          .input("receiver_pack_edit", h.receiver_pack_edit)
          .input("remark_pack_edit", h.remark_pack_edit)
          .input("location", h.location)
          .input("mixed_date", h.mixed_date)
          .input("md_time", h.md_time)
          .input("Moisture", h.Moisture)
          .input("Temp", h.Temp)
          .input("percent_fine", h.percent_fine)
          .input("tray_count", h.tray_count)
          .input("weight_RM", sql.Decimal(18, 3), weight) // ✅ น้ำหนักใหม่
          .input("rmm_line_name", h.rmm_line_name)
          .input("dest", h.dest)
          .input("mix_time", h.mix_time)
          .input("rework_time", h.rework_time)
          .input("cold_to_pack_time", h.cold_to_pack_time)
          .input("prep_to_pack_time", h.prep_to_pack_time)
          .input("cold_dest", h.cold_dest)
          .input("prepare_mor_night", h.prepare_mor_night)
          .input("rm_status", h.rm_status)
          .input("stay_place", sql.NVarChar, "บรรจุเสร็จ") // override ได้
          .input("qccheck_cold", h.qccheck_cold)
          .input("remark_rework_cold", h.remark_rework_cold)
          .input("remark_rework", h.remark_rework)
          .input("receiver_qc_cold", h.receiver_qc_cold)
          .input("mix_date", h.mix_date)
          .input("edit_rework", h.edit_rework)
          .input("first_prod", h.first_prod)
          .input("two_prod", h.two_prod)
          .input("three_prod", h.three_prod)
          .input("name_edit_prod_two", h.name_edit_prod_two)
          .input("name_edit_prod_three", h.name_edit_prod_three)
          .query(`
      INSERT INTO History (
        tro_id, mapping_id, withdraw_date, cooked_date, rmit_date, qc_date,
        come_cold_date, out_cold_date, come_cold_date_two, out_cold_date_two,
        come_cold_date_three, out_cold_date_three, sc_pack_date, rework_date,
        receiver, receiver_prep_two, receiver_qc, receiver_out_cold,
        receiver_out_cold_two, receiver_out_cold_three,
        receiver_oven_edit, receiver_pack_edit, remark_pack_edit,
        location, mixed_date, md_time, Moisture, Temp, percent_fine,
        tray_count, weight_RM, rmm_line_name, dest, mix_time, rework_time,
        cold_to_pack_time, prep_to_pack_time, cold_dest, prepare_mor_night,
        rm_status, stay_place, qccheck_cold, remark_rework_cold, remark_rework,
        receiver_qc_cold, mix_date, edit_rework, first_prod, two_prod,
        three_prod, name_edit_prod_two, name_edit_prod_three
      )
      VALUES (
        @tro_id, @mapping_id, @withdraw_date, @cooked_date, @rmit_date, @qc_date,
        @come_cold_date, @out_cold_date, @come_cold_date_two, @out_cold_date_two,
        @come_cold_date_three, @out_cold_date_three, @sc_pack_date, @rework_date,
        @receiver, @receiver_prep_two, @receiver_qc, @receiver_out_cold,
        @receiver_out_cold_two, @receiver_out_cold_three,
        @receiver_oven_edit, @receiver_pack_edit, @remark_pack_edit,
        @location, @mixed_date, @md_time, @Moisture, @Temp, @percent_fine,
        @tray_count, @weight_RM, @rmm_line_name, @dest, @mix_time, @rework_time,
        @cold_to_pack_time, @prep_to_pack_time, @cold_dest, @prepare_mor_night,
        @rm_status, @stay_place, @qccheck_cold, @remark_rework_cold, @remark_rework,
        @receiver_qc_cold, @mix_date, @edit_rework, @first_prod, @two_prod,
        @three_prod, @name_edit_prod_two, @name_edit_prod_three
      )
    `);
      }


      // ================= 7. UPDATE OLD MAPPING =================
      const updateRes = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .input("weight", sql.Decimal(18, 3), weight)
        .query(`
        UPDATE TrolleyRMMapping
        SET weight_RM = weight_RM - @weight
        WHERE mapping_id = @mapping_id
          AND weight_RM >= @weight
      `);

      if (updateRes.rowsAffected[0] === 0) {
        throw new Error("ไม่สามารถตัดน้ำหนักได้");
      }

      await transaction.commit();

      res.status(200).json({
        success: true,
        newMappingId,
        usedWeight: weight
      });

    } catch (err) {
      await transaction.rollback();
      console.error(err);
      res.status(500).json({
        message: "เกิดข้อผิดพลาด",
        error: err.message
      });
    }
  });


  router.get("/prep/getRMForProdMixToPackList", async (req, res) => {
    try {
      const pool = await connectToDatabase();

      const result = await pool.request().query(`
      SELECT 
        rmfp.rmfp_id,
        rmfp.batch AS Batch_RMForProd,
        pdrm.mat AS mat_RMForProd,
        rm2.mat_name AS mat_name_RMForProd,
        rmfp.weight AS weight_RMForProd,
        pdt.doc_no AS production,
        rmfp.rmfp_line_name,
        rmfp.level_eu,
        his.withdraw_date,

        rmi.Include_id,
        rmi.mixtp_id,
        mtp.from_mapping_id,
        mtp.batch_id,
        rmfp_mix.batch AS Batch_MixToPack,
        pdrm_mix.mat AS mat_MixToPack,
        rm_mix.mat_name AS mat_name_MixToPack,
        mtp.weight_RM AS mix_weight, 
        mtp.rm_status AS mix_status,
        his_mix.withdraw_date AS mix_withdraw_date

      FROM RMForProd rmfp
      JOIN ProdRawMat pdrm ON rmfp.prod_rm_id = pdrm.prod_rm_id
      JOIN RawMat rm2 ON pdrm.mat = rm2.mat
      JOIN Production pdt ON pdrm.prod_id = pdt.prod_id
      LEFT JOIN History his ON rmfp.hist_id_rmfp = his.hist_id
      
      JOIN RM_MixInclude rmi ON rmfp.rmfp_id = rmi.rmfp_id
      JOIN MixToPack mtp ON rmi.mixtp_id = mtp.mixtp_id
      JOIN RMForProd rmfp_mix ON mtp.rmfp_id = rmfp_mix.rmfp_id
      JOIN ProdRawMat pdrm_mix ON rmfp_mix.prod_rm_id = pdrm_mix.prod_rm_id
      JOIN RawMat rm_mix ON pdrm_mix.mat = rm_mix.mat
      LEFT JOIN History his_mix ON mtp.from_mapping_id = his_mix.mapping_id
      
      WHERE rmfp.row_status = 'M_M'
      AND (mtp.rm_status IS NULL OR mtp.rm_status IN ('QcCheck', 'USED'))
      ORDER BY rmfp.rmfp_id DESC
    `);

      const dataMap = {};

      result.recordset.forEach(row => {
        if (!dataMap[row.rmfp_id]) {
          dataMap[row.rmfp_id] = {
            rmfp_id: row.rmfp_id,
            Batch_RMForProd: row.Batch_RMForProd,
            mat_RMForProd: row.mat_RMForProd,
            mat_name_RMForProd: row.mat_name_RMForProd,
            weight: row.weight_RMForProd,
            production: row.production,
            rmfp_line_name: row.rmfp_line_name,
            level_eu: row.level_eu,
            withdraw_date: row.withdraw_date,
            mixToPack: []
          };
        }

        dataMap[row.rmfp_id].mixToPack.push({
          Include_id: row.Include_id,
          mixtp_id: row.mixtp_id,
          from_mapping_id: row.from_mapping_id,
          batch_id: row.batch_id,
          Batch_MixToPack: row.Batch_MixToPack,
          mat_MixToPack: row.mat_MixToPack,
          mat_name_MixToPack: row.mat_name_MixToPack,
          mix_weight: row.mix_weight,
          mix_status: row.mix_status,  // ⭐ เพิ่มบรรทัดนี้
          mix_withdraw_date: row.mix_withdraw_date
        });
      });

      const nestedData = Object.values(dataMap);

      res.json({
        success: true,
        data: nestedData
      });

    } catch (err) {
      console.error("Fetch RMForProdMixToPackList error:", err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });


  router.get("/checkin/fetchCheckInData", async (req, res) => {
    try {
      const pool = await connectToDatabase();


      const query = `
      SELECT
        rmf.rmfp_id,
        COALESCE(STRING_AGG(b.batch_after, ', '), rmf.batch) AS batch,
        rm.mat,
        rm.mat_name,
        CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
        rmg.rm_type_id,
        rmm.mapping_id,
        rmm.tro_id,
        rmm.level_eu,
        rmm.rm_status,
        rmm.dest,
        rmm.stay_place,
        rmm.weight_RM,
        rmm.tray_count,
        htr.first_prod,
        htr.two_prod,
        htr.three_prod,
        htr.name_edit_prod_two,
        htr.name_edit_prod_three,
        htr.remark_rework,
        htr.edit_rework,
        htr.remark_rework_cold,
        htr.receiver_qc_cold,
        htr.qccheck_cold,
        htr.prepare_mor_night,
        CONVERT(VARCHAR, htr.withdraw_date, 120)        AS withdraw_date,
        CONVERT(VARCHAR, htr.cooked_date, 120)          AS cooked_date,
        CONVERT(VARCHAR, htr.rmit_date, 120)            AS rmit_date,
        CONVERT(VARCHAR, htr.come_cold_date, 120)       AS come_cold_date,
        CONVERT(VARCHAR, htr.come_cold_date_two, 120)   AS come_cold_date_two,
        CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three
      FROM
        RMForProd rmf
      JOIN
        TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
      JOIN
        ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
      JOIN
        RawMat rm ON pr.mat = rm.mat
      JOIN
        Production p ON pr.prod_id = p.prod_id
      JOIN
        RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
      JOIN
        RawMatGroup rmg ON rmcg.rm_group_id = rmg.rm_group_id
      LEFT JOIN
        Batch b ON rmm.mapping_id = b.mapping_id
      JOIN
        History htr ON rmm.mapping_id = htr.mapping_id
      WHERE
        rmm.dest in ('รอCheckin','บรรจุ','ไปบรรจุ')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmm.tro_id is not null
      GROUP BY
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        p.doc_no,
        rmm.rmm_line_name,
        rmg.rm_type_id,
        rmm.mapping_id,
        rmm.tro_id,
        rmm.level_eu,
        rmm.rm_status,
        rmm.dest,
        rmm.stay_place,
        rmm.weight_RM,
        rmm.tray_count,
        htr.first_prod,
        htr.two_prod,
        htr.three_prod,
        htr.name_edit_prod_two,
        htr.name_edit_prod_three,
        htr.remark_rework,
        htr.edit_rework,
        htr.remark_rework_cold,
        htr.receiver_qc_cold,
        htr.qccheck_cold,
        htr.prepare_mor_night,
        htr.withdraw_date,
        htr.cooked_date,
        htr.rmit_date,
        htr.come_cold_date,
        htr.come_cold_date_two,
        htr.come_cold_date_three
      ORDER BY
        htr.cooked_date DESC
    `;


      const result = await pool.request().query(query);


      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  router.get("/pack/manage/all/line", async (req, res) => {
    const { line_id } = req.query;

    // ✅ validate input
    if (!line_id) {
      return res.status(400).json({ success: false, error: "line_id is required" });
    }

    const lineIdNum = parseInt(line_id, 10);
    if (isNaN(lineIdNum)) {
      return res.status(400).json({ success: false, error: "line_id must be a number" });
    }

    try {
      const data = await withRetry(async () => {
        const pool = await getPool();
        const request = pool.request();
        request.input("line_id", sql.Int, lineIdNum);

        const result = await request.query(`
          SELECT
              rmf.rmfp_id,
              STRING_AGG(b.batch_after, ', ') 
                WITHIN GROUP (ORDER BY b.batch_after) AS batch_after,
              rm.mat,
              rm.mat_name,
              rmm.mapping_id,
              rmm.dest,
              rmm.stay_place,
              rmg.rm_type_id,
              rmm.rm_status,
              rmm.tray_count,
              rmm.weight_RM,
              rmm.level_eu,
              rmm.tro_id,
              p.doc_no,
              FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
              FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
              FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
              FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
              FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
              FORMAT(rmg.rework, 'N2') AS standard_rework_time,

              CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
              CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
              CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
              CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
              CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
              CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
              CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
              CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
              CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
              h.receiver,
              h.receiver_qc,

              l.line_name,
              CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS code,
              q.qc_id

          FROM RMForProd rmf WITH (NOLOCK)
          JOIN TrolleyRMMapping rmm WITH (NOLOCK) ON rmf.rmfp_id = rmm.rmfp_id
          LEFT JOIN Batch b WITH (NOLOCK) ON rmm.mapping_id = b.mapping_id
          JOIN ProdRawMat pr WITH (NOLOCK) ON rmm.tro_production_id = pr.prod_rm_id
          JOIN RawMat rm WITH (NOLOCK) ON pr.mat = rm.mat
          JOIN Production p WITH (NOLOCK) ON pr.prod_id = p.prod_id
          JOIN Line l WITH (NOLOCK) ON rmm.rmm_line_name = l.line_name
          JOIN RawMatGroup rmg WITH (NOLOCK) ON rmf.rm_group_id = rmg.rm_group_id
          JOIN History h WITH (NOLOCK) ON rmm.mapping_id = h.mapping_id
          LEFT JOIN QC q WITH (NOLOCK) ON rmm.qc_id = q.qc_id

          WHERE 
              rmm.stay_place IN ('จุดเตรียม','ออกห้องเย็น','create_manual')
              AND rmm.dest IN ('ไปบรรจุ', 'บรรจุ','create_manual')
              AND rmm.rm_status IN ('QcCheck','เหลือจากไลน์ผลิต','QcCheck รอ MD','รอแก้ไข')
              AND rmm.weight_RM != 0
              AND l.line_id = @line_id
              AND rmm.tro_id IS NULL

          GROUP BY
              rmf.rmfp_id,
              rm.mat,
              rm.mat_name,
              rmm.mapping_id,
              rmm.dest,
              rmm.stay_place,
              rmg.rm_type_id,
              rmm.rm_status,
              rmm.tray_count,
              rmm.weight_RM,
              rmm.level_eu,
              rmm.tro_id,
              rmm.cold_to_pack_time,
              rmg.cold_to_pack,
              rmm.prep_to_pack_time,
              rmg.prep_to_pack,
              rmm.rework_time,
              rmg.rework,
              h.cooked_date,
              h.rmit_date,
              h.come_cold_date,
              h.out_cold_date,
              h.come_cold_date_two,
              h.out_cold_date_two,
              h.come_cold_date_three,
              h.out_cold_date_three,
              h.qc_date,
              h.receiver,
              h.receiver_qc,
              l.line_name,
              p.doc_no,
              rmm.rmm_line_name,
              q.qc_id
        `);

        return result.recordset;
      });

      // ✅ transform
      const transformed = data.map(row => {
        const newRow = { ...row };
        if (newRow.cooked_date) {
          const d = new Date(newRow.cooked_date);
          newRow.CookedDateTime = d.toISOString().slice(0, 16).replace("T", " ");
        }
        delete newRow.cooked_date;
        return newRow;
      });

      // ✅ ป้องกัน browser cache ข้อมูลเก่า
      res.set('Cache-Control', 'no-store');

      return res.json({
        success: true,
        data: transformed,
        count: transformed.length
      });

    } catch (err) {
      console.error("❌ fetchRM error:", err);
      return res.status(500).json({
        success: false,
        error: err.message,
        errorCode: err.code || 'UNKNOWN'
      });
    }
  });


  // router.get("/pack/manage/all/line", async (req, res) => {
  //   try {
  //     const { line_id } = req.query; // รับจาก frontend
  //     const pool = await getPool();

  //     const request = pool.request();

  //     // ส่งค่าเข้า SQL แบบ parameter
  //     request.input("line_id", line_id);

  //     const result = await request.query(`
  //     SELECT
  //         rmf.rmfp_id,
  //         STRING_AGG(b.batch_after, ', ') AS batch_after,
  //         rm.mat,
  //         rm.mat_name,
  //         rmm.mapping_id,
  //         rmm.dest,
  //         rmm.stay_place,
  //         rmg.rm_type_id,
  //         rmm.rm_status,
  //         rmm.tray_count,
  //         rmm.weight_RM,
  //         rmm.level_eu,
  //         rmm.tro_id,
  //         p.doc_no,
  //         FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
  //         FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
  //         FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
  //         FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
  //         FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
  //         FORMAT(rmg.rework, 'N2') AS standard_rework_time,

  //         CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
  //         CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
  //         CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
  //         CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
  //         CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
  //         CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
  //         CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
  //         CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
  //         CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
  //         h.receiver,
  //         h.receiver_qc,

  //         l.line_name,
  //         CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS code,
  //         q.qc_id

  //     FROM RMForProd rmf
  //     JOIN TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
  //     LEFT JOIN Batch b ON rmm.mapping_id = b.mapping_id
  //     JOIN ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
  //     JOIN RawMat rm ON pr.mat = rm.mat
  //     JOIN Production p ON pr.prod_id = p.prod_id
  //     JOIN Line l ON rmm.rmm_line_name = l.line_name
  //     JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
  //     JOIN History h ON rmm.mapping_id = h.mapping_id
  //     LEFT JOIN QC q ON rmm.qc_id = q.qc_id

  //     WHERE 
  //         rmm.stay_place IN ('จุดเตรียม','ออกห้องเย็น','create_manual')
  //         AND rmm.dest IN ('ไปบรรจุ', 'บรรจุ','create_manual')
  //         AND rmm.rm_status IN ('QcCheck','เหลือจากไลน์ผลิต','QcCheck รอ MD','รอแก้ไข')
  //         AND rmm.weight_RM != 0
  //         AND l.line_id = @line_id   -- ⭐ filter ตาม line_id
  //         AND rmm.tro_id is null

  //     GROUP BY
  //         rmf.rmfp_id,
  //         rm.mat,
  //         rm.mat_name,
  //         rmm.mapping_id,
  //         rmm.dest,
  //         rmm.stay_place,
  //         rmg.rm_type_id,
  //         rmm.rm_status,
  //         rmm.tray_count,
  //         rmm.weight_RM,
  //         rmm.level_eu,
  //         rmm.tro_id,
  //         rmm.cold_to_pack_time,
  //         rmg.cold_to_pack,
  //         rmm.prep_to_pack_time,
  //         rmg.prep_to_pack,
  //         rmm.rework_time,
  //         rmg.rework,
  //         h.cooked_date,
  //         h.rmit_date,
  //         h.come_cold_date,
  //         h.out_cold_date,
  //         h.come_cold_date_two,
  //         h.out_cold_date_two,
  //         h.come_cold_date_three,
  //         h.out_cold_date_three,
  //         h.qc_date,
  //         h.receiver,
  //         h.receiver_qc,
  //         l.line_name,
  //         p.doc_no,
  //         rmm.rmm_line_name,
  //         q.qc_id
  //   `);

  //     const data = result.recordset.map(row => {
  //       if (row.cooked_date) {
  //         const d = new Date(row.cooked_date);
  //         row.CookedDateTime = d.toISOString().slice(0, 16).replace("T", " ");
  //       }
  //       delete row.cooked_date;
  //       return row;
  //     });

  //     res.json({
  //       success: true,
  //       data
  //     });

  //   } catch (err) {
  //     console.error("❌ fetchRM error:", err);
  //     res.status(500).json({
  //       success: false,
  //       error: err.message
  //     });
  //   }
  // });

  router.get("/pack/manage/mixed/all/line", async (req, res) => {
    try {
      const { line_id } = req.query;

      if (!line_id) {
        return res.status(400).json({
          success: false,
          message: "line_id is required"
        });
      }

      const pool = await getPool();
      const request = pool.request();

      request.input("line_id", line_id);

      const result = await request.query(`
      SELECT
          rmf.rmfp_id,
          STRING_AGG(b.batch_after, ', ') AS batch_after,
          rm.mat,
          rm.mat_name,
          rmmp.mapping_id,
          rmmp.dest,
          rmmp.stay_place,
          rmg.rm_type_id,
          rmmp.rm_status,
          rmmp.tray_count,
          rmmp.weight_RM,
          rmmp.level_eu,
          rmmp.tro_id,
          p.doc_no,

          FORMAT(rmmp.cold_to_pack_time, 'N2') AS remaining_ctp_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,
          FORMAT(rmmp.prep_to_pack_time, 'N2') AS remaining_ptp_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,
          FORMAT(rmmp.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,

          CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
          h.receiver,
          h.receiver_qc,

          l.line_name,
          CONCAT(p.doc_no, ' (', rmmp.rmm_line_name, ')') AS code,
          q.qc_id

      FROM RMForProd rmf
      JOIN TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
      JOIN RM_Mixed rmx ON rmm.mix_code = rmx.mixed_code
      JOIN TrolleyRMMapping rmmp ON rmx.mapping_id = rmmp.mapping_id
      LEFT JOIN Batch b ON rmmp.mapping_id = b.mapping_id
      JOIN ProdRawMat pr ON rmmp.tro_production_id = pr.prod_rm_id
      JOIN RawMat rm ON pr.mat = rm.mat
      JOIN Production p ON pr.prod_id = p.prod_id
      JOIN Line l ON rmmp.rmm_line_name = l.line_name
      JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
      JOIN History h ON rmmp.mapping_id = h.mapping_id
      LEFT JOIN QC q ON rmmp.qc_id = q.qc_id

      WHERE 
          rmm.stay_place IN ('จุดเตรียม','ออกห้องเย็น')
          AND rmm.dest IN ('ไปบรรจุ', 'บรรจุ')
          AND rmm.rm_status IN ('QcCheck','เหลือจากไลน์ผลิต','QcCheck รอ MD')
          AND rmmp.weight_RM != 0
          AND l.line_id = @line_id
          AND rmm.tro_id is null

      GROUP BY
          rmf.rmfp_id,
          rm.mat,
          rm.mat_name,
          rmmp.mapping_id,
          rmmp.dest,
          rmmp.stay_place,
          rmg.rm_type_id,
          rmmp.rm_status,
          rmmp.tray_count,
          rmmp.weight_RM,
          rmmp.level_eu,
          rmmp.tro_id,
          rmmp.cold_to_pack_time,
          rmg.cold_to_pack,
          rmmp.prep_to_pack_time,
          rmg.prep_to_pack,
          rmmp.rework_time,
          rmg.rework,
          h.cooked_date,
          h.rmit_date,
          h.come_cold_date,
          h.out_cold_date,
          h.come_cold_date_two,
          h.out_cold_date_two,
          h.come_cold_date_three,
          h.out_cold_date_three,
          h.qc_date,
          h.receiver,
          h.receiver_qc,
          l.line_name,
          p.doc_no,
          rmmp.rmm_line_name,
          q.qc_id
    `);

      res.json({
        success: true,
        data: result.recordset
      });

    } catch (error) {
      console.error("Error /pack/manage/mixed/all/line:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });


  router.get("/pack/report/fetchRM/all/line", async (req, res) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
      SELECT
          rmf.rmfp_id,
          STRING_AGG(b.batch_after, ', ') AS batch_after,

          rm.mat,
          rm.mat_name,

          rmm.mapping_id,
          rmm.group_no,               -- ✅ ส่ง group_no ออกไป
          rmm.dest,
          rmm.stay_place,
          rmm.rm_status,
          rmm.tray_count,
          rmm.weight_RM,
          rmm.level_eu,
          rmm.tro_id,

          rmg.rm_type_id,

          p.doc_no,
          CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS code,

          FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_ctp_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_ctp_time,

          FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_ptp_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_ptp_time,

          FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,

          CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
          CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
          CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
          CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
          CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
          CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
          CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
          CONVERT(VARCHAR, h.sc_pack_date, 120) AS sc_pack_date,
          CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,

          h.receiver,
          h.receiver_qc,

          l.line_name,
          q.qc_id,
          rmm.detail,
          q.color,
          q.odor,
          q.texture

      FROM RMForProd rmf
      JOIN TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
      LEFT JOIN Batch b ON rmm.mapping_id = b.mapping_id
      JOIN ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
      JOIN RawMat rm ON pr.mat = rm.mat
      JOIN Production p ON pr.prod_id = p.prod_id
      JOIN Line l ON rmm.rmm_line_name = l.line_name
      JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
      JOIN History h ON rmm.mapping_id = h.mapping_id
      LEFT JOIN QC q ON rmm.qc_id = q.qc_id

      WHERE 
          rmm.stay_place = N'บรรจุเสร็จ'
          AND rmm.dest = N'บรรจุเสร็จ'
          AND h.sc_pack_date IS NOT NULL 

      GROUP BY
          rmf.rmfp_id,
          rm.mat,
          rm.mat_name,
          rmm.mapping_id,
          rmm.group_no,
          rmm.dest,
          rmm.stay_place,
          rmm.rm_status,
          rmm.tray_count,
          rmm.weight_RM,
          rmm.level_eu,
          rmm.tro_id,
          rmg.rm_type_id,

          rmm.cold_to_pack_time,
          rmg.cold_to_pack,
          rmm.prep_to_pack_time,
          rmg.prep_to_pack,
          rmm.rework_time,
          rmg.rework,

          h.cooked_date,
          h.rmit_date,
          h.come_cold_date,
          h.out_cold_date,
          h.come_cold_date_two,
          h.out_cold_date_two,
          h.come_cold_date_three,
          h.out_cold_date_three,
          h.sc_pack_date,
          h.qc_date,
          h.receiver,
          h.receiver_qc,

          l.line_name,
          p.doc_no,
          rmm.rmm_line_name,
          q.qc_id,
          rmm.detail,
          q.color,
          q.odor,
          q.texture

      ORDER BY
          rmm.group_no ASC,           --  เรียงตาม group_no
          h.sc_pack_date ASC          --  แล้วเรียงตามเวลา pack
    `);

      const data = result.recordset.map(row => {
        if (row.cooked_date) {
          const d = new Date(row.cooked_date);
          row.CookedDateTime = d.toISOString().slice(0, 16).replace("T", " ");
        }
        delete row.cooked_date;
        return row;
      });

      res.json({
        success: true,
        data
      });

    } catch (err) {
      console.error("❌ fetchRM error:", err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });


  module.exports = router;
  return router;

};
