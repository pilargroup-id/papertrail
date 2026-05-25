const mysql = require('mysql2/promise');

async function main() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'frp_db'
    });

    const [users] = await db.query('SELECT username, updated_at FROM central_users WHERE DATE(updated_at) = "2026-05-25"');
    console.log('Modified users today:', users);

    await db.end();
}

main().catch(console.error);
