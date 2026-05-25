const express = require('express');
const { checkAuth, checkIT } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/json');
const { getCompanies } = require('../services/dbService');

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
        const listData = readJson(`${type}.json`).map((item, index) => ({ ...item, originalIndex: index }));
        const companies = await getCompanies();
        res.json({
            activeType: type,
            listData,
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
    const VALID_TYPES = ['vendors', 'budgets'];
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    try {
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
    const VALID_TYPES = ['vendors', 'budgets'];
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    try {
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
    const VALID_TYPES = ['vendors', 'budgets'];
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    try {
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
