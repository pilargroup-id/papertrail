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
    errors.code = 'Kode tipe dokumen FRP wajib diisi.';
  }

  if (code.length > 50) {
    errors.code = 'Kode tipe dokumen FRP maksimal 50 karakter.';
  }

  if (!name) {
    errors.name = 'Nama tipe dokumen FRP wajib diisi.';
  }

  if (name.length > 150) {
    errors.name = 'Nama tipe dokumen FRP maksimal 150 karakter.';
  }

  if (description && description.length > 255) {
    errors.description = 'Deskripsi maksimal 255 karakter.';
  }

  if (!Number.isInteger(sortOrder)) {
    errors.sort_order = 'sort_order harus berupa bilangan bulat.';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Data yang diisi tidak valid.', 400, errors);
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
  const existingDocumentType = await FrpDocumentTypeModel.findByCode(code, connection);

  if (!existingDocumentType) {
    return;
  }

  if (ignoredId && Number(existingDocumentType.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('Kode tipe dokumen FRP sudah ada.', 400, {
    code: 'Kode tipe dokumen FRP sudah ada.',
  });
}

async function getFrpDocumentTypes(query = {}) {
  return FrpDocumentTypeModel.findAll(query);
}

async function getFrpDocumentTypeById(id) {
  const documentType = await FrpDocumentTypeModel.findById(id);

  if (!documentType) {
    throw createHttpError('Tipe dokumen FRP tidak ditemukan.', 404);
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
      throw createHttpError('Tipe dokumen FRP tidak ditemukan.', 404);
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
      throw createHttpError('Tipe dokumen FRP tidak ditemukan.', 404);
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