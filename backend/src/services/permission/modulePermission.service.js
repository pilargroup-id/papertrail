const ModulePermissionModel = require('../../models/permission/modulePermission.model');

const ACTION_COLUMN_MAP = {
  view: 'can_view',
  create: 'can_create',
  update: 'can_update',
  deactivate: 'can_deactivate',
};

function createHttpError(message, statusCode = 500, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function normalizeAction(action) {
  return String(action || '').trim().toLowerCase();
}

async function checkUserModulePermission(user, moduleCode, action) {
  const normalizedAction = normalizeAction(action);
  const permissionColumn = ACTION_COLUMN_MAP[normalizedAction];

  if (!permissionColumn) {
    throw createHttpError(
      `Invalid permission action: ${action}`,
      500,
      'INVALID_PERMISSION_ACTION'
    );
  }

  if (!user?.id) {
    throw createHttpError(
      'Authenticated user not found',
      401,
      'AUTH_USER_NOT_FOUND'
    );
  }

  const permission = await ModulePermissionModel.findUserModulePermission(
    user.id,
    moduleCode
  );

  if (!permission) {
    throw createHttpError(
      `Forbidden: missing permission for ${moduleCode}`,
      403,
      'MODULE_PERMISSION_FORBIDDEN'
    );
  }

  if (Number(permission[permissionColumn]) !== 1) {
    throw createHttpError(
      `Forbidden: ${normalizedAction} access for ${moduleCode} is not allowed`,
      403,
      'MODULE_ACTION_FORBIDDEN'
    );
  }

  return permission;
}

module.exports = {
  checkUserModulePermission,
};