/**
 * One MySQL connection pool for the whole app (settings from server/config.js / .env).
 * Only files in server/engines/e3-data/ may import this: E3 is the single data-access layer.
 */
const mysql = require('mysql2/promise');

const config = require('../config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: false,
});

module.exports = pool;
