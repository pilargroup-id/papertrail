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
    orWhere.push('fr.requested_by_user_id = ?');
    params.push(access.userId);
  }

  if (access.managerCompanyId && Array.isArray(access.managerDepartmentIds) && access.managerDepartmentIds.length) {
    const departmentPlaceholders = access.managerDepartmentIds.map(() => '?').join(', ');

    orWhere.push(`
      (
        fr.company_id = ?
        AND fr.department_id IN (${departmentPlaceholders})
      )
    `);

    params.push(access.managerCompanyId, ...access.managerDepartmentIds);
  }

  if (Array.isArray(access.budgetDepartmentIds) && access.budgetDepartmentIds.length) {
    const budgetDepartmentPlaceholders = access.budgetDepartmentIds.map(() => '?').join(', ');

    orWhere.push(`
      EXISTS (
        SELECT 1
        FROM frp_request_items fri
        INNER JOIN master_budgets mb
          ON mb.id = fri.budget_id
        WHERE fri.frp_request_id = fr.id
          AND (
            mb.department_id IN (${budgetDepartmentPlaceholders})
            OR mb.class_department_id IN (${budgetDepartmentPlaceholders})
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

function buildListFilters(query = {}, user = {}) {
  const where = [];
  const params = [];

  const accessFilters = buildAccessFilters(query);
  where.push(...accessFilters.where);
  params.push(...accessFilters.params);

  if (query.status) {
    where.push('fr.status = ?');
    params.push(String(query.status).toUpperCase());
  }

  if (query.company_id) {
    where.push('fr.company_id = ?');
    params.push(query.company_id);
  }

  if (query.department_id) {
    where.push('fr.department_id = ?');
    params.push(query.department_id);
  }

  if (query.class_department_id) {
    where.push('fr.class_department_id = ?');
    params.push(query.class_department_id);
  }

  if (query.requested_by_user_id) {
    where.push('fr.requested_by_user_id = ?');
    params.push(query.requested_by_user_id);
  }

  if (query.date_from) {
    where.push('fr.frp_date >= ?');
    params.push(query.date_from);
  }

  if (query.date_to) {
    where.push('fr.frp_date <= ?');
    params.push(query.date_to);
  }

  if (query.search) {
    where.push(`
      (
        fr.frp_number LIKE ?
        OR fr.requested_by_name LIKE ?
        OR fr.vendor_name_snapshot LIKE ?
        OR fr.description LIKE ?
        OR fr.internal_po_number LIKE ?
        OR fr.external_document_number LIKE ?
      )
    `);

    const keyword = `%${query.search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword, keyword);
  }

  return {
    where,
    params,
  };
}

async function countFrpRequests(conn, query = {}, user = {}) {
  const { where, params } = buildListFilters(query, user);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `
      SELECT COUNT(*) AS total
      FROM frp_requests fr
      ${whereSql}
    `,
    params
  );

  return Number(rows[0]?.total || 0);
}

