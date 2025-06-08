const express = require('express');
const router = express.Router();

// Middleware: Ensure user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// 🔐 Login Page
router.get('/login', (req, res) => {
  res.render('login');
});

// 🏠 Homepage Redirect Based on Auth
router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// 📊 Dashboard Page (Protected)
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  console.log("🔓 Fetched User Info on /dashboard:", req.user);

  res.render('dashboard', {
    user: req.user,
    username: req.user.username,
    role: req.user.role,
    isAdmin: req.user.role === 'admin',
    isManager: req.user.role === 'manager'
  });
});

// ➕ Add Members Page (Admin Only)
router.get('/addmember', ensureAuthenticated, (req, res) => {
  const role = req.user.role || 'none';
  console.log("📥 /addmember accessed by:", req.user);

  if (role !== 'admin') {
    return res.status(403).render('error', {
      title: "Access Denied",
      message: "You are not authorized to access this page."
    });
  }

  res.render('addmember', {
    user: req.user,
    role
  });
});

module.exports = router;
