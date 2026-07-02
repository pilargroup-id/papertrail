const R = require('../../utils/response.util');
const RpCheckerRuleService = require('../../services/master/rpCheckerRule.service');

async function index(req, res, next) {
  try {
    const result = await RpCheckerRuleService.getRpCheckerRules(req.query);

    return R.paginated(res, result.rows, result.meta, 'RP checker rules retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const rule = await RpCheckerRuleService.getRpCheckerRuleById(req.params.id);

    return R.ok(res, rule, 'RP checker rule retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const rule = await RpCheckerRuleService.createRpCheckerRule(req.body, req);

    return R.created(res, rule, 'RP checker rule created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const rule = await RpCheckerRuleService.updateRpCheckerRule(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, rule, 'RP checker rule updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const rule = await RpCheckerRuleService.updateRpCheckerRuleStatus(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, rule, 'RP checker rule status updated');
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