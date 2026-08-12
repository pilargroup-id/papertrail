import {
  canAccessFrpButton,
  canCurrentUserEditFrp,
  getFrpButtonAccessRole,
  isItStaffUser,
  isManagerUser,
} from '../frp/frp-button-access.js'

function getFirstValue(source, keys, fallback = '') {
  const matchedKey = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null)

  if (!matchedKey) {
    return fallback
  }

  return source[matchedKey]
}

function getRpStatusValue(rp) {
  return String(rp?.status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .toUpperCase()
}

function getCurrentUserId(user) {
  return getFirstValue(user, ['id', 'user_id', 'userId'], '')
}

function getRpRequesterId(rp) {
  return getFirstValue(
    rp,
    ['requested_by_user_id', 'requested_by_id', 'created_by_user_id', 'created_by'],
    '',
  )
}

function getUserCompanyIds(user) {
  const companies = Array.isArray(user?.companies) ? user.companies : []
  const companyIds = companies
    .map((company) => getFirstValue(company, ['id', 'company_id', 'companyId'], ''))
    .filter((companyId) => companyId !== '')

  const primaryCompanyId = getFirstValue(user, ['company_id', 'companyId'], '')

  return primaryCompanyId === '' ? companyIds : [primaryCompanyId, ...companyIds]
}

function getUserDepartmentIds(user) {
  const departments = Array.isArray(user?.departments) ? user.departments : []
  const departmentIds = departments
    .flatMap((department) => [
      getFirstValue(department, ['id', 'department_id', 'departmentId'], ''),
      getFirstValue(department, ['class_department_id', 'classDepartmentId'], ''),
    ])
    .filter((departmentId) => departmentId !== '')

  return [
    getFirstValue(user, ['context_department_id', 'department_id', 'departmentId'], ''),
    getFirstValue(user, ['class_department_id', 'classDepartmentId'], ''),
    ...departmentIds,
  ].filter((departmentId) => departmentId !== '')
}

function getUserDepartmentContexts(user) {
  const contexts = []
  const primaryDepartmentId = getFirstValue(user, ['context_department_id', 'department_id', 'departmentId'], '')
  const primaryClassDepartmentId = getFirstValue(user, ['class_department_id', 'classDepartmentId'], primaryDepartmentId)

  if (primaryDepartmentId !== '') {
    contexts.push({
      departmentId: primaryDepartmentId,
      classDepartmentId: primaryClassDepartmentId,
    })
  }

  const departments = Array.isArray(user?.departments) ? user.departments : []

  departments.forEach((department) => {
    const departmentId = getFirstValue(department, ['department_id', 'departmentId', 'id'], '')
    const classDepartmentId = getFirstValue(
      department,
      ['class_department_id', 'classDepartmentId', 'id'],
      departmentId,
    )

    if (departmentId !== '') {
      contexts.push({ departmentId, classDepartmentId })
    }
  })

  return contexts
}

function hasScopedValue(scopeValues, value) {
  if (value === '' || scopeValues.length === 0) {
    return true
  }

  return scopeValues.some((scopeValue) => String(scopeValue) === String(value))
}

function hasDepartmentClassScope(user, departmentId, classDepartmentId = '') {
  if (departmentId === '') {
    return true
  }

  const contexts = getUserDepartmentContexts(user)

  if (!contexts.length) {
    return true
  }

  return contexts.some((context) => {
    if (String(context.departmentId) !== String(departmentId)) {
      return false
    }

    return classDepartmentId === '' || String(context.classDepartmentId) === String(classDepartmentId)
  })
}

function isRpCreator(user, rp) {
  const currentUserId = getCurrentUserId(user)
  const requesterId = getRpRequesterId(rp)

  return currentUserId !== '' && requesterId !== '' && String(currentUserId) === String(requesterId)
}

function userHasCompanyScope(user, rp) {
  return hasScopedValue(getUserCompanyIds(user), getFirstValue(rp, ['company_id', 'companyId'], ''))
}

function canRequesterManagerApprove(rp, currentUser) {
  return (
    userHasCompanyScope(currentUser, rp) &&
    hasDepartmentClassScope(
      currentUser,
      getFirstValue(rp, ['department_id', 'departmentId'], ''),
      getFirstValue(rp, ['class_department_id', 'classDepartmentId'], ''),
    )
  )
}

export function isGeneralProcurementUser(user) {
  const jobPosition = String(getFirstValue(user, ['job_position', 'jobPosition'], ''))
    .trim()
    .toUpperCase()
  const jobLevelValue = Number(getFirstValue(user, ['job_level_value', 'jobLevelValue'], 0))

  return jobPosition === 'GENERAL PROCUREMENT' && jobLevelValue < 4
}

export function getRpFrpConversionStatus(rp) {
  return String(getFirstValue(rp, ['frp_conversion_status', 'frpConversionStatus'], 'NOT_CREATED'))
    .trim()
    .toUpperCase()
}

function canDestinationManagerApprove(rp, currentUser) {
  return (
    userHasCompanyScope(currentUser, rp) &&
    hasScopedValue(
      getUserDepartmentIds(currentUser),
      getFirstValue(rp, ['destination_department_id', 'destinationDepartmentId'], ''),
    )
  )
}

export { canAccessFrpButton, canCurrentUserEditFrp, getFrpButtonAccessRole, isItStaffUser, isManagerUser }

export function canCurrentUserApproveRp(rp, currentUser) {
  if (!canAccessFrpButton(currentUser, 'approve') || isRpCreator(currentUser, rp)) {
    return false
  }

  const status = getRpStatusValue(rp)

  if (status === 'PENDING_REQUESTER_MANAGER') {
    return canRequesterManagerApprove(rp, currentUser)
  }

  if (status === 'PENDING_DESTINATION_MANAGER') {
    return canDestinationManagerApprove(rp, currentUser)
  }

  return false
}

export function canCurrentUserRejectRp(rp, currentUser) {
  return canCurrentUserApproveRp(rp, currentUser)
}

export function canCurrentUserRevertRp(rp, currentUser) {
  if (!canAccessFrpButton(currentUser, 'revert') || isRpCreator(currentUser, rp)) {
    return false
  }

  const status = getRpStatusValue(rp)

  if (status === 'PENDING_DESTINATION_CHECKER') {
    return canRequesterManagerApprove(rp, currentUser)
  }

  if (status === 'PENDING_DESTINATION_MANAGER' || status === 'APPROVED') {
    return canDestinationManagerApprove(rp, currentUser)
  }

  return false
}

export const canCurrentUserApproveFrp = canCurrentUserApproveRp
export const canCurrentUserRejectFrp = canCurrentUserRejectRp
export const canCurrentUserRevertFrp = canCurrentUserRevertRp

export function canCurrentUserCreateFrpFromRp(rp, currentUser) {
  return (
    getRpStatusValue(rp) === 'APPROVED' &&
    getRpFrpConversionStatus(rp) === 'NOT_CREATED' &&
    isGeneralProcurementUser(currentUser)
  )
}
