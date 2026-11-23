const { db } = require('../../config/database.config');
const BudgetModel = require('../../models/master/budget.model');
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

function normalizeDecimal(value, fieldName, errors, defaultValue = 0) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    errors[fieldName] = `${fieldName} harus berupa angka yang valid.`;
    return defaultValue;
  }

  if (number < 0) {
    errors[fieldName] = `${fieldName} tidak boleh negatif.`;
    return defaultValue;
  }

  return number;
}

function normalizeNullableInteger(value, fieldName, errors) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    errors[fieldName] = `${fieldName} harus berupa bilangan bulat positif.`;
    return null;
  }

  return number;
}

function validatePayload(payload = {}) {
  const errors = {};

  const budgetCode = normalizeString(payload.budget_code);
  const companyId = normalizeString(payload.company_id);
  const companyCodeSnapshot = normalizeString(payload.company_code_snapshot);
  const companyNameSnapshot = normalizeString(payload.company_name_snapshot);

  const departmentId = Number(payload.department_id);
  const departmentNameSnapshot = normalizeString(payload.department_name_snapshot);
  const departmentClassSnapshot = normalizeString(payload.department_class_snapshot);
  const departmentCodeSnapshot = normalizeString(payload.department_code_snapshot);

  const classDepartmentId = Number(payload.class_department_id);
  const classNameSnapshot = normalizeString(payload.class_name_snapshot);
  const classClassSnapshot = normalizeString(payload.class_class_snapshot);
  const classCodeSnapshot = normalizeString(payload.class_code_snapshot);

  const budgetTypeId = normalizeNullableInteger(payload.budget_type_id, 'budget_type_id', errors);
  const projectName = normalizeString(payload.project_name);

  const budgetAmount = normalizeDecimal(payload.budget_amount, 'budget_amount', errors, 0);
  const budgetReserved = normalizeDecimal(payload.budget_reserved, 'budget_reserved', errors, 0);
  const budgetUsed = normalizeDecimal(payload.budget_used, 'budget_used', errors, 0);
  const budgetRemaining = normalizeDecimal(payload.budget_remaining, 'budget_remaining', errors, 0);

  const periodYear = normalizeNullableInteger(payload.period_year, 'period_year', errors);
  const periodMonth = normalizeNullableInteger(payload.period_month, 'period_month', errors);

  if (!budgetCode) {
    errors.budget_code = 'Kode anggaran wajib diisi.';
  }

  if (budgetCode.length > 50) {
    errors.budget_code = 'Kode anggaran maksimal 50 karakter.';
  }

  if (!companyId) {
    errors.company_id = 'Perusahaan wajib dipilih.';
  }

  if (companyId.length > 36) {
    errors.company_id = 'company_id maksimal 36 karakter.';
  }

  if (companyCodeSnapshot && companyCodeSnapshot.length > 10) {
    errors.company_code_snapshot = 'Kode perusahaan maksimal 10 karakter.';
  }

  if (companyNameSnapshot && companyNameSnapshot.length > 150) {
    errors.company_name_snapshot = 'Nama perusahaan maksimal 150 karakter.';
  }

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    errors.department_id = 'Departemen wajib dipilih.';
  }

  if (departmentNameSnapshot && departmentNameSnapshot.length > 100) {
    errors.department_name_snapshot = 'Nama departemen maksimal 100 karakter.';
  }

  if (departmentClassSnapshot && departmentClassSnapshot.length > 100) {
    errors.department_class_snapshot = 'Kelas departemen maksimal 100 karakter.';
  }

  if (departmentCodeSnapshot && departmentCodeSnapshot.length > 10) {
    errors.department_code_snapshot = 'Kode departemen maksimal 10 karakter.';
  }

  if (!Number.isInteger(classDepartmentId) || classDepartmentId <= 0) {
    errors.class_department_id = 'Kelas departemen wajib dipilih.';
  }

  if (classNameSnapshot && classNameSnapshot.length > 100) {
    errors.class_name_snapshot = 'Nama kelas maksimal 100 karakter.';
  }

  if (classClassSnapshot && classClassSnapshot.length > 100) {
    errors.class_class_snapshot = 'Kelas maksimal 100 karakter.';
  }

  if (classCodeSnapshot && classCodeSnapshot.length > 10) {
    errors.class_code_snapshot = 'Kode kelas maksimal 10 karakter.';
  }

  if (!projectName) {
    errors.project_name = 'Nama proyek wajib diisi.';
  }

  if (projectName.length > 255) {
    errors.project_name = 'Nama proyek maksimal 255 karakter.';
  }

  if (periodYear !== null && (periodYear < 2000 || periodYear > 2100)) {
    errors.period_year = 'Tahun periode harus antara 2000 dan 2100.';
  }

  if (periodMonth !== null && (periodMonth < 1 || periodMonth > 12)) {
    errors.period_month = 'Bulan periode harus antara 1 dan 12.';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Data yang diisi tidak valid.', 400, errors);
  }

  return {
    budget_code: budgetCode,
    company_id: companyId,
    company_code_snapshot: companyCodeSnapshot || null,
    company_name_snapshot: companyNameSnapshot || null,
    department_id: departmentId,
    department_name_snapshot: departmentNameSnapshot || null,
    department_class_snapshot: departmentClassSnapshot || null,
    department_code_snapshot: departmentCodeSnapshot || null,
    class_department_id: classDepartmentId,
    class_name_snapshot: classNameSnapshot || null,
    class_class_snapshot: classClassSnapshot || null,
    class_code_snapshot: classCodeSnapshot || null,
    budget_type_id: budgetTypeId,
    project_name: projectName,
    budget_amount: budgetAmount,
    budget_reserved: budgetReserved,
    budget_used: budgetUsed,
    budget_remaining: budgetRemaining,
    period_year: periodYear,
    period_month: periodMonth,
  };
}

