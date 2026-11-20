const DRAFT_STORAGE_PREFIX = 'papertrail:form-draft'
const DRAFT_VERSION = 1

export const FORM_DRAFT_KEYS = {
  FRP_CREATE: 'frp-create',
  RP_CREATE: 'rp-create',
}

function getStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function getStorageKey(draftKey, userId) {
  return [DRAFT_STORAGE_PREFIX, draftKey, userId || 'anonymous'].join(':')
}

export function loadFormDraft(draftKey, userId) {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  try {
    const rawDraft = storage.getItem(getStorageKey(draftKey, userId))

    if (!rawDraft) {
      return null
    }

    const draft = JSON.parse(rawDraft)

    if (draft?.version !== DRAFT_VERSION || !draft?.values || typeof draft.values !== 'object') {
      return null
    }

    return draft
  } catch {
    return null
  }
}

export function saveFormDraft(draftKey, userId, values) {
  const storage = getStorage()

  if (!storage) {
    return false
  }

  try {
    storage.setItem(
      getStorageKey(draftKey, userId),
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        values,
      }),
    )

    return true
  } catch {
    return false
  }
}

export function clearFormDraft(draftKey, userId) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  try {
    storage.removeItem(getStorageKey(draftKey, userId))
  } catch {
    // Ignore storage errors; the draft simply stays or was never stored.
  }
}

export function formatDraftSavedAt(savedAt) {
  const date = new Date(savedAt)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
