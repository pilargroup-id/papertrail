import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import TextArea from '../../forms/TextArea.jsx'
import { XClose } from '../../layoute/TemplateIcons.jsx'

function DialogRejectFrp({
  isOpen = false,
  eyebrow = 'Reject FRP',
  title = 'Reject FRP',
  frp = null,
  user = null,
  confirmLabel = 'Reject',
  isSubmitting = false,
  submitError = '',
  onClose,
  onConfirm,
  onReject,
}) {
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState('')

  const resolvedFrp = frp ?? user
  const frpLabel = resolvedFrp?.frp_number ?? resolvedFrp?.id ?? 'FRP ini'

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

    if (typeof onReject === 'function') {
      onReject({
        frp: resolvedFrp,
        reason: trimmedReason,
      })
      return
    }

    onConfirm?.(resolvedFrp, trimmedReason)
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-reject-frp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-reject-frp-title">
                {title}
              </h2>
            </div>

            <button
              type="button"
              className="dashboard-popup__close"
              aria-label="Tutup dialog"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <XClose size={18} />
            </button>
          </div>

          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              FRP <strong>{frpLabel}</strong> akan direject dan statusnya menjadi final.
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

export default DialogRejectFrp
