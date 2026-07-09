const R = require('../../utils/response.util');
const UserModulePermissionService = require('../../services/master/userModulePermission.service');

async function index(req, res, next) {
  try {
    const result = await UserModulePermissionService.getUserModulePermissions(req.query);

    return R.paginated(res, result.rows, result.meta, 'User module permissions retrieved');
  } catch (err) {
    return next(err);
  }
}

async function groupedByUser(req, res, next) {
  try {
    const result = await UserModulePermissionService.getUserModulePermissionsGroupedByUser(req.query);

    return R.ok(res, result, 'User module permissions grouped by user retrieved');
  } catch (err) {
    return next(err);
  }
}

async function groupedByModule(req, res, next) {
  try {
    const result = await UserModulePermissionService.getUserModulePermissionsGroupedByModule(req.query);

    return R.ok(res, result, 'User module permissions grouped by module retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const permission = await UserModulePermissionService.getUserModulePermissionById(req.params.id);

    return R.ok(res, permission, 'User module permission retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const permission = await UserModulePermissionService.createUserModulePermission(req.body, req);

    return R.created(res, permission, 'User module permission created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const permission = await UserModulePermissionService.updateUserModulePermission(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, permission, 'User module permission updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const permission = await UserModulePermissionService.updateUserModulePermissionStatus(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, permission, 'User module permission status updated');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  index,
  groupedByUser,
  groupedByModule,
  show,
  store,
  update,
  updateStatus,
};