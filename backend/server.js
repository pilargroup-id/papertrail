const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

const frontendPath = path.join(__dirname, '..', 'frontend');
const dataPath = path.join(__dirname, 'data');

app.set('view engine', 'ejs');
app.set('views', path.join(frontendPath, 'views'));
app.set('view cache', false);
app.use(express.static(path.join(frontendPath, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'frp-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(dataPath, file), 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (file, data) => fs.writeFileSync(path.join(dataPath, file), JSON.stringify(data, null, 2));

// Auth Middleware
const checkAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    res.locals.user = req.session.user;
    next();
};

const checkIT = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'administrator') {
        return res.status(403).send('Forbidden: Access limited to IT Administrators');
    }
    next();
};

// --- AUTH ROUTES ---
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const employees = readJson('employees.json');
    const user = employees.find(e => e.fullName === username);

    if (user && password === '123') {
        req.session.user = { 
            fullName: user.fullName, 
            role: user.role, 
            allAssignments: user.companies || [] 
        };
        return res.redirect('/select-company');
    }
    res.render('login', { error: 'Nama atau Password salah' });
});

app.get('/select-company', checkAuth, (req, res) => {
    const user = req.session.user;
    const companies = [...new Set(user.allAssignments.map(a => a.name))];
    if (companies.length === 1) {
        req.session.user.selectedCompany = companies[0];
        return res.redirect('/select-division');
    }
    res.render('select-company', { companies });
});

app.post('/select-company', checkAuth, (req, res) => {
    req.session.user.selectedCompany = req.body.company;
    res.redirect('/select-division');
});

app.get('/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const divisions = user.allAssignments
        .filter(a => a.name === user.selectedCompany)
        .map(a => ({ class: a.class, jobLevel: a.jobLevel }));
    
    if (divisions.length === 1) {
        req.session.user.selectedDivision = divisions[0].class;
        req.session.user.selectedJobLevel = divisions[0].jobLevel;
        return res.redirect('/');
    }
    res.render('select-division', { divisions });
});

