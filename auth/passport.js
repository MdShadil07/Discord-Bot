// =====================
// passport.js (updated)
// =====================

const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const axios = require("axios");
const pool = require("../config/db");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE discord_id = ?", [id]);
    if (rows.length === 0) return done(null, false);

    const user = {
      id: rows[0].discord_id,
      username: rows[0].name,
      app_role: rows[0].role,
      profile_pic: rows[0].profile_pic,
    };

    console.log("🔓 Fetched user from session:", user);
    done(null, user);
  } catch (err) {
    console.error("❌ Failed to deserialize user:", err);
    done(err, null);
  }
});

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ["identify", "guilds", "guilds.members.read", "email"],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { id, username, discriminator, avatar } = profile;
    const profilePic = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    const response = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/members/${id}`, {
      headers: { Authorization: `Bot ${botToken}` }
    });

    const discordRoles = response.data.roles;
    const ROLE_IDS = {
      admin: "1354568668184580257",
      manager: "1354820776989167798",
      vagos: "1354750641557340231",
    };

    let role = "none";
    if (discordRoles.includes(ROLE_IDS.admin)) role = "admin";
    else if (discordRoles.includes(ROLE_IDS.manager)) role = "manager";
    else if (discordRoles.includes(ROLE_IDS.vagos)) role = "vagos";

    const [rows] = await pool.query("SELECT * FROM users WHERE discord_id = ?", [id]);

    if (rows.length === 0) {
      console.log("➡️ New user. Inserting into database...");
      await pool.query(
        "INSERT INTO users (discord_id, name, profile_pic, role) VALUES (?, ?, ?, ?)",
        [id, `${username}#${discriminator}`, profilePic, role]
      );
    } else {
      console.log("↻ Existing user. Updating info...");
      await pool.query(
        "UPDATE users SET name = ?, profile_pic = ?, role = ? WHERE discord_id = ?",
        [`${username}#${discriminator}`, profilePic, role, id]
      );
    }

    profile.app_role = role;
    profile.profile_pic = profilePic;

    console.log(`✅ Authentication successful: ${username}#${discriminator} as ${role}`);
    return done(null, profile);
  } catch (error) {
    console.error("❌ Discord OAuth Error:", JSON.stringify(error?.response?.data || error.message));
    return done(error, null);
  }
}));


// =====================
// routes.js (updated)
// =====================

const express = require('express');
const router = express.Router();

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.redirect('/login');
});

router.get('/dashboard', ensureAuthenticated, (req, res) => {
  console.log("🔓 Fetched User Info on /dashboard:", req.user);
  res.render('dashboard', {
    username: req.user.username,
    role: req.user.app_role,
    isAdmin: req.user.app_role === 'admin',
    isManager: req.user.app_role === 'manager',
  });
});

router.get('/addmember', ensureAuthenticated, (req, res) => {
  const role = req.user.app_role || req.user.role || 'none';
  res.render('addmember', {
    user: req.user,
    role: role
  });
  console.log("AddMember Role:", role);
});

router.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    console.log("✅ /auth/user:", req.user);
    return res.json(req.user);
  }
  res.status(401).json({ message: 'Not logged in' });
});

module.exports = router;
