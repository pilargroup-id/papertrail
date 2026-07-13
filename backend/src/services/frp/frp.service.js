const { randomUUID } = require('crypto');

const frpModel = require('../../models/frp/frp.model');
const { deleteObjectIfExists } = require('../storage/gcsStorage.service');
const frpAttachmentModel = require('../../models/frp/frpAttachment.model');

const { generateDocumentNumber } = require('../documentNumber/documentNumber.service');
const {
  getBudgetForUpdate,
  reserveBudget,
  finalizeBudget,
  releaseBudget,
  revertFinalizeBudget,
} = require('../budget/budgetTransaction.service');

const {
  resolveVendorSnapshot,
  resolveVendorBankAccountSnapshot,
  resolveExternalDocumentTypeSnapshot,
  resolvePaymentMethodSnapshot,
  resolveFrpDocumentTypeSnapshots,
  buildUserSnapshot,
} = require('../master/masterSnapshot.service');

const activityLogService = require('../activity/activityLog.service');
const { resolveCurrencyRateSnapshot } = require('../master/currency.service');

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return fallback;
  }

  return number;
}

function normalizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function assertRequired(value, message) {
  if (value === undefined || value === null || value === '') {
    throw new Error(message);
  }
}

function getPrimaryCompany(user = {}) {
  const companies = Array.isArray(user.companies) ? user.companies : [];

  return (
    companies.find((item) => Number(item.is_primary) === 1) ||
    companies[0] ||
    null
  );
}

function getUserDepartmentIds(user = {}) {
  const ids = [];

  if (user.department_id) {
    ids.push(Number(user.department_id));
  }

  const departments = Array.isArray(user.departments) ? user.departments : [];

  departments.forEach((department) => {
    if (department.id) {
      ids.push(Number(department.id));
    }
  });

  return [...new Set(ids.filter(Boolean))];
}

function getUserDepartmentContexts(user = {}) {
  const contexts = [];

  if (user.context_department_id || user.department_id) {
    const departmentId = Number(user.context_department_id || user.department_id);
    const classDepartmentId = Number(user.class_department_id || departmentId);

    contexts.push({
      department_id: departmentId,
      department_name: user.context_department_name || user.department || null,
      department_class: user.context_department_class || user.department_class || user.department || null,
      department_code: user.context_department_code || user.department_code || null,

      class_department_id: classDepartmentId,
      class_name: user.class_name || user.context_department_name || user.department || null,
      class_class: user.class_class || user.context_department_class || user.department_class || user.department || null,
      class_code: user.class_code || user.context_department_code || user.department_code || null,
    });
  }

  const departments = Array.isArray(user.departments) ? user.departments : [];

  departments.forEach((department) => {
    const departmentId = Number(department.department_id || department.id || 0);
    const classDepartmentId = Number(department.class_department_id || department.id || departmentId);

    if (!departmentId || !classDepartmentId) {
      return;
    }

    contexts.push({
      department_id: departmentId,
      department_name: department.department_name || department.name || null,
      department_class: department.department_class || department.class || null,
      department_code: department.department_code || department.code || null,

      class_department_id: classDepartmentId,
      class_name: department.class_name || department.name || null,
      class_class: department.class_class || department.class || null,
      class_code: department.class_code || department.code || null,
    });
  });

  const uniqueMap = new Map();

  contexts
    .filter((context) => context.department_id && context.class_department_id)
    .forEach((context) => {
      uniqueMap.set(
        `${context.department_id}:${context.class_department_id}`,
        context
      );
    });

  return [...uniqueMap.values()];
}

function resolveRequesterDepartmentContext(user = {}, body = {}) {
  const contexts = getUserDepartmentContexts(user);

  if (!contexts.length) {
    throw new Error('User department is required');
  }

  const selectedDepartmentId = body.department_id
    ? Number(body.department_id)
    : null;

  const selectedClassDepartmentId = body.class_department_id
    ? Number(body.class_department_id)
    : null;

  if (!selectedDepartmentId && contexts.length === 1) {
    return contexts[0];
  }

  if (!selectedDepartmentId) {
    throw new Error('Department is required for multi-department user');
  }

  if (!selectedClassDepartmentId) {
    const sameDepartmentContexts = contexts.filter((context) => {
      return Number(context.department_id) === selectedDepartmentId;
    });

    if (sameDepartmentContexts.length === 1) {
      return sameDepartmentContexts[0];
    }

    throw new Error('Class department is required for selected department');
  }

  const matchedContext = contexts.find((context) => {
    return (
      Number(context.department_id) === selectedDepartmentId &&
      Number(context.class_department_id) === selectedClassDepartmentId
    );
  });

  if (!matchedContext) {
    throw new Error('Selected department/class is not assigned to current user');
  }

  return matchedContext;
}

function userHasDepartmentClassScope(user = {}, departmentId, classDepartmentId = null) {
  const contexts = getUserDepartmentContexts(user);

  return contexts.some((context) => {
    if (Number(context.department_id) !== Number(departmentId)) {
      return false;
    }

    if (!classDepartmentId) {
      return true;
    }

    return Number(context.class_department_id) === Number(classDepartmentId);
  });
}

function buildRequesterCompanyDepartmentSnapshot(user = {}, body = {}) {
  const primaryCompany = getPrimaryCompany(user);
  const selectedContext = resolveRequesterDepartmentContext(user, body);

  const companyId = user.company_id ?? primaryCompany?.id ?? null;
  const companyCode = user.company_code ?? primaryCompany?.code ?? null;
  const companyName = user.company ?? primaryCompany?.name ?? null;

  return {
    company_id: companyId,
    company_code_snapshot: companyCode,
    company_name_snapshot: companyName,

    department_id: selectedContext.department_id,
    department_name_snapshot: selectedContext.department_name,
    department_class_snapshot: selectedContext.department_class,
    department_code_snapshot: selectedContext.department_code,

    class_department_id: selectedContext.class_department_id,
    class_name_snapshot: selectedContext.class_name,
    class_class_snapshot: selectedContext.class_class,
    class_code_snapshot: selectedContext.class_code,
  };
}

function isUserInItDepartment(user = {}) {
  const directClass = String(user.department_class || '').toUpperCase();
  const directName = String(user.department || '').toUpperCase();
  const directCode = String(user.department_code || '').toUpperCase();

  if (directClass === 'IT' || directName === 'IT' || directCode === 'SIT') {
    return true;
  }

  const departments = Array.isArray(user.departments) ? user.departments : [];

  return departments.some((department) => {
    const departmentClass = String(department.class || '').toUpperCase();
    const departmentName = String(department.name || '').toUpperCase();
    const departmentCode = String(department.code || '').toUpperCase();

    return departmentClass === 'IT' || departmentName === 'IT' || departmentCode === 'SIT';
  });
}

function isManagerLevel(user = {}) {
  return Number(user.job_level_value || 0) >= 4;
}

function userHasCompanyScope(user = {}, companyId) {
  if (!companyId) {
    return false;
  }

  if (String(user.company_id || '') === String(companyId)) {
    return true;
  }

  const companies = Array.isArray(user.companies) ? user.companies : [];

  return companies.some((company) => String(company.id || '') === String(companyId));
}

function canViewAllFrp(user = {}) {
  return isUserInItDepartment(user);
}

function canViewFrpByHeader(user = {}, frp = {}) {
  if (canViewAllFrp(user)) {
    return true;
  }

  if (String(frp.requested_by_user_id || '') === String(user.id || '')) {
    return true;
  }

  if (
    isManagerLevel(user) &&
    userHasCompanyScope(user, frp.company_id) &&
    userHasDepartmentClassScope(user, frp.department_id, frp.class_department_id)
    ) {
    return true;
  }

  return false;
}

async function canViewFrp(conn, user = {}, frp = {}) {
  if (canViewFrpByHeader(user, frp)) {
    return true;
  }

  const departmentIds = getUserDepartmentIds(user);

  return frpModel.hasFrpBudgetDepartmentAccess(conn, frp.id, departmentIds);
}

function canEditFrp(user = {}, frp = {}) {
  if (frp.status !== 'PENDING') {
    return false;
  }

  if (isUserInItDepartment(user)) {
    return true;
  }

  return String(frp.requested_by_user_id || '') === String(user.id || '');
}

