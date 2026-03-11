const express = require("express");
const { connectToDatabase } = require("../database/db");
const sql = require("mssql");
const router = express.Router();

// เชื่อมต่อฐานข้อมูล
async function getPool() {
  return await connectToDatabase();
}

/**
 * @swagger
 * /api/rmfp/user:
 *    get:
 *      summary: ข้อมูลวัตถุดิบการผลิต-ที่พนักงานมีสิทธิ์การเข้าถึงข้อมูล
 *      parameters:
 *        - name: user_id
 *          in: query
 *          description: รหัสพนักงาน
 *          required: true
 *          schema:
 *            type: integer
 *        - name: wp_user_id
 *          in: query
 *          description: รหัสสถานที่ทำงาน
 *          required: true
 *          schema:
 *            type: integer
 *      responses:
 *        200:
 *          description: Successfull response
 *        500:
 *          description: Internal server error
 */

router.get("/rmfp/user", async (req, res) => {
  try {
    const { user_id, wp_user_id } = req.query;

    if (!user_id || !wp_user_id) {
      return res
        .status(400)
        .json({ success: false, error: "User ID and WP User ID are required" });
    }

    const pool = await connectToDatabase();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    const result = await pool
      .request()
      .input("user_id", user_id)
      .input("wp_user_id", wp_user_id).query(`
            SELECT  
                rm.mat,
                rm.mat_name,
                rmfp.batch,
                rmt.rm_type_name,
                l.line_name
            FROM 
                RMForProd rmfp
            JOIN 
                ProdRawMat prm ON prm.prod_rm_id = rmfp.prod_rm_id
            JOIN 
                RawMat rm ON rm.mat = prm.mat
            JOIN 
                RawMatGroup rmg ON rmg.rm_group_id = rm.rm_group_id
            JOIN 
                RawMatType rmt ON rmt.rm_type_id = rmg.rm_type_idz
            JOIN 
                Production p ON p.prod_id = prm.prod_id
            JOIN 
                Line l ON l.line_id = p.line_type_id
            JOIN 
                WorkplaceUsers wpu ON 
                    wpu.user_id = @user_id 
                    AND wpu.wp_user_id = @wp_user_id
                    AND (wpu.line_id = 1 OR wpu.line_id = l.line_type_id)
                    AND (wpu.rm_type_id = 1 OR wpu.rm_type_id = rmg.rm_type_id)
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

/**
 * @swagger
 * /api/checkRawMat:
 *    get:
 *      summary: ตรวจสอบวัตถุดิบในฐานข้อมูล
 *      description: ใช้ตรวจสอบว่าวัตถุดิบที่ระบุมีอยู่ในฐานข้อมูลหรือไม่
 *      tags:
 *        - Rawmat
 *      parameters:
 *        - in: query
 *          name: mat
 *          schema:
 *            type: string
 *          required: true
 *          description: รหัสของวัตถุดิบที่ต้องการตรวจสอบ
 *      responses:
 *        200:
 *          description: พบวัตถุดิบในฐานข้อมูล
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    example: true
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
 *                  message:
 *                    type: string
 *                    example: "Internal server error"
 */
router.get("/checkRawMat", async (req, res) => {
  try {
    // ใช้ req.query แทน req.body ในกรณีที่ข้อมูลมาจาก URL query string
    const mat = req.query.mat;

    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("mat", mat)
      .query("SELECT mat FROM RawMat WHERE mat = @mat");

    if (result.recordset.length > 0) {
      res.json({ success: true, message: "มีวัตถุดิบในระบบ" });
    } else {
      res.status(404).json({ success: false, message: "ไม่พบวัตถุดิบในระบบ" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/fetchRawMatName:
 *    get:
 *      summary: ดึงชื่อวัตถุดิบจากฐานข้อมูล
 *      description: ใช้เพื่อดึงข้อมูลชื่อของวัตถุดิบที่ระบุผ่านรหัสวัตถุดิบ (mat)
 *      tags:
 *        - Rawmat
 *      parameters:
 *        - in: query
 *          name: mat
 *          schema:
 *            type: string
 *          required: true
 *          description: รหัสของวัตถุดิบที่ต้องการดึงชื่อ
 *      responses:
 *        200:
 *          description: ส่งคืนข้อมูลสำเร็จ
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
 *                        mat_name:
 *                          type: string
 *                          example: "Raw Material A"
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
router.get("/fetchRawMatName", async (req, res) => {
  const mat = req.query.mat;
  try {
    const pool = await connectToDatabase();
    const result = await pool
      .request()
      .input("mat", mat)
      .query(`
        SELECT 
          rm.mat_name,
          rmg.rm_type_id
        FROM 
          RawMat rm
        JOIN
          RawMatCookedGroup rmcg ON rm.mat = rmcg.mat
        JOIN 
          RawMatGroup rmg ON  rmcg.rm_group_id = rmg.rm_group_id
        WHERE rm.mat = @mat  
        `
      );

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------[ RAWMAT TYPE ]-----------------------
/**
 * @swagger
 * /api/rawmat/types:
 *    get:
 *      summary: ดึงข้อมูลประเภทวัตถุดิบ (ยกเว้น rm_type_id = 1)
 *      description: แสดงประเภทวัตถุดิบที่ supervisor จะเลือกสถานที่วัตถุดิบการทำงานของพนักงานนั้น
 *      tags:
 *        - Rawmat
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูลประเภทวัตถุดิบ
 *        404:
 *          description: ไม่พบข้อมูล
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/rawmat/types", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    const result = await pool.request().query(`
        SELECT 
          rm_type_id, 
          rm_type_name 
        FROM RawMatType 
        WHERE rm_type_id != 1
      `);

    const data = result.recordset;

    if (!data.length) {
      return res
        .status(404)
        .json({ success: false, message: "No data found!" });
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

/**
 * @swagger
 * /api/add/rawmat/type:
 *    post:
 *      summary: เพิ่มประเภทวัตถุดิบใหม่
 *      description: เพิ่มข้อมูลประเภทวัตถุดิบใหม่ลงในฐานข้อมูล
 *      tags:
 *        - Rawmat
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                rm_type_name:
 *                  type: string
 *                  example: Loaf
 *      responses:
 *        201:
 *          description: สร้างข้อมูลสำเร็จ
 *        400:
 *          description: คำขอไม่ถูกต้อง
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post("/add/rawmat/type", async (req, res) => {
  const { rm_type_name } = req.body;

  if (!rm_type_name) {
    return res.status(400).json({
      success: false,
      error: "กรุณากรอกชื่อประเภทวัตถุดิบที่ต้องการเพิ่ม !!",
    });
  }

  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    const result = await pool
      .request()
      .input("rm_type_name", rm_type_name)
      .query(`INSERT INTO RawMatType (rm_type_name) VALUES (@rm_type_name)`);

    res.status(201).json({
      success: true,
      message: "เพิ่มประเภทวัตถุดิบสำเร็จ /",
    });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/rawmat/types/{id}:
 *    put:
 *      summary: แก้ไขข้อมูลประเภทวัตถุดิบ
 *      description: อัปเดตชื่อประเภทวัตถุดิบตามรหัสที่กำหนด
 *      tags:
 *        - Rawmat
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          description: รหัสประเภทวัตถุดิบ (rm_type_id)
 *          schema:
 *            type: integer
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                rm_type_name:
 *                  type: string
 *                  example: มดแดง
 *      responses:
 *        200:
 *          description: อัปเดตข้อมูลสำเร็จ
 *        400:
 *          description: คำขอไม่ถูกต้อง
 *        404:
 *          description: ไม่พบข้อมูลประเภทวัตถุดิบ
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put("/rawmat/types/:id", async (req, res) => {
  const { id } = req.params;
  const { rm_type_name } = req.body;

  if (!rm_type_name) {
    return res.status(400).json({
      success: false,
      error: "Missing required field: rm_type_name",
    });
  }

  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    const result = await pool
      .request()
      .input("id", id)
      .input("rm_type_name", rm_type_name).query(`
        UPDATE RawMatType
        SET rm_type_name = @rm_type_name
        WHERE rm_type_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Raw material type not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Raw material type updated successfully",
    });
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/delete/rawmat/type/{id}:
 *   delete:
 *     summary: ลบประเภทวัตถุดิบ
 *     description: ลบข้อมูลประเภทวัตถุดิบออกจากระบบ
 *     tags:
 *       - Rawmat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสประเภทวัตถุดิบที่ต้องการลบ
 *     responses:
 *       200:
 *         description: ลบข้อมูลประเภทวัตถุดิบสำเร็จ
 *       400:
 *         description: ไม่พบ rm_type_id หรือข้อมูลไม่ถูกต้อง
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.delete("/delete/rawmat/type/:id", async (req, res) => {
  try {
    const rm_type_id = req.params.id;

    if (!rm_type_id) {
      return res.status(400).json({ error: "กรุณาระบุ rm_type_id" });
    }

    const pool = await getPool();

    // ลบข้อมูลประเภทวัตถุดิบ
    const result = await pool
      .request()
      .input("rm_type_id", rm_type_id)
      .query(`DELETE FROM RawMatType WHERE rm_type_id = @rm_type_id`);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(400)
        .json({ error: "ไม่พบข้อมูลประเภทวัตถุดิบที่ต้องการลบ" });
    }

    res
      .status(200)
      .json({ message: `ลบข้อมูลประเภทวัตถุดิบ ${rm_type_id} สำเร็จ` });
  } catch (error) {
    console.error("Delete RawMatType Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

// ------------------------[ RAW MATERIALS ]----------------------------
/**
 * @swagger
 * /api/add/rawmat:
 *    post:
 *      summary: เพิ่มวัตถุดิบใหม่
 *      description: เพิ่มข้อมูลวัตถุดิบใหม่พร้อมกลุ่มที่เกี่ยวข้องลงในฐานข้อมูล
 *      tags:
 *        - Rawmat
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                mat:
 *                  type: string
 *                  example: RM001
 *                mat_name:
 *                  type: string
 *                  example: แป้งสาลี
 *                rm_group_ids:
 *                  type: array
 *                  items:
 *                    type: integer
 *                  example: [1, 2, 3]
 *      responses:
 *        201:
 *          description: เพิ่มวัตถุดิบสำเร็จ
 *        400:
 *          description: คำขอไม่ถูกต้อง
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post("/add/rawmat", async (req, res) => {
  const { mat, mat_name, rm_type_id, rm_group_ids } = req.body;

  if (!mat || !mat_name || !rm_type_id || !Array.isArray(rm_group_ids) || rm_group_ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: "กรุณาระบุ mat, mat_name, rm_type_id และ rm_group_ids (อย่างน้อย 1 ค่า) !!",
    });
  }

  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({ success: false, error: "Database connection failed" });
    }

    // ตรวจสอบ mat ซ้ำ
    const checkMat = await pool
      .request()
      .input("mat", mat)
      .query(`SELECT COUNT(*) AS count FROM RawMat WHERE mat = @mat`);

    if (checkMat.recordset[0].count > 0) {
      return res.status(400).json({ success: false, error: "Mat ซ้ำ มีรหัสวัตถุดิบนี้อยู่แล้ว" });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // เพิ่ม RawMat
      let request = new sql.Request(transaction);
      await request
        .input("mat", mat)
        .input("mat_name", mat_name)
        .query(`INSERT INTO RawMat (mat, mat_name) VALUES (@mat, @mat_name)`);

      // เพิ่ม RawMatCookedGroup
      for (const groupId of rm_group_ids) {
        request = new sql.Request(transaction);
        await request
          .input("mat", mat)
          .input("rm_group_id", groupId)
          .input("rm_type_id", rm_type_id)
          .query(`INSERT INTO RawMatCookedGroup (mat, rm_group_id, rm_type_id) VALUES (@mat, @rm_group_id, @rm_type_id)`);
      }

      await transaction.commit();
      res.status(201).json({ success: true, message: "เพิ่มวัตถุดิบใหม่พร้อมกลุ่มสำเร็จ" });
    } catch (txError) {
      await transaction.rollback();
      console.error("Transaction error:", txError);
      res.status(500).json({ success: false, error: "Transaction failed", details: txError.message });
    }
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
  }
});


/**
 * @swagger
 * /api/get/rawmat-groups/{rm_type_id}:
 *    get:
 *      summary: ดึงข้อมูลกลุ่มวัตถุดิบตามประเภท
 *      description: ดึงรายการกลุ่มวัตถุดิบที่มี rm_type_id ที่ระบุ
 *      tags:
 *        - Rawmat
 *      parameters:
 *        - in: path
 *          name: rm_type_id
 *          required: true
 *          schema:
 *            type: integer
 *          description: ID ของประเภทวัตถุดิบ
 *      responses:
 *        200:
 *          description: ดึงข้อมูลสำเร็จ
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    rm_group_id:
 *                      type: integer
 *                      example: 1
 *                    rm_group_name:
 *                      type: string
 *                      example: กลุ่ม A
 *        400:
 *          description: คำขอไม่ถูกต้อง
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/get/rawmat-groups/:rm_type_id", async (req, res) => {
  const { rm_type_id } = req.params;

  if (!rm_type_id) {
    return res.status(400).json({
      success: false,
      error: "กรุณาระบุ rm_type_id !!",
    });
  }

  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    const result = await pool.request().input("rm_type_id", rm_type_id).query(`
        SELECT rm_group_id, rm_group_name
        FROM RawMatGroup
        WHERE rm_type_id = @rm_type_id
      `);

    res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/get-rawmat:
 *    get:
 *      summary: ดึงข้อมูลกลุ่มวัตถุดิบ
 *      description: แสดงข้อมูล mat, mat_name และ rm_type
 *      tags:
 *        - Rawmat
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูลกลุ่มวัตถุดิบที่ปรุงแล้ว
 *        404:
 *          description: ไม่พบข้อมูล
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
/**
 * @swagger
 * /api/get-rawmat:
 *    get:
 *      summary: ดึงข้อมูลกลุ่มวัตถุดิบ
 *      description: แสดงข้อมูล mat, mat_name และ rm_type
 *      tags:
 *        - Rawmat
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูลกลุ่มวัตถุดิบที่ปรุงแล้ว
 *        404:
 *          description: ไม่พบข้อมูล
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/get-rawmat", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    // Query สำหรับข้อมูลวัตถุดิบ
    const rawMatResult = await pool.request().query(`
      SELECT 
          rm.mat,
          rm.mat_name,
          rmt.rm_type_id,
          rmt.rm_type_name
      FROM RawMat rm
      OUTER APPLY (
          SELECT TOP 1 rmt.rm_type_id, rmt.rm_type_name
          FROM RawMatCookedGroup rmcg
          JOIN RawMatGroup rmg ON rmg.rm_group_id = rmcg.rm_group_id
          JOIN RawMatType rmt ON rmt.rm_type_id = rmg.rm_type_id
          WHERE rmcg.mat = rm.mat
      ) rmt
    `);

    // Query สำหรับข้อมูลกลุ่ม
    const groupResult = await pool.request().query(`
      SELECT 
          mat,
          rm_group_id
      FROM RawMatCookedGroup
    `);

    const rawMatData = rawMatResult.recordset;
    const groupData = groupResult.recordset;

    if (!rawMatData.length && !groupData.length) {
      return res.status(404).json({
        success: false,
        message: "No data found!",
      });
    }

    // ส่งข้อมูลแบบแยกส่วน
    res.json({
      success: true,
      rawMaterials: rawMatData,
      groups: groupData,
    });
  } catch (error) {
    console.error("Error fetching raw materials and groups:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/update-rawmat:
 *    put:
 *      summary: แก้ไขข้อมูลวัตถุดิบ
 *      description: แก้ไขข้อมูลวัตถุดิบและกลุ่มที่เกี่ยวข้องในฐานข้อมูล โดยพิจารณาจาก mat
 *      tags:
 *        - Rawmat
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                mat:
 *                  type: string
 *                  example: RM001
 *                mat_name:
 *                  type: string
 *                  example: แป้งสาลี
 *                rm_group_ids:
 *                  type: array
 *                  items:
 *                    type: integer
 *                  example: [1, 2, 3]
 *      responses:
 *        200:
 *          description: แก้ไขวัตถุดิบสำเร็จ
 *        400:
 *          description: คำขอไม่ถูกต้อง
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put("/update-rawmat", async (req, res) => {
  const { mat, mat_name, rm_type_id, rm_group_ids } = req.body;

  // ตรวจสอบข้อมูลที่ได้รับ
 if (
    !mat ||
    !mat_name ||
    !rm_type_id ||
    !Array.isArray(rm_group_ids) ||
    rm_group_ids.length === 0
  ) {
    return res.status(400).json({
      success: false,
      error: "กรุณาระบุ mat, mat_name, rm_type_id และ rm_group_ids (อย่างน้อย 1 ค่า) !!",
    });
  }

  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    // 🔍 **ตรวจสอบว่า mat มีอยู่ในฐานข้อมูลหรือไม่**
    const checkMat = await pool
      .request()
      .input("mat", mat)
      .query(`SELECT COUNT(*) AS count FROM RawMat WHERE mat = @mat`);

    if (checkMat.recordset[0].count === 0) {
      return res.status(400).json({
        success: false,
        error: "ไม่พบรหัสวัตถุดิบที่ต้องการแก้ไข",
      });
    }

    // เริ่ม transaction
    const transaction = pool.transaction();
    await transaction.begin();

    // **อัปเดตชื่อวัตถุดิบ**
    await transaction
      .request()
      .input("mat", mat)
      .input("mat_name", mat_name)
      .query(`UPDATE RawMat SET mat_name = @mat_name WHERE mat = @mat`);

    // **ลบกลุ่มวัตถุดิบเดิม**
    await transaction
      .request()
      .input("mat", mat)
      .query(`DELETE FROM RawMatCookedGroup WHERE mat = @mat`);

    // **เพิ่มข้อมูลกลุ่มวัตถุดิบใหม่**
    for (const groupId of rm_group_ids) {
      await transaction
        .request()
        .input("mat", mat)
        .input("rm_group_id", groupId)
        .input("rm_type_id", rm_type_id)
        .query(
          `INSERT INTO RawMatCookedGroup (mat, rm_group_id,rm_type_id) VALUES (@mat, @rm_group_id,@rm_type_id)`
        );
    }

    // ✅ **ยืนยันการทำงาน**
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: "แก้ไขข้อมูลวัตถุดิบสำเร็จ",
    });
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/delete-rawmat/{mat}:
 *    delete:
 *      summary: ลบข้อมูลวัตถุดิบ
 *      description: ลบข้อมูลวัตถุดิบและกลุ่มที่เกี่ยวข้องในฐานข้อมูล
 *      tags:
 *        - Rawmat
 *      parameters:
 *        - in: path
 *          name: mat
 *          required: true
 *          schema:
 *            type: string
 *          description: รหัสวัตถุดิบที่ต้องการลบ
 *      responses:
 *        200:
 *          description: ลบวัตถุดิบสำเร็จ
 *        400:
 *          description: คำขอไม่ถูกต้อง
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.delete("/delete-rawmat/:mat", async (req, res) => {
  const { mat } = req.params;

  if (!mat) {
    return res.status(400).json({
      success: false,
      error: "กรุณาระบุรหัสวัตถุดิบที่ต้องการลบ",
    });
  }

  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    // เริ่ม transaction
    const transaction = pool.transaction();
    await transaction.begin();

    // **ลบความสัมพันธ์ใน RawMatCookedGroup ก่อน**
    await transaction
      .request()
      .input("mat", mat)
      .query(`DELETE FROM RawMatCookedGroup WHERE mat = @mat`);

    // **ลบข้อมูลจาก RawMat**
    const result = await transaction
      .request()
      .input("mat", mat)
      .query(`DELETE FROM RawMat WHERE mat = @mat`);

    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "ไม่พบรหัสวัตถุดิบที่ต้องการลบ",
      });
    }

    // ✅ **ยืนยันการทำงาน**
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: "ลบข้อมูลวัตถุดิบสำเร็จ",
    });
  } catch (error) {
    console.error("Error deleting data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/rawmat/not-prodrm:
 *    get:
 *      summary: ดึงข้อมูลวัตถุดิบทั้งหมด ที่ไม่ได้อยู่ในตาราง ProdRawMat
 *      description: คืนค่ารายการวัตถุดิบทั้งหมดจากฐานข้อมูล
 *      tags:
 *        - Rawmat
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูลวัตถุดิบ
 *        404:
 *          description: ไม่พบข้อมูล
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/rawmat/not-prodrm", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    const result = await pool.request().query(`
          SELECT 
            rm.mat, 
            rm.mat_name
          FROM 
            RawMat rm
          LEFT JOIN 
            ProdRawMat prm ON rm.mat = prm.mat
          WHERE 
            prm.mat IS NULL;
      `);

    const data = result.recordset;

    if (!data.length) {
      return res
        .status(404)
        .json({ success: false, message: "No data found!" });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching raw materials:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

router.get("/rawmat/AllSearch", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    // แก้ไข query โดยเพิ่ม DISTINCT เพื่อกรองข้อมูลที่ซ้ำกัน
    const result = await pool.request().query(`
          SELECT DISTINCT
            rm.mat
           
          FROM 
            RawMat rm
          LEFT JOIN 
            ProdRawMat prm ON rm.mat = prm.mat
          ORDER BY
            rm.mat
      `);

    const data = result.recordset;

    if (!data.length) {
      return res
        .status(404)
        .json({ success: false, message: "No data found!" });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching raw materials:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

router.get("/get/rawmat-groups", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    const result = await pool.request().query(`
        SELECT
          rmg.rm_group_id,
          rmg.rm_group_name,
          rmg.rm_type_id,
          rmt.rm_type_name,
          rmg.cooked_group,
          rmg.prep_to_pack,
          rmg.prep_to_cold,
          rmg.cold_to_pack,
          rmg.cold,
          rmg.rework
        FROM RawMatGroup rmg
        JOIN RawMatType rmt ON rmt.rm_type_id = rmg.rm_type_id
      `);

    res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

router.post("/add/rawmat-group", async (req, res) => {
  const {
    rm_group_name,
    rm_type_id,
    prep_to_cold,
    prep_to_pack,
    cold,
    cold_to_pack,
    rework,
    cooked_group
  } = req.body;

  // ตรวจสอบว่าข้อมูลที่ได้รับมาครบถ้วนหรือไม่
  if (
    !rm_group_name ||
    !rm_type_id ||
    prep_to_cold === null || // ต้องตรวจสอบค่า null เพราะ 0 อาจเป็นค่าที่ถูกต้อง
    prep_to_pack === null ||
    cold === null ||
    cold_to_pack === null ||
    rework === null ||
    cooked_group === null
  ) {
    return res.status(400).json({
      success: false,
      error: "กรุณากรอกข้อมูลให้ครบทุกช่อง!",
    });
  }

  try {
    const pool = await getPool(); // สร้างการเชื่อมต่อกับฐานข้อมูล
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    // ตรวจสอบว่าชื่อกลุ่มซ้ำหรือไม่
    const checkGroup = await pool
      .request()
      .input("rm_group_name", rm_group_name)
      .query(
        `SELECT COUNT(*) AS count FROM RawMatGroup WHERE rm_group_name = @rm_group_name`
      );

    if (checkGroup.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: "ชื่อกลุ่มซ้ำ กรุณาใช้ชื่ออื่น !!",
      });
    }

    // ทำการเพิ่มกลุ่มวัตถุดิบลงในฐานข้อมูล
    await pool
      .request()
      .input("rm_group_name", rm_group_name)
      .input("rm_type_id", rm_type_id)
      .input("prep_to_cold", prep_to_cold)
      .input("prep_to_pack", prep_to_pack)
      .input("cold", cold)
      .input("cold_to_pack", cold_to_pack)
      .input("rework", rework)
      .input("cooked_group", cooked_group)
      .query(
        `INSERT INTO RawMatGroup (rm_group_name, rm_type_id, prep_to_cold, prep_to_pack, cold, cold_to_pack, rework, cooked_group)
         VALUES (@rm_group_name, @rm_type_id, @prep_to_cold, @prep_to_pack, @cold, @cold_to_pack, @rework, @cooked_group)`
      );

    res.status(201).json({
      success: true,
      message: "เพิ่มกลุ่มวัตถุดิบสำเร็จ",
    });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});
router.post("/add/rawmat-group", async (req, res) => {
  const {
    rm_group_name,
    rm_type_id,
    prep_to_cold,
    prep_to_pack,
    cold,
    cold_to_pack,
    rework
  } = req.body;

  // ตรวจสอบว่าข้อมูลที่ได้รับมาครบถ้วนหรือไม่
  if (
    !rm_group_name ||
    !rm_type_id ||
    prep_to_cold === null || // ต้องตรวจสอบค่า null เพราะ 0 อาจเป็นค่าที่ถูกต้อง
    prep_to_pack === null ||
    cold === null ||
    cold_to_pack === null ||
    rework === null
  ) {
    return res.status(400).json({
      success: false,
      error: "กรุณากรอกข้อมูลให้ครบทุกช่อง!",
    });
  }

  try {
    const pool = await getPool(); // สร้างการเชื่อมต่อกับฐานข้อมูล
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    // ตรวจสอบว่าชื่อกลุ่มซ้ำหรือไม่
    const checkGroup = await pool
      .request()
      .input("rm_group_name", rm_group_name)
      .query(
        `SELECT COUNT(*) AS count FROM RawMatGroup WHERE rm_group_name = @rm_group_name`
      );

    if (checkGroup.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: "ชื่อกลุ่มซ้ำ กรุณาใช้ชื่ออื่น !!",
      });
    }

    // ทำการเพิ่มกลุ่มวัตถุดิบลงในฐานข้อมูล
    await pool
      .request()
      .input("rm_group_name", rm_group_name)
      .input("rm_type_id", rm_type_id)
      .input("prep_to_cold", prep_to_cold)
      .input("prep_to_pack", prep_to_pack)
      .input("cold", cold)
      .input("cold_to_pack", cold_to_pack)
      .input("rework", rework)
      .query(
        `INSERT INTO RawMatGroup (rm_group_name, rm_type_id, prep_to_cold, prep_to_pack, cold, cold_to_pack, rework)
         VALUES (@rm_group_name, @rm_type_id, @prep_to_cold, @prep_to_pack, @cold, @cold_to_pack, @rework)`
      );

    res.status(201).json({
      success: true,
      message: "เพิ่มกลุ่มวัตถุดิบสำเร็จ",
    });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});
router.put("/update/rawmat-group", async (req, res) => {
  const {
    rm_group_id,
    rm_group_name,
    rm_type_id,
    prep_to_pack,
    prep_to_cold,
    cold,
    cold_to_pack,
    rework,
  } = req.body;

  // ตรวจสอบว่าข้อมูลที่ได้รับมาครบถ้วนหรือไม่
  if (
    !rm_group_id ||
    !rm_group_name ||
    !rm_type_id ||
    prep_to_pack === "" ||
    prep_to_cold === "" ||
    cold_to_pack === "" ||
    cold === "" ||
    rework === ""
  ) {
    return res.status(400).json({
      success: false,
      error: "กรุณากรอกข้อมูลให้ครบทุกช่อง!",
    });
  }

  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
      });
    }

    // ตรวจสอบว่า rm_group_id มีอยู่ในระบบหรือไม่
    const checkGroup = await pool
      .request()
      .input("rm_group_id", rm_group_id)
      .query(
        "SELECT COUNT(*) AS count FROM RawMatGroup WHERE rm_group_id = @rm_group_id"
      );

    if (checkGroup.recordset[0].count === 0) {
      return res.status(400).json({
        success: false,
        error: "ไม่พบกลุ่มวัตถุดิบที่ต้องการอัปเดต",
      });
    }

    // ตรวจสอบว่าชื่อกลุ่มซ้ำหรือไม่ (ยกเว้นกลุ่มเดิมที่กำลังแก้ไข)
    const checkDuplicateName = await pool
      .request()
      .input("rm_group_name", rm_group_name)
      .input("rm_group_id", rm_group_id)
      .query(
        `SELECT COUNT(*) AS count FROM RawMatGroup 
         WHERE rm_group_name = @rm_group_name AND rm_group_id != @rm_group_id`
      );

    if (checkDuplicateName.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: "ชื่อกลุ่มซ้ำ กรุณาใช้ชื่ออื่น!",
      });
    }

    // ทำการอัปเดตข้อมูล
    await pool
      .request()
      .input("rm_group_id", rm_group_id)
      .input("rm_group_name", rm_group_name)
      .input("rm_type_id", rm_type_id)
      .input("prep_to_pack", parseFloat(prep_to_pack))
      .input("prep_to_cold", parseFloat(prep_to_cold))
      .input("cold", parseFloat(cold))
      .input("cold_to_pack", parseFloat(cold_to_pack))
      .input("rework", parseFloat(rework))
      .query(`
        UPDATE RawMatGroup
        SET rm_group_name = @rm_group_name,
            rm_type_id = @rm_type_id,
            prep_to_pack = @prep_to_pack,
            prep_to_cold = @prep_to_cold,
            cold = @cold,
            cold_to_pack = @cold_to_pack,
            rework = @rework
        WHERE rm_group_id = @rm_group_id
      `);

    res.status(200).json({
      success: true,
      message: "อัปเดตกลุ่มวัตถุดิบสำเร็จ",
    });
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});
/**
 * @swagger
 * /api/delete-rawmatgroup/{rm_group_id}:
 *    delete:
 *      summary: ลบข้อมูลกลุ่มวัตถุดิบ
 *      description: ลบข้อมูลกลุ่มวัตถุดิบในฐานข้อมูล
 *      tags:
 *        - RawmatGroup
 *      parameters:
 *        - in: path
 *          name: rm_group_id
 *          required: true
 *          schema:
 *            type: integer
 *          description: รหัสกลุ่มวัตถุดิบที่ต้องการลบ
 *      responses:
 *        200:
 *          description: ลบกลุ่มวัตถุดิบสำเร็จ
 *        400:
 *          description: คำขอไม่ถูกต้อง
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.delete("/delete-rawmatgroup/:rm_group_id", async (req, res) => {
  const { rm_group_id } = req.params;

  if (!rm_group_id) {
    return res.status(400).json({
      success: false,
      error: "กรุณาระบุรหัสกลุ่มวัตถุดิบที่ต้องการลบ",
    });
  }

  try {
    const pool = await getPool();

    // Use the pool to make queries
    const result = await pool
      .request()
      .input("rm_group_id", rm_group_id) // Adjust the data type as needed
      .query("DELETE FROM RawMatGroup WHERE rm_group_id = @rm_group_id");

    if (result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: "ลบข้อมูลกลุ่มวัตถุดิบสำเร็จ",
      });
    } else {
      return res.status(404).json({
        success: false,
        error: "ไม่พบกลุ่มวัตถุดิบที่ต้องการลบ",
      });
    }
  } catch (error) {
    console.error("Error deleting rawmat group:", error);
    return res.status(500).json({
      success: false,
      error: "ข้อผิดพลาดภายในเซิร์ฟเวอร์",
    });
  }
});
/**
 * @swagger
 * /api/rmintrolley:
 *    get:
 *      summary: ดึงข้อมูลวัตถุดิบในรถเข็น
 *      description: แสดงข้อมูลวัตถุดิบที่อยู่ในรถเข็นทั้งหมด
 *      tags:
 *        - RawMat Trolley
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูลวัตถุดิบในรถเข็น
 *        404:
 *          description: ไม่พบข้อมูล
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/rmintrolley", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    // Query เพื่อดึงข้อมูลวัตถุดิบในรถเข็นและ join กับตารางที่เกี่ยวข้อง
    const result = await pool.request().query(`
      SELECT 
        rm.rm_tro_id,
        rm.rmit_date,
        rm.tro_id,
        rm.rmfp_id,
        rm.rm_mix,
        rm.tro_production_id,
        rm.weight_per_tro,
        rm.ntray,
        rm.stay_place,
        rm.dest,
        rm.rm_status,
        rm.weight_RM,
        rm.cooked_date,
        rmfp.batch,
        prm.mat,
        rawm.mat_name,
        prm.prod_id,
        p.doc_no AS production_plan_name 
      FROM RMInTrolley rm
      LEFT JOIN RMForProd rmfp ON rm.rmfp_id = rmfp.rmfp_id
      LEFT JOIN ProdRawMat prm ON rmfp.prod_rm_id = prm.prod_rm_id
      LEFT JOIN RawMat rawm ON prm.mat = rawm.mat
      LEFT JOIN Production p ON prm.prod_id = p.prod_id  
      WHERE rm.stay_place = 'จุดเตรียม'
      AND rm.dest = 'หม้ออบ'
      AND rm.rm_status = 'รอ Qc'
    `);

    const data = result.recordset;

    if (!data.length) {
      // ส่งข้อมูลตัวอย่างหรือข้อความแจ้งเตือน
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลวัตถุดิบในรถเข็น" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching trolley data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

//  1. ดึงข้อมูลกลุ่มวัตถุดิบ (RawMatGroup)
router.get( "/rawmat-groups", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT TOP (1000) 
          [rm_group_id],
          [rm_group_name], 
          [rm_type_id],
          [prep_to_cold],
          [prep_to_pack],
          [cold],
          [cold_to_pack],
          [rework],
          [cooked_group]
        FROM [PFCMv2].[dbo].[RawMatGroup]
        ORDER BY [rm_group_name]
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching raw mat groups:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลกลุ่มวัตถุดิบ' });
  }
});

// 2. ดึงข้อมูลประเภทวัตถุดิบ (RawMatType)
router.get('/rawmat-types', async (req, res) => {
  try {
   const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT TOP (1000) 
          [rm_type_id],
          [rm_type_name]
        FROM [PFCMv2].[dbo].[RawMatType]
        ORDER BY [rm_type_name]
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching raw mat types:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทวัตถุดิบ' });
  }
});

// 3. ตรวจสอบว่า mat มีอยู่ใน RawMat หรือไม่
router.post('/check-existing-materials', async (req, res) => {
  try {
    const { materials } = req.body;
    const pool = await getPool();
    
    // สร้าง IN clause สำหรับตรวจสอบ mat ที่มีอยู่แล้ว
    const matValues = materials.map(m => `'${m.mat}'`).join(',');
    
    const result = await pool.request()
      .query(`
        SELECT [mat] 
        FROM [PFCMv2].[dbo].[RawMat]
        WHERE [mat] IN (${matValues})
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error checking existing materials:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });
  }
});

// 4. ตรวจสอบว่า mat + rm_group_id มีอยู่ใน RawMatCookedGroup หรือไม่
router.post('/check-existing-cooked-groups', async (req, res) => {
  try {
    const { materials } = req.body;
   const pool = await getPool();
    
    // สร้างเงื่อนไขสำหรับตรวจสอบ
    const conditions = materials.map(m => 
      `([mat] = '${m.mat}' AND [rm_group_id] = ${m.rm_group_id})`
    ).join(' OR ');
    
    const result = await pool.request()
      .query(`
        SELECT [mat], [rm_group_id]
        FROM [PFCMv2].[dbo].[RawMatCookedGroup]
        WHERE ${conditions}
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error checking existing cooked groups:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });
  }
});


router.post('/save-materials', async (req, res) => {
  const { materials } = req.body;
  let transaction;

  if (!Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'ไม่มีข้อมูล materials'
    });
  }

  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let savedCount = 0;
    let skippedMaterials = [];
    let skippedCookedGroups = [];

    // ===== 1. สร้าง TVP สำหรับ mat =====
    const matTable = new sql.Table();
    matTable.columns.add('mat', sql.VarChar(50));
    materials.forEach(m => matTable.rows.add(m.mat));

    const existingMatsResult = await transaction.request()
      .input('MatList', matTable)
      .query(`
        SELECT r.mat
        FROM @MatList ml
        JOIN [PFCMv2].[dbo].[RawMat] r ON ml.mat = r.mat
      `);
    const existingMats = existingMatsResult.recordset.map(r => r.mat);

    // ===== 2. สร้าง TVP สำหรับ mat + rm_group_id =====
    const matGroupTable = new sql.Table();
    matGroupTable.columns.add('mat', sql.VarChar(50));
    matGroupTable.columns.add('rm_group_id', sql.Int);
    materials.forEach(m => matGroupTable.rows.add(m.mat, m.rm_group_id));

    const existingCookedGroupsResult = await transaction.request()
      .input('MatGroupList', matGroupTable)
      .query(`
        SELECT cg.mat, cg.rm_group_id
        FROM @MatGroupList mg
        JOIN [PFCMv2].[dbo].[RawMatCookedGroup] cg
          ON mg.mat = cg.mat AND mg.rm_group_id = cg.rm_group_id
      `);
    const existingCookedGroups = existingCookedGroupsResult.recordset;

    // ===== 3. Insert RawMat =====
    for (const material of materials) {
      if (!existingMats.includes(material.mat)) {
        await transaction.request()
          .input('mat', sql.VarChar, material.mat)
          .input('mat_name', sql.NVarChar, material.mat_name)
          .query(`
            INSERT INTO [PFCMv2].[dbo].[RawMat] ([mat], [mat_name])
            VALUES (@mat, @mat_name)
          `);
        savedCount++;
      } else {
        skippedMaterials.push(material.mat);
      }
    }

    // ===== 4. Insert RawMatCookedGroup =====
    for (const material of materials) {
      const exists = existingCookedGroups.some(
        cg => cg.mat === material.mat && cg.rm_group_id === material.rm_group_id
      );
      if (!exists) {
        await transaction.request()
          .input('mat', sql.VarChar, material.mat)
          .input('rm_group_id', sql.Int, material.rm_group_id)
          .input('rm_type_id', sql.Int, material.rm_type_id)
          .query(`
            INSERT INTO [PFCMv2].[dbo].[RawMatCookedGroup]
            ([mat], [rm_group_id], [rm_type_id])
            VALUES (@mat, @rm_group_id, @rm_type_id)
          `);
      } else {
        skippedCookedGroups.push(`${material.mat} (${material.rm_group_id})`);
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      savedCount,
      skippedMaterials,
      skippedCookedGroups,
      message: `บันทึกข้อมูลสำเร็จ ${savedCount} รายการ`
    });

  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    console.error('Error saving materials:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      details: error.message
    });
  }
});


// 6. ดึงข้อมูล RawMat ทั้งหมด (สำหรับตรวจสอบ)
router.get('/rawmat', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT TOP (1000) 
          [mat],
          [mat_name]
        FROM [PFCMv2].[dbo].[RawMat]
        ORDER BY [mat]
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลวัตถุดิบ' });
  }
});

// 7. ดึงข้อมูล RawMatCookedGroup ทั้งหมด (สำหรับตรวจสอบ)
router.get('/rawmat-cooked-groups', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT TOP (1000) 
          [rmcg_id],
          [mat],
          [rm_group_id], 
          [rm_type_id]
        FROM [PFCMv2].[dbo].[RawMatCookedGroup]
        ORDER BY [rmcg_id]
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching cooked groups:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
});

// 8. ดึงข้อมูลรายงานแบบ JOIN (สำหรับแสดงผลข้อมูลที่สมบูรณ์)
router.get('/materials-report', async (req, res) => {
  try {
   const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          rm.[mat],
          rm.[mat_name],
          rmcg.[rm_group_id],
          rmg.[rm_group_name],
          rmcg.[rm_type_id], 
          rmt.[rm_type_name],
          rmcg.[rmcg_id]
        FROM [PFCMv2].[dbo].[RawMat] rm
        INNER JOIN [PFCMv2].[dbo].[RawMatCookedGroup] rmcg 
          ON rm.[mat] = rmcg.[mat]
        INNER JOIN [PFCMv2].[dbo].[RawMatGroup] rmg 
          ON rmcg.[rm_group_id] = rmg.[rm_group_id]
        INNER JOIN [PFCMv2].[dbo].[RawMatType] rmt 
          ON rmcg.[rm_type_id] = rmt.[rm_type_id]
        ORDER BY rm.[mat]
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching materials report:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน' });
  }
});

// 9. ลบข้อมูลวัตถุดิบ (สำหรับการจัดการ)
router.delete('/materials/:mat', async (req, res) => {
  const { mat } = req.params;
  let transaction;
  
  try {
  const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    // ลบจาก RawMatCookedGroup ก่อน (เพราะเป็น Foreign Key)
    await transaction.request()
      .input('mat', sql.VarChar, mat)
      .query(`
        DELETE FROM [PFCMv2].[dbo].[RawMatCookedGroup] 
        WHERE [mat] = @mat
      `);
    
    // ลบจาก RawMat
    const result = await transaction.request()
      .input('mat', sql.VarChar, mat)
      .query(`
        DELETE FROM [PFCMv2].[dbo].[RawMat] 
        WHERE [mat] = @mat
      `);
    
    await transaction.commit();
    
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } else {
      res.status(404).json({ success: false, message: 'ไม่พบข้อมูลที่ต้องการลบ' });
    }
    
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    
    console.error('Error deleting material:', error);
    res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการลบข้อมูล',
      details: error.message 
    });
  }
});



module.exports = router;