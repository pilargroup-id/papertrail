const { db } = require('../../config/database.config');

function normalizeCurrencyCode(code) {
  return String(code || '').trim().toUpperCase();
}

async function listCurrencies(conn, query = {}) {
  const where = [];
  const params = [];

  if (query.active !== undefined) {
    where.push('is_active = ?');
    params.push(Number(query.active));
  } else {
    where.push('is_active = 1');
  }

  if (query.search) {
    where.push('(code LIKE ? OR name LIKE ?)');
    const keyword = `%${query.search}%`;
    params.push(keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await conn.query(
    `
      SELECT
        id,
        code,
        name,
        symbol,
        is_base_currency,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM master_currencies
      ${whereSql}
      ORDER BY sort_order ASC, code ASC
    `,
    params
  );

  return rows;
}

async function getCurrencyByCode(conn, code) {
  const currencyCode = normalizeCurrencyCode(code);

  const [rows] = await conn.query(
    `
      SELECT
        id,
        code,
        name,
        symbol,
        is_base_currency,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM master_currencies
      WHERE code = ?
      LIMIT 1
    `,
    [currencyCode]
  );

  return rows[0] || null;
}

async function getActiveForeignCurrencies(conn) {
  const [rows] = await conn.query(
    `
      SELECT
        id,
        code,
        name,
        symbol,
        is_base_currency,
        is_active,
        sort_order
      FROM master_currencies
      WHERE is_active = 1
        AND code <> 'IDR'
      ORDER BY sort_order ASC, code ASC
    `
  );

  return rows;
}

async function getLatestExchangeRate(conn, currencyCode, options = {}) {
  const code = normalizeCurrencyCode(currencyCode);
  const baseCurrencyCode = normalizeCurrencyCode(options.baseCurrencyCode || 'IDR');
  const maxDate = options.maxDate || null;

  const params = [code, baseCurrencyCode];
  let maxDateSql = '';

  if (maxDate) {
    maxDateSql = 'AND rate_date <= ?';
    params.push(maxDate);
  }

  const [rows] = await conn.query(
    `
      SELECT
        id,
        currency_code,
        base_currency_code,
        rate_date,
        rate_type,
        buy_rate,
        sell_rate,
        middle_rate,
        source_name,
        source_url,
        fetched_at,
        is_active,
        created_at,
        updated_at
      FROM currency_exchange_rates
      WHERE currency_code = ?
        AND base_currency_code = ?
        AND is_active = 1
        ${maxDateSql}
      ORDER BY rate_date DESC, id DESC
      LIMIT 1
    `,
    params
  );

  return rows[0] || null;
}

async function upsertExchangeRate(conn, data = {}) {
  const currencyCode = normalizeCurrencyCode(data.currency_code);
  const baseCurrencyCode = normalizeCurrencyCode(data.base_currency_code || 'IDR');

  await conn.query(
    `
      INSERT INTO currency_exchange_rates (
        currency_code,
        base_currency_code,
        rate_date,
        rate_type,
        buy_rate,
        sell_rate,
        middle_rate,
        source_name,
        source_url,
        fetched_at,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        buy_rate = VALUES(buy_rate),
        sell_rate = VALUES(sell_rate),
        middle_rate = VALUES(middle_rate),
        source_name = VALUES(source_name),
        source_url = VALUES(source_url),
        fetched_at = VALUES(fetched_at),
        is_active = 1,
        updated_at = NOW()
    `,
    [
      currencyCode,
      baseCurrencyCode,
      data.rate_date,
      data.rate_type || 'BI_TRANSACTION',
      data.buy_rate ?? null,
      data.sell_rate ?? null,
      data.middle_rate,
      data.source_name || null,
      data.source_url || null,
      data.fetched_at || null,
    ]
  );

  return getLatestExchangeRate(conn, currencyCode, {
    baseCurrencyCode,
    maxDate: data.rate_date,
  });
}

module.exports = {
  db,
  listCurrencies,
  getCurrencyByCode,
  getActiveForeignCurrencies,
  getLatestExchangeRate,
  upsertExchangeRate,
};
