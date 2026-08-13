const currencyService = require('../../services/master/currency.service');
const R = require('../../utils/response.util');

function getCronToken() {
  return process.env.CURRENCY_SYNC_CRON_TOKEN || process.env.INTERNAL_CRON_TOKEN || '';
}

function assertInternalToken(req) {
  const expectedToken = getCronToken();
  const receivedToken = req.headers['x-internal-token'] || req.headers['x-cron-token'] || '';

  if (!expectedToken) {
    const error = new Error('Currency sync cron token is not configured');
    error.statusCode = 503;
    throw error;
  }

  if (String(receivedToken) !== String(expectedToken)) {
    const error = new Error('Invalid internal token');
    error.statusCode = 401;
    throw error;
  }
}

async function syncExchangeRates(req, res, next) {
  try {
    assertInternalToken(req);

    const data = await currencyService.syncExchangeRatesFromBI({
      date: req.body?.date || req.query.date || null,
      lookback_days: req.body?.lookback_days || req.query.lookback_days || 7,
      currency_code: req.body?.currency_code || req.query.currency_code || null,
      currencies: req.body?.currencies || null,
    });

    return R.ok(res, data, 'Exchange rates synced successfully');
  } catch (error) {
    if (error.statusCode === 401) {
      return R.unauthorized(res, error.message);
    }

    if (error.statusCode === 503) {
      return R.error(res, error.message, 503);
    }

    return next(error);
  }
}

module.exports = {
  syncExchangeRates,
};
