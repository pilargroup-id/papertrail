function getPrimaryDepartment(user) {
  const departments = Array.isArray(user?.departments) ? user.departments : [];

  return (
    departments.find((item) => Number(item.is_primary) === 1) ||
    departments[0] ||
    null
  );
}

function getPrimaryCompany(user) {
  const companies = Array.isArray(user?.companies) ? user.companies : [];

  return (
    companies.find((item) => Number(item.is_primary) === 1) ||
    companies[0] ||
    null
  );
}

function toJsonValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;

  return JSON.stringify(value);
}

async function createActivityLog(connection, payload = {}) {
  const user = payload.actor || payload.req?.user || null;
  const req = payload.req || null;

  const primaryDepartment = getPrimaryDepartment(user);
  const primaryCompany = getPrimaryCompany(user);

  const actorCompanyId =
    user?.company_id ??
    primaryCompany?.id ??
    null;

  const actorCompanyName =
    user?.company ??
    primaryCompany?.name ??
    null;

  const actorDepartmentId =
    user?.department_id ??
    primaryDepartment?.id ??
    null;

  const actorDepartmentName =
    user?.department ??
    primaryDepartment?.name ??
    null;

  const ipAddress =
    req?.ip ||
    req?.headers?.['x-forwarded-for'] ||
    req?.socket?.remoteAddress ||
    null;

  const userAgent = req?.headers?.['user-agent'] || null;

  const [result] = await connection.query(
    `INSERT INTO activity_logs (
       module,
       entity_type,
       entity_id,
       action,
       description,
       old_values,
       new_values,
       metadata,
       actor_user_id,
       actor_username,
       actor_name,
       actor_job_position,
       actor_job_level_name,
       actor_job_level_value,
       actor_company_id,
       actor_company_name_snapshot,
       actor_department_id,
       actor_department_name_snapshot,
       ip_address,
       user_agent
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.module,
      payload.entityType,
      payload.entityId ? String(payload.entityId) : null,
      payload.action,
      payload.description || null,
      toJsonValue(payload.oldValues),
      toJsonValue(payload.newValues),
      toJsonValue(payload.metadata),
      user?.id || null,
      user?.username || null,
      user?.name || null,
      user?.job_position || null,
      user?.job_level || null,
      user?.job_level_value ?? null,
      actorCompanyId,
      actorCompanyName,
      actorDepartmentId,
      actorDepartmentName,
      ipAddress,
      userAgent,
    ]
  );

  return result.insertId;
}

module.exports = {
  createActivityLog,
};