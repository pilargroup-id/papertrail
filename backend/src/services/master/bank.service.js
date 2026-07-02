const { db } = require('../../config/database.config');
const BankModel = require('../../models/master/bank.model');
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

function normalizeSortOrder(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  return Number(value);
}

function validateBankPayload(payload = {}) {
  const errors = {};

  const code = normalizeCode(payload.code);
  const name = normalizeName(payload.name);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  if (!code) {
    errors.code = 'Bank code is required';
  }

  if (code.length > 50) {
    errors.code = 'Bank code maximum length is 50 characters';
  }

  if (!name) {
    errors.name = 'Bank name is required';
  }

  if (name.length > 150) {
    errors.name = 'Bank name maximum length is 150 characters';
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
  const existingBank = await BankModel.findByCode(code, connection);

  if (!existingBank) {
    return;
  }

  if (ignoredId && Number(existingBank.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('Bank code already exists', 400, {
    code: 'Bank code already exists',
  });
}

async function getBanks(query = {}) {
  return BankModel.findAll(query);
}

async function getBankById(id) {
  const bank = await BankModel.findById(id);

  if (!bank) {
    throw createHttpError('Bank not found', 404);
  }

  return bank;
}

async function createBank(payload, req) {
  const data = validateBankPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await ensureCodeUnique(data.code, null, connection);

    const bank = await BankModel.create(
      {
        code: data.code,
        name: data.name,
        sort_order: data.sort_order,
        is_active: 1,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_banks',
      entityId: bank.id,
      action: 'CREATE',
      description: `Create bank ${bank.code} - ${bank.name}`,
      oldValues: null,
      newValues: bank,
    });

    await connection.commit();

    return bank;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateBank(id, payload, req) {
  const data = validateBankPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldBank = await BankModel.findById(id, connection);

    if (!oldBank) {
      throw createHttpError('Bank not found', 404);
    }

    await ensureCodeUnique(data.code, id, connection);

    const updatedBank = await BankModel.update(id, data, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_banks',
      entityId: id,
      action: 'UPDATE',
      description: `Update bank ${updatedBank.code} - ${updatedBank.name}`,
      oldValues: oldBank,
      newValues: updatedBank,
    });

    await connection.commit();

    return updatedBank;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateBankStatus(id, payload, req) {
  const data = validateStatusPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldBank = await BankModel.findById(id, connection);

    if (!oldBank) {
      throw createHttpError('Bank not found', 404);
    }

    const updatedBank = await BankModel.updateStatus(id, data.is_active, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_banks',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate bank ${updatedBank.code} - ${updatedBank.name}`
          : `Deactivate bank ${updatedBank.code} - ${updatedBank.name}`,
      oldValues: oldBank,
      newValues: updatedBank,
    });

    await connection.commit();

    return updatedBank;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getBanks,
  getBankById,
  createBank,
  updateBank,
  updateBankStatus,
};