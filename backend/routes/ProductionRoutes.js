const express = require("express");
const { connectToDatabase } = require("../database/db");
const Papa = require("papaparse");
const router = express.Router();
// เชื่อมต่อฐานข้อมูล
async function getPool() {
  return await connectToDatabase();
}

/**
 * @swagger
 * /api/fetchProduction:
 *    get:
 *      summary: ดึงข้อมูลการผลิตที่เกี่ยวข้องกับวัตถุดิบ
 *      description: ใช้สำหรับดึงข้อมูลการผลิตที่เชื่อมโยงกับรหัสวัตถุดิบที่ระบุ
 *      tags:
 *        - Production
 *      parameters:
 *        - in: query
 *          name: mat
 *          schema:
 *            type: string
 *          required: true
 *          description: รหัสของวัตถุดิบที่ใช้ค้นหาข้อมูลการผลิต
 *      responses:
 *        200:
 *          description: ดึงข้อมูลการผลิตสำเร็จ
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
 *                        prod_id:
 *                          type: integer
 *                          description: รหัสการผลิต
 *                          example: 000
 *                        doc_no:
 *                          type: string
 *                          description: เลขที่เอกสารการผลิต
 *                          example: "000"
 *                        code:
 *                          type: string
 *                          description: รหัสของผลิตภัณฑ์
 *                          example: "0000"
 *                        line_id:
 *                          type: integer
 *                          description: รหัสสายการผลิต
 *                          example: 00
 *                        line_name:
 *                          type: string
 *                          description: ชื่อสายการผลิต
 *                          example: "ABC"
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
router.get("/fetchProduction", async (req, res) => {
  const mat = req.query.mat;
  if (!mat) {
    return res.status(400).json({ success: false, error: "Material parameter is required" });
  }

  try {
    const pool = await connectToDatabase();

    // 1. Fetch Production data
    const productionResult = await pool.request()
      .input("mat", mat)
      .query(`
        SELECT p.prod_id, p.doc_no, p.code, p.line_type_id
        FROM Production p
        JOIN ProdRawMat pr ON p.prod_id = pr.prod_id
        WHERE pr.mat = @mat
      `);
    // AND l.line_name NOT IN ('CUP', 'CAN', 'POUCH','Pouch Auto')
    // 2. Get all line_type_ids
    const lineTypeIds = [...new Set(productionResult.recordset.map(item => item.line_type_id))];

    // 3. Fetch all lines by type
    let allLinesByType = {};

    if (lineTypeIds.length > 0) {
      const request = pool.request();
      const params = lineTypeIds.map((id, i) => {
        request.input(`type${i}`, id);
        return `@type${i}`;
      }).join(',');

      // Add special handling for All Line type
      if (lineTypeIds.includes(1001)) {
        const lineNamesResult = await request.query(`
          SELECT line_id, line_name, line_type_id
          FROM Line
          WHERE line_name NOT IN ('CUP', 'CAN', 'POUCH', 'Pouch Auto')
          ORDER BY line_type_id, line_name
        `);

        // Add all lines to the All Line type (1001)
        allLinesByType[1001] = lineNamesResult.recordset.map(line => ({
          line_id: line.line_id,
          line_name: line.line_name
        }));

        // Sort the lines
        allLinesByType[1001].sort((a, b) => {
          return a.line_name.localeCompare(b.line_name, undefined, {
            numeric: true,
            sensitivity: 'base'
          });
        });
      } else {
        const lineNamesResult = await request.query(`
          SELECT line_id, line_name, line_type_id
          FROM Line
          WHERE line_type_id IN (${params})
          AND line_name NOT IN ('CUP', 'CAN', 'POUCH', 'Pouch Auto')
          ORDER BY line_type_id, line_name
        `);

        // Group by line_type_id
        lineNamesResult.recordset.forEach(line => {
          if (!allLinesByType[line.line_type_id]) {
            allLinesByType[line.line_type_id] = [];
          }
          allLinesByType[line.line_type_id].push({
            line_id: line.line_id,
            line_name: line.line_name
          });
        });

        // Apply alphanumeric sorting to each group
        for (const typeId in allLinesByType) {
          allLinesByType[typeId].sort((a, b) => {
            return a.line_name.localeCompare(b.line_name, undefined, {
              numeric: true,
              sensitivity: 'base'
            });
          });
        }
      }
    }

    res.json({
      success: true,
      data: productionResult.recordset,
      allLinesByType: allLinesByType
    });

  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({
      success: false,
      error: err.message,
      details: err // Include full error details for debugging
    });
  }
});



const sql = require("mssql");

router.get("/fetchGroup", async (req, res) => {
  const { mat } = req.query; // Changed from req.body to req.query for GET requests

  try {
    const pool = await connectToDatabase();

    const rmGroupResult = await pool.request()
      .input("mat", sql.NVarChar, mat)
      .query(`
        SELECT rm_group_id 
        FROM RawMatCookedGroup 
        WHERE mat = @mat
      `);

    if (rmGroupResult.recordset.length === 0) {
      return res.json({ success: true, data: [] }); // Return empty array instead of 404
    }

    const rmGroupIds = rmGroupResult.recordset.map(row => row.rm_group_id);

    // Create a query with properly parameterized IN clause
    let groupQuery = `
      SELECT rm_group_id, rm_group_name 
      FROM RawMatGroup 
      WHERE rm_group_id IN (`;

    // Add parameter placeholders
    const params = [];
    for (let i = 0; i < rmGroupIds.length; i++) {
      groupQuery += (i > 0 ? ', ' : '') + `@id${i}`;
      params.push({ name: `id${i}`, value: rmGroupIds[i], type: sql.Int });
    }

    groupQuery += ')';

    // Create request for second query
    const request = pool.request();

    // Add all parameters to the request
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    // Execute the query
    const groupResult = await request.query(groupQuery);

    res.json({ success: true, data: groupResult.recordset });

  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/prod-rawmat:
 *    get:
 *      summary: ข้อมูลวัตถุดิบและ production ที่เกี่ยวข้อง
 *      description: แสดงข้อมูล mat, mat_name และ prod_id พร้อม code, doc_no, line_name
 *      tags:
 *        - prod-rawmat
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูลวัตถุดิบและ production
 *        404:
 *          description: ไม่พบข้อมูล
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/prod-rawmat", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    // ดึงข้อมูล mat และ mat_name
    const matResult = await pool.request().query(`
      SELECT 
          prm.mat,
          rm.mat_name,
          STRING_AGG(prm.prod_id, ',') AS prod_ids
      FROM 
          ProdRawMat prm
      JOIN
          RawMat rm ON rm.mat = prm.mat
      GROUP BY 
          prm.mat, rm.mat_name;
    `);

    const matData = matResult.recordset;

    if (!matData.length) {
      return res
        .status(404)
        .json({ success: false, message: "No data found!" });
    }

    // ดึงข้อมูล prod_id พร้อม code, doc_no, line_name
    const prodResult = await pool.request().query(`
      SELECT
          pd.prod_id,
          pd.code,
          pd.doc_no,
          lt.line_type_name
      FROM
          Production pd
      JOIN 
        LineType lt ON pd.line_type_id = lt.line_type_id;
    `);

    // สร้าง map สำหรับข้อมูล production โดยใช้ prod_id
    const prodMap = {};
    prodResult.recordset.forEach(({ prod_id, code, doc_no, line_type_name }) => {
      if (!prodMap[prod_id]) {
        prodMap[prod_id] = [];
      }
      prodMap[prod_id].push({ code, doc_no, line_type_name });
    });

    // รวมข้อมูล mat และ production
    const finalData = matData.map(({ mat, mat_name, prod_ids }) => ({
      mat,
      mat_name,
      prod_info: prod_ids.split(",").map((prod_id) => ({
        prod_id: parseInt(prod_id),
        details: prodMap[prod_id] || [], // ถ้าไม่มีข้อมูลจะเป็น []
      })),
    }));

    res.json({ success: true, data: finalData });
  } catch (error) {
    console.error("Error fetching production raw material data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/add/prod-rawmat:
 *    post:
 *      summary: เพิ่มข้อมูลวัตถุดิบและ production ที่เกี่ยวข้อง
 *      description: เพิ่มข้อมูล mat และ prod_id หลายค่าลงในฐานข้อมูล
 *      tags:
 *        - prod-rawmat
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                mat:
 *                  type: string
 *                  example: "1000"
 *                prod_ids:
 *                  type: array
 *                  items:
 *                    type: integer
 *                  example: [1, 2, 3, 4]
 *      responses:
 *        201:
 *          description: เพิ่มข้อมูลสำเร็จ
 *        400:
 *          description: ข้อมูลไม่ถูกต้อง
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post("/add/prod-rawmat", async (req, res) => {
  try {
    const { mat, prod_ids } = req.body;

    if (!mat || !Array.isArray(prod_ids) || prod_ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid input data" });
    }

    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    // ตรวจสอบว่า prod_id ซ้ำกับฐานข้อมูลหรือไม่
    const existingProdQuery = `
      SELECT prod_id FROM ProdRawMat
      WHERE mat = @mat AND prod_id IN (${prod_ids.join(",")})
    `;
    const result = await pool
      .request()
      .input("mat", mat)
      .query(existingProdQuery);

    if (result.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        error: `ข้อมูลซ้ำ !! แผนการผลิตของวัตถุดิบนี้มีอยู่แล้ว `,
      });
    }

    // สร้าง Query สำหรับ INSERT ข้อมูลหลายแถว
    const values = prod_ids
      .map((prod_id) => `('${mat}', ${prod_id})`)
      .join(", ");
    const query = `INSERT INTO ProdRawMat (mat, prod_id) VALUES ${values}`;

    await pool.request().query(query);

    res
      .status(201)
      .json({ success: true, message: "Data inserted successfully" });
  } catch (error) {
    console.error("Error inserting production raw material data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/get-production:
 *    get:
 *      summary: ดึงข้อมูลการผลิตทั้งหมด
 *      description: คืนค่ารายการการผลิตทั้งหมดจากฐานข้อมูล
 *      tags:
 *        - Production
 *      responses:
 *        200:
 *          description: สำเร็จ - ส่งข้อมูลการผลิต
 *        404:
 *          description: ไม่พบข้อมูล
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.get("/get-production", async (req, res) => {
  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Unable to connect to the database" });
    }

    const result = await pool.request().query(`
      SELECT 
        pd.prod_id,
        pd.code,
        pd.doc_no,
        pd.line_type_id,
        lt.line_type_name
      FROM
        Production pd
      JOIN 
        LineType lt ON pd.line_type_id = lt.line_type_id;
    `);

    const data = result.recordset;

    if (!data.length) {
      return res
        .status(404)
        .json({ success: false, message: "No production data found" });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching production data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message, // แสดงรายละเอียดของข้อผิดพลาด
    });
  }
});

/**
 * @swagger
 * /api/add-production:
 *    post:
 *      summary: เพิ่มข้อมูลการผลิต
 *      description: เพิ่มข้อมูลการผลิตใหม่ลงในฐานข้อมูลโดยตรวจสอบว่า code, doc_no และ line_id ไม่ซ้ำกัน
 *      tags:
 *        - Production
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - code
 *                - doc_no
 *                - line_id
 *              properties:
 *                code:
 *                  type: string
 *                doc_no:
 *                  type: string
 *                line_id:
 *                  type: integer
 *      responses:
 *        201:
 *          description: เพิ่มข้อมูลสำเร็จ
 *        400:
 *          description: ข้อมูลซ้ำกัน
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.post("/add-production", async (req, res) => {
  try {
    const { code, doc_no, line_type_id } = req.body;

    if (!code || !doc_no || !line_type_id) {
      return res
        .status(400)
        .json({ success: false, error: "กรุณาระบุข้อมูลให้ครบ !!" });
    }

    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({
          success: false,
          error: "Unable to connect to the database !!",
        });
    }

    // ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
    const checkDuplicate = await pool
      .request()
      .input("code", code)
      .input("doc_no", doc_no)
      .input("line_type_id", line_type_id)
      .query(`
        SELECT 1 FROM Production 
        WHERE code = @code AND doc_no = @doc_no AND line_type_id = @line_type_id
      `);

    if (checkDuplicate.recordset.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          error:
            "ข้อมูลซ้ำ !! ไม่สามารถเพิ่มได้เนื่องจากมีแผนการผลิตนี้อยู่แล้ว",
        });
    }

    // เพิ่มข้อมูลลงในฐานข้อมูล
    await pool
      .request()
      .input("code", code)
      .input("doc_no", doc_no)
      .input("line_type_id", line_type_id)
      .query(`
        INSERT INTO Production (code, doc_no, line_type_id)
        VALUES (@code, @doc_no, @line_type_id)
      `);

    res
      .status(201)
      .json({ success: true, message: "Production data added successfully" });
  } catch (error) {
    console.error("Error adding production data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/update-production:
 *    put:
 *      summary: แก้ไขข้อมูลการผลิต
 *      description: แก้ไขข้อมูลการผลิตโดยระบุ prod_id ที่ต้องการแก้ไข
 *      tags:
 *        - Production
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - prod_id
 *                - code
 *                - doc_no
 *                - line_id
 *              properties:
 *                prod_id:
 *                  type: integer
 *                code:
 *                  type: string
 *                doc_no:
 *                  type: string
 *                line_id:
 *                  type: integer
 *      responses:
 *        200:
 *          description: แก้ไขข้อมูลสำเร็จ
 *        400:
 *          description: ข้อมูลไม่สมบูรณ์หรือไม่พบ prod_id ที่ระบุ
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.put("/update-production", async (req, res) => {
  try {
    const { prod_id, code, doc_no, line_type_id } = req.body;

    if (!prod_id || !code || !doc_no || !line_type_id) {
      return res
        .status(400)
        .json({ success: false, error: "กรุณาระบุข้อมูลให้ครบ !!" });
    }

    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({
          success: false,
          error: "Unable to connect to the database !!",
        });
    }

    // ตรวจสอบว่า prod_id ที่ระบุมีอยู่ในระบบหรือไม่
    const checkProdId = await pool.request().input("prod_id", prod_id).query(`
        SELECT 1 FROM Production 
        WHERE prod_id = @prod_id
      `);

    if (checkProdId.recordset.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "ไม่พบข้อมูลการผลิตที่มี prod_id นี้" });
    }

    // แก้ไขข้อมูลในฐานข้อมูล
    await pool
      .request()
      .input("prod_id", prod_id)
      .input("code", code)
      .input("doc_no", doc_no)
      .input("line_type_id", line_type_id).query(`
        UPDATE Production
        SET code = @code, doc_no = @doc_no, line_type_id = @line_type_id
        WHERE prod_id = @prod_id
      `);

    res
      .status(200)
      .json({ success: true, message: "Production data updated successfully" });
  } catch (error) {
    console.error("Error updating production data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/delete-production/{prod_id}:
 *    delete:
 *      summary: ลบข้อมูลการผลิต
 *      description: ลบข้อมูลการผลิตที่มี prod_id ตามที่ระบุ
 *      tags:
 *        - Production
 *      parameters:
 *        - name: prod_id
 *          in: path
 *          required: true
 *          description: prod_id ของข้อมูลที่ต้องการลบ
 *          schema:
 *            type: integer
 *      responses:
 *        200:
 *          description: ลบข้อมูลสำเร็จ
 *        400:
 *          description: ไม่พบ prod_id ที่ระบุ
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
router.delete("/delete-production/:prod_id", async (req, res) => {
  try {
    const { prod_id } = req.params;

    if (!prod_id) {
      return res
        .status(400)
        .json({ success: false, error: "กรุณาระบุ prod_id ที่ต้องการลบ !!" });
    }

    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Unable to connect to the database !!" });
    }

    // ตรวจสอบว่า prod_id ที่ระบุมีอยู่ในระบบหรือไม่
    const checkProdId = await pool
      .request()
      .input("prod_id", prod_id)
      .query(`
        SELECT 1 FROM Production 
        WHERE prod_id = @prod_id
      `);

    if (checkProdId.recordset.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "ไม่พบข้อมูลการผลิตที่มี prod_id นี้" });
    }

    // ลบข้อมูลจากฐานข้อมูล
    await pool
      .request()
      .input("prod_id", prod_id)
      .query(`
        DELETE FROM Production
        WHERE prod_id = @prod_id
      `);

    res
      .status(200)
      .json({ success: true, message: "Production data deleted successfully" });
  } catch (error) {
    console.error("Error deleting production data:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/delete-prod-rawmat/{mat}/{prod_id}:
 *    delete:
 *      summary: ลบข้อมูลวัตถุดิบที่เลือก (ที่ใช้ในการผลิต)
 *      description: ลบรายการวัตถุดิบที่เกี่ยวข้องกับการผลิตจากฐานข้อมูล
 *      tags:
 *        - Production
 *      parameters:
 *        - in: path
 *          name: mat
 *          required: true
 *          description: รหัสวัตถุดิบที่ต้องการลบ
 *          schema:
 *            type: string
 *        - in: path
 *          name: prod_id
 *          required: true
 *          description: รหัสการผลิตที่เกี่ยวข้อง
 *          schema:
 *            type: integer
 *      responses:
 *        200:
 *          description: ลบข้อมูลสำเร็จ
 *        404:
 *          description: ไม่พบข้อมูลที่ต้องการลบ
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */

