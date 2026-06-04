const mysql = require('mysql2/promise');
async function run() {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'papertrail' });
  const [res1] = await db.query("UPDATE rp_request SET status = 'waiting_manager' WHERE status = 'PENDING_MANAGER'");
  console.log('Update PENDING_MANAGER:', res1.affectedRows);
  const [res2] = await db.query("UPDATE rp_request SET status = 'division_review' WHERE status = 'PENDING_PROCESS'");
  console.log('Update PENDING_PROCESS:', res2.affectedRows);
  const [res3] = await db.query("UPDATE rp_request SET status = 'final_approved' WHERE status = 'PENDING_PROCESS_APPROVAL'");
  console.log('Update PENDING_PROCESS_APPROVAL:', res3.affectedRows);
  const [res4] = await db.query("UPDATE rp_request SET status = 'approved' WHERE status = 'APPROVED'");
  console.log('Update APPROVED:', res4.affectedRows);
  db.end();
}
run();
