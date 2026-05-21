const { COMPANY_MAP, COMPANY_CODE_BY_NAME } = require('../config/constants');

/**
 * Normalizes input (code or name) to a company code (e.g. 'PNM', 'PKS', 'PKP').
 */
function normalizeCompanyCode(input) {
    const value = (input || '').trim();
    if (!value) return 'PNM';
    const upper = value.toUpperCase().replace(/\s+/g, ' ');
    if (COMPANY_MAP[upper]) return upper;
    if (COMPANY_CODE_BY_NAME[upper]) return COMPANY_CODE_BY_NAME[upper];
    if (upper.includes('KARANG') || upper.includes('SAMUD')) return 'PKS';
    if (upper.includes('KARGO')) return 'PKP';
    if (upper.includes('NIAGA')) return 'PNM';
    return upper;
}

/**
 * Returns the full company name, given a code or fallback name.
 */
function normalizeCompanyName(code, name) {
    const normalizedCode = normalizeCompanyCode(code || name);
    return COMPANY_MAP[normalizedCode] || (name ? String(name).trim() : COMPANY_MAP.PNM);
}

/**
 * Returns true if two company names refer to the same company (fuzzy match).
 */
function sameCompanyName(a, b) {
    if (!a || !b) return true;
    return normalizeCompanyName(null, a).toUpperCase() === normalizeCompanyName(null, b).toUpperCase();
}

module.exports = { normalizeCompanyCode, normalizeCompanyName, sameCompanyName };
