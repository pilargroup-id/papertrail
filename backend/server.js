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
app.use(session({ secret: 'frp-secret', resave: false, saveUninitialized: true }));

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(dataPath, file), 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (file, data) => fs.writeFileSync(path.join(dataPath, file), JSON.stringify(data, null, 2));

let employees = readJson('employees.json');
let budgets = readJson('budgets.json');
let companies = readJson('companies.json');
let vendors = readJson('vendors.json');
let departments = readJson('departments.json');

app.get('/login', (req, res) => {
    const employeesData = readJson('employees.json');
    const departmentsData = readJson('departments.json');
    res.render('login', { employees: employeesData, departments: departmentsData, title: 'Login FRP System' });
});
app.post('/login', (req, res) => {
    const { fullName, password } = req.body;
    const employeesData = readJson('employees.json');
    const emp = employeesData.find(e => e.fullName === fullName);
    if (emp && password === '123') { 
        req.session.user = emp; 
        res.redirect('/'); 
    } else { 
        res.redirect('/login'); 
    }
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// Middleware requires login
const checkAuth = (req, res, next) => {
    if(!req.session.user) return res.redirect('/login');
    res.locals.user = req.session.user; 
    next();
};

// Middleware requires IT class
const checkIT = (req, res, next) => {
    if(req.session.user.class !== 'IT') return res.status(403).send('Forbidden: Khusus Divisi IT');
    next();
};

app.use(checkAuth);

app.get('/', (req, res) => {
    const u = req.session.user;
    
    // Refresh data from files
    const employeesData = readJson('employees.json');
    const budgetsData = readJson('budgets.json');
    const companiesData = readJson('companies.json');
    const vendorsData = readJson('vendors.json');
    const departmentsData = readJson('departments.json');

    const requests = readJson('requests.json');
    const usedBudgets = {};
    requests.forEach(r => {
        if (r.status === 'APPROVED' && r.items) {
            r.items.forEach(item => {
                const bId = item.budgetId;
                const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                if (!usedBudgets[bId]) usedBudgets[bId] = 0;
                usedBudgets[bId] += amt;
            });
        }
    });

    const budgetsWithRemaining = budgetsData.map(b => ({
        ...b,
        remainingAmount: (b.totalAmount || 0) - (usedBudgets[b.id] || 0)
    }));

    // Non-IT users: lock divisi to their own class only
    const userDivisi = u.class;

    // Find department info for the user's class
    const userDeptInfo = departmentsData.find(d => d.class === userDivisi);
    const deptName = userDeptInfo ? userDeptInfo.name : null;

    // Find all classes under the same department name
    const siblingClasses = deptName
        ? departmentsData.filter(d => d.name === deptName).map(d => d.class)
        : [userDivisi];

    let filteredEmployees;
    if (u.class === 'IT') {
        filteredEmployees = employeesData;
    } else {
        const ownClassEmployees = employeesData.filter(e => e.class === userDivisi);
        const siblingManagers = employeesData.filter(e =>
            siblingClasses.includes(e.class) &&
            e.class !== userDivisi &&
            ['Manager', 'Direktur', 'Komisaris'].includes(e.jobLevel)
        );
        const merged = [...ownClassEmployees];
        siblingManagers.forEach(m => {
            if (!merged.find(e => e.fullName === m.fullName)) merged.push(m);
        });
        filteredEmployees = merged;
    }

    res.render('form', {
        employees: filteredEmployees,
        budgets: budgetsWithRemaining,
        companies: companiesData,
        vendors: vendorsData,
        title: 'Form Request Payment',
        userDivisi: u.class === 'IT' ? null : userDivisi
    });
});

app.get('/api/employees/:department', (req, res) => res.json(employees.filter(e => e.class === req.params.department)));
app.get('/api/budgets/:department', (req, res) => {
    console.log(`[API] Fetching budgets for department: ${req.params.department}`);
    const requests = readJson('requests.json');
    const usedBudgets = {};
    requests.forEach(r => {
        if (r.status === 'APPROVED' && r.items) {
            r.items.forEach(item => {
                const bId = item.budgetId;
                const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                if (!usedBudgets[bId]) usedBudgets[bId] = 0;
                usedBudgets[bId] += amt;
            });
        }
    });

    const deptParam = req.params.department.toLowerCase();
    const filtered = budgets.filter(b => (b.department || '').toLowerCase() === deptParam).map(b => {
        const used = usedBudgets[b.id] || 0;
        return {
            ...b,
            remainingAmount: (b.totalAmount || 0) - used
        };
    });
    
    console.log(`[API] Found ${filtered.length} budgets for ${req.params.department}`);
    res.json(filtered);
});
app.get('/api/departments', (req, res) => {
    const depts = readJson('departments.json');
    res.json([...new Set(depts.map(d => d.class).filter(Boolean))].sort());
});
app.get('/api/managers/:department', (req, res) => res.json(employees.filter(e => e.class === req.params.department && (e.jobLevel === 'Manager' || e.jobLevel === 'Direktur' || e.jobLevel === 'Komisaris'))));

app.get('/api/next-frp-number/:department', (req, res) => {
    const requests = readJson('requests.json');
    const now = new Date();
    const yearStr = now.getFullYear().toString().slice(-2);
    const dept = req.params.department.toUpperCase();
    
    // Get dept code from Master Department
    const deptData = departments.find(d => d.class === dept || d.name === dept);
    const deptCode = deptData ? deptData.kodeFrp : dept.substring(0, 3).toUpperCase();
    
    const prefix = `FRP-${deptCode}-${yearStr}-`;
    const sameYearDeptRequests = requests.filter(r => r.frpNo && r.frpNo.startsWith(prefix));
    
    let nextSeq = 1;
    if (sameYearDeptRequests.length > 0) {
        const sequences = sameYearDeptRequests.map(r => {
            const parts = r.frpNo.split('-');
            return parseInt(parts[parts.length - 1], 10) || 0;
        });
        nextSeq = Math.max(...sequences) + 1;
    }
    
    const frpNo = `${prefix}${nextSeq.toString().padStart(5, '0')}`;
    res.json({ frpNo });
});

// --- ADMIN ROUTES ---
app.get('/admin/:type', checkIT, (req, res) => {
    const type = req.params.type;
    if(!['employees','vendors','budgets','departments'].includes(type)) return res.redirect('/');
    
    // Read directly from file to ensure data is always fresh
    let listData = readJson(`${type}.json`);
    
    let title = 'Admin Master Data';
    if(type === 'employees') { title = 'Master Karyawan'; }
    if(type === 'vendors') { title = 'Master Vendor'; }
    if(type === 'budgets') { title = 'Master Budget'; }
    if(type === 'departments') { title = 'Master Department'; }
    
    // Add original index for simple operations
    listData = listData.map((item, index) => ({ ...item, originalIndex: index }));
    
    let employeeList = readJson('employees.json');
    res.render('admin', { activeType: type, listData, employeeList, title });
});

app.post('/api/admin/:type/add', checkIT, (req, res) => {
    const type = req.params.type;
    if(type === 'employees') { employees.push(req.body); writeJson('employees.json', employees); }
    if(type === 'vendors') { vendors.push(req.body); writeJson('vendors.json', vendors); }
    if(type === 'budgets') { 
        const b = req.body;
        if(b.totalAmount) b.totalAmount = parseInt(String(b.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
        budgets.push(b); 
        writeJson('budgets.json', budgets); 
    }
    if(type === 'departments') { departments.push(req.body); writeJson('departments.json', departments); }
    res.redirect(`/admin/${type}`);
});

app.post('/api/admin/:type/delete/:index', checkIT, (req, res) => {
    const type = req.params.type;
    const index = parseInt(req.params.index, 10);
    if(type === 'employees') { employees.splice(index, 1); writeJson('employees.json', employees); }
    if(type === 'vendors') { vendors.splice(index, 1); writeJson('vendors.json', vendors); }
    if(type === 'budgets') { budgets.splice(index, 1); writeJson('budgets.json', budgets); }
    if(type === 'departments') { departments.splice(index, 1); writeJson('departments.json', departments); }
    res.redirect(`/admin/${type}`);
});

app.post('/api/admin/:type/edit/:index', checkIT, (req, res) => {
    const type = req.params.type;
    const index = parseInt(req.params.index, 10);
    if(type === 'employees') { employees[index] = req.body; writeJson('employees.json', employees); }
    if(type === 'vendors') { vendors[index] = req.body; writeJson('vendors.json', vendors); }
    if(type === 'departments') { departments[index] = req.body; writeJson('departments.json', departments); }
    if(type === 'budgets') { 
        const updated = req.body;
        if(updated.totalAmount) updated.totalAmount = parseInt(String(updated.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
        budgets[index] = updated; 
        writeJson('budgets.json', budgets); 
    }
    res.redirect(`/admin/${type}`);
});
// --------------------

app.post('/api/frp/save', (req, res) => {
    try {
        let requests = readJson('requests.json');
        
        // --- Sequential Numbering Logic ---
        const now = new Date();
        const yearStr = now.getFullYear().toString().slice(-2);
        const dept = (req.body.divisi || 'GENERAL').toUpperCase();
        
        // 1. Get dept code from Master Department
        const deptData = departments.find(d => d.class === dept || d.name === dept);
        const deptCode = deptData ? deptData.kodeFrp : dept.substring(0, 3).toUpperCase();
        
        const prefix = `FRP-${deptCode}-${yearStr}-`;
        
        // 2. Find highest sequence for this prefix
        const sameYearDeptRequests = requests.filter(r => r.frpNo && r.frpNo.startsWith(prefix));
        let nextSeq = 1;
        
        if (sameYearDeptRequests.length > 0) {
            const sequences = sameYearDeptRequests.map(r => {
                const parts = r.frpNo.split('-');
                return parseInt(parts[parts.length - 1], 10) || 0;
            });
            nextSeq = Math.max(...sequences) + 1;
        }
        
        const frpNo = `${prefix}${nextSeq.toString().padStart(5, '0')}`;
        // ----------------------------------

        const newReq = {
            id: Date.now().toString(36),
            ...req.body,
            frpNo: frpNo,
            requestBy: req.body.dimintaOleh || req.session.user.fullName, // Auto-fill Request By from Diminta Oleh
            status: 'PENDING',
            createdBy: req.session.user.fullName,
            createdAt: new Date().toISOString()
        };
        
        requests.push(newReq);
        writeJson('requests.json', requests);
        
        console.log(`[SERVER] Saved new FRP: ${frpNo}`);
        res.json({ success: true, id: newReq.id, frpNo: frpNo });
    } catch(e) {
        console.error(`[SERVER ERROR] ${e.message}`);
        res.json({ success: false, error: e.message });
    }
});

app.get('/approval', (req, res) => {
    const requests = readJson('requests.json');
    const u = req.session.user;
    let pending = requests.filter(r => r.status === 'PENDING');
    
    // Scoping: IT can see all, others only see their own division
    if (u.class !== 'IT') {
        pending = pending.filter(r => r.divisi === u.class);
    }

    res.render('approval', { requests: pending, title: 'Approval List', isApprovedView: false });
});

app.get('/approved', (req, res) => {
    const requests = readJson('requests.json');
    const u = req.session.user;
    let approved = requests.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED');
    
    // Scoping: IT can see all, others only see their own division
    if (u.class !== 'IT') {
        approved = approved.filter(r => r.divisi === u.class);
    }

    res.render('approval', { requests: approved, title: 'Approved List', isApprovedView: true });
});

app.get('/frp/:id', (req, res) => {
    const u = req.session.user;
    const reqData = readJson('requests.json').find(r => r.id === req.params.id);
    if (!reqData) return res.send('Not found');
    // Security: non-IT users can only view FRP from their own division
    if (u.class !== 'IT' && reqData.divisi !== u.class) {
        return res.status(403).send('Akses ditolak: FRP ini bukan dari divisi Anda.');
    }
    res.render('popup-detail', { data: reqData, employees, budgets, companies, vendors, title: 'Detail FRP' });
});

app.post('/api/frp/:id/:action', (req, res) => {
    const { id, action } = req.params;
    let requests = readJson('requests.json');
    const index = requests.findIndex(r => r.id === id);
    if(index === -1) return res.json({ success: false });

    if(action === 'approve') {
        requests[index].status = 'APPROVED';
        requests[index].approvedBy = req.session.user.fullName; // Untuk tampilan PDF
        requests[index].approvedByActual = req.session.user.fullName; // Audit trail
        requests[index].approvedAt = new Date().toISOString();
    } else if(action === 'reject') {
        requests[index].status = 'REJECTED';
    } else if(action === 'delete') {
        requests.splice(index, 1);
    } else if(action === 'revert') {
        requests[index].status = 'PENDING';
        delete requests[index].approvedBy;
        delete requests[index].approvedByActual;
        delete requests[index].approvedAt;
    } else if(action === 'update') {
        const preserve = {
            id: requests[index].id,
            status: requests[index].status,
            createdBy: requests[index].createdBy,
            createdAt: requests[index].createdAt,
            frpNo: requests[index].frpNo // don't change generated number
        };
        requests[index] = { ...requests[index], ...req.body, ...preserve };
    }
    writeJson('requests.json', requests);
    res.json({ success: true });
});

app.post('/preview', (req, res) => {
  const formData = req.body;
  res.render('pdf-template', { formData, preview: true });
});

app.post('/generate-pdf', async (req, res) => {
  try {
    const formData = req.body;
    const ejs = require('ejs');
    const templatePath = path.join(frontendPath, 'views', 'pdf-template.ejs');
    const html = await ejs.renderFile(templatePath, { formData, preview: false });

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
    await browser.close();

    const filename = `FRP-${formData.frpNo || 'DRAFT'}-${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, 'generated-pdfs', filename);
    fs.writeFileSync(pdfPath, pdfBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

app.listen(PORT, () => { console.log(`\n🚀 FRP Backend running at http://localhost:${PORT}\n`); });
