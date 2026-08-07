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

function buildContextWhere(alias, contexts = []) {
  if (!Array.isArray(contexts) || !contexts.length) {
    return {
      sql: '',
      params: [],
    };
  }

  const sql = contexts
    .map(() => `(${alias}.department_id = ? AND ${alias}.class_department_id = ?)`)
    .join(' OR ');

  const params = [];

  contexts.forEach((context) => {
    params.push(context.department_id, context.class_department_id);
  });

  return {
    sql,
    params,
  };
}

function buildAccessFilters(query = {}) {
  const access = query.__access || null;

  if (!access || access.canViewAll) {
    return {
      where: [],
      params: [],
    };
  }

  const orWhere = [];
  const params = [];

  if (access.userId) {
    orWhere.push('rr.requested_by_user_id = ?');
    params.push(access.userId);
  }

  if (access.managerCompanyId && Array.isArray(access.managerDepartmentContexts) && access.managerDepartmentContexts.length) {
    const context = buildContextWhere('rr', access.managerDepartmentContexts);

    if (context.sql) {
      orWhere.push(`
        (
          rr.company_id = ?
          AND (${context.sql})
        )
      `);

      params.push(access.managerCompanyId, ...context.params);
    }
  }

  if (Array.isArray(access.destinationDepartmentIds) && access.destinationDepartmentIds.length) {
    const placeholders = access.destinationDepartmentIds.map(() => '?').join(', ');

    orWhere.push(`rr.destination_department_id IN (${placeholders})`);
    params.push(...access.destinationDepartmentIds);
  }

  if (Array.isArray(access.budgetDepartmentIds) && access.budgetDepartmentIds.length) {
    const placeholders = access.budgetDepartmentIds.map(() => '?').join(', ');

    orWhere.push(`
      EXISTS (
        SELECT 1
        FROM rp_request_items rri
        WHERE rri.rp_request_id = rr.id
          AND (
            rri.budget_department_id IN (${placeholders})
            OR rri.budget_class_department_id IN (${placeholders})
          )
      )
    `);

    params.push(...access.budgetDepartmentIds, ...access.budgetDepartmentIds);
  }

  if (!orWhere.length) {
    return {
      where: ['1 = 0'],
      params: [],
    };
  }

  return {
    where: [`(${orWhere.join(' OR ')})`],
    params,
  };
}

