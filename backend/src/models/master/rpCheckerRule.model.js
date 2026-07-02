const { db } = require('../../config/database.config');

function buildListFilters(query = {}) {
  const where = [];
  const values = [];

  if (query.destination_department_rule_id) {
    where.push('rcr.destination_department_rule_id = ?');
    values.push(Number(query.destination_department_rule_id));
  }

  if (query.department_id) {
    where.push('rdd.department_id = ?');
    values.push(Number(query.department_id));
  }

  if (query.is_active !== undefined && query.is_active !== '') {
    where.push('rcr.is_active = ?');
    values.push(Number(query.is_active));
  }

  if (query.q) {
    where.push(`(
      rcr.job_position LIKE ?
      OR rdd.department_name_snapshot LIKE ?
      OR rdd.department_code_snapshot LIKE ?
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
       rcr.id,
       rcr.destination_department_rule_id,
       rdd.department_id,
       rdd.department_name_snapshot,
       rdd.department_class_snapshot,
       rdd.department_code_snapshot,
       rcr.job_position,
       rcr.is_active,
       rcr.created_at,
       rcr.updated_at
     FROM master_rp_checker_rules rcr
     INNER JOIN master_rp_destination_departments rdd
       ON rdd.id = rcr.destination_department_rule_id
     ${whereSql}
     ORDER BY rdd.department_name_snapshot ASC, rcr.job_position ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM master_rp_checker_rules rcr
     INNER JOIN master_rp_destination_departments rdd
       ON rdd.id = rcr.destination_department_rule_id
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
       rcr.id,
       rcr.destination_department_rule_id,
       rdd.department_id,
       rdd.department_name_snapshot,
       rdd.department_class_snapshot,
       rdd.department_code_snapshot,
       rcr.job_position,
       rcr.is_active,
       rcr.created_at,
       rcr.updated_at
     FROM master_rp_checker_rules rcr
     INNER JOIN master_rp_destination_departments rdd
       ON rdd.id = rcr.destination_department_rule_id
     WHERE rcr.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findDestinationDepartmentRuleById(id, connection = db) {
  const [rows] = await connection.query(
    `SELECT
       id,
       department_id,
       department_name_snapshot,
       department_class_snapshot,
       department_code_snapshot,
       is_short_flow_allowed,
       is_active
     FROM master_rp_destination_departments
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findDuplicate(destinationDepartmentRuleId, jobPosition, connection = db) {
  const [rows] = await connection.query(
    `SELECT id
     FROM master_rp_checker_rules
     WHERE destination_department_rule_id = ?
       AND job_position = ?
     LIMIT 1`,
    [destinationDepartmentRuleId, jobPosition]
  );

  return rows[0] || null;
}

async function create(data, connection = db) {
  const [result] = await connection.query(
    `INSERT INTO master_rp_checker_rules (
       destination_department_rule_id,
       job_position,
       is_active
     ) VALUES (?, ?, ?)`,
    [
      data.destination_department_rule_id,
      data.job_position,
      data.is_active,
    ]
  );

  return findById(result.insertId, connection);
}

async function update(id, data, connection = db) {
  await connection.query(
    `UPDATE master_rp_checker_rules
     SET
       destination_department_rule_id = ?,
       job_position = ?
     WHERE id = ?`,
    [
      data.destination_department_rule_id,
      data.job_position,
      id,
    ]
  );

  return findById(id, connection);
}

async function updateStatus(id, isActive, connection = db) {
  await connection.query(
    `UPDATE master_rp_checker_rules
     SET is_active = ?
     WHERE id = ?`,
    [Number(isActive), id]
  );

  return findById(id, connection);
}

module.exports = {
  findAll,
  findById,
  findDestinationDepartmentRuleById,
  findDuplicate,
  create,
  update,
  updateStatus,
};