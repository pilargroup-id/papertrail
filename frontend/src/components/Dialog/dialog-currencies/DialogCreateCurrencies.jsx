import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import TextField from '../../forms/TextField.jsx'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
import { Calendar01, FileText01, TrendingUp } from '../../layoute/TemplateIcons.jsx'

const today = new Date().toISOString().slice(0, 10)

const initialFormValues = {
  currency_code: '',
  rate_date: today,
  middle_rate: '',
  source: 'MANUAL',
}

function getRowsFromResponse(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data
  }

  if (Array.isArray(response?.rows)) {
    return response.rows
  }

  return []
}

function mapCurrencyOptions(currencies) {
  return currencies
    .filter((currency) => Number(currency?.is_active ?? 1) === 1)
    .map((currency) => {
      const code = String(currency?.code ?? '').trim().toUpperCase()
      const name = currency?.name || code
      const symbol = currency?.symbol
      const label = [code, name, symbol ? `(${symbol})` : ''].filter(Boolean).join(' ')

      return {
        value: code,
        label,
      }
    })
    .filter((option) => option.value)
}

function DialogCreateCurrencies({
  isOpen = false,
  eyebrow = 'Currencies',
  title = 'Create Manual Exchange Rate',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [isCurrenciesLoading, setIsCurrenciesLoading] = useState(false)
  const [currenciesError, setCurrenciesError] = useState('')

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
      setFormValues({
        ...initialFormValues,
        rate_date: new Date().toISOString().slice(0, 10),
      })
      setFieldErrors({})
      setSubmitError('')
      setIsSubmitting(false)
      setCurrencyOptions([])
      setIsCurrenciesLoading(false)
      setCurrenciesError('')
      return undefined
    }

    const controller = new AbortController()

    async function loadCurrencies() {
      setIsCurrenciesLoading(true)
      setCurrenciesError('')

      try {
        const response = await api.currencies.list(
          {
            page: 1,
            limit: 100,
            active: 1,
          },
          {
            signal: controller.signal,
          },
        )

        setCurrencyOptions(mapCurrencyOptions(getRowsFromResponse(response)))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setCurrencyOptions([])
        setCurrenciesError(error.message || 'Gagal memuat currency aktif.')
      } finally {
        if (!controller.signal.aborted) {
          setIsCurrenciesLoading(false)
        }
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    loadCurrencies()
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      controller.abort()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedCurrencyCode = formValues.currency_code.trim().toUpperCase()
    const normalizedRateDate = formValues.rate_date
    const normalizedSource = formValues.source.trim() || 'MANUAL'
    const middleRate = Number(formValues.middle_rate)
    const nextFieldErrors = {}

    if (!normalizedCurrencyCode) {
      nextFieldErrors.currency_code = 'Currency wajib dipilih.'
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

      await onCreated?.(response)
      onClose?.()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors({
          currency_code: error.data.errors.currency_code || '',
          rate_date: error.data.errors.rate_date || '',
          middle_rate: error.data.errors.middle_rate || '',
          source: error.data.errors.source || '',
        })
      }

      setSubmitError(error.message || 'Gagal menyimpan kurs manual.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isFormDisabled = isSubmitting || isCurrenciesLoading

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--currency"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-currency-rate-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-create-currency-rate-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="register-user-popup__grid register-user-popup__grid--currency-rate">
                    <div className="register-user-popup__field">
                      <DropdownSearch
                        label="Currency"
                        value={formValues.currency_code}
                        options={currencyOptions}
                        placeholder={isCurrenciesLoading ? 'Memuat currency...' : 'Pilih currency'}
                        searchPlaceholder="Cari currency..."
                        emptyMessage="Currency aktif tidak ditemukan."
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.currency_code}
                        onChange={(value) => updateValue('currency_code', value)}
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
                        placeholder="Input middle rate"
                        leftIcon={TrendingUp}
                        required
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
                        error={fieldErrors.source}
                        onChange={(event) => updateValue('source', event.target.value)}
                      />
                    </div>
                  </div>

                  {currenciesError ? <p className="form-control__message">{currenciesError}</p> : null}
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
              {isSubmitting ? 'Saving...' : isCurrenciesLoading ? 'Loading...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateCurrencies
