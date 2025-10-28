const { Sequelize } = require("sequelize");
require("dotenv").config({ path: "../../.env" });

// Pool PostgreSQL brut (si vous en avez besoin ailleurs)
const { Pool } = require("pg");
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

// Instance Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false, // Mettez à console.log pour les logs SQL
  }
);

// Export des deux (Sequelize ET pool brut)
module.exports = {
  sequelize,
  pool,
};