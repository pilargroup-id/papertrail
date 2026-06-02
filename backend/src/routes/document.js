// ============================================================
// Document Generator Route — /api/document/*
// Diadaptasi dari document-generator-pnm/backend/server.js
// Database: frp_db (tabel: documents)
// ============================================================

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const PizZip  = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { checkAuth } = require('../middleware/auth');
const { frpDb, centralDb } = require('../../db');

const router = express.Router();

// ─── SPA Page Routes ─────────────────────────────────────────
router.get('/document/generate', checkAuth, (req, res) => res.sendSPA());
router.get('/document/riwayat',  checkAuth, (req, res) => res.sendSPA());
router.get('/document/template', checkAuth, (req, res) => res.sendSPA());

// ─── Templates Dir ───────────────────────────────────────────
const templatesDir = path.resolve(__dirname, '../../document-templates');
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, templatesDir),
        filename:    (req, file, cb) => cb(null, file.originalname),
    }),
    fileFilter: (req, file, cb) => {
        if (file.originalname.endsWith('.docx')) cb(null, true);
        else cb(new Error('Hanya file .docx yang diizinkan'));
    },
});

// ─── Helpers ─────────────────────────────────────────────────
function getRomanMonth(dateString) {
    const month = new Date(dateString).getMonth() + 1;
    return ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][month];
}

// ─── GET /api/document/master-departments ────────────────────
// Ambil daftar department dari pilargroup (untuk dropdown divisi)
router.get('/api/document/master-departments', checkAuth, async (req, res) => {
    const company = req.query.company || 'PNM';
    try {
        const [rows] = await centralDb.query(
            'SELECT id, name, code FROM master_departments WHERE company = ? ORDER BY name',
            [company],
        );
        res.json({ departments: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/document/templates ─────────────────────────────
router.get('/api/document/templates', checkAuth, (req, res) => {
    fs.readdir(templatesDir, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(files.filter(f => f.endsWith('.docx') && !f.startsWith('~$')));
    });
});

// ─── POST /api/document/templates/upload ─────────────────────
router.post('/api/document/templates/upload', checkAuth, upload.single('template'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    res.json({ message: 'Template berhasil diupload', name: req.file.originalname });
});

// ─── DELETE /api/document/templates/:name ────────────────────
router.delete('/api/document/templates/:name', checkAuth, (req, res) => {
    const name = path.basename(req.params.name);
    if (!name.endsWith('.docx')) return res.status(400).json({ error: 'Nama file tidak valid' });
    const filePath = path.join(templatesDir, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Template tidak ditemukan' });
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Template berhasil dihapus' });
    });
});

// ─── GET /api/document/documents ─────────────────────────────
router.get('/api/document/documents', checkAuth, async (req, res) => {
    try {
        const [rows] = await frpDb.query(
            'SELECT * FROM documents ORDER BY id DESC',
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/document/generate ─────────────────────────────
// Buat nomor dokumen baru
router.post('/api/document/generate', checkAuth, async (req, res) => {
    const {
        company, judul_dokumen, division, internal_external,
        doc_date, klasifikasi, perihal, signed_by, keterangan,
        link_document, template_name,
    } = req.body;

    // user_name dari session (bukan dari body)
    const user_name = req.session.user?.fullName || req.session.user?.name || '';
    const user_id   = req.session.user?.id || null;

    if (!company || !doc_date) {
        return res.status(400).json({ error: 'company dan doc_date wajib diisi' });
    }

    const year       = new Date(doc_date).getFullYear();
    const romanMonth = getRomanMonth(doc_date);

    try {
        // Ambil department code dari pilargroup
        const [[deptRow]] = await centralDb.query(
            'SELECT code FROM master_departments WHERE name = ? AND company = ?',
            [division, company],
        );
        if (!deptRow) return res.status(400).json({ error: 'Department tidak ditemukan' });

        const divCode = deptRow.code;

        // Running number per company per tahun
        const [[lastDoc]] = await frpDb.query(
            `SELECT running_number FROM documents
             WHERE company = ? AND YEAR(doc_date) = ?
             ORDER BY running_number DESC LIMIT 1`,
            [company, year],
        );
        const nextNumber   = (lastDoc?.running_number ?? 0) + 1;
        const paddedNumber = String(nextNumber).padStart(4, '0');

        let doc_number;
        if (company === 'PNM')      doc_number = `${paddedNumber}/PNM-${divCode}/${romanMonth}/${year}`;
        else if (company === 'PKS') doc_number = `${paddedNumber}/PKS/${romanMonth}/${year}`;
        else if (company === 'PKP') doc_number = `${paddedNumber}/PKP/${romanMonth}/${year}`;
        else return res.status(400).json({ error: 'Company tidak valid' });

        const [result] = await frpDb.query(
            `INSERT INTO documents
              (company, user_id, running_number, doc_number, user_name, division,
               internal_external, doc_date, klasifikasi, perihal, judul_dokumen,
               signed_by, keterangan, link_document, template_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [company, user_id, nextNumber, doc_number, user_name, division,
             internal_external, doc_date, klasifikasi, perihal, judul_dokumen,
             signed_by, keterangan, link_document, template_name],
        );

        const [[newDoc]] = await frpDb.query(
            'SELECT * FROM documents WHERE id = ?', [result.insertId],
        );
        res.json(newDoc);
    } catch (err) {
        console.error('[Document Generate Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/document/documents/:id ─────────────────────────
router.put('/api/document/documents/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    const {
        division, internal_external, doc_date, klasifikasi,
        perihal, signed_by, keterangan, link_document, judul_dokumen, template_name,
    } = req.body;

    try {
        await frpDb.query(
            `UPDATE documents SET
              division = ?, internal_external = ?, doc_date = ?, klasifikasi = ?,
              perihal = ?, signed_by = ?, keterangan = ?, link_document = ?,
              judul_dokumen = ?, template_name = ?
             WHERE id = ?`,
            [division, internal_external, doc_date, klasifikasi,
             perihal, signed_by, keterangan, link_document, judul_dokumen, template_name, id],
        );

        const [[updatedDoc]] = await frpDb.query(
            'SELECT * FROM documents WHERE id = ?', [id],
        );
        res.json(updatedDoc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/document/download ─────────────────────────────
router.post('/api/document/download', checkAuth, async (req, res) => {
    const { doc_number } = req.body;

    try {
        const [[doc]] = await frpDb.query(
            'SELECT * FROM documents WHERE doc_number = ?', [doc_number],
        );
        if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

        const activeTemplate = doc.template_name || 'template.docx';
        const templatePath   = path.resolve(templatesDir, activeTemplate);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({
                error: `File template '${activeTemplate}' belum ditambahkan ke folder document-templates`,
            });
        }

        const content     = fs.readFileSync(templatePath, 'binary');
        const zip         = new PizZip(content);
        const docTemplate = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Format doc_date untuk tampilan
        let formattedDate = doc.doc_date;
        try {
            formattedDate = new Intl.DateTimeFormat('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric'
            }).format(new Date(doc.doc_date + 'T00:00:00'));
        } catch {}

        docTemplate.render({
            company:       doc.company,
            doc_number:    doc.doc_number,
            judul_dokumen: doc.judul_dokumen || '',
            user_name:     doc.user_name,
            division:      doc.division,
            doc_date:      formattedDate,
            klasifikasi:   doc.klasifikasi,
            perihal:       doc.perihal,
            signed_by:     doc.signed_by,
            keterangan:    doc.keterangan,
        });

        const buf = docTemplate.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        const sanitizedNumber = doc_number.replace(/\//g, '_');
        const judulClean      = (doc.judul_dokumen || 'Dokumen').replace(/[^a-zA-Z0-9 -]/g, '');
        res.setHeader('Content-Disposition', `attachment; filename="${judulClean}_${sanitizedNumber}.docx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buf);
    } catch (err) {
        console.error('[Document Download Error]', err);
        res.status(500).json({ error: 'Gagal memproses template dokumen' });
    }
});

module.exports = router;
