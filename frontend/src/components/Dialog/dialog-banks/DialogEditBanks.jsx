import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import TextField from '../../forms/TextField.jsx'
import { Users01 } from '../../layoute/TemplateIcons.jsx'

const initialFormValues = {
  code: '',
  name: '',
}

function DialogEditBanks({
  isOpen = false,
  eyebrow = 'Banks',
  title = 'Edit Banks',
  user = null,
  banks = null,
  onClose,
  onUpdated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const resolvedBanks = banks ?? user

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

    setFormValues({
      code: resolvedBanks?.code ?? '',
      name: resolvedBanks?.name ?? '',
    })
    setFieldErrors({})
    setSubmitError('')

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, resolvedBanks])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const banksId = resolvedBanks?.id
    const normalizedName = formValues.name.trim()
    const normalizedCode = formValues.code.trim()

    if (banksId === undefined || banksId === null) {
      setSubmitError('Data banks tidak ditemukan.')
      return
    }

    if (!normalizedName) {
      setFieldErrors({
        name: 'Nama banks wajib diisi.',
      })
      return
    }

    if (!normalizedCode) {
      setFieldErrors({
        code: 'Kode banks wajib diisi.',
      })
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.banks.update(banksId, {
        name: normalizedName,
        code: normalizedCode,
      })

      await onUpdated?.(response)
      onClose?.()
    } catch (error) {
      setSubmitError(error.message || 'Gagal memperbarui banks.')
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
        className="dashboard-popup register-user-popup entity-form-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-banks-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-edit-banks-title">
                {title}
              </h2>
            </div>

          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="register-user-popup__grid">
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <TextField
                        label="Nama Banks"
                        value={formValues.name}
                        placeholder="Input Banks Bane"
                        leftIcon={Users01}
                        required
                        error={fieldErrors.name}
                        onChange={(event) => updateValue('name', event.target.value)}
                      />
                    <TextField
                        label="Banks Code"
                        value={formValues.code}
                        placeholder="Input Banks Bane"
                        leftIcon={Users01}
                        required
                        error={fieldErrors.code}
                        onChange={(event) => updateValue('code', event.target.value)}
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
              {isSubmitting ? 'Saving...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditBanks
