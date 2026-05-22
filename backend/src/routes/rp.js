const express = require('express');
const { checkAuth } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/json');
const { getAllEmployees, getCompanies, getDepartmentRows, getDeptCode, getCompanyId, getDeptId, fetchAllFrpRequests, fetchAllRpRequests } = require('../services/dbService');
const { sameCompanyName } = require('../utils/company');
const { isRpInUserScope } = require('../middleware/scope');
const db = require('../../db');

const router = express.Router();

async function updateRpRequest(rp) {
    const companyId = await getCompanyId(rp.companyName);
    const deptId = await getDeptId(rp.divisi, rp.companyName);
    const classId = await getDeptId(rp.class, rp.companyName);

    await db.query(`
        UPDATE rp_request SET 
            rp_no = ?, status = ?, company_id = ?, department_id = ?, class_id = ?, 
            dibuat_oleh = ?, kategori_pembelian = ?, deskripsi = ?, diproses_oleh = ?, 
            tanggal_dibutuhkan = ?, vendor_suggestion = ?, pic_penerima = ?, items = ?, 
            manager_approved_by = ?, manager_approved_at = ?, process_changes = ?, 
            process_updated_by = ?, process_updated_at = ?, process_manager_approved_by = ?, 
            process_manager_approved_at = ?, rejected_by = ?, rejected_at = ?, 
            rejected_reason = ?, rejected_stage = ?
        WHERE id = ?
    `, [
        rp.rpNo, rp.status, companyId, deptId, classId,
        rp.dibuatOleh, rp.kategoriPembelian, rp.deskripsi, rp.diprosesOleh,
        rp.tanggalDibutuhkan || null, rp.vendorSuggestion, rp.picPenerima, JSON.stringify(rp.items),
        rp.managerApprovedBy || null, rp.managerApprovedAt ? new Date(rp.managerApprovedAt) : null, JSON.stringify(rp.processChanges || []),
        rp.processUpdatedBy || null, rp.processUpdatedAt ? new Date(rp.processUpdatedAt) : null, rp.processManagerApprovedBy || null,
        rp.processManagerApprovedAt ? new Date(rp.processManagerApprovedAt) : null, rp.rejectedBy || null, rp.rejectedAt ? new Date(rp.rejectedAt) : null,
        rp.rejectedReason || null, rp.rejectedStage || null,
        rp.id
    ]);
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

        const budgetsData = readJson('budgets.json');
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
            const bCompany = companiesData.find(c => String(c.id) === String(b.companyId) || c.code === b.companyId);
            const bDept = departmentsData.find(d => String(d.id) === String(b.departmentId));
            const bClass = departmentsData.find(d => String(d.id) === String(b.classId));
            return {
                ...b,
                company: bCompany ? (bCompany.name || bCompany.code) : (b.company || 'PT PILAR NIAGA MAKMUR'),
                department: bDept ? bDept.name : (b.department || ''),
                class: bClass ? bClass.class : (b.class || ''),
                remainingAmount: (b.totalAmount || 0) - (usedBudgets[b.id] || 0),
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
    try {
        let rpRequests = await fetchAllRpRequests();
        const u = req.session.user;

        // Handle revision (update existing)
        if (req.body.rpId) {
            const idx = rpRequests.findIndex(r => r.id === req.body.rpId);
            if (idx === -1) return res.json({ success: false, error: 'RP not found for revision' });
            const updatedReq = {
                ...rpRequests[idx],
                ...req.body,
                id: rpRequests[idx].id,
                rpNo: rpRequests[idx].rpNo,
                status: 'waiting_manager',
            };
            delete updatedReq.rpId;
            rpRequests[idx] = updatedReq;
            await updateRpRequest(updatedReq);
            return res.json({ success: true, rpNo: rpRequests[idx].rpNo, id: rpRequests[idx].id });
        }

        // Handle new RP
        const id = 'rp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const companyName = req.body.companyName || u.selectedCompany || '';
        const divisi = req.body.divisi || u.selectedDivision || '';
        const reqClass = req.body.class || '';

        const newRp = {
            id,
            rpNo: req.body.rpNo || '',
            status: 'waiting_manager',
            companyName,
            divisi,
            class: reqClass,
            dibuatOleh: req.body.dibuatOleh || u.fullName,
            kategoriPembelian: req.body.kategoriPembelian || '',
            deskripsi: req.body.deskripsi || '',
            diprosesOleh: req.body.diprosesOleh || '',
            tanggalDibutuhkan: req.body.tanggalDibutuhkan || '',
            vendorSuggestion: req.body.vendorSuggestion || '',
            picPenerima: req.body.picPenerima || '',
            items: req.body.items || [],
            createdAt: new Date().toISOString(),
            createdBy: u.fullName,
        };
        rpRequests.push(newRp);
        

        // Insert into database
        const companyId = await getCompanyId(companyName);
        const deptId = await getDeptId(divisi, companyName);
        const classId = await getDeptId(reqClass, companyName);

        await db.query(`
            INSERT INTO \`frp_db\`.\`rp_request\` (
              \`id\`,
              \`rp_no\`,
              \`status\`,
              \`company_id\`,
              \`department_id\`,
              \`class_id\`,
              \`dibuat_oleh\`,
              \`kategori_pembelian\`,
              \`deskripsi\`,
              \`diproses_oleh\`,
              \`tanggal_dibutuhkan\`,
              \`vendor_suggestion\`,
              \`pic_penerima\`,
              \`items\`,
              \`created_at\`,
              \`created_by\`,
              \`manager_approved_by\`,
              \`manager_approved_at\`,
              \`process_changes\`,
              \`process_updated_by\`,
              \`process_updated_at\`,
              \`process_manager_approved_by\`,
              \`process_manager_approved_at\`
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL
            )
        `, [
            id,
            newRp.rpNo,
            newRp.status,
            companyId,
            deptId,
            classId,
            newRp.dibuatOleh,
            newRp.kategoriPembelian,
            newRp.deskripsi,
            newRp.diprosesOleh,
            newRp.tanggalDibutuhkan || null,
            newRp.vendorSuggestion,
            newRp.picPenerima,
            JSON.stringify(newRp.items),
            newRp.createdBy
        ]);

        res.json({ success: true, rpNo: newRp.rpNo, id: newRp.id });
    } catch (e) {
        console.error('Error saving RP:', e);
        res.json({ success: false, error: e.message });
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
        const budgetsData = readJson('budgets.json');
        const [companiesData, departmentsData] = await Promise.all([
            getCompanies(),
            getDepartmentRows(),
        ]);
        const mappedBudgets = budgetsData.map(b => {
            const bCompany = companiesData.find(c => String(c.id) === String(b.companyId) || c.code === b.companyId);
            const bDept = departmentsData.find(d => String(d.id) === String(b.departmentId));
            const bClass = departmentsData.find(d => String(d.id) === String(b.classId));
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

router.post('/api/rp/:id/:action', checkAuth, async (req, res) => {
    let rpRequests = await fetchAllRpRequests();
    const idx = rpRequests.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.json({ success: false, error: 'RP not found' });

    const action = req.params.action;
    const rp = rpRequests[idx];
    const u = req.session.user;
    const isAdmin = u.role === 'administrator';

    // --- Authorization Checks ---
    if (!isAdmin && !sameCompanyName(rp.companyName, u.selectedCompany)) {
        return res.json({ success: false, error: 'Anda hanya dapat memproses data dari perusahaan yang sedang dipilih' });
    }

    if (['manager-approve', 'manager-reject'].includes(action) && !isAdmin) {
        if (!['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel)) {
            return res.json({ success: false, error: 'Hanya Manager yang dapat melakukan persetujuan ini' });
        }
        if (u.selectedDivision !== rp.divisi) {
            return res.json({ success: false, error: 'Anda hanya dapat menyetujui dokumen dari divisi Anda sendiri' });
        }
    }

    if (['process-update', 'process-direct', 'process-reject'].includes(action) && !isAdmin) {
        const allowedDivisions = ['IT', 'HCGA', 'Product'];
        if (!allowedDivisions.includes(u.selectedDivision)) {
            return res.json({ success: false, error: 'Hanya divisi IT, HCGA, dan Product yang dapat memproses data ini' });
        }
        if (u.selectedDivision !== rp.diprosesOleh) {
            return res.json({ success: false, error: `Anda hanya dapat memproses data untuk divisi ${rp.diprosesOleh}` });
        }
    }

    if (['process-manager-approve', 'process-manager-reject'].includes(action) && !isAdmin) {
        const allowedDivisions = ['IT', 'HCGA', 'Product'];
        if (!['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel)) {
            return res.json({ success: false, error: 'Hanya Manager dari divisi pemroses yang dapat melakukan persetujuan final ini' });
        }
        if (!allowedDivisions.includes(u.selectedDivision)) {
            return res.json({ success: false, error: 'Hanya divisi IT, HCGA, dan Product yang dapat menyetujui data ini' });
        }
        if (u.selectedDivision !== rp.diprosesOleh) {
            return res.json({ success: false, error: `Anda hanya dapat menyetujui data untuk divisi ${rp.diprosesOleh}` });
        }
    }

    // --- Action Handlers ---
    if (action === 'manager-approve') {
        if (rp.status !== 'waiting_manager') return res.json({ success: false, error: 'Invalid status for this action' });
        rp.status = 'division_review';
        rp.managerApprovedBy = u.fullName;
        rp.managerApprovedAt = new Date().toISOString();

    } else if (action === 'manager-reject') {
        if (rp.status !== 'waiting_manager') return res.json({ success: false, error: 'Invalid status' });
        rp.status = 'REJECTED';
        rp.rejectedBy = u.fullName;
        rp.rejectedAt = new Date().toISOString();
        rp.rejectedReason = req.body.reason || '';
        rp.rejectedStage = 'manager';

    } else if (action === 'process-update') {
        if (rp.status !== 'division_review') return res.json({ success: false, error: 'Invalid status' });
        const headerFields = ['vendorSuggestion', 'tanggalDibutuhkan', 'picPenerima', 'deskripsi'];
        const changes = [];
        headerFields.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== rp[field]) {
                changes.push({ field, oldValue: rp[field], newValue: req.body[field] });
            }
        });
        const newItems = req.body.items || rp.items;
        const oldItems = rp.items || [];
        newItems.forEach((newItem, i) => {
            const oldItem = oldItems[i] || {};
            ['memo', 'linkPembelian', 'qty', 'estimatedValue', 'budgetId'].forEach(field => {
                if (newItem[field] !== undefined && String(newItem[field]) !== String(oldItem[field] || '')) {
                    changes.push({ field: `items[${i}].${field}`, oldValue: oldItem[field] || '', newValue: newItem[field], itemIndex: i });
                }
            });
        });
        headerFields.forEach(field => { if (req.body[field] !== undefined) rp[field] = req.body[field]; });
        if (req.body.items) rp.items = req.body.items;
        rp.processChanges = changes;
        rp.processUpdatedBy = u.fullName;
        rp.processUpdatedAt = new Date().toISOString();
        rp.status = 'final_approved';

    } else if (action === 'process-direct') {
        if (rp.status !== 'division_review') return res.json({ success: false, error: 'Invalid status' });
        rp.processUpdatedBy = u.fullName;
        rp.processUpdatedAt = new Date().toISOString();
        rp.processChanges = [];
        rp.status = 'final_approved';

    } else if (action === 'process-reject') {
        if (rp.status !== 'division_review') return res.json({ success: false, error: 'Invalid status' });
        rp.status = 'REJECTED';
        rp.rejectedBy = u.fullName;
        rp.rejectedAt = new Date().toISOString();
        rp.rejectedReason = req.body.reason || '';
        rp.rejectedStage = 'process';

    } else if (action === 'process-manager-approve') {
        if (rp.status !== 'final_approved') return res.json({ success: false, error: 'Invalid status' });
        rp.status = 'approved';
        rp.processManagerApprovedBy = u.fullName;
        rp.processManagerApprovedAt = new Date().toISOString();

    } else if (action === 'process-manager-reject') {
        if (rp.status !== 'final_approved') return res.json({ success: false, error: 'Invalid status' });
        rp.status = 'REJECTED';
        rp.rejectedBy = u.fullName;
        rp.rejectedAt = new Date().toISOString();
        rp.rejectedReason = req.body.reason || '';
        rp.rejectedStage = 'process-manager';

    } else if (action === 'delete') {
        await db.query('DELETE FROM rp_request WHERE id = ?', [rp.id]);

    } else if (action === 'revert') {
        if (u.role !== 'administrator') {
            return res.status(403).json({ success: false, error: 'Hanya administrator' });
        }
        rp.status = 'waiting_manager';
        ['managerApprovedBy', 'managerApprovedAt', 'processUpdatedBy', 'processUpdatedAt',
         'processChanges', 'processManagerApprovedBy', 'processManagerApprovedAt',
         'rejectedBy', 'rejectedAt', 'rejectedReason', 'rejectedStage'].forEach(k => delete rp[k]);

    } else {
        return res.json({ success: false, error: 'Unknown action' });
    }

    rpRequests[idx] = rp;
    if (action !== 'delete') await updateRpRequest(rp);
    res.json({ success: true });
});

module.exports = router;
