/** npm run db:reset -> creates the database if missing, then runs db/schema.sql and db/seed.sql. */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('./config');

(async () => {
  const { database: name, ...db } = config.db;
  const conn = await mysql.createConnection({ ...db, multipleStatements: true });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${name}\``);
  for (const f of ['schema.sql', 'seed.sql']) {
    await conn.query(fs.readFileSync(path.join(__dirname, '..', 'db', f), 'utf8'));
    console.log(`ran db/${f}`);
  }
  await conn.end();
  console.log(`Database "${name}" is ready. Demo password for every account: Password@123`);
})().catch((e) => {
  console.error('db:reset failed:', e.code === 'ECONNREFUSED' ? 'MySQL is not running. Start it in the XAMPP control panel.' : e.message);
  process.exit(1);
});