async function listFrpRequests(conn, query = {}, user = {}) {
  const { page, limit, offset } = buildLimitOffset(query.page, query.limit);
  const { where, params } = buildListFilters(query, user);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `
      SELECT
        fr.id,
        fr.frp_number,
        fr.status,
        fr.frp_date,
        fr.company_id,
        fr.company_code_snapshot,
        fr.company_name_snapshot,
        fr.department_id,
        fr.department_name_snapshot,
        fr.department_class_snapshot,
        fr.department_code_snapshot,
        fr.class_department_id,
        fr.class_name_snapshot,
        fr.class_class_snapshot,
        fr.class_code_snapshot,
        fr.requested_by_user_id,
        fr.requested_by_username,
        fr.requested_by_name,
        fr.requested_by_job_position,
        fr.requested_by_job_level_name,
        fr.requested_by_job_level_value,
        fr.description,
        fr.currency_code,
        fr.exchange_rate,
        fr.vendor_id,
        fr.vendor_name_snapshot,
        fr.internal_po_number,
        fr.external_document_number,
        fr.payment_date,
        fr.total_amount,
        fr.approved_by_user_id,
        fr.approved_by_name,
        fr.approved_at,
        fr.rejected_by_user_id,
        fr.rejected_by_name,
        fr.rejected_at,
        fr.rejected_reason,
        fr.reverted_by_user_id,
        fr.reverted_by_name,
        fr.reverted_at,
        fr.reverted_reason,
        fr.created_at,
        fr.updated_at
      FROM frp_requests fr
      ${whereSql}
      ORDER BY fr.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const total = await countFrpRequests(conn, query, user);

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

async function getFrpHeaderById(conn, id, options = {}) {
  const lockSql = options.lock ? 'FOR UPDATE' : '';

  const [rows] = await conn.query(
    `
      SELECT *
      FROM frp_requests
      WHERE id = ?
      ${lockSql}
    `,
    [id]
  );

  return rows[0] || null;
}

async function getFrpItems(conn, frpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        frp_request_id,
        budget_id,
        budget_code_snapshot,
        budget_project_name_snapshot,
        budget_type_code_snapshot,
        budget_type_name_snapshot,
        memo,
        quantity,
        unit_price,
        amount,
        budget_remaining_before,
        budget_remaining_after,
        created_at,
        updated_at
      FROM frp_request_items
      WHERE frp_request_id = ?
      ORDER BY created_at ASC
    `,
    [frpRequestId]
  );

  return rows;
}

async function getFrpDocuments(conn, frpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        frp_request_id,
        document_type_id,
        document_code_snapshot,
        document_name_snapshot,
        created_at
      FROM frp_request_documents
      WHERE frp_request_id = ?
      ORDER BY id ASC
    `,
    [frpRequestId]
  );

  return rows;
}

async function getFrpAttachments(conn, frpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        frp_request_id,
        document_type_id,
        document_code_snapshot,
        document_name_snapshot,
        original_file_name,
        file_name,
        object_path,
        bucket_name,
        storage_provider,
        mime_type,
        file_size,
        checksum,
        upload_status,
        uploaded_by_user_id,
        uploaded_by_username,
        uploaded_by_name,
        uploaded_at,
        created_at,
        updated_at
      FROM frp_request_attachments
      WHERE frp_request_id = ?
        AND upload_status <> 'CANCELED'
      ORDER BY created_at ASC
    `,
    [frpRequestId]
  );

  return rows;
}

async function getFrpApprovalLogs(conn, frpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        frp_request_id,
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
      FROM frp_request_approval_logs
      WHERE frp_request_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [frpRequestId]
  );

  return rows;
}

async function hasFrpBudgetDepartmentAccess(conn, frpRequestId, departmentIds = []) {
  if (!Array.isArray(departmentIds) || !departmentIds.length) {
    return false;
  }

  const safeDepartmentIds = [...new Set(departmentIds.map(Number).filter(Boolean))];

  if (!safeDepartmentIds.length) {
    return false;
  }

  const placeholders = safeDepartmentIds.map(() => '?').join(', ');

  const [rows] = await conn.query(
    `
      SELECT 1
      FROM frp_request_items fri
      INNER JOIN master_budgets mb
        ON mb.id = fri.budget_id
      WHERE fri.frp_request_id = ?
        AND (
          mb.department_id IN (${placeholders})
          OR mb.class_department_id IN (${placeholders})
        )
      LIMIT 1
    `,
    [frpRequestId, ...safeDepartmentIds, ...safeDepartmentIds]
  );

  return rows.length > 0;
}

async function getFrpDetail(conn, id) {
  const header = await getFrpHeaderById(conn, id);

  if (!header) {
    return null;
  }

  const [items, documents, attachments, approval_logs] = await Promise.all([
    getFrpItems(conn, id),
    getFrpDocuments(conn, id),
    getFrpAttachments(conn, id),
    getFrpApprovalLogs(conn, id),
  ]);

  return {
    ...header,
    items,
    documents,
    attachments,
    approval_logs,
  };
}

