const logModel = require('../../models/logs/log.model');

function isUserInItDepartment(user = {}) {
  const directClass = String(user.department_class || user.context_department_class || '').toUpperCase();
  const directName = String(user.department || user.context_department_name || '').toUpperCase();
  const directCode = String(user.department_code || user.context_department_code || '').toUpperCase();

  if (directClass === 'IT' || directName === 'IT' || directCode === 'SIT') {
    return true;
  }

  const departments = Array.isArray(user.departments) ? user.departments : [];

  return departments.some((department) => {
    const departmentClass = String(department.class || department.department_class || department.class_class || '').toUpperCase();
    const departmentName = String(department.name || department.department_name || department.class_name || '').toUpperCase();
    const departmentCode = String(department.code || department.department_code || department.class_code || '').toUpperCase();

    return departmentClass === 'IT' || departmentName === 'IT' || departmentCode === 'SIT';
  });
}

function assertCanViewLogs(user = {}) {
  if (!isUserInItDepartment(user)) {
    throw new Error('Only IT users can view logs');
  }
}

async function listActivityLogs(query = {}, user = {}) {
  assertCanViewLogs(user);

  const conn = await logModel.db.getConnection();

  try {
    const result = await logModel.listActivityLogs(conn, query);

    return {
      data: result.rows,
      meta: result.meta,
    };
  } finally {
    conn.release();
  }
}

async function listBudgetUsageLogs(query = {}, user = {}) {
  assertCanViewLogs(user);

  const conn = await logModel.db.getConnection();

  try {
    const result = await logModel.listBudgetUsageLogs(conn, query);

    return {
      data: result.rows,
      meta: result.meta,
    };
  } finally {
    conn.release();
  }
}

module.exports = {
  listActivityLogs,
  listBudgetUsageLogs,
};
