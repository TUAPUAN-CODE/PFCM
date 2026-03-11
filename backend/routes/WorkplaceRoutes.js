const express = require("express");
const { connectToDatabase } = require("../database/db");
const router = express.Router();
// เชื่อมต่อฐานข้อมูล
async function getPool() {
  return await connectToDatabase();
}


/**
 * @swagger
 * /api/fetchWorkplace:
 *    get:
 *      summary: ดึงรายการสถานที่ทำงาน
 *      description: ใช้เพื่อดึงข้อมูลสถานที่ทำงานทั้งหมดจากระบบ
 *      tags: 
 *        - Workplace
 *      responses:
 *        200:
 *          description: ดึงข้อมูลสถานที่ทำงานสำเร็จ
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    description: สถานะการดึงข้อมูล
 *                    example: true
 *                  data:
 *                    type: array
 *                    description: รายการสถานที่ทำงาน
 *                    items:
 *                      type: object
 *                      properties:
 *                        wp_id:
 *                          type: integer
 *                          description: รหัสสถานที่ทำงาน
 *                          example: 1
 *                        wp_name:
 *                          type: string
 *                          description: ชื่อสถานที่ทำงาน
 *                          example: "โรงงาน A"
 *        500:
 *          description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    description: สถานะการทำงานของ API
 *                    example: false
 *                  error:
 *                    type: string
 *                    description: รายละเอียดข้อผิดพลาด
 *                    example: "Internal server error"
 */
router.get("/fetchWorkplace", async (req, res) => {
  try {
    const pool = await connectToDatabase();

    const result = await pool.request().query(`
        Select 
            wp_id,
            wp_name 
        From Workplace
      `);

    const data = result.recordset;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/get/workplaces:
 *    get:
 *      summary: ดึงข้อมูล wp_id และ wp_name
 *      description: ใช้สำหรับดึงรายชื่อสถานที่ทำงานทั้งหมด
 *      tags:
 *        - Workplace
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูล wp_id และ wp_name
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/get/workplaces", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    const result = await pool.request().query(`
      SELECT 
        wp_id, 
        wp_name 
      FROM Workplace
    `);

    const data = result.recordset;

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching workplaces:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

// -------------------------[ QC ]---------------------------
/**
 * @swagger
 * /api/wp/userQC:
 *    get:
 *      summary: แสดงข้อมูลสถานที่ที่พนักงาน QC มีสิทธิ์ในการเข้าถึง
 *      tags:
 *          - Workplace
 *      parameters:
 *        - name: user_id
 *          in: query
 *          description: รหัสพนักงาน
 *          required: true
 *          schema:
 *            type: integer
 *      responses:
 *        200:
 *          description: Successfull response
 *        500:
 *          description: Internal server error
 */
// Select ข้อมูลสถานที่ทำงานของพนักงานทั้งหมดที่มีสิทธิ์เข้าถึงได้ของ user_id นั้นๆ มีหลายที่
// เพื่อให้พนักงานเลือกสถานที่ทำงานที่ต้องการทำได้
router.get("/wp/userQC", async (req, res) => {
  try {
    const user_id = req.query.user_id;

    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, error: "User ID are required" });
    }

    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }
    const result = await pool.request().input("user_id", user_id).query(`
        SELECT
          wpu.wp_user_id,
          rmt.rm_type_name
        FROM
          WorkplaceUsers wpu
          JOIN RawMatType rmt ON rmt.rm_type_id = wpu.rm_type_id
        WHERE 
          user_id = @user_id
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

// -------------------------[ QC ]---------------------------
/**
 * @swagger
 * /api/wp/selectQC:
 *    get:
 *      summary: เลือกสถานที่ทำงานของ QC
 *      tags:
 *          - Workplace
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
// ฟังก์ชันสำหรับรับข้อมูลที่พนักงานเลือกสถานที่แล้ว
// จึงนำสถานที่ที่พนักงานเลือกมาพิจารณาข้อมูลสถานที่นั้นเพื่อการแสดงข้อมูลของวัตถุดิบ
router.get("/wp/selectQC", async (req, res) => {
  try {
    const { user_id, wp_user_id } = req.query;

    if (!user_id || !wp_user_id) {
      return res
        .status(400)
        .json({ success: false, error: "User ID and WP User ID are required" });
    }

    const pool = await getPool();
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
          wp_user_id,
          user_id,
          rm_type_id
        FROM 
          WorkplaceUsers
        WHERE 
          user_id = @user_id AND
          wp_user_id = @wp_user_id
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





module.exports = router;