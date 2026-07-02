const R = require('../../utils/response.util');
const BankService = require('../../services/master/bank.service');

async function index(req, res, next) {
  try {
    const result = await BankService.getBanks(req.query);

    return R.paginated(res, result.rows, result.meta, 'Banks retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const bank = await BankService.getBankById(req.params.id);

    return R.ok(res, bank, 'Bank retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const bank = await BankService.createBank(req.body, req);

    return R.created(res, bank, 'Bank created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const bank = await BankService.updateBank(req.params.id, req.body, req);

    return R.ok(res, bank, 'Bank updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const bank = await BankService.updateBankStatus(req.params.id, req.body, req);

    return R.ok(res, bank, 'Bank status updated');
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