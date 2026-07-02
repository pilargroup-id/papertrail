const ModulePermissionService = require('../services/permission/modulePermission.service');

function requireModulePermission(moduleCode, action) {
  return async (req, res, next) => {
    try {
      req.modulePermission = await ModulePermissionService.checkUserModulePermission(
        req.user,
        moduleCode,
        action
      );

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  requireModulePermission,
};