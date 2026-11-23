const { randomUUID } = require('crypto');

const frpModel = require('../../models/frp/frp.model');
const rpModel = require('../../models/rp/rp.model');
const { deleteObjectIfExists } = require('../storage/gcsStorage.service');
const frpAttachmentModel = require('../../models/frp/frpAttachment.model');

const { generateDocumentNumber } = require('../documentNumber/documentNumber.service');
const {
  getBudgetForUpdate,
  hasCrossBudgetAccess,
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
const { isProductAssistantManager } = require('../../utils/productApprover.util');

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

function getUserCompanyIds(user = {}) {
  const ids = [];

  if (user.company_id) {
    ids.push(user.company_id);
  }

  const companies = Array.isArray(user.companies) ? user.companies : [];

  companies.forEach((company) => {
    if (company.id) {
      ids.push(company.id);
    }
  });

  return [...new Set(ids)];
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
    throw new Error('Departemen pengguna wajib ada.');
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
    throw new Error('Departemen wajib dipilih untuk pengguna dengan lebih dari satu departemen.');
  }

  if (!selectedClassDepartmentId) {
    const sameDepartmentContexts = contexts.filter((context) => {
      return Number(context.department_id) === selectedDepartmentId;
    });

    if (sameDepartmentContexts.length === 1) {
      return sameDepartmentContexts[0];
    }

    throw new Error('Kelas departemen wajib diisi untuk departemen yang dipilih.');
  }

  const matchedContext = contexts.find((context) => {
    return (
      Number(context.department_id) === selectedDepartmentId &&
      Number(context.class_department_id) === selectedClassDepartmentId
    );
  });

  if (!matchedContext) {
    throw new Error('Departemen/kelas yang dipilih tidak terdaftar untuk pengguna ini.');
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

function resolveSelectedCompany(user = {}, body = {}) {
  const companies = Array.isArray(user.companies) ? user.companies : [];
  const requestedId = String(body.company_id || user.company_id || getPrimaryCompany(user)?.id || '');
  if (!requestedId) throw new Error('Perusahaan wajib diisi.');
  const selected = companies.find((c) => String(c.id) === requestedId);
  if (!selected && String(user.company_id || '') !== requestedId) {
    throw new Error('Perusahaan yang dipilih tidak terdaftar untuk pengguna ini.');
  }
  return {
    company_id: requestedId,
    company_code_snapshot: selected?.code || (String(user.company_id || '') === requestedId ? user.company_code || null : null),
    company_name_snapshot: selected?.name || (String(user.company_id || '') === requestedId ? user.company || null : null),
  };
}

function buildRequesterCompanyDepartmentSnapshot(user = {}, body = {}) {
  const selectedContext = resolveRequesterDepartmentContext(user, body);
  const company = resolveSelectedCompany(user, body);

  return {
    ...company,

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
  const explicitManagerFlag = user.is_manager ?? user.isManager ?? null;

  if (explicitManagerFlag !== null && explicitManagerFlag !== undefined) {
    return ['1', 'true', 'yes'].includes(normalizeString(explicitManagerFlag).toLowerCase());
  }

  if (Number(user.job_level_value || 0) >= 4) {
    return true;
  }

  const roleText = [user.job_position, user.job_level, user.role, user.userRole]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return roleText.includes('manager');
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
  if (frp.source_module === 'RP' && isProductAssistantManager(user)) return true;
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
    throw new Error('Daftar ID tipe dokumen harus berupa array.');
  }
}

function isFrpCreator(user = {}, frp = {}) {
  return String(frp.requested_by_user_id || '') === String(user.id || '');
}

function isCrossDepartmentFrp(frp = {}) {
  const budgetDepartmentId = Number(frp.approval_budget_department_id || 0);

  return Boolean(budgetDepartmentId) && budgetDepartmentId !== Number(frp.department_id || 0);
}

function canApproveFrp(user = {}, frp = {}) {
  if (frp.source_module === 'RP') {
    return !isFrpCreator(user, frp) && isProductAssistantManager(user);
  }
  if (isFrpCreator(user, frp)) {
    return false;
  }

  if (!isManagerLevel(user)) {
    return false;
  }

  if (!userHasCompanyScope(user, frp.company_id)) {
    return false;
  }

  // FRP yang memakai budget department lain di-approve oleh manager department budget,
  // bukan manager department pembuat.
  if (isCrossDepartmentFrp(frp)) {
    return getUserDepartmentIds(user).includes(Number(frp.approval_budget_department_id));
  }

  return userHasDepartmentClassScope(user, frp.department_id, frp.class_department_id);
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
    managerCompanyIds: isManagerLevel(user) ? getUserCompanyIds(user) : [],
    managerDepartmentIds: isManagerLevel(user) ? departmentIds : [],
    managerDepartmentContexts: isManagerLevel(user) ? departmentContexts : [],
    budgetDepartmentIds: departmentIds,
    budgetDepartmentContexts: departmentContexts,
    canReviewRpFrp: isProductAssistantManager(user),
  };
}

function validateCreatePayload(body = {}) {
  assertRequired(body.frp_date, 'FRP date is required');
  assertRequired(body.vendor_id, 'Vendor is required');
  assertRequired(body.payment_method_id, 'Payment method is required');

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error('Item FRP wajib diisi.');
  }

  body.items.forEach((item, index) => {
    assertRequired(item.budget_id, `Budget is required on item ${index + 1}`);

    const quantity = normalizeNumber(item.quantity, 0);
    const unitPrice = normalizeNumber(item.unit_price, 0);
    const amount = normalizeNumber(item.amount, quantity * unitPrice);

    if (quantity <= 0) {
      throw new Error(`Jumlah pada item ${index + 1} harus lebih dari 0.`);
    }

    if (unitPrice <= 0) {
      throw new Error(`Harga satuan pada item ${index + 1} harus lebih dari 0.`);
    }

    if (amount <= 0) {
      throw new Error(`Nominal pada item ${index + 1} harus lebih dari 0.`);
    }
  });
}

