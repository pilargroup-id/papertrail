const { db } = require('../../config/database.config');

function buildLimitOffset(page = 1, limit = 10) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    offset,
  };
}

function normalizeDateTimeEnd(value) {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text} 23:59:59`;
  }

  return text;
}

function normalizeDateTimeStart(value) {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text} 00:00:00`;
  }

  return text;
}

function buildActivityFilters(query = {}) {
  const where = [];
  const params = [];

  if (query.module) {
    where.push('module = ?');
    params.push(String(query.module).toUpperCase());
  }

  if (query.entity_type) {
    where.push('entity_type = ?');
    params.push(query.entity_type);
  }

  if (query.entity_id) {
    where.push('entity_id = ?');
    params.push(query.entity_id);
  }

  if (query.action) {
    where.push('action = ?');
    params.push(String(query.action).toUpperCase());
  }

  if (query.actor_user_id) {
    where.push('actor_user_id = ?');
    params.push(query.actor_user_id);
  }

  if (query.actor_department_id) {
    where.push('actor_department_id = ?');
    params.push(Number(query.actor_department_id));
  }

  const dateFrom = normalizeDateTimeStart(query.date_from);
  const dateTo = normalizeDateTimeEnd(query.date_to);

  if (dateFrom) {
    where.push('created_at >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    where.push('created_at <= ?');
    params.push(dateTo);
  }

  if (query.search) {
    where.push(`
      (
        module LIKE ?
        OR entity_type LIKE ?
        OR entity_id LIKE ?
        OR action LIKE ?
        OR description LIKE ?
        OR actor_username LIKE ?
        OR actor_name LIKE ?
      )
    `);

    const keyword = `%${query.search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
  }

  return { where, params };
}

function buildBudgetUsageFilters(query = {}) {
  const where = [];
  const params = [];

  if (query.budget_id) {
    where.push('bul.budget_id = ?');
    params.push(Number(query.budget_id));
  }

  if (query.source_module) {
    where.push('bul.source_module = ?');
    params.push(String(query.source_module).toUpperCase());
  }

  if (query.source_header_id) {
    where.push('bul.source_header_id = ?');
    params.push(query.source_header_id);
  }

  if (query.source_item_id) {
    where.push('bul.source_item_id = ?');
    params.push(query.source_item_id);
  }

  if (query.transaction_type) {
    where.push('bul.transaction_type = ?');
    params.push(String(query.transaction_type).toUpperCase());
  }

  if (query.created_by_user_id) {
    where.push('bul.created_by_user_id = ?');
    params.push(query.created_by_user_id);
  }

  const dateFrom = normalizeDateTimeStart(query.date_from);
  const dateTo = normalizeDateTimeEnd(query.date_to);

  if (dateFrom) {
    where.push('bul.created_at >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    where.push('bul.created_at <= ?');
    params.push(dateTo);
  }

  if (query.search) {
    where.push(`
      (
        bul.source_module LIKE ?
        OR bul.source_header_id LIKE ?
        OR bul.source_item_id LIKE ?
        OR bul.transaction_type LIKE ?
        OR bul.notes LIKE ?
        OR bul.created_by_user_name LIKE ?
        OR mb.budget_code LIKE ?
        OR mb.project_name LIKE ?
      )
    `);

    const keyword = `%${query.search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword);
  }

  return { where, params };
}

async function countActivityLogs(conn, query = {}) {
  const { where, params } = buildActivityFilters(query);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `
      SELECT COUNT(*) AS total
      FROM activity_logs
      ${whereSql}
    `,
    params
  );

  return Number(rows[0]?.total || 0);
}

async function listActivityLogs(conn, query = {}) {
  const { page, limit, offset } = buildLimitOffset(query.page, query.limit);
  const { where, params } = buildActivityFilters(query);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `
      SELECT
        id,
        module,
        entity_type,
        entity_id,
        action,
        description,
        old_values,
        new_values,
        metadata,
        actor_user_id,
        actor_username,
        actor_name,
        actor_job_position,
        actor_job_level_name,
        actor_job_level_value,
        actor_company_id,
        actor_company_name_snapshot,
        actor_department_id,
        actor_department_name_snapshot,
        ip_address,
        user_agent,
        created_at
      FROM activity_logs
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const total = await countActivityLogs(conn, query);

  return {
    rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

async function countBudgetUsageLogs(conn, query = {}) {
  const { where, params } = buildBudgetUsageFilters(query);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `
      SELECT COUNT(*) AS total
      FROM budget_usage_logs bul
      INNER JOIN master_budgets mb
        ON mb.id = bul.budget_id
      ${whereSql}
    `,
    params
  );

  return Number(rows[0]?.total || 0);
}

async function listBudgetUsageLogs(conn, query = {}) {
  const { page, limit, offset } = buildLimitOffset(query.page, query.limit);
  const { where, params } = buildBudgetUsageFilters(query);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `
      SELECT
        bul.id,
        bul.budget_id,
        mb.budget_code,
        mb.project_name AS budget_project_name,
        mb.department_id AS budget_department_id,
        mb.department_name_snapshot AS budget_department_name_snapshot,
        mb.class_department_id AS budget_class_department_id,
        mb.class_name_snapshot AS budget_class_name_snapshot,
        bul.source_module,
        bul.source_header_id,
        bul.source_item_id,
        bul.transaction_type,
        bul.amount,
        bul.balance_before,
        bul.balance_after,
        bul.notes,
        bul.created_by_user_id,
        bul.created_by_user_name,
        bul.created_at
      FROM budget_usage_logs bul
      INNER JOIN master_budgets mb
        ON mb.id = bul.budget_id
      ${whereSql}
      ORDER BY bul.created_at DESC, bul.id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const total = await countBudgetUsageLogs(conn, query);

  return {
    rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

module.exports = {
  db,
  listActivityLogs,
  countActivityLogs,
  listBudgetUsageLogs,
  countBudgetUsageLogs,
};
