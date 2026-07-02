const R = require('../../utils/response.util');
const ExternalDocumentTypeService = require('../../services/master/externalDocumentType.service');

async function index(req, res, next) {
  try {
    const result = await ExternalDocumentTypeService.getExternalDocumentTypes(req.query);

    return R.paginated(res, result.rows, result.meta, 'External document types retrieved');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const documentType = await ExternalDocumentTypeService.getExternalDocumentTypeById(req.params.id);

    return R.ok(res, documentType, 'External document type retrieved');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const documentType = await ExternalDocumentTypeService.createExternalDocumentType(req.body, req);

    return R.created(res, documentType, 'External document type created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const documentType = await ExternalDocumentTypeService.updateExternalDocumentType(req.params.id, req.body, req);

    return R.ok(res, documentType, 'External document type updated');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const documentType = await ExternalDocumentTypeService.updateExternalDocumentTypeStatus(req.params.id, req.body, req);

    return R.ok(res, documentType, 'External document type status updated');
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