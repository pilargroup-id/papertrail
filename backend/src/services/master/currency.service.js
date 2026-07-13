const currencyModel = require('../../models/master/currency.model');

const BI_SOURCE_NAME = 'Bank Indonesia Kurs Transaksi';
const BI_SOURCE_URL = 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursLokal3';

function normalizeCurrencyCode(code) {
  return String(code || '').trim().toUpperCase();
}

function assertRequired(value, message) {
  if (value === undefined || value === null || value === '') {
    throw new Error(message);
  }
}

function formatDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function htmlDecode(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseDecimal(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  let text = htmlDecode(value).trim();

  if (!text) {
    return null;
  }

  text = text.replace(/\s/g, '');

  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else {
    text = text.replace(/,/g, '');
  }

  const number = Number(text);

  if (Number.isNaN(number)) {
    return null;
  }

  return number;
}

function normalizeBiDate(value, fallbackDate) {
  const text = htmlDecode(value || '').trim();

  if (!text) {
    return fallbackDate;
  }

  // BI format: 2021-01-11T00:00:00+07:00
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dmyMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${String(dmyMatch[2]).padStart(2, '0')}-${String(dmyMatch[1]).padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDate(parsed);
  }

  return fallbackDate;
}

/**
 * Extract a tag's inner text from an XML fragment.
 * Tag name boundary is anchored with (?=[\s/>]) on BOTH the opening
 * and closing side so "beli" cannot accidentally match inside
 * "beli_subkurslokal" (or vice versa) — previous version only
 * anchored loosely on open and strictly on close, which silently
 * broke every lookup when BI's real field names didn't match the
 * guessed short names.
 */
function getTagValue(block, names = []) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `<(?:\\w+:)?${escaped}(?=[\\s/>])[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${escaped}(?=[\\s>])>`,
      'i'
    );
    const match = block.match(pattern);

    if (match && match[1] !== undefined) {
      return htmlDecode(match[1]);
    }
  }

  return null;
}

function extractRowBlocks(xml) {
  const rowBlocks = [];
  const patterns = [
    /<Table\d*[^>]*>[\s\S]*?<\/Table\d*>/gi,
    /<Kurs\d*[^>]*>[\s\S]*?<\/Kurs\d*>/gi,
    /<Data\d*[^>]*>[\s\S]*?<\/Data\d*>/gi,
  ];

  patterns.forEach((pattern) => {
    const matches = xml.match(pattern) || [];
    matches.forEach((match) => rowBlocks.push(match));
  });

  return rowBlocks;
}

