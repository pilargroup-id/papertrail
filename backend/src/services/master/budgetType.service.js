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
    errors.code = 'Kode tipe anggaran wajib diisi.';
  }

  if (code.length > 50) {
    errors.code = 'Kode tipe anggaran maksimal 50 karakter.';
  }

  if (!name) {
    errors.name = 'Nama tipe anggaran wajib diisi.';
  }

  if (name.length > 100) {
    errors.name = 'Nama tipe anggaran maksimal 100 karakter.';
  }

  if (description && description.length > 255) {
    errors.description = 'Deskripsi maksimal 255 karakter.';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Data yang diisi tidak valid.', 400, errors);
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
    errors.is_active = 'is_active wajib diisi.';
  }

  const isActive = Number(payload.is_active);

  if (![0, 1].includes(isActive)) {
    errors.is_active = 'is_active harus 0 atau 1.';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Data yang diisi tidak valid.', 400, errors);
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

  throw createHttpError('Kode tipe anggaran sudah ada.', 400, {
    code: 'Kode tipe anggaran sudah ada.',
  });
}

async function getBudgetTypes(query = {}) {
  return BudgetTypeModel.findAll(query);
}

async function getBudgetTypeById(id) {
  const budgetType = await BudgetTypeModel.findById(id);

  if (!budgetType) {
    throw createHttpError('Tipe anggaran tidak ditemukan.', 404);
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
      throw createHttpError('Tipe anggaran tidak ditemukan.', 404);
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
      throw createHttpError('Tipe anggaran tidak ditemukan.', 404);
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