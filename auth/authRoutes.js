const express = require('express');
const passport = require('passport');
const router = express.Router();

require('./passport'); // Load Passport config

// =====================================
// 🔐 Discord OAuth Login & Callback
// =====================================

// Step 1: Redirect to Discord for login
router.get('/auth/discord', passport.authenticate('discord'));

// Step 2: Callback after login
router.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/auth/failed' }),
  (req, res) => {
    console.log("🔑 User after authentication:", req.user);
    const role = req.user?.app_role || "vagos";
    console.log("User role:", role);

    // ✅ Redirect all roles to dashboard — control access from there
    res.redirect("/dashboard");
  }
);

// =====================================
// 🚪 Logout
// =====================================
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

// =====================================
// 👤 Authenticated User Info
// =====================================
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: "Not logged in" });
  }
});

module.exports = router;
