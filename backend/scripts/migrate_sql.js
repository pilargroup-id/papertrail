const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

// 1. Read the base pilargroup-2.sql
const pilarSql = fs.readFileSync(path.join(__dirname, '../database/pilargroup-2.sql'), 'utf8');

// We will append to this to create one unified file where keys can be linked.
let sql = "-- ==================================================\n";
sql += "-- FRP INTEGRATED DATABASE DUMP\n";
sql += "-- Contains pilargroup-2.sql + migrated JSON tables\n";
sql += "-- ==================================================\n\n";

sql += "CREATE DATABASE IF NOT EXISTS `frp_db`;\n";
sql += "USE `frp_db`;\n\n";
sql += pilarSql + "\n\n";

// Helper functions for mapping
const companies = {
  'PT PILAR KARGO PERKASA': 'comp-pkp-0001',
  'PT PILAR KARANG SAMUDRA': 'comp-pks-0001',
  'PT PILAR KARANG SAMUDERA': 'comp-pks-0001',
  'PT PILAR NIAGA MAKMUR': 'comp-pnm-0001'
};

const departments = [
  { id: 1, name: 'HCGA', class: 'HCGA' },
  { id: 2, name: 'Legal', class: 'Legal' },
  { id: 3, name: 'GOTO E-Commerce', class: 'GOTO E-Commerce' },
  { id: 4, name: 'Gosave GT', class: 'Gosave GT' },
  { id: 5, name: 'Warehouse GOTO', class: 'Warehouse GOTO' },
  { id: 6, name: 'Warehouse Gosave', class: 'Warehouse Gosave' },
  { id: 7, name: 'Finance', class: 'Finance' },
  { id: 8, name: 'IT', class: 'IT' },
  { id: 9, name: 'Board Of Director', class: 'Board Of Director' },
  { id: 13, name: 'Product', class: 'Product' },
  { id: 14, name: 'Marketing', class: 'Marketing' },
  { id: 15, name: 'GOTO Store', class: 'GOTO Store' },
  { id: 16, name: 'Gosave B2B', class: 'Gosave B2B' },
  { id: 18, name: 'Gosave E-Commerce', class: 'Gosave E-Commerce' },
  { id: 19, name: 'GOTO GT', class: 'GOTO GT' },
  { id: 20, name: 'Pilkada', class: 'Pilkada' },
  { id: 21, name: 'Pikasa', class: 'Pikasa' }
];

function getCompanyId(name) {
  if (!name) return null;
  const upper = name.toUpperCase();
  return companies[upper] || null;
}