function buildListFilters(query = {}) {
  const where = [];
  const params = [];

  const accessFilters = buildAccessFilters(query);
  where.push(...accessFilters.where);
  params.push(...accessFilters.params);

  if (query.status) {
    where.push('rr.status = ?');
    params.push(String(query.status).toUpperCase());
  }

  if (query.frp_conversion_status) {
    where.push('rr.frp_conversion_status = ?');
    params.push(String(query.frp_conversion_status).toUpperCase());
  }

  if (query.flow_type) {
    where.push('rr.flow_type = ?');
    params.push(String(query.flow_type).toUpperCase());
  }

  if (query.company_id) {
    where.push('rr.company_id = ?');
    params.push(query.company_id);
  }

  if (query.department_scope_id) {
    where.push(`
      (
        rr.department_id = ?
        OR rr.class_department_id = ?
        OR rr.destination_department_id = ?
        OR EXISTS (
          SELECT 1
          FROM rp_request_items rri_scope
          WHERE rri_scope.rp_request_id = rr.id
            AND (
              rri_scope.budget_department_id = ?
              OR rri_scope.budget_class_department_id = ?
            )
        )
      )
    `);
    params.push(
      query.department_scope_id,
      query.department_scope_id,
      query.department_scope_id,
      query.department_scope_id,
      query.department_scope_id
    );
  }

  if (query.department_id) {
    where.push('rr.department_id = ?');
    params.push(query.department_id);
  }

  if (query.class_department_id) {
    where.push('rr.class_department_id = ?');
    params.push(query.class_department_id);
  }

  if (query.destination_department_id) {
    where.push('rr.destination_department_id = ?');
    params.push(query.destination_department_id);
  }

  if (query.requested_by_user_id) {
    where.push('rr.requested_by_user_id = ?');
    params.push(query.requested_by_user_id);
  }

  if (query.date_from) {
    where.push('rr.date_required >= ?');
    params.push(query.date_from);
  }

  if (query.date_to) {
    where.push('rr.date_required <= ?');
    params.push(query.date_to);
  }

  if (query.search) {
    where.push(`
      (
        rr.rp_number LIKE ?
        OR rr.requested_by_name LIKE ?
        OR rr.vendor_name_snapshot LIKE ?
        OR rr.description LIKE ?
        OR rr.pic_name LIKE ?
      )
    `);

    const keyword = `%${query.search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword);
  }

  return {
    where,
    params,
  };
}

async function countRpRequests(conn, query = {}) {
  const { where, params } = buildListFilters(query);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `
      SELECT COUNT(*) AS total
      FROM rp_requests rr
      ${whereSql}
    `,
    params
  );

  return Number(rows[0]?.total || 0);
}

async function listRpRequests(conn, query = {}) {
  const { page, limit, offset } = buildLimitOffset(query.page, query.limit);
  const { where, params } = buildListFilters(query);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `
      SELECT
        rr.id,
        rr.rp_number,
        rr.status,
        rr.frp_conversion_status,
        rr.converted_frp_request_id,
        rr.converted_frp_number,
        rr.flow_type,
        rr.company_id,
        rr.company_code_snapshot,
        rr.company_name_snapshot,
        rr.department_id,
        rr.department_name_snapshot,
        rr.department_class_snapshot,
        rr.department_code_snapshot,
        rr.class_department_id,
        rr.class_name_snapshot,
        rr.class_class_snapshot,
        rr.class_code_snapshot,
        rr.destination_department_id,
        rr.destination_department_name_snapshot,
        rr.destination_department_class_snapshot,
        rr.destination_department_code_snapshot,
        rr.requested_by_user_id,
        rr.requested_by_username,
        rr.requested_by_name,
        rr.requested_by_job_position,
        rr.requested_by_job_level_name,
        rr.requested_by_job_level_value,
        rr.date_required,
        rr.description,
        rr.vendor_source,
        rr.vendor_id,
        rr.vendor_name_snapshot,
        rr.payment_category_id,
        rr.payment_category_code_snapshot,
        rr.payment_category_name_snapshot,
        rr.pic_name,
        rr.total_amount,
        rr.requester_manager_approved_by_user_id,
        rr.requester_manager_approved_by_name,
        rr.requester_manager_approved_at,
        rr.destination_checked_by_user_id,
        rr.destination_checked_by_name,
        rr.destination_checked_at,
        rr.destination_manager_approved_by_user_id,
        rr.destination_manager_approved_by_name,
        rr.destination_manager_approved_at,
        rr.rejected_by_user_id,
        rr.rejected_by_name,
        rr.rejected_at,
        rr.rejected_reason,
        rr.rejected_stage,
        rr.reverted_by_user_id,
        rr.reverted_by_name,
        rr.reverted_at,
        rr.reverted_reason,
        rr.procurement_voided_by_user_id,
        rr.procurement_voided_by_name,
        rr.procurement_voided_at,
        rr.procurement_voided_reason,
        rr.created_at,
        rr.updated_at
      FROM rp_requests rr
      ${whereSql}
      ORDER BY rr.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const total = await countRpRequests(conn, query);

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

async function getRpHeaderById(conn, id, options = {}) {
  const lockSql = options.lock ? 'FOR UPDATE' : '';

  const [rows] = await conn.query(
    `
      SELECT *
      FROM rp_requests
      WHERE id = ?
      ${lockSql}
    `,
    [id]
  );

  return rows[0] || null;
}

async function getRpItems(conn, rpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        rp_request_id,
        budget_id,
        budget_code_snapshot,
        budget_project_name_snapshot,
        budget_type_code_snapshot,
        budget_type_name_snapshot,
        budget_department_id,
        budget_department_name_snapshot,
        budget_department_class_snapshot,
        budget_department_code_snapshot,
        budget_class_department_id,
        budget_class_name_snapshot,
        budget_class_class_snapshot,
        budget_class_code_snapshot,
        memo,
        purchase_link,
        quantity,
        unit_price,
        amount,
        budget_remaining_before,
        budget_remaining_after,
        created_at,
        updated_at
      FROM rp_request_items
      WHERE rp_request_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [rpRequestId]
  );

  return rows;
}

async function getRpItemHistories(conn, rpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        rp_request_id,
        rp_request_item_id,
        change_type,
        old_values,
        new_values,
        notes,
        changed_by_user_id,
        changed_by_username,
        changed_by_name,
        changed_by_job_position,
        changed_by_job_level_name,
        changed_by_job_level_value,
        created_at
      FROM rp_request_item_histories
      WHERE rp_request_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [rpRequestId]
  );

  return rows;
}

