const R = require('../../utils/response.util');
const frpService = require('../../services/frp/frp.service');

async function list(req, res, next) {
  try {
    const result = await frpService.listFrp(req.query, req.user);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'FRP requests retrieved'
    );
  } catch (error) {
    next(error);
  }
}

async function detail(req, res, next) {
  try {
    const result = await frpService.getFrpDetail(req.params.id, req.user);

    if (!result) {
      return R.notFound(res, 'FRP request not found');
    }

    return R.ok(res, result, 'FRP request retrieved');
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await frpService.createFrp(req.body, req.user, req);

    return R.created(res, result, 'FRP request created');
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await frpService.updateFrp(
      req.params.id,
      req.body,
      req.user,
      req
    );

    return R.ok(res, result, 'FRP request updated');
  } catch (error) {
    next(error);
  }
}

async function approve(req, res, next) {
  try {
    const result = await frpService.approveFrp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'FRP request approved');
  } catch (error) {
    next(error);
  }
}

async function reject(req, res, next) {
  try {
    const result = await frpService.rejectFrp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'FRP request rejected');
  } catch (error) {
    next(error);
  }
}

async function revert(req, res, next) {
  try {
    const result = await frpService.revertFrp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'FRP request reverted');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  detail,
  create,
  update,
  approve,
  reject,
  revert,
};