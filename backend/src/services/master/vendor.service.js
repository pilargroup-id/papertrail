const { db } = require('../../config/database.config');
const VendorModel = require('../../models/master/vendor.model');
const ActivityLogService = require('../activity/activityLog.service');

function createHttpError(message, statusCode = 500, errors = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (errors) err.errors = errors;
  return err;
}

function normalizeName(value) {
  return String(value || '').trim();
}

function validateVendorPayload(payload = {}) {
  const errors = {};

  const name = normalizeName(payload.name);

  if (!name) {
    errors.name = 'Vendor name is required';
  }

  if (name.length > 255) {
    errors.name = 'Vendor name maximum length is 255 characters';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Validation error', 400, errors);
  }

  return { name };
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

async function getVendors(query = {}) {
  return VendorModel.findAll(query);
}

async function getVendorById(id) {
  const vendor = await VendorModel.findById(id);

  if (!vendor) {
    throw createHttpError('Vendor not found', 404);
  }

  return vendor;
}

async function createVendor(payload, req) {
  const data = validateVendorPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const vendor = await VendorModel.create(
      {
        name: data.name,
        is_active: 1,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_vendors',
      entityId: vendor.id,
      action: 'CREATE',
      description: `Create vendor ${vendor.name}`,
      oldValues: null,
      newValues: vendor,
    });

    await connection.commit();

    return vendor;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateVendor(id, payload, req) {
  const data = validateVendorPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldVendor = await VendorModel.findById(id, connection);

    if (!oldVendor) {
      throw createHttpError('Vendor not found', 404);
    }

    const updatedVendor = await VendorModel.update(id, data, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_vendors',
      entityId: id,
      action: 'UPDATE',
      description: `Update vendor ${updatedVendor.name}`,
      oldValues: oldVendor,
      newValues: updatedVendor,
    });

    await connection.commit();

    return updatedVendor;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateVendorStatus(id, payload, req) {
  const data = validateStatusPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldVendor = await VendorModel.findById(id, connection);

    if (!oldVendor) {
      throw createHttpError('Vendor not found', 404);
    }

    const updatedVendor = await VendorModel.updateStatus(id, data.is_active, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_vendors',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate vendor ${updatedVendor.name}`
          : `Deactivate vendor ${updatedVendor.name}`,
      oldValues: oldVendor,
      newValues: updatedVendor,
    });

    await connection.commit();

    return updatedVendor;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorStatus,
};