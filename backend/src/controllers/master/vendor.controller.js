const R = require('../../utils/response.util');
const VendorService = require('../../services/master/vendor.service');

async function index(req, res, next) {
  try {
    const result = await VendorService.getVendors(req.query);

    return R.paginated(res, result.rows, result.meta, 'Vendors retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const vendor = await VendorService.getVendorById(req.params.id);

    return R.ok(res, vendor, 'Vendor retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const vendor = await VendorService.createVendor(req.body, req);

    return R.created(res, vendor, 'Vendor created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const vendor = await VendorService.updateVendor(req.params.id, req.body, req);

    return R.ok(res, vendor, 'Vendor updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const vendor = await VendorService.updateVendorStatus(req.params.id, req.body, req);

    return R.ok(res, vendor, 'Vendor status updated');
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