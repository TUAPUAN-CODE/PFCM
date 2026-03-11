const express = require("express");
const bcrypt = require("bcrypt");
const { connectToDatabase } = require("../database/db");

const router = express.Router();

// เชื่อมต่อฐานข้อมูล
async function getPool() {
  return await connectToDatabase();
}

// -------------------------[ LOGIN ]---------------------------
/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: ลงชื่อเข้าสู่ระบบ
 *     description: ตรวจสอบรหัสผ่านและเข้าสู่ระบบ
 *     tags:
 *       - user
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: รหัสพนักงาน
 *                 required: true
 *               password:
 *                 type: string
 *                 description: รหัสผ่าน
 *                 required: true
 *     responses:
 *       200:
 *         description: Login success
 *       401:
 *         description: Invalid username or password
 *       500:
 *         description: Internal server error
 */
router.post("/login", async (req, res) => {
  try {
    const { user_id, password } = req.body;
    if (!user_id || !password) {
      return res.status(400).json({ error: "กรุณากรอก user_id และ password" });
    }

    const pool = await getPool();

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
    const userQuery = await pool.request()
      .input("user_id", user_id)
      .query(`
        SELECT 
          u.user_id,
          u.first_name,
          u.last_name,
          u.password,
          u.birthday,
          u.leader,
          u.pos_id,
          u.wp_id
        FROM 
          Users u
        WHERE 
          u.user_id = @user_id
      `);

    if (userQuery.recordset.length === 0) {
      return res.status(401).json({ error: "ไม่พบผู้ใช้หรือรหัสผ่านผิดพลาด" });
    }

    const user = userQuery.recordset[0];
    const hashedPassword = user.password;

    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    }

    // ดึงข้อมูล rm_type_id จากตาราง WorkplaceUsers แบบใหม่
    const rmTypeQuery = await pool.request()
      .input("user_id", user_id)
      .query(`
        SELECT STRING_AGG(CAST(rm_type_id AS NVARCHAR), ',') AS rm_type_ids
        FROM WorkplaceUsers 
        WHERE user_id = @user_id
      `);

    // แปลงผลลัพธ์เป็น array ของ rm_type_id
    const rm_type_ids = rmTypeQuery.recordset[0].rm_type_ids 
      ? rmTypeQuery.recordset[0].rm_type_ids.split(',').map(Number) 
      : [];

    res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      user: {
        ...user,
        rm_type_id: rm_type_ids
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

// -------------------------[ SIGNUP ]---------------------------
/**
 * @swagger
 * /api/signup:
 *   put:
 *     summary: ลงทะเบียน
 *     description: ตรวจสอบข้อมูลผู้ใช้ในฐานข้อมูล รวมถึงบันทึกรหัสผ่าน และว/ด/ป เกิด ของพนักงาน
 *     tags:
 *          - user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: รหัสพนักงาน
 *                 required: true
 *               password:
 *                 type: string
 *                 description: รหัสผ่าน
 *                 required: true
 *               confirmPassword:
 *                 type: string
 *                 description: ยืนยันรหัสผ่าน
 *                 required: true
 *               birthday:
 *                 type: string
 *                 description: วันเกิด
 *                 required: true
 *     responses:
 *       200:
 *         description: อัปเดตรหัสผ่านสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ครบถ้วน หรือรหัสผ่านไม่ปลอดภัย หรือรหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน
 *       404:
 *         description: ไม่พบผู้ใช้
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put("/signup", async (req, res) => {
  try {
    const { user_id, password, confirmPassword, birthday } = req.body;

    // ตรวจสอบค่าที่ส่งมา
    if (!user_id || !password || !confirmPassword || !birthday) {
      return res.status(400).json({
        error: "กรุณากรอก user_id, password, confirmPassword และ birthday",
      });
    }

    // ตรวจสอบว่ารหัสผ่านและ confirmPassword ตรงกันหรือไม่
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ error: "รหัสผ่านและยืนยันรหัสผ่านต้องตรงกัน" });
    }

    // ตรวจสอบความยาวของรหัสผ่าน
    if (password.length < 5) {
      return res
        .status(400)
        .json({ error: "รหัสผ่านต้องมีอย่างน้อย 5 ตัวอักษร" });
    }

    const pool = await getPool();

    // ตรวจสอบว่าผู้ใช้มีบัญชีอยู่แล้วหรือไม่
    const userCheck = await pool
      .request()
      .input("user_id", user_id)
      .query(
        "SELECT user_id, password, birthday FROM Users WHERE user_id = @user_id"
      );

    if (
      userCheck.recordset.length > 0 &&
      userCheck.recordset[0].password &&
      userCheck.recordset[0].birthday
    ) {
      return res.status(400).json({ error: "คุณมีบัญชีอยู่แล้ว" });
    }

    // แฮชรหัสผ่านใหม่ด้วย bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // อัปเดต password และ birthday
    const result = await pool
      .request()
      .input("user_id", user_id)
      .input("password", hashedPassword)
      .input("birthday", birthday)
      .query(
        "UPDATE Users SET password = @password, birthday = @birthday WHERE user_id = @user_id"
      );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "ไม่สามารถอัปเดตข้อมูลได้" });
    }

    res.status(200).json({ message: "อัปเดตรหัสผ่านสำเร็จ" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

// ---------------------[ SUPV: ADD USER ]---------------------

/**
 * @swagger
 * /api/add-user:
 *   post:
 *     summary: เพิ่มผู้ใช้ลงในฐานข้อมูล
 *     description: เพิ่มข้อมูลผู้ใช้และตรวจสอบ wp_id เพื่อกำหนดว่าจะต้องเพิ่มใน WorkplaceUsers
 *     tags:
 *          - user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: รหัสพนักงาน
 *                 required: true
 *                 example: 1234
 *               first_name:
 *                 type: string
 *                 description: ชื่อ
 *                 required: true
 *                 example: "taohu"
 *               last_name:
 *                 type: string
 *                 description: นามสกุล
 *                 required: true
 *                 example: "bua"
 *               leader:
 *                 type: integer
 *                 description: หัวหน้าทีม (default = 0)
 *                 example: 6760051
 *               pos_id:
 *                 type: integer
 *                 description: รหัสตำแหน่ง
 *                 required: true
 *                 example: 5
 *               wp_id:
 *                 type: integer
 *                 description: รหัสพื้นที่ทำงาน
 *                 required: true
 *                 example: 1
 *     responses:
 *       201:
 *         description: เพิ่มผู้ใช้สำเร็จ
 *       400:
 *         description: ข้อมูลไม่ครบถ้วน
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post("/add-user", async (req, res) => {
  try {
    const { user_id, first_name, last_name, leader, pos_id, wp_id } = req.body;

    if (!user_id || !first_name || !last_name || !pos_id || !wp_id) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
    }

    const pool = await getPool();

    // ตรวจสอบว่า user_id มีอยู่ในฐานข้อมูลแล้วหรือยัง
    const userCheckResult = await pool
      .request()
      .input("user_id", user_id)
      .query(`SELECT user_id FROM Users WHERE user_id = @user_id`);

    if (userCheckResult.recordset.length > 0) {
      return res
        .status(400)
        .json({ error: "ไม่สามารถเพิ่มได้ เนื่องจากรหัสพนักงานนี้มีอยู่แล้ว" });
    }

    // เพิ่ม User ลงในฐานข้อมูล
    await pool
      .request()
      .input("user_id", user_id)
      .input("first_name", first_name)
      .input("last_name", last_name)
      .input("leader", leader || 0) // default = 0
      .input("pos_id", pos_id || 1)
      .input("wp_id", wp_id).query(`
        INSERT INTO Users (user_id, first_name, last_name, leader, pos_id, wp_id)
        VALUES (@user_id, @first_name, @last_name, @leader, @pos_id, @wp_id)
      `);

    // ถ้า wp_id ไม่ใช่ 2 หรือ 3 -> เพิ่ม rm_type_id = 1 ใน WorkplaceUsers ทันที
    if (wp_id !== 2 && wp_id !== 3) {
      await pool.request().input("user_id", user_id).input("rm_type_id", 1)
        .query(`
          INSERT INTO WorkplaceUsers (user_id, rm_type_id)
          VALUES (@user_id, @rm_type_id)
        `);
    }

    res.status(201).json({ message: "เพิ่มผู้ใช้สำเร็จ" });
  } catch (error) {
    console.error("Add User Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

/**
 * @swagger
 * /api/add-workplace-user:
 *   post:
 *     summary: เพิ่มสถานที่ทำงานของพนักงาน
 *     description: เพิ่มข้อมูลผู้ใช้เข้าตารางสถานที่ทำงานของผู้ใช้ ตามเงื่อนไขสถานที่ทำงานและประเภทวัตถุดิบ( wp_id และ rm_type_id )
 *     tags:
 *          - user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: รหัสพนักงาน
 *                 required: true
 *                 example: 1234
 *               rm_type_id:
 *                 type: integer
 *                 description: ประเภทวัตถุดิบที่สามารถทำงานได้
 *                 required: true
 *                 example: 1
 *     responses:
 *       201:
 *         description: เพิ่มข้อมูล WorkplaceUser สำเร็จ
 *       400:
 *         description: ข้อมูลไม่ครบถ้วน หรือ rm_type_id ไม่ถูกต้อง
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post("/add-workplace-user", async (req, res) => {
  try {
    const { user_id, rm_type_id } = req.body;

    if (!user_id || !rm_type_id) {
      return res
        .status(400)
        .json({ error: "กรุณากรอก user_id และ rm_type_id" });
    }

    const pool = await getPool();

    // ตรวจสอบ wp_id ของ user_id
    const wpResult = await pool
      .request()
      .input("user_id", user_id)
      .query(`SELECT wp_id FROM Users WHERE user_id = @user_id`);

    if (wpResult.recordset.length === 0) {
      return res.status(400).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    const wp_id = wpResult.recordset[0].wp_id;

    // ตรวจสอบเงื่อนไข rm_type_id
    if ([1, 4, 5, 6].includes(wp_id) && rm_type_id !== 1) {
      return res
        .status(400)
        .json({ error: "ไม่สามารถเลือกประเภทวัตถุดิบนี้ได้ !!" });
    }
    if ([2, 3].includes(wp_id) && rm_type_id === 1) {
      return res
        .status(400)
        .json({ error: "ไม่สามารถเลือกประเภทวัตถุดิบนี้ได้ !!" });
    }

    // ตรวจสอบว่ามี user_id และ rm_type_id นี้ใน WorkplaceUsers แล้วหรือไม่
    const checkExisting = await pool
      .request()
      .input("user_id", user_id)
      .input("rm_type_id", rm_type_id).query(`
        SELECT rm_type_id FROM WorkplaceUsers
        WHERE user_id = @user_id AND rm_type_id = @rm_type_id
      `);

    if (checkExisting.recordset.length > 0) {
      return res
        .status(400)
        .json({ error: "ข้อมูลซ้ำกัน! พนักงานมีประเภทวัตถุดิบนี้อยู่แล้ว" });
    }

    // ตรวจสอบเงื่อนไข wp_id = 2 (user_id สามารถมีแค่ 1 rm_type_id เท่านั้น)
    if (wp_id === 2) {
      const checkUserExist = await pool
        .request()
        .input("user_id", user_id)
        .query(`SELECT user_id FROM WorkplaceUsers WHERE user_id = @user_id`);

      if (checkUserExist.recordset.length > 0) {
        return res
          .status(400)
          .json({ error: "จุดเตรียมมีประเภทวัตถุดิบอยู่แล้ว !!" });
      }
    }

    // ตรวจสอบ wp_id = 3 (สามารถเพิ่มได้เรื่อย ๆ แต่ต้องไม่ซ้ำกัน)
    if (wp_id === 3) {
      const checkDuplicate = await pool
        .request()
        .input("user_id", user_id)
        .input("rm_type_id", rm_type_id).query(`
          SELECT rm_type_id FROM WorkplaceUsers
          WHERE user_id = @user_id AND rm_type_id = @rm_type_id
        `);

      if (checkDuplicate.recordset.length > 0) {
        return res
          .status(400)
          .json({ error: "ข้อมูลซ้ำกัน! พนักงานมีประเภทวัตถุดิบนี้อยู่แล้ว" });
      }
    }

    // เพิ่มข้อมูลเข้า WorkplaceUsers
    await pool
      .request()
      .input("user_id", user_id)
      .input("rm_type_id", rm_type_id).query(`
        INSERT INTO WorkplaceUsers (user_id, rm_type_id)
        VALUES (@user_id, @rm_type_id)
      `);

    res
      .status(201)
      .json({ message: "เพิ่มข้อมูลประเภทวัตถุดิบของพนักงานสำเร็จ /" });
  } catch (error) {
    console.error("Add WorkplaceUser Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

/**
 * @swagger
 * /api/get/positions:
 *    get:
 *      summary: ดึงข้อมูล pos_id และ pos_name
 *      description: ใช้สำหรับดึงรายชื่อตำแหน่งทั้งหมด
 *      tags:
 *        - user
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูล pos_id และ pos_name
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/get/positions", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    const result = await pool.request().query(`
      SELECT 
        pos_id, 
        pos_name 
      FROM Position
    `);

    const data = result.recordset;

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/* --------------------[ SUPV: UPDATE USER ]------------------- */
/**
 * @swagger
 * /api/update-user:
 *   put:
 *     summary: อัปเดตข้อมูลผู้ใช้ในฐานข้อมูล
 *     description: แก้ไขข้อมูลผู้ใช้โดยใช้ user_id เป็นตัวระบุ
 *     tags:
 *       - user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: รหัสพนักงาน
 *                 required: true
 *                 example: 1234
 *               first_name:
 *                 type: string
 *                 description: ชื่อ
 *                 example: "taohu"
 *               last_name:
 *                 type: string
 *                 description: นามสกุล
 *                 example: "bua"
 *               leader:
 *                 type: integer
 *                 description: หัวหน้าทีม (default = 0)
 *                 example: 6760051
 *               pos_id:
 *                 type: integer
 *                 description: รหัสตำแหน่ง
 *                 example: 5
 *               wp_id:
 *                 type: integer
 *                 description: รหัสพื้นที่ทำงาน
 *                 example: 1
 *     responses:
 *       200:
 *         description: อัปเดตข้อมูลผู้ใช้สำเร็จ
 *       400:
 *         description: ข้อมูลไม่ครบถ้วนหรือไม่พบ user_id
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put("/update-user", async (req, res) => {
  try {
    const { user_id, first_name, last_name, leader, pos_id, wp_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "กรุณาระบุ user_id" });
    }

    const pool = await getPool();

    // ตรวจสอบว่า user_id มีอยู่ในฐานข้อมูลหรือไม่
    const userCheckResult = await pool
      .request()
      .input("user_id", user_id)
      .query(`SELECT user_id FROM Users WHERE user_id = @user_id`);

    if (userCheckResult.recordset.length === 0) {
      return res.status(400).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    // อัปเดตข้อมูลผู้ใช้
    await pool
      .request()
      .input("user_id", user_id)
      .input("first_name", first_name || null)
      .input("last_name", last_name || null)
      .input("leader", leader || 0)
      .input("pos_id", pos_id || null)
      .input("wp_id", wp_id || null).query(`
        UPDATE Users
        SET first_name = COALESCE(@first_name, first_name),
            last_name = COALESCE(@last_name, last_name),
            leader = COALESCE(@leader, leader),
            pos_id = COALESCE(@pos_id, pos_id),
            wp_id = COALESCE(@wp_id, wp_id)
        WHERE user_id = @user_id
      `);

    res.status(200).json({ message: "อัปเดตข้อมูลผู้ใช้สำเร็จ" });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

/**
 * @swagger
 * /api/update-workplace-user:
 *   put:
 *     summary: อัปเดตข้อมูลสถานที่ทำงานของพนักงาน
 *     description: อัปเดตข้อมูล rm_type_id ของ user_id โดยตรวจสอบว่ามีอยู่แล้วหรือไม่ และลบข้อมูลที่ถูกลบออกจาก frontend
 *     tags:
 *       - user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: รหัสพนักงาน
 *                 required: true
 *                 example: 1234
 *               rm_type_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: ประเภทวัตถุดิบที่สามารถทำงานได้ (อาร์เรย์ของ rm_type_id)
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: อัปเดตข้อมูล WorkplaceUser สำเร็จ
 *       400:
 *         description: ข้อมูลไม่ครบถ้วน หรือ rm_type_id ไม่ถูกต้อง
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put("/update-workplace-user", async (req, res) => {
  try {
    const { user_id, rm_type_ids } = req.body;

    if (!user_id || !Array.isArray(rm_type_ids)) {
      return res
        .status(400)
        .json({ error: "กรุณากรอก user_id และ rm_type_ids (array)" });
    }

    const pool = await getPool();

    // ดึง wp_id ของ user_id
    const wpResult = await pool
      .request()
      .input("user_id", user_id)
      .query(`SELECT wp_id FROM Users WHERE user_id = @user_id`);

    if (wpResult.recordset.length === 0) {
      return res.status(400).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    const wp_id = wpResult.recordset[0].wp_id;

    // ถ้า wp_id ไม่ใช่ 2 หรือ 3 ต้องเพิ่ม rm_type_id = 1
    let updatedRmTypeIds = [...rm_type_ids];
    if (![2, 3].includes(wp_id) && !updatedRmTypeIds.includes(1)) {
      updatedRmTypeIds.push(1);
    }

    // ถ้า wp_id = 2 ต้องล้าง rm_type_id ทั้งหมดก่อน แล้วเพิ่มอันใหม่
    if (wp_id === 2) {
      await pool.request().input("user_id", user_id).query(`
        DELETE FROM WorkplaceUsers WHERE user_id = @user_id
      `);
    }

    // ดึงข้อมูล rm_type_id ปัจจุบันของ user_id
    const existingRMs = await pool
      .request()
      .input("user_id", user_id)
      .query(`SELECT rm_type_id FROM WorkplaceUsers WHERE user_id = @user_id`);

    const existingRMIDs = existingRMs.recordset.map((row) => row.rm_type_id);

    // ข้อมูลที่ต้อง INSERT (ที่ไม่มีอยู่ใน database)
    const newRMs = updatedRmTypeIds.filter((id) => !existingRMIDs.includes(id));

    // ข้อมูลที่ต้อง DELETE (ที่มีอยู่ใน database แต่ไม่มีในข้อมูลใหม่)
    const deletedRMs = existingRMIDs.filter(
      (id) => !updatedRmTypeIds.includes(id)
    );

    // ลบข้อมูลที่ไม่มีในข้อมูลใหม่ (ยกเว้นกรณี wp_id = 2 ที่ลบไปแล้ว)
    if (wp_id !== 2 && deletedRMs.length > 0) {
      await pool.request().input("user_id", user_id).query(`
          DELETE FROM WorkplaceUsers 
          WHERE user_id = @user_id AND rm_type_id IN (${deletedRMs.join(",")})
        `);
    }

    // เพิ่มข้อมูลใหม่ที่ยังไม่มีใน database
    for (const rm_type_id of newRMs) {
      await pool
        .request()
        .input("user_id", user_id)
        .input("rm_type_id", rm_type_id).query(`
          INSERT INTO WorkplaceUsers (user_id, rm_type_id)
          VALUES (@user_id, @rm_type_id)
        `);
    }

    res
      .status(200)
      .json({ message: "อัปเดตข้อมูลสถานที่ทำงานของพนักงานสำเร็จ" });
  } catch (error) {
    console.error("Update WorkplaceUser Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

/**
 * @swagger
 * /api/users:
 *    get:
 *      summary: ข้อมูลผู้ใช้ทั้งหมดที่เกี่ยวข้อง
 *      description: แสดงข้อมูลของผู้ใช้ทั้งหมด รวมถึงข้อมูลชื่อหัวหน้า ตำแหน่ง สถานที่ทำงาน และประเภทวัตถุดิบที่เกี่ยวข้อง
 *      tags:
 *        - user
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูลผู้ใช้ทั้งหมด
 *        404:
 *          description: ไม่พบข้อมูล
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/users", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    // ข้อมูลรายละเอียดของผู้ใช้
    const userResult = await pool.request().query(`
      SELECT 
        u.user_id,
        u.first_name,
        u.last_name,
        u.leader,
        l.first_name AS leader_first_name,
        l.last_name AS leader_last_name,
        u.pos_id,
        u.wp_id
      FROM 
        Users u
      LEFT JOIN 
        Users l ON u.leader = l.user_id
    `);

    const users = userResult.recordset;

    if (!users.length) {
      return res
        .status(404)
        .json({ success: false, message: "No users found!" });
    }

    // ชื่อของสถานที่ และตำแหน่ง
    const posWpResult = await pool.request().query(`
      SELECT 
        p.pos_id,
        p.pos_name,
        wp.wp_id,
        wp.wp_name
      FROM 
        Position p
      JOIN
        Workplace wp ON wp.wp_id = p.pos_id
    `);

    const posWpMap = {};
    posWpResult.recordset.forEach(({ pos_id, pos_name, wp_id, wp_name }) => {
      posWpMap[pos_id] = { pos_name, wp_id, wp_name };
    });

    // การเข้าถึงวัตถุดิบของผู้ใช้
    const rmTypeResult = await pool.request().query(`
      SELECT 
        wpu.user_id,
        STRING_AGG(CAST(wpu.rm_type_id AS VARCHAR), ',') AS rm_type_ids,
        STRING_AGG(rmt.rm_type_name, ', ') AS rm_type_names
      FROM 
        WorkplaceUsers wpu
      JOIN 
        RawMatType rmt ON rmt.rm_type_id = wpu.rm_type_id
      GROUP BY wpu.user_id
    `);

    const rmTypeMap = {};
    const rmTypeIdMap = {};
    rmTypeResult.recordset.forEach(
      ({ user_id, rm_type_ids, rm_type_names }) => {
        rmTypeMap[user_id] = rm_type_names;
        rmTypeIdMap[user_id] = rm_type_ids;
      }
    );

    // Merge data
    const finalData = users.map((user) => ({
      ...user,
      pos_name: posWpMap[user.pos_id]?.pos_name || null,
      wp_name: posWpMap[user.wp_id]?.wp_name || null,
      rm_type_names: rmTypeMap[user.user_id] || null,
      rm_type_ids: rmTypeIdMap[user.user_id]
        ? rmTypeIdMap[user.user_id].split(",").map(Number) // แปลงเป็น Array ของตัวเลข
        : [],
    }));

    res.json({ success: true, data: finalData });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/* --------------------[ SUPV: DELETE USER ]------------------- */
/**
 * @swagger
 * /api/delete-user/{user_id}:
 *   delete:
 *     summary: ลบข้อมูลพนักงาน
 *     description: ลบข้อมูลพนักงานออกจากระบบ โดยจะลบข้อมูลจาก WorkplaceUsers ก่อน แล้วจึงลบจาก Users
 *     tags:
 *       - user
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสพนักงานที่ต้องการลบ
 *     responses:
 *       200:
 *         description: ลบข้อมูลพนักงานสำเร็จ
 *       400:
 *         description: ไม่พบ user_id หรือข้อมูลไม่ถูกต้อง
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.delete("/delete-user/:user_id", async (req, res) => {
  try {
    const user_id = req.params.user_id;

    if (!user_id) {
      return res.status(400).json({ error: "กรุณาระบุ user_id" });
    }

    const pool = await getPool();

    // ลบข้อมูลในตาราง WorkplaceUsers ก่อน
    await pool
      .request()
      .input("user_id", user_id)
      .query(`DELETE FROM WorkplaceUsers WHERE user_id = @user_id`);

    // ลบข้อมูลในตาราง Users
    await pool
      .request()
      .input("user_id", user_id)
      .query(`DELETE FROM Users WHERE user_id = @user_id`);

    res.status(200).json({ message: `ลบข้อมูลผู้ใช้ ${user_id} สำเร็จ` });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

/**
 * @swagger
 * /api/forgot-password:
 *   put:
 *     summary: ลืมรหัสผ่าน - อัปเดตรหัสผ่านใหม่
 *     description: ตรวจสอบวันเกิด และเปลี่ยนรหัสผ่านใหม่
 *     tags:
 *       - user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: รหัสพนักงาน
 *               birthday:
 *                 type: string
 *                 description: วันเกิดของพนักงาน (YYYY-MM-DD)
 *               password:
 *                 type: string
 *                 description: รหัสผ่านใหม่
 *               confirmPassword:
 *                 type: string
 *                 description: ยืนยันรหัสผ่านใหม่
 *     responses:
 *       200:
 *         description: เปลี่ยนรหัสผ่านสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง หรือรหัสผ่านไม่ตรงกัน
 *       404:
 *         description: ไม่พบผู้ใช้ หรือวันเกิดไม่ตรงกัน
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put("/forgot-password", async (req, res) => {
  try {
    const { user_id, birthday, password, confirmPassword } = req.body;

    // ตรวจสอบค่าที่ส่งมา
    if (!user_id || !birthday || !password || !confirmPassword) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ error: "รหัสผ่านและยืนยันรหัสผ่านต้องตรงกัน" });
    }

    if (password.length < 5) {
      return res
        .status(400)
        .json({ error: "รหัสผ่านต้องมีอย่างน้อย 5 ตัวอักษร" });
    }

    const pool = await getPool();

    // ค้นหาผู้ใช้และตรวจสอบวันเกิด
    const userCheck = await pool
      .request()
      .input("user_id", user_id)
      .query("SELECT user_id, birthday FROM Users WHERE user_id = @user_id");

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    // แปลงวันเกิดในฐานข้อมูลเป็น YYYY-MM-DD (ถ้าเป็น DATETIME)
    const dbBirthday = new Date(userCheck.recordset[0].birthday)
      .toISOString()
      .split("T")[0];

    if (dbBirthday !== birthday) {
      return res.status(400).json({ error: "วันเกิดไม่ตรงกัน" });
    }

    // แฮชรหัสผ่านใหม่
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // อัปเดตรหัสผ่านในฐานข้อมูล
    const updatePassword = await pool
      .request()
      .input("user_id", user_id)
      .input("password", hashedPassword)
      .query("UPDATE Users SET password = @password WHERE user_id = @user_id");

    if (updatePassword.rowsAffected[0] === 0) {
      return res.status(400).json({ error: "ไม่สามารถอัปเดตรหัสผ่านได้" });
    }

    res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

module.exports = router;