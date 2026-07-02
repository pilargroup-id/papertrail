const { db } = require('../../config/database.config');
const BudgetTypeModel = require('../../models/master/budgetType.model');
const ActivityLogService = require('../activity/activityLog.service');

function createHttpError(message, statusCode = 500, errors = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (errors) err.errors = errors;
  return err;
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeName(value) {
  return String(value || '').trim();
}

function normalizeDescription(value) {
  const description = String(value || '').trim();

  return description || null;
}

function validateBudgetTypePayload(payload = {}) {
  const errors = {};

  const code = normalizeCode(payload.code);
  const name = normalizeName(payload.name);
  const description = normalizeDescription(payload.description);

  if (!code) {
    errors.code = 'Budget type code is required';
  }

  if (code.length > 50) {
    errors.code = 'Budget type code maximum length is 50 characters';
  }

  if (!name) {
    errors.name = 'Budget type name is required';
  }

  if (name.length > 100) {
    errors.name = 'Budget type name maximum length is 100 characters';
  }

  if (description && description.length > 255) {
    errors.description = 'Description maximum length is 255 characters';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Validation error', 400, errors);
  }

  return {
    code,
    name,
    description,
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

async function ensureCodeUnique(code, ignoredId = null, connection = db) {
  const existingBudgetType = await BudgetTypeModel.findByCode(code, connection);

  if (!existingBudgetType) {
    return;
  }

  if (ignoredId && Number(existingBudgetType.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('Budget type code already exists', 400, {
    code: 'Budget type code already exists',
  });
}

async function getBudgetTypes(query = {}) {
  return BudgetTypeModel.findAll(query);
}

async function getBudgetTypeById(id) {
  const budgetType = await BudgetTypeModel.findById(id);

  if (!budgetType) {
    throw createHttpError('Budget type not found', 404);
  }

  return budgetType;
}

async function createBudgetType(payload, req) {
  const data = validateBudgetTypePayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await ensureCodeUnique(data.code, null, connection);

    const budgetType = await BudgetTypeModel.create(
      {
        code: data.code,
        name: data.name,
        description: data.description,
        is_active: 1,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budget_types',
      entityId: budgetType.id,
      action: 'CREATE',
      description: `Create budget type ${budgetType.code} - ${budgetType.name}`,
      oldValues: null,
      newValues: budgetType,
    });

    await connection.commit();

    return budgetType;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateBudgetType(id, payload, req) {
  const data = validateBudgetTypePayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldBudgetType = await BudgetTypeModel.findById(id, connection);

    if (!oldBudgetType) {
      throw createHttpError('Budget type not found', 404);
    }

    await ensureCodeUnique(data.code, id, connection);

    const updatedBudgetType = await BudgetTypeModel.update(id, data, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budget_types',
      entityId: id,
      action: 'UPDATE',
      description: `Update budget type ${updatedBudgetType.code} - ${updatedBudgetType.name}`,
      oldValues: oldBudgetType,
      newValues: updatedBudgetType,
    });

    await connection.commit();

    return updatedBudgetType;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateBudgetTypeStatus(id, payload, req) {
  const data = validateStatusPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldBudgetType = await BudgetTypeModel.findById(id, connection);

    if (!oldBudgetType) {
      throw createHttpError('Budget type not found', 404);
    }

    const updatedBudgetType = await BudgetTypeModel.updateStatus(id, data.is_active, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budget_types',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate budget type ${updatedBudgetType.code} - ${updatedBudgetType.name}`
          : `Deactivate budget type ${updatedBudgetType.code} - ${updatedBudgetType.name}`,
      oldValues: oldBudgetType,
      newValues: updatedBudgetType,
    });

    await connection.commit();

    return updatedBudgetType;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getBudgetTypes,
  getBudgetTypeById,
  createBudgetType,
  updateBudgetType,
  updateBudgetTypeStatus,
};