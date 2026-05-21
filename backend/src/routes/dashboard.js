const express = require('express');
const { checkAuth } = require('../middleware/auth');
const { readJson } = require('../utils/json');

const router = express.Router();

// ============================================================
// DASHBOARD PAGE
// ============================================================

router.get('/dashboard', checkAuth, (req, res) => {
    const u = req.session.user;
    if (u.role !== 'administrator' && u.selectedDivision !== 'IT') return res.redirect('/');
    res.sendSPA();
});

// ============================================================
// DASHBOARD DATA
// ============================================================

router.get('/api/data/dashboard', checkAuth, (req, res) => {
    const u = req.session.user;
    if (u.role !== 'administrator' && u.selectedDivision !== 'IT') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const requests = readJson('requests.json');
    const rpRequests = readJson('rp-requests.json');

    // --- Amount Parsers ---
    const parseItemAmount = (items) => {
        if (!Array.isArray(items)) return 0;
        return items.reduce((sum, item) => {
            const raw = Array.isArray(item.amount) ? item.amount[0] : item.amount;
            return sum + (parseInt(String(raw || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0);
        }, 0);
    };

    const parseRpItemAmount = (items) => {
        if (!Array.isArray(items)) return 0;
        return items.reduce((sum, item) => {
            const qty = parseFloat(String(item.qty || '0').replace(/[^0-9.]/g, '')) || 0;
            const val = parseFloat(String(item.estimatedValue || '0').replace(/[^0-9.]/g, '')) || 0;
            return sum + qty * val;
        }, 0);
    };

    // --- FRP Stats ---
    const pending  = requests.filter(r => r.status === 'PENDING');
    const approved = requests.filter(r => r.status === 'APPROVED');
    const rejected = requests.filter(r => r.status === 'REJECTED');

    const companies = [...new Set(requests.map(r => r.companyName || 'Unknown'))].sort();
    const byCompany = companies.map(name => {
        const reqs = requests.filter(r => r.companyName === name);
        return {
            name,
            total: reqs.length,
            pending:  reqs.filter(r => r.status === 'PENDING').length,
            approved: reqs.filter(r => r.status === 'APPROVED').length,
            rejected: reqs.filter(r => r.status === 'REJECTED').length,
            approvedAmount: reqs.filter(r => r.status === 'APPROVED').reduce((s, r) => s + parseItemAmount(r.items), 0),
        };
    });

    const recent = [...requests]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 10)
        .map(r => ({
            id: r.id, frpNo: r.frpNo, vendor: r.vendor, companyName: r.companyName,
            divisi: r.divisi, status: r.status, totalAmount: parseItemAmount(r.items),
            tanggalFrp: r.tanggalFrp, dimintaOleh: r.dimintaOleh, createdAt: r.createdAt,
        }));

    // --- Monthly Trend (last 6 months) ---
    const now = new Date();
    const monthly = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d),
            approved: 0, pending: 0, rejected: 0,
        };
    });
    requests.forEach(r => {
        if (!r.createdAt) return;
        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const m = monthly.find(x => x.key === key);
        if (m) {
            if (r.status === 'APPROVED') m.approved++;
            else if (r.status === 'PENDING') m.pending++;
            else if (r.status === 'REJECTED') m.rejected++;
        }
    });

    // --- Top Vendors ---
    const vendorMap = {};
    approved.forEach(r => {
        const v = r.vendor || 'Unknown';
        vendorMap[v] = (vendorMap[v] || 0) + parseItemAmount(r.items);
    });
    const topVendors = Object.entries(vendorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

    // --- By Division ---
    const divisiMap = {};
    requests.forEach(r => {
        const d = r.divisi || 'Unknown';
        if (!divisiMap[d]) divisiMap[d] = { pending: 0, approved: 0, rejected: 0, approvedAmount: 0, pendingAmount: 0 };
        if (r.status === 'PENDING')        { divisiMap[d].pending++;  divisiMap[d].pendingAmount  += parseItemAmount(r.items); }
        else if (r.status === 'APPROVED')  { divisiMap[d].approved++; divisiMap[d].approvedAmount += parseItemAmount(r.items); }
        else if (r.status === 'REJECTED')    divisiMap[d].rejected++;
    });
    const byDivisi = Object.entries(divisiMap)
        .map(([name, d]) => ({ name, ...d, total: d.pending + d.approved + d.rejected }))
        .sort((a, b) => b.approvedAmount - a.approvedAmount);

    // --- RP Stats ---
    const rpPendingMgr       = rpRequests.filter(r => r.status === 'PENDING_MANAGER');
    const rpPendingProc      = rpRequests.filter(r => r.status === 'PENDING_PROCESS');
    const rpPendingProcApproval = rpRequests.filter(r => r.status === 'PENDING_PROCESS_APPROVAL');
    const rpApproved         = rpRequests.filter(r => r.status === 'APPROVED');
    const rpRejected         = rpRequests.filter(r => r.status === 'REJECTED');
    const rpCreatedFrp       = rpRequests.filter(r => r.status === 'CREATED_FRP');

    const rpRecent = [...rpRequests]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 10)
        .map(r => ({
            id: r.id, rpNo: r.rpNo, companyName: r.companyName, divisi: r.divisi,
            dibuatOleh: r.dibuatOleh, diprosesOleh: r.diprosesOleh,
            kategoriPembelian: r.kategoriPembelian, vendorSuggestion: r.vendorSuggestion,
            status: r.status, totalAmount: parseRpItemAmount(r.items),
            tanggalDibutuhkan: r.tanggalDibutuhkan, createdAt: r.createdAt,
        }));

    const rpDivisiMap = {};
    rpRequests.forEach(r => {
        const d = r.divisi || 'Unknown';
        if (!rpDivisiMap[d]) rpDivisiMap[d] = { pendingManager: 0, pendingProcess: 0, approved: 0, rejected: 0, createdFrp: 0, approvedAmount: 0, pendingAmount: 0 };
        if (r.status === 'PENDING_MANAGER')          { rpDivisiMap[d].pendingManager++; rpDivisiMap[d].pendingAmount  += parseRpItemAmount(r.items); }
        else if (r.status === 'PENDING_PROCESS')     { rpDivisiMap[d].pendingProcess++; rpDivisiMap[d].pendingAmount  += parseRpItemAmount(r.items); }
        else if (r.status === 'PENDING_PROCESS_APPROVAL') { rpDivisiMap[d].pendingProcess++; rpDivisiMap[d].pendingAmount += parseRpItemAmount(r.items); }
        else if (r.status === 'APPROVED')            { rpDivisiMap[d].approved++;       rpDivisiMap[d].approvedAmount += parseRpItemAmount(r.items); }
        else if (r.status === 'CREATED_FRP')         { rpDivisiMap[d].createdFrp++;     rpDivisiMap[d].approvedAmount += parseRpItemAmount(r.items); }
        else if (r.status === 'REJECTED')              rpDivisiMap[d].rejected++;
    });
    const rpByDivisi = Object.entries(rpDivisiMap)
        .map(([name, d]) => ({ name, ...d, total: d.pendingManager + d.pendingProcess + d.approved + d.rejected + d.createdFrp }))
        .sort((a, b) => b.total - a.total);

    res.json({
        stats: {
            total: requests.length,
            pending: pending.length,
            approved: approved.length,
            rejected: rejected.length,
            pendingAmount:  pending.reduce((s, r)  => s + parseItemAmount(r.items), 0),
            approvedAmount: approved.reduce((s, r) => s + parseItemAmount(r.items), 0),
            rejectedAmount: rejected.reduce((s, r) => s + parseItemAmount(r.items), 0),
        },
        rpStats: {
            total: rpRequests.length,
            pendingManager: rpPendingMgr.length,
            pendingProcess: rpPendingProc.length,
            pendingProcessApproval: rpPendingProcApproval.length,
            approved: rpApproved.length,
            rejected: rpRejected.length,
            createdFrp: rpCreatedFrp.length,
            pendingAmount:  [...rpPendingMgr, ...rpPendingProc, ...rpPendingProcApproval].reduce((s, r) => s + parseRpItemAmount(r.items), 0),
            approvedAmount: [...rpApproved, ...rpCreatedFrp].reduce((s, r) => s + parseRpItemAmount(r.items), 0),
            rejectedAmount: rpRejected.reduce((s, r) => s + parseRpItemAmount(r.items), 0),
        },
        byCompany,
        byDivisi,
        recent,
        rpRecent,
        rpByDivisi,
        monthly,
        topVendors,
        user: {
            fullName: u.fullName,
            role: u.role,
            selectedJobLevel: u.selectedJobLevel,
            allAssignments: u.allAssignments || [],
        },
    });
});

module.exports = router;
