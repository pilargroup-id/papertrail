const PermissionModuleModel = require('../../models/master/permissionModule.model');

async function getPermissionModules(query = {}) {
  return PermissionModuleModel.findAll(query);
}

module.exports = {
  getPermissionModules,
};