const { randomUUID } = require('crypto');

const rpModel = require('../../models/rp/rp.model');
const frpModel = require('../../models/frp/frp.model');
const { generateDocumentNumber } = require('../documentNumber/documentNumber.service');
const {
  getBudgetForUpdate,
  reserveBudget,
  releaseBudget,
  finalizeBudget,
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

  if (user.context_department_id) {
    ids.push(Number(user.context_department_id));
  }

  if (user.department_id) {
    ids.push(Number(user.department_id));
  }

  if (user.class_department_id) {
    ids.push(Number(user.class_department_id));
  }

  const departments = Array.isArray(user.departments) ? user.departments : [];

  departments.forEach((department) => {
    if (department.id) {
      ids.push(Number(department.id));
    }

    if (department.department_id) {
      ids.push(Number(department.department_id));
    }

    if (department.class_department_id) {
      ids.push(Number(department.class_department_id));
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

function getPrimaryCompanyDepartmentSnapshot(user = {}, body = {}) {
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
  const directClass = String(user.department_class || user.context_department_class || '').toUpperCase();
  const directName = String(user.department || user.context_department_name || '').toUpperCase();
  const directCode = String(user.department_code || user.context_department_code || '').toUpperCase();

  if (directClass === 'IT' || directName === 'IT' || directCode === 'SIT') {
    return true;
  }

  const departments = Array.isArray(user.departments) ? user.departments : [];

  return departments.some((department) => {
    const departmentClass = String(department.class || department.department_class || department.class_class || '').toUpperCase();
    const departmentName = String(department.name || department.department_name || department.class_name || '').toUpperCase();
    const departmentCode = String(department.code || department.department_code || department.class_code || '').toUpperCase();

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

function isGeneralProcurement(user = {}) {
  const jobPosition = normalizeString(user.job_position).toUpperCase();
  const jobLevelValue = Number(user.job_level_value || 0);

  return jobPosition === 'GENERAL PROCUREMENT' && jobLevelValue < 4;
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

function userHasDepartmentId(user = {}, departmentId) {
  const ids = getUserDepartmentIds(user);

  return ids.includes(Number(departmentId));
}

function canViewAllRp(user = {}) {
  return isUserInItDepartment(user) || isGeneralProcurement(user);
}

function canViewRpByHeader(user = {}, rp = {}) {
  if (canViewAllRp(user)) {
    return true;
  }

  if (String(rp.requested_by_user_id || '') === String(user.id || '')) {
    return true;
  }

  if (
    isManagerLevel(user) &&
    userHasCompanyScope(user, rp.company_id) &&
    userHasDepartmentClassScope(user, rp.department_id, rp.class_department_id)
  ) {
    return true;
  }

  if (userHasDepartmentId(user, rp.destination_department_id)) {
    return true;
  }

  return false;
}

function canEditRp(user = {}, rp = {}) {
  if (rp.status !== 'PENDING_REQUESTER_MANAGER') {
    return false;
  }

  if (isUserInItDepartment(user)) {
    return true;
  }

  return String(rp.requested_by_user_id || '') === String(user.id || '');
}

function isRpCreator(user = {}, rp = {}) {
  return String(rp.requested_by_user_id || '') === String(user.id || '');
}

function canRequesterManagerApprove(user = {}, rp = {}) {
  if (isRpCreator(user, rp)) {
    return false;
  }

  if (!isManagerLevel(user)) {
    return false;
  }

  return (
    userHasCompanyScope(user, rp.company_id) &&
    userHasDepartmentClassScope(user, rp.department_id, rp.class_department_id)
  );
}

function canDestinationManagerApprove(user = {}, rp = {}) {
  if (isRpCreator(user, rp)) {
    return false;
  }

  if (!isManagerLevel(user)) {
    return false;
  }

  return (
    userHasCompanyScope(user, rp.company_id) &&
    userHasDepartmentId(user, rp.destination_department_id)
  );
}

async function canDestinationChecker(conn, user = {}, rp = {}) {
  if (isRpCreator(user, rp)) {
    return false;
  }

  if (!userHasDepartmentId(user, rp.destination_department_id)) {
    return false;
  }

  const destinationRule = await rpModel.getActiveDestinationDepartmentRule(
    conn,
    rp.destination_department_id
  );

  if (!destinationRule) {
    return false;
  }

  const checkerRule = await rpModel.getActiveCheckerRule(
    conn,
    destinationRule.id,
    user.job_position
  );

  return !!checkerRule;
}

function getRpRevertTransition(user = {}, rp = {}) {
  if (rp.status === 'PENDING_DESTINATION_CHECKER') {
    if (!canRequesterManagerApprove(user, rp)) {
      return null;
    }

    return {
      fromStatus: 'PENDING_DESTINATION_CHECKER',
      toStatus: 'PENDING_REQUESTER_MANAGER',
      modelMethod: 'updateRpRevertedToRequesterManager',
    };
  }

  if (rp.status === 'PENDING_DESTINATION_MANAGER') {
    if (!canDestinationManagerApprove(user, rp) && !isUserInItDepartment(user)) {
      return null;
    }

    if (rp.flow_type === 'SHORT') {
      return null;
    }

    return {
      fromStatus: 'PENDING_DESTINATION_MANAGER',
      toStatus: 'PENDING_DESTINATION_CHECKER',
      modelMethod: 'updateRpRevertedToDestinationChecker',
    };
  }

  if (rp.status === 'APPROVED') {
    if (!canDestinationManagerApprove(user, rp) && !isUserInItDepartment(user)) {
      return null;
    }

    return {
      fromStatus: 'APPROVED',
      toStatus: 'PENDING_DESTINATION_MANAGER',
      modelMethod: 'updateRpRevertedToDestinationManager',
    };
  }

  return null;
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
    actor_department_id: user.context_department_id || user.department_id || null,
    actor_department_name_snapshot: user.context_department_name || user.department || null,
    actor_class_department_id: user.class_department_id || user.context_department_id || user.department_id || null,
    actor_class_name_snapshot: user.class_name || user.context_department_name || user.department || null,
  };
}

function buildChangedByPayload(user = {}) {
  return {
    changed_by_user_id: user.id || null,
    changed_by_username: user.username || null,
    changed_by_name: user.name || null,
    changed_by_job_position: user.job_position || null,
    changed_by_job_level_name: user.job_level || null,
    changed_by_job_level_value: user.job_level_value ?? null,
  };
}

function buildListAccessQuery(user = {}) {
  const departmentIds = getUserDepartmentIds(user);
  const departmentContexts = getUserDepartmentContexts(user);

  return {
    canViewAll: canViewAllRp(user),
    userId: user.id || null,
    managerCompanyIds: isManagerLevel(user) ? getUserCompanyIds(user) : [],
    managerDepartmentContexts: isManagerLevel(user) ? departmentContexts : [],
    destinationDepartmentIds: departmentIds,
    budgetDepartmentIds: departmentIds,
  };
}

function validateItems(bodyItems = []) {
  if (!Array.isArray(bodyItems) || bodyItems.length === 0) {
    throw new Error('RP items are required');
  }

  bodyItems.forEach((item, index) => {
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

function validateCreatePayload(body = {}) {
  assertRequired(body.date_required, 'Date required is required');
  assertRequired(body.destination_department_id, 'Destination department is required');
  assertRequired(body.payment_category_id, 'Payment category is required');

  validateItems(body.items);
}

function validateUpdatePayload(body = {}) {
  validateCreatePayload(body);
}

function buildVendorInputSnapshot(body = {}, resolvedVendor = null) {
  if (resolvedVendor) {
    return {
      vendor_source: 'MASTER',
      vendor_id: resolvedVendor.vendor_id,
      vendor_name_snapshot: resolvedVendor.vendor_name_snapshot,
    };
  }

  return {
    vendor_source: 'MANUAL',
    vendor_id: null,
    vendor_name_snapshot: normalizeString(body.vendor_name),
  };
}

async function resolveRpVendorSnapshot(conn, body = {}) {
  if (!body.vendor_id) {
    return buildVendorInputSnapshot(body, null);
  }

  const vendorSnapshot = await resolveVendorSnapshot(conn, body.vendor_id);

  return buildVendorInputSnapshot(body, vendorSnapshot);
}

async function resolvePaymentCategorySnapshot(conn, paymentCategoryId) {
  const category = await rpModel.getActivePaymentCategory(conn, paymentCategoryId);

  if (!category) {
    throw new Error('RP payment category not found or inactive');
  }

  return {
    payment_category_id: category.id,
    payment_category_code_snapshot: category.code,
    payment_category_name_snapshot: category.name,
  };
}

async function resolveDestinationDepartmentSnapshot(conn, destinationDepartmentId) {
  const destination = await rpModel.getActiveDestinationDepartmentRule(
    conn,
    destinationDepartmentId
  );

  if (!destination) {
    throw new Error('RP destination department is not active or not allowed');
  }

  return {
    destination_department_rule_id: destination.id,
    destination_department_id: destination.department_id,
    destination_department_name_snapshot: destination.department_name_snapshot,
    destination_department_class_snapshot: destination.department_class_snapshot,
    destination_department_code_snapshot: destination.department_code_snapshot,
    is_short_flow_allowed: Number(destination.is_short_flow_allowed) === 1,
  };
}

async function buildRpItems(conn, bodyItems = []) {
  const items = [];

  for (const item of bodyItems) {
    const quantity = normalizeNumber(item.quantity, 0);
    const unitPrice = normalizeNumber(item.unit_price, 0);
    const amount = normalizeNumber(item.amount, quantity * unitPrice);

    const budget = await getBudgetForUpdate(conn, item.budget_id);

    if (!budget) {
      throw new Error('Budget not found');
    }

    const remainingBefore = Number(budget.budget_remaining || 0);
    const remainingAfter = remainingBefore - amount;

    items.push({
      id: item.id || randomUUID(),
      rp_request_item_id: item.rp_request_item_id || item.id || null,

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
      purchase_link: normalizeString(item.purchase_link),
      quantity,
      unit_price: unitPrice,
      amount,
      budget_remaining_before: remainingBefore,
      budget_remaining_after: remainingAfter,
    });
  }

  return items;
}

function getDocumentNumberDepartmentFromItems(items = []) {
  if (!items.length) {
    throw new Error('RP items are required');
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
    throw new Error('All RP items must use budgets from the same department');
  }

  return {
    departmentId: firstItem.budget_department_id,
    departmentCode: firstItem.budget_department_code_snapshot,
  };
}

async function getBudgetDepartmentFromExistingItems(conn, items = []) {
  if (!items.length) {
    throw new Error('Existing RP items are not found');
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
      `Budget department cannot be changed on existing RP. Current department is ${oldDepartment.departmentCode}`
    );
  }
}

function sumTotalAmount(items = []) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function buildHeaderSnapshotFromExistingRp(rp = {}) {
  return {
    company_id: rp.company_id,
    company_code_snapshot: rp.company_code_snapshot,
    company_name_snapshot: rp.company_name_snapshot,

    department_id: rp.department_id,
    department_name_snapshot: rp.department_name_snapshot,
    department_class_snapshot: rp.department_class_snapshot,
    department_code_snapshot: rp.department_code_snapshot,

    class_department_id: rp.class_department_id,
    class_name_snapshot: rp.class_name_snapshot,
    class_class_snapshot: rp.class_class_snapshot,
    class_code_snapshot: rp.class_code_snapshot,
  };
}

function buildItemSnapshot(item = {}) {
  return {
    budget_id: item.budget_id,
    budget_code_snapshot: item.budget_code_snapshot,
    memo: item.memo,
    purchase_link: item.purchase_link,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    amount: Number(item.amount || 0),
  };
}

function buildHeaderHistorySnapshot(header = {}) {
  return {
    vendor_source: header.vendor_source,
    vendor_id: header.vendor_id,
    vendor_name_snapshot: header.vendor_name_snapshot,
    description: header.description,
  };
}

function hasHeaderChange(oldHeader = {}, newHeader = {}) {
  return JSON.stringify(oldHeader) !== JSON.stringify(newHeader);
}

function hasItemChange(oldItem = {}, newItem = {}) {
  return JSON.stringify(buildItemSnapshot(oldItem)) !== JSON.stringify(buildItemSnapshot(newItem));
}

function assertCheckerItemsMatchExisting(existingItems = [], incomingItems = []) {
  if (!Array.isArray(incomingItems) || !incomingItems.length) {
    return;
  }

  const existingIds = new Set(existingItems.map((item) => String(item.id)));

  incomingItems.forEach((item, index) => {
    const itemId = String(item.rp_request_item_id || item.id || '');

    if (!itemId) {
      throw new Error(`RP request item ID is required on checker item ${index + 1}`);
    }

    if (!existingIds.has(itemId)) {
      throw new Error(`Checker item ${index + 1} does not belong to this RP`);
    }
  });

  const incomingIds = incomingItems.map((item) => String(item.rp_request_item_id || item.id));
  const uniqueIncomingIds = new Set(incomingIds);

  if (incomingIds.length !== uniqueIncomingIds.size) {
    throw new Error('Duplicate RP request item ID on checker items');
  }
}

function mapCheckerItems(existingItems = [], incomingItems = []) {
  const incomingMap = new Map();

  if (Array.isArray(incomingItems)) {
    incomingItems.forEach((item) => {
      const itemId = String(item.rp_request_item_id || item.id || '');

      if (itemId) {
        incomingMap.set(itemId, item);
      }
    });
  }

  return existingItems.map((existingItem) => {
    const incomingItem = incomingMap.get(String(existingItem.id)) || null;

    if (!incomingItem) {
      return {
        rp_request_item_id: existingItem.id,
        budget_id: existingItem.budget_id,
        memo: normalizeString(existingItem.memo),
        purchase_link: normalizeString(existingItem.purchase_link),
        quantity: Number(existingItem.quantity || 0),
        unit_price: Number(existingItem.unit_price || 0),
        amount: Number(existingItem.amount || 0),
      };
    }

    const quantity = incomingItem.quantity !== undefined
      ? normalizeNumber(incomingItem.quantity, 0)
      : Number(existingItem.quantity || 0);

    const unitPrice = incomingItem.unit_price !== undefined
      ? normalizeNumber(incomingItem.unit_price, 0)
      : Number(existingItem.unit_price || 0);

    const amount = incomingItem.amount !== undefined
      ? normalizeNumber(incomingItem.amount, 0)
      : Number(existingItem.amount || 0);

    return {
      rp_request_item_id: existingItem.id,
      budget_id: existingItem.budget_id,
      memo: incomingItem.memo !== undefined
        ? normalizeString(incomingItem.memo)
        : normalizeString(existingItem.memo),
      purchase_link: incomingItem.purchase_link !== undefined
        ? normalizeString(incomingItem.purchase_link)
        : normalizeString(existingItem.purchase_link),
      quantity,
      unit_price: unitPrice,
      amount,
    };
  });
}

async function releaseReservedBudgets(conn, rp = {}, items = [], user = {}, notesPrefix = 'Release budget') {
  for (const item of items) {
    await releaseBudget(conn, {
      budgetId: item.budget_id,
      amount: Number(item.amount || 0),
      sourceModule: 'RP',
      sourceHeaderId: rp.id,
      sourceItemId: item.id,
      user,
      notes: `${notesPrefix} for ${rp.rp_number}`,
    });
  }
}

async function reserveItemsBudget(conn, rpId, rpNumber, items = [], headerSnapshot = {}, user = {}, userDepartmentContexts = [], notesPrefix = 'Reserve budget') {
  for (const item of items) {
    await reserveBudget(conn, {
      budgetId: item.budget_id,
      amount: item.amount,
      sourceModule: 'RP',
      sourceHeaderId: rpId,
      sourceItemId: item.id,
      header: headerSnapshot,
      user,
      userDepartmentContexts,
      notes: `${notesPrefix} for ${rpNumber}`,
    });
  }
}

function validateCreateFrpFromRpPayload(body = {}) {
  assertRequired(body.vendor_id, 'Vendor is required');
  assertRequired(body.external_document_type_id, 'External document type is required');
  assertRequired(body.payment_method_id, 'Payment method is required');
  assertRequired(body.payment_date, 'Payment date is required');

  if (body.items !== undefined && !Array.isArray(body.items)) {
    throw new Error('Items must be an array');
  }

  const items = Array.isArray(body.items) ? body.items : [];

  items.forEach((item, index) => {
    const itemId = normalizeString(item.rp_request_item_id || item.id);

    if (!itemId) {
      throw new Error(`RP request item ID is required on FRP item ${index + 1}`);
    }

    if (item.frp_amount !== undefined && item.frp_amount !== null && item.frp_amount !== '') {
      const frpAmount = normalizeNumber(item.frp_amount, 0);

      if (frpAmount <= 0) {
        throw new Error(`FRP amount must be greater than 0 on item ${index + 1}`);
      }
    }
  });
}

function validateProcurementVoidPayload(body = {}) {
  const reason = normalizeString(body.reason || body.notes);

  if (!reason) {
    throw new Error('Procurement void reason is required');
  }

  return reason;
}

function assertGeneralProcurementUser(user = {}) {
  if (!isGeneralProcurement(user)) {
    throw new Error('Only General Procurement can perform this action');
  }
}

function buildRpHeaderSnapshotForBudget(rp = {}) {
  return {
    company_id: rp.company_id,
    company_code_snapshot: rp.company_code_snapshot,
    company_name_snapshot: rp.company_name_snapshot,
    department_id: rp.department_id,
    department_name_snapshot: rp.department_name_snapshot,
    department_class_snapshot: rp.department_class_snapshot,
    department_code_snapshot: rp.department_code_snapshot,
    class_department_id: rp.class_department_id,
    class_name_snapshot: rp.class_name_snapshot,
    class_class_snapshot: rp.class_class_snapshot,
    class_code_snapshot: rp.class_code_snapshot,
  };
}

function buildFrpItemsFromRpItems(rpItems = [], incomingItems = []) {
  const incomingMap = new Map();

  if (Array.isArray(incomingItems)) {
    incomingItems.forEach((item) => {
      const itemId = normalizeString(item.rp_request_item_id || item.id);

      if (itemId) {
        incomingMap.set(itemId, item);
      }
    });
  }

  const existingIds = new Set(rpItems.map((item) => String(item.id)));

  incomingMap.forEach((item, itemId) => {
    if (!existingIds.has(String(itemId))) {
      throw new Error('One or more FRP items do not belong to this RP');
    }
  });

  return rpItems.map((rpItem) => {
    const incomingItem = incomingMap.get(String(rpItem.id)) || null;
    const originalAmount = Number(rpItem.amount || 0);
    const hasOverride = !!(
      incomingItem &&
      incomingItem.frp_amount !== undefined &&
      incomingItem.frp_amount !== null &&
      incomingItem.frp_amount !== ''
    );
    const finalAmount = hasOverride
      ? normalizeNumber(incomingItem.frp_amount, 0)
      : originalAmount;

    if (finalAmount <= 0) {
      throw new Error('Final FRP amount must be greater than 0');
    }

    return {
      id: randomUUID(),
      source_rp_request_item_id: rpItem.id,
      is_amount_overridden: hasOverride ? 1 : 0,
      original_rp_amount: originalAmount,
      budget_id: rpItem.budget_id,
      budget_code_snapshot: rpItem.budget_code_snapshot,
      budget_project_name_snapshot: rpItem.budget_project_name_snapshot,
      budget_type_code_snapshot: rpItem.budget_type_code_snapshot,
      budget_type_name_snapshot: rpItem.budget_type_name_snapshot,
      memo: normalizeString(rpItem.memo),
      currency_code: 'IDR',
      exchange_rate: 1,
      quantity: Number(rpItem.quantity || 1),
      unit_price: finalAmount,
      amount: finalAmount,
      amount_original: finalAmount,
      amount_idr: finalAmount,
      budget_remaining_before: Number(rpItem.budget_remaining_before || 0),
      budget_remaining_after: Number(rpItem.budget_remaining_after || 0),
    };
  });
}

function getFrpDocumentNumberDepartmentFromRpItems(items = []) {
  if (!items.length) {
    throw new Error('RP items are required');
  }

  const firstItem = items[0];

  if (!firstItem.budget_department_id || !firstItem.budget_department_code_snapshot) {
    throw new Error('Budget department snapshot is required for FRP number');
  }

  const budgetDepartmentId = Number(firstItem.budget_department_id);
  const hasDifferentBudgetDepartment = items.some((item) => {
    return Number(item.budget_department_id) !== budgetDepartmentId;
  });

  if (hasDifferentBudgetDepartment) {
    throw new Error('All RP items must use budgets from the same department');
  }

  return {
    departmentId: firstItem.budget_department_id,
    departmentCode: firstItem.budget_department_code_snapshot,
  };
}

async function releaseRpReservedBudgetsForConversion(conn, rp = {}, rpItems = [], user = {}) {
  for (const item of rpItems) {
    await releaseBudget(conn, {
      budgetId: item.budget_id,
      amount: Number(item.amount || 0),
      sourceModule: 'RP',
      sourceHeaderId: rp.id,
      sourceItemId: item.id,
      user,
      notes: `Release RP reserved budget for FRP conversion ${rp.rp_number}`,
    });
  }
}

async function reserveAndFinalizeFrpBudgetsFromRp(conn, frp = {}, frpItems = [], headerSnapshot = {}, user = {}) {
  for (const item of frpItems) {
    await reserveBudget(conn, {
      budgetId: item.budget_id,
      amount: Number(item.amount_idr || item.amount || 0),
      sourceModule: 'FRP',
      sourceHeaderId: frp.id,
      sourceItemId: item.id,
      header: headerSnapshot,
      user,
      userDepartmentContexts: [],
      notes: `Reserve FRP budget from RP ${frp.frp_number}`,
    });

    await finalizeBudget(conn, {
      budgetId: item.budget_id,
      amount: Number(item.amount_idr || item.amount || 0),
      sourceModule: 'FRP',
      sourceHeaderId: frp.id,
      sourceItemId: item.id,
      user,
      notes: `Finalize FRP budget from RP ${frp.frp_number}`,
    });
  }
}

async function listRp(query = {}, user = {}) {
  const conn = await rpModel.db.getConnection();

  try {
    const finalQuery = {
      ...query,
      __access: buildListAccessQuery(user),
    };

    const result = await rpModel.listRpRequests(conn, finalQuery);

    return {
      data: result.rows,
      meta: result.meta,
    };
  } finally {
    conn.release();
  }
}

async function getRpDetail(id, user = {}) {
  const conn = await rpModel.db.getConnection();

  try {
    const detail = await rpModel.getRpDetail(conn, id);

    if (!detail) {
      return null;
    }

    if (!canViewRpByHeader(user, detail)) {
      throw new Error('You do not have access to this RP request');
    }

    return detail;
  } finally {
    conn.release();
  }
}

async function createRp(body = {}, user = {}, req = null) {
  validateCreatePayload(body);

  const conn = await rpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const userSnapshot = buildUserSnapshot(user);
    const headerSnapshot = getPrimaryCompanyDepartmentSnapshot(user, body);
    const userDepartmentContexts = getUserDepartmentContexts(user);

    if (!headerSnapshot.company_id) {
      throw new Error('Company is required');
    }

    if (!headerSnapshot.department_id || !headerSnapshot.class_department_id) {
      throw new Error('Department and class department are required');
    }

    const destinationSnapshot = await resolveDestinationDepartmentSnapshot(
      conn,
      body.destination_department_id
    );

    const paymentCategorySnapshot = await resolvePaymentCategorySnapshot(
      conn,
      body.payment_category_id
    );

    const vendorSnapshot = await resolveRpVendorSnapshot(conn, body);
    const items = await buildRpItems(conn, body.items);
    const documentNumberDepartment = getDocumentNumberDepartmentFromItems(items);

    const rpNumber = await generateDocumentNumber(conn, {
      module: 'RP',
      departmentId: documentNumberDepartment.departmentId,
      departmentCode: documentNumberDepartment.departmentCode,
      date: body.date_required ? new Date(body.date_required) : new Date(),
    });

    const rpId = randomUUID();
    const totalAmount = sumTotalAmount(items);
    const isShortFlow =
      Number(destinationSnapshot.destination_department_id) === Number(headerSnapshot.department_id) &&
      destinationSnapshot.is_short_flow_allowed;

    const status = isShortFlow
      ? 'PENDING_DESTINATION_MANAGER'
      : 'PENDING_REQUESTER_MANAGER';

    const flowType = isShortFlow ? 'SHORT' : 'NORMAL';

    await rpModel.insertRpHeader(conn, {
      id: rpId,
      rp_number: rpNumber,
      status,
      frp_conversion_status: 'NOT_CREATED',
      flow_type: flowType,

      ...headerSnapshot,
      ...destinationSnapshot,
      ...userSnapshot,
      ...vendorSnapshot,
      ...paymentCategorySnapshot,

      date_required: body.date_required,
      description: normalizeString(body.description),
      pic_name: normalizeString(body.pic_name),
      total_amount: totalAmount,
    });

    for (const item of items) {
      await rpModel.insertRpItem(conn, {
        ...item,
        rp_request_id: rpId,
      });

      await rpModel.insertRpItemHistory(conn, {
        rp_request_id: rpId,
        rp_request_item_id: item.id,
        change_type: 'CREATE',
        old_values: null,
        new_values: buildItemSnapshot(item),
        notes: `Create RP item for ${rpNumber}`,
        ...buildChangedByPayload(user),
      });
    }

    await reserveItemsBudget(
      conn,
      rpId,
      rpNumber,
      items,
      headerSnapshot,
      user,
      userDepartmentContexts,
      'Reserve budget'
    );

    await rpModel.insertRpApprovalLog(conn, {
      rp_request_id: rpId,
      action: 'SUBMIT',
      from_status: null,
      to_status: status,
      ...buildActorLogPayload(user),
      notes: body.notes || null,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'RP',
      entityType: 'rp_requests',
      entityId: rpId,
      action: 'CREATE',
      description: `Create RP ${rpNumber}`,
      actor: user,
      req,
      oldValues: null,
      newValues: {
        id: rpId,
        rp_number: rpNumber,
        status,
        flow_type: flowType,
        total_amount: totalAmount,
      },
      metadata: {
        rp_number: rpNumber,
        total_amount: totalAmount,
      },
    });

    await conn.commit();

    return {
      id: rpId,
      rp_number: rpNumber,
      status,
      flow_type: flowType,
      total_amount: totalAmount,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function updateRp(id, body = {}, user = {}, req = null) {
  validateUpdatePayload(body);

  const conn = await rpModel.db.getConnection();
  const userDepartmentContexts = getUserDepartmentContexts(user);

  try {
    await conn.beginTransaction();

    const rp = await rpModel.getRpHeaderById(conn, id, { lock: true });

    if (!rp) {
      throw new Error('RP request not found');
    }

    if (!canEditRp(user, rp)) {
      throw new Error('Only RP creator or IT SuperUser can update this RP');
    }

    const oldItems = await rpModel.getRpItems(conn, id);
    const oldBudgetDepartment = await getBudgetDepartmentFromExistingItems(conn, oldItems);

    const destinationSnapshot = await resolveDestinationDepartmentSnapshot(
      conn,
      body.destination_department_id
    );

    const paymentCategorySnapshot = await resolvePaymentCategorySnapshot(
      conn,
      body.payment_category_id
    );

    const vendorSnapshot = await resolveRpVendorSnapshot(conn, body);
    const newItems = await buildRpItems(conn, body.items);
    const newBudgetDepartment = getDocumentNumberDepartmentFromItems(newItems);

    assertBudgetDepartmentNotChanged(oldBudgetDepartment, newBudgetDepartment);

    const headerSnapshot = buildHeaderSnapshotFromExistingRp(rp);
    const totalAmount = sumTotalAmount(newItems);

    await releaseReservedBudgets(conn, rp, oldItems, user, 'Release old reserved budget for updated RP');
    await rpModel.deleteRpItems(conn, id);

    for (const newItem of newItems) {
      await rpModel.insertRpItem(conn, {
        ...newItem,
        rp_request_id: id,
      });

      await rpModel.insertRpItemHistory(conn, {
        rp_request_id: id,
        rp_request_item_id: newItem.id,
        change_type: 'CREATE',
        old_values: null,
        new_values: buildItemSnapshot(newItem),
        notes: `Create updated RP item for ${rp.rp_number}`,
        ...buildChangedByPayload(user),
      });
    }

    await reserveItemsBudget(
      conn,
      id,
      rp.rp_number,
      newItems,
      headerSnapshot,
      user,
      userDepartmentContexts,
      'Reserve updated budget'
    );

    await rpModel.updateRpHeader(conn, id, {
      ...destinationSnapshot,
      ...vendorSnapshot,
      ...paymentCategorySnapshot,
      date_required: body.date_required,
      description: normalizeString(body.description),
      pic_name: normalizeString(body.pic_name),
      total_amount: totalAmount,
      updated_by_user_id: user.id,
      updated_by_name: user.name,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'RP',
      entityType: 'rp_requests',
      entityId: id,
      action: 'UPDATE',
      description: `Update RP ${rp.rp_number}`,
      actor: user,
      req,
      oldValues: {
        total_amount: rp.total_amount,
        description: rp.description,
      },
      newValues: {
        total_amount: totalAmount,
        description: normalizeString(body.description),
      },
      metadata: {
        rp_number: rp.rp_number,
        total_amount: totalAmount,
      },
    });

    await conn.commit();

    return {
      id,
      rp_number: rp.rp_number,
      status: rp.status,
      total_amount: totalAmount,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function requesterManagerApproveRp(id, user = {}, body = {}, req = null) {
  const conn = await rpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const rp = await rpModel.getRpHeaderById(conn, id, { lock: true });

    if (!rp) {
      throw new Error('RP request not found');
    }

    if (rp.status !== 'PENDING_REQUESTER_MANAGER') {
      throw new Error('Only PENDING_REQUESTER_MANAGER RP can be approved by requester manager');
    }

    if (!canRequesterManagerApprove(user, rp)) {
      throw new Error('Only manager from requester department can approve this RP');
    }

    await rpModel.updateRpRequesterManagerApproved(conn, id, user);

    await rpModel.insertRpApprovalLog(conn, {
      rp_request_id: id,
      action: 'REQUESTER_MANAGER_APPROVE',
      from_status: 'PENDING_REQUESTER_MANAGER',
      to_status: 'PENDING_DESTINATION_CHECKER',
      ...buildActorLogPayload(user),
      notes: body.notes || null,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'RP',
      entityType: 'rp_requests',
      entityId: id,
      action: 'REQUESTER_MANAGER_APPROVE',
      description: `Requester manager approve RP ${rp.rp_number}`,
      actor: user,
      req,
      oldValues: { status: 'PENDING_REQUESTER_MANAGER' },
      newValues: { status: 'PENDING_DESTINATION_CHECKER' },
      metadata: { rp_number: rp.rp_number },
    });

    await conn.commit();

    return {
      id,
      rp_number: rp.rp_number,
      status: 'PENDING_DESTINATION_CHECKER',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function rejectRpAtStage(id, user = {}, body = {}, config = {}, req = null) {
  const reason = normalizeString(body.reason || body.notes);

  if (!reason) {
    throw new Error('Reject reason is required');
  }

  const conn = await rpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const rp = await rpModel.getRpHeaderById(conn, id, { lock: true });

    if (!rp) {
      throw new Error('RP request not found');
    }

    if (rp.status !== config.expectedStatus) {
      throw new Error(`Only ${config.expectedStatus} RP can be rejected at this stage`);
    }

    const allowed = await config.canReject(conn, user, rp);

    if (!allowed) {
      throw new Error(config.permissionMessage);
    }

    const items = await rpModel.getRpItems(conn, id);
    await releaseReservedBudgets(conn, rp, items, user, `Release budget for rejected RP`);

    await rpModel.updateRpRejected(conn, id, user, reason, config.rejectedStage);

    await rpModel.insertRpApprovalLog(conn, {
      rp_request_id: id,
      action: config.action,
      from_status: config.expectedStatus,
      to_status: 'REJECTED',
      ...buildActorLogPayload(user),
      notes: reason,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'RP',
      entityType: 'rp_requests',
      entityId: id,
      action: config.action,
      description: `Reject RP ${rp.rp_number}`,
      actor: user,
      req,
      oldValues: { status: config.expectedStatus },
      newValues: {
        status: 'REJECTED',
        rejected_stage: config.rejectedStage,
        rejected_reason: reason,
      },
      metadata: {
        rp_number: rp.rp_number,
        reason,
      },
    });

    await conn.commit();

    return {
      id,
      rp_number: rp.rp_number,
      status: 'REJECTED',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function requesterManagerRejectRp(id, user = {}, body = {}, req = null) {
  return rejectRpAtStage(
    id,
    user,
    body,
    {
      expectedStatus: 'PENDING_REQUESTER_MANAGER',
      rejectedStage: 'REQUESTER_MANAGER',
      action: 'REQUESTER_MANAGER_REJECT',
      permissionMessage: 'Only manager from requester department can reject this RP',
      canReject: async (conn, currentUser, rp) => canRequesterManagerApprove(currentUser, rp),
    },
    req
  );
}

async function destinationCheckerRejectRp(id, user = {}, body = {}, req = null) {
  return rejectRpAtStage(
    id,
    user,
    body,
    {
      expectedStatus: 'PENDING_DESTINATION_CHECKER',
      rejectedStage: 'DESTINATION_CHECKER',
      action: 'DESTINATION_CHECK_REJECT',
      permissionMessage: 'Only authorized checker can reject this RP',
      canReject: async (conn, currentUser, rp) => canDestinationChecker(conn, currentUser, rp),
    },
    req
  );
}

async function destinationManagerRejectRp(id, user = {}, body = {}, req = null) {
  return rejectRpAtStage(
    id,
    user,
    body,
    {
      expectedStatus: 'PENDING_DESTINATION_MANAGER',
      rejectedStage: 'DESTINATION_MANAGER',
      action: 'DESTINATION_MANAGER_REJECT',
      permissionMessage: 'Only destination manager can reject this RP',
      canReject: async (conn, currentUser, rp) => canDestinationManagerApprove(currentUser, rp),
    },
    req
  );
}

async function destinationCheckRp(id, body = {}, user = {}, req = null) {
  const conn = await rpModel.db.getConnection();
  const userDepartmentContexts = getUserDepartmentContexts(user);

  try {
    await conn.beginTransaction();

    const rp = await rpModel.getRpHeaderById(conn, id, { lock: true });

    if (!rp) {
      throw new Error('RP request not found');
    }

    if (rp.status !== 'PENDING_DESTINATION_CHECKER') {
      throw new Error('Only PENDING_DESTINATION_CHECKER RP can be checked');
    }

    const allowed = await canDestinationChecker(conn, user, rp);

    if (!allowed) {
      throw new Error('Only authorized checker can check this RP');
    }

    const oldItems = await rpModel.getRpItems(conn, id);

    assertCheckerItemsMatchExisting(oldItems, body.items || []);

    const checkerBodyItems = mapCheckerItems(oldItems, body.items || []);
    validateItems(checkerBodyItems);

    const newItems = await buildRpItems(conn, checkerBodyItems);
    const totalAmount = sumTotalAmount(newItems);
    const headerSnapshot = buildHeaderSnapshotFromExistingRp(rp);

    const vendorSnapshot = await resolveRpVendorSnapshot(conn, {
      vendor_id: body.vendor_id !== undefined ? body.vendor_id : rp.vendor_id,
      vendor_name: body.vendor_name !== undefined ? body.vendor_name : rp.vendor_name_snapshot,
    });

    const newDescription = body.description !== undefined
      ? normalizeString(body.description)
      : normalizeString(rp.description);

    const oldHeaderHistory = buildHeaderHistorySnapshot(rp);
    const newHeaderHistory = buildHeaderHistorySnapshot({
      ...rp,
      ...vendorSnapshot,
      description: newDescription,
    });

    if (hasHeaderChange(oldHeaderHistory, newHeaderHistory)) {
      await rpModel.insertRpHeaderHistory(conn, {
        rp_request_id: id,
        change_type: 'UPDATE',
        old_values: oldHeaderHistory,
        new_values: newHeaderHistory,
        notes: body.notes || null,
        ...buildChangedByPayload(user),
      });
    }

    await releaseReservedBudgets(conn, rp, oldItems, user, 'Release old reserved budget for checked RP');

    for (const oldItem of oldItems) {
      const newItem = newItems.find((item) => String(item.rp_request_item_id) === String(oldItem.id));

      if (!newItem) {
        throw new Error('Checked RP item not found');
      }

      if (Number(newItem.budget_id) !== Number(oldItem.budget_id)) {
        throw new Error('Checker cannot change item budget');
      }

      await rpModel.updateRpItem(conn, oldItem.id, {
        ...newItem,
        budget_remaining_before: newItem.budget_remaining_before,
        budget_remaining_after: newItem.budget_remaining_after,
      });

      const oldSnapshot = buildItemSnapshot(oldItem);
      const newSnapshot = buildItemSnapshot({
        ...oldItem,
        ...newItem,
      });

      if (hasItemChange(oldItem, { ...oldItem, ...newItem })) {
        await rpModel.insertRpItemHistory(conn, {
          rp_request_id: id,
          rp_request_item_id: oldItem.id,
          change_type: 'UPDATE',
          old_values: oldSnapshot,
          new_values: newSnapshot,
          notes: body.notes || null,
          ...buildChangedByPayload(user),
        });
      }
    }

    const updatedItems = await rpModel.getRpItems(conn, id);

    await reserveItemsBudget(
      conn,
      id,
      rp.rp_number,
      updatedItems,
      headerSnapshot,
      user,
      userDepartmentContexts,
      'Reserve checked budget'
    );

    await rpModel.updateRpHeaderForDestinationCheck(conn, id, {
      ...vendorSnapshot,
      description: newDescription,
      total_amount: totalAmount,
      user,
    });

    await rpModel.insertRpApprovalLog(conn, {
      rp_request_id: id,
      action: 'DESTINATION_CHECK',
      from_status: 'PENDING_DESTINATION_CHECKER',
      to_status: 'PENDING_DESTINATION_MANAGER',
      ...buildActorLogPayload(user),
      notes: body.notes || null,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'RP',
      entityType: 'rp_requests',
      entityId: id,
      action: 'DESTINATION_CHECK',
      description: `Destination check RP ${rp.rp_number}`,
      actor: user,
      req,
      oldValues: {
        status: 'PENDING_DESTINATION_CHECKER',
        total_amount: rp.total_amount,
      },
      newValues: {
        status: 'PENDING_DESTINATION_MANAGER',
        total_amount: totalAmount,
      },
      metadata: {
        rp_number: rp.rp_number,
      },
    });

    await conn.commit();

    return {
      id,
      rp_number: rp.rp_number,
      status: 'PENDING_DESTINATION_MANAGER',
      total_amount: totalAmount,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function destinationManagerApproveRp(id, user = {}, body = {}, req = null) {
  const conn = await rpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const rp = await rpModel.getRpHeaderById(conn, id, { lock: true });

    if (!rp) {
      throw new Error('RP request not found');
    }

    if (rp.status !== 'PENDING_DESTINATION_MANAGER') {
      throw new Error('Only PENDING_DESTINATION_MANAGER RP can be approved by destination manager');
    }

    if (!canDestinationManagerApprove(user, rp)) {
      throw new Error('Only destination manager can approve this RP');
    }

    await rpModel.updateRpDestinationManagerApproved(conn, id, user);

    await rpModel.insertRpApprovalLog(conn, {
      rp_request_id: id,
      action: 'DESTINATION_MANAGER_APPROVE',
      from_status: 'PENDING_DESTINATION_MANAGER',
      to_status: 'APPROVED',
      ...buildActorLogPayload(user),
      notes: body.notes || null,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'RP',
      entityType: 'rp_requests',
      entityId: id,
      action: 'DESTINATION_MANAGER_APPROVE',
      description: `Destination manager approve RP ${rp.rp_number}`,
      actor: user,
      req,
      oldValues: { status: 'PENDING_DESTINATION_MANAGER' },
      newValues: { status: 'APPROVED' },
      metadata: { rp_number: rp.rp_number },
    });

    await conn.commit();

    return {
      id,
      rp_number: rp.rp_number,
      status: 'APPROVED',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function revertRp(id, user = {}, body = {}, req = null) {
  const reason = normalizeString(body.reason || body.notes);

  if (!reason) {
    throw new Error('Revert reason is required');
  }

  const conn = await rpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const rp = await rpModel.getRpHeaderById(conn, id, { lock: true });

    if (!rp) {
      throw new Error('RP request not found');
    }

    if (rp.frp_conversion_status !== 'NOT_CREATED') {
      throw new Error('RP that has FRP conversion status cannot be reverted');
    }

    const transition = getRpRevertTransition(user, rp);

    if (!transition) {
      throw new Error('Current user cannot revert this RP at current status');
    }

    await rpModel[transition.modelMethod](conn, id, user, reason);

    await rpModel.insertRpApprovalLog(conn, {
      rp_request_id: id,
      action: 'REVERT',
      from_status: transition.fromStatus,
      to_status: transition.toStatus,
      ...buildActorLogPayload(user),
      notes: reason,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'RP',
      entityType: 'rp_requests',
      entityId: id,
      action: 'REVERT',
      description: `Revert RP ${rp.rp_number}`,
      actor: user,
      req,
      oldValues: {
        status: transition.fromStatus,
      },
      newValues: {
        status: transition.toStatus,
        reason,
      },
      metadata: {
        rp_number: rp.rp_number,
        reason,
        from_status: transition.fromStatus,
        to_status: transition.toStatus,
      },
    });

    await conn.commit();

    return {
      id,
      rp_number: rp.rp_number,
      status: transition.toStatus,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function createFrpFromRp(id, body = {}, user = {}, req = null) {
  validateCreateFrpFromRpPayload(body);
  assertGeneralProcurementUser(user);

  const conn = await rpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const rp = await rpModel.getRpHeaderById(conn, id, { lock: true });

    if (!rp) {
      throw new Error('RP request not found');
    }

    if (rp.status !== 'APPROVED') {
      throw new Error('Only APPROVED RP can be converted to FRP');
    }

    if (rp.frp_conversion_status !== 'NOT_CREATED') {
      throw new Error('RP already has FRP conversion status');
    }

    const rpItems = await rpModel.getRpItems(conn, id);

    if (!rpItems.length) {
      throw new Error('RP items are required');
    }

    const vendorSnapshot = await resolveVendorSnapshot(conn, body.vendor_id);
    const vendorBankSnapshot = await resolveVendorBankAccountSnapshot(
      conn,
      body.vendor_id,
      body.vendor_bank_account_id || null
    );
    const externalDocumentTypeSnapshot = await resolveExternalDocumentTypeSnapshot(
      conn,
      body.external_document_type_id
    );
    const paymentMethodSnapshot = await resolvePaymentMethodSnapshot(
      conn,
      body.payment_method_id
    );
    const documentSnapshots = await resolveFrpDocumentTypeSnapshots(
      conn,
      body.document_type_ids || []
    );

    const frpItems = buildFrpItemsFromRpItems(rpItems, body.items || []);
    const documentNumberDepartment = getFrpDocumentNumberDepartmentFromRpItems(rpItems);
    const frpDate = body.frp_date || new Date().toISOString().slice(0, 10);

    const frpNumber = await generateDocumentNumber(conn, {
      module: 'FRP',
      departmentId: documentNumberDepartment.departmentId,
      departmentCode: documentNumberDepartment.departmentCode,
      date: new Date(frpDate),
    });

    const frpId = randomUUID();
    const totalAmount = sumTotalAmount(frpItems);
    const headerSnapshot = buildRpHeaderSnapshotForBudget(rp);
    const userSnapshot = buildUserSnapshot(user);

    const headerData = {
      id: frpId,
      frp_number: frpNumber,
      status: 'APPROVED',
      source_module: 'RP',
      source_rp_request_id: rp.id,
      source_rp_number: rp.rp_number,

      ...headerSnapshot,
      ...userSnapshot,
      ...vendorSnapshot,
      ...vendorBankSnapshot,
      ...externalDocumentTypeSnapshot,
      ...paymentMethodSnapshot,

      frp_date: frpDate,
      description: normalizeString(body.description || rp.description),
      currency_code: 'IDR',
      currency_id: null,
      exchange_rate: 1,
      exchange_rate_date: frpDate,
      exchange_rate_type: 'FIXED',
      exchange_rate_source: 'RP',

      internal_po_number: normalizeString(body.internal_po_number),
      external_document_number: normalizeString(body.external_document_number),
      payment_date: body.payment_date,
      destination_bank_name: normalizeString(body.destination_bank_name),
      destination_bank_account: normalizeString(body.destination_bank_account),
      destination_bank_account_name: normalizeString(body.destination_bank_account_name),
      total_amount: totalAmount,
      total_amount_idr: totalAmount,
    };

    await frpModel.insertFrpHeader(conn, headerData);

    for (const item of frpItems) {
      await frpModel.insertFrpItem(conn, {
        ...item,
        frp_request_id: frpId,
      });
    }

    for (const documentSnapshot of documentSnapshots) {
      await frpModel.insertFrpDocument(conn, {
        frp_request_id: frpId,
        ...documentSnapshot,
      });
    }

    await releaseRpReservedBudgetsForConversion(conn, rp, rpItems, user);
    await reserveAndFinalizeFrpBudgetsFromRp(conn, { id: frpId, frp_number: frpNumber }, frpItems, headerSnapshot, user);

    await rpModel.updateRpConvertedToFrp(conn, id, {
      frp_request_id: frpId,
      frp_number: frpNumber,
      user,
    });

    await frpModel.insertFrpApprovalLog(conn, {
      frp_request_id: frpId,
      action: 'SUBMIT',
      from_status: null,
      to_status: 'APPROVED',
      ...buildActorLogPayload(user),
      notes: body.notes || `Create FRP from RP ${rp.rp_number}`,
    });
    await activityLogService.createActivityLog(conn, {
      module: 'RP',
      entityType: 'rp_requests',
      entityId: id,
      action: 'CREATE_FRP',
      description: `Create FRP ${frpNumber} from RP ${rp.rp_number}`,
      actor: user,
      req,
      oldValues: {
        frp_conversion_status: 'NOT_CREATED',
      },
      newValues: {
        frp_conversion_status: 'CREATED',
        converted_frp_request_id: frpId,
        converted_frp_number: frpNumber,
      },
      metadata: {
        rp_number: rp.rp_number,
        frp_number: frpNumber,
        total_amount: totalAmount,
      },
    });

    await activityLogService.createActivityLog(conn, {
      module: 'FRP',
      entityType: 'frp_requests',
      entityId: frpId,
      action: 'CREATE_FROM_RP',
      description: `Create FRP ${frpNumber} from RP ${rp.rp_number}`,
      actor: user,
      req,
      oldValues: null,
      newValues: {
        id: frpId,
        frp_number: frpNumber,
        status: 'APPROVED',
        source_module: 'RP',
        source_rp_request_id: rp.id,
        source_rp_number: rp.rp_number,
        total_amount: totalAmount,
      },
      metadata: {
        rp_number: rp.rp_number,
        frp_number: frpNumber,
        total_amount: totalAmount,
      },
    });

    await conn.commit();

    return {
      id: frpId,
      frp_number: frpNumber,
      status: 'APPROVED',
      source_module: 'RP',
      source_rp_request_id: rp.id,
      source_rp_number: rp.rp_number,
      total_amount: totalAmount,
      total_amount_idr: totalAmount,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function procurementVoidRp(id, user = {}, body = {}, req = null) {
  const reason = validateProcurementVoidPayload(body);
  assertGeneralProcurementUser(user);

  const conn = await rpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const rp = await rpModel.getRpHeaderById(conn, id, { lock: true });

    if (!rp) {
      throw new Error('RP request not found');
    }

    if (rp.status !== 'APPROVED') {
      throw new Error('Only APPROVED RP can be voided by procurement');
    }

    if (rp.frp_conversion_status !== 'NOT_CREATED') {
      throw new Error('RP already has FRP conversion status');
    }

    const rpItems = await rpModel.getRpItems(conn, id);
    await releaseRpReservedBudgetsForConversion(conn, rp, rpItems, user);

    await rpModel.updateRpProcurementVoided(conn, id, user, reason);

    await rpModel.insertRpApprovalLog(conn, {
      rp_request_id: id,
      action: 'PROCUREMENT_VOID',
      from_status: 'APPROVED',
      to_status: 'VOIDED',
      ...buildActorLogPayload(user),
      notes: reason,
    });

    await activityLogService.createActivityLog(conn, {
      module: 'RP',
      entityType: 'rp_requests',
      entityId: id,
      action: 'PROCUREMENT_VOID',
      description: `Void procurement RP ${rp.rp_number}`,
      actor: user,
      req,
      oldValues: {
        status: 'APPROVED',
        frp_conversion_status: 'NOT_CREATED',
      },
      newValues: {
        status: 'VOIDED',
        frp_conversion_status: 'VOIDED',
        reason,
      },
      metadata: {
        rp_number: rp.rp_number,
        reason,
      },
    });

    await conn.commit();

    return {
      id,
      rp_number: rp.rp_number,
      status: 'VOIDED',
      frp_conversion_status: 'VOIDED',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  listRp,
  getRpDetail,
  createRp,
  updateRp,
  requesterManagerApproveRp,
  requesterManagerRejectRp,
  destinationCheckRp,
  destinationCheckerRejectRp,
  destinationManagerApproveRp,
  destinationManagerRejectRp,
  revertRp,
  createFrpFromRp,
  procurementVoidRp,
};
