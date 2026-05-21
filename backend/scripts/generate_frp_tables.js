const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

// --- Mapping lookup tables (from pilargroup-2.sql master data) ---
const companies = {
  'PT PILAR KARGO PERKASA'  : 'comp-pkp-0001',
  'PT PILAR KARANG SAMUDRA' : 'comp-pks-0001',
  'PT PILAR KARANG SAMUDERA': 'comp-pks-0001',
  'PT PILAR NIAGA MAKMUR'   : 'comp-pnm-0001'
};

// Sesuai data INSERT di pilargroup-2.sql -> master_departments
const departments = [
  { id: 1,  name: 'HCGA',              class: 'HCGA' },
  { id: 2,  name: 'Legal',             class: 'Legal' },
  { id: 3,  name: 'GOTO E-Commerce',   class: 'GOTO E-Commerce' },
  { id: 4,  name: 'Gosave GT',         class: 'Gosave GT' },
  { id: 5,  name: 'Warehouse GOTO',    class: 'Warehouse GOTO' },
  { id: 6,  name: 'Warehouse Gosave',  class: 'Warehouse Gosave' },
  { id: 7,  name: 'Finance',           class: 'Finance' },
  { id: 8,  name: 'IT',                class: 'IT' },
  { id: 9,  name: 'Board Of Director', class: 'Board Of Director' },
  { id: 13, name: 'Product',           class: 'Product' },
  { id: 14, name: 'Marketing',         class: 'Marketing' },
  { id: 15, name: 'GOTO Store',        class: 'GOTO Store' },
  { id: 16, name: 'Gosave B2B',        class: 'Gosave B2B' },
  { id: 18, name: 'Gosave E-Commerce', class: 'Gosave E-Commerce' },
  { id: 19, name: 'GOTO GT',           class: 'GOTO GT' },
  { id: 20, name: 'Pilkada',           class: 'Pilkada' },
  { id: 21, name: 'Pikasa',            class: 'Pikasa' }
];

function getCompanyId(name) {
  if (!name) return null;
  return companies[name.toUpperCase()] || null;
}

function getDepartmentId(name) {
  if (!name) return null;
  const found = departments.find(d => d.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  if (name.toLowerCase().includes('store')) return 15;
  return null; // unmapped -> will be NULL
}

function getClassId(className) {
  if (!className) return null;
  const found = departments.find(d => d.class && d.class.toLowerCase() === className.toLowerCase());
  return found ? found.id : null;
}

// Convert ISO 8601 (2026-05-12T10:08:45.240Z) to MySQL DATETIME (2026-05-12 10:08:45)
function isoToMysql(str) {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return str; // not a date, return as-is
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ` +
         `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function escapeSql(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
  // Auto-convert ISO datetime strings
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(String(val))) {
    return "'" + isoToMysql(val) + "'";
  }
  return "'" + String(val).replace(/'/g, "''") + "'";
}

// ================================================================
let sql = '';
sql += '-- ================================================================\n';
sql += '-- FILE   : frp_tables.sql\n';
sql += '-- DESC   : Tabel operasional FRP yang terhubung ke pilargroup DB.\n';
sql += '--          Import file ini SETELAH pilargroup-2.sql sudah ada.\n';
sql += '--          Foreign key sudah tersambung ke:\n';
sql += '--            master_companies   (company_id)\n';
sql += '--            master_departments (department_id, class_id)\n';
sql += '-- ================================================================\n\n';

sql += '-- Pastikan menggunakan database yang sama dengan pilargroup-2.sql\n';
sql += '-- Ganti nama database di bawah sesuai kebutuhan:\n';
sql += 'USE `frp_db`;\n\n';
sql += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

// ================================================================
// 1. master_vendor  <- vendors.json
// ================================================================
const vendors = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'vendors.json'), 'utf8').replace(/^\uFEFF/, '')
);

sql += '-- ----------------------------------------------------------------\n';
sql += '-- 1. master_vendor  (sumber: vendors.json)\n';
sql += '--    Tidak ada FK ke pilargroup karena vendor adalah master sendiri.\n';
sql += '-- ----------------------------------------------------------------\n';
sql += 'DROP TABLE IF EXISTS `master_vendor`;\n';
sql += 'CREATE TABLE `master_vendor` (\n';
sql += '  `id`          INT AUTO_INCREMENT PRIMARY KEY,\n';
sql += '  `name`        VARCHAR(255),\n';
sql += '  `bank`        VARCHAR(255),\n';
sql += '  `no_rekening` VARCHAR(255)\n';
sql += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n\n';

sql += 'INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES\n';
const vendorRows = vendors.map((v, i) =>
  `  (${i + 1}, ${escapeSql(v.name)}, ${escapeSql(v.bank)}, ${escapeSql(v.no_rekening)})`
);
sql += vendorRows.join(',\n') + ';\n\n';

// ================================================================
// 2. frp_request  <- requests.json
//    FK: company_id  -> master_companies.id
//        department_id -> master_departments.id
// ================================================================
const requests = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'requests.json'), 'utf8').replace(/^\uFEFF/, '')
);

