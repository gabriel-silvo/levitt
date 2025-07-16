// levitt-backend/src/db.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Exportamos um objeto com um método 'query' que usa o pool.
// Isso nos permite usar o pool em qualquer outro lugar da aplicação.
module.exports = {
  query: (text, params) => pool.query(text, params),
};