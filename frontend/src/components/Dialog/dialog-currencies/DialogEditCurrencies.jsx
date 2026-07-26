import { useEffect, useEffectEvent, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import TextField from '../../forms/TextField.jsx'
import { Calendar01, Code, FileText01, TrendingUp } from '../../layoute/TemplateIcons.jsx'

const getToday = () => new Date().toISOString().slice(0, 10)

const initialFormValues = {
  currency_code: '',
  rate_date: getToday(),
  middle_rate: '',
  source: 'MANUAL',
}

function getFirstValue(source, keys, fallback = '') {
  const matchedKey = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null)

  if (!matchedKey) {
    return fallback
  }

  return source[matchedKey]
}

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function mapCurrencyToFormValues(currency) {
  const code = String(getFirstValue(currency, ['code', 'currency_code'], '')).trim().toUpperCase()
  const rateDate = getFirstValue(
    currency,
    ['rate_date', 'exchange_rate_date'],
    getToday(),
  )
  const middleRate = getFirstValue(
    currency,
    ['middle_rate', 'exchange_rate'],
    '',
  )
  const source = getFirstValue(
    currency,
    ['source', 'source_name', 'exchange_rate_source'],
    'MANUAL',
  )

  return {
    currency_code: code,
    rate_date: String(rateDate || getToday()).slice(0, 10),
    middle_rate: middleRate === undefined || middleRate === null ? '' : String(middleRate),
    source: source || 'MANUAL',
  }
}

function DialogEditCurrencies({
  isOpen = false,
  eyebrow = 'Currencies',
  title = 'Edit Manual Exchange Rate',
  user = null,
  vendor = null,
  budgetType = null,
  currency = null,
  onClose,
  onUpdated,
}) {
  const resolvedCurrency = currency ?? budgetType ?? vendor ?? user
  const [formValues, setFormValues] = useState(() => mapCurrencyToFormValues(resolvedCurrency))
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLatestLoading, setIsLatestLoading] = useState(false)
  const [latestError, setLatestError] = useState('')

  const resetDialogState = () => {
    setFormValues(initialFormValues)
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setIsLatestLoading(false)
    setLatestError('')
  }

  const handleClose = () => {
    resetDialogState()
    onClose?.()
  }
  const handleCloseEvent = useEffectEvent(handleClose)

  const updateValue = (fieldName, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldName]: fieldName === 'currency_code' ? String(value).toUpperCase() : value,
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
      return undefined
    }

    const controller = new AbortController()
    const mappedValues = mapCurrencyToFormValues(resolvedCurrency)

    setFormValues(mappedValues)
    setFieldErrors({})
    setSubmitError('')
    setLatestError('')

    async function loadLatestRate() {
      if (!mappedValues.currency_code || mappedValues.currency_code === 'IDR') {
        return
      }

      setIsLatestLoading(true)

      try {
        const response = await api.currencies.exchangeRates.latest(
          {
            currency_code: mappedValues.currency_code,
            date: mappedValues.rate_date || getToday(),
          },
          {
            signal: controller.signal,
          },
        )
        const latestRate = getResponseData(response)

        setFormValues((currentValues) => ({
          ...currentValues,
          rate_date: String(latestRate.rate_date || currentValues.rate_date || getToday()).slice(0, 10),
          middle_rate:
            latestRate.middle_rate === undefined || latestRate.middle_rate === null
              ? currentValues.middle_rate
              : String(latestRate.middle_rate),
          source: latestRate.source_name || currentValues.source || 'MANUAL',
        }))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setLatestError(error.message || 'Kurs terbaru belum tersedia. Isi rate manual untuk tanggal ini.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLatestLoading(false)
        }
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleCloseEvent()
      }
    }

    loadLatestRate()
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      controller.abort()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, resolvedCurrency])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedCurrencyCode = formValues.currency_code.trim().toUpperCase()
    const normalizedRateDate = formValues.rate_date
    const normalizedSource = formValues.source.trim() || 'MANUAL'
    const middleRate = Number(formValues.middle_rate)
    const nextFieldErrors = {}

    if (!normalizedCurrencyCode) {
      nextFieldErrors.currency_code = 'Currency tidak ditemukan.'
    }

    if (!normalizedRateDate) {
      nextFieldErrors.rate_date = 'Tanggal kurs wajib diisi.'
    }

    if (!Number.isFinite(middleRate) || middleRate <= 0) {
      nextFieldErrors.middle_rate = 'Middle rate harus berupa angka lebih dari 0.'
    }

    if (!normalizedSource) {
      nextFieldErrors.source = 'Source wajib diisi.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.currencies.exchangeRates.manualCreate({
        currency_code: normalizedCurrencyCode,
        rate_date: normalizedRateDate,
        middle_rate: middleRate,
        source: normalizedSource,
      })

      await onUpdated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors({
          currency_code: error.data.errors.currency_code || '',
          rate_date: error.data.errors.rate_date || '',
          middle_rate: error.data.errors.middle_rate || '',
          source: error.data.errors.source || '',
        })
      }

      setSubmitError(error.message || 'Gagal memperbarui kurs manual.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isFormDisabled = isSubmitting || isLatestLoading

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--currency"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-currency-rate-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-edit-currency-rate-title">
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
                        label="Currency"
                        value={formValues.currency_code}
                        leftIcon={Code}
                        required
                        disabled
                        error={fieldErrors.currency_code}
                        onChange={(event) => updateValue('currency_code', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Rate Date"
                        type="date"
                        value={formValues.rate_date}
                        leftIcon={Calendar01}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.rate_date}
                        onChange={(event) => updateValue('rate_date', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Middle Rate"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={formValues.middle_rate}
                        placeholder={isLatestLoading ? 'Memuat kurs...' : 'Input middle rate'}
                        leftIcon={TrendingUp}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.middle_rate}
                        onChange={(event) => updateValue('middle_rate', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Source"
                        value={formValues.source}
                        placeholder="MANUAL"
                        leftIcon={FileText01}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.source}
                        onChange={(event) => updateValue('source', event.target.value)}
                      />
                    </div>
                  </div>

                  {latestError ? <p className="form-control__message">{latestError}</p> : null}
                  {submitError ? <p className="form-control__message">{submitError}</p> : null}
                </div>
              </div>
            </div>
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
              disabled={isFormDisabled}
            >
              {isSubmitting ? 'Saving...' : isLatestLoading ? 'Loading...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditCurrencies
