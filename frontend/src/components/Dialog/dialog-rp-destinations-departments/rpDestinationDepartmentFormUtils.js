export const initialRpDestinationDepartmentFormValues = {
  department_id: '',
  is_short_flow_allowed: 0,
}

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

export function mapRpDestinationDepartmentToFormValues(record) {
  return {
    department_id: getFirstValue(record, ['department_id']),
    is_short_flow_allowed: Number(getFirstValue(record, ['is_short_flow_allowed'], 0)) === 1 ? 1 : 0,
  }
}

export function makeRpDestinationDepartmentOption(record) {
  const value = getFirstValue(record, ['department_id'])

  if (value === '') {
    return null
  }

  const code = getFirstValue(record, ['department_code_snapshot'])
  const name = getFirstValue(record, ['department_name_snapshot'], `Department #${value}`)
  const className = getFirstValue(record, ['department_class_snapshot'], name)
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
