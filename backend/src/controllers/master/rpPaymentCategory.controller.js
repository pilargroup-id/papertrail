const R = require('../../utils/response.util');
const RpPaymentCategoryService = require('../../services/master/rpPaymentCategory.service');

async function index(req, res, next) {
  try {
    const result = await RpPaymentCategoryService.getRpPaymentCategories(req.query);

    return R.paginated(res, result.rows, result.meta, 'RP payment categories retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const category = await RpPaymentCategoryService.getRpPaymentCategoryById(req.params.id);

    return R.ok(res, category, 'RP payment category retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const category = await RpPaymentCategoryService.createRpPaymentCategory(req.body, req);

    return R.created(res, category, 'RP payment category created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const category = await RpPaymentCategoryService.updateRpPaymentCategory(req.params.id, req.body, req);

    return R.ok(res, category, 'RP payment category updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const category = await RpPaymentCategoryService.updateRpPaymentCategoryStatus(req.params.id, req.body, req);

    return R.ok(res, category, 'RP payment category status updated');
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