async function insertFrpHeader(conn, data) {
  await conn.query(
    `
      INSERT INTO frp_requests (
        id,
        frp_number,
        status,

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

        requested_by_user_id,
        requested_by_username,
        requested_by_name,
        requested_by_job_position,
        requested_by_job_level_name,
        requested_by_job_level_value,

        frp_date,
        description,
        currency_code,
        exchange_rate,

        vendor_id,
        vendor_bank_account_id,
        vendor_name_snapshot,
        vendor_bank_code_snapshot,
        vendor_bank_name_snapshot,
        vendor_account_number_snapshot,
        vendor_account_name_snapshot,

        internal_po_number,

        external_document_type_id,
        external_document_type_code_snapshot,
        external_document_type_name_snapshot,
        external_document_number,

        payment_method_id,
        payment_method_code_snapshot,
        payment_method_name_snapshot,

        payment_date,
        destination_bank_name,
        destination_bank_account,
        destination_bank_account_name,

        total_amount,

        created_by_user_id,
        created_by_name,
        updated_by_user_id,
        updated_by_name,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?,
        ?, ?, ?, ?,
        NOW(), NOW()
      )
    `,
    [
      data.id,
      data.frp_number,
      data.status,

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

      data.requested_by_user_id,
      data.requested_by_username,
      data.requested_by_name,
      data.requested_by_job_position,
      data.requested_by_job_level_name,
      data.requested_by_job_level_value,

      data.frp_date,
      data.description,
      data.currency_code,
      data.exchange_rate,

      data.vendor_id,
      data.vendor_bank_account_id,
      data.vendor_name_snapshot,
      data.vendor_bank_code_snapshot,
      data.vendor_bank_name_snapshot,
      data.vendor_account_number_snapshot,
      data.vendor_account_name_snapshot,

      data.internal_po_number,

      data.external_document_type_id,
      data.external_document_type_code_snapshot,
      data.external_document_type_name_snapshot,
      data.external_document_number,

      data.payment_method_id,
      data.payment_method_code_snapshot,
      data.payment_method_name_snapshot,

      data.payment_date,
      data.destination_bank_name,
      data.destination_bank_account,
      data.destination_bank_account_name,

      data.total_amount,

      data.created_by_user_id,
      data.created_by_name,
      data.updated_by_user_id,
      data.updated_by_name,
    ]
  );
}

