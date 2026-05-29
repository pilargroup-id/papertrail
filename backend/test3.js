const db = require('./db');
async function test() {
    const [rows] = await db.query('SELECT * FROM master_departments WHERE name LIKE "%BOD%" OR class LIKE "%BOD%" OR name LIKE "%Board%" OR class LIKE "%Board%"');
    console.log(rows);
    process.exit(0);
}
test();
