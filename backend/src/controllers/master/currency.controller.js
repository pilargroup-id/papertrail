const currencyService = require('../../services/master/currency.service');
const response = require('../../utils/response.util');

async function index(req, res) {
  try {
    const data = await currencyService.listCurrencies(req.query);

    return response.ok(res, data, 'Currencies retrieved successfully');
  } catch (error) {
    return response.badRequest(res, error.message);
  }
}

async function getLatestExchangeRate(req, res) {
  try {
    const data = await currencyService.getLatestExchangeRate(
      req.query.currency_code,
      {
        maxDate: req.query.max_date || req.query.date || null,
      }
    );

    return response.ok(res, data, 'Latest exchange rate retrieved successfully');
  } catch (error) {
    return response.badRequest(res, error.message);
  }
}

async function createManualExchangeRate(req, res) {
  try {
    const data = await currencyService.createManualExchangeRate(req.body, req.user);

    return response.created(res, data, 'Exchange rate created successfully');
  } catch (error) {
    return response.badRequest(res, error.message);
  }
}

async function syncExchangeRates(req, res) {
  try {
    const data = await currencyService.syncExchangeRatesFromBI({
      date: req.body.date || req.query.date || null,
      lookback_days: req.body.lookback_days || req.query.lookback_days || 7,
      currency_code: req.body.currency_code || req.query.currency_code || null,
      currencies: req.body.currencies || null,
    });

    return response.ok(res, data, 'Exchange rates synced successfully');
  } catch (error) {
    return response.badRequest(res, error.message);
  }
}

module.exports = {
  index,
  listCurrencies: index,

  getLatestExchangeRate,
  latestRate: getLatestExchangeRate,

  createManualExchangeRate,
  createRate: createManualExchangeRate,

  syncExchangeRates,
  syncRates: syncExchangeRates,
};
