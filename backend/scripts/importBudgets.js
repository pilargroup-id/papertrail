require('dotenv').config({
    path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});

const path = require('path');
const xlsx = require('xlsx');
const db = require('../db');
const { centralDb } = require('../db');

const FILE_PATH = process.argv[2] || path.join(__dirname, '../imports/budget.xlsx');

function clean(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function toNumber(value) {
    if (value === null || value === undefined || value === '') return 0;

    if (typeof value === 'number') return value;

    const cleaned = String(value)
        .replace(/\./g, '')
        .replace(/,/g, '')
        .replace(/[^\d.-]/g, '');

    return Number(cleaned || 0);
}

async function findDepartment(departmentName, departmentClass) {
    const [rows] = await centralDb.query(`
        SELECT id, name, class, code
        FROM master_departments
        WHERE is_active = 1
          AND (
              name = ?
              OR class = ?
              OR code = ?
          )
        ORDER BY
            CASE
                WHEN name = ? THEN 1
                WHEN class = ? THEN 2
                WHEN code = ? THEN 3
                ELSE 4
            END
        LIMIT 1
    `, [
        departmentName,
        departmentClass,
        departmentName,
        departmentName,
        departmentClass,
        departmentName,
    ]);

    return rows[0] || null;
}

async function main() {
    console.log(`Reading file: ${FILE_PATH}`);

    const workbook = xlsx.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet, {
        defval: '',
        raw: false,
    });

    if (!rows.length) {
        console.log('No rows found.');
        process.exit(0);
    }

    console.log(`Sheet: ${sheetName}`);
    console.log(`Rows found: ${rows.length}`);

    const client = await db.getConnection();

    try {
        await client.beginTransaction();

        let inserted = 0;
        let updated = 0;
        let skipped = 0;

        for (const row of rows) {
            const budgetId = clean(row['Budget ID']);
            const departmentName = clean(row['Department']);
            const departmentClass = clean(row['Class']);
            const projectName = clean(row['Project Name']);
            const budgetType = clean(row['Type']);
            const budgetAmount = toNumber(row['Budget Amount']);

            if (!budgetId || !projectName) {
                skipped++;
                console.log(`Skipped row: missing Budget ID or Project Name`);
                continue;
            }

            const dept = await findDepartment(departmentName, departmentClass);

            const finalDepartmentId = dept?.id || null;
            const finalDepartmentName = dept?.name || departmentName;
            const finalDepartmentClass = dept?.class || departmentClass;
            const finalDepartmentCode = dept?.code || '';

            const [existing] = await client.query(`
                SELECT id
                FROM master_budgets
                WHERE id = ?
                LIMIT 1
            `, [budgetId]);

            if (existing.length) {
                await client.query(`
                    UPDATE master_budgets
                    SET
                        department_id = ?,
                        department_name = ?,
                        department_class = ?,
                        department_code = ?,
                        project_name = ?,
                        budget_type = ?,
                        budget_amount = ?,
                        budget_remaining = ? - budget_used,
                        is_active = 1
                    WHERE id = ?
                `, [
                    finalDepartmentId,
                    finalDepartmentName,
                    finalDepartmentClass,
                    finalDepartmentCode,
                    projectName,
                    budgetType,
                    budgetAmount,
                    budgetAmount,
                    budgetId,
                ]);

                updated++;
            } else {
                await client.query(`
                    INSERT INTO master_budgets (
                        id,
                        department_id,
                        department_name,
                        department_class,
                        department_code,
                        project_name,
                        budget_type,
                        budget_amount,
                        budget_used,
                        budget_remaining,
                        is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1)
                `, [
                    budgetId,
                    finalDepartmentId,
                    finalDepartmentName,
                    finalDepartmentClass,
                    finalDepartmentCode,
                    projectName,
                    budgetType,
                    budgetAmount,
                    budgetAmount,
                ]);

                inserted++;
            }
        }

        await client.commit();

        console.log('Import completed.');
        console.log(`Inserted: ${inserted}`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped: ${skipped}`);
    } catch (err) {
        await client.rollback();
        console.error('Import failed:', err);
        process.exitCode = 1;
    } finally {
        client.release();
        await db.end();
        await centralDb.end();
    }
}

main();