const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Middleware placeholders
const ensureAuthenticated = (req, res, next) => next();
const ensureAdmin = (req, res, next) => next();

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ✅ Add Member
router.post("/add-member", ensureAuthenticated, ensureAdmin, upload.single("avatar"), async (req, res) => {
  try {
    const { name, cid, phone, initialAmount, weeklyFund, discordId } = req.body;

    if (!name || !cid || !phone || initialAmount == null || weeklyFund == null)
      return res.status(400).json({ success: false, error: "Missing fields." });

    let avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [insertUser] = await db.execute(
      `INSERT INTO loggedUser (name, cid, phone, initialAmount, weeklyFund, discordId, avatarUrl) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, cid, phone, initialAmount, weeklyFund, discordId || null, avatarUrl]
    );

    const userId = insertUser.insertId;

    await db.execute(
      `INSERT INTO weeklyPayments (userId, weekNumber, paidAmount, updatedBy) VALUES (?, ?, ?, ?)`,
      [userId, 1, 0.00, req.user?.username || 'System']
    );

    res.status(200).json({ success: true, message: "Member added", userId });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

// ✅ Member Summary
router.get('/get-summary', ensureAuthenticated, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        lu.id,
        COALESCE(lu.name, u.name) AS name,
        COALESCE(lu.cid, u.cid) AS cid,
        COALESCE(lu.phone, u.phone) AS phone,
        COALESCE(lu.initialAmount, u.initial_amount) AS initialAmount,
        COALESCE(lu.weeklyFund, u.weekly_fund) AS weeklyFund,
        lu.discordId,
        u.role,
        COALESCE(lu.avatarUrl, u.profile_pic) AS avatarUrl
      FROM loggedUser lu
      LEFT JOIN users u ON lu.discordId = u.discord_id
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error in /get-summary:", err);
    res.status(500).json({ error: "Failed to get summary data." });
  }
});

// ✅ Weekly Breakdown with Overpaid/Due Amount
router.get("/get-weekly/:userId", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;

    const [[user]] = await db.execute(
      `SELECT weeklyFund FROM loggedUser WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const weeklyFund = parseFloat(user.weeklyFund);

    const [rows] = await db.execute(
      `SELECT id, weekNumber, paidAmount, paidDate, updatedBy 
       FROM weeklyPayments 
       WHERE userId = ? 
       ORDER BY weekNumber`,
      [userId]
    );

    const enriched = rows.map(row => {
      const difference = parseFloat(row.paidAmount) - weeklyFund;
      let status = 'paid';
      let remark = '';
      if (difference < 0) {
        status = 'due';
        remark = `Due: ₹${Math.abs(difference)}`;
      } else if (difference > 0) {
        status = 'overpaid';
        remark = `Overpaid: ₹${difference}`;
      } else {
        remark = 'Exact payment';
      }

      return {
        ...row,
        weeklyFund,
        status,
        remark
      };
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error("Error fetching weekly:", error);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

// ✅ Edit Member
router.put("/edit-member/:id", ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, cid, phone, initialAmount, weeklyFund, discordId, avatarUrl } = req.body;

    const [result] = await db.execute(
      `UPDATE loggedUser 
       SET name=?, cid=?, phone=?, initialAmount=?, weeklyFund=?, discordId=?, avatarUrl=? 
       WHERE id=?`,
      [name, cid, phone, initialAmount, weeklyFund, discordId, avatarUrl, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    res.status(200).json({ success: true, message: "Member updated" });
  } catch (error) {
    console.error("Error updating:", error);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

// ✅ Delete Member
router.delete("/delete-member/:id", ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(`DELETE FROM weeklyPayments WHERE userId = ?`, [id]);
    const [result] = await db.execute(`DELETE FROM loggedUser WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    console.error("Error deleting:", error);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

module.exports = router;
