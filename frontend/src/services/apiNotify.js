// Turns a finished mutating request (POST/PUT/PATCH/DELETE) into a human toast.
// Backend success messages are English ("Bank created"), so the copy is built
// here from the endpoint instead, to keep the UI consistently in Indonesian.

import notify from './notify.js'

const ENTITY_LABELS = {
  frp: 'FRP',
  rp: 'RP',
  vendors: 'Vendor',
  banks: 'Bank',
  'vendor-bank-accounts': 'Rekening vendor',
  'budget-types': 'Tipe budget',
  budgets: 'Budget',
  'budget-access-rules': 'Akses budget',
  'frp-document-types': 'Tipe dokumen FRP',
  'external-document-types': 'Tipe dokumen eksternal',
  'payment-methods': 'Metode pembayaran',
  currencies: 'Mata uang',
  'exchange-rates': 'Kurs',
  'rp-destination-departments': 'Departemen tujuan RP',
  'rp-checker-rules': 'Aturan checker RP',
  'rp-payment-categories': 'Kategori pembayaran RP',
  'user-module-permissions': 'Hak akses modul',
}

// Endpoints that are steps of a larger flow (the caller reports the outcome).
const SILENT_SEGMENTS = new Set(['attachments', 'validate', 'auth'])

const APPROVE_ACTIONS = new Set([
  'approve',
  'requester-manager-approve',
  'destination-manager-approve',
  'destination-check',
])

const REJECT_ACTIONS = new Set([
  'reject',
  'requester-manager-reject',
  'destination-check-reject',
  'destination-manager-reject',
])

const isIdSegment = (segment) => /^\d+$/.test(segment) || /^[0-9a-f-]{20,}$/i.test(segment)

const parsePath = (path) => {
  const segments = String(path || '')
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .filter((segment) => segment !== 'master')

  let entityKey = null
  let hasId = false
  let action = null

  segments.forEach((segment) => {
    if (ENTITY_LABELS[segment]) {
      entityKey = segment
      hasId = false
      action = null
    } else if (isIdSegment(segment)) {
      hasId = true
    } else {
      action = segment
    }
  })

  return { segments, entityKey, hasId, action }
}

const pickReference = (data) => {
  const record = data?.data ?? data

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return ''
  }

  return (
    record.rp_number ||
    record.frp_number ||
    record.code ||
    record.name ||
    ''
  )
}

// Returns { success, failure } copy for an endpoint, or null to stay silent.
const describe = (method, path, requestData) => {
  const { segments, entityKey, hasId, action } = parsePath(path)

  if (segments.some((segment) => SILENT_SEGMENTS.has(segment))) {
    return null
  }

  const entity = ENTITY_LABELS[entityKey] || 'Data'
  const entityLower = entityKey === 'frp' || entityKey === 'rp' ? entity : entity.toLowerCase()

  if (APPROVE_ACTIONS.has(action)) {
    return { success: `${entity} disetujui`, failure: `Gagal menyetujui ${entityLower}` }
  }

  if (REJECT_ACTIONS.has(action)) {
    return { success: `${entity} ditolak`, failure: `Gagal menolak ${entityLower}` }
  }

  switch (action) {
    case 'revert':
      return { success: `${entity} dikembalikan ke pengaju`, failure: `Gagal mengembalikan ${entityLower}` }
    case 'create-frp':
      return { success: 'FRP dibuat dari RP', failure: 'Gagal membuat FRP dari RP' }
    case 'procurement-void':
      return { success: 'RP dibatalkan (void)', failure: 'Gagal membatalkan RP' }
    case 'transfer':
      return { success: 'Transfer budget berhasil', failure: 'Transfer budget gagal' }
    case 'adjust':
      return { success: 'Penyesuaian budget disimpan', failure: 'Gagal menyesuaikan budget' }
    case 'import':
      return { success: 'Import data selesai', failure: 'Import data gagal' }
    case 'sync':
      return { success: 'Kurs disinkronkan', failure: 'Gagal menyinkronkan kurs' }
    case 'status': {
      const isActive = requestData?.is_active
      const verb = isActive === true ? 'diaktifkan' : isActive === false ? 'dinonaktifkan' : 'diperbarui'
      return {
        success: isActive === undefined ? `Status ${entityLower} diperbarui` : `${entity} ${verb}`,
        failure: `Gagal mengubah status ${entityLower}`,
      }
    }
    default:
      break
  }

  if (method === 'DELETE') {
    return { success: `${entity} dihapus`, failure: `Gagal menghapus ${entityLower}` }
  }

  if (method === 'POST' && !hasId) {
    return { success: `${entity} ditambahkan`, failure: `Gagal menambahkan ${entityLower}` }
  }

  if ((method === 'PUT' || method === 'PATCH') && hasId) {
    return { success: `Perubahan ${entityLower} disimpan`, failure: `Gagal menyimpan ${entityLower}` }
  }

  return { success: 'Berhasil disimpan', failure: 'Gagal menyimpan' }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const shouldNotifyRequest = (method, option) =>
  option !== false && MUTATING_METHODS.has(String(method).toUpperCase())

export const notifyRequestSuccess = (method, path, requestData, responseData) => {
  const copy = describe(method, path, requestData)

  if (copy) {
    notify.success(copy.success, pickReference(responseData))
  }
}

export const notifyRequestFailure = (method, path, requestData, error) => {
  const copy = describe(method, path, requestData)

  if (!copy) {
    return
  }

  const isNetworkError = error instanceof TypeError
  const description = isNetworkError
    ? 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.'
    : error?.message

  notify.error(copy.failure, description)
}
