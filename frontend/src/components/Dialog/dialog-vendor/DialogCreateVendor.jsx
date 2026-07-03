import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose, Users01 } from '../../layoute/TemplateIcons';
import TextField from '../../forms/TextField.jsx'

const initialFormValues = {
  name: '',
}

function DialogCreateVendor({
  isOpen = false,
  eyebrow = 'Create Vendor',
  title = 'Create Vendor',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateValue = (fieldName, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }))

    setFieldErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors
      }

      return {
        ...currentErrors,
        [fieldName]: '',
      }
    })
  }

  useEffect(() => {
    if (!isOpen) {
      setFormValues(initialFormValues)
      setFieldErrors({})
      setSubmitError('')
      setIsSubmitting(false)
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedName = formValues.name.trim()

    if (!normalizedName) {
      setFieldErrors({
        name: 'Nama vendor wajib diisi.',
      })
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.vendors.create({
        name: normalizedName,
      })

      await onCreated?.(response)
      onClose?.()
    } catch (error) {
      setSubmitError(error.message || 'Gagal membuat vendor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup vendor-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-ticket-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-create-ticket-title">
                {title}
              </h2>
            </div>

            <button
              type="button"
              className="dashboard-popup__close"
              aria-label="Tutup dialog"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <XClose size={18} />
            </button>
          </div>

          <div className="dashboard-popup__body">

            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="register-user-popup__grid">
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <TextField
                        label="Nama Vendor"
                        value={formValues.name}
                        placeholder="Masukkan nama vendor"
                        leftIcon={Users01}
                        required
                        error={fieldErrors.name}
                        onChange={(event) => updateValue('name', event.target.value)}
                      />
                    </div>
                  </div>

                  {submitError ? <p className="form-control__message">{submitError}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-popup__actions">
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateVendor
