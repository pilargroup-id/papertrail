const { db } = require('../../config/database.config');

function buildListFilters(query = {}) {
  const where = [];
  const values = [];

  if (query.vendor_id) {
    where.push('vba.vendor_id = ?');
    values.push(Number(query.vendor_id));
  }

  if (query.bank_id) {
    where.push('vba.bank_id = ?');
    values.push(Number(query.bank_id));
  }

  if (query.is_active !== undefined && query.is_active !== '') {
    where.push('vba.is_active = ?');
    values.push(Number(query.is_active));
  }

  if (query.q) {
    where.push(`(
      v.name LIKE ?
      OR b.code LIKE ?
      OR b.name LIKE ?
      OR vba.account_number LIKE ?
      OR vba.account_name LIKE ?
    )`);
    values.push(
      `%${query.q}%`,
      `%${query.q}%`,
      `%${query.q}%`,
      `%${query.q}%`,
      `%${query.q}%`
    );
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values,
  };
}

async function findAll(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const { whereSql, values } = buildListFilters(query);

  const [rows] = await db.query(
    `SELECT
       vba.id,
       vba.vendor_id,
       v.name AS vendor_name,
       vba.bank_id,
       b.code AS bank_code,
       b.name AS bank_name,
       vba.account_number,
       vba.account_name,
       vba.is_primary,
       vba.is_active,
       vba.created_at,
       vba.updated_at
     FROM master_vendor_bank_accounts vba
     INNER JOIN master_vendors v ON v.id = vba.vendor_id
     INNER JOIN master_banks b ON b.id = vba.bank_id
     ${whereSql}
     ORDER BY v.name ASC, vba.is_primary DESC, b.name ASC, vba.account_number ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM master_vendor_bank_accounts vba
     INNER JOIN master_vendors v ON v.id = vba.vendor_id
     INNER JOIN master_banks b ON b.id = vba.bank_id
     ${whereSql}`,
    values
  );

  const total = Number(countRows[0]?.total || 0);

  return {
    rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function findById(id, connection = db) {
  const [rows] = await connection.query(
    `SELECT
       vba.id,
       vba.vendor_id,
       v.name AS vendor_name,
       vba.bank_id,
       b.code AS bank_code,
       b.name AS bank_name,
       vba.account_number,
       vba.account_name,
       vba.is_primary,
       vba.is_active,
       vba.created_at,
       vba.updated_at
     FROM master_vendor_bank_accounts vba
     INNER JOIN master_vendors v ON v.id = vba.vendor_id
     INNER JOIN master_banks b ON b.id = vba.bank_id
     WHERE vba.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findVendorById(id, connection = db) {
  const [rows] = await connection.query(
    `SELECT id, name, is_active
     FROM master_vendors
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findBankById(id, connection = db) {
  const [rows] = await connection.query(
    `SELECT id, code, name, is_active
     FROM master_banks
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findDuplicate(vendorId, bankId, accountNumber, connection = db) {
  const [rows] = await connection.query(
    `SELECT id
     FROM master_vendor_bank_accounts
     WHERE vendor_id = ?
       AND bank_id = ?
       AND account_number = ?
     LIMIT 1`,
    [vendorId, bankId, accountNumber]
  );

  return rows[0] || null;
}

async function clearPrimaryByVendor(vendorId, ignoredId = null, connection = db) {
  const values = [vendorId];

  let ignoredSql = '';

  if (ignoredId) {
    ignoredSql = 'AND id <> ?';
    values.push(ignoredId);
  }

  await connection.query(
    `UPDATE master_vendor_bank_accounts
     SET is_primary = 0
     WHERE vendor_id = ?
       ${ignoredSql}`,
    values
  );
}

async function create(data, connection = db) {
  const [result] = await connection.query(
    `INSERT INTO master_vendor_bank_accounts (
       vendor_id,
       bank_id,
       account_number,
       account_name,
       is_primary,
       is_active
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.vendor_id,
      data.bank_id,
      data.account_number,
      data.account_name || null,
      data.is_primary,
      data.is_active,
    ]
  );

  return findById(result.insertId, connection);
}

async function update(id, data, connection = db) {
  await connection.query(
    `UPDATE master_vendor_bank_accounts
     SET
       vendor_id = ?,
       bank_id = ?,
       account_number = ?,
       account_name = ?,
       is_primary = ?
     WHERE id = ?`,
    [
      data.vendor_id,
      data.bank_id,
      data.account_number,
      data.account_name || null,
      data.is_primary,
      id,
    ]
  );

  return findById(id, connection);
}

async function updateStatus(id, isActive, connection = db) {
  await connection.query(
    `UPDATE master_vendor_bank_accounts
     SET is_active = ?
     WHERE id = ?`,
    [Number(isActive), id]
  );

  return findById(id, connection);
}

module.exports = {
  findAll,
  findById,
  findVendorById,
  findBankById,
  findDuplicate,
  clearPrimaryByVendor,
  create,
  update,
  updateStatus,
};