const express = require('express');
const crypto = require('crypto');
const db = require('../../db');
const { checkAuth, checkIT } = require('../middleware/auth');

const router = express.Router();

router.get('/api/budgets', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT *
            FROM master_budgets
            WHERE is_active = 1
            ORDER BY department_name ASC, id ASC
        `);

        res.json(rows.map(row => ({
            id: row.id,
            departmentId: row.department_id,
            departmentName: row.department_name || '',
            departmentClass: row.department_class || '',
            departmentCode: row.department_code || '',
            projectName: row.project_name || '',
            budgetType: row.budget_type || '',
            budgetAmount: Number(row.budget_amount || 0),
            budgetUsed: Number(row.budget_used || 0),
            budgetRemaining: Number(row.budget_remaining || 0),
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/budgets', checkAuth, checkIT, async (req, res) => {
    try {
        const {
            id,
            departmentId,
            departmentName,
            departmentClass,
            departmentCode,
            projectName,
            budgetType,
            budgetAmount,
        } = req.body;

        const budgetId = id || crypto.randomUUID();
        const amount = Number(budgetAmount || 0);

        await db.query(`
            INSERT INTO master_budgets (
                id,
                department_id,
                department_name,
                department_class,
                department_code,
                project_name,
                budget_type,
                budget_amount,
                budget_used,
                budget_remaining,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1)
        `, [
            budgetId,
            departmentId || null,
            departmentName || '',
            departmentClass || '',
            departmentCode || '',
            projectName || '',
            budgetType || '',
            amount,
            amount,
        ]);

        res.json({ success: true, id: budgetId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/api/budgets/:id', checkAuth, checkIT, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            departmentId,
            departmentName,
            departmentClass,
            departmentCode,
            projectName,
            budgetType,
            budgetAmount,
            isActive,
        } = req.body;

        const amount = Number(budgetAmount || 0);

        await db.query(`
            UPDATE master_budgets
            SET
                department_id = ?,
                department_name = ?,
                department_class = ?,
                department_code = ?,
                project_name = ?,
                budget_type = ?,
                budget_amount = ?,
                budget_remaining = ? - budget_used,
                is_active = ?
            WHERE id = ?
        `, [
            departmentId || null,
            departmentName || '',
            departmentClass || '',
            departmentCode || '',
            projectName || '',
            budgetType || '',
            amount,
            amount,
            isActive === false ? 0 : 1,
            id,
        ]);

        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/api/budgets/:id', checkAuth, checkIT, async (req, res) => {
    try {
        await db.query(`
            UPDATE master_budgets
            SET is_active = 0
            WHERE id = ?
        `, [req.params.id]);

        res.json({ success: true, id: req.params.id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;