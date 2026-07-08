export const initialPermissionModuleFormValues = {
  user_id: '',
  username_snapshot: '',
  name_snapshot: '',
  module_id: '',
  access: [],
}

export const permissionAccessOptions = [
  {
    value: 'can_view',
    label: 'View',
    description: 'Izinkan user melihat data pada module ini.',
  },
  {
    value: 'can_create',
    label: 'Create',
    description: 'Izinkan user membuat data baru pada module ini.',
  },
  {
    value: 'can_update',
    label: 'Update',
    description: 'Izinkan user mengubah data pada module ini.',
  },
  {
    value: 'can_deactivate',
    label: 'Deactivate',
    description: 'Izinkan user menonaktifkan data pada module ini.',
  },
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

export function mergeUniqueOptions(options, extraOption) {
  if (!extraOption) {
    return options
  }

  const hasOption = options.some((option) => String(option.value) === String(extraOption.value))

  return hasOption ? options : [extraOption, ...options]
}

export function getSelectedAccessValues(permissionModule) {
  return permissionAccessOptions
    .filter((option) => Number(permissionModule?.[option.value]) === 1)
    .map((option) => option.value)
}

export function getPermissionPayloadFromAccess(selectedAccessValues) {
  return permissionAccessOptions.reduce((payload, option) => {
    payload[option.value] = selectedAccessValues.includes(option.value) ? 1 : 0
    return payload
  }, {})
}

export function getAccessErrorMessage(errors) {
  return (
    errors?.can_view ||
    errors?.can_create ||
    errors?.can_update ||
    errors?.can_deactivate ||
    ''
  )
}

export function mapPermissionModuleOptions(permissionModules) {
  return permissionModules.map((permissionModule) => ({
    value: permissionModule?.id,
    label:
      [permissionModule?.module_code, permissionModule?.module_name]
        .filter(Boolean)
        .join(' - ') || `Permission Module #${permissionModule?.id ?? '-'}`,
    meta: permissionModule,
  }))
}

export function mapUserOptions(users) {
  return users
    .map((user) => {
      const id = getFirstValue(user, ['id', 'user_id', 'userId', 'uuid'])
      const value = id === undefined || id === null ? '' : String(id)
      const username = getFirstValue(user, ['username', 'user_name', 'login', 'email'])
      const name = getFirstValue(
        user,
        ['full_name', 'fullName', 'name', 'display_name', 'employee_name'],
        username || `User #${value || '-'}`,
      )
      const email = getFirstValue(user, ['email', 'email_address'])
      const secondaryLabels = [username, email].filter(
        (item, index, items) => item && items.indexOf(item) === index && item !== name,
      )
      const label = [name, ...secondaryLabels].filter(Boolean).join(' - ')

      return {
        value,
        label: label || `User #${value || '-'}`,
        meta: {
          id: value,
          username,
          name,
        },
      }
    })
    .filter((option) => option.value !== undefined && option.value !== null && option.value !== '')
}

export function makeUserOptionFromPermissionRecord(record) {
  const id = getFirstValue(record, ['user_id'])
  const value = id === undefined || id === null ? '' : String(id)

  if (value === '') {
    return null
  }

  const username = getFirstValue(record, ['username_snapshot'])
  const name = getFirstValue(record, ['name_snapshot'], username || `User #${value}`)
  const label = [name, username]
    .filter((item, index, items) => item && items.indexOf(item) === index)
    .join(' - ')

  return {
    value,
    label: label || `User #${value}`,
    meta: {
      id: value,
      username,
      name,
    },
  }
}
