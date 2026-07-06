const R = require('../../utils/response.util');
const BudgetAccessRuleService = require('../../services/master/budgetAccessRule.service');

async function index(req, res, next) {
  try {
    const result = await BudgetAccessRuleService.getBudgetAccessRules(req.query);

    return R.paginated(res, result.rows, result.meta, 'Budget access rules retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const rule = await BudgetAccessRuleService.getBudgetAccessRuleById(req.params.id);

    return R.ok(res, rule, 'Budget access rule retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const rule = await BudgetAccessRuleService.createBudgetAccessRule(req.body, req);

    return R.created(res, rule, 'Budget access rule created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const rule = await BudgetAccessRuleService.updateBudgetAccessRule(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, rule, 'Budget access rule updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const rule = await BudgetAccessRuleService.updateBudgetAccessRuleStatus(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, rule, 'Budget access rule status updated');
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const rule = await BudgetAccessRuleService.deleteBudgetAccessRule(req.params.id, req);

    return R.ok(res, rule, 'Budget access rule deleted');
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
  destroy,
};
