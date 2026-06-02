-- Tabel documents untuk fitur Generate Document
-- Database: frp_db
-- Jalankan script ini jika tabel belum ada

CREATE TABLE IF NOT EXISTS `documents` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `company`           VARCHAR(10)  NOT NULL DEFAULT 'PNM',
  `user_id`           INT          NULL,
  `running_number`    INT          NOT NULL DEFAULT 0,
  `doc_number`        VARCHAR(100) NOT NULL,
  `user_name`         VARCHAR(255) NULL,
  `division`          VARCHAR(255) NULL,
  `internal_external` VARCHAR(20)  NULL DEFAULT 'Internal',
  `doc_date`          DATE         NULL,
  `klasifikasi`       VARCHAR(255) NULL,
  `perihal`           TEXT         NULL,
  `judul_dokumen`     VARCHAR(500) NULL,
  `signed_by`         VARCHAR(255) NULL,
  `keterangan`        TEXT         NULL,
  `link_document`     VARCHAR(1000) NULL,
  `template_name`     VARCHAR(255) NULL,
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_doc_number` (`doc_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
