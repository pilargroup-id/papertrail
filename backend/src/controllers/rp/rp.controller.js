const R = require('../../utils/response.util');
const rpService = require('../../services/rp/rp.service');

async function list(req, res, next) {
  try {
    const result = await rpService.listRp(req.query, req.user);

    return R.paginated(
      res,
      result.data,
      result.meta,
      'RP requests retrieved'
    );
  } catch (error) {
    next(error);
  }
}

async function detail(req, res, next) {
  try {
    const result = await rpService.getRpDetail(req.params.id, req.user);

    if (!result) {
      return R.notFound(res, 'RP request not found');
    }

    return R.ok(res, result, 'RP request retrieved');
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await rpService.createRp(req.body, req.user, req);

    return R.created(res, result, 'RP request created');
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await rpService.updateRp(
      req.params.id,
      req.body,
      req.user,
      req
    );

    return R.ok(res, result, 'RP request updated');
  } catch (error) {
    next(error);
  }
}

async function requesterManagerApprove(req, res, next) {
  try {
    const result = await rpService.requesterManagerApproveRp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'RP request approved by requester manager');
  } catch (error) {
    next(error);
  }
}

async function requesterManagerReject(req, res, next) {
  try {
    const result = await rpService.requesterManagerRejectRp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'RP request rejected by requester manager');
  } catch (error) {
    next(error);
  }
}

async function destinationCheck(req, res, next) {
  try {
    const result = await rpService.destinationCheckRp(
      req.params.id,
      req.body,
      req.user,
      req
    );

    return R.ok(res, result, 'RP request checked by destination checker');
  } catch (error) {
    next(error);
  }
}

async function destinationCheckerReject(req, res, next) {
  try {
    const result = await rpService.destinationCheckerRejectRp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'RP request rejected by destination checker');
  } catch (error) {
    next(error);
  }
}

async function destinationManagerApprove(req, res, next) {
  try {
    const result = await rpService.destinationManagerApproveRp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'RP request approved by destination manager');
  } catch (error) {
    next(error);
  }
}

async function destinationManagerReject(req, res, next) {
  try {
    const result = await rpService.destinationManagerRejectRp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'RP request rejected by destination manager');
  } catch (error) {
    next(error);
  }
}

async function revert(req, res, next) {
  try {
    const result = await rpService.revertRp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'RP request reverted');
  } catch (error) {
    next(error);
  }
}


async function createFrp(req, res, next) {
  try {
    const result = await rpService.createFrpFromRp(
      req.params.id,
      req.body,
      req.user,
      req
    );

    return R.created(res, result, 'FRP created from RP');
  } catch (error) {
    next(error);
  }
}

async function procurementVoid(req, res, next) {
  try {
    const result = await rpService.procurementVoidRp(
      req.params.id,
      req.user,
      req.body,
      req
    );

    return R.ok(res, result, 'RP procurement voided');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  detail,
  create,
  update,
  requesterManagerApprove,
  requesterManagerReject,
  destinationCheck,
  destinationCheckerReject,
  destinationManagerApprove,
  destinationManagerReject,
  revert,
  createFrp,
  procurementVoid,
};