sql += '-- ----------------------------------------------------------------\n';
sql += '-- 2. frp_request  (sumber: requests.json)\n';
sql += '--    FK  company_id    -> master_companies.id\n';
sql += '--    FK  department_id -> master_departments.id\n';
sql += '-- ----------------------------------------------------------------\n';
sql += 'DROP TABLE IF EXISTS `frp_request`;\n';
sql += 'CREATE TABLE `frp_request` (\n';
sql += '  `id`                 VARCHAR(100) NOT NULL PRIMARY KEY,\n';
sql += '  `frp_no`             VARCHAR(100),\n';
sql += '  `status`             VARCHAR(50),\n';
sql += '  `company_id`         VARCHAR(36),\n';
sql += '  `tanggal_frp`        DATE,\n';
sql += '  `department_id`      INT,\n';
sql += '  `diminta_oleh`       VARCHAR(255),\n';
sql += '  `currency`           VARCHAR(10),\n';
sql += '  `kurs`               VARCHAR(50),\n';
sql += '  `keterangan_frp`     TEXT,\n';
sql += '  `vendor`             VARCHAR(255),\n';
sql += '  `internal_po_number` VARCHAR(100),\n';
sql += '  `ext_doc_type`       VARCHAR(100),\n';
sql += '  `ext_doc_number`     VARCHAR(100),\n';
sql += '  `payment_method`     VARCHAR(100),\n';
sql += '  `payment_date`       DATE,\n';
sql += '  `bank_tujuan`        VARCHAR(255),\n';
sql += '  `rek_bank_tujuan`    VARCHAR(255),\n';
sql += '  `check_docs`         TEXT,\n';
sql += '  `items`              JSON,\n';
sql += '  `created_by`         VARCHAR(255),\n';
sql += '  `created_at`         DATETIME,\n';
sql += '  `approved_by_actual` VARCHAR(255),\n';
sql += '  `approved_by`        VARCHAR(255),\n';
sql += '  `approved_at`        DATETIME,\n';
sql += '  CONSTRAINT `fk_frp_company`    FOREIGN KEY (`company_id`)    REFERENCES `master_companies`(`id`)    ON DELETE SET NULL ON UPDATE CASCADE,\n';
sql += '  CONSTRAINT `fk_frp_department` FOREIGN KEY (`department_id`) REFERENCES `master_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE\n';
sql += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n\n';

requests.forEach(r => {
  const companyId    = escapeSql(getCompanyId(r.companyName));
  const departmentId = escapeSql(getDepartmentId(r.divisi));

  sql += `INSERT INTO \`frp_request\` VALUES (\n`;
  sql += `  ${escapeSql(r.id)},\n`;
  sql += `  ${escapeSql(r.frpNo)},\n`;
  sql += `  ${escapeSql(r.status)},\n`;
  sql += `  ${companyId},\n`;
  sql += `  ${escapeSql(r.tanggalFrp)},\n`;
  sql += `  ${departmentId},\n`;
  sql += `  ${escapeSql(r.dimintaOleh)},\n`;
  sql += `  ${escapeSql(r.currency)},\n`;
  sql += `  ${escapeSql(r.kurs)},\n`;
  sql += `  ${escapeSql(r.keteranganFrp)},\n`;
  sql += `  ${escapeSql(r.vendor)},\n`;
  sql += `  ${escapeSql(r.internalPoNumber)},\n`;
  sql += `  ${escapeSql(r.extDocType)},\n`;
  sql += `  ${escapeSql(r.extDocNumber)},\n`;
  sql += `  ${escapeSql(r.paymentMethod)},\n`;
  sql += `  ${escapeSql(r.paymentDate)},\n`;
  sql += `  ${escapeSql(r.bankTujuan)},\n`;
  sql += `  ${escapeSql(r.rekBankTujuan)},\n`;
  sql += `  ${escapeSql(r.checkDocs)},\n`;
  sql += `  ${escapeSql(r.items)},\n`;
  sql += `  ${escapeSql(r.createdBy)},\n`;
  sql += `  ${escapeSql(r.createdAt)},\n`;
  sql += `  ${escapeSql(r.approvedByActual)},\n`;
  sql += `  ${escapeSql(r.approvedBy)},\n`;
  sql += `  ${escapeSql(r.approvedAt)}\n`;
  sql += `);\n`;
});
sql += '\n';

// ================================================================
// 3. rp_request  <- rp-requests.json
//    FK: company_id    -> master_companies.id
//        department_id -> master_departments.id
//        class_id      -> master_departments.id
// ================================================================
const rpRequests = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'rp-requests.json'), 'utf8').replace(/^\uFEFF/, '')
);

