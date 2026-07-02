const R = require('../../utils/response.util');
const VendorBankAccountService = require('../../services/master/vendorBankAccount.service');

async function index(req, res, next) {
  try {
    const result = await VendorBankAccountService.getVendorBankAccounts(req.query);

    return R.paginated(res, result.rows, result.meta, 'Vendor bank accounts retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const account = await VendorBankAccountService.getVendorBankAccountById(req.params.id);

    return R.ok(res, account, 'Vendor bank account retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const account = await VendorBankAccountService.createVendorBankAccount(req.body, req);

    return R.created(res, account, 'Vendor bank account created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const account = await VendorBankAccountService.updateVendorBankAccount(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, account, 'Vendor bank account updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const account = await VendorBankAccountService.updateVendorBankAccountStatus(
      req.params.id,
      req.body,
      req
    );

    return R.ok(res, account, 'Vendor bank account status updated');
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