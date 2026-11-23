import api from '../../../services/api.js'

const currentDate = new Date()

export const currentYear = currentDate.getFullYear()
export const currentMonth = currentDate.getMonth() + 1

export const monthOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((label, index) => ({ value: index + 1, label }))

export const yearOptions = Array.from({ length: 7 }, (_, index) => {
  const year = currentYear - 2 + index

  return { value: year, label: String(year) }
})

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

  return matchedKey ? source[matchedKey] : fallback
}

export function findOption(options, value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return options.find((option) => String(option.value) === String(value)) ?? null
}

export function joinLabel(...parts) {
  return parts.filter(Boolean).join(' - ')
}

export function mapBudgetTypeOptions(budgetTypes) {
  return budgetTypes.map((budgetType) => {
    const id = getFirstValue(budgetType, ['id', 'budget_type_id'])
    const code = getFirstValue(budgetType, ['code', 'budget_type_code'])
    const name = getFirstValue(budgetType, ['name', 'budget_type_name'], `Budget type #${id ?? '-'}`)

    return { value: id, label: joinLabel(code, name) }
  })
}

export async function loadActiveBudgetTypeOptions(signal) {
  const response = await api.budgetTypes.list({ page: 1, limit: 100, is_active: 1 }, { signal })

  return mapBudgetTypeOptions(getRowsFromResponse(response))
}


export const minimumBudgetMovementCents = 1
export const rupiahDigits = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
export const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function budgetLabel(budget) {
  return `${budget?.budget_code ?? '-'} — ${budget?.project_name ?? '-'}`
}

export function toCents(value) {
  const number = Number(value)

  return Number.isFinite(number) ? Math.round(number * 100) : null
}

export function formatBalance(cents) {
  return Number.isFinite(cents) ? rupiah.format(cents / 100) : '—'
}

/**
 * Parse nominal rupiah yang diketik user ("1.000.000,50", "1000000.5", "Rp 1000").
 * Mengembalikan `{ value, cents }` dengan `value` berupa string desimal untuk API, atau null.
 */
export function parseBudgetAmount(input) {
  const text = String(input ?? '').trim().replace(/^rp\s*/i, '')
  const usesThousands = /^[1-9]\d{0,2}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text)
  const ungrouped = usesThousands ? text.replaceAll('.', '') : text
  const value = ungrouped.replace(',', '.').replace(/^0+(?=\d)/, '')

  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return null
  }

  const [whole, fraction = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))

  return Number.isSafeInteger(cents) ? { value, cents } : null
}
