import { useEffect, useEffectEvent, useState } from 'react'
import { createPortal } from 'react-dom'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

import api from '../../../services/api.js'
import TextArea from '../../forms/TextArea.jsx'
import TextField from '../../forms/TextField.jsx'
import Dropdown from '../../forms/dropdown/Dropdown.jsx'
import DropdownCheckBox from '../../forms/dropdown/DropdownCheckBox.jsx'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
import {
  Banks,
  Calendar01,
  Code,
  CreditCard,
  FileText01,
  Plus,
  Table01,
  Trash03,
  TrendingUp,
  UserBank,
} from '../../layoute/TemplateIcons.jsx'

const getTodayDateValue = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const date = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${date}`
}

const createInitialItem = () => ({
  budget_id: '',
  memo: '',
  quantity: '1',
  unit_price: '',
})

const createInitialFormValues = () => ({
  frp_date: getTodayDateValue(),
  description: '',
  currency_code: 'IDR',
  exchange_rate: '1',
  vendor_id: '',
  vendor_bank_account_id: '',
  internal_po_number: '',
  external_document_type_id: '',
  external_document_number: '',
  payment_method_id: '',
  payment_date: '',
  destination_bank_name: '',
  destination_bank_account: '',
  destination_bank_account_name: '',
  document_type_ids: [],
  items: [createInitialItem()],
  notes: '',
})

const currencyOptions = [
  { value: 'IDR', label: 'IDR' },
  { value: 'USD', label: 'USD' },
  { value: 'SGD', label: 'SGD' },
  { value: 'EUR', label: 'EUR' },
]

const frpTabs = [
  {
    id: 'information',
    label: 'Information',
    description: 'Data utama request payment',
  },
  {
    id: 'vendor',
    label: 'Vendor',
    description: 'Vendor, rekening tujuan, dan dokumen',
  },
  {
    id: 'items',
    label: 'Items',
    description: 'Rincian budget dan nilai pembayaran',
  },
]

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

function getFirstValue(source, keys, fallback = '') {
  const matchedKey = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null)

  if (!matchedKey) {
    return fallback
  }

  return source[matchedKey]
}

function toNumber(value) {
  const normalizedValue = Number(value)

  return Number.isFinite(normalizedValue) ? normalizedValue : 0
}

function mapVendorOptions(vendors) {
  return vendors.map((vendor) => {
    const id = getFirstValue(vendor, ['id', 'vendor_id'])
    const code = getFirstValue(vendor, ['code', 'vendor_code'])
    const name = getFirstValue(vendor, ['name', 'vendor_name'], `Vendor #${id ?? '-'}`)

    return {
      value: id,
      label: [code, name].filter(Boolean).join(' - '),
      meta: vendor,
    }
  })
}

function mapVendorBankOptions(accounts) {
  return accounts.map((account) => {
    const id = getFirstValue(account, ['id', 'vendor_bank_account_id'])
    const bankName = getFirstValue(account, ['bank_name', 'bank_name_snapshot', 'bank'])
    const bankCode = getFirstValue(account, ['bank_code', 'bank_code_snapshot'])
    const accountNumber = getFirstValue(account, ['account_number', 'bank_account_number'])
    const accountName = getFirstValue(account, ['account_name', 'bank_account_name'])
    const label =
      [bankCode || bankName, accountNumber, accountName].filter(Boolean).join(' - ') ||
      `Vendor bank #${id ?? '-'}`

    return {
      value: id,
      label,
      vendorId: getFirstValue(account, ['vendor_id']),
      meta: {
        bankName: bankName || bankCode,
        accountNumber,
        accountName,
      },
    }
  })
}

function mapCodeNameOptions(rows, fallbackName) {
  return rows.map((row) => {
    const id = getFirstValue(row, ['id'])
    const code = getFirstValue(row, ['code'])
    const name = getFirstValue(row, ['name'], `${fallbackName} #${id ?? '-'}`)

    return {
      value: id,
      label: [code, name].filter(Boolean).join(' - '),
    }
  })
}

