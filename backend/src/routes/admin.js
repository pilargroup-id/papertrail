const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../db');
const { checkAuth, checkIT } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/json');
const {
    getAllEmployees,
    getCompanies,
    getDepartmentRows,
    getDepartmentCompanyId,
    getJobLevelId,
    saveUserAssignments,
    getPrimaryAssignment,
} = require('../services/dbService');

const router = express.Router();

// ============================================================
// ADMIN PAGE
// ============================================================

router.get('/admin/:type', checkAuth, checkIT, (req, res) => res.sendSPA());

// ============================================================
// ADMIN DATA
// ============================================================

router.get('/api/data/admin', checkAuth, checkIT, async (req, res) => {
    const type = req.query.type;
    const VALID_TYPES = ['employees', 'vendors', 'budgets', 'departments', 'roles'];
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    const u = req.session.user;
    try {
        let listData;
        if (type === 'employees') {
            listData = await getAllEmployees();
        } else if (type === 'departments') {
            listData = await getDepartmentRows();
        } else {
            listData = readJson(`${type}.json`).map((item, index) => ({ ...item, originalIndex: index }));
        }
        const [employeeList, companies] = await Promise.all([getAllEmployees(), getCompanies()]);
        res.json({
            activeType: type,
            listData,
            employeeList,
            companies,
            user: {
                fullName: u.fullName,
                role: u.role,
                selectedJobLevel: u.selectedJobLevel,
                allAssignments: u.allAssignments || [],
            },
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// ADMIN ADD
// ============================================================

router.post('/api/admin/:type/add', checkAuth, checkIT, async (req, res) => {
    const type = req.params.type;
    try {
        if (type === 'employees') {
            const { fullName, email, companies = [] } = req.body;
            const assignment = getPrimaryAssignment(companies);
            const username = (fullName || '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
            const passwordHash = bcrypt.hashSync('12345', 10);
            const conn = await db.getConnection();
            try {
                await conn.beginTransaction();
                const [[{ id: userId }]] = await conn.query('SELECT UUID() AS id');
                const jobLevelId = await getJobLevelId(assignment.jobLevel || 'Staff', conn);
                await conn.query(
                    'INSERT INTO central_users (id, name, email, username, password, job_level_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
                    [userId, fullName, email || null, username, passwordHash, jobLevelId]
                );
                await saveUserAssignments(conn, userId, companies);
                await conn.commit();
            } catch (e) {
                await conn.rollback();
                throw e;
            } finally {
                conn.release();
            }
            return res.json({ success: true });
        }

        if (type === 'departments') {
            const { name, class: cls, kodeFrp, company } = req.body;
            const [existing] = await db.query('SELECT MAX(id) AS maxId FROM master_departments');
            const nextId = (existing[0].maxId || 0) + 1;
            const companyId = await getDepartmentCompanyId(company);
            await db.query(
                'INSERT INTO master_departments (id, name, class, code, company_id) VALUES (?, ?, ?, ?, ?)',
                [nextId, name, cls || name, kodeFrp || '', companyId]
            );
            return res.json({ success: true });
        }

        // JSON-backed types (vendors, budgets, roles)
        const data = readJson(`${type}.json`);
        let newItem = req.body;
        if (type === 'budgets') {
            if (newItem.totalAmount) {
                newItem.totalAmount = parseInt(String(newItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
            }
            newItem.total_amount = newItem.totalAmount || 0;
            newItem.sisa_budget = newItem.totalAmount || 0;
            newItem.sisaBudget = newItem.totalAmount || 0;
        }
        data.push(newItem);
        writeJson(`${type}.json`, data);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ============================================================
// ADMIN DELETE
// ============================================================

router.post('/api/admin/:type/delete/:index', checkAuth, checkIT, async (req, res) => {
    const { type, index } = req.params;
    try {
        if (type === 'employees') {
            await db.query('DELETE FROM central_users WHERE id = ?', [index]);
            return res.json({ success: true });
        }
        if (type === 'departments') {
            await db.query('DELETE FROM master_departments WHERE id = ?', [parseInt(index, 10)]);
            return res.json({ success: true });
        }
        const data = readJson(`${type}.json`);
        data.splice(parseInt(index, 10), 1);
        writeJson(`${type}.json`, data);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ============================================================
// ADMIN EDIT
// ============================================================

router.post('/api/admin/:type/edit/:index', checkAuth, checkIT, async (req, res) => {
    const { type, index } = req.params;
    try {
        if (type === 'employees') {
            const { fullName, email, companies = [] } = req.body;
            const assignment = getPrimaryAssignment(companies);
            const conn = await db.getConnection();
            try {
                await conn.beginTransaction();
                const jobLevelId = await getJobLevelId(assignment.jobLevel || 'Staff', conn);
                await conn.query(
                    'UPDATE central_users SET name = ?, email = ?, job_level_id = ? WHERE id = ?',
                    [fullName, email || null, jobLevelId, index]
                );
                await saveUserAssignments(conn, index, companies);
                await conn.commit();
            } catch (e) {
                await conn.rollback();
                throw e;
            } finally {
                conn.release();
            }
            return res.json({ success: true });
        }

        if (type === 'departments') {
            const { name, class: cls, kodeFrp, company } = req.body;
            const companyId = await getDepartmentCompanyId(company);
            await db.query(
                'UPDATE master_departments SET name = ?, class = ?, code = ?, company_id = ? WHERE id = ?',
                [name, cls || name, kodeFrp || '', companyId, parseInt(index, 10)]
            );
            return res.json({ success: true });
        }

        // JSON-backed types
        const data = readJson(`${type}.json`);
        let updatedItem = req.body;
        if (type === 'budgets') {
            if (updatedItem.totalAmount !== undefined) {
                updatedItem.totalAmount = parseInt(String(updatedItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
                updatedItem.total_amount = updatedItem.totalAmount;
                const oldItem = data[parseInt(index, 10)];
                const diff = updatedItem.totalAmount - (oldItem?.totalAmount || oldItem?.total_amount || 0);

                const oldSisa = oldItem?.sisa_budget !== undefined ? oldItem.sisa_budget : (oldItem?.sisaBudget !== undefined ? oldItem.sisaBudget : (oldItem?.totalAmount || 0));
                updatedItem.sisa_budget = oldSisa + diff;
                updatedItem.sisaBudget = updatedItem.sisa_budget;
            }
        }
        data[parseInt(index, 10)] = updatedItem;
        writeJson(`${type}.json`, data);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

module.exports = router;
