CREATE DATABASE IF NOT EXISTS `frp_erp`;
USE `frp_erp`;

DROP TABLE IF EXISTS `master_vendor`;
CREATE TABLE `master_vendor` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `bank` VARCHAR(255),
  `no_rekening` VARCHAR(255)
);

INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (1, 'ONE', 'VA MANDIRI', '');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (2, 'EVERGREEN SHIPPING AGENCY INDONESIA, PT', 'P.T.EVERGREEN SHIPPING AGENCY INDONESIA (MANDIRI)', '124.001.6768690');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (3, 'KAS NEGARA', 'VA BCA', '');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (4, 'COSCO SHIPPING LINES INDONESIA, PT', 'VA BCA', '');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (5, 'PT. PURARI MITRA RAPUNZEL', 'PURARI MITRA RAPUNZEL (BANK MANDIRI)', '1290011502057');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (6, 'PT. SURYA CEMERLANG LOGISTIK', 'BANK BCA  a.n PT.SURYA CEMERLANG LOGISTIK', '5370547558');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (7, 'PILAR KARGO PERKASA, PT', 'BCA a/n PT.PILAR KARGO PERKASA', '7020948889');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (8, 'OOCL Indonesia, PT', 'ORIENT OVERSEAS CONTAINER LINE LTD (DANAMON)', '3595104997');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (9, 'SITC INDONESIA, PT', 'PT.SITC INDONESIA CIMB NIAGA CAB TANJUNG PRIOK', '800.097.921.000');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (10, 'HMM LINE', 'BANK MANDIRI A/n PT. Mitrarejeki Investa', '1400050778886');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (11, 'KMTC', 'BANK MANDIRI PT.SAMUDRA AGENCIES INDONESIA', '1220003366633');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (12, 'YANG MING MARINE TRANSPORT CORP, PT', 'BANK MANDIRI an/ PT.YANG MING SHIPPING INDONESIA', '1030056756774');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (13, 'WANHAI', 'BANK BCA an.Dynamic Container Lines', '0123036198');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (14, 'PT. STAR SHIPPING INDONESIA', 'BANK HSBC  A/n PT STAR SHIPPING INDONESIA', '050-297977-068');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (15, 'CNC LINE', 'BANK HSBC A/n CMA CGM & ANL Securities B.V.', '050-294735-069');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (16, 'PT. APLIKANUSA LINTASARTA', 'Bank Mandiri/PT. Lintasarta', '1030089540302');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (17, 'EIKON TECHNOLOGY, PT', 'BCA a/n. PT. EIKON Technology', '4700 281 987');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (18, 'PT. DEVOTEAM CLOUD SERVICES', 'BANK MANDIRI/PT DEVOTEAM CLOUD SERVICES', '102-00-0784292-2');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (19, 'suite.id', 'BCA a/n. Yudhistira Adi Nugroho', '3880574727');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (20, 'GUARDIA TEKNOLOGI INDONESIA, PT', 'Bank Permata a/n. GUARDIA TEKNOLOGI INDONESIA PT', '9859168229');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (21, 'ORACLE CORPORATION SINGAPORE PTE LTD', 'Citibank N.A/Oracle Corporation Singapore Pte Ltd', '816419093');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (22, 'TELEKOMUNIKASI SELULAR, PT', 'Bank BNI', 'Virtual Account 8029445191011008 a/n. PT. Finnet Indonesia');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (23, 'POLARISWEB, PT', 'Bank BCA', '2551301666');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (24, 'INTERSOFT SOLUTIONS, PT', 'Bank BCA', '658880287 a/n. PT. INTERSOFT SOLUTIONS');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (25, 'CIPTA PIRANTI SEJAHTERA, PT', 'Bank BCA', '1988 00 9911 a/n PT. CIPTA PIRANTI SEJAHTERA');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (26, 'CV. VICTORY INOVASI RPATAMA', 'Bank BCA', 'BCA 7572020757 a/n. CV Victory inovasi pratama');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (27, 'PT Jolect Technologies Indonesia', 'Bank BCA', 'BCA 5045263760 a/n. PT Jolect Technologies Indonesia');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (28, 'PT BIGSELLER TECHNOLOGY INDONESIA', 'Bank Of China', '10000090148558');
INSERT INTO `master_vendor` (`id`, `name`, `bank`, `no_rekening`) VALUES (29, 'PT BERKAH TUMBUH BERSAMA INDONESIA', 'BCA', '7540276743 / PT BERKAH TUMBUH BERSAMA I');