async function getRpHeaderHistories(conn, rpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        rp_request_id,
        change_type,
        old_values,
        new_values,
        notes,
        changed_by_user_id,
        changed_by_username,
        changed_by_name,
        changed_by_job_position,
        changed_by_job_level_name,
        changed_by_job_level_value,
        created_at
      FROM rp_request_header_histories
      WHERE rp_request_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [rpRequestId]
  );

  return rows;
}

async function getRpApprovalLogs(conn, rpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        rp_request_id,
        action,
        from_status,
        to_status,
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
        actor_class_department_id,
        actor_class_name_snapshot,
        notes,
        created_at
      FROM rp_request_approval_logs
      WHERE rp_request_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [rpRequestId]
  );

  return rows;
}

async function getRpDetail(conn, id) {
  const header = await getRpHeaderById(conn, id);

  if (!header) {
    return null;
  }

  const [items, header_histories, item_histories, approval_logs] = await Promise.all([
    getRpItems(conn, id),
    getRpHeaderHistories(conn, id),
    getRpItemHistories(conn, id),
    getRpApprovalLogs(conn, id),
  ]);

  return {
    ...header,
    items,
    header_histories,
    item_histories,
    approval_logs,
  };
}

async function insertRpHeader(conn, data) {
  await conn.query(
    `
      INSERT INTO rp_requests (
        id,
        rp_number,
        status,
        frp_conversion_status,
        flow_type,

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

        destination_department_id,
        destination_department_name_snapshot,
        destination_department_class_snapshot,
        destination_department_code_snapshot,

        requested_by_user_id,
        requested_by_username,
        requested_by_name,
        requested_by_job_position,
        requested_by_job_level_name,
        requested_by_job_level_value,

        date_required,
        description,
        vendor_source,
        vendor_id,
        vendor_name_snapshot,
        payment_category_id,
        payment_category_code_snapshot,
        payment_category_name_snapshot,
        pic_name,
        total_amount,

        created_by_user_id,
        created_by_name,
        updated_by_user_id,
        updated_by_name,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        NOW(), NOW()
      )
    `,
    [
      data.id,
      data.rp_number,
      data.status,
      data.frp_conversion_status || 'NOT_CREATED',
      data.flow_type,

      data.company_id,
      data.company_code_snapshot,
      data.company_name_snapshot,

      data.department_id,
      data.department_name_snapshot,
      data.department_class_snapshot,
      data.department_code_snapshot,

      data.class_department_id,
      data.class_name_snapshot,
      data.class_class_snapshot,
      data.class_code_snapshot,

      data.destination_department_id,
      data.destination_department_name_snapshot,
      data.destination_department_class_snapshot,
      data.destination_department_code_snapshot,

      data.requested_by_user_id,
      data.requested_by_username,
      data.requested_by_name,
      data.requested_by_job_position,
      data.requested_by_job_level_name,
      data.requested_by_job_level_value,

      data.date_required,
      data.description,
      data.vendor_source,
      data.vendor_id,
      data.vendor_name_snapshot,
      data.payment_category_id,
      data.payment_category_code_snapshot,
      data.payment_category_name_snapshot,
      data.pic_name,
      data.total_amount,

      data.created_by_user_id,
      data.created_by_name,
      data.updated_by_user_id,
      data.updated_by_name,
    ]
  );
}

