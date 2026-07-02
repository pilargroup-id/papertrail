const { db } = require('../../config/database.config');
const RpDestinationDepartmentModel = require('../../models/master/rpDestinationDepartment.model');
const ActivityLogService = require('../activity/activityLog.service');

function createHttpError(message, statusCode = 500, errors = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (errors) err.errors = errors;
  return err;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeBooleanFlag(value, fieldName, errors, defaultValue = 1) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = Number(value);

  if (![0, 1].includes(normalized)) {
    errors[fieldName] = `${fieldName} must be 0 or 1`;
  }

  return normalized;
}

function validatePayload(payload = {}) {
  const errors = {};

  const departmentId = Number(payload.department_id);
  const departmentNameSnapshot = normalizeString(payload.department_name_snapshot);
  const departmentClassSnapshot = normalizeString(payload.department_class_snapshot);
  const departmentCodeSnapshot = normalizeString(payload.department_code_snapshot);
  const isShortFlowAllowed = normalizeBooleanFlag(
    payload.is_short_flow_allowed,
    'is_short_flow_allowed',
    errors,
    1
  );

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
    department_id: departmentId,
    department_name_snapshot: departmentNameSnapshot || null,
    department_class_snapshot: departmentClassSnapshot || null,
    department_code_snapshot: departmentCodeSnapshot || null,
    is_short_flow_allowed: isShortFlowAllowed,
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

async function ensureUniqueDepartment(departmentId, ignoredId = null, connection) {
  const existing = await RpDestinationDepartmentModel.findByDepartmentId(
    departmentId,
    connection
  );

  if (!existing) {
    return;
  }

  if (ignoredId && Number(existing.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('RP destination department already exists', 400, {
    department_id: 'This department is already registered as RP destination department',
  });
}

async function getRpDestinationDepartments(query = {}) {
  return RpDestinationDepartmentModel.findAll(query);
}

async function getRpDestinationDepartmentById(id) {
  const department = await RpDestinationDepartmentModel.findById(id);

  if (!department) {
    throw createHttpError('RP destination department not found', 404);
  }

  return department;
}

async function createRpDestinationDepartment(payload, req) {
  const data = validatePayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await ensureUniqueDepartment(data.department_id, null, connection);

    const department = await RpDestinationDepartmentModel.create(
      {
        ...data,
        is_active: 1,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_rp_destination_departments',
      entityId: department.id,
      action: 'CREATE',
      description: `Create RP destination department ${department.department_name_snapshot || department.department_id}`,
      oldValues: null,
      newValues: department,
    });

    await connection.commit();

    return department;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateRpDestinationDepartment(id, payload, req) {
  const data = validatePayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldDepartment = await RpDestinationDepartmentModel.findById(id, connection);

    if (!oldDepartment) {
      throw createHttpError('RP destination department not found', 404);
    }

    await ensureUniqueDepartment(data.department_id, id, connection);

    const updatedDepartment = await RpDestinationDepartmentModel.update(
      id,
      data,
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_rp_destination_departments',
      entityId: id,
      action: 'UPDATE',
      description: `Update RP destination department ${updatedDepartment.department_name_snapshot || updatedDepartment.department_id}`,
      oldValues: oldDepartment,
      newValues: updatedDepartment,
    });

    await connection.commit();

    return updatedDepartment;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateRpDestinationDepartmentStatus(id, payload, req) {
  const data = validateStatusPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldDepartment = await RpDestinationDepartmentModel.findById(id, connection);

    if (!oldDepartment) {
      throw createHttpError('RP destination department not found', 404);
    }

    const updatedDepartment = await RpDestinationDepartmentModel.updateStatus(
      id,
      data.is_active,
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_rp_destination_departments',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate RP destination department ${updatedDepartment.department_name_snapshot || updatedDepartment.department_id}`
          : `Deactivate RP destination department ${updatedDepartment.department_name_snapshot || updatedDepartment.department_id}`,
      oldValues: oldDepartment,
      newValues: updatedDepartment,
    });

    await connection.commit();

    return updatedDepartment;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getRpDestinationDepartments,
  getRpDestinationDepartmentById,
  createRpDestinationDepartment,
  updateRpDestinationDepartment,
  updateRpDestinationDepartmentStatus,
};