DROP TABLE IF EXISTS `frp_request`;
CREATE TABLE `frp_request` (
  `id` VARCHAR(100) PRIMARY KEY,
  `company_id` VARCHAR(36),
  `tanggal_frp` DATE,
  `department_id` INT,
  `diminta_oleh` VARCHAR(255),
  `currency` VARCHAR(10),
  `kurs` VARCHAR(50),
  `keterangan_frp` TEXT,
  `vendor` VARCHAR(255),
  `internal_po_number` VARCHAR(100),
  `ext_doc_type` VARCHAR(100),
  `ext_doc_number` VARCHAR(100),
  `payment_method` VARCHAR(100),
  `payment_date` DATE,
  `bank_tujuan` VARCHAR(255),
  `rek_bank_tujuan` VARCHAR(255),
  `check_docs` TEXT,
  `items` JSON,
  `frp_no` VARCHAR(100),
  `status` VARCHAR(50),
  `created_by` VARCHAR(255),
  `created_at` DATETIME,
  `approved_by_actual` VARCHAR(255),
  `approved_by` VARCHAR(255),
  `approved_at` DATETIME
);

INSERT INTO `frp_request` VALUES ('mp2gx8e0', 'comp-pnm-0001', '2026-05-12', 8, 'Bayu Noegroho', 'IDR', '1', 'test pembayaran', 'ORACLE CORPORATION SINGAPORE PTE LTD', 'PO123', 'invoice', 'inv123', 'Transfer', '2026-05-12', 'Citibank N.A/Oracle Corporation Singapore Pte Ltd', '816419093', '["Form Request Payment"]', '[{"memo":"bayar internet biznet metronet 1D","budgetId":"SIT2603","qty":"1","hargaSatuan":"2.340.000","amount":"2.340.000"}]', 'FRP-IT-26-00001', 'APPROVED', 'Bayu Noegroho', '2026-05-12T10:08:45.240Z', 'Bayu Noegroho', 'Yulliemty', '2026-05-18T02:27:05.464Z');
INSERT INTO `frp_request` VALUES ('mp3ewnpj', 'comp-pnm-0001', '2026-05-13', 15, 'Faizal Bastian Razaq', 'IDR', '1', 'bayar listrik', 'PT BERKAH TUMBUH BERSAMA INDONESIA', 'PO123', 'invoice', 'inv123098765', 'Transfer', '2026-05-13', 'BCA', '7540276743 / PT BERKAH TUMBUH BERSAMA I', '["Form Request Payment"]', '[{"memo":"listrik","budgetId":"S260117","amount":"1.500.000"}]', 'FRP-GOT-26-00001', 'PENDING', 'Bayu Noegroho', '2026-05-13T02:00:05.383Z', NULL, 'Johan Setyo', NULL);
INSERT INTO `frp_request` VALUES ('mp6wkjy93uqv', 'comp-pnm-0001', '2026-05-15', 16, 'Egy Irsandi', 'IDR', '1', 'teting', 'KAS NEGARA', '', 'invoice', '', 'Transfer', '2026-05-15', 'BCA', '35332223', '["Form Request Payment"]', '[{"memo":"indihome","budgetId":"GSB2602","qty":"1","hargaSatuan":"100000","amount":100000}]', 'FRP-GOS-26-00002', 'REJECTED', 'Apriyanto', '2026-05-15T12:35:39.729Z', NULL, 'Chandra', NULL);

DROP TABLE IF EXISTS `rp_request`;
CREATE TABLE `rp_request` (
  `id` VARCHAR(100) PRIMARY KEY,
  `rp_no` VARCHAR(100),
  `status` VARCHAR(50),
  `company_id` VARCHAR(36),
  `department_id` INT,
  `class_id` INT,
  `dibuat_oleh` VARCHAR(255),
  `kategori_pembelian` VARCHAR(255),
  `deskripsi` TEXT,
  `diproses_oleh` VARCHAR(255),
  `tanggal_dibutuhkan` DATE,
  `vendor_suggestion` VARCHAR(255),
  `pic_penerima` VARCHAR(255),
  `items` JSON,
  `created_at` DATETIME,
  `created_by` VARCHAR(255),
  `manager_approved_by` VARCHAR(255),
  `manager_approved_at` DATETIME,
  `process_changes` JSON,
  `process_updated_by` VARCHAR(255),
  `process_updated_at` DATETIME,
  `process_manager_approved_by` VARCHAR(255),
  `process_manager_approved_at` DATETIME,
  `frp_id` VARCHAR(100),
  `finance_status` VARCHAR(50)
);

