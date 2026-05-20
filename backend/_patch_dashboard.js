const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

const oldBlock = `    res.json({\r
        stats: {\r
            total: requests.length,\r
            pending: pending.length,\r
            approved: approved.length,\r
            rejected: rejected.length,\r
            pendingAmount: pending.reduce((s, r) => s + parseItemAmount(r.items), 0),\r
            approvedAmount: approved.reduce((s, r) => s + parseItemAmount(r.items), 0),\r
            rejectedAmount: rejected.reduce((s, r) => s + parseItemAmount(r.items), 0),\r
        },\r
        byCompany,\r
        byDivisi,\r
        recent,\r
        monthly,\r
        topVendors,\r
        user: { fullName: u.fullName, role: u.role, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }\r
    });\r
});`;

const newBlock = `    // --- RP (Request Purchase) Stats ---\r
    const rpRequests = readJson('rp-requests.json');\r
    const parseRpItemAmount = (items) => {\r
        if (!Array.isArray(items)) return 0;\r
        return items.reduce((sum, item) => {\r
            const qty = parseFloat(String(item.qty || '0').replace(/[^0-9.]/g, '')) || 0;\r
            const val = parseFloat(String(item.estimatedValue || '0').replace(/[^0-9.]/g, '')) || 0;\r
            return sum + qty * val;\r
        }, 0);\r
    };\r
\r
    const rpPendingMgr = rpRequests.filter(r => r.status === 'PENDING_MANAGER');\r
    const rpPendingProc = rpRequests.filter(r => r.status === 'PENDING_PROCESS');\r
    const rpPendingProcApproval = rpRequests.filter(r => r.status === 'PENDING_PROCESS_APPROVAL');\r
    const rpApproved = rpRequests.filter(r => r.status === 'APPROVED');\r
    const rpRejected = rpRequests.filter(r => r.status === 'REJECTED');\r
    const rpCreatedFrp = rpRequests.filter(r => r.status === 'CREATED_FRP');\r
\r
    const rpRecent = [...rpRequests]\r
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))\r
        .slice(0, 10)\r
        .map(r => ({\r
            id: r.id,\r
            rpNo: r.rpNo,\r
            companyName: r.companyName,\r
            divisi: r.divisi,\r
            dibuatOleh: r.dibuatOleh,\r
            diprosesOleh: r.diprosesOleh,\r
            kategoriPembelian: r.kategoriPembelian,\r
            vendorSuggestion: r.vendorSuggestion,\r
            status: r.status,\r
            totalAmount: parseRpItemAmount(r.items),\r
            tanggalDibutuhkan: r.tanggalDibutuhkan,\r
            createdAt: r.createdAt,\r
        }));\r
\r
    const rpDivisiMap = {};\r
    rpRequests.forEach(r => {\r
        const d = r.divisi || 'Unknown';\r
        if (!rpDivisiMap[d]) rpDivisiMap[d] = { pendingManager: 0, pendingProcess: 0, approved: 0, rejected: 0, createdFrp: 0, approvedAmount: 0, pendingAmount: 0 };\r
        if (r.status === 'PENDING_MANAGER') { rpDivisiMap[d].pendingManager++; rpDivisiMap[d].pendingAmount += parseRpItemAmount(r.items); }\r
        else if (r.status === 'PENDING_PROCESS') { rpDivisiMap[d].pendingProcess++; rpDivisiMap[d].pendingAmount += parseRpItemAmount(r.items); }\r
        else if (r.status === 'PENDING_PROCESS_APPROVAL') { rpDivisiMap[d].pendingProcess++; rpDivisiMap[d].pendingAmount += parseRpItemAmount(r.items); }\r
        else if (r.status === 'APPROVED') { rpDivisiMap[d].approved++; rpDivisiMap[d].approvedAmount += parseRpItemAmount(r.items); }\r
        else if (r.status === 'CREATED_FRP') { rpDivisiMap[d].createdFrp++; rpDivisiMap[d].approvedAmount += parseRpItemAmount(r.items); }\r
        else if (r.status === 'REJECTED') rpDivisiMap[d].rejected++;\r
    });\r
    const rpByDivisi = Object.entries(rpDivisiMap)\r
        .map(([name, d]) => ({ name, ...d, total: d.pendingManager + d.pendingProcess + d.approved + d.rejected + d.createdFrp }))\r
        .sort((a, b) => b.total - a.total);\r
\r
    res.json({\r
        stats: {\r
            total: requests.length,\r
            pending: pending.length,\r
            approved: approved.length,\r
            rejected: rejected.length,\r
            pendingAmount: pending.reduce((s, r) => s + parseItemAmount(r.items), 0),\r
            approvedAmount: approved.reduce((s, r) => s + parseItemAmount(r.items), 0),\r
            rejectedAmount: rejected.reduce((s, r) => s + parseItemAmount(r.items), 0),\r
        },\r
        rpStats: {\r
            total: rpRequests.length,\r
            pendingManager: rpPendingMgr.length,\r
            pendingProcess: rpPendingProc.length,\r
            pendingProcessApproval: rpPendingProcApproval.length,\r
            approved: rpApproved.length,\r
            rejected: rpRejected.length,\r
            createdFrp: rpCreatedFrp.length,\r
            pendingAmount: [...rpPendingMgr, ...rpPendingProc, ...rpPendingProcApproval].reduce((s, r) => s + parseRpItemAmount(r.items), 0),\r
            approvedAmount: [...rpApproved, ...rpCreatedFrp].reduce((s, r) => s + parseRpItemAmount(r.items), 0),\r
            rejectedAmount: rpRejected.reduce((s, r) => s + parseRpItemAmount(r.items), 0),\r
        },\r
        byCompany,\r
        byDivisi,\r
        recent,\r
        rpRecent,\r
        rpByDivisi,\r
        monthly,\r
        topVendors,\r
        user: { fullName: u.fullName, role: u.role, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }\r
    });\r
});`;

if (c.includes(oldBlock)) {
    c = c.replace(oldBlock, newBlock);
    fs.writeFileSync('backend/server.js', c);
    console.log('SUCCESS: Dashboard API patched with RP data');
} else {
    console.log('ERROR: Could not find the target block');
}
