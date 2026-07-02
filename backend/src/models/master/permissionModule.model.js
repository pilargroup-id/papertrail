const { db } = require('../../config/database.config');

function buildListFilters(query = {}) {
  const where = [];
  const values = [];

  if (query.is_active !== undefined && query.is_active !== '') {
    where.push('is_active = ?');
    values.push(Number(query.is_active));
  }

  if (query.module_group) {
    where.push('module_group = ?');
    values.push(String(query.module_group).trim());
  }

  if (query.q) {
    where.push('(module_code LIKE ? OR module_name LIKE ? OR description LIKE ?)');
    values.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values,
  };
}

async function findAll(query = {}) {
  const { whereSql, values } = buildListFilters(query);

  const [rows] = await db.query(
    `SELECT
       id,
       module_code,
       module_name,
       module_group,
       description,
       is_active,
       sort_order,
       created_at,
       updated_at
     FROM master_permission_modules
     ${whereSql}
     ORDER BY module_group ASC, sort_order ASC, module_name ASC`,
    values
  );

  return rows;
}

async function findById(id, connection = db) {
  const [rows] = await connection.query(
    `SELECT
       id,
       module_code,
       module_name,
       module_group,
       description,
       is_active,
       sort_order,
       created_at,
       updated_at
     FROM master_permission_modules
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
};