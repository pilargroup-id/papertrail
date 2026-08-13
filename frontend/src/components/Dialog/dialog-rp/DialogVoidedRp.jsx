import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import TextArea from '../../forms/TextArea.jsx'

function DialogVoidedRp({
  isOpen = false,
  eyebrow = 'Voided RP',
  title = 'Voided RP',
  rp = null,
  confirmLabel = 'Voided',
  isSubmitting = false,
  submitError = '',
  onClose,
  onVoid,
}) {
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState('')

  const rpLabel = rp?.rp_number ?? rp?.id ?? 'RP ini'

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return
    }

    onClose?.()
  }, [isSubmitting, onClose])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    setReason('')
    setFieldError('')

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      setFieldError('Reason wajib diisi.')
      return
    }

    setFieldError('')
    onVoid?.({ rp, reason: trimmedReason })
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-voided-rp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-voided-rp-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              RP <strong>{rpLabel}</strong> akan divoid dan tidak bisa dikonversi menjadi FRP.
            </p>

            <TextArea
              label="Reason"
              value={reason}
              rows={3}
              disabled={isSubmitting}
              onChange={(event) => {
                setReason(event.target.value)
                if (fieldError) {
                  setFieldError('')
                }
              }}
            />

            {fieldError ? <p className="form-control__message">{fieldError}</p> : null}
            {submitError ? <p className="form-control__message">{submitError}</p> : null}
          </div>

          <div className="dashboard-popup__actions">
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Memproses...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogVoidedRp
