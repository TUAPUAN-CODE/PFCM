const express = require("express");
const { connectToDatabase } = require("../database/db");
const sql = require("mssql");
const router = express.Router();

/**
 * @swagger
 * /api/fetchProcess:
 *    get:
 *      summary: ดึงประเภทการแปรรูป
 *      tags:
 *        - Process
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
 *                        process_name:
 *                          type: string
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
router.get("/fetchProcess", async (req, res) => {

  try {
    const pool = await connectToDatabase();

    const result = await pool.request()
      .query(`
        Select 
            process_id,
            process_name 
        From Process
      `)

    const data = result.recordset;
    return res.status(200).json({ success: true, data })

  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/addProcess", async (req, res) => {
  try {
    const { process_name } = req.body;

    if (!process_name) {
      return res.status(400).json({ success: false, error: "Process name is required." });
    }

    const pool = await connectToDatabase();

    await pool.request()
      .input('process_name', sql.NVarChar, process_name)
      .query(`
        SELECT COUNT(*) AS count FROM Process WHERE process_name = @process_name
      `)
      .then(result => {
        if (result.recordset[0].count > 0) {
          return res.status(400).json({ success: false, error: "Process name already exists." });
        }
      });

    const result = await pool.request()
      .input('process_name', sql.NVarChar, process_name)
      .query(`
        INSERT INTO Process (process_name) 
        VALUES (@process_name)
      `);

    return res.status(201).json({ success: true, message: "Process added successfully." });

  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/deleteProcess", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: "Process ID is required." });
    }

    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('process_id', sql.Int, id)
      .query(`
        DELETE FROM Process WHERE process_id = @process_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, error: "Process not found." });
    }

    return res.status(200).json({ success: true, message: "Process deleted successfully." });

  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/updateProcess", async (req, res) => {
  try {
    const { id, process_name } = req.body; 

    if (!process_name) {
      return res.status(400).json({ success: false, error: "Process name is required." });
    }

    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('process_id', sql.Int, id)
      .input('process_name', sql.NVarChar, process_name)
      .query(`
        UPDATE Process 
        SET process_name = @process_name
        WHERE process_id = @process_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, error: "Process not found." });
    }

    return res.status(200).json({ success: true, message: "Process updated successfully." });

  } catch (err) {
    console.error("SQL error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



module.exports = router;