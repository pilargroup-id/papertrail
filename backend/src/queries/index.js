const { normalizeCompanyCode, normalizeCompanyName } = require('../utils/company');
const { COMPANY_MAP, USER_SQL, DEPARTMENT_SQL } = require('../config/constants');

// ============================================================
// DATABASE QUERIES
// ============================================================

async function getCompanies(db) {
    const [rows] = await db.query(`
        SELECT id, code, name
        FROM master_companies
        WHERE is_active = 1
        ORDER BY CASE code WHEN 'PNM' THEN 1 WHEN 'PKS' THEN 2 WHEN 'PKP' THEN 3 ELSE 9 END, code
    `);
    return rows.map(row => ({
        id: row.id,
        code: normalizeCompanyCode(row.code),
        name: normalizeCompanyName(row.code, row.name),
    }));
}

async function getCompanyRow(db, companyName) {
    const code = normalizeCompanyCode(companyName);
    const [rows] = await db.query(
        'SELECT id, code, name FROM master_companies WHERE code = ? OR UPPER(name) = UPPER(?) LIMIT 1',
        [code, companyName || '']
    );
    return rows[0] || null;
}

async function getCompanyId(db, companyName) {
    const company = await getCompanyRow(db, companyName);
    return company ? company.id : null;
}

async function getDepartmentRows(db, dbRowToDepartment) {
    const [rows] = await db.query(DEPARTMENT_SQL + ' ORDER BY md.name');
    return rows.map(dbRowToDepartment);
}

async function getDepartmentCompanyId(db, companyName) {
    return getCompanyId(db, companyName || COMPANY_MAP.PNM);
}

async function getDeptCode(db, deptName, companyName) {
    const dept = (deptName || '').trim();
    if (!dept) return 'GEN';
    const params = [dept, dept];
    let sql = `
        SELECT md.code
        FROM master_departments md
        LEFT JOIN master_companies mc ON md.company_id = mc.id
        WHERE (UPPER(md.name) = UPPER(?) OR UPPER(md.class) = UPPER(?))
    `;
    if (companyName) {
        sql += ' AND mc.code = ?';
        params.push(normalizeCompanyCode(companyName));
    }
    sql += ' ORDER BY md.parent_id IS NOT NULL, md.id LIMIT 1';

    const [rows] = await db.query(sql, params);
    if (rows.length && rows[0].code) return rows[0].code;
    if (companyName) return getDeptCode(db, deptName); // retry without company
    return dept.substring(0, 3).toUpperCase();
}

async function getDeptId(db, deptClass, companyName) {
    const dept = (deptClass || '').trim();
    if (!dept) return null;
    const params = [dept, dept];
    let sql = `
        SELECT md.id
        FROM master_departments md
        LEFT JOIN master_companies mc ON md.company_id = mc.id
        WHERE (md.name = ? OR md.class = ?)
    `;
    if (companyName) {
        sql += ' AND mc.code = ?';
        params.push(normalizeCompanyCode(companyName));
    }
    sql += ' ORDER BY md.parent_id IS NOT NULL, md.id LIMIT 1';

    const [rows] = await db.query(sql, params);
    if (rows.length) return rows[0].id;
    if (companyName) return getDeptId(db, deptClass, null); // retry without company
    return null;
}

async function getJobLevelId(db, jobLevelName) {
    const mapped = { 'Komisaris': 'Commissioner', 'Direktur': 'President Director' };
    const search = mapped[jobLevelName] || jobLevelName;
    const [rows] = await db.query('SELECT id FROM master_job_levels WHERE name = ? LIMIT 1', [search]);
    return rows.length ? rows[0].id : 8;
}

async function getAllEmployees(db, dbRowsToEmployees) {
    const [rows] = await db.query(USER_SQL + ' ORDER BY cu.name, cud.is_primary DESC, md.name');
    return dbRowsToEmployees(rows);
}

async function getDepartmentEmployeesByUserId(db, dbRowsToEmployees, userId) {
    const { USER_DEPARTEMENT_SQL } = require('../config/constants');
    const [rows] = await db.query(USER_DEPARTEMENT_SQL + ' ORDER BY cu.name, cud.is_primary DESC, md.name', [userId]);
    return dbRowsToEmployees(rows);
}


async function saveUserAssignments(db, userId, assignments) {
    const list = Array.isArray(assignments) ? assignments : Object.values(assignments || {});
    await db.query('DELETE FROM central_user_departments WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM central_user_companies WHERE user_id = ?', [userId]);

    const companyIds = new Set();
    let isPrimaryDept = true;

    for (const [index, assignment] of list.entries()) {
        const company = await getCompanyRow(db, assignment.name);
        if (company && !companyIds.has(company.id)) {
            companyIds.add(company.id);
            await db.query(
                'INSERT IGNORE INTO central_user_companies (id, user_id, company_id, is_primary) VALUES (UUID(), ?, ?, ?)',
                [userId, company.id, index === 0 ? 1 : 0]
            );
        }

        // Support both classes[] (new, multi-class) and class string (old, backward compat)
        const classList = (assignment.classes && assignment.classes.length > 0)
            ? assignment.classes
            : [assignment.class].filter(Boolean);

        for (const cls of classList) {
            const deptId = await getDeptId(db, cls, assignment.name);
            if (deptId) {
                await db.query(
                    'INSERT IGNORE INTO central_user_departments (id, user_id, department_id, is_primary) VALUES (UUID(), ?, ?, ?)',
                    [userId, deptId, isPrimaryDept ? 1 : 0]
                );
                isPrimaryDept = false;
            }
        }
    }
}

module.exports = {
    getCompanies,
    getCompanyRow,
    getCompanyId,
    getDepartmentRows,
    getDepartmentCompanyId,
    getDeptCode,
    getDeptId,
    getJobLevelId,
    getAllEmployees,
    getDepartmentEmployeesByUserId,
    saveUserAssignments,
};