async function insertRpItem(conn, data) {
  await conn.query(
    `
      INSERT INTO rp_request_items (
        id,
        rp_request_id,
        budget_id,
        budget_code_snapshot,
        budget_project_name_snapshot,
        budget_type_code_snapshot,
        budget_type_name_snapshot,
        budget_department_id,
        budget_department_name_snapshot,
        budget_department_class_snapshot,
        budget_department_code_snapshot,
        budget_class_department_id,
        budget_class_name_snapshot,
        budget_class_class_snapshot,
        budget_class_code_snapshot,
        memo,
        purchase_link,
        quantity,
        unit_price,
        amount,
        budget_remaining_before,
        budget_remaining_after,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [
      data.id,
      data.rp_request_id,
      data.budget_id,
      data.budget_code_snapshot,
      data.budget_project_name_snapshot,
      data.budget_type_code_snapshot,
      data.budget_type_name_snapshot,
      data.budget_department_id,
      data.budget_department_name_snapshot,
      data.budget_department_class_snapshot,
      data.budget_department_code_snapshot,
      data.budget_class_department_id,
      data.budget_class_name_snapshot,
      data.budget_class_class_snapshot,
      data.budget_class_code_snapshot,
      data.memo,
      data.purchase_link,
      data.quantity,
      data.unit_price,
      data.amount,
      data.budget_remaining_before,
      data.budget_remaining_after,
    ]
  );
}

async function updateRpItem(conn, itemId, data) {
  await conn.query(
    `
      UPDATE rp_request_items
      SET
        memo = ?,
        purchase_link = ?,
        quantity = ?,
        unit_price = ?,
        amount = ?,
        budget_remaining_before = ?,
        budget_remaining_after = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      data.memo,
      data.purchase_link,
      data.quantity,
      data.unit_price,
      data.amount,
      data.budget_remaining_before,
      data.budget_remaining_after,
      itemId,
    ]
  );
}

async function deleteRpItems(conn, rpRequestId) {
  await conn.query(
    `
      DELETE FROM rp_request_items
      WHERE rp_request_id = ?
    `,
    [rpRequestId]
  );
}

async function updateRpHeader(conn, id, data) {
  await conn.query(
    `
      UPDATE rp_requests
      SET
        destination_department_id = ?,
        destination_department_name_snapshot = ?,
        destination_department_class_snapshot = ?,
        destination_department_code_snapshot = ?,
        date_required = ?,
        description = ?,
        vendor_source = ?,
        vendor_id = ?,
        vendor_name_snapshot = ?,
        payment_category_id = ?,
        payment_category_code_snapshot = ?,
        payment_category_name_snapshot = ?,
        pic_name = ?,
        total_amount = ?,
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      data.destination_department_id,
      data.destination_department_name_snapshot,
      data.destination_department_class_snapshot,
      data.destination_department_code_snapshot,
      data.date_required,
      data.description,
      data.vendor_source,
      data.vendor_id,
      data.vendor_name_snapshot,
      data.payment_category_id,
      data.payment_category_code_snapshot,
      data.payment_category_name_snapshot,
      data.pic_name,
      data.total_amount,
      data.updated_by_user_id,
      data.updated_by_name,
      id,
    ]
  );
}

async function updateRpHeaderForDestinationCheck(conn, id, data) {
  await conn.query(
    `
      UPDATE rp_requests
      SET
        status = 'PENDING_DESTINATION_MANAGER',
        description = ?,
        vendor_source = ?,
        vendor_id = ?,
        vendor_name_snapshot = ?,
        total_amount = ?,
        destination_checked_by_user_id = ?,
        destination_checked_by_name = ?,
        destination_checked_at = NOW(),
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      data.description,
      data.vendor_source,
      data.vendor_id,
      data.vendor_name_snapshot,
      data.total_amount,
      data.user.id,
      data.user.name,
      data.user.id,
      data.user.name,
      id,
    ]
  );
}

