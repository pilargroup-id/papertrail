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

async function fetchAllRpRequests() {
    const [rows] = await db.query(`
        SELECT r.*, 
               mc.name AS companyName, 
               md.name AS divisi, 
               mdc.class AS classStr 
        FROM rp_request r
        LEFT JOIN master_companies mc ON r.company_id = mc.id
        LEFT JOIN master_departments md ON r.department_id = md.id
        LEFT JOIN master_departments mdc ON r.class_id = mdc.id
    `);
    return rows.map(r => ({
        id: r.id,
        rpNo: r.rp_no || '',
        status: r.status,
        companyName: r.companyName || '',
        divisi: r.divisi || '',
        class: r.classStr || '',
        dibuatOleh: r.dibuat_oleh || '',
        kategoriPembelian: r.kategori_pembelian || '',
        deskripsi: r.deskripsi || '',
        diprosesOleh: r.diproses_oleh || '',
        tanggalDibutuhkan: r.tanggal_dibutuhkan ? new Date(r.tanggal_dibutuhkan).toISOString().slice(0,10) : '',
        vendorSuggestion: r.vendor_suggestion || '',
        picPenerima: r.pic_penerima || '',
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        createdAt: r.created_at,
        createdBy: r.created_by,
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

async function fetchAllFrpRequests() {
    const [rows] = await db.query(`
        SELECT f.*, 
               mc.name AS companyName, 
               md.name AS divisi 
        FROM frp_request f
        LEFT JOIN master_companies mc ON f.company_id = mc.id
        LEFT JOIN master_departments md ON f.department_id = md.id
    `);
    
    return rows.map(r => ({
        id: r.id,
        companyName: r.companyName || '',
        tanggalFrp: r.tanggal_frp ? new Date(r.tanggal_frp).toISOString().slice(0, 10) : '',
        divisi: r.divisi || '',
        dimintaOleh: r.diminta_oleh || '',
        currency: r.currency || 'IDR',
        kurs: String(r.kurs || '1'),
        vendor: r.vendor || '',
        internalPoNumber: r.internal_po_number || '',
        extDocType: r.ext_doc_type || '',
        extDocNumber: r.ext_doc_number || '',
        paymentMethod: r.payment_method || 'Transfer',
        paymentDate: r.payment_date ? new Date(r.payment_date).toISOString().slice(0, 10) : '',
        bankTujuan: r.bank_tujuan || '',
        rekBankTujuan: r.rek_bank_tujuan || '',
        keteranganFrp: r.keterangan_frp || '',
        checkDocs: typeof r.check_docs === 'string' ? JSON.parse(r.check_docs) : (r.check_docs || []),
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        frpNo: r.frp_no || '',
        requestBy: r.diminta_oleh || '',
        status: r.status,
        createdBy: r.created_by,
        createdAt: r.created_at,
        approvedByActual: r.approved_by_actual,
        approvedBy: r.approved_by,
        approvedAt: r.approved_at
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
