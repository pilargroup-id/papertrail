const fs = require('fs');

let content = fs.readFileSync('backend/src/routes/rp.js', 'utf8');

// 1. Add fetchAllRpRequests and updateRpRequest
const helpers = `
async function fetchAllRpRequests() {
    const [rows] = await db.query(\`
        SELECT r.*, 
               mc.name AS companyName, 
               md.name AS divisi, 
               mdc.class AS classStr 
        FROM rp_request r
        LEFT JOIN master_companies mc ON r.company_id = mc.id
        LEFT JOIN master_departments md ON r.department_id = md.id
        LEFT JOIN master_departments mdc ON r.class_id = mdc.id
    \`);
    return rows.map(r => ({
        id: r.id,
        rpNo: r.rp_no || '',
        status: r.status,
        companyName: r.companyName || '',
        divisi: r.divisi || '',
        class: r.classStr || '',
        dibuatOleh: r.dibuat_oleh || '',
        kategoriPembelian: r.kategori_pembelian || '',
        deskripsi: r.deskripsi || '',
        diprosesOleh: r.diproses_oleh || '',
        tanggalDibutuhkan: r.tanggal_dibutuhkan ? new Date(r.tanggal_dibutuhkan).toISOString().slice(0,10) : '',
        vendorSuggestion: r.vendor_suggestion || '',
        picPenerima: r.pic_penerima || '',
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        createdAt: r.created_at,
        createdBy: r.created_by,
        managerApprovedBy: r.manager_approved_by,
        managerApprovedAt: r.manager_approved_at,
        processChanges: typeof r.process_changes === 'string' ? JSON.parse(r.process_changes) : (r.process_changes || []),
        processUpdatedBy: r.process_updated_by,
        processUpdatedAt: r.process_updated_at,
        processManagerApprovedBy: r.process_manager_approved_by,
        processManagerApprovedAt: r.process_manager_approved_at,
        rejectedBy: r.rejected_by,
        rejectedAt: r.rejected_at,
        rejectedReason: r.rejected_reason,
        rejectedStage: r.rejected_stage
    }));
}

async function updateRpRequest(rp) {
    const companyId = await getCompanyId(rp.companyName);
    const deptId = await getDeptId(rp.divisi, rp.companyName);
    const classId = await getDeptId(rp.class, rp.companyName);

    await db.query(\`
        UPDATE rp_request SET 
            rp_no = ?, status = ?, company_id = ?, department_id = ?, class_id = ?, 
            dibuat_oleh = ?, kategori_pembelian = ?, deskripsi = ?, diproses_oleh = ?, 
            tanggal_dibutuhkan = ?, vendor_suggestion = ?, pic_penerima = ?, items = ?, 
            manager_approved_by = ?, manager_approved_at = ?, process_changes = ?, 
            process_updated_by = ?, process_updated_at = ?, process_manager_approved_by = ?, 
            process_manager_approved_at = ?, rejected_by = ?, rejected_at = ?, 
            rejected_reason = ?, rejected_stage = ?
        WHERE id = ?
    \`, [
        rp.rpNo, rp.status, companyId, deptId, classId,
        rp.dibuatOleh, rp.kategoriPembelian, rp.deskripsi, rp.diprosesOleh,
        rp.tanggalDibutuhkan || null, rp.vendorSuggestion, rp.picPenerima, JSON.stringify(rp.items),
        rp.managerApprovedBy || null, rp.managerApprovedAt || null, JSON.stringify(rp.processChanges || []),
        rp.processUpdatedBy || null, rp.processUpdatedAt || null, rp.processManagerApprovedBy || null,
        rp.processManagerApprovedAt || null, rp.rejectedBy || null, rp.rejectedAt || null,
        rp.rejectedReason || null, rp.rejectedStage || null,
        rp.id
    ]);
}
`;

content = content.replace('const router = express.Router();', 'const router = express.Router();\n' + helpers);

// 2. form-data
content = content.replace("const rpRequests = readJson('rp-requests.json');", "const rpRequests = await fetchAllRpRequests();");

// 3. next-number
content = content.replace("const rpRequests = readJson('rp-requests.json');", "const rpRequests = await fetchAllRpRequests();");

// 4. rp/save
content = content.replace("let rpRequests = readJson('rp-requests.json');", "let rpRequests = await fetchAllRpRequests();");
// remove writeJson
content = content.replace("writeJson('rp-requests.json', rpRequests);", "await updateRpRequest(updatedReq);");
content = content.replace("writeJson('rp-requests.json', rpRequests);", "");
// change status inserting string
content = content.replace("'waiting_manager'", "newRp.status");

// 5. data/rp-approval
content = content.replace("router.get('/api/data/rp-approval', checkAuth, (req, res) => {", "router.get('/api/data/rp-approval', checkAuth, async (req, res) => {");
content = content.replace("let reqs = readJson('rp-requests.json');", "let reqs = await fetchAllRpRequests();");

// 6. rp/:id
content = content.replace("const data = readJson('rp-requests.json').find(r => r.id === req.params.id);", "const data = (await fetchAllRpRequests()).find(r => r.id === req.params.id);");

// 7. rp/:id/:action
content = content.replace("router.post('/api/rp/:id/:action', checkAuth, (req, res) => {", "router.post('/api/rp/:id/:action', checkAuth, async (req, res) => {");
content = content.replace("let rpRequests = readJson('rp-requests.json');", "let rpRequests = await fetchAllRpRequests();");
content = content.replace("rpRequests.splice(idx, 1);", "await db.query('DELETE FROM rp_request WHERE id = ?', [rp.id]);");
content = content.replace("writeJson('rp-requests.json', rpRequests);", "if (action !== 'delete') await updateRpRequest(rp);");

fs.writeFileSync('backend/src/routes/rp.js', content, 'utf8');
console.log('Refactor complete');
