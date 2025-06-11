console.log("⚡ Routes loaded");
const db = require('../config/db');
const express = require('express');
const passport = require('passport');
const router = express.Router();

// ====================================
// Middleware Functions
// ====================================

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view that resource');
    res.redirect('/login');
}

function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.app_role === 'admin') {
        return next();
    }
    res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You are not authorized to access this page. Admin access required.',
        user: req.user
    });
}

// ====================================
// 🔐 Login & Logout Routes
// ====================================

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: true
    }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

router.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

// ====================================
// 🏠 Homepage Redirect
// ====================================

router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// ====================================
// 📊 Dashboard
// ====================================

router.get('/dashboard', ensureAuthenticated, (req, res) => {
    console.log("🔓 Fetched User Info on /dashboard:", req.user);

    res.render('dashboard', {
        user: req.user,
        username: req.user.username,
        role: req.user.app_role,
        isAdmin: req.user.app_role === 'admin',
        isManager: req.user.app_role === 'manager'
    });
});

// ====================================
// ➕ Add Member Routes (Admin only)
// ====================================

router.get('/addmember', ensureAuthenticated, ensureAdmin, (req, res) => {
    console.log("⚡ /add-member GET route hit");
    res.render('addmember', {
        user: req.user,
        isAdmin: true
    });
});

router.post('/addmember', ensureAuthenticated, ensureAdmin, async (req, res) => {
    console.log("⚡ /add-member POST route hit");
    const memberData = req.body;
    console.log("Received member data for addition:", memberData);

    try {
        const {
            name,
            cid,
            phone,
            initialAmount,
            weeklyFund
        } = memberData;

        if (!name || !cid || !phone || initialAmount === undefined || weeklyFund === undefined) {
            return res.status(400).json({ success: false, error: "Missing required fields: name, cid, phone, initialAmount, weeklyFund." });
        }
        if (isNaN(parseFloat(initialAmount)) || isNaN(parseFloat(weeklyFund))) {
            return res.status(400).json({ success: false, error: "initialAmount and weeklyFund must be valid numbers." });
        }

        const [insertUserResult] = await db.execute(
            `INSERT INTO loggedUser (name, cid, phone, initialAmount, weeklyFund) VALUES (?, ?, ?, ?, ?)`,
            [name, cid, phone, initialAmount, weeklyFund]
        );
        console.log("Insert loggedUser result:", insertUserResult);

        const newUserId = insertUserResult.insertId;
        if (!newUserId) {
            console.error("Error: newUserId is undefined or 0 after loggedUser insert. Is your 'id' column in loggedUser AUTO_INCREMENT PRIMARY KEY?");
            return res.status(500).json({ success: false, error: "Failed to obtain new user ID, member not fully added." });
        }
        console.log("New User ID obtained:", newUserId);

        const defaultWeekNumber = 1;
        const defaultPaidAmount = 0;

        const [insertPaymentResult] = await db.execute(
            `INSERT INTO weeklyPayments (userId, weekNumber, paidAmount) VALUES (?, ?, ?)`,
            [newUserId, defaultWeekNumber, defaultPaidAmount]
        );
        console.log("Insert weeklyPayments result:", insertPaymentResult);

        res.status(200).json({
            success: true,
            message: "Member added successfully and Week 1 payment initialized.",
            userId: newUserId
        });

    } catch (error) {
        console.log("Reached the catch block!");
        console.error("Error adding member to database:", error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: "A member with this CID or other unique identifier already exists." });
        }
        res.status(500).json({ success: false, error: "Internal server error during member addition." });
    }
});

// ====================================
// ✏️ Edit Member Routes (Admin only)
// ====================================

router.get('/edit-member/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const memberId = req.params.id;

    try {
        const [memberRows] = await db.execute(
            `SELECT * FROM loggedUser WHERE id = ?`,
            [memberId]
        );

        if (memberRows.length === 0) {
            return res.status(404).render('error', {
                title: 'Member Not Found',
                message: 'No member found with the provided ID.',
                user: req.user
            });
        }

        const member = memberRows[0];
        res.render('editmember', {
            user: req.user,
            isAdmin: true,
            member
        });

    } catch (error) {
        console.error("Error fetching member for edit:", error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'An error occurred while fetching member data.',
            user: req.user
        });
    }
});

// ====================================
// 👤 API: Get Authenticated User Info
// ====================================

router.get('/auth/user', ensureAuthenticated, (req, res) => {
    res.json({
        id: req.user.id,
        username: req.user.username,
        profile_pic: req.user.profile_pic,
        role: req.user.app_role
    });
});

module.exports = router;
