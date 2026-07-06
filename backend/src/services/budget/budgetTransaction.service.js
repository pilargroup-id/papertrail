async function getBudgetForUpdate(conn, budgetId) {
  const [rows] = await conn.query(
    `
      SELECT
        b.id,
        b.budget_code,
        b.project_name,
        b.budget_amount,
        b.budget_reserved,
        b.budget_used,
        b.budget_remaining,
        b.department_id,
        b.department_name_snapshot,
        b.department_class_snapshot,
        b.department_code_snapshot,
        b.class_department_id,
        b.class_name_snapshot,
        b.class_class_snapshot,
        b.class_code_snapshot,
        b.is_active,
        bt.code AS budget_type_code,
        bt.name AS budget_type_name
      FROM master_budgets b
      LEFT JOIN master_budget_types bt
        ON bt.id = b.budget_type_id
      WHERE b.id = ?
      FOR UPDATE
    `,
    [budgetId]
  );

  return rows[0] || null;
}

function isSameDepartmentAndClass(budget, header) {
  return (
    Number(budget.department_id) === Number(header.department_id) &&
    Number(budget.class_department_id) === Number(header.class_department_id)
  );
}

async function hasCrossBudgetAccess(conn, module, departmentId) {
  const [rows] = await conn.query(
    `
      SELECT id
      FROM master_budget_access_rules
      WHERE module = ?
        AND access_type = 'CROSS_BUDGET'
        AND department_id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [module, departmentId]
  );

  return rows.length > 0;
}

async function assertBudgetCanBeUsedByHeader(conn, budget, header, sourceModule) {
  if (isSameDepartmentAndClass(budget, header)) {
    return;
  }

  const allowed = await hasCrossBudgetAccess(
    conn,
    sourceModule,
    header.department_id
  );

  if (!allowed) {
    throw new Error(`Budget ${budget.budget_code} does not belong to selected department`);
  }
}

function assertBudgetActive(budget) {
  if (!budget || Number(budget.is_active) !== 1) {
    throw new Error('Budget is not active');
  }
}

function assertEnoughBudget(budget, amount) {
  const remaining = Number(budget.budget_remaining || 0);

  if (remaining < amount) {
    throw new Error(`Budget ${budget.budget_code} remaining is not enough`);
  }
}

async function writeBudgetUsageLog(conn, payload = {}) {
  await conn.query(
    `
      INSERT INTO budget_usage_logs (
        budget_id,
        source_module,
        source_header_id,
        source_item_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        notes,
        created_by_user_id,
        created_by_user_name,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      payload.budget_id,
      payload.source_module,
      payload.source_header_id,
      payload.source_item_id || null,
      payload.transaction_type,
      payload.amount,
      payload.balance_before,
      payload.balance_after,
      payload.notes || null,
      payload.created_by_user_id,
      payload.created_by_user_name,
    ]
  );
}

async function reserveBudget(conn, payload = {}) {
  const {
    budgetId,
    amount,
    sourceModule,
    sourceHeaderId,
    sourceItemId,
    header,
    user,
    notes,
  } = payload;

  const budget = await getBudgetForUpdate(conn, budgetId);

  if (!budget) {
    throw new Error('Budget not found');
  }

  assertBudgetActive(budget);
  await assertBudgetCanBeUsedByHeader(conn, budget, header, sourceModule);
  assertEnoughBudget(budget, amount);

  const balanceBefore = Number(budget.budget_remaining || 0);
  const balanceAfter = balanceBefore - amount;

  await conn.query(
    `
      UPDATE master_budgets
      SET
        budget_reserved = budget_reserved + ?,
        budget_remaining = budget_remaining - ?
      WHERE id = ?
    `,
    [amount, amount, budgetId]
  );

  await writeBudgetUsageLog(conn, {
    budget_id: budgetId,
    source_module: sourceModule,
    source_header_id: sourceHeaderId,
    source_item_id: sourceItemId,
    transaction_type: 'RESERVE',
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    notes,
    created_by_user_id: user.id,
    created_by_user_name: user.name,
  });

  return budget;
}

async function finalizeBudget(conn, payload = {}) {
  const {
    budgetId,
    amount,
    sourceModule,
    sourceHeaderId,
    sourceItemId,
    user,
    notes,
  } = payload;

  const budget = await getBudgetForUpdate(conn, budgetId);

  if (!budget) {
    throw new Error('Budget not found');
  }

  const balanceBefore = Number(budget.budget_remaining || 0);
  const balanceAfter = balanceBefore;

  await conn.query(
    `
      UPDATE master_budgets
      SET
        budget_reserved = budget_reserved - ?,
        budget_used = budget_used + ?
      WHERE id = ?
    `,
    [amount, amount, budgetId]
  );

  await writeBudgetUsageLog(conn, {
    budget_id: budgetId,
    source_module: sourceModule,
    source_header_id: sourceHeaderId,
    source_item_id: sourceItemId,
    transaction_type: 'FINALIZE',
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    notes,
    created_by_user_id: user.id,
    created_by_user_name: user.name,
  });

  return budget;
}

async function releaseBudget(conn, payload = {}) {
  const {
    budgetId,
    amount,
    sourceModule,
    sourceHeaderId,
    sourceItemId,
    user,
    notes,
  } = payload;

  const budget = await getBudgetForUpdate(conn, budgetId);

  if (!budget) {
    throw new Error('Budget not found');
  }

  const balanceBefore = Number(budget.budget_remaining || 0);
  const balanceAfter = balanceBefore + amount;

  await conn.query(
    `
      UPDATE master_budgets
      SET
        budget_reserved = budget_reserved - ?,
        budget_remaining = budget_remaining + ?
      WHERE id = ?
    `,
    [amount, amount, budgetId]
  );

  await writeBudgetUsageLog(conn, {
    budget_id: budgetId,
    source_module: sourceModule,
    source_header_id: sourceHeaderId,
    source_item_id: sourceItemId,
    transaction_type: 'RELEASE',
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    notes,
    created_by_user_id: user.id,
    created_by_user_name: user.name,
  });

  return budget;
}

async function revertFinalizeBudget(conn, payload = {}) {
  const {
    budgetId,
    amount,
    sourceModule,
    sourceHeaderId,
    sourceItemId,
    user,
    notes,
  } = payload;

  const budget = await getBudgetForUpdate(conn, budgetId);

  if (!budget) {
    throw new Error('Budget not found');
  }

  const balanceBefore = Number(budget.budget_remaining || 0);
  const balanceAfter = balanceBefore;

  await conn.query(
    `
      UPDATE master_budgets
      SET
        budget_used = budget_used - ?,
        budget_reserved = budget_reserved + ?
      WHERE id = ?
    `,
    [amount, amount, budgetId]
  );

  await writeBudgetUsageLog(conn, {
    budget_id: budgetId,
    source_module: sourceModule,
    source_header_id: sourceHeaderId,
    source_item_id: sourceItemId,
    transaction_type: 'REVERT_FINALIZE',
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    notes,
    created_by_user_id: user.id,
    created_by_user_name: user.name,
  });

  return budget;
}

module.exports = {
  getBudgetForUpdate,
  reserveBudget,
  finalizeBudget,
  releaseBudget,
  revertFinalizeBudget,
};