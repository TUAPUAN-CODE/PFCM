module.exports = (io) => {
  const express = require("express");
  const { connectToDatabase } = require("../database/db");
  const router = express.Router();
  const sql = require("mssql");



  router.post("/prep/saveRMMixBatch/for/BatchMIX", async (req, res) => {
    const {
      mat,
      batch,
      line_name,
      groupId,
      weight,
      operator,
      withdraw,
      datetime: receiveDT,
      Receiver,
      userID,
      Dest,
      level_eu,
      hu
    } = req.body;

    let transaction;

    try {
      // ✅ เริ่มการเชื่อมต่อและ transaction
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      // ✅ ฟังก์ชัน insert
      const insertRMMixBatch = async (groupID, stayPlace) => {
        const groupArr = Array.isArray(groupID) ? groupID : [groupID];

        for (let i = 0; i < groupArr.length; i++) {
          // ✅ Insert RMMixBatch
          const rmmbatchResult = await transaction
            .request()
            .input("rm_group_id", groupArr[i])
            .input("batch", batch)
            .input("mat", mat)
            .input("weight", weight)
            .input("rmfp_line_name", line_name)
            .input("stay_place", stayPlace)
            .input("hu", hu)
            .input("dest", Dest)
            .input("level_eu", level_eu !== "-" ? level_eu : null)
            .input("b_status", "1")
            .query(`
            INSERT INTO RMMixBatch (mat, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu, b_status,hu)
            OUTPUT INSERTED.rmfbatch_id
            VALUES (@mat, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu, @b_status,@hu)
          `);

          if (rmmbatchResult.recordset.length === 0) {
            throw new Error("Insert RMMixBatch ไม่สำเร็จ");
          }

          const RMFBATCH_ID = rmmbatchResult.recordset[0].rmfbatch_id;

          // ✅ Insert History
          const historyResult = await transaction
            .request()
            .input("receiver", operator)
            .input("withdraw", withdraw)
            .input("cooked_date", receiveDT)
            .query(`
            INSERT INTO History (receiver, withdraw_date, cooked_date, created_at)
            OUTPUT INSERTED.hist_id
            VALUES (@receiver, @withdraw, @cooked_date, GETDATE())
          `);

          if (historyResult.recordset.length === 0) {
            throw new Error("Insert History ไม่สำเร็จ");
          }

          const histID = historyResult.recordset[0].hist_id;

          // ✅ Update RMMixBatch ด้วย hist_id
          const updateResult = await transaction
            .request()
            .input("hist_id", histID)
            .input("rmfbatch_id", RMFBATCH_ID)
            .query(`
            UPDATE RMMixBatch
            SET hist_id_rmfbatch = @hist_id
            WHERE rmfbatch_id = @rmfbatch_id
          `);

          if (updateResult.rowsAffected[0] === 0) {
            throw new Error("Update RMMixBatch.hist_id_rmfbatch ไม่สำเร็จ");
          }
        }
      };

      // ✅ เรียกใช้ insertRMForBatch ตามเงื่อนไข
      if (["หม้ออบ", "เข้าห้องเย็น", "จุดเตรียม"].includes(Dest)) {
        await insertRMMixBatch(groupId, "จุดเตรียมรับเข้า");
      }

      // ✅ commit transaction
      await transaction.commit();

      // ✅ broadcast event
      const broadcastData = {
        message: "Raw material batch saved successfully!",
        groupId,
        batch,
        weight,
        dest: Dest,
      };

      req.app.get("io").emit("rawBatchSaved", broadcastData);

      // ✅ ส่ง response
      res.json({ success: true, message: "บันทึกข้อมูลการสแกน Batch เสร็จสิ้น" });

    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });




  // router.post("/prep/saveRMForProd/saprecieve", async (req, res) => {
  //   const { mat, batch, productId, line_name, groupId, weight, operator, withdraw, datetime: receiveDT, Receiver, userID, Dest, level_eu } = req.body;

  //   if (Array.isArray(groupId) && groupId.length > 0) {
  //     let transaction;

  //     try {
  //       const pool = await connectToDatabase();
  //       transaction = await pool.transaction();
  //       await transaction.begin();

  //       const emulsion = await transaction
  //         .request()
  //         .input("status", 0)       // 0 = false, 1 = true
  //         .input("sap_re_id", sap_re_id)
  //         .query(`
  //   UPDATE SAP_Receive
  //   SET status = @status
  //   WHERE sap_re_id = @sap_re_id
  //   `);


  //       // ดึงค่า prod_rm_id จากฐานข้อมูล
  //       const result = await transaction.request()
  //         .input("productId", productId)
  //         .input("mat", mat)
  //         .query(`
  //           SELECT prod_rm_id
  //           FROM ProdRawMat
  //           WHERE prod_Id = @productId AND mat = @mat
  //         `);

  //       if (result.recordset.length === 0) {
  //         console.error("ไม่พบ prod_rm_id สำหรับ productId และ mat ที่ระบุ");
  //         return res.status(404).json({ success: false, message: "ไม่พบข้อมูล prod_rm_id" });
  //       }

  //       const ProdrmID = result.recordset[0].prod_rm_id;

  //       const insertRMForProd = async (groupID, stayPlace) => {
  //         for (let i = 0; i < groupID.length; i++) {
  //           const rmfpResult = await transaction.request()
  //             .input("prod_rm_id", ProdrmID)
  //             .input("rm_group_id", groupID[i])
  //             .input("batch", batch)
  //             .input("weight", weight)
  //             .input("rmfp_line_name", line_name)
  //             .input("stay_place", stayPlace)
  //             .input("dest", Dest)
  //             .input("level_eu", level_eu !== "-" ? level_eu : null)  // Store EU level or NULL if "-"

  //             .query(`
  //               INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name,level_eu)
  //               OUTPUT INSERTED.rmfp_id
  //               VALUES (@prod_rm_id, @batch,  @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name,@level_eu)
  //             `);

  //           const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

  //           const SELECT_Production = await transaction.request()
  //             .input("rmfp_id", RMFP_ID)
  //             .query(`SELECT
  //                   CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production
  //               FROM
  //                   RMForProd rmf
  //               JOIN
  //                   ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id

  //               JOIN
  //                   RawMat rm ON pr.mat = rm.mat
  //               JOIN
  //                   Production p ON pr.prod_id = p.prod_id
  //               WHERE rmfp_id = @rmfp_id
  //                   `
  //             )

  //           const production = SELECT_Production.recordset[0].production;

  //           // Insert ข้อมูลเข้า History และดึง hist_id ที่พึ่ง insert
  //           const historyResult = await transaction.request()
  //             .input("receiver", operator)
  //             .input("withdraw", withdraw)
  //             .input("cooked_date", receiveDT)
  //             .input("first_prod", production)
  //             .query(`
  //               INSERT INTO History (receiver, withdraw_date, cooked_date,first_prod,created_at)
  //               OUTPUT INSERTED.hist_id
  //               VALUES (@receiver, @withdraw, @cooked_date, @first_prod,GETDATE())
  //             `);

  //           if (historyResult.recordset.length === 0) {
  //             console.error("เกิดข้อผิดพลาดในการบันทึก History");
  //             return;
  //           }

  //           const histID = historyResult.recordset[0].hist_id;

  //           // อัปเดต RMForProd ด้วย hist_id
  //           await transaction.request()
  //             .input("hist_id", histID)
  //             .input("rmfp_id", RMFP_ID)
  //             .query(`
  //               UPDATE RMForProd 
  //               SET hist_id_rmfp = @hist_id
  //               WHERE rmfp_id = @rmfp_id
  //             `);
  //         }
  //       };

  //       if (Dest === "หม้ออบ" || Dest === "เข้าห้องเย็น") {
  //         await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
  //       } else if (Dest === "จุดเตรียม") {
  //         await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
  //       }

  //       await transaction.commit();

  //       // Broadcast a message to all connected clients when the data is successfully saved
  //       const broadcastData = {
  //         message: "Raw material data saved successfully!",
  //         productId: productId,
  //         groupId: groupId,
  //         batch: batch,
  //         weight: weight,
  //         dest: Dest
  //       };

  //       // Emit the event to all connected clients
  //       req.app.get("io").emit("rawMaterialSaved", broadcastData);

  //       // Send the response
  //       res.json({ success: true, message: "บันทึกข้อมูลการแสกนเสร็จสิ้น" });
  //     } catch (err) {
  //       if (transaction) {
  //         await transaction.rollback();
  //       }
  //       console.error("SQL error", err);
  //       res.status(500).json({ success: false, error: err.message });
  //     }
  //   }
  // });
  router.post("/prep/saveRMForProd/saprecieve", async (req, res) => {
    const {
      mat,
      batch,
      productId,
      line_name,
      groupId,
      weight,
      operator,
      withdraw,
      datetime: receiveDT,
      Receiver,
      userID,
      Dest,
      level_eu,
      hu
    } = req.body;

    if (!Array.isArray(groupId) || groupId.length === 0) {
      return res.status(400).json({ success: false, message: "groupId ไม่ถูกต้อง" });
    }

    let transaction;

    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      // ✅ อัปเดต SAP_Receive
      const sapUpdate = await transaction
        .request()
        .input("status", 0)
        .input("sap_re_id", req.body.sap_re_id) // ต้องส่งมาจาก body ด้วย
        .query(`
        UPDATE SAP_Receive
        SET status = @status
        WHERE sap_re_id = @sap_re_id
      `);

      if (sapUpdate.rowsAffected[0] === 0) {
        throw new Error("ไม่พบ sap_re_id ที่ต้องการอัปเดต SAP_Receive");
      }

      // ✅ หา prod_rm_id
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

      // ✅ ฟังก์ชัน insert RMForProd
      const insertRMForProd = async (groupIDs, stayPlace) => {
        for (let i = 0; i < groupIDs.length; i++) {
          const rmfpResult = await transaction.request()
            .input("prod_rm_id", ProdrmID)
            .input("rm_group_id", groupIDs[i])
            .input("batch", batch)
            .input("weight", weight)
            .input("rmfp_line_name", line_name)
            .input("stay_place", stayPlace)
            .input("dest", Dest)
            .input("hu", hu)
            .input("level_eu", level_eu !== "-" ? level_eu : null)
            .query(`
            INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu,hu)
            OUTPUT INSERTED.rmfp_id
            VALUES (@prod_rm_id, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu, @hu)
          `);

          if (rmfpResult.recordset.length === 0) {
            throw new Error("Insert RMForProd ไม่สำเร็จ");
          }

          const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

          // ✅ หา production
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
            throw new Error("ไม่พบข้อมูล Production ที่สอดคล้องกับ RMForProd");
          }

          const production = SELECT_Production.recordset[0].production;

          // ✅ insert History
          const historyResult = await transaction.request()
            .input("receiver", operator)
            .input("withdraw", withdraw)
            .input("cooked_date", receiveDT)
            .input("first_prod", production)
            .query(`
            INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod, created_at)
            OUTPUT INSERTED.hist_id
            VALUES (@receiver, @withdraw, @cooked_date, @first_prod, GETDATE())
          `);

          if (historyResult.recordset.length === 0) {
            throw new Error("Insert History ไม่สำเร็จ");
          }

          const histID = historyResult.recordset[0].hist_id;

          // ✅ update RMForProd ด้วย hist_id
          const updateRMFP = await transaction.request()
            .input("hist_id", histID)
            .input("rmfp_id", RMFP_ID)
            .query(`
            UPDATE RMForProd
            SET hist_id_rmfp = @hist_id
            WHERE rmfp_id = @rmfp_id
          `);

          if (updateRMFP.rowsAffected[0] === 0) {
            throw new Error("Update RMForProd.hist_id_rmfp ไม่สำเร็จ");
          }
        }
      };

      // ✅ เรียก insert ตาม Dest
      if (["หม้ออบ", "เข้าห้องเย็น", "จุดเตรียม"].includes(Dest)) {
        await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
      }

      // ✅ ทุกอย่างผ่าน → commit
      await transaction.commit();

      // Broadcast
      req.app.get("io").emit("rawMaterialSaved", {
        message: "Raw material data saved successfully!",
        productId,
        groupId,
        batch,
        weight,
        dest: Dest
      });

      return res.json({ success: true, message: "บันทึกข้อมูลการแสกนเสร็จสิ้น" });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });


  // router.post("/prep/saveRMForProd", async (req, res) => {
  //   const { mat, batch, productId, line_name, groupId, weight, operator, withdraw, datetime: receiveDT, Dest, level_eu } = req.body;

  //   if (Array.isArray(groupId) && groupId.length > 0) {
  //     let transaction;

  //     try {
  //       const pool = await connectToDatabase();
  //       transaction = await pool.transaction();
  //       await transaction.begin();

  //       // ดึงค่า prod_rm_id จากฐานข้อมูล
  //       const result = await transaction.request()
  //         .input("productId", productId)
  //         .input("mat", mat)
  //         .query(`
  //           SELECT prod_rm_id
  //           FROM ProdRawMat
  //           WHERE prod_Id = @productId AND mat = @mat
  //         `);

  //       if (result.recordset.length === 0) {
  //         console.error("ไม่พบ prod_rm_id สำหรับ productId และ mat ที่ระบุ");
  //         return res.status(404).json({ success: false, message: "ไม่พบข้อมูล prod_rm_id" });
  //       }

  //       const ProdrmID = result.recordset[0].prod_rm_id;

  //       const insertRMForProd = async (groupID, stayPlace) => {
  //         for (let i = 0; i < groupID.length; i++) {
  //           const rmfpResult = await transaction.request()
  //             .input("prod_rm_id", ProdrmID)
  //             .input("rm_group_id", groupID[i])
  //             .input("batch", batch)
  //             .input("weight", weight)
  //             .input("rmfp_line_name", line_name)
  //             .input("stay_place", stayPlace)
  //             .input("dest", Dest)
  //             .input("level_eu", level_eu !== "-" ? level_eu : null)  // Store EU level or NULL if "-"

  //             .query(`
  //               INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name,level_eu)
  //               OUTPUT INSERTED.rmfp_id
  //               VALUES (@prod_rm_id, @batch,  @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name,@level_eu)
  //             `);

  //           const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

  //           const SELECT_Production = await transaction.request()
  //             .input("rmfp_id", RMFP_ID)
  //             .query(`SELECT
  //                   CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production
  //               FROM
  //                   RMForProd rmf
  //               JOIN
  //                   ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id

  //               JOIN
  //                   RawMat rm ON pr.mat = rm.mat
  //               JOIN
  //                   Production p ON pr.prod_id = p.prod_id
  //               WHERE rmfp_id = @rmfp_id
  //                   `
  //             )

  //           const production = SELECT_Production.recordset[0].production;

  //           // Insert ข้อมูลเข้า History และดึง hist_id ที่พึ่ง insert
  //           const historyResult = await transaction.request()
  //             .input("receiver", operator)
  //             .input("withdraw", withdraw)
  //             .input("cooked_date", receiveDT)
  //             .input("first_prod", production)
  //             .query(`
  //               INSERT INTO History (receiver, withdraw_date, cooked_date,first_prod,created_at)
  //               OUTPUT INSERTED.hist_id
  //               VALUES (@receiver, @withdraw, @cooked_date, @first_prod,GETDATE())
  //             `);

  //           if (historyResult.recordset.length === 0) {
  //             console.error("เกิดข้อผิดพลาดในการบันทึก History");
  //             return;
  //           }

  //           const histID = historyResult.recordset[0].hist_id;

  //           // อัปเดต RMForProd ด้วย hist_id
  //           await transaction.request()
  //             .input("hist_id", histID)
  //             .input("rmfp_id", RMFP_ID)
  //             .query(`
  //               UPDATE RMForProd 
  //               SET hist_id_rmfp = @hist_id
  //               WHERE rmfp_id = @rmfp_id
  //             `);
  //         }
  //       };

  //       if (Dest === "หม้ออบ" || Dest === "เข้าห้องเย็น") {
  //         await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
  //       } else if (Dest === "จุดเตรียม") {
  //         await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
  //       }

  //       await transaction.commit();

  //       // Broadcast a message to all connected clients when the data is successfully saved
  //       const broadcastData = {
  //         message: "Raw material data saved successfully!",
  //         productId: productId,
  //         groupId: groupId,
  //         batch: batch,
  //         weight: weight,
  //         dest: Dest
  //       };

  //       // Emit the event to all connected clients
  //       req.app.get("io").emit("rawMaterialSaved", broadcastData);

  //       // Send the response
  //       res.json({ success: true, message: "บันทึกข้อมูลการแสกนเสร็จสิ้น" });
  //     } catch (err) {
  //       if (transaction) {
  //         await transaction.rollback();
  //       }
  //       console.error("SQL error", err);
  //       res.status(500).json({ success: false, error: err.message });
  //     }
  //   }
  // });
  router.post("/prep/saveRMForProd", async (req, res) => {
    const {
      mat,
      batch,
      productId,
      line_name,
      groupId,
      weight,
      operator,
      withdraw,
      datetime: receiveDT,
      Dest,
      level_eu,
      hu
    } = req.body;

    if (!Array.isArray(groupId) || groupId.length === 0) {
      return res.status(400).json({ success: false, message: "groupId ไม่ถูกต้อง" });
    }

    let transaction;

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

      const insertRMForProd = async (groupIDs, stayPlace) => {
        for (let i = 0; i < groupIDs.length; i++) {
          // ✅ Insert RMForProd
          const rmfpResult = await transaction.request()
            .input("prod_rm_id", ProdrmID)
            .input("rm_group_id", groupIDs[i])
            .input("batch", batch)
            .input("weight", weight)
            .input("rmfp_line_name", line_name)
            .input("stay_place", stayPlace)
            .input("dest", Dest)
            .input("hu", hu)
            .input("row_status", "NM")
            .input("level_eu", level_eu !== "-" ? level_eu : null)
            .query(`
            INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu,hu,row_status)
            OUTPUT INSERTED.rmfp_id
            VALUES (@prod_rm_id, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu, @hu,@row_status)
          `);

          if (rmfpResult.recordset.length === 0) {
            throw new Error("Insert RMForProd ไม่สำเร็จ");
          }

          const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

          // ✅ ดึง production
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
            throw new Error("ไม่พบข้อมูล Production ที่สอดคล้องกับ RMForProd");
          }

          const production = SELECT_Production.recordset[0].production;

          // ✅ Insert History
          const historyResult = await transaction.request()
            .input("receiver", operator)
            .input("withdraw", withdraw)
            .input("cooked_date", receiveDT)
            .input("first_prod", production)
            .query(`
            INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod, created_at)
            OUTPUT INSERTED.hist_id
            VALUES (@receiver, @withdraw, @cooked_date, @first_prod, GETDATE())
          `);

          if (historyResult.recordset.length === 0) {
            throw new Error("Insert History ไม่สำเร็จ");
          }

          const histID = historyResult.recordset[0].hist_id;

          // ✅ Update RMForProd.hist_id_rmfp
          const updateRMFP = await transaction.request()
            .input("hist_id", histID)
            .input("rmfp_id", RMFP_ID)
            .query(`
            UPDATE RMForProd
            SET hist_id_rmfp = @hist_id
            WHERE rmfp_id = @rmfp_id
          `);

          if (updateRMFP.rowsAffected[0] === 0) {
            throw new Error("Update RMForProd.hist_id_rmfp ไม่สำเร็จ");
          }
        }
      };

      // ✅ เรียก insert ตาม Dest
      if (["หม้ออบ", "เข้าห้องเย็น", "จุดเตรียม"].includes(Dest)) {
        await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
      }

      // ✅ ทุกอย่างผ่าน → commit
      await transaction.commit();

      // Broadcast event
      req.app.get("io").emit("rawMaterialSaved", {
        message: "Raw material data saved successfully!",
        productId,
        groupId,
        batch,
        weight,
        dest: Dest
      });

      return res.json({ success: true, message: "บันทึกข้อมูลการแสกนเสร็จสิ้น" });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });


  // router.post("/prep/saveRMForEmu/for/emulsion", async (req, res) => {
  //   const {
  //     mat,
  //     batch,
  //     line_name,
  //     Emulsion,
  //     groupId,
  //     weight,
  //     operator,
  //     withdraw,
  //     datetime: receiveDT,
  //     Receiver,
  //     userID,
  //     Dest,
  //     level_eu,
  //     emu_status
  //   } = req.body;

  //   let transaction;

  //   try {
  //     // เชื่อมต่อ DB และเริ่ม transaction
  //     const pool = await connectToDatabase();
  //     transaction = await pool.transaction();
  //     await transaction.begin();

  //     // ฟังก์ชัน insert
  //     const insertRMForEmu = async (groupID, stayPlace) => {
  //       // ถ้า groupID ไม่ใช่ array ให้ห่อเป็น array
  //       const groupArr = Array.isArray(groupID) ? groupID : [groupID];

  //       for (let i = 0; i < groupArr.length; i++) {
  //         const rmfemuResult = await transaction
  //           .request()
  //           .input("rm_group_id", groupArr[i])
  //           .input("batch", batch)
  //           .input("mat", mat)
  //           .input("weight", weight)
  //           .input("rmfp_line_name", line_name)
  //           .input("stay_place", stayPlace)
  //           .input("dest", Dest)
  //           .input("level_eu", level_eu !== "-" ? level_eu : null) // ถ้า "-" ให้เก็บ NULL
  //           .input("emu_status", emu_status || '1')
  //           .query(`
  //           INSERT INTO RMForEmu (mat, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu, emu_status)
  //           OUTPUT INSERTED.rmfemu_id
  //           VALUES (@mat, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu, @emu_status)
  //         `);

  //         const RMFEMU_ID = rmfemuResult.recordset[0].rmfemu_id;

  //         // Insert History
  //         const historyResult = await transaction
  //           .request()
  //           .input("receiver", operator)
  //           .input("withdraw", withdraw)
  //           .input("cooked_date", receiveDT)
  //           .query(`
  //           INSERT INTO History (receiver, withdraw_date, cooked_date, created_at)
  //           OUTPUT INSERTED.hist_id
  //           VALUES (@receiver, @withdraw, @cooked_date, GETDATE())
  //         `);

  //         if (historyResult.recordset.length === 0) {
  //           throw new Error("เกิดข้อผิดพลาดในการบันทึก History");
  //         }

  //         const histID = historyResult.recordset[0].hist_id;

  //         // อัปเดต RMForEmu ด้วย hist_id
  //         await transaction
  //           .request()
  //           .input("hist_id", histID)
  //           .input("rmfemu_id", RMFEMU_ID)
  //           .query(`
  //           UPDATE RMForEmu 
  //           SET hist_id_rmfemu = @hist_id
  //           WHERE rmfemu_id = @rmfemu_id
  //         `);
  //       }
  //     };

  //     // เรียกใช้ insertRMForEmu ตามเงื่อนไข
  //     if (Dest === "หม้ออบ" || Dest === "เข้าห้องเย็น" || Dest === "จุดเตรียม") {
  //       await insertRMForEmu(groupId, "จุดเตรียมรับเข้า");
  //     }

  //     // commit transaction
  //     await transaction.commit();

  //     // Broadcast
  //     const broadcastData = {
  //       message: "Raw material data saved successfully!",
  //       groupId: groupId,
  //       batch: batch,
  //       weight: weight,
  //       dest: Dest,
  //     };

  //     req.app.get("io").emit("rawMaterialSaved", broadcastData);

  //     // Response
  //     res.json({ success: true, message: "บันทึกข้อมูลการสแกนเสร็จสิ้น" });
  //   } catch (err) {
  //     if (transaction) {
  //       await transaction.rollback();
  //     }
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
  router.post("/prep/saveRMForEmu/for/emulsion", async (req, res) => {
    const {
      mat,
      batch,
      line_name,
      Emulsion,
      groupId,
      weight,
      operator,
      withdraw,
      datetime: receiveDT,
      Receiver,
      userID,
      Dest,
      level_eu,
      emu_status,
      hu
    } = req.body;

    let transaction;

    try {
      // เชื่อมต่อ DB และเริ่ม transaction
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      // ฟังก์ชัน insert
      const insertRMForEmu = async (groupID, stayPlace) => {
        // ถ้า groupID ไม่ใช่ array ให้ห่อเป็น array
        const groupArr = Array.isArray(groupID) ? groupID : [groupID];

        for (let i = 0; i < groupArr.length; i++) {
          // ✅ Insert RMForEmu
          const rmfemuResult = await transaction
            .request()
            .input("rm_group_id", groupArr[i])
            .input("batch", batch)
            .input("mat", mat)
            .input("weight", weight)
            .input("rmfp_line_name", line_name)
            .input("stay_place", stayPlace)
            .input("dest", Dest)
            .input("hu", hu)
            .input("level_eu", level_eu !== "-" ? level_eu : null) // ถ้า "-" ให้เก็บ NULL
            .input("emu_status", emu_status || "1")
            .query(`
            INSERT INTO RMForEmu (mat, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu, emu_status,hu)
            OUTPUT INSERTED.rmfemu_id
            VALUES (@mat, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu, @emu_status,@hu)
          `);

          if (rmfemuResult.recordset.length === 0) {
            throw new Error("Insert RMForEmu ไม่สำเร็จ");
          }

          const RMFEMU_ID = rmfemuResult.recordset[0].rmfemu_id;

          // ✅ Insert History
          const historyResult = await transaction
            .request()
            .input("receiver", operator)
            .input("withdraw", withdraw)
            .input("cooked_date", receiveDT)
            .query(`
            INSERT INTO History (receiver, withdraw_date, cooked_date, created_at)
            OUTPUT INSERTED.hist_id
            VALUES (@receiver, @withdraw, @cooked_date, GETDATE())
          `);

          if (historyResult.recordset.length === 0) {
            throw new Error("Insert History ไม่สำเร็จ");
          }

          const histID = historyResult.recordset[0].hist_id;

          // ✅ Update RMForEmu ด้วย hist_id
          const updateResult = await transaction
            .request()
            .input("hist_id", histID)
            .input("rmfemu_id", RMFEMU_ID)
            .query(`
            UPDATE RMForEmu 
            SET hist_id_rmfemu = @hist_id
            WHERE rmfemu_id = @rmfemu_id
          `);

          if (updateResult.rowsAffected[0] === 0) {
            throw new Error("Update RMForEmu.hist_id_rmfemu ไม่สำเร็จ");
          }
        }
      };

      // ✅ เรียกใช้ insertRMForEmu ตามเงื่อนไข
      if (["หม้ออบ", "เข้าห้องเย็น", "จุดเตรียม"].includes(Dest)) {
        await insertRMForEmu(groupId, "จุดเตรียมรับเข้า");
      }

      // ✅ commit transaction ถ้าทุกอย่างผ่าน
      await transaction.commit();

      // Broadcast
      const broadcastData = {
        message: "Raw material data saved successfully!",
        groupId,
        batch,
        weight,
        dest: Dest,
      };

      req.app.get("io").emit("rawMaterialSaved", broadcastData);

      // Response
      res.json({ success: true, message: "บันทึกข้อมูลการสแกนเสร็จสิ้น" });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  router.post("/prep/mix/MixToPack", async (req, res) => {
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
      selectedMaterials // [{mixtp_id, mat, batch, weight, level_eu}]
    } = req.body;


    // ===============================
    // VALIDATION
    // ===============================
    if (!mat || !batch || !productId || !weight) {
      return res.status(400).json({
        success: false,
        message: "ข้อมูล mat, batch, productId, weight ต้องระบุ"
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


    let transaction;


    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();


      console.log("=== START TRANSACTION ===");
      console.log("Product ID:", productId);
      console.log("Material:", mat);
      console.log("Batch:", batch);
      console.log("Weight:", weight);
      console.log("Selected Materials:", selectedMaterials.length);
      console.log("========================\n");


      // ===============================
      // ⭐ STEP 0: อัปเดตน้ำหนักคงเหลือแบบ BULK (ปรับปรุงแล้ว)
      // ===============================
      console.log("=== STEP 0: UPDATING WEIGHTS (BULK) ===");

      // 1️⃣ สร้าง list ของ mixtp_id และ weight ที่จะ update
      const validMaterials = selectedMaterials.filter(m => m.mixtp_id && m.weight);

      if (validMaterials.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "ไม่มีข้อมูลวัตถุดิบที่ถูกต้อง"
        });
      }


      const mixIdList = validMaterials
        .map(m => `(${m.mixtp_id}, ${parseFloat(m.weight)})`)
        .join(',');


      // 2️⃣ ตรวจสอบน้ำหนักคงเหลือทั้งหมดพร้อมกัน (1 query เดียว)
      const checkWeightResult = await transaction.request()
        .query(`
        WITH UpdateData AS (
          SELECT mixtp_id, weight_to_deduct
          FROM (VALUES ${mixIdList}) AS T(mixtp_id, weight_to_deduct)
        )
        SELECT
          mtp.mixtp_id,
          mtp.weight_RM as current_weight,
          ud.weight_to_deduct,
          rm.mat as material_code,
          rmfp.batch as material_batch,
          CASE
            WHEN mtp.weight_RM < ud.weight_to_deduct THEN 1
            ELSE 0
          END as is_insufficient
        FROM UpdateData ud
        JOIN MixToPack mtp ON ud.mixtp_id = mtp.mixtp_id
        JOIN RMForProd rmfp ON mtp.rmfp_id = rmfp.rmfp_id
        JOIN ProdRawMat prod ON rmfp.prod_rm_id = prod.prod_rm_id
        JOIN RawMat rm ON prod.mat = rm.mat
        ORDER BY mtp.mixtp_id
      `);


      if (checkWeightResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "❌ ไม่พบข้อมูลวัตถุดิบที่ระบุ"
        });
      }


      // 3️⃣ ตรวจสอบว่ามีน้ำหนักไม่พอหรือไม่
      const insufficientItems = checkWeightResult.recordset.filter(item => item.is_insufficient === 1);

      if (insufficientItems.length > 0) {
        const first = insufficientItems[0];
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `❌ น้ำหนักคงเหลือไม่เพียงพอสำหรับ ${first.material_code} (Batch: ${first.material_batch})
น้ำหนักคงเหลือ: ${first.current_weight.toFixed(2)} กก.
ต้องการใช้: ${first.weight_to_deduct.toFixed(2)} กก.`
        });
      }


      // 4️⃣ แสดงข้อมูลก่อน update
      console.log("📊 วัตถุดิบที่จะอัปเดต:");
      checkWeightResult.recordset.forEach(item => {
        console.log(`  📦 ${item.material_code} (Batch: ${item.material_batch}):`, {
          current: item.current_weight.toFixed(2) + ' kg',
          toDeduct: item.weight_to_deduct.toFixed(2) + ' kg',
          remaining: (item.current_weight - item.weight_to_deduct).toFixed(2) + ' kg'
        });
      });


      // 5️⃣ UPDATE น้ำหนักทั้งหมดพร้อมกัน (1 query เดียว)
      const updateWeightResult = await transaction.request()
        .query(`
        WITH UpdateData AS (
          SELECT mixtp_id, weight_to_deduct
          FROM (VALUES ${mixIdList}) AS T(mixtp_id, weight_to_deduct)
        )
        UPDATE mtp
        SET weight_RM = mtp.weight_RM - ud.weight_to_deduct
        OUTPUT
          DELETED.mixtp_id,
          DELETED.weight_RM as old_weight,
          INSERTED.weight_RM as new_weight,
          ud.weight_to_deduct
        FROM MixToPack mtp
        JOIN UpdateData ud ON mtp.mixtp_id = ud.mixtp_id
      `);


      // 6️⃣ แสดงผลการอัปเดต
      console.log(`\n✅ อัปเดตน้ำหนัก ${updateWeightResult.recordset.length} รายการพร้อมกัน:`);
      updateWeightResult.recordset.forEach(row => {
        console.log(`  ✓ mixtp_id ${row.mixtp_id}:`, {
          old: row.old_weight.toFixed(2) + ' kg',
          deducted: row.weight_to_deduct.toFixed(2) + ' kg',
          new: row.new_weight.toFixed(2) + ' kg',
          status: row.new_weight === 0 ? '🗑️ จะถูกอัปเดตเป็น USED' : '✓ คงเหลือ'
        });
      });


      console.log("========================\n");


      // ===============================
      // STEP 1: ดึง prod_rm_id
      // ===============================
      console.log("=== STEP 1: Get prod_rm_id ===");

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
          message: "ไม่พบ prod_rm_id"
        });
      }


      const prod_rm_id = prodResult.recordset[0].prod_rm_id;
      console.log("prod_rm_id:", prod_rm_id);


      // ===============================
      // STEP 2: Loop ตาม groupId
      // ===============================
      console.log("\n=== STEP 2: Processing Groups ===");

      for (const gID of groupId) {
        console.log(`\n📋 Processing group ID: ${gID}`);


        // ===============================
        // STEP 2.1: INSERT RMForProd
        // ===============================
        const rmfpResult = await transaction.request()
          .input("prod_rm_id", prod_rm_id)
          .input("batch", batch)
          .input("weight", weight)
          .input("dest", Dest || "จุดเตรียม")
          .input("stay_place", "จุดเตรียมรับเข้า")
          .input("rm_group_id", gID)
          .input("rmfp_line_name", line_name || "")
          .input("level_eu", level_eu !== "-" ? level_eu : null)
          .input("row_status", "M_M")
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
        console.log("  ✅ Created RMForProd with rmfp_id:", RMFP_ID);


        // ===============================
        // STEP 2.2: INSERT RM_MixInclude (BULK - ปรับปรุงแล้ว)
        // ===============================
        console.log("  📝 Inserting RM_MixInclude records (BULK)...");

        const mixIncludeValues = validMaterials
          .map(m => `(${RMFP_ID}, ${m.mixtp_id})`)
          .join(',');


        if (mixIncludeValues.length > 0) {
          await transaction.request()
            .query(`
            INSERT INTO RM_MixInclude (rmfp_id, mixtp_id)
            VALUES ${mixIncludeValues}
          `);

          console.log(`    ✅ Inserted ${validMaterials.length} records in 1 query`);
        } else {
          console.warn("    ⚠️ No mixtp_id to insert");
        }


        // ===============================
        // STEP 2.3: ดึง withdraw_date
        // ===============================
        const fromMappingIds = validMaterials
          .map(m => m.mixtp_id)
          .filter(id => id != null && id !== undefined && id !== '' && !isNaN(id));


        let withdraw_date = null;


        if (fromMappingIds.length > 0) {
          try {
            const minWithdrawResult = await transaction.request()
              .query(`
              SELECT MIN(his.withdraw_date) AS withdraw_date
              FROM MixToPack mtp
              LEFT JOIN History his
                ON mtp.from_mapping_id = his.mapping_id
              WHERE mtp.mixtp_id IN (${fromMappingIds.join(",")})
            `);


            withdraw_date = minWithdrawResult.recordset[0]?.withdraw_date || null;

            if (withdraw_date) {
              console.log("  📅 withdraw_date:", withdraw_date);
            }
          } catch (error) {
            console.error("  ❌ Error in withdraw_date query:", error);
          }
        }


        if (!withdraw_date) {
          const now = new Date();
          now.setHours(now.getHours() + 7);
          withdraw_date = now.toISOString().slice(0, 19).replace('T', ' ');
          console.warn("  ⚠️ ไม่พบ withdraw_date, ใช้เวลาปัจจุบัน:", withdraw_date);
        }


        // ===============================
        // STEP 2.4: ดึง production info
        // ===============================
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


        const production = SELECT_Production.recordset[0]?.production || null;

        if (!production) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "ไม่พบข้อมูล production"
          });
        }


        console.log("  🏭 Production:", production);


        // ===============================
        // STEP 2.5: INSERT History
        // ===============================
        const historyResult = await transaction.request()
          .input("receiver", operator || "")
          .input("withdraw_date", withdraw_date)
          .input("cooked_date", receiveDT || null)
          .input("first_prod", production)
          .query(`
          INSERT INTO History (
            receiver, withdraw_date, cooked_date, first_prod, created_at
          )
          OUTPUT INSERTED.hist_id
          VALUES (
            @receiver, @withdraw_date, @cooked_date, @first_prod, GETDATE()
          )
        `);


        const histID = historyResult.recordset[0].hist_id;
        console.log("  ✅ Created History with hist_id:", histID);


        // ===============================
        // STEP 2.6: UPDATE RMForProd.hist_id_rmfp
        // ===============================
        await transaction.request()
          .input("hist_id", histID)
          .input("rmfp_id", RMFP_ID)
          .query(`
          UPDATE RMForProd
          SET hist_id_rmfp = @hist_id
          WHERE rmfp_id = @rmfp_id
        `);


        console.log(`  ✅ Updated RMForProd ${RMFP_ID} with hist_id ${histID}`);
      }


      // ===============================
      // STEP 3: UPDATE status แทนการลบ
      // ===============================
      console.log("\n=== STEP 3: Update Status for Zero Weight Rows ===");


      const updateStatusResult = await transaction.request()
        .query(`
        UPDATE MixToPack
        SET
          rm_status = 'USED',
          updated_at = GETDATE()
        OUTPUT
          INSERTED.mixtp_id,
          INSERTED.weight_RM,
          INSERTED.rmfp_id,
          INSERTED.rm_status
        WHERE weight_RM <= 0
      `);


      if (updateStatusResult.recordset.length > 0) {
        console.log(`✅ Updated status to 'USED' for ${updateStatusResult.recordset.length} row(s):`);
        updateStatusResult.recordset.forEach(row => {
          console.log(`  ↳ mixtp_id ${row.mixtp_id} (rmfp_id: ${row.rmfp_id}, weight: ${row.weight_RM})`);
        });
      } else {
        console.log("✓ No rows with zero weight to update");
      }


      // ===============================
      // COMMIT TRANSACTION
      // ===============================
      await transaction.commit();
      console.log("\n✅✅✅ TRANSACTION COMMITTED SUCCESSFULLY ✅✅✅\n");


      // ===============================
      // BROADCAST EVENTS
      // ===============================
      const io = req.app.get("io");
      if (io) {
        io.emit("trolleyRMMappingSaved", {
          message: "น้ำหนักอัปเดตสำเร็จ!",
          productId,
          groupId,
          batch,
          weight,
          selectedMaterials: validMaterials.length
        });


        io.to("saveRMForProdRoom").emit("dataUpdated", {
          message: "MixToPack weights updated",
          timestamp: new Date().toISOString()
        });


        console.log("📡 Events broadcasted");
      }


      // ===============================
      // RESPONSE
      // ===============================
      res.json({
        success: true,
        message: "✅ บันทึกสำเร็จและอัปเดตน้ำหนักคงเหลือแล้ว",
        data: {
          updatedMaterials: validMaterials.length,
          statusUpdatedRows: updateStatusResult.recordset.length || 0,
          groupsProcessed: groupId.length
        }
      });


    } catch (err) {
      // ===============================
      // ERROR HANDLING
      // ===============================
      if (transaction) {
        await transaction.rollback();
        console.error("\n❌❌❌ TRANSACTION ROLLED BACK ❌❌❌\n");
      }

      console.error("=== SQL ERROR ===");
      console.error("Error Message:", err.message);
      console.error("Error Stack:", err.stack);

      res.status(500).json({
        success: false,
        error: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });






  // router.post("/prep/mix/emulsion", async (req, res) => {
  //   const {
  //     mat,
  //     batch,
  //     productId,
  //     line_name,
  //     groupId,
  //     weight,
  //     operator,
  //     datetime: receiveDT,
  //     Dest,
  //     level_eu,
  //     selectedMaterials // [{rmfemu_id, mat, batch, weight, level_eu}]
  //   } = req.body;

  //   if (!mat || !batch || !productId || !weight) {
  //     return res.status(400).json({ success: false, message: "ข้อมูล mat, batch, productId, weight ต้องระบุ" });
  //   }

  //   if (!Array.isArray(groupId) || groupId.length === 0) {
  //     return res.status(400).json({ success: false, message: "ไม่มีข้อมูล groupId" });
  //   }

  //   if (!Array.isArray(selectedMaterials) || selectedMaterials.length === 0) {
  //     return res.status(400).json({ success: false, message: "ไม่มีข้อมูล selectedMaterials" });
  //   }

  //   let transaction;
  //   try {
  //     const pool = await connectToDatabase();
  //     transaction = await pool.transaction();
  //     await transaction.begin();

  //     // ดึง prod_rm_id
  //     const result = await transaction.request()
  //       .input("productId", productId)
  //       .input("mat", mat)
  //       .query(`
  //       SELECT prod_rm_id
  //       FROM ProdRawMat
  //       WHERE prod_Id = @productId AND mat = @mat
  //     `);

  //     if (result.recordset.length === 0) {
  //       return res.status(404).json({ success: false, message: "ไม่พบ prod_rm_id" });
  //     }

  //     const ProdrmID = result.recordset[0].prod_rm_id;

  //     // insert RMForProd สำหรับแต่ละ groupId
  //     for (const gID of groupId) {
  //       const rmfpResult = await transaction.request()
  //         .input("prod_rm_id", ProdrmID)
  //         .input("rm_group_id", gID)
  //         .input("batch", batch)
  //         .input("weight", weight)
  //         .input("rmfp_line_name", line_name)
  //         .input("stay_place", "จุดเตรียมรับเข้า")
  //         .input("dest", Dest)
  //         .input("level_eu", level_eu !== "-" ? level_eu : null)
  //         .query(`
  //         INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu)
  //         OUTPUT INSERTED.rmfp_id
  //         VALUES (@prod_rm_id, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu)
  //       `);

  //       const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

  //       // ⬇️ insert RM_EmuMixed ตาม selectedMaterials
  //       for (const material of selectedMaterials) {
  //         await transaction.request()
  //           .input("rmfp_id", RMFP_ID)
  //           .input("rmfemu_id", material.rmfemu_id)
  //           .query(`
  //           INSERT INTO RM_EmuMixed (rmfp_id, rmfemu_id)
  //           VALUES (@rmfp_id, @rmfemu_id)
  //         `);
  //       }

  //       // ดึง production info
  //       const SELECT_Production = await transaction.request()
  //         .input("rmfp_id", RMFP_ID)
  //         .query(`
  //         SELECT CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production
  //         FROM RMForProd rmf
  //         JOIN ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
  //         JOIN RawMat rm ON pr.mat = rm.mat
  //         JOIN Production p ON pr.prod_id = p.prod_id
  //         WHERE rmfp_id = @rmfp_id
  //       `);

  //       const production = SELECT_Production.recordset[0].production;

  //       // ดึง withdraw_date ที่น้อยที่สุด
  //       const minWithdrawResult = await transaction.request()
  //         .query(`
  //         SELECT MIN(his.withdraw_date) AS withdraw_date
  //         FROM RMForEmu rmemu
  //         JOIN History his
  //         ON rmemu.hist_id_rmfemu = his.hist_id
  //       `);

  //       const withdraw_date = minWithdrawResult.recordset[0]?.withdraw_date || null;


  //       // insert History
  //       const historyResult = await transaction.request()
  //         .input("receiver", operator)
  //         .input("withdraw_date", withdraw_date)
  //         .input("cooked_date", receiveDT)
  //         .input("first_prod", production)
  //         .query(`
  //         INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod, created_at)
  //         OUTPUT INSERTED.hist_id
  //         VALUES (@receiver, @withdraw_date, @cooked_date, @first_prod, GETDATE())
  //       `);

  //       const histID = historyResult.recordset[0].hist_id;

  //       // update RMForProd ด้วย hist_id
  //       await transaction.request()
  //         .input("hist_id", histID)
  //         .input("rmfp_id", RMFP_ID)
  //         .query(`
  //         UPDATE RMForProd
  //         SET hist_id_rmfp = @hist_id
  //         WHERE rmfp_id = @rmfp_id
  //       `);
  //     }

  //     await transaction.commit();

  //     // broadcast
  //     req.app.get("io").emit("rawMaterialSaved", {
  //       message: "Raw material data saved successfully!",
  //       productId,
  //       groupId,
  //       batch,
  //       weight,
  //       dest: Dest
  //     });

  //     res.json({ success: true, message: "บันทึกข้อมูล RMForProd + RM_EmuMixed สำเร็จ" });
  //   } catch (err) {
  //     if (transaction) await transaction.rollback();
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
  router.post("/prep/mix/emulsion", async (req, res) => {
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
      selectedMaterials // [{rmfemu_id, mat, batch, weight, level_eu}]
    } = req.body;

    if (!mat || !batch || !productId || !weight) {
      return res.status(400).json({ success: false, message: "ข้อมูล mat, batch, productId, weight ต้องระบุ" });
    }

    if (!Array.isArray(groupId) || groupId.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่มีข้อมูล groupId" });
    }

    if (!Array.isArray(selectedMaterials) || selectedMaterials.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่มีข้อมูล selectedMaterials" });
    }

    let transaction;
    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      // ✅ ดึง prod_rm_id
      const result = await transaction.request()
        .input("productId", productId)
        .input("mat", mat)
        .query(`
        SELECT prod_rm_id
        FROM ProdRawMat
        WHERE prod_Id = @productId AND mat = @mat
      `);

      if (result.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: "ไม่พบ prod_rm_id" });
      }

      const ProdrmID = result.recordset[0].prod_rm_id;

      // ✅ insert RMForProd สำหรับแต่ละ groupId
      for (const gID of groupId) {
        const rmfpResult = await transaction.request()
          .input("prod_rm_id", ProdrmID)
          .input("rm_group_id", gID)
          .input("batch", batch)
          .input("weight", weight)
          .input("rmfp_line_name", line_name)
          .input("stay_place", "จุดเตรียมรับเข้า")
          .input("dest", Dest)
          .input("row_status", "M_RM")
          .input("level_eu", level_eu !== "-" ? level_eu : null)
          .query(`
          INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu,row_status)
          OUTPUT INSERTED.rmfp_id
          VALUES (@prod_rm_id, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu,@row_status)
        `);

        const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

        // ✅ insert RM_EmuMixed ตาม selectedMaterials
        for (const material of selectedMaterials) {
          await transaction.request()
            .input("rmfp_id", RMFP_ID)
            .input("rmfemu_id", material.rmfemu_id)
            .query(`
            INSERT INTO RM_EmuMixed (rmfp_id, rmfemu_id)
            VALUES (@rmfp_id, @rmfemu_id)
          `);
        }

        // ✅ ดึง production info
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

        const production = SELECT_Production.recordset[0]?.production || null;
        if (!production) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: "ไม่พบข้อมูล production" });
        }

        // ✅ ดึง withdraw_date จาก selectedMaterials เท่านั้น
        const rmfemuIds = selectedMaterials.map(m => m.rmfemu_id);
        const minWithdrawResult = await transaction.request()
          .query(`
          SELECT MIN(his.withdraw_date) AS withdraw_date
          FROM RMForEmu rmemu
          JOIN History his
            ON rmemu.hist_id_rmfemu = his.hist_id
          WHERE rmemu.rmfemu_id IN (${rmfemuIds.join(",")})
        `);

        const withdraw_date = minWithdrawResult.recordset[0]?.withdraw_date || null;
        if (!withdraw_date) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: "ไม่พบ withdraw_date จาก selectedMaterials" });
        }

        // ✅ insert History
        const historyResult = await transaction.request()
          .input("receiver", operator)
          .input("withdraw_date", withdraw_date)
          .input("cooked_date", receiveDT)
          .input("first_prod", production)
          .query(`
          INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod, created_at)
          OUTPUT INSERTED.hist_id
          VALUES (@receiver, @withdraw_date, @cooked_date, @first_prod, GETDATE())
        `);

        if (historyResult.recordset.length === 0) {
          await transaction.rollback();
          return res.status(500).json({ success: false, message: "บันทึก History ไม่สำเร็จ" });
        }

        const histID = historyResult.recordset[0].hist_id;

        // ✅ update RMForProd ด้วย hist_id
        await transaction.request()
          .input("hist_id", histID)
          .input("rmfp_id", RMFP_ID)
          .query(`
          UPDATE RMForProd
          SET hist_id_rmfp = @hist_id
          WHERE rmfp_id = @rmfp_id
        `);
      }

      // ✅ commit transaction เมื่อทุกขั้นตอนผ่าน
      await transaction.commit();

      // ✅ broadcast event
      req.app.get("io").emit("rawMaterialSaved", {
        message: "Raw material data saved successfully!",
        productId,
        groupId,
        batch,
        weight,
        dest: Dest
      });

      res.json({ success: true, message: "บันทึกข้อมูล RMForProd + RM_EmuMixed สำเร็จ" });
    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post("/prep/mix/batch", async (req, res) => {
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
      selectedMaterials // [{rmfemu_id, mat, batch, weight, level_eu}]
    } = req.body;

    if (!mat || !batch || !productId || !weight) {
      return res.status(400).json({ success: false, message: "ข้อมูล mat, batch, productId, weight ต้องระบุ" });
    }

    if (!Array.isArray(groupId) || groupId.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่มีข้อมูล groupId" });
    }

    if (!Array.isArray(selectedMaterials) || selectedMaterials.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่มีข้อมูล selectedMaterials" });
    }

    let transaction;
    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      // ✅ ดึง prod_rm_id
      const result = await transaction.request()
        .input("productId", productId)
        .input("mat", mat)
        .query(`
        SELECT prod_rm_id
        FROM ProdRawMat
        WHERE prod_Id = @productId AND mat = @mat
      `);

      if (result.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: "ไม่พบ prod_rm_id" });
      }

      const ProdrmID = result.recordset[0].prod_rm_id;

      // ✅ insert RMForProd สำหรับแต่ละ groupId
      for (const gID of groupId) {
        const rmfpResult = await transaction.request()
          .input("prod_rm_id", ProdrmID)
          .input("rm_group_id", gID)
          .input("batch", "mix_batch_")
          .input("weight", weight)
          .input("rmfp_line_name", line_name)
          .input("stay_place", "จุดเตรียมรับเข้า")
          .input("dest", Dest)
          .input("row_status", "M_B")
          .input("level_eu", level_eu !== "-" ? level_eu : null)
          .query(`
          INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu,row_status)
          OUTPUT INSERTED.rmfp_id
          VALUES (@prod_rm_id, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu,@row_status)
        `);

        const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

        // ✅ insert RM_EmuMixed ตาม selectedMaterials
        for (const material of selectedMaterials) {
          await transaction.request()
            .input("rmfp_id", RMFP_ID)
            .input("rmfbatch_id", material.rmfbatch_id)
            .query(`
            INSERT INTO Mix_Batch_Prod (rmfp_id, rmfbatch_id)
            VALUES (@rmfp_id, @rmfbatch_id)
          `);
        }

        // ✅ ดึง production info
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

        const production = SELECT_Production.recordset[0]?.production || null;
        if (!production) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: "ไม่พบข้อมูล production" });
        }

        // ✅ ดึง withdraw_date จาก selectedMaterials เท่านั้น
        const rmfemuIds = selectedMaterials.map(m => m.rmfbatch_id);
        const minWithdrawResult = await transaction.request()
          .query(`
          SELECT MIN(his.withdraw_date) AS withdraw_date
          FROM RMMixBatch rmmb
          JOIN History his
            ON rmmb.hist_id_rmfbatch = his.hist_id
          WHERE rmmb.rmfbatch_id IN (${rmfemuIds.join(",")})
        `);

        const withdraw_date = minWithdrawResult.recordset[0]?.withdraw_date || null;
        if (!withdraw_date) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: "ไม่พบ withdraw_date จาก selectedMaterials" });
        }

        // ✅ insert History
        const historyResult = await transaction.request()
          .input("receiver", operator)
          .input("withdraw_date", withdraw_date)
          .input("cooked_date", receiveDT)
          .input("first_prod", production)
          .query(`
          INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod, created_at)
          OUTPUT INSERTED.hist_id
          VALUES (@receiver, @withdraw_date, @cooked_date, @first_prod, GETDATE())
        `);

        if (historyResult.recordset.length === 0) {
          await transaction.rollback();
          return res.status(500).json({ success: false, message: "บันทึก History ไม่สำเร็จ" });
        }

        const histID = historyResult.recordset[0].hist_id;

        // ✅ update RMForProd ด้วย hist_id
        await transaction.request()
          .input("hist_id", histID)
          .input("rmfp_id", RMFP_ID)
          .query(`
          UPDATE RMForProd
          SET hist_id_rmfp = @hist_id
          WHERE rmfp_id = @rmfp_id
        `);
      }

      // ✅ commit transaction เมื่อทุกขั้นตอนผ่าน
      await transaction.commit();

      // ✅ broadcast event
      req.app.get("io").emit("rawMaterialSaved", {
        message: "Raw material data saved successfully!",
        productId,
        groupId,
        batch,
        weight,
        dest: Dest
      });

      res.json({ success: true, message: "บันทึกข้อมูล RMForProd + RM_EmuMixed สำเร็จ" });
    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });



  // router.post("/prep/saveRMForEmu/for/emulsion/saprecievepage", async (req, res) => {
  //     const {
  //       mat,
  //       batch,
  //       line_name,
  //       groupId,
  //       weight,
  //       operator,
  //       withdraw_date,
  //       datetime: receiveDT,
  //       Receiver,
  //       userID,
  //       Dest,
  //       level_eu,
  //       sap_re_id,
  //       emulsion,
  //       status,
  //       emu_status
  //     } = req.body;

  //     let transaction;

  //     try {
  //       const pool = await connectToDatabase();
  //       transaction = await pool.transaction();
  //       await transaction.begin();

  //       const emulsion = await transaction
  //         .request()
  //         .input("status", 0)       // 0 = false, 1 = true
  //         .input("sap_re_id", sap_re_id)
  //         .query(`
  //     UPDATE SAP_Receive
  //     SET status = @status
  //     WHERE sap_re_id = @sap_re_id
  //     `);


  //       // ฟังก์ชัน insert
  //       const insertRMForEmu = async (groupID, stayPlace) => {
  //         const rmfemuResult = await transaction
  //           .request()
  //           .input("rm_group_id", groupID)
  //           .input("batch", batch)
  //           .input("mat", mat)
  //           .input("weight", weight)
  //           .input("rmfp_line_name", line_name)
  //           .input("stay_place", stayPlace)
  //           .input("dest", Dest)
  //           .input("level_eu", level_eu !== "-" ? level_eu : null)// ถ้า "-" ให้เก็บ NULL
  //           .input("emu_status", emu_status || '1')
  //           .query(`
  //             INSERT INTO RMForEmu (mat, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu, emu_status)
  //             OUTPUT INSERTED.rmfemu_id
  //             VALUES (@mat, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu, @emu_status)
  //           `);
  //         console.log("rmfemuResult:", rmfemuResult);

  //         const RMFEMU_ID = rmfemuResult.recordset[0].rmfemu_id;

  //         // Insert History
  //         const historyResult = await transaction
  //           .request()
  //           .input("receiver", operator)
  //           .input("withdraw_date", withdraw_date)
  //           .input("cooked_date", receiveDT)
  //           .query(`
  //             INSERT INTO History (receiver, withdraw_date, cooked_date)
  //             OUTPUT INSERTED.hist_id
  //             VALUES (@receiver, @withdraw, @cooked_date)
  //           `);

  //         if (historyResult.recordset.length === 0) {
  //           throw new Error("เกิดข้อผิดพลาดในการบันทึก History");
  //         }

  //         const histID = historyResult.recordset[0].hist_id;

  //         // อัปเดต RMForEmu ด้วย hist_id
  //         await transaction
  //           .request()
  //           .input("hist_id", histID)
  //           .input("rmfemu_id", RMFEMU_ID)
  //           .query(`
  //             UPDATE RMForEmu 
  //             SET hist_id_rmfemu = @hist_id
  //             WHERE rmfemu_id = @rmfemu_id
  //           `);

  //       };

  //       // เรียกใช้ insertRMForEmu ตามเงื่อนไข
  //       if (Dest === "หม้ออบ" || Dest === "เข้าห้องเย็น") {
  //         await insertRMForEmu(groupId, "จุดเตรียมรับเข้า");
  //       } else if (Dest === "จุดเตรียม") {
  //         await insertRMForEmu(groupId, "จุดเตรียมรับเข้า");
  //       }

  //       // commit transaction
  //       await transaction.commit();

  //       // Broadcast
  //       const broadcastData = {
  //         message: "Raw material data saved successfully!",
  //         groupId: groupId,
  //         batch: batch,
  //         weight: weight,
  //         dest: Dest,
  //       };

  //       req.app.get("io").emit("rawMaterialSaved", broadcastData);

  //       // Response
  //       res.json({ success: true, message: "บันทึกข้อมูลการสแกนเสร็จสิ้น" });
  //     } catch (err) {
  //       if (transaction) {
  //         await transaction.rollback();
  //       }
  //       console.error("SQL error", err);
  //       res.status(500).json({ success: false, error: err.message });
  //     }
  //   });
  router.post("/prep/saveRMForEmu/for/emulsion/saprecievepage", async (req, res) => {
    const {
      mat,
      batch,
      line_name,
      groupId,
      weight,
      operator,
      withdraw_date,
      datetime: receiveDT,
      Receiver,
      userID,
      Dest,
      level_eu,
      sap_re_id,
      status,
      emu_status,
      hu
    } = req.body;

    let transaction;

    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      // ✅ update SAP_Receive
      const updateEmulsionResult = await transaction
        .request()
        .input("status", 0) // 0 = false, 1 = true
        .input("sap_re_id", sap_re_id)
        .query(`
        UPDATE SAP_Receive
        SET status = @status
        WHERE sap_re_id = @sap_re_id
      `);

      // ✅ ฟังก์ชัน insert RMForEmu + History
      const insertRMForEmu = async (groupID, stayPlace) => {
        const rmfemuResult = await transaction
          .request()
          .input("rm_group_id", groupID)
          .input("batch", batch)
          .input("mat", mat)
          .input("weight", weight)
          .input("rmfp_line_name", line_name)
          .input("stay_place", stayPlace)
          .input("dest", Dest)
          .input("level_eu", level_eu !== "-" ? level_eu : null) // "-" ให้เก็บ NULL
          .input("emu_status", emu_status || "1")
          .input("hu", hu)
          .query(`
          INSERT INTO RMForEmu 
            (mat, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu, emu_status,hu)
          OUTPUT INSERTED.rmfemu_id
          VALUES (@mat, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu, @emu_status, @hu)
        `);

        const RMFEMU_ID = rmfemuResult.recordset[0].rmfemu_id;

        // ✅ Insert History
        const historyResult = await transaction
          .request()
          .input("receiver", operator)
          .input("withdraw_date", withdraw_date)
          .input("cooked_date", receiveDT)
          .query(`
          INSERT INTO History (receiver, withdraw_date, cooked_date, created_at)
          OUTPUT INSERTED.hist_id
          VALUES (@receiver, @withdraw_date, @cooked_date, GETDATE())
        `);

        if (historyResult.recordset.length === 0) {
          throw new Error("เกิดข้อผิดพลาดในการบันทึก History");
        }

        const histID = historyResult.recordset[0].hist_id;

        // ✅ update RMForEmu ด้วย hist_id
        await transaction
          .request()
          .input("hist_id", histID)
          .input("rmfemu_id", RMFEMU_ID)
          .query(`
          UPDATE RMForEmu 
          SET hist_id_rmfemu = @hist_id
          WHERE rmfemu_id = @rmfemu_id
        `);
      };

      // ✅ รองรับ groupId เป็น array หรือ single
      if (Array.isArray(groupId)) {
        for (const gID of groupId) {
          await insertRMForEmu(gID, "จุดเตรียมรับเข้า");
        }
      } else {
        await insertRMForEmu(groupId, "จุดเตรียมรับเข้า");
      }

      // ✅ commit
      await transaction.commit();

      // ✅ Broadcast
      req.app.get("io").emit("rawMaterialSaved", {
        message: "Raw material data saved successfully!",
        groupId,
        batch,
        weight,
        dest: Dest,
      });

      res.json({ success: true, message: "บันทึกข้อมูลการสแกนเสร็จสิ้น" });
    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/prep/getRMForProdEmuMixedList", async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
      SELECT 
        rmfp.rmfp_id,
        rmfp.batch AS Batch_RMForProd,
        pdrm.mat AS mat_RMForProd,
        rm2.mat_name AS mat_name_RMForProd,
        rmfp.weight,
        pdt.doc_no AS production,
        rmfp.rmfp_line_name,
        rmfp.level_eu,
        his.withdraw_date,

        rmem.emu_id,
        rmem.rmfemu_id,
        rmfe.batch AS Batch_Emulsion,
        rmfe.mat,
        rm.mat_name AS mat_name_Emulsion,
        rmfe.weight AS emu_weight,
        htr.withdraw_date AS emu_withdraw_date
      FROM RMForProd rmfp
      JOIN RM_EmuMixed rmem ON rmfp.rmfp_id = rmem.rmfp_id
      JOIN RMForEmu rmfe ON rmem.rmfemu_id = rmfe.rmfemu_id
      JOIN History his ON rmfe.hist_id_rmfemu = his.hist_id
      JOIN RawMat rm ON rmfe.mat = rm.mat
      JOIN ProdRawMat pdrm ON rmfp.prod_rm_id = pdrm.prod_rm_id
      JOIN RawMat rm2 ON pdrm.mat = rm2.mat
      JOIN Production pdt ON pdrm.prod_id = pdt.prod_id
      JOIN History htr ON rmfe.hist_id_rmfemu = htr.hist_id
      ORDER BY rmfp.rmfp_id DESC
    `);

      // แปลงผลลัพธ์เป็น nested structure
      const dataMap = {};
      result.recordset.forEach(row => {
        if (!dataMap[row.rmfp_id]) {
          dataMap[row.rmfp_id] = {
            rmfp_id: row.rmfp_id,
            Batch_RMForProd: row.Batch_RMForProd,
            mat_RMForProd: row.mat_RMForProd,
            mat_name_RMForProd: row.mat_name_RMForProd,
            weight: row.weight,
            production: row.production,
            rmfp_line_name: row.rmfp_line_name,
            level_eu: row.level_eu,
            withdraw_date: row.withdraw_date,
            emulsion: []
          };
        }

        dataMap[row.rmfp_id].emulsion.push({
          emu_id: row.emu_id,
          rmfemu_id: row.rmfemu_id,
          Batch_Emulsion: row.Batch_Emulsion,
          mat: row.mat,
          mat_name_Emulsion: row.mat_name_Emulsion,
          emu_weight: row.emu_weight,
          emu_withdraw_date: row.emu_withdraw_date
        });
      });

      const nestedData = Object.values(dataMap);

      res.json({ success: true, data: nestedData });
    } catch (err) {
      console.error("Fetch RMForProdList error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });



  // router.post("/prep/mix/emulsion", async (req, res) => {
  //   const {
  //     mat,
  //     batch,
  //     productId,
  //     line_name,
  //     groupId,
  //     weight,
  //     operator,
  //     datetime: receiveDT,
  //     Dest,
  //     level_eu,
  //     selectedMaterials // [{rmfemu_id, mat, batch, weight, level_eu}]
  //   } = req.body;


  //   if (!mat || !batch || !productId || !weight) {
  //     return res.status(400).json({ success: false, message: "ข้อมูล mat, batch, productId, weight ต้องระบุ" });
  //   }


  //   if (!Array.isArray(groupId) || groupId.length === 0) {
  //     return res.status(400).json({ success: false, message: "ไม่มีข้อมูล groupId" });
  //   }


  //   if (!Array.isArray(selectedMaterials) || selectedMaterials.length === 0) {
  //     return res.status(400).json({ success: false, message: "ไม่มีข้อมูล selectedMaterials" });
  //   }


  //   let transaction;
  //   try {
  //     const pool = await connectToDatabase();
  //     transaction = await pool.transaction();
  //     await transaction.begin();


  //     // ✅ ดึง prod_rm_id
  //     const result = await transaction.request()
  //       .input("productId", productId)
  //       .input("mat", mat)
  //       .query(`
  //       SELECT prod_rm_id
  //       FROM ProdRawMat
  //       WHERE prod_Id = @productId AND mat = @mat
  //     `);


  //     if (result.recordset.length === 0) {
  //       await transaction.rollback();
  //       return res.status(404).json({ success: false, message: "ไม่พบ prod_rm_id" });
  //     }


  //     const ProdrmID = result.recordset[0].prod_rm_id;


  //     // ✅ insert RMForProd สำหรับแต่ละ groupId
  //     for (const gID of groupId) {
  //       const rmfpResult = await transaction.request()
  //         .input("prod_rm_id", ProdrmID)
  //         .input("rm_group_id", gID)
  //         .input("batch", batch)
  //         .input("weight", weight)
  //         .input("rmfp_line_name", line_name)
  //         .input("stay_place", "จุดเตรียมรับเข้า")
  //         .input("dest", Dest)
  //         .input("level_eu", level_eu !== "-" ? level_eu : null)
  //         .query(`
  //         INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu)
  //         OUTPUT INSERTED.rmfp_id
  //         VALUES (@prod_rm_id, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu)
  //       `);


  //       const RMFP_ID = rmfpResult.recordset[0].rmfp_id;


  //       // ✅ insert RM_EmuMixed ตาม selectedMaterials
  //       for (const material of selectedMaterials) {
  //         await transaction.request()
  //           .input("rmfp_id", RMFP_ID)
  //           .input("rmfemu_id", material.rmfemu_id)
  //           .query(`
  //           INSERT INTO RM_EmuMixed (rmfp_id, rmfemu_id)
  //           VALUES (@rmfp_id, @rmfemu_id)
  //         `);
  //       }


  //       // ✅ ดึง production info
  //       const SELECT_Production = await transaction.request()
  //         .input("rmfp_id", RMFP_ID)
  //         .query(`
  //         SELECT CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production
  //         FROM RMForProd rmf
  //         JOIN ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
  //         JOIN RawMat rm ON pr.mat = rm.mat
  //         JOIN Production p ON pr.prod_id = p.prod_id
  //         WHERE rmfp_id = @rmfp_id
  //       `);


  //       const production = SELECT_Production.recordset[0]?.production || null;
  //       if (!production) {
  //         await transaction.rollback();
  //         return res.status(400).json({ success: false, message: "ไม่พบข้อมูล production" });
  //       }


  //       // ✅ ดึง withdraw_date จาก selectedMaterials เท่านั้น
  //       const rmfemuIds = selectedMaterials.map(m => m.rmfemu_id);
  //       const minWithdrawResult = await transaction.request()
  //         .query(`
  //         SELECT MIN(his.withdraw_date) AS withdraw_date
  //         FROM RMForEmu rmemu
  //         JOIN History his
  //           ON rmemu.hist_id_rmfemu = his.hist_id
  //         WHERE rmemu.rmfemu_id IN (${rmfemuIds.join(",")})
  //       `);


  //       const withdraw_date = minWithdrawResult.recordset[0]?.withdraw_date || null;
  //       if (!withdraw_date) {
  //         await transaction.rollback();
  //         return res.status(400).json({ success: false, message: "ไม่พบ withdraw_date จาก selectedMaterials" });
  //       }


  //       // ✅ insert History
  //       const historyResult = await transaction.request()
  //         .input("receiver", operator)
  //         .input("withdraw_date", withdraw_date)
  //         .input("cooked_date", receiveDT)
  //         .input("first_prod", production)
  //         .query(`
  //         INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod, created_at)
  //         OUTPUT INSERTED.hist_id
  //         VALUES (@receiver, @withdraw_date, @cooked_date, @first_prod, GETDATE())
  //       `);


  //       if (historyResult.recordset.length === 0) {
  //         await transaction.rollback();
  //         return res.status(500).json({ success: false, message: "บันทึก History ไม่สำเร็จ" });
  //       }


  //       const histID = historyResult.recordset[0].hist_id;


  //       // ✅ update RMForProd ด้วย hist_id
  //       await transaction.request()
  //         .input("hist_id", histID)
  //         .input("rmfp_id", RMFP_ID)
  //         .query(`
  //         UPDATE RMForProd
  //         SET hist_id_rmfp = @hist_id
  //         WHERE rmfp_id = @rmfp_id
  //       `);
  //     }


  //     // ✅ commit transaction เมื่อทุกขั้นตอนผ่าน
  //     await transaction.commit();


  //     // ✅ broadcast event
  //     req.app.get("io").emit("rawMaterialSaved", {
  //       message: "Raw material data saved successfully!",
  //       productId,
  //       groupId,
  //       batch,
  //       weight,
  //       dest: Dest
  //     });


  //     res.json({ success: true, message: "บันทึกข้อมูล RMForProd + RM_EmuMixed สำเร็จ" });
  //   } catch (err) {
  //     if (transaction) await transaction.rollback();
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });



  router.get("/prep/getRMMixBatch", async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
      SELECT 
        r.rmfbatch_id,
        r.batch,
        r.hu,
        r.mat,
        rm.mat_name,
        r.weight,
        h.withdraw_date,
        r.level_eu
      FROM RMMixBatch r
      LEFT JOIN History h ON r.hist_id_rmfbatch = h.hist_id
      JOIN Rawmat rm ON r.mat = rm.mat
      WHERE b_status = '1'
      ORDER BY r.rmfbatch_id DESC
    `);

      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error("Fetch RMForEmu error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/prep/getRMForEmuList", async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
      SELECT 
        r.rmfemu_id,
        r.batch,
        r.hu,
        r.mat,
        rm.mat_name,
        r.weight,
        h.withdraw_date,
        r.level_eu
      FROM RMForEmu r
      LEFT JOIN History h ON r.hist_id_rmfemu = h.hist_id
      JOIN Rawmat rm ON r.mat = rm.mat
      WHERE emu_status = '1'
      ORDER BY r.rmfemu_id DESC
    `);

      res.json({ success: true, data: result.recordset });
    } catch (err) {
      console.error("Fetch RMForEmu error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/prep/emulsion/mixed", async (req, res) => {
    try {
      const pool = await connectToDatabase();

      const result = await pool.request().query(`
      SELECT 
          rmfp.rmfp_id,
          rmfp.prod_rm_id,
          rmfe.batch,
          rmfp.weight,
          rmfp.dest,
          rmfp.rm_group_id,
          rmfp.rmfp_line_name,
          rmfp.level_eu,
          rmem.emu_id,
          rmem.rmfemu_id,
          rmfe.mat,
          rmfe.batch AS emu_batch,
          rmfe.weight AS emu_weight,
          rmfe.level_eu AS emu_level_eu
      FROM RMForProd rmfp
      JOIN RM_EmuMixed rmem 
          ON rmfp.rmfp_id = rmem.rmfp_id
      JOIN RMForEmu rmfe 
          ON rmem.rmfemu_id = rmfe.rmfemu_id
    `);

      res.status(200).json({
        success: true,
        data: result.recordset,
      });

    } catch (err) {
      console.error("SQL error:", err);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
      });
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

      const rmTypeIdsArray = rm_type_ids.split(",");
      const pool = await connectToDatabase();

      const query = `
  SELECT
      rmf.rmfp_id,
      CASE 
          WHEN rmf.batch LIKE 'mix_batch_' THEN 
              (SELECT STRING_AGG(rmmb.batch, ',')
               FROM Mix_Batch_Prod mbp2
               JOIN RMMixBatch rmmb ON mbp2.rmfbatch_id = rmmb.rmfbatch_id
               WHERE mbp2.rmfp_id = rmf.rmfp_id)
          ELSE rmf.batch
      END AS batch,
      rm.mat,
      rm.mat_name,
      rmf.dest,
      CONCAT(p.doc_no, ' (', rmf.rmfp_line_name, ')') AS production,
      rmg.rm_type_id,
      rmg.rm_group_name,
      rmg.cold,
      rmf.level_eu,
      htr.cooked_date,
      htr.withdraw_date
  FROM
      RMForProd rmf
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
      AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(",")})
  ORDER BY
      htr.cooked_date DESC;
`;

      const request = pool.request();
      rmTypeIdsArray.forEach((id, i) => {
        request.input(`rmTypeId${i}`, id);
      });

      const result = await request.query(query);

      // ✅ แปลงข้อมูล
      const formattedData = result.recordset.map(item => {
        // ➜ batchArray
        if (item.batch && item.batch.includes(",")) {
          item.batchArray = item.batch.split(",").map(v => v.trim());
        } else {
          item.batchArray = item.batch ? [item.batch.trim()] : [];
        }

        // ➜ จัดรูปแบบวันที่
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        const hours = String(date.getUTCHours()).padStart(2, "0");
        const minutes = String(date.getUTCMinutes()).padStart(2, "0");

        item.CookedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;
        delete item.cooked_date;

        return item;
      });

      // ✅ Broadcast ไปยังทุก client (ถ้ามี socket.io)
      if (io) io.to("saveRMForProdRoom").emit("dataUpdated", formattedData);

      res.json({ success: true, data: formattedData });




    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

   router.post("/prep/manage/saveTrolleyV2", async (req, res) => {
    const {
      license_plate,
      rmfpID,
      batchAfterArray,      // Array จาก frontend [{batch_before, batch_after}]
      ntray,
      recorder,
      weightTotal,
      Dest,
      Process,
      cookedDateTimeNew,
      preparedDateTimeNew,
      mixtimeNew,           // ✅ เพิ่มบรรทัดนี้
      cold,
      deliveryType,
      mat,
      detail,
      // batch_before,        
      // batch_after           
    } = req.body;

    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      
      // 1️⃣ ตรวจสอบ trolley
      const checkTrolley = await pool
        .request()
        .input("tro_id", license_plate)
        .query(`SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id`);

      if (checkTrolley.recordset.length === 0)
        return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });

      const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];
      if (tro_status !== "rsrv")
        return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });

      const now = new Date();
      const reservedTime = new Date(rsrv_timestamp);
      if ((now - reservedTime) / 1000 / 60 > 5)
        return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });

      // 2️⃣ เริ่ม Transaction
      await transaction.begin();

      // 3️⃣ ปรับสถานะ trolley เป็นใช้งาน
      await transaction
        .request()
        .input("tro_id", license_plate)
        .query(`UPDATE Trolley SET tro_status = '0', rsrv_timestamp = NULL WHERE tro_id = @tro_id`);

      // 4️⃣ ลบ tro_id ใน TrolleyRMMapping และ Slot
      await transaction
        .request()
        .input("tro_id", license_plate)
        .query(`UPDATE TrolleyRMMapping SET tro_id = NULL, tl_status = '1707' WHERE tro_id = @tro_id`);

      await transaction
        .request()
        .input("tro_id", license_plate)
        .query(`UPDATE Slot SET tro_id = NULL, status = '1708' WHERE tro_id = @tro_id`);

      // 5️⃣ ดึงข้อมูล RMForProd
      const dataRMForProd = await transaction
        .request()
        .input("rmfp_id", rmfpID)
        .query(`
        SELECT prod_rm_id, rmfp_line_name, level_eu, rm_group_id, hist_id_rmfp
        FROM RMForProd
        WHERE rmfp_id = @rmfp_id
      `);

      if (dataRMForProd.recordset.length === 0)
        throw new Error(`ไม่พบข้อมูล RMForProd สำหรับ rmfp_id: ${rmfpID}`);

      const { prod_rm_id, rmfp_line_name, level_eu, rm_group_id, hist_id_rmfp } = dataRMForProd.recordset[0];

      // 6️⃣ ดึงประเภทวัตถุดิบ
      const PullTypeRaw = await transaction
        .request()
        .input("mat", mat)
        .input("rm_group_id", rm_group_id)
        .query(`
        SELECT rmt.rm_type_name
        FROM RawMatCookedGroup rmcg
        JOIN RawMatType rmt ON rmcg.rm_type_id = rmt.rm_type_id
        WHERE rmcg.mat = @mat AND rmcg.rm_group_id = @rm_group_id
      `);

      if (PullTypeRaw.recordset.length === 0)
        throw new Error(`ไม่พบข้อมูลประเภทวัตถุดิบ สำหรับ mat: ${mat}`);

      const RawMat = PullTypeRaw.recordset[0].rm_type_name;

      // 7️⃣ ดึงข้อมูล History
      const dataHisRMForProd = await transaction
        .request()
        .input("hist_id_rmfp", hist_id_rmfp)
        .query(`
        SELECT withdraw_date, first_prod, two_prod, three_prod, 
               name_edit_prod_two, name_edit_prod_three, weight_RM, tray_count
        FROM History
        WHERE hist_id = @hist_id_rmfp
      `);

      // 8️⃣ กำหนด rm_status
      let rm_status = "รอQCตรวจสอบ";

      if (Dest === "รอCheckin") {
        rm_status = "รอQCตรวจสอบ";
      }
       if (Dest === "รอCheckin" && deliveryType === "รอกลับมาเตรียม") {
          rm_status = "รอกลับมาเตรียม";
    }

    
      // if (Dest === "เข้าห้องเย็น" && deliveryType === "รอกลับมาเตรียม") {
      //     rm_status = "รอกลับมาเตรียม";
      // if (Dest === "เข้าห้องเย็น" && deliveryType === "รอกลับมาเตรียม") {
      //     rm_status = "รอกลับมาเตรียม";
      //   } else if (Dest === "ผสมเตรียม" || Dest === "เข้าห้องเย็น") {
      //  rm_status = "รอQCตรวจสอบ";
      // }

      // 9️⃣ Insert TrolleyRMMapping ก่อน
      const mappingResult = await transaction
        .request()
        .input("tro_id", license_plate)
        .input("rmfp_id", rmfpID)
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
        .input("tl_status", "1.8")
        .input("detail", sql.VarChar(50), detail || null) // ✅ varchar(50)
        .query(`
    INSERT INTO [dbo].[TrolleyRMMapping] 
      (tro_id, rmfp_id, tro_production_id, batch_id, tray_count, stay_place, 
       dest, rm_status, process_id, weight_RM, level_eu, cold_time, 
       rmm_line_name, tl_status,detail)
    OUTPUT INSERTED.mapping_id
    VALUES (@tro_id, @rmfp_id, @tro_production_id, NULL, @tray_count, 
            @stay_place, @dest, @rm_status, @process_id, @weight_RM, 
            @level_eu, @cold_time, @rmm_line_name, @tl_status, @detail)
  `);

      const mapping_id = mappingResult.recordset[0].mapping_id;
      console.log("New mapping_id:", mapping_id);


      // 10️⃣ Insert Batch ตาม batchAfterArray
      const batchIds = [];

      if (!Array.isArray(batchAfterArray) || batchAfterArray.length === 0) {
        throw new Error("กรุณาส่ง batchAfterArray อย่างน้อย 1 แถว");
      }

      for (const item of batchAfterArray) {
        const beforeVal = item.batch_before?.trim();
        const afterVal = item.batch_after?.trim();

        if (!beforeVal || !afterVal) {
          throw new Error("batch_before และ batch_after ต้องไม่เป็นค่าว่าง");
        }

        const batchResult = await transaction
          .request()
          .input("mapping_id", mapping_id)
          .input("batch_before", beforeVal)
          .input("batch_after", afterVal)
          .query(`
      INSERT INTO Batch (mapping_id, batch_before, batch_after)
      OUTPUT INSERTED.batch_id
      VALUES (@mapping_id, @batch_before, @batch_after)
    `);

        batchIds.push(batchResult.recordset[0].batch_id);
      }


      // 11️⃣ Insert History
      await transaction
        .request()
        .input("mapping_id", mapping_id)
        .input("tro_id", license_plate)
        .input("cooked_date", cookedDateTimeNew)
        .input("prepared_date", preparedDateTimeNew)
        .input("start_mixed_date", mixtimeNew ? mixtimeNew : null)  // ✅ เปลี่ยนจาก || เป็น ?
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
        INSERT INTO History
        (mapping_id, tro_id, rmit_date, cooked_date, withdraw_date, receiver, 
         first_prod, two_prod, three_prod, name_edit_prod_two, name_edit_prod_three, 
         weight_RM, tray_count, rm_status,start_mixed_date, dest, rmm_line_name, stay_place, 
         created_at, location)
        OUTPUT INSERTED.hist_id
        VALUES (@mapping_id, @tro_id, @prepared_date, @cooked_date, @withdraw_date, 
                @receiver, @first_prod, @two_prod, @three_prod, @name_edit_prod_two, 
                @name_edit_prod_three, @weight_RM, @tray_count, @rm_status, @start_mixed_date,@dest,
                @rmm_line_name, @stay_place, GETDATE(), @location)
      `);

      // 12️⃣ Commit transaction
      await transaction.commit();

      res.status(200).json({
        success: true,
        message: "Data saved successfully",
        mapping_id,
        batchIds
      });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error:", err.message, err);
      res.status(500).json({ success: false, error: err.message });
    }
    
  });

  //API สำหรับเลือกรถเข็นและบันทึกข้อมูลการจัดการรถเข็น
  router.post("/prep/manage/saveTrolley", async (req, res) => {
    const {
      license_plate,
      rmfpID,
      batchAfterArray,      // Array จาก frontend [{batch_before, batch_after}]
      ntray,
      recorder,
      weightTotal,
      Dest,
      Process,
      cookedDateTimeNew,
      preparedDateTimeNew,
      cold,
      deliveryType,
      mat,
      // batch_before,        
      // batch_after           
    } = req.body;

    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      // 1️⃣ ตรวจสอบ trolley
      const checkTrolley = await pool
        .request()
        .input("tro_id", license_plate)
        .query(`SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id`);

      if (checkTrolley.recordset.length === 0)
        return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });

      const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];
      if (tro_status !== "rsrv")
        return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });

      const now = new Date();
      const reservedTime = new Date(rsrv_timestamp);
      if ((now - reservedTime) / 1000 / 60 > 5)
        return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });

      // 2️⃣ เริ่ม Transaction
      await transaction.begin();

      // 3️⃣ ปรับสถานะ trolley เป็นใช้งาน
      await transaction
        .request()
        .input("tro_id", license_plate)
        .query(`UPDATE Trolley SET tro_status = '0', rsrv_timestamp = NULL WHERE tro_id = @tro_id`);

      // 4️⃣ ลบ tro_id ใน TrolleyRMMapping และ Slot
      await transaction
        .request()
        .input("tro_id", license_plate)
        .query(`UPDATE TrolleyRMMapping SET tro_id = NULL, tl_status = '1707' WHERE tro_id = @tro_id`);

      await transaction
        .request()
        .input("tro_id", license_plate)
        .query(`UPDATE Slot SET tro_id = NULL, status = '1708' WHERE tro_id = @tro_id`);

      // 5️⃣ ดึงข้อมูล RMForProd
      const dataRMForProd = await transaction
        .request()
        .input("rmfp_id", rmfpID)
        .query(`
        SELECT prod_rm_id, rmfp_line_name, level_eu, rm_group_id, hist_id_rmfp
        FROM RMForProd
        WHERE rmfp_id = @rmfp_id
      `);

      if (dataRMForProd.recordset.length === 0)
        throw new Error(`ไม่พบข้อมูล RMForProd สำหรับ rmfp_id: ${rmfpID}`);

      const { prod_rm_id, rmfp_line_name, level_eu, rm_group_id, hist_id_rmfp } = dataRMForProd.recordset[0];

      // 6️⃣ ดึงประเภทวัตถุดิบ
      const PullTypeRaw = await transaction
        .request()
        .input("mat", mat)
        .input("rm_group_id", rm_group_id)
        .query(`
        SELECT rmt.rm_type_name
        FROM RawMatCookedGroup rmcg
        JOIN RawMatType rmt ON rmcg.rm_type_id = rmt.rm_type_id
        WHERE rmcg.mat = @mat AND rmcg.rm_group_id = @rm_group_id
      `);

      if (PullTypeRaw.recordset.length === 0)
        throw new Error(`ไม่พบข้อมูลประเภทวัตถุดิบ สำหรับ mat: ${mat}`);

      const RawMat = PullTypeRaw.recordset[0].rm_type_name;

      // 7️⃣ ดึงข้อมูล History
      const dataHisRMForProd = await transaction
        .request()
        .input("hist_id_rmfp", hist_id_rmfp)
        .query(`
        SELECT withdraw_date, first_prod, two_prod, three_prod, 
               name_edit_prod_two, name_edit_prod_three, weight_RM, tray_count
        FROM History
        WHERE hist_id = @hist_id_rmfp
      `);

      // 8️⃣ กำหนด rm_status
      let rm_status = "รอQCตรวจสอบ";
      if (Dest === "เข้าห้องเย็น" && deliveryType === "รอกลับมาเตรียม") rm_status = "รอกลับมาเตรียม";

      // 9️⃣ Insert TrolleyRMMapping ก่อน
      const mappingResult = await transaction
        .request()
        .input("tro_id", license_plate)
        .input("rmfp_id", rmfpID)
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
        .input("tl_status", "1.8")
        .query(`
    INSERT INTO [dbo].[TrolleyRMMapping] 
      (tro_id, rmfp_id, tro_production_id, batch_id, tray_count, stay_place, 
       dest, rm_status, process_id, weight_RM, level_eu, cold_time, 
       rmm_line_name, tl_status)
    OUTPUT INSERTED.mapping_id
    VALUES (@tro_id, @rmfp_id, @tro_production_id, NULL, @tray_count, 
            @stay_place, @dest, @rm_status, @process_id, @weight_RM, 
            @level_eu, @cold_time, @rmm_line_name, @tl_status)
  `);

      const mapping_id = mappingResult.recordset[0].mapping_id;
      console.log("New mapping_id:", mapping_id);


      // 10️⃣ Insert Batch ตาม batchAfterArray
      const batchIds = [];

      if (!Array.isArray(batchAfterArray) || batchAfterArray.length === 0) {
        throw new Error("กรุณาส่ง batchAfterArray อย่างน้อย 1 แถว");
      }

      for (const item of batchAfterArray) {
        const beforeVal = item.batch_before?.trim();
        const afterVal = item.batch_after?.trim();

        if (!beforeVal || !afterVal) {
          throw new Error("batch_before และ batch_after ต้องไม่เป็นค่าว่าง");
        }

        const batchResult = await transaction
          .request()
          .input("mapping_id", mapping_id)
          .input("batch_before", beforeVal)
          .input("batch_after", afterVal)
          .query(`
      INSERT INTO Batch (mapping_id, batch_before, batch_after)
      OUTPUT INSERTED.batch_id
      VALUES (@mapping_id, @batch_before, @batch_after)
    `);

        batchIds.push(batchResult.recordset[0].batch_id);
      }


      // 11️⃣ Insert History
      await transaction
        .request()
        .input("mapping_id", mapping_id)
        .input("tro_id", license_plate)
        .input("cooked_date", cookedDateTimeNew)
        .input("prepared_date", preparedDateTimeNew)
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
        INSERT INTO History
        (mapping_id, tro_id, rmit_date, cooked_date, withdraw_date, receiver, 
         first_prod, two_prod, three_prod, name_edit_prod_two, name_edit_prod_three, 
         weight_RM, tray_count, rm_status, dest, rmm_line_name, stay_place, 
         created_at, location)
        OUTPUT INSERTED.hist_id
        VALUES (@mapping_id, @tro_id, @prepared_date, @cooked_date, @withdraw_date, 
                @receiver, @first_prod, @two_prod, @three_prod, @name_edit_prod_two, 
                @name_edit_prod_three, @weight_RM, @tray_count, @rm_status, @dest, 
                @rmm_line_name, @stay_place, GETDATE(), @location)
      `);

      // 12️⃣ Commit transaction
      await transaction.commit();

      res.status(200).json({
        success: true,
        message: "Data saved successfully",
        mapping_id,
        batchIds
      });

    } catch (err) {
      if (transaction) await transaction.rollback();
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
  //-----------------------------------------------------------------------------------------------------------------------
  // API สำหรับบันทึกข้อมูลจาก ModalSlip3 (ไม่มีรถเข็น - แค่บันทึกข้อมูลในสลิป)
  router.post("/prep/manage/PrintMapping", async (req, res) => {
    const {
      rmfpID,
      batchAfterArray,
      ntray,
      recorder,
      weightTotal,
      Dest,
      Process,
      cookedDateTimeNew,
      preparedDateTimeNew,
      deliveryType,
      mat,
      level_eu,
      userID,
      batch_before,
      batch_after
    } = req.body;

    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      // 1️⃣ ตรวจสอบข้อมูลที่จำเป็น
      if (!rmfpID) {
        return res.status(400).json({
          success: false,
          error: "ไม่พบ rmfp_id"
        });
      }

      if (!mat) {
        return res.status(400).json({
          success: false,
          error: "ไม่พบรหัสวัตถุดิบ (mat)"
        });
      }

      if (!Array.isArray(batchAfterArray) || batchAfterArray.length === 0) {
        if (!batch_before || !batch_after) {
          return res.status(400).json({
            success: false,
            error: "กรุณาระบุข้อมูล Batch"
          });
        }
      }

      // 2️⃣ เริ่ม Transaction
      await transaction.begin();

      // 3️⃣ ดึงข้อมูล RMForProd
      const dataRMForProd = await transaction
        .request()
        .input("rmfp_id", rmfpID)
        .query(`
        SELECT prod_rm_id, rmfp_line_name, level_eu, rm_group_id, hist_id_rmfp
        FROM RMForProd
        WHERE rmfp_id = @rmfp_id
      `);

      if (dataRMForProd.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูล RMForProd สำหรับ rmfp_id: ${rmfpID}`);
      }

      const {
        prod_rm_id,
        rmfp_line_name,
        level_eu: rmfp_level_eu,
        rm_group_id,
        hist_id_rmfp
      } = dataRMForProd.recordset[0];

      // ใช้ level_eu จาก request ถ้ามี ไม่งั้นใช้จาก RMForProd
      const finalLevelEu = level_eu || rmfp_level_eu;

      // 4️⃣ ดึงประเภทวัตถุดิบ
      const PullTypeRaw = await transaction
        .request()
        .input("mat", mat)
        .input("rm_group_id", rm_group_id)
        .query(`
        SELECT rmt.rm_type_name
        FROM RawMatCookedGroup rmcg
        JOIN RawMatType rmt ON rmcg.rm_type_id = rmt.rm_type_id
        WHERE rmcg.mat = @mat AND rmcg.rm_group_id = @rm_group_id
      `);

      if (PullTypeRaw.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูลประเภทวัตถุดิบ สำหรับ mat: ${mat}`);
      }

      const RawMat = PullTypeRaw.recordset[0].rm_type_name;

      // 5️⃣ ดึงข้อมูล History
      const dataHisRMForProd = await transaction
        .request()
        .input("hist_id_rmfp", hist_id_rmfp)
        .query(`
        SELECT withdraw_date, first_prod, two_prod, three_prod, 
               name_edit_prod_two, name_edit_prod_three, weight_RM, tray_count
        FROM History
        WHERE hist_id = @hist_id_rmfp
      `);

      // 6️⃣ กำหนด rm_status (ไม่มีการเช็ค QC)
      let rm_status = "จุดเตรียม";
      if (Dest === "เข้าห้องเย็น") {
        if (deliveryType === "รอกลับมาเตรียม") {
          rm_status = "รอกลับมาเตรียม";
        } else {
          rm_status = "เสร็จสิ้น";
        }
      }

      // 7️⃣ Insert TrolleyRMMapping (ไม่มี tro_id - บันทึกเฉพาะข้อมูลการเตรียม)
      const mappingResult = await transaction
        .request()
        .input("rmfp_id", rmfpID)
        .input("tro_production_id", prod_rm_id)
        .input("rm_status", rm_status)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("stay_place", "จุดเตรียม")
        .input("process_id", Process)
        .input("level_eu", finalLevelEu)
        .input("dest", Dest)
        .input("rmm_line_name", rmfp_line_name)
        .input("tl_status", "DeeNah")
        .query(`
        INSERT INTO TrolleyRMMapping 
        (rmfp_id, tro_production_id, tray_count, stay_place, 
         dest, rm_status, process_id, weight_RM, level_eu, 
         rmm_line_name, tl_status)
        OUTPUT INSERTED.mapping_id
        VALUES (@rmfp_id, @tro_production_id, @tray_count, 
                @stay_place, @dest, @rm_status, @process_id, @weight_RM, 
                @level_eu, @rmm_line_name, @tl_status)
      `);

      const mapping_id = mappingResult.recordset[0].mapping_id;

      // 8️⃣ Insert Batch ตาม batchAfterArray
      const batchIds = [];
      if (Array.isArray(batchAfterArray) && batchAfterArray.length > 0) {
        for (const item of batchAfterArray) {
          const beforeVal = item.batch_before?.trim() || "";
          const afterVal = item.batch_after?.trim() || "";

          if (beforeVal && afterVal) {
            const batchResult = await transaction
              .request()
              .input("mapping_id", mapping_id)
              .input("batch_before", beforeVal)
              .input("batch_after", afterVal)
              .query(`
              INSERT INTO Batch (mapping_id, batch_before, batch_after)
              OUTPUT INSERTED.batch_id
              VALUES (@mapping_id, @batch_before, @batch_after)
            `);
            batchIds.push(batchResult.recordset[0].batch_id);
          }
        }
      } else {
        // fallback สำหรับกรณีไม่มี batchAfterArray
        if (batch_before && batch_after) {
          const batchResult = await transaction
            .request()
            .input("mapping_id", mapping_id)
            .input("batch_before", batch_before.trim())
            .input("batch_after", batch_after.trim())
            .query(`
            INSERT INTO Batch (mapping_id, batch_before, batch_after)
            OUTPUT INSERTED.batch_id
            VALUES (@mapping_id, @batch_before, @batch_after)
          `);
          batchIds.push(batchResult.recordset[0].batch_id);
        }
      }

      // 9️⃣ Insert History
      await transaction
        .request()
        .input("mapping_id", mapping_id)
        .input("cooked_date", cookedDateTimeNew)
        .input("prepared_date", preparedDateTimeNew)
        .input("withdraw_date", dataHisRMForProd.recordset[0]?.withdraw_date || null)
        .input("receiver", recorder)
        .input("first_prod", dataHisRMForProd.recordset[0]?.first_prod || null)
        .input("two_prod", dataHisRMForProd.recordset[0]?.two_prod || null)
        .input("three_prod", dataHisRMForProd.recordset[0]?.three_prod || null)
        .input("name_edit_prod_two", dataHisRMForProd.recordset[0]?.name_edit_prod_two || null)
        .input("name_edit_prod_three", dataHisRMForProd.recordset[0]?.name_edit_prod_three || null)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("rm_status", rm_status)
        .input("dest", Dest)
        .input("rmm_line_name", rmfp_line_name)
        .input("stay_place", "จุดเตรียม")
        .input("location", `จุดเตรียม${RawMat}`)

        .query(`
        INSERT INTO History
        (mapping_id, rmit_date, cooked_date, withdraw_date, receiver, 
         first_prod, two_prod, three_prod, name_edit_prod_two, name_edit_prod_three, 
         weight_RM, tray_count, rm_status, dest, rmm_line_name, stay_place, 
         created_at, location)
        OUTPUT INSERTED.hist_id
        VALUES (@mapping_id, @prepared_date, @cooked_date, @withdraw_date, 
                @receiver, @first_prod, @two_prod, @three_prod, @name_edit_prod_two, 
                @name_edit_prod_three, @weight_RM, @tray_count, @rm_status, @dest, 
                @rmm_line_name, @stay_place, GETDATE(), @location)
      `);

      // 🔟 Update RMForProd status
      await transaction
        .request()
        .input("rmfp_id", rmfpID)
        .input("rm_status", rm_status)
        .query(`
        UPDATE RMForProd 
        SET stay_place = 'จุดเตรียม',
            rm_status = @rm_status
        WHERE rmfp_id = @rmfp_id
      `);

      // 1️⃣1️⃣ Commit transaction
      await transaction.commit();

      // 1️⃣2️⃣ Broadcast การอัพเดทข้อมูล
      io.to('saveRMForProdRoom').emit('dataUpdated', {
        action: 'trolley_saved',
        mapping_id,
        rmfp_id: rmfpID
      });

      res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลสำเร็จ",
        mapping_id,
        batchIds,
        rmfp_id: rmfpID
      });

    } catch (err) {
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackErr) {
          console.error("Rollback error:", rollbackErr);
        }
      }
      console.error("SQL error:", err.message, err);
      res.status(500).json({
        success: false,
        error: err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
      });
    }
  });

  // API สำหรับดึงข้อมูล TrolleyRMMapping (ไม่มีรถเข็นและ QC)
  router.get("/prep/manage/fetchTrolleyRMMapping", async (req, res) => {
    try {
      const { rm_type_ids, mapping_id } = req.query;

      const sql = require("mssql");
      const pool = await connectToDatabase();
      let query = `
      SELECT 
        trm.mapping_id,
        trm.rmfp_id,
        trm.tro_production_id,
        trm.tray_count,
        trm.stay_place,
        trm.dest,
        trm.rm_status,
        trm.process_id,
        trm.weight_RM,
        trm.level_eu,
        trm.rmm_line_name,
        trm.tl_status,
        trm.created_at,
        pr.mat,
        rm.mat_name,
        p.doc_no,
        pt.process_name,
        STRING_AGG(CONCAT(b.batch_before, ' → ', b.batch_after), ', ') AS batch_info
      FROM TrolleyRMMapping trm
      LEFT JOIN ProdRawMat pr ON trm.tro_production_id = pr.prod_rm_id
      LEFT JOIN RawMat rm ON pr.mat = rm.mat
      LEFT JOIN Production p ON pr.prod_id = p.prod_id
      LEFT JOIN Process pt ON trm.process_id = pt.process_id
      LEFT JOIN Batch b ON trm.mapping_id = b.mapping_id
      WHERE trm.tro_id IS NULL
    `;

      const request = pool.request();

      // กรณีต้องการดึงข้อมูลเฉพาะ mapping_id
      if (mapping_id) {
        query += ` AND trm.mapping_id = @mapping_id`;
        request.input("mapping_id", mapping_id);
      }

      // กรณีต้องการกรองตาม rm_type_ids
      if (rm_type_ids) {
        const rmTypeIdsArray = rm_type_ids.split(',');
        query += ` AND EXISTS (
        SELECT 1 FROM RawMatCookedGroup rmcg
        JOIN RawMatGroup rmg ON rmcg.rm_group_id = rmg.rm_group_id
        WHERE rmcg.mat = pr.mat 
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map((t, i) => `@rm_type_${i}`).join(',')})
      )`;

        rmTypeIdsArray.forEach((typeId, i) => {
          request.input(`rm_type_${i}`, typeId);
        });
      }

      query += `
      GROUP BY 
        trm.mapping_id, trm.rmfp_id, trm.tro_production_id,
        trm.tray_count, trm.stay_place, trm.dest, trm.rm_status,
        trm.process_id, trm.weight_RM, trm.level_eu,
        trm.rmm_line_name, trm.tl_status, trm.created_at,
        pr.mat, rm.mat_name, p.doc_no, pt.process_name
      ORDER BY trm.created_at DESC
    `;

      const result = await request.query(query);

      res.json({
        success: true,
        data: result.recordset,
        count: result.recordset.length
      });

    } catch (err) {
      console.error("SQL error", err);
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
        rmm.rm_status = 'QcCheck'
        AND rmm.dest = 'รอCheckin'
        AND rmf.rm_group_id = rmg.rm_group_id
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

  router.get("/prep/getMixToPack", async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
      SELECT 
        mtp.mixtp_id,
        rmfp.batch,
        rmfp.hu,
        rm.mat,
        rm.mat_name,
        mtp.weight_RM,
        mtp.level_eu,
        
        -- ✅ รวม doc_no กับ rmm_line_name
        CONCAT(p.doc_no, ' (', mtp.rmm_line_name, ')') AS production,
        
        mtp.rm_status,

        -- ✅ qc_date จาก History
        FORMAT(
          h.qc_date,
          'yyyy-MM-dd HH:mm:ss'
        ) AS qc_date,

        -- ✅ withdraw_date จาก History (เป็น varchar ไม่ต้อง FORMAT)
        h.withdraw_date

      FROM MixToPack mtp

      JOIN RMForProd rmfp 
        ON mtp.rmfp_id = rmfp.rmfp_id

      JOIN ProdRawMat prod 
        ON rmfp.prod_rm_id = prod.prod_rm_id

      JOIN RawMat rm 
        ON prod.mat = rm.mat

      -- ✅ เพิ่ม JOIN กับตาราง Production
      JOIN Production p
        ON prod.prod_id = p.prod_id

      -- ✅ LEFT JOIN กับ History โดยใช้ from_mapping_id
      LEFT JOIN History h
        ON mtp.from_mapping_id = h.mapping_id

      WHERE LTRIM(RTRIM(mtp.dest)) = N'ผสมเตรียม'
        AND mtp.rm_status = N'QcCheck'

      ORDER BY mtp.mixtp_id DESC
    `);

      res.json({
        success: true,
        data: result.recordset
      });

    } catch (err) {
      console.error("Fetch getMixToPack error:", err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  router.post('/delete/MixToPack', async (req, res) => {
    const { mixtp_id } = req.body;
    const sql = require("mssql");

    console.log("=== DELETE MIXTOPACK ===");
    console.log("mixtp_id:", mixtp_id);

    if (!mixtp_id) {
      return res.status(400).json({
        success: false,
        error: "Missing mixtp_id"
      });
    }

    try {
      const pool = await connectToDatabase();

      // ตรวจสอบว่ามีข้อมูลหรือไม่
      const checkResult = await pool.request()
        .input('mixtp_id', sql.Int, parseInt(mixtp_id))
        .query(`SELECT mixtp_id FROM MixToPack WHERE mixtp_id = @mixtp_id`);

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: "ไม่พบ mixtp_id ใน MixToPack"
        });
      }

      // อัปเดตสถานะ (ไม่ใช้ transaction)
      await pool.request()
        .input('mixtp_id', sql.Int, parseInt(mixtp_id))
        .query(`
        UPDATE MixToPack 
        SET stay_place = N'จุดเตรียมลบจากปุ่มเคลียร์',
            dest = N'จุดเตรียมลบจากปุ่มเคลียร์',
            status = N'ลบแล้ว',
            updated_at = GETDATE()
        WHERE mixtp_id = @mixtp_id
      `);

      console.log("✅ อัปเดตสำเร็จ");

      return res.json({
        success: true,
        message: 'อัปเดตสถานะเรียบร้อยแล้ว'
      });

    } catch (err) {
      console.error('❌ ERROR:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  router.post("/prep/mix/MixToPack", async (req, res) => {
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
      selectedMaterials // [{mixtp_id, mat, batch, weight, level_eu}]
    } = req.body;

    // ===============================
    // VALIDATION
    // ===============================
    if (!mat || !batch || !productId || !weight) {
      return res.status(400).json({
        success: false,
        message: "ข้อมูล mat, batch, productId, weight ต้องระบุ"
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

    let transaction;

    try {
      const pool = await connectToDatabase();
      transaction = await pool.transaction();
      await transaction.begin();

      console.log("=== START TRANSACTION ===");
      console.log("Product ID:", productId);
      console.log("Material:", mat);
      console.log("Batch:", batch);
      console.log("Weight:", weight);
      console.log("Selected Materials:", selectedMaterials.length);
      console.log("========================\n");

      // ===============================
      // ⭐ STEP 0: อัปเดตน้ำหนักคงเหลือแบบ BULK (ปรับปรุงแล้ว)
      // ===============================
      console.log("=== STEP 0: UPDATING WEIGHTS (BULK) ===");

      // 1️⃣ สร้าง list ของ mixtp_id และ weight ที่จะ update
      const validMaterials = selectedMaterials.filter(m => m.mixtp_id && m.weight);

      if (validMaterials.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "ไม่มีข้อมูลวัตถุดิบที่ถูกต้อง"
        });
      }

      const mixIdList = validMaterials
        .map(m => `(${m.mixtp_id}, ${parseFloat(m.weight)})`)
        .join(',');

      // 2️⃣ ตรวจสอบน้ำหนักคงเหลือทั้งหมดพร้อมกัน (1 query เดียว)
      const checkWeightResult = await transaction.request()
        .query(`
        WITH UpdateData AS (
          SELECT mixtp_id, weight_to_deduct
          FROM (VALUES ${mixIdList}) AS T(mixtp_id, weight_to_deduct)
        )
        SELECT 
          mtp.mixtp_id,
          mtp.weight_RM as current_weight,
          ud.weight_to_deduct,
          rm.mat as material_code,
          rmfp.batch as material_batch,
          CASE 
            WHEN mtp.weight_RM < ud.weight_to_deduct THEN 1
            ELSE 0
          END as is_insufficient
        FROM UpdateData ud
        JOIN MixToPack mtp ON ud.mixtp_id = mtp.mixtp_id
        JOIN RMForProd rmfp ON mtp.rmfp_id = rmfp.rmfp_id
        JOIN ProdRawMat prod ON rmfp.prod_rm_id = prod.prod_rm_id
        JOIN RawMat rm ON prod.mat = rm.mat
        ORDER BY mtp.mixtp_id
      `);

      if (checkWeightResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "❌ ไม่พบข้อมูลวัตถุดิบที่ระบุ"
        });
      }

      // 3️⃣ ตรวจสอบว่ามีน้ำหนักไม่พอหรือไม่
      const insufficientItems = checkWeightResult.recordset.filter(item => item.is_insufficient === 1);

      if (insufficientItems.length > 0) {
        const first = insufficientItems[0];
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `❌ น้ำหนักคงเหลือไม่เพียงพอสำหรับ ${first.material_code} (Batch: ${first.material_batch})
น้ำหนักคงเหลือ: ${first.current_weight.toFixed(2)} กก.
ต้องการใช้: ${first.weight_to_deduct.toFixed(2)} กก.`
        });
      }

      // 4️⃣ แสดงข้อมูลก่อน update
      console.log("📊 วัตถุดิบที่จะอัปเดต:");
      checkWeightResult.recordset.forEach(item => {
        console.log(`  📦 ${item.material_code} (Batch: ${item.material_batch}):`, {
          current: item.current_weight.toFixed(2) + ' kg',
          toDeduct: item.weight_to_deduct.toFixed(2) + ' kg',
          remaining: (item.current_weight - item.weight_to_deduct).toFixed(2) + ' kg'
        });
      });

      // 5️⃣ UPDATE น้ำหนักทั้งหมดพร้อมกัน (1 query เดียว)
      const updateWeightResult = await transaction.request()
        .query(`
        WITH UpdateData AS (
          SELECT mixtp_id, weight_to_deduct
          FROM (VALUES ${mixIdList}) AS T(mixtp_id, weight_to_deduct)
        )
        UPDATE mtp
        SET weight_RM = mtp.weight_RM - ud.weight_to_deduct
        OUTPUT 
          DELETED.mixtp_id,
          DELETED.weight_RM as old_weight,
          INSERTED.weight_RM as new_weight,
          ud.weight_to_deduct
        FROM MixToPack mtp
        JOIN UpdateData ud ON mtp.mixtp_id = ud.mixtp_id
      `);

      // 6️⃣ แสดงผลการอัปเดต
      console.log(`\n✅ อัปเดตน้ำหนัก ${updateWeightResult.recordset.length} รายการพร้อมกัน:`);
      updateWeightResult.recordset.forEach(row => {
        console.log(`  ✓ mixtp_id ${row.mixtp_id}:`, {
          old: row.old_weight.toFixed(2) + ' kg',
          deducted: row.weight_to_deduct.toFixed(2) + ' kg',
          new: row.new_weight.toFixed(2) + ' kg',
          status: row.new_weight === 0 ? '🗑️ จะถูกอัปเดตเป็น USED' : '✓ คงเหลือ'
        });
      });

      console.log("========================\n");

      // ===============================
      // STEP 1: ดึง prod_rm_id
      // ===============================
      console.log("=== STEP 1: Get prod_rm_id ===");

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
          message: "ไม่พบ prod_rm_id"
        });
      }

      const prod_rm_id = prodResult.recordset[0].prod_rm_id;
      console.log("prod_rm_id:", prod_rm_id);

      // ===============================
      // STEP 2: Loop ตาม groupId
      // ===============================
      console.log("\n=== STEP 2: Processing Groups ===");

      for (const gID of groupId) {
        console.log(`\n📋 Processing group ID: ${gID}`);

        // ===============================
        // STEP 2.1: INSERT RMForProd
        // ===============================
        const rmfpResult = await transaction.request()
          .input("prod_rm_id", prod_rm_id)
          .input("batch", batch)
          .input("weight", weight)
          .input("dest", Dest || "จุดเตรียม")
          .input("stay_place", "จุดเตรียมรับเข้า")
          .input("rm_group_id", gID)
          .input("rmfp_line_name", line_name || "")
          .input("level_eu", level_eu !== "-" ? level_eu : null)
          .input("row_status", "M_M")
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
        console.log("  ✅ Created RMForProd with rmfp_id:", RMFP_ID);

        // ===============================
        // STEP 2.2: INSERT RM_MixInclude (BULK - ปรับปรุงแล้ว)
        // ===============================
        console.log("  📝 Inserting RM_MixInclude records (BULK)...");

        const mixIncludeValues = validMaterials
          .map(m => `(${RMFP_ID}, ${m.mixtp_id})`)
          .join(',');

        if (mixIncludeValues.length > 0) {
          await transaction.request()
            .query(`
            INSERT INTO RM_MixInclude (rmfp_id, mixtp_id)
            VALUES ${mixIncludeValues}
          `);

          console.log(`    ✅ Inserted ${validMaterials.length} records in 1 query`);
        } else {
          console.warn("    ⚠️ No mixtp_id to insert");
        }

        // ===============================
        // STEP 2.3: ดึง withdraw_date
        // ===============================
        const fromMappingIds = validMaterials
          .map(m => m.mixtp_id)
          .filter(id => id != null && id !== undefined && id !== '' && !isNaN(id));

        let withdraw_date = null;

        if (fromMappingIds.length > 0) {
          try {
            const minWithdrawResult = await transaction.request()
              .query(`
              SELECT MIN(his.withdraw_date) AS withdraw_date
              FROM MixToPack mtp
              LEFT JOIN History his 
                ON mtp.from_mapping_id = his.mapping_id
              WHERE mtp.mixtp_id IN (${fromMappingIds.join(",")})
            `);

            withdraw_date = minWithdrawResult.recordset[0]?.withdraw_date || null;

            if (withdraw_date) {
              console.log("  📅 withdraw_date:", withdraw_date);
            }
          } catch (error) {
            console.error("  ❌ Error in withdraw_date query:", error);
          }
        }

        if (!withdraw_date) {
          const now = new Date();
          now.setHours(now.getHours() + 7);
          withdraw_date = now.toISOString().slice(0, 19).replace('T', ' ');
          console.warn("  ⚠️ ไม่พบ withdraw_date, ใช้เวลาปัจจุบัน:", withdraw_date);
        }

        // ===============================
        // STEP 2.4: ดึง production info
        // ===============================
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

        const production = SELECT_Production.recordset[0]?.production || null;

        if (!production) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "ไม่พบข้อมูล production"
          });
        }

        console.log("  🏭 Production:", production);

        // ===============================
        // STEP 2.5: INSERT History
        // ===============================
        const historyResult = await transaction.request()
          .input("receiver", operator || "")
          .input("withdraw_date", withdraw_date)
          .input("cooked_date", receiveDT || null)
          .input("first_prod", production)
          .query(`
          INSERT INTO History (
            receiver, withdraw_date, cooked_date, first_prod, created_at
          )
          OUTPUT INSERTED.hist_id
          VALUES (
            @receiver, @withdraw_date, @cooked_date, @first_prod, GETDATE()
          )
        `);

        const histID = historyResult.recordset[0].hist_id;
        console.log("  ✅ Created History with hist_id:", histID);

        // ===============================
        // STEP 2.6: UPDATE RMForProd.hist_id_rmfp
        // ===============================
        await transaction.request()
          .input("hist_id", histID)
          .input("rmfp_id", RMFP_ID)
          .query(`
          UPDATE RMForProd
          SET hist_id_rmfp = @hist_id
          WHERE rmfp_id = @rmfp_id
        `);

        console.log(`  ✅ Updated RMForProd ${RMFP_ID} with hist_id ${histID}`);
      }

      // ===============================
      // STEP 3: UPDATE status แทนการลบ
      // ===============================
      console.log("\n=== STEP 3: Update Status for Zero Weight Rows ===");

      const updateStatusResult = await transaction.request()
        .query(`
        UPDATE MixToPack
        SET 
          rm_status = 'USED',
          updated_at = GETDATE()
        OUTPUT 
          INSERTED.mixtp_id,
          INSERTED.weight_RM,
          INSERTED.rmfp_id,
          INSERTED.rm_status
        WHERE weight_RM <= 0
      `);

      if (updateStatusResult.recordset.length > 0) {
        console.log(`✅ Updated status to 'USED' for ${updateStatusResult.recordset.length} row(s):`);
        updateStatusResult.recordset.forEach(row => {
          console.log(`  ↳ mixtp_id ${row.mixtp_id} (rmfp_id: ${row.rmfp_id}, weight: ${row.weight_RM})`);
        });
      } else {
        console.log("✓ No rows with zero weight to update");
      }

      // ===============================
      // COMMIT TRANSACTION
      // ===============================
      await transaction.commit();
      console.log("\n✅✅✅ TRANSACTION COMMITTED SUCCESSFULLY ✅✅✅\n");

      // ===============================
      // BROADCAST EVENTS
      // ===============================
      const io = req.app.get("io");
      if (io) {
        io.emit("trolleyRMMappingSaved", {
          message: "น้ำหนักอัปเดตสำเร็จ!",
          productId,
          groupId,
          batch,
          weight,
          selectedMaterials: validMaterials.length
        });

        io.to("saveRMForProdRoom").emit("dataUpdated", {
          message: "MixToPack weights updated",
          timestamp: new Date().toISOString()
        });

        console.log("📡 Events broadcasted");
      }

      // ===============================
      // RESPONSE
      // ===============================
      res.json({
        success: true,
        message: "✅ บันทึกสำเร็จและอัปเดตน้ำหนักคงเหลือแล้ว",
        data: {
          updatedMaterials: validMaterials.length,
          statusUpdatedRows: updateStatusResult.recordset.length || 0,
          groupsProcessed: groupId.length
        }
      });

    } catch (err) {
      // ===============================
      // ERROR HANDLING
      // ===============================
      if (transaction) {
        await transaction.rollback();
        console.error("\n❌❌❌ TRANSACTION ROLLED BACK ❌❌❌\n");
      }

      console.error("=== SQL ERROR ===");
      console.error("Error Message:", err.message);
      console.error("Error Stack:", err.stack);

      res.status(500).json({
        success: false,
        error: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });



  // API สำหรับดึงข้อมูล RMForProd
  router.get("/prep/toColdOven/fetchRMForProd", async (req, res) => {
    try {
      const { rm_type_ids } = req.query;

      if (!rm_type_ids) {
        return res.status(400).json({
          success: false,
          error: "RM Type IDs are required"
        });
      }

      const rmTypeIdsArray = rm_type_ids.split(',');
      const pool = await connectToDatabase();

      const query = `
      SELECT
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmf.dest, 
        CONCAT(p.doc_no, ' (', rmf.rmfp_line_name, ')') AS production,
        rmg.rm_type_id,
        rmf.level_eu,
        htr.cooked_date,
        htr.withdraw_date,
        rmf.stay_place,
        rmf.rm_status
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

      // Format วันที่
      const formattedData = result.recordset.map(item => {
        // Format cooked_date
        if (item.cooked_date) {
          const date = new Date(item.cooked_date);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          item.CookedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;
          delete item.cooked_date;
        }

        // Format withdraw_date
        if (item.withdraw_date) {
          const date = new Date(item.withdraw_date);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          item.withdraw_date = `${day}/${month}/${year} ${hours}:${minutes}`;
        }

        return item;
      });

      // Broadcast ไปทุก client ที่อยู่ในห้องนี้
      io.to('saveRMForProdRoom').emit('dataUpdated', formattedData);

      res.json({
        success: true,
        data: formattedData,
        count: formattedData.length
      });

    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });
  //-----------------------------------------------------------------------------------------------------------------------
  // router.post("/prep/saveRMForProd", async (req, res) => {
  //   const { mat, batch, productId, line_name, groupId, weight, operator, withdraw, datetime: receiveDT, Receiver, userID, Dest, level_eu } = req.body;

  //   if (Array.isArray(groupId) && groupId.length > 0) {
  //     let transaction;

  //     try {
  //       const pool = await connectToDatabase();
  //       transaction = await pool.transaction();
  //       await transaction.begin();

  //       // ดึงค่า prod_rm_id จากฐานข้อมูล
  //       const result = await transaction.request()
  //         .input("productId", productId)
  //         .input("mat", mat)
  //         .query(`
  //           SELECT prod_rm_id
  //           FROM ProdRawMat
  //           WHERE prod_Id = @productId AND mat = @mat
  //         `);

  //       if (result.recordset.length === 0) {
  //         console.error("ไม่พบ prod_rm_id สำหรับ productId และ mat ที่ระบุ");
  //         return res.status(404).json({ success: false, message: "ไม่พบข้อมูล prod_rm_id" });
  //       }

  //       const ProdrmID = result.recordset[0].prod_rm_id;

  //       const insertRMForProd = async (groupID, stayPlace) => {
  //         for (let i = 0; i < groupID.length; i++) {
  //           const rmfpResult = await transaction.request()
  //             .input("prod_rm_id", ProdrmID)
  //             .input("rm_group_id", groupID[i])
  //             .input("batch", batch)
  //             .input("weight", weight)
  //             .input("rmfp_line_name", line_name)
  //             .input("stay_place", stayPlace)
  //             .input("dest", Dest)
  //             .input("level_eu", level_eu !== "-" ? level_eu : null)  // Store EU level or NULL if "-"

  //             .query(`
  //               INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name,level_eu)
  //               OUTPUT INSERTED.rmfp_id
  //               VALUES (@prod_rm_id, @batch,  @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name,@level_eu)
  //             `);

  //           const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

  //           const SELECT_Production = await transaction.request()
  //             .input("rmfp_id", RMFP_ID)
  //             .query(`SELECT
  //                   CONCAT(p.doc_no, ' (', rmfp_line_name, ')') AS production
  //               FROM
  //                   RMForProd rmf
  //               JOIN
  //                   ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id

  //               JOIN
  //                   RawMat rm ON pr.mat = rm.mat
  //               JOIN
  //                   Production p ON pr.prod_id = p.prod_id
  //               WHERE rmfp_id = @rmfp_id
  //                   `
  //             )

  //           const production = SELECT_Production.recordset[0].production;

  //           // Insert ข้อมูลเข้า History และดึง hist_id ที่พึ่ง insert
  //           const historyResult = await transaction.request()
  //             .input("receiver", operator)
  //             .input("withdraw", withdraw)
  //             .input("cooked_date", receiveDT)
  //             .input("first_prod", production)
  //             .query(`
  //               INSERT INTO History (receiver, withdraw_date, cooked_date,first_prod,created_at)
  //               OUTPUT INSERTED.hist_id
  //               VALUES (@receiver, @withdraw, @cooked_date, @first_prod,GETDATE())
  //             `);

  //           if (historyResult.recordset.length === 0) {
  //             console.error("เกิดข้อผิดพลาดในการบันทึก History");
  //             return;
  //           }

  //           const histID = historyResult.recordset[0].hist_id;

  //           // อัปเดต RMForProd ด้วย hist_id
  //           await transaction.request()
  //             .input("hist_id", histID)
  //             .input("rmfp_id", RMFP_ID)
  //             .query(`
  //               UPDATE RMForProd 
  //               SET hist_id_rmfp = @hist_id
  //               WHERE rmfp_id = @rmfp_id
  //             `);
  //         }
  //       };

  //       if (Dest === "หม้ออบ" || Dest === "เข้าห้องเย็น") {
  //         await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
  //       } else if (Dest === "จุดเตรียม") {
  //         await insertRMForProd(groupId, "จุดเตรียมรับเข้า");
  //       }

  //       await transaction.commit();

  //       // Broadcast a message to all connected clients when the data is successfully saved
  //       const broadcastData = {
  //         message: "Raw material data saved successfully!",
  //         productId: productId,
  //         groupId: groupId,
  //         batch: batch,
  //         weight: weight,
  //         dest: Dest
  //       };

  //       // Emit the event to all connected clients
  //       req.app.get("io").emit("rawMaterialSaved", broadcastData);

  //       // Send the response
  //       res.json({ success: true, message: "บันทึกข้อมูลการแสกนเสร็จสิ้น" });
  //     } catch (err) {
  //       if (transaction) {
  //         await transaction.rollback();
  //       }
  //       console.error("SQL error", err);
  //       res.status(500).json({ success: false, error: err.message });
  //     }
  //   }
  // });
  router.post("/prep/saveRMForProd", async (req, res) => {
    const {
      mat,
      batch,
      productId,
      line_name,
      groupId,
      weight,
      operator,
      withdraw,
      datetime: receiveDT,
      Receiver,
      userID,
      Dest,
      level_eu
    } = req.body;

    if (!Array.isArray(groupId) || groupId.length === 0) {
      return res.status(400).json({ success: false, message: "groupId ต้องเป็น array และมีอย่างน้อย 1 ค่า" });
    }

    let transaction;
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
        WHERE prod_id = @productId AND mat = @mat
      `);

      if (result.recordset.length === 0) {
        throw new Error("ไม่พบ prod_rm_id สำหรับ productId และ mat ที่ระบุ");
      }

      const ProdrmID = result.recordset[0].prod_rm_id;

      // ✅ ฟังก์ชัน insert
      const insertRMForProd = async (groupID, stayPlace) => {
        const rmfpResult = await transaction.request()
          .input("prod_rm_id", ProdrmID)
          .input("rm_group_id", groupID)
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

        const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

        // ✅ ดึง production
        const SELECT_Production = await transaction.request()
          .input("rmfp_id", RMFP_ID)
          .query(`
          SELECT CONCAT(p.doc_no, ' (', rmf.rmfp_line_name, ')') AS production
          FROM RMForProd rmf
          JOIN ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
          JOIN RawMat rm ON pr.mat = rm.mat
          JOIN Production p ON pr.prod_id = p.prod_id
          WHERE rmf.rmfp_id = @rmfp_id
        `);

        const production = SELECT_Production.recordset[0]?.production || null;

        // ✅ Insert History
        const historyResult = await transaction.request()
          .input("receiver", operator)
          .input("withdraw_date", withdraw)
          .input("cooked_date", receiveDT)
          .input("first_prod", production)
          .query(`
          INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod, created_at)
          OUTPUT INSERTED.hist_id
          VALUES (@receiver, @withdraw_date, @cooked_date, @first_prod, GETDATE())
        `);

        if (historyResult.recordset.length === 0) {
          throw new Error("เกิดข้อผิดพลาดในการบันทึก History");
        }

        const histID = historyResult.recordset[0].hist_id;

        // ✅ update RMForProd
        await transaction.request()
          .input("hist_id", histID)
          .input("rmfp_id", RMFP_ID)
          .query(`
          UPDATE RMForProd 
          SET hist_id_rmfp = @hist_id
          WHERE rmfp_id = @rmfp_id
        `);
      };

      // ✅ loop groupId
      for (const gID of groupId) {
        await insertRMForProd(gID, "จุดเตรียมรับเข้า");
      }

      await transaction.commit();

      // ✅ Broadcast
      req.app.get("io").emit("rawMaterialSaved", {
        message: "Raw material data saved successfully!",
        productId,
        groupId,
        batch,
        weight,
        dest: Dest,
      });

      res.json({ success: true, message: "บันทึกข้อมูลการสแกนเสร็จสิ้น" });
    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

router.post("/prep/create/rm/forprod", async (req, res) => {

  const {
    mat,
    batch,
    productId,
    line_name,
    groupId,
    weight,
    operator,
    withdraw,
    cooked_date,
    rmit_date,
    qc_date,
    come_cold_date,
    out_cold_date,
    come_cold_date_two,
    out_cold_date_two,
    come_cold_date_three,
    out_cold_date_three,
    level_eu,
    detail,
    tray_count,
  } = req.body;

  console.log("📅 withdraw received:", withdraw);
  console.log("📅 cooked_date received:", cooked_date);

  // =========================
  // Helper Functions
  // =========================

  // ส่ง string "YYYY-MM-DD HH:mm:ss" ตรงๆ ให้ SQL Server
  // เพื่อป้องกัน timezone shift (-7 ชั่วโมง)
  const toDateOrNull = (val) => {
    if (!val) return null;
    if (typeof val !== "string" || !val.trim()) return null;
    const trimmed = val.trim();
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) return null;
    return trimmed;
  };

  const toFloatOrNull = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const f = parseFloat(val);
    return isNaN(f) ? null : f;
  };

  const toIntOrNull = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const i = parseInt(val);
    return isNaN(i) ? null : i;
  };

  const groupIdArray = Array.isArray(groupId)
    ? groupId
    : groupId !== null && groupId !== undefined
    ? [groupId]
    : [];

  if (!groupIdArray.length) {
    return res
      .status(400)
      .json({ success: false, message: "groupId ต้องมีอย่างน้อย 1 ค่า" });
  }

  let transaction;

  try {
    const pool = await connectToDatabase();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // ====================================
    // ดึง doc_line
    // ====================================
    let doc_line = null;

    if (productId) {
      const docResult = await transaction
        .request()
        .input("productId", sql.Int, productId)
        .query(`
          SELECT pr.prod_id, p.doc_no
          FROM ProdRawMat pr
          JOIN Production p ON pr.prod_id = p.prod_id
          WHERE pr.prod_rm_id = @productId
        `);

      if (docResult.recordset.length > 0) {
        const doc_no = docResult.recordset[0].doc_no;
        doc_line = line_name ? `${doc_no} (${line_name})` : doc_no;
      }
    }

    // ====================================
    // Loop groupId
    // ====================================
    for (const gID of groupIdArray) {
      // ======================
      // 1) Insert RMForProd
      // ======================
      const rmfpResult = await transaction
        .request()
        .input("prod_rm_id", sql.Int, toIntOrNull(productId))
        .input("rm_group_id", sql.Int, toIntOrNull(gID))
        .input("batch", sql.VarChar(50), batch || null)
        .input("weight", sql.Float, toFloatOrNull(weight))
        .input("rmfp_line_name", sql.VarChar(50), line_name || null)
        .input("level_eu", sql.VarChar(20), level_eu && level_eu !== "-" ? level_eu : null)
        .input("data_status", sql.VarChar(20), "Manual")
        .query(`
          INSERT INTO RMForProd
          (prod_rm_id, batch, weight, rm_group_id, rmfp_line_name, level_eu, data_status)
          OUTPUT INSERTED.rmfp_id
          VALUES
          (@prod_rm_id, @batch, @weight, @rm_group_id, @rmfp_line_name, @level_eu, @data_status)
        `);

      const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

      // ======================
      // 2) Insert QC
      // ======================
      const qcResult = await transaction
        .request()
        .input("qc_datetime", sql.NVarChar(30), toDateOrNull(qc_date))
        .query(`
          INSERT INTO QC
          (color, odor, texture, sq_acceptance,
           md, defect, defect_acceptance,
           qc_datetime, qccheck, mdcheck, defectcheck)
          OUTPUT INSERTED.qc_id
          VALUES
          (1,1,1,0,1,1,0,
           CASE WHEN @qc_datetime IS NOT NULL THEN CONVERT(datetime, @qc_datetime, 120) ELSE NULL END,
           N'ผ่าน',N'ผ่าน',N'ผ่าน')
        `);

      const QC_ID = qcResult.recordset[0].qc_id;

      // ======================
      // 3) Insert TrolleyRMMapping
      // ======================
      const mappingResult = await transaction
        .request()
        .input("rmfp_id", sql.Int, RMFP_ID)
        .input("qc_id", sql.Int, QC_ID)
        .input("tro_production_id", sql.Int, toIntOrNull(productId))
        .input("detail", sql.NVarChar(sql.MAX), detail || null)
        .input("tray_count", sql.Int, toIntOrNull(tray_count))
        .input("weight_RM", sql.Float, toFloatOrNull(weight))
        .input("level_eu", sql.VarChar(20), level_eu && level_eu !== "-" ? level_eu : null)
        .input("rmm_line_name", sql.VarChar(50), line_name || null)
        .query(`
          INSERT INTO TrolleyRMMapping
          (rmfp_id, qc_id, tro_production_id,
           detail, tray_count, weight_RM, level_eu,
           rm_status, stay_place, dest, rmm_line_name)
          OUTPUT INSERTED.mapping_id
          VALUES
          (@rmfp_id, @qc_id, @tro_production_id,
           @detail, @tray_count, @weight_RM, @level_eu,
           N'QcCheck', N'create_manual', N'create_manual', @rmm_line_name)
        `);

      const MAPPING_ID = mappingResult.recordset[0].mapping_id;

      // ======================
      // 4) Insert History
      // ======================
      const historyResult = await transaction
        .request()
        .input("receiver",              sql.NVarChar(100),  operator || null)
        .input("withdraw_date",         sql.NVarChar(30),   toDateOrNull(withdraw))
        .input("cooked_date",           sql.NVarChar(30),   toDateOrNull(cooked_date))
        .input("rmit_date",             sql.NVarChar(30),   toDateOrNull(rmit_date))
        .input("qc_date",               sql.NVarChar(30),   toDateOrNull(qc_date))
        .input("come_cold_date",        sql.NVarChar(30),   toDateOrNull(come_cold_date))
        .input("out_cold_date",         sql.NVarChar(30),   toDateOrNull(out_cold_date))
        .input("come_cold_date_two",    sql.NVarChar(30),   toDateOrNull(come_cold_date_two))
        .input("out_cold_date_two",     sql.NVarChar(30),   toDateOrNull(out_cold_date_two))
        .input("come_cold_date_three",  sql.NVarChar(30),   toDateOrNull(come_cold_date_three))
        .input("out_cold_date_three",   sql.NVarChar(30),   toDateOrNull(out_cold_date_three))
        .input("first_prod",            sql.NVarChar(100),  doc_line)
        .input("two_prod",              sql.NVarChar(100),  null)
        .input("three_prod",            sql.NVarChar(100),  null)
        .input("mapping_id",            sql.Int,            MAPPING_ID)
        .query(`
          INSERT INTO History
          (receiver, withdraw_date, cooked_date, rmit_date, qc_date,
           come_cold_date, out_cold_date,
           come_cold_date_two, out_cold_date_two,
           come_cold_date_three, out_cold_date_three,
           first_prod, two_prod, three_prod,
           mapping_id, created_at)
          OUTPUT INSERTED.hist_id
          VALUES
          (@receiver,
           CASE WHEN @withdraw_date        IS NOT NULL THEN CONVERT(datetime, @withdraw_date,        120) ELSE NULL END,
           CASE WHEN @cooked_date          IS NOT NULL THEN CONVERT(datetime, @cooked_date,          120) ELSE NULL END,
           CASE WHEN @rmit_date            IS NOT NULL THEN CONVERT(datetime, @rmit_date,            120) ELSE NULL END,
           CASE WHEN @qc_date              IS NOT NULL THEN CONVERT(datetime, @qc_date,              120) ELSE NULL END,
           CASE WHEN @come_cold_date       IS NOT NULL THEN CONVERT(datetime, @come_cold_date,       120) ELSE NULL END,
           CASE WHEN @out_cold_date        IS NOT NULL THEN CONVERT(datetime, @out_cold_date,        120) ELSE NULL END,
           CASE WHEN @come_cold_date_two   IS NOT NULL THEN CONVERT(datetime, @come_cold_date_two,   120) ELSE NULL END,
           CASE WHEN @out_cold_date_two    IS NOT NULL THEN CONVERT(datetime, @out_cold_date_two,    120) ELSE NULL END,
           CASE WHEN @come_cold_date_three IS NOT NULL THEN CONVERT(datetime, @come_cold_date_three, 120) ELSE NULL END,
           CASE WHEN @out_cold_date_three  IS NOT NULL THEN CONVERT(datetime, @out_cold_date_three,  120) ELSE NULL END,
           @first_prod, @two_prod, @three_prod,
           @mapping_id, GETDATE())
        `);

      const HIST_ID = historyResult.recordset[0].hist_id;

      // ======================
      // 5) Update RMForProd
      // ======================
      await transaction
        .request()
        .input("hist_id", sql.Int, HIST_ID)
        .input("rmfp_id", sql.Int, RMFP_ID)
        .query(`
          UPDATE RMForProd
          SET hist_id_rmfp = @hist_id
          WHERE rmfp_id = @rmfp_id
        `);

      // ======================
      // 6) Insert Batch
      // ======================
      await transaction
        .request()
        .input("mapping_id", sql.Int, MAPPING_ID)
        .input("batch", sql.VarChar(50), batch || null)
        .query(`
          INSERT INTO Batch (batch_before, batch_after, mapping_id)
          VALUES (@batch, @batch, @mapping_id)
        `);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "บันทึกข้อมูลสำเร็จ",
    });
  } catch (err) {
    if (transaction) await transaction.rollback();

    console.error("❌ FULL ERROR:", err);
    console.error("❌ MESSAGE:", err.message);
    console.error("❌ LINE:", err.lineNumber);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


  // router.post("/prep/create/rm/forprod", async (req, res) => {
  //   const {
  //     mat,
  //     batch,
  //     productId,
  //     line_name,
  //     groupId,
  //     weight,
  //     operator,
  //     withdraw,
  //     level_eu,
  //     datetime: receiveDT,

  //   } = req.body;

  //   if (!Array.isArray(groupId) || groupId.length === 0) {
  //     return res.status(400).json({ success: false, message: "groupId ต้องเป็น array และมีอย่างน้อย 1 ค่า" });
  //   }

  //   let transaction;
  //   try {
  //     const pool = await connectToDatabase();
  //     transaction = await pool.transaction();
  //     await transaction.begin();

  //     // ✅ ดึงค่า prod_rm_id
  //     const result = await transaction.request()
  //       .input("productId", productId)
  //       .input("mat", mat)
  //       .query(`
  //       SELECT prod_rm_id
  //       FROM ProdRawMat
  //       WHERE prod_id = @productId AND mat = @mat
  //     `);

  //     if (result.recordset.length === 0) {
  //       throw new Error("ไม่พบ prod_rm_id สำหรับ productId และ mat ที่ระบุ");
  //     }

  //     const ProdrmID = result.recordset[0].prod_rm_id;

  //     // ✅ ฟังก์ชัน insert
  //     const insertRMForProd = async (groupID, stayPlace) => {
  //       const rmfpResult = await transaction.request()
  //         .input("prod_rm_id", ProdrmID)
  //         .input("rm_group_id", groupID)
  //         .input("batch", batch)
  //         .input("weight", weight)
  //         .input("rmfp_line_name", line_name)
  //         .input("stay_place", stayPlace)
  //         .input("dest", 'บรรจุ')
  //         .input("level_eu", level_eu !== "-" ? level_eu : null)
  //         .query(`
  //         INSERT INTO RMForProd (prod_rm_id, batch, weight, dest, stay_place, rm_group_id, rmfp_line_name, level_eu)
  //         OUTPUT INSERTED.rmfp_id
  //         VALUES (@prod_rm_id, @batch, @weight, @dest, @stay_place, @rm_group_id, @rmfp_line_name, @level_eu)
  //       `);

  //       const RMFP_ID = rmfpResult.recordset[0].rmfp_id;

  //       // ✅ ดึง production
  //       const SELECT_Production = await transaction.request()
  //         .input("rmfp_id", RMFP_ID)
  //         .query(`
  //         SELECT CONCAT(p.doc_no, ' (', rmf.rmfp_line_name, ')') AS production
  //         FROM RMForProd rmf
  //         JOIN ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
  //         JOIN RawMat rm ON pr.mat = rm.mat
  //         JOIN Production p ON pr.prod_id = p.prod_id
  //         WHERE rmf.rmfp_id = @rmfp_id
  //       `);

  //       const production = SELECT_Production.recordset[0]?.production || null;

  //       // ✅ Insert History
  //       const historyResult = await transaction.request()
  //         .input("receiver", operator)
  //         .input("withdraw_date", withdraw)
  //         .input("cooked_date", receiveDT)
  //         .input("first_prod", production)
  //         .query(`
  //         INSERT INTO History (receiver, withdraw_date, cooked_date, first_prod, created_at)
  //         OUTPUT INSERTED.hist_id
  //         VALUES (@receiver, @withdraw_date, @cooked_date, @first_prod, GETDATE())
  //       `);

  //       if (historyResult.recordset.length === 0) {
  //         throw new Error("เกิดข้อผิดพลาดในการบันทึก History");
  //       }

  //       const histID = historyResult.recordset[0].hist_id;

  //       // ✅ update RMForProd
  //       await transaction.request()
  //         .input("hist_id", histID)
  //         .input("rmfp_id", RMFP_ID)
  //         .query(`
  //         UPDATE RMForProd 
  //         SET hist_id_rmfp = @hist_id
  //         WHERE rmfp_id = @rmfp_id
  //       `);
  //     };

  //     // ✅ loop groupId
  //     for (const gID of groupId) {
  //       await insertRMForProd(gID, "จุดเตรียมรับเข้า");
  //     }

  //     await transaction.commit();

  //     // ✅ Broadcast
  //     req.app.get("io").emit("rawMaterialSaved", {
  //       message: "Raw material data saved successfully!",
  //       productId,
  //       groupId,
  //       batch,
  //       weight,
  //       dest: 'บรรจุ'

  //     });

  //     res.json({ success: true, message: "บันทึกข้อมูลการสแกนเสร็จสิ้น" });
  //   } catch (err) {
  //     if (transaction) await transaction.rollback();
  //     console.error("SQL error", err);
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

  // router.post("/prep/toColdOven/saveTrolley", async (req, res) => {
  //   const { license_plate, rmfpID, ntray, recorder, weight, weightTotal, rm_status, name_edit_prod, after_prod, before_prod, mat } = req.body;
  //   const sql = require("mssql");
  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);

  //   try {
  //     await transaction.begin();



  //     const RawMat = PullTypeRaw.recordset[0].rm_type_name;

  //     // ดึงข้อมูลจากตาราง RMForProd
  //     const dataRMForProd = await transaction.request()
  //       .input("rmfp_id", rmfpID)
  //       .query(`
  //         SELECT
  //           prod_rm_id,
  //           stay_place,
  //           dest,
  //           hist_id_rmfp,
  //           rmfp_line_name,
  //           level_eu,
  //           rm_group_id
  //         FROM
  //           RMForProd
  //         WHERE
  //           rmfp_id = @rmfp_id
  //       `);

  //     if (dataRMForProd.recordset.length === 0) {
  //       throw new Error(`ไม่พบข้อมูล RMForProd สำหรับ rmfp_id: ${rmfpID}`);
  //     }


  //     const PullTypeRaw = await transaction.request()
  //       .input("mat", mat)
  //       .input("rm_group_id", dataRMForProd.recordset[0].rm_group_id)
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

  //     // ดึงข้อมูลจาก History
  //     const dataHisRMForProd = await transaction.request()
  //       .input("hist_id_rmfp", dataRMForProd.recordset[0].hist_id_rmfp)
  //       .query(`
  //         SELECT withdraw_date,cooked_date,name_edit_prod_two,name_edit_prod_three,first_prod,two_prod,three_prod
  //         FROM History
  //         WHERE hist_id = @hist_id_rmfp
  //       `);

  //     // การแทรกข้อมูลใน RMInTrolley
  //     const insertResult = await transaction.request()
  //       .input("tro_id", license_plate)
  //       .input("rmfp_id", rmfpID)
  //       .input("tro_production_id", dataRMForProd.recordset[0].prod_rm_id)
  //       .input("rm_status", rm_status)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("dest", dataRMForProd.recordset[0].dest)
  //       .input("level_eu", dataRMForProd.recordset[0].level_eu)
  //       .input("stay_place", "จุดเตรียม")
  //       .input("rmm_line_name", dataRMForProd.recordset[0].rmfp_line_name)
  //       .query(`
  //         INSERT INTO TrolleyRMMapping (tro_id, rmfp_id, tro_production_id, stay_place, dest, rm_status, tray_count, level_eu,rmm_line_name,weight_RM,created_at)
  //         OUTPUT INSERTED.mapping_id
  //         VALUES (@tro_id, @rmfp_id, @tro_production_id, @stay_place, @dest, @rm_status, @tray_count,@level_eu,@rmm_line_name,@weight_RM,GETDATE())
  //       `);

  //     // const rm_tro_id = insertResult.recordset[0].rm_tro_id;
  //     const mapping_id = insertResult.recordset[0].mapping_id;
  //     console.log("mapping_id", mapping_id)

  //     // แทรกข้อมูลลง History
  //     const historyResult = await transaction.request()
  //       .input("tro_id", license_plate)
  //       .input("mapping_id", mapping_id)
  //       .input("cooked_date", dataHisRMForProd.recordset[0].cooked_date)
  //       .input("withdraw_date", dataHisRMForProd.recordset[0].withdraw_date)
  //       .input("receiver", recorder)
  //       .input("location", `จุดเตรียม${RawMat}`)
  //       .input("first_prod", dataHisRMForProd.recordset[0].first_prod)
  //       .input("two_prod", dataHisRMForProd.recordset[0].two_prod)
  //       .input("three_prod", dataHisRMForProd.recordset[0].three_prod)
  //       .input("name_edit_prod_two", dataHisRMForProd.recordset[0].name_edit_prod_two)
  //       .input("name_edit_prod_three", dataHisRMForProd.recordset[0].name_edit_prod_three)
  //       .input("weight_RM", weight)
  //       .input("tray_count", ntray)

  //       .query(`
  //         INSERT INTO History (tro_id , mapping_id, cooked_date, withdraw_date, receiver, location,first_prod,two_prod,three_prod,name_edit_prod_two,name_edit_prod_three,weight_RM,tray_count,created_at)
  //         OUTPUT INSERTED.hist_id
  //         VALUES (@tro_id,@mapping_id, @cooked_date, @withdraw_date, @receiver, @location,@first_prod,@two_prod,@three_prod,@name_edit_prod_two,@name_edit_prod_three,@weight_RM,@tray_count,GETDATE())
  //       `);

  //     const hist_id = historyResult.recordset[0].hist_id;

  //     // อัปเดต RMInTrolley ด้วย hist_id_rmit
  //     // await transaction.request()
  //     //   .input("hist_id_rmit", hist_id)
  //     //   .input("rm_tro_id", rm_tro_id)
  //     //   .query(`
  //     //     UPDATE TrolleyRMMapping
  //     //     SET hist_id_rmit = @hist_id_rmit
  //     //     WHERE rm_tro_id = @rm_tro_id
  //     //   `);

  //     // อัปเดตสถานะ Trolley
  //     await transaction.request()
  //       .input("tro_id", license_plate)
  //       .query(`
  //         UPDATE Trolley
  //         SET tro_status = '0',rsrv_timestamp = null
  //         WHERE tro_id = @tro_id
  //       `);

  //     await transaction.commit();

  //     // Prepare broadcast data
  //     const broadcastData = {
  //       message: "Trolley data has been saved successfully!",
  //       license_plate: license_plate,
  //       mapping_id: mapping_id,
  //       rmfpID: rmfpID,
  //       ntray: ntray,
  //       location: `จุดเตรียม${RawMat}`,
  //       recorder: recorder,
  //       weightTotal: weightTotal,
  //       rm_status: rm_status,
  //       hist_id: hist_id,
  //       timestamp: new Date()
  //     };

  //     // 2. General room for all trolley updates
  //     req.app.get("io").to("trolleyUpdatesRoom").emit("trolleyUpdated", broadcastData);

  //     return res.status(200).json({
  //       success: true,
  //       message: "บันทึกข้อมูลเสร็จสิ้น",
  //       data: {
  //         mapping_id,
  //         hist_id,
  //         license_plate
  //       }
  //     });

  //   } catch (err) {
  //     // await transaction.rollback();
  //     console.error("SQL error", err);

  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
  router.post("/prep/toColdOven/saveTrolley", async (req, res) => {
    const {
      license_plate,
      rmfpID,
      ntray,
      recorder,
      weight,
      weightTotal,
      rm_status,
      name_edit_prod,
      after_prod,
      before_prod,
      mat
    } = req.body;

    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 📌 ดึงข้อมูลจาก RMForProd
      const dataRMForProd = await transaction.request()
        .input("rmfp_id", rmfpID)
        .query(`
        SELECT prod_rm_id, stay_place, dest, hist_id_rmfp, rmfp_line_name, level_eu, rm_group_id
        FROM RMForProd
        WHERE rmfp_id = @rmfp_id
      `);

      if (dataRMForProd.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูล RMForProd สำหรับ rmfp_id: ${rmfpID}`);
      }

      // 📌 ดึงประเภทวัตถุดิบ
      const PullTypeRaw = await transaction.request()
        .input("mat", mat)
        .input("rm_group_id", dataRMForProd.recordset[0].rm_group_id)
        .query(`
        SELECT rmt.rm_type_name
        FROM RawMatCookedGroup rmcg
        JOIN RawMatType rmt ON rmcg.rm_type_id = rmt.rm_type_id
        WHERE rmcg.mat = @mat AND rmcg.rm_group_id = @rm_group_id
      `);

      if (PullTypeRaw.recordset.length === 0) {
        throw new Error(`ไม่พบข้อมูลประเภทวัตถุดิบ สำหรับ mat: ${mat}`);
      }

      const RawMat = PullTypeRaw.recordset[0].rm_type_name;

      // 📌 ดึงข้อมูล History ที่เกี่ยวข้อง
      const dataHisRMForProd = await transaction.request()
        .input("hist_id_rmfp", dataRMForProd.recordset[0].hist_id_rmfp)
        .query(`
        SELECT withdraw_date, cooked_date, name_edit_prod_two, name_edit_prod_three,
               first_prod, two_prod, three_prod
        FROM History
        WHERE hist_id = @hist_id_rmfp
      `);

      // 📌 แทรกข้อมูลใน TrolleyRMMapping
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
        .input("tl_status", "1.9")
        .query(`
        INSERT INTO TrolleyRMMapping (tro_id, rmfp_id, tro_production_id, stay_place, dest, rm_status,
                                      tray_count, level_eu, rmm_line_name, weight_RM, created_at,tl_status)
        OUTPUT INSERTED.mapping_id
        VALUES (@tro_id, @rmfp_id, @tro_production_id, @stay_place, @dest, @rm_status,
                @tray_count, @level_eu, @rmm_line_name, @weight_RM, GETDATE(),@tl_status)
      `);

      const mapping_id = insertResult.recordset[0].mapping_id;

      // 📌 แทรกข้อมูลลง History
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
        INSERT INTO History (tro_id, mapping_id, cooked_date, withdraw_date, receiver, location,
                             first_prod, two_prod, three_prod, name_edit_prod_two, name_edit_prod_three,
                             weight_RM, tray_count, created_at)
        OUTPUT INSERTED.hist_id
        VALUES (@tro_id, @mapping_id, @cooked_date, @withdraw_date, @receiver, @location,
                @first_prod, @two_prod, @three_prod, @name_edit_prod_two, @name_edit_prod_three,
                @weight_RM, @tray_count, GETDATE())
      `);

      const hist_id = historyResult.recordset[0].hist_id;

      // 📌 อัปเดตสถานะ Trolley
      await transaction.request()
        .input("tro_id", license_plate)
        .query(`
        UPDATE Trolley
        SET tro_status = '0', rsrv_timestamp = NULL
        WHERE tro_id = @tro_id
      `);

      await transaction.commit();

      // 📌 Broadcast
      req.app.get("io").to("trolleyUpdatesRoom").emit("trolleyUpdated", {
        message: "Trolley data has been saved successfully!",
        license_plate,
        mapping_id,
        rmfpID,
        ntray,
        location: `จุดเตรียม${RawMat}`,
        recorder,
        weightTotal,
        rm_status,
        hist_id,
        timestamp: new Date()
      });

      return res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลเสร็จสิ้น",
        data: { mapping_id, hist_id, license_plate }
      });

    } catch (err) {
      if (transaction._aborted !== true) {
        await transaction.rollback();
      }
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
      //.
      res.json(result.recordset);
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ error: "Database error", details: err.message });
    }
  });

  router.get("/prep/getRMTraceback", async (req, res) => {
    try {
      const pool = await connectToDatabase();

      // 🧩 รวม 3 query เป็น UNION ALL
      const result = await pool.request().query(`
      SELECT 
          tlmp.mapping_id,
          h.tro_id,
          rmmb.batch AS batch_begin,
          rmmb.mat AS mat_begin,
          rms.mat_name AS mat_name_begin,
          rmmb.hu,
          b.batch_before,
          b.batch_after,
          rm.mat,
          rm.mat_name,
          p.doc_no,
          tlmp.rmm_line_name
      FROM [PFCMv2].[dbo].[TrolleyRMMapping] tlmp 
      JOIN [PFCMv2].[dbo].[RMForProd] rmfp ON tlmp.rmfp_id = rmfp.rmfp_id
      JOIN [PFCMv2].[dbo].[ProdRawMat] pdrm ON tlmp.tro_production_id = pdrm.prod_rm_id
      JOIN [PFCMv2].[dbo].[Production] p ON pdrm.prod_id = p.prod_id
      JOIN [PFCMv2].[dbo].[RawMat] rm ON pdrm.mat = rm.mat
      JOIN [PFCMv2].[dbo].[Mix_Batch_Prod] mbpd ON rmfp.rmfp_id = mbpd.rmfp_id
      JOIN [PFCMv2].[dbo].[RMMixBatch] rmmb ON mbpd.rmfbatch_id = rmmb.rmfbatch_id
      JOIN [PFCMv2].[dbo].[RawMat] rms ON rmmb.mat = rms.mat
      JOIN [PFCMv2].[dbo].[History] h ON tlmp.mapping_id = h.mapping_id
      LEFT JOIN [PFCMv2].[dbo].[Batch] b ON tlmp.mapping_id = b.mapping_id
        AND (rmmb.batch = b.batch_before OR rmmb.batch = b.batch_after)
      WHERE rmfp.row_status = 'M_B'

      UNION ALL

      SELECT 
          tlmp.mapping_id,
          h.tro_id,
          rmmb.batch AS batch_begin,
          rmmb.mat AS mat_begin,
          rms.mat_name AS mat_name_begin,
          rmmb.hu,
          b.batch_before,
          b.batch_after,
          rm.mat,
          rm.mat_name,
          p.doc_no,
          tlmp.rmm_line_name
      FROM [PFCMv2].[dbo].[TrolleyRMMapping] tlmp
      JOIN [PFCMv2].[dbo].[RMForProd] rmfp ON tlmp.rmfp_id = rmfp.rmfp_id
      JOIN [PFCMv2].[dbo].[ProdRawMat] pdrm ON tlmp.tro_production_id = pdrm.prod_rm_id
      JOIN [PFCMv2].[dbo].[Production] p ON pdrm.prod_id = p.prod_id
      JOIN [PFCMv2].[dbo].[RawMat] rm ON pdrm.mat = rm.mat
      JOIN [PFCMv2].[dbo].[RM_EmuMixed] mbpd ON rmfp.rmfp_id = mbpd.rmfp_id
      JOIN [PFCMv2].[dbo].[RMForEmu] rmmb ON mbpd.rmfemu_id = rmmb.rmfemu_id
      JOIN [PFCMv2].[dbo].[RawMat] rms ON rmmb.mat = rms.mat
      JOIN [PFCMv2].[dbo].[History] h ON tlmp.mapping_id = h.mapping_id
      LEFT JOIN [PFCMv2].[dbo].[Batch] b ON tlmp.mapping_id = b.mapping_id
      WHERE rmfp.row_status = 'M_RM'

      UNION ALL

      SELECT 
          tlmp.mapping_id,
          h.tro_id,
          rmfp.batch AS batch_begin,
          rm.mat AS mat_begin,
          rm.mat_name AS mat_name_begin,
          rmfp.hu,
          b.batch_before,
          b.batch_after,
          rm.mat,
          rm.mat_name,
          p.doc_no,
          tlmp.rmm_line_name
      FROM [PFCMv2].[dbo].[TrolleyRMMapping] tlmp
      JOIN [PFCMv2].[dbo].[RMForProd] rmfp ON tlmp.rmfp_id = rmfp.rmfp_id
      JOIN [PFCMv2].[dbo].[ProdRawMat] pdrm ON tlmp.tro_production_id = pdrm.prod_rm_id
      JOIN [PFCMv2].[dbo].[Production] p ON pdrm.prod_id = p.prod_id
      JOIN [PFCMv2].[dbo].[RawMat] rm ON pdrm.mat = rm.mat
      JOIN [PFCMv2].[dbo].[History] h ON tlmp.mapping_id = h.mapping_id
      LEFT JOIN [PFCMv2].[dbo].[Batch] b ON tlmp.mapping_id = b.mapping_id
      WHERE rmfp.row_status = 'NM'
    `);

      const rows = result.recordset;

      // 🧩 จัดกลุ่มข้อมูลตาม mapping_id
      const grouped = Object.values(
        rows.reduce((acc, row) => {
          if (!acc[row.mapping_id]) {
            acc[row.mapping_id] = {
              mapping_id: row.mapping_id,
              tro_id: row.tro_id,
              mat: row.mat,
              mat_name: row.mat_name,
              doc_no: row.doc_no,
              rmm_line_name: row.rmm_line_name,
              traceback: [],
            };
          }
          acc[row.mapping_id].traceback.push({
            batch_begin: row.batch_begin,
            hu: row.hu,
            mat_begin: row.mat_begin,
            mat_name_begin: row.mat_name_begin,
            batch_before: row.batch_before,
            batch_after: row.batch_after,
          });
          return acc;
        }, {})
      );

      res.json(grouped);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
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

      // ✅ Query ที่เพิ่มการ JOIN ตาราง Batch เพื่อดึง batch_after
      const query = `
      SELECT
        rmf.rmfp_id,
        STRING_AGG(b.batch_after, ', ') AS batch_after,
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
      LEFT JOIN
        Batch b ON rmm.mapping_id = b.mapping_id  
      WHERE 
        rmm.stay_place IN ('ออกห้องเย็น', 'หม้ออบ', 'จุดเตรียม')
        AND rmm.dest = 'จุดเตรียม'
        AND rmm.rm_status IN ('QcCheck รอกลับมาเตรียม', 'QcCheck รอ MD', 'รอกลับมาเตรียม', 'รอ Qc','QcCheck')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
      GROUP BY
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmm.dest,
        rmm.stay_place,
        p.doc_no,
        rmm.rmm_line_name,
        rmg.rm_type_id,
        rmm.tro_id,
        rmm.mapping_id,
        rmm.level_eu,
        htr.cooked_date,
        htr.edit_rework
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


  // router.post("/mapping/successTrolley", async (req, res) => {
  //   const { mapping_id } = req.body;
  //   const io = req.app.get("io"); // ดึง io object มาใช้

  //   try {
  //     const pool = await connectToDatabase();

  //     // ตรวจสอบว่า mapping_id มีอยู่จริงหรือไม่
  //     const checkResult = await pool.request()
  //       .input("mapping_id", mapping_id)
  //       .query("SELECT mapping_id,tro_id FROM TrolleyRMMapping WHERE mapping_id = @mapping_id");

  //     if (checkResult.recordset.length === 0) {
  //       return res.status(404).json({ success: false, message: "ไม่พบข้อมูล mapping_id ที่ระบุ" });
  //     }

  //     let tro_id = checkResult.recordset[0].tro_id;

  //     // ทำการอัปเดตข้อมูล
  //     const result = await pool.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`
  //       UPDATE TrolleyRMMapping
  //       SET stay_place = NULL, dest = NULL, rm_status = 'สำเร็จ', tro_id = NULL
  //       WHERE mapping_id = @mapping_id
  //     `);

  //     if (result.rowsAffected[0] === 0) {
  //       return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตข้อมูลได้" });
  //     }

  //     console.log("Rows affected:", result.rowsAffected[0]);

  //     const claerStatus = await pool.request()
  //       .input("tro_id", tro_id)
  //       .input("tro_status", 1)
  //       .query(`
  //       UPDATE Trolley
  //         set tro_status = @tro_status
  //         WHERE tro_id = @tro_id
  //       `)


  //     // ---- ส่งข้อมูลผ่าน socket ----
  //     const formattedData = {
  //       mapping_id,
  //       status: "สำเร็จ",
  //       message: "Trolley mapping marked as complete"
  //     };

  //     io.to("saveRMForProdRoom").emit("dataUpdated", formattedData);

  //     return res.status(200).json({
  //       success: true,
  //       message: "บันทึกข้อมูลเสร็จสิ้น",
  //       updatedRows: result.rowsAffected[0]
  //     });
  //   } catch (err) {
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
  router.post("/mapping/successTrolley", async (req, res) => {
    const { mapping_id } = req.body;
    const io = req.app.get("io");

    const sql = require("mssql");
    let transaction;

    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);

      await transaction.begin(); // เริ่ม transaction

      // ตรวจสอบ mapping_id
      const checkResult = await transaction.request()
        .input("mapping_id", mapping_id)
        .query("SELECT mapping_id, tro_id FROM TrolleyRMMapping WHERE mapping_id = @mapping_id");

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: "ไม่พบข้อมูล mapping_id ที่ระบุ" });
      }

      const tro_id = checkResult.recordset[0].tro_id;

      // update TrolleyRMMapping
      const result = await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`
        UPDATE TrolleyRMMapping
        SET stay_place = NULL, dest = NULL, rm_status = N'สำเร็จ', tro_id = NULL , tl_status = '3189'
        WHERE mapping_id = @mapping_id
      `);

      if (result.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดต TrolleyRMMapping ได้" });
      }

      // update Trolley
      const clearStatus = await transaction.request()
        .input("tro_id", tro_id)
        .input("tro_status", 1) // 1 = ว่าง
        .query(`
        UPDATE Trolley
        SET tro_status = @tro_status
        WHERE tro_id = @tro_id
      `);

      if (clearStatus.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดต Trolley ได้" });
      }

      // commit ถ้า update ครบ
      await transaction.commit();

      // ส่งข้อมูลผ่าน socket
      const formattedData = {
        mapping_id,
        status: "สำเร็จ",
        message: "Trolley mapping marked as complete"
      };

      io.to("trolleyUpdatesRoom").emit("trolleyUpdated", formattedData);

      return res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลเสร็จสิ้น",
        updatedRows: result.rowsAffected[0]
      });

    } catch (err) {
      if (transaction) await transaction.rollback();
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
                      STRING_AGG(b.batch_after, ', ') AS batch_after,
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
                  LEFT JOIN
                       Batch b ON rmm.mapping_id = b.mapping_id
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
                      GROUP BY
                        rmf.rmfp_id,
                        rm.mat,
                        rm.mat_name,
                        rmm.dest,
                        rmm.stay_place,
                        p.doc_no,
                        rmm.rmm_line_name,
                        rmg.rm_type_id,
                        rmm.tro_id,
                        rmm.mapping_id,
                        rmm.weight_RM,
                        rmm.level_eu,
                        rmm.tray_count,
                        rmm.rm_status,
                        qc.sq_remark,
                        qc.md_remark,
                        qc.defect_remark,
                        htr.qccheck_cold,
                        htr.remark_rework,
                        htr.remark_rework_cold,
                        htr.cooked_date
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

  // router.post("/prep/mat/rework/rsrv/saveTrolley", async (req, res) => {
  //   const { license_plate, ntray, weightTotal, mapping_id, dest, tro_id, recorder, rm_status, edit_rework } = req.body;
  //   console.log("body:", req.body);

  //   const sql = require("mssql");
  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);

  //   try {
  //     if (!tro_id || !license_plate || !mapping_id) {
  //       return res.status(400).json({ success: false, error: "Missing required fields" });
  //     }


  //     // ตรวจสอบสถานะก่อนทำรายการ
  //     const checkTrolley = await pool.request()
  //       .input("tro_id", license_plate)
  //       .query(`
  //         SELECT tro_status, rsrv_timestamp
  //         FROM Trolley
  //         WHERE tro_id = @tro_id
  //       `);

  //     if (checkTrolley.recordset.length === 0) {
  //       return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });
  //     }

  //     const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];

  //     if (tro_status !== 'rsrv') {
  //       return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
  //     }

  //     // ตรวจสอบว่าเกินเวลา 5 นาทีหรือไม่
  //     const now = new Date();
  //     const reservedTime = new Date(rsrv_timestamp);
  //     const diffMs = now - reservedTime;
  //     const diffMinutes = diffMs / 1000 / 60;

  //     if (diffMinutes > 5) {
  //       return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
  //     }

  //     await transaction.begin();

  //     await transaction.request()
  //       .input("tro_id", tro_id)
  //       .query(`
  //         UPDATE Trolley
  //         SET tro_status = '1',rsrv_timestamp = null
  //         WHERE tro_id = @tro_id
  //     `);

  //     const rmGroupResult = await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`
  //         SELECT rmg.rm_group_id, rmg.rework, trm.rework_time
  //         FROM TrolleyRMMapping trm
  //         JOIN RMForProd rmf ON trm.rmfp_id = rmf.rmfp_id
  //         JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
  //         WHERE trm.mapping_id = @mapping_id
  //     `);

  //     let rework_time_value = null;
  //     let description_rework;

  //     if ((rm_status === 'รอแก้ไข' || rm_status === 'รับฝาก-รอแก้ไข') && edit_rework !== null && rmGroupResult.recordset.length > 0) {
  //       rework_time_value = rmGroupResult.recordset[0].rework_time ?? rmGroupResult.recordset[0].rework;
  //       description_rework = edit_rework;
  //     } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework !== null && rmGroupResult.recordset[0]?.rework_time !== null) {
  //       rework_time_value = rmGroupResult.recordset[0].rework_time;
  //       description_rework = edit_rework;
  //     } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework === null) {
  //       description_rework = null;
  //     }

  //     // กำหนดค่า rm_status ใหม่ตามเงื่อนไข
  //     let new_rm_status = 'รอQCตรวจสอบ'; // ค่าเริ่มต้น
  //     let destination = dest;

  //     // เพิ่มเงื่อนไข: ถ้า rm_status เป็น "รับฝาก-รอแก้ไข" ให้เปลี่ยนเป็น "รอกลับมาเตรียม"
  //     if (rm_status === 'รับฝาก-รอแก้ไข') {
  //       new_rm_status = 'รอกลับมาเตรียม';
  //       destination = 'จุดเตรียม';

  //     }

  //     const updateRM = await transaction.request()
  //       .input("tro_id", license_plate)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("dest", destination)
  //       .input("stay_place", 'จุดเตรียม')
  //       .input("rm_status", new_rm_status) // ใช้ค่า rm_status ใหม่ตามเงื่อนไข
  //       .input("mapping_id", mapping_id)
  //       .input("rework_time", rework_time_value)
  //       .query(`
  //         UPDATE TrolleyRMMapping
  //         SET tro_id = @tro_id, 
  //             dest = @dest,  
  //             stay_place = @stay_place,
  //             rm_status = @rm_status,
  //             weight_RM = @weight_RM, 
  //             tray_count = @tray_count,
  //             rework_time = @rework_time,
  //             updated_at = GETDATE()
  //         WHERE mapping_id = @mapping_id
  //     `);

  //     if (updateRM.rowsAffected[0] === 0) {
  //       throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);
  //     }

  //     await transaction.request()
  //       .input("tro_id", license_plate)
  //       .query(`
  //         UPDATE Trolley
  //         SET tro_status = '0',rsrv_timestamp = null
  //         WHERE tro_id = @tro_id
  //     `);

  //     await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .input("receiver", recorder)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("edit_rework", description_rework)
  //       .query(`
  //         UPDATE History
  //         SET receiver_oven_edit = @receiver, 
  //         rework_date = GETDATE(),
  //         weight_RM = @weight_RM,
  //         tray_count = @tray_count,
  //         edit_rework = @edit_rework,
  //         updated_at = GETDATE()
  //         WHERE mapping_id = @mapping_id
  //     `);

  //     await transaction.commit();

  //     // ✅ ส่งข้อมูลผ่าน Socket.IO ไปยังห้อง saveRMForProdRoom
  //     const formattedData = {
  //       tro_id,
  //       license_plate,
  //       weightTotal,
  //       ntray,
  //       dest,
  //       rm_status: new_rm_status,
  //       updated_at: new Date()
  //     };

  //     io.to("QcCheckRoom").emit("dataUpdated", formattedData);

  //     return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

  //   } catch (err) {
  //     await transaction.rollback();
  //     console.error("SQL error:", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
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

      // ตรวจสอบสถานะ Trolley ก่อน
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

      // ตรวจสอบเวลา 5 นาที
      const now = new Date();
      const reservedTime = new Date(rsrv_timestamp);
      if ((now - reservedTime) / 1000 / 60 > 5) {
        return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
      }

      await transaction.begin();

      // update Trolley status เป็น '1'
      const updateTrolley = await transaction.request()
        .input("tro_id", tro_id)
        .query(`
        UPDATE Trolley
        SET tro_status = '1', status = '1.4',rsrv_timestamp = NULL
        WHERE tro_id = @tro_id
      `);
      if (updateTrolley.rowsAffected[0] === 0) throw new Error("ไม่สามารถอัปเดต Trolley ได้");

      // ดึงข้อมูล RM group
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
      let description_rework = null;

      if (rmGroupResult.recordset.length > 0) {
        if ((rm_status === 'รอแก้ไข' || rm_status === 'รับฝาก-รอแก้ไข') && edit_rework) {
          rework_time_value = rmGroupResult.recordset[0].rework_time ?? rmGroupResult.recordset[0].rework;
          description_rework = edit_rework;
        } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework) {
          rework_time_value = rmGroupResult.recordset[0].rework_time;
          description_rework = edit_rework;
        }
      }

      // กำหนดค่า rm_status ใหม่
      let new_rm_status = 'รอQCตรวจสอบ';
      let destination = dest;
      if (rm_status === 'รับฝาก-รอแก้ไข') {
        new_rm_status = 'รอกลับมาเตรียม';
        destination = 'จุดเตรียม';
      }

      // update TrolleyRMMapping
      const updateRM = await transaction.request()
        .input("tro_id", license_plate)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("dest", destination)
        .input("stay_place", 'จุดเตรียม')
        .input("rm_status", new_rm_status)
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
      if (updateRM.rowsAffected[0] === 0) throw new Error("ไม่พบข้อมูล mapping_id");

      // update History
      const updateHistory = await transaction.request()
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
      if (updateHistory.rowsAffected[0] === 0) throw new Error("ไม่พบ History สำหรับ mapping_id");

      await transaction.commit();

      // ส่งข้อมูลผ่าน Socket.IO
      const formattedData = { tro_id, license_plate, weightTotal, ntray, dest: destination, rm_status: new_rm_status, updated_at: new Date() };
      req.app.get("io").to("QcCheckRoom").emit("dataUpdated", formattedData);

      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

    } catch (err) {
      if (transaction) await transaction.rollback();
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
                      STRING_AGG(b.batch_after, ', ') AS batch_after,
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
                  LEFT JOIN
                    Batch b ON rmm.mapping_id = b.mapping_id
                  WHERE 
                      his.stay_place = 'จุดเตรียม' 
					            AND his.rm_status = 'รอกลับมาเตรียม'
                      AND rmf.rm_group_id = rmg.rm_group_id
                  GROUP BY
                      rmm.mapping_id,
                      rmf.rmfp_id,
                      rm.mat,
                      rm.mat_name,
                      his.dest,
                      rmm.stay_place,
                      p.doc_no,
                      his.rmm_line_name,
                      rmg.rm_type_id,
                      his.tro_id,
                      rmm.level_eu,
                      his.rm_status,
                      his.weight_RM,
                      his.tray_count,
                      his.cooked_date,
                      his.withdraw_date,
                      his.receiver
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

  // router.post('/prep/batch/save', async (req, res) => {
  //   const { rmfp_id, batch_after } = req.body;  // ค่าที่มาจาก Frontend
  //   console.log("🚀 Backend รับค่า:", { rmfp_id, batch_after }); // ตรวจสอบค่าที่ Backend รับ

  //   try {
  //     const pool = await connectToDatabase();
  //     const result = await pool
  //       .request()
  //       .input('rmfp_id', rmfp_id)
  //       .query(`
  //         SELECT batch
  //         FROM RMForProd
  //         WHERE rmfp_id = @rmfp_id
  //       `);

  //     console.log("🚀 ค่า batch ที่ได้จากฐานข้อมูล:", result);

  //     const batch_before = result.recordset[0].batch;
  //     const final_batch_after = batch_after || batch_before; // ถ้าไม่มี batch_after ให้ใช้ batch_before

  //     console.log("🚀 batch_before และ batch_after ที่จะถูกบันทึก:", batch_before, final_batch_after);

  //     const insertResult = await pool
  //       .request()
  //       .input('batch_before', batch_before)
  //       .input('batch_after', final_batch_after)
  //       .query(`
  //         INSERT INTO Batch (batch_before, batch_after)
  //         VALUES (@batch_before, @batch_after)
  //       `);

  //     console.log("🚀 ผลการบันทึก:", insertResult);

  //     const batchIdResult = await pool
  //       .request()
  //       .input('batch_before', batch_before)
  //       .input('batch_after', final_batch_after)
  //       .query(`
  //       SELECT TOP 1 batch_id 
  //       FROM Batch
  //       WHERE batch_before = @batch_before 
  //         AND batch_after = @batch_after
  //       ORDER BY batch_id DESC
  //     `);

  //     console.log("🚀 ผลการค้นหา batch_id:", batchIdResult);
  //     const batch_id = batchIdResult.recordset[0].batch_id;

  //     // อัปเดต batch_id ในตาราง RMForProd
  //     const updateResult = await pool
  //       .request()
  //       .input('batch_id', batch_id)
  //       .input('rmfp_id', rmfp_id)
  //       .query(`
  //   UPDATE RMForProd
  //   SET batch_id = @batch_id
  //   WHERE rmfp_id = @rmfp_id
  // `);
  //     console.log("🚀 ผลการอัปเดต:", updateResult);



  //     res.json({ success: true, message: 'บันทึกข้อมูล Batch สำเร็จ' });
  //   } catch (err) {
  //     console.error('Error:', err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
  router.post('/prep/batch/save', async (req, res) => {
    const { rmfp_id, batch_after } = req.body;
    console.log("🚀 Backend รับค่า:", { rmfp_id, batch_after });

    const sql = require("mssql");
    const pool = await connectToDatabase();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // ดึง batch ก่อน
      const result = await transaction.request()
        .input('rmfp_id', rmfp_id)
        .query(`
        SELECT batch
        FROM RMForProd
        WHERE rmfp_id = @rmfp_id
      `);

      if (result.recordset.length === 0) {
        throw new Error(`ไม่พบ rmfp_id: ${rmfp_id}`);
      }

      const batch_before = result.recordset[0].batch;
      const final_batch_after = batch_after || batch_before;

      console.log("🚀 batch_before และ batch_after:", batch_before, final_batch_after);

      // INSERT เข้า Batch
      const insertResult = await transaction.request()
        .input('batch_before', batch_before)
        .input('batch_after', final_batch_after)
        .query(`
        INSERT INTO Batch (batch_before, batch_after)
        VALUES (@batch_before, @batch_after);
      `);

      if (insertResult.rowsAffected[0] === 0) {
        throw new Error("ไม่สามารถบันทึก Batch ใหม่ได้");
      }

      // ดึง batch_id ล่าสุด
      const batchIdResult = await transaction.request()
        .input('batch_before', batch_before)
        .input('batch_after', final_batch_after)
        .query(`
        SELECT TOP 1 batch_id 
        FROM Batch
        WHERE batch_before = @batch_before AND batch_after = @batch_after
        ORDER BY batch_id DESC
      `);

      if (batchIdResult.recordset.length === 0) {
        throw new Error("ไม่พบ batch_id หลังจาก insert");
      }

      const batch_id = batchIdResult.recordset[0].batch_id;

      // UPDATE RMForProd
      const updateResult = await transaction.request()
        .input('batch_id', batch_id)
        .input('rmfp_id', rmfp_id)
        .query(`
        UPDATE RMForProd
        SET batch_id = @batch_id
        WHERE rmfp_id = @rmfp_id
      `);

      if (updateResult.rowsAffected[0] === 0) {
        throw new Error("ไม่สามารถอัปเดต RMForProd ด้วย batch_id ได้");
      }

      // commit transaction
      await transaction.commit();
      console.log("🚀 บันทึก Batch สำเร็จ");
      res.json({ success: true, message: 'บันทึกข้อมูล Batch สำเร็จ' });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error('Error:', err);
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

      // SQL query ดึงข้อมูลพร้อม batch_after
      const query = `
      SELECT
        rmf.rmfp_id,
        STRING_AGG(b.batch_after, ',') AS batch_after_array
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
        htr.edit_rework, 
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
      LEFT JOIN
        Batch b ON rmm.mapping_id = b.mapping_id
      WHERE 
        rmm.stay_place IN ('ออกห้องเย็น' ,'หม้ออบ','จุดเตรียม')
        AND rmm.dest = 'จุดเตรียม'
        AND rmm.rm_status IN ('QcCheck รอกลับมาเตรียม','QcCheck รอ MD','รอกลับมาเตรียม','รอ Qc','QcCheck')
        AND rmf.rm_group_id = rmg.rm_group_id
        AND rmg.rm_type_id IN (${rmTypeIdsArray.map(t => `'${t}'`).join(',')})
      GROUP BY
        rmf.rmfp_id,
        rmf.batch,
        rm.mat,
        rm.mat_name,
        rmm.dest,
        rmm.stay_place,
        p.doc_no,
        rmm.rmm_line_name,
        rmg.rm_type_id,
        rmm.tro_id,
        rmm.mapping_id,
        rmm.level_eu,
        htr.cooked_date,
        htr.edit_rework
      ORDER BY
        htr.cooked_date DESC
    `;

      const result = await pool.request().query(query);

      // แปลงวันที่เหมือนเดิม
      const formattedData = result.recordset.map(item => {
        const date = new Date(item.cooked_date);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');

        item.CookedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;

        delete item.cooked_date;

        // แปลง batch_after_array เป็น array จริง ๆ
        if (item.batch_after_array) {
          item.batch_after_array = item.batch_after_array.split(',');
        } else {
          item.batch_after_array = [];
        }

        return item;
      });

      res.json({ success: true, data: formattedData });
    } catch (err) {
      console.error("SQL error", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  // router.post("/prep/matimport/add/saveTrolley", async (req, res) => {
  //   const { license_plate, batch_after, batch_before, operator, desttype, ntray, Process, weightTotal, mapping_id, dest, tro_id, cookedDateTimeNew, level_eu, preparedDateTimeNew } = req.body;
  //   const sql = require("mssql");
  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);

  //   console.log("New Time : ", cookedDateTimeNew);
  //   console.log("batch_after : ", batch_after);

  //   // ตรวจสอบสถานะก่อนทำรายการ
  //   const checkTrolley = await pool.request()
  //     .input("tro_id", license_plate)
  //     .query(`
  //   SELECT tro_status, rsrv_timestamp
  //   FROM Trolley
  //   WHERE tro_id = @tro_id
  // `);

  //   if (checkTrolley.recordset.length === 0) {
  //     return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });
  //   }

  //   const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];

  //   if (tro_status !== 'rsrv') {
  //     return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
  //   }

  //   // ตรวจสอบว่าเกินเวลา 5 นาทีหรือไม่
  //   const now = new Date();
  //   const reservedTime = new Date(rsrv_timestamp);
  //   const diffMs = now - reservedTime;
  //   const diffMinutes = diffMs / 1000 / 60;

  //   if (diffMinutes > 5) {
  //     return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
  //   }



  //   try {
  //     if (!license_plate || !mapping_id) {
  //       return res.status(400).json({ success: false, error: "Missing required fields" });
  //     }

  //     await transaction.begin();

  //     const updateTrolley1 = await transaction.request()
  //       .input("tro_id", tro_id)
  //       .query(`
  //        UPDATE Trolley
  //        SET tro_status = '1',rsrv_timestamp = null
  //        WHERE tro_id = @tro_id
  //     `);

  //     await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`
  //       UPDATE TrolleyRMMapping
  //       SET tro_id = null
  //       WHERE mapping_id = @mapping_id
  //       `)

  //     let finalBatchAfter = batch_after;
  //     if (batch_after === '') {
  //       finalBatchAfter = batch_before;
  //     }

  //     // **1️⃣ INSERT Batch ก่อนบันทึก RMInTrolley**
  //     const batchResult = await transaction.request()
  //       .input("batch_before", batch_before)
  //       .input("batch_after", finalBatchAfter) // ค่า batch_after ที่ส่งมาจาก request
  //       .query(`
  //         INSERT INTO Batch (batch_before, batch_after)
  //         OUTPUT INSERTED.batch_id
  //         VALUES (@batch_before, @batch_after)
  //     `);

  //     const batch_id = batchResult.recordset[0].batch_id;

  //     // ก่อนอัพเดต ดึงข้อมูลเดิมมาเพื่อคัดลอกค่าสำหรับสร้างรายการใหม่
  //     const origData = await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`
  //         SELECT * FROM TrolleyRMMapping WHERE mapping_id = @mapping_id
  //       `);

  //     if (origData.recordset.length === 0) {
  //       throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);
  //     }

  //     // สร้างรายการใหม่แทนการอัพเดต
  //     const insertNew = await transaction.request()
  //       .input("tro_id", license_plate)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("dest", dest)
  //       .input("stay_place", 'จุดเตรียม')
  //       .input("rm_status", 'รอQCตรวจสอบ')
  //       .input("process_id", Process)
  //       .input("batch_id", batch_id)
  //       .input("rmfp_id", origData.recordset[0].rmfp_id)
  //       .input("tro_production_id", origData.recordset[0].tro_production_id)
  //       .input("qc_id", origData.recordset[0].qc_id)
  //       .input("level_eu", origData.recordset[0].level_eu)
  //       .input("prep_to_cold_time", origData.recordset[0].prep_to_cold_time)
  //       .input("cold_time", origData.recordset[0].cold_time)
  //       .input("rework_time", origData.recordset[0].rework_time)
  //       .input("rmm_line_name", origData.recordset[0].rmm_line_name)

  //       .query(`
  //         INSERT INTO TrolleyRMMapping (
  //           tro_id,
  //           dest,  
  //           stay_place,
  //           weight_RM, 
  //           tray_count,
  //           rm_status,
  //           process_id,
  //           batch_id,
  //           rmfp_id,
  //           tro_production_id,
  //           qc_id,
  //          level_eu,
  //          prep_to_cold_time,
  //          cold_time,
  //          rework_time,
  //          rmm_line_name,
  //          created_at
  //         )
  //         OUTPUT INSERTED.mapping_id
  //         VALUES (
  //           @tro_id,
  //           @dest,
  //           @stay_place,
  //           @weight_RM,
  //           @tray_count,
  //           @rm_status,
  //           @process_id,
  //           @batch_id,
  //           @rmfp_id,
  //           @tro_production_id,
  //           @qc_id,
  //           @level_eu,
  //           @prep_to_cold_time,
  //           @cold_time,
  //           @rework_time,
  //           @rmm_line_name,
  //           GETDATE()
  //         )
  //       `);

  //     // ได้ mapping_id ใหม่
  //     const new_mapping_id = insertNew.recordset[0].mapping_id;

  //     const origHisData = await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`
  //         SELECT 
  //         withdraw_date, 
  //         come_cold_date, 
  //         out_cold_date, 
  //         receiver, 
  //         receiver_out_cold, 
  //         location,
  //         rmm_line_name, 
  //         cold_dest,
  //         cold_to_pack_time,
  //         name_edit_prod_two, 
  //         name_edit_prod_three, 
  //         two_prod,
  //         three_prod,
  //         weight_RM,
  //         tray_count,
  //         qccheck_cold,
  //         remark_rework,
  //         remark_rework_cold,
  //         edit_rework

  //         FROM 
  //         History 
  //         WHERE 
  //         mapping_id = @mapping_id
  //       `);

  //     // อัพเดตสถานะของรายการเดิม
  //     // await transaction.request()
  //     //   .input("mapping_id", mapping_id)
  //     //   .query(`
  //     //     UPDATE TrolleyRMMapping
  //     //     SET rm_status = 'รอกลับมาเตรียม'
  //     //     WHERE mapping_id = @mapping_id
  //     //   `);

  //     await transaction.request()
  //       .input("tro_id", license_plate)
  //       .query(`
  //         UPDATE Trolley
  //         SET tro_status = '0',rsrv_timestamp = null
  //         WHERE tro_id = @tro_id
  //       `);

  //     // สร้างประวัติใหม่
  //     await transaction.request()
  //       .input("mapping_id", sql.Int, new_mapping_id)
  //       .input("receiver_prep_two", sql.NVarChar, operator)
  //       .input("cooked_date", cookedDateTimeNew)
  //       .input("rmit_date", preparedDateTimeNew)
  //       .input("withdraw_date", origHisData.recordset[0].withdraw_date)
  //       .input("come_cold_date", origHisData.recordset[0].come_cold_date)
  //       .input("out_cold_date", origHisData.recordset[0].out_cold_date)
  //       .input("receiver", origHisData.recordset[0].receiver)
  //       .input("receiver_out_cold", origHisData.recordset[0].receiver_out_cold)
  //       .input("location", origHisData.recordset[0].location)
  //       .input("first_prod", origHisData.recordset[0].first_prod)
  //       .input("two_prod", origHisData.recordset[0].two_prod)
  //       .input("three_prod", origHisData.recordset[0].three_prod)
  //       .input("name_edit_prod_two", origHisData.recordset[0].name_edit_prod_two)
  //       .input("name_edit_prod_three", origHisData.recordset[0].name_edit_prod_three)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("cold_dest", origHisData.recordset[0].cold_dest)
  //       .input("cold_to_pack_time", origHisData.recordset[0].cold_to_pack_time)
  //       .input("qccheck_cold", origHisData.recordset[0].qccheck_cold)
  //       .input("remark_rework", origHisData.recordset[0].remark_rework)
  //       .input("remark_rework_cold", origHisData.recordset[0].remark_rework_cold)
  //       .input("edit_rework", origHisData.recordset[0].edit_rework)
  //       .query(`
  //         INSERT INTO History (
  //           mapping_id,
  //           receiver_prep_two,
  //           rmit_date,
  //           cooked_date,
  //           withdraw_date,
  //           come_cold_date,
  //           out_cold_date,
  //           receiver,
  //           receiver_out_cold,
  //           location,
  //           first_prod,
  //           two_prod,
  //           three_prod,
  //           name_edit_prod_two,
  //           name_edit_prod_three,
  //           weight_RM,
  //           tray_count,
  //           cold_dest,
  //           cold_to_pack_time,
  //           qccheck_cold,
  //           remark_rework,
  //           remark_rework_cold,
  //           edit_rework,
  //           created_at
  //         )
  //         VALUES (
  //           @mapping_id,
  //           @receiver_prep_two,
  //           @rmit_date,
  //           @cooked_date,
  //           @withdraw_date,
  //           @come_cold_date,
  //           @out_cold_date,
  //           @receiver,
  //           @receiver_out_cold,
  //           @location,
  //           @first_prod,
  //           @two_prod,
  //           @three_prod,
  //           @name_edit_prod_two,
  //           @name_edit_prod_three,
  //           @weight_RM,
  //           @tray_count,
  //           @cold_dest,
  //           @cold_to_pack_time,
  //           @qccheck_cold,
  //           @remark_rework,
  //           @remark_rework_cold,
  //           @edit_rework,
  //           GETDATE()
  //         )
  //       `);
  //     io.to('QcCheckRoom').emit('dataUpdated', 'gotUpdated');
  //     await transaction.commit();
  //     return res.status(200).json({
  //       success: true,
  //       message: "บันทึกข้อมูลเสร็จสิ้น",
  //       new_mapping_id: new_mapping_id
  //     });

  //   } catch (err) {
  //     await transaction.rollback();
  //     console.error("SQL error:", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
  // router.post("/prep/matimport/add/saveTrolley", async (req, res) => {
  //   const sql = require("mssql");
  //   const {
  //     license_plate,
  //     batch_after,
  //     batch_before,
  //     operator,
  //     desttype,
  //     ntray,
  //     Process,
  //     weightTotal,
  //     mapping_id,
  //     dest,
  //     tro_id,
  //     cookedDateTimeNew,
  //     level_eu,
  //     preparedDateTimeNew
  //   } = req.body;

  //   // 1️⃣ ตรวจสอบ Input ครบ
  //   const requiredFields = [
  //     "license_plate",
  //     "mapping_id",
  //     "batch_before",
  //     "weightTotal",
  //     "ntray",
  //     "Process",
  //     "dest",
  //     "tro_id",
  //     "cookedDateTimeNew",
  //     "preparedDateTimeNew"
  //   ];
  //   const missingFields = requiredFields.filter(f => !req.body[f] && req.body[f] !== 0);
  //   if (missingFields.length > 0) {
  //     return res.status(400).json({
  //       success: false,
  //       error: `Missing required fields: ${missingFields.join(", ")}`
  //     });
  //   }

  //   try {
  //     const pool = await connectToDatabase();
  //     const transaction = new sql.Transaction(pool);

  //     // ตรวจสอบ Trolley
  //     const checkTrolley = await pool.request()
  //       .input("tro_id", tro_id)
  //       .query(`
  //       SELECT tro_status, rsrv_timestamp
  //       FROM Trolley
  //       WHERE tro_id = @tro_id
  //     `);

  //     if (checkTrolley.recordset.length === 0) {
  //       return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });
  //     }

  //     const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];

  //     if (tro_status !== 'rsrv') {
  //       return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
  //     }

  //     // ตรวจสอบเวลา 5 นาที
  //     const now = new Date();
  //     const reservedTime = new Date(rsrv_timestamp);
  //     const diffMinutes = (now - reservedTime) / 1000 / 60;
  //     if (diffMinutes > 5) {
  //       return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
  //     }

  //     await transaction.begin();

  //     // 2️⃣ อัพเดตสถานะ Trolley
  //     await transaction.request()
  //       .input("tro_id", tro_id)
  //       .query(`
  //       UPDATE Trolley
  //       SET tro_status = '1',status = '1.5', rsrv_timestamp = null
  //       WHERE tro_id = @tro_id
  //     `);

  //     // 3️⃣ อัพเดต TrolleyRMMapping
  //     await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`
  //       UPDATE TrolleyRMMapping
  //       SET tro_id = null, tl_status = '4664'
  //       WHERE mapping_id = @mapping_id
  //     `);

  //     // 4️⃣ ตรวจสอบ batch_after
  //     const finalBatchAfter = batch_after || batch_before;
  //     if (!finalBatchAfter) {
  //       throw new Error("batch_after หรือ batch_before ต้องมีค่า");
  //     }

  //     // 5️⃣ INSERT Batch
  //     const batchResult = await transaction.request()
  //       .input("batch_before", batch_before)
  //       .input("batch_after", finalBatchAfter)
  //       .query(`
  //       INSERT INTO Batch (batch_before, batch_after)
  //       OUTPUT INSERTED.batch_id
  //       VALUES (@batch_before, @batch_after)
  //     `);
  //     const batch_id = batchResult.recordset[0].batch_id;

  //     // 6️⃣ ดึงข้อมูลเดิม TrolleyRMMapping
  //     const origData = await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`SELECT * FROM TrolleyRMMapping WHERE mapping_id = @mapping_id`);
  //     if (origData.recordset.length === 0) {
  //       throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);
  //     }

  //     // 7️⃣ สร้างรายการใหม่
  //     const insertNew = await transaction.request()
  //       .input("tro_id", license_plate)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("dest", dest)
  //       .input("stay_place", 'จุดเตรียม')
  //       .input("rm_status", 'รอQCตรวจสอบ')
  //       .input("process_id", Process)
  //       .input("batch_id", batch_id)
  //       .input("rmfp_id", origData.recordset[0].rmfp_id)
  //       .input("tro_production_id", origData.recordset[0].tro_production_id)
  //       .input("qc_id", origData.recordset[0].qc_id)
  //       .input("level_eu", origData.recordset[0].level_eu)
  //       .input("prep_to_cold_time", origData.recordset[0].prep_to_cold_time)
  //       .input("cold_time", origData.recordset[0].cold_time)
  //       .input("rework_time", origData.recordset[0].rework_time)
  //       .input("rmm_line_name", origData.recordset[0].rmm_line_name)
  //       .input("tl_status","2.0")
  //       .query(`
  //       INSERT INTO TrolleyRMMapping (
  //         tro_id, dest, stay_place, weight_RM, tray_count,
  //         rm_status, process_id, batch_id, rmfp_id, tro_production_id,
  //         qc_id, level_eu, prep_to_cold_time, cold_time, rework_time,
  //         rmm_line_name, created_at,tl_status
  //       )
  //       OUTPUT INSERTED.mapping_id
  //       VALUES (
  //         @tro_id, @dest, @stay_place, @weight_RM, @tray_count,
  //         @rm_status, @process_id, @batch_id, @rmfp_id, @tro_production_id,
  //         @qc_id, @level_eu, @prep_to_cold_time, @cold_time, @rework_time,
  //         @rmm_line_name, GETDATE(),@tl_status
  //       )
  //     `);
  //     const new_mapping_id = insertNew.recordset[0].mapping_id;

  //     // 8️⃣ ดึง History เดิม
  //     const origHisData = await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`SELECT * FROM History WHERE mapping_id = @mapping_id`);
  //     if (origHisData.recordset.length === 0) {
  //       throw new Error(`ไม่พบประวัติ mapping_id: ${mapping_id}`);
  //     }

  //     // 9️⃣ อัพเดต Trolley สถานะกลับ
  //     await transaction.request()
  //       .input("tro_id", license_plate)
  //       .query(`
  //       UPDATE Trolley
  //       SET tro_status = '0', rsrv_timestamp = null
  //       WHERE tro_id = @tro_id
  //     `);

  //     // 10️⃣ INSERT History ใหม่
  //     const his = origHisData.recordset[0];
  //     await transaction.request()
  //       .input("mapping_id", sql.Int, new_mapping_id)
  //       .input("receiver_prep_two", sql.NVarChar, operator)
  //       .input("cooked_date", cookedDateTimeNew)
  //       .input("rmit_date", preparedDateTimeNew)
  //       .input("withdraw_date", his.withdraw_date)
  //       .input("come_cold_date", his.come_cold_date)
  //       .input("out_cold_date", his.out_cold_date)
  //       .input("receiver", his.receiver)
  //       .input("receiver_out_cold", his.receiver_out_cold)
  //       .input("location", his.location)
  //       .input("first_prod", his.first_prod)
  //       .input("two_prod", his.two_prod)
  //       .input("three_prod", his.three_prod)
  //       .input("name_edit_prod_two", his.name_edit_prod_two)
  //       .input("name_edit_prod_three", his.name_edit_prod_three)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("cold_dest", his.cold_dest)
  //       .input("cold_to_pack_time", his.cold_to_pack_time)
  //       .input("qccheck_cold", his.qccheck_cold)
  //       .input("remark_rework", his.remark_rework)
  //       .input("remark_rework_cold", his.remark_rework_cold)
  //       .input("edit_rework", his.edit_rework)
  //       .query(`
  //       INSERT INTO History (
  //         mapping_id, receiver_prep_two, rmit_date, cooked_date,
  //         withdraw_date, come_cold_date, out_cold_date, receiver,
  //         receiver_out_cold, location, first_prod, two_prod, three_prod,
  //         name_edit_prod_two, name_edit_prod_three, weight_RM, tray_count,
  //         cold_dest, cold_to_pack_time, qccheck_cold,
  //         remark_rework, remark_rework_cold, edit_rework, created_at
  //       )
  //       VALUES (
  //         @mapping_id, @receiver_prep_two, @rmit_date, @cooked_date,
  //         @withdraw_date, @come_cold_date, @out_cold_date, @receiver,
  //         @receiver_out_cold, @location, @first_prod, @two_prod, @three_prod,
  //         @name_edit_prod_two, @name_edit_prod_three, @weight_RM, @tray_count,
  //         @cold_dest, @cold_to_pack_time, @qccheck_cold,
  //         @remark_rework, @remark_rework_cold, @edit_rework, GETDATE()
  //       )
  //     `);

  //     // 11️⃣ Commit transaction
  //     await transaction.commit();

  //     // 12️⃣ แจ้ง frontend ผ่าน socket
  //     io.to('QcCheckRoom').emit('dataUpdated', 'gotUpdated');

  //     return res.status(200).json({
  //       success: true,
  //       message: "บันทึกข้อมูลเสร็จสิ้น",
  //       new_mapping_id: new_mapping_id
  //     });

  //   } catch (err) {
  //     if (transaction) await transaction.rollback();
  //     console.error("SQL error:", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });

  router.post("/prep/matimport/add/saveTrolley", async (req, res) => {
    const sql = require("mssql");
    const {
      license_plate,
      batch_after,
      batch_before,
      operator,
      desttype,
      ntray,
      Process,
      weightTotal,
      mapping_id,
      dest,
      cookedDateTimeNew,
      level_eu,
      preparedDateTimeNew
    } = req.body;

    const requiredFields = [
      "license_plate",
      "mapping_id",
      "batch_before",
      "weightTotal",
      "ntray",
      "Process",
      "dest",
      "cookedDateTimeNew",
      "preparedDateTimeNew"
    ];
    const missingFields = requiredFields.filter(f => !req.body[f] && req.body[f] !== 0);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    let transaction;
    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // ✅ ตรวจสอบ Trolley
      if (license_plate) {
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
          return res.status(400).json({ success: false, error: "สถานะรถเข็นไม่ถูกต้อง" });
        }
        const now = new Date();
        const reservedTime = new Date(rsrv_timestamp);
        if ((now - reservedTime) / 1000 / 60 > 5) {
          return res.status(400).json({ success: false, error: "เกินเวลาที่กำหนด 5 นาที" });
        }
      }

      // ✅ ดึงข้อมูล Batch เดิมทั้งหมด ที่ mapping_id เดิม
      const oldBatchData = await transaction.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
        SELECT batch_before, batch_after
        FROM Batch
        WHERE mapping_id = @mapping_id
      `);

      // ✅ อัปเดต TrolleyRMMapping เดิมให้ว่าง
      await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`
        UPDATE TrolleyRMMapping
        SET tro_id = NULL, tl_status = '4664'
        WHERE mapping_id = @mapping_id
      `);

      // ✅ สร้าง Batch ใหม่ 1 แถวหลัก (ตาม batch_after/before ที่ส่งมา)
      const finalBatchAfter = batch_after || batch_before;
      if (!finalBatchAfter) throw new Error("batch_after หรือ batch_before ต้องมีค่า");

      const batchResult = await transaction.request()
        .input("batch_before", batch_before)
        .input("batch_after", finalBatchAfter)
        .query(`
        INSERT INTO Batch (batch_before, batch_after)
        OUTPUT INSERTED.batch_id
        VALUES (@batch_before, @batch_after)
      `);
      const batch_id = batchResult.recordset[0].batch_id;

      // ✅ ดึงข้อมูล mapping เดิม
      const origData = await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`SELECT * FROM TrolleyRMMapping WHERE mapping_id = @mapping_id`);
      if (origData.recordset.length === 0)
        throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);

      const oldMap = origData.recordset[0];

      // ✅ Insert Mapping ใหม่
      const insertNew = await transaction.request()
        .input("tro_id", license_plate)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("dest", 'รอCheckin')
        .input("stay_place", 'จุดเตรียม')
        .input("rm_status", 'รอQCตรวจสอบ')
        .input("process_id", Process)
        .input("batch_id", batch_id)
        .input("rmfp_id", oldMap.rmfp_id)
        .input("tro_production_id", oldMap.tro_production_id)
        .input("qc_id", oldMap.qc_id)
        .input("level_eu", oldMap.level_eu)
        .input("prep_to_cold_time", oldMap.prep_to_cold_time)
        .input("cold_time", oldMap.cold_time)
        .input("rework_time", oldMap.rework_time)
        .input("rmm_line_name", oldMap.rmm_line_name)
        .input("tl_status", "2.0")
        .query(`
        INSERT INTO TrolleyRMMapping (
          tro_id, dest, stay_place, weight_RM, tray_count,
          rm_status, process_id, batch_id, rmfp_id, tro_production_id,
          qc_id, level_eu, prep_to_cold_time, cold_time, rework_time,
          rmm_line_name, created_at, tl_status
        )
        OUTPUT INSERTED.mapping_id
        VALUES (
          @tro_id, @dest, @stay_place, @weight_RM, @tray_count,
          @rm_status, @process_id, @batch_id, @rmfp_id, @tro_production_id,
          @qc_id, @level_eu, @prep_to_cold_time, @cold_time, @rework_time,
          @rmm_line_name, GETDATE(), @tl_status
        )
      `);
      const new_mapping_id = insertNew.recordset[0].mapping_id;

      // ✅ คัดลอก Batch เดิมทุกแถว และผูก mapping_id ใหม่
      if (oldBatchData.recordset.length > 0) {
        for (const b of oldBatchData.recordset) {
          await transaction.request()
            .input("batch_before", b.batch_before)
            .input("batch_after", b.batch_after)
            .input("mapping_id", new_mapping_id)
            .query(`
            INSERT INTO Batch (batch_before, batch_after, mapping_id)
            VALUES (@batch_before, @batch_after, @mapping_id)
          `);
        }
      }

      // ✅ ดึงข้อมูล History เดิม
      const origHisData = await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`SELECT * FROM History WHERE mapping_id = @mapping_id`);
      if (origHisData.recordset.length === 0)
        throw new Error(`ไม่พบประวัติ mapping_id: ${mapping_id}`);
      const his = origHisData.recordset[0];

      // ✅ คืนสถานะ trolley (ถ้ามี)
      if (license_plate) {
        await transaction.request()
          .input("tro_id", license_plate)
          .query(`
          UPDATE Trolley
          SET tro_status = '0', rsrv_timestamp = NULL
          WHERE tro_id = @tro_id
        `);
      }

      // ✅ Insert History ใหม่
      await transaction.request()
        .input("mapping_id", new_mapping_id)
        .input("receiver_prep_two", operator)
        .input("cooked_date", cookedDateTimeNew)
        .input("rmit_date", preparedDateTimeNew)
        .input("withdraw_date", his.withdraw_date)
        .input("come_cold_date", his.come_cold_date)
        .input("out_cold_date", his.out_cold_date)
        .input("receiver", his.receiver)
        .input("receiver_out_cold", his.receiver_out_cold)
        .input("location", his.location)
        .input("first_prod", his.first_prod)
        .input("two_prod", his.two_prod)
        .input("three_prod", his.three_prod)
        .input("name_edit_prod_two", his.name_edit_prod_two)
        .input("name_edit_prod_three", his.name_edit_prod_three)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("cold_dest", his.cold_dest)
        .input("cold_to_pack_time", his.cold_to_pack_time)
        .input("qccheck_cold", his.qccheck_cold)
        .input("remark_rework", his.remark_rework)
        .input("remark_rework_cold", his.remark_rework_cold)
        .input("edit_rework", his.edit_rework)
        .query(`
        INSERT INTO History (
          mapping_id, receiver_prep_two, rmit_date, cooked_date,
          withdraw_date, come_cold_date, out_cold_date, receiver,
          receiver_out_cold, location, first_prod, two_prod, three_prod,
          name_edit_prod_two, name_edit_prod_three, weight_RM, tray_count,
          cold_dest, cold_to_pack_time, qccheck_cold,
          remark_rework, remark_rework_cold, edit_rework, created_at
        )
        VALUES (
          @mapping_id, @receiver_prep_two, @rmit_date, @cooked_date,
          @withdraw_date, @come_cold_date, @out_cold_date, @receiver,
          @receiver_out_cold, @location, @first_prod, @two_prod, @three_prod,
          @name_edit_prod_two, @name_edit_prod_three, @weight_RM, @tray_count,
          @cold_dest, @cold_to_pack_time, @qccheck_cold,
          @remark_rework, @remark_rework_cold, @edit_rework, GETDATE()
        )
      `);

      // ✅ ลบ mapping เดิม
      const deleteResult = await transaction.request()
        .input("old_mapping_id", sql.Int, Number(mapping_id))
        .query(`
    DELETE FROM TrolleyRMMapping
    WHERE mapping_id = @old_mapping_id
  `);

      console.log("🧾 ลบ Mapping เดิม:", mapping_id, "=> rowsAffected =", deleteResult.rowsAffected);


      // ✅ Commit
      await transaction.commit();

      // ✅ แจ้ง event
      io.to("QcCheckRoom").emit("dataUpdated", "gotUpdated");

      return res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลเสร็จสิ้น และคัดลอก Batch เรียบร้อย",
        new_mapping_id
      });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  // router.post("/mapping/successTrolley", async (req, res) => {
  //   const { mapping_id } = req.body;
  //   const io = req.app.get("io"); // ดึง io object มาใช้

  //   try {
  //     const pool = await connectToDatabase();

  //     // ตรวจสอบว่า mapping_id มีอยู่จริงหรือไม่
  //     const checkResult = await pool.request()
  //       .input("mapping_id", mapping_id)
  //       .query("SELECT mapping_id,tro_id FROM TrolleyRMMapping WHERE mapping_id = @mapping_id");

  //     if (checkResult.recordset.length === 0) {
  //       return res.status(404).json({ success: false, message: "ไม่พบข้อมูล mapping_id ที่ระบุ" });
  //     }

  //     let tro_id = checkResult.recordset[0].tro_id;

  //     // ทำการอัปเดตข้อมูล
  //     const result = await pool.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`
  //       UPDATE TrolleyRMMapping
  //       SET stay_place = NULL, dest = NULL, rm_status = 'สำเร็จ', tro_id = NULL
  //       WHERE mapping_id = @mapping_id
  //     `);

  //     if (result.rowsAffected[0] === 0) {
  //       return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตข้อมูลได้" });
  //     }

  //     console.log("Rows affected:", result.rowsAffected[0]);

  //     const claerStatus = await pool.request()
  //       .input("tro_id", tro_id)
  //       .input("tro_status", 1)
  //       .query(`
  //       UPDATE Trolley
  //         set tro_status = @tro_status
  //         WHERE tro_id = @tro_id
  //       `)


  //     // ---- ส่งข้อมูลผ่าน socket ----
  //     const formattedData = {
  //       mapping_id,
  //       status: "สำเร็จ",
  //       message: "Trolley mapping marked as complete"
  //     };

  //     io.to("saveRMForProdRoom").emit("dataUpdated", formattedData);

  //     return res.status(200).json({
  //       success: true,
  //       message: "บันทึกข้อมูลเสร็จสิ้น",
  //       updatedRows: result.rowsAffected[0]
  //     });
  //   } catch (err) {
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
  router.post("/mapping/successTrolley", async (req, res) => {
    const { mapping_id } = req.body;
    const io = req.app.get("io");

    if (!mapping_id) {
      return res.status(400).json({ success: false, message: "Missing mapping_id" });
    }

    const sql = require("mssql");
    let transaction;

    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // 1️⃣ ตรวจสอบ mapping_id
      const checkResult = await transaction.request()
        .input("mapping_id", mapping_id)
        .query("SELECT mapping_id, tro_id FROM TrolleyRMMapping WHERE mapping_id = @mapping_id");

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: "ไม่พบข้อมูล mapping_id ที่ระบุ" });
      }

      const tro_id = checkResult.recordset[0].tro_id;

      // 2️⃣ อัปเดต TrolleyRMMapping
      const updateMapping = await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`
        UPDATE TrolleyRMMapping
        SET stay_place = NULL, dest = NULL, rm_status = 'สำเร็จ', tro_id = NULL, tl_status = '4904'
        WHERE mapping_id = @mapping_id
      `);

      if (updateMapping.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดต TrolleyRMMapping ได้" });
      }

      // 3️⃣ อัปเดต Trolley หาก tro_id มีค่า
      if (tro_id) {
        const updateTrolley = await transaction.request()
          .input("tro_id", tro_id)
          .input("tro_status", 1)
          .query(`
          UPDATE Trolley
          SET tro_status = @tro_status
          WHERE tro_id = @tro_id
        `);

        if (updateTrolley.rowsAffected[0] === 0) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดต Trolley ได้" });
        }
      }

      // 4️⃣ Commit transaction
      await transaction.commit();

      // 5️⃣ ส่งข้อมูลผ่าน socket
      io.to("saveRMForProdRoom").emit("dataUpdated", {
        mapping_id,
        status: "สำเร็จ",
        message: "Trolley mapping marked as complete"
      });

      return res.status(200).json({
        success: true,
        message: "บันทึกข้อมูลเสร็จสิ้น",
        updatedRows: updateMapping.rowsAffected[0]
      });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error", err);
      return res.status(500).json({ success: false, error: err.message });
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
  //รถเข็นทั้งหมด
router.get("/prep/main/fetchAllTrolleys", async (req, res) => {
  try {
    const pool = await connectToDatabase();

    const emptyQuery = pool.request().query(`
        SELECT 
            t.tro_id as trolley_number,
            'รถเข็นว่าง (ห้องเย็น)' as trolley_status,
            'อยู่ในห้องเย็น' as trolley_location,
            cs.cs_name,
            s.slot_id,
            'empty' as trolley_type
        FROM Trolley t
        JOIN Slot s ON t.tro_id = s.tro_id
        JOIN ColdStorage cs ON s.cs_id = cs.cs_id
        WHERE 
            t.tro_status = '0'
        AND s.slot_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 
            FROM TrolleyRMMapping rmm 
            WHERE rmm.tro_id = t.tro_id
        )
        ORDER BY t.tro_id
        OPTION (RECOMPILE)
    `);

    const occupiedQuery = pool.request().query(`
SELECT 
    rmm.mapping_id,
    rmm.tro_id AS trolley_number,
    'มีวัตถุดิบ' AS trolley_status,
    rmm.dest,
    rmm.stay_place,
    rmm.rm_status,
    rm.mat,
    rm.mat_name,
    STRING_AGG(b.batch_after, ',') AS batch,
    CONCAT(pdt.doc_no, '(', rmm.rmm_line_name, ')') AS production,
    rmm.rmm_line_name,
    CONVERT(VARCHAR, htr.cooked_date, 120) AS cooked_date,
    CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
    CONVERT(VARCHAR, htr.qc_date, 120) AS qc_date,
    CONVERT(VARCHAR, htr.come_cold_date, 120) AS come_cold_date,
    CONVERT(VARCHAR, htr.out_cold_date, 120) AS out_cold_date,
    CONVERT(VARCHAR, htr.come_cold_date_two, 120) AS come_cold_date_two,
    CONVERT(VARCHAR, htr.out_cold_date_two, 120) AS out_cold_date_two,
    CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three,
    CONVERT(VARCHAR, htr.out_cold_date_three, 120) AS out_cold_date_three,
    htr.location,
    'occupied' AS trolley_type,
    CASE 
        WHEN (rmm.dest = 'เข้าห้องเย็น' OR rmm.dest = 'ไปบรรจุ') AND rmm.rm_status = 'รอQCตรวจสอบ' 
            THEN CONCAT('รอQC ตรวจสอบ ณ ', ISNULL(htr.location, '-'))
        WHEN (rmm.dest = 'บรรจุ') 
            THEN 'รอบรรจุทำรายการรับเข้า'
        WHEN rmm.dest = 'เข้าห้องเย็น' AND (rmm.rm_status IN 
            ('QcCheck','QcCheck รอกลับมาเตรียม','QcCheck รอ MD','รอกลับมาเตรียม','รอแก้ไข','เหลือจากไลน์ผลิต')) 
            THEN 'รอห้องเย็นรับเข้า'
        WHEN (rmm.dest IN ('ไปบรรจุ','บรรจุ')) AND rmm.rm_status = 'QcCheck' 
            THEN CONCAT('รอบรรจุรับ (', ISNULL(rmm.rmm_line_name,'-'), ')')
        WHEN (rmm.dest IN ('เข้าห้องเย็น','จุดเตรียม')) AND rmm.rm_status = 'QcCheck รอแก้ไข' 
            THEN CONCAT('QC ส่งกลับมาแก้ไข ณ ', ISNULL(htr.location,'-'))
        WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'ปกติ' 
            THEN 'รออบเสร็จ'
        WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status IN ('รอแก้ไข','รับฝาก-รอแก้ไข')) 
            THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location,'-'))
        WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'รอแก้ไข' 
            THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location,'-'))
        WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status IN ('รอกลับมาเตรียม','QcCheck รอ MD')) 
            THEN CONCAT('รอกลับมาเตรียม ณ ', ISNULL(htr.location,'-'))
        WHEN rmm.dest = 'รอCheckin' AND rmm.stay_place = 'จุดเตรียม' 
            THEN 'รอห้องเย็นหรือบรรจุ Check In'
        WHEN rmm.dest = 'ห้องเย็น' AND (rmm.rm_status IN 
            ('รอแก้ไข','รอQCตรวจสอบ','QcCheck','QcCheck รอ MD','รอกลับมาเตรียม','เหลือจากไลน์ผลิต')) 
            THEN 'อยู่ในห้องเย็น'
        ELSE '-'
    END AS trolley_location
FROM TrolleyRMMapping rmm
JOIN History htr ON rmm.mapping_id = htr.mapping_id
JOIN RMForProd rmfp ON rmm.rmfp_id = rmfp.rmfp_id
JOIN ProdRawMat prod ON rmfp.prod_rm_id = prod.prod_rm_id
JOIN RawMat rm ON prod.mat = rm.mat
JOIN Production pdt ON prod.prod_id = pdt.prod_id
LEFT JOIN Batch b ON rmm.mapping_id = b.mapping_id
WHERE rmm.tro_id IS NOT NULL
GROUP BY 
    rmm.mapping_id,
    rmm.tro_id,
    rmm.dest,
    rmm.stay_place,
    rmm.rmm_line_name,
    rmm.rm_status,
    rm.mat,
    rm.mat_name,
    pdt.doc_no,
    htr.cooked_date,
    htr.rmit_date,
    htr.qc_date,
    htr.come_cold_date,
    htr.out_cold_date,
    htr.come_cold_date_two,
    htr.out_cold_date_two,
    htr.come_cold_date_three,
    htr.out_cold_date_three,
    htr.location
ORDER BY rmm.tro_id
OPTION (RECOMPILE)
    `);

    const packingQuery = pool.request().query(`
        SELECT 
            pt.tro_id as trolley_number,
            'รอบรรจุจัดส่ง' as trolley_status,
            l.line_name as trolley_location,
            'packing' as trolley_type
        FROM PackTrolley pt
        LEFT JOIN Line l ON pt.line_tro = l.line_id
        ORDER BY pt.tro_id
        OPTION (RECOMPILE)
    `);

    // 🔥 รันพร้อมกัน
    const [emptyTrolleysResult, occupiedTrolleysResult, packingTrolleysResult] =
      await Promise.all([emptyQuery, occupiedQuery, packingQuery]);

    const allTrolleys = [
      ...emptyTrolleysResult.recordset,
      ...occupiedTrolleysResult.recordset,
      ...packingTrolleysResult.recordset
    ];

    allTrolleys.sort((a, b) => {
      const numA = parseInt(a.trolley_number) || 0;
      const numB = parseInt(b.trolley_number) || 0;
      return numA - numB;
    });

    res.json({
      success: true,
      data: {
        trolleys: allTrolleys,
        summary: {
          totalEmpty: emptyTrolleysResult.recordset.length,
          totalOccupied: occupiedTrolleysResult.recordset.length,
          totalPacking: packingTrolleysResult.recordset.length,
          totalTrolleys: allTrolleys.length
        }
      }
    });

  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
  // router.get("/prep/EditDataTrolley/fetchAllTrolleys", async (req, res) => {
  //   try {
  //     const pool = await connectToDatabase();
  //     const { rm_type_id } = req.query;
  //     if (!rm_type_id || rm_type_id === "undefined" || rm_type_id === "null") {
  //       return res.status(403).json({
  //         success: false,
  //         message: "Access denied: missing rm_type_id",
  //       });
  //     }



  //     let occupiedQuery = `
  //     SELECT 
  //         rmm.mapping_id,
  //         rmm.tro_id AS trolley_number,
  //         'มีวัตถุดิบ' AS trolley_status,
  //         rmm.dest,
  //         rmm.stay_place,
  //         rmm.rmm_line_name,
  //         rmm.rm_status,
  //         rmm.tray_count,
  //         rmm.weight_RM,
  //         rm.mat,
  //         rm.mat_name,
  //         STRING_AGG(b.batch_after, ',') AS batch,
  //         CONCAT(pdt.doc_no, '(', rmm.rmm_line_name, ')') AS production,
  //         CONVERT(VARCHAR, htr.cooked_date, 120) AS cooked_date,
  //         CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
  //         htr.location,
  //         'occupied' AS trolley_type,
  //         CASE 
  //             WHEN (rmm.dest = 'เข้าห้องเย็น' OR rmm.dest = 'ไปบรรจุ') AND rmm.rm_status = 'รอQCตรวจสอบ' 
  //                 THEN CONCAT('รอQC ตรวจสอบ ณ ', ISNULL(htr.location, '-'))
  //             WHEN (rmm.dest = 'บรรจุ') 
  //                   THEN CONCAT('รอบรรจุทำรายการรับเข้า ', 
  //                   COALESCE(MAX(htr.three_prod), MAX(htr.two_prod), MAX(htr.first_prod), '-'))
  //             WHEN rmm.dest = 'เข้าห้องเย็น' AND (rmm.rm_status IN 
  //                   ('QcCheck', 'QcCheck รอกลับมาเตรียม', 'QcCheck รอ MD', 'รอกลับมาเตรียม', 'รอแก้ไข', 'เหลือจากไลน์ผลิต')) 
  //                 THEN 'รอห้องเย็นรับเข้า'
  //             WHEN (rmm.dest IN ('ไปบรรจุ', 'บรรจุ')) AND rmm.rm_status = 'QcCheck' 
  //                 THEN CONCAT('รอบรรจุรับ (', ISNULL(rmm.rmm_line_name, '-'), ')')
  //             WHEN (rmm.dest IN ('เข้าห้องเย็น', 'จุดเตรียม')) AND rmm.rm_status = 'QcCheck รอแก้ไข' 
  //                 THEN CONCAT('QC ส่งกลับมาแก้ไข ณ ', ISNULL(htr.location, '-'))
  //             WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'ปกติ' 
  //                 THEN 'รออบเสร็จ'
  //             WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status IN ('รอแก้ไข', 'รับฝาก-รอแก้ไข')) 
  //                 THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location, '-'))
  //             WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'รอแก้ไข' 
  //                 THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location, '-'))
  //             WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status IN ('รอกลับมาเตรียม', 'QcCheck รอ MD')) 
  //                 THEN CONCAT('รอกลับมาเตรียม ณ ', ISNULL(htr.location, '-'))
  //             WHEN rmm.dest = 'ห้องเย็น' AND (rmm.rm_status IN 
  //                   ('รอแก้ไข', 'รอQCตรวจสอบ', 'QcCheck', 'QcCheck รอ MD', 'รอกลับมาเตรียม', 'เหลือจากไลน์ผลิต')) 
  //                 THEN 'อยู่ในห้องเย็น'
  //             ELSE '-'
  //         END AS trolley_location
  //     FROM 
  //         TrolleyRMMapping rmm
  //     JOIN 
  //         History htr ON rmm.mapping_id = htr.mapping_id
  //     JOIN 
  //         RMForProd rmfp ON rmm.rmfp_id = rmfp.rmfp_id
  //     JOIN 
  //         ProdRawMat prod ON rmfp.prod_rm_id = prod.prod_rm_id
  //     JOIN 
  //         RawMat rm ON prod.mat = rm.mat
  //     JOIN 
  //         Production pdt ON prod.prod_id = pdt.prod_id
  //     JOIN 
  //         Batch b ON rmm.mapping_id = b.mapping_id
  //     JOIN
  //         RawMatGroup rmg ON rmfp.rm_group_id = rmg.rm_group_id
  //     JOIN
  //         RawMatType rmt ON rmg.rm_type_id = rmt.rm_type_id    
  //     WHERE 
  //         rmm.tro_id IS NOT NULL
  //         AND rmg.rm_type_id = @rm_type_id
  //         AND NOT (rmm.rm_status = 'QcCheck' AND rmm.dest IN ('ไปบรรจุ', 'บรรจุ'))
  //         AND NOT (rmm.stay_place = 'เข้าห้องเย็น' and rmm.dest = 'ห้องเย็น')
  //     GROUP BY 
  //         rmm.mapping_id, rmm.tro_id, rmm.dest, rmm.stay_place, rmm.rmm_line_name, 
  //         rmm.rm_status,rmm.tray_count,rmm.weight_RM, rm.mat, rm.mat_name, pdt.doc_no, 
  //         htr.cooked_date, htr.rmit_date, htr.location
  //     ORDER BY 
  //         rmm.tro_id;
  //   `;

  //     const occupiedRequest = pool.request();
  //     occupiedRequest.input("rm_type_id", sql.Int, parseInt(rm_type_id));
  //     const occupiedTrolleysResult = await occupiedRequest.query(occupiedQuery);

  //     const allTrolleys = [
  //       ...occupiedTrolleysResult.recordset,
  //     ];

  //     allTrolleys.sort((a, b) => (parseInt(a.trolley_number) || 0) - (parseInt(b.trolley_number) || 0));

  //     res.json({
  //       success: true,
  //       data: {
  //         trolleys: allTrolleys,
  //         summary: {
  //           totalOccupied: occupiedTrolleysResult.recordset.length,
  //           totalTrolleys: allTrolleys.length,
  //         },
  //       },
  //     });

  //   } catch (err) {
  //     console.error("SQL error", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });

  router.get("/prep/EditDataTrolley/fetchAllTrolleys", async (req, res) => {
    try {
      const pool = await connectToDatabase();

      let { rm_type_id } = req.query;

      // ---------------------------
      // 1) แปลง rm_type_id ให้เป็น array ของตัวเลข
      // ---------------------------
      if (!rm_type_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied: missing rm_type_id",
        });
      }

      // ถ้าเป็น array อยู่แล้ว เช่น rm_type_id[]=1&rm_type_id[]=2
      if (Array.isArray(rm_type_id)) {
        rm_type_id = rm_type_id.flatMap((v) =>
          v.split(",").map((n) => parseInt(n.trim()))
        );
      } else {
        // ถ้าเป็นแบบ rm_type_id=1,2,3
        rm_type_id = rm_type_id.split(",").map((n) => parseInt(n.trim()));
      }

      // ลบค่าที่ไม่ใช่ตัวเลข
      rm_type_id = rm_type_id.filter((n) => !isNaN(n));

      if (rm_type_id.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Access denied: invalid rm_type_id",
        });
      }

      // สร้าง string สำหรับ SQL เช่น "1,2,3"
      const rm_type_in_sql = rm_type_id.join(",");

      // ---------------------------
      // 2) SQL Query (เพิ่ม IN (...))
      // ---------------------------

      let occupiedQuery = `
      SELECT 
          rmm.mapping_id,
          rmm.tro_id AS trolley_number,
          'มีวัตถุดิบ' AS trolley_status,
          rmm.dest,
          rmm.stay_place,
          rmm.rmm_line_name,
          rmm.rm_status,
          rmm.tray_count,
          rmm.weight_RM,
          rm.mat,
          rm.mat_name,
          STRING_AGG(b.batch_after, ',') AS batch,
          CONCAT(pdt.doc_no, '(', rmm.rmm_line_name, ')') AS production,
          CONVERT(VARCHAR, htr.cooked_date, 120) AS cooked_date,
          CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
          htr.location,
          'occupied' AS trolley_type,
          CASE 
              WHEN (rmm.dest = 'เข้าห้องเย็น' OR rmm.dest = 'ไปบรรจุ') AND rmm.rm_status = 'รอQCตรวจสอบ' 
                  THEN CONCAT('รอQC ตรวจสอบ ณ ', ISNULL(htr.location, '-'))
              WHEN (rmm.dest = 'บรรจุ') 
                    THEN CONCAT('รอบรรจุทำรายการรับเข้า ', 
                    COALESCE(MAX(htr.three_prod), MAX(htr.two_prod), MAX(htr.first_prod), '-'))
              WHEN rmm.dest = 'เข้าห้องเย็น' AND (rmm.rm_status IN 
                    ('QcCheck', 'QcCheck รอกลับมาเตรียม', 'QcCheck รอ MD', 'รอกลับมาเตรียม', 'รอแก้ไข', 'เหลือจากไลน์ผลิต')) 
                  THEN 'รอห้องเย็นรับเข้า'
              WHEN (rmm.dest IN ('ไปบรรจุ', 'บรรจุ')) AND rmm.rm_status = 'QcCheck' 
                  THEN CONCAT('รอบรรจุรับ (', ISNULL(rmm.rmm_line_name, '-'), ')')
              WHEN (rmm.dest IN ('เข้าห้องเย็น', 'จุดเตรียม')) AND rmm.rm_status = 'QcCheck รอแก้ไข' 
                  THEN CONCAT('QC ส่งกลับมาแก้ไข ณ ', ISNULL(htr.location, '-'))
              WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'ปกติ' 
                  THEN 'รออบเสร็จ'
              WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status IN ('รอแก้ไข', 'รับฝาก-รอแก้ไข')) 
                  THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location, '-'))
              WHEN rmm.dest = 'หม้ออบ' AND rmm.rm_status = 'รอแก้ไข' 
                  THEN CONCAT('รอแก้ไข ณ ', ISNULL(htr.location, '-'))
              WHEN rmm.dest = 'จุดเตรียม' AND (rmm.rm_status IN ('รอกลับมาเตรียม', 'QcCheck รอ MD')) 
                  THEN CONCAT('รอกลับมาเตรียม ณ ', ISNULL(htr.location, '-'))
              WHEN rmm.dest = 'ห้องเย็น' AND (rmm.rm_status IN 
                    ('รอแก้ไข', 'รอQCตรวจสอบ', 'QcCheck', 'QcCheck รอ MD', 'รอกลับมาเตรียม', 'เหลือจากไลน์ผลิต')) 
                  THEN 'อยู่ในห้องเย็น'
              ELSE '-'
          END AS trolley_location
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
      JOIN 
          Batch b ON rmm.mapping_id = b.mapping_id
      JOIN
          RawMatGroup rmg ON rmfp.rm_group_id = rmg.rm_group_id
      JOIN
          RawMatType rmt ON rmg.rm_type_id = rmt.rm_type_id    
      WHERE 
          rmm.tro_id IS NOT NULL
          AND rmg.rm_type_id IN (${rm_type_in_sql})
          AND NOT (rmm.rm_status = 'QcCheck' AND rmm.dest IN ('ไปบรรจุ', 'บรรจุ'))
          AND NOT (rmm.stay_place = 'เข้าห้องเย็น' and rmm.dest = 'ห้องเย็น')
      GROUP BY 
          rmm.mapping_id, rmm.tro_id, rmm.dest, rmm.stay_place, rmm.rmm_line_name, 
          rmm.rm_status, rmm.tray_count, rmm.weight_RM, rm.mat, rm.mat_name, pdt.doc_no, 
          htr.cooked_date, htr.rmit_date, htr.location
      ORDER BY 
          rmm.tro_id;
    `;

      const occupiedTrolleysResult = await pool.request().query(occupiedQuery);

      const allTrolleys = [...occupiedTrolleysResult.recordset];

      // sort
      allTrolleys.sort(
        (a, b) => (parseInt(a.trolley_number) || 0) - (parseInt(b.trolley_number) || 0)
      );

      res.json({
        success: true,
        data: {
          trolleys: allTrolleys,
          summary: {
            totalOccupied: occupiedTrolleysResult.recordset.length,
            totalTrolleys: allTrolleys.length,
          },
        },
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

  // router.post("/prep/mat/rework/saveTrolley", async (req, res) => {
  //   const { license_plate, ntray, weightTotal, mapping_id, dest, tro_id, recorder, rm_status, edit_rework } = req.body;
  //   console.log("body:", req.body);

  //   const sql = require("mssql");
  //   const pool = await connectToDatabase();
  //   const transaction = new sql.Transaction(pool);

  //   try {
  //     if (!tro_id || !license_plate || !mapping_id) {
  //       return res.status(400).json({ success: false, error: "Missing required fields" });
  //     }


  //     // ตรวจสอบสถานะก่อนทำรายการ
  //     const checkTrolley = await pool.request()
  //       .input("tro_id", license_plate)
  //       .query(`
  //         SELECT tro_status, rsrv_timestamp
  //         FROM Trolley
  //         WHERE tro_id = @tro_id
  //       `);

  //     if (checkTrolley.recordset.length === 0) {
  //       return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });
  //     }

  //     const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];

  //     if (tro_status !== 'rsrv') {
  //       return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
  //     }

  //     // ตรวจสอบว่าเกินเวลา 5 นาทีหรือไม่
  //     const now = new Date();
  //     const reservedTime = new Date(rsrv_timestamp);
  //     const diffMs = now - reservedTime;
  //     const diffMinutes = diffMs / 1000 / 60;

  //     if (diffMinutes > 5) {
  //       return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
  //     }


  //     await transaction.begin();

  //     await transaction.request()
  //       .input("tro_id", tro_id)
  //       .query(`
  //         UPDATE Trolley
  //         SET tro_status = '1'
  //         WHERE tro_id = @tro_id
  //     `);

  //     const rmGroupResult = await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .query(`
  //         SELECT rmg.rm_group_id, rmg.rework, trm.rework_time
  //         FROM TrolleyRMMapping trm
  //         JOIN RMForProd rmf ON trm.rmfp_id = rmf.rmfp_id
  //         JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
  //         WHERE trm.mapping_id = @mapping_id
  //     `);

  //     let rework_time_value = null;
  //     let description_rework;

  //     if ((rm_status === 'รอแก้ไข' || rm_status === 'รับฝาก-รอแก้ไข') && edit_rework !== null && rmGroupResult.recordset.length > 0) {
  //       rework_time_value = rmGroupResult.recordset[0].rework_time ?? rmGroupResult.recordset[0].rework;
  //       description_rework = edit_rework;
  //     } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework !== null && rmGroupResult.recordset[0]?.rework_time !== null) {
  //       rework_time_value = rmGroupResult.recordset[0].rework_time;
  //       description_rework = edit_rework;
  //     } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework === null) {
  //       description_rework = null;
  //     }

  //     // กำหนดค่า rm_status ใหม่ตามเงื่อนไข
  //     let new_rm_status = 'รอQCตรวจสอบ'; // ค่าเริ่มต้น
  //     let destination = dest;

  //     // เพิ่มเงื่อนไข: ถ้า rm_status เป็น "รับฝาก-รอแก้ไข" ให้เปลี่ยนเป็น "รอกลับมาเตรียม"
  //     if (rm_status === 'รับฝาก-รอแก้ไข') {
  //       new_rm_status = 'รอกลับมาเตรียม';
  //       destination = 'จุดเตรียม';

  //     }

  //     const updateRM = await transaction.request()
  //       .input("tro_id", license_plate)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("dest", destination)
  //       .input("stay_place", 'จุดเตรียม')
  //       .input("rm_status", new_rm_status) // ใช้ค่า rm_status ใหม่ตามเงื่อนไข
  //       .input("mapping_id", mapping_id)
  //       .input("rework_time", rework_time_value)
  //       .query(`
  //         UPDATE TrolleyRMMapping
  //         SET tro_id = @tro_id, 
  //             dest = @dest,  
  //             stay_place = @stay_place,
  //             rm_status = @rm_status,
  //             weight_RM = @weight_RM, 
  //             tray_count = @tray_count,
  //             rework_time = @rework_time,
  //             updated_at = GETDATE()
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
  //     `);

  //     await transaction.request()
  //       .input("mapping_id", mapping_id)
  //       .input("receiver", recorder)
  //       .input("weight_RM", weightTotal)
  //       .input("tray_count", ntray)
  //       .input("edit_rework", description_rework)
  //       .query(`
  //         UPDATE History
  //         SET receiver_oven_edit = @receiver, 
  //         rework_date = GETDATE(),
  //         weight_RM = @weight_RM,
  //         tray_count = @tray_count,
  //         edit_rework = @edit_rework,
  //         updated_at = GETDATE()
  //         WHERE mapping_id = @mapping_id
  //     `);

  //     await transaction.commit();

  //     // ✅ ส่งข้อมูลผ่าน Socket.IO ไปยังห้อง saveRMForProdRoom
  //     const formattedData = {
  //       tro_id,
  //       license_plate,
  //       weightTotal,
  //       ntray,
  //       dest,
  //       rm_status: new_rm_status,
  //       updated_at: new Date()
  //     };

  //     io.to("QcCheckRoom").emit("dataUpdated", formattedData);

  //     return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

  //   } catch (err) {
  //     await transaction.rollback();
  //     console.error("SQL error:", err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
  router.post("/prep/mat/rework/saveTrolley", async (req, res) => {
    const { license_plate, ntray, weightTotal, mapping_id, dest, recorder, rm_status, edit_rework } = req.body;
    const io = req.app.get("io");
    const sql = require("mssql");

    // 1️⃣ ตรวจสอบ input ครบ
    const requiredFields = ["license_plate", "ntray", "weightTotal", "mapping_id", "dest", "recorder", "rm_status"];
    const missingFields = requiredFields.filter(f => !req.body[f] && req.body[f] !== 0);
    if (missingFields.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missingFields.join(", ")}` });
    }

    let transaction;
    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // 2️⃣ ตรวจสอบ Trolley
      const checkTrolley = await transaction.request()
        .input("tro_id", license_plate)
        .query(`SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id`);

      if (checkTrolley.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: "ไม่พบรถเข็นนี้ในระบบ" });
      }

      const { tro_status, rsrv_timestamp } = checkTrolley.recordset[0];

      if (tro_status !== 'rsrv') {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
      }

      const diffMinutes = (new Date() - new Date(rsrv_timestamp)) / 1000 / 60;
      if (diffMinutes > 5) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: "ไม่สามารถทำรายการได้ เนื่องจากเลยเวลาที่กำหนด 5 นาที" });
      }

      // 4️⃣ ดึงข้อมูล rework
      const rmGroupResult = await transaction.request()
        .input("mapping_id", mapping_id)
        .query(`
        SELECT rmg.rm_group_id, rmg.rework, trm.rework_time
        FROM TrolleyRMMapping trm
        JOIN RMForProd rmf ON trm.rmfp_id = rmf.rmfp_id
        JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
        WHERE trm.mapping_id = @mapping_id
      `);

      if (rmGroupResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: `ไม่พบ mapping_id: ${mapping_id} ใน TrolleyRMMapping/RMForProd/RawMatGroup` });
      }

      let rework_time_value = null;
      let description_rework = null;

      const rmData = rmGroupResult.recordset[0];
      if ((rm_status === 'รอแก้ไข' || rm_status === 'รับฝาก-รอแก้ไข') && edit_rework !== null) {
        rework_time_value = rmData.rework_time ?? rmData.rework;
        description_rework = edit_rework;
      } else if (rm_status === 'QcCheck รอแก้ไข' && edit_rework !== null) {
        rework_time_value = rmData.rework_time;
        description_rework = edit_rework;
      }

      // 5️⃣ กำหนดค่า rm_status ใหม่
      let new_rm_status = 'รอQCตรวจสอบ';
      let destination = dest;
      if (rm_status === 'รับฝาก-รอแก้ไข') {
        new_rm_status = 'รอกลับมาเตรียม';
        destination = 'จุดเตรียม';
      }

      // 6️⃣ อัปเดต TrolleyRMMapping
      const updateRM = await transaction.request()
        .input("tro_id", license_plate)
        .input("weight_RM", weightTotal)
        .input("tray_count", ntray)
        .input("dest", destination)
        .input("stay_place", 'จุดเตรียม')
        .input("rm_status", new_rm_status)
        .input("mapping_id", mapping_id)
        .input("rework_time", rework_time_value)
        .query(`
        UPDATE TrolleyRMMapping
        SET tro_id = @tro_id, dest = @dest, stay_place = @stay_place,
            rm_status = @rm_status, weight_RM = @weight_RM,
            tray_count = @tray_count, rework_time = @rework_time,
            updated_at = GETDATE()
        WHERE mapping_id = @mapping_id
      `);

      if (updateRM.rowsAffected[0] === 0) {
        throw new Error(`ไม่พบข้อมูล mapping_id: ${mapping_id}`);
      }

      // 7️⃣ อัปเดต Trolley status เป็น 0
      await transaction.request()
        .input("tro_id", license_plate)
        .query(`UPDATE Trolley SET tro_status = '0' WHERE tro_id = @tro_id`);

      // 8️⃣ อัปเดต History
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

      // 9️⃣ ส่งข้อมูลผ่าน Socket.IO
      io.to("QcCheckRoom").emit("dataUpdated", {
        license_plate,
        weightTotal,
        ntray,
        dest,
        rm_status: new_rm_status,
        updated_at: new Date()
      });

      return res.status(200).json({ success: true, message: "บันทึกข้อมูลเสร็จสิ้น" });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("SQL error:", err);
      return res.status(500).json({ success: false, error: err.message });
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

  // router.post('/prep/batch/save', async (req, res) => {
  //   const { rmfp_id, batch_after } = req.body;  // ค่าที่มาจาก Frontend
  //   console.log("🚀 Backend รับค่า:", { rmfp_id, batch_after }); // ตรวจสอบค่าที่ Backend รับ

  //   try {
  //     const pool = await connectToDatabase();
  //     const result = await pool
  //       .request()
  //       .input('rmfp_id', rmfp_id)
  //       .query(`
  //         SELECT batch
  //         FROM RMForProd
  //         WHERE rmfp_id = @rmfp_id
  //       `);

  //     console.log("🚀 ค่า batch ที่ได้จากฐานข้อมูล:", result);

  //     const batch_before = result.recordset[0].batch;
  //     const final_batch_after = batch_after || batch_before; // ถ้าไม่มี batch_after ให้ใช้ batch_before

  //     console.log("🚀 batch_before และ batch_after ที่จะถูกบันทึก:", batch_before, final_batch_after);

  //     const insertResult = await pool
  //       .request()
  //       .input('batch_before', batch_before)
  //       .input('batch_after', final_batch_after)
  //       .query(`
  //         INSERT INTO Batch (batch_before, batch_after)
  //         VALUES (@batch_before, @batch_after)
  //       `);

  //     console.log("🚀 ผลการบันทึก:", insertResult);

  //     const batchIdResult = await pool
  //       .request()
  //       .input('batch_before', batch_before)
  //       .input('batch_after', final_batch_after)
  //       .query(`
  //       SELECT TOP 1 batch_id 
  //       FROM Batch
  //       WHERE batch_before = @batch_before 
  //         AND batch_after = @batch_after
  //       ORDER BY batch_id DESC
  //     `);

  //     console.log("🚀 ผลการค้นหา batch_id:", batchIdResult);
  //     const batch_id = batchIdResult.recordset[0].batch_id;

  //     // อัปเดต batch_id ในตาราง RMForProd
  //     const updateResult = await pool
  //       .request()
  //       .input('batch_id', batch_id)
  //       .input('rmfp_id', rmfp_id)
  //       .query(`
  //   UPDATE RMForProd
  //   SET batch_id = @batch_id
  //   WHERE rmfp_id = @rmfp_id
  // `);
  //     console.log("🚀 ผลการอัปเดต:", updateResult);



  //     res.json({ success: true, message: 'บันทึกข้อมูล Batch สำเร็จ' });
  //   } catch (err) {
  //     console.error('Error:', err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });
  router.post('/prep/batch/save', async (req, res) => {
    const { rmfp_id, batch_after } = req.body;
    const sql = require("mssql");

    if (!rmfp_id) {
      return res.status(400).json({ success: false, error: "Missing rmfp_id" });
    }

    let transaction;
    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // 1️⃣ ดึง batch ปัจจุบัน
      const result = await transaction.request()
        .input('rmfp_id', rmfp_id)
        .query(`SELECT batch FROM RMForProd WHERE rmfp_id = @rmfp_id`);

      if (result.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: "ไม่พบ rmfp_id ใน RMForProd" });
      }

      const batch_before = result.recordset[0].batch;
      const final_batch_after = batch_after || batch_before;

      // 2️⃣ บันทึก Batch ใหม่
      const insertResult = await transaction.request()
        .input('batch_before', batch_before)
        .input('batch_after', final_batch_after)
        .query(`
        INSERT INTO Batch (batch_before, batch_after)
        OUTPUT INSERTED.batch_id
        VALUES (@batch_before, @batch_after)
      `);

      const batch_id = insertResult.recordset[0].batch_id;

      // 3️⃣ อัปเดต batch_id ใน RMForProd
      await transaction.request()
        .input('batch_id', batch_id)
        .input('rmfp_id', rmfp_id)
        .query(`
        UPDATE RMForProd
        SET batch_id = @batch_id
        WHERE rmfp_id = @rmfp_id
      `);

      await transaction.commit();

      res.json({ success: true, message: 'บันทึกข้อมูล Batch สำเร็จ', batch_id });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error('Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });



  // router.post('/delete/rmforemu', async (req, res) => {
  //   const { rmfemu_id } = req.body;  // รับค่าจาก Frontend
  //   console.log("🚀 Backend รับค่า:", { rmfemu_id });

  //   try {
  //     const pool = await connectToDatabase();

  //     const updateResult = await pool
  //       .request()
  //       .input('rmfemu_id', rmfemu_id)
  //       .query(`
  //       UPDATE RMForEmu
  //       SET emu_status = '0'
  //       WHERE rmfemu_id = @rmfemu_id
  //     `);

  //     console.log("🚀 ผลการอัปเดต:", updateResult);

  //     res.json({ success: true, message: 'บันทึกข้อมูล Batch สำเร็จ' });
  //   } catch (err) {
  //     console.error('Error:', err);
  //     res.status(500).json({ success: false, error: err.message });
  //   }
  // });

  router.post('/delete/batchmix', async (req, res) => {
    const { rmfbatch_id } = req.body;
    const sql = require("mssql");

    if (!rmfbatch_id) {
      return res.status(400).json({ success: false, error: "Missing rmfbatch_id" });
    }

    let transaction;
    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // ตรวจสอบว่า rmfbatch_id มีอยู่
      const checkResult = await transaction.request()
        .input('rmfbatch_id', rmfbatch_id)
        .query(`SELECT rmfbatch_id FROM RMMixBatch WHERE rmfbatch_id = @rmfbatch_id`);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: "ไม่พบ rmfbatch_id ใน RMMixBatch" });
      }

      // อัปเดตสถานะ
      const updateResult = await transaction.request()
        .input('rmfbatch_id', rmfbatch_id)
        .query(`
        UPDATE RMMixBatch
        SET b_status = '0'
        WHERE rmfbatch_id = @rmfbatch_id
      `);

      if (updateResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: "ไม่สามารถอัปเดตข้อมูลได้" });
      }

      await transaction.commit();

      res.json({ success: true, message: 'บันทึกข้อมูลสำเร็จ' });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error('Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/delete/batch/cold/storage', async (req, res) => {
    const { sap_re_id } = req.body; // หรือ req.query ถ้าส่งใน URL
    const sql = require("mssql");

    if (!sap_re_id) {
      return res.status(400).json({ success: false, error: "Missing sap_re_id" });
    }

    let transaction;
    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // ตรวจสอบว่า sap_re_id มีอยู่จริง
      const checkResult = await transaction.request()
        .input('sap_re_id', sql.Int, sap_re_id)
        .query(`SELECT sap_re_id FROM SAP_Receive WHERE sap_re_id = @sap_re_id`);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: "ไม่พบ sap_re_id ใน SAP_Receive" });
      }

      // ลบข้อมูล
      const deleteResult = await transaction.request()
        .input('sap_re_id', sql.Int, sap_re_id)
        .query(`DELETE FROM SAP_Receive WHERE sap_re_id = @sap_re_id`);

      if (deleteResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: "ไม่สามารถลบข้อมูลได้" });
      }

      await transaction.commit();
      res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error('Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });



  router.post('/delete/rmforemu', async (req, res) => {
    const { rmfemu_id } = req.body;
    const sql = require("mssql");

    if (!rmfemu_id) {
      return res.status(400).json({ success: false, error: "Missing rmfemu_id" });
    }

    let transaction;
    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // ตรวจสอบว่า rmfemu_id มีอยู่
      const checkResult = await transaction.request()
        .input('rmfemu_id', rmfemu_id)
        .query(`SELECT rmfemu_id FROM RMForEmu WHERE rmfemu_id = @rmfemu_id`);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: "ไม่พบ rmfemu_id ใน RMForEmu" });
      }

      // อัปเดตสถานะ
      const updateResult = await transaction.request()
        .input('rmfemu_id', rmfemu_id)
        .query(`
        UPDATE RMForEmu
        SET emu_status = '0'
        WHERE rmfemu_id = @rmfemu_id
      `);

      if (updateResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: "ไม่สามารถอัปเดตข้อมูลได้" });
      }

      await transaction.commit();

      res.json({ success: true, message: 'บันทึกข้อมูลสำเร็จ' });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error('Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/delete/rmforemu', async (req, res) => {
    const { rmfemu_id } = req.body;
    const sql = require("mssql");

    if (!rmfemu_id) {
      return res.status(400).json({ success: false, error: "Missing rmfemu_id" });
    }

    let transaction;
    try {
      const pool = await connectToDatabase();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // ตรวจสอบว่า rmfemu_id มีอยู่
      const checkResult = await transaction.request()
        .input('rmfemu_id', rmfemu_id)
        .query(`SELECT rmfemu_id FROM RMForEmu WHERE rmfemu_id = @rmfemu_id`);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: "ไม่พบ rmfemu_id ใน RMForEmu" });
      }

      // อัปเดตสถานะ
      const updateResult = await transaction.request()
        .input('rmfemu_id', rmfemu_id)
        .query(`
        UPDATE RMForEmu
        SET emu_status = '0'
        WHERE rmfemu_id = @rmfemu_id
      `);

      if (updateResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: "ไม่สามารถอัปเดตข้อมูลได้" });
      }

      await transaction.commit();

      res.json({ success: true, message: 'บันทึกข้อมูลสำเร็จ' });

    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error('Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });




  return router;
};