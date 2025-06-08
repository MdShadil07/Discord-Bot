// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
 host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE,
  port: process.env.DATABASE_PORT || 3307,
});

module.exports = db;
