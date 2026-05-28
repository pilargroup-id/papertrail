const mysql = require('mysql2/promise');

async function main() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'frp_db'
    });

    const [rows] = await db.query('SELECT * FROM items_frp WHERE frp_request_id = "bf5e6e3c-c773-4612-aa00-c57026734194"');
    console.log('--- Items for Latest FRP ---');
    console.log(JSON.stringify(rows, null, 2));

    await db.end();
}

main().catch(console.error);
