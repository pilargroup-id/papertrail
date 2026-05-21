const db = require('../../db');
const { normalizeCompanyCode, normalizeCompanyName } = require('../utils/company');
const { COMPANY_MAP, USER_SQL, DEPARTMENT_SQL } = require('../config/constants');

// ============================================================
// MAPPING HELPERS
// ============================================================

function mapJobLevel(name) {
    if (!name) return 'Staff';
    if (name === 'Commissioner') return 'Komisaris';
    if (['President Director', 'Finance Director'].includes(name)) return 'Direktur';
    if (['Senior Manager', 'Manager'].includes(name)) return 'Manager';
    return name;
}

function dbRowToDepartment(row) {
    return {
        id: row.id,
        name: row.name,
        class: row.class,
        kodeFrp: row.kodeFrp,
        company: normalizeCompanyName(row.companyCode, row.companyRawName),
        companyCode: normalizeCompanyCode(row.companyCode || row.companyRawName),
        companyId: row.companyId,
        originalIndex: row.originalIndex ?? row.id,
    };
}

function dbRowsToEmployees(rows) {
    const grouped = new Map();

    rows.forEach(row => {
        if (!grouped.has(row.id)) {
            grouped.set(row.id, { row, assignments: [], assignmentMap: new Map(), isAdmin: false });
        }

        const entry = grouped.get(row.id);
        const deptDisplayName = row.dept_name || '';
        const deptClass = row.dept_class || '';
        const jobLevel = mapJobLevel(row.job_level_name);
        const companyName = normalizeCompanyName(row.company_code, row.company_name);

        // Mark as admin if in IT department
        if (row.department_id === 8 || deptClass.toUpperCase() === 'IT' || deptDisplayName.toUpperCase() === 'IT') {
            entry.isAdmin = true;
        }

        if (deptDisplayName || deptClass || row.company_code || row.company_name) {
            // Group by company + dept name → enables multi-class per dept
            const groupKey = `${companyName}|${deptDisplayName || deptClass}|${jobLevel}`;
            if (!entry.assignmentMap.has(groupKey)) {
                const asgn = {
                    id: row.company_id || '',
                    companyId: row.company_id || '',
                    code: normalizeCompanyCode(row.company_code || row.company_name),
                    companyCode: normalizeCompanyCode(row.company_code || row.company_name),
                    name: companyName,
                    deptName: deptDisplayName,
                    class: deptClass,
                    classes: deptClass ? [deptClass] : [],
                    jobLevel,
                };
                entry.assignmentMap.set(groupKey, asgn);
                entry.assignments.push(asgn);
            } else {
                // Accumulate additional classes for the same dept group
                const existing = entry.assignmentMap.get(groupKey);
                if (deptClass && !existing.classes.includes(deptClass)) {
                    existing.classes.push(deptClass);
                }
            }
        }
    });

    return [...grouped.values()].map(({ row, assignments, isAdmin }) => {
        const jobLevel = mapJobLevel(row.job_level_name);
        const fallbackAssignments = assignments.length
            ? assignments
            : [{ name: COMPANY_MAP.PNM, deptName: '', class: '', classes: [], jobLevel }];

        return {
            fullName: row.name,
            email: row.email || '',
            username: row.username,
            role: isAdmin ? 'administrator' : 'user',
            companies: fallbackAssignments,
            originalIndex: row.id,
        };
    });
}

function userFromLoginRows(rows) {
    return dbRowsToEmployees(rows)[0] || null;
}

function getPrimaryAssignment(assignments) {
    const list = Array.isArray(assignments) ? assignments : Object.values(assignments || {});
    return list[0] || {};
}

// ============================================================
// DATABASE QUERIES
// ============================================================

async function getCompanies() {
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

async function getCompanyRow(companyName, client = db) {
    const code = normalizeCompanyCode(companyName);
    const [rows] = await client.query(
        'SELECT id, code, name FROM master_companies WHERE code = ? OR UPPER(name) = UPPER(?) LIMIT 1',
        [code, companyName || '']
    );
    return rows[0] || null;
}

async function getCompanyId(companyName, client = db) {
    const company = await getCompanyRow(companyName, client);
    return company ? company.id : null;
}

async function getDepartmentRows() {
    const [rows] = await db.query(DEPARTMENT_SQL + ' ORDER BY md.name');
    return rows.map(dbRowToDepartment);
}

async function getDepartmentCompanyId(companyName, client = db) {
    return getCompanyId(companyName || COMPANY_MAP.PNM, client);
}

async function getDeptCode(deptName, companyName) {
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
    if (companyName) return getDeptCode(deptName); // retry without company
    return dept.substring(0, 3).toUpperCase();
}

async function getDeptId(deptClass, companyName, client = db) {
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

    const [rows] = await client.query(sql, params);
    if (rows.length) return rows[0].id;
    if (companyName) return getDeptId(deptClass, null, client); // retry without company
    return null;
}

async function getJobLevelId(jobLevelName, client = db) {
    const mapped = { 'Komisaris': 'Commissioner', 'Direktur': 'President Director' };
    const search = mapped[jobLevelName] || jobLevelName;
    const [rows] = await client.query('SELECT id FROM master_job_levels WHERE name = ? LIMIT 1', [search]);
    return rows.length ? rows[0].id : 8;
}

async function getAllEmployees() {
    const [rows] = await db.query(USER_SQL + ' ORDER BY cu.name, cud.is_primary DESC, md.name');
    return dbRowsToEmployees(rows);
}

async function saveUserAssignments(client, userId, assignments) {
    const list = Array.isArray(assignments) ? assignments : Object.values(assignments || {});
    await client.query('DELETE FROM central_user_departments WHERE user_id = ?', [userId]);
    await client.query('DELETE FROM central_user_companies WHERE user_id = ?', [userId]);

    const companyIds = new Set();
    let isPrimaryDept = true;

    for (const [index, assignment] of list.entries()) {
        const company = await getCompanyRow(assignment.name, client);
        if (company && !companyIds.has(company.id)) {
            companyIds.add(company.id);
            await client.query(
                'INSERT IGNORE INTO central_user_companies (id, user_id, company_id, is_primary) VALUES (UUID(), ?, ?, ?)',
                [userId, company.id, index === 0 ? 1 : 0]
            );
        }

        // Support both classes[] (new, multi-class) and class string (old, backward compat)
        const classList = (assignment.classes && assignment.classes.length > 0)
            ? assignment.classes
            : [assignment.class].filter(Boolean);

        for (const cls of classList) {
            const deptId = await getDeptId(cls, assignment.name, client);
            if (deptId) {
                await client.query(
                    'INSERT IGNORE INTO central_user_departments (id, user_id, department_id, is_primary) VALUES (UUID(), ?, ?, ?)',
                    [userId, deptId, isPrimaryDept ? 1 : 0]
                );
                isPrimaryDept = false;
            }
        }
    }
}

module.exports = {
    // Mappers
    mapJobLevel,
    dbRowToDepartment,
    dbRowsToEmployees,
    userFromLoginRows,
    getPrimaryAssignment,
    // Queries
    getCompanies,
    getCompanyRow,
    getCompanyId,
    getDepartmentRows,
    getDepartmentCompanyId,
    getDeptCode,
    getDeptId,
    getJobLevelId,
    getAllEmployees,
    saveUserAssignments,
};
