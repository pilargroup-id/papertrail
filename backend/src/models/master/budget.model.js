const { db } = require('../../config/database.config');

function buildListFilters(query = {}) {
  const where = [];
  const values = [];

  if (query.company_id) {
    where.push('mb.company_id = ?');
    values.push(String(query.company_id).trim());
  }

  if (query.department_id) {
    where.push('mb.department_id = ?');
    values.push(Number(query.department_id));
  }

  if (query.class_department_id) {
    where.push('mb.class_department_id = ?');
    values.push(Number(query.class_department_id));
  }

  if (query.budget_type_id) {
    where.push('mb.budget_type_id = ?');
    values.push(Number(query.budget_type_id));
  }

  if (query.period_year) {
    where.push('mb.period_year = ?');
    values.push(Number(query.period_year));
  }

  if (query.period_month) {
    where.push('mb.period_month = ?');
    values.push(Number(query.period_month));
  }

  if (query.is_active !== undefined && query.is_active !== '') {
    where.push('mb.is_active = ?');
    values.push(Number(query.is_active));
  }

  if (query.q) {
    where.push(`(
      mb.budget_code LIKE ?
      OR mb.project_name LIKE ?
      OR mb.company_name_snapshot LIKE ?
      OR mb.department_name_snapshot LIKE ?
      OR mb.class_name_snapshot LIKE ?
      OR mb.department_code_snapshot LIKE ?
      OR mb.class_code_snapshot LIKE ?
    )`);
    values.push(
      `%${query.q}%`,
      `%${query.q}%`,
      `%${query.q}%`,
      `%${query.q}%`,
      `%${query.q}%`,
      `%${query.q}%`,
      `%${query.q}%`
    );
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values,
  };
}

async function findAll(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const { whereSql, values } = buildListFilters(query);

  const [rows] = await db.query(
    `SELECT
       mb.id,
       mb.budget_code,
       mb.company_id,
       mb.company_code_snapshot,
       mb.company_name_snapshot,
       mb.department_id,
       mb.department_name_snapshot,
       mb.department_class_snapshot,
       mb.department_code_snapshot,
       mb.class_department_id,
       mb.class_name_snapshot,
       mb.class_class_snapshot,
       mb.class_code_snapshot,
       mb.budget_type_id,
       mbt.code AS budget_type_code,
       mbt.name AS budget_type_name,
       mb.project_name,
       mb.budget_amount,
       mb.budget_reserved,
       mb.budget_used,
       mb.budget_remaining,
       mb.period_year,
       mb.period_month,
       mb.is_active,
       mb.created_at,
       mb.updated_at
     FROM master_budgets mb
     LEFT JOIN master_budget_types mbt ON mbt.id = mb.budget_type_id
     ${whereSql}
     ORDER BY mb.period_year DESC, mb.period_month DESC, mb.budget_code ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM master_budgets mb
     LEFT JOIN master_budget_types mbt ON mbt.id = mb.budget_type_id
     ${whereSql}`,
    values
  );

  const total = Number(countRows[0]?.total || 0);

  return {
    rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function findById(id, connection = db) {
  const [rows] = await connection.query(
    `SELECT
       mb.id,
       mb.budget_code,
       mb.company_id,
       mb.company_code_snapshot,
       mb.company_name_snapshot,
       mb.department_id,
       mb.department_name_snapshot,
       mb.department_class_snapshot,
       mb.department_code_snapshot,
       mb.class_department_id,
       mb.class_name_snapshot,
       mb.class_class_snapshot,
       mb.class_code_snapshot,
       mb.budget_type_id,
       mbt.code AS budget_type_code,
       mbt.name AS budget_type_name,
       mb.project_name,
       mb.budget_amount,
       mb.budget_reserved,
       mb.budget_used,
       mb.budget_remaining,
       mb.period_year,
       mb.period_month,
       mb.is_active,
       mb.created_at,
       mb.updated_at
     FROM master_budgets mb
     LEFT JOIN master_budget_types mbt ON mbt.id = mb.budget_type_id
     WHERE mb.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findByBudgetCode(budgetCode, connection = db) {
  const [rows] = await connection.query(
    `SELECT id
     FROM master_budgets
     WHERE budget_code = ?
     LIMIT 1`,
    [budgetCode]
  );

  return rows[0] || null;
}

async function findBudgetTypeById(id, connection = db) {
  const [rows] = await connection.query(
    `SELECT id, code, name, is_active
     FROM master_budget_types
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function create(data, connection = db) {
  const [result] = await connection.query(
    `INSERT INTO master_budgets (
       budget_code,
       company_id,
       company_code_snapshot,
       company_name_snapshot,
       department_id,
       department_name_snapshot,
       department_class_snapshot,
       department_code_snapshot,
       class_department_id,
       class_name_snapshot,
       class_class_snapshot,
       class_code_snapshot,
       budget_type_id,
       project_name,
       budget_amount,
       budget_reserved,
       budget_used,
       budget_remaining,
       period_year,
       period_month,
       is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.budget_code,
      data.company_id,
      data.company_code_snapshot || null,
      data.company_name_snapshot || null,
      data.department_id,
      data.department_name_snapshot || null,
      data.department_class_snapshot || null,
      data.department_code_snapshot || null,
      data.class_department_id,
      data.class_name_snapshot || null,
      data.class_class_snapshot || null,
      data.class_code_snapshot || null,
      data.budget_type_id || null,
      data.project_name,
      data.budget_amount,
      data.budget_reserved,
      data.budget_used,
      data.budget_remaining,
      data.period_year || null,
      data.period_month || null,
      data.is_active,
    ]
  );

  return findById(result.insertId, connection);
}

async function update(id, data, connection = db) {
  await connection.query(
    `UPDATE master_budgets
     SET
       budget_code = ?,
       company_id = ?,
       company_code_snapshot = ?,
       company_name_snapshot = ?,
       department_id = ?,
       department_name_snapshot = ?,
       department_class_snapshot = ?,
       department_code_snapshot = ?,
       class_department_id = ?,
       class_name_snapshot = ?,
       class_class_snapshot = ?,
       class_code_snapshot = ?,
       budget_type_id = ?,
       project_name = ?,
       budget_amount = ?,
       budget_reserved = ?,
       budget_used = ?,
       budget_remaining = ?,
       period_year = ?,
       period_month = ?
     WHERE id = ?`,
    [
      data.budget_code,
      data.company_id,
      data.company_code_snapshot || null,
      data.company_name_snapshot || null,
      data.department_id,
      data.department_name_snapshot || null,
      data.department_class_snapshot || null,
      data.department_code_snapshot || null,
      data.class_department_id,
      data.class_name_snapshot || null,
      data.class_class_snapshot || null,
      data.class_code_snapshot || null,
      data.budget_type_id || null,
      data.project_name,
      data.budget_amount,
      data.budget_reserved,
      data.budget_used,
      data.budget_remaining,
      data.period_year || null,
      data.period_month || null,
      id,
    ]
  );

  return findById(id, connection);
}

async function updateStatus(id, isActive, connection = db) {
  await connection.query(
    `UPDATE master_budgets
     SET is_active = ?
     WHERE id = ?`,
    [Number(isActive), id]
  );

  return findById(id, connection);
}

module.exports = {
  findAll,
  findById,
  findByBudgetCode,
  findBudgetTypeById,
  create,
  update,
  updateStatus,
};