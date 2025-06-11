const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const axios = require("axios");
const pool = require("../config/db");

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});


passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'guilds', 'guilds.members.read', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { id, username, discriminator, avatar } = profile;
    const profilePic = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;

    // Fetch user roles from your server using bot token
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/members/${id}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      }
    );

    const discordRoles = response.data.roles;

    // You’ll map Discord role IDs to app roles
    const ADMIN_ROLE_ID = "1234567890";   // replace with your actual role IDs
    const MANAGER_ROLE_ID = "2345678901";
    const VAGOS_ROLE_ID = "3456789012";

    let role = "vagos"; // default
    if (discordRoles.includes(ADMIN_ROLE_ID)) {
      role = "admin";
    } else if (discordRoles.includes(MANAGER_ROLE_ID)) {
      role = "manager";
    }

    // Check if user already exists in DB
    const existingUser = await pool.query("SELECT * FROM users WHERE discord_id = $1", [id]);

    if (existingUser.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (discord_id, name, profile_pic, role) VALUES ($1, $2, $3, $4)",
        [id, `${username}#${discriminator}`, profilePic, role]
      );
    } else {
      await pool.query(
        "UPDATE users SET role = $1 WHERE discord_id = $2",
        [role, id]
      );
    }

    // Store role in session
    profile.app_role = role;
    profile.profile_pic = profilePic;
    return done(null, profile);
  } catch (error) {
    console.error("Discord Auth Error:", error.message);
    return done(error, null);
  }
}));