async function insertFrpItem(conn, data) {
  await conn.query(
    `
      INSERT INTO frp_request_items (
        id,
        frp_request_id,
        budget_id,
        budget_code_snapshot,
        budget_project_name_snapshot,
        budget_type_code_snapshot,
        budget_type_name_snapshot,
        memo,
        quantity,
        unit_price,
        amount,
        budget_remaining_before,
        budget_remaining_after,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [
      data.id,
      data.frp_request_id,
      data.budget_id,
      data.budget_code_snapshot,
      data.budget_project_name_snapshot,
      data.budget_type_code_snapshot,
      data.budget_type_name_snapshot,
      data.memo,
      data.quantity,
      data.unit_price,
      data.amount,
      data.budget_remaining_before,
      data.budget_remaining_after,
    ]
  );
}

async function insertFrpDocument(conn, data) {
  await conn.query(
    `
      INSERT INTO frp_request_documents (
        frp_request_id,
        document_type_id,
        document_code_snapshot,
        document_name_snapshot,
        created_at
      )
      VALUES (?, ?, ?, ?, NOW())
    `,
    [
      data.frp_request_id,
      data.document_type_id,
      data.document_code_snapshot,
      data.document_name_snapshot,
    ]
  );
}

async function insertFrpApprovalLog(conn, data) {
  await conn.query(
    `
      INSERT INTO frp_request_approval_logs (
        frp_request_id,
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
      data.frp_request_id,
      data.action,
      data.from_status || null,
      data.to_status || null,
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

async function updateFrpStatusApproved(conn, id, user) {
  await conn.query(
    `
      UPDATE frp_requests
      SET
        status = 'APPROVED',
        approved_by_user_id = ?,
        approved_by_name = ?,
        approved_at = NOW(),
        rejected_by_user_id = NULL,
        rejected_by_name = NULL,
        rejected_at = NULL,
        rejected_reason = NULL,
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [user.id, user.name, user.id, user.name, id]
  );
}

async function updateFrpStatusRejected(conn, id, user, reason) {
  await conn.query(
    `
      UPDATE frp_requests
      SET
        status = 'REJECTED',
        rejected_by_user_id = ?,
        rejected_by_name = ?,
        rejected_at = NOW(),
        rejected_reason = ?,
        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [user.id, user.name, reason, user.id, user.name, id]
  );
}

async function updateFrpStatusReverted(conn, id, user, reason) {
  await conn.query(
    `
      UPDATE frp_requests
      SET
        status = 'PENDING',
        approved_by_user_id = NULL,
        approved_by_name = NULL,
        approved_at = NULL,
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

async function updateFrpHeader(conn, id, data) {
  await conn.query(
    `
      UPDATE frp_requests
      SET
        frp_date = ?,
        description = ?,
        currency_code = ?,
        exchange_rate = ?,

        vendor_id = ?,
        vendor_bank_account_id = ?,
        vendor_name_snapshot = ?,
        vendor_bank_code_snapshot = ?,
        vendor_bank_name_snapshot = ?,
        vendor_account_number_snapshot = ?,
        vendor_account_name_snapshot = ?,

        internal_po_number = ?,

        external_document_type_id = ?,
        external_document_type_code_snapshot = ?,
        external_document_type_name_snapshot = ?,
        external_document_number = ?,

        payment_method_id = ?,
        payment_method_code_snapshot = ?,
        payment_method_name_snapshot = ?,

        payment_date = ?,
        destination_bank_name = ?,
        destination_bank_account = ?,
        destination_bank_account_name = ?,

        total_amount = ?,

        updated_by_user_id = ?,
        updated_by_name = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      data.frp_date,
      data.description,
      data.currency_code,
      data.exchange_rate,

      data.vendor_id,
      data.vendor_bank_account_id,
      data.vendor_name_snapshot,
      data.vendor_bank_code_snapshot,
      data.vendor_bank_name_snapshot,
      data.vendor_account_number_snapshot,
      data.vendor_account_name_snapshot,

      data.internal_po_number,

      data.external_document_type_id,
      data.external_document_type_code_snapshot,
      data.external_document_type_name_snapshot,
      data.external_document_number,

      data.payment_method_id,
      data.payment_method_code_snapshot,
      data.payment_method_name_snapshot,

      data.payment_date,
      data.destination_bank_name,
      data.destination_bank_account,
      data.destination_bank_account_name,

      data.total_amount,

      data.updated_by_user_id,
      data.updated_by_name,
      id,
    ]
  );
}

async function deleteFrpItems(conn, frpRequestId) {
  await conn.query(
    `
      DELETE FROM frp_request_items
      WHERE frp_request_id = ?
    `,
    [frpRequestId]
  );
}

async function deleteFrpDocuments(conn, frpRequestId) {
  await conn.query(
    `
      DELETE FROM frp_request_documents
      WHERE frp_request_id = ?
    `,
    [frpRequestId]
  );
}

module.exports = {
  db,
  listFrpRequests,
  countFrpRequests,
  getFrpHeaderById,
  getFrpItems,
  getFrpDocuments,
  getFrpAttachments,
  getFrpApprovalLogs,
  hasFrpBudgetDepartmentAccess,
  getFrpDetail,
  insertFrpHeader,
  insertFrpItem,
  insertFrpDocument,
  insertFrpApprovalLog,
  updateFrpHeader,
  deleteFrpItems,
  deleteFrpDocuments,
  updateFrpStatusApproved,
  updateFrpStatusRejected,
  updateFrpStatusReverted,
};