const R = require('../../utils/response.util');
const BudgetService = require('../../services/master/budget.service');

async function index(req, res, next) {
  try {
    const result = await BudgetService.getBudgets(req.query);

    return R.paginated(res, result.rows, result.meta, 'Budgets retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const budget = await BudgetService.getBudgetById(req.params.id);

    return R.ok(res, budget, 'Budget retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const budget = await BudgetService.createBudget(req.body, req);

    return R.created(res, budget, 'Budget created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const budget = await BudgetService.updateBudget(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, budget, 'Budget updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const budget = await BudgetService.updateBudgetStatus(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, budget, 'Budget status updated');
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