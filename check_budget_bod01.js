const db = require('./backend/db');

async function checkBudget() {
    try {
        const [rows] = await db.query("SELECT id, department_name, project_name, budget_amount, budget_used, budget_remaining, is_active FROM master_budgets WHERE id = 'BOD01'");
        console.log("Budget details for BOD01:", rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkBudget();
