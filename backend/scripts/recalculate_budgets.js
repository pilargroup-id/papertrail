const db = require('../db');

async function main() {
    const client = await db.getConnection();
    try {
        await client.beginTransaction();

        const [budgets] = await client.query('SELECT id, budget_amount FROM master_budgets');
        console.log(`Found ${budgets.length} budgets. Recalculating...`);

        for (const budget of budgets) {
            const budgetId = budget.id;
            const budgetAmount = Number(budget.budget_amount || 0);

            // Sum FRP approved items
            const [frpRows] = await client.query(`
                SELECT IFNULL(SUM(amount), 0) AS total 
                FROM items_frp 
                WHERE budget_id = ? 
                  AND frp_request_id IN (SELECT id FROM frp_request WHERE status = 'APPROVED')
            `, [budgetId]);
            const frpTotal = Number(frpRows[0].total || 0);

            // Sum RP approved items
            const [rpRows] = await client.query(`
                SELECT IFNULL(SUM(amount), 0) AS total 
                FROM items_rp 
                WHERE budget_id = ? 
                  AND rp_request_id IN (SELECT id FROM rp_request WHERE status = 'approved')
            `, [budgetId]);
            const rpTotal = Number(rpRows[0].total || 0);

            const totalUsed = frpTotal + rpTotal;
            const remaining = budgetAmount - totalUsed;

            await client.query(`
                UPDATE master_budgets 
                SET budget_used = ?, budget_remaining = ? 
                WHERE id = ?
            `, [totalUsed, remaining, budgetId]);

            console.log(`Budget ${budgetId}: Amount=${budgetAmount}, Used=${totalUsed}, Remaining=${remaining}`);
        }

        await client.commit();
        console.log('Recalculation successfully committed!');
        process.exit(0);
    } catch (e) {
        await client.rollback();
        console.error('Error during recalculation:', e);
        process.exit(1);
    } finally {
        client.release();
    }
}

main();
