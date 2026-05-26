const express = require('express');
const { checkAuth } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/json');
const { getAllEmployees, getCompanies, getDepartmentRows, getDeptCode, getCompanyId, getDeptId, fetchAllFrpRequests, fetchAllRpRequests } = require('../services/dbService');
const { sameCompanyName } = require('../utils/company');
const { isRpInUserScope } = require('../middleware/scope');
const db = require('../../db');
const crypto = require('crypto');

const router = express.Router();

function getRpSnapshotFromUser(user) {
    return {
        companyId: user.companyId || null,
        companyCode: user.companyCode || '',
        companyName: user.companyName || user.selectedCompany || '',

        departmentId: user.departmentId || null,
        departmentName: user.departmentName || '',
        departmentClass: user.departmentClass || user.selectedDivision || '',
        departmentCode: user.departmentCode || '',

        jobLevelId: user.jobLevelId || null,
        jobLevelName: user.jobLevelName || user.selectedJobLevel || '',
        jobLevelRank: user.jobLevelRank || null,

        createdByUserId: user.id || null,
        createdByUserName: user.fullName || user.name || user.username || '',
    };
}

function normalizeRpItems(items = []) {
    return Array.isArray(items)
        ? items.map(item => ({
            id: item.id || crypto.randomUUID(),
            budgetId: item.budgetId || item.budget_id || null,
            memo: item.memo || '',
            qty: Number(item.qty || 0),
            price: Number(item.price || item.estimatedValue || 0),
            amount: Number(item.amount || (Number(item.qty || 0) * Number(item.price || item.estimatedValue || 0)) || 0),
        }))
        : [];
}

