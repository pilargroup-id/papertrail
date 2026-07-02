const { db } = require('../../config/database.config');
const FrpDocumentTypeModel = require('../../models/master/frpDocumentType.model');
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

function validateFrpDocumentTypePayload(payload = {}) {
  const errors = {};

  const code = normalizeCode(payload.code);
  const name = normalizeName(payload.name);
  const description = normalizeDescription(payload.description);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  if (!code) {
    errors.code = 'FRP document type code is required';
  }

  if (code.length > 50) {
    errors.code = 'FRP document type code maximum length is 50 characters';
  }

  if (!name) {
    errors.name = 'FRP document type name is required';
  }

  if (name.length > 150) {
    errors.name = 'FRP document type name maximum length is 150 characters';
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
  const existingDocumentType = await FrpDocumentTypeModel.findByCode(code, connection);

  if (!existingDocumentType) {
    return;
  }

  if (ignoredId && Number(existingDocumentType.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('FRP document type code already exists', 400, {
    code: 'FRP document type code already exists',
  });
}

async function getFrpDocumentTypes(query = {}) {
  return FrpDocumentTypeModel.findAll(query);
}

async function getFrpDocumentTypeById(id) {
  const documentType = await FrpDocumentTypeModel.findById(id);

  if (!documentType) {
    throw createHttpError('FRP document type not found', 404);
  }

  return documentType;
}

async function createFrpDocumentType(payload, req) {
  const data = validateFrpDocumentTypePayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await ensureCodeUnique(data.code, null, connection);

    const documentType = await FrpDocumentTypeModel.create(
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
      entityType: 'master_frp_document_types',
      entityId: documentType.id,
      action: 'CREATE',
      description: `Create FRP document type ${documentType.code} - ${documentType.name}`,
      oldValues: null,
      newValues: documentType,
    });

    await connection.commit();

    return documentType;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateFrpDocumentType(id, payload, req) {
  const data = validateFrpDocumentTypePayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldDocumentType = await FrpDocumentTypeModel.findById(id, connection);

    if (!oldDocumentType) {
      throw createHttpError('FRP document type not found', 404);
    }

    await ensureCodeUnique(data.code, id, connection);

    const updatedDocumentType = await FrpDocumentTypeModel.update(id, data, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_frp_document_types',
      entityId: id,
      action: 'UPDATE',
      description: `Update FRP document type ${updatedDocumentType.code} - ${updatedDocumentType.name}`,
      oldValues: oldDocumentType,
      newValues: updatedDocumentType,
    });

    await connection.commit();

    return updatedDocumentType;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateFrpDocumentTypeStatus(id, payload, req) {
  const data = validateStatusPayload(payload);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldDocumentType = await FrpDocumentTypeModel.findById(id, connection);

    if (!oldDocumentType) {
      throw createHttpError('FRP document type not found', 404);
    }

    const updatedDocumentType = await FrpDocumentTypeModel.updateStatus(id, data.is_active, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_frp_document_types',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate FRP document type ${updatedDocumentType.code} - ${updatedDocumentType.name}`
          : `Deactivate FRP document type ${updatedDocumentType.code} - ${updatedDocumentType.name}`,
      oldValues: oldDocumentType,
      newValues: updatedDocumentType,
    });

    await connection.commit();

    return updatedDocumentType;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getFrpDocumentTypes,
  getFrpDocumentTypeById,
  createFrpDocumentType,
  updateFrpDocumentType,
  updateFrpDocumentTypeStatus,
};