app.post('/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const assignment = user.allAssignments.find(a => a.name === user.selectedCompany && a.class === req.body.division);
    if (assignment) {
        req.session.user.selectedDivision = assignment.class;
        req.session.user.selectedJobLevel = assignment.jobLevel;
    }
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- APP ROUTES ---
app.get('/', checkAuth, (req, res) => {
    const u = req.session.user;
    const employeesData = readJson('employees.json');
    const budgetsData = readJson('budgets.json');
    const companiesData = readJson('companies.json');
    const vendorsData = readJson('vendors.json');
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

    const budgetsWithRemaining = budgetsData.map(b => ({
        ...b,
        remainingAmount: (b.totalAmount || 0) - (usedBudgets[b.id] || 0)
    }));

    let editData = null;
    if (req.query.revisi) {
        editData = requests.find(r => r.id === req.query.revisi);
    }

    res.render('form', {
        employees: employeesData,
        budgets: budgetsWithRemaining,
        companies: companiesData,
        vendors: vendorsData,
        title: editData ? 'Revisi Request Payment' : 'Form Request Payment',
        selectedCompany: u.selectedCompany,
        selectedDivision: u.selectedDivision,
        selectedJobLevel: u.selectedJobLevel,
        editData: editData
    });
});

app.get('/api/employees/:department', checkAuth, (req, res) => {
    const dept = req.params.department;
    const company = req.query.company;
    const employeesData = readJson('employees.json');
    let filtered = employeesData.filter(e => {
        if (!e.companies) return e.class === dept;
        return e.companies.some(assign => (assign.class === dept && (!company || assign.name === company)));
    });
    res.json(filtered);
});

app.get('/api/budgets/:department', checkAuth, (req, res) => {
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
    const filtered = budgetsData.filter(b => (b.department || '').toLowerCase() === req.params.department.toLowerCase()).map(b => ({
        ...b,
        remainingAmount: (b.totalAmount || 0) - (usedBudgets[b.id] || 0)
    }));
    res.json(filtered);
});

app.get('/api/departments', checkAuth, (req, res) => {
    const depts = readJson('departments.json');
    res.json([...new Set(depts.map(d => d.class).filter(Boolean))].sort());
});

app.get('/api/managers/:department', checkAuth, (req, res) => {
    const dept = req.params.department;
    const company = req.query.company;
    const employeesData = readJson('employees.json');
    let filtered = employeesData.filter(e => {
        if (!e.companies) return false;
        return e.companies.some(assign => (assign.class === dept && (!company || assign.name === company) && ['Manager', 'Direktur', 'Komisaris'].includes(assign.jobLevel)));
    });
    res.json(filtered);
});

app.get('/api/next-frp-number/:department', checkAuth, (req, res) => {
    const requests = readJson('requests.json');
    const departmentsData = readJson('departments.json');
    const dept = req.params.department.toUpperCase();
    const deptData = departmentsData.find(d => d.class === dept || d.name === dept);
    const deptCode = deptData ? deptData.kodeFrp : dept.substring(0, 3).toUpperCase();
    const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
    const sequences = requests.filter(r => r.frpNo && r.frpNo.startsWith(prefix)).map(r => parseInt(r.frpNo.split('-').pop(), 10) || 0);
    const nextSeq = Math.max(0, ...sequences) + 1;
    res.json({ frpNo: `${prefix}${nextSeq.toString().padStart(5, '0')}` });
});

// --- ADMIN ROUTES ---
app.get('/admin/:type', checkAuth, checkIT, (req, res) => {
    const type = req.params.type;
    if(!['employees','vendors','budgets','departments','roles'].includes(type)) return res.redirect('/');
    let listData = readJson(`${type}.json`);
    res.render('admin', { activeType: type, listData: listData.map((item, index) => ({ ...item, originalIndex: index })), employeeList: readJson('employees.json'), title: `Master ${type.charAt(0).toUpperCase() + type.slice(1)}` });
});

app.post('/api/admin/:type/add', checkAuth, checkIT, (req, res) => {
    const type = req.params.type;
    const data = readJson(`${type}.json`);
    let newItem = req.body;
    if(type === 'employees' && newItem.companies && !Array.isArray(newItem.companies)) newItem.companies = Object.values(newItem.companies);
    if(type === 'budgets' && newItem.totalAmount) newItem.totalAmount = parseInt(String(newItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
    data.push(newItem);
    writeJson(`${type}.json`, data);
    res.redirect(`/admin/${type}`);
});

app.post('/api/admin/:type/delete/:index', checkAuth, checkIT, (req, res) => {
    const type = req.params.type;
    const data = readJson(`${type}.json`);
    data.splice(parseInt(req.params.index, 10), 1);
    writeJson(`${type}.json`, data);
    res.redirect(`/admin/${type}`);
});

app.post('/api/admin/:type/edit/:index', checkAuth, checkIT, (req, res) => {
    const type = req.params.type;
    const data = readJson(`${type}.json`);
    let updatedItem = req.body;
    if(type === 'employees' && updatedItem.companies && !Array.isArray(updatedItem.companies)) updatedItem.companies = Object.values(updatedItem.companies);
    if(type === 'budgets' && updatedItem.totalAmount) updatedItem.totalAmount = parseInt(String(updatedItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
    data[parseInt(req.params.index, 10)] = updatedItem;
    writeJson(`${type}.json`, data);
    res.redirect(`/admin/${type}`);
});

app.post('/api/frp/save', checkAuth, (req, res) => {
    try {
        let requests = readJson('requests.json');
        
        if (req.body.frpId) {
            // Revisi - Update existing
            const idx = requests.findIndex(r => r.id === req.body.frpId);
            if (idx === -1) return res.json({ success: false, error: 'FRP not found for revision' });
            
            const updatedReq = { 
                ...requests[idx], 
                ...req.body, 
                id: requests[idx].id, 
                frpNo: requests[idx].frpNo, 
                status: 'PENDING' 
            };
            delete updatedReq.frpId;
            requests[idx] = updatedReq;
            writeJson('requests.json', requests);
            return res.json({ success: true, id: updatedReq.id, frpNo: updatedReq.frpNo });
        }

        // New Request
        const departmentsData = readJson('departments.json');
        const dept = (req.body.divisi || 'GENERAL').toUpperCase();
        const deptData = departmentsData.find(d => d.class === dept || d.name === dept);
        const deptCode = deptData ? deptData.kodeFrp : dept.substring(0, 3).toUpperCase();
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const sequences = requests.filter(r => r.frpNo && r.frpNo.startsWith(prefix)).map(r => parseInt(r.frpNo.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        const frpNo = `${prefix}${nextSeq.toString().padStart(5, '0')}`;
        const newReq = { id: Date.now().toString(36), ...req.body, frpNo: frpNo, requestBy: req.body.dimintaOleh || 'System', status: 'PENDING', createdBy: req.session.user.fullName, createdAt: new Date().toISOString() };
        requests.push(newReq);
        writeJson('requests.json', requests);
        res.json({ success: true, id: newReq.id, frpNo: frpNo });
    } catch(e) { res.json({ success: false, error: e.message }); }
});

app.get('/approval', checkAuth, (req, res) => {
    const u = req.session.user;
    let reqs = readJson('requests.json').filter(r => r.status === 'PENDING');
    if (u.role !== 'administrator' && u.selectedDivision) {
        reqs = reqs.filter(r => r.divisi === u.selectedDivision);
    }
    const canApprove = u.role === 'administrator' || ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);
    res.render('approval', { requests: reqs, title: 'Approval List', isApprovedView: false, canApprove });
});

app.get('/approved', checkAuth, (req, res) => {
    const u = req.session.user;
    let reqs = readJson('requests.json').filter(r => r.status === 'APPROVED' || r.status === 'REJECTED');
    if (u.role !== 'administrator' && u.selectedDivision) {
        reqs = reqs.filter(r => r.divisi === u.selectedDivision);
    }
    const canApprove = u.role === 'administrator' || ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);
    res.render('approval', { requests: reqs, title: 'Approved List', isApprovedView: true, canApprove });
});
app.get('/frp/:id', checkAuth, (req, res) => {
    const data = readJson('requests.json').find(r => r.id === req.params.id);
    if (!data) return res.send('Not found');
    res.render('popup-detail', { 
        data, 
        employees: readJson('employees.json'), 
        budgets: readJson('budgets.json'), 
        companies: readJson('companies.json'), 
        vendors: readJson('vendors.json'), 
        title: 'Detail FRP',
        user: req.session.user 
    });
});

app.post('/api/frp/:id/:action', checkAuth, (req, res) => {
    let requests = readJson('requests.json');
    const idx = requests.findIndex(r => r.id === req.params.id);
    if(idx === -1) return res.json({ success: false });
    const action = req.params.action;
    if(action === 'approve') { requests[idx].status = 'APPROVED'; requests[idx].approvedBy = req.session.user.fullName; requests[idx].approvedAt = new Date().toISOString(); }
    else if(action === 'reject') requests[idx].status = 'REJECTED';
    else if(action === 'delete') requests.splice(idx, 1);
    else if(action === 'revert') { requests[idx].status = 'PENDING'; delete requests[idx].approvedBy; delete requests[idx].approvedAt; }
    else if(action === 'update') { requests[idx] = { ...requests[idx], ...req.body, id: requests[idx].id, status: requests[idx].status, frpNo: requests[idx].frpNo }; }
    writeJson('requests.json', requests);
    res.json({ success: true });
});

app.post('/preview', checkAuth, (req, res) => res.render('pdf-template', { formData: req.body, preview: true }));
app.post('/generate-pdf', checkAuth, async (req, res) => {
  try {
    const html = await require('ejs').renderFile(path.join(frontendPath, 'views', 'pdf-template.ejs'), { formData: req.body, preview: false });
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
    await browser.close();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FRP-${req.body.frpNo || 'DRAFT'}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) { res.status(500).json({ error: 'Failed to generate PDF', details: error.message }); }
});

app.listen(PORT, () => { console.log(`\n🚀 FRP Backend running at http://localhost:${PORT}\n`); });
