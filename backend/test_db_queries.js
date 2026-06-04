require('dotenv').config({ path: '.env.local' });
const db = require('./db');
const { centralDb } = require('./db');
const { getAllEmployees, getDepartmentRows, getCompanies, fetchAllFrpRequests } = require('./src/services/dbService');

async function test() {
    try {
        console.log("Testing getAllEmployees...");
        await getAllEmployees();
        console.log("Testing getDepartmentRows...");
        await getDepartmentRows();
        console.log("Testing getCompanies...");
        await getCompanies();
        console.log("Testing master_budgets query...");
        await db.query('SELECT id, department_id, department_name, department_class, department_code, project_name, budget_type, budget_amount, budget_used, budget_remaining FROM master_budgets');
        console.log("Testing fetchAllFrpRequests...");
        await fetchAllFrpRequests();
        console.log("All success!");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit();
    }
}
test();