async function updateRpRequesterManagerApproved(conn, id, user) {
  await conn.query(
    `
      UPDATE rp_requests
      SET
        status = 'PENDING_DESTINATION_CHECKER',
        requester_manager_approved_by_user_id = ?,
        requester_manager_approved_by_name = ?,
        requester_manager_approved_at = NOW(),
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [user.id, user.name, user.id, user.name, id]
  );
}

async function updateRpDestinationManagerApproved(conn, id, user) {
  await conn.query(
    `
      UPDATE rp_requests
      SET
        status = 'APPROVED',
        destination_manager_approved_by_user_id = ?,
        destination_manager_approved_by_name = ?,
        destination_manager_approved_at = NOW(),
        rejected_by_user_id = NULL,
        rejected_by_name = NULL,
        rejected_at = NULL,
        rejected_reason = NULL,
        rejected_stage = NULL,
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [user.id, user.name, user.id, user.name, id]
  );
}

async function updateRpRejected(conn, id, user, reason, rejectedStage) {
  await conn.query(
    `
      UPDATE rp_requests
      SET
        status = 'REJECTED',
        rejected_by_user_id = ?,
        rejected_by_name = ?,
        rejected_at = NOW(),
        rejected_reason = ?,
        rejected_stage = ?,
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [user.id, user.name, reason, rejectedStage, user.id, user.name, id]
  );
}

async function updateRpRevertedToRequesterManager(conn, id, user, reason) {
  await conn.query(
    `
      UPDATE rp_requests
      SET
        status = 'PENDING_REQUESTER_MANAGER',
        requester_manager_approved_by_user_id = NULL,
        requester_manager_approved_by_name = NULL,
        requester_manager_approved_at = NULL,
        reverted_by_user_id = ?,
        reverted_by_name = ?,
        reverted_at = NOW(),
        reverted_reason = ?,
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [user.id, user.name, reason, user.id, user.name, id]
  );
}

async function updateRpRevertedToDestinationChecker(conn, id, user, reason) {
  await conn.query(
    `
      UPDATE rp_requests
      SET
        status = 'PENDING_DESTINATION_CHECKER',
        destination_checked_by_user_id = NULL,
        destination_checked_by_name = NULL,
        destination_checked_at = NULL,
        reverted_by_user_id = ?,
        reverted_by_name = ?,
        reverted_at = NOW(),
        reverted_reason = ?,
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [user.id, user.name, reason, user.id, user.name, id]
  );
}

async function updateRpRevertedToDestinationManager(conn, id, user, reason) {
  await conn.query(
    `
      UPDATE rp_requests
      SET
        status = 'PENDING_DESTINATION_MANAGER',
        destination_manager_approved_by_user_id = NULL,
        destination_manager_approved_by_name = NULL,
        destination_manager_approved_at = NULL,
        reverted_by_user_id = ?,
        reverted_by_name = ?,
        reverted_at = NOW(),
        reverted_reason = ?,
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [user.id, user.name, reason, user.id, user.name, id]
  );
}


async function updateRpConvertedToFrp(conn, id, data = {}) {
  const user = data.user || {};

  await conn.query(
    `
      UPDATE rp_requests
      SET
        frp_conversion_status = 'CREATED',
        converted_frp_request_id = ?,
        converted_frp_number = ?,
        converted_by_user_id = ?,
        converted_by_name = ?,
        converted_at = NOW(),
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      data.frp_request_id,
      data.frp_number,
      user.id,
      user.name,
      user.id,
      user.name,
      id,
    ]
  );
}

async function updateRpProcurementVoided(conn, id, user = {}, reason) {
  await conn.query(
    `
      UPDATE rp_requests
      SET
        status = 'VOIDED',
        frp_conversion_status = 'VOIDED',
        procurement_voided_by_user_id = ?,
        procurement_voided_by_name = ?,
        procurement_voided_at = NOW(),
        procurement_voided_reason = ?,
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [user.id, user.name, reason, user.id, user.name, id]
  );
}

