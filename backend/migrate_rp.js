const fs = require('fs');
const mysql = require('mysql2/promise');
const { getCompanyId, getDeptId } = require('./src/services/dbService');

async function migrate() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'frp_db'
    });

    const requests = JSON.parse(fs.readFileSync('./data/rp-requests.json', 'utf8'));
    for (const rp of requests) {
        try {
            const [rows] = await db.query('SELECT id FROM rp_request WHERE id = ?', [rp.id]);
            if (rows.length > 0) continue;

            // map companies and depts directly doing queries to ensure they match
            let companyId = null, deptId = null, classId = null;
            if (rp.companyName) {
                const [c] = await db.query('SELECT id FROM master_companies WHERE code = ? OR name = ? LIMIT 1', [rp.companyName, rp.companyName]);
                if (c.length) companyId = c[0].id;
            }
            if (rp.divisi) {
                const [d] = await db.query('SELECT id FROM master_departments WHERE name = ? OR class = ? LIMIT 1', [rp.divisi, rp.divisi]);
                if (d.length) deptId = d[0].id;
            }
            if (rp.class) {
                const [d] = await db.query('SELECT id FROM master_departments WHERE name = ? OR class = ? LIMIT 1', [rp.class, rp.class]);
                if (d.length) classId = d[0].id;
            }

            await db.query(`
                INSERT INTO rp_request (
                    id, rp_no, status, company_id, department_id, class_id, 
                    dibuat_oleh, kategori_pembelian, deskripsi, diproses_oleh, 
                    tanggal_dibutuhkan, vendor_suggestion, pic_penerima, items, 
                    created_at, created_by, manager_approved_by, manager_approved_at, 
                    process_changes, process_updated_by, process_updated_at, 
                    process_manager_approved_by, process_manager_approved_at,
                    rejected_by, rejected_at, rejected_reason, rejected_stage
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `, [
                rp.id, rp.rpNo, rp.status, companyId, deptId, classId,
                rp.dibuatOleh, rp.kategoriPembelian, rp.deskripsi, rp.diprosesOleh,
                rp.tanggalDibutuhkan || null, rp.vendorSuggestion, rp.picPenerima, JSON.stringify(rp.items || []),
                rp.createdAt ? new Date(rp.createdAt) : new Date(), rp.createdBy, rp.managerApprovedBy || null, rp.managerApprovedAt ? new Date(rp.managerApprovedAt) : null,
                JSON.stringify(rp.processChanges || []), rp.processUpdatedBy || null, rp.processUpdatedAt ? new Date(rp.processUpdatedAt) : null,
                rp.processManagerApprovedBy || null, rp.processManagerApprovedAt ? new Date(rp.processManagerApprovedAt) : null,
                rp.rejectedBy || null, rp.rejectedAt ? new Date(rp.rejectedAt) : null, rp.rejectedReason || null, rp.rejectedStage || null
            ]);
            console.log('Migrated', rp.id);
        } catch (e) {
            console.error('Failed to migrate', rp.id, e.message);
        }
    }
    process.exit(0);
}
migrate();
