const R = require('../../utils/response.util');
const RpDestinationDepartmentService = require('../../services/master/rpDestinationDepartment.service');

async function index(req, res, next) {
  try {
    const result = await RpDestinationDepartmentService.getRpDestinationDepartments(req.query);

    return R.paginated(res, result.rows, result.meta, 'RP destination departments retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const department = await RpDestinationDepartmentService.getRpDestinationDepartmentById(
      req.params.id
    );

    return R.ok(res, department, 'RP destination department retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const department = await RpDestinationDepartmentService.createRpDestinationDepartment(
      req.body,
      req
    );

    return R.created(res, department, 'RP destination department created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const department = await RpDestinationDepartmentService.updateRpDestinationDepartment(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, department, 'RP destination department updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const department = await RpDestinationDepartmentService.updateRpDestinationDepartmentStatus(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, department, 'RP destination department status updated');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  index,
  show,
  store,
  update,
  updateStatus,
};