function getDepartmentId(name) {
  if (!name) return null;
  const found = departments.find(d => d.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  if (name.toLowerCase().includes('store')) return 15;
  return null;
}

function getClassId(className) {
  if (!className) return null;
  const found = departments.find(d => d.class && d.class.toLowerCase() === className.toLowerCase());
  return found ? found.id : null;
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'boolean') return str ? 1 : 0;
  if (typeof str === 'number') return str;
  if (typeof str === 'object') return "'" + JSON.stringify(str).replace(/'/g, "''") + "'";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// 2. vendors.json -> master_vendor
const vendorsContent = fs.readFileSync(path.join(dataDir, 'vendors.json'), 'utf8').replace(/^\uFEFF/, '');
const vendors = JSON.parse(vendorsContent);

sql += "-- ==================================================\n";
sql += "-- JSON to SQL: vendors.json -> master_vendor\n";
sql += "-- ==================================================\n";
sql += "DROP TABLE IF EXISTS `master_vendor`;\n";
sql += "CREATE TABLE `master_vendor` (\n";
sql += "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n";
sql += "  `name` VARCHAR(255),\n";
sql += "  `bank` VARCHAR(255),\n";
sql += "  `no_rekening` VARCHAR(255)\n";
sql += ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

vendors.forEach((v, index) => {
  sql += `INSERT INTO \`master_vendor\` (\`id\`, \`name\`, \`bank\`, \`no_rekening\`) VALUES (${index + 1}, ${escapeSql(v.name)}, ${escapeSql(v.bank)}, ${escapeSql(v.no_rekening)});\n`;
});
sql += "\n";

// 3. requests.json -> frp_request
const requestsContent = fs.readFileSync(path.join(dataDir, 'requests.json'), 'utf8').replace(/^\uFEFF/, '');
const requests = JSON.parse(requestsContent);

sql += "-- ==================================================\n";
sql += "-- JSON to SQL: requests.json -> frp_request\n";
sql += "-- ==================================================\n";
sql += "DROP TABLE IF EXISTS `frp_request`;\n";
sql += "CREATE TABLE `frp_request` (\n";
sql += "  `id` VARCHAR(100) PRIMARY KEY,\n";
sql += "  `company_id` VARCHAR(36),\n";
sql += "  `tanggal_frp` DATE,\n";
sql += "  `department_id` INT,\n";
sql += "  `diminta_oleh` VARCHAR(255),\n";
sql += "  `currency` VARCHAR(10),\n";
sql += "  `kurs` VARCHAR(50),\n";
sql += "  `keterangan_frp` TEXT,\n";
sql += "  `vendor` VARCHAR(255),\n";
sql += "  `internal_po_number` VARCHAR(100),\n";
sql += "  `ext_doc_type` VARCHAR(100),\n";
sql += "  `ext_doc_number` VARCHAR(100),\n";
sql += "  `payment_method` VARCHAR(100),\n";
sql += "  `payment_date` DATE,\n";
sql += "  `bank_tujuan` VARCHAR(255),\n";
sql += "  `rek_bank_tujuan` VARCHAR(255),\n";
sql += "  `check_docs` TEXT,\n";
sql += "  `items` JSON,\n";
sql += "  `frp_no` VARCHAR(100),\n";
sql += "  `status` VARCHAR(50),\n";
sql += "  `created_by` VARCHAR(255),\n";
sql += "  `created_at` DATETIME,\n";
sql += "  `approved_by_actual` VARCHAR(255),\n";
sql += "  `approved_by` VARCHAR(255),\n";
sql += "  `approved_at` DATETIME,\n";
sql += "  CONSTRAINT `fk_frp_company` FOREIGN KEY (`company_id`) REFERENCES `master_companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,\n";
sql += "  CONSTRAINT `fk_frp_department` FOREIGN KEY (`department_id`) REFERENCES `master_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE\n";
sql += ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

requests.forEach(r => {
  const company_id = getCompanyId(r.companyName) || r.companyName;
  const department_id = getDepartmentId(r.divisi) || r.divisi;
  
  sql += `INSERT INTO \`frp_request\` VALUES (${escapeSql(r.id)}, ${escapeSql(company_id)}, ${escapeSql(r.tanggalFrp)}, ${escapeSql(department_id)}, ${escapeSql(r.dimintaOleh)}, ${escapeSql(r.currency)}, ${escapeSql(r.kurs)}, ${escapeSql(r.keteranganFrp)}, ${escapeSql(r.vendor)}, ${escapeSql(r.internalPoNumber)}, ${escapeSql(r.extDocType)}, ${escapeSql(r.extDocNumber)}, ${escapeSql(r.paymentMethod)}, ${escapeSql(r.paymentDate)}, ${escapeSql(r.bankTujuan)}, ${escapeSql(r.rekBankTujuan)}, ${escapeSql(r.checkDocs)}, ${escapeSql(r.items)}, ${escapeSql(r.frpNo)}, ${escapeSql(r.status)}, ${escapeSql(r.createdBy)}, ${escapeSql(r.createdAt)}, ${escapeSql(r.approvedByActual)}, ${escapeSql(r.approvedBy)}, ${escapeSql(r.approvedAt)});\n`;
});
sql += "\n";

// 4. rp-requests.json -> rp_request
const rpRequestsContent = fs.readFileSync(path.join(dataDir, 'rp-requests.json'), 'utf8').replace(/^\uFEFF/, '');
const rpRequests = JSON.parse(rpRequestsContent);

sql += "-- ==================================================\n";
sql += "-- JSON to SQL: rp-requests.json -> rp_request\n";
sql += "-- ==================================================\n";
sql += "DROP TABLE IF EXISTS `rp_request`;\n";
sql += "CREATE TABLE `rp_request` (\n";
sql += "  `id` VARCHAR(100) PRIMARY KEY,\n";
sql += "  `rp_no` VARCHAR(100),\n";
sql += "  `status` VARCHAR(50),\n";
sql += "  `company_id` VARCHAR(36),\n";
sql += "  `department_id` INT,\n";
sql += "  `class_id` INT,\n";
sql += "  `dibuat_oleh` VARCHAR(255),\n";
sql += "  `kategori_pembelian` VARCHAR(255),\n";
sql += "  `deskripsi` TEXT,\n";
sql += "  `diproses_oleh` VARCHAR(255),\n";
sql += "  `tanggal_dibutuhkan` DATE,\n";
sql += "  `vendor_suggestion` VARCHAR(255),\n";
sql += "  `pic_penerima` VARCHAR(255),\n";
sql += "  `items` JSON,\n";
sql += "  `created_at` DATETIME,\n";
sql += "  `created_by` VARCHAR(255),\n";
sql += "  `manager_approved_by` VARCHAR(255),\n";
sql += "  `manager_approved_at` DATETIME,\n";
sql += "  `process_changes` JSON,\n";
sql += "  `process_updated_by` VARCHAR(255),\n";
sql += "  `process_updated_at` DATETIME,\n";
sql += "  `process_manager_approved_by` VARCHAR(255),\n";
sql += "  `process_manager_approved_at` DATETIME,\n";
sql += "  `frp_id` VARCHAR(100),\n";
sql += "  `finance_status` VARCHAR(50),\n";
sql += "  CONSTRAINT `fk_rp_company` FOREIGN KEY (`company_id`) REFERENCES `master_companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,\n";
sql += "  CONSTRAINT `fk_rp_department` FOREIGN KEY (`department_id`) REFERENCES `master_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,\n";
sql += "  CONSTRAINT `fk_rp_class` FOREIGN KEY (`class_id`) REFERENCES `master_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE\n";
sql += ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

rpRequests.forEach(r => {
  const company_id = getCompanyId(r.companyName) || r.companyName;
  const department_id = getDepartmentId(r.divisi) || r.divisi;
  const class_id = getClassId(r.class) || r.class;
  
  sql += `INSERT INTO \`rp_request\` VALUES (${escapeSql(r.id)}, ${escapeSql(r.rpNo)}, ${escapeSql(r.status)}, ${escapeSql(company_id)}, ${escapeSql(department_id)}, ${escapeSql(class_id)}, ${escapeSql(r.dibuatOleh)}, ${escapeSql(r.kategoriPembelian)}, ${escapeSql(r.deskripsi)}, ${escapeSql(r.diprosesOleh)}, ${escapeSql(r.tanggalDibutuhkan)}, ${escapeSql(r.vendorSuggestion)}, ${escapeSql(r.picPenerima)}, ${escapeSql(r.items)}, ${escapeSql(r.createdAt)}, ${escapeSql(r.createdBy)}, ${escapeSql(r.managerApprovedBy)}, ${escapeSql(r.managerApprovedAt)}, ${escapeSql(r.processChanges)}, ${escapeSql(r.processUpdatedBy)}, ${escapeSql(r.processUpdatedAt)}, ${escapeSql(r.processManagerApprovedBy)}, ${escapeSql(r.processManagerApprovedAt)}, ${escapeSql(r.frpId)}, ${escapeSql(r.financeStatus)});\n`;
});

fs.writeFileSync(path.join(__dirname, '../database/frp_full.sql'), sql);
console.log('Created frp_full.sql');