function buildHeaderSnapshotFromExistingFrp(frp = {}) {
  return {
    company_id: frp.company_id,
    company_code_snapshot: frp.company_code_snapshot,
    company_name_snapshot: frp.company_name_snapshot,

    department_id: frp.department_id,
    department_name_snapshot: frp.department_name_snapshot,
    department_class_snapshot: frp.department_class_snapshot,
    department_code_snapshot: frp.department_code_snapshot,

    class_department_id: frp.class_department_id,
    class_name_snapshot: frp.class_name_snapshot,
    class_class_snapshot: frp.class_class_snapshot,
    class_code_snapshot: frp.class_code_snapshot,
  };
}

function validateUpdatePayload(body = {}) {
  validateCreatePayload(body);

  if (!Array.isArray(body.document_type_ids)) {
    throw new Error('Document type IDs must be an array');
  }
}

function isFrpCreator(user = {}, frp = {}) {
  return String(frp.requested_by_user_id || '') === String(user.id || '');
}

function canApproveFrp(user = {}, frp = {}) {
  if (isFrpCreator(user, frp)) {
    return false;
  }

  if (!isManagerLevel(user)) {
    return false;
  }

  return (
    userHasCompanyScope(user, frp.company_id) &&
    userHasDepartmentClassScope(user, frp.department_id, frp.class_department_id)
  );
}

function canRejectFrp(user = {}, frp = {}) {
  return canApproveFrp(user, frp);
}

function canRevertFrp(user = {}, frp = {}) {
  if (frp.status !== 'APPROVED') {
    return false;
  }

  if (isUserInItDepartment(user)) {
    return true;
  }

  if (!isManagerLevel(user)) {
    return false;
  }

  return (
    userHasCompanyScope(user, frp.company_id) &&
    userHasDepartmentClassScope(user, frp.department_id, frp.class_department_id)
  );
}

function buildActorLogPayload(user = {}) {
  return {
    actor_user_id: user.id,
    actor_username: user.username || null,
    actor_name: user.name,
    actor_job_position: user.job_position || null,
    actor_job_level_name: user.job_level || null,
    actor_job_level_value: user.job_level_value ?? null,
    actor_company_id: user.company_id || null,
    actor_company_name_snapshot: user.company || null,
    actor_department_id: user.department_id || null,
    actor_department_name_snapshot: user.department || null,
    actor_class_department_id: user.department_id || null,
    actor_class_name_snapshot: user.department || null,
  };
}

function buildListAccessQuery(user = {}) {
  const departmentIds = getUserDepartmentIds(user);
  const departmentContexts = getUserDepartmentContexts(user);

  return {
    canViewAll: canViewAllFrp(user),
    userId: user.id || null,
    managerCompanyId: isManagerLevel(user) ? user.company_id || null : null,
    managerDepartmentIds: isManagerLevel(user) ? departmentIds : [],
    managerDepartmentContexts: isManagerLevel(user) ? departmentContexts : [],
    budgetDepartmentIds: departmentIds,
    budgetDepartmentContexts: departmentContexts,
  };
}

function validateCreatePayload(body = {}) {
  assertRequired(body.frp_date, 'FRP date is required');
  assertRequired(body.vendor_id, 'Vendor is required');
  assertRequired(body.payment_method_id, 'Payment method is required');

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error('FRP items are required');
  }

  body.items.forEach((item, index) => {
    assertRequired(item.budget_id, `Budget is required on item ${index + 1}`);

    const quantity = normalizeNumber(item.quantity, 0);
    const unitPrice = normalizeNumber(item.unit_price, 0);
    const amount = normalizeNumber(item.amount, quantity * unitPrice);

    if (quantity <= 0) {
      throw new Error(`Quantity must be greater than 0 on item ${index + 1}`);
    }

    if (unitPrice <= 0) {
      throw new Error(`Unit price must be greater than 0 on item ${index + 1}`);
    }

    if (amount <= 0) {
      throw new Error(`Amount must be greater than 0 on item ${index + 1}`);
    }
  });
}

