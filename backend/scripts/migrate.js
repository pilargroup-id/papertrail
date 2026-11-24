// Jalankan file SQL di database/migrations secara berurutan (berdasarkan nama file).
// File yang sudah sukses dicatat di tabel schema_migrations dan tidak dijalankan ulang.
// Dipanggil saat deploy: `npm run migrate` (dari folder backend).
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'database', 'migrations');

async function main() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    multipleStatements: true,
    timezone: '+07:00',
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    const [appliedRows] = await conn.query('SELECT name FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.name));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const pending = files.filter((file) => !applied.has(file));

    if (!pending.length) {
      console.log(`[migrate] ${config.db.name}: tidak ada migration baru.`);
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      console.log(`[migrate] menjalankan ${file} ...`);
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      console.log(`[migrate] selesai ${file}`);
    }

    console.log(`[migrate] ${config.db.name}: ${pending.length} migration diterapkan.`);
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(`[migrate] GAGAL: ${error.message}`);
  process.exit(1);
});
