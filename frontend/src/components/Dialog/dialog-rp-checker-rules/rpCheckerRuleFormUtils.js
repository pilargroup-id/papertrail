export const initialRpCheckerRuleFormValues = {
  destination_department_rule_id: '',
  job_position: '',
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

function makeDestinationRuleLabel(record, fallbackValue) {
  const code = getFirstValue(record, ['department_code_snapshot'])
  const name = getFirstValue(
    record,
    ['department_name_snapshot', 'department_name', 'name'],
    fallbackValue ? `Rule #${fallbackValue}` : 'Destination department',
  )
  const className = getFirstValue(record, ['department_class_snapshot', 'department_class', 'class'])
  const primaryLabel = [code, name].filter(Boolean).join(' - ') || name

  return className ? `${primaryLabel} (${className})` : primaryLabel
}

export function mapDestinationRuleOptions(records) {
  return records
    .map((record) => {
      const id = getFirstValue(record, ['id'])

      if (id === '') {
        return null
      }

      return {
        value: id,
        label: makeDestinationRuleLabel(record, id),
      }
    })
    .filter(Boolean)
}

export function mapRpCheckerRuleToFormValues(record) {
  return {
    destination_department_rule_id: getFirstValue(record, [
      'destination_department_rule_id',
      'rp_destination_department_rule_id',
    ]),
    job_position: getFirstValue(record, ['job_position']),
  }
}

export function makeDestinationRuleOption(record) {
  const value = getFirstValue(record, [
    'destination_department_rule_id',
    'rp_destination_department_rule_id',
  ])

  if (value === '') {
    return null
  }

  return {
    value,
    label: makeDestinationRuleLabel(record, value),
  }
}

export function mergeUniqueOptions(options, extraOption) {
  if (!extraOption) {
    return options
  }

  const hasOption = options.some((option) => String(option.value) === String(extraOption.value))

  return hasOption ? options : [extraOption, ...options]
}
