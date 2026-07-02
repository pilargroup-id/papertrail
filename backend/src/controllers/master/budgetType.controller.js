const R = require('../../utils/response.util');
const BudgetTypeService = require('../../services/master/budgetType.service');

async function index(req, res, next) {
  try {
    const result = await BudgetTypeService.getBudgetTypes(req.query);

    return R.paginated(res, result.rows, result.meta, 'Budget types retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const budgetType = await BudgetTypeService.getBudgetTypeById(req.params.id);

    return R.ok(res, budgetType, 'Budget type retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const budgetType = await BudgetTypeService.createBudgetType(req.body, req);

    return R.created(res, budgetType, 'Budget type created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const budgetType = await BudgetTypeService.updateBudgetType(req.params.id, req.body, req);

    return R.ok(res, budgetType, 'Budget type updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const budgetType = await BudgetTypeService.updateBudgetTypeStatus(req.params.id, req.body, req);

    return R.ok(res, budgetType, 'Budget type status updated');
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