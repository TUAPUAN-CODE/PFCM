module.exports = (io) => {
  const express = require("express");
  const sql = require("mssql");
  const { connectToDatabase } = require("../database/db");
  const router = express.Router();
  const ss = require('simple-statistics');



  /**
   * @swagger
   * /api/oven/toCold/updateProduction:
   *    put:
   *      summary: แก้ไขข้อมูลแผนการผลิตในหน้าเลือกรถเข็นไปห้องเย็น
   *      description: แก้ไขรหัสวัตถุดิบเพื่อการผลิตในตาราง RMForProd
   *      tags: 
   *        - Oven
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              required:
   *                - rmfpID
   *                - mat
   *                - ProdID
   *              properties:
   *                rmfpID:
   *                  type: integer
   *                  example: 000
   *                  description: รหัสวัตถุดิบเพื่อการผลิต
   *                mat:
   *                  type: string
   *                  example: abc
   *                  description: รหัสวัตถุดิบ
   *                ProdID:
   *                  type: integer
   *                  example: 000
   *                  description: รหัสแผนการผลิตที่ต้องการอัปเดต
   *      responses:
   *        200:
   *          description: อัปเดตข้อมูลสำเร็จ
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  success:
   *                    type: boolean
   *                    example: true
   *                  message:
   *                    type: string
   *                    example: "แก้ไขแผนการผลิตเสร็จสิ้น"
   *        400:
   *          description: อัปเดตข้อมูลไม่สำเร็จ
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  success:
   *                    type: boolean
   *                    example: false
   *                  message:
   *                    type: string
   *                    example: "ไม่มีแผนการผลิตที่เลือกสำหรับวัตถุดิบนี้"
   *        500:
   *          description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  success:
   *                    type: boolean
   *                    example: false
   *                  error:
   *                    type: string
   *                    example: "Internal server error"
   */

  router.get("/checkEditHistoryOnTrolley", async (req, res) => {
    const { mapping_id } = req.query;

    if (!mapping_id) {
      return res.status(400).json({ success: false, error: "Missing mapping_id parameter" });
    }

    try {
      const pool = await connectToDatabase();

      const result = await pool.request()
        .input("mapping_id", mapping_id)
        .query(`
        SELECT h.three_prod
        FROM TrolleyRMMapping rmm
        JOIN History h ON rmm.mapping_id = h.mapping_id
        WHERE rmm.mapping_id = @mapping_id
      `);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: "ไม่พบข้อมูลประวัติการแก้ไข"
        });
      }

      // ตรวจสอบว่ามีข้อมูลใน three_prod หรือไม่
      const editLimitReached = result.recordset[0].three_prod !== null;

      return res.status(200).json({
        success: true,
        editLimitReached: editLimitReached
      });

    } catch (error) {
      console.error("Error checking edit history:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get("/get/DelayTime/Tracking", async (req, res) => {
    const startTime = new Date();
    let pool;

    try {
      // 1. Get date range parameters from query
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;

      console.log("Received startDate:", startDate, "endDate:", endDate);

      // Validate date format if provided
      if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return res.status(400).json({
          success: false,
          error: "Invalid startDate format. Use YYYY-MM-DD"
        });
      }

      if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return res.status(400).json({
          success: false,
          error: "Invalid endDate format. Use YYYY-MM-DD"
        });
      }

      // 2. Connect to database
      pool = await connectToDatabase();

      // 3. Build query with optional date filtering
      let query = `
        SELECT 
            rmm.mapping_id,
            rm.mat,
            rm.mat_name,
            rmm.rmm_line_name,
            rmg.rm_group_name,
            rmt.rm_type_name,
            rmg.prep_to_cold,
            rmm.prep_to_cold_time,
            ROUND(
            (FLOOR(ABS(rmg.prep_to_cold)) * 60 + ROUND((ABS(rmg.prep_to_cold) - FLOOR(ABS(rmg.prep_to_cold))) * 100, 0)) -
            (CASE 
                WHEN rmm.prep_to_cold_time < 0 THEN
                    -1 * (FLOOR(ABS(rmm.prep_to_cold_time)) * 60 + ROUND((ABS(rmm.prep_to_cold_time) - FLOOR(ABS(rmm.prep_to_cold_time))) * 100, 0))
                ELSE
                    (FLOOR(rmm.prep_to_cold_time) * 60 + ROUND((rmm.prep_to_cold_time - FLOOR(rmm.prep_to_cold_time)) * 100, 0))
            END), 0
        ) AS ptc_time_minutes,
        rmg.cold,
        ROUND(
            (FLOOR(ABS(rmg.cold)) * 60 + ROUND((ABS(rmg.cold) - FLOOR(ABS(rmg.cold))) * 100, 0)) -
            (CASE 
                WHEN rmm.cold_time < 0 THEN
                    -1 * (FLOOR(ABS(rmm.cold_time)) * 60 + ROUND((ABS(rmm.cold_time) - FLOOR(ABS(rmm.cold_time))) * 100, 0))
                ELSE
                    (FLOOR(rmm.cold_time) * 60 + ROUND((rmm.cold_time - FLOOR(rmm.cold_time)) * 100, 0))
            END), 0
        ) AS cold_time_minutes,
        rmg.cold_to_pack,
        rmm.cold_to_pack_time,
        ROUND(
            (FLOOR(ABS(rmg.cold_to_pack)) * 60 + ROUND((ABS(rmg.cold_to_pack) - FLOOR(ABS(rmg.cold_to_pack))) * 100, 0)) -
            (CASE 
                WHEN rmm.cold_to_pack_time < 0 THEN
                    -1 * (FLOOR(ABS(rmm.cold_to_pack_time)) * 60 + ROUND((ABS(rmm.cold_to_pack_time) - FLOOR(ABS(rmm.cold_to_pack_time))) * 100, 0))
                ELSE
                    (FLOOR(rmm.cold_to_pack_time) * 60 + ROUND((rmm.cold_to_pack_time - FLOOR(rmm.cold_to_pack_time)) * 100, 0))
            END), 0
        ) AS ctp_time_minutes,
        rmg.prep_to_pack,
        ROUND(
            (FLOOR(ABS(rmg.prep_to_pack)) * 60 + ROUND((ABS(rmg.prep_to_pack) - FLOOR(ABS(rmg.prep_to_pack))) * 100, 0)) -
            (CASE 
                WHEN rmm.prep_to_pack_time < 0 THEN
                    -1 * (FLOOR(ABS(rmm.prep_to_pack_time)) * 60 + ROUND((ABS(rmm.prep_to_pack_time) - FLOOR(ABS(rmm.prep_to_pack_time))) * 100, 0))
                ELSE
                    (FLOOR(rmm.prep_to_pack_time) * 60 + ROUND((rmm.prep_to_pack_time - FLOOR(rmm.prep_to_pack_time)) * 100, 0))
            END), 0
        ) AS ptp_time_minutes,
        CONVERT(VARCHAR, htr.cooked_date, 120) AS cooked_date,
        CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
        CONVERT(VARCHAR, htr.qc_date, 120) AS qc_date,
        CONVERT(VARCHAR, htr.come_cold_date, 120) AS come_cold_date,
        CONVERT(VARCHAR, htr.out_cold_date, 120) AS out_cold_date,
        CONVERT(VARCHAR, htr.come_cold_date_two, 120) AS come_cold_date_two,
        CONVERT(VARCHAR, htr.out_cold_date_two, 120) AS out_cold_date_two,
        CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three,
        CONVERT(VARCHAR, htr.out_cold_date_three, 120) AS out_cold_date_three,
        CONVERT(VARCHAR, htr.rework_date, 120) AS rework_date,
        CONVERT(VARCHAR, htr.sc_pack_date, 120) AS sc_pack_date
        FROM 
            TrolleyRMMapping rmm
            JOIN History htr ON rmm.mapping_id = htr.mapping_id
            JOIN RMForProd rmfp ON rmm.rmfp_id = rmfp.rmfp_id
            JOIN ProdRawMat prm ON rmfp.prod_rm_id = prm.prod_rm_id
            JOIN RawMat rm ON prm.mat = rm.mat
            JOIN RawMatGroup rmg ON rmfp.rm_group_id = rmg.rm_group_id
            JOIN RawMatType rmt ON rmg.rm_type_id = rmt.rm_type_id
        WHERE rmm.dest = 'บรรจุเสร็จสิ้น' AND rmm.stay_place = 'บรรจุเสร็จสิ้น' AND (htr.sc_pack_date IS NOT NULL OR htr.sc_pack_date != '')
        `;

      // Add date filtering if dates are provided
      if (startDate && endDate) {
        query += ` AND CONVERT(DATE, htr.sc_pack_date) BETWEEN '${startDate}' AND '${endDate}'`;
      } else if (startDate) {
        query += ` AND CONVERT(DATE, htr.sc_pack_date) >= '${startDate}'`;
      } else if (endDate) {
        query += ` AND CONVERT(DATE, htr.sc_pack_date) <= '${endDate}'`;
      }

      const result = await pool.request().query(query);
      // 3. Validate query results
      if (!result?.recordset?.length) {
        return res.status(404).json({
          success: false,
          error: "No finished packing data found"
        });
      }

      // 4. Helper functions
      const formatDate = (dateString) => {
        if (!dateString) return null;
        return dateString;
      };

      const safeAverage = (arr) => {
        if (!arr || arr.length === 0) return 0;
        return ss.mean(arr);
      };

      const createDelayBins = (times, step = 0.5) => {
        if (!times || times.length === 0) return [];

        // Calculate maximum hour from the data, rounded up to nearest step
        const maxDataHour = Math.max(...times) / 60;
        const maxHour = Math.ceil(maxDataHour / step) * step;

        // Create bins configuration
        const binsConfig = [];
        for (let hour = step; hour <= maxHour; hour += step) {
          binsConfig.push(hour);
        }

        // Initialize bins
        const bins = new Map();
        binsConfig.forEach(hour => bins.set(hour, 0));

        // Distribute times into bins
        times.forEach(time => {
          const hours = time / 60;
          const bin = binsConfig.find(b => hours <= b) || binsConfig[binsConfig.length - 1];
          bins.set(bin, (bins.get(bin) || 0) + 1);
        });

        return Array.from(bins.entries()).map(([hour, count]) => [hour, Math.round(count)]);
      };

      // 5. Group data by rm_group_name
      const groupedData = new Map();
      result.recordset.forEach(row => {
        if (!groupedData.has(row.rm_group_name)) {
          groupedData.set(row.rm_group_name, []);
        }
        groupedData.get(row.rm_group_name).push({
          ...row,
          cooked_date: formatDate(row.cooked_date),
          rmit_date: formatDate(row.rmit_date),
          qc_date: formatDate(row.qc_date),
          come_cold_date: formatDate(row.come_cold_date),
          out_cold_date: formatDate(row.out_cold_date),
          come_cold_date_two: formatDate(row.come_cold_date_two),
          out_cold_date_two: formatDate(row.out_cold_date_two),
          come_cold_date_three: formatDate(row.come_cold_date_three),
          out_cold_date_three: formatDate(row.out_cold_date_three),
          rework_date: formatDate(row.rework_date),
          sc_pack_date: formatDate(row.sc_pack_date)
        });
      });

      // 6. Process each group
      const processedData = {};
      for (const [groupName, groupRows] of groupedData.entries()) {
        const firstRow = groupRows[0];

        // Extract times and filter valid numbers
        const ptcTimes = groupRows.map(row => row.ptc_time_minutes).filter(Number.isFinite);
        const coldTimes = groupRows.map(row => row.cold_time_minutes).filter(Number.isFinite);
        const ctpTimes = groupRows.map(row => row.ctp_time_minutes).filter(Number.isFinite);
        const ptpTimes = groupRows.map(row => row.ptp_time_minutes).filter(Number.isFinite);

        // Create delay bins
        const ptcBins = createDelayBins(ptcTimes);
        const coldBins = createDelayBins(coldTimes);
        const ctpBins = createDelayBins(ctpTimes);
        const ptpBins = createDelayBins(ptpTimes);

        // สร้าง Set ของชั่วโมงทั้งหมดจากทุก bins
        const allHours = new Set([
          ...ptcBins.map(b => b[0]),
          ...coldBins.map(b => b[0]),
          ...ctpBins.map(b => b[0]),
          ...ptpBins.map(b => b[0])
        ]);

        // แปลงเป็น array และเรียงลำดับ
        const sortedHours = Array.from(allHours).sort((a, b) => a - b);

        // สร้าง map สำหรับการค้นหาค่า
        const createLookupMap = (bins) => {
          const map = new Map();
          bins.forEach(([hour, count]) => map.set(hour, count));
          return map;
        };

        const ptcMap = createLookupMap(ptcBins);
        const coldMap = createLookupMap(coldBins);
        const ctpMap = createLookupMap(ctpBins);
        const ptpMap = createLookupMap(ptpBins);

        // เตรียมข้อมูลสำหรับ delayDistribution
        let delayDistributionData = [];
        if (sortedHours.length > 0) {
          delayDistributionData = sortedHours.map(hour => [
            hour,
            ptcMap.get(hour) || 0,
            coldMap.get(hour) || 0,
            ctpMap.get(hour) || 0,
            ptpMap.get(hour) || 0
          ]);
        } else {
          // กรณีไม่มีข้อมูลเลย
          delayDistributionData = [[0, 0, 0, 0, 0]];
        }

        // Prepare response structure
        processedData[groupName] = {
          metadata: {
            groupName: groupName,
            rmType: firstRow.rm_type_name,
            sampleSize: groupRows.length,
            generatedAt: new Date().toISOString()
          },
          summary: [
            {
              label: "N",
              values: [
                ptcTimes.length,
                coldTimes.length,
                ctpTimes.length,
                ptpTimes.length
              ]
            },
            {
              label: "Avg (hr)",
              values: [
                parseFloat((safeAverage(ptcTimes) / 60).toFixed(1)),
                parseFloat((safeAverage(coldTimes) / 60).toFixed(1)),
                parseFloat((safeAverage(ctpTimes) / 60).toFixed(1)),
                parseFloat((safeAverage(ptpTimes) / 60).toFixed(1))
              ]
            },
            {
              label: "Min (hr)",
              values: [
                ptcTimes.length ? parseFloat((Math.min(...ptcTimes) / 60).toFixed(1)) : 0,
                coldTimes.length ? parseFloat((Math.min(...coldTimes) / 60).toFixed(1)) : 0,
                ctpTimes.length ? parseFloat((Math.min(...ctpTimes) / 60).toFixed(1)) : 0,
                ptpTimes.length ? parseFloat((Math.min(...ptpTimes) / 60).toFixed(1)) : 0
              ]
            },
            {
              label: "Max (hr)",
              values: [
                ptcTimes.length ? parseFloat((Math.max(...ptcTimes) / 60).toFixed(1)) : 0,
                coldTimes.length ? parseFloat((Math.max(...coldTimes) / 60).toFixed(1)) : 0,
                ctpTimes.length ? parseFloat((Math.max(...ctpTimes) / 60).toFixed(1)) : 0,
                ptpTimes.length ? parseFloat((Math.max(...ptpTimes) / 60).toFixed(1)) : 0
              ]
            },
            {
              label: "Mode (hr)",
              values: [
                ptcTimes.length ? parseFloat((ss.mode(ptcTimes) / 60).toFixed(1)) : 0,
                coldTimes.length ? parseFloat((ss.mode(coldTimes) / 60).toFixed(1)) : 0,
                ctpTimes.length ? parseFloat((ss.mode(ctpTimes) / 60).toFixed(1)) : 0,
                ptpTimes.length ? parseFloat((ss.mode(ptpTimes) / 60).toFixed(1)) : 0
              ]
            },
            {
              label: "P0.8",
              values: [
                ptcTimes.length ? parseFloat((ss.quantile(ptcTimes, 0.8) / 60).toFixed(1)) : 0,
                coldTimes.length ? parseFloat((ss.quantile(coldTimes, 0.8) / 60).toFixed(1)) : 0,
                ctpTimes.length ? parseFloat((ss.quantile(ctpTimes, 0.8) / 60).toFixed(1)) : 0,
                ptpTimes.length ? parseFloat((ss.quantile(ptpTimes, 0.8) / 60).toFixed(1)) : 0
              ]
            },
            {
              label: "P0.9",
              values: [
                ptcTimes.length ? parseFloat((ss.quantile(ptcTimes, 0.9) / 60).toFixed(1)) : 0,
                coldTimes.length ? parseFloat((ss.quantile(coldTimes, 0.9) / 60).toFixed(1)) : 0,
                ctpTimes.length ? parseFloat((ss.quantile(ctpTimes, 0.9) / 60).toFixed(1)) : 0,
                ptpTimes.length ? parseFloat((ss.quantile(ptpTimes, 0.9) / 60).toFixed(1)) : 0
              ]
            },
            {
              label: "Control Limit",
              values: [
                firstRow.prep_to_cold !== null ? `< ${firstRow.prep_to_cold} hr.` : "N/A",
                firstRow.cold !== null ? `< ${firstRow.cold} hr.` : "N/A",
                firstRow.cold_to_pack !== null ? `< ${firstRow.cold_to_pack} hr.` : "N/A",
                firstRow.prep_to_pack !== null ? `< ${firstRow.prep_to_pack} hr.` : "N/A"
              ]
            }
          ],
          delayDistribution: {
            headers: ["Delay (hr)", "ช่วง 1", "ช่วง 2", "ช่วง 3", "ช่วง 4"],
            data: delayDistributionData
          },
          rawDataSample: groupRows.slice(0, 5) // Sample of raw data for debugging
        };
      }

      // 7. Return successful response
      return res.status(200).json({
        success: true,
        data: processedData,
        metadata: {
          totalGroups: Object.keys(processedData).length,
          generatedAt: new Date().toISOString(),
          requestDuration: `${(new Date() - startTime) / 1000} seconds`
        }
      });

    } catch (error) {
      console.error("API Error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      if (pool) {
        try {
          await pool.close();
        } catch (closeError) {
          console.error("Error closing connection pool:", closeError);
        }
      }
    }
  });

  router.get("/checkEditHistoryOnTrolleyAll", async (req, res) => {
    const { tro_id } = req.query;

    if (!tro_id) {
      return res.status(400).json({ success: false, error: "Missing tro_id parameter" });
    }

    try {
      const pool = await connectToDatabase();

      // ดึงข้อมูลวัตถุดิบทั้งหมดในรถเข็น
      const result = await pool.request()
        .input("tro_id", sql.VarChar, tro_id)
        .query(`
        SELECT 
          rmm.tro_id,
          rmm.mapping_id,
          prm.mat,
          rm.mat_name,
          h.three_prod
        FROM TrolleyRMMapping rmm
        JOIN History h ON rmm.mapping_id = h.mapping_id
        JOIN ProdRawMat prm ON rmm.tro_production_id = prm.prod_rm_id
        LEFT JOIN RawMat rm ON prm.mat = rm.mat
        WHERE rmm.tro_id = @tro_id
      `);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: "ไม่พบข้อมูลวัตถุดิบในรถเข็น"
        });
      }

      // แบ่งวัตถุดิบตามสถานะการแก้ไข
      const materialsAtLimit = result.recordset
        .filter(record => record.three_prod !== null)
        .map(record => ({
          mapping_id: record.mapping_id,
          mat: record.mat,
          mat_name: record.mat_name || 'ไม่พบชื่อวัตถุดิบ',
          three_prod: record.three_prod
        }));

      // เช็คว่ามีวัตถุดิบใดๆ ที่ถึงขีดจำกัดการแก้ไขหรือไม่
      const editLimitReached = materialsAtLimit.length > 0;

      return res.status(200).json({
        success: true,
        editLimitReached: editLimitReached,
        materialsAtLimit: materialsAtLimit,
        hasMateriaisAtLimit: editLimitReached
      });

    } catch (error) {
      console.error("Error checking edit history:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get("/checkEditHistory", async (req, res) => {
    const { rmfp_id } = req.query;

    if (!rmfp_id) {
      return res.status(400).json({ success: false, error: "Missing rmfp_id parameter" });
    }

    try {
      const pool = await connectToDatabase();

      const result = await pool.request()
        .input("rmfp_id", rmfp_id)
        .query(`
        SELECT h.three_prod
        FROM RMForProd rmf
        JOIN History h ON rmf.hist_id_rmfp = h.hist_id
        WHERE rmf.rmfp_id = @rmfp_id
      `);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: "ไม่พบข้อมูลประวัติการแก้ไข"
        });
      }

      // ตรวจสอบว่ามีข้อมูลใน three_prod หรือไม่
      const editLimitReached = result.recordset[0].three_prod !== null;

      return res.status(200).json({
        success: true,
        editLimitReached: editLimitReached
      });

    } catch (error) {
      console.error("Error checking edit history:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  router.put("/updateProduction", async (req, res) => {
    const { rmfpID, ProdID, mat, line_name, name_edit_prod, before_prod } = req.body;
    const io = req.app.get("io");  // ดึง io object สำหรับ socket.io

    console.log("body :", req.body);

    try {
      const pool = await connectToDatabase();

      // ตรวจสอบว่ามีแผนการผลิตสำหรับวัตถุดิบที่เลือกหรือไม่
      const result = await pool.request()
        .input("prod_id", ProdID)
        .input("mat", mat)
        .query(`
        SELECT prod_rm_id FROM ProdRawMat
        WHERE prod_id = @prod_id AND mat = @mat
      `);

      if (result.recordset.length === 0) {
        return res.status(400).json({ success: false, message: "ไม่มีแผนการผลิตที่เลือกสำหรับวัตถุดิบนี้" });
      }

      const ProdRMID = result.recordset[0].prod_rm_id;

      // อัปเดตข้อมูลในตาราง RMForProd
      await pool.request()
        .input("rmfp_id", rmfpID)
        .input("prod_rm_id", ProdRMID)
        .input("rmfp_line_name", line_name)
        .query(`
        UPDATE RMForProd
        SET 
          rmfp_line_name = @rmfp_line_name,
          prod_rm_id = @prod_rm_id
        WHERE rmfp_id = @rmfp_id
      `);

      // ดึงข้อมูลแผนการผลิตใหม่และ hist_id
      const pull_production = await pool.request()
        .input("rmfp_id", rmfpID)
        .query(`
        SELECT
          rmf.hist_id_rmfp,
          CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production
        FROM
          RMForProd rmf
        JOIN
          ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
        JOIN
          RawMat rm ON pr.mat = rm.mat
        JOIN
          Production p ON pr.prod_id = p.prod_id
        WHERE rmfp_id = @rmfp_id
      `);

      const production = pull_production.recordset[0].production;
      const hist_id_rmfp = pull_production.recordset[0].hist_id_rmfp;

      console.log("hist_id_rmfp :", hist_id_rmfp);
      console.log("production :", production);
      console.log("name_edit_prod :", name_edit_prod);

      // ตรวจสอบข้อมูลปัจจุบันใน History เพื่อดูว่าควรอัปเดตที่ฟิลด์ไหน
      const checkHistory = await pool.request()
        .input("hist_id", hist_id_rmfp)
        .query(`
        SELECT  two_prod, three_prod
        FROM History
        WHERE hist_id = @hist_id
      `);

      let updateField = "";
      let canUpdate = true;

      if (checkHistory.recordset.length > 0) {
        const { two_prod, three_prod } = checkHistory.recordset[0];

        // กรณีที่ 1: ถ้า two_prod เป็น NULL ให้อัปเดตที่ two_prod
        if (two_prod === null) {
          updateField = "two_prod";
        }
        // กรณีที่ 3: ถ้า two_prod ไม่เป็น NULL แต่ three_prod เป็น NULL ให้อัปเดตที่ three_prod
        else if (three_prod === null) {
          updateField = "three_prod";
        }
        // กรณีที่ 4: ถ้าทั้ง first_prod, two_prod และ three_prod ไม่เป็น NULL แล้ว ไม่อนุญาตให้แก้ไข
        else {
          canUpdate = false;
        }
      }

      if (!canUpdate) {
        return res.status(400).json({
          success: false,
          message: "ไม่สามารถแก้ไขแผนการผลิตได้ เนื่องจากมีการแก้ไขครบ 3 ครั้งแล้ว"
        });
      }

      // สร้าง query string ตามฟิลด์ที่ต้องการอัปเดต
      let updateQuery = "";
      if (updateField === "two_prod") {
        updateQuery = `
        UPDATE History
        SET two_prod = @production,
            name_edit_prod_two = @name_edit_prod
        WHERE hist_id = @hist_id
      `;
      } else if (updateField === "three_prod") {
        updateQuery = `
        UPDATE History
        SET three_prod = @production,
            name_edit_prod_three = @name_edit_prod
        WHERE hist_id = @hist_id
      `;
      }

      // ดำเนินการอัปเดต History
      await pool.request()
        .input("hist_id", hist_id_rmfp)
        .input("production", production)
        .input("name_edit_prod", name_edit_prod)
        .input("before_prod", before_prod)
        .query(updateQuery);

      // ดึงข้อมูลที่อัปเดตแล้วเพื่อส่งกลับ
      const refreshed = await pool.request().query(`
      SELECT
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmf.dest,
        CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production,
        rmg.rm_type_id,
        rmg.rm_group_name,
        rmg.cold,
        htr.cooked_date
      FROM RMForProd rmf
      JOIN ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
      JOIN RawMat rm ON pr.mat = rm.mat
      JOIN Production p ON pr.prod_id = p.prod_id
      JOIN RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
      JOIN RawMatGroup rmg ON rmcg.rm_group_id = rmf.rm_group_id
      JOIN History htr ON rmf.hist_id_rmfp = htr.hist_id
      WHERE 
        rmf.stay_place IN ('จุดเตรียมรับเข้า', 'หม้ออบ')
        AND rmf.dest IN ('ไปจุดเตรียม', 'จุดเตรียม')
        AND rmf.rm_group_id = rmg.rm_group_id
    `);

      const formattedData = refreshed.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        item.CookedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;
        delete item.cooked_date;
        return item;
      });

      // ส่งข้อมูลผ่าน socket.io
      io.to('saveRMForProdRoom').emit('dataUpdated', formattedData);
      io.to('QcCheckRoom').emit('dataUpdated', {
        rmfpID,
        ProdID,
        mat,
        line_name,
        message: "Data updated",
        update_field: updateField
      });

      return res.status(200).json({
        success: true,
        message: "แก้ไขแผนการผลิตเสร็จสิ้น",
        update_field: updateField
      });

    } catch (err) {
      console.error("SQL error", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post("/successTrolley", async (req, res) => {
    const { rmfpID } = req.body;
    try {
      const pool = await connectToDatabase();

      const result = await pool.request()
        .input("rmfp_id", rmfpID)
        .query(`
            UPDATE RMForProd
            SET stay_place = NULL, dest = NULL
            WHERE rmfp_id = @rmfp_id
        `);

      console.log("Rows affected:", result.rowsAffected[0]);

      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put("/MatOnTrolley/updateProduction", async (req, res) => {
    const { mapping_id, ProdID, mat, line_name, name_edit_prod } = req.body;
    const io = req.app.get("io");  // ดึง io object สำหรับ socket.io

    console.log("body :", req.body);

    try {
      const pool = await connectToDatabase();

      // ตรวจสอบว่ามีแผนการผลิตสำหรับวัตถุดิบที่เลือกหรือไม่
      const result = await pool.request()
        .input("prod_id", ProdID)
        .input("mat", mat)
        .query(`
        SELECT prod_rm_id
        FROM ProdRawMat
        WHERE prod_id = @prod_id AND mat = @mat
      `);

      if (result.recordset.length === 0) {
        return res.status(400).json({ success: false, message: "ไม่มีแผนการผลิตที่เลือกสำหรับวัตถุดิบนี้" });
      }

      const ProdRMID = result.recordset[0].prod_rm_id;

      // อัปเดตข้อมูลในตาราง TrolleyRMMapping
      await pool.request()
        .input("mapping_id", mapping_id)
        .input("prod_rm_id", ProdRMID)
        .input("rmm_line_name", line_name)
        .query(`
        UPDATE TrolleyRMMapping
        SET rmm_line_name = @rmm_line_name,
            tro_production_id = @prod_rm_id
        WHERE mapping_id = @mapping_id
      `);

      // อัปเดต rmm_line_name ในตาราง History
      await pool.request()
        .input("mapping_id", mapping_id)
        .input("rmm_line_name", line_name)
        .query(`
        UPDATE History
        SET rmm_line_name = @rmm_line_name
        WHERE mapping_id = @mapping_id
      `);

      // ดึงข้อมูลแผนการผลิตใหม่
      const pull_production = await pool.request()
        .input("mapping_id", mapping_id)
        .query(`
        SELECT
          rmm.mapping_id,
          CONCAT(p.doc_no, ' (', rmm_line_name, ')') AS production
        FROM
          TrolleyRMMapping rmm
        JOIN
          ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
        JOIN
          RawMat rm ON pr.mat = rm.mat
        JOIN
          Production p ON pr.prod_id = p.prod_id
        WHERE mapping_id = @mapping_id
      `);

      const production = pull_production.recordset[0].production;

      console.log("mapping_id :", mapping_id);
      console.log("production :", production);
      console.log("name_edit_prod :", name_edit_prod);

      // ตรวจสอบข้อมูลปัจจุบันใน History เพื่อดูว่าควรอัปเดตที่ฟิลด์ไหน
      const checkHistory = await pool.request()
        .input("mapping_id", mapping_id)
        .query(`
        SELECT  two_prod, three_prod
        FROM History
        WHERE mapping_id = @mapping_id
      `);

      let updateField = "";
      let canUpdate = true;

      if (checkHistory.recordset.length > 0) {
        const { two_prod, three_prod } = checkHistory.recordset[0];

        // กรณีที่ 2: ถ้า first_prod ไม่เป็น NULL แต่ two_prod เป็น NULL ให้อัปเดตที่ two_prod
        if (two_prod === null) {
          updateField = "two_prod";
        }
        // กรณีที่ 3: ถ้า two_prod ไม่เป็น NULL แต่ three_prod เป็น NULL ให้อัปเดตที่ three_prod
        else if (three_prod === null) {
          updateField = "three_prod";
        }
        // กรณีที่ 4: ถ้าทั้ง first_prod, two_prod และ three_prod ไม่เป็น NULL แล้ว ไม่อนุญาตให้แก้ไข
        else {
          canUpdate = false;
        }
      }

      if (!canUpdate) {
        return res.status(400).json({
          success: false,
          message: "ไม่สามารถแก้ไขแผนการผลิตได้ เนื่องจากมีการแก้ไขครบ 3 ครั้งแล้ว"
        });
      }

      // สร้าง query string ตามฟิลด์ที่ต้องการอัปเดต
      let updateQuery = "";
      if (updateField === "two_prod") {
        updateQuery = `
        UPDATE History
        SET two_prod = @production,
            name_edit_prod_two = @name_edit_prod
        WHERE mapping_id = @mapping_id
      `;
      } else if (updateField === "three_prod") {
        updateQuery = `
        UPDATE History
        SET three_prod = @production,
            name_edit_prod_three = @name_edit_prod
        WHERE mapping_id = @mapping_id
      `;
      }

      // ดำเนินการอัปเดต History
      await pool.request()
        .input("mapping_id", mapping_id)
        .input("production", production)
        .input("name_edit_prod", name_edit_prod)
        .query(updateQuery);

      // ส่งข้อมูลผ่าน socket.io
      const formattedData = {
        mapping_id,
        ProdID,
        mat,
        line_name,
        message: "Data updated",
        update_field: updateField // เพิ่มข้อมูลว่าอัปเดตที่ฟิลด์ไหน
      };

      io.to("saveRMForProdRoom").emit("dataUpdated", formattedData);
      io.to("QcCheckRoom").emit("dataUpdated", formattedData);

      return res.status(200).json({
        success: true,
        message: "แก้ไขแผนการผลิตเสร็จสิ้น",
        update_field: updateField // ส่งกลับว่าอัปเดตที่ฟิลด์ไหน
      });

    } catch (err) {
      console.error("SQL error", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });


  router.put("/MatOnTrolley/updateProductionAll", async (req, res) => {
    const { tro_id, mapping_id, ProdID, mat, line_name, name_edit_prod } = req.body;
    const io = req.app.get("io");

    console.log("Update request body:", req.body);

    try {
      const pool = await connectToDatabase();

      // 1. Validate production plan exists for selected material
      const prodCheck = await pool.request()
        .input("prod_id", ProdID)
        .input("mat", mat)
        .query(`
        SELECT prod_rm_id
        FROM ProdRawMat
        WHERE prod_id = @prod_id AND mat = @mat
      `);

      if (prodCheck.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No production plan found for the selected material"
        });
      }

      const ProdRMID = prodCheck.recordset[0].prod_rm_id;

      // 2. Update all materials on the same trolley with new line_name
      const updateTrolley = await pool.request()
        .input("tro_id", sql.VarChar, tro_id)
        .input("prod_rm_id", ProdRMID)
        .input("rmm_line_name", line_name)
        .query(`
        UPDATE TrolleyRMMapping
        SET rmm_line_name = @rmm_line_name,
            tro_production_id = @prod_rm_id
        WHERE tro_id = @tro_id
      `);

      console.log(`Updated ${updateTrolley.rowsAffected} materials on trolley ${tro_id}`);

      // 3. Get all mapping_ids for this trolley to update History table
      const trolleyMappings = await pool.request()
        .input("tro_id", sql.VarChar, tro_id)
        .query(`
        SELECT mapping_id 
        FROM TrolleyRMMapping 
        WHERE tro_id = @tro_id
      `);

      // 4. Update History records for each mapping_id
      for (const record of trolleyMappings.recordset) {
        const currentMappingId = record.mapping_id;

        // Update rmm_line_name in History
        await pool.request()
          .input("mapping_id", currentMappingId)
          .input("rmm_line_name", line_name)
          .query(`
          UPDATE History
          SET rmm_line_name = @rmm_line_name
          WHERE mapping_id = @mapping_id
        `);

        // Get production info for history tracking
        const productionInfo = await pool.request()
          .input("mapping_id", currentMappingId)
          .query(`
          SELECT
            CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production
          FROM
            TrolleyRMMapping rmm
          JOIN
            ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
          JOIN
            Production p ON pr.prod_id = p.prod_id
          WHERE mapping_id = @mapping_id
        `);

        const production = productionInfo.recordset[0]?.production || '';

        // Check which history field to update
        const historyCheck = await pool.request()
          .input("mapping_id", currentMappingId)
          .query(`
          SELECT two_prod, three_prod
          FROM History
          WHERE mapping_id = @mapping_id
        `);

        if (historyCheck.recordset.length > 0) {
          const { two_prod, three_prod } = historyCheck.recordset[0];
          let updateField = "";
          let updateQuery = "";

          if (two_prod === null) {
            updateField = "two_prod";
            updateQuery = `
            UPDATE History
            SET two_prod = @production,
                name_edit_prod_two = @name_edit_prod
            WHERE mapping_id = @mapping_id
          `;
          }
          else if (three_prod === null) {
            updateField = "three_prod";
            updateQuery = `
            UPDATE History
            SET three_prod = @production,
                name_edit_prod_three = @name_edit_prod
            WHERE mapping_id = @mapping_id
          `;
          }

          if (updateQuery) {
            await pool.request()
              .input("mapping_id", currentMappingId)
              .input("production", production)
              .input("name_edit_prod", name_edit_prod)
              .query(updateQuery);

            console.log(`Updated history for mapping ${currentMappingId} (${updateField})`);
          }
        }
      }

      // 5. Get updated data for socket.io emission
      const updatedData = await pool.request()
        .input("mapping_id", mapping_id)
        .query(`
        SELECT
          rmm.mapping_id,
          rmm.tro_id,
          pr.prod_id AS ProdID,
          pr.mat,
          rmm.rmm_line_name AS line_name
        FROM
          TrolleyRMMapping rmm
        JOIN
          ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
        WHERE rmm.mapping_id = @mapping_id
      `);

      const resultData = updatedData.recordset[0];

      // 6. Emit socket.io events
      const formattedData = {
        ...resultData,
        message: "Trolley materials updated",
        name_edit_prod,
        update_count: trolleyMappings.recordset.length
      };

      io.to("saveRMForProdRoom").emit("trolleyUpdated", formattedData);
      io.to("QcCheckRoom").emit("trolleyUpdated", formattedData);

      return res.status(200).json({
        success: true,
        message: `Updated ${trolleyMappings.recordset.length} materials on trolley`,
        data: formattedData
      });

    } catch (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        error: err.message,
        details: err
      });
    }
  });

  router.put("/get/wpname/workplaces", async (req, res) => {
    try {
      const { wp_id, rm_type_id } = req.body;

      // เชื่อมต่อฐานข้อมูล
      const pool = await connectToDatabase();

      // ค้นหาข้อมูล wp_name
      const result = await pool.request()
        .input("wp_id", wp_id)  // กำหนดชนิดข้อมูลเป็น sql.Int
        .query(`
          SELECT wp_name
          FROM Workplace wp
          WHERE wp.wp_id = @wp_id
        `);

      // ค้นหาข้อมูล rm_type_name
      const rmtype = await pool.request()
        .input("rm_type_id", rm_type_id)  // กำหนดชนิดข้อมูลเป็น sql.Int
        .query(`
          SELECT rm_type_name
          FROM RawMatType rmt
          WHERE rmt.rm_type_id = @rm_type_id
        `);

      // ตรวจสอบหากไม่พบข้อมูล
      if (result.recordset.length === 0 || rmtype.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Workplace or RawMatType not found" });
      }

      // ดึงข้อมูล wp_name และ rm_type_name
      const wp_name = result.recordset[0].wp_name;
      const rm_type_name = rmtype.recordset[0].rm_type_name;

      // ส่งข้อมูลกลับไป
      res.json({ success: true, wp_name, rm_type_name });
    } catch (error) {
      console.error("Error fetching wp_name or rm_type_name:", error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        details: error.message,
      });
    }
  });

  router.get('/lineType', async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
      SELECT line_type_id, line_type_name 
      FROM LineType
      ORDER BY line_type_name
    `);
      res.json(result.recordset);
    } catch (err) {
      console.error('Database query error:', err);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  // POST - เพิ่ม LineType ใหม่
  router.post('/lineType', async (req, res) => {
    try {
      const { line_type_name } = req.body;

      // ตรวจสอบว่ามีข้อมูลส่งมาหรือไม่
      if (!line_type_name || line_type_name.trim() === '') {
        return res.status(400).json({ error: 'กรุณาระบุชื่อประเภทไลน์' });
      }

      const pool = await connectToDatabase();

      // ตรวจสอบว่าชื่อซ้ำหรือไม่
      const checkDuplicate = await pool.request()
        .input('line_type_name', sql.NVarChar, line_type_name.trim())
        .query(`
        SELECT COUNT(*) as count 
        FROM LineType 
        WHERE line_type_name = @line_type_name
      `);

      if (checkDuplicate.recordset[0].count > 0) {
        return res.status(400).json({ error: 'ชื่อประเภทไลน์นี้มีอยู่แล้ว' });
      }

      // เพิ่มข้อมูลใหม่
      const result = await pool.request()
        .input('line_type_name', sql.NVarChar, line_type_name.trim())
        .query(`
        INSERT INTO LineType (line_type_name) 
        OUTPUT INSERTED.line_type_id, INSERTED.line_type_name
        VALUES (@line_type_name)
      `);

      res.status(201).json({
        message: 'เพิ่มประเภทไลน์สำเร็จ',
        data: result.recordset[0]
      });

    } catch (err) {
      console.error('Database insert error:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล' });
    }
  });

  // PUT - แก้ไข LineType
  router.put('/lineType/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { line_type_name } = req.body;

      // ตรวจสอบข้อมูลที่ส่งมา
      if (!line_type_name || line_type_name.trim() === '') {
        return res.status(400).json({ error: 'กรุณาระบุชื่อประเภทไลน์' });
      }

      if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'ID ไม่ถูกต้อง' });
      }

      const pool = await connectToDatabase();

      // ตรวจสอบว่า ID มีอยู่จริง
      const checkExists = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .query(`
        SELECT COUNT(*) as count 
        FROM LineType 
        WHERE line_type_id = @id
      `);

      if (checkExists.recordset[0].count === 0) {
        return res.status(404).json({ error: 'ไม่พบข้อมูลประเภทไลน์ที่ต้องการแก้ไข' });
      }

      // ตรวจสอบชื่อซ้ำ (ยกเว้น record ปัจจุบัน)
      const checkDuplicate = await pool.request()
        .input('line_type_name', sql.NVarChar, line_type_name.trim())
        .input('id', sql.Int, parseInt(id))
        .query(`
        SELECT COUNT(*) as count 
        FROM LineType 
        WHERE line_type_name = @line_type_name AND line_type_id != @id
      `);

      if (checkDuplicate.recordset[0].count > 0) {
        return res.status(400).json({ error: 'ชื่อประเภทไลน์นี้มีอยู่แล้ว' });
      }

      // อัพเดทข้อมูล
      const result = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .input('line_type_name', sql.NVarChar, line_type_name.trim())
        .query(`
        UPDATE LineType 
        SET line_type_name = @line_type_name 
        OUTPUT INSERTED.line_type_id, INSERTED.line_type_name
        WHERE line_type_id = @id
      `);

      res.json({
        message: 'แก้ไขประเภทไลน์สำเร็จ',
        data: result.recordset[0]
      });

    } catch (err) {
      console.error('Database update error:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
    }
  });

  // DELETE - ลบ LineType
  router.delete('/lineType/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'ID ไม่ถูกต้อง' });
      }

      const pool = await connectToDatabase();

      // ตรวจสอบว่า ID มีอยู่จริง
      const checkExists = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .query(`
        SELECT line_type_name 
        FROM LineType 
        WHERE line_type_id = @id
      `);

      if (checkExists.recordset.length === 0) {
        return res.status(404).json({ error: 'ไม่พบข้อมูลประเภทไลน์ที่ต้องการลบ' });
      }

      // ตรวจสอบว่ามีการใช้งานอยู่หรือไม่ (ถ้ามี foreign key reference)
      // แก้ไขชื่อตารางตามโครงสร้างจริงของคุณ
      const checkInUse = await pool.request()
        .input('line_type_id', sql.Int, parseInt(id))
        .query(`
        SELECT COUNT(*) as count 
        FROM Line 
        WHERE line_type_id = @line_type_id
      `);

      if (checkInUse.recordset[0].count > 0) {
        return res.status(400).json({
          error: 'ไม่สามารถลบได้ เนื่องจากมีการใช้งานประเภทไลน์นี้อยู่'
        });
      }

      // ลบข้อมูล
      await pool.request()
        .input('id', sql.Int, parseInt(id))
        .query(`
        DELETE FROM LineType 
        WHERE line_type_id = @id
      `);

      res.json({
        message: 'ลบประเภทไลน์สำเร็จ',
        deleted_name: checkExists.recordset[0].line_type_name
      });

    } catch (err) {
      console.error('Database delete error:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
  });

  router.get('/lineName', async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
      SELECT 
        l.line_id,  -- เพิ่ม line_id ใน SELECT
        lt.line_type_name,
        l.line_name,
        lt.line_type_id
      FROM 
        Line l
      JOIN LineType lt ON l.line_type_id = lt.line_type_id
    `);
      res.json(result.recordset);
    } catch (err) {
      console.error('Database query error:', err);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  // POST - Create new line name
  router.post('/lineName', async (req, res) => {
    const { line_name, line_type_id } = req.body;

    // Validation
    if (!line_name || !line_type_id) {
      return res.status(400).json({
        success: false,
        error: 'Line name and line type are required'
      });
    }

    // Validate line_name is not empty string
    if (typeof line_name !== 'string' || line_name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Line name cannot be empty'
      });
    }

    try {
      const pool = await connectToDatabase();

      // Check if line_type_id exists
      const typeCheck = await pool.request()
        .input('line_type_id', line_type_id)
        .query('SELECT line_type_id FROM LineType WHERE line_type_id = @line_type_id');

      if (typeCheck.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid line type selected'
        });
      }

      // Check if line name already exists (case-insensitive)
      const checkResult = await pool.request()
        .input('line_name', line_name.trim())
        .query('SELECT line_id FROM Line WHERE LOWER(line_name) = LOWER(@line_name)');

      if (checkResult.recordset.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Line name already exists'
        });
      }

      // Insert new line
      const insertResult = await pool.request()
        .input('line_name', line_name.trim())
        .input('line_type_id', parseInt(line_type_id))
        .query(`
        INSERT INTO Line (line_name, line_type_id)
        OUTPUT INSERTED.line_id, INSERTED.line_name, INSERTED.line_type_id
        VALUES (@line_name, @line_type_id)
      `);

      // Get the full data with line type name to return
      const newLine = insertResult.recordset[0];
      const typeResult = await pool.request()
        .input('line_type_id', newLine.line_type_id)
        .query('SELECT line_type_name FROM LineType WHERE line_type_id = @line_type_id');

      if (typeResult.recordset.length > 0) {
        newLine.line_type_name = typeResult.recordset[0].line_type_name;
      }

      res.status(201).json({
        success: true,
        data: newLine,
        message: 'Line name created successfully'
      });

    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to create line name',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // PUT - Update line name
  router.put('/lineName/EditLineName/:id', async (req, res) => {
    const { id } = req.params;
    const { line_name, line_type_id } = req.body;

    // Validation
    if (!line_name || !line_type_id) {
      return res.status(400).json({
        success: false,
        error: 'Line name and line type are required'
      });
    }

    // Validate line_name is not empty string
    if (typeof line_name !== 'string' || line_name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Line name cannot be empty'
      });
    }

    // Validate ID is a number
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid line ID'
      });
    }

    try {
      const pool = await connectToDatabase();

      // Check if line exists
      const checkResult = await pool.request()
        .input('id', parseInt(id))
        .query('SELECT line_id FROM Line WHERE line_id = @id');

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Line not found'
        });
      }

      // Check if line_type_id exists
      const typeCheck = await pool.request()
        .input('line_type_id', parseInt(line_type_id))
        .query('SELECT line_type_id FROM LineType WHERE line_type_id = @line_type_id');

      if (typeCheck.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid line type selected'
        });
      }

      // Check if new line name already exists (excluding current line, case-insensitive)
      const nameCheck = await pool.request()
        .input('line_name', line_name.trim())
        .input('id', parseInt(id))
        .query('SELECT line_id FROM Line WHERE LOWER(line_name) = LOWER(@line_name) AND line_id != @id');

      if (nameCheck.recordset.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Line name already exists'
        });
      }

      // Update line
      await pool.request()
        .input('id', parseInt(id))
        .input('line_name', line_name.trim())
        .input('line_type_id', parseInt(line_type_id))
        .query(`
        UPDATE Line 
        SET line_name = @line_name, line_type_id = @line_type_id
        WHERE line_id = @id
      `);

      // Get the updated data with line type name to return
      const updatedResult = await pool.request()
        .input('id', parseInt(id))
        .query(`
        SELECT 
          l.line_id,
          l.line_name,
          l.line_type_id,
          lt.line_type_name
        FROM Line l
        JOIN LineType lt ON l.line_type_id = lt.line_type_id
        WHERE l.line_id = @id
      `);

      res.json({
        success: true,
        data: updatedResult.recordset[0],
        message: 'Line name updated successfully'
      });

    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to update line name',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // DELETE - Delete line name
  router.delete('/lineName/DeleteLineName/:id', async (req, res) => {
    const { id } = req.params;

    // Validate ID is a number
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid line ID'
      });
    }

    try {
      const pool = await connectToDatabase();

      // Check if line exists and get its data before deletion
      const checkResult = await pool.request()
        .input('id', parseInt(id))
        .query(`
        SELECT 
          l.line_id,
          l.line_name,
          l.line_type_id,
          lt.line_type_name
        FROM Line l
        JOIN LineType lt ON l.line_type_id = lt.line_type_id
        WHERE l.line_id = @id
      `);

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Line not found'
        });
      }

      const deletedLine = checkResult.recordset[0];

      // Check if line is being used in other tables (optional - add your own checks)
      // Example: Check if line is used in any production records
      /*
      const usageCheck = await pool.request()
        .input('line_id', parseInt(id))
        .query('SELECT COUNT(*) as count FROM Production WHERE line_id = @line_id');
      
      if (usageCheck.recordset[0].count > 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Cannot delete line name because it is being used in production records' 
        });
      }
      */

      // Delete line
      const deleteResult = await pool.request()
        .input('id', parseInt(id))
        .query('DELETE FROM Line WHERE line_id = @id');

      // Check if deletion was successful
      if (deleteResult.rowsAffected[0] === 0) {
        return res.status(404).json({
          success: false,
          error: 'Line not found or already deleted'
        });
      }

      res.json({
        success: true,
        data: deletedLine,
        message: 'Line name deleted successfully'
      });

    } catch (err) {
      console.error('Database error:', err);

      // Handle specific SQL Server errors
      if (err.number === 547) { // Foreign key constraint error
        return res.status(400).json({
          success: false,
          error: 'Cannot delete line name because it is being used by other records'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete line name',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Optional: GET single line by ID
  router.get('/lineName/:id', async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid line ID'
      });
    }

    try {
      const pool = await connectToDatabase();
      const result = await pool.request()
        .input('id', parseInt(id))
        .query(`
        SELECT 
          l.line_id,
          l.line_name,
          l.line_type_id,
          lt.line_type_name
        FROM Line l
        JOIN LineType lt ON l.line_type_id = lt.line_type_id
        WHERE l.line_id = @id
      `);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Line not found'
        });
      }

      res.json({
        success: true,
        data: result.recordset[0]
      });

    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch line name',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });


  router.get('/cart', async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
      SELECT 
        tro_id,
        tro_status
      FROM 
        Trolley
    `);
      res.json(result.recordset);
    } catch (err) {
      console.error('Database query error:', err);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  router.post('/cart', async (req, res) => {
    try {
      const { tro_id, tro_status = 1 } = req.body;

      if (!tro_id) {
        return res.status(400).json({ error: 'กรุณาระบุรหัสรถเข็น' });
      }

      const pool = await connectToDatabase();
      const checkQuery = `SELECT tro_id FROM Trolley WHERE tro_id = @tro_id`;
      const checkResult = await pool.request()
        .input('tro_id', tro_id)
        .query(checkQuery);

      if (checkResult.recordset.length > 0) {
        return res.status(400).json({ error: 'มีรหัสรถเข็นนี้อยู่แล้ว' });
      }

      const insertQuery = `
      INSERT INTO Trolley (tro_id, tro_status)
      VALUES (@tro_id, @tro_status)
    `;

      await pool.request()
        .input('tro_id', tro_id)
        .input('tro_status', tro_status)
        .query(insertQuery);

      res.status(201).json({ message: 'สร้างรถเข็นเรียบร้อย', tro_id, tro_status });
    } catch (err) {
      console.error('Database insert error:', err);
      res.status(500).json({ error: 'สร้างรถเข็นไม่สำเร็จ' });
    }
  });

  // POST: เพิ่มรถเข็นหลายคัน
  router.post('/cart/batch', async (req, res) => {
    try {
      const { start_id, end_id, tro_status = 1 } = req.body;

      if (!start_id || !end_id) {
        return res.status(400).json({ error: 'กรุณาระบุหมายเลขรถเข็นเริ่มต้นและสิ้นสุด' });
      }

      if (parseInt(start_id) > parseInt(end_id)) {
        return res.status(400).json({ error: 'หมายเลขสิ้นสุดต้องมากกว่าหมายเลขเริ่มต้น' });
      }

      const pool = await connectToDatabase();
      const existingQuery = `
      SELECT tro_id FROM Trolley 
      WHERE tro_id BETWEEN @start_id AND @end_id
    `;
      const existingResult = await pool.request()
        .input('start_id', start_id)
        .input('end_id', end_id)
        .query(existingQuery);

      if (existingResult.recordset.length > 0) {
        const existingIds = existingResult.recordset.map(item => item.tro_id);
        return res.status(400).json({
          error: 'มีหมายเลขรถเข็นที่ซ้ำกันในระบบแล้ว',
          existing_ids: existingIds
        });
      }

      // สร้าง array ของหมายเลขรถเข็นที่จะเพิ่ม
      const startNum = parseInt(start_id);
      const endNum = parseInt(end_id);
      const cartsToAdd = [];

      for (let i = startNum; i <= endNum; i++) {
        cartsToAdd.push({
          tro_id: i.toString().padStart(start_id.length, '0'), // รักษาจำนวนหลักให้เหมือนเดิม
          tro_status
        });
      }

      // เพิ่มข้อมูลทีละกลุ่ม (batch insert)
      const insertQuery = `
      INSERT INTO Trolley (tro_id, tro_status)
      VALUES (@tro_id, @tro_status)
    `;

      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        for (const cart of cartsToAdd) {
          const request = new sql.Request(transaction);
          await request
            .input('tro_id', cart.tro_id)
            .input('tro_status', cart.tro_status)
            .query(insertQuery);
        }

        await transaction.commit();
        res.status(201).json({
          message: `เพิ่มรถเข็นเรียบร้อย ${cartsToAdd.length} คัน`,
          count: cartsToAdd.length,
          start_id: cartsToAdd[0].tro_id,
          end_id: cartsToAdd[cartsToAdd.length - 1].tro_id
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      console.error('Database batch insert error:', err);
      res.status(500).json({ error: 'เพิ่มรถเข็นไม่สำเร็จ' });
    }
  });

  // เพิ่ม route นี้ใน backend API
  router.get('/cart/next-id', async (req, res) => {
    try {
      const pool = await connectToDatabase();

      // ดึงหมายเลขรถเข็นล่าสุดจากฐานข้อมูล
      const query = `
      SELECT TOP 1 tro_id 
      FROM Trolley 
      WHERE ISNUMERIC(tro_id) = 1
      ORDER BY CAST(tro_id AS INT) DESC
    `;

      const result = await pool.request().query(query);

      let nextId = "1";

      if (result.recordset.length > 0) {
        const lastId = result.recordset[0].tro_id;
        const lastNumber = parseInt(lastId);
        const nextNumber = lastNumber + 1;

        // รักษาจำนวนหลักเดิม (เช่น ถ้า 0001 จะให้ 0002)
        nextId = nextNumber.toString().padStart(lastId.length, '0');
      }

      res.json({
        next_id: nextId,
        message: 'ดึงหมายเลขถัดไปสำเร็จ'
      });

    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({
        error: 'เกิดข้อผิดพลาดในการดึงหมายเลขถัดไป',
        next_id: ""
      });
    }
  });

  // PUT: อัปเดตสถานะรถเข็น
  router.put('/edit/cart/:tro_id', async (req, res) => {
    try {
      const { tro_id } = req.params;
      const { new_tro_id, tro_status } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!new_tro_id) {
        return res.status(400).json({ error: 'ต้องระบุหมายเลขรถเข็นใหม่' });
      }

      const pool = await connectToDatabase();

      // ตรวจสอบว่า tro_id ใหม่ยังไม่มีในระบบ
      const checkNewIdQuery = `SELECT tro_id FROM Trolley WHERE tro_id = @new_tro_id`;
      const newIdCheck = await pool.request()
        .input('new_tro_id', new_tro_id)
        .query(checkNewIdQuery);

      if (newIdCheck.recordset.length > 0 && new_tro_id !== tro_id) {
        return res.status(409).json({ error: 'หมายเลขรถเข็นนี้มีอยู่แล้วในระบบ' });
      }

      // อัปเดตข้อมูล
      const updateQuery = `
      UPDATE Trolley 
      SET tro_id = @new_tro_id, 
          tro_status = @tro_status
      WHERE tro_id = @old_tro_id
    `;

      await pool.request()
        .input('old_tro_id', tro_id)
        .input('new_tro_id', new_tro_id)
        .input('tro_status', tro_status)
        .query(updateQuery);

      res.json({
        message: 'อัปเดตข้อมูลรถเข็นเรียบร้อย',
        old_tro_id: tro_id,
        new_tro_id: new_tro_id,
        tro_status
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'อัปเดตข้อมูลไม่สำเร็จ' });
    }
  });

  // DELETE: ลบรถเข็น
  router.delete('/cart/:tro_id', async (req, res) => {
    try {
      const { tro_id } = req.params;

      const pool = await connectToDatabase();
      const checkQuery = `SELECT tro_id FROM Trolley WHERE tro_id = @tro_id`;
      const checkResult = await pool.request()
        .input('tro_id', tro_id)
        .query(checkQuery);

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({ error: 'ไม่พบรถเข็นที่ต้องการลบ' });
      }

      const deleteQuery = `DELETE FROM Trolley WHERE tro_id = @tro_id`;

      await pool.request()
        .input('tro_id', tro_id)
        .query(deleteQuery);

      res.json({ message: 'ลบรถเข็นเรียบร้อย', tro_id: tro_id });
    } catch (err) {
      console.error('Database delete error:', err);
      res.status(500).json({ error: 'ลบรถเข็นไม่สำเร็จ' });
    }
  });

  // เพิ่ม route นี้ใน router file ของคุณ
  // router.delete('/cart/batch', async (req, res) => {
  //   try {
  //     const { start_id, end_id } = req.body;

  //     if (!start_id || !end_id) {
  //       return res.status(400).json({ error: 'กรุณาระบุหมายเลขรถเข็นเริ่มต้นและสิ้นสุด' });
  //     }

  //     const startNum = parseInt(start_id);
  //     const endNum = parseInt(end_id);

  //     if (isNaN(startNum)) {
  //       return res.status(400).json({ error: 'หมายเลขเริ่มต้นต้องเป็นตัวเลขเท่านั้น' });
  //     }

  //     if (isNaN(endNum)) {
  //       return res.status(400).json({ error: 'หมายเลขสิ้นสุดต้องเป็นตัวเลขเท่านั้น' });
  //     }

  //     if (startNum > endNum) {
  //       return res.status(400).json({ error: 'หมายเลขสิ้นสุดต้องมากกว่าหมายเลขเริ่มต้น' });
  //     }

  //     const count = endNum - startNum + 1;

  //     if (count > 100) {
  //         return res.status(400).json({ 
  //         error: 'ไม่สามารถลบรถเข็นได้เกิน 100 คันในครั้งเดียว',
  //         max_allowed: 100,
  //         requested: count
  //       });
  //     }

  //     const pool = await connectToDatabase();

  //     // ตรวจสอบว่ามีรถเข็นในช่วงนี้จริงหรือไม่
  //     const checkQuery = `
  //       SELECT COUNT(*) as count FROM Trolley 
  //       WHERE tro_id BETWEEN @start_id AND @end_id
  //     `;
  //     const checkResult = await pool.request()
  //       .input('start_id', start_id)
  //       .input('end_id', end_id)
  //       .query(checkQuery);

  //     if (checkResult.recordset[0].count === 0) {
  //       return res.status(404).json({ 
  //         error: 'ไม่พบรถเข็นในช่วงที่ระบุ',
  //         start_id,
  //         end_id
  //       });
  //     }

  //     // ลบข้อมูล
  //     const deleteQuery = `
  //       DELETE FROM Trolley 
  //       WHERE tro_id BETWEEN @start_id AND @end_id
  //     `;
  //     const deleteResult = await pool.request()
  //       .input('start_id', start_id)
  //       .input('end_id', end_id)
  //       .query(deleteQuery);

  //     res.json({ 
  //       success: true,
  //       message: 'ลบรถเข็นเรียบร้อย',
  //       count: deleteResult.rowsAffected[0],
  //       start_id,
  //       end_id
  //     });
  //   } catch (err) {
  //     console.error('Database batch delete error:', err);
  //     res.status(500).json({ 
  //       error: 'ลบรถเข็นไม่สำเร็จ',
  //       details: err.message 
  //     });
  //   }
  // });

  router.delete('/del/cart/batch', async (req, res) => {
    try {
      const { start_id, end_id } = req.body;

      if (!start_id || !end_id) {
        return res.status(400).json({ error: 'กรุณาระบุหมายเลขรถเข็นเริ่มต้นและสิ้นสุด' });
      }

      // ตรวจสอบว่าเป็น string ที่เป็นตัวเลข 4 หลัก
      const pattern = /^\d{4}$/;
      if (!pattern.test(start_id) || !pattern.test(end_id)) {
        return res.status(400).json({ error: 'หมายเลขรถเข็นต้องเป็นตัวเลข 4 หลัก (เช่น 0001)' });
      }

      if (start_id > end_id) {
        return res.status(400).json({ error: 'หมายเลขสิ้นสุดต้องมากกว่าหมายเลขเริ่มต้น' });
      }

      const pool = await connectToDatabase();

      const checkQuery = `
      SELECT COUNT(*) as total_count
      FROM Trolley
      WHERE tro_id BETWEEN @start_id AND @end_id
    `;

      const checkResult = await pool.request()
        .input('start_id', sql.VarChar(4), start_id)
        .input('end_id', sql.VarChar(4), end_id)
        .query(checkQuery);

      const totalCount = checkResult.recordset[0].total_count;



      const deleteQuery = `
      DELETE FROM Trolley
      WHERE tro_id BETWEEN @start_id AND @end_id
    `;

      const deleteResult = await pool.request()
        .input('start_id', sql.VarChar(4), start_id)
        .input('end_id', sql.VarChar(4), end_id)
        .query(deleteQuery);

      res.json({
        success: true,
        message: 'ลบรถเข็นเรียบร้อย',
        count: deleteResult.rowsAffected[0],
        start_id,
        end_id
      });

    } catch (err) {
      console.error('Database batch delete error:', err);
      res.status(500).json({
        error: 'ลบรถเข็นไม่สำเร็จ',
        details: err.message
      });
    }
  });


  module.exports = router;

  return router;
};