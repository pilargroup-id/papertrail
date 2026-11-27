// Tiny pub/sub for app-wide toast notifications. Lives outside React so the API
// layer (and any non-component code) can raise a toast without prop drilling.

const listeners = new Set()
let nextId = 1

const emit = (type, title, description, options = {}) => {
  if (!title) {
    return null
  }

  const toast = {
    id: nextId++,
    type,
    title: String(title),
    description: description ? String(description) : '',
    duration: options.duration ?? (type === 'error' ? 7000 : 4000),
  }

  listeners.forEach((listener) => listener(toast))

  return toast.id
}

export const subscribeToasts = (listener) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

const notify = {
  success: (title, description, options) => emit('success', title, description, options),
  error: (title, description, options) => emit('error', title, description, options),
}

export default notify
