const { resolveToken } = require('../services/auth.service');

const ORGANIZATION_CONTEXT_HEADER = 'X-Papertrail-Context';

function extractBearerToken(req) {
  const header = req.headers['authorization'] || '';

  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim() || null;
}

async function authenticate(req, res, next) {
  try {
    res.vary(ORGANIZATION_CONTEXT_HEADER);
    const bearerToken = extractBearerToken(req);
    const { token, decoded, user } = await resolveToken(bearerToken, req.get(ORGANIZATION_CONTEXT_HEADER));

    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Tidak terautentikasi: sesi telah berakhir, silakan login kembali.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Tidak terautentikasi: token tidak valid.',
        code: 'TOKEN_INVALID',
      });
    }

    if (err.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: err.message,
        code: err.code || 'UNAUTHORIZED',
      });
    }

    if (err.code === 'INVALID_ORGANIZATION_CONTEXT') {
      return res.status(err.statusCode).json({ success: false, message: err.message, code: err.code });
    }

    console.error('[auth.middleware] unexpected error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}

function requireApp(appName) {
  return (req, res, next) => {
    const apps = req.user?.apps || [];

    if (!apps.includes(appName)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak: Anda tidak diizinkan mengakses ${appName}.`,
        code: 'APP_FORBIDDEN',
      });
    }

    return next();
  };
}

function requireJobLevel(minLevel) {
  return (req, res, next) => {
    const userLevel = req.user?.job_level_value ?? 0;

    if (Number(userLevel) < Number(minLevel)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: level jabatan tidak mencukupi.',
        code: 'JOB_LEVEL_FORBIDDEN',
      });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireApp,
  requireJobLevel,
};
