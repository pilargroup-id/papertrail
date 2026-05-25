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
    getCompanyId,
    getDeptId,
    dbRowsToEmployees,
    getDepartmentEmployeesByUserId,
    fetchAllFrpRequests,
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
            const bCompanyId = b.company_id !== undefined ? b.company_id : b.companyId;
            const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
            const comp = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
            const dept = departments.find(d => String(d.id) === String(bDepartmentId));
            return {
                ...b,
                company: comp ? comp.name : (b.company || 'PT PILAR NIAGA MAKMUR'),
                department: dept ? dept.name : (b.department || ''),
                remainingAmount: (b.total_amount !== undefined ? b.total_amount : (b.totalAmount || 0)) - (usedBudgets[b.id] || 0),
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
        const budgetsData = readJson('budgets.json');
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
            const bCompanyId = b.company_id !== undefined ? b.company_id : b.companyId;
            const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
            const comp = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
            const dept = departments.find(d => String(d.id) === String(bDepartmentId));
            return {
                ...b,
                company: comp ? comp.name : (b.company || 'PT PILAR NIAGA MAKMUR'),
                department: dept ? dept.name : (b.department || ''),
                remainingAmount: (b.total_amount !== undefined ? b.total_amount : (b.totalAmount || 0)) - (usedBudgets[b.id] || 0),
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
        const budgetsData = readJson('budgets.json');
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
                const bCompanyId = b.company_id !== undefined ? b.company_id : b.companyId;
                const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
                const comp = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
                const dept = departments.find(d => String(d.id) === String(bDepartmentId));
                return {
                    ...b,
                    company: comp ? comp.name : (b.company || 'PT PILAR NIAGA MAKMUR'),
                    department: dept ? dept.name : (b.department || ''),
                };
            })
            .filter(b => (b.department || '').toLowerCase() === req.params.department.toLowerCase())
            .map(b => ({ ...b, remainingAmount: (b.total_amount !== undefined ? b.total_amount : (b.totalAmount || 0)) - (usedBudgets[b.id] || 0) }));
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
    let reqs = await fetchAllFrpRequests();

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

