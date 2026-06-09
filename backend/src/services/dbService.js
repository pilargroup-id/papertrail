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
            grouped.set(row.id, {
                row,
                assignments: [],
                assignmentMap: new Map(),
                isAdmin: false,
            });
        }

        const entry = grouped.get(row.id);

        const companyId = row.company_id || '';
        const companyCode = normalizeCompanyCode(row.company_code || row.company_name);
        const companyName = normalizeCompanyName(row.company_code, row.company_name);

        const departmentId = row.department_id || null;
        const departmentName = row.dept_name || '';
        const departmentClass = row.dept_class || '';
        const departmentCode = row.dept_code || '';

        const jobLevelName = mapJobLevel(row.job_level_name);
        const jobLevelRank = row.job_level_rank ?? null;

        if (
            departmentId === 8 ||
            departmentClass.toUpperCase() === 'IT' ||
            departmentName.toUpperCase() === 'IT'
        ) {
            entry.isAdmin = true;
        }

        if (companyId || companyCode || companyName || departmentName || departmentClass) {
            const groupKey = `${companyId}|${departmentId}|${departmentClass}|${jobLevelName}|${jobLevelRank}`;

            if (!entry.assignmentMap.has(groupKey)) {
                const assignment = {
                    id: companyId,
                    code: companyCode,
                    name: companyName,
                    class: departmentClass,
                    department_id: departmentId,
                    dept_name: departmentName,
                    dept_class: departmentClass,
                    dept_code: departmentCode,
                    job_level_name: jobLevelName,
                    job_level_rank: jobLevelRank,
                    classes: departmentClass ? [departmentClass] : [],
                };

                entry.assignmentMap.set(groupKey, assignment);
                entry.assignments.push(assignment);
            } else {
                const existing = entry.assignmentMap.get(groupKey);

                if (departmentClass && !existing.classes.includes(departmentClass)) {
                    existing.classes.push(departmentClass);
                }
            }
        }
    });

    return [...grouped.values()].map(({ row, assignments, isAdmin }) => {
        const primaryAssignment = assignments[0] || {};

        const companyId = primaryAssignment.id || row.company_id || '';
        const companyCode = primaryAssignment.code || normalizeCompanyCode(row.company_code || row.company_name);
        const companyName = primaryAssignment.name || normalizeCompanyName(row.company_code, row.company_name);

        const departmentId = primaryAssignment.department_id || row.department_id || null;
        const departmentCode = primaryAssignment.dept_code || row.dept_code || '';
        const departmentName = primaryAssignment.dept_name || row.dept_name || '';
        const departmentClass = primaryAssignment.dept_class || row.dept_class || '';

        const jobLevelName = primaryAssignment.job_level_name || mapJobLevel(row.job_level_name);
        const jobLevelRank = primaryAssignment.job_level_rank ?? row.job_level_rank ?? null;

        const finalAssignments = assignments.length
            ? assignments
            : [
                {
                    id: companyId || '',
                    code: companyCode || '',
                    name: companyName || COMPANY_MAP.PNM,
                    class: departmentClass || '',
                    department_id: departmentId,
                    dept_name: departmentName || '',
                    dept_class: departmentClass || '',
                    dept_code: departmentCode || '',
                    job_level_name: jobLevelName,
                    job_level_rank: jobLevelRank,
                    classes: departmentClass ? [departmentClass] : [],
                },
            ];

        return {
            id: row.id,
            username: row.username,
            email: row.email || null,
            fullName: row.name,
            name: row.name,

            companyId,
            companyCode,
            companyName,
            selectedCompany: companyName,

            departmentId,
            departmentCode,
            departmentName,
            departmentClass,
            selectedDivision: departmentClass || departmentName,

            jobLevelName,
            jobLevelRank,
            selectedJobLevel: jobLevelName,

            allAssignments: finalAssignments,
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
            SELECT i.*, mb.project_name
            FROM items_frp i
            LEFT JOIN master_budgets mb ON i.budget_id = mb.id
            WHERE i.frp_request_id IN (?)
            ORDER BY i.created_at ASC
        `, [requestIds]);

        itemsByRequestId = itemRows.reduce((acc, item) => {
            if (!acc[item.frp_request_id]) acc[item.frp_request_id] = [];

            acc[item.frp_request_id].push({
                id: item.id,
                budgetId: item.budget_id || '',
                projectName: item.project_name || '',
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
        divisi: r.department_class || '',

        jobLevelId: r.job_level_id || null,
        jobLevelName: r.job_level_name || '',
        jobLevelRank: r.job_level_rank || null,

        frpDate: r.frp_date ? new Date(r.frp_date).toISOString().slice(0, 10) : (r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : ''),
        tanggalFrp: r.frp_date ? new Date(r.frp_date).toISOString().slice(0, 10) : (r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : ''),
        requestedBy: r.requested_by || '',
        dimintaOleh: r.requested_by || '',

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
        attachLink: r.attachment_link || '',

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
            SELECT i.*, mb.project_name
            FROM items_rp i
            LEFT JOIN master_budgets mb ON i.budget_id = mb.id
            WHERE i.rp_request_id IN (?)
            ORDER BY i.created_at ASC
        `, [requestIds]);

        itemsByRequestId = itemRows.reduce((acc, item) => {
            if (!acc[item.rp_request_id]) acc[item.rp_request_id] = [];

            acc[item.rp_request_id].push({
                id: item.id,
                budgetId: item.budget_id || '',
                projectName: item.project_name || '',
                memo: item.memo || '',
                qty: Number(item.qty || 0),
                price: Number(item.price || 0),
                estimatedValue: Number(item.price || 0),
                amount: Number(item.amount || 0),
                link_item: item.link_item || '',
                linkPembelian: item.link_item || '',
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
        divisi: r.department_class || r.department_name || '',

        classId: r.class_id || null,
        className: r.class_name || '',
        classClass: r.class_class || '',
        classCode: r.class_code || '',

        jobLevelId: r.job_level_id || null,
        jobLevelName: r.job_level_name || '',
        jobLevelRank: r.job_level_rank || null,

        requestedBy: r.requested_by || '',
        purchaseCategory: r.purchase_category || '',
        kategoriPembelian: r.purchase_category || '',
        description: r.description || '',

        processedByDepartment: r.processed_by_department || '',
        diprosesOleh: r.processed_by_department || '',

        requiredDate: r.required_date ? new Date(r.required_date).toISOString().slice(0, 10) : '',

        vendorSuggestion: r.vendor_suggestion || '',
        receiverPic: r.receiver_pic || '',

        items: itemsByRequestId[r.id] || [],

        createdAt: r.created_at,
        createdBy: r.created_by,
        createdByUserId: r.created_by_user_id || '',
        createdByUserName: r.created_by_user_name || '',
        dibuatOleh: r.created_by_user_name || r.created_by || '',

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
