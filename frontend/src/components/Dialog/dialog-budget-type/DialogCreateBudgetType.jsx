import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import TextArea from '../../forms/TextArea.jsx'
import TextField from '../../forms/TextField.jsx'
import { Code, FileText01 } from '../../layoute/TemplateIcons.jsx'

const initialFormValues = {
  code: '',
  name: '',
  description: '',
}

function DialogCreateBudgetType({
  isOpen = false,
  eyebrow = 'Budget Type',
  title = 'Create Budget Type',
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

    const normalizedCode = formValues.code.trim().toUpperCase()
    const normalizedName = formValues.name.trim()
    const normalizedDescription = formValues.description.trim()
    const nextFieldErrors = {}

    if (!normalizedCode) {
      nextFieldErrors.code = 'Code wajib diisi.'
    }

    if (!normalizedName) {
      nextFieldErrors.name = 'Name budget type wajib diisi.'
    }

    if (normalizedDescription.length > 255) {
      nextFieldErrors.description = 'Description maksimal 255 karakter.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.budgetTypes.create({
        code: normalizedCode,
        name: normalizedName,
        description: normalizedDescription,
      })

      await onCreated?.(response)
      onClose?.()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors({
          code: error.data.errors.code || '',
          name: error.data.errors.name || '',
          description: error.data.errors.description || '',
        })
      }

      setSubmitError(error.message || 'Gagal membuat budget type.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isFormDisabled = isSubmitting

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-budget-type-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-create-budget-type-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="register-user-popup__grid register-user-popup__grid--vendor-banks">
                    <div className="register-user-popup__field">
                      <TextField
                        label="Code"
                        value={formValues.code}
                        placeholder="Input code budget type"
                        leftIcon={Code}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.code}
                        onChange={(event) => updateValue('code', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Name Budget Type"
                        value={formValues.name}
                        placeholder="Input name budget type"
                        leftIcon={FileText01}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.name}
                        onChange={(event) => updateValue('name', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <TextArea
                        label="Description"
                        value={formValues.description}
                        placeholder="Input description"
                        rows={4}
                        disabled={isFormDisabled}
                        error={fieldErrors.description}
                        onChange={(event) => updateValue('description', event.target.value)}
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
              disabled={isFormDisabled}
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

export default DialogCreateBudgetType
