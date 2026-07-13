const currencyService = require('../services/master/currency.service');
const { db } = require('../models/master/currency.model');

function readArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));

  if (!arg) {
    return fallback;
  }

  return arg.slice(prefix.length);
}

async function main() {
  const date = readArg('date', null);
  const lookbackDays = readArg('lookback-days', 7);
  const currenciesArg = readArg('currencies', null);
  const currencies = currenciesArg
    ? currenciesArg.split(',').map((item) => item.trim()).filter(Boolean)
    : null;

  const result = await currencyService.syncExchangeRatesFromBI({
    date,
    lookback_days: lookbackDays,
    currencies,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db && typeof db.end === 'function') {
      await db.end();
    }
  });