INSERT INTO `rp_request` VALUES ('rp-1779078806900-y12qqmfwf', 'RP-GSG-26-00001', 'CREATED_FRP', 'comp-pnm-0001', 13, 13, 'Egy Irsandi', 'Pengadaan Barang Baru', 'pembelian barang baru', 'IT', '2026-05-18', 'ONE', 'sales', '[{"budgetId":"GSG2603","memo":"barang 1","linkPembelian":"google.com","qty":"1","estimatedValue":"150000"},{"budgetId":"GSG2602","memo":"barang 2","linkPembelian":"google.com","qty":"1","estimatedValue":"400000"}]', '2026-05-18T04:33:26.900Z', 'Egy Irsandi', 'Bayu Noegroho', '2026-05-18T08:23:39.845Z', '[]', 'Bayu Noegroho', '2026-05-18T08:23:51.917Z', 'Bayu Noegroho', '2026-05-18T08:24:04.584Z', NULL, NULL);
INSERT INTO `rp_request` VALUES ('rp-1779080480345-os31y4poi', 'RP-GSG-26-00002', 'APPROVED', 'comp-pnm-0001', 4, '', 'Chandra', 'Penambahan Barang', 'barang sample', 'IT', '2026-05-18', 'COSCO SHIPPING LINES INDONESIA, PT', 'sales', '[{"budgetId":"GSG2603","memo":"sample item","linkPembelian":"google.com","qty":"1","estimatedValue":"2000000"}]', '2026-05-18T05:01:20.345Z', 'Chandra', 'Chandra', '2026-05-18T05:01:47.540Z', '[]', 'Bayu Noegroho', '2026-05-18T05:02:50.076Z', 'Yulliemty', '2026-05-18T05:03:35.221Z', NULL, NULL);
INSERT INTO `rp_request` VALUES ('rp-1779082055674-eatc4vzd5', 'RP-GSG-26-00003', 'APPROVED', 'comp-pnm-0001', 4, 4, 'Chandra', 'Pengadaan Barang Baru', 'komisi sales', 'IT', '2026-05-18', 'PT. PURARI MITRA RAPUNZEL', 'sales', '[{"budgetId":"GSG2601","memo":"komisi sales","linkPembelian":"","qty":"1","estimatedValue":"2000000"}]', '2026-05-18T05:27:35.674Z', 'Chandra', 'Chandra', '2026-05-18T06:46:50.575Z', '[]', 'Bayu Noegroho', '2026-05-18T06:47:55.017Z', 'Yulliemty', '2026-05-18T07:04:45.542Z', NULL, NULL);
INSERT INTO `rp_request` VALUES ('rp-1779082968106-r85rzo0lm', 'RP-GSG-26-00004', 'APPROVED', 'comp-pnm-0001', 4, 4, 'Egy Irsandi', 'Pengadaan Barang Baru', 'sampel barang', 'IT', '2026-05-18', 'PT Jolect Technologies Indonesia', 'sales', '[{"budgetId":"GSG2602","memo":"sampel barang","linkPembelian":"google.com","qty":"1","estimatedValue":"900000"}]', '2026-05-18T05:42:48.106Z', 'Egy Irsandi', 'Chandra', '2026-05-18T05:43:37.517Z', '[]', 'Bayu Noegroho', '2026-05-18T05:44:06.746Z', 'Yulliemty', '2026-05-18T05:44:53.076Z', NULL, NULL);
INSERT INTO `rp_request` VALUES ('rp-1779083327677-z4xliuxdy', 'RP-GSG-26-00005', 'APPROVED', 'comp-pnm-0001', 4, 4, 'Egy Irsandi', 'Pengadaan Barang Baru', 'barang pajangan', 'IT', '2026-05-18', 'PT BIGSELLER TECHNOLOGY INDONESIA', 'sales', '[{"budgetId":"GSG2601","memo":"barang pajangan","linkPembelian":"google.com","qty":"1","estimatedValue":"1000000"}]', '2026-05-18T05:48:47.677Z', 'Egy Irsandi', 'Chandra', '2026-05-18T05:49:12.499Z', '[{"field":"items[0].estimatedValue","oldValue":"100000","newValue":"1000000","itemIndex":0}]', 'Bayu Noegroho', '2026-05-18T05:49:40.437Z', 'Yulliemty', '2026-05-18T05:50:20.519Z', NULL, NULL);
INSERT INTO `rp_request` VALUES ('rp-1779085752861-hq9voj24m', 'RP-GSG-26-00006', 'CREATED_FRP', 'comp-pnm-0001', 4, 4, 'Egy Irsandi', 'Pengadaan Barang Baru', 'beli mobil sales', 'HCGA', '2026-05-18', 'ONE', 'sales', '[{"budgetId":"GSG2602","memo":"beli mobil sales","linkPembelian":"google.com","qty":"1","estimatedValue":"10000000"}]', '2026-05-18T06:29:12.861Z', 'Egy Irsandi', 'Chandra', '2026-05-18T06:49:26.936Z', '[]', 'Renaldy Alfarizi', '2026-05-18T06:49:45.817Z', 'Muhamad Asep Hafidzul Umam', '2026-05-18T06:50:21.725Z', NULL, NULL);
