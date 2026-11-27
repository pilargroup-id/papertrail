const ModulePermissionModel = require('../../models/permission/modulePermission.model');
const { isItDepartmentUser } = require('../../utils/itUser.util');

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
      `Aksi izin tidak valid: ${action}.`,
      500,
      'INVALID_PERMISSION_ACTION'
    );
  }

  if (!user?.id) {
    throw createHttpError(
      'Pengguna yang login tidak ditemukan.',
      401,
      'AUTH_USER_NOT_FOUND'
    );
  }

  // User IT boleh mengakses semua modul tanpa perlu baris di user_module_permissions.
  if (isItDepartmentUser(user)) {
    return {
      user_id: user.id,
      module_code: moduleCode,
      can_view: 1,
      can_create: 1,
      can_update: 1,
      can_deactivate: 1,
      is_active: 1,
      is_it_bypass: true,
    };
  }

  const permission = await ModulePermissionModel.findUserModulePermission(
    user.id,
    moduleCode
  );

  if (!permission) {
    throw createHttpError(
      `Akses ditolak: Anda tidak memiliki izin untuk ${moduleCode}.`,
      403,
      'MODULE_PERMISSION_FORBIDDEN'
    );
  }

  if (Number(permission[permissionColumn]) !== 1) {
    throw createHttpError(
      `Akses ditolak: aksi ${normalizedAction} pada ${moduleCode} tidak diizinkan.`,
      403,
      'MODULE_ACTION_FORBIDDEN'
    );
  }

  return permission;
}

module.exports = {
  checkUserModulePermission,
};