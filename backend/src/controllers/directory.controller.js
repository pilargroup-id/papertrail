const { fetchDirectoryResource } = require('../services/directory.service');

async function listResource(req, res, next) {
  try {
    const response = await fetchDirectoryResource(req.params.resource, {
      token: req.token,
      params: req.query,
    });

    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.payload) {
      return res.status(err.statusCode || 500).json(err.payload);
    }

    return next(err);
  }
}

module.exports = {
  listResource,
};