async function buildFrpItems(conn, bodyItems = [], currencySnapshot = {}) {
  const items = [];
  const currencyCode = currencySnapshot.currency_code || 'IDR';
  const exchangeRate = normalizeNumber(currencySnapshot.exchange_rate, 1);

  for (const item of bodyItems) {
    const quantity = normalizeNumber(item.quantity, 0);
    const unitPrice = normalizeNumber(item.unit_price, 0);
    const amountOriginal = normalizeNumber(item.amount, quantity * unitPrice);
    const amountIdr = amountOriginal * exchangeRate;

    const budget = await getBudgetForUpdate(conn, item.budget_id);

    if (!budget) {
      throw new Error('Budget not found');
    }

    const remainingBefore = Number(budget.budget_remaining || 0);
    const remainingAfter = remainingBefore - amountIdr;

    items.push({
      id: randomUUID(),

      budget_id: budget.id,
      budget_code_snapshot: budget.budget_code,
      budget_project_name_snapshot: budget.project_name,
      budget_type_code_snapshot: budget.budget_type_code,
      budget_type_name_snapshot: budget.budget_type_name,

      budget_department_id: budget.department_id,
      budget_department_name_snapshot: budget.department_name_snapshot,
      budget_department_class_snapshot: budget.department_class_snapshot,
      budget_department_code_snapshot: budget.department_code_snapshot,

      budget_class_department_id: budget.class_department_id,
      budget_class_name_snapshot: budget.class_name_snapshot,
      budget_class_class_snapshot: budget.class_class_snapshot,
      budget_class_code_snapshot: budget.class_code_snapshot,

      memo: normalizeString(item.memo),
      currency_code: currencyCode,
      exchange_rate: exchangeRate,
      quantity,
      unit_price: unitPrice,
      amount: amountOriginal,
      amount_original: amountOriginal,
      amount_idr: amountIdr,
      budget_remaining_before: remainingBefore,
      budget_remaining_after: remainingAfter,
    });
  }

  return items;
}

function getDocumentNumberDepartmentFromItems(items = []) {
  if (!items.length) {
    throw new Error('FRP items are required');
  }

  const firstItem = items[0];

  if (!firstItem.budget_department_id) {
    throw new Error('Budget department is required for document number');
  }

  if (!firstItem.budget_department_code_snapshot) {
    throw new Error('Budget department code is required for document number');
  }

  const budgetDepartmentId = Number(firstItem.budget_department_id);

  const hasDifferentBudgetDepartment = items.some((item) => {
    return Number(item.budget_department_id) !== budgetDepartmentId;
  });

  if (hasDifferentBudgetDepartment) {
    throw new Error('All FRP items must use budgets from the same department');
  }

  return {
    departmentId: firstItem.budget_department_id,
    departmentCode: firstItem.budget_department_code_snapshot,
  };
}

async function getBudgetDepartmentFromExistingItems(conn, items = []) {
  if (!items.length) {
    throw new Error('Existing FRP items are not found');
  }

  const firstItem = items[0];
  const firstBudget = await getBudgetForUpdate(conn, firstItem.budget_id);

  if (!firstBudget) {
    throw new Error('Existing budget not found');
  }

  return {
    departmentId: Number(firstBudget.department_id),
    departmentCode: firstBudget.department_code_snapshot,
  };
}

function assertBudgetDepartmentNotChanged(oldDepartment, newDepartment) {
  if (Number(oldDepartment.departmentId) !== Number(newDepartment.departmentId)) {
    throw new Error(
      `Budget department cannot be changed on existing FRP. Current department is ${oldDepartment.departmentCode}`
    );
  }
}

function sumTotalAmount(items = []) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function sumTotalAmountIdr(items = []) {
  return items.reduce((sum, item) => sum + Number(item.amount_idr || item.amount || 0), 0);
}

function getItemBudgetAmount(item = {}) {
  const amountIdr = Number(item.amount_idr || 0);

  if (amountIdr > 0) {
    return amountIdr;
  }

  return Number(item.amount || 0);
}

async function cancelAttachmentsByRemovedDocumentTypes(
  conn,
  frpRequestId,
  removedDocumentTypeIds = [],
  user = {}
) {
  if (!Array.isArray(removedDocumentTypeIds) || removedDocumentTypeIds.length === 0) {
    return [];
  }

  const attachments = await frpAttachmentModel.getActiveAttachmentsByDocumentTypeIds(
    conn,
    frpRequestId,
    removedDocumentTypeIds
  );

  const results = [];

  for (const attachment of attachments) {
    const deletedFromStorage = await deleteObjectIfExists(attachment.object_path);

    await frpAttachmentModel.cancelAttachment(conn, attachment.id, user);

    results.push({
      attachment_id: attachment.id,
      document_type_id: attachment.document_type_id,
      upload_status: 'CANCELED',
      deleted_from_storage: deletedFromStorage,
    });
  }

  return results;
}

