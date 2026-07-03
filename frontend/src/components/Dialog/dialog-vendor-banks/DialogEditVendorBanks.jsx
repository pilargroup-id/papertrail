import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import Checkbox from '../../forms/Checkbox.jsx'
import TextField from '../../forms/TextField.jsx'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
import { CreditCard, UserBank } from '../../layoute/TemplateIcons.jsx'

const initialFormValues = {
  vendor_id: '',
  bank_id: '',
  account_number: '',
  account_name: '',
  is_primary: false,
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

function mapVendorOptions(vendors) {
  return vendors.map((vendor) => ({
    value: vendor?.id,
    label: vendor?.name || `Vendor #${vendor?.id ?? '-'}`,
  }))
}

function mapBankOptions(banks) {
  return banks.map((bank) => ({
    value: bank?.id,
    label: [bank?.code, bank?.name].filter(Boolean).join(' - ') || `Bank #${bank?.id ?? '-'}`,
  }))
}

function DialogEditVendorBanks({
  isOpen = false,
  eyebrow = 'Vendor Banks',
  title = 'Edit Vendor Banks Account',
  user = null,
  vendorBanks = null,
  onClose,
  onUpdated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vendorOptions, setVendorOptions] = useState([])
  const [bankOptions, setBankOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const resolvedVendorBanks = vendorBanks ?? user

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
      setVendorOptions([])
      setBankOptions([])
      setIsOptionsLoading(false)
      setOptionsError('')
      return undefined
    }

    setFormValues({
      vendor_id: resolvedVendorBanks?.vendor_id ?? '',
      bank_id: resolvedVendorBanks?.bank_id ?? '',
      account_number: resolvedVendorBanks?.account_number ?? '',
      account_name: resolvedVendorBanks?.account_name ?? '',
      is_primary: Number(resolvedVendorBanks?.is_primary) === 1,
    })
    setFieldErrors({})
    setSubmitError('')

    const controller = new AbortController()

    async function loadOptions() {
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const [vendorsResponse, banksResponse] = await Promise.all([
          api.vendors.list(
            {
              page: 1,
              limit: 100,
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
          api.banks.list(
            {
              page: 1,
              limit: 100,
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
        ])

        setVendorOptions(mapVendorOptions(getRowsFromResponse(vendorsResponse)))
        setBankOptions(mapBankOptions(getRowsFromResponse(banksResponse)))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setVendorOptions([])
        setBankOptions([])
        setOptionsError(error.message || 'Gagal memuat pilihan vendor dan bank.')
      } finally {
        if (!controller.signal.aborted) {
          setIsOptionsLoading(false)
        }
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    loadOptions()
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      controller.abort()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, resolvedVendorBanks])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const vendorBankAccountId = resolvedVendorBanks?.id
    const normalizedAccountNumber = formValues.account_number.trim()
    const normalizedAccountName = formValues.account_name.trim()
    const nextFieldErrors = {}

    if (vendorBankAccountId === undefined || vendorBankAccountId === null) {
      setSubmitError('Data vendor bank account tidak ditemukan.')
      return
    }

    if (!formValues.vendor_id) {
      nextFieldErrors.vendor_id = 'Vendor wajib dipilih.'
    }

    if (!formValues.bank_id) {
      nextFieldErrors.bank_id = 'Bank wajib dipilih.'
    }

    if (!normalizedAccountNumber) {
      nextFieldErrors.account_number = 'Nomor rekening wajib diisi.'
    }

    if (!normalizedAccountName) {
      nextFieldErrors.account_name = 'Nama rekening wajib diisi.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.vendorBankAccounts.update(vendorBankAccountId, {
        vendor_id: formValues.vendor_id,
        bank_id: formValues.bank_id,
        account_number: normalizedAccountNumber,
        account_name: normalizedAccountName,
        is_primary: formValues.is_primary ? 1 : 0,
      })

      await onUpdated?.(response)
      onClose?.()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors({
          vendor_id: error.data.errors.vendor_id || '',
          bank_id: error.data.errors.bank_id || '',
          account_number: error.data.errors.account_number || '',
          account_name: error.data.errors.account_name || '',
          is_primary: error.data.errors.is_primary || '',
        })
      }

      setSubmitError(error.message || 'Gagal memperbarui vendor bank account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isFormDisabled = isSubmitting || isOptionsLoading

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--vendor-banks"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-vendor-banks-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-edit-vendor-banks-title">
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
                      <DropdownSearch
                        label="Vendor"
                        value={formValues.vendor_id}
                        options={vendorOptions}
                        placeholder={isOptionsLoading ? 'Memuat vendor...' : 'Pilih vendor'}
                        searchPlaceholder="Cari vendor..."
                        emptyMessage="Vendor aktif tidak ditemukan."
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.vendor_id}
                        onChange={(value) => updateValue('vendor_id', value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <DropdownSearch
                        label="Bank"
                        value={formValues.bank_id}
                        options={bankOptions}
                        placeholder={isOptionsLoading ? 'Memuat bank...' : 'Pilih bank'}
                        searchPlaceholder="Cari bank..."
                        emptyMessage="Bank aktif tidak ditemukan."
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.bank_id}
                        onChange={(value) => updateValue('bank_id', value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Account Number"
                        value={formValues.account_number}
                        placeholder="Input nomor rekening"
                        leftIcon={CreditCard}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.account_number}
                        onChange={(event) => updateValue('account_number', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Account Name"
                        value={formValues.account_name}
                        placeholder="Input nama rekening"
                        leftIcon={UserBank}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.account_name}
                        onChange={(event) => updateValue('account_name', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <Checkbox
                        label="Set as primary account"
                        description="Jika dipilih, rekening utama vendor akan dipindahkan ke rekening ini."
                        checked={formValues.is_primary}
                        disabled={isFormDisabled}
                        error={fieldErrors.is_primary}
                        onChange={(event) => updateValue('is_primary', event.target.checked)}
                      />
                    </div>
                  </div>

                  {optionsError ? <p className="form-control__message">{optionsError}</p> : null}
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
              {isSubmitting ? 'Saving...' : isOptionsLoading ? 'Loading...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditVendorBanks
