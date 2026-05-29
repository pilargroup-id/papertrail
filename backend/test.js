const db = require('./db');
async function test() {
    const [rows] = await db.query('SELECT * FROM master_budgets WHERE id=?', ['BOD02']);
    console.log(rows);
    process.exit(0);
}
test();
