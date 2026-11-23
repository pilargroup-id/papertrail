/**
 * Standardize the response format across the entire project.
 *
 * Success   : { success: true,  data: ..., message: ... }
 * Error     : { success: false, message: ..., errors: ... }
 * Paginated : { success: true,  data: [...], meta: { page, limit, total, totalPages } }
 */

function ok(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function created(res, data = null, message = 'Created') {
  return ok(res, data, message, 201);
}

function paginated(res, data = [], meta = {}, message = 'OK') {
  return res.status(200).json({
    success : true,
    message,
    data,
    meta: {
      page       : meta.page       ?? 1,
      limit      : meta.limit      ?? data.length,
      total      : meta.total      ?? data.length,
      totalPages : meta.totalPages ?? 1,
    },
  });
}

function error(res, message = 'Terjadi kesalahan pada server.', statusCode = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

function badRequest(res, message = 'Permintaan tidak valid.', errors = null) {
  return error(res, message, 400, errors);
}

function unauthorized(res, message = 'Tidak terautentikasi.') {
  return error(res, message, 401);
}

function forbidden(res, message = 'Akses ditolak.') {
  return error(res, message, 403);
}

function notFound(res, message = 'Data tidak ditemukan.') {
  return error(res, message, 404);
}

module.exports = { ok, created, paginated, error, badRequest, unauthorized, forbidden, notFound };