function parseBiKursXml(xml, requestedCurrencyCode, fallbackDate) {
  const currencyCode = normalizeCurrencyCode(requestedCurrencyCode);
  const rowBlocks = extractRowBlocks(xml);
  const rows = [];

  rowBlocks.forEach((block) => {
    const code = normalizeCurrencyCode(
      getTagValue(block, [
        'mts_subkurslokal', // real BI field (getSubKursLokal3 / getSubKursLokal2)
        'mts',
        'MTS',
        'kode_mata_uang',
        'KodeMataUang',
        'kode',
        'Kode',
        'currency_code',
      ]) || currencyCode
    );

    if (code && code !== currencyCode) {
      return;
    }

    // "nil_subkurslokal" = kelipatan/unit kuotasi (mis. 1, atau 100 utk JPY/KRW dsb)
    const unit = parseDecimal(
      getTagValue(block, ['nil_subkurslokal', 'nilai', 'Nilai', 'satuan', 'Satuan'])
    ) || 1;

    const buyRateRaw = parseDecimal(
      getTagValue(block, ['beli_subkurslokal', 'kurs_beli', 'KursBeli', 'beli', 'Beli', 'buy_rate'])
    );

    const sellRateRaw = parseDecimal(
      getTagValue(block, ['jual_subkurslokal', 'kurs_jual', 'KursJual', 'jual', 'Jual', 'sell_rate'])
    );

    // getSubKursLokal3 tidak punya field kurs tengah eksplisit -> tetap null,
    // di-fallback ke rata-rata beli/jual di bawah.
    const middleRateRaw = parseDecimal(
      getTagValue(block, ['kurs_tengah', 'KursTengah', 'tengah', 'Tengah', 'middle_rate'])
    );

    const buyRate = buyRateRaw !== null ? buyRateRaw / unit : null;
    const sellRate = sellRateRaw !== null ? sellRateRaw / unit : null;
    const middleRate = middleRateRaw !== null
      ? middleRateRaw / unit
      : buyRate !== null && sellRate !== null
        ? (buyRate + sellRate) / 2
        : null;

    if (middleRate === null || middleRate <= 0) {
      return;
    }

    rows.push({
      currency_code: currencyCode,
      base_currency_code: 'IDR',
      rate_date: normalizeBiDate(
        getTagValue(block, ['tgl_subkurslokal', 'tanggal', 'Tanggal', 'tgl', 'Tgl', 'date', 'Date']),
        fallbackDate
      ),
      rate_type: 'BI_TRANSACTION',
      buy_rate: buyRate,
      sell_rate: sellRate,
      middle_rate: middleRate,
      source_name: BI_SOURCE_NAME,
      source_url: BI_SOURCE_URL,
      fetched_at: new Date(),
    });
  });

  rows.sort((a, b) => String(a.rate_date).localeCompare(String(b.rate_date)));

  return rows;
}

async function fetchBiTransactionRate(currencyCode, startDate, endDate) {
  const code = normalizeCurrencyCode(currencyCode);
  const url = new URL(BI_SOURCE_URL);

  url.searchParams.set('mts', code);
  url.searchParams.set('startdate', startDate);
  url.searchParams.set('enddate', endDate);

  const result = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'text/xml, application/xml, */*',
    },
  });

  if (!result.ok) {
    throw new Error(`Bank Indonesia returned HTTP ${result.status}`);
  }

  const xml = await result.text();
  const rows = parseBiKursXml(xml, code, endDate);

  if (!rows.length) {
    throw new Error(`Bank Indonesia rate not found for ${code} between ${startDate} and ${endDate}`);
  }

  return rows[rows.length - 1];
}

async function listCurrencies(query = {}) {
  const conn = await currencyModel.db.getConnection();

  try {
    return await currencyModel.listCurrencies(conn, query);
  } finally {
    conn.release();
  }
}

async function getLatestExchangeRate(currencyCode, options = {}) {
  assertRequired(currencyCode, 'Currency code is required');

  const conn = await currencyModel.db.getConnection();

  try {
    const code = normalizeCurrencyCode(currencyCode);

    if (code === 'IDR') {
      return {
        currency_code: 'IDR',
        base_currency_code: 'IDR',
        rate_date: options.maxDate || formatDate(new Date()),
        rate_type: 'SYSTEM',
        buy_rate: 1,
        sell_rate: 1,
        middle_rate: 1,
        source_name: 'SYSTEM',
        source_url: null,
      };
    }

    const currency = await currencyModel.getCurrencyByCode(conn, code);

    if (!currency || Number(currency.is_active) !== 1) {
      throw new Error('Currency is not active or not found');
    }

    const rate = await currencyModel.getLatestExchangeRate(conn, code, options);

    if (!rate) {
      throw new Error(`Exchange rate for ${code} is not found`);
    }

    return rate;
  } finally {
    conn.release();
  }
}

