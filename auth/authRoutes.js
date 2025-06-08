const express = require('express');
const passport = require('passport');
const router = express.Router();

require('./passport'); // 👈 Load strategy here

// Discord Login
router.get('/auth/discord', passport.authenticate('discord'));

// Discord Callback
router.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/auth/failed' }),
  (req, res) => {
    // ✅ Optional: redirect based on role
    const role = req.user?.role || "vagos";
    if (role === "admin") return res.redirect("/addmembers");
    if (role === "manager") return res.redirect("/manageFund");
    res.redirect("/dashboard"); // default
  }
);

// Logout
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login');
  });
});



// Current Logged In User
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: "Not logged in" });
  }
});

module.exports = router;
