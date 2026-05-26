const express = require('express');
const { checkAuth } = require('../middleware/auth');
const { fetchAllFrpRequests, fetchAllRpRequests } = require('../services/dbService');

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

function getUserDepartmentClass(user) {
    return String(
        user.departmentClass ||
        user.selectedDivision ||
        user.departmentName ||
        ''
    ).trim();
}

function isDashboardAllowed(user) {
    const deptClass = getUserDepartmentClass(user).toUpperCase();
    return user.role === 'administrator' || deptClass === 'IT';
}

function parseItemAmount(items) {
    if (!Array.isArray(items)) return 0;

    return items.reduce((sum, item) => {
        const amount = Number(item.amount || 0);
        return sum + amount;
    }, 0);
}

// ============================================================
// DASHBOARD PAGE
// ============================================================

router.get('/dashboard', checkAuth, (req, res) => {
    const u = req.session.user;

    if (!isDashboardAllowed(u)) {
        return res.redirect('/');
    }

    res.sendSPA();
});

// ============================================================
// DASHBOARD DATA
// ============================================================

router.get('/api/data/dashboard', checkAuth, async (req, res) => {
    const u = req.session.user;

    if (!isDashboardAllowed(u)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const requests = await fetchAllFrpRequests();
    const rpRequests = await fetchAllRpRequests();

    // ============================================================
    // FRP STATS
    // ============================================================

    const pending = requests.filter(r => r.status === 'PENDING');
    const approved = requests.filter(r => r.status === 'APPROVED');
    const rejected = requests.filter(r => r.status === 'REJECTED');

    const companies = [...new Set(
        requests.map(r => r.companyName || 'Unknown')
    )].sort();

    const byCompany = companies.map(name => {
        const reqs = requests.filter(r => (r.companyName || 'Unknown') === name);

        return {
            name,
            total: reqs.length,
            pending: reqs.filter(r => r.status === 'PENDING').length,
            approved: reqs.filter(r => r.status === 'APPROVED').length,
            rejected: reqs.filter(r => r.status === 'REJECTED').length,
            approvedAmount: reqs
                .filter(r => r.status === 'APPROVED')
                .reduce((sum, r) => sum + parseItemAmount(r.items), 0),
        };
    });

    const recent = [...requests]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 10)
        .map(r => ({
            id: r.id,
            frpNo: r.frpNo,
            vendor: r.vendor,
            companyId: r.companyId,
            companyCode: r.companyCode,
            companyName: r.companyName,

            departmentId: r.departmentId,
            departmentName: r.departmentName,
            departmentClass: r.departmentClass,
            departmentCode: r.departmentCode,

            status: r.status,
            totalAmount: parseItemAmount(r.items),
            frpDate: r.frpDate,
            requestedBy: r.requestedBy,
            createdAt: r.createdAt,
        }));

    // --- Monthly Trend (last 6 months)
    const now = new Date();

    const monthly = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);

        return {
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d),
            approved: 0,
            pending: 0,
            rejected: 0,
        };
    });

    requests.forEach(r => {
        if (!r.createdAt) return;

        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const month = monthly.find(item => item.key === key);

        if (!month) return;

        if (r.status === 'APPROVED') month.approved++;
        else if (r.status === 'PENDING') month.pending++;
        else if (r.status === 'REJECTED') month.rejected++;
    });

    // --- Top Vendors
    const vendorMap = {};

    approved.forEach(r => {
        const vendor = r.vendor || 'Unknown';
        vendorMap[vendor] = (vendorMap[vendor] || 0) + parseItemAmount(r.items);
    });

    const topVendors = Object.entries(vendorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

    // --- By Department
    const departmentMap = {};

    requests.forEach(r => {
        const name = r.departmentClass || r.departmentName || 'Unknown';

        if (!departmentMap[name]) {
            departmentMap[name] = {
                pending: 0,
                approved: 0,
                rejected: 0,
                approvedAmount: 0,
                pendingAmount: 0,
            };
        }

        if (r.status === 'PENDING') {
            departmentMap[name].pending++;
            departmentMap[name].pendingAmount += parseItemAmount(r.items);
        } else if (r.status === 'APPROVED') {
            departmentMap[name].approved++;
            departmentMap[name].approvedAmount += parseItemAmount(r.items);
        } else if (r.status === 'REJECTED') {
            departmentMap[name].rejected++;
        }
    });

    const byDepartment = Object.entries(departmentMap)
        .map(([name, data]) => ({
            name,
            ...data,
            total: data.pending + data.approved + data.rejected,
        }))
        .sort((a, b) => b.approvedAmount - a.approvedAmount);

    // ============================================================
    // RP STATS
    // ============================================================

    const rpPendingManager = rpRequests.filter(r => r.status === 'waiting_manager');
    const rpPendingProcess = rpRequests.filter(r => r.status === 'division_review');
    const rpPendingFinalReview = rpRequests.filter(r => r.status === 'final_review');
    const rpApproved = rpRequests.filter(r => r.status === 'approved');
    const rpRejected = rpRequests.filter(r => r.status === 'REJECTED');
    const rpCreatedFrp = rpRequests.filter(r => r.status === 'CREATED_FRP');

    const rpRecent = [...rpRequests]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 10)
        .map(r => ({
            id: r.id,
            rpNo: r.rpNo,
            companyId: r.companyId,
            companyCode: r.companyCode,
            companyName: r.companyName,

            departmentId: r.departmentId,
            departmentName: r.departmentName,
            departmentClass: r.departmentClass,
            departmentCode: r.departmentCode,

            requestedBy: r.requestedBy,
            processedByDepartment: r.processedByDepartment,
            purchaseCategory: r.purchaseCategory,
            vendorSuggestion: r.vendorSuggestion,
            status: r.status,
            totalAmount: parseItemAmount(r.items),
            requiredDate: r.requiredDate,
            createdAt: r.createdAt,
        }));

    const rpDepartmentMap = {};

    rpRequests.forEach(r => {
        const name = r.departmentClass || r.departmentName || 'Unknown';

        if (!rpDepartmentMap[name]) {
            rpDepartmentMap[name] = {
                pendingManager: 0,
                pendingProcess: 0,
                pendingFinalReview: 0,
                approved: 0,
                rejected: 0,
                createdFrp: 0,
                approvedAmount: 0,
                pendingAmount: 0,
            };
        }

        const amount = parseItemAmount(r.items);

        if (r.status === 'waiting_manager') {
            rpDepartmentMap[name].pendingManager++;
            rpDepartmentMap[name].pendingAmount += amount;
        } else if (r.status === 'division_review') {
            rpDepartmentMap[name].pendingProcess++;
            rpDepartmentMap[name].pendingAmount += amount;
        } else if (r.status === 'final_review') {
            rpDepartmentMap[name].pendingFinalReview++;
            rpDepartmentMap[name].pendingAmount += amount;
        } else if (r.status === 'approved') {
            rpDepartmentMap[name].approved++;
            rpDepartmentMap[name].approvedAmount += amount;
        } else if (r.status === 'CREATED_FRP') {
            rpDepartmentMap[name].createdFrp++;
            rpDepartmentMap[name].approvedAmount += amount;
        } else if (r.status === 'REJECTED') {
            rpDepartmentMap[name].rejected++;
        }
    });

    const rpByDepartment = Object.entries(rpDepartmentMap)
        .map(([name, data]) => ({
            name,
            ...data,
            total:
                data.pendingManager +
                data.pendingProcess +
                data.pendingFinalReview +
                data.approved +
                data.rejected +
                data.createdFrp,
        }))
        .sort((a, b) => b.total - a.total);

    res.json({
        stats: {
            total: requests.length,
            pending: pending.length,
            approved: approved.length,
            rejected: rejected.length,
            pendingAmount: pending.reduce((sum, r) => sum + parseItemAmount(r.items), 0),
            approvedAmount: approved.reduce((sum, r) => sum + parseItemAmount(r.items), 0),
            rejectedAmount: rejected.reduce((sum, r) => sum + parseItemAmount(r.items), 0),
        },

        rpStats: {
            total: rpRequests.length,
            pendingManager: rpPendingManager.length,
            pendingProcess: rpPendingProcess.length,
            pendingFinalReview: rpPendingFinalReview.length,

            // backward-compatible alias kalau FE lama masih baca ini
            pendingProcessApproval: rpPendingFinalReview.length,

            approved: rpApproved.length,
            rejected: rpRejected.length,
            createdFrp: rpCreatedFrp.length,

            pendingAmount: [
                ...rpPendingManager,
                ...rpPendingProcess,
                ...rpPendingFinalReview,
            ].reduce((sum, r) => sum + parseItemAmount(r.items), 0),

            approvedAmount: [
                ...rpApproved,
                ...rpCreatedFrp,
            ].reduce((sum, r) => sum + parseItemAmount(r.items), 0),

            rejectedAmount: rpRejected.reduce((sum, r) => sum + parseItemAmount(r.items), 0),
        },

        byCompany,

        // new naming
        byDepartment,
        rpByDepartment,

        // backward-compatible alias
        byDivisi: byDepartment,
        rpByDivisi: rpByDepartment,

        recent,
        rpRecent,
        monthly,
        topVendors,

        user: {
            id: u.id,
            username: u.username,
            fullName: u.fullName,
            role: u.role,

            companyId: u.companyId,
            companyCode: u.companyCode,
            companyName: u.companyName,

            departmentId: u.departmentId,
            departmentName: u.departmentName,
            departmentClass: u.departmentClass,
            departmentCode: u.departmentCode,

            jobLevelName: u.jobLevelName,
            jobLevelRank: u.jobLevelRank,

            allAssignments: u.allAssignments || [],
        },
    });
});

module.exports = router;