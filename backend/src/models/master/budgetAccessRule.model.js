const { db } = require('../../config/database.config');

function buildListFilters(query = {}) {
  const where = [];
  const values = [];

  if (query.module) {
    where.push('module = ?');
    values.push(String(query.module).trim().toUpperCase());
  }

  if (query.access_type) {
    where.push('access_type = ?');
    values.push(String(query.access_type).trim().toUpperCase());
  }

  if (query.department_id) {
    where.push('department_id = ?');
    values.push(Number(query.department_id));
  }

  if (query.is_active !== undefined && query.is_active !== '') {
    where.push('is_active = ?');
    values.push(Number(query.is_active));
  }

  if (query.q) {
    where.push(`(
      department_name_snapshot LIKE ?
      OR department_class_snapshot LIKE ?
      OR department_code_snapshot LIKE ?
    )`);
    values.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
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
       id,
       module,
       access_type,
       department_id,
       department_name_snapshot,
       department_class_snapshot,
       department_code_snapshot,
       is_active,
       created_at,
       updated_at
     FROM master_budget_access_rules
     ${whereSql}
     ORDER BY module ASC, department_name_snapshot ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM master_budget_access_rules
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
       id,
       module,
       access_type,
       department_id,
       department_name_snapshot,
       department_class_snapshot,
       department_code_snapshot,
       is_active,
       created_at,
       updated_at
     FROM master_budget_access_rules
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findDuplicate(module, accessType, departmentId, connection = db) {
  const [rows] = await connection.query(
    `SELECT id
     FROM master_budget_access_rules
     WHERE module = ?
       AND access_type = ?
       AND department_id = ?
     LIMIT 1`,
    [module, accessType, departmentId]
  );

  return rows[0] || null;
}

async function create(data, connection = db) {
  const [result] = await connection.query(
    `INSERT INTO master_budget_access_rules (
       module,
       access_type,
       department_id,
       department_name_snapshot,
       department_class_snapshot,
       department_code_snapshot,
       is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.module,
      data.access_type,
      data.department_id,
      data.department_name_snapshot || null,
      data.department_class_snapshot || null,
      data.department_code_snapshot || null,
      data.is_active,
    ]
  );

  return findById(result.insertId, connection);
}

async function update(id, data, connection = db) {
  await connection.query(
    `UPDATE master_budget_access_rules
     SET
       module = ?,
       access_type = ?,
       department_id = ?,
       department_name_snapshot = ?,
       department_class_snapshot = ?,
       department_code_snapshot = ?
     WHERE id = ?`,
    [
      data.module,
      data.access_type,
      data.department_id,
      data.department_name_snapshot || null,
      data.department_class_snapshot || null,
      data.department_code_snapshot || null,
      id,
    ]
  );

  return findById(id, connection);
}

async function updateStatus(id, isActive, connection = db) {
  await connection.query(
    `UPDATE master_budget_access_rules
     SET is_active = ?
     WHERE id = ?`,
    [Number(isActive), id]
  );

  return findById(id, connection);
}

async function remove(id, connection = db) {
  const rule = await findById(id, connection);

  if (!rule) {
    return null;
  }

  await connection.query(
    `DELETE FROM master_budget_access_rules
     WHERE id = ?`,
    [id]
  );

  return rule;
}

module.exports = {
  findAll,
  findById,
  findDuplicate,
  create,
  update,
  updateStatus,
  remove,
};
