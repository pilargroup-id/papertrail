const express = require('express');
const puppeteer = require('puppeteer');
const { checkAuth, checkLaporan } = require('../middleware/auth');
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

function isLaporanAllowed(user) {
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

function formatRp(n) {
    return 'IDR ' + Math.round(Number(n || 0))
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDt(v) {
    if (!v) return '-';

    try {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(v));
    } catch {
        return v;
    }
}

// ============================================================
// LAPORAN PAGE & DATA
// ============================================================

router.get('/laporan', checkAuth, (req, res) => {
    const u = req.session.user;

    if (!isLaporanAllowed(u)) {
        return res.redirect('/');
    }

    res.sendSPA();
});

router.get('/api/data/laporan', checkAuth, checkLaporan, async (req, res) => {
    try {
        const u = req.session.user;
        const requests = await fetchAllFrpRequests();

        const companies = [...new Set(
            requests.map(r => r.companyName).filter(Boolean)
        )].sort();

        const departments = [...new Set(
            requests
                .map(r => r.departmentClass || r.departmentName)
                .filter(Boolean)
        )].sort();

        const mapped = requests.map(r => ({
            id: r.id,
            frpNo: r.frpNo,
            frpDate: r.frpDate,
            requestedBy: r.requestedBy,

            companyId: r.companyId,
            companyCode: r.companyCode,
            companyName: r.companyName,

            departmentId: r.departmentId,
            departmentName: r.departmentName,
            departmentClass: r.departmentClass,
            departmentCode: r.departmentCode,

            vendor: r.vendor,
            totalAmount: parseItemAmount(r.items),
            status: r.status,

            approvedBy: r.approvedBy,
            approvedAt: r.approvedAt,
            approvedByActual: r.approvedByActual,

            frpDescription: r.frpDescription,
            items: r.items || [],
            createdAt: r.createdAt,
        })).sort((a, b) => new Date(b.frpDate || 0) - new Date(a.frpDate || 0));

        res.json({
            requests: mapped,
            companies,
            departments,

            // alias sementara kalau FE masih pakai nama divisions
            divisions: departments,

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
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/data/laporan-rp', checkAuth, checkLaporan, async (req, res) => {
    try {
        const u = req.session.user;
        const rpRequests = await fetchAllRpRequests();

        const departments = [...new Set(
            rpRequests
                .map(r => r.departmentClass || r.departmentName)
                .filter(Boolean)
        )].sort();

        const processDepartments = [...new Set(
            rpRequests
                .map(r => r.processedByDepartment)
                .filter(Boolean)
        )].sort();

        const mapped = rpRequests.map(r => ({
            id: r.id,
            rpNo: r.rpNo,
            status: r.status,

            companyId: r.companyId,
            companyCode: r.companyCode,
            companyName: r.companyName,

            departmentId: r.departmentId,
            departmentName: r.departmentName,
            departmentClass: r.departmentClass,
            departmentCode: r.departmentCode,

            requestedBy: r.requestedBy,
            purchaseCategory: r.purchaseCategory,
            description: r.description,

            processedByDepartment: r.processedByDepartment,
            requiredDate: r.requiredDate,
            vendorSuggestion: r.vendorSuggestion,
            receiverPic: r.receiverPic,

            totalAmount: parseItemAmount(r.items),
            items: r.items || [],

            createdAt: r.createdAt,
            createdBy: r.createdBy,
            createdByUserId: r.createdByUserId,
            createdByUserName: r.createdByUserName,

            managerApprovedBy: r.managerApprovedBy,
            managerApprovedAt: r.managerApprovedAt,

            processUpdatedBy: r.processUpdatedBy,
            processUpdatedAt: r.processUpdatedAt,
            processManagerApprovedBy: r.processManagerApprovedBy,
            processManagerApprovedAt: r.processManagerApprovedAt,

            rejectedBy: r.rejectedBy,
            rejectedAt: r.rejectedAt,
            rejectedReason: r.rejectedReason,
            rejectedStage: r.rejectedStage,
        })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.json({
            requests: mapped,
            departments,
            processDepartments,

            // alias sementara kalau FE masih pakai nama divisions
            divisions: departments,

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
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// LAPORAN PDF EXPORT FRP
// ============================================================

router.post('/api/laporan/pdf', checkAuth, checkLaporan, async (req, res) => {
    try {
        const { requests = [], meta = {} } = req.body;

        const rows = requests.map((r, i) => {
            const statusColor = r.status === 'APPROVED'
                ? '#166534'
                : r.status === 'REJECTED'
                    ? '#991b1b'
                    : '#854d0e';

            const statusBg = r.status === 'APPROVED'
                ? '#bbf7d0'
                : r.status === 'REJECTED'
                    ? '#fecaca'
                    : '#fef08a';

            return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
              <td>${r.frpNo || ''}</td>
              <td>${formatDt(r.frpDate)}</td>
              <td>${r.requestedBy || ''}</td>
              <td>${r.departmentClass || r.departmentName || ''}</td>
              <td>${r.companyName || ''}</td>
              <td>${r.vendor || ''}</td>
              <td style="font-family:monospace;font-weight:700;text-align:right">${formatRp(r.totalAmount)}</td>
              <td style="text-align:center">
                <span style="background:${statusBg};color:${statusColor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">
                  ${r.status || ''}
                </span>
              </td>
              <td>${r.approvedBy || '-'}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 20px; }
    h1 { font-size: 18px; color: #163a6b; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 11px; margin-bottom: 16px; }
    .meta span { margin-right: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #163a6b; color: white; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tfoot td { background: #f1f5f9; font-weight: bold; border-top: 2px solid #163a6b; }
    .footer { margin-top: 16px; color: #94a3b8; font-size: 10px; text-align: right; }
  </style>
</head>
<body>
  <h1>Laporan FRP</h1>

  <div class="meta">
    <span>Status: <b>${meta.status || 'Semua'}</b></span>
    <span>Perusahaan: <b>${meta.company || 'Semua'}</b></span>
    <span>Department: <b>${meta.department || meta.division || meta.divisi || 'Semua'}</b></span>
    ${meta.from ? `<span>Dari: <b>${meta.from}</b></span>` : ''}
    ${meta.to ? `<span>Sampai: <b>${meta.to}</b></span>` : ''}
    <span>Total Data: <b>${meta.count || requests.length}</b></span>
  </div>

  <table>
    <thead>
      <tr>
        <th>No FRP</th>
        <th>Tanggal</th>
        <th>Pemohon</th>
        <th>Department</th>
        <th>Perusahaan</th>
        <th>Vendor</th>
        <th>Total</th>
        <th>Status</th>
        <th>Disetujui Oleh</th>
      </tr>
    </thead>

    <tbody>${rows}</tbody>

    <tfoot>
      <tr>
        <td colspan="6">Total (${requests.length} data)</td>
        <td style="font-family:monospace;text-align:right">${formatRp(meta.totalAmount || 0)}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    Dicetak: ${new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date())}
  </div>
</body>
</html>`;

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: {
                top: '12mm',
                right: '10mm',
                bottom: '12mm',
                left: '10mm',
            },
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="laporan-frp-${Date.now()}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({
            error: 'Gagal generate PDF',
            details: error.message,
        });
    }
});

module.exports = router;