router.post('/api/frp/save', checkAuth, async (req, res) => {
    try {
        const u = req.session.user;
        const companyName = req.body.companyName || u.selectedCompany;
        const divisi = req.body.divisi || 'GENERAL';

        const companyId = await getCompanyId(companyName);
        const deptId = await getDeptId(divisi, companyName);

        // Fetch old items if updating to reverse previous deduction
        let oldItems = [];
        if (req.body.frpId) {
            const [rows] = await db.query('SELECT items FROM frp_request WHERE id = ?', [req.body.frpId]);
            if (rows.length && rows[0].items) {
                try {
                    oldItems = typeof rows[0].items === 'string' ? JSON.parse(rows[0].items) : rows[0].items;
                } catch (e) {
                    console.error('Error parsing old items', e);
                }
            }
        }

        // Handle revision (update existing)
        if (req.body.frpId) {
            await db.query(`
                UPDATE frp_request SET
                    company_id = ?, tanggal_frp = ?, department_id = ?, diminta_oleh = ?,
                    currency = ?, kurs = ?, keterangan_frp = ?, vendor = ?, internal_po_number = ?,
                    ext_doc_type = ?, ext_doc_number = ?, payment_method = ?, payment_date = ?,
                    bank_tujuan = ?, rek_bank_tujuan = ?, check_docs = ?, items = ?,
                    status = 'PENDING'
                WHERE id = ?
            `, [
                companyId, req.body.tanggalFrp || null, deptId, req.body.dimintaOleh || '',
                req.body.currency || 'IDR', req.body.kurs || '1', req.body.keteranganFrp || '',
                req.body.vendor || '', req.body.internalPoNumber || '', req.body.extDocType || '',
                req.body.extDocNumber || '', req.body.paymentMethod || 'Transfer', req.body.paymentDate || null,
                req.body.bankTujuan || '', req.body.rekBankTujuan || '', JSON.stringify(req.body.checkDocs || []),
                JSON.stringify(req.body.items || []), req.body.frpId
            ]);
            
            const [rows] = await db.query('SELECT frp_no FROM frp_request WHERE id = ?', [req.body.frpId]);
            const frpNo = rows.length ? rows[0].frp_no : '';

            // Update budgets.json
            try {
                const { readJson, writeJson } = require('../utils/json');
                const budgetsData = readJson('budgets.json');
                let isModified = false;

                // Revert old items
                oldItems.forEach(item => {
                    if (item.budgetId) {
                        const b = budgetsData.find(x => x.id === item.budgetId);
                        if (b) {
                            const amt = parseFloat(item.amount) || 0;
                            // Revert sisa_budget/sisaBudget only (total_amount remains unchanged)
                            const curSisa = b.sisa_budget !== undefined ? b.sisa_budget : (b.sisaBudget !== undefined ? b.sisaBudget : 0);
                            b.sisa_budget = curSisa + amt;
                            b.sisaBudget = b.sisa_budget;

                            isModified = true;
                        }
                    }
                });

                // Deduct new items
                (req.body.items || []).forEach(item => {
                    if (item.budgetId) {
                        const b = budgetsData.find(x => x.id === item.budgetId);
                        if (b) {
                            const amt = parseFloat(item.amount) || 0;
                            // Deduct sisa_budget/sisaBudget only (total_amount remains unchanged)
                            const curSisa = b.sisa_budget !== undefined ? b.sisa_budget : (b.sisaBudget !== undefined ? b.sisaBudget : 0);
                            b.sisa_budget = curSisa - amt;
                            b.sisaBudget = b.sisa_budget;

                            isModified = true;
                        }
                    }
                });

                if (isModified) {
                    writeJson('budgets.json', budgetsData);
                }
            } catch (err) {
                console.error('Failed to update budgets.json:', err);
            }

            return res.json({ success: true, id: req.body.frpId, frpNo });
        }

        // Handle new FRP
        const dept = divisi.trim().toUpperCase();
        const deptCode = await getDeptCode(dept, companyName);
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        
        const [seqRows] = await db.query(`SELECT frp_no FROM frp_request WHERE frp_no LIKE ?`, [`${prefix}%`]);
        const sequences = seqRows.map(r => parseInt(r.frp_no.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        const frpNo = `${prefix}${nextSeq.toString().padStart(5, '0')}`;
        
        const id = 'frp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        await db.query(`
            INSERT INTO \`frp_request\` (
              \`id\`, \`frp_no\`, \`status\`, \`company_id\`, \`tanggal_frp\`,
              \`department_id\`, \`diminta_oleh\`, \`currency\`, \`kurs\`, \`keterangan_frp\`,
              \`vendor\`, \`internal_po_number\`, \`ext_doc_type\`, \`ext_doc_number\`,
              \`payment_method\`, \`payment_date\`, \`bank_tujuan\`, \`rek_bank_tujuan\`,
              \`check_docs\`, \`items\`, \`created_by\`, \`created_at\`,
              \`approved_by_actual\`, \`approved_by\`, \`approved_at\`
            ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, NOW(),
              NULL, NULL, NULL
            )
        `, [
            id, frpNo, 'PENDING', companyId, req.body.tanggalFrp || null,
            deptId, req.body.dimintaOleh || '', req.body.currency || 'IDR', req.body.kurs || '1', req.body.keteranganFrp || '',
            req.body.vendor || '', req.body.internalPoNumber || '', req.body.extDocType || '', req.body.extDocNumber || '',
            req.body.paymentMethod || 'Transfer', req.body.paymentDate || null, req.body.bankTujuan || '', req.body.rekBankTujuan || '',
            JSON.stringify(req.body.checkDocs || []), JSON.stringify(req.body.items || []), u.fullName
        ]);

        // Mark linked RP as FRP created
        if (req.body.fromRpId) {
            await db.query('UPDATE rp_request SET status = ? WHERE id = ?', ['CREATED_FRP', req.body.fromRpId]);
        }

        // Update budgets.json for new FRP
        try {
            const { readJson, writeJson } = require('../utils/json');
            const budgetsData = readJson('budgets.json');
            let isModified = false;

            (req.body.items || []).forEach(item => {
                if (item.budgetId) {
                    const b = budgetsData.find(x => x.id === item.budgetId);
                    if (b) {
                        const amt = parseFloat(item.amount) || 0;
                        // Deduct sisa_budget/sisaBudget only (total_amount remains unchanged)
                        const curSisa = b.sisa_budget !== undefined ? b.sisa_budget : (b.sisaBudget !== undefined ? b.sisaBudget : 0);
                        b.sisa_budget = curSisa - amt;
                        b.sisaBudget = b.sisa_budget;

                        isModified = true;
                    }
                }
            });

            if (isModified) {
                writeJson('budgets.json', budgetsData);
            }
        } catch (err) {
            console.error('Failed to update budgets.json:', err);
        }

        res.json({ success: true, id, frpNo });
    } catch (e) {
        console.error('Error saving FRP:', e);
        res.json({ success: false, error: e.message });
    }
});

router.post('/api/frp/:id/:action', checkAuth, async (req, res) => {
    try {
        const action = req.params.action;
        const frpId = req.params.id;
        const u = req.session.user;

        if (action === 'approve') {
            const [rows] = await db.query(`
                SELECT f.company_id, f.department_id, md.name as divisi, mc.code as companyCode 
                FROM frp_request f
                LEFT JOIN master_companies mc ON f.company_id = mc.id
                LEFT JOIN master_departments md ON f.department_id = md.id
                WHERE f.id = ?
            `, [frpId]);
            
            let approvedBy = u.fullName;
            if (rows.length) {
                const divisi = rows[0].divisi || '';
                const companyCode = rows[0].companyCode;
                const params = [divisi];
                let sql = USER_SQL + ' AND md.name = ? AND mjl.level >= 4';
                if (companyCode) {
                    sql += ' AND mc.code = ?';
                    params.push(normalizeCompanyCode(companyCode));
                }
                sql += ' ORDER BY mjl.level DESC LIMIT 1';
                const [mgrRows] = await db.query(sql, params);
                if (mgrRows.length) approvedBy = mgrRows[0].name;
            }

            await db.query(`
                UPDATE frp_request 
                SET status = 'APPROVED', approved_by_actual = ?, approved_at = NOW(), approved_by = ?
                WHERE id = ?
            `, [u.fullName, approvedBy, frpId]);

        } else if (action === 'reject') {
            await db.query(`UPDATE frp_request SET status = 'REJECTED' WHERE id = ?`, [frpId]);
        } else if (action === 'delete') {
            await db.query(`DELETE FROM frp_request WHERE id = ?`, [frpId]);
        } else if (action === 'revert') {
            if (u.role !== 'administrator') {
                return res.status(403).json({ success: false, error: 'Hanya administrator yang bisa melakukan revert' });
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
