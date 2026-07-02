const { db } = require('../../config/database.config');

function buildListFilters(query = {}) {
  const where = [];
  const values = [];

  if (query.is_active !== undefined && query.is_active !== '') {
    where.push('is_active = ?');
    values.push(Number(query.is_active));
  }

  if (query.q) {
    where.push('(code LIKE ? OR name LIKE ? OR description LIKE ?)');
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
       code,
       name,
       description,
       is_active,
       created_at,
       updated_at
     FROM master_budget_types
     ${whereSql}
     ORDER BY name ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM master_budget_types
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
       code,
       name,
       description,
       is_active,
       created_at,
       updated_at
     FROM master_budget_types
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findByCode(code, connection = db) {
  const [rows] = await connection.query(
    `SELECT
       id,
       code,
       name,
       description,
       is_active,
       created_at,
       updated_at
     FROM master_budget_types
     WHERE code = ?
     LIMIT 1`,
    [code]
  );

  return rows[0] || null;
}

async function create(data, connection = db) {
  const [result] = await connection.query(
    `INSERT INTO master_budget_types (
       code,
       name,
       description,
       is_active
     ) VALUES (?, ?, ?, ?)`,
    [
      data.code,
      data.name,
      data.description || null,
      data.is_active === undefined ? 1 : Number(data.is_active),
    ]
  );

  return findById(result.insertId, connection);
}

async function update(id, data, connection = db) {
  await connection.query(
    `UPDATE master_budget_types
     SET
       code = ?,
       name = ?,
       description = ?
     WHERE id = ?`,
    [
      data.code,
      data.name,
      data.description || null,
      id,
    ]
  );

  return findById(id, connection);
}

async function updateStatus(id, isActive, connection = db) {
  await connection.query(
    `UPDATE master_budget_types
     SET is_active = ?
     WHERE id = ?`,
    [Number(isActive), id]
  );

  return findById(id, connection);
}

module.exports = {
  findAll,
  findById,
  findByCode,
  create,
  update,
  updateStatus,
};