function validateStatusPayload(payload = {}) {
  const errors = {};

  if (payload.is_active === undefined || payload.is_active === null || payload.is_active === '') {
    errors.is_active = 'is_active wajib diisi.';
  }

  const isActive = Number(payload.is_active);

  if (![0, 1].includes(isActive)) {
    errors.is_active = 'is_active harus 0 atau 1.';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Data yang diisi tidak valid.', 400, errors);
  }

  return { is_active: isActive };
}

async function ensureUniqueBudgetCode(budgetCode, ignoredId = null, connection) {
  const duplicate = await BudgetModel.findByBudgetCode(budgetCode, connection);

  if (!duplicate) {
    return;
  }

  if (ignoredId && Number(duplicate.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('Kode anggaran sudah ada.', 400, {
    budget_code: 'Kode anggaran sudah ada.',
  });
}

async function ensureBudgetTypeActive(budgetTypeId, connection) {
  if (!budgetTypeId) {
    return null;
  }

  const budgetType = await BudgetModel.findBudgetTypeById(budgetTypeId, connection);

  if (!budgetType) {
    throw createHttpError('Tipe anggaran tidak ditemukan.', 404, {
      budget_type_id: 'Tipe anggaran tidak ditemukan.',
    });
  }

  if (Number(budgetType.is_active) !== 1) {
    throw createHttpError('Tipe anggaran tidak aktif.', 400, {
      budget_type_id: 'Tipe anggaran tidak aktif.',
    });
  }

  return budgetType;
}

async function getBudgets(query = {}) {
  return BudgetModel.findAll(query);
}

async function getBudgetById(id) {
  const budget = await BudgetModel.findById(id);

  if (!budget) {
    throw createHttpError('Anggaran tidak ditemukan.', 404);
  }

  return budget;
}

async function createBudget(payload, req) {
  const data = validatePayload(payload);
  // New budgets start with no commitments; balances are derived from allocation.
  if (data.budget_reserved !== 0 || data.budget_used !== 0 ||
      (payload.budget_remaining !== undefined && data.budget_remaining !== data.budget_amount)) {
    throw createHttpError('Saat dibuat, sisa anggaran harus sama dengan nominal dan reserved/used harus nol.', 400);
  }
  data.budget_remaining = data.budget_amount;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await ensureUniqueBudgetCode(data.budget_code, null, connection);
    await ensureBudgetTypeActive(data.budget_type_id, connection);

    const budget = await BudgetModel.create(
      {
        ...data,
        is_active: 1,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budgets',
      entityId: budget.id,
      action: 'CREATE',
      description: `Create budget ${budget.budget_code} - ${budget.project_name}`,
      oldValues: null,
      newValues: budget,
    });

    await connection.commit();

    return budget;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateBudget(id, payload, req) {
  const data = validatePayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock before reading the current balance: prevent concurrent transfer/adjustment being overwritten.
    await connection.query('SELECT id FROM master_budgets WHERE id = ? FOR UPDATE', [id]);
    const oldBudget = await BudgetModel.findById(id, connection);

    if (!oldBudget) {
      throw createHttpError('Anggaran tidak ditemukan.', 404);
    }

    // Ordinary edit cannot change allocation or balances; use transfer/adjustment endpoints.
    // Balance fields in the payload are ignored (not compared): the FE row can be stale because
    // FRP/RP reserve/finalize, transfer and adjustment change balances at any time, and rejecting
    // on mismatch made edits fail intermittently. safeData below always keeps the locked DB values.
    if (String(data.company_id)!==String(oldBudget.company_id) || Number(data.department_id)!==Number(oldBudget.department_id) || Number(data.class_department_id)!==Number(oldBudget.class_department_id)) {
      throw createHttpError('Anggaran tidak dapat dipindahkan ke perusahaan/departemen/kelas lain melalui edit.',400);
    }
    // Preserve latest balances under transaction lock to prevent stale FE payload overwrite.
    const safeData={...data,budget_amount:oldBudget.budget_amount,budget_reserved:oldBudget.budget_reserved,budget_used:oldBudget.budget_used,budget_remaining:oldBudget.budget_remaining};
    await ensureUniqueBudgetCode(data.budget_code, id, connection);
    await ensureBudgetTypeActive(data.budget_type_id, connection);

    const updatedBudget = await BudgetModel.update(id, safeData, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budgets',
      entityId: id,
      action: 'UPDATE',
      description: `Update budget ${updatedBudget.budget_code} - ${updatedBudget.project_name}`,
      oldValues: oldBudget,
      newValues: updatedBudget,
    });

    await connection.commit();

    return updatedBudget;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateBudgetStatus(id, payload, req) {
  const data = validateStatusPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldBudget = await BudgetModel.findById(id, connection);

    if (!oldBudget) {
      throw createHttpError('Anggaran tidak ditemukan.', 404);
    }

    const updatedBudget = await BudgetModel.updateStatus(id, data.is_active, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_budgets',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate budget ${updatedBudget.budget_code} - ${updatedBudget.project_name}`
          : `Deactivate budget ${updatedBudget.budget_code} - ${updatedBudget.project_name}`,
      oldValues: oldBudget,
      newValues: updatedBudget,
    });

    await connection.commit();

    return updatedBudget;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  updateBudgetStatus,
};