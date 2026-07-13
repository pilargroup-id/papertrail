import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import TextArea from '../../forms/TextArea.jsx'

function DialogRevertFrp({
  isOpen = false,
  eyebrow = 'Revert FRP',
  title = 'Revert FRP',
  frp = null,
  confirmLabel = 'Revert',
  isSubmitting = false,
  submitError = '',
  onClose,
  onRevert,
}) {
  const [notes, setNotes] = useState('Revert FRP')

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

    setNotes('Revert FRP')

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

  const frpLabel = frp?.frp_number ?? frp?.id ?? 'FRP ini'
  const handleSubmit = (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    onRevert?.({
      frp,
      notes: notes.trim() || 'Revert FRP',
    })
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-revert-frp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-revert-frp-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              FRP <strong>{frpLabel}</strong> akan direvert. Apakah anda yakin?.
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

export default DialogRevertFrp
