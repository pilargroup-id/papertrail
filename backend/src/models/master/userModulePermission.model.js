const { db } = require('../../config/database.config');

function buildListFilters(query = {}) {
  const where = [];
  const values = [];

  if (query.user_id) {
    where.push('ump.user_id = ?');
    values.push(String(query.user_id).trim());
  }

  if (query.module_id) {
    where.push('ump.module_id = ?');
    values.push(Number(query.module_id));
  }

  if (query.module_code) {
    where.push('mpm.module_code = ?');
    values.push(String(query.module_code).trim().toUpperCase());
  }

  if (query.is_active !== undefined && query.is_active !== '') {
    where.push('ump.is_active = ?');
    values.push(Number(query.is_active));
  }

  if (query.q) {
    where.push(`(
      ump.username_snapshot LIKE ?
      OR ump.name_snapshot LIKE ?
      OR mpm.module_code LIKE ?
      OR mpm.module_name LIKE ?
    )`);
    values.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
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
       ump.id,
       ump.user_id,
       ump.username_snapshot,
       ump.name_snapshot,
       ump.module_id,
       mpm.module_code,
       mpm.module_name,
       mpm.module_group,
       ump.can_view,
       ump.can_create,
       ump.can_update,
       ump.can_deactivate,
       ump.is_active,
       ump.created_by_user_id,
       ump.created_by_name,
       ump.updated_by_user_id,
       ump.updated_by_name,
       ump.created_at,
       ump.updated_at
     FROM user_module_permissions ump
     INNER JOIN master_permission_modules mpm ON mpm.id = ump.module_id
     ${whereSql}
     ORDER BY ump.name_snapshot ASC, mpm.sort_order ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM user_module_permissions ump
     INNER JOIN master_permission_modules mpm ON mpm.id = ump.module_id
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
       ump.id,
       ump.user_id,
       ump.username_snapshot,
       ump.name_snapshot,
       ump.module_id,
       mpm.module_code,
       mpm.module_name,
       mpm.module_group,
       ump.can_view,
       ump.can_create,
       ump.can_update,
       ump.can_deactivate,
       ump.is_active,
       ump.created_by_user_id,
       ump.created_by_name,
       ump.updated_by_user_id,
       ump.updated_by_name,
       ump.created_at,
       ump.updated_at
     FROM user_module_permissions ump
     INNER JOIN master_permission_modules mpm ON mpm.id = ump.module_id
     WHERE ump.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findByUserAndModule(userId, moduleId, connection = db) {
  const [rows] = await connection.query(
    `SELECT
       id,
       user_id,
       username_snapshot,
       name_snapshot,
       module_id,
       can_view,
       can_create,
       can_update,
       can_deactivate,
       is_active,
       created_by_user_id,
       created_by_name,
       updated_by_user_id,
       updated_by_name,
       created_at,
       updated_at
     FROM user_module_permissions
     WHERE user_id = ?
       AND module_id = ?
     LIMIT 1`,
    [userId, moduleId]
  );

  return rows[0] || null;
}

async function create(data, connection = db) {
  const [result] = await connection.query(
    `INSERT INTO user_module_permissions (
       user_id,
       username_snapshot,
       name_snapshot,
       module_id,
       can_view,
       can_create,
       can_update,
       can_deactivate,
       is_active,
       created_by_user_id,
       created_by_name
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.user_id,
      data.username_snapshot || null,
      data.name_snapshot || null,
      data.module_id,
      data.can_view,
      data.can_create,
      data.can_update,
      data.can_deactivate,
      data.is_active,
      data.created_by_user_id || null,
      data.created_by_name || null,
    ]
  );

  return findById(result.insertId, connection);
}

async function update(id, data, connection = db) {
  await connection.query(
    `UPDATE user_module_permissions
     SET
       user_id = ?,
       username_snapshot = ?,
       name_snapshot = ?,
       module_id = ?,
       can_view = ?,
       can_create = ?,
       can_update = ?,
       can_deactivate = ?,
       updated_by_user_id = ?,
       updated_by_name = ?
     WHERE id = ?`,
    [
      data.user_id,
      data.username_snapshot || null,
      data.name_snapshot || null,
      data.module_id,
      data.can_view,
      data.can_create,
      data.can_update,
      data.can_deactivate,
      data.updated_by_user_id || null,
      data.updated_by_name || null,
      id,
    ]
  );

  return findById(id, connection);
}

async function updateStatus(id, data, connection = db) {
  await connection.query(
    `UPDATE user_module_permissions
     SET
       is_active = ?,
       updated_by_user_id = ?,
       updated_by_name = ?
     WHERE id = ?`,
    [
      data.is_active,
      data.updated_by_user_id || null,
      data.updated_by_name || null,
      id,
    ]
  );

  return findById(id, connection);
}

module.exports = {
  findAll,
  findById,
  findByUserAndModule,
  create,
  update,
  updateStatus,
};