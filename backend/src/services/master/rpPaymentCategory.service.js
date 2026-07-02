const { db } = require('../../config/database.config');
const RpPaymentCategoryModel = require('../../models/master/rpPaymentCategory.model');
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

function normalizeSortOrder(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  return Number(value);
}

function validateRpPaymentCategoryPayload(payload = {}) {
  const errors = {};

  const code = normalizeCode(payload.code);
  const name = normalizeName(payload.name);
  const description = normalizeDescription(payload.description);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  if (!code) {
    errors.code = 'RP payment category code is required';
  }

  if (code.length > 50) {
    errors.code = 'RP payment category code maximum length is 50 characters';
  }

  if (!name) {
    errors.name = 'RP payment category name is required';
  }

  if (name.length > 150) {
    errors.name = 'RP payment category name maximum length is 150 characters';
  }

  if (description && description.length > 255) {
    errors.description = 'Description maximum length is 255 characters';
  }

  if (!Number.isInteger(sortOrder)) {
    errors.sort_order = 'sort_order must be an integer';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Validation error', 400, errors);
  }

  return {
    code,
    name,
    description,
    sort_order: sortOrder,
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
  const existingCategory = await RpPaymentCategoryModel.findByCode(code, connection);

  if (!existingCategory) {
    return;
  }

  if (ignoredId && Number(existingCategory.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('RP payment category code already exists', 400, {
    code: 'RP payment category code already exists',
  });
}

async function getRpPaymentCategories(query = {}) {
  return RpPaymentCategoryModel.findAll(query);
}

async function getRpPaymentCategoryById(id) {
  const category = await RpPaymentCategoryModel.findById(id);

  if (!category) {
    throw createHttpError('RP payment category not found', 404);
  }

  return category;
}

async function createRpPaymentCategory(payload, req) {
  const data = validateRpPaymentCategoryPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await ensureCodeUnique(data.code, null, connection);

    const category = await RpPaymentCategoryModel.create(
      {
        code: data.code,
        name: data.name,
        description: data.description,
        sort_order: data.sort_order,
        is_active: 1,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_rp_payment_categories',
      entityId: category.id,
      action: 'CREATE',
      description: `Create RP payment category ${category.code} - ${category.name}`,
      oldValues: null,
      newValues: category,
    });

    await connection.commit();

    return category;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateRpPaymentCategory(id, payload, req) {
  const data = validateRpPaymentCategoryPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldCategory = await RpPaymentCategoryModel.findById(id, connection);

    if (!oldCategory) {
      throw createHttpError('RP payment category not found', 404);
    }

    await ensureCodeUnique(data.code, id, connection);

    const updatedCategory = await RpPaymentCategoryModel.update(id, data, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_rp_payment_categories',
      entityId: id,
      action: 'UPDATE',
      description: `Update RP payment category ${updatedCategory.code} - ${updatedCategory.name}`,
      oldValues: oldCategory,
      newValues: updatedCategory,
    });

    await connection.commit();

    return updatedCategory;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateRpPaymentCategoryStatus(id, payload, req) {
  const data = validateStatusPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldCategory = await RpPaymentCategoryModel.findById(id, connection);

    if (!oldCategory) {
      throw createHttpError('RP payment category not found', 404);
    }

    const updatedCategory = await RpPaymentCategoryModel.updateStatus(id, data.is_active, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_rp_payment_categories',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate RP payment category ${updatedCategory.code} - ${updatedCategory.name}`
          : `Deactivate RP payment category ${updatedCategory.code} - ${updatedCategory.name}`,
      oldValues: oldCategory,
      newValues: updatedCategory,
    });

    await connection.commit();

    return updatedCategory;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getRpPaymentCategories,
  getRpPaymentCategoryById,
  createRpPaymentCategory,
  updateRpPaymentCategory,
  updateRpPaymentCategoryStatus,
};