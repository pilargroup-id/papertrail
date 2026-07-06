const { db } = require('../../config/database.config');
const BudgetAccessRuleModel = require('../../models/master/budgetAccessRule.model');
const ActivityLogService = require('../activity/activityLog.service');

const ALLOWED_MODULES = ['FRP', 'RP'];
const ALLOWED_ACCESS_TYPES = ['CROSS_BUDGET'];

function createHttpError(message, statusCode = 500, errors = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (errors) err.errors = errors;
  return err;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function validatePayload(payload = {}) {
  const errors = {};

  const module = normalizeString(payload.module).toUpperCase();
  const accessType = normalizeString(payload.access_type || 'CROSS_BUDGET').toUpperCase();
  const departmentId = Number(payload.department_id);
  const departmentNameSnapshot = normalizeString(payload.department_name_snapshot);
  const departmentClassSnapshot = normalizeString(payload.department_class_snapshot);
  const departmentCodeSnapshot = normalizeString(payload.department_code_snapshot);

  if (!ALLOWED_MODULES.includes(module)) {
    errors.module = 'module must be FRP or RP';
  }

  if (!ALLOWED_ACCESS_TYPES.includes(accessType)) {
    errors.access_type = 'access_type must be CROSS_BUDGET';
  }

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    errors.department_id = 'department_id is required and must be a positive integer';
  }

  if (departmentNameSnapshot && departmentNameSnapshot.length > 100) {
    errors.department_name_snapshot = 'department_name_snapshot maximum length is 100 characters';
  }

  if (departmentClassSnapshot && departmentClassSnapshot.length > 100) {
    errors.department_class_snapshot = 'department_class_snapshot maximum length is 100 characters';
  }

  if (departmentCodeSnapshot && departmentCodeSnapshot.length > 10) {
    errors.department_code_snapshot = 'department_code_snapshot maximum length is 10 characters';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Validation error', 400, errors);
  }

  return {
    module,
    access_type: accessType,
    department_id: departmentId,
    department_name_snapshot: departmentNameSnapshot || null,
    department_class_snapshot: departmentClassSnapshot || null,
    department_code_snapshot: departmentCodeSnapshot || null,
  };
}

function validateStatusPayload(payload = {}) {
  const errors = {};

  if (payload.is_active === undefined || payload.is_active === null || payload.is_active === '') {
    errors.is_active = 'is_active is required';
  }

  const isActive = Number(payload.is_active);

  if (![0, 1].includes(isActive)) {
    errors.is_active = 'is_active must be 0 or 1';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Validation error', 400, errors);
  }

  return { is_active: isActive };
}

async function ensureUniqueRule(data, ignoredId = null, connection) {
  const duplicate = await BudgetAccessRuleModel.findDuplicate(
    data.module,
    data.access_type,
    data.department_id,
    connection
  );

  if (!duplicate) {
    return;
  }

  if (ignoredId && Number(duplicate.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('Budget access rule already exists', 400, {
    department_id: 'This department already has budget access rule for selected module',
  });
}

async function getBudgetAccessRules(query = {}) {
  return BudgetAccessRuleModel.findAll(query);
}

async function getBudgetAccessRuleById(id) {
  const rule = await BudgetAccessRuleModel.findById(id);

  if (!rule) {
    throw createHttpError('Budget access rule not found', 404);
  }

  return rule;
}

async function createBudgetAccessRule(payload, req) {
  const data = validatePayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await ensureUniqueRule(data, null, connection);

    const rule = await BudgetAccessRuleModel.create(
      {
        ...data,
        is_active: 1,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budget_access_rules',
      entityId: rule.id,
      action: 'CREATE',
      description: `Create budget access rule ${rule.module} - ${rule.department_name_snapshot || rule.department_id}`,
      oldValues: null,
      newValues: rule,
    });

    await connection.commit();

    return rule;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateBudgetAccessRule(id, payload, req) {
  const data = validatePayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldRule = await BudgetAccessRuleModel.findById(id, connection);

    if (!oldRule) {
      throw createHttpError('Budget access rule not found', 404);
    }

    await ensureUniqueRule(data, id, connection);

    const updatedRule = await BudgetAccessRuleModel.update(id, data, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budget_access_rules',
      entityId: id,
      action: 'UPDATE',
      description: `Update budget access rule ${updatedRule.module} - ${updatedRule.department_name_snapshot || updatedRule.department_id}`,
      oldValues: oldRule,
      newValues: updatedRule,
    });

    await connection.commit();

    return updatedRule;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateBudgetAccessRuleStatus(id, payload, req) {
  const data = validateStatusPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldRule = await BudgetAccessRuleModel.findById(id, connection);

    if (!oldRule) {
      throw createHttpError('Budget access rule not found', 404);
    }

    const updatedRule = await BudgetAccessRuleModel.updateStatus(id, data.is_active, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budget_access_rules',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate budget access rule ${updatedRule.module} - ${updatedRule.department_name_snapshot || updatedRule.department_id}`
          : `Deactivate budget access rule ${updatedRule.module} - ${updatedRule.department_name_snapshot || updatedRule.department_id}`,
      oldValues: oldRule,
      newValues: updatedRule,
    });

    await connection.commit();

    return updatedRule;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function deleteBudgetAccessRule(id, req) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldRule = await BudgetAccessRuleModel.remove(id, connection);

    if (!oldRule) {
      throw createHttpError('Budget access rule not found', 404);
    }

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budget_access_rules',
      entityId: id,
      action: 'DELETE',
      description: `Delete budget access rule ${oldRule.module} - ${oldRule.department_name_snapshot || oldRule.department_id}`,
      oldValues: oldRule,
      newValues: null,
    });

    await connection.commit();

    return oldRule;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getBudgetAccessRules,
  getBudgetAccessRuleById,
  createBudgetAccessRule,
  updateBudgetAccessRule,
  updateBudgetAccessRuleStatus,
  deleteBudgetAccessRule,
};