async function buildFrpItems(conn, bodyItems = [], currencySnapshot = {}, headerSnapshot = {}) {
  const items = [];
  const currencyCode = currencySnapshot.currency_code || 'IDR';
  const exchangeRate = normalizeNumber(currencySnapshot.exchange_rate, 1);
  // Departemen dengan aturan CROSS_BUDGET (master Budget Access, modul FRP) boleh memakai
  // anggaran departemen lain selama masih dalam perusahaan yang dipilih.
  const canUseCrossBudget = await hasCrossBudgetAccess(conn, 'FRP', headerSnapshot.department_id);

  for (const item of bodyItems) {
    const quantity = normalizeNumber(item.quantity, 0);
    const unitPrice = normalizeNumber(item.unit_price, 0);
    const amountOriginal = normalizeNumber(item.amount, quantity * unitPrice);
    const amountIdr = amountOriginal * exchangeRate;

    const budget = await getBudgetForUpdate(conn, item.budget_id);

    if (!budget) {
      throw new Error('Anggaran tidak ditemukan.');
    }

    // Direct FRP can only spend the selected company/department/class budget,
    // unless the department has an active CROSS_BUDGET rule for FRP.
    if (String(budget.company_id) !== String(headerSnapshot.company_id)) {
      throw new Error('Perusahaan pada anggaran FRP harus sama dengan perusahaan yang dipilih.');
    }
    if (!canUseCrossBudget &&
        (Number(budget.department_id) !== Number(headerSnapshot.department_id) ||
         Number(budget.class_department_id) !== Number(headerSnapshot.class_department_id))) {
      throw new Error('Anggaran FRP harus sesuai dengan perusahaan, departemen, dan kelas yang dipilih.');
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
    throw new Error('Item FRP wajib diisi.');
  }

  const firstItem = items[0];

  if (!firstItem.budget_department_id) {
    throw new Error('Departemen anggaran wajib ada untuk nomor dokumen.');
  }

  if (!firstItem.budget_department_code_snapshot) {
    throw new Error('Kode departemen anggaran wajib ada untuk nomor dokumen.');
  }

  const budgetDepartmentId = Number(firstItem.budget_department_id);

  const hasDifferentBudgetDepartment = items.some((item) => {
    return Number(item.budget_department_id) !== budgetDepartmentId;
  });

  if (hasDifferentBudgetDepartment) {
    throw new Error('Semua item FRP harus menggunakan anggaran dari departemen yang sama.');
  }

  return {
    departmentId: firstItem.budget_department_id,
    departmentCode: firstItem.budget_department_code_snapshot,
  };
}

async function getBudgetDepartmentFromExistingItems(conn, items = []) {
  if (!items.length) {
    throw new Error('Item FRP yang ada tidak ditemukan.');
  }

  const firstItem = items[0];
  const firstBudget = await getBudgetForUpdate(conn, firstItem.budget_id);

  if (!firstBudget) {
    throw new Error('Anggaran sebelumnya tidak ditemukan.');
  }

  return {
    departmentId: Number(firstBudget.department_id),
    departmentCode: firstBudget.department_code_snapshot,
  };
}

function assertBudgetDepartmentNotChanged(oldDepartment, newDepartment) {
  if (Number(oldDepartment.departmentId) !== Number(newDepartment.departmentId)) {
    throw new Error(
      `Departemen anggaran pada FRP yang sudah ada tidak dapat diubah. Departemen saat ini adalah ${oldDepartment.departmentCode}.`
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
      throw new Error('Anda tidak memiliki akses ke FRP ini.');
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
      throw new Error('Perusahaan wajib diisi.');
    }

    if (!headerSnapshot.department_id) {
      throw new Error('Departemen wajib diisi.');
    }

    if (!headerSnapshot.class_department_id) {
      throw new Error('Kelas departemen wajib diisi.');
    }

    if (!headerSnapshot.department_code_snapshot) {
      throw new Error('Data kode departemen wajib ada.');
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

    const items = await buildFrpItems(conn, body.items, currencySnapshot, headerSnapshot);
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
      throw new Error('FRP tidak ditemukan.');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Hanya FRP berstatus PENDING yang dapat diubah.');
    }
    if (frp.source_module === 'RP') {
      throw new Error('FRP dari RP harus ditinjau melalui setujui/tolak, bukan diubah langsung.');
    }

    if (!canEditFrp(user, frp)) {
      throw new Error('Hanya pembuat FRP atau IT SuperUser yang dapat mengubah FRP ini.');
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

    const headerSnapshot = buildHeaderSnapshotFromExistingFrp(frp);
    const newItems = await buildFrpItems(conn, body.items, currencySnapshot, headerSnapshot);
    const newBudgetDepartment = getDocumentNumberDepartmentFromItems(newItems);

    assertBudgetDepartmentNotChanged(oldBudgetDepartment, newBudgetDepartment);
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
      throw new Error('FRP tidak ditemukan.');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Hanya FRP berstatus PENDING yang dapat disetujui.');
    }

    if (isFrpCreator(user, frp)) {
      throw new Error('Anda tidak dapat menyetujui FRP milik Anda sendiri.');
    }

    if (!canApproveFrp(user, frp)) {
      throw new Error('Hanya manajer dari departemen pemohon yang dapat menyetujui FRP ini.');
    }

    const items = await frpModel.getFrpItems(conn, id);

    if (frp.source_module === 'RP') {
      if (!frp.source_rp_request_id) throw new Error('Referensi RP sumber tidak ada.');
      const rp = await rpModel.getRpHeaderById(conn, frp.source_rp_request_id, { lock: true });
      if (!rp || rp.status !== 'APPROVED' || rp.frp_conversion_status !== 'CREATED' ||
          String(rp.converted_frp_request_id) !== String(frp.id)) {
        throw new Error('RP sumber tidak dalam status konversi yang valid.');
      }
      const rpItems = await rpModel.getRpItems(conn, rp.id);
      if (!rpItems.length) throw new Error('RP sumber tidak memiliki item.');
      for (const rpItem of rpItems) {
        await releaseBudget(conn, {
          budgetId: rpItem.budget_id,
          amount: Number(rpItem.amount),
          sourceModule: 'RP', sourceHeaderId: rp.id, sourceItemId: rpItem.id, user,
          notes: `Release RP reserved budget on FRP approval ${frp.frp_number}`,
        });
      }
      const header = buildHeaderSnapshotFromExistingFrp(frp);
      for (const item of items) {
        const sourceItem = rpItems.find((candidate) => String(candidate.id) === String(item.source_rp_request_item_id));
        if (!sourceItem || Number(sourceItem.budget_id) !== Number(item.budget_id)) {
          throw new Error('Anggaran item FRP tidak sesuai dengan item RP sumber.');
        }
        await reserveBudget(conn, {
          budgetId: item.budget_id, amount: getItemBudgetAmount(item),
          sourceModule: 'FRP', sourceHeaderId: frp.id, sourceItemId: item.id,
          header: { ...header, department_id: Number(sourceItem.budget_department_id),
            class_department_id: Number(sourceItem.budget_class_department_id) },
          user, notes: `Reserve final FRP budget on approval ${frp.frp_number}`,
        });
        await finalizeBudget(conn, {
          budgetId: item.budget_id, amount: getItemBudgetAmount(item),
          sourceModule: 'FRP', sourceHeaderId: frp.id, sourceItemId: item.id,
          user, notes: `Finalize FRP budget from RP ${frp.frp_number}`,
        });
      }
    } else {
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
    throw new Error('Alasan penolakan wajib diisi.');
  }

  const conn = await frpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const frp = await frpModel.getFrpHeaderById(conn, id, { lock: true });

    if (!frp) {
      throw new Error('FRP tidak ditemukan.');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Hanya FRP berstatus PENDING yang dapat ditolak.');
    }

    if (isFrpCreator(user, frp)) {
    throw new Error('Anda tidak dapat menolak FRP milik Anda sendiri.');
    }

    if (!canRejectFrp(user, frp)) {
    throw new Error('Hanya manajer dari departemen pemohon yang dapat menolak FRP ini.');
    }

    const items = await frpModel.getFrpItems(conn, id);

    if (frp.source_module !== 'RP') for (const item of items) {
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

    if (frp.source_module === 'RP') {
      const rp = await rpModel.getRpHeaderById(conn, frp.source_rp_request_id, { lock: true });
      if (!rp || String(rp.converted_frp_request_id) !== String(frp.id)) {
        throw new Error('Referensi konversi RP sumber tidak konsisten.');
      }
      await rpModel.resetRpConversionAfterRejectedFrp(conn, rp.id, frp.id, user);
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
    throw new Error('Alasan revert wajib diisi.');
  }

  const conn = await frpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const frp = await frpModel.getFrpHeaderById(conn, id, { lock: true });

    if (!frp) {
      throw new Error('FRP tidak ditemukan.');
    }

    if (frp.status !== 'APPROVED') {
      throw new Error('Hanya FRP berstatus APPROVED yang dapat dikembalikan (revert).');
    }
    if (frp.source_module === 'RP') {
      throw new Error('Revert FRP dari RP memerlukan alur pemulihan anggaran RP tersendiri.');
    }

    if (!canRevertFrp(user, frp)) {
    throw new Error('Hanya IT SuperUser atau manajer dari departemen pemohon yang dapat mengembalikan (revert) FRP ini.');
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