sql += '-- ----------------------------------------------------------------\n';
sql += '-- 3. rp_request  (sumber: rp-requests.json)\n';
sql += '--    FK  company_id    -> master_companies.id\n';
sql += '--    FK  department_id -> master_departments.id\n';
sql += '--    FK  class_id      -> master_departments.id\n';
sql += '-- ----------------------------------------------------------------\n';
sql += 'DROP TABLE IF EXISTS `rp_request`;\n';
sql += 'CREATE TABLE `rp_request` (\n';
sql += '  `id`                          VARCHAR(100) NOT NULL PRIMARY KEY,\n';
sql += '  `rp_no`                       VARCHAR(100),\n';
sql += '  `status`                      VARCHAR(50),\n';
sql += '  `company_id`                  VARCHAR(36),\n';
sql += '  `department_id`               INT,\n';
sql += '  `class_id`                    INT,\n';
sql += '  `dibuat_oleh`                 VARCHAR(255),\n';
sql += '  `kategori_pembelian`          VARCHAR(255),\n';
sql += '  `deskripsi`                   TEXT,\n';
sql += '  `diproses_oleh`               VARCHAR(255),\n';
sql += '  `tanggal_dibutuhkan`          DATE,\n';
sql += '  `vendor_suggestion`           VARCHAR(255),\n';
sql += '  `pic_penerima`                VARCHAR(255),\n';
sql += '  `items`                       JSON,\n';
sql += '  `created_at`                  DATETIME,\n';
sql += '  `created_by`                  VARCHAR(255),\n';
sql += '  `manager_approved_by`         VARCHAR(255),\n';
sql += '  `manager_approved_at`         DATETIME,\n';
sql += '  `process_changes`             JSON,\n';
sql += '  `process_updated_by`          VARCHAR(255),\n';
sql += '  `process_updated_at`          DATETIME,\n';
sql += '  `process_manager_approved_by` VARCHAR(255),\n';
sql += '  `process_manager_approved_at` DATETIME,\n';
sql += '  `frp_id`                      VARCHAR(100),\n';
sql += '  `finance_status`              VARCHAR(50),\n';
sql += '  CONSTRAINT `fk_rp_company`    FOREIGN KEY (`company_id`)    REFERENCES `master_companies`(`id`)    ON DELETE SET NULL ON UPDATE CASCADE,\n';
sql += '  CONSTRAINT `fk_rp_department` FOREIGN KEY (`department_id`) REFERENCES `master_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,\n';
sql += '  CONSTRAINT `fk_rp_class`      FOREIGN KEY (`class_id`)      REFERENCES `master_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE\n';
sql += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n\n';

rpRequests.forEach(r => {
  const companyId    = escapeSql(getCompanyId(r.companyName));
  const departmentId = escapeSql(getDepartmentId(r.divisi));
  const classId      = escapeSql(getClassId(r.class));

  sql += `INSERT INTO \`rp_request\` VALUES (\n`;
  sql += `  ${escapeSql(r.id)},\n`;
  sql += `  ${escapeSql(r.rpNo)},\n`;
  sql += `  ${escapeSql(r.status)},\n`;
  sql += `  ${companyId},\n`;
  sql += `  ${departmentId},\n`;
  sql += `  ${classId},\n`;
  sql += `  ${escapeSql(r.dibuatOleh)},\n`;
  sql += `  ${escapeSql(r.kategoriPembelian)},\n`;
  sql += `  ${escapeSql(r.deskripsi)},\n`;
  sql += `  ${escapeSql(r.diprosesOleh)},\n`;
  sql += `  ${escapeSql(r.tanggalDibutuhkan)},\n`;
  sql += `  ${escapeSql(r.vendorSuggestion)},\n`;
  sql += `  ${escapeSql(r.picPenerima)},\n`;
  sql += `  ${escapeSql(r.items)},\n`;
  sql += `  ${escapeSql(r.createdAt)},\n`;
  sql += `  ${escapeSql(r.createdBy)},\n`;
  sql += `  ${escapeSql(r.managerApprovedBy)},\n`;
  sql += `  ${escapeSql(r.managerApprovedAt)},\n`;
  sql += `  ${escapeSql(r.processChanges)},\n`;
  sql += `  ${escapeSql(r.processUpdatedBy)},\n`;
  sql += `  ${escapeSql(r.processUpdatedAt)},\n`;
  sql += `  ${escapeSql(r.processManagerApprovedBy)},\n`;
  sql += `  ${escapeSql(r.processManagerApprovedAt)},\n`;
  sql += `  ${escapeSql(r.frpId)},\n`;
  sql += `  ${escapeSql(r.financeStatus)}\n`;
  sql += `);\n`;
});

sql += '\nSET FOREIGN_KEY_CHECKS = 1;\n';
sql += '\n-- ================================================================\n';
sql += '-- Selesai! Verifikasi relasi:\n';
sql += '--   SELECT r.frp_no, c.name AS company, d.name AS divisi\n';
sql += '--   FROM frp_request r\n';
sql += '--   JOIN master_companies c ON c.id = r.company_id\n';
sql += '--   JOIN master_departments d ON d.id = r.department_id;\n';
sql += '-- ================================================================\n';

fs.writeFileSync(path.join(__dirname, '../database/frp_tables.sql'), sql);
console.log('✓ frp_tables.sql berhasil dibuat!');
console.log('  -> ' + path.join(__dirname, '../database/frp_tables.sql'));
