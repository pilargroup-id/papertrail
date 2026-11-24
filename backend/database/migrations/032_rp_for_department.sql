-- RP "Untuk Divisi": divisi + class tujuan permintaan (dari direktori PilarGroup).
-- Manager divisi ini yang menyetujui tahap PENDING_REQUESTER_MANAGER.
-- Kolom nullable: RP lama (NULL) tetap memakai aturan approval sebelumnya.
-- Idempotent: aman dijalankan berulang (kolom/index yang sudah ada dilewati).

SET @rp_for_dept_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rp_requests'
    AND COLUMN_NAME = 'for_department_id'
);

SET @rp_for_dept_sql = IF(
  @rp_for_dept_exists = 0,
  'ALTER TABLE rp_requests
     ADD COLUMN for_department_id INT NULL AFTER class_code_snapshot,
     ADD COLUMN for_department_name_snapshot VARCHAR(100) NULL AFTER for_department_id,
     ADD COLUMN for_department_class_snapshot VARCHAR(100) NULL AFTER for_department_name_snapshot,
     ADD COLUMN for_department_code_snapshot VARCHAR(10) NULL AFTER for_department_class_snapshot,
     ADD COLUMN for_class_department_id INT NULL AFTER for_department_code_snapshot,
     ADD COLUMN for_class_name_snapshot VARCHAR(100) NULL AFTER for_class_department_id,
     ADD COLUMN for_class_class_snapshot VARCHAR(100) NULL AFTER for_class_name_snapshot,
     ADD COLUMN for_class_code_snapshot VARCHAR(10) NULL AFTER for_class_class_snapshot',
  'SELECT 1'
);

PREPARE rp_for_dept_stmt FROM @rp_for_dept_sql;
EXECUTE rp_for_dept_stmt;
DEALLOCATE PREPARE rp_for_dept_stmt;

SET @rp_for_dept_idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rp_requests'
    AND INDEX_NAME = 'idx_rp_requests_for_department'
);

SET @rp_for_dept_idx_sql = IF(
  @rp_for_dept_idx_exists = 0,
  'ALTER TABLE rp_requests ADD KEY idx_rp_requests_for_department (for_department_id)',
  'SELECT 1'
);

PREPARE rp_for_dept_idx_stmt FROM @rp_for_dept_idx_sql;
EXECUTE rp_for_dept_idx_stmt;
DEALLOCATE PREPARE rp_for_dept_idx_stmt;
