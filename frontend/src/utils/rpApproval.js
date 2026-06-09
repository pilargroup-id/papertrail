function getTextValue(...values) {
  return values.find((value) => String(value || '').trim()) || ''
}

export function isStaffRpUser(user) {
  if (!user) return false

  const jobLevelRank = Number(user?.jobLevelRank || user?.job_level_rank || 0)
  const jobLevelName = String(getTextValue(user?.selectedJobLevel, user?.jobLevelName)).trim().toLowerCase()
  const role = String(getTextValue(user?.role, user?.userRole, user?.selectedRole)).trim().toLowerCase()

  return jobLevelRank <= 1 || /\bstaff\b/.test(jobLevelName) || role === 'staff'
}

export function getRpApprovalPath(user) {
  return '/rp-approval'
}

export function getRpApprovalMode(user) {
  return isStaffRpUser(user) ? 'staff' : 'manager'
}
