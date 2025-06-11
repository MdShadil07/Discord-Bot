const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const axios = require("axios");
const pool = require("../config/db");

// Serialize user (by Discord ID)
passport.serializeUser((user, done) => {
  done(null, user.id); // Discord ID
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE discord_id = ?", [id]);

    if (rows.length === 0) {
      console.warn(`⚠️ No user found in DB for Discord ID: ${id}`);
      return done(null, false);
    }

    const user = {
      id: rows[0].discord_id,
      username: rows[0].name,
      app_role: rows[0].role,
      profile_pic: rows[0].profile_pic,
    };

    console.log("✅ Deserialized user from session:", user);
    return done(null, user);
  } catch (err) {
    console.error("❌ Failed to deserialize user:", err);
    return done(err, null);
  }
});

// Define Discord Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ["identify", "guilds", "guilds.members.read", "email"],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { id, username, discriminator, avatar } = profile;
    const profilePic = avatar 
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discriminator) % 5}.png`;

    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    // Fetch member roles
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

    // Insert or Update in DB
    const [rows] = await pool.query("SELECT * FROM users WHERE discord_id = ?", [id]);
    const fullUsername = `${username}#${discriminator}`;

    if (rows.length === 0) {
      console.log("➡️ New user. Inserting...");
      await pool.query(
        "INSERT INTO users (discord_id, name, profile_pic, role) VALUES (?, ?, ?, ?)",
        [id, fullUsername, profilePic, role]
      );
    } else {
      console.log("↻ Updating existing user...");
      await pool.query(
        "UPDATE users SET name = ?, profile_pic = ?, role = ? WHERE discord_id = ?",
        [fullUsername, profilePic, role, id]
      );
    }

    // Format for session
    const user = {
      id,
      username: fullUsername,
      app_role: role,
      profile_pic: profilePic
    };

    console.log(`✅ Login success: ${fullUsername} (${role})`);
    return done(null, user);

  } catch (error) {
    console.error("❌ Discord OAuth Error:", JSON.stringify(error?.response?.data || error.message));
    return done(error, null);
  }
}));
