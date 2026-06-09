const express = require('express');
const db = require('../../db');
const { centralDb } = require('../../db');
const crypto = require('crypto');
const { checkAuth } = require('../middleware/auth');
const { USER_SQL } = require('../config/constants');
const { readJson, writeJson } = require('../utils/json');
const {
    getAllEmployees,
    getCompanies,
    getDepartmentRows,
    getDeptCode,
    getCompanyId,
    getDeptId,
    dbRowsToEmployees,
    getDepartmentEmployeesByUserId,
    fetchAllFrpRequests,
} = require('../services/dbService');
const { normalizeCompanyCode } = require('../utils/company');

const { bucket } = require('../config/storage');
const { upload } = require('../middleware/upload');
const path = require('path');

const router = express.Router();

// ============================================================
// MAIN APP PAGES
// ============================================================

router.get('/', checkAuth, (req, res) => res.sendSPA());
router.get('/frp', checkAuth, (req, res) => res.sendSPA());
router.get('/frp/:id', checkAuth, (req, res) => res.sendSPA());

// ============================================================
// FORM DATA
// ============================================================

router.get('/api/form-data', checkAuth, async (req, res) => {
    try {
        const u = req.session.user;
        const [employees, departmentEmployees, budgetsData, companiesData, vendorsData, departments] = await Promise.all([
            getAllEmployees(),
            getDepartmentEmployeesByUserId(u.id),
            db.query('SELECT id, department_id, department_name, department_class, department_code, project_name, budget_type, budget_amount, budget_used, budget_remaining FROM master_budgets').then(([r]) => r.map(row => ({
                id: row.id,
                company_id: null,
                companyId: null,
                department_id: row.department_id,
                departmentId: row.department_id,
                class: row.department_class,
                description: row.project_name,
                type: row.budget_type,
                total_amount: Number(row.budget_amount || 0),
                totalAmount: Number(row.budget_amount || 0),
                budget_remaining: Number(row.budget_remaining || 0),
                sisa_budget: Number(row.budget_remaining || 0),
                sisaBudget: Number(row.budget_remaining || 0),
                remainingAmount: Number(row.budget_remaining || 0)
            }))),
            getCompanies(),
            Promise.resolve(readJson('vendors.json')),
            getDepartmentRows(),
        ]);
        const requests = await fetchAllFrpRequests();

        // Calculate used budget amounts from approved FRP requests
        const usedBudgets = {};
        requests.forEach(r => {
            if (r.status === 'APPROVED' && r.items) {
                r.items.forEach(item => {
                    const bId = item.budgetId;
                    const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                    usedBudgets[bId] = (usedBudgets[bId] || 0) + amt;
                });
            }
        });

        const budgetsWithRemaining = budgetsData.map(b => {
            const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
            const dept = departments.find(d => String(d.id) === String(bDepartmentId));
            const bCompanyId = b.company_id || b.companyId || (dept ? dept.companyId : null);
            const comp = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
            const classDept = departments.find(d => String(d.id) === String(b.class) || d.class === b.class);
            const dynamicRemaining = (b.total_amount !== undefined ? b.total_amount : (b.totalAmount || 0)) - (usedBudgets[b.id] || 0);
            return {
                ...b,
                company_id: bCompanyId,
                companyId: bCompanyId,
                company: comp ? comp.name : (b.company || 'PT PILAR NIAGA MAKMUR'),
                department: dept ? dept.name : (b.department || ''),
                class: classDept ? classDept.class : b.class,
                remainingAmount: dynamicRemaining,
                sisa_budget: dynamicRemaining,
                sisaBudget: dynamicRemaining,
            };
        });

        let editData = null;
        if (req.query.revisi) {
            editData = requests.find(r => r.id === req.query.revisi);
        }

        const divisionList = [...new Set(departments.map(r => r.name))].sort();

        res.json({
            employees,
            departmentEmployees,
            budgets: budgetsWithRemaining,
            companies: companiesData,
            vendors: vendorsData,
            departments,
            divisionList,
            editData,
            user: {
                ...u,
                selectedCompany: u.selectedCompany || '',
                selectedDivision: u.selectedDivision || '',
                selectedJobLevel: u.selectedJobLevel || '',
            },
            selectedCompany: u.selectedCompany || '',
            selectedDivision: u.selectedDivision || '',
            selectedJobLevel: u.selectedJobLevel || '',
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// LOOKUP ENDPOINTS
// ============================================================

router.get('/api/company', checkAuth, async (req, res) => {
    try {
        const companiesData = await getCompanies();
        res.json(companiesData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/user/departement', checkAuth, async (req, res) => {
    try {
        const u = req.session.user;
        const departmentEmployees = await getDepartmentEmployeesByUserId(u.id);
        res.json(departmentEmployees);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/vendors', checkAuth, async (req, res) => {
    try {
        const vendorsData = readJson('vendors.json');
        res.json(vendorsData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/budgets/all', checkAuth, async (req, res) => {
    try {
        const [budgetsRows] = await db.query('SELECT id, department_id, department_name, department_class, department_code, project_name, budget_type, budget_amount, budget_used, budget_remaining FROM master_budgets');
        const budgetsData = budgetsRows.map(row => ({
            id: row.id,
            company_id: null,
            companyId: null,
            department_id: row.department_id,
            departmentId: row.department_id,
            class: row.department_class,
            description: row.project_name,
            type: row.budget_type,
            total_amount: Number(row.budget_amount || 0),
            totalAmount: Number(row.budget_amount || 0),
            budget_remaining: Number(row.budget_remaining || 0),
            sisa_budget: Number(row.budget_remaining || 0),
            sisaBudget: Number(row.budget_remaining || 0),
            remainingAmount: Number(row.budget_remaining || 0)
        }));
        const requests = await fetchAllFrpRequests();
        const [companiesData, departments] = await Promise.all([
            getCompanies(),
            getDepartmentRows(),
        ]);
        const usedBudgets = {};
        requests.forEach(r => {
            if (r.status === 'APPROVED' && r.items) {
                r.items.forEach(item => {
                    const bId = item.budgetId;
                    const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                    usedBudgets[bId] = (usedBudgets[bId] || 0) + amt;
                });
            }
        });
        const budgetsWithRemaining = budgetsData.map(b => {
            const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
            const dept = departments.find(d => String(d.id) === String(bDepartmentId));
            const bCompanyId = b.company_id || b.companyId || (dept ? dept.companyId : null);
            const comp = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
            const classDept = departments.find(d => String(d.id) === String(b.class) || d.class === b.class);
            const dynamicRemaining = (b.total_amount !== undefined ? b.total_amount : (b.totalAmount || 0)) - (usedBudgets[b.id] || 0);
            return {
                ...b,
                company_id: bCompanyId,
                companyId: bCompanyId,
                company: comp ? comp.name : (b.company || 'PT PILAR NIAGA MAKMUR'),
                department: dept ? dept.name : (b.department || ''),
                class: classDept ? classDept.class : b.class,
                remainingAmount: dynamicRemaining,
                sisa_budget: dynamicRemaining,
                sisaBudget: dynamicRemaining,
            };
        });
        res.json(budgetsWithRemaining);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/employees', checkAuth, async (req, res) => {
    try {
        const employees = await getAllEmployees();
        res.json(employees);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/user/info', checkAuth, (req, res) => {
    const u = req.session.user;
    res.json({
        ...u,
        selectedCompany: u.selectedCompany || '',
        selectedDivision: u.selectedDivision || '',
        selectedJobLevel: u.selectedJobLevel || '',
    });
});

router.get('/api/departments/all', checkAuth, async (req, res) => {
    try {
        const departments = await getDepartmentRows();
        res.json(departments);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/employees/:department', checkAuth, async (req, res) => {
    try {
        const dept = req.params.department;
        const company = req.query.company;
        const params = [dept];
        let sql = USER_SQL + ' AND md.name = ?';
        if (company) {
            sql += ' AND mc.code = ?';
            params.push(normalizeCompanyCode(company));
        }
        sql += ' ORDER BY cu.name';
        const [rows] = await db.query(sql, params);
        res.json(dbRowsToEmployees(rows));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/budgets/:department', checkAuth, async (req, res) => {
    try {
        const [budgetsRows] = await db.query('SELECT id, department_id, department_name, department_class, department_code, project_name, budget_type, budget_amount, budget_used, budget_remaining FROM master_budgets');
        const budgetsData = budgetsRows.map(row => ({
            id: row.id,
            company_id: null,
            companyId: null,
            department_id: row.department_id,
            departmentId: row.department_id,
            class: row.department_class,
            description: row.project_name,
            type: row.budget_type,
            total_amount: Number(row.budget_amount || 0),
            totalAmount: Number(row.budget_amount || 0),
            budget_remaining: Number(row.budget_remaining || 0),
            sisa_budget: Number(row.budget_remaining || 0),
            sisaBudget: Number(row.budget_remaining || 0),
            remainingAmount: Number(row.budget_remaining || 0)
        }));
        const requests = await fetchAllFrpRequests();
        const [companiesData, departments] = await Promise.all([
            getCompanies(),
            getDepartmentRows(),
        ]);
        const usedBudgets = {};
        requests.forEach(r => {
            if (r.status === 'APPROVED' && r.items) {
                r.items.forEach(item => {
                    const bId = item.budgetId;
                    const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                    usedBudgets[bId] = (usedBudgets[bId] || 0) + amt;
                });
            }
        });
        const filtered = budgetsData
            .map(b => {
                const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
                const dept = departments.find(d => String(d.id) === String(bDepartmentId));
                const bCompanyId = b.company_id || b.companyId || (dept ? dept.companyId : null);
                const comp = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
                const classDept = departments.find(d => String(d.id) === String(b.class) || d.class === b.class);
                return {
                    ...b,
                    company_id: bCompanyId,
                    companyId: bCompanyId,
                    company: comp ? comp.name : (b.company || 'PT PILAR NIAGA MAKMUR'),
                    department: dept ? dept.name : (b.department || ''),
                    class: classDept ? classDept.class : b.class,
                };
            })
            .filter(b => (b.department || '').toLowerCase() === req.params.department.toLowerCase())
            .map(b => {
                const dynamicRemaining = (b.total_amount !== undefined ? b.total_amount : (b.totalAmount || 0)) - (usedBudgets[b.id] || 0);
                return {
                    ...b,
                    remainingAmount: dynamicRemaining,
                    sisa_budget: dynamicRemaining,
                    sisaBudget: dynamicRemaining,
                };
            });
        res.json(filtered);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/departments', checkAuth, async (req, res) => {
    try {
        const company = req.query.company;
        const full = req.query.full === '1';
        const departments = await getDepartmentRows();
        const { sameCompanyName } = require('../utils/company');
        const filtered = company ? departments.filter(d => sameCompanyName(d.company, company)) : departments;

        if (full) {
            const seen = new Set();
            const result = [];
            for (const d of filtered) {
                const key = `${d.class}||${d.name}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    result.push({ name: d.name, class: d.class, code: d.kodeFrp });
                }
            }
            return res.json(result.sort((a, b) => a.name.localeCompare(b.name)));
        }

        res.json([...new Set(filtered.map(r => r.name))].sort());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/job-levels', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, level FROM master_job_levels ORDER BY level ASC');
        res.json(rows.map(r => ({ id: r.id, name: r.name, level: r.level })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/managers/:department', checkAuth, async (req, res) => {
    try {
        const dept = req.params.department;
        const company = req.query.company;
        const params = [dept];
        let sql = USER_SQL + ' AND md.name = ? AND mjl.level >= 4';
        if (company) {
            sql += ' AND mc.code = ?';
            params.push(normalizeCompanyCode(company));
        }
        sql += ' ORDER BY cu.name';
        const [rows] = await db.query(sql, params);
        res.json(dbRowsToEmployees(rows));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// EXCHANGE RATE
// ============================================================

const https = require('https');

function getExchangeRateFromGoogle(from, to = 'IDR') {
    return new Promise((resolve, reject) => {
        const url = `https://www.google.com/finance/quote/${from}-${to}`;

        function fetchUrl(currentUrl, depth) {
            if (depth > 5) return reject(new Error('Too many redirects'));
            https.get(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let nextUrl = res.headers.location;
                    if (!nextUrl.startsWith('http')) nextUrl = new URL(nextUrl, currentUrl).href;
                    return fetchUrl(nextUrl, depth + 1);
                }
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const pattern = new RegExp(`"${from}\\s*\\/\\s*${to}",\\s*\\d+\\s*,\\s*null\\s*,\\s*\\[\\s*([\\d.]+)`);
                        const match = data.match(pattern);
                        if (match) return resolve(parseFloat(match[1]));

                        const matchClass = data.match(/class="YMlKec fxfa3d"[^>]*>([\d,.]+)</);
                        if (matchClass) return resolve(parseFloat(matchClass[1].replace(/,/g, '')));

                        reject(new Error(`Nilai kurs ${from}/${to} tidak ditemukan di Google Finance`));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        }

        fetchUrl(url, 0);
    });
}

router.get('/api/kurs/:currency', checkAuth, async (req, res) => {
    try {
        const from = (req.params.currency || '').trim().toUpperCase();
        if (from === 'IDR') return res.json({ success: true, rate: 1 });
        const rate = await getExchangeRateFromGoogle(from, 'IDR');
        res.json({ success: true, rate });
    } catch (e) {
        console.error(`[API Kurs] Error fetching ${req.params.currency}:`, e.message);
        res.json({ success: false, error: e.message });
    }
});

// ============================================================
// FRP NUMBER
// ============================================================

router.get('/api/next-frp-number/:department', checkAuth, async (req, res) => {
    try {
        const dept = (req.params.department || '').trim().toUpperCase();
        const deptCode = await getDeptCode(dept, req.query.company || req.session.user.selectedCompany);
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        
        const [seqRows] = await db.query(`SELECT frp_no FROM frp_request WHERE frp_no LIKE ?`, [`${prefix}%`]);
        const sequences = seqRows.map(r => parseInt(r.frp_no.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        res.json({ frpNo: `${prefix}${nextSeq.toString().padStart(5, '0')}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// FRP APPROVAL VIEWS
// ============================================================

router.get('/approval', checkAuth, (req, res) => res.sendSPA());
router.get('/approved', checkAuth, (req, res) => res.sendSPA());
router.get('/status_frp', checkAuth, (req, res) => res.sendSPA());

router.get('/api/data/approval', checkAuth, async (req, res) => {
    const u = req.session.user;
    const { isRequestInUserScope } = require('../middleware/scope');
    const isApprovedView = req.query.view === 'approved';
    const isAllView = req.query.view === 'all';

    const hasLookAccess = await canLookAllFrp(u);

    let reqs = await fetchAllFrpRequests();

    const pendingCount = reqs.filter(r => r.status === 'PENDING' && (hasLookAccess || isRequestInUserScope(r, u))).length;
    const approvedCount = reqs.filter(r =>
        (r.status === 'APPROVED' || r.status === 'REJECTED') &&
        (hasLookAccess || isRequestInUserScope(r, u))
    ).length;

    if (!isAllView) {
        reqs = isApprovedView
            ? reqs.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED')
            : reqs.filter(r => r.status === 'PENDING');
    }

    if (!hasLookAccess) {
        reqs = reqs.filter(r => isRequestInUserScope(r, u));
    }

    const canApprove = u.role === 'administrator' ||
        Number(u.jobLevelRank || 0) >= 4 ||
        ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);

    res.json({
        requests: reqs.map(r => enrichReqWithRevert(r, u)), // pakai helper
        canApprove,
        isApprovedView,
        counts: { pending: pendingCount, approved: approvedCount },
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
// FRP CRUD
// ============================================================

router.post('/api/frp/:id/attachment', checkAuth, (req, res, next) => {
    upload.single('attachment')(req, res, function (err) {
        if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'File tidak ditemukan' });
        }

        const frpId = req.params.id;

        const [frpRows] = await db.query(
            'SELECT frp_no FROM frp_request WHERE id = ?',
            [frpId]
        );

        if (!frpRows.length) {
            return res.status(404).json({ success: false, error: 'FRP tidak ditemukan' });
        }

        const frpNo = frpRows[0].frp_no.replace(/\//g, '-'); // sanitize kalau ada slash
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filename = `frp/${year}/${month}/${frpNo}${ext}`;

        const blob = bucket.file(filename);
        await blob.save(req.file.buffer, {
            contentType: req.file.mimetype,
            resumable: false,
        });

        // Simpan public URL ke DB
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        await db.query(
            'UPDATE frp_request SET attachment_link = ? WHERE id = ?',
            [publicUrl, frpId]
        );

        res.json({ success: true, path: publicUrl });
    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.delete('/api/frp/:id/attachment', checkAuth, async (req, res) => {
    try {
        const frpId = req.params.id;

        const [rows] = await db.query(
            'SELECT attachment_link FROM frp_request WHERE id = ?',
            [frpId]
        );

        if (!rows.length || !rows[0].attachment_link) {
            return res.status(404).json({ success: false, error: 'File tidak ditemukan' });
        }

        let filenameToDelete = rows[0].attachment_link;
        const bucketPrefix = `https://storage.googleapis.com/${bucket.name}/`;
        if (filenameToDelete.startsWith(bucketPrefix)) {
            filenameToDelete = filenameToDelete.substring(bucketPrefix.length);
        }

        await bucket.file(filenameToDelete).delete();

        await db.query(
            'UPDATE frp_request SET attachment_link = NULL WHERE id = ?',
            [frpId]
        );

        res.json({ success: true });
    } catch (e) {
        console.error('Delete error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/api/frp/:id/attachment', checkAuth, async (req, res) => {
    try {
        const frpId = req.params.id;

        const [rows] = await db.query(
            'SELECT attachment_link FROM frp_request WHERE id = ?',
            [frpId]
        );

        if (!rows.length || !rows[0].attachment_link) {
            return res.status(404).json({ success: false, error: 'File tidak ditemukan' });
        }

        let attachmentLink = rows[0].attachment_link;
        const bucketPrefix = `https://storage.googleapis.com/${bucket.name}/`;

        if (attachmentLink.startsWith(bucketPrefix)) {
            // File in our private GCP bucket
            attachmentLink = attachmentLink.substring(bucketPrefix.length);
        } else if (attachmentLink.startsWith('http')) {
            // External link (e.g. Google Drive)
            return res.redirect(attachmentLink);
        }

        const [signedUrl] = await bucket.file(attachmentLink).getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 menit
            responseDisposition: 'inline',
        });

        const ext = path.extname(attachmentLink).toLowerCase();
        const officeExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
        if (officeExts.includes(ext)) {
            return res.redirect(`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}`);
        }

        res.redirect(signedUrl);
    } catch (e) {
        console.error('Get attachment error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});


router.get('/api/frp/:id', checkAuth, async (req, res) => {
    try {
        const data = (await fetchAllFrpRequests()).find(r => r.id === req.params.id);
        if (!data) return res.status(404).json({ error: 'Not found' });
        const user = req.session.user;
        const isIT = user.role === 'administrator' || user.selectedDivision === 'IT';
        const canApprove = isIT || ['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel);
        const [employees, companies] = await Promise.all([getAllEmployees(), getCompanies()]);
        res.json({ data, employees, companies, user, isIT, canApprove, canEdit: isIT });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

function getFrpSnapshotFromUser(user) {
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

function normalizeFrpItems(items = []) {
    return Array.isArray(items)
        ? items.map(item => ({
            id: item.id || crypto.randomUUID(),
            budgetId: item.budgetId || item.budget_id || null,
            memo: item.memo || '',
            qty: Number(item.qty || 0),
            price: Number(item.price || item.hargaSatuan || 0),
            amount: Number(item.amount || 0),
        }))
        : [];
}

async function replaceFrpItems(client, frpRequestId, items) {
    await client.query(
        'DELETE FROM items_frp WHERE frp_request_id = ?',
        [frpRequestId]
    );

    for (const item of items) {
        await client.query(`
            INSERT INTO items_frp (
                id,
                frp_request_id,
                budget_id,
                memo,
                qty,
                price,
                amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            item.id,
            frpRequestId,
            item.budgetId,
            item.memo,
            item.qty,
            item.price,
            item.amount,
        ]);
    }
}

async function adjustBudgetUsage(client, items, direction = 'deduct') {
    const multiplier = direction === 'revert' ? -1 : 1;

    for (const item of items) {
        if (!item.budgetId) continue;

        const amount = Number(item.amount || 0) * multiplier;

        await client.query(`
            UPDATE master_budgets
            SET 
                budget_used = budget_used + ?,
                budget_remaining = budget_remaining - ?
            WHERE id = ?
        `, [
            amount,
            amount,
            item.budgetId,
        ]);
    }
}

// Cek apakah user boleh lihat semua FRP lintas divisi
async function canLookAllFrp(user) {
    if (user.role === 'administrator') return true;
    if (Number(user.jobLevelRank || 0) >= 4) return true;

    const departmentClass = String(
        user.departmentClass ||
        user.selectedDivision ||
        ''
    ).trim();

    const [rows] = await db.query(`
        SELECT 1 FROM budget_access_policies
        WHERE module = 'FRP'
          AND flow = 'LOOK'
          AND department_class = ?
          AND is_active = 1
        LIMIT 1
    `, [departmentClass]);

    return rows.length > 0;
}

// Tambahkan flag canRevert ke tiap request
function enrichReqWithRevert(r, u) {
    const isIT = u.selectedDivision === 'IT';
    // support kedua format
    const frpDeptClass = r.department_class || r.departmentClass || '';
    const isOwnDivision = u.selectedDivision === frpDeptClass;

    return {
        ...r,
        canRevert:
            u.role === 'administrator' ||
            isIT ||
            (Number(u.jobLevelRank || 0) >= 3 && isOwnDivision),
    };
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
            module,
            flow,
            department_id,
            department_name,
            department_class,
            department_code,
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

async function validateFrpBudgetAccess(client, user, items) {
    const policy = await getBudgetAccessPolicy(client, 'FRP', user);

    if (!policy.requiresBudgetCheck) {
        return;
    }

    const budgetIds = [...new Set(
        items
            .map(item => item.budgetId)
            .filter(Boolean)
    )];

    if (!budgetIds.length) {
        return;
    }

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

    if (!policy.canCrossDepartmentBudget && user.role !== 'administrator') {
        const uClass = String(user.departmentClass || user.selectedDivision || '').trim().toUpperCase();
        const uName = String(user.departmentName || '').trim().toUpperCase();
        const uId = String(user.departmentId || '');

        const invalidBudgets = budgets.filter(b => {
            const bClass = String(b.department_class || '').trim().toUpperCase();
            const bName = String(b.department_name || '').trim().toUpperCase();
            const bId = String(b.department_id || '');

            if (uClass && (bClass === uClass || bName === uClass)) return false;
            if (uName && (bClass === uName || bName === uName)) return false;
            if (uId && bId && uId === bId) return false;
            
            return true;
        });

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

router.post('/api/frp/save', checkAuth, async (req, res) => {
    const client = await db.getConnection();

    try {
        await client.beginTransaction();

        const u = req.session.user;
        const snapshot = getFrpSnapshotFromUser(u);
        const items = normalizeFrpItems(req.body.items || []);

        await validateFrpBudgetAccess(client, u, items);

        if (!snapshot.companyId || !snapshot.departmentId) {
            await client.rollback();
            return res.status(400).json({
                success: false,
                error: 'User company or department snapshot is missing from auth session',
            });
        }

        // Fetch old items if it is an update/revision, needed for budget validation and update
        let oldItems = [];
        if (req.body.frpId) {
            const frpId = req.body.frpId;
            const [oldItemRows] = await client.query(`
                SELECT id, budget_id, memo, qty, price, amount
                FROM items_frp
                WHERE frp_request_id = ?
            `, [frpId]);

            oldItems = oldItemRows.map(item => ({
                id: item.id,
                budgetId: item.budget_id,
                memo: item.memo || '',
                qty: Number(item.qty || 0),
                price: Number(item.price || 0),
                amount: Number(item.amount || 0),
            }));
        }

        // Validate budgets before deducting/saving
        const kurs = parseFloat(req.body.exchangeRate) || parseFloat(req.body.kurs) || 1;
        for (const item of (req.body.items || [])) {
            if (item.budgetId) {
                const reqAmount = parseFloat(item.amount) || 0;
                const price = parseFloat(item.price) || parseFloat(item.hargaSatuan) || 0;
                const unitPriceIdr = price * kurs;

                // Find if this budgetId was used in old items of the same FRP
                let revertedAmount = 0;
                if (req.body.frpId) {
                    const matchedOld = oldItems.filter(oi => oi.budgetId === item.budgetId);
                    revertedAmount = matchedOld.reduce((sum, oi) => sum + (parseFloat(oi.amount) || 0), 0);
                }

                // Query current budget_remaining from database
                const [bRows] = await db.query('SELECT budget_remaining FROM master_budgets WHERE id = ?', [item.budgetId]);
                if (bRows.length) {
                    const currentRemaining = parseFloat(bRows[0].budget_remaining) || 0;
                    const availableBudget = currentRemaining + revertedAmount;

                    if (unitPriceIdr > availableBudget) {
                        return res.json({
                            success: false,
                            error: `Harga Satuan untuk budget ${item.budgetId} (Rp ${new Intl.NumberFormat('id-ID').format(unitPriceIdr)}) melebihi batas budget yang tersedia (Rp ${new Intl.NumberFormat('id-ID').format(availableBudget)}).`
                        });
                    }

                    if (reqAmount > availableBudget) {
                        return res.json({
                            success: false,
                            error: `Total Amount untuk budget ${item.budgetId} (Rp ${new Intl.NumberFormat('id-ID').format(reqAmount)}) melebihi sisa budget yang tersedia (Rp ${new Intl.NumberFormat('id-ID').format(availableBudget)}).`
                        });
                    }
                }
            }
        }

        // Handle update / revision
        if (req.body.frpId) {
            const frpId = req.body.frpId;

            await client.query(`
                UPDATE frp_request SET
                    company_id = ?,
                    company_code = ?,
                    company_name = ?,

                    frp_date = ?,

                    department_id = ?,
                    department_name = ?,
                    department_class = ?,
                    department_code = ?,

                    job_level_name = ?,
                    job_level_rank = ?,

                    requested_by = ?,

                    currency = ?,
                    kurs = ?,
                    frp_description = ?,
                    vendor = ?,
                    internal_po_number = ?,
                    ext_doc_type = ?,
                    ext_doc_number = ?,
                    payment_method = ?,
                    payment_date = ?,
                    destination_bank = ?,
                    destination_bank_account = ?,
                    check_docs = ?,

                    created_by_user_id = ?,
                    created_by_user_name = ?,

                    status = 'PENDING'
                WHERE id = ?
            `, [
                snapshot.companyId,
                snapshot.companyCode,
                snapshot.companyName,

                req.body.frpDate || req.body.tanggalFrp || null,

                snapshot.departmentId,
                snapshot.departmentName,
                snapshot.departmentClass,
                snapshot.departmentCode,

                
                snapshot.jobLevelName,
                snapshot.jobLevelRank,

                snapshot.createdByUserName,

                req.body.currency || 'IDR',
                req.body.exchangeRate || req.body.kurs || '1',
                req.body.frpDescription || req.body.keteranganFrp || '',
                req.body.vendor || '',
                req.body.internalPoNumber || '',
                req.body.externalDocumentType || req.body.extDocType || '',
                req.body.externalDocumentNumber || req.body.extDocNumber || '',
                req.body.paymentMethod || 'Transfer',
                req.body.paymentDate || req.body.payment_date || null,
                req.body.destinationBank || req.body.bankTujuan || '',
                req.body.destinationBankAccount || req.body.rekBankTujuan || '',
                JSON.stringify(req.body.checkDocs || []),

                snapshot.createdByUserId,
                snapshot.createdByUserName,

                frpId,
            ]);

            await adjustBudgetUsage(client, oldItems, 'revert');
            await replaceFrpItems(client, frpId, items);
            await adjustBudgetUsage(client, items, 'deduct');

            const [rows] = await client.query(
                'SELECT frp_no FROM frp_request WHERE id = ?',
                [frpId]
            );

            await client.commit();

            return res.json({
                success: true,
                id: frpId,
                frpNo: rows.length ? rows[0].frp_no : '',
            });
        }

        // Handle create
        const deptCode = snapshot.departmentCode || await getDeptCode(snapshot.departmentClass, snapshot.companyName);
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;

        const [seqRows] = await client.query(
            'SELECT frp_no FROM frp_request WHERE frp_no LIKE ?',
            [`${prefix}%`]
        );

        const sequences = seqRows.map(r => parseInt(String(r.frp_no || '').split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        const frpNo = `${prefix}${nextSeq.toString().padStart(5, '0')}`;

        const id = crypto.randomUUID();

        await client.query(`
            INSERT INTO frp_request (
                id,
                frp_no,
                status,

                company_id,
                company_code,
                company_name,

                frp_date,

                department_id,
                department_name,
                department_class,
                department_code,

                job_level_name,
                job_level_rank,

                requested_by,

                currency,
                kurs,
                frp_description,
                vendor,
                internal_po_number,
                ext_doc_type,
                ext_doc_number,
                payment_method,
                payment_date,
                destination_bank,
                destination_bank_account,
                check_docs,

                created_by,
                created_by_user_id,
                created_by_user_name,
                created_at,

                approved_by_actual,
                approved_by,
                approved_at
            ) VALUES (
                ?, ?, ?,

                ?, ?, ?,

                ?,

                ?, ?, ?, ?,

                ?, ?,

                ?,

                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,

                ?, ?, ?, NOW(),

                NULL, NULL, NULL
            )
        `, [
            id,
            frpNo,
            'PENDING',

            snapshot.companyId,
            snapshot.companyCode,
            snapshot.companyName,

            req.body.frpDate || req.body.tanggalFrp || null,

            snapshot.departmentId,
            snapshot.departmentName,
            snapshot.departmentClass,
            snapshot.departmentCode,

            
            snapshot.jobLevelName,
            snapshot.jobLevelRank,

            snapshot.createdByUserName,

            req.body.currency || 'IDR',
            req.body.exchangeRate || req.body.kurs || '1',
            req.body.frpDescription || req.body.keteranganFrp || '',
            req.body.vendor || '',
            req.body.internalPoNumber || '',
            req.body.externalDocumentType || req.body.extDocType || '',
            req.body.externalDocumentNumber || req.body.extDocNumber || '',
            req.body.paymentMethod || 'Transfer',
            req.body.paymentDate || req.body.payment_date || null,
            req.body.destinationBank || req.body.bankTujuan || '',
            req.body.destinationBankAccount || req.body.rekBankTujuan || '',
            JSON.stringify(req.body.checkDocs || []),

            snapshot.createdByUserName,
            snapshot.createdByUserId,
            snapshot.createdByUserName,
        ]);

        await replaceFrpItems(client, id, items);
        await adjustBudgetUsage(client, items, 'deduct');

        if (req.body.fromRpId) {
            await client.query(
                'UPDATE rp_request SET status = ? WHERE id = ?',
                ['CREATED_FRP', req.body.fromRpId]
            );
        }

        await client.commit();

        res.json({ success: true, id, frpNo });
    } catch (e) {
        await client.rollback();
        console.error('Error saving FRP:', e);
        res.status(500).json({ success: false, error: e.message });
    } finally {
        client.release();
    }
});

router.post('/api/frp/:id/:action', checkAuth, async (req, res) => {
    try {
        const action = req.params.action;
        const frpId = req.params.id;
        const u = req.session.user;

        if (action === 'approve') {
            const [rows] = await db.query(`
                SELECT
                    company_id,
                    company_code,
                    company_name,
                    department_id,
                    department_name,
                    department_class,
                    department_code
                FROM frp_request
                WHERE id = ?
            `, [frpId]);

            let approvedBy = u.fullName;

            if (rows.length) {
                const request = rows[0];

                const params = [
                    request.department_name || '',
                    request.department_class || '',
                ];

                let sql = USER_SQL + `
                    AND (md.name = ? OR md.class = ?)
                    AND mjl.level >= 4
                `;

                if (request.company_code) {
                    sql += ' AND mc.code = ?';
                    params.push(normalizeCompanyCode(request.company_code));
                }

                sql += ' ORDER BY mjl.level DESC LIMIT 1';

                const [mgrRows] = await centralDb.query(sql, params);

                if (mgrRows.length) approvedBy = mgrRows[0].name;
            }

            await db.query(`
                UPDATE frp_request 
                SET status = 'APPROVED',
                    approved_by_actual = ?,
                    approved_at = NOW(),
                    approved_by = ?
                WHERE id = ?
            `, [u.fullName, approvedBy, frpId]);
        } else if (action === 'reject') {
            await db.query(`UPDATE frp_request SET status = 'REJECTED' WHERE id = ?`, [frpId]);
        } else if (action === 'delete') {
            await db.query(`DELETE FROM frp_request WHERE id = ?`, [frpId]);
        } else if (action === 'revert') {
            // Ambil department_class FRP dari DB, jangan percaya body
            const [frpRows] = await db.query(
                'SELECT department_class FROM frp_request WHERE id = ?',
                [frpId]
            );

            if (!frpRows.length) {
                return res.status(404).json({ success: false, error: 'FRP tidak ditemukan' });
            }

            const frpDeptClass = frpRows[0].department_class;
            const isIT = u.selectedDivision === 'IT';
            const isOwnDivision = u.selectedDivision === frpDeptClass;

            const canRevert =
                u.role === 'administrator' ||
                isIT ||
                (Number(u.jobLevelRank || 0) >= 3 && isOwnDivision);

            if (!canRevert) {
                return res.status(403).json({
                    success: false,
                    error: 'Hanya IT, atau supervisor/manager divisi terkait yang bisa melakukan revert',
                });
            }

            await db.query(`
                UPDATE frp_request 
                SET status = 'PENDING', approved_by_actual = NULL, approved_at = NULL, approved_by = NULL
                WHERE id = ?
            `, [frpId]);
        } else if (action === 'update') {
            // Already handled via POST /api/frp/save with body.frpId
            // but we can add partial update if necessary
        }

        res.json({ success: true });
    } catch (e) {
        console.error('Error action FRP:', e);
        res.json({ success: false, error: e.message });
    }
});

module.exports = router;