async function resolveCurrencyRateSnapshot(conn, currencyCode = 'IDR', maxDate = null) {
  const code = normalizeCurrencyCode(currencyCode || 'IDR');
  const currency = await currencyModel.getCurrencyByCode(conn, code);

  if (!currency || Number(currency.is_active) !== 1) {
    throw new Error('Currency is not active or not found');
  }

  if (code === 'IDR') {
    return {
      currency_code: 'IDR',
      currency_id: currency.id,
      exchange_rate: 1,
      exchange_rate_date: maxDate || formatDate(new Date()),
      exchange_rate_type: 'SYSTEM',
      exchange_rate_source: 'SYSTEM',
    };
  }

  const rate = await currencyModel.getLatestExchangeRate(conn, code, {
    maxDate,
  });

  if (!rate) {
    throw new Error(`Exchange rate for ${code} is not found`);
  }

  return {
    currency_code: code,
    currency_id: currency.id,
    exchange_rate: rate.middle_rate,
    exchange_rate_date: rate.rate_date,
    exchange_rate_type: rate.rate_type,
    exchange_rate_source: rate.source_name,
  };
}

async function createManualExchangeRate(body = {}, user = {}) {
  assertRequired(body.currency_code, 'Currency code is required');
  assertRequired(body.rate_date, 'Rate date is required');
  assertRequired(body.middle_rate, 'Middle rate is required');

  const conn = await currencyModel.db.getConnection();

  try {
    const code = normalizeCurrencyCode(body.currency_code);
    const currency = await currencyModel.getCurrencyByCode(conn, code);

    if (!currency || Number(currency.is_active) !== 1) {
      throw new Error('Currency is not active or not found');
    }

    const rate = await currencyModel.upsertExchangeRate(conn, {
      currency_code: code,
      base_currency_code: 'IDR',
      rate_date: body.rate_date,
      rate_type: 'MANUAL',
      buy_rate: body.buy_rate ?? null,
      sell_rate: body.sell_rate ?? null,
      middle_rate: body.middle_rate,
      source_name: body.source_name || `Manual input by ${user.name || 'user'}`,
      source_url: body.source_url || null,
      fetched_at: new Date(),
    });

    return rate;
  } finally {
    conn.release();
  }
}

async function syncExchangeRatesFromBI(options = {}) {
  const conn = await currencyModel.db.getConnection();

  try {
    const endDate = formatDate(options.date || new Date());
    const lookbackDays = Number(options.lookback_days || options.lookbackDays || 7);
    const startDate = formatDate(addDays(endDate, -Math.max(lookbackDays, 0)));

    let currencies = [];

    if (Array.isArray(options.currencies) && options.currencies.length) {
      currencies = options.currencies.map((code) => ({ code: normalizeCurrencyCode(code) }));
    } else if (options.currency_code) {
      currencies = [{ code: normalizeCurrencyCode(options.currency_code) }];
    } else {
      currencies = await currencyModel.getActiveForeignCurrencies(conn);
    }

    const results = [];

    for (const currency of currencies) {
      const code = normalizeCurrencyCode(currency.code);

      if (!code || code === 'IDR') {
        continue;
      }

      try {
        const fetchedRate = await fetchBiTransactionRate(code, startDate, endDate);
        const savedRate = await currencyModel.upsertExchangeRate(conn, fetchedRate);

        results.push({
          currency_code: code,
          status: 'SUCCESS',
          rate_date: savedRate.rate_date,
          buy_rate: savedRate.buy_rate,
          sell_rate: savedRate.sell_rate,
          middle_rate: savedRate.middle_rate,
          source_name: savedRate.source_name,
        });
      } catch (error) {
        results.push({
          currency_code: code,
          status: 'FAILED',
          message: error.message,
        });
      }
    }

    return {
      source: BI_SOURCE_NAME,
      source_url: BI_SOURCE_URL,
      start_date: startDate,
      end_date: endDate,
      total: results.length,
      success: results.filter((item) => item.status === 'SUCCESS').length,
      failed: results.filter((item) => item.status === 'FAILED').length,
      results,
    };
  } finally {
    conn.release();
  }
}

module.exports = {
  listCurrencies,
  getLatestExchangeRate,
  resolveCurrencyRateSnapshot,
  createManualExchangeRate,
  syncExchangeRatesFromBI,
};