async function insertRpApprovalLog(conn, data) {
  await conn.query(
    `
      INSERT INTO rp_request_approval_logs (
        rp_request_id,
        action,
        from_status,
        to_status,
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
        actor_class_department_id,
        actor_class_name_snapshot,
        notes,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      data.rp_request_id,
      data.action,
      data.from_status || null,
      data.to_status,
      data.actor_user_id,
      data.actor_username || null,
      data.actor_name,
      data.actor_job_position || null,
      data.actor_job_level_name || null,
      data.actor_job_level_value ?? null,
      data.actor_company_id || null,
      data.actor_company_name_snapshot || null,
      data.actor_department_id || null,
      data.actor_department_name_snapshot || null,
      data.actor_class_department_id || null,
      data.actor_class_name_snapshot || null,
      data.notes || null,
    ]
  );
}

function stringifyJson(value) {
  if (value === undefined) {
    return null;
  }

  return JSON.stringify(value);
}

async function insertRpItemHistory(conn, data) {
  await conn.query(
    `
      INSERT INTO rp_request_item_histories (
        rp_request_id,
        rp_request_item_id,
        change_type,
        old_values,
        new_values,
        notes,
        changed_by_user_id,
        changed_by_username,
        changed_by_name,
        changed_by_job_position,
        changed_by_job_level_name,
        changed_by_job_level_value,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      data.rp_request_id,
      data.rp_request_item_id,
      data.change_type,
      stringifyJson(data.old_values),
      stringifyJson(data.new_values),
      data.notes || null,
      data.changed_by_user_id || null,
      data.changed_by_username || null,
      data.changed_by_name || null,
      data.changed_by_job_position || null,
      data.changed_by_job_level_name || null,
      data.changed_by_job_level_value ?? null,
    ]
  );
}

async function insertRpHeaderHistory(conn, data) {
  await conn.query(
    `
      INSERT INTO rp_request_header_histories (
        rp_request_id,
        change_type,
        old_values,
        new_values,
        notes,
        changed_by_user_id,
        changed_by_username,
        changed_by_name,
        changed_by_job_position,
        changed_by_job_level_name,
        changed_by_job_level_value,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      data.rp_request_id,
      data.change_type,
      stringifyJson(data.old_values),
      stringifyJson(data.new_values),
      data.notes || null,
      data.changed_by_user_id || null,
      data.changed_by_username || null,
      data.changed_by_name || null,
      data.changed_by_job_position || null,
      data.changed_by_job_level_name || null,
      data.changed_by_job_level_value ?? null,
    ]
  );
}

async function getActiveDestinationDepartmentRule(conn, departmentId) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        department_id,
        department_name_snapshot,
        department_class_snapshot,
        department_code_snapshot,
        is_short_flow_allowed
      FROM master_rp_destination_departments
      WHERE department_id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [departmentId]
  );

  return rows[0] || null;
}

async function getActiveCheckerRule(conn, destinationDepartmentRuleId, jobPosition) {
  const [rows] = await conn.query(
    `
      SELECT id, destination_department_rule_id, job_position
      FROM master_rp_checker_rules
      WHERE destination_department_rule_id = ?
        AND UPPER(TRIM(job_position)) = UPPER(TRIM(?))
        AND is_active = 1
      LIMIT 1
    `,
    [destinationDepartmentRuleId, jobPosition || '']
  );

  return rows[0] || null;
}

async function getActivePaymentCategory(conn, paymentCategoryId) {
  const [rows] = await conn.query(
    `
      SELECT id, code, name
      FROM master_rp_payment_categories
      WHERE id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [paymentCategoryId]
  );

  return rows[0] || null;
}

module.exports = {
  db,
  listRpRequests,
  countRpRequests,
  getRpHeaderById,
  getRpItems,
  getRpItemHistories,
  getRpHeaderHistories,
  getRpApprovalLogs,
  getRpDetail,
  insertRpHeader,
  insertRpItem,
  updateRpItem,
  deleteRpItems,
  updateRpHeader,
  updateRpHeaderForDestinationCheck,
  updateRpRequesterManagerApproved,
  updateRpDestinationManagerApproved,
  updateRpRejected,
  updateRpRevertedToRequesterManager,
  updateRpRevertedToDestinationChecker,
  updateRpRevertedToDestinationManager,
  updateRpConvertedToFrp,
  updateRpProcurementVoided,
  insertRpApprovalLog,
  insertRpItemHistory,
  insertRpHeaderHistory,
  getActiveDestinationDepartmentRule,
  getActiveCheckerRule,
  getActivePaymentCategory,
};
