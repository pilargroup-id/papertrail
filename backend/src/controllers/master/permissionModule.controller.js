const R = require('../../utils/response.util');
const PermissionModuleService = require('../../services/master/permissionModule.service');

async function index(req, res, next) {
  try {
    const modules = await PermissionModuleService.getPermissionModules(req.query);

    return R.ok(res, modules, 'Permission modules retrieved');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  index,
};