-- ================================================================
-- FILE   : frp_tables.sql
-- DESC   : Tabel operasional FRP yang terhubung ke pilargroup DB.
--          Import file ini SETELAH pilargroup-2.sql sudah ada.
--          Foreign key sudah tersambung ke:
--            master_companies   (company_id)
--            master_departments (department_id, class_id)
-- ================================================================

-- Pastikan menggunakan database yang sama dengan pilargroup-2.sql
-- Ganti nama database di bawah sesuai kebutuhan:
USE `frp_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------
-- 1. master_vendor  (sumber: vendors.json)
--    Tidak ada FK ke pilargroup karena vendor adalah master sendiri.
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS `master_vendor`;
CREATE TABLE `master_vendor` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(255),
  `bank`        VARCHAR(255),
  `no_rekening` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES
  (1, 'ONE', 'VA MANDIRI', NULL),
  (2, 'EVERGREEN SHIPPING AGENCY INDONESIA, PT', 'P.T.EVERGREEN SHIPPING AGENCY INDONESIA (MANDIRI)', '124.001.6768690'),
  (3, 'KAS NEGARA', 'VA BCA', NULL),
  (4, 'COSCO SHIPPING LINES INDONESIA, PT', 'VA BCA', NULL),
  (5, 'PT. PURARI MITRA RAPUNZEL', 'PURARI MITRA RAPUNZEL (BANK MANDIRI)', '1290011502057'),
  (6, 'PT. SURYA CEMERLANG LOGISTIK', 'BANK BCA  a.n PT.SURYA CEMERLANG LOGISTIK', '5370547558'),
  (7, 'PILAR KARGO PERKASA, PT', 'BCA a/n PT.PILAR KARGO PERKASA', '7020948889'),
  (8, 'OOCL Indonesia, PT', 'ORIENT OVERSEAS CONTAINER LINE LTD (DANAMON)', '3595104997'),
  (9, 'SITC INDONESIA, PT', 'PT.SITC INDONESIA CIMB NIAGA CAB TANJUNG PRIOK', '800.097.921.000'),
  (10, 'HMM LINE', 'BANK MANDIRI A/n PT. Mitrarejeki Investa', '1400050778886'),
  (11, 'KMTC', 'BANK MANDIRI PT.SAMUDRA AGENCIES INDONESIA', '1220003366633'),
  (12, 'YANG MING MARINE TRANSPORT CORP, PT', 'BANK MANDIRI an/ PT.YANG MING SHIPPING INDONESIA', '1030056756774'),
  (13, 'WANHAI', 'BANK BCA an.Dynamic Container Lines', '0123036198'),
  (14, 'PT. STAR SHIPPING INDONESIA', 'BANK HSBC  A/n PT STAR SHIPPING INDONESIA', '050-297977-068'),
  (15, 'CNC LINE', 'BANK HSBC A/n CMA CGM & ANL Securities B.V.', '050-294735-069'),
  (16, 'PT. APLIKANUSA LINTASARTA', 'Bank Mandiri/PT. Lintasarta', '1030089540302'),
  (17, 'EIKON TECHNOLOGY, PT', 'BCA a/n. PT. EIKON Technology', '4700 281 987'),
  (18, 'PT. DEVOTEAM CLOUD SERVICES', 'BANK MANDIRI/PT DEVOTEAM CLOUD SERVICES', '102-00-0784292-2'),
  (19, 'suite.id', 'BCA a/n. Yudhistira Adi Nugroho', '3880574727'),
  (20, 'GUARDIA TEKNOLOGI INDONESIA, PT', 'Bank Permata a/n. GUARDIA TEKNOLOGI INDONESIA PT', '9859168229'),
  (21, 'ORACLE CORPORATION SINGAPORE PTE LTD', 'Citibank N.A/Oracle Corporation Singapore Pte Ltd', '816419093'),
  (22, 'TELEKOMUNIKASI SELULAR, PT', 'Bank BNI', 'Virtual Account 8029445191011008 a/n. PT. Finnet Indonesia'),
  (23, 'POLARISWEB, PT', 'Bank BCA', '2551301666'),
  (24, 'INTERSOFT SOLUTIONS, PT', 'Bank BCA', '658880287 a/n. PT. INTERSOFT SOLUTIONS'),
  (25, 'CIPTA PIRANTI SEJAHTERA, PT', 'Bank BCA', '1988 00 9911 a/n PT. CIPTA PIRANTI SEJAHTERA'),
  (26, 'CV. VICTORY INOVASI RPATAMA', 'Bank BCA', 'BCA 7572020757 a/n. CV Victory inovasi pratama'),
  (27, 'PT Jolect Technologies Indonesia', 'Bank BCA', 'BCA 5045263760 a/n. PT Jolect Technologies Indonesia'),
  (28, 'PT BIGSELLER TECHNOLOGY INDONESIA', 'Bank Of China', '10000090148558'),
  (29, 'PT BERKAH TUMBUH BERSAMA INDONESIA', 'BCA', '7540276743 / PT BERKAH TUMBUH BERSAMA I');

-- ----------------------------------------------------------------
-- 2. frp_request  (sumber: requests.json)
--    FK  company_id    -> master_companies.id
--    FK  department_id -> master_departments.id
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS `frp_request`;
CREATE TABLE `frp_request` (
  `id`                 VARCHAR(100) NOT NULL PRIMARY KEY,
  `frp_no`             VARCHAR(100),
  `status`             VARCHAR(50),
  `company_id`         VARCHAR(36),
  `tanggal_frp`        DATE,
  `department_id`      INT,
  `diminta_oleh`       VARCHAR(255),
  `currency`           VARCHAR(10),
  `kurs`               VARCHAR(50),
  `keterangan_frp`     TEXT,
  `vendor`             VARCHAR(255),
  `internal_po_number` VARCHAR(100),
  `ext_doc_type`       VARCHAR(100),
  `ext_doc_number`     VARCHAR(100),
  `payment_method`     VARCHAR(100),
  `payment_date`       DATE,
  `bank_tujuan`        VARCHAR(255),
  `rek_bank_tujuan`    VARCHAR(255),
  `check_docs`         TEXT,
  `items`              JSON,
  `created_by`         VARCHAR(255),
  `created_at`         DATETIME,
  `approved_by_actual` VARCHAR(255),
  `approved_by`        VARCHAR(255),
  `approved_at`        DATETIME,
  CONSTRAINT `fk_frp_company`    FOREIGN KEY (`company_id`)    REFERENCES `master_companies`(`id`)    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_frp_department` FOREIGN KEY (`department_id`) REFERENCES `master_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `frp_request` VALUES (
  'mp2gx8e0',
  'FRP-IT-26-00001',
  'APPROVED',
  'comp-pnm-0001',
  '2026-05-12',
  8,
  'Bayu Noegroho',
  'IDR',
  '1',
  'test pembayaran',
  'ORACLE CORPORATION SINGAPORE PTE LTD',
  'PO123',
  'invoice',
  'inv123',
  'Transfer',
  '2026-05-12',
  'Citibank N.A/Oracle Corporation Singapore Pte Ltd',
  '816419093',
  '["Form Request Payment"]',
  '[{"memo":"bayar internet biznet metronet 1D","budgetId":"SIT2603","qty":"1","hargaSatuan":"2.340.000","amount":"2.340.000"}]',
  'Bayu Noegroho',
  '2026-05-12 10:08:45',
  'Bayu Noegroho',
  'Yulliemty',
  '2026-05-18 02:27:05'
);
INSERT INTO `frp_request` VALUES (
  'mp3ewnpj',
  'FRP-GOT-26-00001',
  'PENDING',
  'comp-pnm-0001',
  '2026-05-13',
  15,
  'Faizal Bastian Razaq',
  'IDR',
  '1',
  'bayar listrik',
  'PT BERKAH TUMBUH BERSAMA INDONESIA',
  'PO123',
  'invoice',
  'inv123098765',
  'Transfer',
  '2026-05-13',
  'BCA',
  '7540276743 / PT BERKAH TUMBUH BERSAMA I',
  '["Form Request Payment"]',
  '[{"memo":"listrik","budgetId":"S260117","amount":"1.500.000"}]',
  'Bayu Noegroho',
  '2026-05-13 02:00:05',
  NULL,
  'Johan Setyo',
  NULL
);
INSERT INTO `frp_request` VALUES (
  'mp6wkjy93uqv',
  'FRP-GOS-26-00002',
  'REJECTED',
  'comp-pnm-0001',
  '2026-05-15',
  16,
  'Egy Irsandi',
  'IDR',
  '1',
  'teting',
  'KAS NEGARA',
  NULL,
  'invoice',
  NULL,
  'Transfer',
  '2026-05-15',
  'BCA',
  '35332223',
  '["Form Request Payment"]',
  '[{"memo":"indihome","budgetId":"GSB2602","qty":"1","hargaSatuan":"100000","amount":100000}]',
  'Apriyanto',
  '2026-05-15 12:35:39',
  NULL,
  'Chandra',
  NULL
);

-- ----------------------------------------------------------------
-- 3. rp_request  (sumber: rp-requests.json)
--    FK  company_id    -> master_companies.id
--    FK  department_id -> master_departments.id
--    FK  class_id      -> master_departments.id
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS `rp_request`;
CREATE TABLE `rp_request` (
  `id`                          VARCHAR(100) NOT NULL PRIMARY KEY,
  `rp_no`                       VARCHAR(100),
  `status`                      VARCHAR(50),
  `company_id`                  VARCHAR(36),
  `department_id`               INT,
  `class_id`                    INT,
  `dibuat_oleh`                 VARCHAR(255),
  `kategori_pembelian`          VARCHAR(255),
  `deskripsi`                   TEXT,
  `diproses_oleh`               VARCHAR(255),
  `tanggal_dibutuhkan`          DATE,
  `vendor_suggestion`           VARCHAR(255),
  `pic_penerima`                VARCHAR(255),
  `items`                       JSON,
  `created_at`                  DATETIME,
  `created_by`                  VARCHAR(255),
  `manager_approved_by`         VARCHAR(255),
  `manager_approved_at`         DATETIME,
  `process_changes`             JSON,
  `process_updated_by`          VARCHAR(255),
  `process_updated_at`          DATETIME,
  `process_manager_approved_by` VARCHAR(255),
  `process_manager_approved_at` DATETIME,
  `frp_id`                      VARCHAR(100),
  `finance_status`              VARCHAR(50),
  CONSTRAINT `fk_rp_company`    FOREIGN KEY (`company_id`)    REFERENCES `master_companies`(`id`)    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_rp_department` FOREIGN KEY (`department_id`) REFERENCES `master_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_rp_class`      FOREIGN KEY (`class_id`)      REFERENCES `master_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `rp_request` VALUES (
  'rp-1779078806900-y12qqmfwf',
  'RP-GSG-26-00001',
  'CREATED_FRP',
  'comp-pnm-0001',
  13,
  13,
  'Egy Irsandi',
  'Pengadaan Barang Baru',
  'pembelian barang baru',
  'IT',
  '2026-05-18',
  'ONE',
  'sales',
  '[{"budgetId":"GSG2603","memo":"barang 1","linkPembelian":"google.com","qty":"1","estimatedValue":"150000"},{"budgetId":"GSG2602","memo":"barang 2","linkPembelian":"google.com","qty":"1","estimatedValue":"400000"}]',
  '2026-05-18 04:33:26',
  'Egy Irsandi',
  'Bayu Noegroho',
  '2026-05-18 08:23:39',
  '[]',
  'Bayu Noegroho',
  '2026-05-18 08:23:51',
  'Bayu Noegroho',
  '2026-05-18 08:24:04',
  NULL,
  NULL
);
INSERT INTO `rp_request` VALUES (
  'rp-1779080480345-os31y4poi',
  'RP-GSG-26-00002',
  'APPROVED',
  'comp-pnm-0001',
  4,
  NULL,
  'Chandra',
  'Penambahan Barang',
  'barang sample',
  'IT',
  '2026-05-18',
  'COSCO SHIPPING LINES INDONESIA, PT',
  'sales',
  '[{"budgetId":"GSG2603","memo":"sample item","linkPembelian":"google.com","qty":"1","estimatedValue":"2000000"}]',
  '2026-05-18 05:01:20',
  'Chandra',
  'Chandra',
  '2026-05-18 05:01:47',
  '[]',
  'Bayu Noegroho',
  '2026-05-18 05:02:50',
  'Yulliemty',
  '2026-05-18 05:03:35',
  NULL,
  NULL
);
INSERT INTO `rp_request` VALUES (
  'rp-1779082055674-eatc4vzd5',
  'RP-GSG-26-00003',
  'APPROVED',
  'comp-pnm-0001',
  4,
  4,
  'Chandra',
  'Pengadaan Barang Baru',
  'komisi sales',
  'IT',
  '2026-05-18',
  'PT. PURARI MITRA RAPUNZEL',
  'sales',
  '[{"budgetId":"GSG2601","memo":"komisi sales","linkPembelian":"","qty":"1","estimatedValue":"2000000"}]',
  '2026-05-18 05:27:35',
  'Chandra',
  'Chandra',
  '2026-05-18 06:46:50',
  '[]',
  'Bayu Noegroho',
  '2026-05-18 06:47:55',
  'Yulliemty',
  '2026-05-18 07:04:45',
  NULL,
  NULL
);
INSERT INTO `rp_request` VALUES (
  'rp-1779082968106-r85rzo0lm',
  'RP-GSG-26-00004',
  'APPROVED',
  'comp-pnm-0001',
  4,
  4,
  'Egy Irsandi',
  'Pengadaan Barang Baru',
  'sampel barang',
  'IT',
  '2026-05-18',
  'PT Jolect Technologies Indonesia',
  'sales',
  '[{"budgetId":"GSG2602","memo":"sampel barang","linkPembelian":"google.com","qty":"1","estimatedValue":"900000"}]',
  '2026-05-18 05:42:48',
  'Egy Irsandi',
  'Chandra',
  '2026-05-18 05:43:37',
  '[]',
  'Bayu Noegroho',
  '2026-05-18 05:44:06',
  'Yulliemty',
  '2026-05-18 05:44:53',
  NULL,
  NULL
);
INSERT INTO `rp_request` VALUES (
  'rp-1779083327677-z4xliuxdy',
  'RP-GSG-26-00005',
  'APPROVED',
  'comp-pnm-0001',
  4,
  4,
  'Egy Irsandi',
  'Pengadaan Barang Baru',
  'barang pajangan',
  'IT',
  '2026-05-18',
  'PT BIGSELLER TECHNOLOGY INDONESIA',
  'sales',
  '[{"budgetId":"GSG2601","memo":"barang pajangan","linkPembelian":"google.com","qty":"1","estimatedValue":"1000000"}]',
  '2026-05-18 05:48:47',
  'Egy Irsandi',
  'Chandra',
  '2026-05-18 05:49:12',
  '[{"field":"items[0].estimatedValue","oldValue":"100000","newValue":"1000000","itemIndex":0}]',
  'Bayu Noegroho',
  '2026-05-18 05:49:40',
  'Yulliemty',
  '2026-05-18 05:50:20',
  NULL,
  NULL
);
INSERT INTO `rp_request` VALUES (
  'rp-1779085752861-hq9voj24m',
  'RP-GSG-26-00006',
  'CREATED_FRP',
  'comp-pnm-0001',
  4,
  4,
  'Egy Irsandi',
  'Pengadaan Barang Baru',
  'beli mobil sales',
  'HCGA',
  '2026-05-18',
  'ONE',
  'sales',
  '[{"budgetId":"GSG2602","memo":"beli mobil sales","linkPembelian":"google.com","qty":"1","estimatedValue":"10000000"}]',
  '2026-05-18 06:29:12',
  'Egy Irsandi',
  'Chandra',
  '2026-05-18 06:49:26',
  '[]',
  'Renaldy Alfarizi',
  '2026-05-18 06:49:45',
  'Muhamad Asep Hafidzul Umam',
  '2026-05-18 06:50:21',
  NULL,
  NULL
);

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
-- Selesai! Verifikasi relasi:
--   SELECT r.frp_no, c.name AS company, d.name AS divisi
--   FROM frp_request r
--   JOIN master_companies c ON c.id = r.company_id
--   JOIN master_departments d ON d.id = r.department_id;
-- ================================================================
