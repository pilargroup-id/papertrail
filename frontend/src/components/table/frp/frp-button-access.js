const IT_DEPARTMENT_ID = 8

function getFirstValue(source, keys, fallback = '') {
  const matchedKey = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null)

  if (!matchedKey) {
    return fallback
  }

  return source[matchedKey]
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeAction(action) {
  const normalizedAction = normalizeText(action)

  if (normalizedAction === 'approval') {
    return 'approve'
  }

  if (normalizedAction === 'detail') {
    return 'details'
  }

  return normalizedAction
}

function isTruthyFlag(value) {
  return ['1', 'true', 'yes'].includes(normalizeText(value))
}

function getCurrentUserId(user) {
  return getFirstValue(user, ['id', 'user_id', 'userId'], '')
}

function getFrpRequesterId(frp) {
  return getFirstValue(
    frp,
    ['requested_by_user_id', 'requested_by_id', 'created_by_user_id', 'created_by'],
    '',
  )
}

function getUserDepartmentIds(user) {
  const departments = Array.isArray(user?.departments) ? user.departments : []
  const departmentIds = departments
    .map((department) => getFirstValue(department, ['id', 'department_id', 'departmentId'], ''))
    .filter((departmentId) => departmentId !== '')

  const primaryDepartmentId = getFirstValue(user, ['department_id', 'departmentId'], '')

  return primaryDepartmentId === '' ? departmentIds : [primaryDepartmentId, ...departmentIds]
}

function getUserCompanyIds(user) {
  const companies = Array.isArray(user?.companies) ? user.companies : []
  const companyIds = companies
    .map((company) => getFirstValue(company, ['id', 'company_id', 'companyId'], ''))
    .filter((companyId) => companyId !== '')

  const primaryCompanyId = getFirstValue(user, ['company_id', 'companyId'], '')

  return primaryCompanyId === '' ? companyIds : [primaryCompanyId, ...companyIds]
}

function hasScopedValue(scopeValues, value) {
  if (value === '' || scopeValues.length === 0) {
    return true
  }

  return scopeValues.some((scopeValue) => String(scopeValue) === String(value))
}

function getFrpStatusValue(frp) {
  return String(frp?.status ?? '').trim().toUpperCase()
}

function isFrpPendingStatus(frp) {
  return getFrpStatusValue(frp).startsWith('PENDING')
}

export function isManagerUser(user) {
  const explicitManagerFlag = getFirstValue(user, ['is_manager', 'isManager'], null)

  if (explicitManagerFlag !== null) {
    return isTruthyFlag(explicitManagerFlag)
  }

  const jobLevelValue = Number(getFirstValue(user, ['job_level_value', 'jobLevelValue'], 0))

  if (Number.isFinite(jobLevelValue) && jobLevelValue >= 4) {
    return true
  }

  const roleText = [
    user?.job_position,
    user?.jobPosition,
    user?.job_level,
    user?.jobLevel,
    user?.role,
    user?.userRole,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return roleText.includes('manager')
}

export function isItStaffUser(user) {
  const primaryDepartmentId = getFirstValue(user, ['department_id', 'departmentId'], '')

  if (String(primaryDepartmentId) === String(IT_DEPARTMENT_ID)) {
    return true
  }

  const directDepartmentTexts = [
    user?.department,
    user?.department_name,
    user?.departmentName,
    user?.department_class,
    user?.departmentClass,
    user?.department_code,
    user?.departmentCode,
  ].map(normalizeText)

  if (directDepartmentTexts.some((value) => value === 'it' || value === 'sit')) {
    return true
  }

  const departments = Array.isArray(user?.departments) ? user.departments : []

  return departments.some((department) => {
    const departmentId = getFirstValue(department, ['id', 'department_id', 'departmentId'], '')
    const departmentTexts = [
      department?.name,
      department?.department,
      department?.department_name,
      department?.class,
      department?.department_class,
      department?.code,
      department?.department_code,
    ].map(normalizeText)

    return (
      String(departmentId) === String(IT_DEPARTMENT_ID) ||
      departmentTexts.some((value) => value === 'it' || value === 'sit')
    )
  })
}

export function getFrpButtonAccessRole(user) {
  if (!user) {
    return null
  }

  if (isManagerUser(user)) {
    return 'manager'
  }

  if (isItStaffUser(user)) {
    return 'staff_it'
  }

  return 'staff'
}

export function canAccessFrpButton(user, action) {
  const accessRole = getFrpButtonAccessRole(user)
  const normalizedAction = normalizeAction(action)

  if (accessRole === 'manager') {
    return ['approve', 'reject', 'revert', 'details'].includes(normalizedAction)
  }

  if (accessRole === 'staff_it') {
    return ['revert', 'edit', 'details'].includes(normalizedAction)
  }

  if (accessRole === 'staff') {
    return ['edit', 'details'].includes(normalizedAction)
  }

  return false
}

export function canCurrentUserApproveFrp(frp, currentUser) {
  if (!canAccessFrpButton(currentUser, 'approve') || !isFrpPendingStatus(frp)) {
    return false
  }

  const currentUserId = getCurrentUserId(currentUser)
  const requesterId = getFrpRequesterId(frp)

  if (currentUserId !== '' && requesterId !== '' && String(currentUserId) === String(requesterId)) {
    return false
  }

  const frpCompanyId = getFirstValue(frp, ['company_id', 'companyId'], '')
  const frpDepartmentId = getFirstValue(frp, ['department_id', 'departmentId'], '')

  return (
    hasScopedValue(getUserCompanyIds(currentUser), frpCompanyId) &&
    hasScopedValue(getUserDepartmentIds(currentUser), frpDepartmentId)
  )
}

export function canCurrentUserRejectFrp(frp, currentUser) {
  return canCurrentUserApproveFrp(frp, currentUser)
}

export function canCurrentUserEditFrp(frp, currentUser) {
  if (!canAccessFrpButton(currentUser, 'edit')) {
    return false
  }

  if (isItStaffUser(currentUser) && getFrpStatusValue(frp) === 'APPROVED') {
    return false
  }

  return true
}

export function canCurrentUserRevertFrp(frp, currentUser) {
  if (!canAccessFrpButton(currentUser, 'revert') || getFrpStatusValue(frp) !== 'APPROVED') {
    return false
  }

  if (isItStaffUser(currentUser)) {
    return true
  }

  const frpCompanyId = getFirstValue(frp, ['company_id', 'companyId'], '')
  const frpDepartmentId = getFirstValue(frp, ['department_id', 'departmentId'], '')

  return (
    hasScopedValue(getUserCompanyIds(currentUser), frpCompanyId) &&
    hasScopedValue(getUserDepartmentIds(currentUser), frpDepartmentId)
  )
}
