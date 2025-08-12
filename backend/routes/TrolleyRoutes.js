const express = require("express");
const { connectToDatabase } = require("../database/db");
const router = express.Router();
const sql = require("mssql");

/**
 * @swagger
 * /api/checkTrolley:
 *    get:
 *      summary: ตรวจสอบสถานะของรถเข็น
 *      description: ตรวจสอบว่ารถเข็นที่ระบุพร้อมใช้งานหรือไม่
 *      tags: 
 *        - Trolley
 *      parameters:
 *        - in: query
 *          name: tro
 *          required: true
 *          schema:
 *            type: string
 *          description: รหัสของรถเข็น
 *      responses:
 *        200:
 *          description: ตรวจสอบสถานะสำเร็จ
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
 *                    example: "รถเข็นพร้อมใช้งาน"
 *        201:
 *          description: ตรวจสอบสถานะสำเร็จ
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
 *                    example: "รถเข็นไม่พร้อมใช้งาน"
 *        404:
 *          description: ไม่พบข้อมูลรถเข็น
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
 *                    example: "ไม่มีรถเข็นคันนี้ในระบบ"
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
router.get("/checkTrolley", async (req, res) => {
  const tro = req.query.tro;

  if (!tro) {
    return res.status(400).json({ success: false, message: "กรุณาระบุหมายเลขรถเข็น (tro)" });
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("tro_id", tro)
      .query(`
        SELECT tro_status
        FROM Trolley
        WHERE tro_id = @tro_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่มีรถเข็นคันนี้ในระบบ" });
    }

    const troStatus = result.recordset[0].tro_status;

    if (troStatus === '1') {
      return res.status(200).json({ success: true, message: "รถเข็นพร้อมใช้งาน" });
    } else if (troStatus === '0') {
      return res.status(200).json({ success: true, message: "รถเข็นไม่พร้อมใช้งาน" });
    } else if (troStatus === 'rsrv') {
      return res.status(200).json({ success: true, message: "รถเข็นถูกจองใช้งาน" });
    } else {
      return res.status(200).json({ success: true, message: `รถเข็นอยู่ในสถานะพิเศษ: ${troStatus}` });
    }

  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในระบบฐานข้อมูล" });
  }
});

router.post("/reserveTrolley", async (req, res) => {
  const { tro_id } = req.body;

  if (!tro_id) {
    return res.status(400).json({ success: false, message: "กรุณาระบุหมายเลขรถเข็น (tro_id)" });
  }

  try {
    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("tro_id", tro_id)
      .query(`
        UPDATE Trolley
        SET tro_status = 'rsrv', rsrv_timestamp = GETDATE()
        WHERE tro_id = @tro_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบรถเข็นที่ระบุ" });
    }

    res.status(200).json({ success: true, message: "อัปเดตสถานะรถเข็นเป็น 'ถูกจองใช้งาน' เรียบร้อยแล้ว" });

  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในระบบฐานข้อมูล" });
  }
});

router.post("/re/reserveTrolley", async (req, res) => {
  const { tro_id } = req.body;

  if (!tro_id) {
    return res.status(400).json({ success: false, message: "กรุณาระบุหมายเลขรถเข็น (tro_id)" });
  }

  try {
    const pool = await connectToDatabase();

    const result = await pool
      .request()
      .input("tro_id", tro_id)
      .query(`
        UPDATE Trolley
        SET tro_status = '1', rsrv_timestamp = null
        WHERE tro_id = @tro_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบรถเข็นที่ระบุ" });
    }

    res.status(200).json({ success: true, message: "อัปเดตสถานะรถเข็นเป็น 'พร้อมใช้งาน' เรียบร้อยแล้ว" });

  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในระบบฐานข้อมูล" });
  }
});

router.get("/cold/checkin/check/Trolley", async (req, res) => {
  const { tro_id, cs_id, slot_id, selectedOption } = req.query;

  try {
    const pool = await connectToDatabase();
    const sql = require("mssql");

    // ตรวจสอบว่ารถเข็นมีอยู่ในระบบและได้สถานะ
    const trolleyResult = await pool
      .request()
      .input("tro_id", sql.VarChar(4), tro_id)
      .query("SELECT tro_status FROM Trolley WHERE tro_id = @tro_id");

    if (trolleyResult.recordset.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่พบรถเข็นในระบบ" });
    }

    const tro_status = trolleyResult.recordset[0].tro_status;

    // ตรวจสอบสถานะรถเข็นเฉพาะเมื่อ selectedOption เป็น "รถเข็นว่าง"
    if (selectedOption === "รถเข็นว่าง") {
      if (tro_status === '0') {
        return res.status(400).json({ success: false, message: "รถเข็นไม่พร้อมใช้งาน" });
      }

      if (tro_status === 'rsrv') {
        return res.status(400).json({ success: false, message: "รถเข็นไม่พร้อมใช้งาน" });
      }

      if (tro_status !== '1') {
        // สถานะอื่นๆ ที่ไม่คาดคิด
        return res.status(400).json({ 
          success: false, 
          message: `รถเข็นอยู่ในสถานะที่ไม่สามารถใช้งานได้: ${tro_status}` 
        });
      }
    }

    // ตรวจสอบว่ารถเข็นอยู่ในห้องเย็นอยู่แล้วหรือไม่
    const trolleyInColdResult = await pool
      .request()
      .input("tro_id", sql.VarChar(4), tro_id)
      .query("SELECT cs_id, slot_id FROM Slot WHERE tro_id = @tro_id");

    if (trolleyInColdResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: `รถเข็นนี้อยู่ในห้องเย็นอยู่แล้ว (ช่อง ${trolleyInColdResult.recordset[0].slot_id})`
      });
    }

    // ตรวจสอบว่าช่องเก็บว่างหรือไม่
    const slotResult = await pool
      .request()
      .input("cs_id", sql.Int, cs_id)
      .input("slot_id", sql.VarChar, slot_id)
      .query("SELECT tro_id FROM Slot WHERE cs_id = @cs_id AND slot_id = @slot_id");

    if (slotResult.recordset.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่พบช่องเก็บนี้ในระบบ" });
    }

    const currentSlotTroId = slotResult.recordset[0].tro_id;
    if (currentSlotTroId !== null && currentSlotTroId !== 'rsrv') {
      return res.status(400).json({ success: false, message: "ช่องเก็บนี้ไม่ว่าง" });
    }

    // เช็คกรณี "รถเข็นว่าง" แยกออกมาต่างหาก
    if (selectedOption === "รถเข็นว่าง") {
      // อัพเดทสถานะรถเข็นเป็น 'rsrv' และบันทึก timestamp
      await pool
        .request()
        .input("tro_id", sql.VarChar(4), tro_id)
        .query(`
          UPDATE Trolley 
          SET tro_status = 'rsrv', rsrv_timestamp = GETDATE() 
          WHERE tro_id = @tro_id
        `);

      return res.status(200).json({ success: true, message: "รับเข้ารถเข็นว่าง" });
    }

    // สำหรับกรณีอื่นๆ (ไม่ใช่รถเข็นว่าง) ต้องตรวจสอบวัตถุดิบในรถเข็น
    const rmResult = await pool
      .request()
      .input("tro_id", sql.VarChar(4), tro_id)
      .query("SELECT dest, rmm_line_name, rm_status FROM TrolleyRMMapping WHERE tro_id = @tro_id");

    if (rmResult.recordset.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่พบวัตถุดิบในรถเข็นนี้" });
    }

    // ตรวจสอบว่าวัตถุดิบทั้งหมดในรถเข็นมี dest เป็น "เข้าห้องเย็น" หรือไม่
    const invalidDestItems = rmResult.recordset.filter(item => item.dest !== "เข้าห้องเย็น");

    if (invalidDestItems.length > 0) {
      // จัดกลุ่มวัตถุดิบตาม dest
      const destGroups = invalidDestItems.reduce((groups, item) => {
        if (!groups[item.dest]) {
          groups[item.dest] = [];
        }
        groups[item.dest].push(item);
        return groups;
      }, {});

      // สร้างข้อความแสดงผล
      let errorMessage = "รถเข็นนี้มีวัตถุดิบที่ไม่ได้มีปลายทางเป็นห้องเย็น:";
      Object.keys(destGroups).forEach(dest => {
        const items = destGroups[dest];
        errorMessage += `\n วัตถุดิบอยู่ที่ ${dest} (${items.length} รายการ)`;
        
        // เพิ่มรายละเอียดวัตถุดิบถ้าต้องการ
        if (dest === "บรรจุ") {
          items.forEach(item => {
            errorMessage += `\n  - ${item.rmm_line_name}`;
          });
        }
      });

      return res.status(400).json({
        success: false,
        message: errorMessage,
        details: {
          invalidDestinations: Object.keys(destGroups).map(dest => ({
            destination: dest,
            count: destGroups[dest].length,
            items: dest === "บรรจุ" ? destGroups[dest].map(item => item.rmm_line_name) : undefined
          }))
        }
      });
    }

    // ตรวจสอบเงื่อนไขของ selectedOption และ rm_status
    const statusMap = {
      "วัตถุดิบรอแก้ไข": ["รอแก้ไข"],
      "วัตถุดิบรับฝาก": ["QcCheck รอกลับมาเตรียม", "QcCheck รอ MD", "รอ Qc", "รอกลับมาเตรียม"],
      "วัตถุดิบตรง": ["QcCheck"],
      "เหลือจากไลน์ผลิต": ["เหลือจากไลน์ผลิต"],
    };

    if (selectedOption in statusMap) {
      const validStatuses = statusMap[selectedOption];
      
      const invalidStatusItems = rmResult.recordset.filter(item => !validStatuses.includes(item.rm_status));

      if (invalidStatusItems.length === 0) {
        return res.status(200).json({ success: true, message: `รับเข้า${selectedOption}` });
      } else {
        const invalidStatuses = [...new Set(invalidStatusItems.map(item => item.rm_status))];
        return res.status(400).json({ 
          success: false, 
          message: `ไม่ตรงเงื่อนไขรับเข้า${selectedOption} มีวัตถุดิบที่มีสถานะไม่ถูกต้อง: ${invalidStatuses.join(', ')}` 
        });
      }
    }

    return res.status(400).json({ success: false, message: "ตัวเลือกไม่ถูกต้อง" });
    
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/cold/clear/Trolley", async (req, res) => {
  const { tro_id } = req.body;
  try {
    const pool = await connectToDatabase();

    const result = await pool.request()
      .input("tro_id", sql.NVarChar(4), tro_id)
      .query(`SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id`);
    const mappingIds = result.recordset.map(row => row.mapping_id);

    if (mappingIds.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลรถเข็นในระบบ" });
    }

    for (const mapping_id of mappingIds) {
      await pool.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
          UPDATE TrolleyRMMapping 
          SET 
            rm_status = NULL,
            dest = 'บรรจุเสร็จสิ้น',
            stay_place = 'บรรจุเสร็จสิ้น',
            tro_id = NULL 
          WHERE 
            mapping_id = @mapping_id
        `);
    }

    // ลบข้อมูลจาก PackTrolley ที่มี tro_id ตรงกัน
    await pool.request()
      .input("tro_id", sql.NVarChar(4), tro_id)
      .query(`DELETE FROM PackTrolley WHERE tro_id = @tro_id`);

    await pool.request()
      .input("tro_id", sql.NVarChar(4), tro_id)
      .query(`UPDATE Trolley SET tro_status = 1 WHERE tro_id = @tro_id`);

    return res.status(200).json({ success: true, message: 'รถเข็นถูกเคลียร์เรียบร้อยแล้ว' });
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/trolley/status/reset/return/rawmat', async (req, res) => {
  const { tro_id } = req.body;

  // Validate input
  if (!tro_id) {
    return res.status(400).json({
      success: false,
      message: 'tro_id is required'
    });
  }

  try {
    const pool = await connectToDatabase(); // ใช้ฟังก์ชันเดียวกับ API ตัวแรก

    // หา mapping_id ทั้งหมดที่ผูกกับ tro_id
    const result = await pool.request()
      .input("tro_id", sql.NVarChar(4), tro_id)
      .query(`SELECT mapping_id FROM TrolleyRMMapping WHERE tro_id = @tro_id`);

    const mappingIds = result.recordset.map(row => row.mapping_id);

    if (mappingIds.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลรถเข็นในระบบ" });
    }

    // เคลียร์ mapping
    for (const mapping_id of mappingIds) {
      await pool.request()
        .input("mapping_id", sql.Int, mapping_id)
        .query(`
          UPDATE TrolleyRMMapping 
          SET 
            tro_id = NULL 
          WHERE 
            mapping_id = @mapping_id
        `);
    }

    
    // รีเซ็ตสถานะ trolley
    await pool.request()
      .input("tro_id", sql.NVarChar(4), tro_id)
      .query(`UPDATE Trolley SET tro_status = 1 WHERE tro_id = @tro_id`);

    return res.status(200).json({
      success: true,
      message: 'Trolley status reset successfully'
    });

  } catch (error) {
    console.error('Error updating trolley status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});


module.exports = router;