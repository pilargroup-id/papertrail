-- Budget transfer and allocation adjustment: run once on Papertrail database.
CREATE TABLE IF NOT EXISTS budget_management_transactions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  transaction_type ENUM('TRANSFER','ADJUSTMENT') NOT NULL,
  source_budget_id INT NOT NULL,
  destination_budget_id INT NULL,
  amount DECIMAL(18,2) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_by_user_id VARCHAR(36) NULL,
  created_by_user_name VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_bmt_source (source_budget_id), KEY idx_bmt_destination (destination_budget_id), KEY idx_bmt_created (created_at),
  CONSTRAINT fk_bmt_source FOREIGN KEY (source_budget_id) REFERENCES master_budgets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bmt_destination FOREIGN KEY (destination_budget_id) REFERENCES master_budgets(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS budget_management_transaction_lines (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(36) NOT NULL,
  budget_id INT NOT NULL,
  movement_type ENUM('TRANSFER_OUT','TRANSFER_IN','INCREASE','DECREASE') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  budget_amount_before DECIMAL(18,2) NOT NULL,
  budget_amount_after DECIMAL(18,2) NOT NULL,
  budget_remaining_before DECIMAL(18,2) NOT NULL,
  budget_remaining_after DECIMAL(18,2) NOT NULL,
  KEY idx_bmtl_budget (budget_id), KEY idx_bmtl_tx (transaction_id),
  CONSTRAINT fk_bmtl_transaction FOREIGN KEY (transaction_id) REFERENCES budget_management_transactions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bmtl_budget FOREIGN KEY (budget_id) REFERENCES master_budgets(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
