const express = require('express');
const { checkAuth, checkIT } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/json');
const { getCompanies, getCompanyId, getDeptId, getDepartmentRows } = require('../services/dbService');
const db = require('../../db');

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
    const VALID_TYPES = ['vendors', 'budgets'];
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    const u = req.session.user;
    try {
        let listData = [];
        if (type === 'budgets') {
            const [rows] = await db.query(`
                SELECT b.id, b.company_id, b.departement_id, b.class, b.description, b.type, b.total_amount, b.budget_remaining,
                       c.name AS company_name, d.name AS department_name, dc.class AS class_name
                FROM master_budgets b
                LEFT JOIN master_companies c ON b.company_id = c.id
                LEFT JOIN master_departments d ON b.departement_id = d.id
                LEFT JOIN master_departments dc ON b.class = dc.id
            `);
            listData = rows.map((row, index) => ({
                id: row.id,
                company_id: row.company_id,
                companyId: row.company_id,
                department_id: row.departement_id,
                departmentId: row.departement_id,
                class_id: row.class,
                class: row.class_name || row.class,
                description: row.description,
                type: row.type,
                total_amount: row.total_amount,
                totalAmount: row.total_amount,
                sisa_budget: row.budget_remaining,
                sisaBudget: row.budget_remaining,
                company: row.company_name,
                department: row.department_name,
                originalIndex: index
            }));
        } else {
            listData = readJson(`${type}.json`).map((item, index) => ({ ...item, originalIndex: index }));
        }
        const [companies, departments] = await Promise.all([
            getCompanies(),
            getDepartmentRows()
        ]);
        res.json({
            activeType: type,
            listData,
            companies,
            departments,
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
    const VALID_TYPES = ['vendors', 'budgets'];
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    try {
        if (type === 'budgets') {
            let newItem = req.body;
            let totalAmount = 0;
            if (newItem.totalAmount) {
                totalAmount = parseInt(String(newItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
            }
            
            const companyId = await getCompanyId(newItem.company);
            const deptId = await getDeptId(newItem.department, newItem.company);
            const classId = await getDeptId(newItem.class, newItem.company);
            
            await db.query(`
                INSERT INTO master_budgets (id, company_id, departement_id, class, description, type, total_amount, budget_remaining)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                newItem.id,
                companyId,
                deptId,
                classId ? String(classId) : newItem.class,
                newItem.description,
                newItem.type,
                totalAmount,
                totalAmount
            ]);
            res.json({ success: true });
        } else {
            const data = readJson(`${type}.json`);
            let newItem = req.body;
            data.push(newItem);
            writeJson(`${type}.json`, data);
            res.json({ success: true });
        }
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ============================================================
// ADMIN DELETE
// ============================================================

router.post('/api/admin/:type/delete/:index', checkAuth, checkIT, async (req, res) => {
    const { type, index } = req.params;
    const VALID_TYPES = ['vendors', 'budgets'];
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    try {
        if (type === 'budgets') {
            const [rows] = await db.query(`
                SELECT id FROM master_budgets
            `);
            const targetId = rows[parseInt(index, 10)]?.id;
            if (!targetId) {
                return res.status(400).json({ error: 'Item not found' });
            }
            await db.query(`
                DELETE FROM master_budgets WHERE id = ?
            `, [targetId]);
            res.json({ success: true });
        } else {
            const data = readJson(`${type}.json`);
            data.splice(parseInt(index, 10), 1);
            writeJson(`${type}.json`, data);
            res.json({ success: true });
        }
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ============================================================
// ADMIN EDIT
// ============================================================

router.post('/api/admin/:type/edit/:index', checkAuth, checkIT, async (req, res) => {
    const { type, index } = req.params;
    const VALID_TYPES = ['vendors', 'budgets'];
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    try {
        if (type === 'budgets') {
            const [rows] = await db.query(`
                SELECT id, total_amount, budget_remaining FROM master_budgets
            `);
            const oldItem = rows[parseInt(index, 10)];
            if (!oldItem) {
                return res.status(400).json({ error: 'Item not found' });
            }
            
            let updatedItem = req.body;
            let totalAmount = 0;
            if (updatedItem.totalAmount !== undefined) {
                totalAmount = parseInt(String(updatedItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
            } else {
                totalAmount = oldItem.total_amount;
            }
            
            const diff = totalAmount - oldItem.total_amount;
            const updatedRemaining = oldItem.budget_remaining + diff;
            
            const companyId = await getCompanyId(updatedItem.company);
            const deptId = await getDeptId(updatedItem.department, updatedItem.company);
            const classId = await getDeptId(updatedItem.class, updatedItem.company);
            
            await db.query(`
                UPDATE master_budgets SET
                    id = ?,
                    company_id = ?,
                    departement_id = ?,
                    class = ?,
                    description = ?,
                    type = ?,
                    total_amount = ?,
                    budget_remaining = ?
                WHERE id = ?
            `, [
                updatedItem.id,
                companyId,
                deptId,
                classId ? String(classId) : updatedItem.class,
                updatedItem.description,
                updatedItem.type,
                totalAmount,
                updatedRemaining,
                oldItem.id
            ]);
            res.json({ success: true });
        } else {
            const data = readJson(`${type}.json`);
            let updatedItem = req.body;
            data[parseInt(index, 10)] = updatedItem;
            writeJson(`${type}.json`, data);
            res.json({ success: true });
        }
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

module.exports = router;
