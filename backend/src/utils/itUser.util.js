// User departemen IT punya akses penuh ke semua menu/modul.
// Logika yang sama ada di frontend: frontend/src/components/table/frp/frp-button-access.js (isItStaffUser)
const IT_DEPARTMENT_ID = 8;
const IT_DEPARTMENT_VALUES = ['IT', 'SIT'];

function normalizeUpper(value) {
  return String(value ?? '').trim().toUpperCase();
}

function isItValue(value) {
  return IT_DEPARTMENT_VALUES.includes(normalizeUpper(value));
}

function isItDepartmentUser(user = {}) {
  if (!user) {
    return false;
  }

  if (Number(user.department_id) === IT_DEPARTMENT_ID) {
    return true;
  }

  const directValues = [
    user.department_class,
    user.context_department_class,
    user.department,
    user.context_department_name,
    user.department_code,
    user.context_department_code,
  ];

  if (directValues.some(isItValue)) {
    return true;
  }

  const departments = Array.isArray(user.departments) ? user.departments : [];

  return departments.some((department = {}) => (
    Number(department.id ?? department.department_id) === IT_DEPARTMENT_ID ||
    [
      department.class,
      department.department_class,
      department.class_class,
      department.name,
      department.department_name,
      department.class_name,
      department.code,
      department.department_code,
      department.class_code,
    ].some(isItValue)
  ));
}

module.exports = {
  IT_DEPARTMENT_ID,
  isItDepartmentUser,
};
