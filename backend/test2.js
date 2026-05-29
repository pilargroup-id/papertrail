const db = require('./db');
async function test() {
    const [rows] = await db.query('SELECT * FROM budget_access_policies');
    console.log(rows);
    process.exit(0);
}
test();
