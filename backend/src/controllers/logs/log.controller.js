const R = require('../../utils/response.util');
const logService = require('../../services/logs/log.service');

async function activityLogs(req, res, next) {
  try {
    const result = await logService.listActivityLogs(req.query, req.user);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'Activity logs retrieved'
    );
  } catch (error) {
    next(error);
  }
}

async function budgetUsageLogs(req, res, next) {
  try {
    const result = await logService.listBudgetUsageLogs(req.query, req.user);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'Budget usage logs retrieved'
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  activityLogs,
  budgetUsageLogs,
};
