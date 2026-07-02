const R = require('../../utils/response.util');
const FrpDocumentTypeService = require('../../services/master/frpDocumentType.service');

async function index(req, res, next) {
  try {
    const result = await FrpDocumentTypeService.getFrpDocumentTypes(req.query);

    return R.paginated(res, result.rows, result.meta, 'FRP document types retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const documentType = await FrpDocumentTypeService.getFrpDocumentTypeById(req.params.id);

    return R.ok(res, documentType, 'FRP document type retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const documentType = await FrpDocumentTypeService.createFrpDocumentType(req.body, req);

    return R.created(res, documentType, 'FRP document type created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const documentType = await FrpDocumentTypeService.updateFrpDocumentType(req.params.id, req.body, req);

    return R.ok(res, documentType, 'FRP document type updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const documentType = await FrpDocumentTypeService.updateFrpDocumentTypeStatus(req.params.id, req.body, req);

    return R.ok(res, documentType, 'FRP document type status updated');
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