async function replaceRpItems(client, rpRequestId, items) {
    await client.query(
        'DELETE FROM items_rp WHERE rp_request_id = ?',
        [rpRequestId]
    );

    for (const item of items) {
        await client.query(`
            INSERT INTO items_rp (
                id,
                rp_request_id,
                budget_id,
                memo,
                qty,
                price,
                amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            item.id,
            rpRequestId,
            item.budgetId,
            item.memo,
            item.qty,
            item.price,
            item.amount,
        ]);
    }
}

async function getBudgetAccessPolicy(client, moduleName, user) {
    const departmentClass = String(
        user.departmentClass ||
        user.selectedDivision ||
        user.departmentName ||
        ''
    ).trim();

    const [rows] = await client.query(`
        SELECT
            can_cross_department_budget,
            requires_budget_check
        FROM budget_access_policies
        WHERE module = ?
          AND flow = 'CREATE'
          AND department_class = ?
          AND is_active = 1
        LIMIT 1
    `, [moduleName, departmentClass]);

    if (!rows.length) {
        return {
            canCrossDepartmentBudget: false,
            requiresBudgetCheck: true,
        };
    }

    return {
        canCrossDepartmentBudget: Number(rows[0].can_cross_department_budget) === 1,
        requiresBudgetCheck: Number(rows[0].requires_budget_check) === 1,
    };
}

async function validateRpBudgetAccess(client, user, items) {
    const policy = await getBudgetAccessPolicy(client, 'RP', user);

    if (!policy.requiresBudgetCheck) return;

    const budgetIds = [...new Set(items.map(item => item.budgetId).filter(Boolean))];

    if (!budgetIds.length) return;

    const [budgets] = await client.query(`
        SELECT
            id,
            department_id,
            department_name,
            department_class,
            department_code,
            budget_remaining,
            is_active
        FROM master_budgets
        WHERE id IN (?)
    `, [budgetIds]);

    const foundBudgetIds = new Set(budgets.map(b => b.id));
    const missingBudgetIds = budgetIds.filter(id => !foundBudgetIds.has(id));

    if (missingBudgetIds.length) {
        const error = new Error(`Budget not found: ${missingBudgetIds.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    const inactiveBudgets = budgets.filter(b => Number(b.is_active) !== 1);

    if (inactiveBudgets.length) {
        const error = new Error(`Inactive budget: ${inactiveBudgets.map(b => b.id).join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    if (!policy.canCrossDepartmentBudget) {
        const userDepartmentClass = String(
            user.departmentClass ||
            user.selectedDivision ||
            user.departmentName ||
            ''
        ).trim().toUpperCase();

        const invalidBudgets = budgets.filter(b =>
            String(b.department_class || '').trim().toUpperCase() !== userDepartmentClass
        );

        if (invalidBudgets.length) {
            const error = new Error(
                `You are not allowed to use budget from another department: ${invalidBudgets.map(b => b.id).join(', ')}`
            );
            error.statusCode = 403;
            throw error;
        }
    }

    const amountByBudgetId = items.reduce((acc, item) => {
        if (!item.budgetId) return acc;
        acc[item.budgetId] = (acc[item.budgetId] || 0) + Number(item.amount || 0);
        return acc;
    }, {});

    const overBudgetItems = budgets.filter(b => {
        const requestedAmount = Number(amountByBudgetId[b.id] || 0);
        const remaining = Number(b.budget_remaining || 0);
        return requestedAmount > remaining;
    });

    if (overBudgetItems.length) {
        const error = new Error(
            `Budget remaining is not enough: ${overBudgetItems.map(b => b.id).join(', ')}`
        );
        error.statusCode = 400;
        throw error;
    }
}

// ============================================================
// RP PAGES
// ============================================================

router.get('/rp', checkAuth, (req, res) => res.sendSPA());
router.get('/rp-approval', checkAuth, (req, res) => res.sendSPA());
router.get('/rp-approved', checkAuth, (req, res) => res.sendSPA());
router.get('/rp/:id', checkAuth, (req, res) => res.sendSPA());

// ============================================================
// RP FORM DATA
// ============================================================

router.get('/api/rp/form-data', checkAuth, async (req, res) => {
    try {
        const u = req.session.user;
        const [employees, departmentsData, companiesData] = await Promise.all([
            getAllEmployees(),
            getDepartmentRows(),
            getCompanies(),
        ]);
        const processDivisions = [...new Set(departmentsData.map(d => d.name).filter(Boolean))].sort();

        const [budgetsRows] = await db.query('SELECT id, company_id, departement_id, class, description, type, total_amount, budget_remaining FROM master_budgets');
        const budgetsData = budgetsRows.map(row => ({
            id: row.id,
            company_id: row.company_id,
            companyId: row.company_id,
            department_id: row.departement_id,
            departmentId: row.departement_id,
            class_id: row.class,
            classId: row.class,
            class: row.class,
            description: row.description,
            type: row.type,
            total_amount: row.total_amount,
            totalAmount: row.total_amount,
            budget_remaining: row.budget_remaining,
            sisa_budget: row.budget_remaining,
            sisaBudget: row.budget_remaining,
            remainingAmount: row.budget_remaining
        }));
        const vendorsData = readJson('vendors.json');
        const rpRequests = await fetchAllRpRequests();
        const frpRequests = await fetchAllFrpRequests();

        // Calculate used budgets from both FRP (approved) and RP (approved)
        const usedBudgets = {};
        frpRequests.forEach(r => {
            if (r.status === 'APPROVED' && r.items) {
                r.items.forEach(item => {
                    const bId = item.budgetId;
                    const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                    usedBudgets[bId] = (usedBudgets[bId] || 0) + amt;
                });
            }
        });
        rpRequests.forEach(r => {
            if (r.status === 'approved' && r.items) {
                r.items.forEach(item => {
                    const bId = item.budgetId;
                    const amt = parseInt(String(item.estimatedValue || '0').replace(/[^0-9]/g, ''), 10) || 0;
                    usedBudgets[bId] = (usedBudgets[bId] || 0) + (amt * (parseInt(item.qty) || 1));
                });
            }
        });

        const budgetsWithRemaining = budgetsData.map(b => {
            const bCompanyId = b.company_id !== undefined ? b.company_id : b.companyId;
            const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
            const bClassId = b.class_id !== undefined ? b.class_id : b.classId;
            const bCompany = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
            const bDept = departmentsData.find(d => String(d.id) === String(bDepartmentId));
            const bClass = departmentsData.find(d => String(d.id) === String(bClassId));
            return {
                ...b,
                company: bCompany ? (bCompany.name || bCompany.code) : (b.company || 'PT PILAR NIAGA MAKMUR'),
                department: bDept ? bDept.name : (b.department || ''),
                class: bClass ? bClass.class : (b.class || ''),
                remainingAmount: (b.total_amount !== undefined ? b.total_amount : (b.totalAmount || 0)) - (usedBudgets[b.id] || 0),
            };
        });

        let editData = null;
        if (req.query.revisi) {
            editData = rpRequests.find(r => r.id === req.query.revisi);
        } else if (req.query.process) {
            editData = rpRequests.find(r => r.id === req.query.process);
        }

        res.json({
            employees,
            budgets: budgetsWithRemaining,
            companies: companiesData,
            vendors: vendorsData,
            departments: departmentsData,
            processDivisions,
            editData,
            user: {
                ...u,
                selectedCompany: u.selectedCompany || '',
                selectedDivision: u.selectedDivision || '',
                selectedJobLevel: u.selectedJobLevel || '',
            },
            selectedCompany: u.selectedCompany || '',
            selectedDivision: u.selectedDivision || '',
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// RP NUMBER
// ============================================================

router.get('/api/rp/next-number/:department', checkAuth, async (req, res) => {
    try {
        const rpRequests = await fetchAllRpRequests();
        const dept = (req.params.department || '').trim().toUpperCase();
        const deptCode = await getDeptCode(dept, req.query.company || req.session.user.selectedCompany);
        const prefix = `RP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const sequences = rpRequests
            .filter(r => r.rpNo && r.rpNo.startsWith(prefix))
            .map(r => parseInt(r.rpNo.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        res.json({ rpNo: `${prefix}${nextSeq.toString().padStart(5, '0')}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// RP SAVE
// ============================================================

router.post('/api/rp/save', checkAuth, async (req, res) => {
    const client = await db.getConnection();

    try {
        await client.beginTransaction();

        const u = req.session.user;
        const snapshot = getRpSnapshotFromUser(u);
        const items = normalizeRpItems(req.body.items || []);

        await validateRpBudgetAccess(client, u, items);

        const creatorCanProcessRp = await hasRpBudgetPolicy(client, u);
        const initialStatus = creatorCanProcessRp ? 'final_review' : 'waiting_manager';

        const requestedBy = req.body.requestedBy || snapshot.createdByUserName;
        const purchaseCategory = req.body.purchaseCategory || '';
        const description = req.body.description || '';
        const processedByDepartment = req.body.processedByDepartment || '';
        const requiredDate = req.body.requiredDate || null;
        const vendorSuggestion = req.body.vendorSuggestion || '';
        const receiverPic = req.body.receiverPic || '';

        if (!creatorCanProcessRp && !processedByDepartment) {
            await client.rollback();
            return res.status(400).json({
                success: false,
                error: 'processedByDepartment is required for non IT/HCGA requester',
            });
        }

        if (
            !creatorCanProcessRp &&
            !(await isAllowedRpProcessorDepartment(client, processedByDepartment))
        ) {
            await client.rollback();
            return res.status(400).json({
                success: false,
                error: `processedByDepartment is not allowed: ${processedByDepartment}`,
            });
        }

        const classId = req.body.classId || snapshot.departmentId;
        const className = req.body.className || snapshot.departmentName;
        const classClass = req.body.classClass || snapshot.departmentClass;
        const classCode = req.body.classCode || snapshot.departmentCode;

        if (req.body.rpId) {
            const rpId = req.body.rpId;

            const [existingRows] = await client.query(
                'SELECT id, rp_no FROM rp_request WHERE id = ? LIMIT 1',
                [rpId]
            );

            if (!existingRows.length) {
                await client.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'RP not found for revision',
                });
            }

            await client.query(`
                UPDATE rp_request SET
                    status = ?,

                    company_id = ?,
                    company_code = ?,
                    company_name = ?,

                    department_id = ?,
                    department_name = ?,
                    department_class = ?,
                    department_code = ?,

                    class_id = ?,
                    class_name = ?,
                    class_class = ?,
                    class_code = ?,

                    job_level_id = ?,
                    job_level_name = ?,
                    job_level_rank = ?,

                    requested_by = ?,
                    purchase_category = ?,
                    description = ?,
                    processed_by_department = ?,
                    required_date = ?,
                    vendor_suggestion = ?,
                    receiver_pic = ?,

                    created_by_user_id = ?,
                    created_by_user_name = ?
                WHERE id = ?
            `, [
                initialStatus,

                snapshot.companyId,
                snapshot.companyCode,
                snapshot.companyName,

                snapshot.departmentId,
                snapshot.departmentName,
                snapshot.departmentClass,
                snapshot.departmentCode,

                classId,
                className,
                classClass,
                classCode,

                snapshot.jobLevelId,
                snapshot.jobLevelName,
                snapshot.jobLevelRank,

                requestedBy,
                purchaseCategory,
                description,
                processedByDepartment,
                requiredDate,
                vendorSuggestion,
                receiverPic,

                snapshot.createdByUserId,
                snapshot.createdByUserName,

                rpId,
            ]);

            await replaceRpItems(client, rpId, items);

            await client.commit();

            return res.json({
                success: true,
                rpNo: existingRows[0].rp_no,
                id: rpId,
            });
        }

        const id = crypto.randomUUID();

        const deptCode = snapshot.departmentCode || 'RP';
        const prefix = `RP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;

        const [seqRows] = await client.query(
            'SELECT rp_no FROM rp_request WHERE rp_no LIKE ?',
            [`${prefix}%`]
        );

        const sequences = seqRows.map(r => parseInt(String(r.rp_no || '').split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        const rpNo = req.body.rpNo || `${prefix}${nextSeq.toString().padStart(5, '0')}`;

        await client.query(`
            INSERT INTO rp_request (
                id,
                rp_no,
                status,

                company_id,
                company_code,
                company_name,

                department_id,
                department_name,
                department_class,
                department_code,

                class_id,
                class_name,
                class_class,
                class_code,

                job_level_id,
                job_level_name,
                job_level_rank,

                requested_by,
                purchase_category,
                description,
                processed_by_department,
                required_date,
                vendor_suggestion,
                receiver_pic,

                created_at,
                created_by,
                created_by_user_id,
                created_by_user_name,

                manager_approved_by,
                manager_approved_at,
                process_changes,
                process_updated_by,
                process_updated_at,
                process_manager_approved_by,
                process_manager_approved_at,
                rejected_by,
                rejected_at,
                rejected_reason,
                rejected_stage
            ) VALUES (
                ?, ?, ?,

                ?, ?, ?,

                ?, ?, ?, ?,

                ?, ?, ?, ?,

                ?, ?, ?,

                ?, ?, ?, ?, ?, ?, ?,

                NOW(), ?, ?, ?,

                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
            )
        `, [
            id,
            rpNo,
            initialStatus,

            snapshot.companyId,
            snapshot.companyCode,
            snapshot.companyName,

            snapshot.departmentId,
            snapshot.departmentName,
            snapshot.departmentClass,
            snapshot.departmentCode,

            classId,
            className,
            classClass,
            classCode,

            snapshot.jobLevelId,
            snapshot.jobLevelName,
            snapshot.jobLevelRank,

            requestedBy,
            purchaseCategory,
            description,
            processedByDepartment,
            requiredDate,
            vendorSuggestion,
            receiverPic,

            snapshot.createdByUserName,
            snapshot.createdByUserId,
            snapshot.createdByUserName,
        ]);

        await replaceRpItems(client, id, items);

        await client.commit();

        res.json({ success: true, rpNo, id });
    } catch (e) {
        await client.rollback();
        console.error('Error saving RP:', e);

        res.status(e.statusCode || 500).json({
            success: false,
            error: e.message,
        });
    } finally {
        client.release();
    }
});

// ============================================================
// RP APPROVAL DATA
// ============================================================

router.get('/api/data/rp-approval', checkAuth, async (req, res) => {
    const u = req.session.user;
    const view = req.query.view || 'pending';
    let reqs = await fetchAllRpRequests();

    const isApprovedScope = r => u.role === 'administrator' || (
        sameCompanyName(r.companyName, u.selectedCompany) &&
        (r.divisi === u.selectedDivision || r.diprosesOleh === u.selectedDivision)
    );

    const pendingCount = reqs.filter(r => r.status === 'waiting_manager' && isRpInUserScope(r, u)).length;
    const processCount = reqs.filter(r => r.status === 'division_review' && isRpInUserScope(r, u, true)).length;
    const processApprovalCount = reqs.filter(r => r.status === 'final_approved' && isRpInUserScope(r, u, true)).length;
    const approvedCount = reqs.filter(r =>
        (r.status === 'approved' || r.status === 'REJECTED' || r.status === 'CREATED_FRP') &&
        isApprovedScope(r)
    ).length;

    if (view === 'approved') {
        reqs = reqs.filter(r => ['approved', 'REJECTED', 'CREATED_FRP'].includes(r.status));
        if (u.role !== 'administrator') reqs = reqs.filter(r => isApprovedScope(r));
    } else if (view === 'process') {
        reqs = reqs.filter(r => r.status === 'division_review');
        if (u.role !== 'administrator') reqs = reqs.filter(r => isRpInUserScope(r, u, true));
    } else if (view === 'process-approval') {
        reqs = reqs.filter(r => r.status === 'final_approved');
        if (u.role !== 'administrator') reqs = reqs.filter(r => isRpInUserScope(r, u, true));
    } else if (view === 'all') {
        if (u.role !== 'administrator') reqs = reqs.filter(r => isApprovedScope(r));
    } else {
        reqs = reqs.filter(r => r.status === 'waiting_manager');
        if (u.role !== 'administrator') reqs = reqs.filter(r => isRpInUserScope(r, u));
    }

    const canApprove = u.role === 'administrator' ||
        ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);

    res.json({
        requests: reqs,
        canApprove,
        view,
        counts: {
            pending: pendingCount,
            process: processCount,
            'process-approval': processApprovalCount,
            approved: approvedCount,
        },
        user: {
            fullName: u.fullName,
            role: u.role,
            selectedDivision: u.selectedDivision,
            selectedJobLevel: u.selectedJobLevel,
            allAssignments: u.allAssignments || [],
        },
    });
});

// ============================================================
// RP DETAIL & ACTIONS
// ============================================================

router.get('/api/rp/:id', checkAuth, async (req, res) => {
    try {
        const data = (await fetchAllRpRequests()).find(r => r.id === req.params.id);
        if (!data) return res.status(404).json({ error: 'Not found' });
        const user = req.session.user;
        const isAdmin = user.role === 'administrator';
        const canApprove = isAdmin || ['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel);
        const isProcessDivision = isAdmin || user.selectedDivision === data.diprosesOleh;
        const employees = await getAllEmployees();
        const [budgetsRows] = await db.query('SELECT id, company_id, departement_id, class, description, type, total_amount, budget_remaining FROM master_budgets');
        const budgetsData = budgetsRows.map(row => ({
            id: row.id,
            company_id: row.company_id,
            companyId: row.company_id,
            department_id: row.departement_id,
            departmentId: row.departement_id,
            class_id: row.class,
            classId: row.class,
            class: row.class,
            description: row.description,
            type: row.type,
            total_amount: row.total_amount,
            totalAmount: row.total_amount,
            budget_remaining: row.budget_remaining,
            sisa_budget: row.budget_remaining,
            sisaBudget: row.budget_remaining,
            remainingAmount: row.budget_remaining
        }));
        const [companiesData, departmentsData] = await Promise.all([
            getCompanies(),
            getDepartmentRows(),
        ]);
        const mappedBudgets = budgetsData.map(b => {
            const bCompanyId = b.company_id !== undefined ? b.company_id : b.companyId;
            const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
            const bClassId = b.class_id !== undefined ? b.class_id : b.classId;
            const bCompany = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
            const bDept = departmentsData.find(d => String(d.id) === String(bDepartmentId));
            const bClass = departmentsData.find(d => String(d.id) === String(bClassId));
            return {
                ...b,
                company: bCompany ? (bCompany.name || bCompany.code) : (b.company || 'PT PILAR NIAGA MAKMUR'),
                department: bDept ? bDept.name : (b.department || ''),
                class: bClass ? bClass.class : (b.class || ''),
            };
        });

        res.json({
            data,
            employees,
            vendors: readJson('vendors.json'),
            budgets: mappedBudgets,
            user,
            isAdmin,
            canApprove,
            isProcessDivision,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

function getUserDepartmentClass(user) {
    return String(
        user.departmentClass ||
        user.selectedDivision ||
        user.departmentName ||
        ''
    ).trim();
}

function isManagerLevel(user) {
    return Number(user.jobLevelRank || 0) >= 4;
}

function sameText(a, b) {
    return String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();
}

async function hasRpBudgetPolicy(client, user) {
    const departmentClass = getUserDepartmentClass(user);

    const [rows] = await client.query(`
        SELECT id
        FROM budget_access_policies
        WHERE module = 'RP'
          AND flow = 'CREATE'
          AND department_class = ?
          AND can_cross_department_budget = 1
          AND is_active = 1
        LIMIT 1
    `, [departmentClass]);

    return rows.length > 0;
}

async function getAllowedRpProcessorDepartments(client) {
    const [rows] = await client.query(`
        SELECT department_class
        FROM budget_access_policies
        WHERE module = 'RP'
          AND flow = 'PROCESS'
          AND is_active = 1
    `);

    return rows.map(row => String(row.department_class || '').trim().toUpperCase());
}

async function isAllowedRpProcessorDepartment(client, departmentClass) {
    const allowedDepartments = await getAllowedRpProcessorDepartments(client);
    return allowedDepartments.includes(String(departmentClass || '').trim().toUpperCase());
}

router.post('/api/rp/:id/:action', checkAuth, async (req, res) => {
    const client = await db.getConnection();

    try {
        await client.beginTransaction();

        const rpRequests = await fetchAllRpRequests();
        const rp = rpRequests.find(r => r.id === req.params.id);

        if (!rp) {
            await client.rollback();
            return res.status(404).json({
                success: false,
                error: 'RP not found',
            });
        }

        const action = req.params.action;
        const u = req.session.user;

        const isAdmin = u.role === 'administrator';
        const userDepartmentClass = getUserDepartmentClass(u);
        const userCanProcessRp = await hasRpBudgetPolicy(client, u);

        // ============================================================
        // AUTHORIZATION CHECKS
        // ============================================================

        if (!isAdmin && !sameCompanyName(rp.companyName, u.selectedCompany || u.companyName)) {
            await client.rollback();
            return res.status(403).json({
                success: false,
                error: 'Anda hanya dapat memproses data dari perusahaan Anda',
            });
        }

        // Step 2: manager department requester approval
        if (['manager-approve', 'manager-reject'].includes(action) && !isAdmin) {
            if (!isManagerLevel(u)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Hanya user level Manager ke atas yang dapat melakukan persetujuan ini',
                });
            }

            if (!sameText(userDepartmentClass, rp.departmentClass)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Anda hanya dapat menyetujui dokumen dari department Anda sendiri',
                });
            }
        }

        // Step 3: processor department check/edit/revert/reject
        if (['process-update', 'process-direct', 'process-revert', 'process-reject'].includes(action) && !isAdmin) {
            if (!userCanProcessRp) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Department Anda tidak memiliki akses untuk memproses RP',
                });
            }

            if (!sameText(userDepartmentClass, rp.processedByDepartment)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: `Anda hanya dapat memproses RP untuk department ${rp.processedByDepartment}`,
                });
            }
        }

        // Step 4: processor manager final approval/revert/reject
        if (['process-manager-approve', 'process-manager-revert', 'process-manager-reject'].includes(action) && !isAdmin) {
            if (!isManagerLevel(u)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Hanya user level Manager ke atas dari department pemroses yang dapat melakukan persetujuan final ini',
                });
            }

            if (!userCanProcessRp) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Department Anda tidak memiliki akses approval final RP',
                });
            }

            if (!sameText(userDepartmentClass, rp.processedByDepartment)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: `Anda hanya dapat menyetujui RP untuk department ${rp.processedByDepartment}`,
                });
            }
        }

        // ============================================================
        // ACTION HANDLERS
        // ============================================================

        if (action === 'manager-approve') {
            if (rp.status !== 'waiting_manager') {
                await client.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status for this action',
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'division_review',
                    manager_approved_by = ?,
                    manager_approved_at = NOW()
                WHERE id = ?
            `, [u.fullName, rp.id]);

        } else if (action === 'manager-reject') {
            if (rp.status !== 'waiting_manager') {
                await client.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status for this action',
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'REJECTED',
                    rejected_by = ?,
                    rejected_at = NOW(),
                    rejected_reason = ?,
                    rejected_stage = 'manager'
                WHERE id = ?
            `, [
                u.fullName,
                req.body.reason || '',
                rp.id,
            ]);

        } else if (action === 'process-update') {
            if (rp.status !== 'division_review') {
                await client.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status for this action',
                });
            }

            const changes = [];

            const headerFields = [
                'vendorSuggestion',
                'requiredDate',
                'receiverPic',
                'description',
            ];

            headerFields.forEach(field => {
                if (
                    req.body[field] !== undefined &&
                    String(req.body[field]) !== String(rp[field] || '')
                ) {
                    changes.push({
                        field,
                        oldValue: rp[field] || '',
                        newValue: req.body[field],
                    });
                }
            });

            const newItems = normalizeRpItems(req.body.items || rp.items || []);
            const oldItems = rp.items || [];

            newItems.forEach((newItem, i) => {
                const oldItem = oldItems[i] || {};

                ['memo', 'qty', 'price', 'amount', 'budgetId'].forEach(field => {
                    if (
                        newItem[field] !== undefined &&
                        String(newItem[field]) !== String(oldItem[field] || '')
                    ) {
                        changes.push({
                            field: `items[${i}].${field}`,
                            oldValue: oldItem[field] || '',
                            newValue: newItem[field],
                            itemIndex: i,
                        });
                    }
                });
            });

            if (req.body.items) {
                await validateRpBudgetAccess(client, u, newItems);
                await replaceRpItems(client, rp.id, newItems);
            }

            await client.query(`
                UPDATE rp_request
                SET
                    vendor_suggestion = ?,
                    required_date = ?,
                    receiver_pic = ?,
                    description = ?,
                    process_changes = ?,
                    process_updated_by = ?,
                    process_updated_at = NOW(),
                    status = 'final_review'
                WHERE id = ?
            `, [
                req.body.vendorSuggestion !== undefined ? req.body.vendorSuggestion : rp.vendorSuggestion,
                req.body.requiredDate !== undefined ? req.body.requiredDate : rp.requiredDate,
                req.body.receiverPic !== undefined ? req.body.receiverPic : rp.receiverPic,
                req.body.description !== undefined ? req.body.description : rp.description,
                JSON.stringify({
                    note: req.body.note || '',
                    changes,
                }),
                u.fullName,
                rp.id,
            ]);

        } else if (action === 'process-direct') {
            if (rp.status !== 'division_review') {
                await client.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status for this action',
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    process_updated_by = ?,
                    process_updated_at = NOW(),
                    process_changes = ?,
                    status = 'final_review'
                WHERE id = ?
            `, [
                u.fullName,
                JSON.stringify({
                    note: req.body.note || 'RP checked without changes',
                    changes: [],
                }),
                rp.id,
            ]);

        } else if (action === 'process-revert') {
            if (rp.status !== 'division_review') {
                await client.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status for this action',
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'waiting_manager',
                    manager_approved_by = NULL,
                    manager_approved_at = NULL,
                    process_changes = ?,
                    process_updated_by = ?,
                    process_updated_at = NOW()
                WHERE id = ?
            `, [
                JSON.stringify({
                    note: req.body.reason || 'Returned to requester department manager review',
                    revertedBy: u.fullName,
                    revertedFrom: 'division_review',
                }),
                u.fullName,
                rp.id,
            ]);

        } else if (action === 'process-reject') {
            if (rp.status !== 'division_review') {
                await client.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status for this action',
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'REJECTED',
                    rejected_by = ?,
                    rejected_at = NOW(),
                    rejected_reason = ?,
                    rejected_stage = 'process'
                WHERE id = ?
            `, [
                u.fullName,
                req.body.reason || '',
                rp.id,
            ]);

        } else if (action === 'process-manager-approve') {
            if (rp.status !== 'final_review') {
                await client.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status for this action',
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'approved',
                    process_manager_approved_by = ?,
                    process_manager_approved_at = NOW()
                WHERE id = ?
            `, [u.fullName, rp.id]);

        } else if (action === 'process-manager-revert') {
            if (rp.status !== 'final_review') {
                await client.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status for this action',
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'division_review',
                    process_manager_approved_by = NULL,
                    process_manager_approved_at = NULL,
                    process_changes = ?,
                    process_updated_by = ?,
                    process_updated_at = NOW()
                WHERE id = ?
            `, [
                JSON.stringify({
                    note: req.body.reason || 'Returned to processor review',
                    revertedBy: u.fullName,
                    revertedFrom: 'final_review',
                }),
                u.fullName,
                rp.id,
            ]);

        } else if (action === 'process-manager-reject') {
            if (rp.status !== 'final_review') {
                await client.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status for this action',
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'REJECTED',
                    rejected_by = ?,
                    rejected_at = NOW(),
                    rejected_reason = ?,
                    rejected_stage = 'process-manager'
                WHERE id = ?
            `, [
                u.fullName,
                req.body.reason || '',
                rp.id,
            ]);

        } else if (action === 'delete') {
            if (!isAdmin) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Hanya administrator yang dapat menghapus RP',
                });
            }

            await client.query('DELETE FROM rp_request WHERE id = ?', [rp.id]);

        } else {
            await client.rollback();
            return res.status(400).json({
                success: false,
                error: 'Unknown action',
            });
        }

        await client.commit();

        res.json({ success: true });
    } catch (e) {
        await client.rollback();
        console.error('Error processing RP action:', e);

        res.status(e.statusCode || 500).json({
            success: false,
            error: e.message,
        });
    } finally {
        client.release();
    }
});

module.exports = router;
