// Approver FRP hasil konversi RP (General Procurement): Ass. Manager / Manager di departemen Product.
// Logika yang sama ada di frontend: frontend/src/components/table/frp/frp-button-access.js
const PRODUCT_DEPARTMENT_ID = 13;
// Cocok untuk "Ass. Manager", "Assistant Manager", dan "Manager" (bukan "General Manager").
const APPROVER_LEVEL_PATTERN = /^((ASSISTANT|ASST|ASS)\.?\s*)?MANAGER\b/;

function normalizeUpper(value) {
  return String(value ?? '').trim().toUpperCase();
}

function isAssistantManagerOrManager(user = {}) {
  return [user.job_level, user.job_position].some((value) =>
    APPROVER_LEVEL_PATTERN.test(normalizeUpper(value))
  );
}

function isProductDepartmentMember(user = {}) {
  const departmentIds = [user.department_id, user.context_department_id];
  const departmentNames = [user.department, user.context_department_name];
  const departments = Array.isArray(user.departments) ? user.departments : [];

  departments.forEach((department) => {
    departmentIds.push(department.id, department.department_id);
    departmentNames.push(department.name, department.department_name, department.class_name);
  });

  return (
    departmentIds.some((id) => Number(id) === PRODUCT_DEPARTMENT_ID) ||
    departmentNames.some((name) => normalizeUpper(name) === 'PRODUCT')
  );
}

function isProductAssistantManager(user = {}) {
  return isAssistantManagerOrManager(user) && isProductDepartmentMember(user);
}

module.exports = {
  PRODUCT_DEPARTMENT_ID,
  isProductAssistantManager,
};
