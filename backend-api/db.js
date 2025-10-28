const { Pool } = require("pg");
require("dotenv");

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: 5432 || 5433,
  database: process.env.DB_NAME,
});

module.exports = pool;