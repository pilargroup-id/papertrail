const db = require('../../db');
const { centralDb } = require('../../db');

// const CENTRAL_DB_NAME = process.env.CENTRAL_DB_NAME || 'pilargroup';
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
            id: row.id,
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
    return queries.getCompanies(centralDb);
}

async function getCompanyRow(companyName, client = centralDb) {
    return queries.getCompanyRow(client, companyName);
}

async function getCompanyId(companyName, client = centralDb) {
    return queries.getCompanyId(client, companyName);
}

async function getDepartmentRows() {
    return queries.getDepartmentRows(centralDb, dbRowToDepartment);
}

async function getDepartmentCompanyId(companyName, client = centralDb) {
    return queries.getDepartmentCompanyId(client, companyName);
}

async function getDeptCode(deptName, companyName) {
    return queries.getDeptCode(centralDb, deptName, companyName);
}

async function getDeptId(deptClass, companyName, client = centralDb) {
    return queries.getDeptId(client, deptClass, companyName);
}

async function getJobLevelId(jobLevelName, client = centralDb) {
    return queries.getJobLevelId(client, jobLevelName);
}

async function getAllEmployees() {
    return queries.getAllEmployees(centralDb, dbRowsToEmployees);
}

async function getDepartmentEmployeesByUserId(userId) {
    return queries.getDepartmentEmployeesByUserId(centralDb, dbRowsToEmployees, userId);
}

async function saveUserAssignments(client, userId, assignments) {
    return queries.saveUserAssignments(client, userId, assignments);
}

async function fetchAllFrpRequests() {
    const [rows] = await db.query(`
        SELECT f.*
        FROM frp_request f
    `);

    const requestIds = rows.map(r => r.id);

    let itemsByRequestId = {};

    if (requestIds.length > 0) {
        const [itemRows] = await db.query(`
            SELECT *
            FROM items_frp
            WHERE frp_request_id IN (?)
            ORDER BY created_at ASC
        `, [requestIds]);

        itemsByRequestId = itemRows.reduce((acc, item) => {
            if (!acc[item.frp_request_id]) acc[item.frp_request_id] = [];

            acc[item.frp_request_id].push({
                id: item.id,
                budgetId: item.budget_id || '',
                memo: item.memo || '',
                qty: Number(item.qty || 0),
                price: Number(item.price || 0),
                amount: Number(item.amount || 0),
            });

            return acc;
        }, {});
    }

    return rows.map(r => ({
        id: r.id,
        frpNo: r.frp_no || '',
        status: r.status,

        companyId: r.company_id || '',
        companyCode: r.company_code || '',
        companyName: r.company_name || '',

        departmentId: r.department_id || null,
        departmentName: r.department_name || '',
        departmentClass: r.department_class || '',
        departmentCode: r.department_code || '',

        jobLevelId: r.job_level_id || null,
        jobLevelName: r.job_level_name || '',
        jobLevelRank: r.job_level_rank || null,

        frpDate: r.frp_date ? new Date(r.frp_date).toISOString().slice(0, 10) : '',
        requestedBy: r.requested_by || '',

        currency: r.currency || 'IDR',
        exchangeRate: String(r.kurs || '1'),

        vendor: r.vendor || '',
        internalPoNumber: r.internal_po_number || '',
        externalDocumentType: r.ext_doc_type || '',
        externalDocumentNumber: r.ext_doc_number || '',

        paymentMethod: r.payment_method || 'Transfer',
        paymentDate: r.payment_date ? new Date(r.payment_date).toISOString().slice(0, 10) : '',

        destinationBank: r.destination_bank || '',
        destinationBankAccount: r.destination_bank_account || '',

        frpDescription: r.frp_description || '',

        checkDocs: typeof r.check_docs === 'string' ? JSON.parse(r.check_docs) : (r.check_docs || []),
        items: itemsByRequestId[r.id] || [],

        createdAt: r.created_at,
        createdBy: r.created_by,
        createdByUserId: r.created_by_user_id || '',
        createdByUserName: r.created_by_user_name || '',

        approvedByActual: r.approved_by_actual,
        approvedBy: r.approved_by,
        approvedAt: r.approved_at
    }));
}

async function fetchAllRpRequests() {
    const [rows] = await db.query(`
        SELECT r.*
        FROM rp_request r
    `);

    const requestIds = rows.map(r => r.id);

    let itemsByRequestId = {};

    if (requestIds.length > 0) {
        const [itemRows] = await db.query(`
            SELECT *
            FROM items_rp
            WHERE rp_request_id IN (?)
            ORDER BY created_at ASC
        `, [requestIds]);

        itemsByRequestId = itemRows.reduce((acc, item) => {
            if (!acc[item.rp_request_id]) acc[item.rp_request_id] = [];

            acc[item.rp_request_id].push({
                id: item.id,
                budgetId: item.budget_id || '',
                memo: item.memo || '',
                qty: Number(item.qty || 0),
                price: Number(item.price || 0),
                amount: Number(item.amount || 0),
            });

            return acc;
        }, {});
    }

    return rows.map(r => ({
        id: r.id,
        rpNo: r.rp_no || '',
        status: r.status,

        companyId: r.company_id || '',
        companyCode: r.company_code || '',
        companyName: r.company_name || '',

        departmentId: r.department_id || null,
        departmentName: r.department_name || '',
        departmentClass: r.department_class || '',
        departmentCode: r.department_code || '',

        classId: r.class_id || null,
        className: r.class_name || '',
        classClass: r.class_class || '',
        classCode: r.class_code || '',

        jobLevelId: r.job_level_id || null,
        jobLevelName: r.job_level_name || '',
        jobLevelRank: r.job_level_rank || null,

        requestedBy: r.requested_by || '',
        purchaseCategory: r.purchase_category || '',
        description: r.description || '',

        processedByDepartment: r.processed_by_department || '',

        requiredDate: r.required_date ? new Date(r.required_date).toISOString().slice(0, 10) : '',

        vendorSuggestion: r.vendor_suggestion || '',
        receiverPic: r.receiver_pic || '',

        items: itemsByRequestId[r.id] || [],

        createdAt: r.created_at,
        createdBy: r.created_by,
        createdByUserId: r.created_by_user_id || '',
        createdByUserName: r.created_by_user_name || '',

        managerApprovedBy: r.manager_approved_by,
        managerApprovedAt: r.manager_approved_at,

        processChanges: typeof r.process_changes === 'string' ? JSON.parse(r.process_changes) : (r.process_changes || []),
        processUpdatedBy: r.process_updated_by,
        processUpdatedAt: r.process_updated_at,

        processManagerApprovedBy: r.process_manager_approved_by,
        processManagerApprovedAt: r.process_manager_approved_at,

        rejectedBy: r.rejected_by,
        rejectedAt: r.rejected_at,
        rejectedReason: r.rejected_reason,
        rejectedStage: r.rejected_stage
    }));
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
    fetchAllRpRequests,
    fetchAllFrpRequests,
};