function mapBudgetOptions(budgets) {
  return budgets.map((budget) => {
    const id = getFirstValue(budget, ['id', 'budget_id'])
    const code = getFirstValue(budget, ['budget_code', 'code'])
    const projectName = getFirstValue(budget, ['project_name', 'name'], `Budget #${id ?? '-'}`)
    const remaining = getFirstValue(budget, ['budget_remaining', 'remaining_amount'])
    const labelParts = [code, projectName]

    if (remaining !== '') {
      labelParts.push(`Remaining ${remaining}`)
    }

    return {
      value: id,
      label: labelParts.filter(Boolean).join(' - '),
    }
  })
}

function DialogCreateFrp({
  isOpen = false,
  eyebrow = 'Form request payment',
  title = 'Create FRP',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(createInitialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState(frpTabs[0].id)
  const [vendorOptions, setVendorOptions] = useState([])
  const [vendorBankOptions, setVendorBankOptions] = useState([])
  const [externalDocumentTypeOptions, setExternalDocumentTypeOptions] = useState([])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState([])
  const [frpDocumentTypeOptions, setFrpDocumentTypeOptions] = useState([])
  const [budgetOptions, setBudgetOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const resetDialogState = () => {
    setFormValues(createInitialFormValues())
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setActiveTab(frpTabs[0].id)
    setVendorOptions([])
    setVendorBankOptions([])
    setExternalDocumentTypeOptions([])
    setPaymentMethodOptions([])
    setFrpDocumentTypeOptions([])
    setBudgetOptions([])
    setIsOptionsLoading(false)
    setOptionsError('')
  }

  const handleClose = () => {
    resetDialogState()
    onClose?.()
  }
  const handleCloseEvent = useEffectEvent(handleClose)

  const handleTabChange = (_, nextValue) => {
    setActiveTab(nextValue)
  }

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

  const updateItemValue = (index, fieldName, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      items: currentValues.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [fieldName]: value,
            }
          : item,
      ),
    }))

    setFieldErrors((currentErrors) => {
      const errorKey = `items.${index}.${fieldName}`

      if (!currentErrors[errorKey] && !currentErrors.items) {
        return currentErrors
      }

      return {
        ...currentErrors,
        [errorKey]: '',
        items: '',
      }
    })
  }

  const addItem = () => {
    setFormValues((currentValues) => ({
      ...currentValues,
      items: [...currentValues.items, createInitialItem()],
    }))
  }

  const removeItem = (index) => {
    setFormValues((currentValues) => {
      if (currentValues.items.length === 1) {
        return currentValues
      }

      return {
        ...currentValues,
        items: currentValues.items.filter((_, itemIndex) => itemIndex !== index),
      }
    })
  }

  const handleVendorBankChange = (value, option) => {
    updateValue('vendor_bank_account_id', value)

    if (!option?.meta) {
      return
    }

    setFormValues((currentValues) => ({
      ...currentValues,
      destination_bank_name: currentValues.destination_bank_name || option.meta.bankName || '',
      destination_bank_account:
        currentValues.destination_bank_account || option.meta.accountNumber || '',
      destination_bank_account_name:
        currentValues.destination_bank_account_name || option.meta.accountName || '',
    }))
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const controller = new AbortController()

    async function loadOptions() {
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const [
          vendorsResponse,
          vendorBanksResponse,
          externalDocumentTypesResponse,
          paymentMethodsResponse,
          frpDocumentTypesResponse,
          budgetsResponse,
        ] = await Promise.all([
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
          api.vendorBankAccounts.list(
            {
              page: 1,
              limit: 200,
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
          api.externalDocumentTypes.list(
            {
              page: 1,
              limit: 100,
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
          api.paymentMethods.list(
            {
              page: 1,
              limit: 100,
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
          api.frpDocumentTypes.list(
            {
              page: 1,
              limit: 100,
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
          api.budgets.list(
            {
              page: 1,
              limit: 200,
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
        ])

        setVendorOptions(mapVendorOptions(getRowsFromResponse(vendorsResponse)))
        setVendorBankOptions(mapVendorBankOptions(getRowsFromResponse(vendorBanksResponse)))
        setExternalDocumentTypeOptions(
          mapCodeNameOptions(getRowsFromResponse(externalDocumentTypesResponse), 'External document'),
        )
        setPaymentMethodOptions(
          mapCodeNameOptions(getRowsFromResponse(paymentMethodsResponse), 'Payment method'),
        )
        setFrpDocumentTypeOptions(
          mapCodeNameOptions(getRowsFromResponse(frpDocumentTypesResponse), 'FRP document'),
        )
        setBudgetOptions(mapBudgetOptions(getRowsFromResponse(budgetsResponse)))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setVendorOptions([])
        setVendorBankOptions([])
        setExternalDocumentTypeOptions([])
        setPaymentMethodOptions([])
        setFrpDocumentTypeOptions([])
        setBudgetOptions([])
        setOptionsError(error.message || 'Gagal memuat pilihan FRP.')
      } finally {
        if (!controller.signal.aborted) {
          setIsOptionsLoading(false)
        }
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleCloseEvent()
      }
    }

    loadOptions()
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      controller.abort()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextFieldErrors = {}
    const exchangeRate = Number(formValues.exchange_rate)
    const normalizedItems = formValues.items.map((item) => {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unit_price)

      return {
        budget_id: item.budget_id,
        memo: item.memo.trim(),
        quantity,
        unit_price: unitPrice,
        amount: quantity * unitPrice,
      }
    })

    if (!formValues.frp_date) {
      nextFieldErrors.frp_date = 'Tanggal FRP wajib diisi.'
    }

    if (!formValues.description.trim()) {
      nextFieldErrors.description = 'Description wajib diisi.'
    }

    if (!formValues.currency_code) {
      nextFieldErrors.currency_code = 'Currency wajib dipilih.'
    }

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      nextFieldErrors.exchange_rate = 'Exchange rate harus lebih dari 0.'
    }

    if (!formValues.vendor_id) {
      nextFieldErrors.vendor_id = 'Vendor wajib dipilih.'
    }

    if (!formValues.external_document_type_id) {
      nextFieldErrors.external_document_type_id = 'External document type wajib dipilih.'
    }

    if (!formValues.external_document_number.trim()) {
      nextFieldErrors.external_document_number = 'External document number wajib diisi.'
    }

    if (!formValues.payment_method_id) {
      nextFieldErrors.payment_method_id = 'Payment method wajib dipilih.'
    }

    if (!formValues.payment_date) {
      nextFieldErrors.payment_date = 'Payment date wajib diisi.'
    }

    if (!formValues.destination_bank_name.trim()) {
      nextFieldErrors.destination_bank_name = 'Destination bank wajib diisi.'
    }

    if (!formValues.destination_bank_account.trim()) {
      nextFieldErrors.destination_bank_account = 'Destination account wajib diisi.'
    }

    if (!formValues.destination_bank_account_name.trim()) {
      nextFieldErrors.destination_bank_account_name = 'Destination account name wajib diisi.'
    }

    normalizedItems.forEach((item, index) => {
      if (!item.budget_id) {
        nextFieldErrors[`items.${index}.budget_id`] = 'Budget wajib dipilih.'
      }

      if (!item.memo) {
        nextFieldErrors[`items.${index}.memo`] = 'Memo item wajib diisi.'
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        nextFieldErrors[`items.${index}.quantity`] = 'Quantity harus lebih dari 0.'
      }

      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
        nextFieldErrors[`items.${index}.unit_price`] = 'Unit price harus berupa angka valid.'
      }
    })

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)

      if (
        nextFieldErrors.frp_date ||
        nextFieldErrors.description ||
        nextFieldErrors.currency_code ||
        nextFieldErrors.exchange_rate
      ) {
        setActiveTab('information')
      } else if (
        nextFieldErrors.vendor_id ||
        nextFieldErrors.external_document_type_id ||
        nextFieldErrors.external_document_number ||
        nextFieldErrors.payment_method_id ||
        nextFieldErrors.payment_date ||
        nextFieldErrors.destination_bank_name ||
        nextFieldErrors.destination_bank_account ||
        nextFieldErrors.destination_bank_account_name
      ) {
        setActiveTab('vendor')
      } else {
        setActiveTab('items')
      }

      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.frp.create({
        frp_date: formValues.frp_date,
        description: formValues.description.trim(),
        currency_code: formValues.currency_code,
        exchange_rate: exchangeRate,
        vendor_id: formValues.vendor_id,
        vendor_bank_account_id: formValues.vendor_bank_account_id || null,
        internal_po_number: formValues.internal_po_number.trim(),
        external_document_type_id: formValues.external_document_type_id,
        external_document_number: formValues.external_document_number.trim(),
        payment_method_id: formValues.payment_method_id,
        payment_date: formValues.payment_date,
        destination_bank_name: formValues.destination_bank_name.trim(),
        destination_bank_account: formValues.destination_bank_account.trim(),
        destination_bank_account_name: formValues.destination_bank_account_name.trim(),
        document_type_ids: formValues.document_type_ids.map((id) => Number(id)),
        items: normalizedItems,
        notes: formValues.notes.trim(),
      })

      await onCreated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors(error.data.errors)
      }

      setSubmitError(error.message || 'Gagal membuat FRP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isFormDisabled = isSubmitting || isOptionsLoading
  const activeTabConfig = frpTabs.find((tab) => tab.id === activeTab) ?? frpTabs[0]
  const filteredVendorBankOptions = formValues.vendor_id
    ? vendorBankOptions.filter(
        (option) => !option.vendorId || String(option.vendorId) === String(formValues.vendor_id),
      )
    : vendorBankOptions
  const frpDocumentTypeDropdownOptions = frpDocumentTypeOptions.map((option) => ({
    ...option,
    value: String(option.value),
  }))

  const renderInformasiPanel = () => (
    <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-three">
      <div className="register-user-popup__field">
        <TextField
          label="FRP Date"
          type="date"
          value={formValues.frp_date}
          leftIcon={Calendar01}
          required
          disabled={isFormDisabled}
          error={fieldErrors.frp_date}
          onChange={(event) => updateValue('frp_date', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <Dropdown
          label="Currency"
          value={formValues.currency_code}
          options={currencyOptions}
          placeholder="Pilih currency"
          required
          disabled={isFormDisabled}
          error={fieldErrors.currency_code}
          onChange={(value) => updateValue('currency_code', value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Exchange Rate"
          value={formValues.exchange_rate}
          placeholder="Input exchange rate"
          leftIcon={TrendingUp}
          type="number"
          min="0"
          step="0.0001"
          required
          disabled={isFormDisabled}
          error={fieldErrors.exchange_rate}
          onChange={(event) => updateValue('exchange_rate', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Internal PO Number"
          value={formValues.internal_po_number}
          placeholder="PO-TEST-001"
          leftIcon={Code}
          disabled={isFormDisabled}
          error={fieldErrors.internal_po_number}
          onChange={(event) => updateValue('internal_po_number', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--full">
        <TextArea
          label="Description"
          value={formValues.description}
          placeholder="Pembayaran invoice vendor"
          rows={4}
          required
          disabled={isFormDisabled}
          error={fieldErrors.description}
          onChange={(event) => updateValue('description', event.target.value)}
        />
      </div>
    </div>
  )

  const renderVendorPanel = () => (
    <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-three">
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
          onChange={(value) => {
            updateValue('vendor_id', value)
            updateValue('vendor_bank_account_id', '')
          }}
        />
      </div>
      <div className="register-user-popup__field">
        <DropdownSearch
          label="Vendor Bank Account"
          value={formValues.vendor_bank_account_id}
          options={filteredVendorBankOptions}
          placeholder={isOptionsLoading ? 'Memuat rekening...' : 'Pilih rekening vendor'}
          searchPlaceholder="Cari rekening vendor..."
          emptyMessage="Rekening vendor aktif tidak ditemukan."
          disabled={isFormDisabled}
          error={fieldErrors.vendor_bank_account_id}
          onChange={handleVendorBankChange}
        />
      </div>
      <div className="register-user-popup__field">
        <DropdownSearch
          label="External Document Type"
          value={formValues.external_document_type_id}
          options={externalDocumentTypeOptions}
          placeholder={isOptionsLoading ? 'Memuat document type...' : 'Pilih document type'}
          searchPlaceholder="Cari document type..."
          emptyMessage="External document type aktif tidak ditemukan."
          required
          disabled={isFormDisabled}
          error={fieldErrors.external_document_type_id}
          onChange={(value) => updateValue('external_document_type_id', value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="External Document Number"
          value={formValues.external_document_number}
          placeholder="INV-TEST-001"
          leftIcon={FileText01}
          required
          disabled={isFormDisabled}
          error={fieldErrors.external_document_number}
          onChange={(event) => updateValue('external_document_number', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <DropdownSearch
          label="Payment Method"
          value={formValues.payment_method_id}
          options={paymentMethodOptions}
          placeholder={isOptionsLoading ? 'Memuat payment method...' : 'Pilih payment method'}
          searchPlaceholder="Cari payment method..."
          emptyMessage="Payment method aktif tidak ditemukan."
          required
          disabled={isFormDisabled}
          error={fieldErrors.payment_method_id}
          onChange={(value) => updateValue('payment_method_id', value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Payment Date"
          type="date"
          value={formValues.payment_date}
          leftIcon={Calendar01}
          required
          disabled={isFormDisabled}
          error={fieldErrors.payment_date}
          onChange={(event) => updateValue('payment_date', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Destination Bank"
          value={formValues.destination_bank_name}
          placeholder="BCA"
          leftIcon={Banks}
          required
          disabled={isFormDisabled}
          error={fieldErrors.destination_bank_name}
          onChange={(event) => updateValue('destination_bank_name', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Destination Account"
          value={formValues.destination_bank_account}
          placeholder="1234567890"
          leftIcon={CreditCard}
          required
          disabled={isFormDisabled}
          error={fieldErrors.destination_bank_account}
          onChange={(event) => updateValue('destination_bank_account', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Destination Account Name"
          value={formValues.destination_bank_account_name}
          placeholder="PT Vendor Testing"
          leftIcon={UserBank}
          required
          disabled={isFormDisabled}
          error={fieldErrors.destination_bank_account_name}
          onChange={(event) => updateValue('destination_bank_account_name', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <DropdownCheckBox
          label="Required Documents"
          options={frpDocumentTypeDropdownOptions}
          value={formValues.document_type_ids.map(String)}
          placeholder={isOptionsLoading ? 'Memuat document...' : 'Pilih required documents'}
          searchPlaceholder="Cari required documents..."
          emptyMessage="FRP document type aktif tidak ditemukan."
          disabled={isFormDisabled}
          error={fieldErrors.document_type_ids}
          onChange={(value) => updateValue('document_type_ids', value.map(String))}
        />
      </div>
    </div>
  )

  const renderItemsPanel = () => (
    <div className="frp-dialog__items">
      {formValues.items.map((item, index) => {
        const quantity = toNumber(item.quantity)
        const unitPrice = toNumber(item.unit_price)
        const amount = quantity * unitPrice

        return (
          <div className="frp-dialog__item" key={`frp-item-${index}`}>
            <div className="frp-dialog__item-header">
              <strong>Item {index + 1}</strong>
              <button
                type="button"
                className="frp-dialog__icon-button"
                aria-label={`Hapus item ${index + 1}`}
                disabled={isFormDisabled || formValues.items.length === 1}
                onClick={() => removeItem(index)}
              >
                <Trash03 size={16} />
              </button>
            </div>

            <div className="register-user-popup__grid register-user-popup__grid--frp">
              <div className="register-user-popup__field register-user-popup__field--full">
                <DropdownSearch
                  label="Budget"
                  value={item.budget_id}
                  options={budgetOptions}
                  placeholder={isOptionsLoading ? 'Memuat budget...' : 'Pilih budget'}
                  searchPlaceholder="Cari budget..."
                  emptyMessage="Budget aktif tidak ditemukan."
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.budget_id`]}
                  onChange={(value) => updateItemValue(index, 'budget_id', value)}
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Quantity"
                  value={item.quantity}
                  placeholder="1"
                  leftIcon={Table01}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.quantity`]}
                  onChange={(event) => updateItemValue(index, 'quantity', event.target.value)}
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Unit Price"
                  value={item.unit_price}
                  placeholder="100000"
                  leftIcon={TrendingUp}
                  type="number"
                  min="0"
                  step="1"
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.unit_price`]}
                  onChange={(event) => updateItemValue(index, 'unit_price', event.target.value)}
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Amount"
                  value={Number.isFinite(amount) ? amount : 0}
                  leftIcon={TrendingUp}
                  disabled
                  readOnly
                />
              </div>
              <div className="register-user-popup__field register-user-popup__field--full">
                <TextArea
                  label="Memo"
                  value={item.memo}
                  placeholder="Pembayaran invoice vendor"
                  rows={3}
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.memo`]}
                  onChange={(event) => updateItemValue(index, 'memo', event.target.value)}
                />
              </div>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        className="dashboard-popup__button dashboard-popup__button--secondary frp-dialog__add-item"
        disabled={isFormDisabled}
        onClick={addItem}
      >
        <Plus size={16} />
        Add Item
      </button>
      {fieldErrors.items ? <p className="form-control__message">{fieldErrors.items}</p> : null}
    </div>
  )

  const renderActivePanel = () => {
    if (activeTab === 'information') {
      return renderInformasiPanel()
    }

    if (activeTab === 'vendor') {
      return renderVendorPanel()
    }

    return renderItemsPanel()
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type entity-form-popup--frp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-frp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-create-frp-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="frp-dialog__tabs-shell">
                    <Tabs
                      value={activeTab}
                      onChange={handleTabChange}
                      textColor="secondary"
                      indicatorColor="secondary"
                      aria-label="FRP tabs"
                      variant="fullWidth"
                      className="frp-dialog__tabs"
                      sx={{
                        minHeight: 52,
                        '& .MuiTabs-flexContainer': {
                          gap: '0.5rem',
                        },
                        '& .MuiTabs-indicator': {
                          height: 3,
                          borderRadius: 999,
                          backgroundColor: '#18786e',
                        },
                      }}
                    >
                      {frpTabs.map((tab) => (
                        <Tab
                          key={tab.id}
                          id={`frp-tab-${tab.id}`}
                          aria-controls={`frp-panel-${tab.id}`}
                          value={tab.id}
                          label={tab.label}
                          disableRipple
                          className="frp-dialog__mui-tab"
                          sx={{
                            minHeight: 52,
                            borderRadius: '14px 14px 0 0',
                            color: '#607089',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            letterSpacing: '0.01em',
                            textTransform: 'none',
                            transition: 'background-color 0.2s ease, color 0.2s ease',
                            '&.Mui-selected': {
                              color: '#18786e',
                              backgroundColor: 'rgba(24, 120, 110, 0.08)',
                            },
                          }}
                        />
                      ))}
                    </Tabs>
                  </div>

                  <div
                    className="frp-dialog__panel"
                    id={`frp-panel-${activeTabConfig.id}`}
                    role="tabpanel"
                    aria-labelledby={`frp-tab-${activeTabConfig.id}`}
                  >
                    <div className="frp-dialog__panel-header">
                      <div>
                        <p className="frp-dialog__panel-eyebrow">{activeTabConfig.label}</p>
                        <h3 className="frp-dialog__panel-title">{activeTabConfig.description}</h3>
                      </div>
                    </div>

                    {renderActivePanel()}
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
              {isSubmitting ? 'Creating...' : isOptionsLoading ? 'Loading...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateFrp
