module.exports = (io) => {
  const express = require("express");
  const { connectToDatabase } = require("../database/db");
  const sql = require("mssql");
  const { Line } = require("recharts");
  const router = express.Router();
  // เชื่อมต่อฐานข้อมูล
  async function getPool() {
    return await connectToDatabase();
  }

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
          rmm.stay_place IN ('ออกห้องเย็น', 'จุดเตรียม', 'หม้ออบ') AND
          rmm.rm_status IN ('QcCheck', 'เหลือจากไลน์ผลิต','รอแก้ไข')
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
          UPDATE Trolley SET tro_status = '1' WHERE tro_id = '${item.tro_id}'
        `);
        }
      });

      // อัพเดต tro_id เป็น null สำหรับทุก mapping_id ที่พบ
      // โดยไม่มีเงื่อนไขเกี่ยวกับ dest
      for (const mappingId of mappingIds) {
        await pool.request().query(`
        UPDATE TrolleyRMMapping
        SET stay_place = 'บรรจุเสร็จสิ้น', dest = 'บรรจุเสร็จสิ้น', tro_id = NULL
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
                AND rmm.stay_place = 'ออกห้องเย็น'
                AND rmm.dest = 'บรรจุ'
                AND rmm.mix_code IS NOT NULL
                AND rmm.prod_mix IS NOT NULL
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
                  CONCAT(q.WorkAreaCode, \'-\', mwa.WorkAreaName) AS WorkAreaCode,
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
             JOIN 
                  WorkAreas mwa ON q.WorkAreaCode = mwa.WorkAreaCode
             LEFT JOIN
                  Batch b ON b.batch_id = rmm.batch_id
              WHERE 
                  rmm.dest IN ('บรรจุ','ไปบรรจุ','รถเข็นรอจัดส่ง')
                  AND rmf.rm_group_id = rmg.rm_group_id
                  AND rmm.tro_id = @tro_id 
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
                CONCAT(q.WorkAreaCode, \'-\', mwa.WorkAreaName) AS WorkAreaCode,
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
                  WorkAreas mwa ON q.WorkAreaCode = mwa.WorkAreaCode
              JOIN 
                RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
              JOIN
                RawMat rm ON prm.mat = rm.mat
              WHERE 
                  rmm.dest IN ('บรรจุ','ไปบรรจุ','รถเข็นรอจัดส่ง')
                  AND rmf.rm_group_id = rmg.rm_group_id
                  AND rmm.tro_id = @tro_id 
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

  router.post("/pack/input/Trolley", async (req, res) => {
    const { tro_id } = req.body;
    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Get all records for this trolley
      const data = await transaction.request()
        .input("tro_id", sql.VarChar(4), tro_id)
        .query(`
        SELECT * FROM TrolleyRMMapping
        WHERE tro_id = @tro_id
      `);

      if (data.recordset.length > 0) {

        // Update any remaining records in TrolleyRMMapping to clear the trolley
        await transaction.request()
          .input("tro_id", sql.VarChar(4), tro_id)
          .query(`
          UPDATE TrolleyRMMapping
          SET stay_place = 'บรรจุรับเข้า', dest = 'บรรจุ', tro_id = NULL
          WHERE tro_id = @tro_id
        `);
        // await transaction.request()
        //   .input("tro_id", sql.NVarChar, tro_id)
        //   .query(`
        //     UPDATE History 
        //     SET tro_id = NULL
        //     WHERE tro_id = @tro_id
        // `);
      }

      // Update Trolley status to '1'
      await transaction.request()
        .input("tro_id", sql.VarChar(4), tro_id)
        .query(`
        UPDATE Trolley
        SET tro_status = '1'
        WHERE tro_id = @tro_id
      `);

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

      // ดึงข้อมูลที่อยู่ใน Trolley นี้ทั้งหมด
      const data = await transaction.request()
        .input("tro_id", sql.VarChar(4), tro_id)
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
            const old = await transaction.request()
              .input("mapping_id", sql.Int, from_mapping_id)
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
                  created_at,
                  updated_at,
                  rmm_line_name,
                  mix_time
                FROM TrolleyRMMapping
                WHERE mapping_id = @mapping_id
              `);

            if (old.recordset.length > 0) {
              const updatedWeight = old.recordset[0].weight_RM + weight_RM;

              // อัปเดตน้ำหนักกลับไปที่ต้นทาง
              await transaction.request()
                .input("mapping_id", sql.Int, from_mapping_id)
                .input("weight_RM", sql.Float, updatedWeight)
                .query(`
                UPDATE TrolleyRMMapping 
                SET weight_RM = @weight_RM
                WHERE mapping_id = @mapping_id
              `);
            }

            if (old.recordset[0].dest === 'บรรจุเสร็จสิ้น' || old.recordset[0].stay_place === 'บรรจุเสร็จสิ้น') {
              const oldRecord = old.recordset[0];
              const currentDate = new Date();

              // ดึงข้อมูลจาก History เดิม
              const selectHis = await transaction.request()
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

              //เพิ่มข้อมูลใหม่เข้าไปใน TrolleyRMMapping
              const request = transaction.request();

              // ตรวจสอบและกำหนดค่าสำหรับแต่ละ parameter
              request.input("tro_id", sql.VarChar(4), oldRecord.tro_id || null);
              request.input("rmfp_id", sql.Int, oldRecord.rmfp_id || null);
              request.input("batch_id", sql.Int, oldRecord.batch_id || null);
              request.input("tro_production_id", sql.Int, oldRecord.tro_production_id || null);
              request.input("process_id", sql.Int, oldRecord.process_id || null);
              request.input("qc_id", sql.Int, oldRecord.qc_id || null);
              request.input("weight_in_trolley", sql.Float, oldRecord.weight_in_trolley || null);
              request.input("tray_count", sql.Int, oldRecord.tray_count || null);
              request.input("weight_per_tray", sql.Float, oldRecord.weight_per_tray || null);
              request.input("weight_RM", sql.Float, weight_RM || null);
              request.input("level_eu", sql.VarChar(5), oldRecord.level_eu || '');
              request.input("prep_to_cold_time", sql.Float, oldRecord.prep_to_cold_time || null);
              request.input("cold_time", sql.Float, oldRecord.cold_time || null);
              request.input("prep_to_pack_time", sql.Float, oldRecord.prep_to_pack_time || null);
              request.input("cold_to_pack_time", sql.Float, oldRecord.cold_to_pack_time || null);
              request.input("rework_time", sql.Float, oldRecord.rework_time || null);
              request.input("rm_status", sql.VarChar(25), oldRecord.rm_status || null);
              request.input("rm_cold_status", sql.VarChar(25), oldRecord.rm_cold_status || null);
              request.input("stay_place", sql.VarChar(25), 'บรรจุรับเข้า');
              request.input("dest", sql.VarChar(25), 'บรรจุ');
              request.input("mix_code", sql.Int, oldRecord.mix_code || null);
              request.input("prod_mix", sql.Int, oldRecord.prod_mix || null);
              request.input("allocation_date", sql.DateTime, currentDate);
              request.input("removal_date", sql.DateTime, oldRecord.removal_date || null);
              request.input("status", sql.VarChar(25), oldRecord.status || null);
              request.input("production_batch", sql.VarChar(25), oldRecord.production_batch || null);
              request.input("created_by", sql.VarChar(50), oldRecord.created_by || null);
              request.input("created_at", sql.DateTime, currentDate);
              request.input("updated_at", sql.DateTime, currentDate);
              request.input("rmm_line_name", sql.VarChar(20), oldRecord.rmm_line_name || null);
              request.input("mix_time", sql.Float, oldRecord.mix_time || null);
              request.input("from_mapping_id", sql.Int, from_mapping_id || null);

              const result = await request.query(`
                INSERT INTO TrolleyRMMapping (
                  tro_id, rmfp_id, batch_id, tro_production_id, process_id,
                  qc_id, weight_in_trolley, tray_count, weight_per_tray, weight_RM,
                  level_eu, prep_to_cold_time, cold_time, prep_to_pack_time,
                  cold_to_pack_time, rework_time, rm_status, rm_cold_status,
                  stay_place, dest, mix_code, prod_mix, allocation_date,
                  removal_date, status, production_batch, created_by, created_at,
                  updated_at, rmm_line_name, mix_time, from_mapping_id
                )
                OUTPUT INSERTED.mapping_id
                VALUES (
                  @tro_id, @rmfp_id, @batch_id, @tro_production_id, @process_id,
                  @qc_id, @weight_in_trolley, @tray_count, @weight_per_tray, @weight_RM,
                  @level_eu, @prep_to_cold_time, @cold_time, @prep_to_pack_time,
                  @cold_to_pack_time, @rework_time, @rm_status, @rm_cold_status,
                  @stay_place, @dest, @mix_code, @prod_mix, @allocation_date,
                  @removal_date, @status, @production_batch, @created_by, @created_at,
                  @updated_at, @rmm_line_name, @mix_time, @from_mapping_id
                )
              `);

              const newMappingId = result.recordset[0].mapping_id;

              // เพิ่มข้อมูลใหม่ใน History
              const insertHis = await transaction.request()
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
            }

          }
        }
        await transaction.request()
          .input("tro_id", sql.VarChar(4), tro_id)
          .query(`
          DELETE FROM TrolleyRMMapping
          WHERE tro_id = @tro_id
        `);
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
          ${lineFilter}
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
       SET stay_place = 'บรรจุเสร็จสิ้น', dest = 'บรรจุเสร็จสิ้น'
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
        return res.status(400).json({ success: false, error: "Missing required fields or invalid mapping_id" });
      }

      await transaction.begin();

      // ตรวจสอบสถานะของ rework_time และ cold_time เพื่อกำหนดตัวแปรที่จะอัปเดต delay_time
      // const checkResult = await transaction.request()
      //   .input("mapping_id", sql.Int, mapping_id)
      //   .query(`
      //   SELECT rework_time, cold_time 
      //   FROM TrolleyRMMapping 
      //   WHERE mapping_id = @mapping_id
      // `);

      // if (checkResult.recordset.length > 0) {
      //   const { rework_time, cold_time } = checkResult.recordset[0];

      //   // ทำการอัปเดตตามเงื่อนไข
      //   if (rework_time !== null) {
      //     // กรณี rework_time ไม่เท่ากับ null
      //     await transaction.request()
      //       .input("mapping_id", sql.Int, mapping_id)
      //       .input("delay_time", sql.Float, delay_time)
      //       .query(`
      //       UPDATE TrolleyRMMapping
      //       SET rework_time = @delay_time
      //       WHERE mapping_id = @mapping_id
      //     `);
      //   } else if (cold_time !== null) {
      //     // กรณี rework_time เป็น null และ cold_time ไม่เป็น null
      //     await transaction.request()
      //       .input("mapping_id", sql.Int, mapping_id)
      //       .input("delay_time", sql.Float, delay_time)
      //       .query(`
      //       UPDATE TrolleyRMMapping
      //       SET cold_to_pack_time = @delay_time
      //       WHERE mapping_id = @mapping_id
      //     `);
      //   } else {
      //     // กรณี rework_time เป็น null และ cold_time เป็น null
      //     await transaction.request()
      //       .input("mapping_id", sql.Int, mapping_id)
      //       .input("delay_time", sql.Float, delay_time)
      //       .query(`
      //       UPDATE TrolleyRMMapping
      //       SET prep_to_pack_time = @delay_time
      //       WHERE mapping_id = @mapping_id
      //     `);
      //   }
      // }

      // Update RMInTrolley
      await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
       UPDATE TrolleyRMMapping
       SET stay_place = 'บรรจุเสร็จสิ้น', dest = 'บรรจุเสร็จสิ้น'
       WHERE mapping_id = @mapping_id
    `);

      // await transaction.request()
      //   .input("mapping_id", sql.Int, mapping_id)
      //   .query(`
      //   UPDATE History
      //         SET sc_pack_date = GETDATE()
      //   WHERE mapping_id = @mapping_id
      // `);

      // const result = await transaction.request()
      //   .input("mapping_id", sql.Int, mapping_id)
      //   .query("SELECT hist_id_rmfp FROM TrolleyRMMapping AS rmm JOIN RMForProd AS rmfp ON rmfp.rmfp_id = rmm.rmfp_id WHERE mapping_id = @mapping_id");

      // if (result.recordset.length === 0) {
      //   console.warn("ไม่พบข้อมูล hist_id_rmfp สำหรับ mapping_id:", mapping_id);
      // } else {
      //   for (const row of result.recordset) {
      //     try {
      //       const hist_id_rmfp = row.hist_id_rmfp;

      //       await transaction.request()
      //         .input("hist_id_rmfp", sql.Int, hist_id_rmfp)
      //         .query(`
      //         UPDATE History
      //         SET sc_pack_date = GETDATE()
      //         WHERE hist_id = @hist_id_rmfp
      //       `);

      //     } catch (updateError) {
      //       console.error("เกิดข้อผิดพลาดในการอัปเดต History:", updateError);
      //     }
      //   }
      // }

      // Commit transaction
      await transaction.commit();
      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error:", err);
      res.status(500).json({ success: false, error: err.message });
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
      await request1
        .input("rm_tro_id", sql.Int, rm_tro_id)
        .input("tro_id", sql.VarChar(10), license_plate)
        .input("dest", sql.NVarChar(50), Dest)
        .query(`
        UPDATE RMInTrolley 
        SET tro_id = @tro_id, dest = @dest, rm_status = 'รอแก้ไข', stay_place = 'บรรจุ'
        WHERE rm_tro_id = @rm_tro_id
      `);

      // Update Trolley
      await transaction.request()
        .input("tro_id", sql.VarChar(10), license_plate)
        .query(`
        UPDATE Trolley
        SET tro_status = '0'
        WHERE tro_id = @tro_id
      `);

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
        await request4
          .input("hist_id_rmit", sql.Int, hist_id_rmit)
          .input("receiver_pack_edit", sql.NVarChar(100), recorder)
          .input("remark_rework", sql.NVarChar(255), remark)
          .query(`
          UPDATE History
          SET receiver_pack_edit = @receiver_pack_edit, remark_rework = @remark_rework
          WHERE hist_id = @hist_id_rmit
        `);
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
      UPDATE Trolley SET tro_status = 0 WHERE tro_id = @tro_id
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

  router.put("/pack/matmanage/Add/rm/TrolleyMapping", async (req, res) => {
    const { tro_id, rmfpID, mapping_id, weight_per_tro, ntray, batch_after } = req.body;
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
        throw new Error("น้ำหนักที่ย้ายมากกว่าน้ำหนักที่มีอยู่");
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
                @receiver_oven_edit, @receiver_pack_edit, @remark_rework, @location, NULL, @rmm_line_name,GETDATE(),@weight_RM,@tray_count)
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
        .input("created_by", sql.VarChar(50), req.user?.username || "system")
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
        .query(`
        INSERT INTO TrolleyRMMapping 
        (tro_id, rmfp_id, batch_id, weight_RM, tray_count, rm_status, allocation_date, status, dest, stay_place, created_by, 
         tro_production_id, process_id, qc_id, cold_time, level_eu, prep_to_cold_time, rm_cold_status, rmm_line_name,
         mix_code, prod_mix, production_batch, from_mapping_id,created_at)
        VALUES 
        (@tro_id, @rmfp_id, @batch_id, @weight_RM, @tray_count, @rm_status, @allocation_date, @status, @dest, @stay_place, @created_by, 
         @tro_production_id, @process_id, @qc_id, @cold_time, @level_eu, @prep_to_cold_time, @rm_cold_status, @rmm_line_name,
         @mix_code, @prod_mix, @production_batch, @from_mapping_id,GETDATE())
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

  // Route for recording delay times for mixed raw materials
  router.post("/pack/mixed/delay-time", async (req, res) => {
    const { mixed_code, mapping_id } = req.body;

    console.log("mixed_code:", mixed_code);
    console.log("mapping_id:", mapping_id);

    if (!mixed_code) {
      return res.status(400).json({ message: "mixed_code จำเป็นต้องระบุ" });
    }

    let transaction;

    try {
      const pool = await connectToDatabase();

      // ค้นหาข้อมูลวัตถุดิบจาก mixed_code
      const queryRawMaterials = `
      SELECT 
        rmm.mapping_id,
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
        CONVERT(VARCHAR, htr.qc_date, 120) AS qc_date
      FROM RM_Mixed AS rm
      JOIN TrolleyRMMapping AS rmm ON rmm.mapping_id = rm.mapping_id
      JOIN RMForProd AS rmp ON rmm.rmfp_id = rmp.rmfp_id
      JOIN RawMatGroup AS rmg ON rmp.rm_group_id = rmg.rm_group_id
      JOIN History AS htr ON htr.mapping_id = rm.mapping_id
      WHERE rm.mixed_code = @mixed_code
    `;

      const result = await pool.request()
        .input('mixed_code', sql.Int, mixed_code)
        .input('mapping_id', sql.Int, mapping_id)
        .query(queryRawMaterials);

      // ดึงข้อมูลเฉพาะของ mixed ที่มี mapping_id ตรงกับที่ส่งมา
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
        .input('mixed_code', sql.Int, mixed_code)
        .input('mapping_id', sql.Int, mapping_id)
        .query(queryMixed);

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "ไม่พบข้อมูลวัตถุดิบจาก mixed_code ที่ระบุ" });
      }

      transaction = new sql.Transaction(pool);
      await transaction.begin();

      console.log("result:", result.recordset);
      console.log("resultMix:", resultMix.recordset);

      const updatedItems = [];

      // คำนวณและบันทึก Delay Time สำหรับแต่ละวัตถุดิบ
      for (let item of result.recordset) {
        console.log("Processing item:", item);

        // เพิ่มข้อมูล mix_time ถ้ามี mapping_id ตรงกับที่ส่งมา
        let remaining_mix_time = null;
        let mixed_date = null;

        if (mapping_id && item.mapping_id === parseInt(mapping_id) && resultMix.recordset.length > 0) {
          remaining_mix_time = resultMix.recordset[0].remaining_mix_time;
          mixed_date = resultMix.recordset[0].mixed_date;
        }

        // คำนวณ delay time
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

        // บันทึกค่า Delay Time ลงในฐานข้อมูล
        await transaction.request()
          .input('delayTime', sql.Float, parseFloat(delayTimeResult.formattedDelayTime))
          .input('mapping_id', sql.Int, item.mapping_id)
          .query(`
          UPDATE TrolleyRMMapping
          SET stay_place = 'บรรจุเสร็จสิ้น', dest = 'บรรจุเสร็จสิ้น',
          ${delayTimeResult.fieldToUpdate} = @delayTime
          WHERE mapping_id = @mapping_id
        `);

        await transaction.request()
          .input("mapping_id", sql.Int, item.mapping_id)
          .query(`
        UPDATE History
        SET sc_pack_date = GETDATE()
        WHERE mapping_id = @mapping_id
      `);

        // เก็บข้อมูลที่อัปเดตเพื่อส่งกลับ
        updatedItems.push({
          mapping_id: item.mapping_id,
          batch_id: item.batch_id,
          rmfp_id: item.rmfp_id,
          fieldUpdated: delayTimeResult.fieldToUpdate,
          delayTime: delayTimeResult.formattedDelayTime
        });
      }

      if (mapping_id) {

        await transaction.request()
          .input("mapping_id", sql.Int, mapping_id)
          .query(`
       UPDATE TrolleyRMMapping
       SET stay_place = 'บรรจุเสร็จสิ้น', dest = 'บรรจุเสร็จสิ้น'
       WHERE mapping_id = @mapping_id
    `);

        await transaction.request()
          .input("mapping_id", sql.Int, mapping_id)
          .query(`
          UPDATE History
          SET sc_pack_date = GETDATE()
          WHERE mapping_id = @mapping_id
        `);
      }

      // ถ้ามีการอัปเดตอย่างน้อย 1 รายการ
      if (updatedItems.length > 0) {
        await transaction.commit();
        return res.status(200).json({
          message: "บันทึกค่า Delay Time สำเร็จ",
          updatedItems: updatedItems
        });
      } else {
        await transaction.rollback();
        return res.status(404).json({ message: "ไม่สามารถคำนวณหรือบันทึก Delay Time ได้" });
      }

    } catch (error) {
      console.error("SQL error:", error);
      if (transaction) await transaction.rollback();
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล", error: error.message });
    } finally {
      sql.close();
    }
  });




  router.put("/pack/mixed/trolley", async (req, res) => {
    const { mapping_id, weights, tro_production_id } = req.body;

    if (!mapping_id || !Array.isArray(weights) || weights.length === 0 || !tro_production_id) {
      return res.status(400).json({ message: "mapping_id, weights และ tro_production_id จำเป็นต้องระบุ" });
    }

    let transaction;

    try {
      const pool = await connectToDatabase();

      const query = `
        SELECT  
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
        WHERE rmm.mapping_id IN (${mapping_id.map(id => `'${id}'`).join(',')})
        `;

      const result = await pool.request().query(query);

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "ไม่พบวัตถุดิบในรถเข็นที่เลือก" });
      }

      const mixCode = Date.now() % 2147483647;
      const line_name = result.recordset[0].rmm_line_name;
      let total_weight = 0;
      let total_trays = 0;

      transaction = new sql.Transaction(pool);
      await transaction.begin();

      for (let i = 0; i < result.recordset.length; i++) {
        const record = result.recordset[i];
        const weightToMove = weights[i];

        // คำนวณน้ำหนักต่อถาด
        const weightPerTray = record.weight_RM / record.tray_count;

        // คำนวณจำนวนถาดที่ใช้
        const traysUsed = weightToMove / weightPerTray;
        const roundedTraysUsed = Math.round(traysUsed * 100) / 100;

        // รวมค่าน้ำหนักและจำนวนถาด
        total_weight += weightToMove;
        total_trays += roundedTraysUsed;

        // ลดน้ำหนักใน RMInTrolley ของรถเข็นที่ถูกย้าย
        const remainingWeight = record.weight_RM - weightToMove;

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
                allocation_date, removal_date, status, production_batch, created_by, rmm_line_name,created_at)
                OUTPUT INSERTED.mapping_id
                VALUES
                (@tro_id${i}, @rmfp_id${i}, @batch_id${i}, @tro_production_id${i}, @process_id${i}, @qc_id${i},
                @tray_count${i}, @weight_RM${i}, @level_eu${i},
                @prep_to_cold_time${i}, @cold_time${i}, @prep_to_pack_time${i}, @cold_to_pack_time${i}, @mix_time${i}, @rework_time${i},
                @rm_status${i}, @rm_cold_status${i}, @stay_place${i}, @dest${i},
                @allocation_date${i}, @removal_date${i}, @status${i}, @production_batch${i}, @created_by${i}, @rmm_line_name${i},GETDATE())
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
                receiver_pack_edit, remark_rework,remark_rework_cold, location,qccheck_cold,edit_rework,created_at)
                VALUES
                (@mapping_id${i}, @withdraw_date${i}, @cooked_date${i}, @rmit_date${i}, @qc_date${i},
                @come_cold_date${i}, @out_cold_date${i}, @come_cold_date_two${i}, @out_cold_date_two${i},
                @come_cold_date_three${i}, @out_cold_date_three${i}, @sc_pack_date${i}, @rework_date${i},
                @receiver${i}, @receiver_prep_two${i}, @receiver_qc${i}, @receiver_out_cold${i},
                @receiver_out_cold_two${i}, @receiver_out_cold_three${i}, @receiver_oven_edit${i},
                @receiver_pack_edit${i}, @remark_rework${i},@remark_rework_cold${i}, @location${i},@qccheck_cold${i},@edit_rework${i},GETDATE())
                `);

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

        // อัปเดตรายการวัตถุดิบในรถเข็นเดิม
        if (remainingWeight > 0) {
          const remainingTrays = record.tray_count - roundedTraysUsed;
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
        } else if (remainingWeight === 0) {  // เปลี่ยนจาก <= 0 เป็น === 0
          await transaction.request()
            .input('mapping_id', sql.Int, record.mapping_id)
            .query(`
                    UPDATE TrolleyRMMapping 
                    SET stay_place = 'บรรจุเสร็จสิ้น', 
                        dest = 'บรรจุเสร็จสิ้น', 
                        rm_status = NULL,
                        tray_count = 0
                    WHERE mapping_id = @mapping_id
                    `);
        } else {
          // กรณีที่น้ำหนักติดลบ (ซึ่งไม่ควรเกิดขึ้น)
          await transaction.rollback();
          return res.status(400).json({ message: "น้ำหนักที่ต้องการย้ายมากกว่าน้ำหนักที่มีอยู่ในรถเข็น" });
        }
      }

      // สร้างรายการวัตถุดิบสำหรับการผลิตใหม่
      const insertRMRequest = transaction.request();
      const dataRM = await insertRMRequest
        .input('prod_rm_id', sql.Int, tro_production_id)
        .input('weight', sql.Float, total_weight)
        .query(`      
            INSERT INTO RMForProd (prod_rm_id, weight) 
            OUTPUT INSERTED.rmfp_id
            VALUES (@prod_rm_id, @weight)
            `);
      const new_rmfp_id = dataRM.recordset[0].rmfp_id;

      // สร้าง TrolleyRMMapping ใหม่สำหรับรถเข็นที่ผสมแล้ว
      const insertTrolleyRequest = transaction.request();
      const insert_result = await insertTrolleyRequest
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
            (rmfp_id, prod_mix, mix_code, weight_RM, tray_count, stay_place, dest, mix_time, rmm_line_name,created_at)
            OUTPUT INSERTED.mapping_id
            VALUES
            (@rmfp_id, @prod_mix, @mix_code, @total_weight, @total_trays, @stay_place, @dest, @mix_time, @rmm_line_name,GETDATE())
            `);

      const newMixedMappingId = insert_result.recordset[0].mapping_id;

      // สร้างประวัติใหม่สำหรับรถเข็นที่ผสมแล้ว
      const insertHistoryRequest = transaction.request();
      await insertHistoryRequest
        .input('mapping_id', sql.Int, newMixedMappingId)
        .input('total_weight', sql.Float, total_weight)
        .input('total_trays', sql.Float, total_trays)
        .query(`
            INSERT INTO History
            (mapping_id, mixed_date,weight_RM,tray_count,created_at)
            VALUES
            (@mapping_id, GETDATE(),@total_weight,@total_trays,GETDATE())
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
        ba.batch_after,
        rmm.weight_RM,
        rmm.tray_count,
        rg.rm_group_name,
        prm.prod_id AS code,
        rm.mat,
        rm.mat_name,
        prod.doc_no
      FROM TrolleyRMMapping rmm
      LEFT JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
      LEFT JOIN RawMatGroup rg ON rmf.rm_group_id = rg.rm_group_id
      LEFT JOIN ProdRawMat prm ON rmm.tro_production_id = prm.prod_rm_id
      LEFT JOIN Batch ba ON rmm.batch_id = ba.batch_id
      LEFT JOIN Production prod ON prm.prod_id = prod.prod_id
      JOIN Line li ON rmm.rmm_line_name = li.line_name
      JOIN RawMat rm ON prm.mat = rm.mat
      WHERE prm.prod_id = @code
        AND rmm.dest IN ('บรรจุ','ไปบรรจุ')
        AND rmm.stay_place = 'บรรจุรับเข้า'
        AND rmm.mix_code IS NULL
        AND li.line_id = @line_id
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

  router.get("/pack/mixed/trolley/head/:line_id", async (req, res) => {
    try {
      const { line_id } = req.params;
      const pool = await connectToDatabase();

      const query = `
        SELECT
          rmm.mapping_id,
          rmf.rmfp_id,
          b.batch_after,
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
          CONCAT(q.WorkAreaCode, \'-\', mwa.WorkAreaName) AS WorkAreaCode,
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
        LEFT JOIN
          Batch b ON b.batch_id = rmx.batch_id
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
            JOIN Batch b ON b.batch_id = rmx.batch_id
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
        ba.batch_after,
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
			  CONCAT(q.WorkAreaCode, \'-\', mwa.WorkAreaName) AS WorkAreaCode,
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
        LEFT JOIN 
          Batch AS ba ON ba.batch_id = rmit.batch_id
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
          b.batch_after,
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
          CONCAT(q.WorkAreaCode, \'-\', mwa.WorkAreaName) AS WorkAreaCode,
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
        LEFT JOIN
          Batch b ON b.batch_id = rmx.batch_id
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


  router.put("/pack/rework/trolley", async (req, res) => {
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
          dest = @dest
        WHERE 
          tro_id = @tro_id
      `;

      const result = await pool.request()
        .input("dest", sql.NVarChar, dest)
        .input("tro_id", sql.NVarChar, tro_id)
        .query(updateTrolleyQuery);

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
    try {
      const { mapping_id, ntray, tro_id, weight_per_tro } = req.body;

      if (!mapping_id || !ntray || !tro_id || !weight_per_tro) {
        return res.status(400).json({ message: "Missing required fields in request body" });
      }

      const pool = await connectToDatabase();

      // ดึงข้อมูลเดิม
      const result = await pool.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`SELECT * FROM TrolleyRMMapping WHERE mapping_id = @mapping_id`);

      const oldData = result.recordset[0];
      if (!oldData) {
        return res.status(404).json({ message: "ไม่พบข้อมูล mapping เดิม" });
      }

      const pull_history = await pool.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
          SELECT
            mixed_date,weight_RM,tray_count
          FROM
            History
          WHERE mapping_id = @mapping_id
        `);

      const oldHis = pull_history.recordset[0];
      if (!oldHis) {
        return res.status(404).json({ message: "ไม่พบข้อมูล mapping เดิม" });
      }

      const moveWeight = parseFloat(weight_per_tro);
      const trayCount = parseInt(ntray);
      const oldWeight = parseFloat(oldData.weight_RM);

      // ตรวจสอบว่าน้ำหนักที่จะย้ายมากกว่าที่มีอยู่หรือไม่
      if (moveWeight > oldWeight) {
        return res.status(400).json({ message: "น้ำหนักที่ย้ายมากกว่าน้ำหนักที่มีอยู่" });
      }

      const remainingWeight = oldWeight - moveWeight;

      // ✅ อัปเดตน้ำหนักรายการเดิม
      await pool.request()
        .input("mapping_id", sql.Int, mapping_id)
        .input("weight_RM", sql.Float, remainingWeight)
        .input("stay_place", sql.NVarChar, remainingWeight > 0 ? "บรรจุรับเข้า" : "บรรจุเสร็จสิ้น")
        .input("dest", sql.NVarChar, remainingWeight > 0 ? "บรรจุ" : "บรรจุเสร็จสิ้น")
        .query(`
          UPDATE TrolleyRMMapping 
          SET weight_RM = @weight_RM, stay_place = @stay_place, dest = @dest
          WHERE mapping_id = @mapping_id
        `);

      // ✅ เพิ่มรายการใหม่ สำหรับรถเข็นที่ย้ายไป และดึง mapping_id ของรายการใหม่
      const newMappingResult = await pool.request()
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
        .query(`
          INSERT INTO TrolleyRMMapping (tro_id, rmfp_id, weight_RM, tray_count, dest, stay_place, mix_code, prod_mix, rmm_line_name, mix_time, from_mapping_id,created_at)
          OUTPUT INSERTED.mapping_id
          VALUES (@tro_id, @rmfp_id, @weight_RM, @tray_count, @dest, @stay_place, @mix_code, @prod_mix, @rmm_line_name, @mix_time, @from_mapping_id,GETDATE())
        `);

      const newMappingId = newMappingResult.recordset[0].mapping_id;

      // ✅ เพิ่มข้อมูลลงใน History โดยใช้ mapping_id ของรายการใหม่
      await pool.request()
        .input("mapping_id", sql.Int, newMappingId)
        .input("mixed_date", sql.DateTime, oldHis.mixed_date)
        .input("weight_RM", sql.Float, moveWeight) // ใช้ moveWeight แทน oldHis.weight_RM
        .input("tray_count", sql.Int, trayCount) // ใช้ trayCount แทน oldHis.tray_count
        .query(`
          INSERT INTO History (mapping_id, mixed_date, weight_RM, tray_count,created_at)
          VALUES (@mapping_id, @mixed_date, @weight_RM, @tray_count,GETDATE())
        `);

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
          SET tro_status = 1
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


  module.exports = router;
  return router;

};
