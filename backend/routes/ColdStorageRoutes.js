module.exports = (io) => {
    const express = require("express");
    const { connectToDatabase } = require("../database/db");
    const sql = require("mssql");
    const { round } = require("lodash");

    const router = express.Router();
    const RESERVATION_TIMEOUT_MINUTES = 5; // 5 นาที

    // ✅ ฟังก์ชันเคลียร์ Slot ที่จองไว้นานเกินไป
    const clearExpiredSlots = async () => {
        try {
            const pool = await connectToDatabase();
            const result = await pool.request().query(`
               UPDATE Slot 
SET tro_id = NULL,status ='16', reserved_at = NULL 
WHERE reserved_at IS NOT NULL 
AND tro_id = 'rsrv'
AND DATEDIFF(MINUTE, reserved_at, GETDATE()) >= ${RESERVATION_TIMEOUT_MINUTES}
            `);

            if (result.rowsAffected > 0) {
                io.emit("slotReset", {}); // แจ้ง frontend ว่ามีการรีเซ็ต Slot
                console.log(`ล้าง Slot ที่หมดอายุแล้ว (${result.rowsAffected} รายการ)`);
            }
        } catch (error) {
            console.error("Error clearing expired slots:", error);
        }
    };

    // ✅ ตั้งให้รันทุก 10 นาที
    setInterval(clearExpiredSlots, 60 * 10000);



    // router.get("/coldstorage/main/md/fetchSlotRawMat", async (req, res) => {
    //     try {
    //         const pool = await connectToDatabase();
    //         const result = await pool.request().query(`
    //   SELECT
    //       rmm.mapping_id, 
    //       rmf.rmfp_id, 
    //       rmm.tro_id,
    //       STRING_AGG(b.batch_after, ', ') AS batch_after,  -- รวม batch_after ที่ mapping_id เดียวกัน
    //       rm.mat,
    //       rm.mat_name,
    //       CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
    //       rmm.level_eu,
    //       FORMAT(rmm.prep_to_cold_time, 'N2') AS remaining_time,
    //       FORMAT(rmg.prep_to_cold, 'N2') AS standard_time,
    //       FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
    //       FORMAT(rmg.rework, 'N2') AS standard_rework_time,
    //       rmm.rm_status,
    //       rmm.dest,
    //       rmm.weight_RM,
    //       rmm.tray_count,
    //       FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //       FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
    //       FORMAT(htr.qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date,
    //       FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
    //       FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
    //       FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three
    //   FROM
    //       TrolleyRMMapping rmm
    //   JOIN  
    //       RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id  
    //   LEFT JOIN
    //       Batch b ON rmm.mapping_id = b.mapping_id   -- join ด้วย mapping_id
    //   JOIN
    //       ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
    //   JOIN
    //       RawMat rm ON pr.mat = rm.mat
    //   JOIN
    //       Production p ON pr.prod_id = p.prod_id
    //   JOIN
    //       RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
    //   JOIN
    //       History htr ON rmm.mapping_id = htr.mapping_id
    //   WHERE 
    //       rmm.rm_status IN (
    //           'QcCheck',
    //           'เหลือจากไลน์ผลิต',
    //           'รอแก้ไข',
    //           'รอกลับมาเตรียม',
    //           'รอ Qc',
    //           'QcCheck รอ MD',
    //           'QcCheck รอกลับมาเตรียม',
    //           'รอQCตรวจสอบ'
    //       )
    //       AND rmf.rm_group_id = rmg.rm_group_id
    //       AND rmm.tro_id IS NOT NULL
    //       AND rmm.dest = 'เข้าห้องเย็น'
    //   GROUP BY
    //       rmm.mapping_id,
    //       rmf.rmfp_id,
    //       rmm.tro_id,
    //       rm.mat,
    //       rm.mat_name,
    //       p.doc_no,
    //       rmm.rmm_line_name,
    //       rmm.level_eu,
    //       rmm.prep_to_cold_time,
    //       rmg.prep_to_cold,
    //       rmm.rework_time,
    //       rmg.rework,
    //       rmm.rm_status,
    //       rmm.dest,
    //       rmm.weight_RM,
    //       rmm.tray_count,
    //       htr.cooked_date,
    //       htr.rmit_date,
    //       htr.qc_date,
    //       htr.out_cold_date,
    //       htr.out_cold_date_two,
    //       htr.out_cold_date_three
    //   ORDER BY 
    //       rmm.mapping_id DESC
    // `);

    //         const formattedData = result.recordset.map(item => item);

    //         res.json({ success: true, data: formattedData });
    //     } catch (err) {
    //         console.error("SQL error", err);
    //         res.status(500).json({ success: false, error: err.message });
    //     }
    // });






    // router.get("/coldstorage/main/mix/fetchSlotRawMat", async (req, res) => {
    //     try {
    //         const pool = await connectToDatabase();
    //         const result = await pool
    //             .request()
    //             .query(`
    //             SELECT
    //                 rmm.mapping_id,
    //                 rmm.tro_id,
    //                 rmm.tray_count,
    //                 rmm.weight_RM,
    //                 rmm.rm_status,
    //                 rmm.stay_place,
    //                 rmm.dest,
    //                 rmm.mix_code,
    //                 rmm.prod_mix,
    //                 rmm.mix_time,
    //                 CONCAT(p.doc_no, ' (', rmm.[rmm_line_name], ')') AS production,
    //                 p.code,
    //                 FORMAT(htr.mixed_date, 'yyyy-MM-dd HH:mm:ss') AS mixed_date
    //             FROM
    //                 TrolleyRMMapping rmm
    //             JOIN 
    //                 Production p ON rmm.prod_mix = p.prod_id
    //             JOIN 
    //                 History htr ON rmm.mapping_id = htr.mapping_id
    //             WHERE 
    //                 rmm.dest = 'เข้าห้องเย็น'
    //                 AND rmm.rm_status IN ('เหลือจากไลน์ผลิต','รอแก้ไข')
    //                 AND rmm.tro_id IS NOT NULL
    //         `);

    //         const formattedData = result.recordset.map(item => {
    //             console.log("item :", item);
    //             return item;
    //         });

    //         res.json({ success: true, data: formattedData });
    //     } catch (err) {
    //         console.error("SQL error", err);
    //         res.status(500).json({ success: false, error: err.message });
    //     }
    // });


    // router.get("/coldstorage/main/fetchSlotRawMat", async (req, res) => {
    //     try {
    //         const pool = await connectToDatabase();
    //         const result = await pool
    //             .request()
    //             .query(`
    //             SELECT
    //                 rmf.rmfp_id,
    //                 rmm.tro_id,
    //                 rmf.batch,
    //                 rm.mat,
    //                 rm.mat_name,
    //                 CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
    //                 rmm.level_eu,
    //                 FORMAT(rmm.prep_to_cold_time, 'N2') AS remaining_time,
    //                 FORMAT(rmg.prep_to_cold, 'N2') AS standard_time,
    //                 FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
    //                 FORMAT(rmg.rework, 'N2') AS standard_rework_time,
    //                 rmm.rm_status,
    //                 rmm.dest,
    //                 rmm.weight_RM,
    //                 rmm.tray_count,
    //                 FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //                 FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
    //                 FORMAT(htr.qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date,
    //                 FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
    //                 FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
    //                 FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three

    //             FROM
    //                 TrolleyRMMapping rmm
    //             JOIN  
    //                 RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id  
    //             JOIN
    //                 ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
    //             JOIN
    //                 RawMat rm ON pr.mat = rm.mat
    //             JOIN
    //                 Production p ON pr.prod_id = p.prod_id
    //             JOIN
    //                 RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
    //             JOIN
    //                 History htr ON rmm.mapping_id = htr.mapping_id
    //             WHERE 
    //                 rmm.dest = 'เข้าห้องเย็น'
    //                 AND rmm.rm_status IN ('รอกลับมาเตรียม','รอ Qc','QcCheck รอ MD','QcCheck รอกลับมาเตรียม')
    //                 AND rmf.rm_group_id = rmg.rm_group_id
    //                 AND rmm.tro_id IS NOT NULL;

    //       `);

    //         const formattedData = result.recordset.map(item => {
    //             console.log("item :", item);
    //             return item;
    //         });


    //         res.json({ success: true, data: formattedData });
    //     } catch (err) {
    //         console.error("SQL error", err);
    //         res.status(500).json({ success: false, error: err.message });
    //     }
    // });


    router.get("/coldstorage/main/md/fetchSlotRawMat", async (req, res) => {
        try {
            const pool = await connectToDatabase();
            const result = await pool.request().query(`
      SELECT
          rmm.mapping_id,
          rmf.rmfp_id,
          rmm.tro_id,
          STRING_AGG(b.batch_after, ', ') AS batch_after,
          rm.mat,
          rm.mat_name,
          CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
          rmm.level_eu,
          FORMAT(rmm.prep_to_cold_time, 'N2') AS remaining_time,
          FORMAT(rmg.prep_to_cold, 'N2') AS standard_time,
          FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_prep_to_pack_time,
          FORMAT(rmg.prep_to_pack, 'N2') AS standard_prep_to_pack_time,
          FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_cold_to_pack_time,
          FORMAT(rmg.cold_to_pack, 'N2') AS standard_cold_to_pack_time,
          FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
          FORMAT(rmg.rework, 'N2') AS standard_rework_time,
          rmm.rm_status,
          rmm.dest,
          rmm.weight_RM,
          rmm.tray_count,
          FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
          FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
          FORMAT(htr.qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date,
          FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
          FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
          FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three,


          rmm.from_mapping_id,
          FORMAT(htr_pack.pack_checkin_date, 'yyyy-MM-dd HH:mm:ss') AS pack_checkin_date


      FROM
          TrolleyRMMapping rmm
      JOIN  
          RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id  
      LEFT JOIN
          Batch b ON rmm.mapping_id = b.mapping_id
      JOIN
          ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
      JOIN
          RawMat rm ON pr.mat = rm.mat
      JOIN
          Production p ON pr.prod_id = p.prod_id
      JOIN
          RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
      JOIN
          History htr ON rmm.mapping_id = htr.mapping_id
      LEFT JOIN
          History htr_pack ON rmm.from_mapping_id = htr_pack.mapping_id


      WHERE
          rmm.rm_status IN (
              'QcCheck',
              'เหลือจากไลน์ผลิต',
              'รอแก้ไข',
              'รอกลับมาเตรียม',
              'รอ Qc',
              'QcCheck รอ MD',
              'QcCheck รอกลับมาเตรียม',
              'รอQCตรวจสอบ'
          )
          AND rmf.rm_group_id = rmg.rm_group_id
          AND rmm.tro_id IS NOT NULL
          AND rmm.dest IN ('เข้าห้องเย็น', 'รอCheckin')
      GROUP BY
          rmm.mapping_id,
          rmf.rmfp_id,
          rmm.tro_id,
          rm.mat,
          rm.mat_name,
          p.doc_no,
          rmm.rmm_line_name,
          rmm.level_eu,
          rmm.prep_to_cold_time,
          rmg.prep_to_cold,
          rmm.prep_to_pack_time,
          rmg.prep_to_pack,
          rmm.cold_to_pack_time,
          rmg.cold_to_pack,
          rmm.rework_time,
          rmg.rework,
          rmm.rm_status,
          rmm.dest,
          rmm.weight_RM,
          rmm.tray_count,
          htr.cooked_date,
          htr.rmit_date,
          htr.qc_date,
          htr.out_cold_date,
          htr.out_cold_date_two,
          htr.out_cold_date_three,
          rmm.from_mapping_id,        
          htr_pack.pack_checkin_date    
      ORDER BY
          rmm.mapping_id DESC
    `);


            res.json({ success: true, data: result.recordset });
        } catch (err) {
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });


    router.get("/coldstorage/main/mix/fetchSlotRawMat", async (req, res) => {
        try {
            const pool = await connectToDatabase();
            const result = await pool
                .request()
                .query(`
                SELECT
                    rmm.mapping_id,
                    rmm.tro_id,
                    rmm.tray_count,
                    rmm.weight_RM,
                    rmm.rm_status,
                    rmm.stay_place,
                    rmm.dest,
                    rmm.mix_code,
                    rmm.prod_mix,
                    rmm.mix_time,
                    CONCAT(p.doc_no, ' (', rmm.[rmm_line_name], ')') AS production,
                    p.code,
                    FORMAT(htr.mixed_date, 'yyyy-MM-dd HH:mm:ss') AS mixed_date,
                    FORMAT(htr.pack_checkin_date, 'yyyy-MM-dd HH:mm:ss') AS pack_checkin_date
                FROM
                    TrolleyRMMapping rmm
                JOIN
                    Production p ON rmm.prod_mix = p.prod_id
                JOIN
                    History htr ON rmm.mapping_id = htr.mapping_id
                WHERE
                    rmm.dest IN ('เข้าห้องเย็น', 'รอCheckin')
                    AND rmm.rm_status IN ('เหลือจากไลน์ผลิต','รอแก้ไข')
                    AND rmm.tro_id IS NOT NULL
            `);


            const formattedData = result.recordset.map(item => {
                console.log("item :", item);
                return item;
            });


            res.json({ success: true, data: formattedData });
        } catch (err) {
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    router.get("/coldstorage/main/fetchSlotRawMat", async (req, res) => {
        try {
            const pool = await connectToDatabase();
            const result = await pool
                .request()
                .query(`
                SELECT
                    rmf.rmfp_id,
                    rmm.tro_id,
                    rmf.batch,
                    rm.mat,
                    rm.mat_name,
                    CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                    rmm.level_eu,
                    FORMAT(rmm.prep_to_cold_time, 'N2') AS remaining_time,
                    FORMAT(rmg.prep_to_cold, 'N2') AS standard_time,
                    FORMAT(rmm.prep_to_pack_time, 'N2') AS remaining_prep_to_pack_time,
                    FORMAT(rmg.prep_to_pack, 'N2') AS standard_prep_to_pack_time,
                    FORMAT(rmm.cold_to_pack_time, 'N2') AS remaining_cold_to_pack_time,
                    FORMAT(rmg.cold_to_pack, 'N2') AS standard_cold_to_pack_time,
                    FORMAT(rmm.rework_time, 'N2') AS remaining_rework_time,
                    FORMAT(rmg.rework, 'N2') AS standard_rework_time,
                    rmm.rm_status,
                    rmm.dest,
                    rmm.weight_RM,
                    rmm.tray_count,
                    FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
                    FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
                    FORMAT(htr.qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date,
                    FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
                    FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
                    FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three,
                    FORMAT(htr.pack_checkin_date, 'yyyy-MM-dd HH:mm:ss') AS pack_checkin_date


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
                    RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
                JOIN
                    History htr ON rmm.mapping_id = htr.mapping_id
                WHERE
                    rmm.dest IN ('เข้าห้องเย็น', 'รอCheckin')
                    AND rmm.rm_status IN ('รอกลับมาเตรียม','รอ Qc','QcCheck รอ MD','QcCheck รอกลับมาเตรียม')
                    AND rmf.rm_group_id = rmg.rm_group_id
                    AND rmm.tro_id IS NOT NULL;


          `);


            const formattedData = result.recordset.map(item => {
                console.log("item :", item);
                return item;
            });




            res.json({ success: true, data: formattedData });
        } catch (err) {
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });


    /**
    * @swagger
    * /api/coldstorage/room:
    *    get:
    *      summary: ช่องจอดห้องเย็น
    *      tags:
    *       - ColdStorage
    *      responses:
    *        200:
    *          description: Successfull response
    *        500:
    *          description: Internal server error
    */
    router.get("/coldstorage/room", async (req, res) => {
        try {
            const pool = await connectToDatabase();

            const result = await pool.request().query(`
        SELECT 
          slot_id,
          cs_id,
          tro_id,
          slot_status
        FROM Slot
      `);

            if (result.recordset.length > 0) {
                res.status(200).json({
                    message: "successfully",
                    slot: result.recordset,
                });
            } else {
                res.status(404).json({ message: "No Slot" });
            }
        } catch (error) {
            console.error("Error retrieving slot:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    /**
 * @swagger
 * /api/coldstorage/update-rsrv-slot:
 *   put:
 *     summary: อัปเดต Slot เป็น "กำลังจอง"
 *     description: ใช้สำหรับอัปเดต slot_id และ cs_id โดยตั้งค่า tro_id เป็น "rsrv"
 *     tags:
 *       - ColdStorage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slot_id
 *               - cs_id
 *             properties:
 *               slot_id:
 *                 type: integer
 *               cs_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: อัปเดตค่ากำลังจองแล้ว
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
    router.put("/coldstorage/update-rsrv-slot", async (req, res) => {
        const { slot_id, cs_id } = req.body;

        if (!slot_id || !cs_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        try {
            const pool = await connectToDatabase();
            const transaction = pool.transaction();
            await transaction.begin();

            const resultSlot = await transaction.request()
                .input("slot_id", slot_id)
                .input("cs_id", cs_id)
                .query(`
          SELECT slot_id, cs_id, reserved_at FROM Slot WHERE slot_id = @slot_id AND cs_id = @cs_id
        `);

            if (resultSlot.recordset.length === 0) {
                return res.status(404).json({ success: false, message: "ไม่พบข้อมูล Slot หรือ CSID" });
            }

            const slot = resultSlot.recordset[0];

            // 🟢 ตรวจสอบว่า slot นี้ถูกจองแล้วหรือยัง
            if (slot.tro_id === 'rsrv') {
                const reservedTime = new Date(slot.reserved_at);
                const now = new Date();
                const diffMinutes = (now - reservedTime) / (10000 * 60);

                if (diffMinutes < RESERVATION_TIMEOUT_MINUTES) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: "Slot นี้ถูกจองอยู่แล้ว" });
                }
            }


            await transaction.request()
                .input("slot_id", slot_id)
                .input("cs_id", cs_id)
                .query(`
          UPDATE Slot SET tro_id = 'rsrv',status ='339', reserved_at = GETDATE() WHERE slot_id = @slot_id AND cs_id = @cs_id AND tro_id IS NULL
        `);

            await transaction.commit();

            // ✅ ตรวจสอบว่า io ถูกส่งมาหรือไม่ ก่อน emit
            if (!io) {
                console.error("❌ io is undefined, cannot emit event");
                return res.status(500).json({ success: false, error: "Socket.io instance is missing" });
            }

            // 📢 ส่ง event ไปยัง frontend
            io.emit("slotUpdated", { slot_id, cs_id });

            res.json({ success: true, message: "อัปเดตค่ากำลังจองแล้ว" });

        } catch (err) {
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });



    /**
 * @swagger
 * /api/coldstorage/update-NULL-slot:
 *   put:
 *     summary: อัปเดต Slot เป็น "ว่าง"
 *     description: ใช้สำหรับอัปเดต slot_id และ cs_id โดยตั้งค่า tro_id เป็น NULL
 *     tags:
 *       - ColdStorage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slot_id
 *               - cs_id
 *             properties:
 *               slot_id:
 *                 type: integer
 *               cs_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: อัปเดตค่าว่างแล้ว
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
    router.put("/clodstorage/update-NULL-slot", async (req, res) => {
        const { slot_id, cs_id } = req.body;

        if (!slot_id || !cs_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let pool, transaction;
        try {
            pool = await connectToDatabase();
            transaction = new sql.Transaction(pool);

            await transaction.begin();

            // 1. ตรวจสอบ Slot ก่อน
            const resultSlot = await transaction.request()
                .input("slot_id", slot_id)
                .input("cs_id", cs_id)
                .query(`
        SELECT slot_id, cs_id, tro_id, reserved_at
        FROM Slot
        WHERE slot_id = @slot_id AND cs_id = @cs_id
      `);

            if (resultSlot.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: "ไม่พบข้อมูล Slot หรือ CSID" });
            }

            // 2. อัปเดตค่า tro_id และ reserved_at ให้เป็น NULL
            const updateResult = await transaction.request()
                .input("slot_id", slot_id)
                .input("cs_id", cs_id)
                .query(`
       UPDATE Slot
        SET tro_id = NULL, status='444', reserved_at = NULL
        WHERE slot_id = @slot_id 
        AND cs_id = @cs_id
        AND tro_id = 'rsrv'
      `);

            // ตรวจสอบว่ามีแถวที่ถูกอัปเดตจริงหรือไม่
            if (updateResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(409).json({ success: false, message: "ไม่สามารถอัปเดต Slot ได้" });
            }

            // 3. Commit transaction ถ้าทุกอย่างผ่าน
            await transaction.commit();

            // 4. ส่ง event ไปยัง frontend ถ้ามี socket.io
            if (io) {
                io.emit("slotUpdated", { slot_id, cs_id });
            } else {
                console.error("❌ io is undefined, cannot emit event");
            }

            res.json({ success: true, message: "อัปเดตค่าว่างแล้ว" });

        } catch (err) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (rollbackErr) {
                    console.error("❌ Rollback error:", rollbackErr);
                }
            }
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    router.put("/clodstorage/rmInTrolley", async (req, res) => {
        const { mapping_id, rm_status } = req.body;

        if (!mapping_id || !rm_status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let pool, transaction;
        try {
            pool = await connectToDatabase();
            transaction = new sql.Transaction(pool);

            await transaction.begin();

            // 1. ตรวจสอบข้อมูลเดิม
            const checkResult = await transaction.request()
                .input("mapping_id", sql.Int, mapping_id)
                .query(`
        SELECT
          trm.rm_status,
          htr.qccheck_cold,
          trm.mix_code
        FROM
          TrolleyRMMapping trm
        JOIN
          History htr ON trm.mapping_id = htr.mapping_id
        WHERE trm.mapping_id = @mapping_id
      `);

            if (checkResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: "ไม่พบข้อมูล mapping_id ที่ระบุ" });
            }

            const { rm_status: currentStatus, qccheck_cold: qcCheckCold, mix_code: mixCode } =
                checkResult.recordset[0];

            // 2. ตรวจสอบเงื่อนไขก่อนอัปเดต
            if (mixCode !== null) {
                await transaction.rollback();
                return res.status(200).json({
                    success: true,
                    message: "ไม่ทำการอัปเดตเนื่องจากเป็นวัตถุดิบผสม",
                    mixCode,
                });
            }

            if (currentStatus === "รอกลับมาเตรียม" || currentStatus === "QcCheck รอ MD") {
                await transaction.rollback();
                return res.status(200).json({
                    success: true,
                    message: "ไม่ทำการอัปเดตเนื่องจากสถานะไม่อนุญาตให้เปลี่ยน",
                    currentStatus,
                });
            }

            if (currentStatus === "QcCheck" && qcCheckCold !== null) {
                await transaction.rollback();
                return res.status(200).json({
                    success: true,
                    message: "ไม่ทำการอัปเดตเนื่องจากวัตถุดิบผ่านการตรวจสอบ QC แล้ว",
                    currentStatus,
                    qcCheckCold,
                });
            }

            // 3. อัปเดตสถานะวัตถุดิบ
            const updateResult = await transaction.request()
                .input("mapping_id", sql.Int, mapping_id)
                .input("rm_status", sql.NVarChar, rm_status)
                .query(`
        UPDATE TrolleyRMMapping
        SET rm_status = @rm_status
        WHERE mapping_id = @mapping_id
      `);

            // ตรวจสอบว่ามีแถวถูกอัปเดตจริงหรือไม่
            if (updateResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(409).json({
                    success: false,
                    message: "ไม่สามารถอัปเดตสถานะได้",
                });
            }

            // 4. Commit ถ้าทุกอย่างผ่าน
            await transaction.commit();

            return res.status(200).json({
                success: true,
                message: "อัปเดตสถานะวัตถุดิบสำเร็จ",
                rowsAffected: updateResult.rowsAffected,
            });
        } catch (error) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (rollbackErr) {
                    console.error("❌ Rollback error:", rollbackErr);
                }
            }
            console.error("Error updating RM status:", error);
            return res.status(500).json({
                success: false,
                error: "เกิดข้อผิดพลาดในการอัปเดตสถานะวัตถุดิบ",
                details: error.message,
            });
        }
    });

    module.exports = router;





    // //เปลี่ยนสถานะ rm_status ในตาราง RMIntrolley
    // router.put("/clodstorage/rmInTrolley", async (req, res) => {
    //     const { mapping_id, rm_status } = req.body;

    //     if (!mapping_id) {
    //         return res.status(400).json({ error: "Missing required fields" });
    //     }

    //     let transaction
    //     try {
    //         const pool = await connectToDatabase();
    //         transaction = pool.transaction();
    //         await transaction.begin();

    //         const checkResult = await transaction
    //             .request()
    //             .input("mapping_id", sql.Int, mapping_id)
    //             .query(`SELECT
    //             trm.rm_status,
    //             qc.qccheck_cold
    //             FROM
    //                 TrolleyMapping trm
    //             LEFT JOIN
    //                 Qc qc ON trm.qc_id = qc.qc_id
    //             WHERE trm.mapping_id = @mapping_id
    //             `)
    //         if (checkResult.recordset[0].length === 0) {
    //             await transaction.rollback();
    //             return res.status(404).json({
    //                 success: false,
    //                 message: `ไม่พบวัตถุดิบด้วย mapping_id: ${mapping_id}`
    //             })
    //         }

    //         const currentStatus = checkResult.recordset[0].rm_status;
    //         const qcCheckCold = checkResult.recordset[0].qccheck_cold;

    //         console.log("currentStatus :",currentStatus)
    //         console.log("qcCheckCold :",qcCheckCold)

    //         if (currentStatus === "QcCheck" && qcCheckCold !== NULL) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: "วัตถุดิบนี้ตรวจสอบแล้ว ไม่สามารถเปลี่ยนสถานะเป็น 'รอแก้ไข' ได้"
    //             })
    //         }

    //         // 3. อัปเดตสถานะ
    //         await transaction.request()
    //             .input("mapping_id", sql.Int, mapping_id)
    //             .input("rm_status", sql.NVarChar(50), rm_status)
    //             .query(`
    //             UPDATE TrolleyRMMapping
    //             SET rm_status = @rm_status
    //             WHERE mapping_id = @mapping_id
    //         `);

    //         await transaction.commit();

    //         return res.status(200).json({
    //             success: true,
    //             message: "อัปเดตสถานะวัตถุดิบเรียบร้อยแล้ว"
    //         });

    //     } catch (error) {
    //         await transaction.rollback();
    //         return res.status(500).json({
    //             success: false,
    //             error: "เกิดข้อผิดพลาดในการอัปเดตสถานะวัตถุดิบ",
    //             details: error.message
    //         });
    //     }
    // });



    const reservedSlots = new Map();
    const RESERVATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes


    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('reserveSlot', async ({ slot_id, cs_id }) => {
            const reservationKey = `${slot_id}-${cs_id}`;

            // Check if slot is already reserved
            if (reservedSlots.has(reservationKey)) {
                socket.emit('reservationError', {
                    message: 'Slot is already reserved',
                    slot_id,
                    cs_id
                });
                return;
            }

            try {
                // Create reservation
                reservedSlots.set(reservationKey, {
                    slot_id,
                    cs_id,
                    socketId: socket.id,
                    timestamp: Date.now()
                });

                // Broadcast reservation to all clients
                io.emit('slotUpdated', {
                    slot_id,
                    cs_id,
                    status: 'reserved'
                });

                // Set timeout to auto-cancel reservation
                setTimeout(() => {
                    if (reservedSlots.has(reservationKey)) {
                        reservedSlots.delete(reservationKey);
                        io.emit('slotUpdated', {
                            slot_id,
                            cs_id,
                            status: 'available'
                        });
                    }
                }, RESERVATION_TIMEOUT);

            } catch (error) {
                console.error('Reservation error:', error);
                socket.emit('reservationError', {
                    message: 'Failed to reserve slot',
                    slot_id,
                    cs_id
                });
            }
        });

        socket.on('disconnect', () => {
            // Clear reservations for disconnected socket
            for (const [key, value] of reservedSlots.entries()) {
                if (value.socketId === socket.id) {
                    const [slot_id, cs_id] = key.split('-');
                    reservedSlots.delete(key);
                    io.emit('slotUpdated', {
                        slot_id,
                        cs_id,
                        status: 'available'
                    });
                }
            }
            console.log('Client disconnected:', socket.id);
        });
    });

    router.get("/coldstorage/fetchSlotRawMat", async (req, res) => {
        try {
            const { slot_id } = req.query;
            console.log(`Received slot_id: ${slot_id}`);

            if (!slot_id) {
                return res.status(400).json({ success: false, error: "slot_id is required" });
            }

            const pool = await connectToDatabase();
            if (!pool) {
                return res.status(500).json({ success: false, error: "Database connection failed." });
            }

            const result = await pool.request()
                .input('slot_id', slot_id)
                .query(`
                SELECT 
                    s.slot_id,
                    s.tro_id,
                    rmm.mapping_id,
                    rmm.tray_count,
                    rmm.weight_RM,
                    rmm.rm_status,
                    rm.mat_name,
                    CONCAT(p.doc_no, '(', rmm.rmm_line_name, ')') AS production,
                    FORMAT(rmm.prep_to_cold_time, 'N2') AS ptc_time,
                    FORMAT(COALESCE(rmm.cold_time, rmg.cold), 'N2') AS cold,
                    FORMAT(rmg.cold, 'N2') AS standard_cold,
                    FORMAT(rmm.rework_time, 'N2') AS rework_time,
                    FORMAT(rmg.rework, 'N2') AS standard_rework,
                    rmp.rmfp_id,
                    prm.mat,
                    h.cooked_date,
                    h.rmit_date,
                    CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
                    CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
                    CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
                    s.cs_id,
                    -- รวมค่า batch_after ทุกตัวใน mapping เดียวกัน
                    STRING_AGG(b.batch_after, ', ') AS batch_after_list
                FROM 
                    Slot s
                JOIN 
                    Trolley t ON s.tro_id = t.tro_id
                JOIN 
                    TrolleyRMMapping rmm ON rmm.tro_id = s.tro_id
                JOIN 
                    RMForProd rmp ON rmp.rmfp_id = rmm.rmfp_id
                JOIN 
                    ProdRawMat prm ON prm.prod_rm_id = rmm.tro_production_id
                JOIN 
                    RawMat rm ON rm.mat = prm.mat
                LEFT JOIN
                    batch b ON rmm.mapping_id = b.mapping_id
                JOIN 
                    ColdStorage c ON c.cs_id = s.cs_id
                JOIN 
                    Production p ON p.prod_id = prm.prod_id
                JOIN
                    RawMatGroup rmg ON rmp.rm_group_id = rmg.rm_group_id
                JOIN
                    History h ON rmm.mapping_id = h.mapping_id
                WHERE
                    s.slot_id = @slot_id AND rmm.dest = N'ห้องเย็น'
                    AND rmp.rm_group_id = rmg.rm_group_id
                GROUP BY
                    s.slot_id, s.tro_id, rmm.mapping_id, rmm.tray_count, rmm.weight_RM, 
                    rmm.rm_status, rm.mat_name, p.doc_no, rmm.rmm_line_name,
                    rmm.prep_to_cold_time, rmm.cold_time, rmg.cold, 
                    rmm.rework_time, rmg.rework, rmp.rmfp_id, prm.mat,
                    h.cooked_date, h.rmit_date, h.come_cold_date, 
                    h.come_cold_date_two, h.come_cold_date_three, s.cs_id
            `);

            if (result.recordset.length === 0) {
                return res.status(404).json({ success: false, error: "No data found for the given slot_id." });
            }

            const formattedData = result.recordset.map(item => {
                // แปลงวันที่ cooked_date
                if (item.cooked_date) {
                    const cookedDate = new Date(item.cooked_date);
                    const cookedYear = cookedDate.getUTCFullYear();
                    const cookedMonth = String(cookedDate.getUTCMonth() + 1).padStart(2, '0');
                    const cookedDay = String(cookedDate.getUTCDate()).padStart(2, '0');
                    const cookedHours = String(cookedDate.getUTCHours()).padStart(2, '0');
                    const cookedMinutes = String(cookedDate.getUTCMinutes()).padStart(2, '0');

                    item.CookedDateTime = `${cookedYear}-${cookedMonth}-${cookedDay} ${cookedHours}:${cookedMinutes}`;
                    delete item.cooked_date;
                } else {
                    item.CookedDateTime = null;
                }

                if (item.rmit_date) {
                    const cookedDate = new Date(item.rmit_date);
                    const cookedYear = cookedDate.getUTCFullYear();
                    const cookedMonth = String(cookedDate.getUTCMonth() + 1).padStart(2, '0');
                    const cookedDay = String(cookedDate.getUTCDate()).padStart(2, '0');
                    const cookedHours = String(cookedDate.getUTCHours()).padStart(2, '0');
                    const cookedMinutes = String(cookedDate.getUTCMinutes()).padStart(2, '0');

                    item.RawmatTransForm = `${cookedYear}-${cookedMonth}-${cookedDay} ${cookedHours}:${cookedMinutes}`;
                    delete item.rmit_date;
                } else {
                    item.RawmatTransForm = null;
                }

                // เปลี่ยนชื่อ field batch_after_list → batch
                item.batch = item.batch_after_list || null;
                delete item.batch_after_list;

                return item;
            });

            res.json({ success: true, data: formattedData });
        } catch (error) {
            console.error('Error during database query:', error);
            res.status(500).json({ success: false, error: `An error occurred while fetching data: ${error.message}` });
        }
    });


    router.get("/coldstorage/mixed/fetchSlotRawMat", async (req, res) => {
        try {
            const { slot_id } = req.query;
            console.log(`Received slot_id for mixed materials: ${slot_id}`);

            if (!slot_id) {
                return res.status(400).json({ success: false, error: "slot_id is required" });
            }

            const pool = await connectToDatabase();
            if (!pool) {
                return res.status(500).json({ success: false, error: "Database connection failed." });
            }

            const result = await pool
                .request()
                .input('slot_id', slot_id)
                .query(`
                    SELECT
                        rmm.mapping_id,
                        rmm.tro_id,
                        s.slot_id,
                        rmm.tray_count,
                        rmm.rmfp_id,
                        rmm.weight_RM,
                        rmm.rm_status,
                        rmm.stay_place,
                        rmm.dest,
                        rmm.mix_code,
                        rmm.prod_mix,
                        rmm.mix_time,
                        CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                        p.code,
                        FORMAT(htr.mixed_date, 'yyyy-MM-dd HH:mm:ss') AS mixed_date,
                        CONVERT(VARCHAR, htr.come_cold_date, 120) AS come_cold_date,
                        CONVERT(VARCHAR, htr.come_cold_date_two, 120) AS come_cold_date_two,
                        CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three,
                        s.cs_id
                    FROM
                        TrolleyRMMapping rmm
                    JOIN 
                        Slot s ON rmm.tro_id = s.tro_id
                    JOIN
                        RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
                    JOIN 
                        Production p ON rmm.prod_mix = p.prod_id
                    JOIN 
                        History htr ON rmm.mapping_id = htr.mapping_id
                    WHERE 
                        s.slot_id = @slot_id AND rmm.dest = 'ห้องเย็น'
                        AND rmm.mix_code IS NOT NULL
                `);

            if (result.recordset.length === 0) {
                return res.json({ success: true, data: [] }); // ส่งอาร์เรย์ว่างเมื่อไม่พบข้อมูล
            }

            res.json({ success: true, data: result.recordset });
        } catch (err) {
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });


    router.get("/coldstorage/fetchAvailableRawMaterials", async (req, res) => {
        try {
            const { current_tro_id } = req.query;
            console.log("tro_id : ", current_tro_id)

            if (!current_tro_id) {
                return res.status(400).json({
                    success: false,
                    error: "current_tro_id is required"
                });
            }

            const pool = await connectToDatabase();
            if (!pool) {
                return res.status(500).json({
                    success: false,
                    error: "Database connection failed."
                });
            }

            // ดึงข้อมูลวัตถุดิบปกติ
            // แก้ไข JOIN กับ batch table ให้ใช้ subquery ที่รวม batch_after หลายค่าเข้าด้วยกัน
            const normalRawMatQuery = `
SELECT 
    rmm.mapping_id,
    rmm.tro_id,
    rmm.rmfp_id,
    b.batch_combined AS batch,
    rm.mat_name,
    rm.mat,
    CONCAT(p.doc_no, '(', rmm.rmm_line_name, ')') AS production,
    rmm.weight_RM,
    rmm.tray_count,
    rmm.rm_status,
    rmm.dest,
    s.slot_id,
    cs.cs_id,
    cs.cs_name,
    h.cooked_date,
    h.rmit_date,
    CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
    CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
    CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
    FORMAT(rmm.cold_time, 'N2') AS cold_time,
    FORMAT(rmm.rework_time, 'N2') AS rework_time,
    FORMAT(rmg.cold, 'N2') AS standard_cold,
    FORMAT(rmg.rework, 'N2') AS standard_rework,
    0 AS isMixed
FROM 
    TrolleyRMMapping rmm
LEFT JOIN 
    RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
LEFT JOIN 
    ProdRawMat prm ON prm.prod_rm_id = rmm.tro_production_id
LEFT JOIN 
    RawMat rm ON rm.mat = prm.mat
LEFT JOIN (
    SELECT 
        mapping_id,
        STRING_AGG(batch_after, ', ') AS batch_combined
    FROM batch
    GROUP BY mapping_id
) b ON rmm.mapping_id = b.mapping_id
LEFT JOIN Qc q ON rmm.qc_id = q.qc_id
LEFT JOIN Production p ON p.prod_id = prm.prod_id
LEFT JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
LEFT JOIN History h ON rmm.mapping_id = h.mapping_id
LEFT JOIN Slot s ON rmm.tro_id = s.tro_id
LEFT JOIN ColdStorage cs ON s.cs_id = cs.cs_id
WHERE
    rmm.tro_id != @current_tro_id
    AND rmm.dest = 'ห้องเย็น'
    AND rmm.stay_place = 'เข้าห้องเย็น'
    AND rmm.weight_RM > 0
    AND rmm.tro_id IS NOT NULL;
`;

            // ดึงข้อมูลวัตถุดิบผสม
            const mixedRawMatQuery = `
            SELECT 
                rmm.mapping_id,
                rmm.tro_id,
                NULL AS rmfp_id,
                NULL AS batch,
                CONCAT('Mixed: ', rmm.mix_code) AS mat_name, 
                rmm.mix_code AS mat,
                CONCAT(p.doc_no, '(', rmm.rmm_line_name, ')') AS production,
                rmm.weight_RM,
                rmm.tray_count,
                rmm.rm_status,
                rmm.dest,
                s.slot_id,
                cs.cs_id,
                cs.cs_name,
                NULL AS cooked_date,
                NULL AS rmit_date,
                CONVERT(VARCHAR, h.mixed_date, 120) AS mixed_date,
                CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
                CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
                CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
                FORMAT(rmm.mix_time, 'N2') AS mix_time,
                NULL AS rework_time,
                NULL AS standard_cold,
                NULL AS standard_rework,
                1 AS isMixed -- ระบุว่าเป็นวัตถุดิบผสม
            FROM 
                TrolleyRMMapping rmm
            JOIN 
                Production p ON rmm.prod_mix = p.prod_id
            JOIN
                History h ON rmm.mapping_id = h.mapping_id
            JOIN
                Slot s ON rmm.tro_id = s.tro_id
            JOIN
                ColdStorage cs ON s.cs_id = cs.cs_id
            WHERE
                rmm.tro_id != @current_tro_id
                AND rmm.dest = 'ห้องเย็น'
                AND rmm.stay_place = 'เข้าห้องเย็น'
                AND rmm.weight_RM > 0
                AND rmm.tro_id IS NOT NULL
        `;

            // ดึงข้อมูลทั้งสองประเภทพร้อมกัน
            const [normalResult, mixedResult] = await Promise.all([
                pool.request()
                    .input('current_tro_id', current_tro_id)
                    .query(normalRawMatQuery),
                pool.request()
                    .input('current_tro_id', current_tro_id)
                    .query(mixedRawMatQuery)
            ]);

            // รวมข้อมูลทั้งสองประเภท
            const combinedData = [
                ...normalResult.recordset.map(item => ({
                    ...item,
                    CookedDateTime: item.cooked_date ?
                        new Date(item.cooked_date).toISOString().replace('T', ' ') : null,
                    RawmatTransForm: item.rmit_date ?
                        new Date(item.rmit_date).toISOString().replace('T', ' ') : null
                })),
                ...mixedResult.recordset.map(item => ({
                    ...item,
                    CookedDateTime: null,
                    RawmatTransForm: item.mixed_date ?
                        new Date(item.mixed_date).toISOString().replace('T', ' ') : null
                }))
            ];

            res.json({
                success: true,
                data: combinedData
            });
        } catch (error) {
            console.error('Error fetching available raw materials:', error);
            res.status(500).json({
                success: false,
                error: `An error occurred: ${error.message}`
            });
        }
    });
    router.put("/coldstorage/addRawMatToTrolley", async (req, res) => {
        try {
            console.log("Raw Request Body:", req.body);
            const {
                source_tro_id,
                target_tro_id,
                weight,
                slot_id,
                rmfp_id,
                mix_code,
                mapping_id,
                isMixed
            } = req.body;

            // ตรวจสอบข้อมูลที่จำเป็น
            if (!source_tro_id || !target_tro_id || !weight || !slot_id) {
                return res.status(400).json({
                    success: false,
                    error: "Missing required fields"
                });
            }

            if (isMixed) {
                if (!mix_code || !mapping_id) {
                    return res.status(400).json({
                        success: false,
                        error: "For mixed materials, mix_code and mapping_id are required"
                    });
                }
            } else {
                if (!rmfp_id) {
                    return res.status(400).json({
                        success: false,
                        error: "For normal materials, rmfp_id is required"
                    });
                }
            }

            const weightNum = parseFloat(weight);
            if (isNaN(weightNum)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid weight value"
                });
            }

            const pool = await connectToDatabase();
            if (!pool) {
                return res.status(500).json({
                    success: false,
                    error: "Database connection failed"
                });
            }

            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                // ดึงข้อมูลวัตถุดิบต้นทาง
                let sourceQuery;
                if (isMixed) {
                    sourceQuery = `
                SELECT 
                    mapping_id, tro_id, rmfp_id, tray_count,batch_id,tro_production_id,process_id,qc_id,
                    weight_RM, level_eu, prep_to_cold_time, cold_time,
                    rework_time, prep_to_pack_time, cold_to_pack_time,
                    rm_status, rm_cold_status, stay_place, dest, 
                    mix_code, prod_mix, allocation_date, removal_date, 
                    status, production_batch, created_by, rmm_line_name, mix_time
                FROM TrolleyRMMapping
                WHERE mapping_id = @mapping_id
            `;
                } else {
                    sourceQuery = `
                SELECT 
                    mapping_id, tro_id, rmfp_id, tray_count,batch_id,tro_production_id,process_id,qc_id,
                    weight_RM, level_eu, prep_to_cold_time, cold_time,
                    rework_time, prep_to_pack_time, cold_to_pack_time,
                    rm_status, rm_cold_status, stay_place, dest, 
                    mix_code, prod_mix, allocation_date, removal_date, 
                    status, production_batch, created_by, rmm_line_name
                FROM TrolleyRMMapping
                WHERE tro_id = @source_tro_id AND rmfp_id = @rmfp_id
            `;
                }

                const sourceResult = await new sql.Request(transaction)
                    .input('source_tro_id', source_tro_id)
                    .input('rmfp_id', rmfp_id)
                    .input('mapping_id', mapping_id)
                    .query(sourceQuery);

                if (sourceResult.recordset.length === 0) throw new Error("Source raw material not found");

                const sourceRecord = sourceResult.recordset[0];
                const currentTotalWeight = sourceRecord.weight_RM;
                const existingTrayCount = sourceRecord.tray_count;

                if (currentTotalWeight < weightNum) throw new Error(`Not enough weight available (Available: ${currentTotalWeight}, Requested: ${weightNum})`);

                const weightRatio = weightNum / currentTotalWeight;
                const traysToMove = Math.ceil(existingTrayCount * weightRatio);

                // ดึงข้อมูลประวัติต้นทาง
                const historyResult = await new sql.Request(transaction)
                    .input('mapping_id', sourceRecord.mapping_id)
                    .query(`SELECT * FROM History WHERE mapping_id = @mapping_id`);

                if (historyResult.recordset.length === 0) throw new Error("History record not found for source material");

                const historyData = historyResult.recordset[0];
                const currentDateTime = new Date().toISOString();
                const currentUser = req.user?.username || 'ห้องเย็นผสมวัตถุดิบ';

                // 1. ลดน้ำหนักและจำนวนถาดจากต้นทาง
                const updateSourceResult = await new sql.Request(transaction)
                    .input('source_tro_id', source_tro_id)
                    .input('rmfp_id', rmfp_id)
                    .input('mapping_id', mapping_id)
                    .input('weight', weightNum)
                    .input('trays', traysToMove)
                    .input('updated_at', currentDateTime)
                    .query(`
                UPDATE TrolleyRMMapping
                SET 
                    weight_RM = weight_RM - @weight,
                    tray_count = tray_count - @trays,
                    updated_at = @updated_at
                WHERE ${isMixed ? 'mapping_id = @mapping_id' : 'tro_id = @source_tro_id AND rmfp_id = @rmfp_id'}
            `);
                if (updateSourceResult.rowsAffected[0] === 0) throw new Error("Failed to update source TrolleyRMMapping");

                // 2. ตรวจสอบว่ามีวัตถุดิบปลายทางแล้วหรือไม่
                let destMappingId;
                if (isMixed) {
                    const checkMixedResult = await new sql.Request(transaction)
                        .input('target_tro_id', target_tro_id)
                        .input('mix_code', mix_code)
                        .query(`SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @target_tro_id AND mix_code = @mix_code`);
                    if (checkMixedResult.recordset.length > 0) destMappingId = checkMixedResult.recordset[0].mapping_id;
                } else {
                    const checkNormalResult = await new sql.Request(transaction)
                        .input('target_tro_id', target_tro_id)
                        .input('rmfp_id', rmfp_id)
                        .query(`SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @target_tro_id AND rmfp_id = @rmfp_id`);
                    if (checkNormalResult.recordset.length > 0) destMappingId = checkNormalResult.recordset[0].mapping_id;
                }

                if (destMappingId) {
                    // อัพเดทรายการปลายทาง
                    const updateDestResult = await new sql.Request(transaction)
                        .input('mapping_id', destMappingId)
                        .input('weight', weightNum)
                        .input('trays', traysToMove)
                        .input('updated_at', currentDateTime)
                        .query(`UPDATE TrolleyRMMapping SET weight_RM = weight_RM + @weight, tray_count = tray_count + @trays, updated_at = @updated_at WHERE mapping_id = @mapping_id`);
                    if (updateDestResult.rowsAffected[0] === 0) throw new Error("Failed to update destination TrolleyRMMapping");

                    const updateHistoryResult = await new sql.Request(transaction)
                        .input('mapping_id', destMappingId)
                        .input('weight', weightNum)
                        .input('trays', traysToMove)
                        .input('updated_at', currentDateTime)
                        .query(`UPDATE History SET weight_RM = weight_RM + @weight, tray_count = tray_count + @trays, updated_at = @updated_at WHERE mapping_id = @mapping_id`);
                    if (updateHistoryResult.rowsAffected[0] === 0) throw new Error("Failed to update destination History");
                } else {
                    // สร้างรายการใหม่ในปลายทาง + History
                    const insertResult = await new sql.Request(transaction)
                        .input('target_tro_id', target_tro_id)
                        .input('rmfp_id', rmfp_id)
                        .input('batch_id', sourceRecord.batch_id)
                        .input('tro_production_id', sourceRecord.tro_production_id)
                        .input('process_id', sourceRecord.process_id)
                        .input('qc_id', sourceRecord.qc_id)
                        .input('tray_count', traysToMove)
                        .input('weight_RM', weightNum)
                        .input('level_eu', sourceRecord.level_eu)
                        .input('prep_to_cold_time', sourceRecord.prep_to_cold_time)
                        .input('cold_time', sourceRecord.cold_time)
                        .input('prep_to_pack_time', sourceRecord.prep_to_pack_time)
                        .input('cold_to_pack_time', sourceRecord.cold_to_pack_time)
                        .input('mix_time', sourceRecord.mix_time)
                        .input('rework_time', sourceRecord.rework_time)
                        .input('rm_status', sourceRecord.rm_status)
                        .input('rm_cold_status', sourceRecord.rm_cold_status)
                        .input('stay_place', sourceRecord.stay_place)
                        .input('dest', sourceRecord.dest)
                        .input('mix_code', sourceRecord.mix_code)
                        .input('prod_mix', sourceRecord.prod_mix)
                        .input('allocation_date', currentDateTime)
                        .input('status', 1)
                        .input('production_batch', sourceRecord.production_batch)
                        .input('created_by', currentUser)
                        .input('created_at', currentDateTime)
                        .input('rmm_line_name', sourceRecord.rmm_line_name)
                        .input('tl_status', '1.1')
                        .query(`
                        INSERT INTO TrolleyRMMapping (
                            tro_id, rmfp_id, batch_id, tro_production_id, process_id, 
                            qc_id, tray_count, weight_RM, level_eu, 
                            prep_to_cold_time, cold_time, prep_to_pack_time, cold_to_pack_time,
                            mix_time, rework_time, rm_status, rm_cold_status, 
                            stay_place, dest, mix_code, prod_mix, allocation_date, 
                            status, production_batch, created_by, created_at,tl_status, rmm_line_name
                        )
                        OUTPUT INSERTED.mapping_id
                        VALUES (
                            @target_tro_id, @rmfp_id, @batch_id, @tro_production_id, @process_id, 
                            @qc_id, @tray_count, @weight_RM, @level_eu, 
                            @prep_to_cold_time, @cold_time, @prep_to_pack_time, @cold_to_pack_time,
                            @mix_time, @rework_time, @rm_status, @rm_cold_status, 
                            @stay_place, @dest, @mix_code, @prod_mix, @allocation_date, 
                            @status, @production_batch, @created_by, @created_at,@tl_status, @rmm_line_name
                        )
                    `);
                    if (!insertResult.recordset[0]?.mapping_id) throw new Error("Failed to insert destination TrolleyRMMapping");

                    destMappingId = insertResult.recordset[0].mapping_id;

                    // สร้าง History ใหม่เต็ม
                    await new sql.Request(transaction)
                        .input('mapping_id', destMappingId)
                        .input('withdraw_date', historyData.withdraw_date)
                        .input('cooked_date', historyData.cooked_date)
                        .input('rmit_date', historyData.rmit_date)
                        .input('qc_date', historyData.qc_date)
                        .input('come_cold_date', historyData.come_cold_date)
                        .input('out_cold_date', historyData.out_cold_date)
                        .input('come_cold_date_two', historyData.come_cold_date_two)
                        .input('out_cold_date_two', historyData.out_cold_date_two)
                        .input('come_cold_date_three', historyData.come_cold_date_three)
                        .input('out_cold_date_three', historyData.out_cold_date_three)
                        .input('mixed_date', historyData.mixed_date)
                        .input('sc_pack_date', historyData.sc_pack_date)
                        .input('rework_date', historyData.rework_date)
                        .input('receiver', historyData.receiver)
                        .input('receiver_prep_two', historyData.receiver_prep_two)
                        .input('receiver_qc', historyData.receiver_qc)
                        .input('receiver_out_cold', historyData.receiver_out_cold)
                        .input('receiver_out_cold_two', historyData.receiver_out_cold_two)
                        .input('receiver_out_cold_three', historyData.receiver_out_cold_three)
                        .input('receiver_oven_edit', historyData.receiver_oven_edit)
                        .input('receiver_pack_edit', historyData.receiver_pack_edit)
                        .input('remark_pack_edit', historyData.remark_pack_edit)
                        .input('location', historyData.location)
                        .input('tray_count', traysToMove)
                        .input('weight_RM', weightNum)
                        .input('md_time', historyData.md_time)
                        .input('tro_id', target_tro_id)
                        .input('rmm_line_name', sourceRecord.rmm_line_name)
                        .input('dest', sourceRecord.dest)
                        .input('name_edit_prod_two', historyData.name_edit_prod_two)
                        .input('name_edit_prod_three', historyData.name_edit_prod_three)
                        .input('first_prod', historyData.first_prod)
                        .input('two_prod', historyData.two_prod)
                        .input('three_prod', historyData.three_prod)
                        .input('receiver_qc_cold', historyData.receiver_qc_cold)
                        .input('remark_rework', historyData.remark_rework)
                        .input('remark_rework_cold', historyData.remark_rework_cold)
                        .input('edit_rework', historyData.edit_rework)
                        .input('prepare_mor_night', historyData.prepare_mor_night)
                        .query(`
                        INSERT INTO History (
                            mapping_id, withdraw_date, cooked_date, rmit_date, qc_date, 
                            come_cold_date, out_cold_date, come_cold_date_two, out_cold_date_two, 
                            come_cold_date_three, out_cold_date_three, mixed_date, sc_pack_date, rework_date, 
                            receiver, receiver_prep_two, receiver_qc, receiver_out_cold, 
                            receiver_out_cold_two, receiver_out_cold_three, receiver_oven_edit, 
                            receiver_pack_edit, remark_pack_edit, location, tray_count, weight_RM, 
                            md_time, tro_id, rmm_line_name, dest, name_edit_prod_two, name_edit_prod_three, 
                            first_prod, two_prod, three_prod, receiver_qc_cold, remark_rework, 
                            remark_rework_cold, edit_rework, prepare_mor_night, created_at
                        )
                        VALUES (
                            @mapping_id, @withdraw_date, @cooked_date, @rmit_date, @qc_date, 
                            @come_cold_date, @out_cold_date, @come_cold_date_two, @out_cold_date_two, 
                            @come_cold_date_three, @out_cold_date_three, @mixed_date, @sc_pack_date, @rework_date, 
                            @receiver, @receiver_prep_two, @receiver_qc, @receiver_out_cold, 
                            @receiver_out_cold_two, @receiver_out_cold_three, @receiver_oven_edit, 
                            @receiver_pack_edit, @remark_pack_edit, @location, @tray_count, @weight_RM, 
                            @md_time, @tro_id, @rmm_line_name, @dest, @name_edit_prod_two, @name_edit_prod_three, 
                            @first_prod, @two_prod, @three_prod, @receiver_qc_cold, @remark_rework, 
                            @remark_rework_cold, @edit_rework, @prepare_mor_night, GETDATE()
                        )
                    `);

                    const sourceBatchResult = await new sql.Request(transaction)
                        .input('source_mapping_id', sourceRecord.mapping_id)
                        .query(`SELECT batch_after, batch_before FROM Batch WHERE mapping_id = @source_mapping_id`);

                    if (sourceBatchResult.recordset.length > 0) {
                        for (const batch of sourceBatchResult.recordset) {
                            await new sql.Request(transaction)
                                .input('mapping_id', destMappingId)
                                .input('batch_after', batch.batch_after)
                                .input('batch_before', batch.batch_before)
                                .query(`
                    INSERT INTO Batch (mapping_id, batch_after, batch_before)
                    VALUES (@mapping_id, @batch_after, @batch_before)
                `);
                        }
                        console.log(`✅ คัดลอก ${sourceBatchResult.recordset.length} batch records ไปยัง mapping ใหม่: ${destMappingId}`);
                    }

                }

                // --- Comment ข้อ 4–8 ---
                const checkSourceResult = await new sql.Request(transaction)
                    .input('source_tro_id', source_tro_id)
                    .query(`
                SELECT COUNT(*) AS item_count, SUM(weight_RM) AS total_weight
                FROM TrolleyRMMapping
                WHERE tro_id = @source_tro_id
            `);
                const sourceTotalWeight = checkSourceResult.recordset[0]?.total_weight || 0;

                const checkZeroWeightItems = await new sql.Request(transaction)
                    .input('source_tro_id', source_tro_id)
                    .query(`
                SELECT mapping_id FROM TrolleyRMMapping
                WHERE tro_id = @source_tro_id AND weight_RM = 0
            `);

                if (checkZeroWeightItems.recordset.length > 0) {
                    await new sql.Request(transaction)
                        .input('source_tro_id', source_tro_id)
                        .input('removal_date', currentDateTime)
                        .query(`
                    UPDATE TrolleyRMMapping
                    SET removal_date = @removal_date, tro_id = NULL, status = '9788', tl_status = '1411'
                    WHERE tro_id = @source_tro_id AND weight_RM = 0
                `);
                }

                const remainingItemsResult = await new sql.Request(transaction)
                    .input('source_tro_id', source_tro_id)
                    .query(`
                SELECT COUNT(*) AS remaining_items
                FROM TrolleyRMMapping
                WHERE tro_id = @source_tro_id AND weight_RM > 0
            `);
                const remainingItems = remainingItemsResult.recordset[0]?.remaining_items || 0;

                if (remainingItems === 0 && sourceTotalWeight === 0) {
                    await new sql.Request(transaction)
                        .input('source_tro_id', source_tro_id)
                        .query(`UPDATE Slot SET tro_id = NULL ,status ='1428' WHERE tro_id = @source_tro_id`);
                    await new sql.Request(transaction)
                        .input('source_tro_id', source_tro_id)
                        .query(`UPDATE Trolley SET tro_status = '1' ,status = '1.7' WHERE tro_id = @source_tro_id`);
                }

                // Commit transaction
                await transaction.commit();

                res.json({
                    success: true,
                    message: "Raw material added successfully",
                    data: {
                        source_tro_id,
                        target_tro_id,
                        moved_weight: weightNum,
                        moved_trays: traysToMove,
                        dest_mapping_id: destMappingId,
                        source_remaining_items: remainingItems,
                        zero_weight_items_updated: checkZeroWeightItems.recordset.length
                    }
                });
            } catch (error) {
                await transaction.rollback();
                console.error("Transaction error:", error);
                res.status(500).json({ success: false, error: error.message });
            }
        } catch (error) {
            console.error("Error in addRawMatToTrolley:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // router.get("/coldstorage/fetchTrolleyMaterials", async (req, res) => {
    //     try {
    //         const { tro_id } = req.query;
    //         if (!tro_id) return res.status(400).json({ success: false, error: "tro_id is required" });

    //         const pool = await connectToDatabase();

    //         // วัตถุดิบปกติ
    //         const normalMaterialsQuery = `
    //        SELECT 
    //             t.tro_id,
    //             rmm.mapping_id,
    //             rmm.rmfp_id,
    //             0 AS isMixed,
    //             NULL AS mix_code,
    //             COALESCE(b.batch_after, rmf.batch) AS batch,
    //             FORMAT(rmm.prep_to_cold_time, 'N2') AS ptc_time,
    //             FORMAT(rmg.prep_to_cold, 'N2') AS standard_ptc,
    //             rm.mat_name AS materialName,
    //             rm.mat,
    //             rmm.weight_RM,
    //             rmm.tray_count,
    //             rmm.level_eu,
    //             h.come_cold_date,
    //             rmm.rm_status,
    //             CONCAT(p.doc_no, '(', rmm.rmm_line_name, ')') AS production,
    //             FORMAT(COALESCE(rmm.cold_time, rmg.cold), 'N2') AS cold,
    //             h.cooked_date,
    //             h.rmit_date,
    //             h.come_cold_date_two,
    //             h.come_cold_date_three,
    //             q.qccheck,
    //             q.mdcheck,
    //             q.defectcheck,
    //             q.defect_remark,
    //             h.qccheck_cold,
    //             q.md_remark,
    //             q.sq_remark,
    //             h.remark_rework,
    //             CONCAT(q.WorkAreaCode, '-', mwa.WorkAreaName, '/', q.md_no) AS machine_MD,
    //             h.receiver_qc_cold,
    //             h.remark_rework_cold,
    //             h.withdraw_date,
    //             h.first_prod,
    //             h.two_prod,
    //             h.three_prod,
    //             h.name_edit_prod_two,
    //             h.name_edit_prod_three,
    // 			pr.process_name
    //         FROM Trolley t
    //         JOIN TrolleyRMMapping rmm ON t.tro_id = rmm.tro_id
    //         JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
    //         JOIN ProdRawMat prm ON prm.prod_rm_id = rmm.tro_production_id
    //         JOIN RawMat rm ON rm.mat = prm.mat
    //         JOIN batch b ON rmm.batch_id = b.batch_id
    //         JOIN Production p ON p.prod_id = prm.prod_id
    //         JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
    //         JOIN History h ON rmm.mapping_id = h.mapping_id
    //         JOIN QC q ON rmm.qc_id = q.qc_id
    //         JOIN WorkAreas mwa ON q.WorkAreaCode = mwa.WorkAreaCode
    // 		JOIN Process pr ON rmm.process_id = pr.process_id
    //         WHERE t.tro_id = @tro_id
    //           AND rmm.dest = 'ห้องเย็น'
    //           AND rmm.mix_code IS NULL
    //     `;

    //         // วัตถุดิบผสม
    //         const mixedMaterialsQuery = `
    //         SELECT
    //             t.tro_id,
    //             rmm.mapping_id,
    //             rmm.rmfp_id,
    //             1 AS isMixed,
    //             rmm.mix_code,
    //             NULL AS batch,
    //             CONCAT('Mixed: ', rmm.mix_code) AS mat_name,
    //             rmm.mix_code AS mat,
    //             rmm.weight_RM,
    //             rmm.tray_count,
    //             h.come_cold_date,
    //             rmm.rm_status,
    //             CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
    //             NULL AS ptc_time,
    //             NULL AS cold,
    //             NULL AS cooked_date,
    //             NULL AS rmit_date,
    //             h.come_cold_date_two,
    //             h.come_cold_date_three,
    //             h.withdraw_date
    //         FROM Trolley t
    //         JOIN TrolleyRMMapping rmm ON t.tro_id = rmm.tro_id
    //         JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
    //         JOIN Production p ON rmm.prod_mix = p.prod_id
    //         JOIN History h ON rmm.mapping_id = h.mapping_id
    //         WHERE t.tro_id = @tro_id 
    //           AND rmm.dest = 'ห้องเย็น'
    //           AND rmm.mix_code IS NOT NULL
    //     `;

    //         const [normalResult, mixedResult] = await Promise.all([
    //             pool.request().input('tro_id', tro_id).query(normalMaterialsQuery),
    //             pool.request().input('tro_id', tro_id).query(mixedMaterialsQuery)
    //         ]);

    //         // ส่งค่าตรง ๆ จากฐานข้อมูล ไม่แปลงเวลา
    //         const combinedData = [
    //             ...normalResult.recordset,
    //             ...mixedResult.recordset
    //         ];

    //         res.json({ success: true, tro_id, materials: combinedData });

    //     } catch (error) {
    //         console.error('Error fetching trolley materials:', error);
    //         res.status(500).json({ success: false, error: error.message });
    //     }
    // });




    // ฟังก์ชันช่วยสำหรับแปลงรูปแบบวันที่

    router.get("/coldstorage/fetchTrolleyMaterials", async (req, res) => {
        try {
            const { tro_id } = req.query;
            if (!tro_id) {
                return res.status(400).json({ success: false, error: "tro_id is required" });
            }

            const pool = await connectToDatabase();

            // 🔹 วัตถุดิบปกติ
            const normalMaterialsQuery = `
            SELECT 
                t.tro_id,
                rmm.mapping_id,
                rmm.rmfp_id,
                0 AS isMixed,
                NULL AS mix_code,
                COALESCE(b.batch_after, rmf.batch) AS batch,
                FORMAT(rmm.prep_to_cold_time, 'N2') AS ptc_time,
                FORMAT(rmg.prep_to_cold, 'N2') AS standard_ptc,
                rm.mat_name AS materialName,
                rm.mat,
                rmm.weight_RM,
                rmm.tray_count,
                rmm.level_eu,
                h.come_cold_date,
                rmm.rm_status,
                CONCAT(p.doc_no, '(', rmm.rmm_line_name, ')') AS production,
                FORMAT(COALESCE(rmm.cold_time, rmg.cold), 'N2') AS cold,
                h.cooked_date,
                h.rmit_date,
                h.come_cold_date_two,
                h.come_cold_date_three,
                q.qccheck,
                q.mdcheck,
                q.defectcheck,
                q.defect_remark,
                h.qccheck_cold,
                q.md_remark,
                q.sq_remark,
                h.remark_rework,
                CONCAT(q.WorkAreaCode, '-', mwa.WorkAreaName, '/', q.md_no) AS machine_MD,
                h.receiver_qc_cold,
                h.remark_rework_cold,
                h.withdraw_date,
                h.first_prod,
                h.two_prod,
                h.three_prod,
                h.name_edit_prod_two,
                h.name_edit_prod_three,
                pr.process_name,
                q.general_remark
            FROM Trolley t
            JOIN TrolleyRMMapping rmm ON t.tro_id = rmm.tro_id
            JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
            JOIN ProdRawMat prm ON prm.prod_rm_id = rmm.tro_production_id
            JOIN RawMat rm ON rm.mat = prm.mat
            LEFT JOIN batch b ON rmm.batch_id = b.batch_id
            JOIN Production p ON p.prod_id = prm.prod_id
            JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
            LEFT JOIN History h ON rmm.mapping_id = h.mapping_id
            LEFT JOIN QC q ON rmm.qc_id = q.qc_id
            LEFT JOIN WorkAreas mwa ON q.WorkAreaCode = mwa.WorkAreaCode
            JOIN Process pr ON rmm.process_id = pr.process_id
            WHERE t.tro_id = @tro_id
              AND rmm.dest = 'ห้องเย็น'
              AND (rmm.mix_code IS NULL OR rmm.mix_code = '0')

        `;

            // 🔹 วัตถุดิบผสม
            const mixedMaterialsQuery = `
            SELECT
                t.tro_id,
                rmm.mapping_id,
                rmm.rmfp_id,
                1 AS isMixed,
                rmm.mix_code,
                NULL AS batch,
                CONCAT('Mixed: ', rmm.mix_code) AS mat_name,
                rmm.mix_code AS mat,
                rmm.weight_RM,
                rmm.tray_count,
                h.come_cold_date,
                rmm.rm_status,
                CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                NULL AS ptc_time,
                NULL AS cold,
                NULL AS cooked_date,
                NULL AS rmit_date,
                h.come_cold_date_two,
                h.come_cold_date_three,
                h.withdraw_date
            FROM Trolley t
            JOIN TrolleyRMMapping rmm ON t.tro_id = rmm.tro_id
            JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
            JOIN Production p ON rmm.prod_mix = p.prod_id
            LEFT JOIN History h ON rmm.mapping_id = h.mapping_id
            WHERE t.tro_id = @tro_id 
              AND rmm.dest = 'ห้องเย็น'
              AND rmm.mix_code IS NOT NULL
        `;

            // 🔄 Query ทั้ง normal และ mixed พร้อมกัน
            const [normalResult, mixedResult] = await Promise.all([
                pool.request().input('tro_id', tro_id).query(normalMaterialsQuery),
                pool.request().input('tro_id', tro_id).query(mixedMaterialsQuery)
            ]);

            // 🧩 รวมข้อมูล
            const combinedData = [
                ...normalResult.recordset,
                ...mixedResult.recordset
            ];

            res.json({ success: true, tro_id, materials: combinedData });

        } catch (error) {
            console.error('❌ Error fetching trolley materials:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });


    function formatMaterialDates(item) {
        // แปลง cooked_date เป็น CookedDateTime
        if (item.cooked_date) {
            const date = new Date(item.cooked_date);
            item.CookedDateTime = date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
        } else {
            item.CookedDateTime = null;
        }

        // แปลง rmit_date เป็น RawmatTransForm
        if (item.rmit_date) {
            const date = new Date(item.rmit_date);
            item.RawmatTransForm = date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
        } else {
            item.RawmatTransForm = null;
        }

        return item;
    }




    router.get("/coldstorage/export/fetchSlotRawMat", async (req, res) => {
        try {
            const pool = await connectToDatabase();
            const result = await pool.request().query(`
    SELECT
    rmm.mapping_id,
    rmf.rmfp_id,
    COALESCE(b.batch_after, rmf.batch) AS batch,
    rmm.mix_code,
    rm.mat,
    rm.mat_name,
    CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,

    CAST(rmm.prep_to_cold_time AS DECIMAL(10,2)) AS ptc_time,
    CAST(rmg.prep_to_cold AS DECIMAL(10,2)) AS standard_ptc,

    CAST(rmm.rework_time AS DECIMAL(10,2)) AS remaining_rework_time,
    CAST(rmg.rework AS DECIMAL(10,2)) AS standard_rework_time,

    CAST(COALESCE(rmm.cold_time, rmg.cold) AS DECIMAL(10,2)) AS cold,
    CAST(rmg.cold AS DECIMAL(10,2)) AS standard_cold,

    rmf.rm_group_id AS rmf_rm_group_id,
    rmg.rm_group_id AS rmg_rm_group_id,

    rmm.tro_id,
    rmm.level_eu,
    rmm.rm_cold_status,
    rmm.rm_status,
    rmm.rmm_line_name,

    s.slot_id,
    rmm.dest,
    rmm.weight_RM,
    rmm.tray_count,

    q.sq_remark,
    q.md_remark,
    q.defect_remark,
    q.qccheck,
    q.mdcheck,
    q.defectcheck,
    q.sq_acceptance,
    q.defect_acceptance,

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

    CONCAT(
        COALESCE(q.WorkAreaCode, ''),
        CASE 
            WHEN q.WorkAreaCode IS NOT NULL 
                 AND mwa.WorkAreaName IS NOT NULL
            THEN CONCAT('-', mwa.WorkAreaName, '/', q.md_no)
            ELSE ''
        END
    ) AS machine_MD,

    CONVERT(VARCHAR, htr.cooked_date, 120) AS cooked_date,
    CONVERT(VARCHAR, htr.withdraw_date, 120) AS withdraw_date,
    CONVERT(VARCHAR, htr.rmit_date, 120) AS rmit_date,
    CONVERT(VARCHAR, htr.come_cold_date, 120) AS come_cold_date,
    CONVERT(VARCHAR, htr.come_cold_date_two, 120) AS come_cold_date_two,
    CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three

FROM TrolleyRMMapping rmm

JOIN RMForProd rmf 
ON rmm.rmfp_id = rmf.rmfp_id

LEFT JOIN Batch b
ON rmm.mapping_id = b.mapping_id

JOIN ProdRawMat pr 
ON rmm.tro_production_id = pr.prod_rm_id

JOIN RawMat rm 
ON pr.mat = rm.mat

JOIN Production p 
ON pr.prod_id = p.prod_id

JOIN RawMatGroup rmg 
ON rmf.rm_group_id = rmg.rm_group_id

LEFT JOIN Slot s 
ON rmm.tro_id = s.tro_id

JOIN History htr 
ON rmm.mapping_id = htr.mapping_id

LEFT JOIN Qc q 
ON rmm.qc_id = q.qc_id

LEFT JOIN WorkAreas mwa 
ON q.WorkAreaCode = mwa.WorkAreaCode

WHERE
    rmm.dest = 'ห้องเย็น'
    AND rmm.stay_place = 'เข้าห้องเย็น'
    AND rmm.tro_id IS NOT NULL
	

ORDER BY 
    rmm.mapping_id DESC
    `);

            const formattedData = result.recordset.map(item => {
                console.log("item:", item);
                return item;
            });

            res.json({ success: true, data: formattedData });
        } catch (err) {
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });


    router.get("/coldstorage/mix/export/fetchSlotRawMat", async (req, res) => {
        try {
            const pool = await connectToDatabase();
            const result = await pool
                .request()
                .query(`
                SELECT
                    rmm.mapping_id,
                    rmm.tro_id,
                    s.slot_id,
                    rmm.tray_count,
                    rmm.weight_RM,
                    rmm.rm_status,
                    rmm.rm_cold_status,
                    rmm.stay_place,
                    rmm.dest,
                    rmm.mix_code,
                    rmm.prod_mix,
                    rmm.mix_time,
                    CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                    rmm.rmm_line_name,
                    p.code,
                    CONVERT(VARCHAR, htr.mixed_date, 120) AS mixed_date,
                    CONVERT(VARCHAR, htr.come_cold_date, 120) AS come_cold_date,
                    CONVERT(VARCHAR, htr.come_cold_date_two, 120) AS come_cold_date_two,
                    CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three

                FROM
                    TrolleyRMMapping rmm
                JOIN 
                    Production p ON rmm.prod_mix = p.prod_id
                JOIN 
                    History htr ON rmm.mapping_id = htr.mapping_id
                JOIN
                    Slot s ON rmm.tro_id = s.tro_id
                WHERE 
                    rmm.dest = 'ห้องเย็น'
                    AND rmm.stay_place = 'เข้าห้องเย็น'
                    AND rmm.tro_id IS NOT NULL
                    AND rmm.mix_code IS NOT NULL;
          `);

            const formattedData = result.recordset.map(item => {
                console.log("item :", item);
                return item;
            });


            res.json({ success: true, data: formattedData });
        } catch (err) {
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

router.put("/coldstorage/outcoldstorage", async (req, res) => {
        try {
            console.log("Raw Request Body:", req.body);


            const { tro_id, slot_id, rm_cold_status, rm_status, dest, operator, materials } = req.body;


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
                        status = '1791'
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
                            WHEN rm_status = 'QcCheck' AND @rm_cold_status IN ('เหลือจากไลน์ผลิต', 'วัตถุดิบตรง') AND @dest = 'บรรจุ' THEN 'บรรจุ'
                            WHEN rm_status = 'QcCheck' AND @rm_cold_status IN ('เหลือจากไลน์ผลิต', 'วัตถุดิบตรง') AND @dest = 'จุดเตรียม' THEN 'จุดเตรียม'
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


                    if (dest === 'บรรจุ') {
                        updateQuery += `, tro_id = NULL`;
                    }


                    if (dest === 'จุดเตรียม') {
                        updateQuery += `, tro_id = NULL`;
                    }


                    const updateRmResult = await new sql.Request(transaction)
                        .input("mapping_id", mapping_id)
                        .input("rm_status", rm_status)
                        .input("rm_cold_status", rm_cold_status)
                        .input("dest", dest)
                        .input("mix_time", mix_time)
                        .input("rework_delay_time", material.rework_delay_time)
                        .input("cold", cold)
                        .input("stay_place", 'ออกห้องเย็น')
                        .input("cold_to_pack_time", cold_to_pack_time)
                        .query(updateQuery + ` WHERE mapping_id = @mapping_id;`);


                    if (updateRmResult.rowsAffected[0] === 0) {
                        throw new Error(`Failed to update TrolleyRMMapping for mapping_id ${mapping_id}`);
                    }


                    // ถ้า dest = 'จุดเตรียม' หรือ 'บรรจุ' อัปเดต Trolley.tro_status = 1
                    if (dest === 'จุดเตรียม' || dest === 'บรรจุ') {
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


                    // ✅ ใช้ let เพื่อให้เพิ่ม pack_checkin_date ได้เมื่อ dest = 'บรรจุ'
                    let historyUpdateQuery = `
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
                `;


                    // ✅ เพิ่ม pack_checkin_date เฉพาะเมื่อ dest = 'บรรจุ' เท่านั้น
                    if (dest === 'บรรจุ') {
                        historyUpdateQuery += `, pack_checkin_date = GETDATE()`;
                    }


                    historyUpdateQuery += ` WHERE mapping_id = @mapping_id;`;


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



//  router.put("/coldstorage/outcoldstorage", async (req, res) => {
//         try {
//             console.log("Raw Request Body:", req.body);


//             const { tro_id, slot_id, rm_cold_status, rm_status, dest, operator, materials } = req.body;


//             // ตรวจสอบค่าที่ได้รับว่าครบถ้วน
//             if (!tro_id || !slot_id || !rm_status || !rm_cold_status || !dest || !materials) {
//                 console.log("Missing fields:", { tro_id, slot_id, rm_status, rm_cold_status, dest, materials });
//                 return res.status(400).json({ error: "Missing required fields" });
//             }


//             const pool = await connectToDatabase();
//             const transaction = new sql.Transaction(pool);
//             await transaction.begin();


//             try {
//                 // 1. อัปเดตสถานะของ slot
//                 const updateSlotResult = await new sql.Request(transaction)
//                     .input("tro_id", tro_id)
//                     .query(`
//           UPDATE Slot
//           SET tro_id = NULL,
//               status = '1791'
//           WHERE tro_id = @tro_id;
//         `);


//                 if (updateSlotResult.rowsAffected[0] === 0) {
//                     throw new Error(`Slot update failed for slot_id ${slot_id}`);
//                 }


//                 // 2. วนลูปปรับปรุงข้อมูลแต่ละรายการวัตถุดิบใน TrolleyRMMapping
//                 for (const material of materials) {
//                     const { mapping_id, remaining_rework_time, delayTime, cold, mix_time } = material;


//                     // ดึงข้อมูล cold_to_pack และ cold_to_pack_time
//                     const rmDataResult = await new sql.Request(transaction)
//                         .input("mapping_id", mapping_id)
//                         .query(`
//             SELECT rmg.cold_to_pack, rmm.cold_to_pack_time
//             FROM TrolleyRMMapping rmm
//             JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
//             JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
//             WHERE rmm.mapping_id = @mapping_id
//           `);


//                     if (rmDataResult.recordset.length === 0) {
//                         throw new Error(`Raw material not found for mapping_id: ${mapping_id}`);
//                     }


//                     let cold_to_pack_time = rmDataResult.recordset[0].cold_to_pack_time ?? rmDataResult.recordset[0].cold_to_pack;


//                     // สร้างคำสั่ง SQL พื้นฐานสำหรับอัปเดต TrolleyRMMapping
//                     let updateQuery = `
//           UPDATE TrolleyRMMapping
//           SET dest = CASE
//               WHEN rm_status = 'QcCheck' AND @rm_cold_status IN ('เหลือจากไลน์ผลิต', 'วัตถุดิบตรง')  AND @dest = 'บรรจุ' THEN 'บรรจุ'
//               WHEN rm_status = 'QcCheck' AND @rm_cold_status IN ('เหลือจากไลน์ผลิต', 'วัตถุดิบตรง')  AND @dest = 'จุดเตรียม' THEN 'จุดเตรียม'
//               WHEN rm_status = 'QcCheck รอ MD' AND @rm_cold_status = 'วัตถุดิบรับฝาก' THEN 'จุดเตรียม'
//               WHEN rm_status = 'QcCheck รอกลับมาเตรียม' AND @rm_cold_status = 'วัตถุดิบรับฝาก' THEN 'จุดเตรียม'
//               WHEN rm_status = 'รอกลับมาเตรียม' AND @rm_cold_status = 'วัตถุดิบรับฝาก' THEN 'จุดเตรียม'
//               WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบรับฝาก' AND @dest = 'จุดเตรียม' THEN 'จุดเตรียม'
//               WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบรอแก้ไข' AND @dest = 'จุดเตรียม' THEN 'จุดเตรียม'
//               WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบตรง' AND @dest = 'บรรจุ' THEN 'บรรจุ'
//               WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบตรง' AND @dest = 'จุดเตรียม' THEN 'จุดเตรียม'
//               WHEN rm_status = 'เหลือจากไลน์ผลิต' AND @rm_cold_status = 'เหลือจากไลน์ผลิต' AND @dest = 'บรรจุ' THEN 'บรรจุ'
//               WHEN rm_status = 'ส่งฟรีช' AND @rm_cold_status = 'รอส่งฟรีช' THEN 'จุดเตรียม'
//               ELSE @dest
//           END,
//           rm_status = CASE
//               WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบตรง' AND @dest = 'บรรจุ' THEN 'QcCheck'
//               WHEN rm_status = 'รอแก้ไข' AND @rm_cold_status = 'วัตถุดิบรับฝาก' AND @dest = 'จุดเตรียม' THEN 'รับฝาก-รอแก้ไข'
//               ELSE rm_status
//           END,
//           rm_cold_status = NULL,
//           stay_place = @stay_place,
//           cold_to_pack_time = @cold_to_pack_time
//         `;


//                     // กำหนด field เฉพาะประเภทวัตถุดิบ
//                     if (mix_time !== null && mix_time !== undefined) {
//                         updateQuery += `, mix_time = @mix_time`;
//                     } else if (remaining_rework_time !== null && remaining_rework_time !== undefined) {
//                         updateQuery += `, rework_time = @rework_delay_time`;
//                     } else {
//                         updateQuery += `, cold_time = @cold`;
//                     }


                    
//                     if (dest === 'บรรจุ') {
//                         updateQuery += `, tro_id = NULL`;
//                     }


//                     if (dest === 'จุดเตรียม') {
//                         updateQuery += `, tro_id = NULL`;
//                     }


//                     // Execute TrolleyRMMapping update
//                     const updateRmResult = await new sql.Request(transaction)
//                         .input("mapping_id", mapping_id)
//                         .input("rm_status", rm_status)
//                         .input("rm_cold_status", rm_cold_status)
//                         .input("dest", dest)
//                         .input("mix_time", mix_time)
//                         .input("rework_delay_time", material.rework_delay_time)
//                         .input("cold", cold)
//                         .input("stay_place", 'ออกห้องเย็น')
//                         .input("cold_to_pack_time", cold_to_pack_time)
//                         .query(updateQuery + ` WHERE mapping_id = @mapping_id;`);


//                     if (updateRmResult.rowsAffected[0] === 0) {
//                         throw new Error(`Failed to update TrolleyRMMapping for mapping_id ${mapping_id}`);
//                     }


                    
//                     if (dest === 'จุดเตรียม'|| dest === 'บรรจุ') {
//                         await new sql.Request(transaction)
//                             .input("tro_id", tro_id)
//                             .query(`
//               UPDATE Trolley
//               SET tro_status = 1
//               WHERE tro_id = @tro_id;
//             `);
//                     }


//                     // 3. อัปเดต History
//                     const updatedRmDataResult = await new sql.Request(transaction)
//                         .input("mapping_id", mapping_id)
//                         .query(`
//             SELECT cold_to_pack_time, mix_time, rework_time
//             FROM TrolleyRMMapping
//             WHERE mapping_id = @mapping_id
//           `);
//                     const updatedRmData = updatedRmDataResult.recordset[0];


//                     const historyUpdateQuery = `
//           UPDATE History
//           SET out_cold_date = CASE WHEN come_cold_date IS NOT NULL AND out_cold_date IS NULL THEN GETDATE() ELSE out_cold_date END,
//               out_cold_date_two = CASE WHEN come_cold_date_two IS NOT NULL AND out_cold_date_two IS NULL THEN GETDATE() ELSE out_cold_date_two END,
//               out_cold_date_three = CASE WHEN come_cold_date_three IS NOT NULL AND out_cold_date_three IS NULL THEN GETDATE() ELSE out_cold_date_three END,
//               receiver_out_cold = CASE WHEN come_cold_date IS NOT NULL AND out_cold_date IS NULL THEN @operator ELSE receiver_out_cold END,
//               receiver_out_cold_two = CASE WHEN come_cold_date_two IS NOT NULL AND out_cold_date_two IS NULL THEN @operator ELSE receiver_out_cold_two END,
//               receiver_out_cold_three = CASE WHEN come_cold_date_three IS NOT NULL AND out_cold_date_three IS NULL THEN @operator ELSE receiver_out_cold_three END,
//               cold_to_pack_time = @cold_to_pack_time,
//               mix_time = @mix_time,
//               rework_time = @rework_time,
//               cold_dest = @dest
//           WHERE mapping_id = @mapping_id;
//         `;


//                     await new sql.Request(transaction)
//                         .input("mapping_id", mapping_id)
//                         .input("operator", operator)
//                         .input("cold_to_pack_time", updatedRmData.cold_to_pack_time)
//                         .input("mix_time", updatedRmData.mix_time)
//                         .input("rework_time", updatedRmData.rework_time)
//                         .input("dest", dest)
//                         .query(historyUpdateQuery);
//                 }


//                 // Commit transaction
//                 await transaction.commit();


//                 const formattedData = {
//                     message: "วัตถุดิบถูกนำออกจากห้องเย็นแล้ว",
//                     updatedAt: new Date(),
//                     tro_id,
//                     operator
//                 };


//                 io.to('saveRMForProdRoom').emit('dataUpdated', formattedData);
//                 io.to('QcCheckRoom').emit('dataUpdated', formattedData);


//                 res.status(200).json({ message: "Data updated successfully" });


//             } catch (innerError) {
//                 await transaction.rollback();
//                 console.error("Transaction error:", innerError);
//                 res.status(500).json({ error: innerError.message });
//             }


//         } catch (error) {
//             console.error("Error:", error);
//             res.status(500).json({ error: "An error occurred while updating the data." });
//         }
//     });







    router.put("/coldstorage/update/:mapping_id", async (req, res) => {
        const { mapping_id } = req.params;

        let pool;
        let transaction;

        try {
            pool = await connectToDatabase();
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            const request = new sql.Request(transaction);

            // 1️⃣ ดึง tro_id เดิมออกมาก่อน
            const getTro = await request
                .input("mapping_id", sql.Int, mapping_id)
                .query(`
                SELECT tro_id 
                FROM TrolleyRMMapping
                WHERE mapping_id = @mapping_id
            `);

            if (getTro.recordset.length === 0) {
                await transaction.rollback();
                return res.json({
                    success: false,
                    message: "ไม่พบ mapping_id"
                });
            }

            const tro_id = getTro.recordset[0].tro_id;

            // 2️⃣ ถ้ามี tro_id ให้ update ตาราง Trolley
            if (tro_id) {
                await request
                    .input("tro_id", sql.Int, tro_id)
                    .query(`
                    UPDATE Trolley
                    SET tro_status = '1'
                    WHERE tro_id = @tro_id
                `);
            }

            // 3️⃣ update TrolleyRMMapping
            await request
                .input("mapping_id_update", sql.Int, mapping_id)
                .query(`
                UPDATE TrolleyRMMapping
                SET stay_place = N'ห้องเย็นลบ',
                    dest = N'ห้องเย็นลบ',
                    tro_id = NULL
                WHERE mapping_id = @mapping_id_update
            `);

            await transaction.commit();

            res.json({
                success: true,
                message: "อัปเดตสำเร็จ และคืนสถานะรถเข็นเรียบร้อย"
            });

        } catch (error) {
            if (transaction) await transaction.rollback();

            console.error("❌ Update error:", error);
            res.status(500).json({
                success: false,
                message: "เกิดข้อผิดพลาด",
                error: error.message
            });
        }
    });



    router.get("/coldstorage/history/:mapping_id", async (req, res) => {
        try {
            const { mapping_id } = req.params;
            const pool = await connectToDatabase();

            // Get history data and time values
            const result = await pool.request()
                .input("mapping_id", mapping_id)
                .query(`SELECT
                        CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
                        CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
                        CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
                        CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
                        CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
                        CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
                        CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
                        CONVERT(VARCHAR, h.rework_date, 120) AS rework_date,
                        h.receiver_out_cold,
                        h.receiver_out_cold_two,
                        h.receiver_out_cold_three,
                        rmm.rework_time,
                        rmm.mix_time,
                        rmm.cold_to_pack_time,
                        rmg.cold_to_pack
                       
    
                    FROM History h
                    JOIN TrolleyRMMapping rmm ON h.mapping_id = rmm.mapping_id
                    JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
                    JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
                    WHERE h.mapping_id = @mapping_id
                `);

            if (result.recordset.length > 0) {
                const historyData = result.recordset[0];
                const historyEntries = [];

                if (historyData.come_cold_date) {
                    historyEntries.push({
                        round: 1,
                        come_date: historyData.come_cold_date,
                        out_date: historyData.out_cold_date,
                        come_operator: historyData.receiver_come_cold,
                        out_operator: historyData.receiver_out_cold
                    });
                }

                if (historyData.come_cold_date_two) {
                    historyEntries.push({
                        round: 2,
                        come_date: historyData.come_cold_date_two,
                        out_date: historyData.out_cold_date_two,
                        come_operator: historyData.receiver_come_cold_two,
                        out_operator: historyData.receiver_out_cold_two
                    });
                }

                if (historyData.come_cold_date_three) {
                    historyEntries.push({
                        round: 3,
                        come_date: historyData.come_cold_date_three,
                        out_date: historyData.out_cold_date_three,
                        come_operator: historyData.receiver_come_cold_three,
                        out_operator: historyData.receiver_out_cold_three
                    });
                }

                res.status(200).json({
                    history: historyEntries,
                    qc_date: historyData.qc_date,
                    rework_date: historyData.rework_date,
                    rework_time: historyData.rework_time,
                    mix_time: historyData.mix_time,
                    cold_to_pack_time: historyData.cold_to_pack_time,
                    cold_to_pack: historyData.cold_to_pack
                });

                console.log("send body history:", historyEntries);
                console.log("send body qc_date:", historyData.qc_date);
                console.log("send body rework_time:", historyData.rework_time);
                console.log("send body mix_time:", historyData.mix_time);
                console.log("send body cold_to_pack_time:", historyData.cold_to_pack_time);
                console.log("send body cold_to_pack:", historyData.cold_to_pack);
            } else {
                res.status(404).json({ err: "History not found" });
            }
        } catch (err) {
            console.error("Error:", err);
            res.status(500).json({ error: "An error occurred while fetching history." });
        }
    });

    router.get("/coldstorage/history/test/:mapping_id", async (req, res) => {
        try {
            const { mapping_id } = req.params;
            const pool = await connectToDatabase();

            // Get history data and time values
            const result = await pool.request()
                .input("mapping_id", mapping_id)
                .query(`SELECT
                        CONVERT(VARCHAR, h.come_cold_date, 120) AS come_cold_date,
                        CONVERT(VARCHAR, h.out_cold_date, 120) AS out_cold_date,
                        CONVERT(VARCHAR, h.come_cold_date_two, 120) AS come_cold_date_two,
                        CONVERT(VARCHAR, h.out_cold_date_two, 120) AS out_cold_date_two,
                        CONVERT(VARCHAR, h.come_cold_date_three, 120) AS come_cold_date_three,
                        CONVERT(VARCHAR, h.out_cold_date_three, 120) AS out_cold_date_three,
                        CONVERT(VARCHAR, h.qc_date, 120) AS qc_date,
                        CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
                        CONVERT(VARCHAR, h.rework_date, 120) AS rework_date,
                        CONVERT(VARCHAR,
                                COALESCE(
                                    h.come_cold_date_three,
                                    h.come_cold_date_two,
                                    h.come_cold_date
                                ),
                                120
                        ) AS come_cold_date_latest,
                        h.receiver_out_cold,
                        h.receiver_out_cold_two,
                        h.receiver_out_cold_three,
                        rmm.rework_time,
                        rmm.mix_time,
                        rmm.cold_to_pack_time,
                        rmg.cold_to_pack
                       
    
                    FROM History h
                    JOIN TrolleyRMMapping rmm ON h.mapping_id = rmm.mapping_id
                    JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
                    JOIN RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
                    WHERE h.mapping_id = @mapping_id
                `);

            if (result.recordset.length > 0) {
                const historyData = result.recordset[0];
                const historyEntries = [];

                if (historyData.come_cold_date) {
                    historyEntries.push({
                        round: 1,
                        come_date: historyData.come_cold_date,
                        out_date: historyData.out_cold_date,
                        come_operator: historyData.receiver_come_cold,
                        out_operator: historyData.receiver_out_cold
                    });
                }

                if (historyData.come_cold_date_two) {
                    historyEntries.push({
                        round: 2,
                        come_date: historyData.come_cold_date_two,
                        out_date: historyData.out_cold_date_two,
                        come_operator: historyData.receiver_come_cold_two,
                        out_operator: historyData.receiver_out_cold_two
                    });
                }

                if (historyData.come_cold_date_three) {
                    historyEntries.push({
                        round: 3,
                        come_date: historyData.come_cold_date_three,
                        out_date: historyData.out_cold_date_three,
                        come_operator: historyData.receiver_come_cold_three,
                        out_operator: historyData.receiver_out_cold_three
                    });
                }

                res.status(200).json({
                    history: historyEntries,
                    qc_date: historyData.qc_date,
                    rework_date: historyData.rework_date,
                    rework_time: historyData.rework_time,
                    mix_time: historyData.mix_time,
                    cold_to_pack_time: historyData.cold_to_pack_time,
                    cold_to_pack: historyData.cold_to_pack,
                    come_cold_date_latest: historyData.come_cold_date_latest,
                    rmit_date: historyData.rmit_date
                });

                console.log("send body history:", historyEntries);
                console.log("send body qc_date:", historyData.qc_date);
                console.log("send body rework_time:", historyData.rework_time);
                console.log("send body mix_time:", historyData.mix_time);
                console.log("send body cold_to_pack_time:", historyData.cold_to_pack_time);
                console.log("send body cold_to_pack:", historyData.cold_to_pack);
                console.log("send body come_cold_date_latest:", historyData.come_cold_date_latest);
                console.log("send body rmit_date:", historyData.rmit_date);
            } else {
                res.status(404).json({ err: "History not found" });
            }
        } catch (err) {
            console.error("Error:", err);
            res.status(500).json({ error: "An error occurred while fetching history." });
        }
    });


    router.put("/coldstorage/moverawmat", async (req, res) => {
        try {
            console.log("raw Request Body:", req.body);
            const { tro_id, new_tro_id, typeOutput, slot_id, new_slot_id, rmfp_id, moveType, operator } = req.body;

            if (!tro_id || !new_tro_id || !typeOutput || !slot_id || !new_slot_id) {
                console.log("Missing fields:", { tro_id, new_tro_id, typeOutput, slot_id, new_slot_id });
                return res.status(400).json({ error: "Missing required fields" });
            }

            const typeOutputValue = parseFloat(typeOutput);
            if (isNaN(typeOutputValue)) {
                return res.status(400).json({ error: "typeOutput must be a valid number" });
            }

            const pool = await connectToDatabase();
            const transaction = pool.transaction();
            await transaction.begin();

            try {
                // --- ตรวจสอบน้ำหนักเก่าของรถเข็น ---
                const result = await pool.request()
                    .input("tro_id", sql.VarChar, tro_id)
                    .query(`SELECT SUM(weight_RM) AS total_weight FROM RMInTrolley WHERE tro_id = @tro_id;`);

                if (result.recordset.length > 0 && (result.recordset[0].total_weight || 0) <= 0) {
                    // --- อัปเดต tro_id เก่าเป็นใหม่ ---
                    await pool.request()
                        .input("tro_id", sql.VarChar, tro_id)
                        .input("new_tro_id", sql.VarChar, new_tro_id)
                        .query(`
                        UPDATE RMInTrolley SET tro_id = @new_tro_id WHERE tro_id = @tro_id;
                        UPDATE t SET t.weight_per_tro = ISNULL((SELECT SUM(r.weight_RM) FROM RMInTrolley r WHERE r.tro_id = @new_tro_id),0)
                        FROM RMInTrolley t WHERE t.tro_id = @new_tro_id;
                        UPDATE Slot SET tro_id = NULL ,status ='2061' WHERE slot_id = @slot_id;
                        UPDATE Trolley SET cs_id = NULL, slot_id = NULL, status = '1.8',tro_status = 1 WHERE tro_id = @tro_id;
                    `);
                    await transaction.commit();
                    return res.status(200).json({ message: "Old tro_id updated to new_tro_id and slot cleared." });
                }

                // --- ย้ายทั้งคัน หรือบางส่วน ---
                if ((moveType === "ย้ายทั้งคัน" || moveType === "ย้ายบางส่วน") && rmfp_id) {
                    const getMaterialData = await pool.request()
                        .input("tro_id", sql.VarChar, tro_id)
                        .input("rmfp_id", sql.VarChar, rmfp_id)
                        .query(`SELECT * FROM RMInTrolley WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id;`);

                    if (getMaterialData.recordset.length > 0) {
                        const materialData = getMaterialData.recordset[0];
                        const currentWeight = materialData.weight_RM || 0;

                        if (moveType === "ย้ายบางส่วน" && typeOutputValue > currentWeight) {
                            await transaction.rollback();
                            return res.status(400).json({ error: "น้ำหนักที่ต้องการย้ายมากกว่าน้ำหนักที่มีอยู่" });
                        }

                        // --- ลดน้ำหนักใน tro_id เก่า ---
                        const weightToMove = moveType === "ย้ายทั้งคัน" ? currentWeight : typeOutputValue;
                        await pool.request()
                            .input("tro_id", sql.VarChar, tro_id)
                            .input("rmfp_id", sql.VarChar, rmfp_id)
                            .input("weight_to_move", sql.Float, weightToMove)
                            .query(`
                            UPDATE RMInTrolley SET weight_RM = weight_RM - @weight_to_move
                            WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id;
                            UPDATE t SET t.weight_per_tro = ISNULL((SELECT SUM(r.weight_RM) FROM RMInTrolley r WHERE r.tro_id = @tro_id),0)
                            FROM RMInTrolley t WHERE t.tro_id = @tro_id;
                        `);

                        // --- เพิ่มน้ำหนักใน tro_id ใหม่ ---
                        const checkExistInNewTrolley = await pool.request()
                            .input("new_tro_id", sql.VarChar, new_tro_id)
                            .input("rmfp_id", sql.VarChar, rmfp_id)
                            .query(`SELECT COUNT(*) AS exist_count FROM RMInTrolley WHERE tro_id = @new_tro_id AND rmfp_id = @rmfp_id;`);
                        const existInNewTrolley = checkExistInNewTrolley.recordset[0].exist_count > 0;

                        if (existInNewTrolley) {
                            await pool.request()
                                .input("new_tro_id", sql.VarChar, new_tro_id)
                                .input("rmfp_id", sql.VarChar, rmfp_id)
                                .input("weight_to_move", sql.Float, weightToMove)
                                .query(`
                                UPDATE RMInTrolley SET weight_RM = weight_RM + @weight_to_move
                                WHERE tro_id = @new_tro_id AND rmfp_id = @rmfp_id;
                                UPDATE t SET t.weight_per_tro = ISNULL((SELECT SUM(r.weight_RM) FROM RMInTrolley r WHERE r.tro_id = @new_tro_id),0)
                                FROM RMInTrolley t WHERE t.tro_id = @new_tro_id;
                            `);
                        } else {
                            await pool.request()
                                .input("new_tro_id", sql.VarChar, new_tro_id)
                                .input("weight_to_move", sql.Float, weightToMove)
                                .input("batch", sql.NVarChar, materialData.batch || '')
                                .input("mat_name", sql.NVarChar, materialData.mat_name || '')
                                .input("production", sql.NVarChar, materialData.แผนการผลิต || '')
                                .input("cold", sql.NVarChar, materialData.cold || '')
                                .input("rmfp_id", sql.VarChar, materialData.rmfp_id || '')
                                .input("mat", sql.NVarChar, materialData.mat || '')
                                .input("rm_status", sql.Int, materialData.rm_status || 0)
                                .query(`
                                INSERT INTO RMInTrolley (tro_id, weight_RM, batch, mat_name, แผนการผลิต, cold, rmfp_id, mat, rm_status, weight_per_tro)
                                VALUES (@new_tro_id, @weight_to_move, @batch, @mat_name, @production, @cold, @rmfp_id, @mat, @rm_status, 0);
                                UPDATE t SET t.weight_per_tro = ISNULL((SELECT SUM(r.weight_RM) FROM RMInTrolley r WHERE r.tro_id = @new_tro_id),0)
                                FROM RMInTrolley t WHERE t.tro_id = @new_tro_id;
                            `);
                        }

                        // --- ลบรายการที่น้ำหนัก 0 ใน tro_id เก่า ---
                        await pool.request()
                            .input("tro_id", sql.VarChar, tro_id)
                            .input("rmfp_id", sql.VarChar, rmfp_id)
                            .query(`DELETE FROM RMInTrolley WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id AND weight_RM <= 0;`);
                    }
                }

                // --- ตรวจสอบรถเข็นเก่าและ slot ---
                const finalCheck = await pool.request()
                    .input("tro_id", sql.VarChar, tro_id)
                    .input("slot_id", sql.VarChar, slot_id)
                    .query(`
                    SELECT COUNT(*) AS item_count, ISNULL(SUM(weight_RM),0) AS total_weight
                    FROM RMInTrolley WHERE tro_id = @tro_id;
                    UPDATE Slot SET tro_id = NULL ,status ='2194' WHERE slot_id = @slot_id;
                    UPDATE trolley SET tro_status = 1,status = '1.9',cs_id = NULL, slot_id = NULL WHERE tro_id = @tro_id
                        AND (SELECT ISNULL(SUM(weight_RM),0) FROM RMInTrolley WHERE tro_id = @tro_id) <= 0;
                    DELETE FROM RMInTrolley WHERE tro_id = @tro_id AND (weight_RM <= 0 OR weight_RM IS NULL);
                `);

                // --- ผูกรถเข็นใหม่กับ slot ใหม่ ---
                const getCSidFromSlot = await pool.request()
                    .input("new_slot_id", sql.VarChar, new_slot_id)
                    .query(`SELECT cs_id FROM Slot WHERE slot_id = @new_slot_id;`);
                const cs_id = getCSidFromSlot.recordset.length > 0 ? getCSidFromSlot.recordset[0].cs_id : null;

                await pool.request()
                    .input("new_tro_id", sql.VarChar, new_tro_id)
                    .input("new_slot_id", sql.VarChar, new_slot_id)
                    .input("cs_id", sql.VarChar, cs_id)
                    .query(`
        UPDATE Slot 
        SET tro_id = @new_tro_id, 
            status = '/coldstorage/moverawmat'
        WHERE slot_id = @new_slot_id;

        UPDATE trolley 
        SET cs_id = @cs_id,
            slot_id = @new_slot_id,
            tro_status = 0
        WHERE tro_id = @new_tro_id;
    `);


                await transaction.commit();

                const formattedData = {
                    message: "วัตถุดิบถูกนำออกจากห้องเย็นแล้ว",
                    updatedAt: new Date(),
                    tro_id,
                    operator
                };
                io.to('saveRMForProdRoom').emit('dataUpdated', formattedData);

                res.status(200).json({ message: "Trolley moved successfully and weight updated" });

            } catch (error) {
                console.error("Transaction error:", error.message, error.stack);
                await transaction.rollback();
                res.status(500).json({ error: "Transaction failed", details: error.message });
            }

        } catch (error) {
            console.error("Error:", error.message, error.stack);
            res.status(500).json({ error: "An error occurred while updating the data.", details: error.message });
        }
    });


    router.put("/coldstorage/moveslot", async (req, res) => {
        try {
            console.log("Slot Request Body:", req.body);
            const { slot_id, tro_id, new_slot_id } = req.body;

            if (!slot_id || !tro_id || !new_slot_id) {
                console.log("Missing fields:", { slot_id, tro_id, new_slot_id });
                return res.status(400).json({ error: "Missing required fields" });
            }

            const pool = await connectToDatabase();
            const transaction = pool.transaction();
            await transaction.begin();

            try {
                // --- ตรวจสอบ slot เดิม ---
                const oldSlot = await pool.request()
                    .input("slot_id", slot_id)
                    .query(`SELECT slot_id, cs_id, tro_id, slot_status FROM Slot WHERE slot_id = @slot_id;`);

                if (oldSlot.recordset.length === 0) {
                    await transaction.rollback();
                    return res.status(404).json({ error: "Slot not found" });
                }

                if (!oldSlot.recordset[0].tro_id) {
                    await transaction.rollback();
                    return res.status(400).json({ error: "Cannot move slot. No trolley in the current slot." });
                }

                // --- ตรวจสอบ slot ใหม่ ---
                const newSlot = await pool.request()
                    .input("new_slot_id", new_slot_id)
                    .query(`SELECT slot_id, cs_id, tro_id, slot_status FROM Slot WHERE slot_id = @new_slot_id;`);

                if (newSlot.recordset.length === 0) {
                    await transaction.rollback();
                    return res.status(404).json({ error: "New Slot not found" });
                }

                if (newSlot.recordset[0].tro_id) {
                    await transaction.rollback();
                    return res.status(400).json({ error: "Cannot move slot. The new slot is already occupied by another trolley." });
                }

                // --- อัปเดต slot ใหม่ ---
                await pool.request()
                    .input("slot_id", new_slot_id)
                    .input("tro_id", tro_id)
                    .query(`UPDATE Slot SET tro_id = @tro_id ,
                     status = '/coldstorage/moveslot'
                    WHERE slot_id = @slot_id;`);

                // --- ลบ tro_id จาก slot เก่า ---
                await pool.request()
                    .input("slot_id", slot_id)
                    .query(`UPDATE Slot SET tro_id = NULL ,status ='16' WHERE slot_id = @slot_id;`);

                await transaction.commit();
                return res.status(200).json({ message: "Slot moved successfully" });

            } catch (error) {
                console.error("Transaction error:", error);
                await transaction.rollback();
                return res.status(500).json({ error: "Transaction failed", details: error.message });
            }

        } catch (error) {
            console.error("Error:", error);
            return res.status(500).json({ error: "Internal Server Error", details: error.message });
        }
    });

    router.put("/coldstorage/updatestatusrework", async (req, res) => {
        try {
            console.log("Raw Request Body:", req.body);
            const { rm_tro_id } = req.body;

            // ตรวจสอบค่า rm_tro_id
            if (!rm_tro_id || typeof rm_tro_id !== "number") {
                return res.status(400).json({ error: "Invalid or missing 'rm_tro_id'" });
            }

            const pool = await connectToDatabase();
            const transaction = pool.transaction();
            await transaction.begin();

            try {
                // อัปเดต status ของ RMInTrolley
                const result = await pool.request()
                    .input("rm_tro_id", rm_tro_id)
                    .query(`
                    UPDATE RMInTrolley
                    SET rm_status = 'รอแก้ไข'
                    WHERE rm_tro_id = @rm_tro_id;
                `);

                if (result.rowsAffected[0] === 0) {
                    // ไม่มี record ให้ update -> rollback
                    await transaction.rollback();
                    return res.status(404).json({ error: "No record found to update" });
                }

                await transaction.commit();
                res.status(200).json({ message: "Status updated successfully" });

            } catch (error) {
                console.error("Transaction error:", error);
                await transaction.rollback();
                res.status(500).json({ error: "Transaction failed", details: error.message });
            }

        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ error: "An error occurred while updating the data.", details: error.message });
        }
    });



    router.get("/coldstorage/room/fetchSlotRawMat", async (req, res) => {
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
                    FORMAT(rmg.cold, 'N2') AS cold,
                    rmt.rm_status,
                    rmt.dest,
                    rmt.weight_per_tro,
                    rmt.ntray,
                    qc.qc_datetime,
                    htr.come_cold_date,
                    htr.out_cold_date
                FROM
                    RMInTrolley rmt
                JOIN  
                    RMForProd rmf ON rmt.rmfp_id = rmf.rmfp_id  
                JOIN
                    ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
                JOIN
                    RawMat rm ON pr.mat = rm.mat
                JOIN
                    Production p ON pr.prod_id = p.prod_id
                JOIN
                    Line l ON p.line_id = l.line_id
                JOIN
                    RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
                JOIN
                    QC qc ON rmt.qc_id = qc.qc_id
                JOIN
                    History htr ON rmt.rm_tro_id = htr.rm_tro_id
                WHERE 
                    rmf.rm_group_id = rmg.rm_group_id;

          `);
            // rmt.dest = 'ห้องเย็น'
            // AND rmt.stay_place = 'เข้าห้องเย็น'
            // 11:01

            const formattedData = result.recordset.map(item => {
                // แปลงวันที่ cooked_date
                if (item.cooked_date) {
                    const cookedDate = new Date(item.cooked_date);
                    const cookedYear = cookedDate.getUTCFullYear();
                    const cookedMonth = String(cookedDate.getUTCMonth() + 1).padStart(2, '0');
                    const cookedDay = String(cookedDate.getUTCDate()).padStart(2, '0');
                    const cookedHours = String(cookedDate.getUTCHours()).padStart(2, '0');
                    const cookedMinutes = String(cookedDate.getUTCMinutes()).padStart(2, '0');

                    item.CookedDateTime = `${cookedYear}-${cookedMonth}-${cookedDay} ${cookedHours}:${cookedMinutes}`;
                    delete item.cooked_date;
                }
                if (item.come_cold_date) {
                    const cookedDate = new Date(item.come_cold_date);
                    const cookedYear = cookedDate.getUTCFullYear();
                    const cookedMonth = String(cookedDate.getUTCMonth() + 1).padStart(2, '0');
                    const cookedDay = String(cookedDate.getUTCDate()).padStart(2, '0');
                    const cookedHours = String(cookedDate.getUTCHours()).padStart(2, '0');
                    const cookedMinutes = String(cookedDate.getUTCMinutes()).padStart(2, '0');

                    item.ComeColdDateTime = `${cookedYear}-${cookedMonth}-${cookedDay} ${cookedHours}:${cookedMinutes}`;
                    delete item.come_cold_date;
                }
                return item;
            });


            res.json({ success: true, data: formattedData });
        } catch (err) {
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

  router.get("/coldstorage/incold/fetchSlotRawMat", async (req, res) => {
    try {
        const pool = await connectToDatabase();

        const query = `
SELECT
    rmm.mapping_id,
    rmf.rmfp_id,

    COALESCE(b.batch_after, rmf.batch) AS batch,

    rm.mat,
    rm.mat_name,

    CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,

    CAST(rmm.prep_to_cold_time AS DECIMAL(10,2)) AS ptc_time,
    CAST(COALESCE(rmm.cold_time, rmg.cold) AS DECIMAL(10,2)) AS cold,
    CAST(rmm.rework_time AS DECIMAL(10,2)) AS rework_time,
    CAST(rmm.mix_time AS DECIMAL(10,2)) AS mix_time,

    CAST(rmg.cold AS DECIMAL(10,2)) AS standard_cold,
    CAST(rmg.rework AS DECIMAL(10,2)) AS standard_rework,

    rmf.rm_group_id AS rmf_rm_group_id,
    rmg.rm_group_id AS rmg_rm_group_id,

    rmm.tro_id,
    rmm.rm_cold_status,
    rmm.rm_status,
    rmm.dest,

    rmm.weight_RM,
    rmm.tray_count,
    rmm.level_eu,

    htr.hist_id,

    cs.cs_name,
    s.slot_id,

    htr.qccheck_cold,
    htr.remark_rework_cold,

    CONVERT(varchar, htr.withdraw_date, 120) AS withdraw_date,
    CONVERT(varchar, htr.cooked_date, 120) AS cooked_date,
    CONVERT(varchar, htr.rmit_date, 120) AS rmit_date,
    CONVERT(varchar, htr.come_cold_date, 120) AS come_cold_date,
    CONVERT(varchar, htr.come_cold_date_two, 120) AS come_cold_date_two,
    CONVERT(varchar, htr.come_cold_date_three, 120) AS come_cold_date_three,
    CONVERT(varchar, htr.out_cold_date, 120) AS out_cold_date,
    CONVERT(varchar, htr.out_cold_date_two, 120) AS out_cold_date_two,
    CONVERT(varchar, htr.out_cold_date_three, 120) AS out_cold_date_three,
    CONVERT(varchar, htr.rework_date, 120) AS rework_date

FROM TrolleyRMMapping rmm

JOIN RMForProd rmf
    ON rmm.rmfp_id = rmf.rmfp_id

JOIN ProdRawMat pr
    ON rmm.tro_production_id = pr.prod_rm_id

JOIN RawMat rm
    ON pr.mat = rm.mat

JOIN Production p
    ON pr.prod_id = p.prod_id

JOIN RawMatGroup rmg
    ON rmf.rm_group_id = rmg.rm_group_id

JOIN Slot s
    ON rmm.tro_id = s.tro_id

JOIN ColdStorage cs
    ON s.cs_id = cs.cs_id


OUTER APPLY (
    SELECT STRING_AGG(batch_after, ', ') AS batch_after
    FROM Batch
    WHERE mapping_id = rmm.mapping_id
) b


OUTER APPLY (
    SELECT TOP 1 *
    FROM History h
    WHERE h.mapping_id = rmm.mapping_id
    ORDER BY h.hist_id DESC
) htr


WHERE
    rmm.dest = 'ห้องเย็น'
    AND rmm.stay_place = 'เข้าห้องเย็น'
    AND rmm.tro_id IS NOT NULL

ORDER BY rmm.mapping_id DESC
`;

        const result = await pool.request().query(query);

        res.json(result.recordset);

    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


    router.get("/coldstorage/incold/mix/fetchSlotRawMat", async (req, res) => {
        try {
            const pool = await connectToDatabase();
            const result = await pool
                .request()
                .query(`
                    SELECT
                        rmm.mapping_id,
                        rmm.mix_code,
                        CONCAT(p.doc_no, ' (', rmm.rmm_line_name, ')') AS production,
                        FORMAT(rmm.mix_time, 'N2') AS mix_time,
                        rmm.tro_id,
                        rmm.rm_cold_status,
                        rmm.rm_status,
                        rmm.dest,
                        rmm.weight_RM,
                        rmm.tray_count,
                        cs.cs_name,  -- เพิ่ม cs_name จากตาราง ColdStorage
                        s.slot_id,
                        CONVERT(VARCHAR, htr.mixed_date, 120) AS mixed_date,
                        CONVERT(VARCHAR, htr.come_cold_date, 120) AS come_cold_date,
                        CONVERT(VARCHAR, htr.come_cold_date_two, 120) AS come_cold_date_two,
                        CONVERT(VARCHAR, htr.come_cold_date_three, 120) AS come_cold_date_three,
                        CONVERT(VARCHAR, htr.out_cold_date, 120) AS out_cold_date,
                        CONVERT(VARCHAR, htr.out_cold_date_two, 120) AS out_cold_date_two,
                        CONVERT(VARCHAR, htr.out_cold_date_three, 120) AS out_cold_date_three
                       
                    FROM
                        TrolleyRMMapping rmm
                    JOIN 
                        Production p ON rmm.prod_mix = p.prod_id
                    JOIN 
                        History htr ON rmm.mapping_id = htr.mapping_id
                    JOIN
                        Slot s ON rmm.tro_id = s.tro_id  -- เพิ่ม JOIN กับตาราง Slot
                    JOIN
                        ColdStorage cs ON s.cs_id = cs.cs_id  -- เพิ่ม JOIN กับตาราง ColdStorage
                    WHERE
                        rmm.dest = 'ห้องเย็น'
                        AND rmm.stay_place = 'เข้าห้องเย็น'
                        AND rmm.mapping_id = htr.mapping_id
                        AND rmm.tro_id IS NOT NULL
                `);

            // แก้ไขรูปแบบวันที่ให้เป็นแบบเดียวกันทั้งหมด (แทนที่ T ด้วยช่องว่าง)
            const formattedData = result.recordset.map(record => {
                // สร้าง object ใหม่เพื่อไม่ให้แก้ไข record เดิม
                const newRecord = { ...record };

                // แปลงฟิลด์วันที่ทั้งหมด
                const dateFields = [
                    'withdraw_date', 'cooked_date', 'rmit_date',
                    'come_cold_date', 'come_cold_date_two', 'come_cold_date_three',
                    'out_cold_date', 'out_cold_date_two', 'out_cold_date_three', 'rework_date'
                ];

                // แทนที่ T ด้วยช่องว่างในทุกฟิลด์วันที่
                dateFields.forEach(field => {
                    if (newRecord[field]) {
                        newRecord[field] = newRecord[field].replace('T', ' ');
                    }
                });

                return newRecord;
            });

            return res.json(Object.values(formattedData));
        } catch (error) {
            console.error("Error fetching data:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.put("/qc/cold/check", async (req, res) => {
        let transaction;
        try {
            const {
                mapping_id,
                color,
                odor,
                texture,
                inspector_cold,
                remark,
                approver // เพิ่มรับ approver จาก request
            } = req.body;

            if (
                !mapping_id ||
                isNaN(mapping_id) ||
                color === undefined ||
                odor === undefined ||
                texture === undefined
            ) {
                return res.status(400).json({
                    success: false,
                    message: "กรุณากรอกข้อมูลให้ครบถ้วน",
                });
            }

            const pool = await connectToDatabase();

            // ตรวจสอบ mapping_id
            const mappingCheck = await pool
                .request()
                .input("mapping_id", sql.Int, mapping_id)
                .query(`
                SELECT mapping_id, qc_id, rm_status
                FROM [PFCMv2].[dbo].[TrolleyRMMapping]
                WHERE mapping_id = @mapping_id
            `);

            if (mappingCheck.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `ไม่พบ mapping_id ${mapping_id} ในระบบ`,
                });
            }

            // ตรวจสอบว่าวัตถุดิบนี้ตรวจสอบแล้วหรือไม่
            if (mappingCheck.recordset[0].rm_status === 'QcCheck') {
                return res.status(400).json({
                    success: false,
                    message: "วัตถุดิบนี้ตรวจสอบแล้ว ไม่สามารถตรวจสอบซ้ำได้",
                });
            }

            // กำหนดค่า default
            let rm_status = "QcCheck";
            let qccheck = "ผ่าน";

            if ([color, odor, texture].includes(0)) {
                rm_status = "รอแก้ไข";
                qccheck = "ไม่ผ่าน";

                // ตรวจสอบว่ามี remark หรือไม่เมื่อไม่ผ่าน
                if (!remark || remark.trim() === "") {
                    return res.status(400).json({
                        success: false,
                        message: "กรุณากรอกหมายเหตุเมื่อมีข้อที่ไม่ผ่าน",
                    });
                }
            }

            // เริ่ม transaction
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            await transaction
                .request()
                .input("mapping_id", sql.Int, mappingCheck.recordset[0].mapping_id)
                .input("rm_status", sql.NVarChar, rm_status)
                .query(`UPDATE TrolleyRMMapping
                    SET rm_status = @rm_status,
                        updated_at = GETDATE()
                    WHERE mapping_id = @mapping_id
                `)

            await transaction
                .request()
                .input("mapping_id", sql.Int, mappingCheck.recordset[0].mapping_id)
                .input("inspector_cold", sql.NVarChar, inspector_cold)
                .input("qccheck_cold", sql.NVarChar, qccheck)
                .input("remark", sql.NVarChar, remark || null)
                .input("approver", sql.NVarChar, approver || null) // เพิ่ม approver
                .query(`
                UPDATE History
                SET 
                    qccheck_cold = @qccheck_cold,
                    remark_rework_cold = @remark,
                    receiver_qc_cold = @inspector_cold,
                    approver = @approver
                WHERE mapping_id = @mapping_id
            `);

            // ✅ Commit
            await transaction.commit();

            // ✅ Emit ผ่าน Socket.IO
            const io = req.app.get("io");
            const formattedData = {
                mappingId: mapping_id,
                qcId: mappingCheck.recordset[0].qc_id,
                rmStatus: rm_status,
                qccheck,
                updatedAt: new Date(),
                remark,
                approver // ส่ง approver ไปด้วย
            };
            io.to("QcCheckRoom").emit("dataUpdated", formattedData);

            // ✅ Response
            res.json({
                success: true,
                message: "บันทึกข้อมูลสำเร็จ",
                data: formattedData
            });

        } catch (err) {
            console.error("SQL Error:", err);
            if (transaction) {
                await transaction.rollback();
            }
            res.status(500).json({
                success: false,
                message: "เกิดข้อผิดพลาดในระบบ",
                error: err.message,
                stack: err.stack,
            });
        }
    });


    //     router.put("/cold/checkin/update/Trolley", async (req, res) => {
    //     const { tro_id, cs_id, slot_id, selectedOption } = req.body;
    //     let transaction;

    //     try {
    //         // เชื่อมต่อฐานข้อมูล
    //         const pool = await connectToDatabase();

    //         // เริ่ม transaction เพื่อให้มั่นใจว่าการ update ข้อมูลทั้งหมดจะสำเร็จพร้อมกัน
    //         transaction = new sql.Transaction(pool);
    //         await transaction.begin();

    //         // =======================
    //         // 1. ตรวจสอบว่ารถเข็นมีอยู่ในระบบหรือไม่
    //         // =======================
    //         const trolleyResult = await transaction.request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id");

    //         if (trolleyResult.recordset.length === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ไม่พบรถเข็นในระบบ" });
    //         }

    //         // =======================
    //         // 2. ตรวจสอบว่ารถเข็นอยู่ในห้องเย็นอยู่แล้วหรือไม่
    //         // =======================
    //         const trolleyInColdResult = await transaction.request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT cs_id, slot_id FROM Slot WHERE tro_id = @tro_id");

    //         if (trolleyInColdResult.recordset.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `รถเข็นนี้อยู่ในห้องเย็นอยู่แล้ว (ช่อง ${trolleyInColdResult.recordset[0].slot_id})`
    //             });
    //         }

    //         // =======================
    //         // 3. ตรวจสอบว่าช่องเก็บว่างหรือไม่
    //         // =======================
    //         const slotResult = await transaction.request()
    //             .input("cs_id", sql.Int, cs_id)
    //             .input("slot_id", sql.VarChar, slot_id)
    //             .query("SELECT tro_id FROM Slot WHERE cs_id = @cs_id AND slot_id = @slot_id");

    //         if (slotResult.recordset.length === 0 || (slotResult.recordset[0].tro_id !== null && slotResult.recordset[0].tro_id !== 'rsrv')) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ช่องเก็บนี้ไม่ว่าง" });
    //         }

    //         const tro_status = trolleyResult.recordset[0].tro_status;
    //         const rsrv_timestamp = trolleyResult.recordset[0].rsrv_timestamp;

    //         console.log("tro_status", tro_status);
    //         console.log("rsrv_timestamp", rsrv_timestamp);

    //         // =======================
    // // 4. กรณีรถเข็นว่าง
    // // =======================
    // if (selectedOption === "รถเข็นว่าง") {
    //     if (tro_status === false || tro_status === 0 || tro_status === 1 || rsrv_timestamp === null) {
    //         await transaction.rollback();
    //         return res.status(400).json({ 
    //             success: false, 
    //             message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที" 
    //         });
    //     }

    //     // 🔎 เพิ่มเงื่อนไขตรวจสอบใน TrolleyRMMapping
    //     const mappingCheck = await transaction.request()
    //         .input("tro_id", sql.VarChar(4), tro_id)
    //         .query("SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");

    //     if (mappingCheck.recordset.length > 0) {
    //         await transaction.rollback();
    //         return res.status(400).json({
    //             success: false,
    //             message: "รถเข็นกำลังใช้งาน"
    //         });
    //     }

    //     // อัปเดต Slot ให้ tro_id ถูก assign
    //     await transaction.request()
    //         .input("tro_id", sql.VarChar(4), tro_id)
    //         .input("cs_id", sql.Int, cs_id)
    //         .input("slot_id", sql.VarChar, slot_id)
    //         .query("UPDATE Slot SET tro_id = @tro_id ,status ='2795' , reserved_at = NULL  WHERE cs_id = @cs_id AND slot_id = @slot_id");

    //     // อัปเดต Trolley เป็นใช้แล้ว
    //     await transaction.request()
    //         .input("tro_id", sql.VarChar(4), tro_id)
    //         .query("UPDATE Trolley SET tro_status = 0, rsrv_timestamp = null WHERE tro_id = @tro_id");

    //     // commit transaction
    //     await transaction.commit();
    //     return res.status(200).json({ success: true, message: "รับเข้ารถเข็นว่าง" });
    // }


    //         // =======================
    //         // 5. กรณีอื่นๆ ตรวจสอบวัตถุดิบในรถเข็น
    //         // =======================
    //         const rmResults = await transaction.request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query(`SELECT dest, rmm_line_name, rm_status, cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id
    //                     FROM TrolleyRMMapping WHERE tro_id = @tro_id`);

    //         if (rmResults.recordset.length === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ไม่พบวัตถุดิบในรถเข็นนี้" });
    //         }

    //         // ตรวจสอบว่าทุกวัตถุดิบมี dest เป็น "เข้าห้องเย็น"
    //         const invalidDestItems = rmResults.recordset.filter(item => item.dest !== "เข้าห้องเย็น");
    //         if (invalidDestItems.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: "มีวัตถุดิบในรถเข็นที่ไม่ได้เตรียมเข้าห้องเย็น"
    //             });
    //         }

    //         // ตรวจสอบสถานะตาม selectedOption
    //         const statusMap = {
    //             "วัตถุดิบรอแก้ไข": ["รอแก้ไข"],
    //             "วัตถุดิบรับฝาก": ["QcCheck รอกลับมาเตรียม", "QcCheck รอ MD", "รอ Qc", "รอกลับมาเตรียม"],
    //             "วัตถุดิบตรง": ["QcCheck"],
    //             "เหลือจากไลน์ผลิต": ["เหลือจากไลน์ผลิต"],
    //         };

    //         if (!(selectedOption in statusMap)) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ตัวเลือกไม่ถูกต้อง" });
    //         }

    //         const validStatuses = statusMap[selectedOption];
    //         const invalidStatusItems = rmResults.recordset.filter(item => !validStatuses.includes(item.rm_status));
    //         if (invalidStatusItems.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `ไม่ตรงเงื่อนไขรับเข้า ${selectedOption} มีวัตถุดิบที่มีสถานะไม่ตรงกับเงื่อนไข`
    //             });
    //         }

    //         // =======================
    //         // 6. วน update แต่ละรายการ พร้อมคำนวณเวลา cold, prep_to_cold, rework, mix
    //         // =======================
    //         for (const item of rmResults.recordset) {
    //             const { cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id } = item;

    //             let coldTimeValue = cold_time;
    //             let pic_time = prep_to_cold_time;
    //             let ReworkTime = rework_time;
    //             let MixTime = mix_time;

    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, cold_time ตอนรับ:`, cold_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold_time ตอนรับ:`, prep_to_cold_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time ตอนรับ:`, rework_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time ตอนรับ:`, mix_time);

    //             // กรณี cold_time เป็น null
    //             if (coldTimeValue === null) {
    //                 const rmgResult = await transaction.request()
    //                     .input("rmfp_id", sql.Int, rmfp_id)
    //                     .query(`SELECT rmg.cold FROM RMForProd rmf JOIN RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id WHERE rmf.rmfp_id = @rmfp_id`);
    //                 if (rmgResult.recordset.length > 0) coldTimeValue = rmgResult.recordset[0].cold;
    //             }

    //             // ======= คำนวณเวลาที่เหลือ mix_time =======
    //             // ======= คำนวณเวลาที่เหลือ rework_time =======
    //             // ======= คำนวณเวลาที่เหลือ prep_to_cold_time =======
    //             // ... (โค้ดคำนวณเวลาครบเหมือนต้นฉบับ) ...

    //             // =======================
    //             // อัปเดต TrolleyRMMapping
    //             // =======================
    //             await transaction.request()
    //                 .input("rmfp_id", sql.Int, rmfp_id)
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .input("selectedOption", sql.VarChar, selectedOption)
    //                 .input("stay_place", sql.VarChar, "เข้าห้องเย็น")
    //                 .input("dest", sql.VarChar, "ห้องเย็น")
    //                 .input("cold_time", sql.Float, coldTimeValue)
    //                 .input("prep_to_cold_time", sql.Float, pic_time)
    //                 .input("rework_time", sql.Float, ReworkTime)
    //                 .input("mix_time", sql.Float, MixTime)
    //                 .query(`
    //                     UPDATE TrolleyRMMapping 
    //                     SET 
    //                         rm_cold_status = @selectedOption, 
    //                         stay_place = @stay_place,
    //                         dest = @dest,
    //                         cold_time = @cold_time,
    //                         prep_to_cold_time = @prep_to_cold_time,
    //                         rework_time = @rework_time,
    //                         mix_time = @mix_time
    //                     WHERE 
    //                         tro_id = @tro_id AND rmfp_id = @rmfp_id
    //                 `);
    //         }

    //         // =======================
    //         // 7. อัปเดต Slot และ History
    //         // =======================
    //         await transaction.request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .input("cs_id", sql.Int, cs_id)
    //             .input("slot_id", sql.VarChar, slot_id)
    //             .query("UPDATE Slot SET tro_id = @tro_id ,status = '/cold/checkin/update/7' WHERE cs_id = @cs_id AND slot_id = @slot_id");

    //         const mappingResults = await transaction.request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");

    //         for (const row of mappingResults.recordset) {
    //             const mapping_id = row.mapping_id;
    //             await transaction.request()
    //                 .input("mapping_id", sql.Int, mapping_id)
    //                 .query(`
    //                     UPDATE History 
    //                     SET 
    //                       come_cold_date = CASE WHEN come_cold_date IS NULL THEN GETDATE() ELSE come_cold_date END,
    //                       come_cold_date_two = CASE WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NULL THEN GETDATE() ELSE come_cold_date_two END,
    //                       come_cold_date_three = CASE WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NOT NULL AND come_cold_date_three IS NULL THEN GETDATE() ELSE come_cold_date_three END
    //                     WHERE mapping_id = @mapping_id
    //                 `);
    //         }

    //         // commit transaction หลังจาก update ครบทุกขั้นตอน
    //         await transaction.commit();
    //         return res.status(200).json({ success: true, message: `รับเข้า ${selectedOption}` });

    //     } catch (err) {
    //         console.error("SQL error", err);
    //         // rollback ทุกการเปลี่ยนแปลงหากเกิด error
    //         if (transaction) await transaction.rollback();
    //         res.status(500).json({ success: false, error: err.message });
    //     }
    // });


    //  router.put("/cold/checkin/update/Trolley", async (req, res) => {
    //         const { tro_id, cs_id, slot_id, selectedOption } = req.body;
    //         let transaction;

    //         try {
    //             // เชื่อมต่อฐานข้อมูล
    //             const pool = await connectToDatabase();

    //             // เริ่ม transaction เพื่อให้มั่นใจว่าการ update ข้อมูลทั้งหมดจะสำเร็จพร้อมกัน
    //             transaction = new sql.Transaction(pool);
    //             await transaction.begin();

    //             // =======================
    //             // 1. ตรวจสอบว่ารถเข็นมีอยู่ในระบบหรือไม่
    //             // =======================
    //             const trolleyResult = await transaction.request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id");

    //             if (trolleyResult.recordset.length === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ไม่พบรถเข็นในระบบ" });
    //             }

    //             // =======================
    //             // 2. ตรวจสอบว่ารถเข็นอยู่ในห้องเย็นอยู่แล้วหรือไม่
    //             // =======================
    //             const trolleyInColdResult = await transaction.request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("SELECT cs_id, slot_id FROM Slot WHERE tro_id = @tro_id");

    //             if (trolleyInColdResult.recordset.length > 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `รถเข็นนี้อยู่ในห้องเย็นอยู่แล้ว (ช่อง ${trolleyInColdResult.recordset[0].slot_id})`
    //                 });
    //             }

    //             // =======================
    //             // 3. ตรวจสอบว่าช่องเก็บว่างหรือไม่
    //             // =======================
    //             const slotResult = await transaction.request()
    //                 .input("cs_id", sql.Int, cs_id)
    //                 .input("slot_id", sql.VarChar, slot_id)
    //                 .query("SELECT tro_id FROM Slot WHERE cs_id = @cs_id AND slot_id = @slot_id");

    //             if (slotResult.recordset.length === 0 || (slotResult.recordset[0].tro_id !== null && slotResult.recordset[0].tro_id !== 'rsrv')) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ช่องเก็บนี้ไม่ว่าง" });
    //             }

    //             const tro_status = trolleyResult.recordset[0].tro_status;
    //             const rsrv_timestamp = trolleyResult.recordset[0].rsrv_timestamp;

    //             console.log("tro_status", tro_status);
    //             console.log("rsrv_timestamp", rsrv_timestamp);

    //             // =======================
    //             // 4. กรณีรถเข็นว่าง
    //             // =======================
    //         if (selectedOption === "รถเข็นว่าง") {
    //     if (tro_status === 1 ) {
    //         await transaction.rollback();
    //         return res.status(400).json({
    //             success: false,
    //             message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
    //         });
    //     }

    //     // ===============================
    //     // ตรวจสอบ TrolleyRMMapping
    //     // ===============================
    //     const rmCheck = await transaction.request()
    //         .input("tro_id", sql.VarChar(4), tro_id)
    //         .query("SELECT rmfp_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");

    //     if (rmCheck.recordset.length > 0) {
    //         await transaction.rollback();
    //         return res.status(400).json({
    //             success: false,
    //             message: "มีวัตถุดิบในรถเข็น ไม่สามารถอัปเดตรถเข็นว่างได้"
    //         });
    //     }

    //     // อัปเดต Slot ให้ tro_id ถูก assign
    //     await transaction.request()
    //         .input("tro_id", sql.VarChar(4), tro_id)
    //         .input("cs_id", sql.Int, cs_id)
    //         .input("slot_id", sql.VarChar, slot_id)
    //         .query("UPDATE Slot SET tro_id = @tro_id, status = '/cold/checkin/update/7', reserved_at = NULL WHERE cs_id = @cs_id AND slot_id = @slot_id");

    //     // อัปเดต Trolley เป็นใช้แล้ว
    //     await transaction.request()
    //         .input("tro_id", sql.VarChar(4), tro_id)
    //         .query("UPDATE Trolley SET tro_status = 0, rsrv_timestamp = null WHERE tro_id = @tro_id");

    //     // commit transaction
    //     await transaction.commit();
    //     return res.status(200).json({ success: true, message: "รับเข้ารถเข็นว่าง" });
    // }


    //             // =======================
    //             // 5. กรณีอื่นๆ ตรวจสอบวัตถุดิบในรถเข็น
    //             // =======================
    //             const rmResults = await transaction.request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query(`SELECT dest, rmm_line_name, rm_status, cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id
    //                     FROM TrolleyRMMapping WHERE tro_id = @tro_id`);

    //             if (rmResults.recordset.length === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ไม่พบวัตถุดิบในรถเข็นนี้" });
    //             }

    //             // ตรวจสอบว่าทุกวัตถุดิบมี dest เป็น "เข้าห้องเย็น"
    //             const invalidDestItems = rmResults.recordset.filter(item => item.dest !== "เข้าห้องเย็น");
    //             if (invalidDestItems.length > 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: "มีวัตถุดิบในรถเข็นที่ไม่ได้เตรียมเข้าห้องเย็น"
    //                 });
    //             }

    //             // ตรวจสอบสถานะตาม selectedOption
    //             const statusMap = {
    //                 "วัตถุดิบรอแก้ไข": ["รอแก้ไข"],
    //                 "วัตถุดิบรับฝาก": ["QcCheck รอกลับมาเตรียม", "QcCheck รอ MD", "รอ Qc", "รอกลับมาเตรียม"],
    //                 "วัตถุดิบตรง": ["QcCheck"],
    //                 "เหลือจากไลน์ผลิต": ["เหลือจากไลน์ผลิต"],
    //             };

    //             if (!(selectedOption in statusMap)) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ตัวเลือกไม่ถูกต้อง" });
    //             }

    //             const validStatuses = statusMap[selectedOption];
    //             const invalidStatusItems = rmResults.recordset.filter(item => !validStatuses.includes(item.rm_status));
    //             if (invalidStatusItems.length > 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `ไม่ตรงเงื่อนไขรับเข้า ${selectedOption} มีวัตถุดิบที่มีสถานะไม่ตรงกับเงื่อนไข`
    //                 });
    //             }

    //             // =======================
    //             // 6. วน update แต่ละรายการ พร้อมคำนวณเวลา cold, prep_to_cold, rework, mix
    //             // =======================
    //             for (const item of rmResults.recordset) {
    //                 const { cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id } = item;

    //                 let coldTimeValue = cold_time; // ใช้ค่าเดิมเป็นค่าเริ่มต้น
    //                 let pic_time = prep_to_cold_time; // เก็บค่า prep_to_cold_time เดิมไว้
    //                 let ReworkTime = rework_time; // เก็บค่า rework_time เดิมไว้
    //                 let MixTime = mix_time;

    //                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, cold_time ตอนรับ:`, cold_time);
    //                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ptc_time ตอนรับ:`, prep_to_cold_time);
    //                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time ตอนรับ:`, rework_time);
    //                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time ตอนรับ:`, mix_time);

    //                 // เฉพาะกรณีที่ cold_time เป็น null ให้ดึงค่าจาก RawMatGroup
    //                 if (cold_time === null) {
    //                     const rmgResult = await pool
    //                         .request()
    //                         .input("rmfp_id", sql.Int, rmfp_id)
    //                         .query(`
    //                     SELECT rmg.cold
    //                     FROM RMForProd rmf
    //                     JOIN
    //                         RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //                     WHERE
    //                         rmf.rmfp_id = @rmfp_id
    //                 `);

    //                     if (rmgResult.recordset.length > 0) {
    //                         coldTimeValue = rmgResult.recordset[0].cold;
    //                     }
    //                 }

    //                 if (mix_time !== null) {
    //                     // กรณีมีค่า mix_time ให้คำนวณเวลาที่เหลือโดยใช้ mixed_date
    //                     const mixQuery = await pool
    //                         .request()
    //                         .input("mapping_id", sql.Int, mapping_id)
    //                         .query(`
    //                         SELECT FORMAT(mixed_date, 'yyyy-MM-dd HH:mm:ss') AS mixed_date
    //                         FROM History
    //                         WHERE mapping_id = @mapping_id AND mixed_date IS NOT NULL
    //                     `);

    //                     if (mixQuery.recordset.length > 0 && mixQuery.recordset[0].mixed_date) {
    //                         const mixedDate = new Date(mixQuery.recordset[0].mixed_date);
    //                         const currentDate = new Date();

    //                         // คำนวณเวลาที่ผ่านไปแล้วเป็นนาที
    //                         const timeDiffMinutes = (currentDate - mixedDate) / (1000 * 60);

    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก mixed_date`);

    //                         // กรณีพิเศษ: ถ้า mix_time เป็น 0.00
    //                         if (mix_time === 0.00) {
    //                             // ค่า 0 - เวลาที่ผ่านไป จะได้ค่าลบเสมอ
    //                             const totalMinutesRemaining = -timeDiffMinutes;

    //                             // แปลงเป็นรูปแบบ ชั่วโมง.นาที
    //                             const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                             const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);

    //                             // ใส่เครื่องหมายลบ เพราะเป็นเวลาที่เกินมาแล้ว
    //                             MixTime = -1 * (updatedHours + (updatedMinutes / 100));

    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี mix_time เป็น 0.00`);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, MixTime);
    //                         } else {
    //                             // กรณีค่าเป็นลบหรือบวกอื่นๆ
    //                             const isNegative = mix_time < 0;
    //                             const absValue = Math.abs(mix_time);
    //                             const hours = Math.floor(absValue);
    //                             const minutes = Math.round((absValue - hours) * 100);

    //                             // แปลงเป็นนาทีทั้งหมด คำนวณตามเครื่องหมาย
    //                             let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);

    //                             // ลบเวลาที่ผ่านไป
    //                             const totalMinutesRemaining = totalMinutes - timeDiffMinutes;

    //                             // แปลงกลับเป็นรูปแบบ ชั่วโมง.นาที
    //                             const isResultNegative = totalMinutesRemaining < 0;
    //                             const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                             const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                             const updatedMinutes = Math.floor(absMinutesRemaining % 60);

    //                             // รูปแบบ hours.minutes โดยแปลง minutes เป็นทศนิยม และคงเครื่องหมาย
    //                             MixTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));

    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time เดิม:`, mix_time);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, MixTime);
    //                         }

    //                         // ทำให้เป็นทศนิยม 2 ตำแหน่ง
    //                         MixTime = parseFloat(MixTime.toFixed(2));
    //                     }
    //                 }

    //                 // ตรวจสอบ rework_time และคำนวณเวลาที่เหลือ
    //                 if (rework_time !== null) {
    //                     // กรณีมีค่า rework_time ให้คำนวณเวลาที่เหลือโดยใช้ rework_date
    //                     const reworkQuery = await pool
    //                         .request()
    //                         .input("mapping_id", sql.Int, mapping_id)
    //                         .query(`
    //                         SELECT FORMAT(qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date
    //                         FROM History
    //                         WHERE mapping_id = @mapping_id AND qc_date IS NOT NULL
    //                     `);

    //                     if (reworkQuery.recordset.length > 0 && reworkQuery.recordset[0].qc_date) {
    //                         const qcDate = new Date(reworkQuery.recordset[0].qc_date);
    //                         const currentDate = new Date();

    //                         // คำนวณเวลาที่ผ่านไปแล้วเป็นนาที
    //                         const timeDiffMinutes = (currentDate - qcDate) / (1000 * 60);

    //                         console.log(`RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก qc_date`);

    //                         // กรณีพิเศษ: ถ้า rework_time เป็น 0.00
    //                         if (rework_time === 0.00) {
    //                             // ค่า 0 - เวลาที่ผ่านไป จะได้ค่าลบเสมอ
    //                             const totalMinutesRemaining = -timeDiffMinutes;

    //                             // แปลงเป็นรูปแบบ ชั่วโมง.นาที
    //                             const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                             const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);

    //                             // ใส่เครื่องหมายลบ เพราะเป็นเวลาที่เกินมาแล้ว
    //                             ReworkTime = -1 * (updatedHours + (updatedMinutes / 100));

    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี rework_time เป็น 0.00`);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, ReworkTime);
    //                         } else {
    //                             // กรณีค่าเป็นลบหรือบวกอื่นๆ
    //                             const isNegative = rework_time < 0;
    //                             const absValue = Math.abs(rework_time);
    //                             const hours = Math.floor(absValue);
    //                             const minutes = Math.round((absValue - hours) * 100);

    //                             // แปลงเป็นนาทีทั้งหมด คำนวณตามเครื่องหมาย
    //                             let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);

    //                             // ลบเวลาที่ผ่านไป
    //                             const totalMinutesRemaining = totalMinutes - timeDiffMinutes;

    //                             // แปลงกลับเป็นรูปแบบ ชั่วโมง.นาที
    //                             const isResultNegative = totalMinutesRemaining < 0;
    //                             const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                             const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                             const updatedMinutes = Math.floor(absMinutesRemaining % 60);

    //                             // รูปแบบ hours.minutes โดยแปลง minutes เป็นทศนิยม และคงเครื่องหมาย
    //                             ReworkTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));

    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time เดิม:`, rework_time);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, ReworkTime);
    //                         }

    //                         // ทำให้เป็นทศนิยม 2 ตำแหน่ง
    //                         ReworkTime = parseFloat(ReworkTime.toFixed(2));
    //                     }
    //                 } else {
    //                     // กรณี rework_time เป็น null ให้คำนวณ prep_to_cold_time ตามเดิม
    //                     // การคำนวณเวลา prep_to_cold_time
    //                     // การคำนวณเวลา prep_to_cold_time
    //                     if (prep_to_cold_time === null) {
    //                         const ptcResult = await pool
    //                             .request()
    //                             .input("rmfp_id", sql.Int, rmfp_id)
    //                             .input("tro_id", sql.VarChar(4), tro_id)
    //                             .query(`
    //         SELECT
    //             rmg.prep_to_cold,
    //             FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //             FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date
    //         FROM
    //             TrolleyRMMapping rmm
    //         JOIN  
    //             RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
    //         JOIN
    //             RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //         JOIN
    //             History htr ON rmm.mapping_id = htr.mapping_id
    //         WHERE
    //             rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    //     `);

    //                         if (ptcResult.recordset.length > 0) {
    //                             const prepToCold = ptcResult.recordset[0].prep_to_cold;
    //                             const currentDate = new Date();

    //                             // ใช้ rmit_date ถ้ามี ถ้าไม่มีให้ใช้ cooked_date
    //                             const referenceDate = ptcResult.recordset[0].rmit_date ?
    //                                 new Date(ptcResult.recordset[0].rmit_date) :
    //                                 new Date(ptcResult.recordset[0].cooked_date);
    //                             const referenceType = ptcResult.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';

    //                             // คำนวณเวลาที่ผ่านไปแล้วเป็นนาที
    //                             const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);

    //                             // คำนวณเวลาที่เหลืออยู่ในหน่วยชั่วโมง
    //                             let remainingTimeHours = prepToCold - (timeDiffMinutes / 60);

    //                             // แปลงให้อยู่ในรูปแบบ ชั่วโมง.นาที (0.01-0.60)
    //                             const hours = Math.floor(remainingTimeHours);
    //                             const minutes = Math.floor((remainingTimeHours - hours) * 60);

    //                             // รูปแบบ hours.minutes โดยแปลง minutes เป็นทศนิยม (เช่น 30 นาที = 0.30)
    //                             pic_time = hours + (minutes / 100);

    //                             // ทำให้เป็นทศนิยม 2 ตำแหน่ง
    //                             pic_time = parseFloat(pic_time.toFixed(2));

    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold จาก RawMatGroup:`, prepToCold);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                         }
    //                     } else {
    //                         const ptcQuery = await pool
    //                             .request()
    //                             .input("rmfp_id", sql.Int, rmfp_id)
    //                             .input("tro_id", sql.VarChar(4), tro_id)
    //                             .query(`
    //         SELECT
    //             FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //             FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
    //             FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
    //             FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
    //             FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three
    //         FROM
    //             TrolleyRMMapping rmm
    //         JOIN
    //             History htr ON rmm.mapping_id = htr.mapping_id
    //         WHERE
    //             rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    //     `);

    //                         if (ptcQuery.recordset.length > 0) {
    //                             // หาเวลาออกจากห้องเย็นล่าสุด (ถ้ามี)
    //                             const outColdDates = [
    //                                 ptcQuery.recordset[0].out_cold_date_three,
    //                                 ptcQuery.recordset[0].out_cold_date_two,
    //                                 ptcQuery.recordset[0].out_cold_date
    //                             ].filter(date => date);

    //                             let referenceDate;
    //                             let referenceType = '';

    //                             if (outColdDates.length > 0) {
    //                                 // ถ้ามีเวลาออกจากห้องเย็น ให้ใช้เวลาล่าสุด
    //                                 referenceDate = new Date(outColdDates[0]);
    //                                 referenceType = 'out_cold_date';
    //                             } else {
    //                                 // ถ้าไม่มี ให้ใช้ rmit_date ถ้ามี ถ้าไม่มีให้ใช้ cooked_date
    //                                 referenceDate = ptcQuery.recordset[0].rmit_date ?
    //                                     new Date(ptcQuery.recordset[0].rmit_date) :
    //                                     new Date(ptcQuery.recordset[0].cooked_date);
    //                                 referenceType = ptcQuery.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';
    //                             }

    //                             const currentDate = new Date();

    //                             // คำนวณเวลาที่ผ่านไปแล้วเป็นนาที
    //                             const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);

    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);

    //                             // กรณีพิเศษ: ถ้า prep_to_cold_time เป็น 0.00
    //                             if (prep_to_cold_time === 0.00) {
    //                                 // ค่า 0 - เวลาที่ผ่านไป จะได้ค่าลบเสมอ
    //                                 const totalMinutesRemaining = -timeDiffMinutes;

    //                                 // แปลงเป็นรูปแบบ ชั่วโมง.นาที
    //                                 const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                                 const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);

    //                                 // ใส่เครื่องหมายลบ เพราะเป็นเวลาที่เกินมาแล้ว
    //                                 pic_time = -1 * (updatedHours + (updatedMinutes / 100));

    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี prep_to_cold_time เป็น 0.00`);
    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, pic_time);
    //                             } else {
    //                                 // กรณีค่าเป็นลบหรือบวกอื่นๆ
    //                                 const isNegative = prep_to_cold_time < 0;
    //                                 const absValue = Math.abs(prep_to_cold_time);
    //                                 const hours = Math.floor(absValue);
    //                                 const minutes = Math.round((absValue - hours) * 100);

    //                                 // แปลงเป็นนาทีทั้งหมด คำนวณตามเครื่องหมาย
    //                                 let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);

    //                                 // ลบเวลาที่ผ่านไป
    //                                 const totalMinutesRemaining = totalMinutes - timeDiffMinutes;

    //                                 // แปลงกลับเป็นรูปแบบ ชั่วโมง.นาที
    //                                 const isResultNegative = totalMinutesRemaining < 0;
    //                                 const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                                 const updatedHours = Math.floor(absMinutesRemaining / 60); // ส่วนชั่วโมง
    //                                 const updatedMinutes = Math.round(absMinutesRemaining % 60); // ส่วนนาที

    //                                 // รูปแบบ hours.minutes โดยแปลง minutes เป็นทศนิยม และคงเครื่องหมาย
    //                                 pic_time = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));

    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold_time เดิม:`, prep_to_cold_time);
    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                             }

    //                             // ทำให้เป็นทศนิยม 2 ตำแหน่ง
    //                             pic_time = parseFloat(pic_time.toFixed(2));
    //                         }
    //                     }
    //                 }

    //                 console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, cold_time update:`, coldTimeValue);
    //                 console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, prep_to_cold_time:`, pic_time);
    //                 console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, rework_time update:`, ReworkTime);
    //                 io.to('saveRMForProdRoom').emit('dataUpdated', []);

    //                 // =======================
    //                 // อัปเดต TrolleyRMMapping
    //                 // =======================
    //                 await transaction.request()
    //                     .input("rmfp_id", sql.Int, rmfp_id)
    //                     .input("tro_id", sql.VarChar(4), tro_id)
    //                     .input("selectedOption", sql.VarChar, selectedOption)
    //                     .input("stay_place", sql.VarChar, "เข้าห้องเย็น")
    //                     .input("dest", sql.VarChar, "ห้องเย็น")
    //                     .input("cold_time", sql.Float, coldTimeValue)
    //                     .input("prep_to_cold_time", sql.Float, pic_time)
    //                     .input("rework_time", sql.Float, ReworkTime)
    //                     .input("mix_time", sql.Float, MixTime)
    //                     .query(`
    //                     UPDATE TrolleyRMMapping
    //                     SET
    //                         rm_cold_status = @selectedOption,
    //                         stay_place = @stay_place,
    //                         dest = @dest,
    //                         cold_time = @cold_time,
    //                         prep_to_cold_time = @prep_to_cold_time,
    //                         rework_time = @rework_time,
    //                         mix_time = @mix_time
    //                     WHERE
    //                         tro_id = @tro_id AND rmfp_id = @rmfp_id
    //                 `);
    //             }

    //             // =======================
    //             // 7. อัปเดต Slot และ History
    //             // =======================
    //             await transaction.request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .input("cs_id", sql.Int, cs_id)
    //                 .input("slot_id", sql.VarChar, slot_id)
    //                 .query("UPDATE Slot SET tro_id = @tro_id ,status = '3476' WHERE cs_id = @cs_id AND slot_id = @slot_id");

    //             const mappingResults = await transaction.request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");

    //             for (const row of mappingResults.recordset) {
    //                 const mapping_id = row.mapping_id;
    //                 await transaction.request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                     UPDATE History
    //                     SET
    //                       come_cold_date = CASE WHEN come_cold_date IS NULL THEN GETDATE() ELSE come_cold_date END,
    //                       come_cold_date_two = CASE WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NULL THEN GETDATE() ELSE come_cold_date_two END,
    //                       come_cold_date_three = CASE WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NOT NULL AND come_cold_date_three IS NULL THEN GETDATE() ELSE come_cold_date_three END
    //                     WHERE mapping_id = @mapping_id
    //                 `);
    //             }

    //             // commit transaction หลังจาก update ครบทุกขั้นตอน
    //             await transaction.commit();
    //             return res.status(200).json({ success: true, message: `รับเข้า ${selectedOption}` });

    //         } catch (err) {
    //             console.error("SQL error", err);
    //             // rollback ทุกการเปลี่ยนแปลงหากเกิด error
    //             if (transaction) await transaction.rollback();
    //             res.status(500).json({ success: false, error: err.message });
    //         }
    //     });

    // router.put("/cold/checkin/update/Trolley", async (req, res) => {
    //     const { tro_id, cs_id, slot_id, selectedOption } = req.body;


    //     const pool = await connectToDatabase();
    //     const transaction = pool.transaction();


    //     try {
    //         // เริ่ม Transaction
    //         await transaction.begin();


    //         // ตรวจสอบว่ารถเข็นมีอยู่ในระบบหรือไม่
    //         const trolleyResult = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id");


    //         if (trolleyResult.recordset.length === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "รถเข็นไม่พร้อมใช้งาน" });
    //         }


    //         // เพิ่มการตรวจสอบว่ารถเข็นอยู่ในห้องเย็นอยู่แล้วหรือไม่
    //         const trolleyInColdResult = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT cs_id, slot_id FROM Slot WHERE tro_id = @tro_id");


    //         if (trolleyInColdResult.recordset.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `รถเข็นนี้อยู่ในห้องเย็นอยู่แล้ว (ช่อง ${trolleyInColdResult.recordset[0].slot_id})`
    //             });
    //         }


    //         // ตรวจสอบว่าช่องเก็บว่างหรือไม่
    //         const slotResult = await transaction
    //             .request()
    //             .input("cs_id", sql.Int, cs_id)
    //             .input("slot_id", sql.VarChar, slot_id)
    //             .query("SELECT tro_id FROM Slot WHERE cs_id = @cs_id AND slot_id = @slot_id");


    //         if (slotResult.recordset.length === 0 || slotResult.recordset[0].tro_id !== null && slotResult.recordset[0].tro_id !== 'rsrv') {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ช่องเก็บนี้ไม่ว่าง" });
    //         }


    //         const tro_status = trolleyResult.recordset[0].tro_status;
    //         const rsrv_timestamp = trolleyResult.recordset[0].rsrv_timestamp;


    //         console.log("tro_status", tro_status);
    //         console.log("rsrv_timestamp", rsrv_timestamp);


    //         // กรณีรถเข็นว่าง
    //         if (selectedOption === "รถเข็นว่าง") {
    //             // ถ้า tro_status = 0 คือ รถเข็นถูกใช้ไปแล้ว ไม่สามารถใช้รถเข็นคันนี้ได้
    //             if (tro_status === false) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "รถเข็นคันนี้ถูกใช้งานแล้ว" });
    //             }


    //             // ตรวจสอบเงื่อนไขก่อนอัปเดต tro_status
    //             // ถ้า rsrv_timestamp = null ไม่สามารถอัปเดตได้
    //             if (rsrv_timestamp === null) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
    //                 });
    //             }


    //             // ถ้า tro_status = 1 หรือ 0 ไม่สามารถอัปเดตได้ (แต่ rsrv สามารถอัปเดตได้)
    //             if (tro_status === 1 || tro_status === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
    //                 });
    //             }


    //             // อัปเดตช่องเก็บ
    //             const slotUpdateResult = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .input("cs_id", sql.Int, cs_id)
    //                 .input("slot_id", sql.VarChar, slot_id)
    //                 .query("UPDATE Slot SET tro_id = @tro_id , reserved_at = NULL WHERE cs_id = @cs_id AND slot_id = @slot_id");


    //             if (slotUpdateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตช่องเก็บได้" });
    //             }


    //             // เพิ่มการอัพเดต tro_status เป็น 0 ในตาราง Trolley (รถเข็นถูกใช้งานแล้ว)
    //             const trolleyUpdateResult = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("UPDATE Trolley SET tro_status = 0, rsrv_timestamp = null WHERE tro_id = @tro_id");


    //             if (trolleyUpdateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตสถานะรถเข็นได้" });
    //             }


    //             // Commit transaction
    //             await transaction.commit();
    //             return res.status(200).json({ success: true, message: "รับเข้ารถเข็นว่าง" });
    //         }


    //         // สำหรับกรณีอื่นๆ (ไม่ใช่รถเข็นว่าง) ต้องตรวจสอบวัตถุดิบในรถเข็น
    //         // ตรวจสอบข้อมูลวัตถุดิบใน TrolleyRMMapping
    //         const rmResults = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT dest, rmm_line_name, rm_status, cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");


    //         if (rmResults.recordset.length === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ไม่พบวัตถุดิบในรถเข็นนี้" });
    //         }


    //         // ตรวจสอบว่าทุกวัตถุดิบมีปลายทางเป็น "เข้าห้องเย็น"
    //         const invalidDestItems = rmResults.recordset.filter(item => item.dest !== "เข้าห้องเย็น");
    //         if (invalidDestItems.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: "มีวัตถุดิบในรถเข็นที่ไม่ได้เตรียมเข้าห้องเย็น"
    //             });
    //         }


    //         // ตรวจสอบสถานะของวัตถุดิบตามเงื่อนไขที่เลือก
    //         const statusMap = {
    //             "วัตถุดิบรอแก้ไข": ["รอแก้ไข"],
    //             "วัตถุดิบรับฝาก": ["QcCheck รอกลับมาเตรียม", "QcCheck รอ MD", "รอ Qc", "รอกลับมาเตรียม"],
    //             "วัตถุดิบตรง": ["QcCheck"],
    //             "เหลือจากไลน์ผลิต": ["เหลือจากไลน์ผลิต"],
    //         };


    //         if (!(selectedOption in statusMap)) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ตัวเลือกไม่ถูกต้อง" });
    //         }


    //         const validStatuses = statusMap[selectedOption];
    //         const invalidStatusItems = rmResults.recordset.filter(item =>
    //             !validStatuses.includes(item.rm_status)
    //         );


    //         if (invalidStatusItems.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `ไม่ตรงเงื่อนไขรับเข้า ${selectedOption} มีวัตถุดิบที่มีสถานะไม่ตรงกับเงื่อนไข`
    //             });
    //         }


    //         // นับจำนวน update ที่สำเร็จ
    //         let successfulUpdates = 0;


    //         for (const item of rmResults.recordset) {
    //             const { cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id } = item;


    //             let coldTimeValue = cold_time;
    //             let pic_time = prep_to_cold_time;
    //             let ReworkTime = rework_time;
    //             let MixTime = mix_time;


    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, cold_time ตอนรับ:`, cold_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ptc_time ตอนรับ:`, prep_to_cold_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time ตอนรับ:`, rework_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time ตอนรับ:`, mix_time);


    //             // เฉพาะกรณีที่ cold_time เป็น null ให้ดึงค่าจาก RawMatGroup
    //             if (cold_time === null) {
    //                 const rmgResult = await transaction
    //                     .request()
    //                     .input("rmfp_id", sql.Int, rmfp_id)
    //                     .query(`
    //                 SELECT rmg.cold
    //                 FROM RMForProd rmf
    //                 JOIN
    //                     RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //                 WHERE
    //                     rmf.rmfp_id = @rmfp_id
    //             `);


    //                 if (rmgResult.recordset.length > 0) {
    //                     coldTimeValue = rmgResult.recordset[0].cold;
    //                 }
    //             }


    //             if (mix_time !== null) {
    //                 // กรณีมีค่า mix_time ให้คำนวณเวลาที่เหลือโดยใช้ mixed_date
    //                 const mixQuery = await transaction
    //                     .request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                     SELECT FORMAT(mixed_date, 'yyyy-MM-dd HH:mm:ss') AS mixed_date
    //                     FROM History
    //                     WHERE mapping_id = @mapping_id AND mixed_date IS NOT NULL
    //                 `);


    //                 if (mixQuery.recordset.length > 0 && mixQuery.recordset[0].mixed_date) {
    //                     const mixedDate = new Date(mixQuery.recordset[0].mixed_date);
    //                     const currentDate = new Date();


    //                     const timeDiffMinutes = (currentDate - mixedDate) / (1000 * 60);


    //                     console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก mixed_date`);


    //                     if (mix_time === 0.00) {
    //                         const totalMinutesRemaining = -timeDiffMinutes;
    //                         const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                         const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                         MixTime = -1 * (updatedHours + (updatedMinutes / 100));


    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี mix_time เป็น 0.00`);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, MixTime);
    //                     } else {
    //                         const isNegative = mix_time < 0;
    //                         const absValue = Math.abs(mix_time);
    //                         const hours = Math.floor(absValue);
    //                         const minutes = Math.round((absValue - hours) * 100);


    //                         let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                         const totalMinutesRemaining = totalMinutes - timeDiffMinutes;


    //                         const isResultNegative = totalMinutesRemaining < 0;
    //                         const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                         const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                         const updatedMinutes = Math.floor(absMinutesRemaining % 60);


    //                         MixTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));


    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time เดิม:`, mix_time);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, MixTime);
    //                     }


    //                     MixTime = parseFloat(MixTime.toFixed(2));
    //                 }
    //             }


    //             // ตรวจสอบ rework_time และคำนวณเวลาที่เหลือ
    //             if (rework_time !== null) {
    //                 const reworkQuery = await transaction
    //                     .request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                     SELECT FORMAT(qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date
    //                     FROM History
    //                     WHERE mapping_id = @mapping_id AND qc_date IS NOT NULL
    //                 `);


    //                 if (reworkQuery.recordset.length > 0 && reworkQuery.recordset[0].qc_date) {
    //                     const qcDate = new Date(reworkQuery.recordset[0].qc_date);
    //                     const currentDate = new Date();


    //                     const timeDiffMinutes = (currentDate - qcDate) / (1000 * 60);


    //                     console.log(`RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก qc_date`);


    //                     if (rework_time === 0.00) {
    //                         const totalMinutesRemaining = -timeDiffMinutes;
    //                         const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                         const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                         ReworkTime = -1 * (updatedHours + (updatedMinutes / 100));


    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี rework_time เป็น 0.00`);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, ReworkTime);
    //                     } else {
    //                         const isNegative = rework_time < 0;
    //                         const absValue = Math.abs(rework_time);
    //                         const hours = Math.floor(absValue);
    //                         const minutes = Math.round((absValue - hours) * 100);


    //                         let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                         const totalMinutesRemaining = totalMinutes - timeDiffMinutes;


    //                         const isResultNegative = totalMinutesRemaining < 0;
    //                         const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                         const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                         const updatedMinutes = Math.floor(absMinutesRemaining % 60);


    //                         ReworkTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));


    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time เดิม:`, rework_time);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, ReworkTime);
    //                     }


    //                     ReworkTime = parseFloat(ReworkTime.toFixed(2));
    //                 }
    //             } else {
    //                 // กรณี rework_time เป็น null ให้คำนวณ prep_to_cold_time ตามเดิม
    //                 if (prep_to_cold_time === null) {
    //                     const ptcResult = await transaction
    //                         .request()
    //                         .input("rmfp_id", sql.Int, rmfp_id)
    //                         .input("tro_id", sql.VarChar(4), tro_id)
    //                         .query(`
    //     SELECT
    //         rmg.prep_to_cold,
    //         FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //         FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date
    //     FROM
    //         TrolleyRMMapping rmm
    //     JOIN  
    //         RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
    //     JOIN
    //         RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //     JOIN
    //         History htr ON rmm.mapping_id = htr.mapping_id
    //     WHERE
    //         rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    // `);


    //                     if (ptcResult.recordset.length > 0) {
    //                         const prepToCold = ptcResult.recordset[0].prep_to_cold;
    //                         const currentDate = new Date();


    //                         const referenceDate = ptcResult.recordset[0].rmit_date ?
    //                             new Date(ptcResult.recordset[0].rmit_date) :
    //                             new Date(ptcResult.recordset[0].cooked_date);
    //                         const referenceType = ptcResult.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';


    //                         const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);


    //                         let remainingTimeHours = prepToCold - (timeDiffMinutes / 60);


    //                         const hours = Math.floor(remainingTimeHours);
    //                         const minutes = Math.floor((remainingTimeHours - hours) * 60);


    //                         pic_time = hours + (minutes / 100);
    //                         pic_time = parseFloat(pic_time.toFixed(2));


    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold จาก RawMatGroup:`, prepToCold);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                     }
    //                 } else {
    //                     const ptcQuery = await transaction
    //                         .request()
    //                         .input("rmfp_id", sql.Int, rmfp_id)
    //                         .input("tro_id", sql.VarChar(4), tro_id)
    //                         .query(`
    //     SELECT
    //         FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //         FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
    //         FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
    //         FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
    //         FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three
    //     FROM
    //         TrolleyRMMapping rmm
    //     JOIN
    //         History htr ON rmm.mapping_id = htr.mapping_id
    //     WHERE
    //         rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    // `);


    //                     if (ptcQuery.recordset.length > 0) {
    //                         const outColdDates = [
    //                             ptcQuery.recordset[0].out_cold_date_three,
    //                             ptcQuery.recordset[0].out_cold_date_two,
    //                             ptcQuery.recordset[0].out_cold_date
    //                         ].filter(date => date);


    //                         let referenceDate;
    //                         let referenceType = '';


    //                         if (outColdDates.length > 0) {
    //                             referenceDate = new Date(outColdDates[0]);
    //                             referenceType = 'out_cold_date';
    //                         } else {
    //                             referenceDate = ptcQuery.recordset[0].rmit_date ?
    //                                 new Date(ptcQuery.recordset[0].rmit_date) :
    //                                 new Date(ptcQuery.recordset[0].cooked_date);
    //                             referenceType = ptcQuery.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';
    //                         }


    //                         const currentDate = new Date();
    //                         const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);


    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);


    //                         if (prep_to_cold_time === 0.00) {
    //                             const totalMinutesRemaining = -timeDiffMinutes;
    //                             const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                             const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                             pic_time = -1 * (updatedHours + (updatedMinutes / 100));


    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี prep_to_cold_time เป็น 0.00`);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, pic_time);
    //                         } else {
    //                             const isNegative = prep_to_cold_time < 0;
    //                             const absValue = Math.abs(prep_to_cold_time);
    //                             const hours = Math.floor(absValue);
    //                             const minutes = Math.round((absValue - hours) * 100);


    //                             let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                             const totalMinutesRemaining = totalMinutes - timeDiffMinutes;


    //                             const isResultNegative = totalMinutesRemaining < 0;
    //                             const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                             const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                             const updatedMinutes = Math.round(absMinutesRemaining % 60);


    //                             pic_time = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));


    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold_time เดิม:`, prep_to_cold_time);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                         }


    //                         pic_time = parseFloat(pic_time.toFixed(2));
    //                     }
    //                 }
    //             }


    //             console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, cold_time update:`, coldTimeValue);
    //             console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, prep_to_cold_time:`, pic_time);
    //             console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, rework_time update:`, ReworkTime);


    //             // อัปเดตข้อมูลในตาราง TrolleyRMMapping สำหรับวัตถุดิบนี้
    //             const updateResult = await transaction
    //                 .request()
    //                 .input("rmfp_id", sql.Int, rmfp_id)
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .input("selectedOption", sql.VarChar, selectedOption)
    //                 .input("stay_place", sql.VarChar, "เข้าห้องเย็น")
    //                 .input("dest", sql.VarChar, "ห้องเย็น")
    //                 .input("cold_time", sql.Float, coldTimeValue)
    //                 .input("prep_to_cold_time", sql.Float, pic_time)
    //                 .input("rework_time", sql.Float, ReworkTime)
    //                 .input("mix_time", sql.Float, MixTime)
    //                 .query(`
    //                 UPDATE TrolleyRMMapping
    //                 SET
    //                     rm_cold_status = @selectedOption,
    //                     stay_place = @stay_place,
    //                     dest = @dest,
    //                     cold_time = @cold_time,
    //                     prep_to_cold_time = @prep_to_cold_time,
    //                     rework_time = @rework_time,
    //                     mix_time = @mix_time
    //                 WHERE
    //                     tro_id = @tro_id AND rmfp_id = @rmfp_id
    //             `);


    //             if (updateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `ไม่สามารถอัปเดตข้อมูลวัตถุดิบ RMFP ID: ${rmfp_id} ได้`
    //                 });
    //             }


    //             successfulUpdates++;
    //         }


    //         // ตรวจสอบว่าอัปเดตครบทุก item หรือไม่
    //         if (successfulUpdates !== rmResults.recordset.length) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `อัปเดตข้อมูลไม่ครบ อัปเดตสำเร็จ ${successfulUpdates}/${rmResults.recordset.length} รายการ`
    //             });
    //         }


    //         // อัปเดตช่องเก็บในห้องเย็น
    //         const slotUpdateResult = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .input("cs_id", sql.Int, cs_id)
    //             .input("slot_id", sql.VarChar, slot_id)
    //             .query("UPDATE Slot SET tro_id = @tro_id WHERE cs_id = @cs_id AND slot_id = @slot_id");


    //         if (slotUpdateResult.rowsAffected[0] === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตช่องเก็บได้" });
    //         }


    //         // อัปเดตประวัติการเข้าห้องเย็น
    //         const mappingResults = await transaction.request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");


    //         if (mappingResults.recordset.length > 0) {
    //             let historyUpdateCount = 0;


    //             for (const row of mappingResults.recordset) {
    //                 const mapping_id = row.mapping_id;


    //                 const historyUpdateResult = await transaction.request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                 UPDATE History
    //                 SET
    //                   come_cold_date =
    //                     CASE
    //                       WHEN come_cold_date IS NULL THEN GETDATE()
    //                       ELSE come_cold_date
    //                     END,
    //                   come_cold_date_two =
    //                     CASE
    //                       WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NULL THEN GETDATE()
    //                       ELSE come_cold_date_two
    //                     END,
    //                   come_cold_date_three =
    //                     CASE
    //                       WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NOT NULL AND come_cold_date_three IS NULL THEN GETDATE()
    //                       ELSE come_cold_date_three
    //                     END
    //                 WHERE mapping_id = @mapping_id
    //             `);


    //                 if (historyUpdateResult.rowsAffected[0] > 0) {
    //                     historyUpdateCount++;
    //                 }
    //             }


    //             // ตรวจสอบว่าอัปเดต History ครบหรือไม่
    //             if (historyUpdateCount !== mappingResults.recordset.length) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `ไม่สามารถอัปเดตประวัติการเข้าห้องเย็นได้ครบทุกรายการ (อัปเดตสำเร็จ ${historyUpdateCount}/${mappingResults.recordset.length})`
    //                 });
    //             }
    //         }


    //         // Commit transaction เมื่อทุกอย่างสำเร็จ
    //         await transaction.commit();


    //         // ส่ง socket event หลัง commit สำเร็จ
    //         io.to('saveRMForProdRoom').emit('dataUpdated', []);


    //         return res.status(200).json({ success: true, message: `รับเข้า ${selectedOption}` });


    //     } catch (err) {
    //         // Rollback ถ้าเกิด error ใดๆ
    //         try {
    //             await transaction.rollback();
    //         } catch (rollbackErr) {
    //             console.error("Rollback error", rollbackErr);
    //         }


    //         console.error("SQL error", err);
    //         res.status(500).json({ success: false, error: err.message });
    //     }
    // });



    // router.put("/cold/checkin/update/Trolley", async (req, res) => {
    //         const { tro_id, cs_id, slot_id, selectedOption } = req.body;




    //         const pool = await connectToDatabase();
    //         const transaction = pool.transaction();




    //         try {
    //             // เริ่ม Transaction
    //             await transaction.begin();




    //             // ตรวจสอบว่ารถเข็นมีอยู่ในระบบหรือไม่
    //             const trolleyResult = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id");




    //             if (trolleyResult.recordset.length === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "รถเข็นไม่พร้อมใช้งาน" });
    //             }




    //             // เพิ่มการตรวจสอบว่ารถเข็นอยู่ในห้องเย็นอยู่แล้วหรือไม่
    //             const trolleyInColdResult = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("SELECT cs_id, slot_id FROM Slot WHERE tro_id = @tro_id");




    //             if (trolleyInColdResult.recordset.length > 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `รถเข็นนี้อยู่ในห้องเย็นอยู่แล้ว (ช่อง ${trolleyInColdResult.recordset[0].slot_id})`
    //                 });
    //             }




    //             // ตรวจสอบว่าช่องเก็บว่างหรือไม่
    //             const slotResult = await transaction
    //                 .request()
    //                 .input("cs_id", sql.Int, cs_id)
    //                 .input("slot_id", sql.VarChar, slot_id)
    //                 .query("SELECT tro_id FROM Slot WHERE cs_id = @cs_id AND slot_id = @slot_id");




    //             if (slotResult.recordset.length === 0 || slotResult.recordset[0].tro_id !== null && slotResult.recordset[0].tro_id !== 'rsrv') {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ช่องเก็บนี้ไม่ว่าง" });
    //             }




    //             const tro_status = trolleyResult.recordset[0].tro_status;
    //             const rsrv_timestamp = trolleyResult.recordset[0].rsrv_timestamp;




    //             console.log("tro_status", tro_status);
    //             console.log("rsrv_timestamp", rsrv_timestamp);




    //             // กรณีรถเข็นว่าง
    //             if (selectedOption === "รถเข็นว่าง") {
    //                 // ถ้า tro_status = 0 คือ รถเข็นถูกใช้ไปแล้ว ไม่สามารถใช้รถเข็นคันนี้ได้
    //                 if (tro_status === false) {
    //                     await transaction.rollback();
    //                     return res.status(400).json({ success: false, message: "รถเข็นคันนี้ถูกใช้งานแล้ว" });
    //                 }




    //                 // ตรวจสอบเงื่อนไขก่อนอัปเดต tro_status
    //                 // ถ้า rsrv_timestamp = null ไม่สามารถอัปเดตได้
    //                 if (rsrv_timestamp === null) {
    //                     await transaction.rollback();
    //                     return res.status(400).json({
    //                         success: false,
    //                         message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
    //                     });
    //                 }




    //                 // ถ้า tro_status = 1 หรือ 0 ไม่สามารถอัปเดตได้ (แต่ rsrv สามารถอัปเดตได้)
    //                 if (tro_status === 1 || tro_status === 0) {
    //                     await transaction.rollback();
    //                     return res.status(400).json({
    //                         success: false,
    //                         message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
    //                     });
    //                 }




    //                 // อัปเดตช่องเก็บ
    //                 const slotUpdateResult = await transaction
    //                     .request()
    //                     .input("tro_id", sql.VarChar(4), tro_id)
    //                     .input("cs_id", sql.Int, cs_id)
    //                     .input("slot_id", sql.VarChar, slot_id)
    //                     .query("UPDATE Slot SET tro_id = @tro_id , reserved_at = NULL WHERE cs_id = @cs_id AND slot_id = @slot_id");




    //                 if (slotUpdateResult.rowsAffected[0] === 0) {
    //                     await transaction.rollback();
    //                     return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตช่องเก็บได้" });
    //                 }




    //                 // เพิ่มการอัพเดต tro_status เป็น 0 ในตาราง Trolley (รถเข็นถูกใช้งานแล้ว)
    //                 const trolleyUpdateResult = await transaction
    //                     .request()
    //                     .input("tro_id", sql.VarChar(4), tro_id)
    //                     .query("UPDATE Trolley SET tro_status = 0, rsrv_timestamp = null WHERE tro_id = @tro_id");




    //                 if (trolleyUpdateResult.rowsAffected[0] === 0) {
    //                     await transaction.rollback();
    //                     return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตสถานะรถเข็นได้" });
    //                 }




    //                 // Commit transaction
    //                 await transaction.commit();
    //                 return res.status(200).json({ success: true, message: "รับเข้ารถเข็นว่าง" });
    //             }




    //             // สำหรับกรณีอื่นๆ (ไม่ใช่รถเข็นว่าง) ต้องตรวจสอบวัตถุดิบในรถเข็น
    //             // ตรวจสอบข้อมูลวัตถุดิบใน TrolleyRMMapping
    //             const rmResults = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("SELECT dest, rmm_line_name, rm_status, cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");




    //             if (rmResults.recordset.length === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ไม่พบวัตถุดิบในรถเข็นนี้" });
    //             }




    //             // ตรวจสอบว่าทุกวัตถุดิบมีปลายทางเป็น "เข้าห้องเย็น"
    //             const invalidDestItems = rmResults.recordset.filter(item => item.dest !== "เข้าห้องเย็น" && item.dest !== "รอCheckin");
    //             if (invalidDestItems.length > 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: "มีวัตถุดิบในรถเข็นที่ไม่ได้เตรียมเข้าห้องเย็น"
    //                 });
    //             }






    //             // ตรวจสอบสถานะของวัตถุดิบตามเงื่อนไขที่เลือก
    //             const statusMap = {
    //                 "วัตถุดิบรอแก้ไข": ["รอแก้ไข"],
    //                 "วัตถุดิบรับฝาก": ["QcCheck รอกลับมาเตรียม", "QcCheck รอ MD", "รอ Qc", "รอกลับมาเตรียม"],
    //                 "วัตถุดิบตรง": ["QcCheck"],
    //                 "เหลือจากไลน์ผลิต": ["เหลือจากไลน์ผลิต"],
    //             };




    //             if (!(selectedOption in statusMap)) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ตัวเลือกไม่ถูกต้อง" });
    //             }




    //             const validStatuses = statusMap[selectedOption];
    //             const invalidStatusItems = rmResults.recordset.filter(item =>
    //                 !validStatuses.includes(item.rm_status)
    //             );




    //             if (invalidStatusItems.length > 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `ไม่ตรงเงื่อนไขรับเข้า ${selectedOption} มีวัตถุดิบที่มีสถานะไม่ตรงกับเงื่อนไข`
    //                 });
    //             }




    //             // นับจำนวน update ที่สำเร็จ
    //             let successfulUpdates = 0;




    //             for (const item of rmResults.recordset) {
    //                 const { cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id } = item;




    //                 let coldTimeValue = cold_time;
    //                 let pic_time = prep_to_cold_time;
    //                 let ReworkTime = rework_time;
    //                 let MixTime = mix_time;




    //                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, cold_time ตอนรับ:`, cold_time);
    //                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ptc_time ตอนรับ:`, prep_to_cold_time);
    //                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time ตอนรับ:`, rework_time);
    //                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time ตอนรับ:`, mix_time);




    //                 // เฉพาะกรณีที่ cold_time เป็น null ให้ดึงค่าจาก RawMatGroup
    //                 if (cold_time === null) {
    //                     const rmgResult = await transaction
    //                         .request()
    //                         .input("rmfp_id", sql.Int, rmfp_id)
    //                         .query(`
    //                     SELECT rmg.cold
    //                     FROM RMForProd rmf
    //                     JOIN
    //                         RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //                     WHERE
    //                         rmf.rmfp_id = @rmfp_id
    //                 `);




    //                     if (rmgResult.recordset.length > 0) {
    //                         coldTimeValue = rmgResult.recordset[0].cold;
    //                     }
    //                 }




    //                 if (mix_time !== null) {
    //                     // กรณีมีค่า mix_time ให้คำนวณเวลาที่เหลือโดยใช้ mixed_date
    //                     const mixQuery = await transaction
    //                         .request()
    //                         .input("mapping_id", sql.Int, mapping_id)
    //                         .query(`
    //                         SELECT FORMAT(mixed_date, 'yyyy-MM-dd HH:mm:ss') AS mixed_date
    //                         FROM History
    //                         WHERE mapping_id = @mapping_id AND mixed_date IS NOT NULL
    //                     `);




    //                     if (mixQuery.recordset.length > 0 && mixQuery.recordset[0].mixed_date) {
    //                         const mixedDate = new Date(mixQuery.recordset[0].mixed_date);
    //                         const currentDate = new Date();




    //                         const timeDiffMinutes = (currentDate - mixedDate) / (1000 * 60);




    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก mixed_date`);




    //                         if (mix_time === 0.00) {
    //                             const totalMinutesRemaining = -timeDiffMinutes;
    //                             const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                             const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                             MixTime = -1 * (updatedHours + (updatedMinutes / 100));




    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี mix_time เป็น 0.00`);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, MixTime);
    //                         } else {
    //                             const isNegative = mix_time < 0;
    //                             const absValue = Math.abs(mix_time);
    //                             const hours = Math.floor(absValue);
    //                             const minutes = Math.round((absValue - hours) * 100);




    //                             let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                             const totalMinutesRemaining = totalMinutes - timeDiffMinutes;




    //                             const isResultNegative = totalMinutesRemaining < 0;
    //                             const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                             const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                             const updatedMinutes = Math.floor(absMinutesRemaining % 60);




    //                             MixTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));




    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time เดิม:`, mix_time);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, MixTime);
    //                         }




    //                         MixTime = parseFloat(MixTime.toFixed(2));
    //                     }
    //                 }




    //                 // ตรวจสอบ rework_time และคำนวณเวลาที่เหลือ
    //                 if (rework_time !== null) {
    //                     const reworkQuery = await transaction
    //                         .request()
    //                         .input("mapping_id", sql.Int, mapping_id)
    //                         .query(`
    //                         SELECT FORMAT(qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date
    //                         FROM History
    //                         WHERE mapping_id = @mapping_id AND qc_date IS NOT NULL
    //                     `);




    //                     if (reworkQuery.recordset.length > 0 && reworkQuery.recordset[0].qc_date) {
    //                         const qcDate = new Date(reworkQuery.recordset[0].qc_date);
    //                         const currentDate = new Date();




    //                         const timeDiffMinutes = (currentDate - qcDate) / (1000 * 60);




    //                         console.log(`RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก qc_date`);




    //                         if (rework_time === 0.00) {
    //                             const totalMinutesRemaining = -timeDiffMinutes;
    //                             const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                             const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                             ReworkTime = -1 * (updatedHours + (updatedMinutes / 100));




    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี rework_time เป็น 0.00`);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, ReworkTime);
    //                         } else {
    //                             const isNegative = rework_time < 0;
    //                             const absValue = Math.abs(rework_time);
    //                             const hours = Math.floor(absValue);
    //                             const minutes = Math.round((absValue - hours) * 100);




    //                             let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                             const totalMinutesRemaining = totalMinutes - timeDiffMinutes;




    //                             const isResultNegative = totalMinutesRemaining < 0;
    //                             const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                             const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                             const updatedMinutes = Math.floor(absMinutesRemaining % 60);




    //                             ReworkTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));




    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time เดิม:`, rework_time);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, ReworkTime);
    //                         }




    //                         ReworkTime = parseFloat(ReworkTime.toFixed(2));
    //                     }
    //                 } else {
    //                     // กรณี rework_time เป็น null ให้คำนวณ prep_to_cold_time ตามเดิม
    //                     if (prep_to_cold_time === null) {
    //                         const ptcResult = await transaction
    //                             .request()
    //                             .input("rmfp_id", sql.Int, rmfp_id)
    //                             .input("tro_id", sql.VarChar(4), tro_id)
    //                             .query(`
    //         SELECT
    //             rmg.prep_to_cold,
    //             FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //             FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date
    //         FROM
    //             TrolleyRMMapping rmm
    //         JOIN  
    //             RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
    //         JOIN
    //             RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //         JOIN
    //             History htr ON rmm.mapping_id = htr.mapping_id
    //         WHERE
    //             rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    //     `);




    //                         if (ptcResult.recordset.length > 0) {
    //                             const prepToCold = ptcResult.recordset[0].prep_to_cold;
    //                             const currentDate = new Date();




    //                             const referenceDate = ptcResult.recordset[0].rmit_date ?
    //                                 new Date(ptcResult.recordset[0].rmit_date) :
    //                                 new Date(ptcResult.recordset[0].cooked_date);
    //                             const referenceType = ptcResult.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';




    //                             const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);




    //                             let remainingTimeHours = prepToCold - (timeDiffMinutes / 60);




    //                             const hours = Math.floor(remainingTimeHours);
    //                             const minutes = Math.floor((remainingTimeHours - hours) * 60);




    //                             pic_time = hours + (minutes / 100);
    //                             pic_time = parseFloat(pic_time.toFixed(2));




    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold จาก RawMatGroup:`, prepToCold);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                         }
    //                     } else {
    //                         const ptcQuery = await transaction
    //                             .request()
    //                             .input("rmfp_id", sql.Int, rmfp_id)
    //                             .input("tro_id", sql.VarChar(4), tro_id)
    //                             .query(`
    //         SELECT
    //             FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //             FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
    //             FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
    //             FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
    //             FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three
    //         FROM
    //             TrolleyRMMapping rmm
    //         JOIN
    //             History htr ON rmm.mapping_id = htr.mapping_id
    //         WHERE
    //             rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    //     `);




    //                         if (ptcQuery.recordset.length > 0) {
    //                             const outColdDates = [
    //                                 ptcQuery.recordset[0].out_cold_date_three,
    //                                 ptcQuery.recordset[0].out_cold_date_two,
    //                                 ptcQuery.recordset[0].out_cold_date
    //                             ].filter(date => date);




    //                             let referenceDate;
    //                             let referenceType = '';




    //                             if (outColdDates.length > 0) {
    //                                 referenceDate = new Date(outColdDates[0]);
    //                                 referenceType = 'out_cold_date';
    //                             } else {
    //                                 referenceDate = ptcQuery.recordset[0].rmit_date ?
    //                                     new Date(ptcQuery.recordset[0].rmit_date) :
    //                                     new Date(ptcQuery.recordset[0].cooked_date);
    //                                 referenceType = ptcQuery.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';
    //                             }




    //                             const currentDate = new Date();
    //                             const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);




    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);




    //                             if (prep_to_cold_time === 0.00) {
    //                                 const totalMinutesRemaining = -timeDiffMinutes;
    //                                 const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                                 const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                                 pic_time = -1 * (updatedHours + (updatedMinutes / 100));




    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี prep_to_cold_time เป็น 0.00`);
    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, pic_time);
    //                             } else {
    //                                 const isNegative = prep_to_cold_time < 0;
    //                                 const absValue = Math.abs(prep_to_cold_time);
    //                                 const hours = Math.floor(absValue);
    //                                 const minutes = Math.round((absValue - hours) * 100);




    //                                 let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                                 const totalMinutesRemaining = totalMinutes - timeDiffMinutes;




    //                                 const isResultNegative = totalMinutesRemaining < 0;
    //                                 const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                                 const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                                 const updatedMinutes = Math.round(absMinutesRemaining % 60);




    //                                 pic_time = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));




    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold_time เดิม:`, prep_to_cold_time);
    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                                 console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                             }




    //                             pic_time = parseFloat(pic_time.toFixed(2));
    //                         }
    //                     }
    //                 }




    //                 console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, cold_time update:`, coldTimeValue);
    //                 console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, prep_to_cold_time:`, pic_time);
    //                 console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, rework_time update:`, ReworkTime);




    //                 // อัปเดตข้อมูลในตาราง TrolleyRMMapping สำหรับวัตถุดิบนี้
    //                 const updateResult = await transaction
    //                     .request()
    //                     .input("rmfp_id", sql.Int, rmfp_id)
    //                     .input("tro_id", sql.VarChar(4), tro_id)
    //                     .input("selectedOption", sql.VarChar, selectedOption)
    //                     .input("stay_place", sql.VarChar, "เข้าห้องเย็น")
    //                     .input("dest", sql.VarChar, "ห้องเย็น")
    //                     .input("cold_time", sql.Float, coldTimeValue)
    //                     .input("prep_to_cold_time", sql.Float, pic_time)
    //                     .input("rework_time", sql.Float, ReworkTime)
    //                     .input("mix_time", sql.Float, MixTime)
    //                     .query(`
    //                     UPDATE TrolleyRMMapping
    //                     SET
    //                         rm_cold_status = @selectedOption,
    //                         stay_place = @stay_place,
    //                         dest = @dest,
    //                         cold_time = @cold_time,
    //                         prep_to_cold_time = @prep_to_cold_time,
    //                         rework_time = @rework_time,
    //                         mix_time = @mix_time
    //                     WHERE
    //                         tro_id = @tro_id AND rmfp_id = @rmfp_id
    //                 `);




    //                 if (updateResult.rowsAffected[0] === 0) {
    //                     await transaction.rollback();
    //                     return res.status(400).json({
    //                         success: false,
    //                         message: `ไม่สามารถอัปเดตข้อมูลวัตถุดิบ RMFP ID: ${rmfp_id} ได้`
    //                     });
    //                 }




    //                 successfulUpdates++;
    //             }




    //             // ตรวจสอบว่าอัปเดตครบทุก item หรือไม่
    //             if (successfulUpdates !== rmResults.recordset.length) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `อัปเดตข้อมูลไม่ครบ อัปเดตสำเร็จ ${successfulUpdates}/${rmResults.recordset.length} รายการ`
    //                 });
    //             }




    //             // อัปเดตช่องเก็บในห้องเย็น
    //             const slotUpdateResult = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .input("cs_id", sql.Int, cs_id)
    //                 .input("slot_id", sql.VarChar, slot_id)
    //                 .query("UPDATE Slot SET tro_id = @tro_id WHERE cs_id = @cs_id AND slot_id = @slot_id");




    //             if (slotUpdateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตช่องเก็บได้" });
    //             }




    //             // อัปเดตประวัติการเข้าห้องเย็น
    //             const mappingResults = await transaction.request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");




    //             if (mappingResults.recordset.length > 0) {
    //                 let historyUpdateCount = 0;




    //                 for (const row of mappingResults.recordset) {
    //                     const mapping_id = row.mapping_id;




    //                     const historyUpdateResult = await transaction.request()
    //                         .input("mapping_id", sql.Int, mapping_id)
    //                         .query(`
    //                     UPDATE History
    //                     SET
    //                       come_cold_date =
    //                         CASE
    //                           WHEN come_cold_date IS NULL THEN GETDATE()
    //                           ELSE come_cold_date
    //                         END,
    //                       come_cold_date_two =
    //                         CASE
    //                           WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NULL THEN GETDATE()
    //                           ELSE come_cold_date_two
    //                         END,
    //                       come_cold_date_three =
    //                         CASE
    //                           WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NOT NULL AND come_cold_date_three IS NULL THEN GETDATE()
    //                           ELSE come_cold_date_three
    //                         END
    //                     WHERE mapping_id = @mapping_id
    //                 `);




    //                     if (historyUpdateResult.rowsAffected[0] > 0) {
    //                         historyUpdateCount++;
    //                     }
    //                 }




    //                 // ตรวจสอบว่าอัปเดต History ครบหรือไม่
    //                 if (historyUpdateCount !== mappingResults.recordset.length) {
    //                     await transaction.rollback();
    //                     return res.status(400).json({
    //                         success: false,
    //                         message: `ไม่สามารถอัปเดตประวัติการเข้าห้องเย็นได้ครบทุกรายการ (อัปเดตสำเร็จ ${historyUpdateCount}/${mappingResults.recordset.length})`
    //                     });
    //                 }
    //             }




    //             // Commit transaction เมื่อทุกอย่างสำเร็จ
    //             await transaction.commit();




    //             // ส่ง socket event หลัง commit สำเร็จ
    //             io.to('saveRMForProdRoom').emit('dataUpdated', []);




    //             return res.status(200).json({ success: true, message: `รับเข้า ${selectedOption}` });




    //         } catch (err) {
    //             // Rollback ถ้าเกิด error ใดๆ
    //             try {
    //                 await transaction.rollback();
    //             } catch (rollbackErr) {
    //                 console.error("Rollback error", rollbackErr);
    //             }




    //             console.error("SQL error", err);
    //             res.status(500).json({ success: false, error: err.message });
    //         }
    //     });



    // router.put("/cold/checkin/update/Trolley", async (req, res) => {
    //     const { tro_id, cs_id, slot_id, selectedOption } = req.body;




    //     const pool = await connectToDatabase();
    //     const transaction = pool.transaction();




    //     try {
    //         // เริ่ม Transaction
    //         await transaction.begin();




    //         // ตรวจสอบว่ารถเข็นมีอยู่ในระบบหรือไม่
    //         const trolleyResult = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id");




    //         if (trolleyResult.recordset.length === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "รถเข็นไม่พร้อมใช้งาน" });
    //         }




    //         // เพิ่มการตรวจสอบว่ารถเข็นอยู่ในห้องเย็นอยู่แล้วหรือไม่
    //         const trolleyInColdResult = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT cs_id, slot_id FROM Slot WHERE tro_id = @tro_id");




    //         if (trolleyInColdResult.recordset.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `รถเข็นนี้อยู่ในห้องเย็นอยู่แล้ว (ช่อง ${trolleyInColdResult.recordset[0].slot_id})`
    //             });
    //         }




    //         // ตรวจสอบว่าช่องเก็บว่างหรือไม่
    //         const slotResult = await transaction
    //             .request()
    //             .input("cs_id", sql.Int, cs_id)
    //             .input("slot_id", sql.VarChar, slot_id)
    //             .query("SELECT tro_id FROM Slot WHERE cs_id = @cs_id AND slot_id = @slot_id");




    //         if (slotResult.recordset.length === 0 || slotResult.recordset[0].tro_id !== null && slotResult.recordset[0].tro_id !== 'rsrv') {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ช่องเก็บนี้ไม่ว่าง" });
    //         }




    //         const tro_status = trolleyResult.recordset[0].tro_status;
    //         const rsrv_timestamp = trolleyResult.recordset[0].rsrv_timestamp;




    //         console.log("tro_status", tro_status);
    //         console.log("rsrv_timestamp", rsrv_timestamp);




    //         // กรณีรถเข็นว่าง
    //         if (selectedOption === "รถเข็นว่าง") {
    //             // ถ้า tro_status = 0 คือ รถเข็นถูกใช้ไปแล้ว ไม่สามารถใช้รถเข็นคันนี้ได้
    //             if (tro_status === false) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "รถเข็นคันนี้ถูกใช้งานแล้ว" });
    //             }




    //             // ตรวจสอบเงื่อนไขก่อนอัปเดต tro_status
    //             // ถ้า rsrv_timestamp = null ไม่สามารถอัปเดตได้
    //             if (rsrv_timestamp === null) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
    //                 });
    //             }




    //             // ถ้า tro_status = 1 หรือ 0 ไม่สามารถอัปเดตได้ (แต่ rsrv สามารถอัปเดตได้)
    //             if (tro_status === 1 || tro_status === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
    //                 });
    //             }




    //             // อัปเดตช่องเก็บ
    //             const slotUpdateResult = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .input("cs_id", sql.Int, cs_id)
    //                 .input("slot_id", sql.VarChar, slot_id)
    //                 .query("UPDATE Slot SET tro_id = @tro_id , reserved_at = NULL WHERE cs_id = @cs_id AND slot_id = @slot_id");




    //             if (slotUpdateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตช่องเก็บได้" });
    //             }




    //             // เพิ่มการอัพเดต tro_status เป็น 0 ในตาราง Trolley (รถเข็นถูกใช้งานแล้ว)
    //             const trolleyUpdateResult = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("UPDATE Trolley SET tro_status = 0, rsrv_timestamp = null WHERE tro_id = @tro_id");




    //             if (trolleyUpdateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตสถานะรถเข็นได้" });
    //             }




    //             // Commit transaction
    //             await transaction.commit();
    //             return res.status(200).json({ success: true, message: "รับเข้ารถเข็นว่าง" });
    //         }




    //         // สำหรับกรณีอื่นๆ (ไม่ใช่รถเข็นว่าง) ต้องตรวจสอบวัตถุดิบในรถเข็น
    //         // ตรวจสอบข้อมูลวัตถุดิบใน TrolleyRMMapping
    //         const rmResults = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT dest, rmm_line_name, rm_status, cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");




    //         if (rmResults.recordset.length === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ไม่พบวัตถุดิบในรถเข็นนี้" });
    //         }




    //         // ตรวจสอบว่าทุกวัตถุดิบมีปลายทางเป็น "เข้าห้องเย็น"
    //         const invalidDestItems = rmResults.recordset.filter(item => item.dest !== "เข้าห้องเย็น" && item.dest !== "รอCheckin");
    //         if (invalidDestItems.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: "มีวัตถุดิบในรถเข็นที่ไม่ได้เตรียมเข้าห้องเย็น"
    //             });
    //         }






    //         // ตรวจสอบสถานะของวัตถุดิบตามเงื่อนไขที่เลือก
    //         const statusMap = {
    //             "วัตถุดิบรอแก้ไข": ["รอแก้ไข"],
    //             "วัตถุดิบรับฝาก": ["QcCheck รอกลับมาเตรียม", "QcCheck รอ MD", "รอ Qc", "รอกลับมาเตรียม"],
    //             "วัตถุดิบตรง": ["QcCheck"],
    //             "เหลือจากไลน์ผลิต": ["เหลือจากไลน์ผลิต"],
    //         };




    //         if (!(selectedOption in statusMap)) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ตัวเลือกไม่ถูกต้อง" });
    //         }




    //         const validStatuses = statusMap[selectedOption];
    //         const invalidStatusItems = rmResults.recordset.filter(item =>
    //             !validStatuses.includes(item.rm_status)
    //         );




    //         if (invalidStatusItems.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `ไม่ตรงเงื่อนไขรับเข้า ${selectedOption} มีวัตถุดิบที่มีสถานะไม่ตรงกับเงื่อนไข`
    //             });
    //         }




    //         // นับจำนวน update ที่สำเร็จ
    //         let successfulUpdates = 0;




    //         for (const item of rmResults.recordset) {
    //             const { cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id } = item;




    //             let coldTimeValue = cold_time;
    //             let pic_time = prep_to_cold_time;
    //             let ReworkTime = rework_time;
    //             let MixTime = mix_time;




    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, cold_time ตอนรับ:`, cold_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ptc_time ตอนรับ:`, prep_to_cold_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time ตอนรับ:`, rework_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time ตอนรับ:`, mix_time);




    //             // เฉพาะกรณีที่ cold_time เป็น null ให้ดึงค่าจาก RawMatGroup
    //             if (cold_time === null) {
    //                 const rmgResult = await transaction
    //                     .request()
    //                     .input("rmfp_id", sql.Int, rmfp_id)
    //                     .query(`
    //                 SELECT rmg.cold
    //                 FROM RMForProd rmf
    //                 JOIN
    //                     RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //                 WHERE
    //                     rmf.rmfp_id = @rmfp_id
    //             `);




    //                 if (rmgResult.recordset.length > 0) {
    //                     coldTimeValue = rmgResult.recordset[0].cold;
    //                 }
    //             }




    //             if (mix_time !== null) {
    //                 // กรณีมีค่า mix_time ให้คำนวณเวลาที่เหลือโดยใช้ mixed_date
    //                 const mixQuery = await transaction
    //                     .request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                     SELECT FORMAT(mixed_date, 'yyyy-MM-dd HH:mm:ss') AS mixed_date
    //                     FROM History
    //                     WHERE mapping_id = @mapping_id AND mixed_date IS NOT NULL
    //                 `);




    //                 if (mixQuery.recordset.length > 0 && mixQuery.recordset[0].mixed_date) {
    //                     const mixedDate = new Date(mixQuery.recordset[0].mixed_date);
    //                     const currentDate = new Date();




    //                     const timeDiffMinutes = (currentDate - mixedDate) / (1000 * 60);




    //                     console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก mixed_date`);




    //                     if (mix_time === 0.00) {
    //                         const totalMinutesRemaining = -timeDiffMinutes;
    //                         const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                         const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                         MixTime = -1 * (updatedHours + (updatedMinutes / 100));




    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี mix_time เป็น 0.00`);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, MixTime);
    //                     } else {
    //                         const isNegative = mix_time < 0;
    //                         const absValue = Math.abs(mix_time);
    //                         const hours = Math.floor(absValue);
    //                         const minutes = Math.round((absValue - hours) * 100);




    //                         let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                         const totalMinutesRemaining = totalMinutes - timeDiffMinutes;




    //                         const isResultNegative = totalMinutesRemaining < 0;
    //                         const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                         const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                         const updatedMinutes = Math.floor(absMinutesRemaining % 60);




    //                         MixTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));




    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time เดิม:`, mix_time);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, MixTime);
    //                     }




    //                     MixTime = parseFloat(MixTime.toFixed(2));
    //                 }
    //             }




    //             // ตรวจสอบ rework_time และคำนวณเวลาที่เหลือ
    //             if (rework_time !== null) {
    //                 const reworkQuery = await transaction
    //                     .request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                     SELECT FORMAT(qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date
    //                     FROM History
    //                     WHERE mapping_id = @mapping_id AND qc_date IS NOT NULL
    //                 `);




    //                 if (reworkQuery.recordset.length > 0 && reworkQuery.recordset[0].qc_date) {
    //                     const qcDate = new Date(reworkQuery.recordset[0].qc_date);
    //                     const currentDate = new Date();




    //                     const timeDiffMinutes = (currentDate - qcDate) / (1000 * 60);




    //                     console.log(`RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก qc_date`);




    //                     if (rework_time === 0.00) {
    //                         const totalMinutesRemaining = -timeDiffMinutes;
    //                         const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                         const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                         ReworkTime = -1 * (updatedHours + (updatedMinutes / 100));




    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี rework_time เป็น 0.00`);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, ReworkTime);
    //                     } else {
    //                         const isNegative = rework_time < 0;
    //                         const absValue = Math.abs(rework_time);
    //                         const hours = Math.floor(absValue);
    //                         const minutes = Math.round((absValue - hours) * 100);




    //                         let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                         const totalMinutesRemaining = totalMinutes - timeDiffMinutes;




    //                         const isResultNegative = totalMinutesRemaining < 0;
    //                         const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                         const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                         const updatedMinutes = Math.floor(absMinutesRemaining % 60);




    //                         ReworkTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));




    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time เดิม:`, rework_time);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, ReworkTime);
    //                     }




    //                     ReworkTime = parseFloat(ReworkTime.toFixed(2));
    //                 }
    //             } else {
    //                 // กรณี rework_time เป็น null ให้คำนวณ prep_to_cold_time ตามเดิม
    //                 if (prep_to_cold_time === null) {
    //                     const ptcResult = await transaction
    //                         .request()
    //                         .input("rmfp_id", sql.Int, rmfp_id)
    //                         .input("tro_id", sql.VarChar(4), tro_id)
    //                         .query(`
    //     SELECT
    //         rmg.prep_to_cold,
    //         FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //         FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date
    //     FROM
    //         TrolleyRMMapping rmm
    //     JOIN  
    //         RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
    //     JOIN
    //         RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //     JOIN
    //         History htr ON rmm.mapping_id = htr.mapping_id
    //     WHERE
    //         rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    // `);




    //                     if (ptcResult.recordset.length > 0) {
    //                         const prepToCold = ptcResult.recordset[0].prep_to_cold;
    //                         const currentDate = new Date();




    //                         const referenceDate = ptcResult.recordset[0].rmit_date ?
    //                             new Date(ptcResult.recordset[0].rmit_date) :
    //                             new Date(ptcResult.recordset[0].cooked_date);
    //                         const referenceType = ptcResult.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';




    //                         const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);




    //                         let remainingTimeHours = prepToCold - (timeDiffMinutes / 60);




    //                         const hours = Math.floor(remainingTimeHours);
    //                         const minutes = Math.floor((remainingTimeHours - hours) * 60);




    //                         pic_time = hours + (minutes / 100);
    //                         pic_time = parseFloat(pic_time.toFixed(2));




    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold จาก RawMatGroup:`, prepToCold);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                     }
    //                 } else {
    //                     const ptcQuery = await transaction
    //                         .request()
    //                         .input("rmfp_id", sql.Int, rmfp_id)
    //                         .input("tro_id", sql.VarChar(4), tro_id)
    //                         .query(`
    //     SELECT
    //         FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //         FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
    //         FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
    //         FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
    //         FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three
    //     FROM
    //         TrolleyRMMapping rmm
    //     JOIN
    //         History htr ON rmm.mapping_id = htr.mapping_id
    //     WHERE
    //         rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    // `);




    //                     if (ptcQuery.recordset.length > 0) {
    //                         const outColdDates = [
    //                             ptcQuery.recordset[0].out_cold_date_three,
    //                             ptcQuery.recordset[0].out_cold_date_two,
    //                             ptcQuery.recordset[0].out_cold_date
    //                         ].filter(date => date);




    //                         let referenceDate;
    //                         let referenceType = '';




    //                         if (outColdDates.length > 0) {
    //                             referenceDate = new Date(outColdDates[0]);
    //                             referenceType = 'out_cold_date';
    //                         } else {
    //                             referenceDate = ptcQuery.recordset[0].rmit_date ?
    //                                 new Date(ptcQuery.recordset[0].rmit_date) :
    //                                 new Date(ptcQuery.recordset[0].cooked_date);
    //                             referenceType = ptcQuery.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';
    //                         }




    //                         const currentDate = new Date();
    //                         const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);




    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);




    //                         if (prep_to_cold_time === 0.00) {
    //                             const totalMinutesRemaining = -timeDiffMinutes;
    //                             const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                             const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                             pic_time = -1 * (updatedHours + (updatedMinutes / 100));




    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี prep_to_cold_time เป็น 0.00`);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, pic_time);
    //                         } else {
    //                             const isNegative = prep_to_cold_time < 0;
    //                             const absValue = Math.abs(prep_to_cold_time);
    //                             const hours = Math.floor(absValue);
    //                             const minutes = Math.round((absValue - hours) * 100);




    //                             let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                             const totalMinutesRemaining = totalMinutes - timeDiffMinutes;




    //                             const isResultNegative = totalMinutesRemaining < 0;
    //                             const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                             const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                             const updatedMinutes = Math.round(absMinutesRemaining % 60);




    //                             pic_time = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));




    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold_time เดิม:`, prep_to_cold_time);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                         }




    //                         pic_time = parseFloat(pic_time.toFixed(2));
    //                     }
    //                 }
    //             }




    //             console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, cold_time update:`, coldTimeValue);
    //             console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, prep_to_cold_time:`, pic_time);
    //             console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, rework_time update:`, ReworkTime);




    //             // อัปเดตข้อมูลในตาราง TrolleyRMMapping สำหรับวัตถุดิบนี้
    //             const updateResult = await transaction
    //                 .request()
    //                 .input("rmfp_id", sql.Int, rmfp_id)
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .input("selectedOption", sql.VarChar, selectedOption)
    //                 .input("stay_place", sql.VarChar, "เข้าห้องเย็น")
    //                 .input("dest", sql.VarChar, "ห้องเย็น")
    //                 .input("cold_time", sql.Float, coldTimeValue)
    //                 .input("prep_to_cold_time", sql.Float, pic_time)
    //                 .input("rework_time", sql.Float, ReworkTime)
    //                 .input("mix_time", sql.Float, MixTime)
    //                 .query(`
    //                 UPDATE TrolleyRMMapping
    //                 SET
    //                     rm_cold_status = @selectedOption,
    //                     stay_place = @stay_place,
    //                     dest = @dest,
    //                     cold_time = @cold_time,
    //                     prep_to_cold_time = @prep_to_cold_time,
    //                     rework_time = @rework_time,
    //                     mix_time = @mix_time
    //                 WHERE
    //                     tro_id = @tro_id AND rmfp_id = @rmfp_id
    //             `);




    //             if (updateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `ไม่สามารถอัปเดตข้อมูลวัตถุดิบ RMFP ID: ${rmfp_id} ได้`
    //                 });
    //             }




    //             successfulUpdates++;
    //         }




    //         // ตรวจสอบว่าอัปเดตครบทุก item หรือไม่
    //         if (successfulUpdates !== rmResults.recordset.length) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `อัปเดตข้อมูลไม่ครบ อัปเดตสำเร็จ ${successfulUpdates}/${rmResults.recordset.length} รายการ`
    //             });
    //         }




    //         // อัปเดตช่องเก็บในห้องเย็น
    //         const slotUpdateResult = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .input("cs_id", sql.Int, cs_id)
    //             .input("slot_id", sql.VarChar, slot_id)
    //             .query("UPDATE Slot SET tro_id = @tro_id WHERE cs_id = @cs_id AND slot_id = @slot_id");




    //         if (slotUpdateResult.rowsAffected[0] === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตช่องเก็บได้" });
    //         }




    //         // อัปเดตประวัติการเข้าห้องเย็น
    //         const mappingResults = await transaction.request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");




    //         if (mappingResults.recordset.length > 0) {
    //             let historyUpdateCount = 0;




    //             for (const row of mappingResults.recordset) {
    //                 const mapping_id = row.mapping_id;




    //                 const historyUpdateResult = await transaction.request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                 UPDATE History
    //                 SET
    //                   come_cold_date =
    //                     CASE
    //                       WHEN come_cold_date IS NULL THEN GETDATE()
    //                       ELSE come_cold_date
    //                     END,
    //                   come_cold_date_two =
    //                     CASE
    //                       WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NULL THEN GETDATE()
    //                       ELSE come_cold_date_two
    //                     END,
    //                   come_cold_date_three =
    //                     CASE
    //                       WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NOT NULL AND come_cold_date_three IS NULL THEN GETDATE()
    //                       ELSE come_cold_date_three
    //                     END
    //                 WHERE mapping_id = @mapping_id
    //             `);




    //                 if (historyUpdateResult.rowsAffected[0] > 0) {
    //                     historyUpdateCount++;
    //                 }
    //             }




    //             // ตรวจสอบว่าอัปเดต History ครบหรือไม่
    //             if (historyUpdateCount !== mappingResults.recordset.length) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `ไม่สามารถอัปเดตประวัติการเข้าห้องเย็นได้ครบทุกรายการ (อัปเดตสำเร็จ ${historyUpdateCount}/${mappingResults.recordset.length})`
    //                 });
    //             }
    //         }




    //         // Commit transaction เมื่อทุกอย่างสำเร็จ
    //         await transaction.commit();




    //         // ส่ง socket event หลัง commit สำเร็จ
    //         io.to('saveRMForProdRoom').emit('dataUpdated', []);




    //         return res.status(200).json({ success: true, message: `รับเข้า ${selectedOption}` });




    //     } catch (err) {
    //         // Rollback ถ้าเกิด error ใดๆ
    //         try {
    //             await transaction.rollback();
    //         } catch (rollbackErr) {
    //             console.error("Rollback error", rollbackErr);
    //         }




    //         console.error("SQL error", err);
    //         res.status(500).json({ success: false, error: err.message });
    //     }
    // });



router.put("/cold/checkin/update/Trolley", async (req, res) => {
    const { tro_id, cs_id, slot_id, selectedOption } = req.body;

    const pool = await connectToDatabase();
    const transaction = pool.transaction();

    try {
        await transaction.begin();

        // ตรวจสอบว่ารถเข็นมีอยู่ในระบบหรือไม่
        const trolleyResult = await transaction
            .request()
            .input("tro_id", sql.VarChar(4), tro_id)
            .query("SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id");

        if (trolleyResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: "รถเข็นไม่พร้อมใช้งาน" });
        }

        // ตรวจสอบว่ารถเข็นอยู่ในห้องเย็นอยู่แล้วหรือไม่
        const trolleyInColdResult = await transaction
            .request()
            .input("tro_id", sql.VarChar(4), tro_id)
            .query("SELECT cs_id, slot_id FROM Slot WHERE tro_id = @tro_id");

        if (trolleyInColdResult.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `รถเข็นนี้อยู่ในห้องเย็นอยู่แล้ว (ช่อง ${trolleyInColdResult.recordset[0].slot_id})`
            });
        }

        // ตรวจสอบว่าช่องเก็บว่างหรือไม่
        // 🔧 แก้ไข: เพิ่มวงเล็บให้ชัดเจน และอนุญาต tro_id ตัวเองด้วย
        const slotResult = await transaction
            .request()
            .input("cs_id", sql.Int, cs_id)
            .input("slot_id", sql.VarChar, slot_id)
            .query("SELECT tro_id FROM Slot WHERE cs_id = @cs_id AND slot_id = @slot_id");

        if (
            slotResult.recordset.length === 0 ||
            (
                slotResult.recordset[0].tro_id !== null &&
                slotResult.recordset[0].tro_id !== 'rsrv' &&
                slotResult.recordset[0].tro_id !== tro_id
            )
        ) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: "ช่องเก็บนี้ไม่ว่าง" });
        }

        const tro_status = trolleyResult.recordset[0].tro_status;
        const rsrv_timestamp = trolleyResult.recordset[0].rsrv_timestamp;

        console.log("tro_status", tro_status);
        console.log("rsrv_timestamp", rsrv_timestamp);

        // กรณีรถเข็นว่าง
        if (selectedOption === "รถเข็นว่าง") {
            if (tro_status === false) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: "รถเข็นคันนี้ถูกใช้งานแล้ว" });
            }

            if (rsrv_timestamp === null) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
                });
            }

            if (tro_status === 1 || tro_status === 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
                });
            }

            const slotUpdateResult = await transaction
                .request()
                .input("tro_id", sql.VarChar(4), tro_id)
                .input("cs_id", sql.Int, cs_id)
                .input("slot_id", sql.VarChar, slot_id)
                .query("UPDATE Slot SET tro_id = @tro_id, reserved_at = NULL WHERE cs_id = @cs_id AND slot_id = @slot_id");

            if (slotUpdateResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตช่องเก็บได้" });
            }

            const trolleyUpdateResult = await transaction
                .request()
                .input("tro_id", sql.VarChar(4), tro_id)
                .query("UPDATE Trolley SET tro_status = 0, rsrv_timestamp = null WHERE tro_id = @tro_id");

            if (trolleyUpdateResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: "ไม่สามารถอัปเดตสถานะรถเข็นได้" });
            }

            await transaction.commit();
            return res.status(200).json({ success: true, message: "รับเข้ารถเข็นว่าง" });
        }

        // ✅ STEP 1: Lock Slot early อัปเดตช่องเก็บ FIRST ก่อน update TrolleyRMMapping
        // เพื่อให้แน่ใจว่า Slot สามารถอัปเดตได้ก่อนจะแก้ไข TrolleyRMMapping
        const slotLockResult = await transaction
            .request()
            .input("tro_id", sql.VarChar(4), tro_id)
            .input("cs_id", sql.Int, cs_id)
            .input("slot_id", sql.VarChar, slot_id)
            .query(`
                UPDATE Slot 
                SET tro_id = @tro_id, reserved_at = NULL 
                WHERE cs_id = @cs_id AND slot_id = @slot_id AND (tro_id IS NULL OR tro_id = 'rsrv')
            `);

        // ⚠️ ตรวจสอบว่า Slot อัปเดตสำเร็จ ถ้าไม่สำเร็จแล้ว Rollback ทั้งหมด
        if (slotLockResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            console.error(`❌ Slot update failed: cs_id=${cs_id}, slot_id=${slot_id}, tro_id=${tro_id}`);
            return res.status(400).json({ 
                success: false, 
                message: "ไม่สามารถอัปเดตช่องเก็บได้ - ช่องเก็บอาจถูกใช้งานโดยรถเข็นอื่น" 
            });
        }

        console.log(`✅ Slot locked and updated: cs_id=${cs_id}, slot_id=${slot_id}, tro_id=${tro_id}`);

        // ✅ STEP 2: ตรวจสอบข้อมูลวัตถุดิบใน TrolleyRMMapping
        const rmResults = await transaction
            .request()
            .input("tro_id", sql.VarChar(4), tro_id)
            .query("SELECT dest, rmm_line_name, rm_status, cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");

        if (rmResults.recordset.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: "ไม่พบวัตถุดิบในรถเข็นนี้" });
        }

        // 🔧 แก้ไข: เพิ่ม "ห้องเย็น" เข้าไปใน whitelist
        // เพราะหลัง update ครั้งแรก dest จะเปลี่ยนเป็น "ห้องเย็น" แล้ว
        const validDests = ["เข้าห้องเย็น", "รอCheckin", "ห้องเย็น"];
        const invalidDestItems = rmResults.recordset.filter(item => !validDests.includes(item.dest));

        if (invalidDestItems.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "มีวัตถุดิบในรถเข็นที่ไม่ได้เตรียมเข้าห้องเย็น"
            });
        }

        // ตรวจสอบสถานะของวัตถุดิบตามเงื่อนไขที่เลือก
        const statusMap = {
            "วัตถุดิบรอแก้ไข": ["รอแก้ไข"],
            "วัตถุดิบรับฝาก": ["QcCheck รอกลับมาเตรียม", "QcCheck รอ MD", "รอ Qc", "รอกลับมาเตรียม"],
            "วัตถุดิบตรง": ["QcCheck"],
            "เหลือจากไลน์ผลิต": ["เหลือจากไลน์ผลิต"],
        };

        if (!(selectedOption in statusMap)) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: "ตัวเลือกไม่ถูกต้อง" });
        }

        const validStatuses = statusMap[selectedOption];
        const invalidStatusItems = rmResults.recordset.filter(item =>
            !validStatuses.includes(item.rm_status)
        );

        if (invalidStatusItems.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `ไม่ตรงเงื่อนไขรับเข้า ${selectedOption} มีวัตถุดิบที่มีสถานะไม่ตรงกับเงื่อนไข`
            });
        }

        let successfulUpdates = 0;

        for (const item of rmResults.recordset) {
            const { cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id } = item;

            let coldTimeValue = cold_time;
            let pic_time = prep_to_cold_time;
            let ReworkTime = rework_time;
            let MixTime = mix_time;

            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, cold_time ตอนรับ:`, cold_time);
            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ptc_time ตอนรับ:`, prep_to_cold_time);
            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time ตอนรับ:`, rework_time);
            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time ตอนรับ:`, mix_time);

            // เฉพาะกรณีที่ cold_time เป็น null ให้ดึงค่าจาก RawMatGroup
            if (cold_time === null) {
                const rmgResult = await transaction
                    .request()
                    .input("rmfp_id", sql.Int, rmfp_id)
                    .query(`
                        SELECT rmg.cold
                        FROM RMForProd rmf
                        JOIN RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
                        WHERE rmf.rmfp_id = @rmfp_id
                    `);

                if (rmgResult.recordset.length > 0) {
                    coldTimeValue = rmgResult.recordset[0].cold;
                }
            }

            if (mix_time !== null) {
                const mixQuery = await transaction
                    .request()
                    .input("mapping_id", sql.Int, mapping_id)
                    .query(`
                        SELECT FORMAT(mixed_date, 'yyyy-MM-dd HH:mm:ss') AS mixed_date
                        FROM History
                        WHERE mapping_id = @mapping_id AND mixed_date IS NOT NULL
                    `);

                if (mixQuery.recordset.length > 0 && mixQuery.recordset[0].mixed_date) {
                    const mixedDate = new Date(mixQuery.recordset[0].mixed_date);
                    const currentDate = new Date();
                    const timeDiffMinutes = (currentDate - mixedDate) / (1000 * 60);

                    console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก mixed_date`);

                    if (mix_time === 0.00) {
                        const totalMinutesRemaining = -timeDiffMinutes;
                        const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
                        const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
                        MixTime = -1 * (updatedHours + (updatedMinutes / 100));

                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี mix_time เป็น 0.00`);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, MixTime);
                    } else {
                        const isNegative = mix_time < 0;
                        const absValue = Math.abs(mix_time);
                        const hours = Math.floor(absValue);
                        const minutes = Math.round((absValue - hours) * 100);

                        let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
                        const totalMinutesRemaining = totalMinutes - timeDiffMinutes;

                        const isResultNegative = totalMinutesRemaining < 0;
                        const absMinutesRemaining = Math.abs(totalMinutesRemaining);
                        const updatedHours = Math.floor(absMinutesRemaining / 60);
                        const updatedMinutes = Math.floor(absMinutesRemaining % 60);

                        MixTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));

                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time เดิม:`, mix_time);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, MixTime);
                    }

                    MixTime = parseFloat(MixTime.toFixed(2));
                }
            }

            // ตรวจสอบ rework_time และคำนวณเวลาที่เหลือ
            if (rework_time !== null) {
                const reworkQuery = await transaction
                    .request()
                    .input("mapping_id", sql.Int, mapping_id)
                    .query(`
                        SELECT FORMAT(qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date
                        FROM History
                        WHERE mapping_id = @mapping_id AND qc_date IS NOT NULL
                    `);

                if (reworkQuery.recordset.length > 0 && reworkQuery.recordset[0].qc_date) {
                    const qcDate = new Date(reworkQuery.recordset[0].qc_date);
                    const currentDate = new Date();
                    const timeDiffMinutes = (currentDate - qcDate) / (1000 * 60);

                    console.log(`RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก qc_date`);

                    if (rework_time === 0.00) {
                        const totalMinutesRemaining = -timeDiffMinutes;
                        const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
                        const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
                        ReworkTime = -1 * (updatedHours + (updatedMinutes / 100));

                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี rework_time เป็น 0.00`);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, ReworkTime);
                    } else {
                        const isNegative = rework_time < 0;
                        const absValue = Math.abs(rework_time);
                        const hours = Math.floor(absValue);
                        const minutes = Math.round((absValue - hours) * 100);

                        let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
                        const totalMinutesRemaining = totalMinutes - timeDiffMinutes;

                        const isResultNegative = totalMinutesRemaining < 0;
                        const absMinutesRemaining = Math.abs(totalMinutesRemaining);
                        const updatedHours = Math.floor(absMinutesRemaining / 60);
                        const updatedMinutes = Math.floor(absMinutesRemaining % 60);

                        ReworkTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));

                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time เดิม:`, rework_time);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, ReworkTime);
                    }

                    ReworkTime = parseFloat(ReworkTime.toFixed(2));
                }
            } else {
                // กรณี rework_time เป็น null ให้คำนวณ prep_to_cold_time
                if (prep_to_cold_time === null) {
                    const ptcResult = await transaction
                        .request()
                        .input("rmfp_id", sql.Int, rmfp_id)
                        .input("tro_id", sql.VarChar(4), tro_id)
                        .query(`
                            SELECT
                                rmg.prep_to_cold,
                                FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
                                FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date
                            FROM TrolleyRMMapping rmm
                            JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
                            JOIN RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
                            JOIN History htr ON rmm.mapping_id = htr.mapping_id
                            WHERE rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
                        `);

                    if (ptcResult.recordset.length > 0) {
                        const prepToCold = ptcResult.recordset[0].prep_to_cold;
                        const currentDate = new Date();

                        const referenceDate = ptcResult.recordset[0].rmit_date ?
                            new Date(ptcResult.recordset[0].rmit_date) :
                            new Date(ptcResult.recordset[0].cooked_date);
                        const referenceType = ptcResult.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';

                        const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);
                        let remainingTimeHours = prepToCold - (timeDiffMinutes / 60);

                        const hours = Math.floor(remainingTimeHours);
                        const minutes = Math.floor((remainingTimeHours - hours) * 60);

                        pic_time = hours + (minutes / 100);
                        pic_time = parseFloat(pic_time.toFixed(2));

                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold จาก RawMatGroup:`, prepToCold);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
                    }
                } else {
                    const ptcQuery = await transaction
                        .request()
                        .input("rmfp_id", sql.Int, rmfp_id)
                        .input("tro_id", sql.VarChar(4), tro_id)
                        .query(`
                            SELECT
                                FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
                                FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
                                FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
                                FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
                                FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three
                            FROM TrolleyRMMapping rmm
                            JOIN History htr ON rmm.mapping_id = htr.mapping_id
                            WHERE rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
                        `);

                    if (ptcQuery.recordset.length > 0) {
                        const outColdDates = [
                            ptcQuery.recordset[0].out_cold_date_three,
                            ptcQuery.recordset[0].out_cold_date_two,
                            ptcQuery.recordset[0].out_cold_date
                        ].filter(date => date);

                        let referenceDate;
                        let referenceType = '';

                        if (outColdDates.length > 0) {
                            referenceDate = new Date(outColdDates[0]);
                            referenceType = 'out_cold_date';
                        } else {
                            referenceDate = ptcQuery.recordset[0].rmit_date ?
                                new Date(ptcQuery.recordset[0].rmit_date) :
                                new Date(ptcQuery.recordset[0].cooked_date);
                            referenceType = ptcQuery.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';
                        }

                        const currentDate = new Date();
                        const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);

                        console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);

                        if (prep_to_cold_time === 0.00) {
                            const totalMinutesRemaining = -timeDiffMinutes;
                            const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
                            const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
                            pic_time = -1 * (updatedHours + (updatedMinutes / 100));

                            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี prep_to_cold_time เป็น 0.00`);
                            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
                            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, pic_time);
                        } else {
                            const isNegative = prep_to_cold_time < 0;
                            const absValue = Math.abs(prep_to_cold_time);
                            const hours = Math.floor(absValue);
                            const minutes = Math.round((absValue - hours) * 100);

                            let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
                            const totalMinutesRemaining = totalMinutes - timeDiffMinutes;

                            const isResultNegative = totalMinutesRemaining < 0;
                            const absMinutesRemaining = Math.abs(totalMinutesRemaining);
                            const updatedHours = Math.floor(absMinutesRemaining / 60);
                            const updatedMinutes = Math.round(absMinutesRemaining % 60);

                            pic_time = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));

                            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold_time เดิม:`, prep_to_cold_time);
                            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
                            console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
                        }

                        pic_time = parseFloat(pic_time.toFixed(2));
                    }
                }
            }

            console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, cold_time update:`, coldTimeValue);
            console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, prep_to_cold_time:`, pic_time);
            console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, rework_time update:`, ReworkTime);

            // 🔧 แก้ไข: อัปเดต rm_cold_status พร้อมกับ stay_place และ dest ในคำสั่งเดียว
            const updateResult = await transaction
                .request()
                .input("rmfp_id", sql.Int, rmfp_id)
                .input("tro_id", sql.VarChar(4), tro_id)
                .input("rm_cold_status", sql.VarChar, selectedOption)
                .input("stay_place", sql.VarChar, "เข้าห้องเย็น")
                .input("dest", sql.VarChar, "ห้องเย็น")
                .input("cold_time", sql.Float, coldTimeValue)
                .input("prep_to_cold_time", sql.Float, pic_time)
                .input("rework_time", sql.Float, ReworkTime)
                .input("mix_time", sql.Float, MixTime)
                .query(`
                    UPDATE TrolleyRMMapping
                    SET
                        rm_cold_status = @rm_cold_status,
                        stay_place     = @stay_place,
                        dest           = @dest,
                        cold_time      = @cold_time,
                        prep_to_cold_time = @prep_to_cold_time,
                        rework_time    = @rework_time,
                        mix_time       = @mix_time
                    WHERE
                        tro_id = @tro_id AND rmfp_id = @rmfp_id
                `);

            if (updateResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `ไม่สามารถอัปเดตข้อมูลวัตถุดิบ RMFP ID: ${rmfp_id} ได้`
                });
            }

            successfulUpdates++;
        }

        // ตรวจสอบว่าอัปเดตครบทุก item หรือไม่
        if (successfulUpdates !== rmResults.recordset.length) {
            await transaction.rollback();
            console.error(`❌ Partial update failed: updated=${successfulUpdates}, total=${rmResults.recordset.length}`);
            return res.status(400).json({
                success: false,
                message: `อัปเดตข้อมูลไม่ครบ อัปเดตสำเร็จ ${successfulUpdates}/${rmResults.recordset.length} รายการ`
            });
        }

        // ✅ Slot update สำเร็จแล้ว (อัปเดต BEFORE TrolleyRMMapping loop)
        console.log(`✅ All TrolleyRMMapping records updated successfully: tro_id=${tro_id}, count=${successfulUpdates}`);

        // ✅ STEP 3: อัปเดตประวัติการเข้าห้องเย็น
        const mappingResults = await transaction.request()
            .input("tro_id", sql.VarChar(4), tro_id)
            .query("SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");

        if (mappingResults.recordset.length > 0) {
            let historyUpdateCount = 0;

            for (const row of mappingResults.recordset) {
                const mapping_id = row.mapping_id;

                const historyUpdateResult = await transaction.request()
                    .input("mapping_id", sql.Int, mapping_id)
                    .query(`
                        UPDATE History
                        SET
                            come_cold_date =
                                CASE
                                    WHEN come_cold_date IS NULL THEN GETDATE()
                                    ELSE come_cold_date
                                END,
                            come_cold_date_two =
                                CASE
                                    WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NULL THEN GETDATE()
                                    ELSE come_cold_date_two
                                END,
                            come_cold_date_three =
                                CASE
                                    WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NOT NULL AND come_cold_date_three IS NULL THEN GETDATE()
                                    ELSE come_cold_date_three
                                END
                        WHERE mapping_id = @mapping_id
                    `);

                if (historyUpdateResult.rowsAffected[0] > 0) {
                    historyUpdateCount++;
                }
            }

            if (historyUpdateCount !== mappingResults.recordset.length) {
                await transaction.rollback();
                console.error(`❌ History update incomplete: updated=${historyUpdateCount}, total=${mappingResults.recordset.length}`);
                return res.status(400).json({
                    success: false,
                    message: `ไม่สามารถอัปเดตประวัติการเข้าห้องเย็นได้ครบทุกรายการ (อัปเดตสำเร็จ ${historyUpdateCount}/${mappingResults.recordset.length})`
                });
            }
            console.log(`✅ History updated successfully: tro_id=${tro_id}, count=${historyUpdateCount}`);
        }

        // ✅ Commit transaction เมื่อทุกอย่างสำเร็จ
        await transaction.commit();
        console.log(`✅ Transaction committed successfully: tro_id=${tro_id}, cs_id=${cs_id}, slot_id=${slot_id}`);

        // ส่ง socket event หลัง commit สำเร็จ
        io.to('saveRMForProdRoom').emit('dataUpdated', []);

        return res.status(200).json({ success: true, message: `รับเข้า ${selectedOption}` });

    } catch (err) {
        try {
            await transaction.rollback();
        } catch (rollbackErr) {
            console.error("Rollback error", rollbackErr);
        }

        console.error("SQL error", err);
        res.status(500).json({ success: false, error: err.message });
    }
});


    // router.put("/cold/checkin/update/Trolley", async (req, res) => {
    //     const { tro_id, cs_id, slot_id, selectedOption } = req.body;

    //     const pool = await connectToDatabase();
    //     const transaction = pool.transaction();

    //     try {
    //         // เริ่ม Transaction
    //         await transaction.begin();

    //         console.log("=== 🔍 START DEBUG ===");
    //         console.log("Input params:", { tro_id, cs_id, slot_id, selectedOption });

    //         // ✅ ขั้นตอนที่ 1: Lock Slot ตั้งแต่ต้น + ตรวจสอบว่าช่องว่างหรือไม่
    //         const slotLockResult = await transaction
    //             .request()
    //             .input("cs_id", sql.Int, cs_id)
    //             .input("slot_id", sql.VarChar, slot_id)
    //             .query(`
    //                 SELECT 
    //                     tro_id,
    //                     slot_id,
    //                     LEN(slot_id) as slot_id_len,
    //                     LEN(RTRIM(slot_id)) as slot_id_trimmed_len
    //                 FROM Slot WITH (UPDLOCK, HOLDLOCK)
    //                 WHERE cs_id = @cs_id AND RTRIM(slot_id) = RTRIM(@slot_id)
    //             `);

    //         console.log("🔒 Slot Lock Result:", slotLockResult.recordset);

    //         if (slotLockResult.recordset.length === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ 
    //                 success: false, 
    //                 message: "ไม่พบช่องเก็บนี้ในระบบ" 
    //             });
    //         }

    //         const currentSlotTroId = slotLockResult.recordset[0].tro_id;

    //         console.log("Current slot tro_id:", currentSlotTroId);

    //         // ตรวจสอบว่าช่องว่างหรือไม่ (ต้องเป็น null หรือ 'rsrv' เท่านั้น)
    //         if (currentSlotTroId !== null && currentSlotTroId !== 'rsrv') {
    //             await transaction.rollback();
    //             return res.status(400).json({ 
    //                 success: false, 
    //                 message: "ช่องเก็บนี้ไม่ว่าง ถูกใช้งานโดยรถเข็น: " + currentSlotTroId
    //             });
    //         }

    //         // ตรวจสอบว่ารถเข็นมีอยู่ในระบบหรือไม่
    //         const trolleyResult = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT tro_status, rsrv_timestamp FROM Trolley WHERE tro_id = @tro_id");

    //         if (trolleyResult.recordset.length === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ 
    //                 success: false, 
    //                 message: "รถเข็นไม่พร้อมใช้งาน" 
    //             });
    //         }

    //         // ตรวจสอบว่ารถเข็นอยู่ในห้องเย็นอยู่แล้วหรือไม่
    //         const trolleyInColdResult = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT cs_id, slot_id FROM Slot WHERE tro_id = @tro_id");

    //         if (trolleyInColdResult.recordset.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `รถเข็นนี้อยู่ในห้องเย็นอยู่แล้ว (ช่อง ${trolleyInColdResult.recordset[0].slot_id})`
    //             });
    //         }

    //         const tro_status = trolleyResult.recordset[0].tro_status;
    //         const rsrv_timestamp = trolleyResult.recordset[0].rsrv_timestamp;

    //         console.log("tro_status", tro_status);
    //         console.log("rsrv_timestamp", rsrv_timestamp);

    //         // ========== กรณีรถเข็นว่าง ==========
    //         if (selectedOption === "รถเข็นว่าง") {
    //             // ตรวจสอบสถานะรถเข็น
    //             if (tro_status === false) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ 
    //                     success: false, 
    //                     message: "รถเข็นคันนี้ถูกใช้งานแล้ว" 
    //                 });
    //             }

    //             if (rsrv_timestamp === null) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
    //                 });
    //             }

    //             if (tro_status === 1 || tro_status === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: "ไม่สามารถจองรถเข็นได้เนื่องจากเลยเวลาดำเนินการ 5 นาที"
    //                 });
    //             }

    //             console.log("=== 🔄 UPDATING SLOT (รถเข็นว่าง) ===");
    //             console.log("Before update - tro_id:", tro_id, "cs_id:", cs_id, "slot_id:", slot_id);

    //             // 🔥 ขั้นตอนที่ 2: UPDATE Slot ด้วย check condition ในคำสั่งเดียว
    //             const slotUpdateResult = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .input("cs_id", sql.Int, cs_id)
    //                 .input("slot_id", sql.VarChar, slot_id)
    //                 .query(`
    //                     UPDATE Slot 
    //                     SET tro_id = @tro_id, reserved_at = NULL 
    //                     WHERE cs_id = @cs_id 
    //                       AND RTRIM(slot_id) = RTRIM(@slot_id)
    //                       AND (tro_id IS NULL OR tro_id = 'rsrv')
    //                 `);

    //             console.log("✅ Slot update rows affected:", slotUpdateResult.rowsAffected[0]);

    //             // ตรวจสอบว่า UPDATE สำเร็จหรือไม่
    //             if (slotUpdateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ 
    //                     success: false, 
    //                     message: "ช่องเก็บไม่ว่าง หรือถูกใช้งานไปแล้ว" 
    //                 });
    //             }

    //             // 🔍 ตรวจสอบว่า UPDATE จริงๆ หรือไม่
    //             const verifySlot = await transaction
    //                 .request()
    //                 .input("cs_id", sql.Int, cs_id)
    //                 .input("slot_id", sql.VarChar, slot_id)
    //                 .query(`
    //                     SELECT tro_id, reserved_at 
    //                     FROM Slot 
    //                     WHERE cs_id = @cs_id AND RTRIM(slot_id) = RTRIM(@slot_id)
    //                 `);

    //             console.log("🔍 Verified slot after update:", verifySlot.recordset);

    //             if (!verifySlot.recordset[0] || verifySlot.recordset[0].tro_id !== tro_id) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ 
    //                     success: false, 
    //                     message: "การอัปเดต Slot ไม่สำเร็จ",
    //                     debug: {
    //                         expected: tro_id,
    //                         actual: verifySlot.recordset[0]?.tro_id
    //                     }
    //                 });
    //             }

    //             // อัพเดต tro_status เป็น 0 ในตาราง Trolley
    //             const trolleyUpdateResult = await transaction
    //                 .request()
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .query("UPDATE Trolley SET tro_status = 0, rsrv_timestamp = null WHERE tro_id = @tro_id");

    //             if (trolleyUpdateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({ 
    //                     success: false, 
    //                     message: "ไม่สามารถอัปเดตสถานะรถเข็นได้" 
    //                 });
    //             }

    //             console.log("=== ✅ COMMITTING TRANSACTION (รถเข็นว่าง) ===");

    //             // Commit transaction
    //             await transaction.commit();

    //             console.log("=== 🎉 SUCCESS (รถเข็นว่าง) ===");

    //             return res.status(200).json({ 
    //                 success: true, 
    //                 message: "รับเข้ารถเข็นว่าง" 
    //             });
    //         }

    //         // ========== กรณีรถเข็นมีวัตถุดิบ ==========

    //         // ตรวจสอบข้อมูลวัตถุดิบใน TrolleyRMMapping
    //         const rmResults = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query(`
    //                 SELECT dest, rmm_line_name, rm_status, cold_time, prep_to_cold_time, 
    //                        rework_time, mix_time, rmfp_id, mapping_id 
    //                 FROM TrolleyRMMapping 
    //                 WHERE tro_id = @tro_id
    //             `);

    //         if (rmResults.recordset.length === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ 
    //                 success: false, 
    //                 message: "ไม่พบวัตถุดิบในรถเข็นนี้" 
    //             });
    //         }

    //         console.log(`Found ${rmResults.recordset.length} items in trolley`);

    //         // ตรวจสอบว่าทุกวัตถุดิบมีปลายทางเป็น "เข้าห้องเย็น"
    //         const invalidDestItems = rmResults.recordset.filter(item => item.dest !== "เข้าห้องเย็น");
    //         if (invalidDestItems.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: "มีวัตถุดิบในรถเข็นที่ไม่ได้เตรียมเข้าห้องเย็น"
    //             });
    //         }

    //         // ตรวจสอบสถานะของวัตถุดิบตามเงื่อนไขที่เลือก
    //         const statusMap = {
    //             "วัตถุดิบรอแก้ไข": ["รอแก้ไข"],
    //             "วัตถุดิบรับฝาก": ["QcCheck รอกลับมาเตรียม", "QcCheck รอ MD", "รอ Qc", "รอกลับมาเตรียม"],
    //             "วัตถุดิบตรง": ["QcCheck"],
    //             "เหลือจากไลน์ผลิต": ["เหลือจากไลน์ผลิต"],
    //         };

    //         if (!(selectedOption in statusMap)) {
    //             await transaction.rollback();
    //             return res.status(400).json({ 
    //                 success: false, 
    //                 message: "ตัวเลือกไม่ถูกต้อง" 
    //             });
    //         }

    //         const validStatuses = statusMap[selectedOption];
    //         const invalidStatusItems = rmResults.recordset.filter(item =>
    //             !validStatuses.includes(item.rm_status)
    //         );

    //         if (invalidStatusItems.length > 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `ไม่ตรงเงื่อนไขรับเข้า ${selectedOption} มีวัตถุดิบที่มีสถานะไม่ตรงกับเงื่อนไข`
    //             });
    //         }

    //         console.log("=== 🔄 UPDATING SLOT (มีวัตถุดิบ) ===");
    //         console.log("Before update - tro_id:", tro_id, "cs_id:", cs_id, "slot_id:", slot_id);

    //         // 🔥 ขั้นตอนที่ 2: UPDATE Slot ก่อน UPDATE TrolleyRMMapping
    //         const slotUpdateResult = await transaction
    //             .request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .input("cs_id", sql.Int, cs_id)
    //             .input("slot_id", sql.VarChar, slot_id)
    //             .query(`
    //                 UPDATE Slot 
    //                 SET tro_id = @tro_id, reserved_at = NULL 
    //                 WHERE cs_id = @cs_id 
    //                   AND RTRIM(slot_id) = RTRIM(@slot_id)
    //                   AND (tro_id IS NULL OR tro_id = 'rsrv')
    //             `);

    //         console.log("✅ Slot update rows affected:", slotUpdateResult.rowsAffected[0]);

    //         // ตรวจสอบว่า UPDATE Slot สำเร็จหรือไม่
    //         if (slotUpdateResult.rowsAffected[0] === 0) {
    //             await transaction.rollback();
    //             return res.status(400).json({ 
    //                 success: false, 
    //                 message: "ช่องเก็บไม่ว่าง หรือถูกใช้งานไปแล้ว" 
    //             });
    //         }

    //         // 🔍 ตรวจสอบว่า UPDATE จริงๆ หรือไม่
    //         const verifySlot = await transaction
    //             .request()
    //             .input("cs_id", sql.Int, cs_id)
    //             .input("slot_id", sql.VarChar, slot_id)
    //             .query(`
    //                 SELECT tro_id, reserved_at 
    //                 FROM Slot 
    //                 WHERE cs_id = @cs_id AND RTRIM(slot_id) = RTRIM(@slot_id)
    //             `);

    //         console.log("🔍 Verified slot after update:", verifySlot.recordset);

    //         if (!verifySlot.recordset[0] || verifySlot.recordset[0].tro_id !== tro_id) {
    //             await transaction.rollback();
    //             return res.status(400).json({ 
    //                 success: false, 
    //                 message: "การอัปเดต Slot ไม่สำเร็จ",
    //                 debug: {
    //                     expected: tro_id,
    //                     actual: verifySlot.recordset[0]?.tro_id
    //                 }
    //             });
    //         }

    //         // ขั้นตอนที่ 3: UPDATE TrolleyRMMapping
    //         let successfulUpdates = 0;

    //         for (const item of rmResults.recordset) {
    //             const { cold_time, prep_to_cold_time, rework_time, mix_time, rmfp_id, mapping_id } = item;

    //             let coldTimeValue = cold_time;
    //             let pic_time = prep_to_cold_time;
    //             let ReworkTime = rework_time;
    //             let MixTime = mix_time;

    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, cold_time ตอนรับ:`, cold_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ptc_time ตอนรับ:`, prep_to_cold_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time ตอนรับ:`, rework_time);
    //             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time ตอนรับ:`, mix_time);

    //             // เฉพาะกรณีที่ cold_time เป็น null ให้ดึงค่าจาก RawMatGroup
    //             if (cold_time === null) {
    //                 const rmgResult = await transaction
    //                     .request()
    //                     .input("rmfp_id", sql.Int, rmfp_id)
    //                     .query(`
    //                         SELECT rmg.cold
    //                         FROM RMForProd rmf
    //                         JOIN RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //                         WHERE rmf.rmfp_id = @rmfp_id
    //                     `);

    //                 if (rmgResult.recordset.length > 0) {
    //                     coldTimeValue = rmgResult.recordset[0].cold;
    //                 }
    //             }

    //             // คำนวณ mix_time
    //             if (mix_time !== null) {
    //                 const mixQuery = await transaction
    //                     .request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                         SELECT FORMAT(mixed_date, 'yyyy-MM-dd HH:mm:ss') AS mixed_date
    //                         FROM History
    //                         WHERE mapping_id = @mapping_id AND mixed_date IS NOT NULL
    //                     `);

    //                 if (mixQuery.recordset.length > 0 && mixQuery.recordset[0].mixed_date) {
    //                     const mixedDate = new Date(mixQuery.recordset[0].mixed_date);
    //                     const currentDate = new Date();
    //                     const timeDiffMinutes = (currentDate - mixedDate) / (1000 * 60);

    //                     console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก mixed_date`);

    //                     if (mix_time === 0.00) {
    //                         const totalMinutesRemaining = -timeDiffMinutes;
    //                         const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                         const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                         MixTime = -1 * (updatedHours + (updatedMinutes / 100));

    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี mix_time เป็น 0.00`);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, MixTime);
    //                     } else {
    //                         const isNegative = mix_time < 0;
    //                         const absValue = Math.abs(mix_time);
    //                         const hours = Math.floor(absValue);
    //                         const minutes = Math.round((absValue - hours) * 100);

    //                         let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                         const totalMinutesRemaining = totalMinutes - timeDiffMinutes;

    //                         const isResultNegative = totalMinutesRemaining < 0;
    //                         const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                         const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                         const updatedMinutes = Math.floor(absMinutesRemaining % 60);

    //                         MixTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));

    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, mix_time เดิม:`, mix_time);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, MixTime);
    //                     }

    //                     MixTime = parseFloat(MixTime.toFixed(2));
    //                 }
    //             }

    //             // คำนวณ rework_time
    //             if (rework_time !== null) {
    //                 const reworkQuery = await transaction
    //                     .request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                         SELECT FORMAT(qc_date, 'yyyy-MM-dd HH:mm:ss') AS qc_date
    //                         FROM History
    //                         WHERE mapping_id = @mapping_id AND qc_date IS NOT NULL
    //                     `);

    //                 if (reworkQuery.recordset.length > 0 && reworkQuery.recordset[0].qc_date) {
    //                     const qcDate = new Date(reworkQuery.recordset[0].qc_date);
    //                     const currentDate = new Date();
    //                     const timeDiffMinutes = (currentDate - qcDate) / (1000 * 60);

    //                     console.log(`RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก qc_date`);

    //                     if (rework_time === 0.00) {
    //                         const totalMinutesRemaining = -timeDiffMinutes;
    //                         const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                         const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                         ReworkTime = -1 * (updatedHours + (updatedMinutes / 100));

    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี rework_time เป็น 0.00`);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, ReworkTime);
    //                     } else {
    //                         const isNegative = rework_time < 0;
    //                         const absValue = Math.abs(rework_time);
    //                         const hours = Math.floor(absValue);
    //                         const minutes = Math.round((absValue - hours) * 100);

    //                         let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                         const totalMinutesRemaining = totalMinutes - timeDiffMinutes;

    //                         const isResultNegative = totalMinutesRemaining < 0;
    //                         const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                         const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                         const updatedMinutes = Math.floor(absMinutesRemaining % 60);

    //                         ReworkTime = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));

    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, rework_time เดิม:`, rework_time);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, ReworkTime);
    //                     }

    //                     ReworkTime = parseFloat(ReworkTime.toFixed(2));
    //                 }
    //             } else {
    //                 // กรณี rework_time เป็น null ให้คำนวณ prep_to_cold_time
    //                 if (prep_to_cold_time === null) {
    //                     const ptcResult = await transaction
    //                         .request()
    //                         .input("rmfp_id", sql.Int, rmfp_id)
    //                         .input("tro_id", sql.VarChar(4), tro_id)
    //                         .query(`
    //                             SELECT
    //                                 rmg.prep_to_cold,
    //                                 FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //                                 FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date
    //                             FROM TrolleyRMMapping rmm
    //                             JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
    //                             JOIN RawMatGroup rmg ON rmg.rm_group_id = rmf.rm_group_id
    //                             JOIN History htr ON rmm.mapping_id = htr.mapping_id
    //                             WHERE rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    //                         `);

    //                     if (ptcResult.recordset.length > 0) {
    //                         const prepToCold = ptcResult.recordset[0].prep_to_cold;
    //                         const currentDate = new Date();

    //                         const referenceDate = ptcResult.recordset[0].rmit_date ?
    //                             new Date(ptcResult.recordset[0].rmit_date) :
    //                             new Date(ptcResult.recordset[0].cooked_date);
    //                         const referenceType = ptcResult.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';

    //                         const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);
    //                         let remainingTimeHours = prepToCold - (timeDiffMinutes / 60);

    //                         const hours = Math.floor(remainingTimeHours);
    //                         const minutes = Math.floor((remainingTimeHours - hours) * 60);

    //                         pic_time = hours + (minutes / 100);
    //                         pic_time = parseFloat(pic_time.toFixed(2));

    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold จาก RawMatGroup:`, prepToCold);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                     }
    //                 } else {
    //                     const ptcQuery = await transaction
    //                         .request()
    //                         .input("rmfp_id", sql.Int, rmfp_id)
    //                         .input("tro_id", sql.VarChar(4), tro_id)
    //                         .query(`
    //                             SELECT
    //                                 FORMAT(htr.cooked_date, 'yyyy-MM-dd HH:mm:ss') AS cooked_date,
    //                                 FORMAT(htr.rmit_date, 'yyyy-MM-dd HH:mm:ss') AS rmit_date,
    //                                 FORMAT(htr.out_cold_date, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date,
    //                                 FORMAT(htr.out_cold_date_two, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_two,
    //                                 FORMAT(htr.out_cold_date_three, 'yyyy-MM-dd HH:mm:ss') AS out_cold_date_three
    //                             FROM TrolleyRMMapping rmm
    //                             JOIN History htr ON rmm.mapping_id = htr.mapping_id
    //                             WHERE rmm.rmfp_id = @rmfp_id AND rmm.tro_id = @tro_id
    //                         `);

    //                     if (ptcQuery.recordset.length > 0) {
    //                         const outColdDates = [
    //                             ptcQuery.recordset[0].out_cold_date_three,
    //                             ptcQuery.recordset[0].out_cold_date_two,
    //                             ptcQuery.recordset[0].out_cold_date
    //                         ].filter(date => date);

    //                         let referenceDate;
    //                         let referenceType = '';

    //                         if (outColdDates.length > 0) {
    //                             referenceDate = new Date(outColdDates[0]);
    //                             referenceType = 'out_cold_date';
    //                         } else {
    //                             referenceDate = ptcQuery.recordset[0].rmit_date ?
    //                                 new Date(ptcQuery.recordset[0].rmit_date) :
    //                                 new Date(ptcQuery.recordset[0].cooked_date);
    //                             referenceType = ptcQuery.recordset[0].rmit_date ? 'rmit_date' : 'cooked_date';
    //                         }

    //                         const currentDate = new Date();
    //                         const timeDiffMinutes = (currentDate - referenceDate) / (1000 * 60);

    //                         console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, ใช้เวลาอ้างอิงจาก: ${referenceType}`);

    //                         if (prep_to_cold_time === 0.00) {
    //                             const totalMinutesRemaining = -timeDiffMinutes;
    //                             const updatedHours = Math.floor(Math.abs(totalMinutesRemaining) / 60);
    //                             const updatedMinutes = Math.floor(Math.abs(totalMinutesRemaining) % 60);
    //                             pic_time = -1 * (updatedHours + (updatedMinutes / 100));

    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, กรณี prep_to_cold_time เป็น 0.00`);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลือ (ติดลบ):`, pic_time);
    //                         } else {
    //                             const isNegative = prep_to_cold_time < 0;
    //                             const absValue = Math.abs(prep_to_cold_time);
    //                             const hours = Math.floor(absValue);
    //                             const minutes = Math.round((absValue - hours) * 100);

    //                             let totalMinutes = (isNegative ? -1 : 1) * (hours * 60 + minutes);
    //                             const totalMinutesRemaining = totalMinutes - timeDiffMinutes;

    //                             const isResultNegative = totalMinutesRemaining < 0;
    //                             const absMinutesRemaining = Math.abs(totalMinutesRemaining);
    //                             const updatedHours = Math.floor(absMinutesRemaining / 60);
    //                             const updatedMinutes = Math.round(absMinutesRemaining % 60);

    //                             pic_time = (isResultNegative ? -1 : 1) * (updatedHours + (updatedMinutes / 100));

    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, prep_to_cold_time เดิม:`, prep_to_cold_time);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่ผ่านไปแล้ว (นาที):`, timeDiffMinutes);
    //                             console.log(`MP ID : ${mapping_id} ,RMFP ID: ${rmfp_id}, เวลาที่เหลืออยู่ (ชั่วโมง.นาที):`, pic_time);
    //                         }

    //                         pic_time = parseFloat(pic_time.toFixed(2));
    //                     }
    //                 }
    //             }

    //             console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, cold_time update:`, coldTimeValue);
    //             console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, prep_to_cold_time:`, pic_time);
    //             console.log(`MP ID ${mapping_id}, RMFP ID: ${rmfp_id}, rework_time update:`, ReworkTime);

    //             // อัปเดตข้อมูลในตาราง TrolleyRMMapping
    //             const updateResult = await transaction
    //                 .request()
    //                 .input("rmfp_id", sql.Int, rmfp_id)
    //                 .input("tro_id", sql.VarChar(4), tro_id)
    //                 .input("selectedOption", sql.VarChar, selectedOption)
    //                 .input("stay_place", sql.VarChar, "เข้าห้องเย็น")
    //                 .input("dest", sql.VarChar, "ห้องเย็น")
    //                 .input("cold_time", sql.Float, coldTimeValue)
    //                 .input("prep_to_cold_time", sql.Float, pic_time)
    //                 .input("rework_time", sql.Float, ReworkTime)
    //                 .input("mix_time", sql.Float, MixTime)
    //                 .query(`
    //                     UPDATE TrolleyRMMapping
    //                     SET
    //                         rm_cold_status = @selectedOption,
    //                         stay_place = @stay_place,
    //                         dest = @dest,
    //                         cold_time = @cold_time,
    //                         prep_to_cold_time = @prep_to_cold_time,
    //                         rework_time = @rework_time,
    //                         mix_time = @mix_time
    //                     WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id
    //                 `);

    //             if (updateResult.rowsAffected[0] === 0) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `ไม่สามารถอัปเดตข้อมูลวัตถุดิบ RMFP ID: ${rmfp_id} ได้`
    //                 });
    //             }

    //             successfulUpdates++;
    //         }

    //         // ตรวจสอบว่าอัปเดตครบทุก item หรือไม่
    //         if (successfulUpdates !== rmResults.recordset.length) {
    //             await transaction.rollback();
    //             return res.status(400).json({
    //                 success: false,
    //                 message: `อัปเดตข้อมูลไม่ครบ อัปเดตสำเร็จ ${successfulUpdates}/${rmResults.recordset.length} รายการ`
    //             });
    //         }

    //         // ขั้นตอนที่ 4: อัปเดตประวัติการเข้าห้องเย็น
    //         const mappingResults = await transaction.request()
    //             .input("tro_id", sql.VarChar(4), tro_id)
    //             .query("SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id");

    //         if (mappingResults.recordset.length > 0) {
    //             let historyUpdateCount = 0;

    //             for (const row of mappingResults.recordset) {
    //                 const mapping_id = row.mapping_id;

    //                 const historyUpdateResult = await transaction.request()
    //                     .input("mapping_id", sql.Int, mapping_id)
    //                     .query(`
    //                         UPDATE History
    //                         SET
    //                           come_cold_date =
    //                             CASE
    //                               WHEN come_cold_date IS NULL THEN GETDATE()
    //                               ELSE come_cold_date
    //                             END,
    //                           come_cold_date_two =
    //                             CASE
    //                               WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NULL THEN GETDATE()
    //                               ELSE come_cold_date_two
    //                             END,
    //                           come_cold_date_three =
    //                             CASE
    //                               WHEN come_cold_date IS NOT NULL AND come_cold_date_two IS NOT NULL AND come_cold_date_three IS NULL THEN GETDATE()
    //                               ELSE come_cold_date_three
    //                             END
    //                         WHERE mapping_id = @mapping_id
    //                     `);

    //                 if (historyUpdateResult.rowsAffected[0] > 0) {
    //                     historyUpdateCount++;
    //                 }
    //             }

    //             // ตรวจสอบว่าอัปเดต History ครบหรือไม่
    //             if (historyUpdateCount !== mappingResults.recordset.length) {
    //                 await transaction.rollback();
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: `ไม่สามารถอัปเดตประวัติการเข้าห้องเย็นได้ครบทุกรายการ (อัปเดตสำเร็จ ${historyUpdateCount}/${mappingResults.recordset.length})`
    //                 });
    //             }
    //         }

    //         console.log("=== ✅ COMMITTING TRANSACTION ===");

    //         // Commit transaction เมื่อทุกอย่างสำเร็จ
    //         await transaction.commit();

    //         console.log("=== 🎉 SUCCESS ===");

    //         // ส่ง socket event หลัง commit สำเร็จ
    //         io.to('saveRMForProdRoom').emit('dataUpdated', []);

    //         return res.status(200).json({ 
    //             success: true, 
    //             message: `รับเข้า ${selectedOption}` 
    //         });

    //     } catch (err) {
    //         // Rollback ถ้าเกิด error ใดๆ
    //         try {
    //             await transaction.rollback();
    //         } catch (rollbackErr) {
    //             console.error("Rollback error", rollbackErr);
    //         }

    //         console.error("SQL error", err);
    //         res.status(500).json({ success: false, error: err.message });
    //     }
    // });


    // router.put("/coldstorage/moveRawmatintolley", async (req, res) => {
    //     try {
    //         console.log("Raw Request Body:", req.body);
    //         const { tro_id, new_tro_id, weight, slot_id, rmfp_id } = req.body;

    //         // ตรวจสอบข้อมูลอย่างละเอียด
    //         if (!tro_id || !new_tro_id || !weight || !slot_id || !rmfp_id) {
    //             console.log("❌ Missing fields:", { tro_id, new_tro_id, weight, slot_id, rmfp_id });
    //             return res.status(400).json({
    //                 error: "Missing required fields",
    //                 details: { tro_id, new_tro_id, weight, slot_id, rmfp_id }
    //             });
    //         }

    //         // แปลงข้อมูลให้เป็นรูปแบบที่ถูกต้อง
    //         const weightNum = parseFloat(weight);
    //         if (isNaN(weightNum) || weightNum <= 0) {
    //             console.log(`❌ น้ำหนักไม่ถูกต้อง: ${weight}`);
    //             return res.status(400).json({ error: "Weight must be a positive number" });
    //         }

    //         // เชื่อมต่อฐานข้อมูล
    //         const pool = await connectToDatabase();
    //         if (!pool) {
    //             console.log("❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
    //             return res.status(500).json({ error: "Database connection failed" });
    //         }

    //         // ตรวจสอบว่ารถเข็นปลายทางมีอยู่จริง
    //         const checkDestTrolley = await pool.request()
    //             .input("tro_id", new_tro_id)
    //             .query(`SELECT tro_id FROM Trolley WHERE tro_id = @tro_id`);

    //         if (checkDestTrolley.recordset.length === 0) {
    //             console.log(`❌ ไม่พบรถเข็นปลายทาง: ${new_tro_id}`);
    //             return res.status(404).json({ error: "Destination trolley not found", details: { new_tro_id } });
    //         }

    //         // ดึงข้อมูลรถเข็นเก่าโดยใช้ rmfp_id 
    //         const result = await pool.request()
    //             .input("tro_id", tro_id)
    //             .input("rmfp_id", rmfp_id)
    //             .query(`
    //                 SELECT mapping_id, tro_id, rmfp_id, batch_id, tro_production_id, 
    //                     process_id, qc_id, weight_in_trolley, tray_count, weight_per_tray, 
    //                     weight_RM, level_eu, prep_to_cold_time, cold_time, rm_status, 
    //                     rm_cold_status, stay_place, dest, mix_code, prod_mix, 
    //                     allocation_date, removal_date, status, production_batch, created_by,rmm_line_name
    //                 FROM TrolleyRMMapping
    //                 WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id
    //             `);

    //         if (result.recordset.length === 0) {
    //             console.log(`❌ ไม่พบวัตถุดิบ rmfp_id: ${rmfp_id} ในรถเข็น ${tro_id}`);
    //             return res.status(404).json({
    //                 error: "Raw material not found in the trolley",
    //                 details: { tro_id, rmfp_id }
    //             });
    //         }

    //         const sourceRecord = result.recordset[0];
    //         const {
    //             tray_count: existingTrayCount,
    //             weight_RM: currentTotalWeight,
    //             mapping_id: sourceMapping_id
    //         } = sourceRecord;

    //         // ตรวจสอบน้ำหนัก
    //         if (currentTotalWeight < weightNum) {
    //             console.log(`❌ น้ำหนักไม่เพียงพอ: มี ${currentTotalWeight}, ต้องการย้าย ${weightNum}`);
    //             return res.status(400).json({
    //                 error: "Not enough weight in the trolley",
    //                 details: { available: currentTotalWeight, requested: weightNum }
    //             });
    //         }

    //         // คำนวณจำนวนถาดที่จะย้าย (สัดส่วนเทียบกับน้ำหนักทั้งหมด)
    //         const weightRatio = weightNum / currentTotalWeight;
    //         const traysToMove = Math.ceil(existingTrayCount * weightRatio);
    //         console.log(`ℹ️ คำนวณจำนวนถาด: ${existingTrayCount} x ${weightRatio.toFixed(2)} = ${traysToMove}`);

    //         // ตรวจสอบจำนวนถาด
    //         if (traysToMove > existingTrayCount) {
    //             console.log(`❌ จำนวนถาดไม่เพียงพอ: มี ${existingTrayCount}, ต้องการ ${traysToMove}`);
    //             return res.status(400).json({
    //                 error: "Not enough trays in the trolley",
    //                 details: { available: existingTrayCount, required: traysToMove }
    //             });
    //         }

    //         try {
    //             // เริ่มทำ Transaction
    //             const transaction = new sql.Transaction(pool);
    //             await transaction.begin();

    //             try {
    //                 // ดึงข้อมูลประวัติจากตาราง History สำหรับรายการต้นทาง
    //                 const historyResult = await pool.request()
    //                     .input("mapping_id", sourceMapping_id)
    //                     .query(`
    //                         SELECT * 
    //                         FROM History
    //                         WHERE mapping_id = @mapping_id
    //                     `);

    //                 if (historyResult.recordset.length === 0) {
    //                     throw new Error(`History record not found for mapping_id: ${sourceMapping_id}`);
    //                 }

    //                 const historyData = historyResult.recordset[0];
    //                 const currentDateTime = new Date().toISOString();
    //                 const currentUser = req.user?.username || 'system'; // ให้เก็บข้อมูลผู้ใช้ถ้ามี

    //                 // 1. ลดน้ำหนักและจำนวนถาดจากรถเข็นต้นทาง
    //                 await pool.request()
    //                     .input("tro_id", tro_id)
    //                     .input("rmfp_id", rmfp_id)
    //                     .input("weight_RM", weightNum)
    //                     .input("tray_count_decrease", traysToMove)
    //                     .input("updated_at", currentDateTime)
    //                     .query(`
    //                         UPDATE TrolleyRMMapping 
    //                         SET weight_RM = weight_RM - @weight_RM,
    //                             tray_count = tray_count - @tray_count_decrease,
    //                             updated_at = @updated_at
    //                         WHERE tro_id = @tro_id 
    //                           AND rmfp_id = @rmfp_id
    //                           AND weight_RM >= @weight_RM
    //                           AND tray_count >= @tray_count_decrease
    //                     `);

    //                 console.log(`✅ ลดน้ำหนัก ${weightNum}kg และจำนวนถาด ${traysToMove} ถาด จากรถเข็น ${tro_id}`);

    //                 // 2. ลดน้ำหนักจากคอลัมน์ weight_in_trolley ของรถเข็นต้นทาง
    //                 await pool.request()
    //                     .input("tro_id", tro_id)
    //                     .input("weight_RM", weightNum)
    //                     .input("updated_at", currentDateTime)
    //                     .query(`
    //                         UPDATE TrolleyRMMapping
    //                         SET weight_in_trolley = weight_in_trolley - @weight_RM,
    //                             updated_at = @updated_at
    //                         WHERE tro_id = @tro_id 
    //                           AND weight_in_trolley >= @weight_RM
    //                     `);

    //                 console.log(`✅ ลดน้ำหนักรวมรถเข็น ${tro_id} ลง ${weightNum}kg`);

    //                 // 3. ตรวจสอบว่ามีรายการวัตถุดิบนี้ในรถเข็นปลายทางอยู่แล้วหรือไม่
    //                 const existingResult = await pool.request()
    //                     .input("tro_id", new_tro_id)
    //                     .input("rmfp_id", rmfp_id)
    //                     .query(`
    //                         SELECT * 
    //                         FROM TrolleyRMMapping
    //                         WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id
    //                     `);

    //                 let destMappingId;

    //                 // 3.1 ถ้ามีรายการนี้อยู่แล้ว ให้อัปเดตข้อมูล
    //                 if (existingResult.recordset.length > 0) {
    //                     // 3.1 ถ้ามีรายการนี้อยู่แล้ว ให้อัปเดตข้อมูล
    //                     const existingMapping = existingResult.recordset[0];
    //                     destMappingId = existingMapping.mapping_id;

    //                     await pool.request()
    //                         .input("tro_id", new_tro_id)
    //                         .input("rmfp_id", rmfp_id)
    //                         .input("weight_RM_add", weightNum)
    //                         .input("tray_count_add", traysToMove)
    //                         .input("updated_at", currentDateTime)
    //                         .query(`
    //         UPDATE TrolleyRMMapping
    //         SET weight_RM = weight_RM + @weight_RM_add,
    //             tray_count = tray_count + @tray_count_add,
    //             weight_in_trolley = weight_in_trolley + @weight_RM_add,
    //             updated_at = @updated_at
    //         WHERE tro_id = @tro_id
    //           AND rmfp_id = @rmfp_id
    //     `);

    //                     console.log(`✅ อัปเดตรายการวัตถุดิบ (rmfp_id: ${rmfp_id}) ในรถเข็น ${new_tro_id}`);

    //                     // ตรวจสอบว่ามีประวัติสำหรับ mapping_id นี้หรือไม่
    //                     const existingHistoryResult = await pool.request()
    //                         .input("mapping_id", destMappingId)
    //                         .query(`
    //         SELECT COUNT(*) as count
    //         FROM History
    //         WHERE mapping_id = @mapping_id
    //     `);

    //                     if (existingHistoryResult.recordset[0].count === 0) {
    //                         // สร้างประวัติใหม่สำหรับรายการที่มีอยู่แล้ว
    //                         const insertHistoryResult = await pool.request()
    //                             .input("mapping_id", destMappingId)
    //                             .input("withdraw_date", historyData.withdraw_date)
    //                             .input("cooked_date", historyData.cooked_date)
    //                             .input("rmit_date", historyData.rmit_date)
    //                             .input("qc_date", historyData.qc_date)
    //                             .input("come_cold_date", historyData.come_cold_date)
    //                             .input("out_cold_date", historyData.out_cold_date) // คงค่าเดิมจากต้นทาง ไม่อัปเดต
    //                             .input("come_cold_date_two", historyData.come_cold_date_two)
    //                             .input("out_cold_date_two", historyData.out_cold_date_two)
    //                             .input("come_cold_date_three", historyData.come_cold_date_three)
    //                             .input("out_cold_date_three", historyData.out_cold_date_three)
    //                             .input("sc_pack_date", historyData.sc_pack_date)
    //                             .input("rework_date", historyData.rework_date)
    //                             .input("receiver", historyData.receiver)
    //                             .input("receiver_prep_two", historyData.receiver_prep_two)
    //                             .input("receiver_qc", historyData.receiver_qc)
    //                             .input("receiver_out_cold", historyData.receiver_out_cold) // คงค่าผู้รับผิดชอบเดิม
    //                             .input("receiver_out_cold_two", historyData.receiver_out_cold_two)
    //                             .input("receiver_out_cold_three", historyData.receiver_out_cold_three)
    //                             .input("receiver_oven_edit", historyData.receiver_oven_edit)
    //                             .input("receiver_pack_edit", historyData.receiver_pack_edit)
    //                             .input("remark_pack_edit", historyData.remark_pack_edit)
    //                             .input("location", historyData.location)
    //                             .query(`
    //             INSERT INTO History (
    //                 mapping_id, withdraw_date, cooked_date, rmit_date, qc_date, 
    //                 come_cold_date, out_cold_date, come_cold_date_two, out_cold_date_two, 
    //                 come_cold_date_three, out_cold_date_three, sc_pack_date, rework_date, 
    //                 receiver, receiver_prep_two, receiver_qc, receiver_out_cold, 
    //                 receiver_out_cold_two, receiver_out_cold_three, receiver_oven_edit, 
    //                 receiver_pack_edit, remark_pack_edit, location
    //             )
    //             OUTPUT INSERTED.hist_id
    //             VALUES (
    //                 @mapping_id, @withdraw_date, @cooked_date, @rmit_date, @qc_date, 
    //                 @come_cold_date, @out_cold_date, @come_cold_date_two, @out_cold_date_two, 
    //                 @come_cold_date_three, @out_cold_date_three, @sc_pack_date, @rework_date, 
    //                 @receiver, @receiver_prep_two, @receiver_qc, @receiver_out_cold, 
    //                 @receiver_out_cold_two, @receiver_out_cold_three, @receiver_oven_edit, 
    //                 @receiver_pack_edit, @remark_pack_edit, @location
    //             )
    //         `);
    //                         console.log(`✅ สร้างประวัติใหม่สำหรับ mapping_id ที่มีอยู่แล้ว: ${destMappingId}`);
    //                     }
    //                 } else {
    //                     // 3.2 ถ้ายังไม่มีรายการนี้ ให้สร้างรายการใหม่
    //                     // สร้างรายการใหม่ใน TrolleyRMMapping - ใช้ค่า cold_time จากรายการต้นทาง
    //                     console.log("line code :", sourceRecord.rmm_line_name)
    //                     const insertMappingResult = await pool.request()
    //                         .input("tro_id", new_tro_id)
    //                         .input("rmfp_id", rmfp_id)
    //                         .input("batch_id", sourceRecord.batch_id)
    //                         .input("tro_production_id", sourceRecord.tro_production_id)
    //                         .input("process_id", sourceRecord.process_id)
    //                         .input("qc_id", sourceRecord.qc_id)
    //                         .input("weight_in_trolley", weightNum)
    //                         .input("tray_count", traysToMove)
    //                         .input("weight_per_tray", sourceRecord.weight_per_tray)
    //                         .input("weight_RM", weightNum)
    //                         .input("level_eu", sourceRecord.level_eu)
    //                         .input("prep_to_cold_time", sourceRecord.prep_to_cold_time)
    //                         .input("cold_time", sourceRecord.cold_time) // ใช้ค่า cold_time เดิมจากต้นทาง
    //                         .input("rm_status", sourceRecord.rm_status)
    //                         .input("rm_cold_status", sourceRecord.rm_cold_status)
    //                         .input("stay_place", sourceRecord.stay_place)
    //                         .input("dest", sourceRecord.dest)
    //                         .input("mix_code", sourceRecord.mix_code)
    //                         .input("prod_mix", sourceRecord.prod_mix)
    //                         .input("allocation_date", currentDateTime) // วันที่จัดสรรใหม่
    //                         .input("removal_date", null)
    //                         .input("status", sourceRecord.status)
    //                         .input("production_batch", sourceRecord.production_batch)
    //                         .input("created_by", currentUser)
    //                         .input("created_at", currentDateTime)
    //                         .input("updated_at", currentDateTime)
    //                         .input("rmm_line_name", sourceRecord.rmm_line_name)
    //                         .query(`
    //         INSERT INTO TrolleyRMMapping (
    //             tro_id, rmfp_id, batch_id, tro_production_id, process_id, 
    //             qc_id, weight_in_trolley, tray_count, weight_per_tray, weight_RM, 
    //             level_eu, prep_to_cold_time, cold_time, rm_status, rm_cold_status, 
    //             stay_place, dest, mix_code, prod_mix, allocation_date, 
    //             removal_date, status, production_batch, created_by, created_at, updated_at,rmm_line_name
    //         )
    //         OUTPUT INSERTED.mapping_id
    //         VALUES (
    //             @tro_id, @rmfp_id, @batch_id, @tro_production_id, @process_id, 
    //             @qc_id, @weight_in_trolley, @tray_count, @weight_per_tray, @weight_RM, 
    //             @level_eu, @prep_to_cold_time, @cold_time, @rm_status, @rm_cold_status, 
    //             @stay_place, @dest, @mix_code, @prod_mix, @allocation_date, 
    //             @removal_date, @status, @production_batch, @created_by, @created_at, @updated_at,@rmm_line_name
    //         )
    //     `);

    //                     destMappingId = insertMappingResult.recordset[0].mapping_id;
    //                     console.log(`✅ สร้างรายการวัตถุดิบใหม่ในรถเข็น ${new_tro_id} ด้วย mapping_id ${destMappingId}`);


    //                     // สร้างประวัติใหม่สำหรับรายการใหม่ - คงค่า out_cold_date และ receiver_out_cold จากต้นทาง
    //                     const insertHistoryResult = await pool.request()
    //                         .input("mapping_id", destMappingId)
    //                         .input("withdraw_date", historyData.withdraw_date)
    //                         .input("cooked_date", historyData.cooked_date)
    //                         .input("rmit_date", historyData.rmit_date)
    //                         .input("qc_date", historyData.qc_date)
    //                         .input("come_cold_date", historyData.come_cold_date)
    //                         .input("out_cold_date", historyData.out_cold_date) // คงค่าเดิมจากต้นทาง
    //                         .input("come_cold_date_two", historyData.come_cold_date_two)
    //                         .input("out_cold_date_two", historyData.out_cold_date_two)
    //                         .input("come_cold_date_three", historyData.come_cold_date_three)
    //                         .input("out_cold_date_three", historyData.out_cold_date_three)
    //                         .input("sc_pack_date", historyData.sc_pack_date)
    //                         .input("rework_date", historyData.rework_date)
    //                         .input("receiver", historyData.receiver)
    //                         .input("receiver_prep_two", historyData.receiver_prep_two)
    //                         .input("receiver_qc", historyData.receiver_qc)
    //                         .input("receiver_out_cold", historyData.receiver_out_cold) // คงค่าผู้รับผิดชอบเดิม
    //                         .input("receiver_out_cold_two", historyData.receiver_out_cold_two)
    //                         .input("receiver_out_cold_three", historyData.receiver_out_cold_three)
    //                         .input("receiver_oven_edit", historyData.receiver_oven_edit)
    //                         .input("receiver_pack_edit", historyData.receiver_pack_edit)
    //                         .input("remark_pack_edit", historyData.remark_pack_edit)
    //                         .input("location", historyData.location)
    //                         .query(`
    //         INSERT INTO History (
    //             mapping_id, withdraw_date, cooked_date, rmit_date, qc_date, 
    //             come_cold_date, out_cold_date, come_cold_date_two, out_cold_date_two, 
    //             come_cold_date_three, out_cold_date_three, sc_pack_date, rework_date, 
    //             receiver, receiver_prep_two, receiver_qc, receiver_out_cold, 
    //             receiver_out_cold_two, receiver_out_cold_three, receiver_oven_edit, 
    //             receiver_pack_edit, remark_pack_edit, location
    //         )
    //         OUTPUT INSERTED.hist_id
    //         VALUES (
    //             @mapping_id, @withdraw_date, @cooked_date, @rmit_date, @qc_date, 
    //             @come_cold_date, @out_cold_date, @come_cold_date_two, @out_cold_date_two, 
    //             @come_cold_date_three, @out_cold_date_three, @sc_pack_date, @rework_date, 
    //             @receiver, @receiver_prep_two, @receiver_qc, @receiver_out_cold, 
    //             @receiver_out_cold_two, @receiver_out_cold_three, @receiver_oven_edit, 
    //             @receiver_pack_edit, @remark_pack_edit, @location
    //         )
    //     `);

    //                     const newHistId = insertHistoryResult.recordset[0].hist_id;
    //                     console.log(`✅ สร้างประวัติใหม่ hist_id: ${newHistId} สำหรับ mapping_id: ${destMappingId}`);
    //                 }

    //                 // 5. ตรวจสอบน้ำหนักทั้งหมดในรถเข็นต้นทาง
    //                 const sourceWeightResult = await pool.request()
    //                     .input("tro_id", tro_id)
    //                     .query(`
    //                         SELECT SUM(weight_RM) AS total_weight
    //                         FROM TrolleyRMMapping
    //                         WHERE tro_id = @tro_id
    //                     `);

    //                 const sourceTotalWeight = sourceWeightResult.recordset[0]?.total_weight || 0;

    //                 // 6. ถ้ารถเข็นต้นทางไม่มีวัตถุดิบเหลือ
    //                 if (sourceTotalWeight === 0) {
    //                     console.log(`ℹ️ รถเข็น ${tro_id} ไม่มีวัตถุดิบเหลือแล้ว`);

    //                     // 6.1 ลบทะเบียนออกจากช่องจอด
    //                     await pool.request()
    //                         .input("slot_id", slot_id)
    //                         .query(`
    //                             UPDATE Slot
    //                             SET tro_id = NULL
    //                             WHERE slot_id = @slot_id;
    //                         `);

    //                     console.log(`✅ ลบทะเบียนรถเข็น ${tro_id} ออกจากช่องจอด ${slot_id}`);

    //                     // 6.2 อัปเดตสถานะรถเข็นเป็นพร้อมใช้งาน
    //                     await pool.request()
    //                         .input("tro_id", tro_id)
    //                         .query(`
    //                             UPDATE Trolley
    //                             SET tro_status = 1
    //                             WHERE tro_id = @tro_id;
    //                         `);

    //                     console.log(`✅ อัปเดตสถานะรถเข็น ${tro_id} เป็นพร้อมใช้งาน`);

    //                     // 6.3 อัปเดต removal_date และ status สำหรับรายการที่น้ำหนักเป็น 0
    //                     await pool.request()
    //                         .input("tro_id", tro_id)
    //                         .input("removal_date", currentDateTime)
    //                         .input("updated_at", currentDateTime)
    //                         .query(`
    //                             UPDATE TrolleyRMMapping
    //                             SET removal_date = @removal_date,
    //                                 updated_at = @updated_at,
    //                                 tro_id = NULL,
    //                                 status = 0
    //                             WHERE tro_id = @tro_id AND weight_RM = 0;
    //                         `);

    //                     console.log(`✅ อัปเดตข้อมูลรายการที่น้ำหนักเป็น 0 ในรถเข็น ${tro_id}`);
    //                 }

    //                 // ดึงน้ำหนักทั้งหมดในรถเข็นปลายทาง
    //                 const destWeightResult = await pool.request()
    //                     .input("tro_id", new_tro_id)
    //                     .query(`
    //                         SELECT SUM(weight_RM) AS total_weight
    //                         FROM TrolleyRMMapping
    //                         WHERE tro_id = @tro_id
    //                     `);

    //                 const destTotalWeight = destWeightResult.recordset[0]?.total_weight || 0;

    //                 // Commit transaction
    //                 await transaction.commit();

    //                 return res.status(200).json({
    //                     message: "Raw material moved successfully",
    //                     details: {
    //                         sourceWeight: sourceTotalWeight,
    //                         destinationWeight: destTotalWeight,
    //                         movedWeight: weightNum,
    //                         movedTrays: traysToMove,
    //                         sourceMappingId: sourceMapping_id,
    //                         destMappingId: destMappingId
    //                     }
    //                 });
    //             } catch (transactionError) {
    //                 // Rollback transaction ในกรณีที่เกิดข้อผิดพลาด
    //                 await transaction.rollback();
    //                 console.error("Transaction Error:", transactionError);
    //                 throw new Error(`Transaction failed: ${transactionError.message}`);
    //             }

    //         } catch (error) {
    //             console.error("Operation Error:", error);
    //             throw new Error(`Operation failed: ${error.message}`);
    //         }

    //     } catch (error) {
    //         console.error("Error:", error.message);
    //         console.error("Stack trace:", error.stack);

    //         return res.status(500).json({
    //             error: "Internal Server Error",
    //             message: error.message,
    //             stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    //         });
    //     }
    // });

    router.put("/coldstorage/moveRawmatintolley", async (req, res) => {
        try {
            console.log("Raw Request Body:", req.body);
            const {
                tro_id,
                new_tro_id,
                weight,
                slot_id,
                rmfp_id,
                mix_code,
                mapping_id,
                isMixed
            } = req.body;

            // 1) Validate input
            if (!tro_id || !new_tro_id || !weight || !slot_id) {
                return res.status(400).json({ success: false, error: "Missing required fields" });
            }

            if (isMixed) {
                if (!mix_code || !mapping_id) {
                    return res.status(400).json({
                        success: false,
                        error: "For mixed materials, mix_code and mapping_id are required"
                    });
                }
            } else {
                if (!rmfp_id) {
                    return res.status(400).json({
                        success: false,
                        error: "For normal materials, rmfp_id is required"
                    });
                }
            }

            const weightNum = parseFloat(weight);
            if (isNaN(weightNum) || weightNum <= 0) {
                console.log(`❌ น้ำหนักไม่ถูกต้อง: ${weight}`);
                return res.status(400).json({ error: "Weight must be a positive number" });
            }

            // 2) Connect DB
            const pool = await connectToDatabase();
            if (!pool) {
                console.log("❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
                return res.status(500).json({ error: "Database connection failed" });
            }

            // 3) Begin transaction (ใช้ SERIALIZABLE เพื่อกัน race เรื่องน้ำหนัก/ถาด)
            const tx = new sql.Transaction(pool);
            await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

            // helper: ทุก query ต้องผูกกับ tx
            const t = () => new sql.Request(tx);

            try {
                // ตรวจว่ามีรถเข็นปลายทาง
                const checkDestTrolley = await t()
                    .input("tro_id", new_tro_id)
                    .query(`SELECT tro_id FROM Trolley WITH (UPDLOCK, HOLDLOCK) WHERE tro_id = @tro_id`);

                if (checkDestTrolley.recordset.length === 0) {
                    await tx.rollback();
                    return res.status(404).json({ error: "Destination trolley not found", details: { new_tro_id } });
                }

                // 4) ดึงแถวต้นทาง (เลือกเงื่อนไขให้ถูกกับโหมด)
                let sourceQuery, bind = t();
                if (isMixed) {
                    sourceQuery = `
          SELECT mapping_id, batch_id, tro_id, rmfp_id, tray_count, weight_RM,
                 tro_production_id, process_id, qc_id, level_eu,
                 prep_to_cold_time, cold_time, rework_time, prep_to_pack_time, cold_to_pack_time,
                 rm_status, rm_cold_status, stay_place, dest, mix_code, prod_mix,
                 allocation_date, removal_date, status, production_batch, created_by, rmm_line_name, mix_time
          FROM TrolleyRMMapping WITH (UPDLOCK, HOLDLOCK)
          WHERE mapping_id = @mapping_id
        `;
                    bind.input("mapping_id", mapping_id);
                } else {
                    sourceQuery = `
          SELECT TOP 1 mapping_id, batch_id, tro_id, rmfp_id, tray_count, weight_RM,
                 tro_production_id, process_id, qc_id, level_eu,
                 prep_to_cold_time, cold_time, rework_time, prep_to_pack_time, cold_to_pack_time,
                 rm_status, rm_cold_status, stay_place, dest, mix_code, prod_mix,
                 status, production_batch, rmm_line_name, mix_time
          FROM TrolleyRMMapping WITH (UPDLOCK, HOLDLOCK)
          WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id
          ORDER BY mapping_id
        `;
                    bind.input("tro_id", tro_id).input("rmfp_id", rmfp_id);
                }

                const result = await bind.query(sourceQuery);
                if (result.recordset.length === 0) {
                    await tx.rollback();
                    return res.status(404).json({ error: "Source mapping not found" });
                }

                const sourceRecord = result.recordset[0];
                const {
                    mapping_id: sourceMappingId,
                    tray_count: existingTrayCount,
                    weight_RM: currentTotalWeight
                } = sourceRecord;

                // 5) ตรวจน้ำหนักพอไหม
                if (currentTotalWeight < weightNum) {
                    await tx.rollback();
                    return res.status(400).json({
                        error: "Not enough weight in the trolley",
                        details: { available: currentTotalWeight, requested: weightNum }
                    });
                }

                // 6) คำนวณถาดตามสัดส่วน
                const weightRatio = weightNum / currentTotalWeight;
                const traysToMove = Math.ceil(existingTrayCount * weightRatio);
                if (traysToMove > existingTrayCount) {
                    await tx.rollback();
                    return res.status(400).json({
                        error: "Not enough trays in the trolley",
                        details: { available: existingTrayCount, required: traysToMove }
                    });
                }

                const currentDateTime = new Date().toISOString();
                const currentUser = req.user?.username || 'ย้ายวัตถุดิบใส่รถเข็น';

                // 7) โหลด History ของแถวต้นทาง
                const historyRes = await t()
                    .input("mapping_id", sourceMappingId)
                    .query(`SELECT TOP 1 * FROM History WITH (UPDLOCK, HOLDLOCK) WHERE mapping_id = @mapping_id ORDER BY hist_id DESC`);
                if (historyRes.recordset.length === 0) {
                    await tx.rollback();
                    return res.status(404).json({ error: `History record not found for mapping_id: ${sourceMappingId}` });
                }
                const historyData = historyRes.recordset[0];

                // 8) ลดน้ำหนัก/ถาดจากต้นทาง (ระวัง mixed: ยึด mapping_id เป็นหลัก)
                if (isMixed) {
                    await t()
                        .input("mapping_id", sourceMappingId)
                        .input("weight_RM", weightNum)
                        .input("tray_count_decrease", traysToMove)
                        .input("updated_at", currentDateTime)
                        .query(`
            UPDATE TrolleyRMMapping
            SET weight_RM = weight_RM - @weight_RM,
                tray_count = tray_count - @tray_count_decrease,
                updated_at = @updated_at
            WHERE mapping_id = @mapping_id
              AND weight_RM >= @weight_RM
              AND tray_count >= @tray_count_decrease
          `);
                } else {
                    await t()
                        .input("tro_id", tro_id)
                        .input("rmfp_id", rmfp_id)
                        .input("weight_RM", weightNum)
                        .input("tray_count_decrease", traysToMove)
                        .input("updated_at", currentDateTime)
                        .query(`
            UPDATE TrolleyRMMapping
            SET weight_RM = weight_RM - @weight_RM,
                tray_count = tray_count - @tray_count_decrease,
                updated_at = @updated_at
            WHERE tro_id = @tro_id
              AND rmfp_id = @rmfp_id
              AND weight_RM >= @weight_RM
              AND tray_count >= @tray_count_decrease
          `);
                }

                // 8.1 อัปเดต History ต้นทาง (ให้สะท้อนคงเหลือ)
                await t()
                    .input("mapping_id", sourceMappingId)
                    .input("weight_RM", currentTotalWeight - weightNum)
                    .input("tray_count", existingTrayCount - traysToMove)
                    .input("updated_at", currentDateTime)
                    .query(`
          UPDATE History
          SET weight_RM = @weight_RM,
              tray_count = @tray_count,
              updated_at = @updated_at
          WHERE mapping_id = @mapping_id
        `);

                // 8.2 ถ้าน้ำหนักเหลือ 0 ให้ set removal/status และปลด tro_id แถวที่เป็นศูนย์
                if (isMixed) {
                    await t()
                        .input("mapping_id", sourceMappingId)
                        .input("removal_date", currentDateTime)
                        .input("updated_at", currentDateTime)
                        .query(`
            UPDATE TrolleyRMMapping
            SET removal_date = @removal_date,
                updated_at = @updated_at,
                tro_id = NULL,
                status = 0,
                tl_status = '4800'
            WHERE mapping_id = @mapping_id AND weight_RM = 0
          `);
                } else {
                    await t()
                        .input("tro_id", tro_id)
                        .input("rmfp_id", rmfp_id)
                        .input("removal_date", currentDateTime)
                        .input("updated_at", currentDateTime)
                        .query(`
            UPDATE TrolleyRMMapping
            SET removal_date = @removal_date,
                updated_at = @updated_at,
                tro_id = NULL,
                status = 0,
                tl_status = '4815'
            WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id AND weight_RM = 0
          `);
                }

                // 9) จัดการปลายทาง: มีอยู่แล้วหรือยัง
                const existDest = await t()
                    .input("tro_id", new_tro_id)
                    .input("rmfp_id", sourceRecord.rmfp_id ?? rmfp_id ?? null)
                    .query(`
          SELECT TOP 1 * FROM TrolleyRMMapping WITH (UPDLOCK, HOLDLOCK)
          WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id
          ORDER BY mapping_id
        `);

                let destMappingId = existDest.recordset[0]?.mapping_id ?? null;

                if (existDest.recordset.length > 0) {
                    // 9.1 อัปเดตรายการเดิมในปลายทาง
                    const existingWeight = existDest.recordset[0].weight_RM || 0;
                    const existingTray = existDest.recordset[0].tray_count || 0;

                    await t()
                        .input("tro_id", new_tro_id)
                        .input("rmfp_id", sourceRecord.rmfp_id ?? rmfp_id)
                        .input("weight_RM_add", weightNum)
                        .input("tray_count_add", traysToMove)
                        .input("updated_at", currentDateTime)
                        .query(`
            UPDATE TrolleyRMMapping
            SET weight_RM = weight_RM + @weight_RM_add,
                tray_count = tray_count + @tray_count_add,
                updated_at = @updated_at
            WHERE tro_id = @tro_id AND rmfp_id = @rmfp_id
          `);

                    // 9.1.1 History ของแถวปลายทาง (มีหรือยัง)
                    const existHist = await t()
                        .input("mapping_id", destMappingId)
                        .query(`SELECT COUNT(*) AS cnt FROM History WITH (UPDLOCK, HOLDLOCK) WHERE mapping_id = @mapping_id`);

                    if (existHist.recordset[0].cnt === 0) {
                        // insert history ใหม่ โดยอิงข้อมูลเดิม + จำนวนที่เพิ่ม
                        await t()
                            .input("mapping_id", destMappingId)
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
                            .input("mixed_date", historyData.mixed_date)
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
                            .input("remark_pack_edit", historyData.remark_pack_edit)
                            .input("location", historyData.location)
                            .input("tray_count", (existDest.recordset[0].tray_count || 0) + traysToMove)
                            .input("weight_RM", (existDest.recordset[0].weight_RM || 0) + weightNum)
                            .input("md_time", historyData.md_time)
                            .input("tro_id", new_tro_id)
                            .input("rmm_line_name", sourceRecord.rmm_line_name)
                            .input("dest", sourceRecord.dest)
                            .input("name_edit_prod_two", historyData.name_edit_prod_two)
                            .input("name_edit_prod_three", historyData.name_edit_prod_three)
                            .input("first_prod", historyData.first_prod)
                            .input("two_prod", historyData.two_prod)
                            .input("three_prod", historyData.three_prod)
                            .input("receiver_qc_cold", historyData.receiver_qc_cold)
                            .input("remark_rework", historyData.remark_rework)
                            .input("remark_rework_cold", historyData.remark_rework_cold)
                            .input("edit_rework", historyData.edit_rework)
                            .input("prepare_mor_night", historyData.prepare_mor_night)
                            .query(`
              INSERT INTO History (
                mapping_id, withdraw_date, cooked_date, rmit_date, qc_date,
                come_cold_date, out_cold_date, come_cold_date_two, out_cold_date_two,
                come_cold_date_three, out_cold_date_three, mixed_date, sc_pack_date, rework_date,
                receiver, receiver_prep_two, receiver_qc, receiver_out_cold,
                receiver_out_cold_two, receiver_out_cold_three, receiver_oven_edit,
                receiver_pack_edit, remark_pack_edit, location, tray_count, weight_RM,
                md_time, tro_id, rmm_line_name, dest, name_edit_prod_two, name_edit_prod_three,
                first_prod, two_prod, three_prod, receiver_qc_cold, remark_rework, remark_rework_cold,
                edit_rework, prepare_mor_night
              )
              VALUES (
                @mapping_id, @withdraw_date, @cooked_date, @rmit_date, @qc_date,
                @come_cold_date, @out_cold_date, @come_cold_date_two, @out_cold_date_two,
                @come_cold_date_three, @out_cold_date_three, @mixed_date, @sc_pack_date, @rework_date,
                @receiver, @receiver_prep_two, @receiver_qc, @receiver_out_cold,
                @receiver_out_cold_two, @receiver_out_cold_three, @receiver_oven_edit,
                @receiver_pack_edit, @remark_pack_edit, @location, @tray_count, @weight_RM,
                @md_time, @tro_id, @rmm_line_name, @dest, @name_edit_prod_two, @name_edit_prod_three,
                @first_prod, @two_prod, @three_prod, @receiver_qc_cold, @remark_rework, @remark_rework_cold,
                @edit_rework, @prepare_mor_night
              )
            `);
                    } else {
                        // update history เดิม
                        await t()
                            .input("mapping_id", destMappingId)
                            .input("weight_RM", existingWeight + weightNum)
                            .input("tray_count", existingTray + traysToMove)
                            .input("updated_at", currentDateTime)
                            .query(`
              UPDATE History
              SET weight_RM = @weight_RM,
                  tray_count = @tray_count,
                  updated_at = @updated_at
              WHERE mapping_id = @mapping_id
            `);
                    }
                } else {
                    // 9.2 ไม่มีรายการปลายทาง → สร้างใหม่
                    const insMap = await t()
                        .input("tro_id", new_tro_id)
                        .input("rmfp_id", sourceRecord.rmfp_id ?? rmfp_id)
                        .input("batch_id", sourceRecord.batch_id ?? null)
                        .input("tro_production_id", sourceRecord.tro_production_id ?? null)
                        .input("process_id", sourceRecord.process_id ?? null)
                        .input("qc_id", sourceRecord.qc_id ?? null)
                        .input("tray_count", traysToMove)
                        .input("weight_RM", weightNum)
                        .input("level_eu", sourceRecord.level_eu ?? null)
                        .input("prep_to_cold_time", sourceRecord.prep_to_cold_time ?? null)
                        .input("cold_time", sourceRecord.cold_time ?? null)
                        .input("prep_to_pack_time", sourceRecord.prep_to_pack_time ?? null)
                        .input("cold_to_pack_time", sourceRecord.cold_to_pack_time ?? null)
                        .input("mix_time", sourceRecord.mix_time ?? null)
                        .input("rework_time", sourceRecord.rework_time ?? null)
                        .input("rm_status", sourceRecord.rm_status ?? null)
                        .input("rm_cold_status", sourceRecord.rm_cold_status ?? null)
                        .input("stay_place", sourceRecord.stay_place ?? null)
                        .input("dest", sourceRecord.dest ?? null)
                        .input("mix_code", sourceRecord.mix_code ?? mix_code ?? null)
                        .input("prod_mix", sourceRecord.prod_mix ?? null)
                        .input("allocation_date", currentDateTime)
                        .input("removal_date", null)
                        .input("status", sourceRecord.status ?? 1)
                        .input("production_batch", sourceRecord.production_batch ?? null)
                        .input("created_by", currentUser)
                        .input("created_at", currentDateTime)
                        .input("updated_at", currentDateTime)
                        .input("rmm_line_name", sourceRecord.rmm_line_name ?? null)
                        .input("tl_status", '1.2')
                        .query(`
            INSERT INTO TrolleyRMMapping (
              tro_id, rmfp_id, batch_id, tro_production_id, process_id,
              qc_id, tray_count, weight_RM,
              level_eu, prep_to_cold_time, cold_time, prep_to_pack_time, cold_to_pack_time,
              mix_time, rework_time, rm_status, rm_cold_status,
              stay_place, dest, mix_code, prod_mix, allocation_date,
              removal_date, status, production_batch, created_by, created_at, updated_at, rmm_line_name,tl_status
            )
            OUTPUT INSERTED.mapping_id
            VALUES (
              @tro_id, @rmfp_id, @batch_id, @tro_production_id, @process_id,
              @qc_id, @tray_count, @weight_RM,
              @level_eu, @prep_to_cold_time, @cold_time, @prep_to_pack_time, @cold_to_pack_time,
              @mix_time, @rework_time, @rm_status, @rm_cold_status,
              @stay_place, @dest, @mix_code, @prod_mix, @allocation_date,
              @removal_date, @status, @production_batch, @created_by, @created_at, @updated_at, @rmm_line_name,@tl_status
            )
          `);

                    destMappingId = insMap.recordset[0].mapping_id;

                    // History ของปลายทาง (สร้างใหม่)
                    await t()
                        .input("mapping_id", destMappingId)
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
                        .input("mixed_date", historyData.mixed_date)
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
                        .input("remark_pack_edit", historyData.remark_pack_edit)
                        .input("location", historyData.location)
                        .input("tray_count", traysToMove)
                        .input("weight_RM", weightNum)
                        .input("md_time", historyData.md_time)
                        .input("tro_id", new_tro_id)
                        .input("rmm_line_name", sourceRecord.rmm_line_name)
                        .input("dest", sourceRecord.dest)
                        .input("name_edit_prod_two", historyData.name_edit_prod_two)
                        .input("name_edit_prod_three", historyData.name_edit_prod_three)
                        .input("first_prod", historyData.first_prod)
                        .input("two_prod", historyData.two_prod)
                        .input("three_prod", historyData.three_prod)
                        .input("receiver_qc_cold", historyData.receiver_qc_cold)
                        .input("prepare_mor_night", historyData.prepare_mor_night)
                        .input("remark_rework", historyData.remark_rework)
                        .input("remark_rework_cold", historyData.remark_rework_cold)
                        .input("edit_rework", historyData.edit_rework)
                        .query(`
            INSERT INTO History (
              mapping_id, withdraw_date, cooked_date, rmit_date, qc_date,
              come_cold_date, out_cold_date, come_cold_date_two, out_cold_date_two,
              come_cold_date_three, out_cold_date_three, mixed_date, sc_pack_date, rework_date,
              receiver, receiver_prep_two, receiver_qc, receiver_out_cold,
              receiver_out_cold_two, receiver_out_cold_three, receiver_oven_edit,
              receiver_pack_edit, remark_pack_edit, location, tray_count, weight_RM,
              md_time, tro_id, rmm_line_name, dest, name_edit_prod_two, name_edit_prod_three,
              first_prod, two_prod, three_prod, receiver_qc_cold, prepare_mor_night,
              remark_rework, remark_rework_cold, edit_rework
            )
            VALUES (
              @mapping_id, @withdraw_date, @cooked_date, @rmit_date, @qc_date,
              @come_cold_date, @out_cold_date, @come_cold_date_two, @out_cold_date_two,
              @come_cold_date_three, @out_cold_date_three, @mixed_date, @sc_pack_date, @rework_date,
              @receiver, @receiver_prep_two, @receiver_qc, @receiver_out_cold,
              @receiver_out_cold_two, @receiver_out_cold_three, @receiver_oven_edit,
              @receiver_pack_edit, @remark_pack_edit, @location, @tray_count, @weight_RM,
              @md_time, @tro_id, @rmm_line_name, @dest, @name_edit_prod_two, @name_edit_prod_three,
              @first_prod, @two_prod, @three_prod, @receiver_qc_cold, @prepare_mor_night,
              @remark_rework, @remark_rework_cold, @edit_rework
            )
          `);
                }

                // 9.3 คัดลอก Batch records จาก mapping เก่ามาที่ mapping ใหม่
                const batchRecords = await t()
                    .input("source_mapping_id", sourceMappingId)
                    .query(`
        SELECT 
            batch_id, 
            batch_after,
            batch_before,
            mapping_id
        FROM Batch WITH (HOLDLOCK)
        WHERE mapping_id = @source_mapping_id
    `);

                // ถ้ามี batch records ให้คัดลอกไปที่ mapping ใหม่
                if (batchRecords.recordset.length > 0) {
                    for (const batch of batchRecords.recordset) {
                        await t()
                            .input("mapping_id", destMappingId)
                            .input("batch_after", batch.batch_after)
                            .input("batch_before", batch.batch_before)
                            .query(`
                INSERT INTO Batch (
                    mapping_id,
                    batch_after,
                    batch_before
                )
                VALUES (
                    @mapping_id,
                    @batch_after,
                    @batch_before
                )
            `);
                    }

                    console.log(`✅ คัดลอก ${batchRecords.recordset.length} batch records ไปยัง mapping_id: ${destMappingId}`);
                }

                // 10) เช็คน้ำหนักรวมต้นทาง
                const sourceWeightRes = await t()
                    .input("tro_id", tro_id)
                    .query(`
          SELECT SUM(weight_RM) AS total_weight
          FROM TrolleyRMMapping WITH (HOLDLOCK)
          WHERE tro_id = @tro_id
        `);
                const sourceTotalWeight = sourceWeightRes.recordset[0]?.total_weight || 0;

                if (sourceTotalWeight === 0) {
                    // 10.1 ปลดช่องจอด
                    await t()
                        .input("slot_id", slot_id)
                        .query(`UPDATE Slot SET tro_id = NULL ,status ='3867' WHERE slot_id = @slot_id`);
                    // 10.2 set รถเข็นว่าง
                    await t()
                        .input("tro_id", tro_id)
                        .query(`UPDATE Trolley SET tro_status = '1',status = '2.0' WHERE tro_id = @tro_id`);
                }

                // 11) น้ำหนักรวมปลายทาง
                const destWeightRes = await t()
                    .input("tro_id", new_tro_id)
                    .query(`
          SELECT SUM(weight_RM) AS total_weight
          FROM TrolleyRMMapping WITH (HOLDLOCK)
          WHERE tro_id = @tro_id
        `);
                const destTotalWeight = destWeightRes.recordset[0]?.total_weight || 0;

                await tx.commit();

                return res.status(200).json({
                    message: "Raw material moved successfully",
                    details: {
                        sourceWeight: sourceTotalWeight,
                        destinationWeight: destTotalWeight,
                        movedWeight: weightNum,
                        movedTrays: traysToMove,
                        sourceMappingId: sourceMappingId,
                        destMappingId: destMappingId
                    }
                });
            } catch (err) {
                try { await tx.rollback(); } catch (_) { }
                console.error("Transaction Error:", err);
                return res.status(500).json({ error: "Transaction failed", message: err.message });
            }
        } catch (error) {
            console.error("Error:", error.message);
            console.error("Stack trace:", error.stack);
            return res.status(500).json({
                error: "Internal Server Error",
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    router.put("/coldstorage/moveTrolley", async (req, res) => {
        const { tro_id, new_slot_id } = req.body;

        try {
            const pool = await connectToDatabase(); // เชื่อมต่อกับฐานข้อมูล

            // ตรวจสอบว่า tro_id มีอยู่ในระบบหรือไม่
            const trolleyResult = await pool
                .request()
                .input("tro_id", sql.VarChar(4), tro_id)
                .query("SELECT tro_status FROM Trolley WHERE tro_id = @tro_id");

            if (trolleyResult.recordset.length === 0) {
                return res.status(400).json({ success: false, message: "รถเข็นไม่พร้อมใช้งาน" });
            }

            const tro_status = trolleyResult.recordset[0].tro_status;

            // ตรวจสอบสถานะของรถเข็น (เช่น ต้องไม่เป็นรถเข็นว่าง)
            if (tro_status === 1) {
                return res.status(400).json({ success: false, message: "รถเข็นไม่มีวัตถุดิบ" });
            }

            // เริ่ม Transaction พร้อม SERIALIZABLE เพื่อกัน race condition
            const transaction = new sql.Transaction(pool);
            await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

            // helper function สำหรับ query ที่ผูกกับ transaction
            const t = () => transaction.request();

            try {
                // ตรวจสอบ slot ใหม่ใน transaction และ lock row
                const slotResult = await t()
                    .input("new_slot_id", sql.VarChar(4), new_slot_id)
                    .query("SELECT tro_id, slot_status FROM Slot WITH (UPDLOCK, HOLDLOCK) WHERE slot_id = @new_slot_id");

                if (slotResult.recordset.length === 0) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: "ไม่พบช่องเก็บของในระบบ" });
                }

                const slot = slotResult.recordset[0];

                // ตรวจสอบว่าช่องนี้ว่าง (tro_id = NULL)
                if (slot.tro_id !== null) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: "ช่องเก็บของนี้ไม่ว่าง" });
                }

                // อัปเดตช่องเก็บของเดิมให้ว่าง (tro_id = NULL) พร้อม lock
                await t()
                    .input("tro_id", sql.VarChar(4), tro_id)
                    .query("UPDATE Slot SET tro_id = NULL ,status ='3965' WHERE tro_id = @tro_id");

                // อัปเดตช่องเก็บของใหม่ให้มีรถเข็นนี้
                await t()
                    .input("tro_id", sql.VarChar(4), tro_id)
                    .input("new_slot_id", sql.VarChar(4), new_slot_id)
                    .query("UPDATE Slot SET tro_id = @tro_id , status ='3971' WHERE slot_id = @new_slot_id");

                // Commit Transaction
                await transaction.commit();

                return res.status(200).json({ success: true, message: "ย้ายรถเข็นสำเร็จ" });

            } catch (err) {
                await transaction.rollback();
                console.error("Transaction failed:", err);
                return res.status(500).json({ success: false, message: "Transaction failed", error: err.message });
            }

        } catch (err) {
            console.error("Database connection error", err);
            return res.status(500).json({ success: false, message: "Database connection error", error: err.message });
        }
    });


    // ประวัติห้องเย็น
    router.get("/coldstorage/history", async (req, res) => {
        // Get search parameters and filters
        const {
            page = 1,
            pageSize = 100,
            searchTerm = '',
            sortBy = 'latestTime',
            sortOrder = 'DESC',
            startDate = '',
            endDate = '',
            filterType = 'exit', // Default is 'exit' (out of cold storage), can be 'enter' (enter cold storage)
            status = ''
        } = req.query;

        // Convert page and pageSize to numbers
        const pageNum = parseInt(page, 10) || 1;
        const pageSizeNum = parseInt(pageSize, 10) || 100;

        try {
            const pool = await connectToDatabase();
            // Use converted variables for page and pageSize
            const offset = (pageNum - 1) * pageSizeNum;

            // Format dates to cover the entire day
            let formattedStartDate = startDate;
            let formattedEndDate = endDate;

            // If format is YYYY-MM-DD (without time), add time
            if (formattedStartDate.length === 10) {
                formattedStartDate += ' 00:00:00';
            }

            if (formattedEndDate.length === 10) {
                formattedEndDate += ' 23:59:59';
            }

            // Create additional conditions for WHERE clause
            let additionalWhereConditions = '';

            console.log('Filtering params:', {
                startDate: formattedStartDate,
                endDate: formattedEndDate,
                filterType
            });

            // Add condition: filter only entries with cold room entry or exit
            additionalWhereConditions += `
                AND (
                    h.come_cold_date IS NOT NULL
                    OR h.come_cold_date_two IS NOT NULL
                    OR h.come_cold_date_three IS NOT NULL
                    OR h.out_cold_date IS NOT NULL
                    OR h.out_cold_date_two IS NOT NULL
                    OR h.out_cold_date_three IS NOT NULL
                )
            `;

            // Add search condition
            if (searchTerm) {
                additionalWhereConditions += ` AND (rm.mat_name LIKE @searchTerm OR rm.mat LIKE @searchTerm)`;
            }

            // Add status condition
            if (status) {
                if (status === 'exitColdRoom') {
                    additionalWhereConditions += `
                    AND (
                        (h.out_cold_date_three IS NOT NULL AND h.come_cold_date_three IS NOT NULL)
                        OR
                        (h.out_cold_date_two IS NOT NULL AND h.come_cold_date_two IS NOT NULL AND h.come_cold_date_three IS NULL)
                        OR
                        (h.out_cold_date IS NOT NULL AND h.come_cold_date IS NOT NULL AND h.come_cold_date_two IS NULL)
                    )
                `;
                } else if (status === 'enterColdRoom') {
                    additionalWhereConditions += `
                    AND (
                        (h.come_cold_date_three IS NOT NULL AND h.out_cold_date_three IS NULL)
                        OR
                        (h.come_cold_date_two IS NOT NULL AND h.out_cold_date_two IS NULL)
                        OR
                        (h.come_cold_date IS NOT NULL AND h.out_cold_date IS NULL)
                    )
                `;
                } else if (status === 'pending') {
                    additionalWhereConditions += `
                    AND h.come_cold_date IS NULL
                `;
                }
            }

            // Add date range filter condition
            if (startDate && endDate) {
                if (filterType === 'exit') {
                    // Filter by exit time from cold room
                    additionalWhereConditions += `
                    AND (
                        (
                            h.out_cold_date_three IS NOT NULL
                            AND CONVERT(DATETIME, h.out_cold_date_three)
                            BETWEEN CONVERT(DATETIME, @startDate) AND CONVERT(DATETIME, @endDate)
                        )
                        OR
                        (
                            h.out_cold_date_three IS NULL
                            AND h.out_cold_date_two IS NOT NULL
                            AND CONVERT(DATETIME, h.out_cold_date_two)
                            BETWEEN CONVERT(DATETIME, @startDate) AND CONVERT(DATETIME, @endDate)
                        )
                        OR
                        (
                            h.out_cold_date_three IS NULL
                            AND h.out_cold_date_two IS NULL
                            AND h.out_cold_date IS NOT NULL
                            AND CONVERT(DATETIME, h.out_cold_date)
                            BETWEEN CONVERT(DATETIME, @startDate) AND CONVERT(DATETIME, @endDate)
                        )
                    )
                `;
                } else if (filterType === 'enter') {
                    // Filter by entry time to cold room
                    additionalWhereConditions += `
                    AND (
                        (
                            h.come_cold_date_three IS NOT NULL
                            AND CONVERT(DATETIME, h.come_cold_date_three)
                            BETWEEN CONVERT(DATETIME, @startDate) AND CONVERT(DATETIME, @endDate)
                        )
                        OR
                        (
                            h.come_cold_date_three IS NULL
                            AND h.come_cold_date_two IS NOT NULL
                            AND CONVERT(DATETIME, h.come_cold_date_two)
                            BETWEEN CONVERT(DATETIME, @startDate) AND CONVERT(DATETIME, @endDate)
                        )
                        OR
                        (
                            h.come_cold_date_three IS NULL
                            AND h.come_cold_date_two IS NULL
                            AND h.come_cold_date IS NOT NULL
                            AND CONVERT(DATETIME, h.come_cold_date)
                            BETWEEN CONVERT(DATETIME, @startDate) AND CONVERT(DATETIME, @endDate)
                        )
                    )
                `;
                }
            }

            // Count total query
            const countQuery = `
            SELECT COUNT(*) AS total
            FROM History h
            JOIN TrolleyRMMapping rmm ON h.mapping_id = rmm.mapping_id
            JOIN RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
            JOIN ProdRawMat pr ON rmf.prod_rm_id = pr.prod_rm_id
            JOIN RawMat rm ON pr.mat = rm.mat
            JOIN Production p ON pr.prod_id = p.prod_id
            LEFT JOIN Slot s ON rmm.tro_id = s.tro_id
            WHERE 1=1
            ${additionalWhereConditions}
        `;

            // Main query
            const mainQuery = `
            SELECT
                rm.mat_name AS rawMaterialName,
                rm.mat AS mat,
                ISNULL(
    (
        SELECT STRING_AGG(b2.batch_after, CHAR(13) + CHAR(10))
        FROM Batch b2
        WHERE b2.mapping_id = rmm.mapping_id
              AND b2.batch_after IS NOT NULL
    ),
    rmf.batch
) AS batch,
                p.doc_no + ' (' + h.rmm_line_name + ')' AS code,
                h.tro_id AS trolleyId,
                s.slot_id,
                h.weight_RM AS weight,
                h.tray_count AS trayCount,
                q.sq_remark,
                q.md_remark,
                rmm.level_eu,
                q.defect_remark,
                q.qccheck,
                q.mdcheck,
                q.defectcheck,
                q.sq_acceptance,
                q.defect_acceptance,
                h.name_edit_prod_two,
                h.name_edit_prod_three,
                h.first_prod,
                h.two_prod,
                h.three_prod,
                h.qccheck_cold,
                h.receiver_qc_cold,
                h.prepare_mor_night,
                h.remark_rework,
                h.receiver_qc_cold,
                CONCAT(q.WorkAreaCode, \'-\', mwa.WorkAreaName, '/', q.md_no) AS machine_MD,
                CONVERT(VARCHAR, h.rmit_date, 120) AS prepCompleteTime,
                FORMAT(rmm.prep_to_cold_time, 'N2') AS ptc_time,
                FORMAT(rmg.prep_to_cold, 'N2') AS standard_ptc,
                CONVERT(VARCHAR, h.withdraw_date, 120) AS withdraw_date,
                CONVERT(VARCHAR, h.come_cold_date, 120) AS enterColdTime1,
                CONVERT(VARCHAR, h.out_cold_date, 120) AS exitColdTime1,
                CONVERT(VARCHAR, h.come_cold_date_two, 120) AS enterColdTime2,
                CONVERT(VARCHAR, h.out_cold_date_two, 120) AS exitColdTime2,
                CONVERT(VARCHAR, h.come_cold_date_three, 120) AS enterColdTime3,
                CONVERT(VARCHAR, h.out_cold_date_three, 120) AS exitColdTime3,
                CONVERT(VARCHAR, h.cooked_date, 120) AS cooked_date,
                CONVERT(VARCHAR, h.rmit_date, 120) AS rmit_date,
                h.receiver_out_cold AS exitOperator1,
                h.receiver_out_cold_two AS exitOperator2,
                h.receiver_out_cold_three AS exitOperator3,
                h.rework_time,
                h.mix_time,
                h.cold_to_pack_time,
                rmg.cold_to_pack,
                h.cold_dest
            FROM
                History h
            JOIN
                TrolleyRMMapping rmm ON h.mapping_id = rmm.mapping_id
            JOIN
                RMForProd rmf ON rmm.rmfp_id = rmf.rmfp_id
            JOIN
                ProdRawMat pr ON rmm.tro_production_id = pr.prod_rm_id
            JOIN
                RawMat rm ON pr.mat = rm.mat
            JOIN
                Production p ON pr.prod_id = p.prod_id
            LEFT JOIN
                Qc q ON rmm.qc_id = q.qc_id
            LEFT JOIN
                WorkAreas mwa ON q.WorkAreaCode = mwa.WorkAreaCode
            JOIN
                RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
            LEFT JOIN
                Slot s ON rmm.tro_id = s.tro_id
            ${additionalWhereConditions}
            ORDER BY
    CASE
        WHEN h.come_cold_date_three IS NOT NULL THEN h.come_cold_date_three
        WHEN h.out_cold_date_three IS NOT NULL THEN h.out_cold_date_three
        WHEN h.come_cold_date_two IS NOT NULL THEN h.come_cold_date_two
        WHEN h.out_cold_date_two IS NOT NULL THEN h.out_cold_date_two
        WHEN h.come_cold_date IS NOT NULL THEN h.come_cold_date
        ELSE h.out_cold_date
    END DESC
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY
        `;

            // Prepare requests
            const countRequest = pool.request();
            const mainRequest = pool.request();

            // Add parameters
            if (searchTerm) {
                countRequest.input('searchTerm', `%${searchTerm}%`);
                mainRequest.input('searchTerm', `%${searchTerm}%`);
            }

            // Add parameters for date range filtering
            if (startDate && endDate) {
                countRequest.input('startDate', formattedStartDate);
                countRequest.input('endDate', formattedEndDate);
                mainRequest.input('startDate', formattedStartDate);
                mainRequest.input('endDate', formattedEndDate);
            }

            mainRequest.input('offset', offset);
            mainRequest.input('pageSize', pageSizeNum); // Use converted value

            // Get total count
            const totalCountResult = await countRequest.query(countQuery);
            const totalCount = totalCountResult.recordset[0].total;

            console.log(`Found ${totalCount} total records matching criteria`);

            // Get data
            const result = await mainRequest.query(mainQuery);

            // Format data
            const formattedData = result.recordset.map(record => {
                const newRecord = { ...record };

                // Format date fields
                const dateFields = [
                    'prepCompleteTime',
                    'enterColdTime1', 'enterColdTime2', 'enterColdTime3',
                    'exitColdTime1', 'exitColdTime2', 'exitColdTime3'
                ];

                dateFields.forEach(field => {
                    if (newRecord[field]) {
                        newRecord[field] = newRecord[field].replace('T', ' ');
                    }
                });

                // Create entry/exit history
                newRecord.entryExitHistory = [];

                // Add cold room entry history
                [
                    { time: 'enterColdTime1', seq: 1 },
                    { time: 'enterColdTime2', seq: 2 },
                    { time: 'enterColdTime3', seq: 3 }
                ].forEach(entry => {
                    if (newRecord[entry.time]) {
                        newRecord.entryExitHistory.push({
                            type: 'enterColdRoom',
                            sequence: entry.seq,
                            time: newRecord[entry.time],
                            operator: 'unspecified'
                        });
                    }
                });

                // Add cold room exit history
                [
                    { time: 'exitColdTime1', seq: 1, nameField: 'exitOperator1' },
                    { time: 'exitColdTime2', seq: 2, nameField: 'exitOperator2' },
                    { time: 'exitColdTime3', seq: 3, nameField: 'exitOperator3' }
                ].forEach(entry => {
                    if (newRecord[entry.time]) {
                        newRecord.entryExitHistory.push({
                            type: 'exitColdRoom',
                            sequence: entry.seq,
                            time: newRecord[entry.time],
                            operator: newRecord[entry.nameField] || 'unspecified'
                        });
                    }
                });

                // Sort history by time
                newRecord.entryExitHistory.sort((a, b) => new Date(b.time) - new Date(a.time));

                // Add summary fields
                newRecord.latestStatus = newRecord.entryExitHistory.length > 0 ?
                    newRecord.entryExitHistory[0].type : '-';

                newRecord.latestStatusTime = newRecord.entryExitHistory.length > 0 ?
                    newRecord.entryExitHistory[0].time : null;

                // Add latest exit time field (used for filtering and display)
                const lastExitHistory = newRecord.entryExitHistory.find(h => h.type === 'exitColdRoom');
                newRecord.latestExitTime = lastExitHistory ? lastExitHistory.time : null;

                // Add latest entry time field
                const lastEnterHistory = newRecord.entryExitHistory.find(h => h.type === 'enterColdRoom');
                newRecord.latestEnterTime = lastEnterHistory ? lastEnterHistory.time : null;

                return newRecord;
            });

            // Send data with metadata
            return res.json({
                data: formattedData,
                total: totalCount,
                page: pageNum, // Use converted value
                pageSize: pageSizeNum, // Use converted value
                filterType: filterType, // Send filter type back to frontend
                filterParams: {
                    startDate: formattedStartDate,
                    endDate: formattedEndDate
                }
            });
        } catch (error) {
            console.error("Error fetching cold storage history:", error);
            return res.status(500).json({
                error: "Internal Server Error",
                message: error.message
            });
        }
    });










    // API สำหรับดึงข้อมูลน้ำหนักตามสถานะย้อนหลังตามช่วงเวลา
    router.get("/coldstorage/history/getWeightStats", async (req, res) => {
        try {
            const { hoursBack = 4 } = req.query;

            // คำนวณช่วงเวลาย้อนหลัง
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (parseInt(hoursBack) * 60 * 60 * 1000));

            const pool = await connectToDatabase();

            // ดึงข้อมูลจากประวัติการเข้า-ออกห้องเย็น และคำนวณน้ำหนักตามสถานะ
            const result = await pool.request()
                .input("startTime", sql.DateTime, startTime)
                .input("endTime", sql.DateTime, endTime)
                .query(`
                WITH TimeIntervals AS (
                    -- สร้างจุดเวลาทุก 30 นาที ในช่วงเวลาที่ต้องการ
                    SELECT DATEADD(MINUTE, (30 * number), @startTime) AS interval_time
                    FROM master.dbo.spt_values
                    WHERE type = 'P' 
                    AND number BETWEEN 0 AND DATEDIFF(MINUTE, @startTime, @endTime) / 30
                )
                
                SELECT 
                    CONVERT(VARCHAR, t.interval_time, 120) AS timestamp,
                    ROUND(COALESCE(SUM(CASE 
                        WHEN h.come_cold_date <= t.interval_time
                        AND (h.out_cold_date IS NULL OR h.out_cold_date > t.interval_time)
                        AND DATEDIFF(MINUTE, h.come_cold_date, t.interval_time) < rmg.cold * 60 * 0.5
                        THEN rmt.weight_RM ELSE 0 END), 0), 2) AS greenWeight,
                        
                    ROUND(COALESCE(SUM(CASE 
                        WHEN h.come_cold_date <= t.interval_time
                        AND (h.out_cold_date IS NULL OR h.out_cold_date > t.interval_time)
                        AND DATEDIFF(MINUTE, h.come_cold_date, t.interval_time) BETWEEN rmg.cold * 60 * 0.5 AND rmg.cold * 60 * 0.99
                        THEN rmt.weight_RM ELSE 0 END), 0), 2) AS yellowWeight,
                    
                    ROUND(COALESCE(SUM(CASE 
                        WHEN h.come_cold_date <= t.interval_time
                        AND (h.out_cold_date IS NULL OR h.out_cold_date > t.interval_time)
                        AND DATEDIFF(MINUTE, h.come_cold_date, t.interval_time) >= rmg.cold * 60
                        THEN rmt.weight_RM ELSE 0 END), 0), 2) AS redWeight
                FROM 
                    TimeIntervals t
                LEFT JOIN 
                    History h ON 
                    (h.come_cold_date <= t.interval_time AND (h.out_cold_date IS NULL OR h.out_cold_date > t.interval_time))
                    OR (h.come_cold_date_two <= t.interval_time AND (h.out_cold_date_two IS NULL OR h.out_cold_date_two > t.interval_time))
                    OR (h.come_cold_date_three <= t.interval_time AND (h.out_cold_date_three IS NULL OR h.out_cold_date_three > t.interval_time))
                LEFT JOIN 
                    RMInTrolley rmt ON rmt.hist_id_rmit = h.hist_id
                LEFT JOIN 
                    RMForProd rmf ON rmt.rmfp_id = rmf.rmfp_id
                LEFT JOIN 
                    RawMatGroup rmg ON rmf.rm_group_id = rmg.rm_group_id
                WHERE
                    rmg.cold IS NOT NULL
                GROUP BY 
                    t.interval_time
                ORDER BY 
                    t.interval_time
            `);

            // เพิ่มคำนวณน้ำหนักรวม
            const formattedData = result.recordset.map(item => {
                const greenWeight = parseFloat(item.greenWeight) || 0;
                const yellowWeight = parseFloat(item.yellowWeight) || 0;
                const redWeight = parseFloat(item.redWeight) || 0;

                return {
                    timestamp: item.timestamp,
                    greenWeight,
                    yellowWeight,
                    redWeight,
                    totalWeight: parseFloat((greenWeight + yellowWeight + redWeight).toFixed(2))
                };
            });

            res.status(200).json(formattedData);
        } catch (err) {
            console.error("Error fetching historical weight statistics:", err);
            res.status(500).json({
                success: false,
                error: "Failed to fetch historical data",
                details: err.message
            });
        }
    });

    router.get("/coldstorage/EmptyTrolley", async (req, res) => {
        try {
            const pool = await connectToDatabase();
            const result = await pool
                .request()
                .query(`
        SELECT 
          t.tro_id,
          cs.cs_name,
          s.slot_id
          
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
      `);

            res.json(result.recordset);
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.post("/coldstorages/scan/sap", async (req, res) => {
        const { mat, batch, hu } = req.body;


        if (!mat || !batch || !hu) {
            return res.status(400).json({
                success: false,
                message: "Missing or invalid required fields",
            });
        }


        let transaction;
        try {
            const pool = await connectToDatabase();
            transaction = new sql.Transaction(pool);
            await transaction.begin();


            // ✅ insert RMForProd
            const request = new sql.Request(transaction);
            await request
                .input("batch", batch)
                .input("mat", mat)
                .input("hu", hu)
                .input("status", "1")
                .query(`
        INSERT INTO SAP_Receive (batch, mat,hu,withdraw_date,status)
        VALUES (@batch, @mat, @hu,GETDATE(),@status)
      `);


            await transaction.commit();


            res.json({
                success: true,
                message: "บันทึกข้อมูลการสแกนเสร็จสิ้น",
                summary: { batch, mat, hu }, // ✅ ตัวอย่าง summary
            });
        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error("SQL error", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });


    router.get("/coldstorages/scan/sap", async (req, res) => {
        try {
            const pool = await connectToDatabase();
            const result = await pool
                .request()
                .query(`
        SELECT 
          s.sap_re_id,
          s.batch,
          s.mat,
          s.hu,
          FORMAT(s.withdraw_date, 'yyyy-MM-dd HH:mm:ss') AS withdraw_date
        FROM SAP_Receive s
        WHERE status = 1
      `);

            // ✅ ไม่ต้อง format ซ้ำ
            res.json(result.recordset);
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });





    router.put("/coldstorage/clearTrolley", async (req, res) => {
        try {
            const { tro_id } = req.body;
            const pool = await connectToDatabase();

            // เริ่มต้น Transaction พร้อม SERIALIZABLE
            const transaction = new sql.Transaction(pool);
            await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

            // helper function สำหรับ query ที่ผูกกับ transaction
            const t = () => transaction.request();

            try {
                // อัปเดทสถานะรถเข็นเป็น 1 (ว่าง) พร้อม lock
                const trolleyResult = await t()
                    .input('tro_id', sql.VarChar(4), tro_id)
                    .query(`
                    UPDATE Trolley
                    SET tro_status = 1,status = '2.1'
                    OUTPUT INSERTED.tro_id
                    WHERE tro_id = @tro_id
                `);

                if (trolleyResult.recordset.length === 0) {
                    await transaction.rollback();
                    return res.status(404).json({ error: "รถเข็นไม่พร้อมใช้งาน", tro_id });
                }

                // อัปเดต tro_id เป็น NULL ใน table Slot พร้อม lock
                await t()
                    .input('tro_id', sql.VarChar(4), tro_id)
                    .query(`
                    UPDATE Slot
                    SET tro_id = NULL ,status ='4587'
                    WHERE tro_id = @tro_id
                `);

                // Commit Transaction
                await transaction.commit();

                res.status(200).json({ message: "อัพเดตสถานะรถเข็นและล้าง tro_id ใน Slot สำเร็จ" });

            } catch (err) {
                // Rollback ถ้ามี error
                await transaction.rollback();
                console.error("Transaction failed:", err);
                res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัพเดตข้อมูล", detail: err.message });
            }

        } catch (error) {
            console.error("Database connection error:", error);
            res.status(500).json({ error: "Database connection error", detail: error.message });
        }
    });

    module.exports = router;
    return router;

};