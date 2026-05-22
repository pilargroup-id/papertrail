const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { checkAuth } = require('../middleware/auth');
const { readJson } = require('../utils/json');
const { fetchAllRpRequests } = require('../services/dbService');
const { renderPdfDocument } = require('../../renderPdfDocument');
const renderRpPdfDocument = require('../../renderRpPdfDocument');

const router = express.Router();

const pdfPath = path.join(__dirname, '../../generated-pdfs');

// ============================================================
// HISTORY PAGE & DATA
// ============================================================

router.get('/history', checkAuth, (req, res) => res.sendSPA());

router.get('/api/data/history', checkAuth, (req, res) => {
    const u = req.session.user;
    if (!fs.existsSync(pdfPath)) {
        return res.json({
            files: [],
            user: { fullName: u.fullName, role: u.role, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] },
        });
    }
    const files = fs.readdirSync(pdfPath)
        .filter(f => f.endsWith('.pdf'))
        .map(f => {
            const stats = fs.statSync(path.join(pdfPath, f));
            return { name: f, path: `/pdfs/${f}`, date: stats.mtime };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({
        files,
        user: {
            fullName: u.fullName,
            role: u.role,
            selectedJobLevel: u.selectedJobLevel,
            allAssignments: u.allAssignments || [],
        },
    });
});

// ============================================================
// FRP PDF
// ============================================================

router.post('/preview', checkAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderPdfDocument(req.body, true));
});

router.post('/generate-pdf', checkAuth, async (req, res) => {
    try {
        const html = renderPdfDocument(req.body, false);
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });
        await browser.close();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="FRP-${req.body.frpNo || 'DRAFT'}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
});

// ============================================================
// RP PDF
// ============================================================

router.get('/api/rp/:id/preview', checkAuth, async (req, res) => {
    const data = (await fetchAllRpRequests()).find(r => r.id === req.params.id);
    if (!data) return res.status(404).send('Not found');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderRpPdfDocument(data, true));
});

router.get('/api/rp/:id/pdf', checkAuth, async (req, res) => {
    try {
        const data = (await fetchAllRpRequests()).find(r => r.id === req.params.id);
        if (!data) return res.status(404).send('Not found');
        const html = renderRpPdfDocument(data, false);
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });
        await browser.close();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${data.rpNo || 'DRAFT'}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
});

module.exports = router;
