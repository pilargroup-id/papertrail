export const initialBudgetAccessRuleFormValues = {
  module: 'FRP',
  access_type: 'CROSS_BUDGET',
  department_id: '',
}

export const moduleOptions = [
  { value: 'FRP', label: 'FRP' },
  { value: 'RP', label: 'RP' },
]

export const accessTypeOptions = [
  { value: 'CROSS_BUDGET', label: 'Cross Budget' },
]

export function getRowsFromResponse(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data
  }

  if (Array.isArray(response?.rows)) {
    return response.rows
  }

  return []
}

export function getAuthUser(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

export function getFirstValue(source, keys, fallback = '') {
  const matchedKey = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null)

  if (!matchedKey) {
    return fallback
  }

  return source[matchedKey]
}

export function findOption(options, value) {
  return options.find((option) => String(option.value) === String(value))
}

export function mapDepartmentOptions(departments) {
  return departments.map((department) => {
    const id = getFirstValue(department, ['id', 'department_id', 'uuid'])
    const code = getFirstValue(department, ['code', 'department_code'])
    const name = getFirstValue(
      department,
      ['name', 'department_name', 'label', 'department_name_snapshot'],
      `Department #${id ?? '-'}`,
    )
    const className = getFirstValue(
      department,
      ['class_name', 'department_class', 'class', 'department_class_snapshot'],
      name,
    )
    const label = [code, name].filter(Boolean).join(' - ') || name

    return {
      value: id,
      label,
      isPrimary: Number(department?.is_primary) === 1,
      meta: {
        code,
        name,
        className,
      },
    }
  })
}

export function mapBudgetAccessRuleToFormValues(rule) {
  return {
    module: String(getFirstValue(rule, ['module'], 'FRP') || 'FRP').toUpperCase(),
    access_type: String(
      getFirstValue(rule, ['access_type'], 'CROSS_BUDGET') || 'CROSS_BUDGET',
    ).toUpperCase(),
    department_id: getFirstValue(rule, ['department_id']),
  }
}

export function makeRuleDepartmentOption(rule) {
  const value = getFirstValue(rule, ['department_id'])

  if (value === '') {
    return null
  }

  const code = getFirstValue(rule, ['department_code_snapshot'])
  const name = getFirstValue(rule, ['department_name_snapshot'], `Department #${value}`)
  const className = getFirstValue(rule, ['department_class_snapshot'], name)
  const label = [code, name].filter(Boolean).join(' - ') || name

  return {
    value,
    label,
    meta: {
      code,
      name,
      className,
    },
  }
}

export function mergeUniqueOptions(options, extraOption) {
  if (!extraOption) {
    return options
  }

  const hasOption = options.some((option) => String(option.value) === String(extraOption.value))

  return hasOption ? options : [extraOption, ...options]
}
