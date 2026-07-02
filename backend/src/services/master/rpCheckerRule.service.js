const { db } = require('../../config/database.config');
const RpCheckerRuleModel = require('../../models/master/rpCheckerRule.model');
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

function validatePayload(payload = {}) {
  const errors = {};

  const destinationDepartmentRuleId = Number(payload.destination_department_rule_id);
  const jobPosition = normalizeString(payload.job_position);

  if (!Number.isInteger(destinationDepartmentRuleId) || destinationDepartmentRuleId <= 0) {
    errors.destination_department_rule_id = 'destination_department_rule_id is required and must be a positive integer';
  }

  if (!jobPosition) {
    errors.job_position = 'job_position is required';
  }

  if (jobPosition.length > 100) {
    errors.job_position = 'job_position maximum length is 100 characters';
  }

  if (Object.keys(errors).length) {
    throw createHttpError('Validation error', 400, errors);
  }

  return {
    destination_department_rule_id: destinationDepartmentRuleId,
    job_position: jobPosition,
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

async function ensureDestinationDepartmentRuleActive(id, connection) {
  const rule = await RpCheckerRuleModel.findDestinationDepartmentRuleById(id, connection);

  if (!rule) {
    throw createHttpError('RP destination department not found', 404, {
      destination_department_rule_id: 'RP destination department not found',
    });
  }

  if (Number(rule.is_active) !== 1) {
    throw createHttpError('RP destination department is inactive', 400, {
      destination_department_rule_id: 'RP destination department is inactive',
    });
  }

  return rule;
}

async function ensureUniqueRule(data, ignoredId = null, connection) {
  const duplicate = await RpCheckerRuleModel.findDuplicate(
    data.destination_department_rule_id,
    data.job_position,
    connection
  );

  if (!duplicate) {
    return;
  }

  if (ignoredId && Number(duplicate.id) === Number(ignoredId)) {
    return;
  }

  throw createHttpError('RP checker rule already exists', 400, {
    job_position: 'This job position already exists for selected destination department',
  });
}

async function getRpCheckerRules(query = {}) {
  return RpCheckerRuleModel.findAll(query);
}

async function getRpCheckerRuleById(id) {
  const rule = await RpCheckerRuleModel.findById(id);

  if (!rule) {
    throw createHttpError('RP checker rule not found', 404);
  }

  return rule;
}

async function createRpCheckerRule(payload, req) {
  const data = validatePayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const destinationRule = await ensureDestinationDepartmentRuleActive(
      data.destination_department_rule_id,
      connection
    );

    await ensureUniqueRule(data, null, connection);

    const rule = await RpCheckerRuleModel.create(
      {
        ...data,
        is_active: 1,
      },
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_rp_checker_rules',
      entityId: rule.id,
      action: 'CREATE',
      description: `Create RP checker rule ${destinationRule.department_name_snapshot || destinationRule.department_id} - ${rule.job_position}`,
      oldValues: null,
      newValues: rule,
    });

    await connection.commit();

    return rule;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateRpCheckerRule(id, payload, req) {
  const data = validatePayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldRule = await RpCheckerRuleModel.findById(id, connection);

    if (!oldRule) {
      throw createHttpError('RP checker rule not found', 404);
    }

    const destinationRule = await ensureDestinationDepartmentRuleActive(
      data.destination_department_rule_id,
      connection
    );

    await ensureUniqueRule(data, id, connection);

    const updatedRule = await RpCheckerRuleModel.update(id, data, connection);

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_rp_checker_rules',
      entityId: id,
      action: 'UPDATE',
      description: `Update RP checker rule ${destinationRule.department_name_snapshot || destinationRule.department_id} - ${updatedRule.job_position}`,
      oldValues: oldRule,
      newValues: updatedRule,
    });

    await connection.commit();

    return updatedRule;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateRpCheckerRuleStatus(id, payload, req) {
  const data = validateStatusPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldRule = await RpCheckerRuleModel.findById(id, connection);

    if (!oldRule) {
      throw createHttpError('RP checker rule not found', 404);
    }

    const updatedRule = await RpCheckerRuleModel.updateStatus(
      id,
      data.is_active,
      connection
    );

    await ActivityLogService.createActivityLog(connection, {
      req,
      module: 'MASTER',
      entityType: 'master_rp_checker_rules',
      entityId: id,
      action: data.is_active === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      description:
        data.is_active === 1
          ? `Activate RP checker rule ${updatedRule.department_name_snapshot || updatedRule.department_id} - ${updatedRule.job_position}`
          : `Deactivate RP checker rule ${updatedRule.department_name_snapshot || updatedRule.department_id} - ${updatedRule.job_position}`,
      oldValues: oldRule,
      newValues: updatedRule,
    });

    await connection.commit();

    return updatedRule;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  getRpCheckerRules,
  getRpCheckerRuleById,
  createRpCheckerRule,
  updateRpCheckerRule,
  updateRpCheckerRuleStatus,
};