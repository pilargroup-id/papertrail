import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import TextArea from '../../forms/TextArea.jsx'

function DialogApproveRp({
  isOpen = false,
  eyebrow = 'Approve RP',
  title = 'Approve RP',
  rp = null,
  confirmLabel = 'Approve',
  isSubmitting = false,
  submitError = '',
  onClose,
  onApprove,
}) {
  const [notes, setNotes] = useState('Approve RP')

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

  const rpLabel = rp?.rp_number ?? rp?.id ?? 'RP ini'
  const handleSubmit = (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    onApprove?.({
      rp,
      notes: notes.trim() || 'Approve RP',
    })
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-approve-rp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-approve-rp-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              RP <strong>{rpLabel}</strong> akan diapprove. Pastikan data sudah sesuai sebelum
              melanjutkan.
            </p>

            <TextArea
              label="Notes"
              value={notes}
              rows={3}
              disabled={isSubmitting}
              onChange={(event) => setNotes(event.target.value)}
            />

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
              className="dashboard-popup__button dashboard-popup__button--primary"
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

export default DialogApproveRp
