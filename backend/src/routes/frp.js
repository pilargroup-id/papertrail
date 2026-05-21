const express = require('express');
const db = require('../../db');
const { checkAuth } = require('../middleware/auth');
const { USER_SQL } = require('../config/constants');
const { readJson, writeJson } = require('../utils/json');
const {
    getAllEmployees,
    getCompanies,
    getDepartmentRows,
    getDeptCode,
    dbRowsToEmployees,
    getDepartmentEmployeesByUserId,
} = require('../services/dbService');
const { normalizeCompanyCode } = require('../utils/company');

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
            Promise.resolve(readJson('budgets.json')),
            getCompanies(),
            Promise.resolve(readJson('vendors.json')),
            getDepartmentRows(),
        ]);
        const requests = readJson('requests.json');

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

        const budgetsWithRemaining = budgetsData.map(b => ({
            ...b,
            remainingAmount: (b.totalAmount || 0) - (usedBudgets[b.id] || 0),
        }));

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

router.get('/api/budgets/:department', checkAuth, (req, res) => {
    const budgetsData = readJson('budgets.json');
    const requests = readJson('requests.json');
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
        .filter(b => (b.department || '').toLowerCase() === req.params.department.toLowerCase())
        .map(b => ({ ...b, remainingAmount: (b.totalAmount || 0) - (usedBudgets[b.id] || 0) }));
    res.json(filtered);
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
        const requests = readJson('requests.json');
        const dept = (req.params.department || '').trim().toUpperCase();
        const deptCode = await getDeptCode(dept, req.query.company || req.session.user.selectedCompany);
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const sequences = requests
            .filter(r => r.frpNo && r.frpNo.startsWith(prefix))
            .map(r => parseInt(r.frpNo.split('-').pop(), 10) || 0);
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

router.get('/api/data/approval', checkAuth, (req, res) => {
    const u = req.session.user;
    const { isRequestInUserScope } = require('../middleware/scope');
    const isApprovedView = req.query.view === 'approved';
    const isAllView = req.query.view === 'all';
    let reqs = readJson('requests.json');

    const pendingCount = reqs.filter(r => r.status === 'PENDING' && isRequestInUserScope(r, u)).length;
    const approvedCount = reqs.filter(r =>
        (r.status === 'APPROVED' || r.status === 'REJECTED') && isRequestInUserScope(r, u)
    ).length;

    if (!isAllView) {
        reqs = isApprovedView
            ? reqs.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED')
            : reqs.filter(r => r.status === 'PENDING');
    }

    if (u.role !== 'administrator') {
        reqs = reqs.filter(r => isRequestInUserScope(r, u));
    }

    const canApprove = u.role === 'administrator' ||
        ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);

    res.json({
        requests: reqs,
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

router.get('/api/frp/:id', checkAuth, async (req, res) => {
    try {
        const data = readJson('requests.json').find(r => r.id === req.params.id);
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

router.post('/api/frp/save', checkAuth, async (req, res) => {
    try {
        let requests = readJson('requests.json');

        // Handle revision (update existing)
        if (req.body.frpId) {
            const idx = requests.findIndex(r => r.id === req.body.frpId);
            if (idx === -1) return res.json({ success: false, error: 'FRP not found for revision' });
            const updatedReq = {
                ...requests[idx],
                ...req.body,
                id: requests[idx].id,
                frpNo: requests[idx].frpNo,
                status: 'PENDING',
            };
            delete updatedReq.frpId;
            requests[idx] = updatedReq;
            writeJson('requests.json', requests);
            return res.json({ success: true, id: updatedReq.id, frpNo: updatedReq.frpNo });
        }

        // Handle new FRP
        const dept = (req.body.divisi || 'GENERAL').trim().toUpperCase();
        const deptCode = await getDeptCode(dept, req.body.companyName || req.session.user.selectedCompany);
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const sequences = requests
            .filter(r => r.frpNo && r.frpNo.startsWith(prefix))
            .map(r => parseInt(r.frpNo.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        const frpNo = `${prefix}${nextSeq.toString().padStart(5, '0')}`;
        const newReq = {
            ...req.body,
            id: Date.now().toString(36),
            frpNo,
            requestBy: req.body.dimintaOleh || 'System',
            status: 'PENDING',
            createdBy: req.session.user.fullName,
            createdAt: new Date().toISOString(),
        };
        requests.push(newReq);
        writeJson('requests.json', requests);

        // Mark linked RP as FRP created
        if (req.body.fromRpId) {
            let rpRequests = readJson('rp-requests.json');
            const rpIdx = rpRequests.findIndex(r => r.id === req.body.fromRpId);
            if (rpIdx !== -1) {
                rpRequests[rpIdx].status = 'CREATED_FRP';
                writeJson('rp-requests.json', rpRequests);
            }
        }

        res.json({ success: true, id: newReq.id, frpNo });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

router.post('/api/frp/:id/:action', checkAuth, async (req, res) => {
    try {
        let requests = readJson('requests.json');
        const idx = requests.findIndex(r => r.id === req.params.id);
        if (idx === -1) return res.json({ success: false });

        const action = req.params.action;

        if (action === 'approve') {
            requests[idx].status = 'APPROVED';
            requests[idx].approvedByActual = req.session.user.fullName;
            requests[idx].approvedAt = new Date().toISOString();
            // Look up the highest-level manager in the division
            const divisi = requests[idx].divisi || '';
            const params = [divisi];
            let sql = USER_SQL + ' AND md.name = ? AND mjl.level >= 4';
            if (requests[idx].companyName) {
                sql += ' AND mc.code = ?';
                params.push(normalizeCompanyCode(requests[idx].companyName));
            }
            sql += ' ORDER BY mjl.level DESC LIMIT 1';
            const [mgrRows] = await db.query(sql, params);
            requests[idx].approvedBy = mgrRows.length ? mgrRows[0].name : req.session.user.fullName;
        } else if (action === 'reject') {
            requests[idx].status = 'REJECTED';
        } else if (action === 'delete') {
            requests.splice(idx, 1);
        } else if (action === 'revert') {
            if (req.session.user.role !== 'administrator') {
                return res.status(403).json({ success: false, error: 'Hanya administrator yang bisa melakukan revert' });
            }
            requests[idx].status = 'PENDING';
            delete requests[idx].approvedByActual;
            delete requests[idx].approvedAt;
        } else if (action === 'update') {
            requests[idx] = {
                ...requests[idx],
                ...req.body,
                id: requests[idx].id,
                status: requests[idx].status,
                frpNo: requests[idx].frpNo,
            };
        }

        writeJson('requests.json', requests);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

module.exports = router;
