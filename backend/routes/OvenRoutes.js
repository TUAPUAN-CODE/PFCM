
module.exports = (io) => {
  const express = require("express");
  const { connectToDatabase } = require("../database/db");

  const sql = require("mssql");
  const router = express.Router();

  router.get("/oven/main/fetchRMForProd", async (req, res) => {
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
      rmm.level_eu,
      CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production,
      rmf.dest,
      NULL AS tro_id,         -- ส่งค่า null
      NULL AS weight_in_trolley, -- ส่งค่า null
      NULL AS tray_count           -- ส่งค่า null
FROM
    RMForProd rmf
JOIN
    ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
JOIN
    RawMat rm ON pr.mat = rm.mat
JOIN
    Production p ON pr.prod_id = p.prod_id

JOIN
    TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
WHERE 
    rmf.stay_place = 'หม้ออบ' 
    AND rmf.dest = 'ไปจุดเตรียม';

    `);
      const formattedData = result.recordset.map(item => {
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
      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/oven/main/fetchRMInTrolley", async (req, res) => {
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
                      rmm.dest,
                      rmm.stay_place,
                      rmm.level_eu,
                      CONCAT(p.doc_no, ' (', rmf.rmfp_line_name, ')') AS production,
                      rmm.tro_id,
                      rmm.weight_RM,
                      rmm.tray_count,
                      rmm.mapping_id,
                      rmm.rm_status
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

                  WHERE 
                      rmm.stay_place = 'หม้ออบ' 
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




  router.post("/oven/saveRMForProd", async (req, res) => {
    const {
      mat,
      batch,
      productId,
      line_name,
      hu,
      groupId = [],   // default เป็น empty array
      weight,
      operator,
      withdraw,
      datetime: receiveDT,
      receiver,
      userID,
      Dest,
      level_eu,
      emulsion = "false",
      batchmix = "false"
    } = req.body;
    if (!(emulsion === "true" || batchmix === "true")) {
      if (!Array.isArray(groupId) || groupId.length === 0) {
        return res.status(400).json({
          success: false,
          message: "groupId ต้องเป็น array และมีข้อมูลอย่างน้อย 1 รายการ"
        });
      }
    }

    let transaction;
    let timeoutHandle;

    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      const TIMEOUT_MS = 10000;
      timeoutHandle = setTimeout(async () => {
        if (transaction) {
          console.log("Transaction timeout - ทำการ rollback อัตโนมัติ");
          try { await transaction.rollback(); } catch (err) { console.error(err); }
        }
      }, TIMEOUT_MS);

      // ดึง prod_rm_id
      const result = await transaction.request()
        .input("productId", productId)
        .input("mat", mat)
        .query(`
        SELECT prod_rm_id
        FROM ProdRawMat
        WHERE prod_Id = @productId AND mat = @mat
      `);

      if (result.recordset.length === 0) {
        throw new Error("ไม่พบข้อมูล prod_rm_id สำหรับ productId และ mat ที่ระบุ");
      }

      const ProdrmID = result.recordset[0].prod_rm_id;

      // ฟังก์ชัน insert RMForProd (เฉพาะกรณีมี groupId)
      const insertRMForProd = async (groupID, stayPlace) => {
        if (!groupID || groupID.length === 0) return; // skip ถ้า empty (emulsion/batchmix)

        for (let i = 0; i < groupID.length; i++) {
          if (!groupID[i]) throw new Error(`groupId ที่ตำแหน่ง ${i} ไม่ถูกต้อง`);

          const rmfpResult = await transaction.request()
            .input("prod_rm_id", ProdrmID)
            .input("rm_group_id", groupID[i])
            .input("batch", batch)
            .input("weight", weight)
            .input("stay_place", stayPlace)
            .input("dest", Dest)
            .input("rmfp_line_name", line_name)
            .input("hu", hu)
            .input("level_eu", level_eu !== "-" ? level_eu : null)
            .query(`
            INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu,hu)
            OUTPUT INSERTED.rmfp_id
            VALUES (@prod_rm_id, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu,@hu)
          `);

          const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

          const SELECT_Production = await transaction.request()
            .input("rmfp_id", RMFP_ID)
            .query(`
            SELECT CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production
            FROM RMForProd rmf
            JOIN ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
            JOIN RawMat rm ON pr.mat = rm.mat
            JOIN Production p ON pr.prod_id = p.prod_id
            WHERE rmfp_id = @rmfp_id
          `);

          const production = SELECT_Production.recordset[0].production;

          const historyResult = await transaction.request()
            .input("receiver", receiver)
            .input("withdraw", withdraw)
            .input("cooked_date", receiveDT)
            .input("first_prod", production)
            .query(`
            INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod)
            OUTPUT INSERTED.hist_id
            VALUES (@receiver, @withdraw, @cooked_date, @first_prod)
          `);

          const histID = historyResult.recordset[0].hist_id;

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

      // เลือก stayPlace ตาม Dest
      let stayPlace;
      if (Dest === "เข้าห้องเย็น-รอรถเข็น" || Dest === "ไปจุดเตรียม") {
        stayPlace = "หม้ออบ";
      } else if (Dest === "จุดเตรียม") {
        stayPlace = "จุดเตรียมรับเข้า";
      } else {
        throw new Error("สถานที่จัดส่ง (Dest) ไม่ถูกต้อง");
      }

      // เรียก insert RMForProd เฉพาะกรณีไม่ใช่ emulsion/batchmix หรือ groupId มีค่า
      await insertRMForProd(groupId, stayPlace);

      await transaction.commit();
      clearTimeout(timeoutHandle);

      res.json({ success: true, message: "บันทึกข้อมูลการแสกนเสร็จสิ้น" });

    } catch (err) {
      if (transaction) {
        try { await transaction.rollback(); console.log("Rollback transaction เนื่องจากเกิดข้อผิดพลาด"); }
        catch (rollbackErr) { console.error("Error during rollback:", rollbackErr); }
      }
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.error("SQL error", err);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล", error: err.message });
    }
  });


  router.get("/oven/toCold/fetchRMForProd", async (req, res) => {
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
            CONCAT(p.doc_no, ' (', rmf.rmfp_line_name, ')') AS production,
            rmg.rm_type_id,
            htr.cooked_date,
            rmg.rm_group_name,
            rmf.level_eu
           
          FROM
            RMForProd rmf
          JOIN
            ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
          JOIN
            RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
          JOIN
            RawMat rm ON pr.mat = rm.mat
          JOIN
            Production p ON pr.prod_id = p.prod_id
          JOIN
            History htr ON rmf.hist_id_rmfp = htr.hist_id
          WHERE 
            rmf.stay_place = 'หม้ออบ' 
            AND rmf.dest = 'เข้าห้องเย็น-รอรถเข็น'
    `);
      const formattedData = result.recordset.map(item => {
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
      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post("/oven/saveRMForEmu/for/emulsion", async (req, res) => {
    const {
      mat,
      batch,
      line_name,
      Emulsion = "false",
      groupId = [],
      weight,
      operator,
      withdraw,
      datetime: receiveDT,
      receiver,
      userID,
      Dest,
      level_eu = null, // ✅ ถ้าไม่ได้ส่งมาเป็น null
      emu_status
    } = req.body;

    // Validation field พื้นฐาน
    if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
      return res.status(400).json({ success: false, message: "กรุณากรอกน้ำหนักที่ถูกต้อง" });
    }

    if (!operator || !withdraw || !Dest || !receiver) {
      return res.status(400).json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // Validation groupId เฉพาะกรณีไม่ใช่ emulsion
    if (Emulsion !== "true") {
      if (!Array.isArray(groupId) || groupId.length === 0) {
        return res.status(400).json({ success: false, message: "groupId ไม่ถูกต้อง หรือไม่ได้ส่งมา" });
      }
    }

    let transaction;
    let timeoutHandle;

    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      const TIMEOUT_MS = 10000;
      timeoutHandle = setTimeout(async () => {
        if (transaction) {
          console.log("Transaction timeout - ทำการ rollback อัตโนมัติ");
          try { await transaction.rollback(); } catch (err) { console.error(err); }
        }
      }, TIMEOUT_MS);

      const insertRMForEmu = async (groupID, stayPlace) => {
        const groupArr = Array.isArray(groupID) ? groupID : [groupID];

        if (!groupArr || groupArr.length === 0 || groupArr.every(v => !v)) return;

        for (let i = 0; i < groupArr.length; i++) {
          if (!groupArr[i]) continue; // skip null/undefined

          const rmfemuResult = await transaction.request()
            .input("rm_group_id", groupArr[i])
            .input("batch", batch)
            .input("mat", mat)
            .input("weight", weight)
            .input("rmfp_line_name", line_name || "")
            .input("stay_place", stayPlace)
            .input("dest", Dest)
            .input("level_eu", level_eu !== "-" ? level_eu : null) // ✅ ส่ง null ถ้าไม่มีค่า
            .input("emu_status", emu_status || "1")
            .query(`
            INSERT INTO RMForEmu (mat, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu, emu_status)
            OUTPUT INSERTED.rmfemu_id
            VALUES (@mat, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu, @emu_status)
          `);

          const RMFEMU_ID = rmfemuResult.recordset[0].rmfemu_id;

          const historyResult = await transaction.request()
            .input("receiver", receiver)
            .input("withdraw", withdraw)
            .input("cooked_date", receiveDT)
            .input("first_prod", "Emulsion")
            .query(`
            INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod)
            OUTPUT INSERTED.hist_id
            VALUES (@receiver, @withdraw, @cooked_date, @first_prod)
          `);

          const histID = historyResult.recordset[0].hist_id;

          await transaction.request()
            .input("hist_id", histID)
            .input("rmfemu_id", RMFEMU_ID)
            .query(`
            UPDATE RMForEmu 
            SET hist_id_rmfemu = @hist_id
            WHERE rmfemu_id = @rmfemu_id
          `);
        }
      };

      let stayPlace;
      if (Dest === "เข้าห้องเย็น-รอรถเข็น" || Dest === "ไปจุดเตรียม") stayPlace = "หม้ออบ";
      else if (Dest === "จุดเตรียม") stayPlace = "จุดเตรียมรับเข้า";
      else throw new Error("สถานที่จัดส่ง (Dest) ไม่ถูกต้อง");

      await insertRMForEmu(groupId, stayPlace);

      await transaction.commit();
      clearTimeout(timeoutHandle);

      res.json({ success: true, message: "บันทึกข้อมูลการสแกนเสร็จสิ้น" });

    } catch (err) {
      if (transaction) { try { await transaction.rollback(); console.log("Rollback transaction"); } catch (e) { console.error(e); } }
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.error(err);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล", error: err.message });
    }
  });



  router.post("/oven/saveRMMixBatch/for/BatchMIX", async (req, res) => {
    const {
      mat,
      batch,
      line_name,
      BatchMix = "false",
      groupId = [],
      weight,
      operator,
      withdraw,
      datetime: receiveDT,
      receiver,
      userID,
      Dest,
      level_eu = null // ✅ ถ้าไม่ได้ส่งมาเป็น null
    } = req.body;

    if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
      return res.status(400).json({ success: false, message: "กรุณากรอกน้ำหนักที่ถูกต้อง" });
    }

    if (!operator || !withdraw || !Dest || !receiver) {
      return res.status(400).json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    if (BatchMix !== "true") {
      if (!Array.isArray(groupId) || groupId.length === 0) {
        return res.status(400).json({ success: false, message: "groupId ไม่ถูกต้อง หรือไม่ได้ส่งมา" });
      }
    }

    let transaction;
    let timeoutHandle;

    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      const TIMEOUT_MS = 10000;
      timeoutHandle = setTimeout(async () => {
        if (transaction) { try { await transaction.rollback(); } catch (e) { console.error(e); } }
      }, TIMEOUT_MS);

      const insertRMMixBatch = async (groupID, stayPlace) => {
        const groupArr = Array.isArray(groupID) ? groupID : [groupID];
        if (!groupArr || groupArr.length === 0 || groupArr.every(v => !v)) return;

        for (let i = 0; i < groupArr.length; i++) {
          if (!groupArr[i]) continue; // ✅ skip element ที่ null/undefined

          const rmmbatchResult = await transaction.request()
            .input("rm_group_id", groupArr[i])
            .input("batch", batch)
            .input("mat", mat)
            .input("weight", weight)
            .input("rmfp_line_name", line_name || "")
            .input("stay_place", stayPlace)
            .input("dest", Dest)
            .input("level_eu", level_eu !== "-" ? level_eu : null) // ✅ ส่ง null ถ้าไม่มีค่า
            .input("b_status", "1")
            .query(`
            INSERT INTO RMMixBatch (mat, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu, b_status)
            OUTPUT INSERTED.rmfbatch_id
            VALUES (@mat, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu, @b_status)
          `);

          const RMFBATCH_ID = rmmbatchResult.recordset[0].rmfbatch_id;

          const historyResult = await transaction.request()
            .input("receiver", receiver)
            .input("withdraw", withdraw)
            .input("cooked_date", receiveDT)
            .input("first_prod", "BatchMix")
            .query(`
            INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod)
            OUTPUT INSERTED.hist_id
            VALUES (@receiver, @withdraw, @cooked_date, @first_prod)
          `);

          const histID = historyResult.recordset[0].hist_id;

          await transaction.request()
            .input("hist_id", histID)
            .input("rmfbatch_id", RMFBATCH_ID)
            .query(`
            UPDATE RMMixBatch
            SET hist_id_rmfbatch = @hist_id
            WHERE rmfbatch_id = @rmfbatch_id
          `);
        }
      };

      let stayPlace;
      if (Dest === "เข้าห้องเย็น-รอรถเข็น" || Dest === "ไปจุดเตรียม") stayPlace = "หม้ออบ";
      else if (Dest === "จุดเตรียม") stayPlace = "จุดเตรียมรับเข้า";
      else throw new Error("สถานที่จัดส่ง (Dest) ไม่ถูกต้อง");

      await insertRMMixBatch(groupId, stayPlace);

      await transaction.commit();
      clearTimeout(timeoutHandle);

      res.json({ success: true, message: "บันทึกข้อมูลการสแกน Batch เสร็จสิ้น" });

    } catch (err) {
      if (transaction) { try { await transaction.rollback(); } catch (e) { console.error(e); } }
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.error(err);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล", error: err.message });
    }
  });




  router.post("/oven/toCold/saveTrolley", async (req, res) => {
    const { license_plate, rmfpID, ntray, weightTotal, recorder, userID, level_eu } = req.body;
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);
    let timeoutHandle;

    try {
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
      const diffMinutes = (now - reservedTime) / 1000 / 60;

      if (diffMinutes > 5) {
        return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
      }

      // เริ่ม transaction
      await transaction.begin();

      // ตั้ง timeout rollback อัตโนมัติ (เช่น 10 วินาที)
      const TIMEOUT_MS = 10000;
      timeoutHandle = setTimeout(async () => {
        console.log("Transaction timeout - ทำการ rollback อัตโนมัติ");
        await transaction.rollback();
      }, TIMEOUT_MS);

      const dataRMForProd = await transaction.request()
        .input("rmfp_id", rmfpID)
        .query(`
        SELECT prod_rm_id, stay_place, dest, hist_id_rmfp, rmfp_line_name, level_eu
        FROM RMForProd
        WHERE rmfp_id = @rmfp_id
      `);

      if (dataRMForProd.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูล RMForProd สำหรับ rmfp_id: ${rmfpID}`);
      }

      const hist_id_rmfp = dataRMForProd.recordset[0].hist_id_rmfp;
      if (!hist_id_rmfp) throw new Error("ไม่พบข้อมูล hist_id_rmfp ใน RMForProd");

      const dataHisRMForProd = await transaction.request()
        .input("hist_id", hist_id_rmfp)
        .query(`
        SELECT withdraw_date, cooked_date, name_edit_prod_two, name_edit_prod_three, first_prod, two_prod, three_prod
        FROM History
        WHERE hist_id = @hist_id
      `);

      if (dataHisRMForProd.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูล History สำหรับ hist_id: ${hist_id_rmfp}`);
      }

      const cooked_date = dataHisRMForProd.recordset[0].cooked_date;
      const withdraw_date = dataHisRMForProd.recordset[0].withdraw_date;
      if (!cooked_date || !withdraw_date) throw new Error("ไม่พบข้อมูลวันที่ (cooked_date หรือ withdraw_date) ใน History");

      // Insert TrolleyRMMapping
      const result = await transaction.request()
        .input("tro_id", license_plate)
        .input("rmfp_id", rmfpID)
        .input("tro_production_id", dataRMForProd.recordset[0].prod_rm_id)
        .input("rm_status", "รอกลับมาเตรียม")
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("stay_place", dataRMForProd.recordset[0].stay_place)
        .input("dest", "เข้าห้องเย็น")
        .input("level_eu", dataRMForProd.recordset[0].level_eu)
        .input("rmm_line_name", dataRMForProd.recordset[0].rmfp_line_name)
        .input("tl_status", "1.3")

        .query(`
        INSERT INTO TrolleyRMMapping (tro_id, rmfp_id, tro_production_id, stay_place, dest, rm_status, weight_RM, tray_count, level_eu, rmm_line_name,tl_status)
        OUTPUT INSERTED.mapping_id
        VALUES (@tro_id, @rmfp_id, @tro_production_id, @stay_place, @dest, @rm_status, @weight_RM, @tray_count, @level_eu, @rmm_line_name,@tl_status)
      `);

      if (!result.recordset || result.recordset.length === 0) throw new Error("ไม่สามารถ insert TrolleyRMMapping");

      const mapping_id = result.recordset[0].mapping_id;

      // Insert History
      const historyResult = await transaction.request()
        .input("mapping_id", mapping_id)
        .input("cooked_date", cooked_date)
        .input("withdraw_date", withdraw_date)
        .input("receiver", recorder)
        .input("location", 'หม้ออบ')
        .input("first_prod", dataHisRMForProd.recordset[0].first_prod)
        .input("two_prod", dataHisRMForProd.recordset[0].two_prod)
        .input("three_prod", dataHisRMForProd.recordset[0].three_prod)
        .input("name_edit_prod_two", dataHisRMForProd.recordset[0].name_edit_prod_two)
        .input("name_edit_prod_three", dataHisRMForProd.recordset[0].name_edit_prod_three)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("dest", "เข้าห้องเย็น")
        .query(`
        INSERT INTO History (mapping_id, cooked_date, withdraw_date, receiver, location, first_prod, two_prod, three_prod, name_edit_prod_two, name_edit_prod_three, weight_RM, tray_count, dest)
        OUTPUT INSERTED.hist_id
        VALUES (@mapping_id, @cooked_date, @withdraw_date, @receiver, @location, @first_prod, @two_prod, @three_prod, @name_edit_prod_two, @name_edit_prod_three, @weight_RM, @tray_count, @dest)
      `);

      if (!historyResult.recordset || historyResult.recordset.length === 0) throw new Error("ไม่สามารถ insert History");

      const hist_id = historyResult.recordset[0].hist_id;

      // Update Trolley
      const updateTrolley = await transaction.request()
        .input("tro_id", license_plate)
        .query(`
        UPDATE Trolley
        SET tro_status = '0', rsrv_timestamp = NULL
        WHERE tro_id = @tro_id
      `);

      if (updateTrolley.rowsAffected[0] !== 1) throw new Error("ไม่สามารถอัปเดต Trolley");

      // Commit transaction
      await transaction.commit();
      clearTimeout(timeoutHandle);

      // ส่งข้อมูลไปยังห้องผ่าน socket.io
      const formattedData = {
        rmfpID,
        license_plate,
        weightTotal,
        ntray,
        cooked_date,
        withdraw_date,
        level_eu,
        line_name: dataRMForProd.recordset[0].rmfp_line_name,
      };
      io.to("saveRMForProdRoom").emit("dataUpdated", formattedData);

      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

    } catch (err) {
      if (transaction) await transaction.rollback();
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  router.get("/oven/continue/fetchRMForProd", async (req, res) => {
    try {

      const pool = await connectToDatabase();

      const result = await pool.request()
        .query(`
    SELECT
      rmf.rmfp_id,
      rmf.batch,
      rmf.ntray,
      rmf.weight,
      rm.mat,
      rm.mat_name,
      CONCAT(p.doc_no, ' (', rmf.rmfp_line_name, ')') AS production,
      rmg.oven_to_cold
    FROM
      RMForProd rmf
    JOIN
      ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
    JOIN
      RawMat rm ON pr.mat = rm.mat
    JOIN
      Production p ON pr.prod_id = p.prod_id
    JOIN
      Line l ON p.line_type_id = l.line_id
    JOIN
      RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
    JOIN
      RawMatGroup rmg ON rmcg.rm_group_id = rmg.rm_group_id
    WHERE 
      rmf.stay_place IN ('จุดเตรียม', 'ออกห้องเย็น')
      AND rmf.dest = 'หม้ออบ'
      AND rmf.rm_status = 'ปกติ';
    `)

      console.log(result.recordset);

      // แปลง cooked_date ให้เป็นรูปแบบที่ต้องการโดยไม่ปรับเวลา
      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);

        // ใช้ toISOString เพื่อให้ได้รูปแบบที่ไม่ปรับเวลา
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

        // ใส่ค่าที่แปลงแล้วใน object เดิม
        item.CookedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;

        // ลบ cooked_date เดิม
        delete item.cooked_date;

        return item;
      });

      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  })

  /**
   * @swagger
   * /api/oven/continue/saveTrolley:
   *    put:
   *      summary: อัปเดตข้อมูลการเลือกรถเข็นสำหรับวัตถุดิบ
   *      description: 
   *        - อัปเดตข้อมูลวัตถุดิบที่กำลังไปห้องเย็น รวมถึงการเลือกรถเข็นใหม่
   *        - อัปเดตรถเข็นเดิมให้ว่าง และอัปเดตน้ำหนักรวมของรถเข็นใหม่
   *      tags: 
   *        - Oven
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              required:
   *                - license_plate
   *                - rmfpID
   *                - weight
   *                - ntray
   *                - weightTotal
   *                - Dest
   *              properties:
   *                license_plate:
   *                  type: string
   *                  description: หมายเลขทะเบียนรถเข็นที่เลือก
   *                  example: "0000"
   *                rmfpID:
   *                  type: integer
   *                  description: รหัสวัตถุดิบเพื่อการผลิต
   *                  example: 000
   *                weight:
   *                  type: number
   *                  description: น้ำหนักของวัตถุดิบ
   *                  example: 00
   *                ntray:
   *                  type: integer
   *                  description: จำนวนถาดที่ใช้
   *                  example: 0
   *                weightTotal:
   *                  type: number
   *                  description: น้ำหนักรวมของรถเข็นหลังเพิ่มวัตถุดิบ
   *                  example: 000
   *                Dest:
   *                  type: string
   *                  description: จุดหมายปลายทางของวัตถุดิบ
   *                  example: ""
   *      responses:
   *        200:
   *          description: บันทึกข้อมูลสำเร็จ
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
   *                    example: "บันทึกข้อมูลเสร็จสิ้น"
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
  // router.put("/oven/continue/saveTrolley", async (req, res) => {
  //   const { license_plate, rmfpID, weight, ntray, weightTotal, Dest } = req.body;
  //   try {
  //     const pool = await connectToDatabase();


  //     await pool.request()
  //       .input("rmfp_id", rmfpID)
  //       .input("weight", weight)
  //       .input("ntray", ntray)
  //       .input("stay_place", "หม้ออบ")
  //       .input("dest", Dest)
  //       .query(`
  //         UPDATE
  //           RMForProd
  //         SET
  //           weight = @weight,
  //           ntray = @ntray,
  //           stay_place = @stay_place,
  //           dest = @dest,
  //           cooked_date = GETDATE()
  //         WHERE
  //           rmfp_id = @rmfp_id
  //   `);

  //     const OldTrolley = await pool.request()
  //       .input("rmfp_id", rmfpID)
  //       .query(`
  //       SELECT
  //         tro_id
  //       FROM
  //         RMInTrolley
  //       WHERE
  //         rmfp_id = @rmfp_id
  //   `)

  //     await pool.request()
  //       .input("tro_id", OldTrolley.recordset[0].tro_id)
  //       .query(`
  //     UPDATE
  //       Trolley
  //     SET
  //       tro_status = 1,
  //       weight_total = NULL
  //     WHERE
  //       tro_id = @tro_id
  //   `)

  //     //อัปเดตข้อมูลในตาราง RMInTrolley ได้แก่ เวลาเลือกรถเข็น และรถเข็นที่คันใหม่
  //     await pool.request()
  //       .input("tro_id", license_plate)
  //       .input("rmfp_id", rmfpID)
  //       .query(`
  //       UPDATE
  //         RMInTrolley
  //       SET
  //         tro_id = @tro_id,
  //         rmit_date = GETDATE()
  //       WHERE
  //         rmfp_id = @rmfp_id
  //   `)

  //     //อัปเดตข้อมูลในตาราง Trolley ได้แก่ น้ำหนักรวมรถเข็น และสถานที่ของรถเข็น
  //     await pool.request()
  //       .input("weight_total", weightTotal)
  //       .input("tro_id", license_plate)
  //       .query(`
  //       Update 
  //         Trolley
  //       Set
  //         tro_status = '0',
  //         weight_total = @weight_total
  //       Where
  //         tro_id = @tro_id
  //   `)

  //   await transaction.request()
  //   .input("rm_tro_id", rm_tro_id)
  //   .query(`
  //     Insert into History (rm_tro_id,cooked_date)
  //     values (@rm_tro_id,GETDATE())
  // `)

  //   await transaction.request()
  //   .input("rm_tro_id", rm_tro_id)
  //   .input("recorder", recorder)
  //   .input("location", location)
  //   .query(`
  //     Insert into HistoryOven (rm_tro_id,recorder,location)
  //     values (@rm_tro_id,@recorder,@location)
  // `)

  //     return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });
  //   } catch (err) {
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });

  // router.put("/oven/rework/saveTrolley", async (req, res) => {

  //   const { license_plate, rmfpID, weight, ntray, weightTotal, Dest } = req.body;
  //   try {
  //     const pool = await connectToDatabase();

  //     // อัปเดตข้อมูลในตาราง RMForProd ได้แก่ น้ำหนักรวมวัตถุและจำนวนถาด
  //     await pool.request()
  //       .input("rmfp_id", rmfpID)
  //       .input("weight", weight)
  //       .input("ntray", ntray)
  //       .input("stay_place", "หม้ออบ")
  //       .input("dest", Dest)
  //       .query(`
  //         UPDATE
  //           RMForProd
  //         SET
  //           weight = @weight,
  //           ntray = @ntray,
  //           stay_place = @stay_place,
  //           dest = @dest,
  //           cooked_date = GETDATE()
  //         WHERE
  //           rmfp_id = @rmfp_id
  //   `);

  //     const OldTrolley = await pool.request()
  //       .input("rmfp_id", rmfpID)
  //       .query(`
  //       SELECT
  //         tro_id
  //       FROM
  //         RMInTrolley
  //       WHERE
  //         rmfp_id = @rmfp_id
  //   `)

  //     await pool.request()
  //       .input("tro_id", OldTrolley.recordset[0].tro_id)
  //       .query(`
  //     UPDATE
  //       Trolley
  //     SET
  //       tro_status = 1,
  //       weight_total = NULL
  //     WHERE
  //       tro_id = @tro_id
  //   `)

  //     //อัปเดตข้อมูลในตาราง RMInTrolley ได้แก่ เวลาเลือกรถเข็น และรถเข็นที่คันใหม่
  //     await pool.request()
  //       .input("tro_id", license_plate)
  //       .input("rmfp_id", rmfpID)
  //       .query(`
  //       UPDATE
  //         RMInTrolley
  //       SET
  //         tro_id = @tro_id,
  //         rmit_date = GETDATE()
  //       WHERE
  //         rmfp_id = @rmfp_id
  //   `)

  //     //อัปเดตข้อมูลในตาราง Trolley ได้แก่ น้ำหนักรวมรถเข็น และสถานที่ของรถเข็น
  //     await pool.request()
  //       .input("weight_total", weightTotal)
  //       .input("tro_id", license_plate)
  //       .query(`
  //       Update 
  //         Trolley
  //       Set
  //         tro_status = '0',
  //         weight_total = @weight_total
  //       Where
  //         tro_id = @tro_id
  //   `)

  //     return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });
  //   } catch (err) {
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // })

  router.get("/oven/mat/rework/fetchRMForProd", async (req, res) => {
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
                      rmm.dest,
                      rmm.stay_place,
                      CONCAT(p.doc_no, ' (', rmf.rmfp_line_name, ')') AS production,
                      rmg.rm_type_id,
                      rmm.tro_id,
                      rmm.mapping_id,
                      rmm.rm_status,
                      htr.cooked_date,
                      htr.remark_pack_edit
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
                      History htr ON  rmm.mapping_id = htr.mapping_id
                  WHERE 
                      rmm.stay_place IN ('ออกห้องเย็น','บรรจุ','จุดเตรียม') 
                      AND rmm.dest IN ('หม้ออบ')
                      AND rmm.rm_status IN ('รอแก้ไข','QcCheck รอแก้ไข') 
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

  // router.get("/oven/mat/rework/fetchRMForProdHaveBatchID", async (req, res) => {
  //   try {
  //     const pool = await connectToDatabase();
  //     const result = await pool
  //       .request()
  //       .query(`
  //                 SELECT
  //                     rmf.rmfp_id,
  //                     b.batch_before,
  //                     b.batch_after,
  //                     rm.mat,
  //                     rm.mat_name,
  //                     rmm.dest,
  //                     rmm.stay_place,
  //                     CONCAT(p.doc_no, ' (',rmm.rmm_line_name, ')') AS production,
  //                     rmg.rm_type_id,
  //                     rmm.tro_id,
  //                     rmm.level_eu,
  //                     rmm.mapping_id,
  //                     rmm.rm_status,
  //                     CONCAT('Sensory :',' ',qc.sq_remark,' ','MD :',' ' , qc.md_remark,' ','Defect :',' ', qc.defect_remark) AS remark_qc,
  //                     htr.cooked_date,
  //                     htr.remark_pack_edit
  //                 FROM
  //                     RMForProd rmf
  //                 JOIN
  //                     TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
  //                 JOIN
  //                     ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
  //                 JOIN
  //                     RawMat rm ON pr.mat = rm.mat
  //                 JOIN
  //                     Production p ON pr.prod_id = p.prod_id
  //                 JOIN
  //                     RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
  //                 JOIN
  //                     RawMatGroup rmg ON rmcg.rm_group_id = rmg.rm_group_id
  //                 JOIN
  //                     QC qc ON rmm.qc_id = qc.qc_id
  //                 JOIN
  //                     History htr ON  rmm.mapping_id = htr.mapping_id
  //                 JOIN
  //                     BATCH b ON rmm.batch_id = b.batch_id
  //                 WHERE 
  //                     rmm.stay_place IN ('ออกห้องเย็น','บรรจุ','จุดเตรียม') 
  //                     AND rmm.dest IN ('หม้ออบ')
  //                     AND rmm.rm_status IN ('รอแก้ไข','QcCheck รอแก้ไข') 
  //                     AND rmf.rm_group_id = rmg.rm_group_id
  //             `);



  //     const formattedData = result.recordset.map(item => {
  //       const date = new Date(item.cooked_date);
  //       const year = date.getUTCFullYear();
  //       const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  //       const day = String(date.getUTCDate()).padStart(2, '0');
  //       const hours = String(date.getUTCHours()).padStart(2, '0');
  //       const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  //       const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  //       const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

  //       item.CookedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;

  //       delete item.cooked_date;

  //       return item;
  //     });

  //     res.json({ success: true, data: formattedData });
  //   } catch (err) {
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });

  // router.post("/oven/mat/rework/saveTrolley", async (req, res) => {
  //   const { license_plate, ntray, weightTotal, mapping_id, recorder, dest, tro_id,rm_status } = req.body;
  //   const sql = require("mssql");
  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);

  //   try {
  //     // ตรวจสอบค่าที่รับมาว่ามีค่าไม่เป็น undefined หรือ null
  //     if (!tro_id || !license_plate || !mapping_id) {
  //       return res.status(400).json({ success: false, error: "Missing required fields" });
  //     }

  //     await transaction.begin();

  //     // ✅ 1. อัปเดตสถานะของรถเข็นที่กำลังใช้งาน
  //     await transaction.request()
  //       .input("tro_id", tro_id)
  //       .query(`
  //         UPDATE Trolley
  //         SET tro_status = '1'
  //         WHERE tro_id = @tro_id
  //       `);

  //       // ดึงข้อมูล rm_group_id และ rework จากตาราง RawMatGroup
  //     const rmGroupResult = await transaction.request()
  //     .input("mapping_id", mapping_id)
  //     .query(`
  //       SELECT rmg.rm_group_id, rmg.rework , trm.rework_time
  //       FROM TrolleyRMMapping trm
  //       JOIN RMForProd rmf ON trm.rmfp_id = rmf.rmfp_id
  //       JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
  //       WHERE trm.mapping_id = @mapping_id
  //     `);

  //   let rework_time_value = null;

  //   // ตรวจสอบสถานะวัตถุดิบและกำหนดค่า rework_time
  //   if (rm_status === 'รอแก้ไข' || rm_status === 'รับฝาก-รอแก้ไข') {
  //     if (rmGroupResult.recordset.length > 0) {
  //       if (rmGroupResult.recordset[0].rework_time !== null) {
  //         rework_time_value = rmGroupResult.recordset[0].rework_time;
  //       } else {
  //         // ถ้ายังไม่มี ใช้ค่า rework จาก RawMatGroup
  //         rework_time_value = rmGroupResult.recordset[0].rework;
  //       }
  //     }
  //   }else if(rm_status === 'QcCheck รอแก้ไข' && rmGroupResult.recordset[0].rework_time !== null){
  //       rework_time_value = rmGroupResult.recordset[0].rework_time;
  //   }

  //   console.log("rework_time_value :",rework_time_value)

  //     // ✅ 2. อัปเดตข้อมูลใน RMInTrolley
  //     await transaction.request()
  //       .input("tro_id", license_plate)
  //       .input("weight_in_trolley", weightTotal)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("dest", dest)
  //       .input("stay_place", 'หม้ออบ')
  //       .input("rm_status", 'รอQCตรวจสอบ')
  //       .input("mapping_id", mapping_id)
  //       .input("rework_time", rework_time_value)
  //       .query(`
  //         UPDATE TrolleyRMMapping
  //         SET 
  //             tro_id = @tro_id, 
  //             dest = @dest,  
  //             stay_place = 'หม้ออบ',
  //             weight_in_trolley = @weight_in_trolley,
  //             weight_RM = @weight_RM, 
  //             rm_status = @rm_status, 
  //             tray_count = @tray_count,
  //             rework_time = @rework_time
  //         WHERE mapping_id = @mapping_id
  //       `);

  //     // ดึง qc_id จาก RMInTrolley
  //     const qcResult = await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`SELECT qc_id FROM TrolleyRMMapping WHERE mapping_id = @mapping_id`);

  //     const qc_id = qcResult.recordset.length > 0 ? qcResult.recordset[0].qc_id : null;

  //     // หาก qc_id มีค่า, อัปเดตข้อมูลใน QC
  //     if (qc_id) {
  //       await transaction.request()
  //         .input("qc_id", qc_id)
  //         .query(`
  //           UPDATE QC
  //           SET 
  //             md_remark = null, 
  //             sq_remark = null,
  //             defect_remark = null
  //           FROM QC
  //           INNER JOIN TrolleyRMMapping ON QC.qc_id = TrolleyRMMapping.qc_id
  //           WHERE QC.qc_id = @qc_id;
  //         `);
  //     }

  //     // เช็คว่ามีการอัปเดต RMInTrolley หรือไม่
  //     if (qcResult.rowsAffected[0] === 0) {
  //       throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);
  //     }

  //     // ✅ 3. อัปเดตสถานะของ Trolley เป็น '0'
  //     await transaction.request()
  //       .input("tro_id", license_plate)
  //       .query(`
  //         UPDATE Trolley
  //         SET tro_status = '0'
  //         WHERE tro_id = @tro_id
  //       `);

  //     // const histResult = await transaction.request()
  //     //   .input("mapping_id", mapping_id)
  //     //   .query(`
  //     //     SELECT hist_id_rmit
  //     //     FROM TrolleyRMMapping
  //     //     WHERE mapping_id = @mapping_id
  //     //   `);

  //     // if (histResult.recordset.length === 0) {
  //     //   console.error("ไม่พบข้อมูล hist_id_rmit");
  //     //   return res.status(404).json({ success: false, message: "ไม่พบข้อมูล" });
  //     // }

  //     // const hist_id_rmit = histResult.recordset[0].hist_id_rmit;

  //     // อัปเดตข้อมูลใน History
  //     await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .input("receiver", recorder)  // ใช้ recorder แทน operator
  //       .query(`
  //         UPDATE History
  //         SET receiver_oven_edit = @receiver, rework_date = GETDATE()
  //         WHERE mapping_id = @mapping_id
  //       `);

  //     // ✅ Commit transaction
  //     await transaction.commit();
  //     return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

  //   } catch (err) {
  //     await transaction.rollback();
  //     console.error("SQL error:", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });


  // router.get("/oven/matimport/fetchRMForProd", async (req, res) => {
  //   try {
  //     const pool = await connectToDatabase();
  //     const result = await pool
  //       .request()
  //       .query(`
  //                 SELECT
  //                     rmf.rmfp_id,
  //                     rmf.batch,
  //                     rm.mat,
  //                     rm.mat_name,
  //                     rmm.dest,
  //                     rmm.stay_place,
  //                     CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
  //                     rmm.level_eu,
  //                     rmg.rm_type_id,
  //                     rmm.tro_id,
  //                     rmm.mapping_id,
  //                     htr.cooked_date
  //                 FROM
  //                     RMForProd rmf
  //                 JOIN 
  //                     TrolleyRMMapping rmm ON rmf.rmfp_id = rmm.rmfp_id
  //                 JOIN
  //                     ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
  //                 JOIN
  //                     RawMat rm ON pr.mat = rm.mat
  //                 JOIN
  //                     Production p ON pr.prod_id = p.prod_id
  //                 JOIN
  //                     RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
  //                 JOIN
  //                     RawMatGroup rmg ON rmcg.rm_group_id = rmg.rm_group_id
  //                 JOIN
  //                     History htr ON rmm.mapping_id = htr.mapping_id
  //                 WHERE 
  //                     rmm.stay_place = 'จุดเตรียม' 
  //                     AND rmm.dest = 'หม้ออบ'
  //                     AND rmm.rm_status = 'ปกติ'
  //                     AND rmf.rm_group_id = rmg.rm_group_id
  //             `);


  //     const formattedData = result.recordset.map(item => {
  //       const date = new Date(item.cooked_date);
  //       const year = date.getUTCFullYear();
  //       const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  //       const day = String(date.getUTCDate()).padStart(2, '0');
  //       const hours = String(date.getUTCHours()).padStart(2, '0');
  //       const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  //       const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  //       const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

  //       item.CookedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;

  //       delete item.cooked_date;

  //       return item;
  //     });

  //     res.json({ success: true, data: formattedData });
  //   } catch (err) {
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });

  // router.post("/oven/matimport/saveTrolley", async (req, res) => {
  //   const { license_plate, desttype, recorder, ntray, Process, weightTotal, mapping_id, dest, tro_id } = req.body;
  //   const sql = require("mssql");
  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);
  //   const io = req.app.get("io"); // <<== ดึง io object มาใช้

  //   try {
  //     if (!tro_id || !license_plate || !mapping_id) {
  //       return res.status(400).json({ success: false, error: "Missing required fields" });
  //     }

  //     await transaction.begin();

  //     await transaction.request()
  //       .input("tro_id", tro_id)
  //       .query(`
  //         UPDATE Trolley
  //         SET tro_status = '1'
  //         WHERE tro_id = @tro_id
  //     `);

  //     const updateRM = await transaction.request()
  //       .input("tro_id", license_plate)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("dest", dest)
  //       .input("stay_place", 'หม้ออบ')
  //       .input("mapping_id", mapping_id)
  //       .input("rm_status", desttype)
  //       .input("process_id", Process)
  //       .query(`
  //         UPDATE TrolleyRMMapping
  //         SET tro_id = @tro_id, 
  //             dest = @dest,  
  //             stay_place = @stay_place,
  //             weight_RM = @weight_RM, 
  //             tray_count = @tray_count,
  //             rm_status = @rm_status,
  //             process_id = @process_id
  //         WHERE mapping_id = @mapping_id
  //     `);

  //     if (updateRM.rowsAffected[0] === 0) {
  //       throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);
  //     }

  //     await transaction.request()
  //       .input("tro_id", license_plate)
  //       .query(`
  //         UPDATE Trolley
  //         SET tro_status = '0'
  //         WHERE tro_id = @tro_id
  //       `);

  //     await transaction.request()
  //       .input("mapping_id", sql.Int, mapping_id)
  //       .query(`
  //         UPDATE History
  //         SET cooked_date = GETDATE() 
  //         WHERE mapping_id = @mapping_id
  //       `);

  //     await transaction.commit();

  //     // ✅ ส่งข้อมูล real-time ผ่าน Socket.IO
  //     const formattedData = {
  //       mapping_id,
  //       status: "หม้ออบ",
  //       dest,
  //       tray_count: ntray,
  //       weight: weightTotal,
  //       message: "บันทึกข้อมูลการอบเรียบร้อย"
  //     };

  //     io.to("saveRMForProdRoom").emit("dataUpdated", formattedData);

  //     return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

  //   } catch (err) {
  //     await transaction.rollback();
  //     console.error("SQL error:", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });


  router.post("/oven/sap/saveRMForProd", async (req, res) => {
    const {
      mat, batch, productId, line_name, groupId, sap_re_id,
      weight, operator, withdraw, datetime: receiveDT,
      Receiver, userID, Dest, level_eu, withdraw_date,
    } = req.body;

    // ✅ Validate input ก่อน
    if (!mat || !batch || !productId || !withdraw_date || !line_name || !sap_re_id || !Array.isArray(groupId) || groupId.length === 0) {
      return res.status(400).json({ success: false, message: "Missing or invalid required fields" });
    }

    let transaction;

    // ✅ ตัวแปรนับจำนวนการทำงาน
    let summary = {
      rmForProdInserted: 0,
      historyInserted: 0,
      rmForProdUpdated: 0
    };

    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      // ✅ ดึงค่า prod_rm_id
      const result = await transaction.request()
        .input("productId", productId)
        .input("mat", mat)
        .query(`
        SELECT prod_rm_id
        FROM ProdRawMat
        WHERE prod_Id = @productId AND mat = @mat
      `);

      if (result.recordset.length === 0) {
        throw new Error("ไม่พบ prod_rm_id สำหรับ productId และ mat ที่ระบุ");
      }

      const ProdrmID = result.recordset[0].prod_rm_id;

      // ✅ clean groupId
      const cleanGroupId = groupId.filter(g => g != null);

      // ✅ ฟังก์ชัน insert RMForProd
      const insertRMForProd = async (gid, stayPlace) => {
        // insert RMForProd
        const rmfpResult = await transaction.request()
          .input("prod_rm_id", ProdrmID)
          .input("rm_group_id", gid)
          .input("batch", batch)
          .input("weight", weight)
          .input("rmfp_line_name", line_name)
          .input("stay_place", stayPlace)
          .input("dest", Dest)
          .input("level_eu", level_eu !== "-" ? level_eu : null)
          .query(`
          INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu)
          OUTPUT INSERTED.rmfp_id
          VALUES (@prod_rm_id, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu)
        `);

        if (rmfpResult.recordset.length === 0) {
          throw new Error("Insert RMForProd ไม่สำเร็จ");
        }
        summary.rmForProdInserted++;

        const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

        // query production
        const SELECT_Production = await transaction.request()
          .input("rmfp_id", RMFP_ID)
          .query(`
          SELECT CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production
          FROM RMForProd rmf
          JOIN ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
          JOIN RawMat rm ON pr.mat = rm.mat
          JOIN Production p ON pr.prod_id = p.prod_id
          WHERE rmfp_id = @rmfp_id
        `);

        if (SELECT_Production.recordset.length === 0) {
          throw new Error(`ไม่พบ Production สำหรับ rmfp_id=${RMFP_ID}`);
        }

        const production = SELECT_Production.recordset[0].production;

        // insert History
        const historyResult = await transaction.request()
          .input("receiver", operator || Receiver)
          .input("withdraw", withdraw)
          .input("cooked_date", receiveDT)
          .input("first_prod", production)
          .input("withdraw_date", withdraw_date)
          .query(`
          INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod, created_at)
          OUTPUT INSERTED.hist_id
          VALUES (@receiver, @withdraw_date, @cooked_date, @first_prod, GETDATE())
        `);

        if (historyResult.recordset.length === 0) {
          throw new Error("เกิดข้อผิดพลาดในการบันทึก History");
        }
        summary.historyInserted++;

        const histID = historyResult.recordset[0].hist_id;

        // update RMForProd ด้วย hist_id
        const updateResult = await transaction.request()
          .input("hist_id", histID)
          .input("rmfp_id", RMFP_ID)
          .query(`
          UPDATE RMForProd 
          SET hist_id_rmfp = @hist_id
          WHERE rmfp_id = @rmfp_id
        `);

        if (updateResult.rowsAffected[0] === 0) {
          throw new Error(`Update RMForProd ไม่สำเร็จ rmfp_id=${RMFP_ID}`);
        }
        summary.rmForProdUpdated++;
      };

      const updatestatussap = await transaction.request()
        .input("sap_re_id", sap_re_id)
        .query(`
          UPDATE SAP_Receive
          SET status = '0'
          WHERE sap_re_id = @sap_re_id
        `);

      if (updatestatussap.rowsAffected[0] === 0) {
        throw new Error(`Update ไม่สำเร็จ sap_table`);
      }

      // ✅ loop groupId
      for (const gid of cleanGroupId) {
        const stayPlace = ["จุดเตรียม"].includes(Dest) ? "จุดเตรียมรับเข้า" : "หม้ออบ";
        await insertRMForProd(gid, stayPlace);
      }

      await transaction.commit();

      // ✅ log summary
      console.log("✅ Transaction Summary:", summary);

      // ✅ Broadcast
      req.app.get("io").emit("rawMaterialSaved", {
        message: "Raw material data saved successfully!",
        productId,
        groupId: cleanGroupId,
        batch,
        weight,
        dest: Dest,
        summary
      });

      // ✅ response
      res.json({
        success: true,
        message: "บันทึกข้อมูลการสแกนเสร็จสิ้น",
        summary
      });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  module.exports = router;
  return router;
};