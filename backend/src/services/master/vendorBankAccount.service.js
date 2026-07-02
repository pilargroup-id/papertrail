const { db } = require('../../config/database.config');
const VendorBankAccountModel = require('../../models/master/vendorBankAccount.model');
const ActivityLogService = require('../activity/activityLog.service');

function createHttpError(message, statusCode = 500, errors = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (errors) err.errors = errors;
  return err;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeBooleanFlag(value, fieldName, errors, defaultValue = 0) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = Number(value);

  if (![0, 1].includes(normalized)) {
    errors[fieldName] = `${fieldName} must be 0 or 1`;
  }

  return normalized;
}

function validatePayload(payload = {}) {
  const errors = {};

  const vendorId = Number(payload.vendor_id);
  const bankId = Number(payload.bank_id);
  const accountNumber = normalizeString(payload.account_number);
  const accountName = normalizeString(payload.account_name);
  const isPrimary = normalizeBooleanFlag(payload.is_primary, 'is_primary', errors, 0);

  if (!Number.isInteger(vendorId) || vendorId <= 0) {
    errors.vendor_id = 'vendor_id is required and must be a positive integer';
  }

  if (!Number.isInteger(bankId) || bankId <= 0) {
    errors.bank_id = 'bank_id is required and must be a positive integer';
  }

  if (!accountNumber) {
    errors.account_number = 'account_number is required';
  }

  if (accountNumber.length > 100) {
    errors.account_number = 'account_number maximum length is 100 characters';
  }

  if (accountName && accountName.length > 255) {
    errors.account_name = 'account_name maximum length is 255 characters';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Validation error', 400, errors);
  }

  return {
    vendor_id: vendorId,
    bank_id: bankId,
    account_number: accountNumber,
    account_name: accountName || null,
    is_primary: isPrimary,
  };
}

function validateStatusPayload(payload = {}) {
  const errors = {};

  if (payload.is_active === undefined || payload.is_active === null || payload.is_active === '') {
    errors.is_active = 'is_active is required';
  }

  const isActive = Number(payload.is_active);

  if (![0, 1].includes(isActive)) {
    errors.is_active = 'is_active must be 0 or 1';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Validation error', 400, errors);
  }

  return { is_active: isActive };
}

async function ensureVendorActive(vendorId, connection) {
  const vendor = await VendorBankAccountModel.findVendorById(vendorId, connection);

  if (!vendor) {
    throw createHttpError('Vendor not found', 404, {
      vendor_id: 'Vendor not found',
    });
  }

  if (Number(vendor.is_active) !== 1) {
    throw createHttpError('Vendor is inactive', 400, {
      vendor_id: 'Vendor is inactive',
    });
  }

  return vendor;
}

async function ensureBankActive(bankId, connection) {
  const bank = await VendorBankAccountModel.findBankById(bankId, connection);

  if (!bank) {
    throw createHttpError('Bank not found', 404, {
      bank_id: 'Bank not found',
    });
  }

  if (Number(bank.is_active) !== 1) {
    throw createHttpError('Bank is inactive', 400, {
      bank_id: 'Bank is inactive',
    });
  }

  return bank;
}

async function ensureUniqueAccount(data, ignoredId = null, connection) {
  const duplicate = await VendorBankAccountModel.findDuplicate(
    data.vendor_id,
    data.bank_id,
    data.account_number,
    connection
  );

  if (!duplicate) {
    return;
  }

  if (ignoredId && Number(duplicate.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('Vendor bank account already exists', 400, {
    account_number: 'Vendor already has this bank account',
  });
}

async function getVendorBankAccounts(query = {}) {
  return VendorBankAccountModel.findAll(query);
}

async function getVendorBankAccountById(id) {
  const account = await VendorBankAccountModel.findById(id);

  if (!account) {
    throw createHttpError('Vendor bank account not found', 404);
  }

  return account;
}

async function createVendorBankAccount(payload, req) {
  const data = validatePayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await ensureVendorActive(data.vendor_id, connection);
    await ensureBankActive(data.bank_id, connection);
    await ensureUniqueAccount(data, null, connection);

    if (data.is_primary === 1) {
      await VendorBankAccountModel.clearPrimaryByVendor(data.vendor_id, null, connection);
    }

    const account = await VendorBankAccountModel.create(
      {
        ...data,
        is_active: 1,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_vendor_bank_accounts',
      entityId: account.id,
      action: 'CREATE',
      description: `Create vendor bank account ${account.vendor_name} - ${account.bank_code} ${account.account_number}`,
      oldValues: null,
      newValues: account,
    });

    await connection.commit();

    return account;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateVendorBankAccount(id, payload, req) {
  const data = validatePayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldAccount = await VendorBankAccountModel.findById(id, connection);

    if (!oldAccount) {
      throw createHttpError('Vendor bank account not found', 404);
    }

    await ensureVendorActive(data.vendor_id, connection);
    await ensureBankActive(data.bank_id, connection);
    await ensureUniqueAccount(data, id, connection);

    if (data.is_primary === 1) {
      await VendorBankAccountModel.clearPrimaryByVendor(data.vendor_id, id, connection);
    }

    const updatedAccount = await VendorBankAccountModel.update(id, data, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_vendor_bank_accounts',
      entityId: id,
      action: 'UPDATE',
      description: `Update vendor bank account ${updatedAccount.vendor_name} - ${updatedAccount.bank_code} ${updatedAccount.account_number}`,
      oldValues: oldAccount,
      newValues: updatedAccount,
    });

    await connection.commit();

    return updatedAccount;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateVendorBankAccountStatus(id, payload, req) {
  const data = validateStatusPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldAccount = await VendorBankAccountModel.findById(id, connection);

    if (!oldAccount) {
      throw createHttpError('Vendor bank account not found', 404);
    }

    const updatedAccount = await VendorBankAccountModel.updateStatus(id, data.is_active, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_vendor_bank_accounts',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate vendor bank account ${updatedAccount.vendor_name} - ${updatedAccount.bank_code} ${updatedAccount.account_number}`
          : `Deactivate vendor bank account ${updatedAccount.vendor_name} - ${updatedAccount.bank_code} ${updatedAccount.account_number}`,
      oldValues: oldAccount,
      newValues: updatedAccount,
    });

    await connection.commit();

    return updatedAccount;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getVendorBankAccounts,
  getVendorBankAccountById,
  createVendorBankAccount,
  updateVendorBankAccount,
  updateVendorBankAccountStatus,
};