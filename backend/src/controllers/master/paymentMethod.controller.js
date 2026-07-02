const R = require('../../utils/response.util');
const PaymentMethodService = require('../../services/master/paymentMethod.service');

async function index(req, res, next) {
  try {
    const result = await PaymentMethodService.getPaymentMethods(req.query);

    return R.paginated(res, result.rows, result.meta, 'Payment methods retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const paymentMethod = await PaymentMethodService.getPaymentMethodById(req.params.id);

    return R.ok(res, paymentMethod, 'Payment method retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const paymentMethod = await PaymentMethodService.createPaymentMethod(req.body, req);

    return R.created(res, paymentMethod, 'Payment method created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const paymentMethod = await PaymentMethodService.updatePaymentMethod(req.params.id, req.body, req);

    return R.ok(res, paymentMethod, 'Payment method updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const paymentMethod = await PaymentMethodService.updatePaymentMethodStatus(req.params.id, req.body, req);

    return R.ok(res, paymentMethod, 'Payment method status updated');
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