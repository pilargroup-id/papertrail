const { db } = require('../../config/database.config');
const PermissionModuleModel = require('../../models/master/permissionModule.model');
const UserModulePermissionModel = require('../../models/master/userModulePermission.model');
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

function normalizeBooleanFlag(value, fieldName, errors) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const normalized = Number(value);

  if (![0, 1].includes(normalized)) {
    errors[fieldName] = `${fieldName} must be 0 or 1`;
  }

  return normalized;
}

function validatePermissionPayload(payload = {}) {
  const errors = {};

  const userId = normalizeString(payload.user_id);
  const usernameSnapshot = normalizeString(payload.username_snapshot);
  const nameSnapshot = normalizeString(payload.name_snapshot);
  const moduleId = Number(payload.module_id);

  if (!userId) {
    errors.user_id = 'user_id is required';
  }

  if (userId && userId.length > 36) {
    errors.user_id = 'user_id maximum length is 36 characters';
  }

  if (usernameSnapshot && usernameSnapshot.length > 100) {
    errors.username_snapshot = 'username_snapshot maximum length is 100 characters';
  }

  if (nameSnapshot && nameSnapshot.length > 255) {
    errors.name_snapshot = 'name_snapshot maximum length is 255 characters';
  }

  if (!Number.isInteger(moduleId) || moduleId <= 0) {
    errors.module_id = 'module_id is required and must be a positive integer';
  }

  const canView = normalizeBooleanFlag(payload.can_view, 'can_view', errors);
  const canCreate = normalizeBooleanFlag(payload.can_create, 'can_create', errors);
  const canUpdate = normalizeBooleanFlag(payload.can_update, 'can_update', errors);
  const canDeactivate = normalizeBooleanFlag(payload.can_deactivate, 'can_deactivate', errors);

  if (Object.keys(errors).length) {
    throw createHttpError('Validation error', 400, errors);
  }

  return {
    user_id: userId,
    username_snapshot: usernameSnapshot || null,
    name_snapshot: nameSnapshot || null,
    module_id: moduleId,
    can_view: canView,
    can_create: canCreate,
    can_update: canUpdate,
    can_deactivate: canDeactivate,
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

async function ensureModuleExists(moduleId, connection) {
  const module = await PermissionModuleModel.findById(moduleId, connection);

  if (!module) {
    throw createHttpError('Permission module not found', 404, {
      module_id: 'Permission module not found',
    });
  }

  if (Number(module.is_active) !== 1) {
    throw createHttpError('Permission module is inactive', 400, {
      module_id: 'Permission module is inactive',
    });
  }

  return module;
}

async function ensureUniqueUserModule(userId, moduleId, ignoredId = null, connection) {
  const existing = await UserModulePermissionModel.findByUserAndModule(
    userId,
    moduleId,
    connection
  );

  if (!existing) {
    return;
  }

  if (ignoredId && Number(existing.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('User module permission already exists', 400, {
    user_id: 'User already has permission for this module',
    module_id: 'User already has permission for this module',
  });
}

async function getUserModulePermissions(query = {}) {
  return UserModulePermissionModel.findAll(query);
}

async function getUserModulePermissionById(id) {
  const permission = await UserModulePermissionModel.findById(id);

  if (!permission) {
    throw createHttpError('User module permission not found', 404);
  }

  return permission;
}

async function createUserModulePermission(payload, req) {
  const data = validatePermissionPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const module = await ensureModuleExists(data.module_id, connection);

    await ensureUniqueUserModule(data.user_id, data.module_id, null, connection);

    const permission = await UserModulePermissionModel.create(
      {
        ...data,
        is_active: 1,
        created_by_user_id: req.user?.id || null,
        created_by_name: req.user?.name || null,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER_PERMISSION',
      entityType: 'user_module_permissions',
      entityId: permission.id,
      action: 'CREATE',
      description: `Create permission ${data.user_id} for ${module.module_code}`,
      oldValues: null,
      newValues: permission,
      metadata: {
        module_code: module.module_code,
        module_name: module.module_name,
      },
    });

    await connection.commit();

    return permission;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateUserModulePermission(id, payload, req) {
  const data = validatePermissionPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldPermission = await UserModulePermissionModel.findById(id, connection);

    if (!oldPermission) {
      throw createHttpError('User module permission not found', 404);
    }

    const module = await ensureModuleExists(data.module_id, connection);

    await ensureUniqueUserModule(data.user_id, data.module_id, id, connection);

    const updatedPermission = await UserModulePermissionModel.update(
      id,
      {
        ...data,
        updated_by_user_id: req.user?.id || null,
        updated_by_name: req.user?.name || null,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER_PERMISSION',
      entityType: 'user_module_permissions',
      entityId: id,
      action: 'UPDATE',
      description: `Update permission ${data.user_id} for ${module.module_code}`,
      oldValues: oldPermission,
      newValues: updatedPermission,
      metadata: {
        module_code: module.module_code,
        module_name: module.module_name,
      },
    });

    await connection.commit();

    return updatedPermission;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateUserModulePermissionStatus(id, payload, req) {
  const data = validateStatusPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldPermission = await UserModulePermissionModel.findById(id, connection);

    if (!oldPermission) {
      throw createHttpError('User module permission not found', 404);
    }

    const updatedPermission = await UserModulePermissionModel.updateStatus(
      id,
      {
        is_active: data.is_active,
        updated_by_user_id: req.user?.id || null,
        updated_by_name: req.user?.name || null,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER_PERMISSION',
      entityType: 'user_module_permissions',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate permission ${oldPermission.user_id} for ${oldPermission.module_code}`
          : `Deactivate permission ${oldPermission.user_id} for ${oldPermission.module_code}`,
      oldValues: oldPermission,
      newValues: updatedPermission,
      metadata: {
        module_code: oldPermission.module_code,
        module_name: oldPermission.module_name,
      },
    });

    await connection.commit();

    return updatedPermission;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getUserModulePermissions,
  getUserModulePermissionById,
  createUserModulePermission,
  updateUserModulePermission,
  updateUserModulePermissionStatus,
};