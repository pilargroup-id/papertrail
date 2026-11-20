function getContexts(user = {}) {
  const contexts = [];
  if (user.context_department_id || user.department_id) {
    contexts.push({
      department_id: Number(user.context_department_id || user.department_id),
      class_department_id: Number(user.class_department_id || user.context_department_id || user.department_id),
    });
  }
  for (const d of Array.isArray(user.departments) ? user.departments : []) {
    const departmentId = Number(d.department_id || d.id || 0);
    const classDepartmentId = Number(d.class_department_id || d.id || departmentId);
    if (departmentId && classDepartmentId) {
      contexts.push({ department_id: departmentId, class_department_id: classDepartmentId });
    }
  }
  return contexts.filter((c, i, a) => a.findIndex((x) =>
    x.department_id === c.department_id && x.class_department_id === c.class_department_id) === i);
}

function getCompanyIds(user = {}) {
  return [...new Set([user.company_id, ...(Array.isArray(user.companies) ? user.companies.map((c) => c.id) : [])]
    .filter(Boolean).map(String))];
}

function buildBudgetSelectionQuery(query = {}, user = {}) {
  const purpose = String(query.purpose || 'FRP').trim().toUpperCase();
  if (!['FRP', 'RP'].includes(purpose)) throw new Error('purpose must be FRP or RP');
  const companies = getCompanyIds(user);
  const companyId = String(query.company_id || user.company_id || user.companies?.find((c) => Number(c.is_primary) === 1)?.id || companies[0] || '');
  if (!companies.includes(companyId)) throw new Error('Selected company is not assigned to current user');
  const contexts = getContexts(user);
  const selectedDeptId = Number(query.department_id || user.context_department_id || user.department_id || (contexts.length === 1 ? contexts[0].department_id : 0));
  const selectedClassId = Number(query.class_department_id || user.class_department_id || (contexts.length === 1 ? contexts[0].class_department_id : 0));
  if (!contexts.some((c) => c.department_id === selectedDeptId && c.class_department_id === selectedClassId)) {
    throw new Error('Selected department/class is not assigned to current user');
  }
  const targetDepartmentId = purpose === 'RP' && [1, 8].includes(selectedDeptId)
    ? Number(query.destination_department_id || 0) : null;
  if (purpose === 'RP' && [1, 8].includes(selectedDeptId) && !targetDepartmentId) {
    throw new Error('destination_department_id is required for IT/HCGA RP budget selection');
  }
  return {
    ...query,
    company_id: companyId,
    department_id: targetDepartmentId || selectedDeptId,
    class_department_id: targetDepartmentId ? undefined : selectedClassId,
    is_active: 1,
  };
}
module.exports = { buildBudgetSelectionQuery };
