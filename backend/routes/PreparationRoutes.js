module.exports = (io) => {
  const express = require("express");
  const { connectToDatabase } = require("../database/db");
  const router = express.Router();


  router.post("/prep/saveRMForProd", async (req, res) => {
    const { mat, batch, productId, line_name, groupId, weight, operator, withdraw, datetime: receiveDT, Receiver, userID, Dest, level_eu } = req.body;

    if (Array.isArray(groupId) && groupId.length > 0) {
      let transaction;

      try {
        const pool = await connectToDatabase();
        transaction = await pool.transaction();
        await transaction.begin();

        // ดึงค่า prod_rm_id จากฐานข้อมูล
        const result = await transaction.request()
          .input("productId", productId)
          .input("mat", mat)
          .query(`
            SELECT prod_rm_id
            FROM ProdRawMat
            WHERE prod_Id = @productId AND mat = @mat
          `);

        if (result.recordset.length === 0) {
          console.error("ไม่พบ prod_rm_id สำหรับ productId และ mat ที่ระบุ");
          return res.status(404).json({ success: false, message: "ไม่พบข้อมูล prod_rm_id" });
        }

        const ProdrmID = result.recordset[0].prod_rm_id;

        const insertRMForProd = async (groupID, stayPlace) => {
          for (let i = 0; i < groupID.length; i++) {
            const rmfpResult = await transaction.request()
              .input("prod_rm_id", ProdrmID)
              .input("rm_group_id", groupID[i])
              .input("batch", batch)
              .input("weight", weight)
              .input("rmfp_line_name", line_name)
              .input("stay_place", stayPlace)
              .input("dest", Dest)
              .input("level_eu", level_eu !== "-" ? level_eu : null)  // Store EU level or NULL if "-"

              .query(`
                INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name,level_eu)
                OUTPUT INSERTED.rmfp_id
                VALUES (@prod_rm_id, @batch,  @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name,@level_eu)
              `);

            const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

            const SELECT_Production = await transaction.request()
              .input("rmfp_id", RMFP_ID)
              .query(`SELECT
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
                    `
              )

            const production = SELECT_Production.recordset[0].production;

            // Insert ข้อมูลเข้า History และดึง hist_id ที่พึ่ง insert
            const historyResult = await transaction.request()
              .input("receiver", operator)
              .input("withdraw", withdraw)
              .input("cooked_date", receiveDT)
              .input("first_prod", production)
              .query(`
                INSERT INTO History (receiver, withdraw_date, cooked_date,first_prod,created_at)
                OUTPUT INSERTED.hist_id
                VALUES (@receiver, @withdraw, @cooked_date, @first_prod,GETDATE())
              `);

            if (historyResult.recordset.length === 0) {
              console.error("เกิดข้อผิดพลาดในการบันทึก History");
              return;
            }

            const histID = historyResult.recordset[0].hist_id;

            // อัปเดต RMForProd ด้วย hist_id
            await transaction.request()
              .input("hist_id", histID)
              .input("rmfp_id", RMFP_ID)
              .query(`
                UPDATE RMForProd 
                SET hist_id_rmfp = @hist_id
                WHERE rmfp_id = @rmfp_id
              `);
          }
        };

        if (Dest === "หม้ออบ" || Dest === "เข้าห้องเย็น") {
          await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
        } else if (Dest === "จุดเตรียม") {
          await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
        }

        await transaction.commit();

        // Broadcast a message to all connected clients when the data is successfully saved
        const broadcastData = {
          message: "Raw material data saved successfully!",
          productId: productId,
          groupId: groupId,
          batch: batch,
          weight: weight,
          dest: Dest
        };

        // Emit the event to all connected clients
        req.app.get("io").emit("rawMaterialSaved", broadcastData);

        // Send the response
        res.json({ success: true, message: "บันทึกข้อมูลการแสกนเสร็จสิ้น" });
      } catch (err) {
        if (transaction) {
          await transaction.rollback();
        }
        console.error("SQL error", err);
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });


  /**
     * @swagger
     * /api/oven/toCold/fetchRMForProd:
     *    get:
     *      summary: ดึงข้อมูลวัตถุดิบรอเลือกรถเข็นเข้าห้องเย็นมาแสดงในตาราง
     *      description: ดึงข้อมูลวัตถุดิบกำลังไปห้องเย็น ที่ยังไม่ได้ถูกเลือกรถเข็น
     *      tags: 
     *        - Oven
     *      responses:
     *        200:
     *          description: ดึงข้อมูลสำเร็จ
     *          content:
     *            application/json:
     *              schema:
     *                type: object
     *                properties:
     *                  success:
     *                    type: boolean
     *                    example: true
     *                  data:
     *                    type: array
     *                    items:
     *                      type: object
     *                      properties:
     *                        rmfp_id:
     *                          type: integer
     *                          example: 
     *                        cooked_date:
     *                          type: string
     *                          format: date-time
     *                          example: 
     *                        batch:
     *                          type: string
     *                          example: 
     *                        mat:
     *                          type: string
     *                          example: 
     *                        mat_name:
     *                          type: string
     *                          example: 
     *                        production:
     *                          type: string
     *                          example: 
     *        500:
     *          description: เกิดข้อผิดพลาดในระบบ
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
  router.get("/prep/manage/fetchRMForProd", async (req, res) => {
    try {
      const { rm_type_ids } = req.query;

      if (!rm_type_ids) {
        return res.status(400).json({ success: false, error: "RM Type IDs are required" });
      }

      const rmTypeIdsArray = rm_type_ids.split(',');

      const pool = await connectToDatabase();

      // 2. ดึงข้อมูลตาม rm_type_ids ที่ส่งมา
      const query = `
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
        rmf.level_eu,
        htr.cooked_date,
        htr.withdraw_date
      FROM
        RMForProd rmf
      JOIN
        ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
      JOIN
        RawMat rm ON pr.mat = rm.mat
      JOIN
        Production p ON pr.prod_id = p.prod_id
      JOIN
        RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
      JOIN
        RawMatGroup rmg ON rmcg.rm_group_id = rmf.rm_group_id
      JOIN
        History htr ON rmf.hist_id_rmfp = htr.hist_id
      WHERE 
        rmf.stay_place IN ('จุดเตรียมรับเข้า', 'หม้ออบ')
        AND rmf.dest IN ('ไปจุดเตรียม', 'จุดเตรียม')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
      ORDER BY
        htr.cooked_date DESC
    `;

      const result = await pool.request().query(query);

      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);

        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');

        item.CookedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;
        console.log("CookedDateTime :", item.CookedDateTime)
        delete item.cooked_date;

        return item;
      });




      // ✅ Broadcast ไปยังทุก client ในห้อง
      io.to('saveRMForProdRoom').emit('dataUpdated', formattedData);

      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  router.post("/prep/manage/saveTrolley", async (req, res) => {
    const {
      license_plate, rmfpID, batch_after, ntray, recorder, weightTotal,
      Dest, Process, cookedDateTimeNew, preparedDateTimeNew, cold, deliveryType, mat
    } = req.body;

    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    // ตรวจสอบสถานะก่อนทำรายการ
    const checkTrolley = await pool.request()
      .input("tro_id", license_plate)
      .query(`
    SELECT tro_status, rsrv_timestamp
    FROM Trolley
    WHERE tro_id = @tro_id
  `);

    if (checkTrolley.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });
    }

    const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];

    if (tro_status !== 'rsrv') {
      return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
    }

    // ตรวจสอบว่าเกินเวลา 5 นาทีหรือไม่
    const now = new Date();
    const reservedTime = new Date(rsrv_timestamp);
    const diffMs = now - reservedTime;
    const diffMinutes = diffMs / 1000 / 60;

    if (diffMinutes > 5) {
      return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
    }

    try {
      await transaction.begin();

      const dataRMForProd = await transaction.request()
        .input("rmfp_id", rmfpID)
        .query(`
          SELECT prod_rm_id, stay_place, weight, hist_id_rmfp, batch, rmfp_line_name,level_eu,rm_group_id
          FROM RMForProd
          WHERE rmfp_id = @rmfp_id
        `);

      if (dataRMForProd.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูล RMForProd สำหรับ rmfp_id: ${rmfpID}`);
      }

      const { prod_rm_id, batch, rmfp_line_name, hist_id_rmfp, level_eu, rm_group_id } = dataRMForProd.recordset[0];
      const finalBatchAfter = batch_after && batch_after.trim() !== "" ? batch_after : batch;


      const PullTypeRaw = await transaction.request()
        .input("mat", mat)
        .input("rm_group_id", rm_group_id)
        .query(`SELECT
          rmt.rm_type_name
        FROM
        RawMatCookedGroup rmcg
        JOIN 
        RawMatType rmt ON rmcg.rm_type_id = rmt.rm_type_id
        where rmcg.mat = @mat and  rmcg.rm_group_id = @rm_group_id
        `)

      if (PullTypeRaw.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูลประเภทวัตถุดิบ สำหรับ mat: ${mat}`);
      }

      const RawMat = PullTypeRaw.recordset[0].rm_type_name;

      const dataHisRMForProd = await transaction.request()
        .input("hist_id_rmfp", hist_id_rmfp)
        .query(`
          SELECT withdraw_date,first_prod,two_prod,three_prod,name_edit_prod_two,name_edit_prod_three,weight_RM,tray_count
          FROM History
          WHERE hist_id = @hist_id_rmfp
        `);

      let rm_status = "รอQCตรวจสอบ";
      let batch_id = null;

      if (Dest === "เข้าห้องเย็น" && deliveryType === "รอกลับมาเตรียม") {
        rm_status = "รอกลับมาเตรียม";
        // ไม่ต้องสร้าง batch_id
      } else {
        const batchResult = await transaction.request()
          .input("batch_before", batch)
          .input("batch_after", finalBatchAfter)
          .query(`
            INSERT INTO Batch (batch_before, batch_after)
            OUTPUT INSERTED.batch_id
            VALUES (@batch_before, @batch_after)
          `);

        batch_id = batchResult.recordset[0].batch_id;
      }

      const result = await transaction.request()
        .input("tro_id", license_plate)
        .input("rmfp_id", rmfpID)
        .input("batch_id", batch_id)
        .input("tro_production_id", prod_rm_id)
        .input("rm_status", rm_status)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("stay_place", "จุดเตรียม")
        .input("process_id", Process)
        .input("level_eu", level_eu)
        .input("dest", Dest)
        .input("cold_time", cold)
        .input("rmm_line_name", rmfp_line_name)

        .query(`
          INSERT INTO TrolleyRMMapping (tro_id, rmfp_id, tro_production_id, batch_id, tray_count, stay_place, dest, rm_status, process_id, weight_RM, level_eu, cold_time, rmm_line_name)
          OUTPUT INSERTED.mapping_id
          VALUES (@tro_id, @rmfp_id, @tro_production_id, @batch_id, @tray_count, @stay_place, @dest, @rm_status, @process_id, @weight_RM, @level_eu, @cold_time, @rmm_line_name)
        `);

      const mapping_id = result.recordset[0].mapping_id;

      // แก้ไขตรงนี้: ตรวจสอบค่า rm_status ก่อนบันทึกประวัติ

      console.log("preparedDateTimeNew :", preparedDateTimeNew)
      let rmitDateValue = preparedDateTimeNew;

      // ถ้าเป็น "รอกลับมาเตรียม" ไม่ต้องบันทึก rmit_date
      if (rm_status === "รอกลับมาเตรียม") {
        rmitDateValue = null;
      }

      const historyResult = await transaction.request()
        .input("mapping_id", mapping_id)
        .input("tro_id", license_plate)
        .input("cooked_date", cookedDateTimeNew)
        .input("prepared_date", rmitDateValue) // เพิ่ม prepared_date
        .input("withdraw_date", dataHisRMForProd.recordset[0].withdraw_date)
        .input("receiver", recorder)
        .input("first_prod", dataHisRMForProd.recordset[0].first_prod)
        .input("two_prod", dataHisRMForProd.recordset[0].two_prod)
        .input("three_prod", dataHisRMForProd.recordset[0].three_prod)
        .input("name_edit_prod_two", dataHisRMForProd.recordset[0].name_edit_prod_two)
        .input("name_edit_prod_three", dataHisRMForProd.recordset[0].name_edit_prod_three)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("rm_status", rm_status)
        .input("dest", Dest)
        .input("rmm_line_name", rmfp_line_name)
        .input("stay_place", "จุดเตรียม")
        .input("location", `จุดเตรียม${RawMat}`)
        .query(`
          INSERT INTO History (mapping_id, tro_id,rmit_date, cooked_date, withdraw_date, receiver,first_prod,two_prod,three_prod,name_edit_prod_two,name_edit_prod_three,weight_RM,tray_count,rm_status,dest,rmm_line_name,stay_place,created_at,location)
          OUTPUT INSERTED.hist_id
          VALUES (@mapping_id, @tro_id, @prepared_date, @cooked_date, @withdraw_date, @receiver,@first_prod,@two_prod,@three_prod,@name_edit_prod_two,@name_edit_prod_three,@weight_RM,@tray_count,@rm_status,@dest,@rmm_line_name,@stay_place,GETDATE(),@location)
        `);

      await transaction.request()
        .input("tro_id", license_plate)
        .query(`
          UPDATE Trolley
          SET tro_status = '0' , rsrv_timestamp = NULL
          WHERE tro_id = @tro_id
        `);

      await transaction.commit();

      // ✅ ส่งข้อมูลแบบ socket.io หลังจาก transaction สำเร็จ
      const io = req.app.get('io'); // อย่าลืม set io ใน app.js
      const formattedData = {
        trolleyId: license_plate,
        status: rm_status,
        batchAfter: finalBatchAfter,
        trayCount: ntray,
        levelEU: level_eu,
        cookedDate: cookedDateTimeNew,
        destination: Dest,
        processId: Process,
        timestamp: new Date(),
      };

      io.to('QcCheckRoom').emit('dataUpdated', formattedData); // 🔔 broadcast ไปยัง QcCheckRoom

      res.status(200).json({ success: true, message: "Data saved and emitted successfully", data: formattedData });

    } catch (err) {
      console.error("SQL error:", err.message, err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  /**
     * @swagger
     * /api/oven/toCold/fetchRMForProd:
     *    get:
     *      summary: ดึงข้อมูลวัตถุดิบรอเลือกรถเข็นเข้าห้องเย็นมาแสดงในตาราง
     *      description: ดึงข้อมูลวัตถุดิบกำลังไปห้องเย็น ที่ยังไม่ได้ถูกเลือกรถเข็น
     *      tags: 
     *        - Oven
     *      responses:
     *        200:
     *          description: ดึงข้อมูลสำเร็จ
     *          content:
     *            application/json:
     *              schema:
     *                type: object
     *                properties:
     *                  success:
     *                    type: boolean
     *                    example: true
     *                  data:
     *                    type: array
     *                    items:
     *                      type: object
     *                      properties:
     *                        rmfp_id:
     *                          type: integer
     *                          example: 
     *                        cooked_date:
     *                          type: string
     *                          format: date-time
     *                          example: 
     *                        batch:
     *                          type: string
     *                          example: 
     *                        mat:
     *                          type: string
     *                          example: 
     *                        mat_name:
     *                          type: string
     *                          example: 
     *                        production:
     *                          type: string
     *                          example: 
     *        500:
     *          description: เกิดข้อผิดพลาดในระบบ
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
  router.get("/prep/toColdOven/fetchRMForProd", async (req, res) => {
    try {
      const { rm_type_ids } = req.query;

      if (!rm_type_ids) {
        return res.status(400).json({ success: false, error: "RM Type IDs are required" });
      }

      const rmTypeIdsArray = rm_type_ids.split(',');


      const pool = await connectToDatabase();

      // 2. ดึงข้อมูลตามสิทธิ์ผู้ใช้
      const query = `
      SELECT
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmf.dest, 
        CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production,
        rmg.rm_type_id,
        rmf.level_eu,
        htr.cooked_date
      FROM
        RMForProd rmf
      JOIN
        ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
      JOIN
        RawMat rm ON pr.mat = rm.mat
      JOIN
        Production p ON pr.prod_id = p.prod_id
      JOIN
        RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
      JOIN
        RawMatGroup rmg ON rmcg.rm_group_id = rmg.rm_group_id
      JOIN
        History htr ON rmf.hist_id_rmfp = htr.hist_id
      WHERE 
        rmf.stay_place = 'จุดเตรียมรับเข้า' 
        AND rmf.dest IN ('เข้าห้องเย็น', 'หม้ออบ')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
        ORDER BY htr.cooked_date DESC
    `;

      const result = await pool.request().query(query);

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

      // ✅ Broadcast ไปทุก client ที่อยู่ในห้องนี้
      io.to('saveRMForProdRoom').emit('dataUpdated', formattedData);

      res.json({ success: true, data: formattedData });

    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  module.exports = (io) => {
    const express = require("express");
    const { connectToDatabase } = require("../database/db");
    const router = express.Router();


    router.post("/prep/saveRMForProd", async (req, res) => {
      const { mat, batch, productId, line_name, groupId, weight, operator, withdraw, datetime: receiveDT, Receiver, userID, Dest, level_eu } = req.body;

      if (Array.isArray(groupId) && groupId.length > 0) {
        let transaction;

        try {
          const pool = await connectToDatabase();
          transaction = await pool.transaction();
          await transaction.begin();

          // ดึงค่า prod_rm_id จากฐานข้อมูล
          const result = await transaction.request()
            .input("productId", productId)
            .input("mat", mat)
            .query(`
            SELECT prod_rm_id
            FROM ProdRawMat
            WHERE prod_Id = @productId AND mat = @mat
          `);

          if (result.recordset.length === 0) {
            console.error("ไม่พบ prod_rm_id สำหรับ productId และ mat ที่ระบุ");
            return res.status(404).json({ success: false, message: "ไม่พบข้อมูล prod_rm_id" });
          }

          const ProdrmID = result.recordset[0].prod_rm_id;

          const insertRMForProd = async (groupID, stayPlace) => {
            for (let i = 0; i < groupID.length; i++) {
              const rmfpResult = await transaction.request()
                .input("prod_rm_id", ProdrmID)
                .input("rm_group_id", groupID[i])
                .input("batch", batch)
                .input("weight", weight)
                .input("rmfp_line_name", line_name)
                .input("stay_place", stayPlace)
                .input("dest", Dest)
                .input("level_eu", level_eu !== "-" ? level_eu : null)  // Store EU level or NULL if "-"

                .query(`
                INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name,level_eu)
                OUTPUT INSERTED.rmfp_id
                VALUES (@prod_rm_id, @batch,  @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name,@level_eu)
              `);

              const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

              const SELECT_Production = await transaction.request()
                .input("rmfp_id", RMFP_ID)
                .query(`SELECT
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
                    `
                )

              const production = SELECT_Production.recordset[0].production;

              // Insert ข้อมูลเข้า History และดึง hist_id ที่พึ่ง insert
              const historyResult = await transaction.request()
                .input("receiver", operator)
                .input("withdraw", withdraw)
                .input("cooked_date", receiveDT)
                .input("first_prod", production)
                .query(`
                INSERT INTO History (receiver, withdraw_date, cooked_date,first_prod,created_at)
                OUTPUT INSERTED.hist_id
                VALUES (@receiver, @withdraw, @cooked_date, @first_prod,GETDATE())
              `);

              if (historyResult.recordset.length === 0) {
                console.error("เกิดข้อผิดพลาดในการบันทึก History");
                return;
              }

              const histID = historyResult.recordset[0].hist_id;

              // อัปเดต RMForProd ด้วย hist_id
              await transaction.request()
                .input("hist_id", histID)
                .input("rmfp_id", RMFP_ID)
                .query(`
                UPDATE RMForProd 
                SET hist_id_rmfp = @hist_id
                WHERE rmfp_id = @rmfp_id
              `);
            }
          };

          if (Dest === "หม้ออบ" || Dest === "เข้าห้องเย็น") {
            await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
          } else if (Dest === "จุดเตรียม") {
            await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
          }

          await transaction.commit();

          // Broadcast a message to all connected clients when the data is successfully saved
          const broadcastData = {
            message: "Raw material data saved successfully!",
            productId: productId,
            groupId: groupId,
            batch: batch,
            weight: weight,
            dest: Dest
          };

          // Emit the event to all connected clients
          req.app.get("io").emit("rawMaterialSaved", broadcastData);

          // Send the response
          res.json({ success: true, message: "บันทึกข้อมูลการแสกนเสร็จสิ้น" });
        } catch (err) {
          if (transaction) {
            await transaction.rollback();
          }
          console.error("SQL error", err);
          res.status(500).json({ success: false, error: err.message });
        }
      }
    });


    /**
       * @swagger
       * /api/oven/toCold/fetchRMForProd:
       *    get:
       *      summary: ดึงข้อมูลวัตถุดิบรอเลือกรถเข็นเข้าห้องเย็นมาแสดงในตาราง
       *      description: ดึงข้อมูลวัตถุดิบกำลังไปห้องเย็น ที่ยังไม่ได้ถูกเลือกรถเข็น
       *      tags: 
       *        - Oven
       *      responses:
       *        200:
       *          description: ดึงข้อมูลสำเร็จ
       *          content:
       *            application/json:
       *              schema:
       *                type: object
       *                properties:
       *                  success:
       *                    type: boolean
       *                    example: true
       *                  data:
       *                    type: array
       *                    items:
       *                      type: object
       *                      properties:
       *                        rmfp_id:
       *                          type: integer
       *                          example: 
       *                        cooked_date:
       *                          type: string
       *                          format: date-time
       *                          example: 
       *                        batch:
       *                          type: string
       *                          example: 
       *                        mat:
       *                          type: string
       *                          example: 
       *                        mat_name:
       *                          type: string
       *                          example: 
       *                        production:
       *                          type: string
       *                          example: 
       *        500:
       *          description: เกิดข้อผิดพลาดในระบบ
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
    router.get("/prep/manage/fetchRMForProd", async (req, res) => {
      try {
        const { rm_type_ids } = req.query;

        if (!rm_type_ids) {
          return res.status(400).json({ success: false, error: "RM Type IDs are required" });
        }

        const rmTypeIdsArray = rm_type_ids.split(',');

        const pool = await connectToDatabase();

        // 2. ดึงข้อมูลตาม rm_type_ids ที่ส่งมา
        const query = `
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
        rmf.level_eu,
        htr.cooked_date,
        htr.withdraw_date
      FROM
        RMForProd rmf
      JOIN
        ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
      JOIN
        RawMat rm ON pr.mat = rm.mat
      JOIN
        Production p ON pr.prod_id = p.prod_id
      JOIN
        RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
      JOIN
        RawMatGroup rmg ON rmcg.rm_group_id = rmf.rm_group_id
      JOIN
        History htr ON rmf.hist_id_rmfp = htr.hist_id
      WHERE 
        rmf.stay_place IN ('จุดเตรียมรับเข้า', 'หม้ออบ')
        AND rmf.dest IN ('ไปจุดเตรียม', 'จุดเตรียม')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
      ORDER BY
        htr.cooked_date DESC
    `;

        const result = await pool.request().query(query);

        const formattedData = result.recordset.map(item => {
          const date = new Date(item.cooked_date);

          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');

          item.CookedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;
          console.log("CookedDateTime :", item.CookedDateTime)
          delete item.cooked_date;

          return item;
        });




        // ✅ Broadcast ไปยังทุก client ในห้อง
        io.to('saveRMForProdRoom').emit('dataUpdated', formattedData);

        res.json({ success: true, data: formattedData });
      } catch (err) {
        console.error("SQL error", err);
        res.status(500).json({ success: false, error: err.message });
      }
    });


    // router.post("/prep/manage/saveTrolley", async (req, res) => {
    //   const {
    //     license_plate, rmfpID, batch_after, ntray, recorder, weightTotal,
    //     Dest, Process, cookedDateTimeNew, preparedDateTimeNew, cold, deliveryType, mat
    //   } = req.body;

    //   const sql = require("mssql");
    //   const pool = await connectToDatabase();
    //   const transaction = new sql.Transaction(pool);



    //   try {
    //     await transaction.begin();

    //     const dataRMForProd = await transaction.request()
    //       .input("rmfp_id", rmfpID)
    //       .query(`
    //         SELECT prod_rm_id, stay_place, weight, hist_id_rmfp, batch, rmfp_line_name,level_eu,rm_group_id
    //         FROM RMForProd
    //         WHERE rmfp_id = @rmfp_id
    //       `);

    //     if (dataRMForProd.recordset.length === 0) {
    //       throw new Error(`ไม่พบข้อมูล RMForProd สำหรับ rmfp_id: ${rmfpID}`);
    //     }

    //     const { prod_rm_id, batch, rmfp_line_name, hist_id_rmfp, level_eu ,rm_group_id} = dataRMForProd.recordset[0];
    //     const finalBatchAfter = batch_after && batch_after.trim() !== "" ? batch_after : batch;


    //     const PullTypeRaw = await transaction.request()
    //       .input("mat", mat)
    //       .input("rm_group_id", rm_group_id)
    //       .query(`SELECT
    //         rmt.rm_type_name
    //       FROM
    //       RawMatCookedGroup rmcg
    //       JOIN 
    //       RawMatType rmt ON rmcg.rm_type_id = rmt.rm_type_id
    //       where rmcg.mat = @mat and  rmcg.rm_group_id = @rm_group_id
    //       `)

    //     if (PullTypeRaw.recordset.length === 0) {
    //       throw new Error(`ไม่พบข้อมูลประเภทวัตถุดิบ สำหรับ mat: ${mat}`);
    //     }

    //     const RawMat = PullTypeRaw.recordset[0].rm_type_name;

    //     const dataHisRMForProd = await transaction.request()
    //       .input("hist_id_rmfp", hist_id_rmfp)
    //       .query(`
    //         SELECT withdraw_date,first_prod,two_prod,three_prod,name_edit_prod_two,name_edit_prod_three,weight_RM,tray_count
    //         FROM History
    //         WHERE hist_id = @hist_id_rmfp
    //       `);

    //     let rm_status = "รอQCตรวจสอบ";
    //     let batch_id = null;

    //     if (Dest === "เข้าห้องเย็น" && deliveryType === "รอกลับมาเตรียม") {
    //       rm_status = "รอกลับมาเตรียม";
    //       // ไม่ต้องสร้าง batch_id
    //     } else {
    //       const batchResult = await transaction.request()
    //         .input("batch_before", batch)
    //         .input("batch_after", finalBatchAfter)
    //         .query(`
    //           INSERT INTO Batch (batch_before, batch_after)
    //           OUTPUT INSERTED.batch_id
    //           VALUES (@batch_before, @batch_after)
    //         `);

    //       batch_id = batchResult.recordset[0].batch_id;
    //     }

    //     const result = await transaction.request()
    //       .input("tro_id", license_plate)
    //       .input("rmfp_id", rmfpID)
    //       .input("batch_id", batch_id)
    //       .input("tro_production_id", prod_rm_id)
    //       .input("rm_status", rm_status)
    //       .input("weight_RM", weightTotal)
    //       .input("tray_count", ntray)
    //       .input("stay_place", "จุดเตรียม")
    //       .input("process_id", Process)
    //       .input("level_eu", level_eu)
    //       .input("dest", Dest)
    //       .input("cold_time", cold)
    //       .input("rmm_line_name", rmfp_line_name)

    //       .query(`
    //         INSERT INTO TrolleyRMMapping (tro_id, rmfp_id, tro_production_id, batch_id, tray_count, stay_place, dest, rm_status, process_id, weight_RM, level_eu, cold_time, rmm_line_name)
    //         OUTPUT INSERTED.mapping_id
    //         VALUES (@tro_id, @rmfp_id, @tro_production_id, @batch_id, @tray_count, @stay_place, @dest, @rm_status, @process_id, @weight_RM, @level_eu, @cold_time, @rmm_line_name)
    //       `);

    //     const mapping_id = result.recordset[0].mapping_id;

    //     // แก้ไขตรงนี้: ตรวจสอบค่า rm_status ก่อนบันทึกประวัติ

    //     console.log("preparedDateTimeNew :", preparedDateTimeNew)
    //     let rmitDateValue = preparedDateTimeNew;

    //     // ถ้าเป็น "รอกลับมาเตรียม" ไม่ต้องบันทึก rmit_date
    //     if (rm_status === "รอกลับมาเตรียม") {
    //       rmitDateValue = null;
    //     }

    //     const historyResult = await transaction.request()
    //       .input("mapping_id", mapping_id)
    //       .input("tro_id", license_plate)
    //       .input("cooked_date", cookedDateTimeNew)
    //       .input("prepared_date", rmitDateValue) // เพิ่ม prepared_date
    //       .input("withdraw_date", dataHisRMForProd.recordset[0].withdraw_date)
    //       .input("receiver", recorder)
    //       .input("first_prod", dataHisRMForProd.recordset[0].first_prod)
    //       .input("two_prod", dataHisRMForProd.recordset[0].two_prod)
    //       .input("three_prod", dataHisRMForProd.recordset[0].three_prod)
    //       .input("name_edit_prod_two", dataHisRMForProd.recordset[0].name_edit_prod_two)
    //       .input("name_edit_prod_three", dataHisRMForProd.recordset[0].name_edit_prod_three)
    //       .input("weight_RM", weightTotal)
    //       .input("tray_count", ntray)
    //       .input("rm_status", rm_status)
    //       .input("dest", Dest)
    //       .input("rmm_line_name", rmfp_line_name)
    //       .input("stay_place", "จุดเตรียม")
    //       .input("location", `จุดเตรียม${RawMat}`)
    //       .query(`
    //         INSERT INTO History (mapping_id, tro_id,rmit_date, cooked_date, withdraw_date, receiver,first_prod,two_prod,three_prod,name_edit_prod_two,name_edit_prod_three,weight_RM,tray_count,rm_status,dest,rmm_line_name,stay_place,created_at,location)
    //         OUTPUT INSERTED.hist_id
    //         VALUES (@mapping_id, @tro_id, @prepared_date, @cooked_date, @withdraw_date, @receiver,@first_prod,@two_prod,@three_prod,@name_edit_prod_two,@name_edit_prod_three,@weight_RM,@tray_count,@rm_status,@dest,@rmm_line_name,@stay_place,GETDATE(),@location)
    //       `);

    //     await transaction.request()
    //       .input("tro_id", license_plate)
    //       .query(`
    //         UPDATE Trolley
    //         SET tro_status = '0'
    //         WHERE tro_id = @tro_id
    //       `);

    //     await transaction.commit();

    //     // ✅ ส่งข้อมูลแบบ socket.io หลังจาก transaction สำเร็จ
    //     const io = req.app.get('io'); // อย่าลืม set io ใน app.js
    //     const formattedData = {
    //       trolleyId: license_plate,
    //       status: rm_status,
    //       batchAfter: finalBatchAfter,
    //       trayCount: ntray,
    //       levelEU: level_eu,
    //       cookedDate: cookedDateTimeNew,
    //       destination: Dest,
    //       processId: Process,
    //       timestamp: new Date(),
    //     };

    //     io.to('QcCheckRoom').emit('dataUpdated', formattedData); // 🔔 broadcast ไปยัง QcCheckRoom

    //     res.status(200).json({ success: true, message: "Data saved and emitted successfully", data: formattedData });

    //   } catch (err) {
    //     console.error("SQL error:", err.message, err);
    //     res.status(500).json({ success: false, error: err.message });
    //   }
    // });


    /**
       * @swagger
       * /api/oven/toCold/fetchRMForProd:
       *    get:
       *      summary: ดึงข้อมูลวัตถุดิบรอเลือกรถเข็นเข้าห้องเย็นมาแสดงในตาราง
       *      description: ดึงข้อมูลวัตถุดิบกำลังไปห้องเย็น ที่ยังไม่ได้ถูกเลือกรถเข็น
       *      tags: 
       *        - Oven
       *      responses:
       *        200:
       *          description: ดึงข้อมูลสำเร็จ
       *          content:
       *            application/json:
       *              schema:
       *                type: object
       *                properties:
       *                  success:
       *                    type: boolean
       *                    example: true
       *                  data:
       *                    type: array
       *                    items:
       *                      type: object
       *                      properties:
       *                        rmfp_id:
       *                          type: integer
       *                          example: 
       *                        cooked_date:
       *                          type: string
       *                          format: date-time
       *                          example: 
       *                        batch:
       *                          type: string
       *                          example: 
       *                        mat:
       *                          type: string
       *                          example: 
       *                        mat_name:
       *                          type: string
       *                          example: 
       *                        production:
       *                          type: string
       *                          example: 
       *        500:
       *          description: เกิดข้อผิดพลาดในระบบ
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
    router.get("/prep/toColdOven/fetchRMForProd", async (req, res) => {
      try {
        const { rm_type_ids } = req.query;

        if (!rm_type_ids) {
          return res.status(400).json({ success: false, error: "RM Type IDs are required" });
        }

        const rmTypeIdsArray = rm_type_ids.split(',');


        const pool = await connectToDatabase();

        // 2. ดึงข้อมูลตามสิทธิ์ผู้ใช้
        const query = `
      SELECT
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmf.dest, 
        CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production,
        rmg.rm_type_id,
        rmf.level_eu,
        htr.cooked_date
      FROM
        RMForProd rmf
      JOIN
        ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
      JOIN
        RawMat rm ON pr.mat = rm.mat
      JOIN
        Production p ON pr.prod_id = p.prod_id
      JOIN
        RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
      JOIN
        RawMatGroup rmg ON rmcg.rm_group_id = rmg.rm_group_id
      JOIN
        History htr ON rmf.hist_id_rmfp = htr.hist_id
      WHERE 
        rmf.stay_place = 'จุดเตรียมรับเข้า' 
        AND rmf.dest IN ('เข้าห้องเย็น', 'หม้ออบ')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
        ORDER BY htr.cooked_date DESC
    `;

        const result = await pool.request().query(query);

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

        // ✅ Broadcast ไปทุก client ที่อยู่ในห้องนี้
        io.to('saveRMForProdRoom').emit('dataUpdated', formattedData);

        res.json({ success: true, data: formattedData });

      } catch (err) {
        console.error("SQL error", err);
        res.status(500).json({ success: false, error: err.message });
      }
    });


    router.post("/prep/toColdOven/saveTrolley", async (req, res) => {
      const { license_plate, rmfpID, ntray, recorder, weight, weightTotal, rm_status, name_edit_prod, after_prod, before_prod, mat } = req.body;
      const sql = require("mssql");
      const pool = await connectToDatabase();
      const transaction = new sql.Transaction(pool);

      try {
        await transaction.begin();



        const RawMat = PullTypeRaw.recordset[0].rm_type_name;

        // ดึงข้อมูลจากตาราง RMForProd
        const dataRMForProd = await transaction.request()
          .input("rmfp_id", rmfpID)
          .query(`
          SELECT
            prod_rm_id,
            stay_place,
            dest,
            hist_id_rmfp,
            rmfp_line_name,
            level_eu,
            rm_group_id
          FROM
            RMForProd
          WHERE
            rmfp_id = @rmfp_id
        `);

        if (dataRMForProd.recordset.length === 0) {
          throw new Error(`ไม่พบข้อมูล RMForProd สำหรับ rmfp_id: ${rmfpID}`);
        }


        const PullTypeRaw = await transaction.request()
          .input("mat", mat)
          .input("rm_group_id", dataRMForProd.recordset[0].rm_group_id)
          .query(`SELECT
          rmt.rm_type_name
        FROM
        RawMatCookedGroup rmcg
        JOIN 
        RawMatType rmt ON rmcg.rm_type_id = rmt.rm_type_id
        where rmcg.mat = @mat and  rmcg.rm_group_id = @rm_group_id
        `)

        if (PullTypeRaw.recordset.length === 0) {
          throw new Error(`ไม่พบข้อมูลประเภทวัตถุดิบ สำหรับ mat: ${mat}`);
        }

        // ดึงข้อมูลจาก History
        const dataHisRMForProd = await transaction.request()
          .input("hist_id_rmfp", dataRMForProd.recordset[0].hist_id_rmfp)
          .query(`
          SELECT withdraw_date,cooked_date,name_edit_prod_two,name_edit_prod_three,first_prod,two_prod,three_prod
          FROM History
          WHERE hist_id = @hist_id_rmfp
        `);

        // การแทรกข้อมูลใน RMInTrolley
        const insertResult = await transaction.request()
          .input("tro_id", license_plate)
          .input("rmfp_id", rmfpID)
          .input("tro_production_id", dataRMForProd.recordset[0].prod_rm_id)
          .input("rm_status", rm_status)
          .input("weight_RM", weightTotal)
          .input("tray_count", ntray)
          .input("dest", dataRMForProd.recordset[0].dest)
          .input("level_eu", dataRMForProd.recordset[0].level_eu)
          .input("stay_place", "จุดเตรียม")
          .input("rmm_line_name", dataRMForProd.recordset[0].rmfp_line_name)
          .query(`
          INSERT INTO TrolleyRMMapping (tro_id, rmfp_id, tro_production_id, stay_place, dest, rm_status, tray_count, level_eu,rmm_line_name,weight_RM,created_at)
          OUTPUT INSERTED.mapping_id
          VALUES (@tro_id, @rmfp_id, @tro_production_id, @stay_place, @dest, @rm_status, @tray_count,@level_eu,@rmm_line_name,@weight_RM,GETDATE())
        `);

        // const rm_tro_id = insertResult.recordset[0].rm_tro_id;
        const mapping_id = insertResult.recordset[0].mapping_id;
        console.log("mapping_id", mapping_id)

        // แทรกข้อมูลลง History
        const historyResult = await transaction.request()
          .input("tro_id", license_plate)
          .input("mapping_id", mapping_id)
          .input("cooked_date", dataHisRMForProd.recordset[0].cooked_date)
          .input("withdraw_date", dataHisRMForProd.recordset[0].withdraw_date)
          .input("receiver", recorder)
          .input("location", `จุดเตรียม${RawMat}`)
          .input("first_prod", dataHisRMForProd.recordset[0].first_prod)
          .input("two_prod", dataHisRMForProd.recordset[0].two_prod)
          .input("three_prod", dataHisRMForProd.recordset[0].three_prod)
          .input("name_edit_prod_two", dataHisRMForProd.recordset[0].name_edit_prod_two)
          .input("name_edit_prod_three", dataHisRMForProd.recordset[0].name_edit_prod_three)
          .input("weight_RM", weight)
          .input("tray_count", ntray)

          .query(`
          INSERT INTO History (tro_id , mapping_id, cooked_date, withdraw_date, receiver, location,first_prod,two_prod,three_prod,name_edit_prod_two,name_edit_prod_three,weight_RM,tray_count,created_at)
          OUTPUT INSERTED.hist_id
          VALUES (@tro_id,@mapping_id, @cooked_date, @withdraw_date, @receiver, @location,@first_prod,@two_prod,@three_prod,@name_edit_prod_two,@name_edit_prod_three,@weight_RM,@tray_count,GETDATE())
        `);

        const hist_id = historyResult.recordset[0].hist_id;

        // อัปเดต RMInTrolley ด้วย hist_id_rmit
        // await transaction.request()
        //   .input("hist_id_rmit", hist_id)
        //   .input("rm_tro_id", rm_tro_id)
        //   .query(`
        //     UPDATE TrolleyRMMapping
        //     SET hist_id_rmit = @hist_id_rmit
        //     WHERE rm_tro_id = @rm_tro_id
        //   `);

        // อัปเดตสถานะ Trolley
        await transaction.request()
          .input("tro_id", license_plate)
          .query(`
          UPDATE Trolley
          SET tro_status = '0',rsrv_timestamp = null
          WHERE tro_id = @tro_id
        `);

        await transaction.commit();

        // Prepare broadcast data
        const broadcastData = {
          message: "Trolley data has been saved successfully!",
          license_plate: license_plate,
          mapping_id: mapping_id,
          rmfpID: rmfpID,
          ntray: ntray,
          location: `จุดเตรียม${RawMat}`,
          recorder: recorder,
          weightTotal: weightTotal,
          rm_status: rm_status,
          hist_id: hist_id,
          timestamp: new Date()
        };

        // 2. General room for all trolley updates
        req.app.get("io").to("trolleyUpdatesRoom").emit("trolleyUpdated", broadcastData);

        return res.status(200).json({
          success: true,
          message: "บันทึกข้อมูลเสร็จสิ้น",
          data: {
            mapping_id,
            hist_id,
            license_plate
          }
        });

      } catch (err) {
        // await transaction.rollback();
        console.error("SQL error", err);

        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.get("/raw-materials", async (req, res) => {
      try {
        const pool = await connectToDatabase();
        const result = await pool
          .request()
          .query(`
                SELECT TOP (1000) 
                [rm_tro_id], [rmit_date], [tro_id], [rmfp_id], [rm_mix], 
                [tro_production_id], [weight_per_tro], [ntray], [stay_place], 
                [dest], [rm_status], [process_id], [qc_id], [rm_cold_status], 
                [come_cold_date], [out_cold_date], [weight_RM], [cooked_date]
                FROM [PFCMv2].[dbo].[RMInTrolley]
                
            `);

        res.json(result.recordset);
      } catch (err) {
        console.error("SQL error", err);
        res.status(500).json({ error: "Database error", details: err.message });
      }
    });

    router.get("/prep/matimport/fetchRMForProd", async (req, res) => {
      try {

        const { rm_type_ids } = req.query;

        if (!rm_type_ids) {
          return res.status(400).json({ success: false, error: "RM Type IDs are required" });
        }

        const rmTypeIdsArray = rm_type_ids.split(',');
        const pool = await connectToDatabase();


        // 2. ดึงข้อมูลตามสิทธิ์ผู้ใช้
        const query = `
      SELECT
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmm.dest,
        rmm.stay_place,
        CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
        rmg.rm_type_id,
        rmm.tro_id,
        rmm.mapping_id,
        rmm.level_eu,
        htr.cooked_date,
        htr.edit_rework
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
      JOIN
        History htr ON rmm.mapping_id = htr.mapping_id
      WHERE 
        rmm.stay_place IN ('ออกห้องเย็น' ,'หม้ออบ','จุดเตรียม')
        AND rmm.dest = 'จุดเตรียม'
        AND rmm.rm_status IN ('QcCheck รอกลับมาเตรียม','QcCheck รอ MD','รอกลับมาเตรียม','รอ Qc')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
      ORDER BY
        htr.cooked_date DESC
    `;

        const result = await pool.request().query(query);

        const formattedData = result.recordset.map(item => {
          const date = new Date(item.cooked_date);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          const seconds = String(date.getUTCSeconds()).padStart(2, '0');
          const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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





    router.post("/mapping/successTrolley", async (req, res) => {
      const { mapping_id } = req.body;
      const io = req.app.get("io"); // ดึง io object มาใช้

      try {
        const pool = await connectToDatabase();

        // ตรวจสอบว่า mapping_id มีอยู่จริงหรือไม่
        const checkResult = await pool.request()
          .input("mapping_id", mapping_id)
          .query("SELECT mapping_id,tro_id FROM TrolleyRMMapping WHERE mapping_id = @mapping_id");

        if (checkResult.recordset.length === 0) {
          return res.status(404).json({ success: false, message: "ไม่พบข้อมูล mapping_id ที่ระบุ" });
        }

        let tro_id = checkResult.recordset[0].tro_id;

        // ทำการอัปเดตข้อมูล
        const result = await pool.request()
          .input("mapping_id", mapping_id)
          .query(`
        UPDATE TrolleyRMMapping
        SET stay_place = NULL, dest = NULL, rm_status = 'สำเร็จ', tro_id = NULL
        WHERE mapping_id = @mapping_id
      `);

        if (result.rowsAffected[0] === 0) {
          return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตข้อมูลได้" });
        }

        console.log("Rows affected:", result.rowsAffected[0]);

        const claerStatus = await pool.request()
          .input("tro_id", tro_id)
          .input("tro_status", 1)
          .query(`
        UPDATE Trolley
          set tro_status = @tro_status
          WHERE tro_id = @tro_id
        `)


        // ---- ส่งข้อมูลผ่าน socket ----
        const formattedData = {
          mapping_id,
          status: "สำเร็จ",
          message: "Trolley mapping marked as complete"
        };

        io.to("saveRMForProdRoom").emit("dataUpdated", formattedData);

        return res.status(200).json({
          success: true,
          message: "บันทึกข้อมูลเสร็จสิ้น",
          updatedRows: result.rowsAffected[0]
        });
      } catch (err) {
        console.error("SQL error", err);
        res.status(500).json({ success: false, error: err.message });
      }
    });


    router.get("/prep/main/fetchRMForProd", async (req, res) => {
      try {
        const pool = await connectToDatabase();
        const result = await pool
          .request()
          .query(`
                  SELECT
                    rmf.rmfp_id,
                    COALESCE(b.batch_after, rmf.batch) AS batch,
                    rm.mat,
                    rm.mat_name,
                    rmm.dest,
                    rmm.stay_place,
                    CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                    rmm.rmm_line_name,
                    rmm.tro_id,
                    rmm.mapping_id,
                    rmm.level_eu,
                    rmm.rm_status,
                    rmm.weight_RM,
                    rmm.tray_count,
                    htr.location
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
                    History htr ON rmm.mapping_id = htr.mapping_id
                WHERE 
                    rmm.tro_id IS NOT NULL
              `);


        const formattedData = result.recordset.map(item => {
          const date = new Date(item.cooked_date);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          const seconds = String(date.getUTCSeconds()).padStart(2, '0');
          const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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


    // router.get("/prep/main/fetchAllTrolleys", async (req, res) => {
    //     try {
    //         const pool = await connectToDatabase();

    //         // ดึงข้อมูลรถเข็นว่าง
    //         const emptyTrolleysResult = await pool
    //             .request()
    //             .query(`
    //                 SELECT 
    //                     t.tro_id as trolley_number,
    //                     'รถเข็นว่าง (ห้องเย็น)' as trolley_status,
    //                     'อยู่ในห้องเย็น' as trolley_location,
    //                     cs.cs_name,
    //                     s.slot_id,
    //                     'empty' as trolley_type
    //                 FROM 
    //                     Trolley t 
    //                 JOIN 
    //                     Slot s ON t.tro_id = s.tro_id
    //                 LEFT JOIN 
    //                     TrolleyRMMapping rmm ON t.tro_id = rmm.tro_id 
    //                 JOIN 
    //                     ColdStorage cs ON s.cs_id = cs.cs_id
    //                 WHERE 
    //                     t.tro_status = 0 
    //                 AND 
    //                     rmm.mapping_id IS NULL
    //                 AND 
    //                     s.slot_id IS NOT NULL 
    //                 ORDER BY t.tro_id
    //             `);

    //         // ดึงข้อมูลรถเข็นที่มีวัตถุดิบ พร้อมข้อมูลที่จำเป็นสำหรับการแสดงสถานที่
    //         const occupiedTrolleysResult = await pool
    //             .request()
    //             .query(`
    //                 SELECT DISTINCT
    //                     rmm.tro_id as trolley_number,
    //                     'มีวัตถุดิบ' as trolley_status,
    //                     rmm.dest,
    //                     rmm.stay_place,
    //                     rmm.rmm_line_name,
    //                     rmm.rm_status,
    //                     htr.location,
    //                     'occupied' as trolley_type,
    //                     CASE 
    //                         WHEN (rmm.dest = 'เข้าห้องเย็น' OR rmm.dest = 'ไปบรรจุ') AND rmm.rm_status = 'รอQCตรวจสอบ' 
    //                             THEN CONCAT('รอQC ตรวจสอบ ณ ', ISNULL(htr.location, '-'))
    //                         WHEN rmm.dest = 'เข้าห้องเย็น' AND (rmm.rm_status = 'QcCheck' OR rmm.rm_status = 'QcCheck รอกลับมาเตรียม' OR rmm.rm_status = 'QcCheck รอ MD' OR rmm.rm_status = 'รอกลับมาเตรียม' OR rmm.rm_status = 'รอแก้ไข' OR rmm.rm_status = 'เหลือจากไลน์ผลิต') 
    //                             THEN 'รอห้องเย็นรับเข้า'
    //                         WHEN (rmm.dest = 'ไปบรรจุ' OR rmm.dest = 'บรรจุ') AND rmm.rm_status = 'QcCheck' 
    //                             THEN CONCAT('รอบรรจุรับ (', ISNULL(rmm.rmm_line_name, '-'), ')')
    //                         WHEN (rmm.dest = 'เข้าห้องเย็น' OR rmm.dest = 'จุดเตรียม') AND rmm.rm_status = 'QcCheck รอแก้ไข' 
    //                             THEN CONCAT('QC ส่งกลับมาแก้ไข ณ ', ISNULL(htr.location, '-'))
    //                         WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'ปกติ' 
    //                             THEN 'รออบเสร็จ'
    //                         WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status = 'รอแก้ไข' OR rmm.rm_status = 'รับฝาก-รอแก้ไข') 
    //                             THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location, '-'))
    //                         WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'รอแก้ไข' 
    //                             THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location, '-'))
    //                         WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status = 'รอกลับมาเตรียม' OR rmm.rm_status = 'QcCheck รอ MD') 
    //                             THEN CONCAT('รอกลับมาเตรียม ณ ', ISNULL(htr.location, '-'))
    //                         WHEN rmm.dest = 'ห้องเย็น' AND (rmm.rm_status = 'รอแก้ไข' OR rmm.rm_status = 'รอQCตรวจสอบ' OR rmm.rm_status = 'QcCheck' OR rmm.rm_status = 'QcCheck รอ MD' OR rmm.rm_status = 'รอกลับมาเตรียม' OR rmm.rm_status = 'เหลือจากไลน์ผลิต') 
    //                             THEN 'อยู่ในห้องเย็น'
    //                         ELSE '-'
    //                     END as trolley_location
    //                 FROM 
    //                     TrolleyRMMapping rmm
    //                 JOIN 
    //                     History htr ON rmm.mapping_id = htr.mapping_id
    //                 WHERE 
    //                     rmm.tro_id IS NOT NULL
    //                 ORDER BY rmm.tro_id
    //             `);

    //         // ดึงข้อมูลรถเข็นรอจัดส่ง
    //         const packingTrolleysResult = await pool
    //             .request()
    //             .query(`
    //                 SELECT 
    //                     pt.tro_id as trolley_number,
    //                     'รอบรรจุจัดส่ง' as trolley_status,
    //                     l.line_name as trolley_location,
    //                     'packing' as trolley_type
    //                 FROM 
    //                     PackTrolley pt
    //                 LEFT JOIN
    //                     Line l ON pt.line_tro = l.line_id
    //                 ORDER BY pt.tro_id
    //             `);

    //         // รวมข้อมูลทั้งหมด
    //         const allTrolleys = [
    //             ...emptyTrolleysResult.recordset.map(row => ({
    //                 trolley_number: row.trolley_number,
    //                 trolley_status: row.trolley_status,
    //                 trolley_location: row.trolley_location,
    //                 trolley_type: row.trolley_type
    //             })),
    //             ...occupiedTrolleysResult.recordset.map(row => ({
    //                 trolley_number: row.trolley_number,
    //                 trolley_status: row.trolley_status,
    //                 trolley_location: row.trolley_location,
    //                 trolley_type: row.trolley_type
    //             })),
    //             ...packingTrolleysResult.recordset.map(row => ({
    //                 trolley_number: row.trolley_number,
    //                 trolley_status: row.trolley_status,
    //                 trolley_location: row.trolley_location,
    //                 trolley_type: row.trolley_type
    //             }))
    //         ];

    //         // เรียงลำดับตามหมายเลขรถเข็น
    //         allTrolleys.sort((a, b) => {
    //             const numA = parseInt(a.trolley_number) || 0;
    //             const numB = parseInt(b.trolley_number) || 0;
    //             return numA - numB;
    //         });

    //         const responseData = {
    //             trolleys: allTrolleys,
    //             summary: {
    //                 totalEmpty: emptyTrolleysResult.recordset.length,
    //                 totalOccupied: occupiedTrolleysResult.recordset.length,
    //                 totalPacking: packingTrolleysResult.recordset.length,
    //                 totalTrolleys: allTrolleys.length
    //             }
    //         };

    //         res.json({ 
    //             success: true, 
    //             data: responseData 
    //         });

    //     } catch (err) {
    //         console.error("SQL error", err);
    //         res.status(500).json({ success: false, error: err.message });
    //     }
    // });



    router.get("/prep/mat/rework/fetchRMForProd", async (req, res) => {
      try {
        const { rm_type_ids } = req.query;

        if (!rm_type_ids) {
          return res.status(400).json({ success: false, error: "RM Type IDs are required" });
        }

        const rmTypeIdsArray = rm_type_ids.split(',');
        const pool = await connectToDatabase();
        const result = await pool
          .request()
          .query(`
                  SELECT
                      rmf.rmfp_id,
                      b.batch_after,
                      rm.mat,
                      rm.mat_name,
                      rmm.dest,
                      rmm.stay_place,
                      CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                      rmg.rm_type_id,
                      rmm.tro_id,
                      rmm.mapping_id,
                      rmm.weight_RM,
                      rmm.level_eu,
                      rmm.tray_count,
                      rmm.rm_status,
                      CONCAT('Sensory :',' ',qc.sq_remark,' ','MD :',' ' , qc.md_remark,' ','Defect :',' ', qc.defect_remark) AS remark_qc,
                      htr.qccheck_cold,
                      htr.remark_rework,
                      htr.remark_rework_cold,
                      htr.cooked_date
                  FROM
                      RMForProd rmf
                  JOIN
                      TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
                  JOIN
                       Batch b ON rmm.batch_id = b.batch_id
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
                  JOIN
                      QC qc ON rmm.qc_id = qc.qc_id
                  JOIN
                      History htr ON rmm.mapping_id = htr.mapping_id
                 
                  WHERE 
                      rmm.stay_place IN ('ออกห้องเย็น' ,'บรรจุ','หม้ออบ','จุดเตรียม') 
                        AND rmm.dest = 'จุดเตรียม'
                        AND rmm.rm_status IN ('รอแก้ไข','QcCheck รอแก้ไข') 
                        AND rmf.rm_group_id = rmg.rm_group_id
                        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
                        ORDER BY htr.cooked_date DESC
              `);


        const formattedData = result.recordset.map(item => {
          const date = new Date(item.cooked_date);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          const seconds = String(date.getUTCSeconds()).padStart(2, '0');
          const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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

    router.get("/prep/mat/rework/fetchRMForProdNoBatchAfter", async (req, res) => {
      try {

        const { rm_type_ids } = req.query;

        if (!rm_type_ids) {
          return res.status(400).json({ success: false, error: "RM Type IDs are required" });
        }

        const rmTypeIdsArray = rm_type_ids.split(',');

        const pool = await connectToDatabase();

        // 2. ดึงข้อมูลตามสิทธิ์ผู้ใช้
        const query = `
      SELECT
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmm.dest,
        rmm.stay_place,
        CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
        rmg.rm_type_id,
        rmm.tro_id,
        rmm.mapping_id,
        rmm.weight_RM,
        rmm.level_eu,
        rmm.tray_count,
        rmm.rm_status,
        htr.cooked_date,
        htr.qccheck_cold,
        htr.remark_rework
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
      JOIN
        History htr ON rmm.mapping_id = htr.mapping_id
      WHERE 
        rmm.stay_place IN ('ออกห้องเย็น' ,'บรรจุ','หม้ออบ','จุดเตรียม') 
        AND rmm.dest IN ('จุดเตรียม','เข้าห้องเย็น','ไปบรรจุ')
        AND rmm.rm_status IN ('รับฝาก-รอแก้ไข')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
      ORDER BY htr.cooked_date DESC
    `;

        const result = await pool.request().query(query);


        const formattedData = result.recordset.map(item => {
          const date = new Date(item.cooked_date);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          const seconds = String(date.getUTCSeconds()).padStart(2, '0');
          const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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

    router.post("/prep/mat/rework/rsrv/saveTrolley", async (req, res) => {
      const { license_plate, ntray, weightTotal, mapping_id, dest, tro_id, recorder, rm_status, edit_rework } = req.body;
      console.log("body:", req.body);

      const sql = require("mssql");
      const pool = await connectToDatabase();
      const transaction = new sql.Transaction(pool);

      try {
        if (!tro_id || !license_plate || !mapping_id) {
          return res.status(400).json({ success: false, error: "Missing required fields" });
        }


        // ตรวจสอบสถานะก่อนทำรายการ
        const checkTrolley = await pool.request()
          .input("tro_id", license_plate)
          .query(`
          SELECT tro_status, rsrv_timestamp
          FROM Trolley
          WHERE tro_id = @tro_id
        `);

        if (checkTrolley.recordset.length === 0) {
          return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });
        }

        const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];

        if (tro_status !== 'rsrv') {
          return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
        }

        // ตรวจสอบว่าเกินเวลา 5 นาทีหรือไม่
        const now = new Date();
        const reservedTime = new Date(rsrv_timestamp);
        const diffMs = now - reservedTime;
        const diffMinutes = diffMs / 1000 / 60;

        if (diffMinutes > 5) {
          return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
        }

        await transaction.begin();

        await transaction.request()
          .input("tro_id", tro_id)
          .query(`
          UPDATE Trolley
          SET tro_status = '1',rsrv_timestamp = null
          WHERE tro_id = @tro_id
      `);

        const rmGroupResult = await transaction.request()
          .input("mapping_id", mapping_id)
          .query(`
          SELECT rmg.rm_group_id, rmg.rework, trm.rework_time
          FROM TrolleyRMMapping trm
          JOIN RMForProd rmf ON trm.rmfp_id = rmf.rmfp_id
          JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
          WHERE trm.mapping_id = @mapping_id
      `);

        let rework_time_value = null;
        let description_rework;

        if ((rm_status === 'รอแก้ไข' || rm_status === 'รับฝาก-รอแก้ไข') && edit_rework !== null && rmGroupResult.recordset.length > 0) {
          rework_time_value = rmGroupResult.recordset[0].rework_time ?? rmGroupResult.recordset[0].rework;
          description_rework = edit_rework;
        } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework !== null && rmGroupResult.recordset[0]?.rework_time !== null) {
          rework_time_value = rmGroupResult.recordset[0].rework_time;
          description_rework = edit_rework;
        } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework === null) {
          description_rework = null;
        }

        // กำหนดค่า rm_status ใหม่ตามเงื่อนไข
        let new_rm_status = 'รอQCตรวจสอบ'; // ค่าเริ่มต้น
        let destination = dest;

        // เพิ่มเงื่อนไข: ถ้า rm_status เป็น "รับฝาก-รอแก้ไข" ให้เปลี่ยนเป็น "รอกลับมาเตรียม"
        if (rm_status === 'รับฝาก-รอแก้ไข') {
          new_rm_status = 'รอกลับมาเตรียม';
          destination = 'จุดเตรียม';

        }

        const updateRM = await transaction.request()
          .input("tro_id", license_plate)
          .input("weight_RM", weightTotal)
          .input("tray_count", ntray)
          .input("dest", destination)
          .input("stay_place", 'จุดเตรียม')
          .input("rm_status", new_rm_status) // ใช้ค่า rm_status ใหม่ตามเงื่อนไข
          .input("mapping_id", mapping_id)
          .input("rework_time", rework_time_value)
          .query(`
          UPDATE TrolleyRMMapping
          SET tro_id = @tro_id, 
              dest = @dest,  
              stay_place = @stay_place,
              rm_status = @rm_status,
              weight_RM = @weight_RM, 
              tray_count = @tray_count,
              rework_time = @rework_time,
              updated_at = GETDATE()
          WHERE mapping_id = @mapping_id
      `);

        if (updateRM.rowsAffected[0] === 0) {
          throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);
        }

        await transaction.request()
          .input("tro_id", license_plate)
          .query(`
          UPDATE Trolley
          SET tro_status = '0',rsrv_timestamp = null
          WHERE tro_id = @tro_id
      `);

        await transaction.request()
          .input("mapping_id", mapping_id)
          .input("receiver", recorder)
          .input("weight_RM", weightTotal)
          .input("tray_count", ntray)
          .input("edit_rework", description_rework)
          .query(`
          UPDATE History
          SET receiver_oven_edit = @receiver, 
          rework_date = GETDATE(),
          weight_RM = @weight_RM,
          tray_count = @tray_count,
          edit_rework = @edit_rework,
          updated_at = GETDATE()
          WHERE mapping_id = @mapping_id
      `);

        await transaction.commit();

        // ✅ ส่งข้อมูลผ่าน Socket.IO ไปยังห้อง saveRMForProdRoom
        const formattedData = {
          tro_id,
          license_plate,
          weightTotal,
          ntray,
          dest,
          rm_status: new_rm_status,
          updated_at: new Date()
        };

        io.to("QcCheckRoom").emit("dataUpdated", formattedData);

        return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

      } catch (err) {
        await transaction.rollback();
        console.error("SQL error:", err);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    router.get("/prep/mat/rework/getTrolleyData/:mapping_id", async (req, res) => {
      const { mapping_id } = req.params;
      const pool = await connectToDatabase();

      try {
        if (!mapping_id) {
          return res.status(400).json({ success: false, error: "Missing mapping_id parameter" });
        }

        // ดึงข้อมูล edit_rework จากตาราง History
        const result = await pool.request()
          .input("mapping_id", mapping_id)
          .query(`
        SELECT edit_rework
        FROM History
        WHERE mapping_id = @mapping_id
      `);

        if (result.recordset.length === 0) {
          return res.status(404).json({ success: false, error: "Data not found" });
        }

        return res.status(200).json({
          success: true,
          edit_rework: result.recordset[0].edit_rework
        });

      } catch (err) {
        console.error("SQL error:", err);
        res.status(500).json({ success: false, error: err.message });
      }
    });



    router.get("/prep/his/fetchRMForProd", async (req, res) => {
      try {
        const pool = await connectToDatabase();
        const result = await pool
          .request()
          .query(`
                 SELECT
                      rmf.rmfp_id,
                      rmf.batch,
                      rm.mat,
                      rm.mat_name,
                      his.dest,
                      rmm.stay_place,
                      CONCAT(p.doc_no, ' (', his.rmm_line_name, ')') AS production,
                      rmg.rm_type_id,
                      his.tro_id,
                      rmm.mapping_id,
                      rmm.level_eu,
                      his.rm_status,
                      his.weight_RM,
                      his.tray_count,
                      his.cooked_date,
                      his.withdraw_date,
					            his.receiver
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
                  JOIN
                    History his ON his.mapping_id = rmm.mapping_id
                  WHERE 
                      his.stay_place = 'จุดเตรียม' 
					            AND his.rm_status = 'รอกลับมาเตรียม'
                      AND rmf.rm_group_id = rmg.rm_group_id
                  ORDER BY his.withdraw_date DESC
              `);


        const formattedData = result.recordset.map(item => {
          const date = new Date(item.cooked_date);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          const seconds = String(date.getUTCSeconds()).padStart(2, '0');
          const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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

    router.post('/prep/batch/save', async (req, res) => {
      const { rmfp_id, batch_after } = req.body;  // ค่าที่มาจาก Frontend
      console.log("🚀 Backend รับค่า:", { rmfp_id, batch_after }); // ตรวจสอบค่าที่ Backend รับ

      try {
        const pool = await connectToDatabase();
        const result = await pool
          .request()
          .input('rmfp_id', rmfp_id)
          .query(`
          SELECT batch
          FROM RMForProd
          WHERE rmfp_id = @rmfp_id
        `);

        console.log("🚀 ค่า batch ที่ได้จากฐานข้อมูล:", result);

        const batch_before = result.recordset[0].batch;
        const final_batch_after = batch_after || batch_before; // ถ้าไม่มี batch_after ให้ใช้ batch_before

        console.log("🚀 batch_before และ batch_after ที่จะถูกบันทึก:", batch_before, final_batch_after);

        const insertResult = await pool
          .request()
          .input('batch_before', batch_before)
          .input('batch_after', final_batch_after)
          .query(`
          INSERT INTO Batch (batch_before, batch_after)
          VALUES (@batch_before, @batch_after)
        `);

        console.log("🚀 ผลการบันทึก:", insertResult);

        const batchIdResult = await pool
          .request()
          .input('batch_before', batch_before)
          .input('batch_after', final_batch_after)
          .query(`
        SELECT TOP 1 batch_id 
        FROM Batch
        WHERE batch_before = @batch_before 
          AND batch_after = @batch_after
        ORDER BY batch_id DESC
      `);

        console.log("🚀 ผลการค้นหา batch_id:", batchIdResult);
        const batch_id = batchIdResult.recordset[0].batch_id;

        // อัปเดต batch_id ในตาราง RMForProd
        const updateResult = await pool
          .request()
          .input('batch_id', batch_id)
          .input('rmfp_id', rmfp_id)
          .query(`
    UPDATE RMForProd
    SET batch_id = @batch_id
    WHERE rmfp_id = @rmfp_id
  `);
        console.log("🚀 ผลการอัปเดต:", updateResult);



        res.json({ success: true, message: 'บันทึกข้อมูล Batch สำเร็จ' });
      } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });
    module.exports = router;
    return router;
  };

  router.get("/raw-materials", async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool
        .request()
        .query(`
                SELECT TOP (1000) 
                [rm_tro_id], [rmit_date], [tro_id], [rmfp_id], [rm_mix], 
                [tro_production_id], [weight_per_tro], [ntray], [stay_place], 
                [dest], [rm_status], [process_id], [qc_id], [rm_cold_status], 
                [come_cold_date], [out_cold_date], [weight_RM], [cooked_date]
                FROM [PFCMv2].[dbo].[RMInTrolley]
                
            `);

      res.json(result.recordset);
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ error: "Database error", details: err.message });
    }
  });

  router.get("/prep/matimport/fetchRMForProd", async (req, res) => {
    try {

      const { rm_type_ids } = req.query;

      if (!rm_type_ids) {
        return res.status(400).json({ success: false, error: "RM Type IDs are required" });
      }

      const rmTypeIdsArray = rm_type_ids.split(',');
      const pool = await connectToDatabase();


      // 2. ดึงข้อมูลตามสิทธิ์ผู้ใช้
      const query = `
      SELECT
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmm.dest,
        rmm.stay_place,
        CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
        rmg.rm_type_id,
        rmm.tro_id,
        rmm.mapping_id,
        rmm.level_eu,
        htr.cooked_date,
        htr.edit_rework
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
      JOIN
        History htr ON rmm.mapping_id = htr.mapping_id
      WHERE 
        rmm.stay_place IN ('ออกห้องเย็น' ,'หม้ออบ','จุดเตรียม')
        AND rmm.dest = 'จุดเตรียม'
        AND rmm.rm_status IN ('QcCheck รอกลับมาเตรียม','QcCheck รอ MD','รอกลับมาเตรียม','รอ Qc')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
      ORDER BY
        htr.cooked_date DESC
    `;

      const result = await pool.request().query(query);

      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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



  router.post("/prep/matimport/add/saveTrolley", async (req, res) => {
    const { license_plate, batch_after, batch_before, operator, desttype, ntray, Process, weightTotal, mapping_id, dest, tro_id, cookedDateTimeNew, level_eu, preparedDateTimeNew } = req.body;
    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    console.log("New Time : ", cookedDateTimeNew);
    console.log("batch_after : ", batch_after);

    // ตรวจสอบสถานะก่อนทำรายการ
    const checkTrolley = await pool.request()
      .input("tro_id", license_plate)
      .query(`
    SELECT tro_status, rsrv_timestamp
    FROM Trolley
    WHERE tro_id = @tro_id
  `);

    if (checkTrolley.recordset.length === 0) {
      return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });
    }

    const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];

    if (tro_status !== 'rsrv') {
      return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
    }

    // ตรวจสอบว่าเกินเวลา 5 นาทีหรือไม่
    const now = new Date();
    const reservedTime = new Date(rsrv_timestamp);
    const diffMs = now - reservedTime;
    const diffMinutes = diffMs / 1000 / 60;

    if (diffMinutes > 5) {
      return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
    }



    try {
      if (!license_plate || !mapping_id) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      await transaction.begin();

      const updateTrolley1 = await transaction.request()
        .input("tro_id", tro_id)
        .query(`
         UPDATE Trolley
         SET tro_status = '1',rsrv_timestamp = null
         WHERE tro_id = @tro_id
      `);

      await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`
        UPDATE TrolleyRMMapping
        SET tro_id = null
        WHERE mapping_id = @mapping_id
        `)

      let finalBatchAfter = batch_after;
      if (batch_after === '') {
        finalBatchAfter = batch_before;
      }

      // **1️⃣ INSERT Batch ก่อนบันทึก RMInTrolley**
      const batchResult = await transaction.request()
        .input("batch_before", batch_before)
        .input("batch_after", finalBatchAfter) // ค่า batch_after ที่ส่งมาจาก request
        .query(`
          INSERT INTO Batch (batch_before, batch_after)
          OUTPUT INSERTED.batch_id
          VALUES (@batch_before, @batch_after)
      `);

      const batch_id = batchResult.recordset[0].batch_id;

      // ก่อนอัพเดต ดึงข้อมูลเดิมมาเพื่อคัดลอกค่าสำหรับสร้างรายการใหม่
      const origData = await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`
          SELECT * FROM TrolleyRMMapping WHERE mapping_id = @mapping_id
        `);

      if (origData.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);
      }

      // สร้างรายการใหม่แทนการอัพเดต
      const insertNew = await transaction.request()
        .input("tro_id", license_plate)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("dest", dest)
        .input("stay_place", 'จุดเตรียม')
        .input("rm_status", 'รอQCตรวจสอบ')
        .input("process_id", Process)
        .input("batch_id", batch_id)
        .input("rmfp_id", origData.recordset[0].rmfp_id)
        .input("tro_production_id", origData.recordset[0].tro_production_id)
        .input("qc_id", origData.recordset[0].qc_id)
        .input("level_eu", origData.recordset[0].level_eu)
        .input("prep_to_cold_time", origData.recordset[0].prep_to_cold_time)
        .input("cold_time", origData.recordset[0].cold_time)
        .input("rework_time", origData.recordset[0].rework_time)
        .input("rmm_line_name", origData.recordset[0].rmm_line_name)

        .query(`
          INSERT INTO TrolleyRMMapping (
            tro_id,
            dest,  
            stay_place,
            weight_RM, 
            tray_count,
            rm_status,
            process_id,
            batch_id,
            rmfp_id,
            tro_production_id,
            qc_id,
           level_eu,
           prep_to_cold_time,
           cold_time,
           rework_time,
           rmm_line_name,
           created_at
          )
          OUTPUT INSERTED.mapping_id
          VALUES (
            @tro_id,
            @dest,
            @stay_place,
            @weight_RM,
            @tray_count,
            @rm_status,
            @process_id,
            @batch_id,
            @rmfp_id,
            @tro_production_id,
            @qc_id,
            @level_eu,
            @prep_to_cold_time,
            @cold_time,
            @rework_time,
            @rmm_line_name,
            GETDATE()
          )
        `);

      // ได้ mapping_id ใหม่
      const new_mapping_id = insertNew.recordset[0].mapping_id;

      const origHisData = await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`
          SELECT 
          withdraw_date, 
          come_cold_date, 
          out_cold_date, 
          receiver, 
          receiver_out_cold, 
          location,
          rmm_line_name, 
          cold_dest,
          cold_to_pack_time,
          name_edit_prod_two, 
          name_edit_prod_three, 
          two_prod,
          three_prod,
          weight_RM,
          tray_count,
          qccheck_cold,
          remark_rework,
          remark_rework_cold,
          edit_rework

          FROM 
          History 
          WHERE 
          mapping_id = @mapping_id
        `);

      // อัพเดตสถานะของรายการเดิม
      // await transaction.request()
      //   .input("mapping_id", mapping_id)
      //   .query(`
      //     UPDATE TrolleyRMMapping
      //     SET rm_status = 'รอกลับมาเตรียม'
      //     WHERE mapping_id = @mapping_id
      //   `);

      await transaction.request()
        .input("tro_id", license_plate)
        .query(`
          UPDATE Trolley
          SET tro_status = '0',rsrv_timestamp = null
          WHERE tro_id = @tro_id
        `);

      // สร้างประวัติใหม่
      await transaction.request()
        .input("mapping_id", sql.Int, new_mapping_id)
        .input("receiver_prep_two", sql.NVarChar, operator)
        .input("cooked_date", cookedDateTimeNew)
        .input("rmit_date", preparedDateTimeNew)
        .input("withdraw_date", origHisData.recordset[0].withdraw_date)
        .input("come_cold_date", origHisData.recordset[0].come_cold_date)
        .input("out_cold_date", origHisData.recordset[0].out_cold_date)
        .input("receiver", origHisData.recordset[0].receiver)
        .input("receiver_out_cold", origHisData.recordset[0].receiver_out_cold)
        .input("location", origHisData.recordset[0].location)
        .input("first_prod", origHisData.recordset[0].first_prod)
        .input("two_prod", origHisData.recordset[0].two_prod)
        .input("three_prod", origHisData.recordset[0].three_prod)
        .input("name_edit_prod_two", origHisData.recordset[0].name_edit_prod_two)
        .input("name_edit_prod_three", origHisData.recordset[0].name_edit_prod_three)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("cold_dest", origHisData.recordset[0].cold_dest)
        .input("cold_to_pack_time", origHisData.recordset[0].cold_to_pack_time)
        .input("qccheck_cold", origHisData.recordset[0].qccheck_cold)
        .input("remark_rework", origHisData.recordset[0].remark_rework)
        .input("remark_rework_cold", origHisData.recordset[0].remark_rework_cold)
        .input("edit_rework", origHisData.recordset[0].edit_rework)
        .query(`
          INSERT INTO History (
            mapping_id,
            receiver_prep_two,
            rmit_date,
            cooked_date,
            withdraw_date,
            come_cold_date,
            out_cold_date,
            receiver,
            receiver_out_cold,
            location,
            first_prod,
            two_prod,
            three_prod,
            name_edit_prod_two,
            name_edit_prod_three,
            weight_RM,
            tray_count,
            cold_dest,
            cold_to_pack_time,
            qccheck_cold,
            remark_rework,
            remark_rework_cold,
            edit_rework,
            created_at
          )
          VALUES (
            @mapping_id,
            @receiver_prep_two,
            @rmit_date,
            @cooked_date,
            @withdraw_date,
            @come_cold_date,
            @out_cold_date,
            @receiver,
            @receiver_out_cold,
            @location,
            @first_prod,
            @two_prod,
            @three_prod,
            @name_edit_prod_two,
            @name_edit_prod_three,
            @weight_RM,
            @tray_count,
            @cold_dest,
            @cold_to_pack_time,
            @qccheck_cold,
            @remark_rework,
            @remark_rework_cold,
            @edit_rework,
            GETDATE()
          )
        `);
      io.to('QcCheckRoom').emit('dataUpdated', 'gotUpdated');
      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลเสร็จสิ้น",
        new_mapping_id: new_mapping_id
      });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post("/mapping/successTrolley", async (req, res) => {
    const { mapping_id } = req.body;
    const io = req.app.get("io"); // ดึง io object มาใช้

    try {
      const pool = await connectToDatabase();

      // ตรวจสอบว่า mapping_id มีอยู่จริงหรือไม่
      const checkResult = await pool.request()
        .input("mapping_id", mapping_id)
        .query("SELECT mapping_id,tro_id FROM TrolleyRMMapping WHERE mapping_id = @mapping_id");

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "ไม่พบข้อมูล mapping_id ที่ระบุ" });
      }

      let tro_id = checkResult.recordset[0].tro_id;

      // ทำการอัปเดตข้อมูล
      const result = await pool.request()
        .input("mapping_id", mapping_id)
        .query(`
        UPDATE TrolleyRMMapping
        SET stay_place = NULL, dest = NULL, rm_status = 'สำเร็จ', tro_id = NULL
        WHERE mapping_id = @mapping_id
      `);

      if (result.rowsAffected[0] === 0) {
        return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตข้อมูลได้" });
      }

      console.log("Rows affected:", result.rowsAffected[0]);

      const claerStatus = await pool.request()
        .input("tro_id", tro_id)
        .input("tro_status", 1)
        .query(`
        UPDATE Trolley
          set tro_status = @tro_status
          WHERE tro_id = @tro_id
        `)


      // ---- ส่งข้อมูลผ่าน socket ----
      const formattedData = {
        mapping_id,
        status: "สำเร็จ",
        message: "Trolley mapping marked as complete"
      };

      io.to("saveRMForProdRoom").emit("dataUpdated", formattedData);

      return res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลเสร็จสิ้น",
        updatedRows: result.rowsAffected[0]
      });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  router.get("/prep/main/fetchRMForProd", async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool
        .request()
        .query(`
                  SELECT
                    rmf.rmfp_id,
                    COALESCE(b.batch_after, rmf.batch) AS batch,
                    rm.mat,
                    rm.mat_name,
                    rmm.dest,
                    rmm.stay_place,
                    CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                    rmm.rmm_line_name,
                    rmm.tro_id,
                    rmm.mapping_id,
                    rmm.level_eu,
                    rmm.rm_status,
                    rmm.weight_RM,
                    rmm.tray_count,
                    htr.location
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
                    History htr ON rmm.mapping_id = htr.mapping_id
                WHERE 
                    rmm.tro_id IS NOT NULL
              `);


      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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

  router.get("/prep/main/fetchAllTrolleys", async (req, res) => {
    try {
      const pool = await connectToDatabase();

      // ดึงข้อมูลรถเข็นว่าง
      const emptyTrolleysResult = await pool
        .request()
        .query(`
                SELECT 
                    t.tro_id as trolley_number,
                    'รถเข็นว่าง (ห้องเย็น)' as trolley_status,
                    'อยู่ในห้องเย็น' as trolley_location,
                    cs.cs_name,
                    s.slot_id,
                    'empty' as trolley_type
                FROM 
                    Trolley t 
                JOIN 
                    Slot s ON t.tro_id = s.tro_id
                LEFT JOIN 
                    TrolleyRMMapping rmm ON t.tro_id = rmm.tro_id 
                JOIN 
                    ColdStorage cs ON s.cs_id = cs.cs_id
                WHERE 
                    t.tro_status = 0 
                AND 
                    rmm.mapping_id IS NULL
                AND 
                    s.slot_id IS NOT NULL 
                ORDER BY t.tro_id
            `);

      // ดึงข้อมูลรถเข็นที่มีวัตถุดิบ พร้อมข้อมูลที่จำเป็นสำหรับการแสดงสถานที่
      const occupiedTrolleysResult = await pool
        .request()
        .query(`
                SELECT DISTINCT
                    rmm.tro_id as trolley_number,
                    'มีวัตถุดิบ' as trolley_status,
                    rmm.dest,
                    rmm.stay_place,
                    rmm.rmm_line_name,
                    rmm.rm_status,
                    rm.mat,
                    rm.mat_name,
                    rmfp.batch,
                    CONCAT(pdt.doc_no,'(', rmm.rmm_line_name,')') AS production,

                    CONVERT(VARCHAR, htr.cooked_date, 120) AS cooked_date,
                    CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
                    htr.location,
                    'occupied' as trolley_type,
                    CASE 
                        WHEN (rmm.dest = 'เข้าห้องเย็น' OR rmm.dest = 'ไปบรรจุ') AND rmm.rm_status = 'รอQCตรวจสอบ' 
                            THEN CONCAT('รอQC ตรวจสอบ ณ ', ISNULL(htr.location, '-'))
                        WHEN rmm.dest = 'เข้าห้องเย็น' AND (rmm.rm_status = 'QcCheck' OR rmm.rm_status = 'QcCheck รอกลับมาเตรียม' OR rmm.rm_status = 'QcCheck รอ MD' OR rmm.rm_status = 'รอกลับมาเตรียม' OR rmm.rm_status = 'รอแก้ไข' OR rmm.rm_status = 'เหลือจากไลน์ผลิต') 
                            THEN 'รอห้องเย็นรับเข้า'
                        WHEN (rmm.dest = 'ไปบรรจุ' OR rmm.dest = 'บรรจุ') AND rmm.rm_status = 'QcCheck' 
                            THEN CONCAT('รอบรรจุรับ (', ISNULL(rmm.rmm_line_name, '-'), ')')
                        WHEN (rmm.dest = 'เข้าห้องเย็น' OR rmm.dest = 'จุดเตรียม') AND rmm.rm_status = 'QcCheck รอแก้ไข' 
                            THEN CONCAT('QC ส่งกลับมาแก้ไข ณ ', ISNULL(htr.location, '-'))
                        WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'ปกติ' 
                            THEN 'รออบเสร็จ'
                        WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status = 'รอแก้ไข' OR rmm.rm_status = 'รับฝาก-รอแก้ไข') 
                            THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location, '-'))
                        WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'รอแก้ไข' 
                            THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location, '-'))
                        WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status = 'รอกลับมาเตรียม' OR rmm.rm_status = 'QcCheck รอ MD') 
                            THEN CONCAT('รอกลับมาเตรียม ณ ', ISNULL(htr.location, '-'))
                        WHEN rmm.dest = 'ห้องเย็น' AND (rmm.rm_status = 'รอแก้ไข' OR rmm.rm_status = 'รอQCตรวจสอบ' OR rmm.rm_status = 'QcCheck' OR rmm.rm_status = 'QcCheck รอ MD' OR rmm.rm_status = 'รอกลับมาเตรียม' OR rmm.rm_status = 'เหลือจากไลน์ผลิต') 
                            THEN 'อยู่ในห้องเย็น'
                        ELSE '-'
                    END as trolley_location
                FROM 
                    TrolleyRMMapping rmm
                JOIN 
                    History htr ON rmm.mapping_id = htr.mapping_id
                JOIN 
                    RMForProd rmfp ON rmm.rmfp_id = rmfp.rmfp_id
                JOIN 
                    ProdRawMat prod ON rmfp.prod_rm_id = prod.prod_rm_id
                JOIN 
                    RawMat rm ON prod.mat = rm.mat
                JOIN 
                    Production pdt ON prod.prod_id = pdt.prod_id
                WHERE 
                    rmm.tro_id IS NOT NULL
                ORDER BY rmm.tro_id
            `);

      // ดึงข้อมูลรถเข็นรอจัดส่ง
      const packingTrolleysResult = await pool
        .request()
        .query(`
                SELECT 
                    pt.tro_id as trolley_number,
                    'รอบรรจุจัดส่ง' as trolley_status,
                    l.line_name as trolley_location,
                    'packing' as trolley_type
                FROM 
                    PackTrolley pt
                LEFT JOIN
                    Line l ON pt.line_tro = l.line_id
                ORDER BY pt.tro_id
            `);

      // รวมข้อมูลทั้งหมด
      const allTrolleys = [
        ...emptyTrolleysResult.recordset.map(row => ({
          trolley_number: row.trolley_number,
          batch: row.batch,
          mat: row.mat,
          mat_name: row.mat_name,
          production: row.production,
          trolley_status: row.trolley_status,
          trolley_location: row.trolley_location,
          trolley_type: row.trolley_type
        })),
        ...occupiedTrolleysResult.recordset.map(row => ({
          trolley_number: row.trolley_number,
          batch: row.batch,
          mat: row.mat,
          mat_name: row.mat_name,
          production: row.production,
          trolley_status: row.trolley_status,
          trolley_location: row.trolley_location,
          trolley_type: row.trolley_type,
          cooked_date: row.cooked_date,
          rmit_date: row.rmit_date
        })),
        ...packingTrolleysResult.recordset.map(row => ({
          trolley_number: row.trolley_number,
          batch: row.batch,
          mat: row.mat,
          mat_name: row.mat_name,
          production: row.production,
          trolley_status: row.trolley_status,
          trolley_location: row.trolley_location,
          trolley_type: row.trolley_type
        }))
      ];

      // เรียงลำดับตามหมายเลขรถเข็น
      allTrolleys.sort((a, b) => {
        const numA = parseInt(a.trolley_number) || 0;
        const numB = parseInt(b.trolley_number) || 0;
        return numA - numB;
      });

      const responseData = {
        trolleys: allTrolleys,
        summary: {
          totalEmpty: emptyTrolleysResult.recordset.length,
          totalOccupied: occupiedTrolleysResult.recordset.length,
          totalPacking: packingTrolleysResult.recordset.length,
          totalTrolleys: allTrolleys.length
        }
      };

      res.json({
        success: true,
        data: responseData
      });

    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });



  router.get("/prep/mat/rework/fetchRMForProd", async (req, res) => {
    try {
      const { rm_type_ids } = req.query;

      if (!rm_type_ids) {
        return res.status(400).json({ success: false, error: "RM Type IDs are required" });
      }

      const rmTypeIdsArray = rm_type_ids.split(',');
      const pool = await connectToDatabase();
      const result = await pool
        .request()
        .query(`
                  SELECT
                      rmf.rmfp_id,
                      b.batch_after,
                      rm.mat,
                      rm.mat_name,
                      rmm.dest,
                      rmm.stay_place,
                      CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                      rmg.rm_type_id,
                      rmm.tro_id,
                      rmm.mapping_id,
                      rmm.weight_RM,
                      rmm.level_eu,
                      rmm.tray_count,
                      rmm.rm_status,
                      CONCAT('Sensory :',' ',qc.sq_remark,' ','MD :',' ' , qc.md_remark,' ','Defect :',' ', qc.defect_remark) AS remark_qc,
                      htr.qccheck_cold,
                      htr.remark_rework,
                      htr.remark_rework_cold,
                      htr.cooked_date
                  FROM
                      RMForProd rmf
                  JOIN
                      TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
                  JOIN
                       Batch b ON rmm.batch_id = b.batch_id
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
                  JOIN
                      QC qc ON rmm.qc_id = qc.qc_id
                  JOIN
                      History htr ON rmm.mapping_id = htr.mapping_id
                 
                  WHERE 
                      rmm.stay_place IN ('ออกห้องเย็น' ,'บรรจุ','หม้ออบ','จุดเตรียม') 
                        AND rmm.dest = 'จุดเตรียม'
                        AND rmm.rm_status IN ('รอแก้ไข','QcCheck รอแก้ไข') 
                        AND rmf.rm_group_id = rmg.rm_group_id
                        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
                        ORDER BY htr.cooked_date DESC
              `);


      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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

  router.get("/prep/mat/rework/fetchRMForProdNoBatchAfter", async (req, res) => {
    try {

      const { rm_type_ids } = req.query;

      if (!rm_type_ids) {
        return res.status(400).json({ success: false, error: "RM Type IDs are required" });
      }

      const rmTypeIdsArray = rm_type_ids.split(',');

      const pool = await connectToDatabase();

      // 2. ดึงข้อมูลตามสิทธิ์ผู้ใช้
      const query = `
      SELECT
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmm.dest,
        rmm.stay_place,
        CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
        rmg.rm_type_id,
        rmm.tro_id,
        rmm.mapping_id,
        rmm.weight_RM,
        rmm.level_eu,
        rmm.tray_count,
        rmm.rm_status,
        htr.cooked_date,
        htr.qccheck_cold,
        htr.remark_rework
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
      JOIN
        History htr ON rmm.mapping_id = htr.mapping_id
      WHERE 
        rmm.stay_place IN ('ออกห้องเย็น' ,'บรรจุ','หม้ออบ','จุดเตรียม') 
        AND rmm.dest IN ('จุดเตรียม','เข้าห้องเย็น','ไปบรรจุ')
        AND rmm.rm_status IN ('รับฝาก-รอแก้ไข')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
      ORDER BY htr.cooked_date DESC
    `;

      const result = await pool.request().query(query);


      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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


  router.post("/prep/mat/rework/saveTrolley", async (req, res) => {
    const { license_plate, ntray, weightTotal, mapping_id, dest, tro_id, recorder, rm_status, edit_rework } = req.body;
    console.log("body:", req.body);

    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      if (!tro_id || !license_plate || !mapping_id) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }


        // ตรวจสอบสถานะก่อนทำรายการ
        const checkTrolley = await pool.request()
          .input("tro_id", license_plate)
          .query(`
          SELECT tro_status, rsrv_timestamp
          FROM Trolley
          WHERE tro_id = @tro_id
        `);

        if (checkTrolley.recordset.length === 0) {
          return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });
        }

        const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];

        if (tro_status !== 'rsrv') {
          return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
        }

        // ตรวจสอบว่าเกินเวลา 5 นาทีหรือไม่
        const now = new Date();
        const reservedTime = new Date(rsrv_timestamp);
        const diffMs = now - reservedTime;
        const diffMinutes = diffMs / 1000 / 60;

        if (diffMinutes > 5) {
          return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
        }


      await transaction.begin();

      await transaction.request()
        .input("tro_id", tro_id)
        .query(`
          UPDATE Trolley
          SET tro_status = '1'
          WHERE tro_id = @tro_id
      `);

      const rmGroupResult = await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`
          SELECT rmg.rm_group_id, rmg.rework, trm.rework_time
          FROM TrolleyRMMapping trm
          JOIN RMForProd rmf ON trm.rmfp_id = rmf.rmfp_id
          JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
          WHERE trm.mapping_id = @mapping_id
      `);

      let rework_time_value = null;
      let description_rework;

      if ((rm_status === 'รอแก้ไข' || rm_status === 'รับฝาก-รอแก้ไข') && edit_rework !== null && rmGroupResult.recordset.length > 0) {
        rework_time_value = rmGroupResult.recordset[0].rework_time ?? rmGroupResult.recordset[0].rework;
        description_rework = edit_rework;
      } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework !== null && rmGroupResult.recordset[0]?.rework_time !== null) {
        rework_time_value = rmGroupResult.recordset[0].rework_time;
        description_rework = edit_rework;
      } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework === null) {
        description_rework = null;
      }

      // กำหนดค่า rm_status ใหม่ตามเงื่อนไข
      let new_rm_status = 'รอQCตรวจสอบ'; // ค่าเริ่มต้น
      let destination = dest;

      // เพิ่มเงื่อนไข: ถ้า rm_status เป็น "รับฝาก-รอแก้ไข" ให้เปลี่ยนเป็น "รอกลับมาเตรียม"
      if (rm_status === 'รับฝาก-รอแก้ไข') {
        new_rm_status = 'รอกลับมาเตรียม';
        destination = 'จุดเตรียม';

      }

      const updateRM = await transaction.request()
        .input("tro_id", license_plate)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("dest", destination)
        .input("stay_place", 'จุดเตรียม')
        .input("rm_status", new_rm_status) // ใช้ค่า rm_status ใหม่ตามเงื่อนไข
        .input("mapping_id", mapping_id)
        .input("rework_time", rework_time_value)
        .query(`
          UPDATE TrolleyRMMapping
          SET tro_id = @tro_id, 
              dest = @dest,  
              stay_place = @stay_place,
              rm_status = @rm_status,
              weight_RM = @weight_RM, 
              tray_count = @tray_count,
              rework_time = @rework_time,
              updated_at = GETDATE()
          WHERE mapping_id = @mapping_id
      `);

      if (updateRM.rowsAffected[0] === 0) {
        throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);
      }

      await transaction.request()
        .input("tro_id", license_plate)
        .query(`
          UPDATE Trolley
          SET tro_status = '0'
          WHERE tro_id = @tro_id
      `);

      await transaction.request()
        .input("mapping_id", mapping_id)
        .input("receiver", recorder)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("edit_rework", description_rework)
        .query(`
          UPDATE History
          SET receiver_oven_edit = @receiver, 
          rework_date = GETDATE(),
          weight_RM = @weight_RM,
          tray_count = @tray_count,
          edit_rework = @edit_rework,
          updated_at = GETDATE()
          WHERE mapping_id = @mapping_id
      `);

      await transaction.commit();

      // ✅ ส่งข้อมูลผ่าน Socket.IO ไปยังห้อง saveRMForProdRoom
      const formattedData = {
        tro_id,
        license_plate,
        weightTotal,
        ntray,
        dest,
        rm_status: new_rm_status,
        updated_at: new Date()
      };

      io.to("QcCheckRoom").emit("dataUpdated", formattedData);

      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

    } catch (err) {
      await transaction.rollback();
      console.error("SQL error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/prep/mat/rework/getTrolleyData/:mapping_id", async (req, res) => {
    const { mapping_id } = req.params;
    const pool = await connectToDatabase();

    try {
      if (!mapping_id) {
        return res.status(400).json({ success: false, error: "Missing mapping_id parameter" });
      }

      // ดึงข้อมูล edit_rework จากตาราง History
      const result = await pool.request()
        .input("mapping_id", mapping_id)
        .query(`
        SELECT edit_rework
        FROM History
        WHERE mapping_id = @mapping_id
      `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, error: "Data not found" });
      }

      return res.status(200).json({
        success: true,
        edit_rework: result.recordset[0].edit_rework
      });

    } catch (err) {
      console.error("SQL error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });



  router.get("/prep/his/fetchRMForProd", async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool
        .request()
        .query(`
                 SELECT
                      rmf.rmfp_id,
                      rmf.batch,
                      rm.mat,
                      rm.mat_name,
                      his.dest,
                      rmm.stay_place,
                      CONCAT(p.doc_no, ' (', his.rmm_line_name, ')') AS production,
                      rmg.rm_type_id,
                      his.tro_id,
                      rmm.mapping_id,
                      rmm.level_eu,
                      his.rm_status,
                      his.weight_RM,
                      his.tray_count,
                      his.cooked_date,
                      his.withdraw_date,
					            his.receiver
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
                  JOIN
                    History his ON his.mapping_id = rmm.mapping_id
                  WHERE 
                      his.stay_place = 'จุดเตรียม' 
					            AND his.rm_status = 'รอกลับมาเตรียม'
                      AND rmf.rm_group_id = rmg.rm_group_id
              `);


      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

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

  router.post('/prep/batch/save', async (req, res) => {
    const { rmfp_id, batch_after } = req.body;  // ค่าที่มาจาก Frontend
    console.log("🚀 Backend รับค่า:", { rmfp_id, batch_after }); // ตรวจสอบค่าที่ Backend รับ

    try {
      const pool = await connectToDatabase();
      const result = await pool
        .request()
        .input('rmfp_id', rmfp_id)
        .query(`
          SELECT batch
          FROM RMForProd
          WHERE rmfp_id = @rmfp_id
        `);

      console.log("🚀 ค่า batch ที่ได้จากฐานข้อมูล:", result);

      const batch_before = result.recordset[0].batch;
      const final_batch_after = batch_after || batch_before; // ถ้าไม่มี batch_after ให้ใช้ batch_before

      console.log("🚀 batch_before และ batch_after ที่จะถูกบันทึก:", batch_before, final_batch_after);

      const insertResult = await pool
        .request()
        .input('batch_before', batch_before)
        .input('batch_after', final_batch_after)
        .query(`
          INSERT INTO Batch (batch_before, batch_after)
          VALUES (@batch_before, @batch_after)
        `);

      console.log("🚀 ผลการบันทึก:", insertResult);

      const batchIdResult = await pool
        .request()
        .input('batch_before', batch_before)
        .input('batch_after', final_batch_after)
        .query(`
        SELECT TOP 1 batch_id 
        FROM Batch
        WHERE batch_before = @batch_before 
          AND batch_after = @batch_after
        ORDER BY batch_id DESC
      `);

      console.log("🚀 ผลการค้นหา batch_id:", batchIdResult);
      const batch_id = batchIdResult.recordset[0].batch_id;

      // อัปเดต batch_id ในตาราง RMForProd
      const updateResult = await pool
        .request()
        .input('batch_id', batch_id)
        .input('rmfp_id', rmfp_id)
        .query(`
    UPDATE RMForProd
    SET batch_id = @batch_id
    WHERE rmfp_id = @rmfp_id
  `);
      console.log("🚀 ผลการอัปเดต:", updateResult);



      res.json({ success: true, message: 'บันทึกข้อมูล Batch สำเร็จ' });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  module.exports = router;
  return router;
};