const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../db');
const { checkAuth } = require('../middleware/auth');
const { LOGIN_SQL } = require('../config/constants');
const { userFromLoginRows } = require('../services/dbService');

const router = express.Router();

// ============================================================
// AUTH PAGES (HTML redirects)
// ============================================================

router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.sendSPA();
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query(LOGIN_SQL, [username]);
        if (rows.length) {
            const match = await bcrypt.compare(password, rows[0].password || '');
            if (match) {
                const emp = userFromLoginRows(rows);
                req.session.user = { fullName: emp.fullName, role: emp.role, allAssignments: emp.companies };
                return res.redirect('/select-company');
            }
        }
    } catch (e) {
        console.error('[Login Error]', e.message);
    }
    res.redirect('/?error=1');
});

router.get('/select-company', checkAuth, (req, res) => {
    const user = req.session.user;
    const companies = [...new Set(user.allAssignments.map(a => a.name))];
    if (companies.length === 1) {
        const assignment = user.allAssignments.find(a => a.name === companies[0]);
        req.session.user.selectedCompany = companies[0];
        req.session.user.selectedCompanyId = assignment?.companyId || assignment?.id || '';
        req.session.user.selectedCompanyCode = assignment?.companyCode || assignment?.code || '';
        return res.redirect('/select-division');
    }
    res.sendSPA();
});

router.post('/select-company', checkAuth, (req, res) => {
    const assignment = req.session.user.allAssignments.find(a => a.name === req.body.company);
    req.session.user.selectedCompany = req.body.company;
    req.session.user.selectedCompanyId = assignment?.companyId || assignment?.id || '';
    req.session.user.selectedCompanyCode = assignment?.companyCode || assignment?.code || '';
    res.redirect('/select-division');
});

router.get('/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const divisions = user.allAssignments
        .filter(a => a.name === user.selectedCompany)
        .map(a => ({ class: a.class, jobLevel: a.jobLevel }));
    if (divisions.length === 1) {
        req.session.user.selectedDivision = divisions[0].class;
        req.session.user.selectedJobLevel = divisions[0].jobLevel;
        return res.redirect('/');
    }
    res.sendSPA();
});

router.post('/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const assignment = user.allAssignments.find(
        a => a.name === user.selectedCompany && a.class === req.body.division
    );
    if (assignment) {
        req.session.user.selectedDivision = assignment.class;
        req.session.user.selectedJobLevel = assignment.jobLevel;
    }
    res.redirect('/');
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ============================================================
// AUTH API (JSON responses)
// ============================================================

router.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query(LOGIN_SQL, [username]);
        if (rows.length) {
            const match = await bcrypt.compare(password, rows[0].password || '');
            if (match) {
                const emp = userFromLoginRows(rows);
                req.session.user = { fullName: emp.fullName, role: emp.role, allAssignments: emp.companies };
                return res.json({ success: true, redirect: '/select-company' });
            }
        }
    } catch (e) {
        console.error('[Login Error]', e.message);
    }
    res.json({ success: false, error: 'Username atau Password salah' });
});

router.get('/api/data/select-company', checkAuth, (req, res) => {
    const user = req.session.user;
    const companies = [...new Set(user.allAssignments.map(a => a.name))];
    const companyOptions = companies.map(name => {
        const assignment = user.allAssignments.find(a => a.name === name);
        return {
            id: assignment?.companyId || assignment?.id || '',
            code: assignment?.companyCode || assignment?.code || '',
            name,
        };
    });
    res.json({
        companies,
        companyOptions,
        user: {
            fullName: user.fullName,
            role: user.role,
            selectedCompany: user.selectedCompany || '',
            selectedCompanyId: user.selectedCompanyId || '',
            selectedCompanyCode: user.selectedCompanyCode || '',
            selectedDivision: user.selectedDivision || '',
            selectedJobLevel: user.selectedJobLevel || '',
            allAssignments: user.allAssignments || [],
        },
    });
});

router.post('/api/auth/select-company', checkAuth, (req, res) => {
    const assignment = req.session.user.allAssignments.find(a => a.name === req.body.company);
    req.session.user.selectedCompany = req.body.company;
    req.session.user.selectedCompanyId = assignment?.companyId || assignment?.id || '';
    req.session.user.selectedCompanyCode = assignment?.companyCode || assignment?.code || '';
    res.json({ success: true, redirect: '/select-division' });
});

router.get('/api/data/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const divisions = user.allAssignments
        .filter(a => a.name === user.selectedCompany)
        .flatMap(a => {
            const classes = a.classes && a.classes.length > 0 ? a.classes : [a.class].filter(Boolean);
            return classes.map(cls => ({ class: cls, deptName: a.deptName || cls, jobLevel: a.jobLevel }));
        });
    res.json({
        divisions,
        selectedCompany: user.selectedCompany,
        selectedCompanyId: user.selectedCompanyId || '',
        selectedCompanyCode: user.selectedCompanyCode || '',
        user: {
            fullName: user.fullName,
            role: user.role,
            selectedCompany: user.selectedCompany || '',
            selectedCompanyId: user.selectedCompanyId || '',
            selectedCompanyCode: user.selectedCompanyCode || '',
            selectedDivision: user.selectedDivision || '',
            selectedJobLevel: user.selectedJobLevel || '',
            allAssignments: user.allAssignments || [],
        },
    });
});

router.post('/api/auth/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const div = req.body.division;
    const assignment = user.allAssignments.find(a =>
        a.name === user.selectedCompany &&
        ((a.classes && a.classes.includes(div)) || a.class === div)
    );
    if (assignment) {
        req.session.user.selectedDivision = div;
        req.session.user.selectedJobLevel = assignment.jobLevel;
    }
    res.json({ success: true, redirect: '/' });
});

module.exports = router;