router.delete("/delete-prod-rawmat/:mat/:prod_id", async (req, res) => {
  const { mat, prod_id } = req.params;

  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    // ลบข้อมูลจากตาราง ProdRawMat
    const result = await pool
      .request()
      .input("mat", mat)
      .input("prod_id", prod_id).query(`
        DELETE FROM ProdRawMat
        WHERE mat = @mat AND prod_id = @prod_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No matching record found" });
    }

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting production raw material:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/delete-prod-rawmat/{mat}:
 *    delete:
 *      summary: ลบข้อมูลวัตถุดิบทั้งหมดที่มีรหัสวัตถุดิบเดียวกัน
 *      description: ลบรายการวัตถุดิบที่เกี่ยวข้องกับการผลิตทั้งหมดจากฐานข้อมูลตามรหัสวัตถุดิบ (`mat`)
 *      tags:
 *        - Production
 *      parameters:
 *        - in: path
 *          name: mat
 *          required: true
 *          description: รหัสวัตถุดิบที่ต้องการลบทั้งหมด
 *          schema:
 *            type: string
 *      responses:
 *        200:
 *          description: ลบข้อมูลสำเร็จ
 *        404:
 *          description: ไม่พบข้อมูลที่ต้องการลบ
 *        500:
 *          description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */

router.delete("/delete-prod-rawmat/:mat", async (req, res) => {
  const { mat } = req.params;

  try {
    const pool = await getPool();
    if (!pool) {
      return res
        .status(500)
        .json({ success: false, error: "Database connection failed" });
    }

    // ลบข้อมูลทั้งหมดที่มี mat เดียวกัน
    const result = await pool.request().input("mat", mat).query(`
        DELETE FROM ProdRawMat
        WHERE mat = @mat
      `);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No matching records found" });
    }

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting production raw materials:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

router.post("/import-prod-rawmat/CSV", async (req, res) => {
  const { csvData } = req.body;

  if (!csvData || !Array.isArray(csvData)) {
    return res.status(400).json({ success: false, message: "Invalid data format. Expected array of objects." });
  }

  try {
    const pool = await getPool();
    if (!pool) {
      return res.status(500).json({ success: false, message: "Database connection failed" });
    }

    let processedCount = 0;
    let skippedCount = 0;

    for (const row of csvData) {
      // รับค่าจากข้อมูลที่มีรูปแบบ _n
      const code = row["_7"];         // รหัสการผลิต
      const doc_no = row["_8"];       // เลขที่เอกสาร
      const mat_name = row["_11"];    // ชื่อวัตถุดิบ
      const mat = row["_13"];         // รหัสวัตถุดิบ
      const rm_type_id = row["_14"];  // ประเภทวัตถุดิบ
      // แปลงค่าเป็น string และจัดการกรณีที่ค่าเป็น null หรือ undefined
      const rm_group_value = String(row["_15"] || '');
      const rm_group_ids = rm_group_value ? rm_group_value.split(',').map(id => id.trim()) : [];
      const line_name = row["_1"];    // ชื่อสายการผลิต

      if (!code || !doc_no || !mat || !mat_name || !rm_group_ids.length || !rm_type_id || !line_name) {
        console.log("Skipping row due to missing data:", row);
        skippedCount++;
        continue;
      }

      try {
        // ค้นหา line_type_id จากชื่อสายการผลิต
        const lineResult = await pool.request()
          .input("line_name", line_name)
          .query(`SELECT line_type_id FROM Line WHERE line_name = @line_name`);

        if (!lineResult.recordset.length) {
          console.log(`Line name ${line_name} not found, skipping row:`, row);
          skippedCount++;
          continue;
        }

        const line_type_id = lineResult.recordset[0].line_type_id;

        // 1. ตรวจสอบและเพิ่ม Production หากยังไม่มี
        let prodResult = await pool.request()
          .input("code", code)
          .input("doc_no", doc_no)
          .query(`SELECT prod_id FROM Production WHERE code = @code AND doc_no = @doc_no`);

        let prod_id;
        if (!prodResult.recordset.length) {
          const insertProd = await pool.request()
            .input("code", code)
            .input("doc_no", doc_no)
            .input("line_type_id", line_type_id)
            .query(`
              INSERT INTO Production (code, doc_no, line_type_id) 
              VALUES (@code, @doc_no, @line_type_id);
              SELECT SCOPE_IDENTITY() AS prod_id;
            `);
          prod_id = insertProd.recordset[0].prod_id;
        } else {
          prod_id = prodResult.recordset[0].prod_id;
        }

        // 2. ตรวจสอบและเพิ่ม RawMat หากยังไม่มี
        const matResult = await pool.request()
          .input("mat", mat)
          .query(`SELECT COUNT(*) AS count FROM RawMat WHERE mat = @mat`);

        if (matResult.recordset[0].count === 0) {
          await pool.request()
            .input("mat", mat)
            .input("mat_name", mat_name)
            .query(`INSERT INTO RawMat (mat, mat_name) VALUES (@mat, @mat_name)`);

          // เพิ่มข้อมูลกลุ่มวัตถุดิบ (รองรับหลายกลุ่ม)
          for (const rm_group_id of rm_group_ids) {
            await pool.request()
              .input("mat", mat)
              .input("rm_group_id", rm_group_id)
              .input("rm_type_id", rm_type_id)
              .query(`
                IF NOT EXISTS (
                  SELECT 1 FROM RawMatCookedGroup 
                  WHERE mat = @mat AND rm_group_id = @rm_group_id AND rm_type_id = @rm_type_id
                )
                BEGIN
                  INSERT INTO RawMatCookedGroup (mat, rm_group_id, rm_type_id) 
                  VALUES (@mat, @rm_group_id, @rm_type_id)
                END
              `);
          }
        }

        // 3. ตรวจสอบความเชื่อมโยงระหว่าง prod_id กับ mat ใน ProdRawMat
        const connectResult = await pool.request()
          .input("prod_id", prod_id)
          .input("mat", mat)
          .query(`SELECT * FROM ProdRawMat WHERE prod_id = @prod_id AND mat = @mat`);

        if (!connectResult.recordset.length) {
          await pool.request()
            .input("prod_id", prod_id)
            .input("mat", mat)
            .query(`INSERT INTO ProdRawMat (prod_id, mat) VALUES (@prod_id, @mat)`);
        }

        processedCount++;
      } catch (rowError) {
        console.error("Error processing row:", row, rowError);
        skippedCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `นำเข้าข้อมูลสำเร็จ ${processedCount} รายการ${skippedCount > 0 ? ` (ข้ามไป ${skippedCount} รายการ)` : ''}` 
    });

  } catch (error) {
    console.error("Error during import:", error);
    res.status(500).json({ success: false, message: "Internal server error", details: error.message });
  }
});



module.exports = router;
