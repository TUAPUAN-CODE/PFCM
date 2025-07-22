const express = require("express");
const { connectToDatabase } = require("../database/db");
const router = express.Router();

/**
 * @swagger
 * /api/header/pos/{pos_id}:
 *   get:
 *     summary: ดึงข้อมูลตำแหน่งจาก pos_id
 *     description: ใช้สำหรับดึงข้อมูลตำแหน่งจากฐานข้อมูลโดยระบุ pos_id
 *     tags:
 *       - Header
 *     parameters:
 *       - in: path
 *         name: pos_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสตำแหน่งที่ต้องการดึงข้อมูล
 *     responses:
 *       200:
 *         description: ดึงข้อมูลตำแหน่งสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 position:
 *                   type: object
 *                   properties:
 *                     pos_id:
 *                       type: integer
 *                     pos_name:
 *                       type: string
 *       404:
 *         description: ไม่พบตำแหน่งที่ต้องการ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.get("/header/pos/:pos_id", async (req, res) => {
    const pos_id = req.params.pos_id; // รับ pos_id จาก URL params
    try {
      const pool = await connectToDatabase();
  
      const result = await pool.request()
        .input('pos_id', pos_id) // กำหนดชนิดข้อมูลให้เหมาะสมกับฐานข้อมูล
        .query('SELECT pos_id, pos_name FROM Position WHERE pos_id = @pos_id'); // ใช้ @pos_id แทนการเชื่อมโยงตรงๆ
  
      if (result.recordset.length > 0) {
        res.status(200).json({
          message: "Successfully retrieved position",
          position: result.recordset[0], // ส่งคืนตำแหน่งที่ตรงกับ pos_id
        });
      } else {
        res.status(404).json({ message: "Position not found" });
      }
    } catch (error) {
      console.error("Error retrieving position:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
});

/**
 * @swagger
 * /api/header/wp/{wp_id}:
 *   get:
 *     summary: ดึงข้อมูลสถานที่ทำงานจาก wp_id
 *     description: ใช้สำหรับดึงข้อมูลสถานที่ทำงานจากฐานข้อมูลโดยระบุ wp_id
 *     tags:
 *       - Header
 *     parameters:
 *       - in: path
 *         name: wp_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสสถานที่ทำงานที่ต้องการดึงข้อมูล
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสถานที่ทำงานสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 workplace:
 *                   type: object
 *                   properties:
 *                     wp_id:
 *                       type: integer
 *                     wp_name:
 *                       type: string
 *       404:
 *         description: ไม่พบสถานที่ทำงานที่ต้องการ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.get("/header/wp/:wp_id", async (req, res) => {
    const wp_id = req.params.wp_id; // รับ pos_id จาก URL params
    try {
      const pool = await connectToDatabase();
  
      const result = await pool.request()
        .input('wp_id', wp_id) // กำหนดชนิดข้อมูลให้เหมาะสมกับฐานข้อมูล
        .query('SELECT wp_id, wp_name FROM Workplace WHERE wp_id = @wp_id'); // ใช้ @pos_id แทนการเชื่อมโยงตรงๆ
  
      if (result.recordset.length > 0) {
        res.status(200).json({
          message: "Successfully retrieved position",
          workplace: result.recordset[0], 
        });
      } else {
        res.status(404).json({ message: "workplace not found" });
      }
    } catch (error) {
      console.error("Error retrieving workplace:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
});

/**
 * @swagger
 * /api/rawmat/{rm_type_id}:
 *   get:
 *     summary: ดึงชื่อประเภทวัตถุดิบจาก rm_type_id
 *     description: ใช้สำหรับดึงข้อมูลชื่อประเภทวัตถุดิบจากฐานข้อมูลโดยระบุ rm_type_id
 *     tags:
 *       - Header
 *     parameters:
 *       - in: path
 *         name: rm_type_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสประเภทวัตถุดิบที่ต้องการดึงข้อมูล
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 rawMaterial:
 *                   type: object
 *                   properties:
 *                     rm_type_id:
 *                       type: integer
 *                     rm_type_name:
 *                       type: string
 *       404:
 *         description: ไม่พบข้อมูลประเภทวัตถุดิบที่ต้องการ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */

router.get("/rawmat/:rm_type_id", async (req, res) => {
  const { rm_type_id } = req.params;

  try {
      const pool = await connectToDatabase();

      const result = await pool.request()
          .input("rm_type_id",  rm_type_id)
          .query("SELECT rm_type_id, rm_type_name FROM RawMatType WHERE rm_type_id = @rm_type_id");

      if (result.recordset.length > 0) {
          res.status(200).json({
              message: "Successfully retrieved raw material type",
              rawMaterial: result.recordset[0],
          });
      } else {
          res.status(404).json({ message: "Raw material type not found" });
      }
  } catch (error) {
      console.error("Error retrieving raw material type:", error);
      res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;