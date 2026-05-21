const express = require('express');
const puppeteer = require('puppeteer');
const { checkAuth, checkLaporan } = require('../middleware/auth');
const { readJson } = require('../utils/json');

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

function parseItemAmount(items) {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
        const raw = Array.isArray(item.amount) ? item.amount[0] : item.amount;
        return sum + (parseInt(String(raw || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0);
    }, 0);
}

// ============================================================
// LAPORAN PAGE & DATA
// ============================================================

router.get('/laporan', checkAuth, (req, res) => {
    const u = req.session.user;
    const isIT = (u.allAssignments || []).some(a => a.class === 'IT');
    if (u.role !== 'administrator' && !isIT) return res.redirect('/');
    res.sendSPA();
});

router.get('/api/data/laporan', checkAuth, checkLaporan, (req, res) => {
    const u = req.session.user;
    const requests = readJson('requests.json');

    const companies = [...new Set(requests.map(r => r.companyName).filter(Boolean))].sort();
    const divisions = [...new Set(requests.map(r => r.divisi).filter(Boolean))].sort();

    const mapped = requests.map(r => ({
        id: r.id,
        frpNo: r.frpNo,
        tanggalFrp: r.tanggalFrp,
        dimintaOleh: r.dimintaOleh,
        divisi: r.divisi,
        companyName: r.companyName,
        vendor: r.vendor,
        totalAmount: parseItemAmount(r.items),
        status: r.status,
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt,
        keterangan: r.keterangan,
        attachLink: r.attachLink,
    })).sort((a, b) => new Date(b.tanggalFrp || 0) - new Date(a.tanggalFrp || 0));

    res.json({
        requests: mapped,
        companies,
        divisions,
        user: {
            fullName: u.fullName,
            role: u.role,
            selectedJobLevel: u.selectedJobLevel,
            allAssignments: u.allAssignments || [],
        },
    });
});

router.get('/api/data/laporan-rp', checkAuth, checkLaporan, (req, res) => {
    const u = req.session.user;
    const rpRequests = readJson('rp-requests.json');

    const parseRpItemAmount = (items) => {
        if (!Array.isArray(items)) return 0;
        return items.reduce((sum, item) => {
            const qty = parseFloat(String(item.qty || '0').replace(/[^0-9.]/g, '')) || 0;
            const val = parseFloat(String(item.estimatedValue || '0').replace(/[^0-9.]/g, '')) || 0;
            return sum + qty * val;
        }, 0);
    };

    const divisions = [...new Set(rpRequests.map(r => r.divisi).filter(Boolean))].sort();

    const mapped = rpRequests.map(r => ({
        id: r.id,
        rpNo: r.rpNo,
        createdAt: r.createdAt,
        tanggalDibutuhkan: r.tanggalDibutuhkan,
        dibuatOleh: r.dibuatOleh,
        divisi: r.divisi,
        companyName: r.companyName,
        diprosesOleh: r.diprosesOleh,
        kategoriPembelian: r.kategoriPembelian,
        vendorSuggestion: r.vendorSuggestion,
        totalAmount: parseRpItemAmount(r.items),
        status: r.status,
    })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
        requests: mapped,
        divisions,
        user: {
            fullName: u.fullName,
            role: u.role,
            selectedJobLevel: u.selectedJobLevel,
            allAssignments: u.allAssignments || [],
        },
    });
});

// ============================================================
// LAPORAN PDF EXPORT
// ============================================================

router.post('/api/laporan/pdf', checkAuth, checkLaporan, async (req, res) => {
    try {
        const { requests = [], meta = {} } = req.body;

        const formatRp = (n) =>
            'IDR ' + Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const formatDt = (v) => {
            if (!v) return '-';
            try {
                return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v));
            } catch { return v; }
        };

        const rows = requests.map((r, i) => {
            const statusColor = r.status === 'APPROVED' ? '#166534' : r.status === 'REJECTED' ? '#991b1b' : '#854d0e';
            const statusBg   = r.status === 'APPROVED' ? '#bbf7d0' : r.status === 'REJECTED' ? '#fecaca' : '#fef08a';
            return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
              <td>${r.frpNo || ''}</td>
              <td>${formatDt(r.tanggalFrp)}</td>
              <td>${r.dimintaOleh || ''}</td>
              <td>${r.divisi || ''}</td>
              <td>${r.companyName || ''}</td>
              <td>${r.vendor || ''}</td>
              <td style="font-family:monospace;font-weight:700;text-align:right">${formatRp(r.totalAmount)}</td>
              <td style="text-align:center"><span style="background:${statusBg};color:${statusColor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${r.status}</span></td>
              <td>${r.approvedBy || '-'}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
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
        </style></head><body>
        <h1>Laporan FRP</h1>
        <div class="meta">
          <span>Status: <b>${meta.status || 'Semua'}</b></span>
          <span>Perusahaan: <b>${meta.company || 'Semua'}</b></span>
          <span>Divisi: <b>${meta.divisi || 'Semua'}</b></span>
          ${meta.from ? `<span>Dari: <b>${meta.from}</b></span>` : ''}
          ${meta.to ? `<span>Sampai: <b>${meta.to}</b></span>` : ''}
          <span>Total Data: <b>${meta.count || requests.length}</b></span>
        </div>
        <table>
          <thead><tr>
            <th>No FRP</th><th>Tanggal</th><th>Pemohon</th><th>Divisi</th>
            <th>Perusahaan</th><th>Vendor</th><th>Total</th><th>Status</th><th>Disetujui Oleh</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="6">Total (${requests.length} data)</td>
            <td style="font-family:monospace;text-align:right">${formatRp(meta.totalAmount || 0)}</td>
            <td colspan="2"></td>
          </tr></tfoot>
        </table>
        <div class="footer">Dicetak: ${new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</div>
        </body></html>`;

        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
        });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="laporan-frp-${Date.now()}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: 'Gagal generate PDF', details: error.message });
    }
});

module.exports = router;
