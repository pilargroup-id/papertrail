import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ErrorRounded from '@mui/icons-material/ErrorRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { subscribeToasts } from '../../services/notify.js'
import './Toaster.css'

const MAX_VISIBLE = 4
const EXIT_MS = 180

const ICONS = {
  success: CheckCircleRounded,
  error: ErrorRounded,
}

function ToastItem({ toast, onDismiss }) {
  const [isPaused, setIsPaused] = useState(false)
  const remainingRef = useRef(toast.duration)
  const startedAtRef = useRef(0)

  // Restart the countdown whenever an identical toast is merged into this one.
  useEffect(() => {
    remainingRef.current = toast.duration
  }, [toast.stamp, toast.duration])

  useEffect(() => {
    if (isPaused || toast.isLeaving) {
      return undefined
    }

    startedAtRef.current = Date.now()
    const timer = window.setTimeout(() => onDismiss(toast.id), remainingRef.current)

    return () => {
      window.clearTimeout(timer)
      remainingRef.current -= Date.now() - startedAtRef.current
    }
  }, [isPaused, toast.id, toast.stamp, toast.isLeaving, onDismiss])

  const Icon = ICONS[toast.type] || ICONS.success

  return (
    <div
      className={`pt-toast pt-toast--${toast.type}${toast.isLeaving ? ' is-leaving' : ''}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Icon className="pt-toast__icon" aria-hidden="true" />

      <div className="pt-toast__body">
        <p className="pt-toast__title">
          {toast.title}
          {toast.count > 1 ? <span className="pt-toast__count">{toast.count}×</span> : null}
        </p>
        {toast.description ? <p className="pt-toast__description">{toast.description}</p> : null}
      </div>

      <button
        type="button"
        className="pt-toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Tutup notifikasi"
      >
        <CloseRounded fontSize="inherit" />
      </button>

      <span
        key={toast.stamp}
        className="pt-toast__timer"
        style={{
          animationDuration: `${toast.duration}ms`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
        aria-hidden="true"
      />
    </div>
  )
}

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, isLeaving: true } : toast)),
    )
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, EXIT_MS)
  }, [])

  useEffect(
    () =>
      subscribeToasts((incoming) => {
        setToasts((current) => {
          const duplicate = current.find(
            (toast) => !toast.isLeaving && toast.type === incoming.type && toast.title === incoming.title,
          )

          if (duplicate) {
            return current.map((toast) =>
              toast === duplicate
                ? {
                    ...toast,
                    description: incoming.description || toast.description,
                    count: toast.count + 1,
                    stamp: incoming.id,
                  }
                : toast,
            )
          }

          const next = [{ ...incoming, count: 1, stamp: incoming.id, isLeaving: false }, ...current]

          return next.slice(0, MAX_VISIBLE)
        })
      }),
    [],
  )

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="pt-toaster" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>,
    document.body,
  )
}
