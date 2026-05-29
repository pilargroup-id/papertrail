const db = require('./db');

async function addPolicies() {
    try {
        const [rows] = await db.query('SELECT * FROM budget_access_policies WHERE module="RP" AND department_class="Product"');
        if (rows.length === 0) {
            await db.query(`
                INSERT INTO budget_access_policies (module, flow, department_id, department_name, department_class, department_code, can_cross_department_budget, requires_budget_check, is_active, created_at, updated_at)
                VALUES 
                ('RP', 'CREATE', 13, 'Product', 'Product', 'PRO', 1, 1, 1, NOW(), NOW()),
                ('RP', 'CREATE', 14, 'Marketing', 'Marketing', 'MKT', 1, 1, 1, NOW(), NOW())
            `);
            console.log("Added Product and Marketing policies for RP CREATE");
        } else {
            console.log("Policies already exist.");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

addPolicies();