async function listFrp(query = {}, user = {}) {
  const conn = await frpModel.db.getConnection();

  try {
    const finalQuery = {
      ...query,
      __access: buildListAccessQuery(user),
    };

    const result = await frpModel.listFrpRequests(conn, finalQuery, user);

    return {
      data: result.rows,
      meta: result.meta,
    };
  } finally {
    conn.release();
  }
}

async function getFrpDetail(id, user = {}) {
  const conn = await frpModel.db.getConnection();

  try {
    const detail = await frpModel.getFrpDetail(conn, id);

    if (!detail) {
      return null;
    }

    const allowed = await canViewFrp(conn, user, detail);

    if (!allowed) {
      throw new Error('You do not have access to this FRP request');
    }

    return detail;
  } finally {
    conn.release();
  }
}

async function createFrp(body = {}, user = {}, req = null) {
  validateCreatePayload(body);

  const conn = await frpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const userSnapshot = buildUserSnapshot(user);
    const headerSnapshot = buildRequesterCompanyDepartmentSnapshot(user, body);
    const userDepartmentContexts = getUserDepartmentContexts(user);

    if (!headerSnapshot.company_id) {
      throw new Error('Company is required');
    }

    if (!headerSnapshot.department_id) {
      throw new Error('Department is required');
    }

    if (!headerSnapshot.class_department_id) {
      throw new Error('Class department is required');
    }

    if (!headerSnapshot.department_code_snapshot) {
      throw new Error('Department code snapshot is required');
    }

    const vendorSnapshot = await resolveVendorSnapshot(conn, body.vendor_id);

    const vendorBankSnapshot = await resolveVendorBankAccountSnapshot(
      conn,
      body.vendor_id,
      body.vendor_bank_account_id || null
    );

    const externalDocumentTypeSnapshot = await resolveExternalDocumentTypeSnapshot(
      conn,
      body.external_document_type_id || null
    );

    const paymentMethodSnapshot = await resolvePaymentMethodSnapshot(
      conn,
      body.payment_method_id
    );

    const documentSnapshots = await resolveFrpDocumentTypeSnapshots(
      conn,
      body.document_type_ids || []
    );

    const currencySnapshot = await resolveCurrencyRateSnapshot(
      conn,
      body.currency_code || 'IDR',
      body.frp_date || null
    );

    const frpId = randomUUID();

    const items = await buildFrpItems(conn, body.items, currencySnapshot);
    const documentNumberDepartment = getDocumentNumberDepartmentFromItems(items);

    const frpNumber = await generateDocumentNumber(conn, {
      module: 'FRP',
      departmentId: documentNumberDepartment.departmentId,
      departmentCode: documentNumberDepartment.departmentCode,
      date: body.frp_date ? new Date(body.frp_date) : new Date(),
    });

    const totalAmount = sumTotalAmount(items);
    const totalAmountIdr = sumTotalAmountIdr(items);

    const headerData = {
      id: frpId,
      frp_number: frpNumber,
      status: 'PENDING',

      ...headerSnapshot,
      ...userSnapshot,
      ...vendorSnapshot,
      ...vendorBankSnapshot,
      ...externalDocumentTypeSnapshot,
      ...paymentMethodSnapshot,

      frp_date: body.frp_date,
      description: normalizeString(body.description),
      ...currencySnapshot,

      internal_po_number: normalizeString(body.internal_po_number),
      external_document_number: normalizeString(body.external_document_number),

      payment_date: body.payment_date || null,
      destination_bank_name: normalizeString(body.destination_bank_name),
      destination_bank_account: normalizeString(body.destination_bank_account),
      destination_bank_account_name: normalizeString(body.destination_bank_account_name),

      total_amount: totalAmount,
      total_amount_idr: totalAmountIdr,
    };

    await frpModel.insertFrpHeader(conn, headerData);

    for (const item of items) {
      await frpModel.insertFrpItem(conn, {
        ...item,
        frp_request_id: frpId,
      });

      await reserveBudget(conn, {
        budgetId: item.budget_id,
        amount: getItemBudgetAmount(item),
        sourceModule: 'FRP',
        sourceHeaderId: frpId,
        sourceItemId: item.id,
        header: headerSnapshot,
        user,
        userDepartmentContexts,
        notes: `Reserve budget for ${frpNumber}`,
      });
    }

    for (const documentSnapshot of documentSnapshots) {
      await frpModel.insertFrpDocument(conn, {
        frp_request_id: frpId,
        ...documentSnapshot,
      });
    }

    await frpModel.insertFrpApprovalLog(conn, {
      frp_request_id: frpId,
      action: 'SUBMIT',
      from_status: null,
      to_status: 'PENDING',
      ...buildActorLogPayload(user),
      notes: body.notes || null,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'FRP',
      entityType: 'frp_requests',
      entityId: frpId,
      action: 'CREATE',
      description: `Create FRP ${frpNumber}`,
      actor: user,
      req,
      oldValues: null,
      newValues: {
        id: frpId,
        frp_number: frpNumber,
        status: 'PENDING',
        total_amount: totalAmount,
        total_amount_idr: totalAmountIdr,
      },
      metadata: {
        frp_number: frpNumber,
        total_amount: totalAmount,
        total_amount_idr: totalAmountIdr,
      },
    });

    await conn.commit();

    return {
      id: frpId,
      frp_number: frpNumber,
      status: 'PENDING',
      total_amount: totalAmount,
      total_amount_idr: totalAmountIdr,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function updateFrp(id, body = {}, user = {}, req = null) {
  validateUpdatePayload(body);

  const conn = await frpModel.db.getConnection();
  const userDepartmentContexts = getUserDepartmentContexts(user);

  try {
    await conn.beginTransaction();

    const frp = await frpModel.getFrpHeaderById(conn, id, { lock: true });

    if (!frp) {
      throw new Error('FRP request not found');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Only PENDING FRP can be updated');
    }

    if (!canEditFrp(user, frp)) {
      throw new Error('Only FRP creator or IT SuperUser can update this FRP');
    }

    const oldItems = await frpModel.getFrpItems(conn, id);
    const oldDocuments = await frpModel.getFrpDocuments(conn, id);

    const oldBudgetDepartment = await getBudgetDepartmentFromExistingItems(conn, oldItems);

    const vendorSnapshot = await resolveVendorSnapshot(conn, body.vendor_id);

    const vendorBankSnapshot = await resolveVendorBankAccountSnapshot(
      conn,
      body.vendor_id,
      body.vendor_bank_account_id || null
    );

    const externalDocumentTypeSnapshot = await resolveExternalDocumentTypeSnapshot(
      conn,
      body.external_document_type_id || null
    );

    const paymentMethodSnapshot = await resolvePaymentMethodSnapshot(
      conn,
      body.payment_method_id
    );

    const newDocumentSnapshots = await resolveFrpDocumentTypeSnapshots(
      conn,
      body.document_type_ids
    );

    const currencySnapshot = await resolveCurrencyRateSnapshot(
      conn,
      body.currency_code || frp.currency_code || 'IDR',
      body.frp_date || frp.frp_date || null
    );

    const newItems = await buildFrpItems(conn, body.items, currencySnapshot);
    const newBudgetDepartment = getDocumentNumberDepartmentFromItems(newItems);

    assertBudgetDepartmentNotChanged(oldBudgetDepartment, newBudgetDepartment);

    const headerSnapshot = buildHeaderSnapshotFromExistingFrp(frp);
    const totalAmount = sumTotalAmount(newItems);
    const totalAmountIdr = sumTotalAmountIdr(newItems);

    const oldDocumentTypeIds = oldDocuments.map((document) => Number(document.document_type_id));
    const newDocumentTypeIds = newDocumentSnapshots.map((document) => Number(document.document_type_id));

    const removedDocumentTypeIds = oldDocumentTypeIds.filter((documentTypeId) => {
      return !newDocumentTypeIds.includes(documentTypeId);
    });

    const canceledAttachments = await cancelAttachmentsByRemovedDocumentTypes(
      conn,
      id,
      removedDocumentTypeIds,
      user
    );

    for (const oldItem of oldItems) {
      await releaseBudget(conn, {
        budgetId: oldItem.budget_id,
        amount: getItemBudgetAmount(oldItem),
        sourceModule: 'FRP',
        sourceHeaderId: id,
        sourceItemId: oldItem.id,
        user,
        notes: `Release old reserved budget for updated ${frp.frp_number}`,
      });
    }

    await frpModel.deleteFrpItems(conn, id);

    for (const newItem of newItems) {
      await frpModel.insertFrpItem(conn, {
        ...newItem,
        frp_request_id: id,
      });

      await reserveBudget(conn, {
        budgetId: newItem.budget_id,
        amount: getItemBudgetAmount(newItem),
        sourceModule: 'FRP',
        sourceHeaderId: id,
        sourceItemId: newItem.id,
        header: headerSnapshot,
        user,
        userDepartmentContexts,
        notes: `Reserve updated budget for ${frp.frp_number}`,
      });
    }

    await frpModel.deleteFrpDocuments(conn, id);

    for (const documentSnapshot of newDocumentSnapshots) {
      await frpModel.insertFrpDocument(conn, {
        frp_request_id: id,
        ...documentSnapshot,
      });
    }

    await frpModel.updateFrpHeader(conn, id, {
      ...vendorSnapshot,
      ...vendorBankSnapshot,
      ...externalDocumentTypeSnapshot,
      ...paymentMethodSnapshot,

      frp_date: body.frp_date,
      description: normalizeString(body.description),
      ...currencySnapshot,

      internal_po_number: normalizeString(body.internal_po_number),
      external_document_number: normalizeString(body.external_document_number),

      payment_date: body.payment_date || null,
      destination_bank_name: normalizeString(body.destination_bank_name),
      destination_bank_account: normalizeString(body.destination_bank_account),
      destination_bank_account_name: normalizeString(body.destination_bank_account_name),

      total_amount: totalAmount,
      total_amount_idr: totalAmountIdr,

      updated_by_user_id: user.id,
      updated_by_name: user.name,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'FRP',
      entityType: 'frp_requests',
      entityId: id,
      action: 'UPDATE',
      description: `Update FRP ${frp.frp_number}`,
      actor: user,
      req,
      oldValues: {
        total_amount: frp.total_amount,
        total_amount_idr: frp.total_amount_idr,
        description: frp.description,
      },
      newValues: {
        total_amount: totalAmount,
        total_amount_idr: totalAmountIdr,
        description: normalizeString(body.description),
      },
      metadata: {
        frp_number: frp.frp_number,
        total_amount: totalAmount,
        total_amount_idr: totalAmountIdr,
        canceled_attachments: canceledAttachments,
      },
    });

    await conn.commit();

    return {
      id,
      frp_number: frp.frp_number,
      status: 'PENDING',
      total_amount: totalAmount,
      total_amount_idr: totalAmountIdr,
      canceled_attachments: canceledAttachments,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function approveFrp(id, user = {}, body = {}, req = null) {
  const conn = await frpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const frp = await frpModel.getFrpHeaderById(conn, id, { lock: true });

    if (!frp) {
      throw new Error('FRP request not found');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Only PENDING FRP can be approved');
    }

    if (isFrpCreator(user, frp)) {
      throw new Error('You cannot approve your own FRP');
    }

    if (!canApproveFrp(user, frp)) {
      throw new Error('Only manager from requester department can approve this FRP');
    }

    const items = await frpModel.getFrpItems(conn, id);

    for (const item of items) {
      await finalizeBudget(conn, {
        budgetId: item.budget_id,
        amount: getItemBudgetAmount(item),
        sourceModule: 'FRP',
        sourceHeaderId: id,
        sourceItemId: item.id,
        user,
        notes: `Finalize budget for ${frp.frp_number}`,
      });
    }

    await frpModel.updateFrpStatusApproved(conn, id, user);

    await frpModel.insertFrpApprovalLog(conn, {
      frp_request_id: id,
      action: 'APPROVE',
      from_status: 'PENDING',
      to_status: 'APPROVED',
      ...buildActorLogPayload(user),
      notes: body.notes || null,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'FRP',
      entityType: 'frp_requests',
      entityId: id,
      action: 'APPROVE',
      description: `Approve FRP ${frp.frp_number}`,
      actor: user,
      req,
      oldValues: {
        status: 'PENDING',
      },
      newValues: {
        status: 'APPROVED',
        approved_by_user_id: user.id,
        approved_by_name: user.name,
      },
      metadata: {
        frp_number: frp.frp_number,
      },
    });

    await conn.commit();

    return {
      id,
      frp_number: frp.frp_number,
      status: 'APPROVED',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function rejectFrp(id, user = {}, body = {}, req = null) {
  const reason = normalizeString(body.reason || body.notes);

  if (!reason) {
    throw new Error('Reject reason is required');
  }

  const conn = await frpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const frp = await frpModel.getFrpHeaderById(conn, id, { lock: true });

    if (!frp) {
      throw new Error('FRP request not found');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Only PENDING FRP can be rejected');
    }

    if (isFrpCreator(user, frp)) {
    throw new Error('You cannot reject your own FRP');
    }

    if (!canRejectFrp(user, frp)) {
    throw new Error('Only manager from requester department can reject this FRP');
    }

    const items = await frpModel.getFrpItems(conn, id);

    for (const item of items) {
      await releaseBudget(conn, {
        budgetId: item.budget_id,
        amount: getItemBudgetAmount(item),
        sourceModule: 'FRP',
        sourceHeaderId: id,
        sourceItemId: item.id,
        user,
        notes: `Release budget for rejected ${frp.frp_number}`,
      });
    }

    await frpModel.updateFrpStatusRejected(conn, id, user, reason);

    await frpModel.insertFrpApprovalLog(conn, {
      frp_request_id: id,
      action: 'REJECT',
      from_status: 'PENDING',
      to_status: 'REJECTED',
      ...buildActorLogPayload(user),
      notes: reason,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'FRP',
      entityType: 'frp_requests',
      entityId: id,
      action: 'REJECT',
      description: `Reject FRP ${frp.frp_number}`,
      actor: user,
      req,
      oldValues: {
        status: 'PENDING',
      },
      newValues: {
        status: 'REJECTED',
        rejected_by_user_id: user.id,
        rejected_by_name: user.name,
        rejected_reason: reason,
      },
      metadata: {
        frp_number: frp.frp_number,
        reason,
      },
    });

    await conn.commit();

    return {
      id,
      frp_number: frp.frp_number,
      status: 'REJECTED',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function revertFrp(id, user = {}, body = {}, req = null) {
  const reason = normalizeString(body.reason || body.notes);

  if (!reason) {
    throw new Error('Revert reason is required');
  }

  const conn = await frpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const frp = await frpModel.getFrpHeaderById(conn, id, { lock: true });

    if (!frp) {
      throw new Error('FRP request not found');
    }

    if (frp.status !== 'APPROVED') {
      throw new Error('Only APPROVED FRP can be reverted');
    }

    if (!canRevertFrp(user, frp)) {
    throw new Error('Only IT SuperUser or manager from requester department can revert this FRP');
    }

    const items = await frpModel.getFrpItems(conn, id);

    for (const item of items) {
      await revertFinalizeBudget(conn, {
        budgetId: item.budget_id,
        amount: getItemBudgetAmount(item),
        sourceModule: 'FRP',
        sourceHeaderId: id,
        sourceItemId: item.id,
        user,
        notes: `Revert finalized budget for ${frp.frp_number}`,
      });
    }

    await frpModel.updateFrpStatusReverted(conn, id, user, reason);

    await frpModel.insertFrpApprovalLog(conn, {
      frp_request_id: id,
      action: 'REVERT',
      from_status: 'APPROVED',
      to_status: 'PENDING',
      ...buildActorLogPayload(user),
      notes: reason,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'FRP',
      entityType: 'frp_requests',
      entityId: id,
      action: 'REVERT',
      description: `Revert FRP ${frp.frp_number}`,
      actor: user,
      req,
      oldValues: {
        status: 'APPROVED',
      },
      newValues: {
        status: 'PENDING',
        reverted_by_user_id: user.id,
        reverted_by_name: user.name,
        reverted_reason: reason,
      },
      metadata: {
        frp_number: frp.frp_number,
        reason,
      },
    });

    await conn.commit();

    return {
      id,
      frp_number: frp.frp_number,
      status: 'PENDING',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  listFrp,
  getFrpDetail,
  createFrp,
  updateFrp,
  approveFrp,
  rejectFrp,
  revertFrp,
};
