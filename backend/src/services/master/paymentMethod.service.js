const { db } = require('../../config/database.config');
const PaymentMethodModel = require('../../models/master/paymentMethod.model');
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

function validatePaymentMethodPayload(payload = {}) {
  const errors = {};

  const code = normalizeCode(payload.code);
  const name = normalizeName(payload.name);
  const description = normalizeDescription(payload.description);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  if (!code) {
    errors.code = 'Payment method code is required';
  }

  if (code.length > 50) {
    errors.code = 'Payment method code maximum length is 50 characters';
  }

  if (!name) {
    errors.name = 'Payment method name is required';
  }

  if (name.length > 100) {
    errors.name = 'Payment method name maximum length is 100 characters';
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
  const existingPaymentMethod = await PaymentMethodModel.findByCode(code, connection);

  if (!existingPaymentMethod) {
    return;
  }

  if (ignoredId && Number(existingPaymentMethod.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('Payment method code already exists', 400, {
    code: 'Payment method code already exists',
  });
}

async function getPaymentMethods(query = {}) {
  return PaymentMethodModel.findAll(query);
}

async function getPaymentMethodById(id) {
  const paymentMethod = await PaymentMethodModel.findById(id);

  if (!paymentMethod) {
    throw createHttpError('Payment method not found', 404);
  }

  return paymentMethod;
}

async function createPaymentMethod(payload, req) {
  const data = validatePaymentMethodPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await ensureCodeUnique(data.code, null, connection);

    const paymentMethod = await PaymentMethodModel.create(
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
      entityType: 'master_payment_methods',
      entityId: paymentMethod.id,
      action: 'CREATE',
      description: `Create payment method ${paymentMethod.code} - ${paymentMethod.name}`,
      oldValues: null,
      newValues: paymentMethod,
    });

    await connection.commit();

    return paymentMethod;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updatePaymentMethod(id, payload, req) {
  const data = validatePaymentMethodPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldPaymentMethod = await PaymentMethodModel.findById(id, connection);

    if (!oldPaymentMethod) {
      throw createHttpError('Payment method not found', 404);
    }

    await ensureCodeUnique(data.code, id, connection);

    const updatedPaymentMethod = await PaymentMethodModel.update(id, data, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_payment_methods',
      entityId: id,
      action: 'UPDATE',
      description: `Update payment method ${updatedPaymentMethod.code} - ${updatedPaymentMethod.name}`,
      oldValues: oldPaymentMethod,
      newValues: updatedPaymentMethod,
    });

    await connection.commit();

    return updatedPaymentMethod;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updatePaymentMethodStatus(id, payload, req) {
  const data = validateStatusPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldPaymentMethod = await PaymentMethodModel.findById(id, connection);

    if (!oldPaymentMethod) {
      throw createHttpError('Payment method not found', 404);
    }

    const updatedPaymentMethod = await PaymentMethodModel.updateStatus(id, data.is_active, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_payment_methods',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate payment method ${updatedPaymentMethod.code} - ${updatedPaymentMethod.name}`
          : `Deactivate payment method ${updatedPaymentMethod.code} - ${updatedPaymentMethod.name}`,
      oldValues: oldPaymentMethod,
      newValues: updatedPaymentMethod,
    });

    await connection.commit();

    return updatedPaymentMethod;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  updatePaymentMethodStatus,
};