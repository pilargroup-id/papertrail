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
// DATABASE QUERIES (DELEGATED TO QUERIES FILE)
// ============================================================
const queries = require('../queries');

async function getCompanies() {
    return queries.getCompanies(db);
}

async function getCompanyRow(companyName, client = db) {
    return queries.getCompanyRow(client, companyName);
}

async function getCompanyId(companyName, client = db) {
    return queries.getCompanyId(client, companyName);
}

async function getDepartmentRows() {
    return queries.getDepartmentRows(db, dbRowToDepartment);
}

async function getDepartmentCompanyId(companyName, client = db) {
    return queries.getDepartmentCompanyId(client, companyName);
}

async function getDeptCode(deptName, companyName) {
    return queries.getDeptCode(db, deptName, companyName);
}

async function getDeptId(deptClass, companyName, client = db) {
    return queries.getDeptId(client, deptClass, companyName);
}

async function getJobLevelId(jobLevelName, client = db) {
    return queries.getJobLevelId(client, jobLevelName);
}

async function getAllEmployees() {
    return queries.getAllEmployees(db, dbRowsToEmployees);
}

async function getDepartmentEmployeesByUserId(userId) {
    return queries.getDepartmentEmployeesByUserId(db, dbRowsToEmployees, userId);
}

async function saveUserAssignments(client, userId, assignments) {
    return queries.saveUserAssignments(client, userId, assignments);
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
    getDepartmentEmployeesByUserId,
    saveUserAssignments,
};
